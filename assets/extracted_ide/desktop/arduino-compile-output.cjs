'use strict';
// Keep verbose CLI output for diagnostics/progress, but summarize it in Serial.
module.exports=function createCompileOutput(emit){
 let pending='',contextLines=0;const seen=new Set();
 const once=text=>{if(!seen.has(text)){seen.add(text);emit(text+'\n');}};
 function line(text){
  const s=text.trim();if(!s)return;
  if(/(?:^|[\\/\s"-])(?:[^\s"]*-)?(?:g\+\+|gcc|ar|objcopy|size)(?:\.exe)?["\s]/i.test(s)){
   if(/\s-c(?:\s|$)/.test(s)){
    const lib=s.match(/[\\/]libraries[\\/]([^\\/"\s]+)/i);
    if(lib)once('Compiling library: '+lib[1]);
    else if(/[\\/]sketch[\\/]/i.test(s)){
     const files=[...s.matchAll(/"([^"\r\n]+\.(?:cpp|c|ino|S))"/g)];
     if(files.length)once('Compiling: '+files.at(-1)[1].split(/[\\/]/).at(-1));
    }
   }
   return;
  }
  if(/Detecting libraries used/i.test(s))once('Resolving libraries...');
  else if(/Generating function prototypes/i.test(s))once('Preparing sketch...');
  else if(/Compiling sketch/i.test(s))once('Compiling sketch...');
  else if(/Compiling libraries/i.test(s))once('Compiling libraries...');
  else if(/Compiling core/i.test(s))once('Compiling board core...');
  else if(/Linking everything together/i.test(s))once('Linking firmware...');
  else if(/Sketch uses|Global variables use|^Error|error:|warning:|fatal error|undefined reference|compilation terminated|exit status/i.test(s)){
   emit(text+'\n');contextLines=5;
  }else if(contextLines>0){emit(text+'\n');contextLines--;}
 }
 return {output(text){pending+=text;const lines=pending.split(/\r?\n/);pending=lines.pop();lines.forEach(line);},flush(){if(pending)line(pending);pending='';}};
};
