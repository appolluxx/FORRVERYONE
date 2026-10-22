/* Visual history only: seeking never executes firmware or changes physics. */
(function(root){
    'use strict';
    const STRIDE=11;
    class Recorder {
        constructor({maxBytes=256*1024*1024,maxSeconds=600}={}){this.maxBytes=maxBytes;this.maxSeconds=maxSeconds;this.clear();}
        clear(){this.close();this.links=[];this.linkIndices=new Set();this.nodes=[];this.frames=[];this.bytes=0;this.recording=false;this.limited=false;this.duration=0;this.time=0;this.active=false;this.playing=false;this.speed=1;this.lastSample=-Infinity;this.lastKey=-Infinity;this.cache=null;}
        pose(){const data=new Float32Array(this.nodes.length*STRIDE);this.nodes.forEach((n,i)=>{const k=i*STRIDE;n.position.toArray(data,k);n.quaternion.toArray(data,k+3);n.scale.toArray(data,k+7);data[k+10]=n.visible?1:0;});
            for(const link of this.links||[]){
                link.node.updateWorldMatrix(true,false);link.parent.updateWorldMatrix(true,false);
                const relative=link.parent.matrixWorld.clone().invert().multiply(link.node.matrixWorld);
                relative.decompose(link.position,link.rotation,link.scale);
                const k=link.index*STRIDE;link.position.toArray(data,k);link.rotation.toArray(data,k+3);link.scale.toArray(data,k+7);
            }return data;}
        start(nodes,time=0,parents=[]){this.clear();this.nodes=nodes;this.links=parents.filter(p=>nodes.includes(p.node)&&nodes.includes(p.parent)).map(p=>({...p,index:nodes.indexOf(p.node),position:p.node.position.clone(),rotation:p.node.quaternion.clone(),scale:p.node.scale.clone(),matrix:p.node.matrix.clone()}));this.linkIndices=new Set(this.links.map(link=>link.index));this.origin=time;this.recording=true;this.previous=this.pose();this.quaternion=nodes[0]?.quaternion.clone();}
        capture(time,trace={id:null,calls:[]},force=false){
            if(!this.recording||!Number.isFinite(time))return;
            const t=Math.max(0,time-this.origin);
            if(this.frames.length&&t<=this.lastSample)return;
            if(!force&&t-this.lastSample<1/30)return;
            const current=this.pose(),key=t-this.lastKey>=2,indices=[],values=[];
            if(!key)for(let i=0;i<this.nodes.length;i++){
                const k=i*STRIDE;let changed=false;
                for(let j=0;j<STRIDE;j++)if(current[k+j]!==this.previous[k+j]){changed=true;break;}
                if(changed){indices.push(i);for(let j=0;j<STRIDE;j++)values.push(current[k+j]);}
            }
            const data=key?current:new Float32Array(values),ids=key?null:new Uint32Array(indices);
            const bytes=data.byteLength+(ids?ids.byteLength:0)+128+(trace.display&&trace.display!==this.frames[this.frames.length-1]?.trace.display?trace.display.data.byteLength:0)+(trace.motion?384:0)+(trace.step?768:0)+(trace.audio?256+JSON.stringify(trace.audio).length*2:0)+(trace.calls||[]).length*64;
            this.frames.push({t,key,data,ids,trace:{display:trace.display||null,id:trace.id,calls:(trace.calls||[]).slice(),motion:trace.motion?{...trace.motion}:null,step:trace.step||null,audio:trace.audio?JSON.parse(JSON.stringify(trace.audio)):null}});
            this.frames[this.frames.length-1].baseBytes=bytes-(trace.display&&trace.display!==this.frames[this.frames.length-2]?.trace.display?trace.display.data.byteLength:0);
            this.bytes+=bytes;this.previous=current;this.lastSample=t;if(key)this.lastKey=t;this.duration=t;
            // Keep a bounded, playable history of the latest activity instead
            // of silently freezing the recording at its first memory limit.
            while((this.bytes>this.maxBytes||this.duration>this.maxSeconds)&&this.frames.length>1){
                this.limited=true;
                let first=this.frames.findIndex((f,i)=>i>0&&f.key);
                if(first<0){
                    first=this.frames.length-1;
                    const frame=this.frames[first],pose=this.decode(first);
                    frame.baseBytes+=pose.byteLength-frame.data.byteLength-(frame.ids?.byteLength||0);
                    frame.data=pose;frame.ids=null;frame.key=true;
                }
                const offset=this.frames[first].t;
                this.frames.splice(0,first);this.frames.forEach(f=>f.t-=offset);
                this.origin+=offset;this.lastSample-=offset;this.duration-=offset;
                this.lastKey=this.frames.filter(f=>f.key).at(-1).t;this.cache=null;
                const displays=new Set();this.bytes=0;
                for(const frame of this.frames){
                    this.bytes+=frame.baseBytes;
                    const display=frame.trace.display;
                    if(display&&!displays.has(display)){displays.add(display);this.bytes+=display.data.byteLength;}
                }
            }
            if(this.bytes>this.maxBytes){this.limited=true;this.recording=false;}
            return true;
        }
        finish(){this.recording=false;}
        decode(index){
            let first=index;while(first>0&&!this.frames[first].key)first--;
            const result=this.frames[first].data.slice();
            for(let i=first+1;i<=index;i++){const f=this.frames[i];if(f.key)result.set(f.data);else f.ids.forEach((id,j)=>result.set(f.data.subarray(j*STRIDE,(j+1)*STRIDE),id*STRIDE));}
            return result;
        }
        apply(a,b=a,alpha=0){
            this.nodes.forEach((n,i)=>{const k=i*STRIDE;
                if(this.linkIndices.has(i))return;
                n.position.set(a[k]+(b[k]-a[k])*alpha,a[k+1]+(b[k+1]-a[k+1])*alpha,a[k+2]+(b[k+2]-a[k+2])*alpha);
                n.quaternion.fromArray(a,k+3);if(alpha)n.quaternion.slerp(this.quaternion.fromArray(b,k+3),alpha);
                n.scale.set(a[k+7]+(b[k+7]-a[k+7])*alpha,a[k+8]+(b[k+8]-a[k+8])*alpha,a[k+9]+(b[k+9]-a[k+9])*alpha);
                n.visible=!!a[k+10];n.updateMatrix();
            });
            // Interpolate attached bodies in their mechanical parent's frame.
            // Independent world-space slerps bend an axle when steering and
            // wheel spin occur together, even when both endpoint poses align.
            for(const link of this.links||[]){const k=link.index*STRIDE,n=link.node;
                link.position.set(a[k]+(b[k]-a[k])*alpha,a[k+1]+(b[k+1]-a[k+1])*alpha,a[k+2]+(b[k+2]-a[k+2])*alpha);
                link.rotation.fromArray(a,k+3);if(alpha)link.rotation.slerp(this.quaternion.fromArray(b,k+3),alpha);
                link.scale.set(a[k+7]+(b[k+7]-a[k+7])*alpha,a[k+8]+(b[k+8]-a[k+8])*alpha,a[k+9]+(b[k+9]-a[k+9])*alpha);
                link.parent.updateWorldMatrix(true,false);n.parent?.updateWorldMatrix(true,false);
                link.matrix.compose(link.position,link.rotation,link.scale).premultiply(link.parent.matrixWorld);
                if(n.parent)link.matrix.premultiply(n.parent.matrixWorld.clone().invert());
                link.matrix.decompose(n.position,n.quaternion,n.scale);n.visible=!!a[k+10];n.updateMatrix();n.updateMatrixWorld(true);
            }
        }
        open(){if(!this.frames.length)return false;this.finish();if(!this.active)this.saved=this.pose();this.active=true;this.playing=false;this.seek(0);return true;}
        close(){if(this.active&&this.saved)this.apply(this.saved);this.saved=null;this.active=false;this.playing=false;}
        seek(time){
            if(!this.active)return null;
            this.time=Math.max(0,Math.min(this.duration,time));
            let lo=0,hi=this.frames.length-1;
            while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(this.frames[mid].t<=this.time)lo=mid;else hi=mid-1;}
            if(this.cache?.index!==lo)this.cache={index:lo,a:this.decode(lo),b:this.decode(Math.min(lo+1,this.frames.length-1))};
            const a=this.frames[lo],b=this.frames[Math.min(lo+1,this.frames.length-1)];
            this.apply(this.cache.a,this.cache.b,b.t>a.t?(this.time-a.t)/(b.t-a.t):0);
            return a.trace;
        }
        advance(dt){if(!this.active)return null;const trace=this.seek(this.time+(this.playing?dt*this.speed:0));if(this.time>=this.duration)this.playing=false;return trace;}
    }
    root.SimPlayback={Recorder};
    if(typeof module!=='undefined')module.exports=root.SimPlayback;
})(typeof window!=='undefined'?window:globalThis);
