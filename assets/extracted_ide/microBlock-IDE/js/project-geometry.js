/* Portable geometry for user-imported parts. Catalog assets remain references. */
(function(){
    'use strict';
    const types={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array};
    let connection=null,ready=Promise.resolve();
    function database(){
        if(connection)return connection;
        connection=new Promise((resolve,reject)=>{
            const request=indexedDB.open('robot-assembly-geometry',1);
            const timer=setTimeout(()=>reject(Error('Geometry storage timed out. Please try saving again.')),8000);
            request.onupgradeneeded=()=>request.result.createObjectStore('meshes');
            request.onsuccess=()=>{clearTimeout(timer);request.result.onversionchange=()=>{request.result.close();connection=null;};resolve(request.result);};
            request.onerror=()=>{clearTimeout(timer);reject(request.error);};
            request.onblocked=()=>{clearTimeout(timer);reject(Error('Geometry storage is blocked.'));};
        }).catch(error=>{connection=null;throw error;});return connection;
    }
    function encode(mesh){
        return JSON.stringify(mesh,(key,value)=>{
            if(!ArrayBuffer.isView(value)&&!(value instanceof ArrayBuffer))return value;
            const bytes=value instanceof ArrayBuffer?new Uint8Array(value):new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
            const chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
            return {__mbyBinary:1,type:value.constructor.name,data:btoa(chunks.join(''))};
        });
    }
    function decode(text){
        return JSON.parse(text,(key,value)=>{
            if(!value||value.__mbyBinary!==1)return value;
            if(value.type!=='ArrayBuffer'&&value.type!=='DataView'&&!Object.hasOwn(types,value.type))throw Error('Unsupported model binary type');
            const raw=atob(value.data),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
            if(value.type==='ArrayBuffer')return bytes.buffer;
            if(value.type==='DataView')return new DataView(bytes.buffer);
            return new types[value.type](bytes.buffer);
        });
    }
    function imported(parts){return new Map((parts||[]).filter(p=>p.geometryKey&&!p.productManifest).map(p=>[p.geometryKey,p]));}
    async function capture(parts){
        await ready;const keys=imported(parts);if(!keys.size)return null;
        const db=await database();
        const entries=await new Promise((resolve,reject)=>{
            const tx=db.transaction('meshes'),store=tx.objectStore('meshes'),result=[];
            for(const [key,part] of keys){const request=store.get(key);request.onsuccess=()=>result.push({key,name:part.name||part.fileName||key,mesh:request.result});}
            tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Could not read imported models'));
        });
        return {version:1,entries:entries.map(entry=>{
            if(!entry.mesh)throw Error('Cannot save imported model "'+entry.name+'": geometry is missing. Import the model again before saving.');
            return {key:entry.key,data:encode(entry.mesh)};
        })};
    }
    function restore(meta){
        const bundle=meta?.importedGeometry,keys=imported(meta?.assembly?.parts);
        ready=ready.catch(()=>{}).then(async()=>{
            if(!bundle)return; // Legacy projects continue using their local geometry cache.
            if(bundle.version!==1||!Array.isArray(bundle.entries))throw Error('Unsupported imported-model package');
            const entries=[],seen=new Set();
            for(const entry of bundle.entries){
                if(!keys.has(entry.key))continue;
                if(seen.has(entry.key)||typeof entry.data!=='string')throw Error('Invalid imported-model package');
                seen.add(entry.key);const mesh=decode(entry.data);
                if(!mesh||typeof mesh!=='object'||Array.isArray(mesh))throw Error('Invalid imported model');
                entries.push({key:entry.key,mesh});
            }
            if(seen.size!==keys.size)throw Error('The project is missing an embedded imported model');
            if(!entries.length)return;const db=await database();
            await new Promise((resolve,reject)=>{
                const tx=db.transaction('meshes','readwrite'),store=tx.objectStore('meshes');
                entries.forEach(entry=>store.put(entry.mesh,entry.key));
                tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Could not restore imported models'));
            });
        });ready.catch(()=>{});return ready;
    }
    window.ProjectGeometry={capture,restore,encode,decode,get ready(){return ready;}};
})();
