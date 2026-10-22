'use strict';
const zip=require('../microBlock-IDE/js/zip.min.js');
const {validateFiles}=require('./arduino-service.cjs');
function sketchName(name){
 let value=String(name||'Sketch').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,63)||'Sketch';
 if(!/^[a-zA-Z_]/.test(value))value='Sketch_'+value;
 if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(value))value='Sketch_'+value;
 return value.slice(0,63);
}
function parseConfig(text){
 if(text.length>64*1024*1024)throw Error('Arduino config exceeds size limit');
 const c=JSON.parse(text);
 if(c?.format!=='roboblocks-arduino-config')return null;
 if(c.version!==1||!['buildbot','atom-vx','atom-mini','strom-mini'].includes(c.board)||!Array.isArray(c.tabOrder)||c.tabOrder.length>100||c.tabOrder.some(n=>typeof n!=='string')||typeof c.current!=='string')throw Error('Invalid Arduino config');
 if(c.hiddenTabs!==undefined&&(!Array.isArray(c.hiddenTabs)||c.hiddenTabs.length>100||c.hiddenTabs.some(n=>typeof n!=='string')))throw Error('Invalid hidden tabs');
 if(c.restrictedTabs!==undefined&&(!Array.isArray(c.restrictedTabs)||c.restrictedTabs.length>100||c.restrictedTabs.some(n=>typeof n!=='string'||!c.tabOrder.includes(n))))throw Error('Invalid restricted tabs');
 if(c.preferences!==undefined){
  const p=c.preferences;
  if(!p||typeof p!=='object'||Array.isArray(p)||JSON.stringify(p).length>262144)throw Error('Invalid SIM preferences');
  for(const [key,ns] of Object.entries(p)){
   const pair=JSON.parse(key);
   if(!Array.isArray(pair)||pair.length!==2||pair.some(s=>typeof s!=='string')||!ns||typeof ns!=='object'||Array.isArray(ns))throw Error('Invalid SIM preferences');
   for(const entry of Object.values(ns))if(!entry||!Number.isInteger(entry.type)||entry.type<0||entry.type>9||!Array.isArray(entry.bytes)||entry.bytes.length>65536||entry.bytes.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Invalid SIM preferences');
  }
 }
 if(c.meta!==undefined){
  if(!c.meta||typeof c.meta!=='object'||Array.isArray(c.meta))throw Error('Invalid simulation metadata');
  if(c.meta.assembly&&(!Array.isArray(c.meta.assembly.parts)||c.meta.assembly.parts.some(p=>!p||typeof p!=='object'||Array.isArray(p))))throw Error('Invalid assembly');
  if(c.meta.assembly?.boardId&&c.meta.assembly.boardId!==c.board)throw Error('Assembly board does not match project');
 }
 return c;
}
function applyConfig(project,text){
 const config=parseConfig(text);if(!config)return project;
 const order=[...new Set(['sketch.ino',...config.tabOrder,...Object.keys(project.files)])].filter(n=>Object.hasOwn(project.files,n));
 project.files=Object.fromEntries(order.map(n=>[n,project.files[n]]));
 if(Object.hasOwn(project.files,config.current))project.current=config.current;
 project.config=config;return project;
}
async function encode(name,files,settings){
 validateFiles(files);let folder=sketchName(name);
 const others=new Set(Object.keys(files).filter(n=>n!=='sketch.ino').map(n=>n.toLowerCase()));
 const base=folder;let index=1;while(others.has((folder+'.ino').toLowerCase()))folder=base.slice(0,56)+'_'+index++;
 const writer=new zip.ZipWriter(new zip.Uint8ArrayWriter(),{useWebWorkers:false,level:0});
 for(const [filename,source] of Object.entries(files))await writer.add(folder+'/'+(filename==='sketch.ino'?folder+'.ino':filename),new zip.TextReader(source));
 if(settings){const config={format:'roboblocks-arduino-config',version:1,board:settings.board,tabOrder:Object.keys(files),current:settings.current||'sketch.ino',hiddenTabs:settings.hiddenTabs,restrictedTabs:settings.restrictedTabs,preferences:settings.preferences,meta:settings.meta};const text=JSON.stringify(config,null,2);parseConfig(text);await writer.add(folder+'/config.json',new zip.TextReader(text));}
 return {bytes:await writer.close(),name:folder};
}
const fs=require('node:fs'),path=require('node:path');
const sourceFile=name=>/\.(ino|cpp|c|h|hpp)$/i.test(name);
function hasEntryPoints(source){
 // Ignore examples in comments and string literals, including C++ raw strings.
 const code=source.replace(/R"([^ ()\\\t\r\n]{0,16})\([\s\S]*?\)\1"|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g,' ');
 return ['setup','loop'].every(name=>new RegExp('\\bvoid\\s+'+name+'\\s*\\(\\s*(?:void\\s*)?\\)\\s*(?:noexcept\\s*)?\\{').test(code));
}
function projectFromSources(sources,folder,selected){
 const names=Object.keys(sources),inos=names.filter(n=>n.endsWith('.ino'));
 const entryPoints=inos.filter(name=>hasEntryPoints(sources[name]));
 if(entryPoints.length>1)throw Error('More than one .ino file defines both setup() and loop(). Open one sketch at a time.');
 const main=entryPoints[0]||inos.find(n=>n===folder+'.ino')||(selected&&inos.includes(selected)?selected:null)||(inos.length===1?inos[0]:null);
 if(!main)throw Error('Choose the main .ino file, or name it to match the sketch folder.');
 const files={};
 for(const name of [main,...names.filter(n=>n!==main)]){const target=name===main?'sketch.ino':name;if(Object.hasOwn(files,target))throw Error('The sketch contains conflicting main .ino filenames');files[target]=sources[name];}
 validateFiles(files);
 const detectedBoards=new Set();
 for(const source of Object.values(sources)){
  const code=source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
  for(const [header,board]of [['PTBOTAtomVX','atom-vx'],['PTBOTAtomMini','atom-mini'],['PTBOTStromMini','strom-mini']])if(new RegExp('^\\s*#\\s*include\\s*[<"]'+header+'\\.h[>"]','m').test(code))detectedBoards.add(board);
 }
 const inferred=detectedBoards.size===1?[...detectedBoards][0]:null;
 return {name:main.slice(0,-4),files,...(inferred?{board:inferred}:{}),current:selected===main?'sketch.ino':selected&&Object.hasOwn(files,selected)?selected:'sketch.ino'};
}
async function readFolder(filename){
 const selected=path.resolve(filename),folder=path.dirname(selected),sources={};
 if(!sourceFile(path.basename(selected)))throw Error('Choose an Arduino source file');
 if(!(await fs.promises.stat(selected)).isFile())throw Error('Choose an Arduino source file');
 const entries=(await fs.promises.readdir(folder,{withFileTypes:true})).filter(e=>e.isFile()&&sourceFile(e.name)).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 if(entries.length>100)throw Error('Maximum 100 source files');
 let total=0;
 for(const entry of entries){
  validateFiles(entry.name.toLowerCase()==='sketch.ino'?{'sketch.ino':''}:{'sketch.ino':'',[entry.name]:''});
  const file=path.join(folder,entry.name),size=(await fs.promises.stat(file)).size;total+=size;
  if(total>4*1024*1024)throw Error('Project exceeds 4 MiB');
  sources[entry.name]=await fs.promises.readFile(file,'utf8');
 }
 const project=projectFromSources(sources,path.basename(folder),path.basename(selected));
 const configFile=path.join(folder,'config.json');
 try{if((await fs.promises.stat(configFile)).size>64*1024*1024)throw Error('Arduino config exceeds size limit');applyConfig(project,await fs.promises.readFile(configFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 return project;
}
async function decode(bytes,nameHint=''){
 if(bytes.length>80*1024*1024)throw Error('Arduino archive exceeds 80 MiB');
 const reader=new zip.ZipReader(new zip.Uint8ArrayReader(Uint8Array.from(bytes)),{useWebWorkers:false});
 try{
  const all=await reader.getEntries();
  for(const e of all){const parts=e.filename.split('/');if(e.filename.startsWith('/')||parts.some(p=>p==='..'||p==='.'||p.includes('\\')||p.includes(':')))throw Error('Arduino ZIP must contain one sketch folder with safe paths');}
  const entries=all.filter(e=>!e.directory&&!e.filename.startsWith('__MACOSX/')&&sourceFile(e.filename));
  if(!entries.length||entries.length>100)throw Error('Arduino archive must contain 1 to 100 source files');
  const folders=new Set(entries.map(e=>e.filename.split('/').slice(0,-1).join('/')));
  if(folders.size!==1)throw Error('Open a ZIP containing one sketch; source subfolders and multiple sketches are not supported.');
  const folder=[...folders][0],sources={};let total=0;
  for(const entry of entries){
   const name=entry.filename.split('/').pop();validateFiles(name.toLowerCase()==='sketch.ino'?{'sketch.ino':''}:{'sketch.ino':'',[name]:''});
   total+=entry.uncompressedSize;if(total>4*1024*1024)throw Error('Project exceeds 4 MiB');
   if(Object.hasOwn(sources,name))throw Error('Duplicate sketch file');
   sources[name]=await entry.getData(new zip.TextWriter());
  }
  const project=projectFromSources(sources,folder?folder.split('/').pop():path.basename(nameHint,'.zip'));
  const configs=all.filter(e=>!e.directory&&e.filename===(folder?folder+'/':'')+'config.json');
  if(configs.length>1)throw Error('Duplicate Arduino config');
  if(configs.length){if(configs[0].uncompressedSize>64*1024*1024)throw Error('Arduino config exceeds size limit');applyConfig(project,await configs[0].getData(new zip.TextWriter()));}
  return project;
 }finally{await reader.close();}
}
module.exports={encode,decode,sketchName,readFolder};
