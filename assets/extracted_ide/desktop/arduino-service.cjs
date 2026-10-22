'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const profiles={buildbot:{name:'Build BOT',fqbn:'esp32:esp32:esp32s3',options:'USBMode=hwcdc,CDCOnBoot=cdc',core:'esp32:esp32@3.3.12'},'atom-vx':{name:'ATOM VX',fqbn:'PTBOT_ESP32:esp32:atom_vx',options:'',core:'PTBOT_ESP32:esp32@1.1.6'}};
profiles['atom-mini']={name:'ATOM mini',fqbn:'PTBOT_ESP32:esp32:atom_mini',options:'',core:'PTBOT_ESP32:esp32@1.1.6',simSupported:false};
profiles['strom-mini']={name:'Strom mini',fqbn:'PTBOT_ESP32:esp32:strom_mini',options:'',core:'PTBOT_ESP32:esp32@1.1.6',simSupported:false};
const starter='#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  Serial.println("Hello from roboBlocks IDE");\n  delay(1000);\n}\n';
function validateFiles(files){
 if(!files||typeof files!=='object'||Array.isArray(files)||!Object.hasOwn(files,'sketch.ino'))throw Error('Project needs sketch.ino');
 const names=Object.keys(files);if(names.length>100)throw Error('Maximum 100 files');
 const seen=new Set();let bytes=0;for(const name of names){if(!/^[a-zA-Z_][a-zA-Z0-9_.-]*\.(ino|cpp|c|h|hpp)$/.test(name)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(name)||seen.has(name.toLowerCase()))throw Error('Invalid or duplicate filename: '+name);seen.add(name.toLowerCase());if(typeof files[name]!=='string')throw Error('Invalid file contents');bytes+=Buffer.byteLength(files[name]);}if(bytes>4*1024*1024)throw Error('Project exceeds 4 MiB');return files;
}
function create({root,data,projectData=data,runner,packaged=false,onDownload=()=>{},components:providedComponents,listPorts=()=>require('serialport').SerialPort.list()}){
 let activeChild=null,cancelled=false,simChild=null,simQueue=Promise.resolve(),simGeneration=0;
 const simJobs=new Map();
 const boards=require('./arduino-board-manager.cjs').create({data});
 const components=providedComponents||require('./arduino-components.cjs').create({root,data,packaged,emit:onDownload});
 const effective=board=>boards.profile(profiles[board]);
 function killChild(child){
  if(!child?.pid)return;
  if(process.platform==='win32'){const killer=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('error',()=>child.kill());}
  else child.kill();
 }

 function cancel(){
  components.cancelAll();simGeneration++;killChild(simChild);cancelled=true;const child=activeChild;if(!child?.pid)return;
  if(process.platform==='win32'){const killer=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('error',()=>child.kill());}
  else{try{process.kill(-child.pid,'SIGTERM');}catch(_){child.kill();}}
 }
 fs.mkdirSync(data,{recursive:true});const config=path.join(data,'arduino-cli.yaml');let cli=path.join(root,'bin/arduino-cli',process.platform==='win32'?'arduino-cli.exe':process.platform==='darwin'?'arduino-cli':'arduino-cli-ubuntu-x64');
 fs.writeFileSync(config,JSON.stringify({directories:{data:path.join(data,'packages'),downloads:path.join(data,'downloads'),user:path.join(data,'libraries')},board_manager:{additional_urls:boards.urls},updater:{enable_notification:false}}));let busy=false;
 const runCli=(args,log,options={})=>new Promise((resolve,reject)=>{
  if(cancelled){reject(Error('Arduino task canceled'));return;}
  const child=spawn(cli,['--config-file',config,...args],{windowsHide:true,shell:false,detached:process.platform!=='win32',env:{...process.env,...options.env}});activeChild=child;let output='',diagnostics='';
  const record=t=>{diagnostics=(diagnostics+t).slice(-4*1024*1024);log(t);};
  const timer=setTimeout(()=>{cancel();reject(Error('Arduino task timed out. Please check the output and your connection.'));},20*60*1000);
  child.stdout.on('data',d=>{const t=d.toString();output=(output+t).slice(-4*1024*1024);record(t);});child.stderr.on('data',d=>record(d.toString()));
  child.once('error',e=>{if(activeChild===child)activeChild=null;clearTimeout(timer);reject(e)});
  child.once('close',code=>{if(activeChild===child)activeChild=null;clearTimeout(timer);if(cancelled){reject(Error('Arduino task canceled'));return;}try{fs.writeFileSync(path.join(data,'last-cli.log'),args.join(' ')+'\n'+diagnostics);}catch(_){}
   code===0?resolve(output):reject(Error('Arduino '+args[0]+' failed ('+code+').\n'+(diagnostics.trim().slice(-6000)||'No diagnostic output was returned.')));
  });
 });
 const execute=runner|| (async(args,log,options)=>{const dir=await components.ensure('arduino-cli');cli=path.join(dir,process.platform==='win32'?'arduino-cli.exe':'arduino-cli');return runCli(args,log,options);});
 const setup=async (profile,log)=>{
  if(installed(profile))return;
  const id='core:'+profile.core,title=profile.name+' board package';
  onDownload({kind:'download',id,title,phase:'installing'});
  const report=require('./arduino-download-progress.cjs')(state=>onDownload({kind:'download',id,title,...state}));
  const output=text=>{log(text);report(text);};
  try{await execute(['core','update-index'],output);await execute(['core','install',profile.core],output);const [core,version]=profile.core.split('@');boards.choose(core,version);onDownload({kind:'download',id,title,phase:'ready'});}
  catch(error){onDownload({kind:'download',id,title,phase:'error',message:error.message});throw error;}
 };
 const installed=profile=>{const [packageName,coreVersion]=profile.core.split(':'),[architecture,version]=coreVersion.split('@');return fs.existsSync(path.join(data,'packages/packages',packageName,'hardware',architecture,version,'platform.txt'));};
 const projectPath=p=>{if(p.project&&!/^[a-z0-9-]{1,80}$/.test(p.project))throw Error('Invalid project ID');return path.join(projectData,p.board+(p.project?'-'+p.project:'')+'.json');};
 function checkpoint(p){
  if(!Object.hasOwn(profiles,p.board))throw Error('Invalid board');validateFiles(p.files);
  if(p.restrictedTabs!==undefined&&(!Array.isArray(p.restrictedTabs)||p.restrictedTabs.length>100||p.restrictedTabs.some(n=>typeof n!=='string')))throw Error('Invalid restricted tabs');
  const target=projectPath(p),current=Object.hasOwn(p.files,p.current)?p.current:'sketch.ino';
  fs.writeFileSync(target+'.tmp',JSON.stringify({files:p.files,current,restrictedTabs:p.restrictedTabs===undefined?(fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')).restrictedTabs||[]:[]):[...new Set(p.restrictedTabs)].filter(n=>Object.hasOwn(p.files,n)),hiddenTabs:Array.isArray(p.hiddenTabs)?p.hiddenTabs.filter(n=>typeof n==='string'&&n!=='sketch.ino'&&n!==current&&Object.hasOwn(p.files,n)):[]},null,2));fs.renameSync(target+'.tmp',target);return {saved:true};
 }
 async function request(action,p={},log=()=>{},onProgress=()=>{}){
  if(!Object.hasOwn(profiles,p.board))throw Error('Choose a supported Arduino board');
  if(action==='tool-paths'){const dir=await components.ensure('arduino-cli');return {cli:path.join(dir,process.platform==='win32'?'arduino-cli.exe':'arduino-cli'),data,packages:path.join(data,'packages'),downloads:path.join(data,'downloads'),user:path.join(data,'libraries')};}
  if(action==='components')return components.status();
  if(action==='cancel-component'){components.cancel(p.id);return {cancelled:true};}
  if(action==='pause-component'){components.pause(p.id);return {paused:true};}
  if(action==='resume-component'){components.resume(p.id);return {paused:false};}
  if(action==='install-component'){await components.ensure(p.id);return components.status();}
  if(action==='boards')return boards.catalog(p.refresh===true);
  if(action==='load'){return fs.existsSync(projectPath(p))?JSON.parse(fs.readFileSync(projectPath(p),'utf8')):{files:{'sketch.ino':p.board==='atom-vx'?starter.replace('#include <Arduino.h>','#include <PTBOTAtomVX.h>').replace('Serial.begin(115200);','Serial.begin(115200);\n  initialize();'):starter}};}
  if(action==='format')return {code:await require('./arduino-formatter.cjs').format(root,p.code,p.filename)};
  if(action==='save')return checkpoint(p);
  if(action==='examples')return require('./arduino-examples.cjs').list(data,effective(p.board));
  if(action==='read-example'){const example=require('./arduino-examples.cjs').read(data,effective(p.board),p.id);validateFiles(example.files);return example;}
  if(action==='compile-sim'){
   if(profiles[p.board].simSupported===false)throw Error(profiles[p.board].name+' supports compile and upload; SIM is not available for this board yet.');
   if(p.background&&!components.available('cpp-sim'))return {unavailable:true};
   validateFiles(p.files);
   const files={...p.files};
   const key=require('node:crypto').createHash('sha256').update(JSON.stringify([p.board,Object.keys(files).sort().map(n=>[n,files[n]])])).digest('hex');
   let job=simJobs.get(key);
   const listener=phase=>onProgress({kind:'sim',jobId:p.jobId,phase});
   if(!job){
    const requestedGeneration=simGeneration;
    job={phase:'Waiting for SIM compiler',listeners:new Set()};
    const update=phase=>{job.phase=phase;for(const fn of job.listeners)fn(phase);};
    job.promise=simQueue.catch(()=>{}).then(()=>{if(requestedGeneration!==simGeneration)throw Error('SIM compilation canceled');return components.ensure('cpp-sim',{download:p.background!==true}).then(compilerRoot=>require('./arduino-sim-compiler.cjs').compile({root,compilerRoot,data,board:p.board,files,progress:update,setChild:child=>{simChild=child;}}));});
    simQueue=job.promise.catch(()=>{});
    simJobs.set(key,job);
   }
   job.listeners.add(listener);listener(job.phase);
   try{return await job.promise;}finally{job.listeners.delete(listener);if(simJobs.get(key)===job)simJobs.delete(key);}
  }
  // Local port presence remains readable while compilation/upload owns the CLI.
  if(action==='ports')return {detected_ports:(await listPorts()).map(p=>({port:{address:p.path,label:p.friendlyName||p.manufacturer||p.path,protocol:'serial'}}))};
  if(busy)throw Error('Another Arduino task is running');busy=true;cancelled=false;
  try{
   if(action==='install-board'){const core=await boards.validate(p.id,p.version);await setup({name:p.id,core},log);boards.choose(p.id,p.version);return boards.catalog();}
   if(action==='remove-board'){await boards.validate(p.id,p.version);await execute(['core','uninstall',p.id+'@'+p.version],log);return boards.catalog();}
   if(action==='status')return JSON.parse(await execute(['core','list','--json'],log));
   // USB uploads need only local serial ports. CLI board discovery also launches
   // mDNS network discovery and can prompt for Windows Firewall permission.
   if(action==='setup'){await setup(effective(p.board),log);return {installed:true};}
   if(action==='libraries')return await require('./arduino-libraries.cjs').catalog({data,profile:effective(p.board),execute,refresh:p.refresh===true,log});
   if(action==='install-library'){
    if(typeof p.name!=='string'||!p.name.trim()||p.name.length>150||/[\r\n@]|^\s*-/.test(p.name))throw Error('Invalid library name');
    if(p.version&&!/^[a-zA-Z0-9.+_-]{1,60}$/.test(p.version))throw Error('Invalid library version');
    return await execute(['lib','install',p.name+(p.version?'@'+p.version:'')],log);
   }
   if(action==='install-library-zip'){
    if(typeof p.path!=='string'||!path.isAbsolute(p.path)||path.extname(p.path).toLowerCase()!=='.zip'||!fs.statSync(p.path).isFile())throw Error('Select a library ZIP file');
    return await execute(['lib','install','--zip-path',p.path,'--no-overwrite'],log,{env:{ARDUINO_LIBRARY_ENABLE_UNSAFE_INSTALL:'true'}});
   }
   if(!['compile','upload'].includes(action))throw Error('Unknown Arduino action');validateFiles(p.files);
   const progress=require('./arduino-progress.cjs')(onProgress);progress.update(0,'Preparing project');
   if(action==='upload'&&(typeof p.port!=='string'||!p.port.trim()||p.port.startsWith('-')||/[\r\n]/.test(p.port)))throw Error('Select a serial port');
   await request('save',p,log);
   if(!installed(effective(p.board))){progress.update(null,'Installing board tools');log('Installing ESP32 tools for the first compile. This needs internet and may take several minutes.\n');await setup(effective(p.board),log);}
   // Stable source/build paths let the CLI reuse unchanged sketch, library and
   // core objects. Still run compile on every Verify/Upload so dependency and
   // board-option changes are checked by the compiler itself.
   const cacheKey=require('node:crypto').createHash('sha256').update(JSON.stringify([p.board,p.project||'',effective(p.board)])).digest('hex').slice(0,20);
   const task=path.join(data,'compile-cache',cacheKey),sketch=path.join(task,'sketch');fs.mkdirSync(sketch,{recursive:true});
   for(const name of fs.readdirSync(sketch))if(!Object.hasOwn(p.files,name)){
    const obsolete=path.resolve(sketch,name);
    if(path.dirname(obsolete)!==path.resolve(sketch)||!fs.lstatSync(obsolete).isFile())throw Error('Unexpected cached sketch entry');
    fs.unlinkSync(obsolete);
   }
   for(const [name,text]of Object.entries(p.files)){
    const target=path.join(sketch,name);
    if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==text)fs.writeFileSync(target,text);
   }
   const profile=effective(p.board),args=['--fqbn',profile.fqbn];if(profile.options)args.push('--board-options',profile.options);
   const compileOptions=[];
   // GCC 8 used by the PTBOT core still has Windows path-length limitations.
   // Short local junctions keep both GCC's own includes and the SDK usable.
   if(process.platform==='win32'&&profile.fqbn.startsWith('PTBOT_ESP32:')&&profile.core.endsWith('@1.1.6')){
    for(const [name,relative,property] of [
     ['atom-gcc','esp32/tools/xtensa-esp32-elf-gcc/esp-2021r2-patch5-8.4.0','tools.xtensa-esp32-elf-gcc.path'],
     ['atom-sdk','PTBOT_ESP32/hardware/esp32/1.1.6/tools/sdk/esp32','compiler.sdk.path']
    ]){
     const target=path.join(data,'packages/packages',relative),alias=path.join(data,name);
     if(fs.existsSync(target)){
      if(!fs.existsSync(alias))fs.symlinkSync(target,alias,'junction');
      if(fs.realpathSync(alias).toLowerCase()!==fs.realpathSync(target).toLowerCase())throw Error('Unexpected Arduino tool path: '+alias);
      compileOptions.push('--build-property',property+'='+alias);
     }
    }
   }
   progress.update(5,'Starting compiler');
   const compileOutput=require('./arduino-compile-output.cjs')(log);
   log('Compiling '+profile.name+'...\n');
   try{await execute(['compile','--verbose',...args,...compileOptions,'--build-path',path.join(task,'objects'),'--output-dir',path.join(task,'output'),sketch],text=>{progress.output(text);compileOutput.output(text);});}
   finally{compileOutput.flush();}
   if(action==='upload'){
    progress.update(null,'Uploading firmware');log('Uploading to '+p.port+'...\n');
    // An explicit protocol requires discovery metadata. With only the selected
    // address the CLI falls back to serial when discovery has no matching entry.
    await execute(['upload',...args,'--port',p.port,'--input-dir',path.join(task,'output'),sketch],log);
   }
   progress.update(100,action==='upload'?'Upload complete':'Verify complete');return {ok:true};
  }finally{busy=false;}
 }
 return {request,checkpoint,profiles,cancel,isBusy:()=>busy};
}
module.exports={create,profiles,validateFiles};
