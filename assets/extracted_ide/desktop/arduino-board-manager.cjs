'use strict';
const fs=require('node:fs'),path=require('node:path');
const urls=['https://github.com/pt-robotics/esp32/raw/main/package_ptbot_index.json','https://espressif.github.io/arduino-esp32/package_esp32_index.json'];
const compare=(a,b)=>b.localeCompare(a,undefined,{numeric:true});
function create({data,fetcher=fetch}){
 const cache=path.join(data,'board-catalog.json'),selection=path.join(data,'board-versions.json');
 function selected(){try{return JSON.parse(fs.readFileSync(selection));}catch{return {};}}
 function choose(id,version){fs.writeFileSync(selection,JSON.stringify({...selected(),[id]:version},null,2));}
 function installed(id){const [vendor,arch]=id.split(':');try{return fs.readdirSync(path.join(data,'packages/packages',vendor,'hardware',arch)).filter(v=>fs.existsSync(path.join(data,'packages/packages',vendor,'hardware',arch,v,'platform.txt'))).sort(compare);}catch{return [];}}
 function profile(original){const [id,version]=original.core.split('@'),versions=installed(id),pick=selected()[id];return {...original,core:id+'@'+(pick&&versions.includes(pick)?pick:versions[0]||version)};}
 async function catalog(refresh=false){
  let cached;try{cached=JSON.parse(fs.readFileSync(cache));}catch{}
  let warning='';
  if(refresh||!cached){
   try{
    const indexes=await Promise.all(urls.map(async url=>{const response=await fetcher(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);return response.json();}));
    const packages=new Map();
    for(const index of indexes)for(const pack of index.packages||[])for(const platform of pack.platforms||[]){
     if(!['PTBOT_ESP32','esp32'].includes(pack.name)||platform.architecture!=='esp32'||!/^\d[\w.+-]{0,59}$/.test(platform.version))continue;
     const id=pack.name+':'+platform.architecture;
     if(!packages.has(id))packages.set(id,{id,name:platform.name,maintainer:pack.maintainer,versions:[],boards:[]});
     const row=packages.get(id);row.versions.push(platform.version);row.boards.push(...(platform.boards||[]).map(b=>b.name));
    }
    if(!packages.has('PTBOT_ESP32:esp32'))throw Error('PTBOT board index is empty');
    cached={savedAt:Date.now(),packages:[...packages.values()].map(p=>({...p,versions:[...new Set(p.versions)].sort(compare),boards:[...new Set(p.boards)]}))};
    fs.writeFileSync(cache,JSON.stringify(cached));
   }catch(error){
    if(!cached){cached={packages:['PTBOT_ESP32:esp32','esp32:esp32'].map(id=>({id,name:id.startsWith('PTBOT')?'PTBOT ESP32':'ESP32',maintainer:id.startsWith('PTBOT')?'PTBOT':'Espressif Systems',versions:installed(id),boards:[]})).filter(p=>p.versions.length)};}
    warning='Offline catalog — showing locally available boards. Connect and refresh to check other versions.';
   }
  }
  return {source:urls[0],warning,packages:cached.packages.map(p=>({...p,installed:installed(p.id),selected:installed(p.id).includes(selected()[p.id])?selected()[p.id]:installed(p.id)[0]||null}))};
 }
 async function validate(id,version){const list=await catalog();const item=list.packages.find(p=>p.id===id);if(!item||!item.versions.includes(version))throw Error('Choose a board version from Board Manager');return id+'@'+version;}
 return {catalog,validate,installed,choose,profile,urls};
}
module.exports={create,urls};
