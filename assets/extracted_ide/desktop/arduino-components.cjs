'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pipeline}=require('node:stream/promises'),{Transform}=require('node:stream');
const zip=require('../microBlock-IDE/js/zip.min.js');
const manifest=require('./arduino-components.json');
function create({root,data,packaged=false,emit=()=>{},catalog=manifest,fetcher=fetch}){
 const base=path.resolve(data,'components'),jobs=new Map(),states=new Map();
 fs.mkdirSync(base,{recursive:true});
 const send=state=>{states.set(state.id,state);emit({kind:'download',...state});};
 function spec(id){const entry=typeof id==='string'&&Object.hasOwn(catalog.components,id)?catalog.components[id]:null;if(!entry||catalog.platform!==process.platform+'-'+process.arch)throw Error('No download is available for this tool on this operating system.');return entry;}
 function target(id,s){return path.join(base,id,s.version+'-'+s.sha256.slice(0,16));}
 function valid(id,s){const dir=target(id,s);try{return JSON.parse(fs.readFileSync(path.join(dir,'.installed.json'))).sha256===s.sha256&&fs.statSync(path.join(dir,s.executable)).isFile()?dir:null;}catch{return null;}}
 function available(id){const s=spec(id),installed=valid(id,s);if(installed)return installed;
  const bundled=path.join(root,'bin',id);return !packaged&&fs.existsSync(path.join(bundled,s.executable))?bundled:null;
 }
 async function ensure(id,{download=true}={}){
  const s=spec(id),existing=available(id);if(existing)return existing;
  if(!download)throw Error('TOOL_NOT_INSTALLED');
  if(jobs.has(id))return jobs.get(id).promise;
  const abort=new AbortController();
  const final=target(id,s),parent=path.dirname(final);fs.mkdirSync(parent,{recursive:true});
  const archive=path.join(parent,s.sha256+'.zip'),partial=archive+'.part',stateFile=archive+'.state.json';
  let paused=false,resumeWait=null,phaseBeforePause,lastProgress;
  try{paused=JSON.parse(fs.readFileSync(stateFile)).paused===true;}catch{}
  const savePause=()=>fs.writeFileSync(stateFile,JSON.stringify({paused}));
  let downloadTimer;const startTimeout=()=>{clearTimeout(downloadTimer);downloadTimer=setTimeout(()=>abort.abort(Error('Download timed out')),20*60*1000);};
  const gate=async()=>{if(paused)await new Promise(resolve=>{resumeWait=resolve;});abort.signal.throwIfAborted();};
  abort.signal.addEventListener('abort',()=>{resumeWait?.();resumeWait=null;},{once:true});
  const promise=(async()=>{
   let staging,invalidPartial=false;
   const progress=(phase,extra={})=>{lastProgress={id,title:s.name,version:s.version,phase,...extra};send(paused?{...lastProgress,phase:'paused'}:lastProgress);};
   try{
    let cached=false;
    if(fs.existsSync(archive))cached=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex')===s.sha256;
    let offset=fs.existsSync(partial)?fs.statSync(partial).size:0;
    if(offset>s.bytes){fs.unlinkSync(partial);offset=0;}
    if(!cached&&offset===s.bytes){
     if(crypto.createHash('sha256').update(fs.readFileSync(partial)).digest('hex')===s.sha256){fs.renameSync(partial,archive);cached=true;}
     else{fs.unlinkSync(partial);offset=0;}
    }
    phaseBeforePause=cached?'installing':'downloading';
    progress(phaseBeforePause,{received:cached?s.bytes:offset,total:s.bytes});await gate();
    abort.signal.throwIfAborted();
    if(!cached){
     if(new URL(s.url).protocol!=='https:'&&!catalog.testOnly)throw Error('Tool download requires HTTPS');
     progress('downloading',{received:offset,total:s.bytes});
     startTimeout();const response=await fetcher(s.url,{signal:abort.signal,...(offset?{headers:{Range:'bytes='+offset+'-'}}:{})});
     if(!response.ok)throw Error('Download failed (HTTP '+response.status+'). Please check your connection and try again.');
     if(response.status===206){
      const range=response.headers.get('content-range')?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
      if(!range||Number(range[1])!==offset||Number(range[3])!==s.bytes||Number(range[2])!==s.bytes-1){await response.body?.cancel();throw Error('Invalid download resume response');}
     }else if(offset){offset=0;progress('downloading',{received:0,total:s.bytes});}
     const digest=crypto.createHash('sha256');if(offset)digest.update(fs.readFileSync(partial));let received=offset,last=0;
     const meter=new Transform({transform(chunk,encoding,done){gate().then(()=>{received+=chunk.length;if(received>s.bytes){invalidPartial=true;done(Error('Unexpected download size'));return;}digest.update(chunk);if(Date.now()-last>150){last=Date.now();progress('downloading',{received,total:s.bytes});}done(null,chunk);},done);}});
     await pipeline(response.body,meter,fs.createWriteStream(partial,{flags:offset?'a':'w'}),{signal:abort.signal});
     clearTimeout(downloadTimer);
     if(received!==s.bytes)throw Error('Download incomplete. Please resume.');
     if(digest.digest('hex')!==s.sha256){invalidPartial=true;throw Error('Download verification failed. Please try again.');}
     fs.renameSync(partial,archive);
    }
    await gate();progress('installing');staging=fs.mkdtempSync(path.join(parent,'install-'));
    const reader=new zip.ZipReader(new zip.Uint8ArrayReader(new Uint8Array(fs.readFileSync(archive))),{useWebWorkers:false});
    try{
     const entries=await reader.getEntries();let extracted=0,done=0;
     for(const entry of entries){
      await gate();
      const name=entry.filename;
      if(!name||name.includes('\\')||name.includes(':')||name.startsWith('/')||name.split('/').some(x=>x==='..')||((entry.externalFileAttributes>>>16)&0xf000)===0xa000)throw Error('Unsafe tool archive entry');
      const file=path.resolve(staging,name);if(!file.startsWith(staging+path.sep))throw Error('Unsafe tool archive path');
      extracted+=entry.uncompressedSize||0;if(extracted>2*1024**3)throw Error('Tool archive exceeds size limit');
      if(entry.directory)fs.mkdirSync(file,{recursive:true});
      else{fs.mkdirSync(path.dirname(file),{recursive:true});const bytes=await entry.getData(new zip.Uint8ArrayWriter(),{checkSignature:true});await fs.promises.writeFile(file,bytes);}
      if(++done%100===0)progress('installing',{received:done,total:entries.length,unit:'files'});
     }
    }finally{await reader.close();}
    if(!fs.existsSync(path.join(staging,s.executable)))throw Error('Downloaded tool is incomplete');
    fs.writeFileSync(path.join(staging,'.installed.json'),JSON.stringify({sha256:s.sha256,version:s.version}));
    // Failed or interrupted installs never become active. Replace only this
    // exact component/version directory, below our persistent component root.
    if(fs.existsSync(final))fs.renameSync(final,final+'.incomplete-'+Date.now());
    fs.renameSync(staging,final);staging=null;if(fs.existsSync(stateFile))fs.unlinkSync(stateFile);progress('ready');return final;
   }catch(error){progress(abort.signal.aborted?'cancelled':'error',{message:error.message});throw error;}
   finally{clearTimeout(downloadTimer);if(invalidPartial&&fs.existsSync(partial))fs.unlinkSync(partial);if(staging&&path.dirname(staging)===parent&&path.basename(staging).startsWith('install-'))fs.rmSync(staging,{recursive:true,force:true});}
  })();
  jobs.set(id,{promise,abort,pause(){if(paused||!['downloading','installing'].includes(lastProgress?.phase))return;paused=true;savePause();clearTimeout(downloadTimer);phaseBeforePause=lastProgress.phase;send({...lastProgress,phase:'paused'});},resume(){if(!paused)return;paused=false;savePause();if(phaseBeforePause==='downloading')startTimeout();send({...lastProgress,phase:phaseBeforePause});resumeWait?.();resumeWait=null;}});try{return await promise;}finally{jobs.delete(id);}
 }
 return {ensure,available,pause(id){jobs.get(id)?.pause();},resume(id){jobs.get(id)?.resume();},cancel(id){jobs.get(id)?.abort.abort(Error('Download canceled'));},cancelAll(){for(const job of jobs.values())job.abort.abort(Error('Download canceled'));},status:()=>Object.entries(catalog.components).map(([id,s])=>({id,title:s.name,version:s.version,bytes:s.bytes,installed:!!available(id),...states.get(id)}))};
}
module.exports={create};
