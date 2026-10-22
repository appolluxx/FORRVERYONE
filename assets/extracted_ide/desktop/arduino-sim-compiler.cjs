'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const crypto=require('node:crypto');
async function compile({root,compilerRoot,data,board,files,log=()=>{},setChild=()=>{},progress=()=>{}}){
 progress('Preparing code');
 const compiler=path.join(compilerRoot||path.join(root,'bin/cpp-sim'),process.platform==='win32'?'zig.exe':'zig');
 if(!fs.existsSync(compiler))throw Error('The C++ SIM compiler is missing. Install the desktop package with C++ SIM support.');
 const support=path.join(root,'desktop/cpp-sim');
 const hash=crypto.createHash('sha256').update('cpp-sim-v1:'+board+':'+fs.statSync(compiler).mtimeMs);
 for(const name of Object.keys(files).sort())hash.update(JSON.stringify([name,files[name]]));
 function hashSupport(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name);if(fs.statSync(file).isDirectory())hashSupport(file);else hash.update(file.slice(support.length)).update(fs.readFileSync(file));}}
 hashSupport(support);
 const cacheDir=path.join(data,'sim-build-cache');fs.mkdirSync(cacheDir,{recursive:true});
 const cacheFile=path.join(cacheDir,hash.digest('hex')+'.wasm');
 if(fs.existsSync(cacheFile)&&fs.statSync(cacheFile).size<=32*1024*1024){const wasm=fs.readFileSync(cacheFile);if(WebAssembly.validate(wasm)){progress('Using prepared SIM program');log('Using cached C++ SIM build.\n');return {wasm:new Uint8Array(wasm),board,cached:true};}}
 const task=fs.mkdtempSync(path.join(data,'sim-build-'));
 try{
  for(const [name,source] of Object.entries(files))fs.writeFileSync(path.join(task,name),source);
  fs.writeFileSync(path.join(task,'program.cpp'),require('./cpp-sim/preprocess.cjs').preprocess(files));
  const output=path.join(task,'program.wasm');
  const args=['c++','-target','wasm32-wasi','-std=c++17','-O1','-fno-exceptions','-mexec-model=reactor',
   '-Wl,--export=rb_setup','-Wl,--export=rb_loop','-Wl,--export=rb_program','-Wl,--export=rb_task_run','-Wl,--export=rb_stack_alloc','-Wl,--export=rb_requires_tasks','-Wl,--export=__stack_pointer','-Wl,--max-memory=134217728',
   '-I',path.join(support,'include'),'-I',task,'-DROBOBLOCKS_SIM=1',
   '-DRB_REQUIRES_TASKS='+Number(Object.values(files).some(source=>/\bxTaskCreate(?:PinnedToCore)?\s*\(/.test(source))),
   board==='atom-vx'?'-DROBOBLOCKS_ATOM_VX=1':'-DROBOBLOCKS_BUILD_BOT=1',
   path.join(task,'program.cpp'),...Object.keys(files).filter(n=>/\.(cpp|c)$/.test(n)).map(n=>path.join(task,n)),path.join(support,'entry.cpp'),'-o',output];
  progress('Compiling C++ and linking SIM program');
  log('Compiling C++ for SIM...\n');
  await new Promise((resolve,reject)=>{
   const child=spawn(compiler,args,{windowsHide:true,shell:false,env:{...process.env,ZIG_GLOBAL_CACHE_DIR:path.join(data,'sim-compiler-cache')}});setChild(child);
   let diagnostics='';const read=d=>{const text=d.toString();diagnostics=(diagnostics+text).slice(-12000);log(text);};
   child.stdout.on('data',read);child.stderr.on('data',read);
   const timer=setTimeout(()=>{child.kill();reject(Error('C++ SIM compile timed out.'));},180000);
   child.once('error',e=>{clearTimeout(timer);setChild(null);reject(e);});
   child.once('close',code=>{clearTimeout(timer);setChild(null);code===0?resolve():reject(Error('C++ SIM compile failed.\n'+diagnostics));});
  });
  progress('Checking SIM program');
  const wasm=fs.readFileSync(output);if(wasm.length>32*1024*1024)throw Error('C++ SIM program exceeds 32 MiB');
  fs.writeFileSync(cacheFile,wasm);
  progress('Ready to start SIM');
  log('C++ SIM compile complete.\n');return {wasm:new Uint8Array(wasm),board};
 }finally{
  if(path.dirname(path.resolve(task))!==path.resolve(data)||!path.basename(task).startsWith('sim-build-'))throw Error('Invalid SIM build cleanup path');
  fs.rmSync(task,{recursive:true,force:true});
 }
}
module.exports={compile};
