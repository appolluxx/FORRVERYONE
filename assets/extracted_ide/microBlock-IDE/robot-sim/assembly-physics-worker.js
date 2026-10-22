/* Physics-only worker: no DOM, WebGL, GLB or texture copies. */
(function(){
    'use strict';
    let Kernel,Transport,Control,listen,send;
    if(typeof importScripts==='function'){
        importScripts('../dashboard/js/three.min.js','vendor/cannon-0.6.2.min.js','assembly-physics-wasm.js','assembly-physics-kernel.js','physics-shared-transport.js','field-map.js','product-runtime.js','physics-control.js');
        Control=self.PhysicsControl;
        Transport=self.PhysicsSharedTransport;
        Kernel=self.AssemblyPhysicsKernel;listen=handler=>{self.onmessage=event=>handler(event.data);};send=(value,transfer)=>self.postMessage(value,transfer);
    }else{
        const port=require('worker_threads').parentPort;Kernel=require('./assembly-physics-kernel');Transport=require('./physics-shared-transport');Control=require('./physics-control');
        listen=handler=>port.on('message',handler);send=(value,transfer)=>port.postMessage(value,transfer);
    }
    let engine=null,generation=0,shared=null,sharedState=null,stepSize=1/240,queued=false,pumpChannel=null;
    let control=null,controlPort=null,controlSession=0;
    // Disjoint wall-time accounting, including time OUTSIDE pump(). A fast
    // solve can still run slowly while waiting for firmware, credits or tasks.
    // These counters observe scheduling only; they never grant or delay work.
    let accounting,accountingStarted,accountingAt,accountingMode;
    function resetAccounting(){
        accounting={computeMs:0,controlMs:0,snapshotMs:0,publishMs:0,overheadMs:0,schedulerMs:0,firmwareWaitMs:0,commandWaitMs:0,creditWaitMs:0,pumps:0,steps:0,responses:0,firmwareYields:0,commandYields:0,creditStarvations:0};
        accountingStarted=accountingAt=performance.now();accountingMode='creditWaitMs';
    }
    function account(mode){
        if(!accounting)return;
        const time=performance.now();accounting[accountingMode]+=Math.max(0,time-accountingAt);accountingAt=time;accountingMode=mode;
    }
    function accountingSample(){account(accountingMode);return {...accounting,elapsedMs:accountingAt-accountingStarted};}
    function idle(){if(accountingMode!=='creditWaitMs')accounting.creditStarvations++;account('creditWaitMs');}
    function controls(commands){return control?control.commands(commands):commands;}
    function controlState(){
        if(!control||!control.active())return {};
        return {controlSession,controlStats:control.stats,controlMotors:control.takeMotors()};
    }
    function diagnostics(){return {substeps:0,solverBudget:0,solverIterations:0,solverIterationsTotal:0,solverEquations:0,stalledActuators:0};}
    function queuePump(){
        if(queued||!shared)return;
        if(Atomics.load(shared.header,Transport.GENERATION)!==generation||Atomics.load(shared.header,Transport.PENDING)<=0){if(accounting)idle();return;}
        queued=true;
        account('schedulerMs');
        if(!pumpChannel){pumpChannel=new MessageChannel();pumpChannel.port1.onmessage=pump;}
        pumpChannel.port2.postMessage(0);
    }
    function pump(){
        queued=false;
        if(!shared||Atomics.load(shared.header,Transport.GENERATION)!==generation)return;
        account('overheadMs');accounting.pumps++;
        const activeGeneration=generation,started=performance.now();let steps=0,writing=false,waiting=false,packet;
        const timing=engine.world._stepDiagnostics=diagnostics();
        Atomics.store(shared.header,Transport.RUNNING,1);
        try{
            // Commands are sampled before EVERY fixed substep. Only result
            // publication is grouped; no renderer acknowledgement is needed.
            while(steps<2&&Atomics.load(shared.header,Transport.GENERATION)===activeGeneration&&Atomics.load(shared.header,Transport.PENDING)>0){
                account('controlMs');
                const command=shared.readCommands();if(!command){writing=true;break;}
                if(control&&control.active())control.drain();
                // Let firmware return the PWM calculated from this scan before
                // consuming another pose; bounded so read-only programs cannot
                // suspend physics. The reply port can wake us immediately.
                if(control&&control.active()&&control.waiting()){
                    // Stay available for a short burst of native Python I/O.
                    // Yielding after 2 ms repeatedly inserts worker task delays
                    // into that burst. This bounded atomic wait still grants
                    // no physical time while firmware owns the current pose.
                    const until=performance.now()+8;
                    account('firmwareWaitMs');
                    while(control.active()&&control.cooperative()&&control.waiting()&&performance.now()<until)control.waitForRequest(Math.max(0,until-performance.now()));
                    account('controlMs');
                    if(control.active()&&control.waiting()){waiting=true;break;}
                }
                Atomics.sub(shared.header,Transport.PENDING,1);
                const commands=controls(command.commands);account('computeMs');
                engine.step(stepSize,commands);account('controlMs');
                if(engine.world.doProfiling){
                    const profile=timing.physicsProfile||(timing.physicsProfile={});
                    for(const [key,value] of Object.entries(engine.world.profile))profile[key]=(profile[key]||0)+value;
                }
                if(control&&control.active()){control.tick();control.drain();}steps++;accounting.steps++;
                account('snapshotMs');
                if(sharedState){packet=Kernel.state(engine.world,engine.hinges);sharedState.publish(packet,activeGeneration);}
                account('overheadMs');
            }
            if(steps&&Atomics.load(shared.header,Transport.GENERATION)===activeGeneration){
                const computeMs=performance.now()-started;packet=packet||Kernel.state(engine.world,engine.hinges);
                account('publishMs');accounting.responses++;
                send({type:'state',impacts:Kernel.drainImpacts(engine.world),generation:activeGeneration,...controlState(),packet,steps,completedAt:Date.now(),timing:{computeMs,bodies:engine.world.bodies.length,contacts:engine.world.contacts.length,...timing,accounting:accountingSample()}},[packet.values.buffer]);
            }
        }catch(error){Atomics.store(shared.header,Transport.PENDING,0);send({type:'error',generation:activeGeneration,message:error.message});}
        finally{Atomics.store(shared.header,Transport.RUNNING,0);account('overheadMs');}
        if(writing||waiting){
            if(waiting){accounting.firmwareYields++;account('firmwareWaitMs');}
            else {accounting.commandYields++;account('commandWaitMs');}
            // Cooperative firmware wakes us through its next request. Polling
            // every millisecond wastes CPU and introduces timer clamping.
            if(!waiting||!control||!control.cooperative())setTimeout(queuePump,1);
        }else queuePump();
    }
    listen(message=>{
        try{
            if(message.type==='init'){
                generation=message.generation;engine=Kernel.restore(message.snapshot);
                engine.world.doProfiling=message.snapshot.profileTiming===true;
                shared=message.shared?Transport.connect(message.shared):null;stepSize=message.snapshot.timeStep||1/240;
                sharedState=message.sharedState?Transport.connectState(message.sharedState):null;
                resetAccounting();
                send({type:'ready',generation});return;
            }
            if(engine&&message.type==='control-open'){
                if(controlPort)controlPort.close();
                controlSession=message.session;control=Control.create(engine,message.config,message.reply,message.status,message.clock,message.requests);
                const opened=control;
                controlPort=message.port;controlPort.onmessage=event=>{
                    if(control!==opened)return;
                    const previous=accountingMode;account('controlMs');
                    try{if(event.data&&event.data.op)opened.receive(event.data);else opened.drain();}
                    finally{account(previous);}
                    queuePump();
                };return;
            }
            if(message.type==='control-close'){
                if(message.session===controlSession){if(controlPort)controlPort.close();controlPort=null;control=null;queuePump();}return;
            }
            if(engine&&message.type==='place'){
                generation=message.generation;
                if(shared)Atomics.store(shared.header,Transport.PENDING,0);
                Kernel.applyState(engine.world,engine.hinges,message.packet);
                engine.world.bodies.forEach(b=>{b.previousPosition.copy(b.position);b.interpolatedPosition.copy(b.position);b.force.set(0,0,0);b.torque.set(0,0,0);b.aabbNeedsUpdate=true;b.wakeUp();});
                engine.world.broadphase.dirty=true;
                resetAccounting();
                const packet=Kernel.state(engine.world,engine.hinges);
                if(sharedState)sharedState.publish(packet,generation);
                send({type:'state',generation,packet},[packet.values.buffer]);return;
            }
            if(engine&&message.type==='reset'){
                generation=message.generation;engine.reset(message.packet);
                resetAccounting();
                if(sharedState)sharedState.publish(Kernel.state(engine.world,engine.hinges),generation);
                if(shared)Atomics.store(shared.header,Transport.PENDING,0);
                send({type:'ready',generation});return;
            }
            if(!engine||message.generation!==generation)return;
            if(message.type==='advance'&&shared){queuePump();return;}
            if(message.type!=='step')return;
            // Aggregate a packet's substeps/islands without changing their
            // budgets or convergence. A stalled servo can increase the solve
            // budget independently of transport and rendering delays.
            const stepDiagnostics=engine.world._stepDiagnostics=diagnostics();
            account('overheadMs');accounting.pumps++;
            const stepStarted=performance.now();
            account('controlMs');
            if(control&&control.active())control.drain();
            const commands=controls(message.commands);account('computeMs');
            engine.step(message.dt,commands);account('controlMs');
            if(control&&control.active()){control.tick();control.drain();}
            const computeMs=performance.now()-stepStarted;
            accounting.steps+=stepDiagnostics.substeps;account('snapshotMs');
            const packet=Kernel.state(engine.world,engine.hinges);
            account('publishMs');accounting.responses++;
            send({type:'state',impacts:Kernel.drainImpacts(engine.world),generation,...controlState(),packet,timing:{computeMs,bodies:engine.world.bodies.length,contacts:engine.world.contacts.length,...stepDiagnostics,accounting:accountingSample()}},[packet.values.buffer]);
            idle();
        }catch(error){send({type:'error',generation:message.generation,message:error.message});}
    });
})();
