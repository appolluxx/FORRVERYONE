'use strict';
const path=require('node:path'),{spawn}=require('node:child_process');
const style={BasedOnStyle:'LLVM',IndentWidth:2,TabWidth:2,UseTab:'Never',ColumnLimit:100,SortIncludes:'Never',AllowShortFunctionsOnASingleLine:'Empty',AllowShortIfStatementsOnASingleLine:'Never',AllowShortLoopsOnASingleLine:false,BreakBeforeBraces:'Attach'};
function format(root,source,filename='sketch.ino'){
 if(typeof source!=='string'||Buffer.byteLength(source)>4*1024*1024)throw Error('Code exceeds 4 MiB');
 if(!/^[A-Za-z_][A-Za-z0-9_-]*\.(ino|cpp|c|h|hpp)$/.test(filename))throw Error('Invalid source filename');
 return new Promise((resolve,reject)=>{
  const child=spawn(path.join(root,'bin/clang-format',process.platform==='win32'?'clang-format.exe':'clang-format'),['--assume-filename='+filename,'--style='+JSON.stringify(style)],{windowsHide:true,shell:false});
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  let output='',error='',finished=false;
  const finish=(err)=>{if(finished)return;finished=true;clearTimeout(timer);err?reject(err):resolve(output);};
  const timer=setTimeout(()=>{child.kill();finish(Error('Code formatting timed out'));},10000);
  child.stdout.on('data',b=>{output+=b.toString();if(output.length>8*1024*1024){child.kill();finish(Error('Formatted code is too large'));}});
  child.stderr.on('data',b=>{error=(error+b.toString()).slice(-4000);});
  child.on('error',finish);child.on('close',code=>finish(code===0?null:Error(error||'Code formatting failed')));
  child.stdin.on('error',finish);child.stdin.end(source);
 });
}
module.exports={format};
