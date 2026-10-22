(function(root){
    'use strict';
    const Physics=root.AssemblyPhysics||(typeof require==='function'?require('./assembly-physics'):null);
    const Transport=root.PhysicsSharedTransport||(typeof require==='function'?require('./physics-shared-transport'):null);
    const script=typeof document!=='undefined'&&document.currentScript;
    const url=script?new URL('assembly-physics-worker.js',script.src).href:'robot-sim/assembly-physics-worker.js';
    function attach(engine,options){
        options=options||{};
        const factory=options.workerFactory||(typeof root.Worker==='function'?address=>new root.Worker(address):null);
        if(!factory)return engine;
        const localStep=engine.step.bind(engine),localReset=engine.reset.bind(engine),localDispose=engine.dispose.bind(engine);
        const localMove=engine.moveToXZ&&engine.moveToXZ.bind(engine);
        let worker,disposed=false,failed=false,ready=false,busy=false,generation=0,pending=0,timer=null;
        let current=engine.workerState(),samples=[current],playhead=0,playbackStarted=false;
        const initial=engine.workerSnapshot();
        const timeStep=initial.timeStep||1/240;
        const shared=options.sharedTransport===true&&Transport?Transport.create(engine.workerCommands()):null;
        const sharedState=shared&&Transport.createState?Transport.createState(current):null;
        engine.workerTransport=shared?'shared':'messages';
        function cancelShared(){if(shared){Atomics.store(shared.header,Transport.GENERATION,generation);Atomics.store(shared.header,Transport.PENDING,0);}}
        const now=options.now||(()=>performance.now());
        let controlSession=0,activeControl=null,controlStats=null;
        let sentAt=0,timings=[],sentSteps=1,transportMs=0;
        function accountingWindow(recent){
            const measured=recent.filter(t=>t.accounting);
            if(measured.length<2)return null;
            const first=measured[0].accounting,last=measured[measured.length-1].accounting;
            const windowMs=last.elapsedMs-first.elapsedMs;if(!(windowMs>0))return null;
            const result={windowMs};
            for(const key of Object.keys(last))if(key!=='elapsedMs')result[key]=Math.max(0,last[key]-(first[key]||0));
            result.computePerStepMs=result.steps?result.computeMs/result.steps:0;
            return result;
        }
        engine.workerPerformance=()=>{
            const recent=timings.filter(t=>now()-t.at<2000);
            if(!recent.length)return null;
            const sharedPending=shared?Math.max(0,Atomics.load(shared.header,Transport.PENDING))*timeStep:0;
            return {transport:engine.workerTransport,pendingMs:(pending+sharedPending)*1000,queuedPoses:samples.length,playhead,physicsTime:current.time,busy:shared?!!(sharedPending||Atomics.load(shared.header,Transport.RUNNING)):busy,inFlightMs:!shared&&busy?now()-sentAt:0,samples:recent.length,computeMs:recent.reduce((s,t)=>s+t.computeMs,0)/recent.length,
                feedbackSource:sharedState?'shared-state':'messages',control:controlStats,accounting:accountingWindow(recent),
                roundTripMs:recent.reduce((s,t)=>s+t.roundTripMs,0)/recent.length,
                computeMaxMs:Math.max(...recent.map(t=>t.computeMs)),
                roundTripMaxMs:Math.max(...recent.map(t=>t.roundTripMs)),
                transportMs:recent.reduce((s,t)=>s+Math.max(0,t.roundTripMs-t.computeMs),0)/recent.length,
                stepBudgetMs:timeStep*1000,bodies:recent[recent.length-1].bodies,contacts:recent[recent.length-1].contacts,
                physicsProfile:recent.some(t=>t.physicsProfile)?Object.fromEntries(Object.keys(recent.find(t=>t.physicsProfile).physicsProfile).map(key=>[key,recent.reduce((sum,t)=>sum+(t.physicsProfile?.[key]||0),0)/recent.length])):undefined,
                solverBudget:Math.max(...recent.map(t=>t.solverBudget||0)),
                solverIterations:Math.max(...recent.map(t=>t.solverIterations||0)),
                solverEquations:Math.max(...recent.map(t=>t.solverEquations||0)),
                stalledActuators:Math.max(...recent.map(t=>t.stalledActuators||0))};
        };
        function fail(error){
            if(disposed||failed)return;failed=true;engine.workerActive=false;clearTimeout(timer);if(worker)worker.terminate();
            if(activeControl)activeControl.abort(error);
            if(options.onError)options.onError(error);else console.warn('[Robot SIM] Physics worker unavailable; using local physics.',error);
        }
        function watchdog(){clearTimeout(timer);timer=setTimeout(()=>fail(new Error('Physics worker timed out')),10000);}
        function dispatch(){
            if(shared){
                if(!ready||failed||disposed)return;
                try{
                    shared.publishCommands(engine.workerCommands());
                    if(samples.length>=64)return;
                    const queued=Math.max(0,Atomics.load(shared.header,Transport.PENDING));
                    const count=Math.min(Math.floor((pending+1e-12)/timeStep),Math.max(0,Math.floor(.05/timeStep)-queued));
                    if(count<=0)return;
                    pending=Math.max(0,pending-count*timeStep);
                    Atomics.add(shared.header,Transport.PENDING,count);
                    watchdog();worker.postMessage({type:'advance',generation});
                }catch(error){fail(error);}
                return;
            }
            if(!ready||busy||failed||disposed||pending+1e-12<timeStep||samples.length>=64)return;
            // Normally publish each substep; slow transport may use a bounded
            // pair. Read commands here, including changes since the last RAF.
            // RAF intervals rarely divide evenly into fixed physics steps.
            // Retain the remainder here instead of paying a Worker roundtrip
            // for an unchanged pose while its accumulator fills up.
            // Amortize slow renderer/Worker delivery without increasing the
            // integrator step. Never queue more than one request or hold a
            // command for more than two physical substeps (8.33 ms at 240 Hz).
            sentSteps=options.disableBatching!==true&&transportMs>timeStep*1000*.5&&pending+1e-12>=timeStep*2?2:1;
            busy=true;const dt=timeStep*sentSteps;pending=Math.max(0,pending-dt);watchdog();sentAt=now();
            try{worker.postMessage({type:'step',generation,dt,commands:engine.workerCommands()});}catch(error){fail(error);}
        }
        function accept(packet){
            if(packet.time>current.time){
                current=packet;samples.push(current);
                if(!playbackStarted){playhead=current.time-1/30;playbackStarted=true;}
            }else if(packet.time===current.time){current=packet;samples[samples.length-1]=current;}
            engine.applyWorkerState(current);
        }
        engine.syncLatestPhysicsState=()=>{
            if(!sharedState||!ready||failed||disposed)return;
            const packet=sharedState.read(generation);if(packet)accept(packet);
        };
        function initialize(){ready=false;busy=false;pending=0;cancelShared();watchdog();worker.postMessage({type:'init',generation,snapshot:Object.assign({},initial,{state:current}),shared:shared?shared.buffer:null,sharedState:sharedState?sharedState.buffer:null});}
        try{
            worker=factory(url);
            worker.onmessage=event=>{
                const message=event.data;if(disposed||failed||message.generation!==generation)return;
                clearTimeout(timer);
                if(activeControl&&message.controlSession===controlSession){
                    controlStats=message.controlStats||controlStats;
                    if(message.controlMotors)activeControl.mirror(message.controlMotors);
                }
                if(message.type==='error'){fail(new Error(message.message));return;}
                if(message.type==='ready'){ready=true;dispatch();return;}
                if(message.type==='state'){
                    // Drain through the same render/capture path as local physics so
                    // one-shot contacts are both audible live and retained in Playback.
                    if(message.impacts?.length){
                        const queue=engine.world._audioImpacts||(engine.world._audioImpacts=[]);
                        queue.push(...message.impacts.slice(0,Math.max(0,64-queue.length)));
                    }
                    if((shared||busy)&&message.timing&&Number.isFinite(message.timing.computeMs)){
                        const count=shared?message.steps||1:sentSteps,compute=message.timing.computeMs;
                        // Shared transport has no roundtrip gate. Measure its
                        // compute plus delivery delay separately from credit
                        // publication; queued work must not look like latency.
                        const roundTrip=shared?compute+Math.max(0,Date.now()-message.completedAt)*count:Math.max(0,now()-sentAt);
                        transportMs=transportMs*.75+Math.max(0,roundTrip-compute)*.25;
                        const physicsProfile=message.timing.physicsProfile&&Object.fromEntries(Object.entries(message.timing.physicsProfile).map(([key,value])=>[key,value/count]));
                        timings.push({...message.timing,physicsProfile,at:now(),computeMs:compute/count,roundTripMs:roundTrip/count});
                        if(timings.length>480)timings.shift();
                    }
                    ready=true;
                    busy=false;
                    accept(message.packet);dispatch();
                    if(shared&&Atomics.load(shared.header,Transport.PENDING)>0)watchdog();
                }
            };
            worker.onerror=event=>{if(event.preventDefault)event.preventDefault();fail(new Error(event.message||'Physics worker failed'));};
            worker.onmessageerror=()=>fail(new Error('Invalid physics worker message'));
            initialize();
        }catch(error){fail(error);return engine;}
        engine.workerActive=true;
        engine.openControlChannel=(config,reply,initialMotors,onMotors)=>{
            if(failed||disposed||typeof MessageChannel==='undefined'||typeof SharedArrayBuffer==='undefined')return null;
            if(activeControl)activeControl.close();
            const channel=new MessageChannel(),status=new SharedArrayBuffer(40),clock=new SharedArrayBuffer(16),requests=new SharedArrayBuffer(4096);
            const header=new Int32Array(status,0,2),values=new Float64Array(status,8,4),clockHeader=new Int32Array(clock,0,2);
            values.set(Array.from({length:4},(_,i)=>Number(initialMotors[i])||0));Atomics.store(header,0,1);Atomics.store(clockHeader,1,1);
            const session=++controlSession;controlStats=null;
            const handle={distancePorts:(config.distances||[]).map(s=>String(s.port).toUpperCase()),cooperative:!!shared,port:channel.port2,clockShared:clock,requestShared:requests,sensorPorts:config.sensors.map(s=>String(s.port).toUpperCase()),mirror(values){if(activeControl===handle&&onMotors)onMotors(values);},abort(error){
                const data=new TextEncoder().encode(JSON.stringify({error:'Physics control stopped: '+error.message})),replyHeader=new Int32Array(reply,0,2);
                new Uint8Array(reply,8).set(data);Atomics.store(replyHeader,1,data.length);Atomics.store(replyHeader,0,1);Atomics.notify(replyHeader,0);handle.close();
            },close(){
                if(activeControl!==handle)return;
                Atomics.store(header,0,0);Atomics.store(clockHeader,1,0);Atomics.add(clockHeader,0,2);Atomics.notify(clockHeader,0);
                // Firmware has stopped before this call. Preserve its final outputs
                // in the ordinary command store before removing the override.
                if(onMotors)onMotors(Array.from(values));activeControl=null;channel.port2.close();
                if(!failed&&!disposed)worker.postMessage({type:'control-close',session});
            }};
            activeControl=handle;
            worker.postMessage({type:'control-open',session,config,reply,status,clock,requests,port:channel.port1},[channel.port1]);
            return handle;
        };
        // Command writes may wake pending work, but never advance the clock.
        engine.refreshCommands=dispatch;
        engine.step=dt=>{
            if(disposed)return;
            if(failed){localStep(dt);return;}
            const elapsed=Math.max(0,Math.min(.05,dt||0));
            const granted=shared?Math.max(0,Atomics.load(shared.header,Transport.PENDING))*timeStep:0;
            pending=Math.min(Math.max(0,.05-granted),pending+elapsed);dispatch();
            // Advance one continuous simulation timeline. Restarting a blend
            // on every message made constant motion stutter with Worker jitter.
            if(playbackStarted){
                // When physics runs below real time, consuming the entire
                // buffer makes motion alternate between packet-sized jumps.
                // Ease only the visible clock toward the available trajectory;
                // retain the normal 1/30 s buffer at full speed. Telemetry and
                // feedback still use current, with no extrapolated poses.
                const available=Math.max(0,current.time-playhead);
                const advance=Math.min(elapsed,available,available*elapsed*30);
                playhead+=advance;
            }
            const time=Math.max(samples[0].time,playhead);
            while(samples.length>2&&samples[1].time<=time)samples.shift();
            const a=samples[0],b=samples[1]||a,interval=b.time-a.time;
            const alpha=interval>0?Math.max(0,Math.min(1,(time-a.time)/interval)):1;
            engine.renderWorkerState(a,b,alpha,current);
            dispatch();
        };
        engine.reset=()=>{
            if(disposed)return;generation++;cancelShared();timings=[];transportMs=0;localReset();engine.world.time=0;
            current=engine.workerState();samples=[current];playhead=0;playbackStarted=false;pending=0;
            if(!failed){try{ready=false;busy=false;watchdog();worker.postMessage({type:'reset',generation,packet:current});}catch(error){fail(error);}}
        };
        if(localMove)engine.moveToXZ=(x,z,heading,bodyIndex,y,held)=>{
            if(disposed)return;
            engine.syncLatestPhysicsState();
            localMove(x,z,heading,bodyIndex,y,held);generation++;cancelShared();
            timings=[];
            transportMs=0;
            current=engine.workerState();samples=[current];playhead=current.time;playbackStarted=false;pending=0;
            if(!failed){
                busy=true;ready=false;watchdog();
                try{worker.postMessage({type:'place',generation,packet:current});}catch(error){fail(error);}
            }
        };
        engine.dispose=()=>{if(disposed)return;if(activeControl)activeControl.close();disposed=true;generation++;cancelShared();clearTimeout(timer);if(worker)worker.terminate();localDispose();};
        return engine;
    }
    // Keep autonomous shared dispatch for real-time throughput, with direct
    // latest-state reads for feedback. Unsupported browsers retain messages.
    const api={attach,create(T,visual,products,environment){const engine=Physics.create(T,visual,products,environment);return engine?attach(engine,{sharedTransport:true}):null;}};
    root.AssemblyPhysicsClient=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
