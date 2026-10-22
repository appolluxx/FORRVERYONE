'use strict';
const fs=require('node:fs'),path=require('node:path');
function roots(data,profile){const [vendor,core]=profile.core.split(':'),[arch,version]=core.split('@');return [path.join(data,'libraries/libraries'),path.join(data,'packages/packages',vendor,'hardware',arch,version,'libraries')];}
function list(data,profile){
 const result=[];
 roots(data,profile).forEach((root,source)=>{
  if(!fs.existsSync(root))return;
  for(const lib of fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory())){
   const start=path.join(root,lib.name,'examples');if(!fs.existsSync(start))continue;
   const visit=(folder,depth)=>{
    if(depth>12)return;const entries=fs.readdirSync(folder,{withFileTypes:true});
    const main=entries.find(e=>e.isFile()&&e.name===path.basename(folder)+'.ino')||entries.find(e=>e.isFile()&&e.name.endsWith('.ino'));
    if(main){result.push({id:source+':'+path.relative(root,folder).split(path.sep).join('/'),library:lib.name,name:path.relative(start,folder).split(path.sep).join(' / ')||lib.name,bundled:source===1});return;}
    for(const entry of entries)if(entry.isDirectory())visit(path.join(folder,entry.name),depth+1);
   };visit(start,0);
  }
 });return result.sort((a,b)=>a.library.localeCompare(b.library)||a.name.localeCompare(b.name));
}
function read(data,profile,id){
 const item=list(data,profile).find(e=>e.id===id);if(!item)throw Error('Example not found. Refresh the examples list.');
 const root=roots(data,profile)[Number(id[0])],folder=path.join(root,id.slice(2));
 const base=fs.realpathSync(root),resolved=fs.realpathSync(folder);if(!resolved.startsWith(base+path.sep))throw Error('Invalid example path');
 const entries=fs.readdirSync(folder,{withFileTypes:true}),ino=entries.filter(e=>e.isFile()&&e.name.endsWith('.ino'));
 const main=ino.find(e=>e.name===path.basename(folder)+'.ino')||ino[0];
 if(entries.some(e=>e.isDirectory()&&['src','data'].includes(e.name)))throw Error('This example contains src/data folders, which this editor does not support yet.');
 const files={};let size=0;
 for(const entry of entries){if(!entry.isFile()||! /\.(ino|cpp|c|h|hpp)$/.test(entry.name))continue;const file=path.join(folder,entry.name);size+=fs.statSync(file).size;if(size>4*1024*1024)throw Error('Example exceeds 4 MiB');const name=entry===main?'sketch.ino':entry.name;if(Object.hasOwn(files,name))throw Error('Example has conflicting sketch filenames');files[name]=fs.readFileSync(file,'utf8');}
 return {name:path.basename(folder),files};
}
module.exports={list,read};
