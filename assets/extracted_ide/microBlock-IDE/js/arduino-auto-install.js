(function(root){
 'use strict';
 function create({api,isOnline,onError=()=>{}}){
  const cancelled=new Set();let pending=null;
  function run(){
   if(pending)return pending;
   if(!isOnline())return Promise.resolve();
   pending=(async()=>{
    const tools=await api('components');
    if(tools?.closing)return;
    for(const id of ['arduino-cli','cpp-sim']){
     if(!isOnline())break;
     if(cancelled.has(id)||tools.find(tool=>tool.id===id)?.installed)continue;
     try{const result=await api('install-component',{id});if(result?.closing)break;}catch(error){onError(error);}
    }
   })().catch(onError).finally(()=>{pending=null;});
   return pending;
  }
  return {run,cancel:id=>cancelled.add(id)};
 }
 if(typeof module==='object'&&module.exports)module.exports={create};
 root.ArduinoAutoInstall={create};
})(typeof window==='undefined'?globalThis:window);
