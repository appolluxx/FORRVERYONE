(function(root){
    'use strict';
    const GENERATION=0,PENDING=1,RUNNING=2,SEQUENCE=3,LENGTH=4,HEADER_BYTES=32;
    function connect(buffer){
        const header=new Int32Array(buffer,0,HEADER_BYTES/4),bytes=new Uint8Array(buffer,HEADER_BYTES);
        const encoder=new TextEncoder(),decoder=new TextDecoder();
        let written=null,cached=null;
        return {buffer,header,
            publishCommands(commands){
                const json=JSON.stringify(commands);
                if(json===written)return;
                const encoded=encoder.encode(json);
                if(encoded.length>bytes.length)throw Error('Physics command buffer is too small');
                Atomics.add(header,SEQUENCE,1);
                bytes.set(encoded);Atomics.store(header,LENGTH,encoded.length);
                Atomics.add(header,SEQUENCE,1);written=json;
            },
            readCommands(){
                const version=Atomics.load(header,SEQUENCE);
                if(version&1)return null;
                if(cached&&cached.version===version)return cached;
                const length=Atomics.load(header,LENGTH);
                if(length<=0||length>bytes.length)return null;
                const copy=bytes.slice(0,length);
                if(Atomics.load(header,SEQUENCE)!==version)return null;
                return cached={version,commands:JSON.parse(decoder.decode(copy))};
            }
        };
    }
    function create(commands){
        if(typeof SharedArrayBuffer==='undefined')return null;
        const size=Math.max(65536,new TextEncoder().encode(JSON.stringify(commands)).length*2);
        const transport=connect(new SharedArrayBuffer(HEADER_BYTES+size));
        transport.publishCommands(commands);return transport;
    }
    // Solver output has its own sequence lock: control reads must not wait
    // for an older postMessage pose to work its way through the renderer queue.
    function connectState(buffer){
        const header=new Int32Array(buffer,0,8),data=new Float64Array(buffer,32);
        let readVersion=-1;
        return {buffer,publish(packet,generation){
            Atomics.add(header,0,1);Atomics.store(header,1,generation);
            data[0]=packet.time;data[1]=Date.now();let n=2;
            data.set(packet.values,n);n+=packet.values.length;
            for(const hinge of packet.hinges)for(const value of hinge)data[n++]=value;
            for(const prop of packet.propStates||[])for(const value of prop||[-1,0,-1])data[n++]=value;
            Atomics.add(header,0,1);
        },read(generation){
            // Never spin waiting for the worker; reuse the previous complete
            // pose if a write overlaps this bounded read.
            for(let attempt=0;attempt<3;attempt++){
                const version=Atomics.load(header,0);
                if((version&1)||version===readVersion)return null;
                if(Atomics.load(header,1)!==generation)return null;
                const copy=data.slice();
                if(Atomics.load(header,0)!==version)continue;
                readVersion=version;let n=2;
                const values=copy.slice(n,n+header[2]);n+=header[2];
                const hinges=[],propStates=[];
                for(let i=0;i<header[3];i++){hinges.push(Array.from(copy.slice(n,n+3)));n+=3;}
                for(let i=0;i<header[4];i++){propStates.push(copy[n]<0?null:Array.from(copy.slice(n,n+3)));n+=3;}
                return {time:copy[0],completedAt:copy[1],values,hinges,propStates};
            }
            return null;
        }};
    }
    function createState(packet){
        if(typeof SharedArrayBuffer==='undefined')return null;
        const values=packet.values.length,hinges=packet.hinges.length,props=(packet.propStates||[]).length;
        const buffer=new SharedArrayBuffer(32+8*(2+values+hinges*3+props*3)),header=new Int32Array(buffer,0,8);
        header[2]=values;header[3]=hinges;header[4]=props;
        const state=connectState(buffer);state.publish(packet,0);return state;
    }
    const api={create,connect,createState,connectState,GENERATION,PENDING,RUNNING};
    root.PhysicsSharedTransport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
