'use strict';
const fs=require('node:fs'),path=require('node:path');
// Tool caches are machine-local. Project checkpoints remain in Electron's
// existing userData directory so upgrading does not lose open sketches.
function prepare({userData,localAppData=process.env.LOCALAPPDATA,platform=process.platform}){
 const projectData=path.resolve(userData,'arduino-cpp');
 const data=platform==='win32'&&localAppData?path.resolve(localAppData,'roboblocks-ide','arduino-cpp'):projectData;
 fs.mkdirSync(data,{recursive:true});fs.mkdirSync(projectData,{recursive:true});
 if(data!==projectData){
  for(const name of ['components','packages','downloads','libraries','sim-build-cache','sim-compiler-cache','compile-cache','board-catalog.json','board-versions.json']){
   const from=path.join(projectData,name),to=path.join(data,name);
   if(!fs.existsSync(from)||fs.existsSync(to))continue;
   if(fs.lstatSync(from).isSymbolicLink())continue;
   try{fs.renameSync(from,to);}catch(error){
    if(error.code!=='EXDEV')throw Error('Close Arduino tasks before moving installed tools to Local AppData. '+error.message);
    const staging=fs.mkdtempSync(path.join(data,'migration-'));const copied=path.join(staging,name);
    fs.cpSync(from,copied,{recursive:true});fs.renameSync(copied,to);fs.rmdirSync(staging);
   }
  }
 }
 return {data,projectData};
}
module.exports={prepare};
