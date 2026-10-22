/* Cooperative FreeRTOS tasks on real suspended Wasm stacks (V8 JSPI). */
(function(root){
 'use strict';
 function create({call,clock,sleep,flush}){
  const tasks=new Map();let active,instance,failure,lastId=-1;
  function task(id,stack){const value={id,stack,started:false,done:false,suspended:false,wake:0,resume:null};tasks.set(id,value);return value;}
  function imported(op,a,b){
   const current=active;let value=0,wait=0;
   if(op===1){if(!Number.isFinite(a)||a<0)throw Error('Invalid delay');flush();wait=a;}
   else if(op===30){if(tasks.has(a))throw Error('Duplicate task');const sp=instance.exports.__stack_pointer.value;const stack=instance.exports.rb_stack_alloc();instance.exports.__stack_pointer.value=sp;task(a,stack);}
   else if(op===31){const target=tasks.get(a||current.id);if(target)target.suspended=true;}
   else if(op===32){const target=tasks.get(a);if(target)target.suspended=false;}
   else if(op===33){const target=tasks.get(a||current.id);if(target)target.done=true;}
   else if(op!==34)value=call(op,a,b);
   current.stack=instance.exports.__stack_pointer.value;current.wake=clock()+wait;
   return new Promise(resolve=>{current.resume=()=>resolve(value);});
  }
  async function run(value){
   instance=value;
   const main=WebAssembly.promising(instance.exports.rb_program),background=WebAssembly.promising(instance.exports.rb_task_run);
   task(0,instance.exports.__stack_pointer.value);
   while(!failure){
    const alive=[...tasks.values()].filter(t=>!t.done&&!t.suspended);
    if(!alive.length){sleep(1);await new Promise(resolve=>setTimeout(resolve,0));continue;}
    const now=clock(),ready=alive.filter(t=>t.wake<=now);
    if(!ready.length){sleep(Math.max(.001,Math.min(...alive.map(t=>t.wake))-now));continue;}
    const next=ready.find(t=>t.id>lastId)||ready[0];lastId=next.id;active=next;
    instance.exports.__stack_pointer.value=next.stack;
    if(!next.started){
     next.started=true;
     (next.id===0?main():background(next.id)).then(()=>{next.done=true;},error=>{failure=error;next.done=true;});
    }else{const resume=next.resume;next.resume=null;if(resume)resume();}
    // A resumed export runs until its next hardware call/delay before selecting
    // another task. Each task also owns a separate C/C++ linear-memory stack.
    await Promise.resolve();await Promise.resolve();
   }
   throw failure;
  }
  return {imported,run};
 }
 root.CppTaskScheduler={create};if(typeof module!=='undefined')module.exports=root.CppTaskScheduler;
})(typeof self!=='undefined'?self:globalThis);
