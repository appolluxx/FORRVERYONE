(function(root){
    'use strict';
    const script=typeof document!=='undefined'&&document.currentScript;
    const url=script?new URL('python-worker.js',script.src).href:'robot-sim/python-worker.js';
    function createSimulationClock(readTime){
        if(typeof readTime!=='function')return null;
        let previous;
        try{previous=readTime();}catch(error){return null;}
        if(!Number.isFinite(previous))return null;
        const shared=typeof SharedArrayBuffer!=='undefined'?new SharedArrayBuffer(16):null;
        const header=shared&&new Int32Array(shared,0,2),value=shared&&new Float64Array(shared,8,1),waiters=new Set();
        let elapsed=0,closed=false;
        if(header)Atomics.store(header,1,1);
        function publish(){
            // A sequence lock protects the Float64 on browsers without
            // Float64 atomics. Waiters wake only when simulation time moves.
            if(header){Atomics.add(header,0,1);value[0]=elapsed;Atomics.add(header,0,1);Atomics.notify(header,0);}
            for(const waiter of waiters)if(elapsed+1e-12>=waiter.deadline){waiters.delete(waiter);waiter.resolve();}
        }
        function sample(){
            if(closed)return;
            let current;try{current=readTime();}catch(error){return;}
            if(!Number.isFinite(current))return;
            const delta=current-previous;previous=current;
            // Reset/placement can rewind the solver. Keep the firmware
            // monotonic and continue from the new physical origin.
            if(delta>0){elapsed+=delta;publish();}
        }
        const timer=setInterval(sample,4);
        return {shared,sample,now(){sample();return elapsed;},sleep(seconds){
            sample();if(closed||seconds<=0)return Promise.resolve();
            return new Promise(resolve=>waiters.add({deadline:elapsed+seconds,resolve}));
        },close(){
            if(closed)return;closed=true;clearInterval(timer);
            if(header){Atomics.store(header,1,0);Atomics.add(header,0,2);Atomics.notify(header,0);}
            for(const waiter of waiters)waiter.resolve();waiters.clear();
        }};
    }
    class Runtime {
        constructor(devices,options){this.devices=devices;this.options=options||{};this.active=null;this.callTimings=Object.create(null);}
        clearTrace(run){if(run&&run.buttonTimer){clearInterval(run.buttonTimer);run.buttonTimer=null;}if(run&&run.traceTimer){clearInterval(run.traceTimer);run.traceTimer=null;}if(this.devices.highlight)this.devices.highlight(null);}
        readPerformance(){const result=this.callTimings;this.callTimings=Object.create(null);return result;}
        async measuredCall(run,op,args){
            const start=performance.now();
            const sensorRead=op==='adc_scan'||op==='adc_row'||(op==='sensor'&&args[1]==='analog');
            const entry=this.callTimings[op]||(this.callTimings[op]={count:0,totalMs:0,maxMs:0});
            if(sensorRead){
                const key=op==='sensor'?op+':'+args[0]:op;
                const previous=(run.sensorReads||(run.sensorReads=Object.create(null)))[key];
                const sim=this.devices.simulationTime?this.devices.simulationTime():undefined;
                if(previous){
                    const gap=start-previous.wall;
                    entry.gapCount=(entry.gapCount||0)+1;entry.totalGapMs=(entry.totalGapMs||0)+gap;entry.maxGapMs=Math.max(entry.maxGapMs||0,gap);
                    if(gap>20){
                        const gaps=entry.gaps||(entry.gaps=[]);
                        gaps.push({wallMs:gap,simMs:Number.isFinite(sim)&&Number.isFinite(previous.sim)?(sim-previous.sim)*1000:null,pin:args[0],previousOperation:run.lastOperation,previousRpc:run.previousRpc||null,queueDelayMs:run.queueDelayMs});
                        if(gaps.length>8)gaps.shift();
                    }
                }
                run.sensorReads[key]={wall:start,sim};
            }
            run.lastOperation=op;
            try{return await this.call(run,op,args);}finally{
                const elapsed=performance.now()-start,finished=this.callTimings[op]||(this.callTimings[op]={count:0,totalMs:0,maxMs:0});
                finished.count++;finished.totalMs+=elapsed;finished.maxMs=Math.max(finished.maxMs,elapsed);
            }
        }
        stop(){const run=this.active;this.clearTrace(run);if(!run)return;this.active=null;if(run.clock)run.clock.close();run.worker.terminate();if(run.control)run.control.close();clearTimeout(run.timer);run.waiters.forEach(w=>{clearTimeout(w.timer);w.resolve();});run.resolve(false);}
        run(code,files,settings){
            this.stop();
            this.callTimings=Object.create(null);
            return new Promise((resolve,reject)=>{
                const firmware = settings && ['buildbot','atom-vx'].includes(settings.firmware) && settings.firmware;
                if (firmware && typeof SharedArrayBuffer === 'undefined') {
                    const reason = !globalThis.isSecureContext
                        ? 'Firmware SIM needs HTTPS. Open the IDE using a trusted HTTPS address; HTTP over a LAN IP does not allow shared memory.'
                        : !globalThis.crossOriginIsolated
                            ? 'Firmware SIM needs cross-origin isolation. The web server must send COOP: same-origin and COEP: require-corp headers.'
                            : 'Shared memory is unavailable in this browser. Use a supported browser or the desktop IDE.';
                    reject(new Error(reason)); return;
                }
                const workerUrl = settings?.cppWasm ? url.replace('python-worker.js','cpp-worker.js') : firmware ? url.replace('python-worker.js', 'firmware-worker.js') : url;
                const worker=this.options.workerFactory?this.options.workerFactory(workerUrl):new root.Worker(workerUrl);
                const run={worker,resolve,reject,waiters:new Set(),started:Date.now(),angleOffsets:{}};this.active=run;
                if(firmware&&(settings?.cppWasm||typeof this.devices.openControlChannel==='function')){
                    // Publish human input independently of firmware polling.
                    // A tight wait-for-button loop must not block on the DOM.
                    run.buttonShared=new SharedArrayBuffer(8);
                    const values=new Int32Array(run.buttonShared);
                    const pins=firmware==='atom-vx'?['ATOM_BUTTON_A','IO0']:['IO44','IO43'];
                    const publish=()=>pins.forEach((pin,i)=>{
                        try{Atomics.store(values,i,this.devices.sensor(pin,'digital')?1:0);}
                        catch(error){Atomics.store(values,i,-1);}
                    });
                    publish();run.buttonTimer=setInterval(publish,8);
                }
                if(firmware&&settings&&settings.traceBlocks&&this.devices.highlight){
                    run.traceBlocks=settings.traceBlocks.slice();run.traceShared=new SharedArrayBuffer(35*4);
                    const trace=new Int32Array(run.traceShared);Atomics.store(trace,0,-1);let previous='';
                    run.traceTimer=setInterval(()=>{
                        if(this.active!==run)return;
                        const index=Atomics.load(trace,0),calls=Array.from({length:Math.min(32,Atomics.load(trace,1))},(_,i)=>Atomics.load(trace,i+2));
                        const stage=Atomics.load(trace,34),key=index+':'+calls.join(',')+':'+stage;
                        if(key!==previous){previous=key;this.devices.highlight(run.traceBlocks[index]||null,calls.map(i=>run.traceBlocks[i]).filter(Boolean),run.traceStages?.[stage]||null);}
                    },50);
                }
                if (firmware) {
                    run.shared = new SharedArrayBuffer(1024 * 1024);
                    // Reuse reply views/encoder across sensor and motor calls.
                    // A scan loop otherwise allocates these wrappers every RPC.
                    run.replyHeader=new Int32Array(run.shared,0,2);
                    run.replyBuffer=new Uint8Array(run.shared,8);
                    run.replyEncoder=new TextEncoder();
                }
                run.clock=createSimulationClock(this.devices.simulationTime&&(()=>this.devices.simulationTime()));
                const fail=error=>{if(this.active!==run)return;this.clearTrace(run);this.active=null;if(run.clock)run.clock.close();worker.terminate();if(run.control)run.control.close();clearTimeout(run.timer);run.waiters.forEach(w=>{clearTimeout(w.timer);w.resolve();});reject(error);};
                run.timer=setTimeout(()=>fail(new Error('Python SIM did not start. Restart the IDE and try again.')),15000);
                worker.onerror=e=>fail(new Error(e.message||'Python SIM worker failed.'));
                worker.onmessageerror=()=>fail(new Error('Invalid Python SIM message.'));
                worker.onmessage=async event=>{
                    if(this.active!==run)return;
                    const m=event.data;
                    if(m.type==='trace-stages'){run.traceStages=m.stages;return;}
                    if(m.type==='progress'){
                        if(m.text==='Running firmware program...'||m.text==='Running Arduino C++ in Robot 3D SIM.')clearTimeout(run.timer);
                        if(this.devices.progress)this.devices.progress(m.text);return;
                    }
                    if(m.type==='ready'){
                        clearTimeout(run.timer);
                        if(firmware)run.timer=setTimeout(()=>fail(new Error('Firmware runtime could not finish loading. Restart the updated IDE.')),60000);
                        if(firmware&&this.devices.openControlChannel){
                            try{run.control=this.devices.openControlChannel(run.shared,this.devices.getMotors(),values=>this.devices.motors(values));}catch(error){fail(error);return;}
                        }
                        if(run.control&&run.clock){run.clock.close();run.clock=null;}
                        worker.postMessage({type:'run',buttonShared:run.buttonShared,cppWasm:settings?.cppWasm,traceShared:run.traceShared,traceBlocks:run.traceBlocks,firmware,code,files:files||{},shared:run.shared,clockShared:run.control?run.control.clockShared:run.clock&&run.clock.shared,controlPort:run.control&&run.control.port,controlRequests:run.control&&run.control.requestShared,controlSensorPorts:run.control&&run.control.sensorPorts,controlDistancePorts:run.control&&run.control.distancePorts,controlCooperative:!!(run.control&&run.control.cooperative),localDigitalWrites:typeof this.devices.digitalWrite!=='function',started:run.started,profile:!!this.options.onProfile,adcScan:firmware==='buildbot'&&typeof this.devices.sensorScan==='function'},run.control?[run.control.port]:[]);return;
                    }
                    if(m.type==='print'){this.devices.print(m.text.replace(/\n$/,''));return;}
                    if(m.type==='profile'){this.lastProfile=m.operations;if(this.options.onProfile)this.options.onProfile(m.operations);return;}
                    if(m.type==='error'){fail(new Error(m.message));return;}
                    if(m.type==='done'){this.clearTrace(run);this.active=null;if(run.clock)run.clock.close();clearTimeout(run.timer);worker.terminate();if(run.control)run.control.close();resolve(true);return;}
                    if (m.type === 'sync-call') {
                        run.previousRpc=m.previousRpc||null;run.queueDelayMs=Number.isFinite(m.sentAt)?Math.max(0,Date.now()-m.sentAt):null;
                        const entry=this.callTimings[m.op]||(this.callTimings[m.op]={count:0,totalMs:0,maxMs:0});
                        if(Number.isFinite(m.sentAt)){const delay=Math.max(0,Date.now()-m.sentAt);entry.queueTotalMs=(entry.queueTotalMs||0)+delay;entry.queueMaxMs=Math.max(entry.queueMaxMs||0,delay);}
                        if(m.previousRpc&&Number.isFinite(m.previousRpc.ms)){
                            const previous=this.callTimings[m.previousRpc.op]||(this.callTimings[m.previousRpc.op]={count:0,totalMs:0,maxMs:0});
                            previous.rpcCount=(previous.rpcCount||0)+1;previous.rpcTotalMs=(previous.rpcTotalMs||0)+m.previousRpc.ms;previous.rpcMaxMs=Math.max(previous.rpcMaxMs||0,m.previousRpc.ms);
                        }
                        let reply;
                        try { reply = {value: await this.measuredCall(run,m.op,m.args)}; }
                        catch (error) { reply = {error: error.message}; }
                        if (this.active !== run) return;
                        let data = run.replyEncoder.encode(JSON.stringify(reply));
                        const header = run.replyHeader, buffer = run.replyBuffer;
                        if (data.length > buffer.length) data = run.replyEncoder.encode(JSON.stringify({error:'Firmware device reply is too large.'}));
                        buffer.set(data); Atomics.store(header,1,data.length); Atomics.store(header,0,1); Atomics.notify(header,0);
                        return;
                    }
                    if(m.type!=='call')return;
                    try{const value=await this.measuredCall(run,m.op,m.args);if(this.active===run)worker.postMessage({type:'reply',id:m.id,value});}
                    catch(error){if(this.active===run)worker.postMessage({type:'reply',id:m.id,error:error.message});}
                };
            });
        }
        async call(run,op,args){
            const d=this.devices,number=v=>{v=Number(v);if(!Number.isFinite(v))throw new Error('Device value must be a finite number.');return v;};
            switch(op){
                case 'preferences':if(!d.preferences)throw Error('Preferences storage is unavailable');return d.preferences(args[0]);
                case 'encoder':return d.sensor('IO'+number(args[0]),'encoder',{pinB:'IO'+number(args[1])});
                case 'i2c_probe':
                case 'i2c_read':{
                    const port='I2C'+number(args[0])+':0x'+number(args[1]).toString(16);
                    try{
                        if(number(args[1])!==0x29)return op==='i2c_probe'?false:-1;
                        const metres=number(d.sensor(port,'distance'));
                        if(op==='i2c_probe')return true;
                        return number(args[2])===0x1e?Math.max(0,Math.min(65535,Math.round(metres*1000))):0;
                    }catch(error){if(/^No simulated sensor is connected/.test(error.message))return op==='i2c_probe'?false:-1;throw error;}
                }
                case 'nvm_read': return d.getNvm ? d.getNvm() : (this.nvm || Array(512).fill(0));
                case 'nvm_write': this.nvm = args[0]; if(d.setNvm)d.setNvm(args[0]); break;
                case 'adc_row': {
                    const row = d.sensorRow ? d.sensorRow() : Array.from({length:8},(_,i)=>d.sensor('ADC'+i,'analog'));
                    if (!Array.isArray(row) || row.length !== 8) throw new Error('ADC scan must contain eight channels.');
                    return row.map(value=>Math.round(Math.max(0,Math.min(4095,number(value)))*1023/4095));
                }
                case 'adc_scan': {
                    const values=d.sensorScan();
                    if(!Array.isArray(values)||values.length!==10)throw Error('ADC scan must contain ten channels.');
                    return {row:values.slice(0,8).map(value=>Math.round(Math.max(0,Math.min(4095,number(value)))*1023/4095)),side:values.slice(8)};
                }
                case 'digital': return !!d.sensor(String(args[0]),'digital');
                case 'digital_write': {
                    if(!run.digitalLevels)run.digitalLevels=new Map();
                    const pin=String(args[0]),high=!!args[1];
                    if(!high&&run.digitalLevels.get(pin))run.ultrasonicTrigger=pin;
                    run.digitalLevels.set(pin,high);
                    // DigitalInOut retains its output latch in the firmware
                    // boundary. Notify a modeled output when one is available.
                    if(d.digitalWrite)d.digitalWrite(String(args[0]),!!args[1]);
                    break;
                }
                case 'pulse': {
                    // HC-SR04's unchanged driver consumes microseconds and
                    // converts them to cm; the scene measures metres.
                    const pulse={triggerPort:args[1]&&typeof args[1].triggerPort==='string'?args[1].triggerPort:run.ultrasonicTrigger||''};run.ultrasonicTrigger='';
                    const metres=number(d.sensor(String(args[0]),'distance',pulse));
                    return metres < 0 ? 65535 : Math.min(65535,Math.round(metres*100/.017));
                }
                case 'servo_release': if(d.servoRelease)d.servoRelease(args[0]); else throw new Error('Servo release is not supported in this simulation.'); break;
                case 'tone': if(d.tone)d.tone(number(args[0]),number(args[1]),args[2]===undefined?0:number(args[2])); break;
                case 'motor':{const port=number(args[0])-1;if(!Number.isInteger(port)||port<0||port>3)throw new Error('Choose motor M1 through M4.');const values=d.getMotors().slice();values[port]=number(args[1]);d.motors(values);break;}
                case 'motors':d.motors(args.map(number));break;
                case 'drive':d.motors(d.driveTargets(number(args[0]),number(args[1]))||[number(args[0]),number(args[1]),0,0]);break;
                case 'servo':d.servo(/^\d+$/.test(String(args[0]))?'S'+args[0]:args[0],number(args[1]));break;
                case 'sensor':return d.sensor(String(args[0]),args[1]);
                case 'display':d.display(args[0]);break;
                case 'imu_display_offsets':
                    if(d.imuDisplayOffsets)d.imuDisplayOffsets(args[0]);
                    return null;
                case 'imu':
                case 'imu_offset':{
                    const axis=String(args[0]);if(!['roll','pitch','yaw'].includes(axis)||!d.imu)throw new Error('Unsupported IMU axis: '+axis);
                    const measured=number(d.imu(axis));
                    if(op==='imu_offset'){run.angleOffsets[axis]=number(args[1])-measured;return null;}
                    return measured+(run.angleOffsets[axis]||0);
                }
                case 'clock':return run.clock?run.clock.now():(Date.now()-run.started)/1000;
                case 'time':return run.clock?run.started/1000+run.clock.now():Date.now()/1000;
                case 'sleep':{
                    const ms=number(args[0])*1000;if(ms<0||ms>2147483647)throw new Error('Invalid sleep duration.');
                    if(run.clock&&ms>0){await run.clock.sleep(ms/1000);break;}
                    await new Promise(resolve=>{const waiter={resolve};waiter.timer=setTimeout(()=>{run.waiters.delete(waiter);resolve();},ms);run.waiters.add(waiter);});break;
                }
                default:throw new Error('Python SIM does not support device command: '+op);
            }
            return null;
        }
    }
    root.SimPythonRuntime={Runtime,createSimulationClock};if(typeof module!=='undefined')module.exports=root.SimPythonRuntime;
})(typeof window!=='undefined'?window:globalThis);
