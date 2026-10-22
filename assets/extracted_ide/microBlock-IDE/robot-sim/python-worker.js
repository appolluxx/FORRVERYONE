/* Each Run owns one isolated Python interpreter; Stop terminates this Worker. */
(function(){
    'use strict';
    let send,listen;
    if(typeof importScripts==='function'){
        importScripts('vendor/skulpt/skulpt.min.js','vendor/skulpt/skulpt-stdlib.js','python-modules.js');
        send=value=>postMessage(value);listen=fn=>{self.onmessage=e=>fn(e.data);};
    }else{
        const port=require('worker_threads').parentPort;
        require('./vendor/skulpt/skulpt.min.js');require('./vendor/skulpt/skulpt-stdlib.js');
        global.SimPythonModules=require('./python-modules');
        send=value=>port.postMessage(value);listen=fn=>port.on('message',fn);
    }
    const pending=new Map();let next=0,started=false,output='',outputTimer;
    function flush(){clearTimeout(outputTimer);outputTimer=null;if(output){send({type:'print',text:output});output='';}}
    globalThis.simPythonCall=function(args){
        const id=++next;
        return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});send({type:'call',id,op:args[0],args:args.slice(1)});});
    };
    const bridge="var $builtinmodule = function(){return {invoke:new Sk.builtin.func(function(){var args=Array.prototype.map.call(arguments,Sk.ffi.remapToJs);return Sk.misceval.promiseToSuspension(globalThis.simPythonCall(args).then(function(value){return value===undefined||value===null?Sk.builtin.none.none$:Sk.ffi.remapToPy(value);},function(error){throw new Sk.builtin.RuntimeError(error.message);}));})};};";
    listen(async message=>{
        if(message.type==='reply'){
            const request=pending.get(message.id);if(!request)return;pending.delete(message.id);
            if(message.error)request.reject(new Error(message.error));else request.resolve(message.value);return;
        }
        if(message.type!=='run'||started)return;started=true;
        const files=message.files||{},own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
        Sk.configure({__future__:Sk.python3,execLimit:Infinity,yieldLimit:Infinity,syspath:['.'],
            output:text=>{output+=text;if(output.length>16384)output=output.slice(-16384);if(!outputTimer)outputTimer=setTimeout(flush,20);},
            read:name=>{
                const key=name.replace(/^\.\//,'');
                if(key==='src/lib/_sim.js'||key==='_sim.js')return bridge;
                const local=key.replace(/^src\/(?:lib|builtin)\//,'');
                if(local.endsWith('.js')&&own(SimPythonModules,local.slice(0,-3)+'.py'))throw new Error('Use Python SIM module');
                if(own(SimPythonModules,local))return SimPythonModules[local];
                if(own(files,key))return files[key];
                if(Sk.builtinFiles&&own(Sk.builtinFiles.files,key))return Sk.builtinFiles.files[key];
                throw new Error('Python module not available in SIM: '+name);
            }});
        try{await Sk.misceval.asyncToPromise(()=>Sk.importMainWithBody('__main__',false,message.code,true));flush();send({type:'done'});}
        catch(error){flush();send({type:'error',message:String(error)});}
    });
    send({type:'ready'});
})();
