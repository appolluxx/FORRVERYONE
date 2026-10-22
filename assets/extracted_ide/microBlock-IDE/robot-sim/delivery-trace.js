(function(root){
    'use strict';
    // Trace the actual rotated artwork. Restrict every search step to dark
    // pixels and favor the middle of the stroke instead of cutting corners.
    function trace(doc,tile,atlas,from,to,cellIndex){
        if(tile.type==='original'&&tile.source===12)return [from,to];
        if(tile.type==='original'&&!atlas)throw Error('Wait for the field artwork to load.');
        const size=128,count=size*size,canvas=doc.createElement('canvas');canvas.width=canvas.height=size;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});root.SimFieldLayout.drawTile(ctx,tile,size,atlas);
        const rgba=ctx.getImageData(0,0,size,size).data,mask=new Uint8Array(count),clearance=new Uint16Array(count),queue=[];
        for(let i=0;i<count;i++){
            mask[i]=Math.max(rgba[i*4],rgba[i*4+1],rgba[i*4+2])<120?1:0;
            if(!mask[i])queue.push(i);else clearance[i]=65535;
        }
        const neighbors=i=>{const x=i%size,y=Math.floor(i/size);return [x?i-1:-1,x<size-1?i+1:-1,y?i-size:-1,y<size-1?i+size:-1].filter(n=>n>=0);};
        for(let head=0;head<queue.length;head++){const i=queue[head];for(const n of neighbors(i))if(clearance[n]>clearance[i]+1){clearance[n]=clearance[i]+1;queue.push(n);}}
        function nearest(point){let best=-1,score=Infinity;for(let i=0;i<count;i++)if(mask[i]){const d=(i%size-point[0]*(size-1))**2+(Math.floor(i/size)-point[1]*(size-1))**2;if(d<score){best=i;score=d;}}if(best<0||score>size*size*.04)throw Error('Could not locate the track entrance.');return best;}
        // Opposite exits on closed loops must match the generated Custom option.
        let inward=null;
        if(tile.type==='original'&&[1,6,11,30,13,17].includes(tile.source)&&Number.isInteger(cellIndex)){
            const dx=to[0]-from[0],dy=to[1]-from[1];
            if(Math.hypot(dx,dy)>.9 && Math.abs(from[0]+to[0]-1)<.05 && Math.abs(from[1]+to[1]-1)<.05){
                const heading=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);
                const side=root.SimFieldLayout.interiorSide(cellIndex,heading);
                inward=side==='r'?[-dy,dx]:[dy,-dx];
            }
        }
        const start=nearest(from),end=nearest(to),cost=new Float64Array(count).fill(Infinity),previous=new Int32Array(count).fill(-1),heap=[];
        function push(item){heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;}
        function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(last[0]<=heap[c][0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;}
        cost[start]=0;push([0,start]);
        while(heap.length){const [c,i]=pop();if(c!==cost[i])continue;if(i===end)break;
            const x=i%size,y=Math.floor(i/size);
            for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
                if(!dx&&!dy||x+dx<0||x+dx>=size||y+dy<0||y+dy>=size)continue;
                const n=i+dy*size+dx;if(!mask[n])continue;
                if(dx&&dy&&(!mask[i+dx]||!mask[i+dy*size]))continue;
                const outside=inward?Math.max(0,-((x+dx)/(size-1)-.5)*inward[0]-((y+dy)/(size-1)-.5)*inward[1]):0;
                const next=c+Math.hypot(dx,dy)*(1+12/(clearance[n]*clearance[n])+outside*100);
                if(next<cost[n]){cost[n]=next;previous[n]=i;push([next,n]);}
            }
        }
        if(!Number.isFinite(cost[end]))throw Error('The preview could not trace a continuous black line on this panel.');
        const path=[];for(let i=end;i!==-1;i=previous[i])path.push([(i%size)/(size-1),Math.floor(i/size)/(size-1)]);
        path.reverse();return [from,...path,to];
    }
    root.SimDeliveryTrace={trace};
})(window);
