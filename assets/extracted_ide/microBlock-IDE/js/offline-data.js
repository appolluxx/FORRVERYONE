/* Persistent public content only. Authentication and admin requests never enter this store. */
(()=>{
 if(window.IDEOfflineData||!window.indexedDB)return;
 const network=window.fetch.bind(window);let database;
 const eligible=url=>/\/api\/(?:examples(?:\/[a-z0-9_-]+(?:\/image)?)?|sound-settings)$/.test(url.pathname)||url.origin===location.origin&&/\/(?:products|boards|examples|fields|assets|models|textures)\//.test(url.pathname);
 function db(){return database||(database=new Promise(resolve=>{let settled=false;const done=value=>{if(settled){value?.close();return;}settled=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>done(null),1500);try{const r=indexedDB.open('roboblocks-public-content',1);r.onupgradeneeded=()=>r.result.createObjectStore('responses');r.onsuccess=()=>done(r.result);r.onerror=r.onblocked=()=>done(null);}catch(_){done(null);}}));}
 async function stored(key){const d=await db();if(!d)return null;return new Promise(resolve=>{try{const r=d.transaction('responses').objectStore('responses').get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null);}catch(_){resolve(null);}});}
 async function write(key,response){try{const d=await db();if(!d)return;const record={body:await response.blob(),headers:[...response.headers],savedAt:Date.now()};await new Promise((resolve,reject)=>{const tx=d.transaction('responses','readwrite');tx.objectStore('responses').put(record,key);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error);});}catch(error){console.warn('Offline content could not be stored:',error);window.dispatchEvent(new CustomEvent('offline-data-error',{detail:{message:'Device storage is full or unavailable. Some new content may not be available offline.'}}));}}
 function response(record,head){const headers=new Headers(record.headers);headers.set('X-Roboblocks-Offline','1');return new Response(head?null:record.body,{status:200,headers});}
 async function fetchContent(input,options){
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,document.baseURI);const method=(options?.method||input?.method||'GET').toUpperCase();
  if(!['GET','HEAD'].includes(method)||!eligible(url))return network(input,options);
  const key=url.href;const cached=await stored(key);
  if(cached&&(navigator.onLine===false||/[a-f0-9]{32,}\.(ptmesh|glb|bin|png)$/i.test(url.pathname)))return response(cached,method==='HEAD');
  try{
   const result=await network(input,cached&&!options?.signal?{...options,signal:AbortSignal.timeout(8000)}:options);
   if((result.status>=500||result.headers.get('X-Roboblocks-Offline')==='1')&&cached)return response(cached,method==='HEAD');
   if(result.ok&&method==='GET'&&result.type!=='opaque')await write(key,result.clone());
   return result;
  }catch(error){if(cached&&!options?.signal?.aborted)return response(cached,method==='HEAD');if(cached&&options?.signal?.reason?.name==='TimeoutError')return response(cached,method==='HEAD');throw error;}
 }
 window.fetch=fetchContent;
 async function imageURL(url){const result=await fetchContent(url);if(!result.ok)throw Error('Image unavailable');return URL.createObjectURL(await result.blob());}
 let warned=false;window.addEventListener('offline-data-error',event=>{if(!warned&&typeof window.NotifyE==='function'){warned=true;NotifyE(event.detail.message);}});
 window.IDEOfflineData={imageURL,fetch:fetchContent};
})();
