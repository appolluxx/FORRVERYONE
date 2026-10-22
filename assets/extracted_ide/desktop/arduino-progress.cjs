'use strict';
module.exports=function createProgress(emit){
 let percent=0,pending='';
 function update(value,phase){if(value!==null){if(value<percent)return;percent=value;}emit({percent:value,phase,estimated:value!==100});}
 function output(text){
  pending+=text;const lines=pending.split(/[\r\n]+/);pending=lines.pop().slice(-16000);
  for(const line of lines){
   if(/Detecting libraries used/i.test(line))update(15,'Resolving libraries');
   else if(/Generating function prototypes/i.test(line))update(25,'Preparing sketch');
   else if(/Compiling sketch/i.test(line))update(35,'Compiling sketch');
   else if(/Compiling libraries/i.test(line))update(50,'Compiling libraries');
   else if(/Compiling core/i.test(line))update(65,'Compiling board core');
   else if(/Linking everything together/i.test(line))update(85,'Linking firmware');
   else if(/Sketch uses|Global variables use/i.test(line))update(95,'Checking firmware size');
  }
 }
 return {update,output};
};
