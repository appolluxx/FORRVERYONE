'use strict';
// Own a plain serial monitor, without sending MicroPython REPL commands.
module.exports=function({SerialPort,output,changed=()=>{},error=()=>{}}){
 let port=null,queue=Promise.resolve();
 const enqueue=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
 async function close(){const previous=port;if(!previous)return;port=null;changed();if(previous.isOpen)await new Promise((resolve,reject)=>previous.close(e=>e?reject(e):resolve()));}
 return {
  get path(){return port?.isOpen?port.path:null;},
  open(address){return enqueue(async()=>{
   if(port?.isOpen&&port.path===address)return;
   await close();
   // Windows bindings enable DTR when hupcl is true (the default).
   // DTR drives IO0/button B on these boards: release it at open time,
   // rather than briefly asserting it and correcting it afterwards.
   const next=new SerialPort({path:address,baudRate:115200,autoOpen:false,hupcl:false,rtscts:false});
   const decoder=new TextDecoder('utf-8');port=next;
   // The terminal needs CR+LF to start the next line at column zero.
   // Preserve existing CRLF, including when it spans serial chunks, and
   // preserve standalone CR used by progress displays.
   let previousCR=false;
   next.on('data',chunk=>{
    if(port!==next)return;
    const text=decoder.decode(chunk,{stream:true});let rendered='';
    for(const character of text){
     rendered+=character==='\n'&&!previousCR?'\r\n':character;
     previousCR=character==='\r';
    }
    if(rendered)output(rendered);
   });
   next.on('error',e=>{if(port===next)error(e);});
   next.on('close',()=>{if(port===next){port=null;changed();}});
   try{
    await new Promise((resolve,reject)=>next.open(e=>e?reject(e):resolve()));
    await new Promise((resolve,reject)=>next.set({dtr:false,rts:false},e=>e?reject(e):resolve()));
    changed();
   }
   catch(e){await close().catch(()=>{});throw e;}
  });},
  close(){return enqueue(close);},
  write(text){if(port?.isOpen)port.write(text,e=>{if(e)error(e);});}
 };
};
