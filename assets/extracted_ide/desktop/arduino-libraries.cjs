'use strict';
const fs=require('node:fs'),path=require('node:path');
function localLibraries(directory,bundled=false){
 if(!fs.existsSync(directory))return [];
 return fs.readdirSync(directory,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>{
  let properties={};try{for(const line of fs.readFileSync(path.join(directory,d.name,'library.properties'),'utf8').split(/\r?\n/)){const at=line.indexOf('=');if(at>0)properties[line.slice(0,at).trim()]=line.slice(at+1).trim();}}catch(_){}
  return {name:properties.name||d.name,version:properties.version||'',description:properties.paragraph||properties.sentence||'',author:properties.author||'',category:properties.category||'Other',bundled};
 });
}
async function catalog({data,profile,execute,refresh,log}){
 const index=path.join(data,'packages/library_index.json');let warning='';
 if(refresh||!fs.existsSync(index)){try{await execute(['lib','update-index'],log);}catch(e){warning='Could not refresh the catalog. Showing locally available libraries.';}}
 const [vendor,core]=profile.core.split(':'),[arch,version]=core.split('@');
 const installed=[...localLibraries(path.join(data,'libraries/libraries')),...localLibraries(path.join(data,'packages/packages',vendor,'hardware',arch,version,'libraries'),true)];
 const grouped=new Map();
 if(fs.existsSync(index))for(const item of JSON.parse(await fs.promises.readFile(index,'utf8')).libraries||[]){
  let entry=grouped.get(item.name);if(!entry){entry={name:item.name,versions:[],author:item.author||'',description:item.paragraph||item.sentence||'',category:item.category||'Other'};grouped.set(item.name,entry);}
  entry.versions.push(item.version);
 }
 for(const entry of grouped.values())entry.versions=[...new Set(entry.versions)].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
 for(const item of installed){let entry=grouped.get(item.name);if(!entry){entry={...item,versions:[]};grouped.set(item.name,entry);}if(!entry.installed||!item.bundled){entry.installed=item.version||'Installed';entry.bundled=item.bundled;}}
 return {libraries:[...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name)),warning};
}
module.exports={catalog};
