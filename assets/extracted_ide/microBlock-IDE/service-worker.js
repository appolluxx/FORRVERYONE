/* Offline bundle: only report readiness after every declared asset is cached. */
const CACHE_NAME = 'roboblocks-offline-405';
const READY_URL = new URL('__offline_ready__', self.registration.scope).href;
let downloadJob=null;
const pwaClients=new Set();
async function broadcast(data){for(const client of await self.clients.matchAll({includeUncontrolled:true,type:'window'}))client.postMessage(data);}
async function manifest(){
    const cache=await caches.open(CACHE_NAME);
    let response=await cache.match('/asset-manifest.json');
    if(!response){
        response=await fetch('/asset-manifest.json',{cache:'no-store'});
        if(!response.ok)throw Error('Offline file list is unavailable.');
        await cache.put('/asset-manifest.json',response.clone());
    }
    const data=await response.json();
    if(!Array.isArray(data.files)||!data.files.length)throw Error('Offline file list is empty.');
    return data;
}
async function status(){
    const cache=await caches.open(CACHE_NAME),data=await manifest();
    const keys=new Set((await cache.keys()).map(r=>new URL(r.url).pathname));
    const ready=data.files.every(file=>keys.has(new URL(file,self.registration.scope).pathname));
    return {type:'OFFLINE_STATUS',ready,bytes:data.bytes||0,version:CACHE_NAME};
}
async function download(notify=true){
    const report=data=>notify?broadcast(data):Promise.resolve();
    const cache=await caches.open(CACHE_NAME),data=await manifest(),files=data.files;
    let next=0,done=0,failed=0;const failures=[];
    await cache.delete(READY_URL);
    await report({type:'PRECACHE_START',total:files.length});
    async function worker(){
        while(next<files.length){
            const file=files[next++],url=new URL(file,self.registration.scope);
            try{
                if(url.origin!==self.location.origin)throw Error('Offline assets must be hosted locally.');
                if(!await cache.match(url.href)){
                    const response=await fetch(url.href,{cache:'no-store'});
                    if(!response.ok)throw Error('HTTP '+response.status);
                    await cache.put(url.href,response);
                }
                done++;
            }catch(error){failed++;if(failures.length<3)failures.push(file+': '+error.message);}
            await report({type:'PRECACHE_PROGRESS',done,total:files.length,percent:Math.floor(done/files.length*100)});
        }
    }
    await Promise.all(Array.from({length:4},worker));
    if(failed)throw Error(failed+' offline files could not be saved. '+failures.join('; '));
    if(!(await status()).ready)throw Error('Offline verification failed.');
    await cache.put(READY_URL,new Response('ready'));
    await report({type:'PRECACHE_DONE',total:files.length});
    // Retain the previous complete bundle until this one has been verified.
    for(const name of await caches.keys())if(name!==CACHE_NAME&&name.startsWith('roboblocks-offline-'))await caches.delete(name);
}
self.addEventListener('install',event=>{
    // Worker installation/update alone must never download or cache the site.
    // A launched PWA requests the bundle and displays its own progress indicator.
    event.waitUntil(Promise.resolve());
});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
    const type=event.data?.type;
    if(type==='PWA_CLIENT'&&event.source?.id)pwaClients.add(event.source.id);
    if(type==='OFFLINE_STATUS'&&(event.data.installed===true||pwaClients.has(event.source?.id)))event.waitUntil(status().then(data=>event.source?.postMessage(data)).catch(error=>event.source?.postMessage({type:'PRECACHE_ERROR',message:error.message})));
    if(type==='RUN_PRECACHE'&&event.data.installed===true){
        if(event.source?.id)pwaClients.add(event.source.id);
        if(!downloadJob)downloadJob=download().catch(error=>broadcast({type:'PRECACHE_ERROR',message:error.message})).finally(()=>{downloadJob=null;});
        event.waitUntil(downloadJob);
    }
});
async function offlineFile(key,currentOnly=false){
    const names=await caches.keys();
    const ordered=currentOnly?[CACHE_NAME]:[CACHE_NAME,...names.filter(name=>name!==CACHE_NAME&&name.startsWith('roboblocks-offline-')).reverse()];
    for(const name of ordered){
        if(!names.includes(name))continue;
        const cache=await caches.open(name);
        if(!await cache.match(READY_URL))continue;
        const hit=await cache.match(key);if(hit)return hit;
    }
    return null;
}
self.addEventListener('fetch',event=>{
    const request=event.request,url=new URL(request.url);
    if(request.method!=='GET'||url.origin!==self.location.origin)return;
    if(url.pathname==='/service-worker.js'||url.pathname.startsWith('/api/'))return;
    event.respondWith((async()=>{
        const key=url.pathname==='/'?'/index.html':url.pathname;
        const publicContent=/\/(?:products|boards|examples|fields|assets|models|textures)\//.test(url.pathname);
        if(!publicContent&&pwaClients.has(event.clientId)){
            if(event.resultingClientId)pwaClients.add(event.resultingClientId);
            const hit=await offlineFile(key,true);if(hit)return hit;
        }
        try{
            // Ordinary browser traffic goes to the network and never writes to
            // Cache Storage. Only the installed app's download job saves files.
            return await fetch(request);
        }catch(_){
            // A PWA's first offline navigation precedes its client-mode message.
            // Recover its last complete shell, then identify the resulting page.
            const hit=await offlineFile(key);
            if(hit){if(event.resultingClientId)pwaClients.add(event.resultingClientId);if(publicContent){const headers=new Headers(hit.headers);headers.set('X-Roboblocks-Offline','1');return new Response(hit.body,{status:hit.status,headers});}return hit;}
            return new Response('This file is not available offline.',{status:503,headers:{'Content-Type':'text/plain'}});
        }
    })());
});
