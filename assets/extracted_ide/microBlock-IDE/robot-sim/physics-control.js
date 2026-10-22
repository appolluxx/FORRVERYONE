/* Firmware RPC on the physics thread. No renderer or WebGL dependency. */
(function(root){
    'use strict';
    const C=root.CANNON||(typeof require==='function'?require('./vendor/cannon-0.6.2.min.js'):null);
    const Field=root.SimFieldMap||(typeof require==='function'?require('./field-map'):null);
    const Product=root.ProductRuntime||(typeof require==='function'?require('./product-runtime'):null);
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const finite=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
    const number=v=>{v=Number(v);if(!Number.isFinite(v))throw Error('Device value must be a finite number.');return v;};
    // Motor-bus timing is independent of the installed IMU. GPIO-driven boards
    // retain coherent control turns; a BNO085 alone must not add I2C motor costs.
    const motorTimingProfiles={
        'pca9685-200khz':{motorWriteUs:540,motorStopUs:270,motorsWriteUs:2160,cachedReadUs:10,externalUs:100},
        // MicroPython reports each actual I2C register transaction separately.
        // Decoded motor-state updates must not charge that bus transaction twice.
        'i2c-registers':{motorWriteUs:0,motorsWriteUs:0,cachedReadUs:10,externalUs:100}
    };
    function create(engine,config,replyShared,statusShared,clockShared,requestShared){
        const header=new Int32Array(replyShared,0,2),bytes=new Uint8Array(replyShared,8),encoder=new TextEncoder();
        const status=new Int32Array(statusShared,0,2),outputs=new Float64Array(statusShared,8,4);
        const clockHeader=new Int32Array(clockShared,0,2),clockValue=new Float64Array(clockShared,8,1);
        const requestHeader=requestShared&&new Int32Array(requestShared,0,2),requestBytes=requestShared&&new Uint8Array(requestShared,8),decoder=new TextDecoder();
        // Chromium 83 does not allow TextDecoder to consume a shared view.
        const requestCopy=requestBytes&&new Uint8Array(requestBytes.length);
        let previousTime=engine.world.time,elapsed=0,dirty=false,lastScanTime=-Infinity,turnDeadline=0;
        let cooperative=false,pending=null,advanceUntil=0,cacheClock=false;
        let imuPeriod=0,imuSampleAt=-1,imuSample=null,motorTiming=null,ioBudget=0,resumeCost=0,stepOutputs=null;
        const outputIntegral=new Float64Array(4);
        const velocityIntegral=new Float64Array(config.motors.length);let stepVelocities=null;
        const sampled=new Set();
        const controlStep=1/240;
        const offsets={},stats={path:'direct-worker',motorTimingProfile:'coherent',imuReportMs:0,count:0,sensorCount:0,totalMs:0,maxMs:0,queueMaxMs:0,rpcMaxMs:0,operations:{}};
        function operation(op){return stats.operations[op]||(stats.operations[op]={count:0,totalMs:0,maxMs:0,queueMaxMs:0,rpcCount:0,rpcTotalMs:0,rpcMaxMs:0});}
        const field=config.field||{},sampler=field.image?Field.createLuminanceSampler(field.image):()=>1;
        const environment={lineAt(x,z){
            for(const rod of field.rods||[]){const dx=x-rod.x,dz=z-rod.z,c=Math.cos(rod.yaw||0),s=Math.sin(rod.yaw||0);
                if(Math.abs(dx*c-dz*s)<=rod.diameter/2&&Math.abs(dx*s+dz*c)<=rod.length/2)return (.2126*203+.7152*164+.0722*119)/255;}
            return sampler(x,z);
        }};
        const sensors=new Map(config.sensors.map(s=>[String(s.port).toUpperCase(),{...s,point:new C.Vec3(...s.position),axis:new C.Vec3(...s.direction)}]));
        const T=(config.distances||[]).length?(root.THREE||(typeof require==='function'?require('../dashboard/js/three.min.js'):null)):null;
        const distanceMeshes=T?(config.distanceMeshes||[]).map(data=>{
            const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(data.positions),3));
            if(data.index)geometry.setIndex(data.index);geometry.groups=data.groups||[];if(data.drawRange)geometry.setDrawRange(data.drawRange.start,data.drawRange.count);
            geometry.computeBoundingSphere();
            const material=side=>new T.MeshBasicMaterial({side});
            const mesh=new T.Mesh(geometry,Array.isArray(data.sides)?data.sides.map(material):material(data.sides));mesh.matrixAutoUpdate=false;
            return {data,mesh,local:new T.Matrix4().fromArray(data.matrix)};
        }):[];
        const distances=new Map((config.distances||[]).map(s=>[String(s.port).toUpperCase(),{...s,point:new C.Vec3(...s.position),axis:new C.Vec3(...s.direction),excluded:new Set(s.excluded)}]));
        const distanceFrame=T&&new T.Matrix4(),distancePosition=T&&new T.Vector3(),distanceRotation=T&&new T.Quaternion(),distanceScale=T&&new T.Vector3(1,1,1);
        const ray=T&&new T.Raycaster(),hits=[];
        function distance(port,pulse){
            const s=distances.get(String(port).toUpperCase());if(!s)throw Error('No simulated sensor is connected to '+port+'.');
            if(s.triggerError)throw Error(s.triggerError);
            if(s.triggerPort&&pulse&&String(pulse.triggerPort||'').toUpperCase()!==String(s.triggerPort).toUpperCase())throw Error('Ultrasonic Trigger does not match Assembly: expected '+s.triggerPort+', received '+(pulse.triggerPort||'no trigger pulse')+'.');
            const body=engine.world.bodies[s.body],p=body.pointToWorldFrame(s.point),d=body.vectorToWorldFrame(s.axis);
            ray.ray.origin.set(p.x/config.unitScale,p.y/config.unitScale,p.z/config.unitScale);ray.ray.direction.set(d.x,d.y,d.z).normalize();ray.near=.00001;ray.far=Math.max(.001,finite(s.device.range,2));
            hits.length=0;
            for(const item of distanceMeshes){
                if(s.excluded.has(item.data.id))continue;
                if(item.data.body>=0){
                    const b=engine.world.bodies[item.data.body];distancePosition.set(b.position.x/config.unitScale,b.position.y/config.unitScale,b.position.z/config.unitScale);distanceRotation.set(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
                    distanceFrame.compose(distancePosition,distanceRotation,distanceScale);item.mesh.matrixWorld.multiplyMatrices(distanceFrame,item.local);
                }else item.mesh.matrixWorld.copy(item.local);
                item.mesh.raycast(ray,hits);
            }
            let nearest=ray.far;for(const hit of hits)nearest=Math.min(nearest,hit.distance);return nearest;
        }
        function sensor(port,kind){
            const s=sensors.get(String(port).toUpperCase());
            if(!s)throw Error('No simulated sensor is connected to '+port+'.');
            const body=engine.world.bodies[s.body],position=body.pointToWorldFrame(s.point),direction=body.vectorToWorldFrame(s.axis);
            position.scale(1/config.unitScale,position);
            const distance=Math.abs(direction.y)>1e-8?(finite(field.floorY,0)-position.y)/direction.y:-1;
            const range=Math.max(.001,finite(s.device.range,.1));
            let value=1;
            if(distance>=0&&distance<=range){
                const hit=position.vadd(direction.scale(distance));
                value=Product.lineReflectance(environment,hit,s.device,distance,direction);
                const fade=clamp((distance/range-.8)/.2,0,1);
                value+=(1-value)*fade*fade*(3-2*fade);
                const noise=clamp(finite(s.device.noise,.003),0,.1);
                if(noise)value=clamp(value+(Math.random()+Math.random()-1)*noise,0,1);
            }
            return kind==='analog'?Math.round(value*4095):kind==='digital'?Number(value>=.5):value;
        }
        function imu(axis){
            if(!['yaw','pitch','roll'].includes(axis))throw Error('Unsupported IMU axis: '+axis);
            const q=engine.world.bodies[config.imu.body].quaternion.mult(new C.Quaternion(...config.imu.initial).conjugate());
            // Same YXZ Euler extraction as THREE.Euler in AssemblyPhysics.readState.
            const {x,y,z,w}=q,m23=2*(y*z-w*x),pitch=Math.asin(-clamp(m23,-1,1));
            const heading=Math.abs(m23)<.9999999?Math.atan2(2*(x*z+w*y),1-2*(x*x+y*y)):Math.atan2(-2*(x*z-w*y),1-2*(y*y+z*z));
            const roll=Math.abs(m23)<.9999999?Math.atan2(2*(x*y+w*z),1-2*(x*x+z*z)):0;
            return (axis==='yaw'?-heading:axis==='pitch'?pitch:roll)*180/Math.PI;
        }
        function sampleImu(){
            if(!imuPeriod)return;
            const slot=Math.floor((elapsed+1e-10)/imuPeriod);
            if(slot!==imuSampleAt){imuSampleAt=slot;imuSample={roll:imu('roll'),pitch:imu('pitch'),yaw:imu('yaw')};}
        }
        function setMotors(values){
            const checked=Array.from({length:4},(_,i)=>i<values.length?clamp(number(values[i]),-100,100):0);
            Atomics.add(status,1,1);outputs.set(checked);Atomics.add(status,1,1);dirty=true;
        }
        function chargeControlTime(message,duration){
            // Firmware can update PWM more than once within a physics tick.
            // Integrate the OLD outputs until each write completes instead of
            // extending/discarding a short derivative pulse for a whole tick.
            // Integrate calibrated motor targets too: a measured speed curve
            // is nonlinear, so converting averaged PWM loses short corrections.
            const consumed=Math.min(duration,Math.max(0,controlStep-ioBudget));
            for(let i=0;i<4;i++)outputIntegral[i]+=clamp(outputs[i],-100,100)*consumed;
            config.motors.forEach((m,i)=>{const channel=/^M([1-4])$/i.exec(m.port);if(channel)velocityIntegral[i]+=Product.motorVelocity(m.device,outputs[Number(channel[1])-1])*consumed;});
            ioBudget+=consumed;
            if(ioBudget+1e-12<controlStep)return false;
            stepOutputs=Array.from(outputIntegral,value=>value/controlStep);
            stepVelocities=Array.from(velocityIntegral,value=>value/controlStep);velocityIntegral.fill(0);
            outputIntegral.fill(0);ioBudget=0;
            resumeCost=Math.max(0,duration-consumed);
            if(pending)throw Error('Concurrent firmware control request');
            pending=message;advanceUntil=elapsed+controlStep;
            return true;
        }
        function call(op,args){
            if(op==='_control_begin'){
                const options=args[0]||{},name=options.motorTimingProfile||'coherent';
                if(name!=='coherent'&&!Object.prototype.hasOwnProperty.call(motorTimingProfiles,name))throw Error('Unknown motor timing profile: '+name);
                motorTiming=motorTimingProfiles[name]||null;
                cacheClock=options.cacheClock===true&&name==='i2c-registers';
                imuPeriod=options.imuReportMs===20?.02:0;
                stats.motorTimingProfile=name;stats.imuReportMs=imuPeriod*1000;
                ioBudget=0;resumeCost=0;stepOutputs=null;stepVelocities=null;velocityIntegral.fill(0);outputIntegral.fill(0);imuSampleAt=-1;imuSample=null;cooperative=true;sampled.clear();stats.scheduling='simulation-step';return null;
            }
            if(op==='_control_clock')return elapsed;
            if(op==='_control_sleep'||op==='_control_external'||op==='_control_flush')return null;
            if(op==='_control_bus_write'){
                const bytes=number(args[0]),hz=number(args[1]);
                if(!Number.isInteger(bytes)||bytes<1||bytes>65536||hz<=0||hz>5000000)throw Error('Invalid I2C transaction size or frequency.');
                return null;
            }
            if(op==='encoder'){
                const a='IO'+args[0],b='IO'+args[1];
                const matches=config.motors.filter(m=>m.device.encoder&&((m.device.encoder.pinA===a&&m.device.encoder.pinB===b)||(m.device.encoder.pinA===b&&m.device.encoder.pinB===a)));
                if(matches.length>1)throw Error('Encoder pins match more than one motor.');
                if(!matches.length)return 0;
                const m=matches[0],e=m.device.encoder;
                return Math.trunc(engine.hinges[m.hinge].angle/(2*Math.PI)*e.countsPerRevolution*(e.invert?-1:1)*(e.pinA===a?1:-1));
            }
            if(op==='pulse'){stats.sensorCount++;const metres=distance(args[0],args[1]);return metres<0?65535:Math.min(65535,Math.round(metres*100/.017));}
            if(op==='sensor'&&args[1]==='distance'){stats.sensorCount++;return distance(args[0],args[2]);}
            if(op==='sensor'||op==='digital'){stats.sensorCount++;return op==='digital'?!!sensor(args[0],'digital'):sensor(args[0],args[1]);}
            if(op==='adc_row'||op==='adc_scan'){
                if(lastScanTime!==engine.world.time)turnDeadline=performance.now()+2;
                lastScanTime=engine.world.time;
                stats.sensorCount++;
                const row=Array.from({length:8},(_,i)=>Math.round(sensor('ADC'+i,'analog')*1023/4095));
                if(op==='adc_row')return row;
                return {row,side:[8,9].map(i=>{try{return sensor('ADC'+i,'analog');}catch(error){return {error:error.message};}})};
            }
            if(op==='motor'){const index=number(args[0])-1;if(!Number.isInteger(index)||index<0||index>3)throw Error('Choose motor M1 through M4.');const values=Array.from(outputs);values[index]=number(args[1]);setMotors(values);}
            else if(op==='motors')setMotors(args);
            else if(op==='drive'){
                if(config.driveError)throw Error(config.driveError);
                const left=number(args[0]),right=number(args[1]);
                setMotors(config.drive?config.drive.left.map((v,i)=>v*left+config.drive.right[i]*right):[left,right,0,0]);
            }else if(op==='imu'||op==='imu_offset'){
                const axis=String(args[0]);sampleImu();const angle=imuPeriod?imuSample[axis]:imu(axis);
                if(op==='imu_offset')offsets[axis]=number(args[1])-angle;else return angle+(offsets[axis]||0);
            }else throw Error('Unsupported direct device operation: '+op);
            return null;
        }
        function tick(){
            const time=engine.world.time,delta=time-previousTime;previousTime=time;
            if(delta>0)elapsed+=delta;
            sampleImu();
            Atomics.add(clockHeader,0,1);clockValue[0]=elapsed;Atomics.add(clockHeader,0,1);Atomics.notify(clockHeader,0);
            if(cooperative&&pending&&elapsed+1e-10>=advanceUntil){
                const message=pending;pending=null;stepOutputs=null;stepVelocities=null;sampled.clear();api.receive(message,true);
            }
        }
        function settleCachedReads(message){
            const clocks=message.clockReads||0,imus=message.imuReads||0,count=clocks+imus;
            const capacity=cacheClock?Math.max(0,Math.floor((controlStep-ioBudget-1e-10)/(motorTiming.cachedReadUs/1000000))):0;
            if(!Number.isInteger(clocks)||!Number.isInteger(imus)||clocks<0||imus<0||count>capacity)throw Error('Invalid cached input reads');
            if(count){chargeControlTime(message,count*motorTiming.cachedReadUs/1000000);operation('_control_clock').count+=clocks;operation('imu').count+=imus;stats.count+=count;}
        }
        const api={stats,tick,cooperative:()=>cooperative,waiting:()=>cooperative?!pending:performance.now()<turnDeadline,
            waitForRequest(timeout){
                if(!cooperative||pending||!requestHeader||Atomics.load(status,0)!==1)return;
                // The firmware writes shared memory before notifying. Waiting
                // here avoids a MessageChannel task for every hardware call;
                // it never grants simulation time or spins the CPU.
                // State 2 advertises an active atomic waiter. The sender can
                // wake it directly without also queueing a redundant port task.
                if(Atomics.compareExchange(requestHeader,0,0,2)===0){
                    Atomics.wait(requestHeader,0,2,timeout);
                    Atomics.compareExchange(requestHeader,0,2,0);
                }
                this.drain();
            },drain(){
            if(requestHeader&&Atomics.load(requestHeader,0)===1){
                const length=Atomics.load(requestHeader,1);requestCopy.set(requestBytes.subarray(0,length));
                const message=JSON.parse(decoder.decode(requestCopy.subarray(0,length)));
                // Reads remain available at the firmware's own loop rate.
                Atomics.store(requestHeader,0,0);this.receive(message);
            }
        },active:()=>Atomics.load(status,0)===1,
            commands(base){
                if(Atomics.load(status,0)!==1)return base;
                const result=base.slice();
                const values=motorTiming&&stepOutputs?stepOutputs:outputs;
                for(const [motorIndex,m] of config.motors.entries()){const match=/^M([1-4])$/i.exec(m.port);if(!match)continue;
                    const speed=finite(m.device.maxSpeed,360),radians=Math.PI/180;
                    result[m.hinge]={type:'motor',velocity:(motorTiming&&stepVelocities?stepVelocities[motorIndex]:Product.motorVelocity(m.device,values[Number(match[1])-1]))*radians,maxSpeed:Math.max(0,speed)*radians,calibratedNoLoad:!!m.device.speedCalibration,maxAcceleration:Math.max(0,finite(m.device.maxAcceleration,0))*radians};
                }return result;
            },
            takeMotors(){if(!dirty)return null;dirty=false;return Array.from(outputs);},
            receive(message,resuming=false){
                if(Atomics.load(status,0)!==1)return;
                if(!resuming&&message.motorWrites){
                    if(!cacheClock||message.motorWrites.length>16)throw Error('Invalid cached motor writes');
                    for(const write of message.motorWrites){
                        settleCachedReads(write);call('motor',write.args);
                        operation('motor').count++;stats.count++;
                    }
                }
                // Input reads strictly inside the current tick may be served
                // locally by firmware. Charge their unchanged virtual cost
                // before the next operation, while outputs are still held.
                if(!resuming&&(message.clockReads||message.imuReads)){
                    settleCachedReads(message);
                }
                if(cooperative){
                    // A pose belongs to firmware until it asks for the next
                    // sample of the same input, repeats an output, or sleeps.
                    // Different sensors and left/right writes share that pose.
                    // OS scheduling delays never grant physical movement.
                    const op=message.op,args=message.args||[];
                    const key=op==='adc_row'||op==='adc_scan'?'adc':
                        ['sensor','digital','pulse','imu','encoder','motor','_control_external'].includes(op)?op+':'+String(args[0]):
                        ['drive','motors','_control_clock'].includes(op)?op:null;
                    const duration=op==='_control_sleep'?Number(args[0]):0;
                    // ATOM motorWrite performs two PCA9685 I2C writes: about
                    // 2 * 6 bytes * 9 clocks / 200 kHz = 540 us per motor.
                    // Cached IMU/encoder/clock reads must not each cost a physics step.
                    // The memory/RPC costs below are a scheduling approximation,
                    // not a cycle-accurate ESP32 model; wall time never sets them.
                    if(motorTiming){
                        // Sleep consumes virtual time too: its first tick blends
                        // prior writes, following ticks hold the current PWM.
                        // Carry a partial operation across the boundary before
                        // applying its output. Wall-clock waits grant no credit.
                        const busBytes=Number(args[0]),busHz=Number(args[1]);
                        const validBus=Number.isInteger(busBytes)&&busBytes>=1&&busBytes<=65536&&Number.isFinite(busHz)&&busHz>0&&busHz<=5000000;
                        // Re-polling a UI button waits for the next input pose,
                        // as in coherent mode. A/B share a pose; motor, encoder
                        // and IMU transactions keep their independent timings.
                        const buttonPoll=op==='_control_external'&&/^cpp:digital:(ATOM_BUTTON_A|IO0|IO43|IO44)$/.test(args[0]);
                        // PTBOTAtomVX skips the direction-register write at
                        // speed 0; stopping writes only the PWM register.
                        // Keep each channel sequential, including mixed stops.
                        const motorCost=value=>Number(value)===0&&Number.isFinite(motorTiming.motorStopUs)?motorTiming.motorStopUs:motorTiming.motorWriteUs;
                        const cost=resuming?resumeCost:op==='_control_flush'?0:buttonPoll&&sampled.has(key)?Math.max(0,controlStep-ioBudget):op==='_control_sleep'?Math.max(0,Number.isFinite(duration)?duration:0):
                            op==='_control_bus_write'?(validBus?busBytes*9/busHz:0):
                            (op==='motor'?motorCost(args[1]):op==='motors'?Array.from({length:4},(_,i)=>motorCost(args[i])).reduce((a,b)=>a+b,0):op==='_control_external'?motorTiming.externalUs:motorTiming.cachedReadUs)/1000000;
                        resumeCost=0;
                        if(chargeControlTime(message,cost))return;
                    }else if(!resuming&&((key&&sampled.has(key))||(Number.isFinite(duration)&&duration>0))){
                        if(pending)throw Error('Concurrent firmware control request');
                        pending=message;advanceUntil=elapsed+(duration>0?duration:controlStep);return;
                    }
                    if(key)sampled.add(key);
                }
                const started=performance.now();let reply;
                turnDeadline=0;
                const entry=operation(message.op),queueMs=Math.max(0,Date.now()-message.sentAt);
                stats.queueMaxMs=Math.max(stats.queueMaxMs,queueMs);entry.queueMaxMs=Math.max(entry.queueMaxMs,queueMs);
                if(message.previousRpc&&message.previousRpc.path==='direct-worker'){
                    const previous=operation(message.previousRpc.op),ms=message.previousRpc.ms||0;
                    stats.rpcMaxMs=Math.max(stats.rpcMaxMs,ms);previous.rpcCount++;previous.rpcTotalMs+=ms;previous.rpcMaxMs=Math.max(previous.rpcMaxMs,ms);
                }
                try{reply={value:call(message.op,message.args)};}catch(error){reply={error:error.message};}
                if(cacheClock&&!reply.error)sampleImu();
                if(cacheClock&&!reply.error)reply.clockCache={time:elapsed,motorWrites:true,reads:Math.max(0,Math.floor((controlStep-ioBudget-1e-10)/(motorTiming.cachedReadUs/1000000))),
                    ...(config.imu?{imu:Object.fromEntries(['roll','pitch','yaw'].map(axis=>[axis,(imuPeriod?imuSample[axis]:imu(axis))+(offsets[axis]||0)]))}:{})};
                const data=encoder.encode(JSON.stringify(reply));bytes.set(data);Atomics.store(header,1,data.length);Atomics.store(header,0,1);Atomics.notify(header,0);
                const ms=performance.now()-started;stats.count++;stats.totalMs+=ms;stats.maxMs=Math.max(stats.maxMs,ms);
                entry.count++;entry.totalMs+=ms;entry.maxMs=Math.max(entry.maxMs,ms);
            }
        };return api;
    }
    root.PhysicsControl={create};if(typeof module!=='undefined')module.exports=root.PhysicsControl;
})(typeof window!=='undefined'?window:globalThis);
