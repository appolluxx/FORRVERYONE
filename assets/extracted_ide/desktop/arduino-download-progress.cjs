'use strict';
// Arduino CLI writes carriage-return progress lines, sometimes split across chunks.
module.exports=function createProgress(emit){
 let tail='';
 const bytes=(value,unit)=>Number(value)*({B:1,KB:1000,MB:1e6,GB:1e9,KIB:1024,MIB:1024**2,GIB:1024**3}[unit.toUpperCase()]||1);
 return text=>{
  tail=(tail+String(text).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'')).slice(-4096);
  const lines=tail.split(/[\r\n]/);tail=lines.pop();
  for(const raw of [...lines,tail]){
   const message=raw.trim();if(!message)continue;
   const ratio=message.match(/([\d.]+)\s*(B|[KMGT]i?B)\s*\/\s*([\d.]+)\s*(B|[KMGT]i?B)/i);
   const pct=message.match(/(\d+(?:\.\d+)?)\s*%/);
   if(ratio)emit({phase:'downloading',received:bytes(ratio[1],ratio[2]),total:bytes(ratio[3],ratio[4]),message:message.slice(-180)});
   else if(pct)emit({phase:'downloading',received:Math.min(100,Number(pct[1])),total:100,unit:'percent',message:message.slice(-180)});
   else emit({phase:/download/i.test(message)?'downloading':'installing',message:message.slice(-180)});
  }
 };
};
