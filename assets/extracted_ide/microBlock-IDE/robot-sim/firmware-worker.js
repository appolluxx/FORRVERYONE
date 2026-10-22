/* CPython lives in a Worker. Synchronous hardware calls never block the UI. */
(function () {
    'use strict';
    const browser = typeof importScripts === 'function';
    let send, listen, load;
    if (browser) {
        importScripts('vendor/pyodide/pyodide.js');
        send = value => postMessage(value);
        listen = fn => { self.onmessage = e => fn(e.data); };
        load = async name => { const r = await fetch(name); if (!r.ok) throw Error('Could not load ' + name); return r.text(); };
    } else {
        const port = require('worker_threads').parentPort;
        global.loadPyodide = require('./vendor/pyodide/pyodide.js').loadPyodide;
        send = value => port.postMessage(value);
        listen = fn => port.on('message', fn);
        load = name => require('fs').promises.readFile(require('path').join(__dirname, name), 'utf8');
    }
    let started = false;
    let output = '', lastFlush = 0;
    function flush(force) {
        if (output && (force || Date.now()-lastFlush >= 50)) {
            send({type:'print',text:output.replace(/\n$/, '')}); output=''; lastFlush=Date.now();
        }
    }
    function print(text) { output=(output+text+'\n').slice(-16384); flush(false); }
    function simulationClock(shared) {
        if(!shared)return null;
        const header=new Int32Array(shared,0,2),value=new Float64Array(shared,8,1);
        function read(){
            for(;;){
                if(!Atomics.load(header,1))throw Error('Firmware simulation clock is closed.');
                const sequence=Atomics.load(header,0);
                if(sequence&1){Atomics.wait(header,0,sequence);continue;}
                const time=value[0];
                if(sequence===Atomics.load(header,0))return {time,sequence};
            }
        }
        return {now:()=>read().time,sleep(seconds){
            let state=read();const deadline=state.time+seconds;
            while(state.time+1e-12<deadline){
                // A pause or overloaded solver must also pause firmware
                // waits. This blocks the worker without spinning the CPU.
                Atomics.wait(header,0,state.sequence);state=read();
            }
        }};
    }
    listen(async message => {
        if (message.type !== 'run' || started) return;
        started = true;
        try {
            try {
                new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,126,3,2,1,0,7,5,1,1,102,0,0,10,6,1,4,0,66,0,11]))).exports.f();
            } catch (error) { throw Error('Firmware SIM requires Wasm BigInt support. Close and reopen the updated IDE.'); }
            send({type:'progress',text:'Loading offline CPython...'});
            const header = new Int32Array(message.shared, 0, 2), bytes = new Uint8Array(message.shared, 8);
            const clockOrigin = performance.now();
            const clockOffset = Number.isFinite(message.started) ? Math.max(0, Date.now()-message.started) / 1000 : 0;
            const sleepWord = new Int32Array(new SharedArrayBuffer(4));
            const sharedClock=simulationClock(message.clockShared);
            const timings=message.profile?Object.create(null):null;
            const py = await loadPyodide({ indexURL: browser ? new URL('vendor/pyodide/', self.location.href).href : require('path').join(__dirname, 'vendor/pyodide/'),
                stdout: print, stderr: print });
            send({type:'progress',text:'Loading display decoder...'});
            await py.loadPackage('pillow');
            // One latest-value slot, independent of hardware RPC/physics time.
            // The UI polls at 20 Hz; fast loops cannot flood its message queue.
            const trace=message.traceShared&&new Int32Array(message.traceShared);
            const traceIds=new Map((message.traceBlocks||[]).map((id,index)=>[id,index]));
            const traceCalls=[];
            const traceBlock=id=>{if(trace){const index=traceIds.get(String(id));if(index!==undefined){if(trace.length>34)Atomics.store(trace,34,0);Atomics.store(trace,0,index);}}};
            function publishCalls(){
                if(!trace||trace.length<3)return;
                const visible=traceCalls.slice(-32);
                visible.forEach((id,i)=>Atomics.store(trace,i+2,traceIds.get(String(id))??-1));
                Atomics.store(trace,1,visible.length);
            }
            py.registerJsModule('_sim_trace',{step:line=>{if(trace&&trace.length>34)Atomics.store(trace,34,line);},block:traceBlock,enter:id=>{traceCalls.push(String(id));publishCalls();traceBlock(id);},leave:()=>{const id=traceCalls.pop();publishCalls();if(id!==undefined)traceBlock(id);}});
            send({type:'progress',text:'Loading firmware libraries...'});
            const scanSides=new Map(),digitalLevels=new Map();let previousRpc=null,ultrasonicTrigger='';
            const controlHeader=message.controlRequests&&new Int32Array(message.controlRequests,0,2),controlBytes=message.controlRequests&&new Uint8Array(message.controlRequests,8),controlEncoder=new TextEncoder();
            const cooperative=!!(message.controlCooperative&&message.controlPort);
            const buttonInputs=message.buttonShared&&new Int32Array(message.buttonShared);
            const buttonPins=message.firmware==='atom-vx'?['ATOM_BUTTON_A','IO0']:['IO44','IO43'];
            let clockCache=null,clockReads=0,imuReads=0,motorWrites=[];
            function withClockReads(packet){
                if(motorWrites.length){packet.motorWrites=motorWrites;motorWrites=[];}
                if(clockReads){packet.clockReads=clockReads;clockReads=0;}
                if(imuReads){packet.imuReads=imuReads;imuReads=0;}
                clockCache=null;return packet;
            }
            function cacheReply(reply){clockCache=reply.clockCache||null;return reply;}
            function controlCall(op,args=[]){
                if(sharedClock)sharedClock.now();
                if(op==='_control_clock'&&clockCache&&clockCache.reads>0){clockCache.reads--;clockReads++;return clockCache.time;}
                Atomics.store(header,0,0);
                const packet=withClockReads({type:'sync-call',op,args,sentAt:Date.now()});
                if(controlHeader){const data=controlEncoder.encode(JSON.stringify(packet));controlBytes.set(data);Atomics.store(controlHeader,1,data.length);const waiting=Atomics.exchange(controlHeader,0,1)===2;Atomics.notify(controlHeader,0);if(!waiting)message.controlPort.postMessage(null);}
                else message.controlPort.postMessage(packet);
                while(!Atomics.load(header,0))Atomics.wait(header,0,0);
                const reply=cacheReply(JSON.parse(new TextDecoder().decode(bytes.slice(0,Atomics.load(header,1)))));
                if(reply.error)throw Error(reply.error);
                return reply.value;
            }
            if(cooperative)controlCall('_control_begin',[{
                motorTimingProfile:message.firmware==='atom-vx'?'i2c-registers':'coherent',cacheClock:message.firmware==='atom-vx'
                // Python's native IMU driver has its own report configuration;
                // do not inherit the Arduino library's BNO085 20 ms setting.
            }]);
            const invokeRequest = request => {
                flush(false);
                if(request[0]==='i2c_write_time'){
                    if(cooperative)controlCall('_control_bus_write',request.slice(1));
                    return '{"value":null}';
                }
                // Unmodeled output pins are only the ultrasonic trigger latch.
                // Keep them local; a render-thread round trip changes no scene
                // state and needlessly stalls the cooperative physics worker.
                if(message.localDigitalWrites&&request[0]==='digital_write'){
                    const pin=String(request[1]),high=!!request[2];
                    if(!high&&digitalLevels.get(pin))ultrasonicTrigger=pin;
                    digitalLevels.set(pin,high);scanSides.clear();
                    return '{"value":null}';
                }
                if(message.localDigitalWrites&&request[0]==='pulse'){
                    // Both RPC consumers expect trigger metadata immediately
                    // after the echo port. ATOM also supplies level/timeout;
                    // appending would leave its level in the metadata slot.
                    request.splice(2,0,{triggerPort:ultrasonicTrigger});ultrasonicTrigger='';
                }
                // One coherent ADC scan supplies the immediately following
                // side-channel reads. Each prefetched channel is used once;
                // any other operation invalidates the remaining values.
                if(request[0]==='sensor'&&request[2]==='analog'&&scanSides.has(request[1])){
                    const value=scanSides.get(request[1]);scanSides.delete(request[1]);
                    return JSON.stringify(value&&typeof value==='object'&&value.error?value:{value});
                }
                scanSides.clear();
                // Native motor helpers poll the stop button inside their PD
                // loop. Read the UI's shared input snapshot, just as C++ does,
                // instead of stalling physics on a renderer message each time.
                // Preserve the existing cooperative I/O timing and fallback.
                const buttonIndex=request[0]==='digital'?buttonPins.indexOf(String(request[1])):-1;
                if(buttonInputs&&buttonIndex>=0&&Atomics.load(buttonInputs,buttonIndex)>=0){
                    if(cooperative)controlCall('_control_external',['digital:'+String(request[1])]);
                    return JSON.stringify({value:!!Atomics.load(buttonInputs,buttonIndex)});
                }
                // Firmware timing follows integrated physics when available.
                // Shared memory keeps clock reads off the renderer RPC path.
                if (request[0] === 'clock') return JSON.stringify({value:cooperative?controlCall('_control_clock'):sharedClock?sharedClock.now():clockOffset+(performance.now()-clockOrigin)/1000});
                if (request[0] === 'time') return JSON.stringify({value:cooperative?message.started/1000+controlCall('_control_clock'):sharedClock?message.started/1000+sharedClock.now():Date.now()/1000});
                if (request[0] === 'sleep') {
                    const ms = Number(request[1])*1000;
                    if (!Number.isFinite(ms) || ms < 0 || ms > 2147483647) return JSON.stringify({error:'Invalid sleep duration.'});
                    if (ms > 0) {if(cooperative)controlCall('_control_sleep',[ms/1000]);else if(sharedClock)sharedClock.sleep(ms/1000);else Atomics.wait(sleepWord,0,0,ms);}
                    return '{"value":null}';
                }
                // IMU angles are constant while cooperative physics holds a
                // pose. Share the clock's bounded read allowance; the same
                // 10 us cost is settled before any write or step boundary.
                if(request[0]==='imu'&&clockCache&&clockCache.reads>0&&Object.prototype.hasOwnProperty.call(clockCache.imu||{},request[1])){
                    if(sharedClock)sharedClock.now();
                    clockCache.reads--;imuReads++;
                    return JSON.stringify({value:clockCache.imu[request[1]]});
                }
                // Decoded PCA outputs cost no extra bus time (the preceding
                // register write already paid it). Carry them to the next RPC
                // with intervening read costs in order. Physics is held until
                // then, and applies every write before it can advance.
                if(request[0]==='motor'&&clockCache?.motorWrites&&motorWrites.length<16&&Number.isInteger(Number(request[1]))&&Number(request[1])>=1&&Number(request[1])<=4&&Number.isFinite(Number(request[2]))){
                    if(sharedClock)sharedClock.now();
                    motorWrites.push({args:request.slice(1),clockReads,imuReads});clockReads=0;imuReads=0;
                    return '{"value":null}';
                }
                Atomics.store(header, 0, 0);
                const requestedAt=performance.now();
                const scan=message.adcScan&&request[0]==='adc_row';
                const op=scan?'adc_scan':request[0];
                const directDistance=(message.controlDistancePorts||[]).includes(String(request[1]).toUpperCase())&&((op==='pulse'&&message.localDigitalWrites)||(op==='sensor'&&request[2]==='distance'));
                const direct=message.controlPort&&(directDistance||['adc_scan','adc_row','motor','motors','drive','imu','imu_offset'].includes(op)||
                    ((op==='sensor'&&request[2]!=='distance'||op==='digital')&&(message.controlSensorPorts||[]).includes(String(request[1]).toUpperCase())));
                // Keep the pose fixed throughout renderer-backed I/O too.
                // Consume this handshake reply before reusing the reply buffer.
                if(cooperative&&!direct){controlCall('_control_external',[op+':'+String(request[1])]);Atomics.store(header,0,0);}
                const packet={type:'sync-call',op,args:request.slice(1),sentAt:Date.now(),previousRpc};
                if(direct){
                    withClockReads(packet);
                    // A failed/disposed physics worker closes this clock too;
                    // never wait on an orphaned hardware reply indefinitely.
                    if(sharedClock)sharedClock.now();
                    if(controlHeader){const data=controlEncoder.encode(JSON.stringify(packet));controlBytes.set(data);Atomics.store(controlHeader,1,data.length);const waiting=Atomics.exchange(controlHeader,0,1)===2;Atomics.notify(controlHeader,0);if(!waiting)message.controlPort.postMessage(null);}
                    else message.controlPort.postMessage(packet);
                }else send(packet);
                // The renderer writes the reply before notifying. Stop terminates us.
                while (Atomics.load(header, 0) === 0) Atomics.wait(header, 0, 0);
                previousRpc={op:scan?'adc_scan':request[0],ms:performance.now()-requestedAt,path:direct?'direct-worker':'renderer'};
                if(timings){const elapsed=performance.now()-requestedAt,entry=timings[request[0]]||(timings[request[0]]={count:0,totalMs:0,maxMs:0});entry.count++;entry.totalMs+=elapsed;entry.maxMs=Math.max(entry.maxMs,elapsed);}
                const reply=new TextDecoder().decode(bytes.slice(0, Atomics.load(header, 1)));
                if(direct)cacheReply(JSON.parse(reply));
                if(scan){
                    const result=JSON.parse(reply);
                    if(!result.error){
                        result.value.side.forEach((v,i)=>scanSides.set('ADC'+(8+i),v));
                        return JSON.stringify({value:result.value.row});
                    }
                }
                return reply;
            };
            py.registerJsModule('_sim_native', {
                invoke: json => invokeRequest(JSON.parse(json)),
                // Scalar hardware calls cross Pyodide directly. Their physics
                // RPC and timing are identical; Python need not encode/decode
                // a JSON document on every clock, IMU or PWM transaction.
                value: (op,...args) => {
                    const reply=JSON.parse(invokeRequest([op,...args]));
                    if(reply.error)throw Error(reply.error);
                    return reply.value;
                }
            });
            const firmware = message.firmware || 'buildbot';
            if (!['buildbot', 'atom-vx'].includes(firmware)) throw Error('Unknown firmware profile: ' + firmware);
            const profile = JSON.parse(await load('firmware/' + firmware + '/profile.json'));
            const files = Object.assign({}, profile.files, message.files || {});
            py.FS.mkdirTree('/home/sim');
            for (const [name, source] of Object.entries(files)) {
                if (name.startsWith('/') || name.split(/[\\/]/).some(p => p === '..') || !name.endsWith('.py')) throw Error('Invalid Python module path: ' + name);
                const target = '/home/sim/' + name;
                py.FS.mkdirTree(target.slice(0, target.lastIndexOf('/')));
                py.FS.writeFile(target, source);
            }
            for (const [name, base64] of Object.entries(profile.assets)) {
                py.FS.mkdirTree(name.slice(0, name.lastIndexOf('/')));
                const data = browser ? Uint8Array.from(atob(base64), c => c.charCodeAt(0)) : Buffer.from(base64, 'base64');
                py.FS.writeFile(name, data);
            }
            py.runPython("import sys, os\nos.chdir('/home/sim')\nsys.path.insert(0, '/home/sim')");
            send({type:'progress',text:'Connecting simulated hardware...'});
            py.FS.writeFile('/home/sim/_sim_hardware.py', await load('firmware/' + firmware + '/hardware.py'));
            py.runPython('import _sim_hardware');
            if(firmware==='atom-vx'){
                // Only skip audited, unchanged stock helpers. Custom modules
                // and project overrides retain the ordinary switch trace.
                const untraced=['motor.py','pca9685.py'].filter(name=>typeof profile.files[name]==='string'&&files[name]===profile.files[name]).map(name=>'/home/sim/'+name);
                py.runPython('_sim_hardware._untraced_firmware = frozenset('+JSON.stringify(untraced)+')');
            }
            if (firmware === 'buildbot') py.runPython("sys.modules['_buildbot_hardware'] = _sim_hardware");
            if(trace&&trace.length>34&&typeof files['custom.py']==='string'){
                const stages=JSON.parse(py.runPython(await load('custom-trace.py')));
                send({type:'trace-stages',stages});
            }
            send({type:'progress',text:'Running firmware program...'});
            await py.runPythonAsync(message.code);
            if(motorWrites.length||clockReads||imuReads)controlCall('_control_flush');
            flush(true);
            if(timings)send({type:'profile',operations:timings});
            send({ type: 'done' });
        } catch (error) { flush(true); send({ type: 'error', message: String(error.message || error) }); }
    });
    send({ type: 'ready' });
})();
