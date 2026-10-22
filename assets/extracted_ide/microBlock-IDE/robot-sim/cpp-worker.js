/* Runs compiled C++ in a terminable Wasm worker, never as a native executable. */
(() => {
 'use strict';
 const browser=typeof self!=='undefined'&&typeof self.postMessage==='function';
 if(browser)importScripts('cpp-task-scheduler.js');else globalThis.CppTaskScheduler=require('./cpp-task-scheduler.js');
 const port=browser?self:require('worker_threads').parentPort;
 const send=m=>port.postMessage(m);
 const listen=fn=>browser?self.onmessage=e=>fn(e.data):port.on('message',fn);
 let started=false;
 listen(async message=>{
  if(message.type!=='run'||started)return;started=true;
  let output='';
  let serialBatch='',serialAt=Date.now();
  const flushSerial=()=>{if(serialBatch){send({type:'print',text:serialBatch.replace(/\n$/,'')});serialBatch='';serialAt=Date.now();}};
  const print=text=>{output+=text;const index=output.lastIndexOf('\n');if(index>=0){serialBatch+=output.slice(0,index+1);output=output.slice(index+1);}if(output.length>4096){serialBatch+=output;output='';}if(serialBatch.length>=8192||Date.now()-serialAt>=16)flushSerial();};
  try{
   const header=new Int32Array(message.shared,0,2),bytes=new Uint8Array(message.shared,8),encoder=new TextEncoder(),decoder=new TextDecoder();
   const requestHeader=message.controlRequests&&new Int32Array(message.controlRequests,0,2),requestBytes=message.controlRequests&&new Uint8Array(message.controlRequests,8);
   const cooperative=!!(message.controlCooperative&&message.controlPort);
   function rpc(op,args=[],control=false){
    Atomics.store(header,0,0);
    const packet={type:'sync-call',op,args,sentAt:Date.now()};
    if(control){
     if(requestHeader){const data=encoder.encode(JSON.stringify(packet));requestBytes.set(data);Atomics.store(requestHeader,1,data.length);const waiting=Atomics.exchange(requestHeader,0,1)===2;Atomics.notify(requestHeader,0);if(!waiting)message.controlPort.postMessage(null);}
     else message.controlPort.postMessage(packet);
    }else send(packet);
    while(!Atomics.load(header,0))Atomics.wait(header,0,0);
    const result=JSON.parse(decoder.decode(bytes.slice(0,Atomics.load(header,1))));
    if(result.error)throw Error(result.error);return result.value;
   }
   const buttonInputs=message.buttonShared&&new Int32Array(message.buttonShared);
   const isButton=pin=>message.firmware==='atom-vx'?['ATOM_BUTTON_A','IO0'].includes(pin):['IO44','IO43'].includes(pin);
   function device(op,args){
    if(op==='display')return rpc(op,args);
    if(cooperative&&(['motor','motors','drive','adc_row','imu','imu_offset','encoder'].includes(op)||(op==='sensor'&&args[1]==='analog'&&/^ADC/.test(args[0]))))return rpc(op,args,true);
    if(cooperative)rpc('_control_external',['cpp:'+op+(op==='digital'&&isButton(args[0])?':'+args[0]:'')],true);
    if(op==='digital'&&isButton(args[0])&&buttonInputs){
     const index=args[0]===buttonPin(0)?0:1,value=Atomics.load(buttonInputs,index);
     if(value>=0)return !!value;
    }
    return rpc(op,args);
   }
   let displayQueue=[],lastDisplayFlush=0;
   function flushDisplay(){if(!displayQueue.length)return;const commands=displayQueue;displayQueue=[];lastDisplayFlush=Date.now();device('display',[{type:'batch',commands}]);}
   const rawSleep=ms=>cooperative?rpc('_control_sleep',[ms/1000],true):rpc('sleep',[ms/1000]);
   const clock=()=>1000*(cooperative?rpc('_control_clock',[],true):rpc('clock'));
   let toneUntil=0;
   function checkTone(){if(toneUntil&&clock()>=toneUntil){toneUntil=0;device('tone',[0,0]);}}
   function sleep(ms){flushSerial();flushDisplay();if(toneUntil){const remain=toneUntil-clock();if(remain>=0&&remain<ms){rawSleep(remain);toneUntil=0;device('tone',[0,0]);ms-=remain;}}rawSleep(ms);checkTone();}
   const buttonPin=id=>message.firmware==='atom-vx'?(id===0?'ATOM_BUTTON_A':'IO0'):(id===0?'IO44':'IO43');
   const levels=new Map(),pwm=new Map(),pinModes=new Map();let analogBits=12,imuEnabled=true;
   const floatingADC=new Map();
   function floatingValue(channel){
    const now=Date.now(),previous=floatingADC.get(channel);
    if(previous&&now-previous.time<2)return previous.value;
    const value=Math.round(Math.max(0,Math.min(1023,(previous?previous.value:Math.random()*1023)+(Math.random()-.5)*180)));
    floatingADC.set(channel,{time:now,value});return value;
   }
   function readADC(channel){
    if(floatingADC.has(channel))return floatingValue(channel);
    try{return Math.round(device('sensor',['ADC'+channel,'analog'])*1023/4095);}
    catch(error){
     if(!/^No simulated sensor is connected to ADC\d+\.$/.test(error.message))throw error;
     // An unconnected MCP3008 channel is still readable. Approximate a floating
     // voltage, not a calibrated surface reading or a fixed zero.
     return floatingValue(channel);
    }
   }
   const axes=['roll','pitch','yaw'];
   const rgb565=n=>'#'+[((n>>11)&31)*255/31,((n>>5)&63)*255/63,(n&31)*255/31].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
   function buildbotMotors(){device('drive',[(pwm.get(6)||0)*(levels.get(5)?-1:1),(pwm.get(12)||0)*(levels.get(42)?1:-1)]);}
   function call(op,a,b){
    if(Date.now()-serialAt>=16)flushSerial();
    if(displayQueue.length&&Date.now()-lastDisplayFlush>=16)flushDisplay();
    checkTone();
    switch(op){
     case 0:return clock();
     case 1:if(!Number.isFinite(a)||a<0)throw Error('Invalid delay');sleep(a);return 0;
     case 2:return device('digital',[buttonPin(a)])?0:1;
     case 3:try{return device('digital',['IO'+a])?1:0;}catch(error){if(/^No simulated sensor is connected/.test(error.message))return pinModes.get(a)===2?1:0;throw error;}
     case 4:flushDisplay();device('tone',[a,a>0?.5:0,b>0?b/1000:0]);toneUntil=a>0&&b>0?clock()+b:0;return 0;
     case 6:pinModes.set(a,b);return 0;
     case 7:{
      let value;
      if(message.firmware==='atom-vx'&&a===32)value=device('digital',['ATOM_BUTTON_A'])?1500+device('sensor',['ATOM_KNOB','analog']):0;
      else value=device('sensor',[message.firmware==='buildbot'&&[3,4].includes(a)?'ADC'+(a+5):'IO'+a,'analog']);
      return Math.round(value/4095*((2**analogBits)-1));
     }
     case 8:levels.set(a,!!b);if(message.firmware==='buildbot'&&[5,42].includes(a))buildbotMotors();device('digital_write',['IO'+a,!!b]);return 0;
     case 10:device('motor',[a,b]);return 0;
     case 11:device('servo',['S'+a,b]);return 0;
     case 12:return readADC(a);
     case 13:return device('sensor',['ATOM_KNOB','analog']);
     case 14:if(!imuEnabled)throw Error('IMU is disabled. Call setEnableIMU(true).');return ((device('imu',[axes[a]])%360)+360)%360;
     case 15:device('imu_offset',[axes[a],b]);return 0;
     case 16:{try{const value=device('pulse',['IO'+a]);return value>=65535||value>b?0:value;}catch(error){if(/^No simulated sensor is connected/.test(error.message))return 0;throw error;}}
     case 20:if(message.firmware!=='buildbot'||![6,12,13].includes(a))throw Error('analogWrite is not configured on IO'+a);if(a===13)device('tone',[1000,Math.max(0,Math.min(255,b))/255]);else {pwm.set(a,Math.max(0,Math.min(255,b))/255*100);buildbotMotors();}return 0;
     case 21:if(a<1||a>16)throw Error('ADC resolution must be 1..16 bits');analogBits=a;return 0;
     case 22:imuEnabled=!!a;return 0;
     case 23:imuEnabled=true;return 0; // The simulated IMU has no physical calibration bias.
     case 24:device('servo',['IO'+a,b]);return 0;
     case 40:return device('encoder',[a,b]);
     case 42:return device('i2c_probe',[Math.floor(a/128),a%128])?0:2;
     case 43:return device('i2c_read',[Math.floor(a/128),a%128,b]);
     default:throw Error('C++ SIM does not yet support this hardware command ('+op+').');
    }
   }
   let instance;
   const memory=()=>new DataView(instance.exports.memory.buffer);
   function display(op,x,y,w,h,color,ptr,len){
    if(len<0||len>1024*1024)throw Error('Display data is too large');
    const draw=c=>{if(c.type==='fill')displayQueue=[];displayQueue.push(c);};
    if(op===0)draw({type:'fill',color:rgb565(color)});
    else if(op===1)draw({type:'text',x,y,color:rgb565(color),text:decoder.decode(new Uint8Array(instance.exports.memory.buffer,ptr,len)),textSize:w,background:'#000000',wrap:true,font:'arduino'});
    else if(op===2){
     if(w*h!==len||w>320||h>320)throw Error('Invalid display bitmap size');
     draw({type:'pixels',x,y,width:w,height:h,pixels:Array.from(new Uint16Array(instance.exports.memory.buffer,ptr,len))});
    }else if(op===3){
     if(len>32)throw Error('Maximum 32 chart columns');const m=memory();
     for(let i=0;i<len;i++){
      const value=m.getInt32(ptr+i*4,true),height=Math.max(0,Math.min(118,Math.trunc(value*118/1023))),x=i*20+2;
      draw({type:'rect',x,y:0,width:16,height:118-height,color:rgb565(0x3186),fill:true});
      draw({type:'rect',x,y:118-height,width:16,height,color:'#ff0000',fill:true});
      draw({type:'text',x:x+2,y:120,text:'S'+i,textSize:1,font:'arduino',color:'#ffffff'});
      draw({type:'text',x:x+5,y:73,text:String(value),textSize:1,font:'arduino',rotation:-Math.PI/2,color:rgb565(0xd6ba)});
     }
    }else if(op===4||op===9)draw({type:'rect',x,y,width:w,height:h,color:rgb565(color),fill:op===4,screenRotation:len});
    else if(op===6)draw({type:'circle',x,y,radius:w,fill:!!h,color:rgb565(color),screenRotation:len});
    else if(op===7)draw({type:'roundrect',x,y,width:w,height:h,radius:ptr,fill:!!(len&1),color:rgb565(color),screenRotation:len>>1});
    else if(op===8)draw({type:'line',x,y,x2:w,y2:h,color:rgb565(color),screenRotation:len});
    else if(op===5){
     // The physical ST7735 is 128x160 at rotation 0 and 160x128 at rotation 1.
     let px=x,py=y,rotation=0;
     if(h===0){px=y;py=128-x;rotation=-Math.PI/2;}
     else if(h===2){px=160-y;py=x;rotation=Math.PI/2;}
     else if(h===3){px=160-x;py=128-y;rotation=Math.PI;}
     draw({type:'text',x:px,y:py,color:rgb565(color),text:decoder.decode(new Uint8Array(instance.exports.memory.buffer,ptr,len)),textSize:w,font:'arduino',rotation});
    }else throw Error('Unsupported C++ display command');
    if(displayQueue.length>=256||Date.now()-lastDisplayFlush>=16)flushDisplay();
   }
   function preferences(op,ns,partition,key,type,ptr,len){
    const readString=ptr=>{if(!ptr)return '';const data=new Uint8Array(instance.exports.memory.buffer);let end=ptr;while(end<data.length&&end-ptr<256&&data[end])end++;return decoder.decode(data.subarray(ptr,end));};
    if(len>65536) return 0;
    const result=device('preferences',[{op,namespace:readString(ns),partition:readString(partition),key:readString(key),type,bytes:op===1?Array.from(new Uint8Array(instance.exports.memory.buffer,ptr,len)):undefined}]);
    if(op===2&&Array.isArray(result)){
     if(!ptr||!len)return result.length;
     if(len<result.length)return 0;
     new Uint8Array(instance.exports.memory.buffer,ptr,result.length).set(result);return result.length;
    }
    return Number(result)||0;
   }
   const wasi={
    fd_write(fd,iovs,count,written){if(fd!==1&&fd!==2)return 8;let n=0;const m=memory();for(let i=0;i<count;i++){const p=m.getUint32(iovs+i*8,true),len=m.getUint32(iovs+i*8+4,true);print(decoder.decode(new Uint8Array(instance.exports.memory.buffer,p,len)));n+=len;}memory().setUint32(written,n,true);return 0;},
    fd_close(){return 0;},fd_seek(){return 8;},
    environ_sizes_get(count,size){memory().setUint32(count,0,true);memory().setUint32(size,0,true);return 0;},environ_get(){return 0;},
    args_sizes_get(count,size){memory().setUint32(count,0,true);memory().setUint32(size,0,true);return 0;},args_get(){return 0;},
    clock_time_get(id,precision,result){memory().setBigUint64(result,BigInt(Math.round(clock()*1e6)),true);return 0;},
    random_get(ptr,len){const data=new Uint8Array(instance.exports.memory.buffer,ptr,len);for(let i=0;i<len;i++)data[i]=Math.random()*256;return 0;},
    proc_exit(code){throw Error('C++ program exited ('+code+').');}
   };
   const scheduler=typeof WebAssembly.Suspending==='function'?CppTaskScheduler.create({call,clock,sleep,flush:flushDisplay}):null;
   let scheduling=false;
   const result=await WebAssembly.instantiate(message.cppWasm,{roboblocks:{call:scheduler?new WebAssembly.Suspending((...args)=>scheduling?scheduler.imported(...args):call(...args)):call,display,preferences,write:(ptr,len)=>print(decoder.decode(new Uint8Array(instance.exports.memory.buffer,ptr,len)))},wasi_snapshot_preview1:wasi});
   instance=result.instance;
   if(cooperative)rpc('_control_begin',[{
    motorTimingProfile:message.firmware==='atom-vx'?'pca9685-200khz':'coherent',
    imuReportMs:message.firmware==='atom-vx'?20:0
   }],true);
   send({type:'progress',text:'Running Arduino C++ in Robot 3D SIM.'});
   instance.exports._initialize?.();
   if(instance.exports.rb_requires_tasks?.()){
    if(!scheduler)throw Error('This sketch uses FreeRTOS tasks. Run it in the current Electron desktop version with WebAssembly JSPI support.');
    scheduling=true;await scheduler.run(instance);return;
   }
   const runSetup=scheduler?WebAssembly.promising(instance.exports.rb_setup):instance.exports.rb_setup;
   const runLoop=scheduler?WebAssembly.promising(instance.exports.rb_loop):instance.exports.rb_loop;
   await runSetup();
   // Yield simulated time even when loop() only polls a button.
   while(true){await runLoop();sleep(1);}
  }catch(error){flushSerial();if(output)send({type:'print',text:output});send({type:'error',message:String(error.message||error)});}
 });
 send({type:'ready'});
})();
