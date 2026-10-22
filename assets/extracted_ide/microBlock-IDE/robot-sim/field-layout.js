(function(root){
    'use strict';
    const KEY='robot_field_layout_v1',COLS=8,ROWS=4;
    const types=['blank','straight','curve','tee','cross','start','finish'];
    // Rescue paths are the white area between 20 mm boundary markings.
    const rescueDefinitions={
        rescue_closed:['Closed boundary',15],rescue_edge:['Single boundary',4],
        rescue_corner:['Corner boundaries',12],rescue_corridor:['Parallel boundaries',5],
        rescue_open:['White panel',0],rescue_checkpoint_open:['Check Point - Open',0,'checkpoint'],
        rescue_checkpoint_edge:['Check Point - Single boundary',4,'checkpoint'],
        rescue_checkpoint_corner:['Check Point - Corner',9,'checkpoint'],
        rescue_checkpoint_corridor:['Check Point - Parallel',5,'checkpoint'],
        rescue_drop:['Supply drop zone',14,'drop'],rescue_start:['START',7,'start'],
        rescue_finish:['FINISH',7,'finish'],rescue_pit:['Black pit',15,'pit'],
        rescue_rods:['Speed bump rods',0,'rods']
    };
    const rescueCatalog=Object.entries(rescueDefinitions).map(([type,[name]])=>({type,name,rotation:0,locked:false}));
    // Local-government Delivery Robot rules, junior pp.3-6 / senior pp.3-7.
    const localDefinitions={
        lga_open:['White panel',0],lga_edge:['Single boundary',4],lga_corner:['Corner boundaries',12],
        lga_corridor:['Parallel boundaries',5],lga_closed:['Closed boundary',15],
        lga_checkpoint_open:['Check Point - Open',0,'checkpoint'],lga_checkpoint_edge:['Check Point - Edge',4,'checkpoint'],
        lga_checkpoint_corner:['Check Point - Corner',9,'checkpoint'],lga_checkpoint_corridor:['Check Point - Parallel',5,'checkpoint'],
        lga_start:['START',14,'start'],lga_finish:['FINISH',14,'finish'],lga_rods:['Speed bumps - diameter 10 mm',0,'rods'],
        lga_pickup_raised:['Pick up - 50 mm platform',10,'pickup-raised'],lga_pickup_flat:['Pick up - Floor level',14,'pickup-flat'],
        lga_drop_green:['Green platform - 50 mm',10,'green'],lga_drop_yellow:['Yellow platform - 100 mm',10,'yellow'],lga_drop_red:['Red platform - 150 mm',10,'red'],
        lga_senior_drop_green:['Green platform + color slots - 50 mm',10,'green'],lga_senior_drop_yellow:['Yellow platform + color slots - 100 mm',10,'yellow'],lga_senior_drop_red:['Red platform + color slots - 150 mm',10,'red']
    };
    const localCatalog=senior=>Object.entries(localDefinitions).filter(([type])=>!type.includes(senior?'lga_drop_':'lga_senior_drop_')).map(([type,[name]])=>({type,name,rotation:0,locked:false}));
    const localJuniorCatalog=localCatalog(false),localSeniorCatalog=localCatalog(true);
    Object.assign(rescueDefinitions,localDefinitions);
    types.push(...Object.keys(rescueDefinitions));
    types.push(...Array.from({length:16},(_,i)=>'quick_box_'+i));
    function quickBoxExample(){
        const interior=[['rescue_corner',2],['rescue_edge',2],['rescue_edge',0],['rescue_open',0],['rescue_edge',3],['rescue_open',0],['rescue_edge',0],['rescue_edge',0]];
        return normalize({version:1,preset:'quick-box-drop',seed:'quick-box-drop',canColors:Array(6).fill(null),cells:Array.from({length:32},(_,i)=>{
            const col=i%8,row=Math.floor(i/8);
            if(col===3||col===4){const [type,rotation]=interior[row*2+col-3];return {type,rotation,locked:true};}
            return {type:col>=2&&col<6?'quick_box_'+(row*4+col-2):'blank',rotation:0,locked:true};
        })});
    }
    function drawQuickBox(ctx,index,size){
        ctx.save();ctx.beginPath();ctx.rect(0,0,size,size);ctx.clip();
        ctx.scale(size/300,size/300);ctx.translate(-(index%4)*300,-Math.floor(index/4)*300);
        ctx.fillStyle='#00843d';ctx.fillRect(20,20,150,1160);ctx.fillRect(1030,20,150,1160);
        ctx.strokeStyle='#171717';ctx.lineWidth=20;ctx.lineCap='butt';ctx.lineJoin='miter';
        ctx.strokeRect(10,10,1180,1180);ctx.fillStyle='#171717';
        for(const y of [300,600,900]){ctx.fillRect(0,y-20,y===600?600:300,20);ctx.fillRect(900,y-20,300,20);}
        ctx.fillRect(580,0,20,300);ctx.fillRect(580,600,20,300);
        ctx.fillStyle='#fff';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        for(let row=0;row<4;row++)for(const right of [false,true]){
            ctx.save();ctx.translate(right?1145:55,row*300+150);ctx.rotate(right?-Math.PI/2:Math.PI/2);ctx.fillText(String(right?8-row:row+1),0,0);ctx.restore();
        }
        ctx.restore();
    }
    // Canonical artwork, including rotation-equivalent copies in the original kit.
    const catalog=[
        [0,'Corner',[[0,0],[24,3]]],[1,'Square crossing',[[1,0],[6,0]]],
        [2,'Green zone',[[2,0]]],[3,'Crossing',[[3,0],[14,0],[19,0],[25,0]]],
        [4,'Double station',[[4,0]]],[5,'U curve',[[5,0]]],[7,'T junction',[[7,0],[8,2]]],
        [9,'T + station',[[9,0]]],[10,'Mixed curve',[[10,0]]],[11,'Diamond crossing',[[11,0]]],
        [12,'Obstacle',[[12,0]]],[13,'Square loop',[[13,0],[17,1]]],[15,'Yellow zone',[[15,0]]],
        [16,'Zigzag',[[16,0],[29,1]]],[18,'Can station',[[18,0],[21,2],[28,0]]],
        [20,'S curve',[[20,0],[22,1]]],[23,'White panel',[[23,0]]],[26,'Straight',[[26,0]]],
        [27,'START',[[27,0]]],[30,'Diamond junction',[[30,0]]],[31,'Red zone',[[31,0]]]
    ].map(([source,name,copies])=>({source,name,copies,type:'original',rotation:0,locked:false}));
    const basicCatalog=[['straight','Straight'],['curve','Rounded corner'],['tee','T junction'],['cross','Crossroads'],['start','START'],['finish','FINISH']].map(([type,name])=>({type,name,rotation:0,locked:false}));
    basicCatalog.push({type:'original',source:23,name:'White panel',rotation:0,locked:false});
    const markers=[[.5105172722,.125,'red'],[.6144334209,.125,'red'],[.1355172722,.375,'green'],[.3644406640,.625,'yellow'],[.6356080922,.625,'yellow'],[.6144810974,.875,'green']];
    const initial=()=>({version:1,seed:'1',cells:Array.from({length:32},(_,source)=>({type:'original',source,rotation:0,locked:false}))});
    function normalize(value){
        if(!value||value.version!==1||!Array.isArray(value.cells)||value.cells.length!==32)return null;
        const cells=value.cells.map(c=>{
            if(!c||(!types.includes(c.type)&&c.type!=='original'))throw Error('Invalid field tile');
            if(c.type==='original'&&(!Number.isInteger(c.source)||c.source<0||c.source>=32))throw Error('Invalid original tile');
            if(c.canColors!==undefined&&(!Array.isArray(c.canColors)||c.canColors.length!==6||c.canColors.some(v=>v!==null&&!['red','yellow','green'].includes(v))))throw Error('Invalid panel can colors');
            if(c.slotColors!==undefined&&(!Array.isArray(c.slotColors)||c.slotColors.length!==3||c.slotColors.some(v=>!['red','yellow','green'].includes(v))))throw Error('Invalid platform slot colors');
            return {type:c.type,...(c.type==='original'?{source:c.source}:{}),rotation:((Math.trunc(Number(c.rotation)||0)%4)+4)%4,locked:!!c.locked,...(c.canColors?{canColors:c.canColors.slice()}:{ }),...(c.slotColors?{slotColors:c.slotColors.slice()}:{})};
        });
        const canColors=value.canColors===undefined?markers.map(m=>m[2]):value.canColors;
        if(!Array.isArray(canColors)||canColors.length!==6||canColors.some(c=>c!==null&&!['red','yellow','green'].includes(c)))throw Error('Choose a valid can color or leave the station empty.');
        const objects=(value.objects||[]).map(o=>{
            if(!['bridge','bridge_ramp','bridge_platform','tunnel'].includes(o.type)||!Number.isInteger(o.cell)||o.cell<0||o.cell>=32)throw Error('Invalid field object');
            return {type:o.type,cell:o.cell,rotation:((Math.trunc(Number(o.rotation)||0)%4)+4)%4,...(o.type==='bridge'?{shape:o.shape==='corner'?'corner':'straight'}:{})};
        });
        return {version:1,...(['quick-box-drop','lga-junior','lga-senior'].includes(value.preset)?{preset:value.preset}:{}),seed:String(value.seed||'1').slice(0,64),cells,canColors:canColors.slice(),...(objects.length?{objects}:{})};
    }
    function load(){try{return normalize(JSON.parse(root.localStorage.getItem(KEY)));}catch(_){return null;}}
    function category(layout){
        const cells=layout?.cells||[];
        if(cells.some(c=>c.type.startsWith('lga_')))return layout.preset==='lga-senior'||cells.some(c=>c.type.startsWith('lga_senior_'))?'lga-senior':'lga-junior';
        if(cells.some(c=>c.type.startsWith('quick_box_')))return 'quick-box-drop';
        if(cells.some(c=>c.type.startsWith('rescue_'))||layout?.objects?.length)return 'rescue-robot';
        if(cells.some(c=>c.type!=='blank'&&c.type!=='original'))return 'basic-tracks';
        return cells.some(c=>c.type==='original'&&c.source!==23)?'delivery-robot-primary':null;
    }
    function save(value){const clean=normalize(value);if(!clean)throw Error('Invalid field');root.localStorage.setItem(KEY,JSON.stringify(clean));return clean;}
    function random(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
    function shuffle(layout,seed){const out=normalize(layout),rng=random(seed),slots=out.cells.map((c,i)=>c.locked?-1:i).filter(i=>i>=0);out.seed=String(seed);
        for(let n=slots.length-1;n>0;n--){const j=Math.floor(rng()*(n+1));[out.cells[slots[n]],out.cells[slots[j]]]=[out.cells[slots[j]],out.cells[slots[n]]];}return out;}
    function shuffleOriginal(layout,seed){
        const out=normalize(layout),used=new Set(),rng=random(seed);
        for(const c of out.cells.filter(c=>c.locked)){
            if(c.type!=='original'||used.has(c.source))throw Error('Only unique original panels can be locked.');used.add(c.source);
        }
        const pool=initial().cells.filter(c=>!used.has(c.source));
        pool.forEach(c=>{const previous=out.cells.find(p=>p.type==='original'&&p.source===c.source);if(previous)c.rotation=previous.rotation;});
        for(let n=pool.length-1;n>0;n--){const j=Math.floor(rng()*(n+1));[pool[n],pool[j]]=[pool[j],pool[n]];}
        out.cells=out.cells.map(c=>c.locked?c:pool.pop());out.seed=String(seed);return out;
    }
    // N/E/S/W ports traced from the 32 original OPT panels. Panels 5 and 10
    // contain separate branches ending at can markers; never join those
    // branches merely because they occupy the same tile. Panel 13's obstacle
    // is traversable between its west/east ports.
    // Colored drop zones have separate terminal approaches, never transit links.
    const originalGroups=[[6],[15],[2,8],[15],[2,8],[10],[15],[13],
        [7],[7,8],[10],[15],[10],[10],[15],[1,8],
        [5],[5],[2],[15],[10],[8],[5],[],[3],[15],[10],[9],[2],[10],[11],[8]];
    const turnMask=(mask,r)=>((mask<<r)|(mask>>(4-r)))&15;
    const originalMasks=originalGroups.map(gs=>Array.from({length:4},(_,r)=>turnMask(gs.reduce((a,b)=>a|b,0),r)));
    const groups=cell=>cell.type==='original'?originalGroups[cell.source].map(m=>turnMask(m,cell.rotation)):(ports(cell).length?[ports(cell).reduce((m,d)=>m|(1<<d),0)]:[]);
    const mask=cell=>groups(cell).reduce((a,b)=>a|b,0);
    const neighbor=(i,d)=>d===0?(i>=8?i-8:-1):d===1?(i%8<7?i+1:-1):d===2?(i<24?i+8:-1):(i%8?i-1:-1);
    function structureAccess(layout){
        const bridges=new Map(),tunnels=new Map();
        const put=(cell,role,rotation)=>bridges.set(cell,{role,high:(rotation+1)%4});
        for(const object of layout.objects||[]){
            if(object.type==='bridge_platform')put(object.cell,'deck',0);
            if(object.type==='bridge_ramp')put(object.cell,'ramp',object.rotation);
            if(object.type==='bridge'){
                const cells=objectCells(object);put(cells[0],'deck',0);put(cells[1],'ramp',object.rotation);
                put(cells[2],'ramp',(object.rotation+(object.shape==='corner'?1:2))%4);
            }
            if(object.type==='tunnel'){const cells=objectCells(object);tunnels.set(cells[0],[1,2].map(d=>(d+object.rotation)%4));tunnels.set(cells[1],[0,3].map(d=>(d+object.rotation)%4));}
        }
        const edges=layout.cells.map((cell,i)=>{
            const bridge=bridges.get(i);
            if(bridge?.role==='ramp')return [{d:bridge.high,h:.05},{d:(bridge.high+2)%4,h:0}];
            if(bridge?.role==='deck')return [0,1,2,3].filter(d=>{const other=bridges.get(neighbor(i,d));return other&&(other.role==='deck'||other.high===(d+2)%4);}).map(d=>({d,h:.05}));
            return (tunnels.get(i)||ports(cell)).map(d=>({d,h:0}));
        });
        const start=layout.cells.findIndex(c=>c.type==='rescue_start'||c.type==='lga_start'),visited=new Set(),queue=start<0?[]:[start];
        const linked=(i,edge)=>{const j=neighbor(i,edge.d);return j>=0&&edges[j].some(other=>other.d===(edge.d+2)%4&&Math.abs(other.h-edge.h)<1e-8);};
        while(queue.length){const i=queue.pop();if(visited.has(i))continue;visited.add(i);
            for(const edge of edges[i]){const j=neighbor(i,edge.d);if(j>=0&&edges[j].some(other=>other.d===(edge.d+2)%4&&Math.abs(other.h-edge.h)<1e-8))queue.push(j);}
        }
        const unreachable=layout.cells.map((c,i)=>ports(c).length&&!visited.has(i)?i:-1).filter(i=>i>=0);
        const missions=unreachable.filter(i=>/pickup|drop|checkpoint|finish/.test(layout.cells[i].type));
        const blockedEntries=[];
        for(const [i,bridge]of bridges)if(bridge.role==='ramp'?edges[i].some(edge=>!linked(i,edge)):edges[i].length<2)blockedEntries.push(i);
        for(const [i,directions]of tunnels)if(directions.some(d=>!tunnels.has(neighbor(i,d))&&!linked(i,{d,h:0})))blockedEntries.push(i);
        return {ok:start>=0&&!unreachable.length&&!blockedEntries.length,visited,score:visited.size-missions.length*10-blockedEntries.length*20,unreachable,missions,blockedEntries};
    }
    function validateConnected(layout){
        let clean;try{clean=normalize(layout);}catch(_){return {ok:false,message:'Invalid field layout'};}
        if(!clean)return {ok:false,message:'Invalid field layout'};
        if(category(clean)==='quick-box-drop')return {ok:true,message:'Quick Box Drop Challenge · 120 × 120 cm · 20 mm boundary lines'};
        const occupied=new Set();
        for(const object of clean.objects||[])for(const i of objectCells(object)){
            if(i<0||occupied.has(i)||!isWhitePanel(clean.cells[i]))return {ok:false,message:'Place bridge and tunnel objects on empty white panels without overlap.'};
            occupied.add(i);
        }
        if(clean.cells.some(c=>c.type.startsWith('rescue_')||c.type.startsWith('lga_'))){
            const start=clean.cells.findIndex(c=>c.type==='rescue_start'||c.type==='lga_start');
            if(start<0)return {ok:false,message:'Place the RESCUE START panel before applying the field.'};
            const access=structureAccess(clean);
            return access.ok?{ok:true,message:'All paths and mission approaches are accessible from START'}:{ok:false,message:access.blockedEntries.length?'Bridge or tunnel entrance is blocked at panel '+(access.blockedEntries[0]+1):'Bridge, tunnel or boundary blocks access to '+(access.missions.length?'mission':'panel')+' '+((access.missions[0]??access.unreachable[0])+1)};
        }
        const originals=clean.cells.filter(c=>c.type==='original');
        if(!clean.cells.some(c=>c.type!=='original'&&c.type!=='blank')&&!originals.some(c=>c.source===27))return {ok:false,message:'Place the START panel before applying the field.'};
        const nodes=[],nodeAt=clean.cells.map(c=>groups(c).map(m=>{nodes.push({mask:m,links:[]});return nodes.length-1;}));
        for(let i=0;i<32;i++)for(let d=0;d<4;d++){
            const j=neighbor(i,d),has=!!(mask(clean.cells[i])&(1<<d));
            if(j<0)continue;
            if(has!==!!(mask(clean.cells[j])&(1<<((d+2)%4))))return {ok:false,message:`Edges between slots ${i+1} and ${j+1} do not connect.`};
            if(has){const a=nodeAt[i].find(n=>nodes[n].mask&(1<<d)),b=nodeAt[j].find(n=>nodes[n].mask&(1<<((d+2)%4)));nodes[a].links.push(b);}
        }
        let start=clean.cells.findIndex(c=>c.source===27||c.type==='start');if(start<0)start=nodeAt.findIndex(ns=>ns.length);if(start<0)return {ok:false,message:'Add track panels to the field.'};const visited=new Set(),queue=[nodeAt[start][0]];
        while(queue.length){const n=queue.pop();if(visited.has(n))continue;visited.add(n);queue.push(...nodes[n].links);}
        return visited.size===nodes.length?{ok:true,message:clean.cells.some(c=>c.source===27||c.type==='start')?'All routes connect to START':'All track panels connect'}:{ok:false,message:'Some routes cannot reach START'};
    }
    function interiorSide(cellIndex,heading){
        if(!Number.isInteger(cellIndex))return 'l';
        const directions=[[0,-1],[1,0],[0,1],[-1,0]],x=cellIndex%8+.5,y=Math.floor(cellIndex/8)+.5;
        const score=turn=>{const d=directions[(heading+turn+4)%4],px=x+d[0]*.3,py=y+d[1]*.3;
            return Math.min(px,8-px,py,4-py)*100-Math.hypot(px-4,py-2);};
        return score(1)>score(-1)?'r':'l';
    }
    function startPose(layout,field){
        if(category(layout)==='quick-box-drop'){
            const i=layout.cells.findIndex(c=>c.type==='quick_box_15');
            if(i<0)throw Error('Quick Box Drop start zone 5 is missing');
            return {x:(field.centerX||0)+((i%8+.5)/8-.5)*field.width,z:(field.centerZ||0)+((Math.floor(i/8)+.5)/4-.5)*field.length,heading:Math.PI/2};
        }
        const cells=(layout||initial()).cells;let index=cells.findIndex(c=>c.type==='original'&&c.source===27||c.type==='start'||c.type==='rescue_start'||c.type==='lga_start');if(index<0)index=cells.findIndex(c=>c.type!=='original'&&ports(c).length);
        if(index<0)throw Error('START panel is missing');
        return {x:(field.centerX||0)+((index%8+.5)/8-.5)*field.width,z:(field.centerZ||0)+((Math.floor(index/8)+.5)/4-.5)*field.length,heading:-cells[index].rotation*Math.PI/2};
    }
    function connectedShuffle(layout,seed,maxNodes=12000){
        const clean=normalize(layout),rng=random(seed),placed=Array(32).fill(null),used=new Set();
        clean.cells.forEach((c,i)=>{if(!c.locked)return;const entry=catalog.find(e=>e.copies.some(([source])=>source===c.source));if(!entry)throw Error('Unlock empty slots before shuffling.');const base=entry.copies.find(([source])=>source===c.source)[1],copy=entry.copies.find(([source])=>source===c.source&&!used.has(source))||entry.copies.find(([source])=>!used.has(source));if(!copy)throw Error('Too many locked copies of '+entry.name+'. Unlock a copy before shuffling.');placed[i]={...c,source:copy[0],rotation:(c.rotation-base+copy[1]+4)%4};used.add(copy[0]);});
        const fits=(c,i)=>{const m=mask(c);for(let d=0;d<4;d++){const j=neighbor(i,d),has=!!(m&(1<<d));if(j>=0&&placed[j]&&has!==!!(mask(placed[j])&(1<<((d+2)%4))))return false;}return true;};
        for(let i=0;i<32;i++)if(placed[i]&&!fits(placed[i],i))throw Error('Locked panels have mismatched edges. Rotate or unlock them.');
        const variants=[];for(let source=0;source<32;source++)for(let rotation=0;rotation<4;rotation++){const c={type:'original',source,rotation,locked:false};variants.push(c);}
        for(let i=variants.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[variants[i],variants[j]]=[variants[j],variants[i]];}
        const order=Array.from({length:32},(_,i)=>i);for(let i=31;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
        let count=0;
        function search(){
            if(++count>maxNodes)return false;
            let index=-1,choices=null;
            for(const i of order){if(placed[i])continue;const seen=new Set(),candidates=[];
                for(const c of variants){if(used.has(c.source)||!fits(c,i))continue;const key=groups(c).slice().sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);candidates.push(c);}
                if(!candidates.length)return false;if(!choices||candidates.length<choices.length){index=i;choices=candidates;}if(choices.length===1)break;
            }
            if(index<0)return validateConnected({version:1,seed:String(seed),cells:placed}).ok;
            for(const c of choices){placed[index]=c;used.add(c.source);if(search())return true;used.delete(c.source);placed[index]=null;if(count>maxNodes)return false;}return false;
        }
        if(!search()){
            // A bounded search must not leave the editor waiting indefinitely.
            // Rearrange artwork within an already connected topology instead.
            const template=validateConnected(clean).ok?clean:initial(),key=c=>groups(c).slice().sort((a,b)=>a-b).join(',');
            const locked=placed.filter(c=>c&&c.locked);used.clear();locked.forEach(c=>used.add(c.source));
            for(let i=0;i<32;i++)if(!clean.cells[i].locked)placed[i]=null;
            if(placed.some((c,i)=>c&&key(c)!==key(template.cells[i])))throw Error('Locked panels restrict the route. Shuffle again or unlock some panels.');
            function fill(n){if(n===32)return true;if(placed[n])return fill(n+1);for(const c of variants){if(used.has(c.source)||key(c)!==key(template.cells[n]))continue;placed[n]=c;used.add(c.source);if(fill(n+1))return true;used.delete(c.source);placed[n]=null;}return false;}
            if(!fill(0)||!validateConnected({version:1,seed:String(seed),cells:placed}).ok)throw Error('No connected layout found. Shuffle again or unlock some panels.');
        }
        return normalize({version:1,seed:String(seed),cells:placed,canColors:clean.canColors});
    }
    const sides={blank:[],straight:[0,2],curve:[0,1],tee:[0,1,3],cross:[0,1,2,3],start:[2],finish:[0]};
    function ports(cell){
        const local=localDefinitions[cell.type];
        if(local&&(/pickup|drop/.test(cell.type)))return [cell.rotation];
        const rescue=rescueDefinitions[cell.type];return (rescue?[0,1,2,3].filter(d=>!(rescue[1]&(1<<d))):(sides[cell.type]||[])).map(d=>(d+cell.rotation)%4);
    }
    function isWhitePanel(cell){return cell?.type==='lga_open'||cell?.type==='rescue_open'||cell?.type==='original'&&cell.source===23;}
    function objectCells(object){
        const offsets=object.type==='bridge_ramp'||object.type==='bridge_platform'?[[0,0]]:object.type==='tunnel'?[[0,0],[0,1]]:object.shape==='corner'?[[0,0],[-1,0],[0,-1]]:[[-1,0],[0,0],[1,0]];
        return offsets.map(([x,y])=>{[x,y]=transform(x,y,object.rotation);const col=object.cell%8+x,row=Math.floor(object.cell/8)+y;return col<0||col>=8||row<0||row>=4?-1:row*8+col;});
    }
    function placeObject(layout,object,replaceIndex=-1){
        const cells=objectCells(object),others=(layout.objects||[]).filter((_,i)=>i!==replaceIndex);
        if(cells.some(i=>i<0||!isWhitePanel(layout.cells[i])||layout.cells[i].locked||others.some(o=>objectCells(o).includes(i))))throw Error('Choose enough empty white panels for this object.');
        layout.objects=[...others,{...object}];
    }
    function drawObjectTile(ctx,object,size){
        ctx.save();ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);ctx.strokeStyle='#b8c4ce';ctx.lineWidth=2;ctx.strokeRect(1,1,size-2,size-2);
        ctx.fillStyle='#465365';ctx.font=`${size*.08}px sans-serif`;ctx.textAlign='center';ctx.fillText(object.type==='bridge_ramp'?'RAMP':object.type==='bridge_platform'?'PLATFORM':object.type.toUpperCase(),size/2,size*.5);
        if(object.type==='bridge_ramp'){ctx.translate(size/2,size/2);ctx.rotate((object.rotation||0)*Math.PI/2);ctx.strokeStyle='#738393';ctx.lineWidth=size*.02;ctx.beginPath();ctx.moveTo(-size*.25,size*.22);ctx.lineTo(size*.25,size*.22);ctx.lineTo(size*.15,size*.12);ctx.moveTo(size*.25,size*.22);ctx.lineTo(size*.15,size*.32);ctx.stroke();}ctx.restore();
    }
    // Inventory traced from PDF page 1 on its 8 x 4 grid. Obscured
    // bridge/tunnel cells are reserved footprints, not guessed floor patterns.
    function rescueExample(){
        const tile=(type,walls)=>{for(let rotation=0;rotation<4;rotation++)if(turnMask(rescueDefinitions[type][1],rotation)===walls)return {type,rotation,locked:false};throw Error('Invalid rescue template');};
        const rows=[
            [['corner',9],['drop',7],['open',0],['edge',1],['corridor',5],['corner',3],['corner',9],['start',7]],
            [['edge',8],['edge',1],['open',0],['pit',15],['closed',15],['edge',8],['edge',4],['edge',2]],
            [['corridor',10],['edge',8],['checkpoint_corner',9],['open',0],['open',0],['open',0],['checkpoint_corridor',5],['edge',2]],
            [['finish',14],['drop',14],['drop',13],['edge',4],['open',0],['open',0],['drop',13],['corner',6]]
        ];
        const out=normalize({version:1,seed:'rescue-pdf-example',cells:rows.flat().map(([type,walls])=>tile('rescue_'+type,walls)),canColors:Array(6).fill(null)});
        out.cells[11].rotation=1;out.objects=[{type:'tunnel',cell:2,rotation:0},{type:'bridge_platform',cell:29,rotation:0},{type:'bridge_ramp',cell:28,rotation:0},{type:'bridge_ramp',cell:21,rotation:1}];return out;
    }
    function rescueShuffle(layout,seed){
        if(layout?.cells.some(c=>c.locked))throw Error('Unlock panels before shuffling RESCUE ROBOT.');
        const out=rescueExample(),rng=random(seed);
        if(rng()<.5){
            const candidate={...out,objects:[out.objects[0],{type:'bridge_ramp',cell:19,rotation:0},{type:'bridge_platform',cell:20,rotation:0},{type:'bridge_ramp',cell:21,rotation:2}]};
            const accessible=repairBridgeAccess(candidate,rng);if(accessible){out.cells=accessible.cells;out.objects=accessible.objects;}
        }
        // Keep asymmetric obstacle footprints intact: rotate the complete set
        // by 180 degrees; subsequent exchanges never split either footprint.
        if(rng()<.5){out.cells=out.cells.reverse().map(c=>({...c,rotation:(c.rotation+2)%4}));out.objects=out.objects.map(o=>({...o,cell:31-o.cell,rotation:(o.rotation+2)%4}));}
        const covered=new Set(out.objects.flatMap(objectCells));
        const movable=out.cells.map((c,i)=>covered.has(i)?-1:i).filter(i=>i>=0);
        const boundaryOK=()=>out.cells.every((c,i)=>{
            if(c.type==='rescue_pit'||c.type==='rescue_open'||covered.has(i))return true;
            const walls=turnMask(rescueDefinitions[c.type][1],c.rotation);
            return (i>=8||!!(walls&1))&&(i%8!==7||!!(walls&2))&&(i<24||!!(walls&4))&&(i%8!==0||!!(walls&8));
        });
        for(let n=0;n<350;n++){
            const a=movable[Math.floor(rng()*movable.length)],b=movable[Math.floor(rng()*movable.length)];if(a===b)continue;
            const ca=out.cells[a],cb=out.cells[b];
            out.cells[a]={...cb,rotation:Math.floor(rng()*4)};out.cells[b]={...ca,rotation:Math.floor(rng()*4)};
            if(!boundaryOK()||!validateConnected(out).ok){out.cells[a]=ca;out.cells[b]=cb;}
        }
        out.seed=String(seed);return out;
    }
    function route(seed,layout){
        if(layout&&layout.cells.some(c=>c.locked))throw Error('Unlock panels before generating a new route.');
        const rng=random(seed),neighbors=i=>[i>=8?i-8:-1,i%8<7?i+1:-1,i<24?i+8:-1,i%8?i-1:-1].filter(n=>n>=0);
        let best=[];
        for(let attempt=0;attempt<100;attempt++){
            const path=[Math.floor(rng()*32)],used=new Set(path);
            for(;;){const next=neighbors(path[path.length-1]).filter(n=>!used.has(n));if(!next.length)break;const n=next[Math.floor(rng()*next.length)];path.push(n);used.add(n);}
            if(path.length>best.length)best=path;if(best.length===32)break;
        }
        const out={version:1,seed:String(seed),cells:Array.from({length:32},()=>({type:'blank',rotation:0,locked:false}))};
        const direction=(a,b)=>b===a-8?0:b===a+1?1:b===a+8?2:3;
        best.forEach((index,n)=>{const wanted=[];if(n)wanted.push(direction(index,best[n-1]));if(n+1<best.length)wanted.push(direction(index,best[n+1]));
            const type=n===0?'start':n===best.length-1?'finish':Math.abs(wanted[0]-wanted[1])===2?'straight':'curve';
            for(let rotation=0;rotation<4;rotation++){const c={type,rotation,locked:false};if(ports(c).every(d=>wanted.includes(d))){out.cells[index]=c;break;}}
        });return out;
    }
    function transform(x,y,rotation){for(let n=0;n<rotation;n++)[x,y]=[-y,x];return [x,y];}
    function localExample(senior=false){
        const tile=(type,walls)=>{for(let rotation=0;rotation<4;rotation++)if(turnMask(rescueDefinitions[type][1],rotation)===walls)return {type,rotation,locked:false};throw Error('Invalid local field tile');};
        const rows=[
            [['corner',9],['edge',1],['corner',3],['corner',9],['checkpoint_edge',1],['corner',3],['checkpoint_corner',9],['open',0]],
            [['corridor',10],['corner',9],['corner',6],['open',0],['closed',15],['open',0],['edge',4],['open',0]],
            [['corridor',10],['edge',8],['open',0],['open',0],['open',0],['open',0],['edge',1],['edge',2]],
            [['start',14],['open',0],['open',0],['corridor',5],['rods',0],['corner',6],['finish',14],['open',0]]
        ];
        const cells=rows.flat().map(([type,walls])=>tile('lga_'+type,walls));
        for(const [index,rotation]of [[11,0],[15,3],[26,1]])cells[index]={type:'lga_pickup_raised',rotation,locked:false};
        for(const [index,color,rotation]of [[7,'red',3],[25,'green',0],[31,'yellow',0]])cells[index]={type:'lga_'+(senior?'senior_':'')+'drop_'+color,rotation,locked:false,...(senior?{slotColors:['red','yellow','green']}:{})};
        for(const [i,index]of [11,15,26].entries())cells[index].canColors=[['red','green'],['yellow','red'],['yellow','green']][i].concat([null,null,null,null]);
        return normalize({version:1,preset:senior?'lga-senior':'lga-junior',seed:senior?'lga-senior-example':'lga-junior-example',cells,
            canColors:['red','green','yellow','red','yellow','green'],objects:[{type:'bridge_ramp',cell:18,rotation:0},{type:'bridge_platform',cell:19,rotation:0},{type:'bridge_ramp',cell:20,rotation:2}]});
    }
    function repairBridgeAccess(layout,rng,limit=2400){
        const out={...layout,cells:layout.cells.map(c=>({...c}))},covered=new Set((out.objects||[]).flatMap(objectCells));
        const movable=out.cells.map((c,i)=>!covered.has(i)&&!c.locked&&!/pickup|drop|start|rods/.test(c.type)&&(localDefinitions[c.type]||rescueDefinitions[c.type])?i:-1).filter(i=>i>=0);
        let current=structureAccess(out);if(current.ok)return out;if(!movable.length)return null;
        let best=current.score,bestCells=out.cells.slice();
        const boundaryOK=(cell,i)=>{const walls=turnMask(rescueDefinitions[cell.type][1],cell.rotation);return (i>=8||!!(walls&1))&&(i%8!==7||!!(walls&2))&&(i<24||!!(walls&4))&&(i%8!==0||!!(walls&8));};
        for(let attempt=0;attempt<limit;attempt++){
            if(attempt&&attempt%400===0){out.cells=bestCells.slice();current=structureAccess(out);}
            const a=movable[Math.floor(rng()*movable.length)],b=rng()<.45?a:movable[Math.floor(rng()*movable.length)],ca=out.cells[a],cb=out.cells[b];
            out.cells[a]={...cb,rotation:Math.floor(rng()*4)};if(a!==b)out.cells[b]={...ca,rotation:Math.floor(rng()*4)};
            if(!boundaryOK(out.cells[a],a)||!boundaryOK(out.cells[b],b)){out.cells[a]=ca;out.cells[b]=cb;continue;}
            const next=structureAccess(out);if(next.ok)return out;
            const temperature=4*(1-(attempt%400)/400)+.2;
            if(next.score>=current.score||rng()<Math.exp((next.score-current.score)/temperature)){
                current=next;if(next.score>best){best=next.score;bestCells=out.cells.slice();}
            }else{out.cells[a]=ca;out.cells[b]=cb;}
        }return null;
    }
    function localShuffle(layout,seed,senior=false){
        const clean=normalize(layout),out=clean&&category(clean)===(senior?'lga-senior':'lga-junior')?clean:localExample(senior),rng=random(seed);
        out.seed=String(seed);out.preset=senior?'lga-senior':'lga-junior';
        const bridges=(out.objects||[]).filter(o=>o.type.startsWith('bridge'));
        if(!bridges.some(o=>objectCells(o).some(i=>out.cells[i]?.locked))){
            const others=(out.objects||[]).filter(o=>!o.type.startsWith('bridge')),occupied=new Set(others.flatMap(objectCells)),candidates=[],blocked=[];
            const free=i=>i>=0&&!occupied.has(i)&&!out.cells[i].locked&&isWhitePanel(out.cells[i]);
            for(let deck=0;deck<32;deck++)if(free(deck))for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
                const first=neighbor(deck,a),second=neighbor(deck,b);
                const exitOK=(ramp,direction)=>{const exit=neighbor(ramp,direction);return exit>=0&&!occupied.has(exit)&&ports(out.cells[exit]).includes((direction+2)%4);};
                if(!free(first)||!free(second)||!exitOK(first,a)||!exitOK(second,b))continue;
                const candidate={corner:(a+2)%4!==b,layout:{...out,objects:[...others,{type:'bridge_platform',cell:deck,rotation:0},{type:'bridge_ramp',cell:first,rotation:(a+1)%4},{type:'bridge_ramp',cell:second,rotation:(b+1)%4}]}};
                (structureAccess(candidate.layout).ok?candidates:blocked).push(candidate);
            }
            const wantCorner=rng()<.5;
            if(!candidates.some(c=>c.corner===wantCorner))for(const candidate of blocked.filter(c=>c.corner===wantCorner).slice(0,4)){
                const repaired=repairBridgeAccess(candidate.layout,rng);if(repaired){candidates.push({...candidate,layout:repaired});break;}
            }
            const preferred=candidates.filter(c=>c.corner===wantCorner),pool=preferred.length?preferred:candidates;
            if(pool.length){const selected=pool[Math.floor(rng()*pool.length)].layout;out.objects=selected.objects;out.cells=selected.cells;}
        }
        // Keep the PDF route intact; rotate the entire field and randomize missions.
        if(!out.cells.some(c=>c.locked)&&rng()<.5){out.cells.reverse();out.cells.forEach(c=>c.rotation=(c.rotation+2)%4);out.objects?.forEach(o=>{o.cell=31-o.cell;o.rotation=(o.rotation+2)%4;});}
        const colors=['red','red','yellow','yellow','green','green'];
        for(let i=5;i>0;i--){const j=Math.floor(rng()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]];}
        let n=0;for(const cell of out.cells){if(cell.type.startsWith('lga_pickup_')&&!cell.locked){cell.canColors=[colors[n++%6],colors[n++%6],null,null,null,null];}
            if(cell.type.startsWith('lga_senior_drop_')&&!cell.locked){const slots=['red','yellow','green'];for(let i=2;i>0;i--){const j=Math.floor(rng()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}cell.slotColors=slots;}}
        const result=normalize(out),checked=validateConnected(result);if(!checked.ok)throw Error(checked.message+'. Unlock panels or restore the original field.');return result;
    }
    function structureParts(layout,field){
        const parts=[];
        const local=category(layout).startsWith('lga-');
        for(const object of layout.objects||[]){
            const cx=(field.centerX||0)+((object.cell%8+.5)/8-.5)*field.width;
            const cz=(field.centerZ||0)+((Math.floor(object.cell/8)+.5)/4-.5)*field.length;
            const add=(name,position,size,color,extra={})=>{
                const [x,z]=transform(position[0],position[2],object.rotation);
                parts.push({name,x:cx+x,y:position[1],z:cz+z,yaw:-object.rotation*Math.PI/2,size,color,...(local?{colorSpace:'srgb'}:{}),...extra});
            };
            if(object.type==='tunnel'){
                add('Tunnel roof',[0,.2975,.15],[.3,.005,.6],0xffffff);
                add('Tunnel end',[0,.1475,-.1475],[.3,.295,.005],0xffffff);
                add('Tunnel end',[0,.1475,.4475],[.3,.295,.005],0xffffff);
                add('Tunnel side',[-.1475,.1475,0],[.005,.295,.3],0xffffff);
                add('Tunnel side',[.1475,.1475,.3],[.005,.295,.3],0xffffff);
            }else{
                if(object.type!=='bridge_ramp')add('Bridge platform',[0,.025,0],[.3,.05,.3],0xffffff);
                const ramp=(name,x,z,direction,color)=>{
                    const vertices=[[-.15,0,-.15],[.15,0,-.15],[.15,0,.15],[-.15,0,.15],[.15,.05,-.15],[.15,.05,.15]];
                    const turns=direction;
                    const turned=vertices.map(([vx,vy,vz])=>{const [rx,rz]=transform(vx,vz,turns);return [rx,vy,rz];});
                    add(name,[x,0,z],null,color,{vertices:turned,faces:[[1,2,3,0],[4,1,0],[2,5,3],[4,5,2,1],[3,5,4,0]]});
                };
                if(object.type==='bridge_ramp')ramp('Bridge ramp',0,0,0,0xffffff);
                else if(object.type==='bridge'){
                    ramp('Bridge ramp - Up',-.3,0,0,0xffffff);
                    if(object.shape==='corner')ramp('Bridge ramp - Down',0,-.3,1,0xffffff);
                    else ramp('Bridge ramp - Down',.3,0,2,0xffffff);
                }
            }
        }
        return parts.concat(localPlatformParts(layout,field));
    }
    function localPlatformParts(layout,field){
        const parts=[],palette={green:0x44bc54,yellow:0xffe500,red:0xcb2533},slotPalette={green:0x299b46,yellow:0xffff32,red:0xff1818};
        function prism(polygon,bottom,top){const vertices=[...polygon.map(([x,z])=>[x,bottom,z]),...polygon.map(([x,z])=>[x,top,z])],n=polygon.length;
            return {vertices,faces:[Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>2*n-1-i),...polygon.map((_,i)=>[i,i+n,(i+1)%n+n,(i+1)%n])]};}
        function seniorPlatform(height){
            const centers=[-.09,0,.09],depth=.01;
            const patches=[prism([[-.15,-.05],[.15,-.05],[.15,.05],[-.15,.05]],0,height-depth)];
            for(const [index,center]of centers.entries()){
                const left=index?(centers[index-1]+center)/2:-.15,right=index<2?(center+centers[index+1])/2:.15;
                const angles=Array.from({length:24},(_,i)=>i*Math.PI/12);
                for(const x of [left,right])for(const z of [-.05,.05])angles.push((Math.atan2(z,x-center)+Math.PI*2)%(Math.PI*2));
                angles.sort((a,b)=>a-b);const unique=angles.filter((a,i)=>!i||a-angles[i-1]>1e-8);
                const inner=a=>[center+.03*Math.cos(a),.03*Math.sin(a)],outer=a=>{const dx=Math.cos(a),dz=Math.sin(a),t=Math.min(dx>1e-9?(right-center)/dx:dx<-1e-9?(left-center)/dx:Infinity,dz>1e-9?.05/dz:dz<-1e-9?-.05/dz:Infinity);return [center+dx*t,dz*t];};
                for(let i=0;i<unique.length;i++){const a=unique[i],b=unique[(i+1)%unique.length];patches.push(prism([inner(a),outer(a),outer(b),inner(b)],height-depth,height));}
            }
            const vertices=[],faces=[];for(const patch of patches){const offset=vertices.length;vertices.push(...patch.vertices);faces.push(...patch.faces.map(face=>face.map(i=>i+offset)));}
            return {vertices,faces,collisionParts:patches,hideEdges:true,recessDepth:depth};
        }
        (layout.cells||[]).forEach((cell,index)=>{
            if(!cell.type.startsWith('lga_'))return;const mark=localDefinitions[cell.type]?.[2];
            const cx=(field.centerX||0)+((index%8+.5)/8-.5)*field.width,cz=(field.centerZ||0)+((Math.floor(index/8)+.5)/4-.5)*field.length;
            const add=(name,y,size,color,extra={})=>{const [dx,dz]=transform(0,.1,cell.rotation);parts.push({name,x:cx+dx,y,z:cz+dz,yaw:-cell.rotation*Math.PI/2,size,color,colorSpace:'srgb',...extra});};
            if(mark==='pickup-raised'){
                add('Pickup platform base - 40 mm',.02,[.3,.04,.1],0xffffff);
                const patches=[];
                // Two 60 mm recesses, 10 mm deep. Centers at 90/210 mm.
                for(const center of [-.06,.06]){
                    const left=center<0?-.15:0,right=center<0?0:.15;
                    const angles=Array.from({length:24},(_,i)=>i*Math.PI/12);
                    for(const x of [left,right])for(const z of [-.05,.05])angles.push((Math.atan2(z,x-center)+Math.PI*2)%(Math.PI*2));
                    angles.sort((a,b)=>a-b);const unique=angles.filter((a,i)=>!i||a-angles[i-1]>1e-8);
                    const inner=a=>[center+.03*Math.cos(a),.03*Math.sin(a)],outer=a=>{const dx=Math.cos(a),dz=Math.sin(a);const t=Math.min(dx>1e-9?(right-center)/dx:dx<-1e-9?(left-center)/dx:Infinity,dz>1e-9?.05/dz:dz<-1e-9?-.05/dz:Infinity);return [center+dx*t,dz*t];};
                    for(let i=0;i<unique.length;i++){const a=unique[i],b=unique[(i+1)%unique.length];patches.push(prism([inner(a),outer(a),outer(b),inner(b)],.04,.05));}
                    const disc=prism(Array.from({length:32},(_,i)=>[center+.03*Math.cos(i*Math.PI/16),.03*Math.sin(i*Math.PI/16)]),.04001,.04002);
                    add('Pickup recess floor - diameter 60 mm',0,null,0x171717,{...disc,visualOnly:true,hideEdges:true});
                }
                const vertices=[],faces=[];for(const patch of patches){const offset=vertices.length;vertices.push(...patch.vertices);faces.push(...patch.faces.map(face=>face.map(i=>i+offset)));}
                add('Pickup platform rim - 50 mm, recess depth 10 mm',0,null,0xffffff,{vertices,faces,collisionParts:patches,hideEdges:true});
            }else if(['green','yellow','red'].includes(mark)){
                const height={green:.05,yellow:.1,red:.15}[mark],senior=cell.type.startsWith('lga_senior_');
                add(mark+' delivery platform - '+height*1000+' mm',senior?0:height/2,[.3,height,.1],palette[mark],senior?seniorPlatform(height):{});
                if(senior)for(const [i,color]of (cell.slotColors||['red','yellow','green']).entries()){
                    const disc=prism(Array.from({length:32},(_,n)=>[-.09+i*.09+.03*Math.cos(n*Math.PI/16),.03*Math.sin(n*Math.PI/16)]),height-.01+.00001,height-.01+.00002);
                    add('Delivery color slot - '+color,0,null,slotPalette[color],{...disc,visualOnly:true,hideEdges:true});
                }
            }
        });return parts;
    }
    function features(layout,field){
        const cans=[],rods=[],canSlots=[],colors=layout&&layout.canColors||markers.map(m=>m[2]);
        (layout||initial()).cells.forEach((cell,index)=>{
            if(cell.type==='rescue_rods'||cell.type==='lga_rods')for(let i=0;i<7;i++){
                // PDF p.5: 300 mm rods; first/last centres 50 mm from
                // the panel sides, spanning 200 mm with six equal gaps.
                const [x,z]=transform(-.1+i*(.2/6),0,cell.rotation);
                rods.push({x:(field.centerX||0)+((index%8+.5)/8-.5)*field.width+x,z:(field.centerZ||0)+((Math.floor(index/8)+.5)/4-.5)*field.length+z,diameter:cell.type==='lga_rods'?.01:.005,length:.3,yaw:-cell.rotation*Math.PI/2});
            }
            if(cell.type.startsWith('lga_pickup_'))for(let station=0;station<2;station++){
                const [x,z]=transform(station===0?-.06:.06,.1,cell.rotation),u=(index%8+.5+x/.3)/8,v=(Math.floor(index/8)+.5+z/.3)/4,color=(cell.canColors||colors)[station];
                canSlots.push({station,key:index+':'+station,cell:index,u,v,color,supportHeight:cell.type==='lga_pickup_raised'?.04:0});
                if(color)cans.push([u,v,color,cell.type==='lga_pickup_raised'?.04:0]);
            }
            if(cell.type!=='original')return;const sx=cell.source%8,sy=Math.floor(cell.source/8),dx=index%8,dy=Math.floor(index/8);
            const move=(u,v)=>{const [x,y]=transform(u*8-sx-.5,v*4-sy-.5,cell.rotation);return [(dx+.5+x)/8,(dy+.5+y)/4];};
            markers.forEach(([u,v],station)=>{if(Math.floor(u*8)===sx&&Math.floor(v*4)===sy){const p=move(u,v),color=(cell.canColors||colors)[station];canSlots.push({station,key:index+':'+station,cell:index,u:p[0],v:p[1],color});if(color)cans.push([p[0],p[1],color]);}});
            for(let i=0;i<7;i++){const u=.525+i*.0125,v=.375;if(Math.floor(u*8)!==sx||Math.floor(v*4)!==sy)continue;const p=move(u,v);
                rods.push({x:field.centerX+(p[0]-.5)*field.width,z:field.centerZ+(p[1]-.5)*field.length,diameter:.005,length:.3,yaw:-cell.rotation*Math.PI/2});}
        });return {canMarkers:cans,canSlots,rods,structures:structureParts(layout||initial(),field)};
    }
    function setCan(layout,key,color){
        const [index,station]=String(key).split(':').map(Number),cell=layout.cells[index];
        if(!cell||!Number.isInteger(station)||station<0||station>=6)return;
        if(!cell.canColors)cell.canColors=(layout.canColors||markers.map(m=>m[2])).slice();
        cell.canColors[station]=color;
    }
    function shuffleCans(layout,seed){
        const out=normalize(layout),slots=features(out,{width:2.4,length:1.2,centerX:0,centerZ:0}).canSlots,rng=random(seed),colors=['red','yellow','green'];
        for(let n=2;n>0;n--){const j=Math.floor(rng()*(n+1));[colors[n],colors[j]]=[colors[j],colors[n]];}
        const assignments=slots.map((_,i)=>colors[i%3]);
        for(let n=assignments.length-1;n>0;n--){const j=Math.floor(rng()*(n+1));[assignments[n],assignments[j]]=[assignments[j],assignments[n]];}
        slots.forEach((slot,i)=>setCan(out,slot.key,assignments[i]));return out;
    }
    function drawLocalTile(ctx,cell,size){
        const [,walls,mark]=localDefinitions[cell.type],w=size/15,palette={green:'#44bc54',yellow:'#ffe500',red:'#cb2533'};
        if(mark==='start'||mark==='finish'){ctx.fillStyle=mark==='start'?'#ff2020':'#55dce2';ctx.fillRect(0,0,size,size);}
        ctx.fillStyle='#171717';
        if(walls&1)ctx.fillRect(0,0,size,w);if(walls&2)ctx.fillRect(size-w,0,w,size);if(walls&4)ctx.fillRect(0,size-w,size,w);if(walls&8)ctx.fillRect(0,0,w,size);
        if(mark==='checkpoint'){ctx.fillStyle='#ffe500';ctx.beginPath();ctx.arc(size/2,size/2,size/12,0,Math.PI*2);ctx.fill();}
        if(mark==='start'||mark==='finish'){ctx.fillStyle='#111';ctx.font=`bold ${size*.13}px sans-serif`;ctx.textAlign='center';ctx.fillText(mark.toUpperCase(),size/2,size*.55);}
        if(mark==='rods'){ctx.fillStyle='#cba477';for(let i=0;i<7;i++)ctx.fillRect(size*(1/6+i/9)-size/60,0,size/30,size);}
        if(mark==='pickup-raised'||mark==='pickup-flat'){
            if(mark==='pickup-raised'){ctx.fillStyle='#e5e5e5';ctx.fillRect(0,size*2/3,size,size/3);}
            ctx.fillStyle='#111';for(const x of [.3,.7]){ctx.beginPath();ctx.arc(size*x,size*5/6,size/10,0,Math.PI*2);ctx.fill();}
        }
        if(palette[mark]){
            ctx.fillStyle=palette[mark];ctx.fillRect(0,size*2/3,size,size/3);
            if(cell.type.startsWith('lga_senior_'))for(const [i,color]of (cell.slotColors||['red','yellow','green']).entries()){
                ctx.fillStyle={green:'#299b46',yellow:'#ffff32',red:'#ff1818'}[color];ctx.beginPath();ctx.arc(size*(.2+i*.3),size*5/6,size/10,0,Math.PI*2);ctx.fill();
            }
        }
    }
    function drawTile(ctx,cell,size,atlas){
        ctx.save();ctx.fillStyle='white';ctx.fillRect(0,0,size,size);ctx.translate(size/2,size/2);ctx.rotate(cell.rotation*Math.PI/2);ctx.translate(-size/2,-size/2);
        if(localDefinitions[cell.type]){drawLocalTile(ctx,cell,size);ctx.restore();return;}
        if(cell.type.startsWith('quick_box_'))drawQuickBox(ctx,Number(cell.type.slice(10)),size);
        else if(rescueDefinitions[cell.type]){
            const [,walls,mark]=rescueDefinitions[cell.type],w=size/15;
            if(mark==='pit'){ctx.fillStyle='#202020';ctx.fillRect(size/6,0,size*2/3,size);}
            else {
                if(mark==='bridge'||mark==='tunnel'){
                    ctx.fillStyle=mark==='bridge'?'#a5a5a5':'#e5efff';ctx.fillRect(0,0,size,size);
                    ctx.fillStyle='#465365';ctx.font=`${size*.08}px sans-serif`;ctx.textAlign='center';
                    ctx.fillText(mark==='bridge'?'BRIDGE AREA':'TUNNEL AREA',size/2,size*.5);
                }
                if(mark==='drop'){ctx.fillStyle='#00bf63';ctx.fillRect(0,size/2,size,size/2);}
                if(mark==='start'||mark==='finish'){ctx.fillStyle=mark==='start'?'#ff2020':'#00e5e5';ctx.fillRect(size*.18,size*.18,size*.64,size*.64);ctx.fillStyle='#111';ctx.font=`bold ${size*.13}px sans-serif`;ctx.textAlign='center';ctx.fillText(mark.toUpperCase(),size/2,size*.54);}
                ctx.fillStyle='#171717';
                if(walls&1)ctx.fillRect(0,0,size,w);if(walls&2)ctx.fillRect(size-w,0,w,size);if(walls&4)ctx.fillRect(0,size-w,size,w);if(walls&8)ctx.fillRect(0,0,w,size);
                if(mark==='checkpoint'){ctx.fillStyle='#ffe500';ctx.beginPath();ctx.arc(size*.65,size*.5,size/12,0,Math.PI*2);ctx.fill();}
                if(mark==='rods'){ctx.fillStyle='#cba477';for(let i=0;i<7;i++)ctx.fillRect(size*(1/6+i/9)-size/120,0,size/60,size);}
            }
        }
        else if(cell.type==='original')ctx.drawImage(atlas,(cell.source%8)*atlas.width/8,Math.floor(cell.source/8)*atlas.height/4,atlas.width/8,atlas.height/4,0,0,size,size);
        else {ctx.strokeStyle='#171717';ctx.lineWidth=size/15;ctx.lineCap='butt';ctx.beginPath();
            if(cell.type==='curve'){ctx.moveTo(size/2,0);ctx.quadraticCurveTo(size/2,size/2,size,size/2);}
            else for(const d of sides[cell.type]){ctx.moveTo(size/2,size/2);ctx.lineTo([size/2,size,size/2,0][d],[0,size/2,size,size/2][d]);}
            ctx.stroke();if(cell.type==='start'||cell.type==='finish'){ctx.fillStyle=cell.type==='start'?'#0f8942':'#ed1c23';ctx.fillRect(size*.34,size*.4,size*.32,size*.13);ctx.font=`bold ${size*.08}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='#171717';ctx.fillText(cell.type.toUpperCase(),size/2,size*.33);}
        }ctx.restore();
    }
    function cleanAtlas(image,createCanvas){const c=createCanvas();c.width=image.naturalWidth||image.width;c.height=image.naturalHeight||image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);ctx.fillStyle='white';
        for(let i=0;i<7;i++){const u=.525+i*.0125;const x=Math.floor((u-.0025)*c.width);ctx.fillRect(x,Math.floor(.25*c.height),Math.ceil((u+.0025)*c.width)-x,Math.ceil(.25*c.height));}return c;}
    function occupiedBounds(layout,field){
        const cells=layout&&layout.cells;if(!Array.isArray(cells))return null;
        const occupied=cells.map((c,i)=>c.type==='blank'?-1:i).filter(i=>i>=0);if(!occupied.length)return null;
        const minCol=Math.min(...occupied.map(i=>i%COLS)),maxCol=Math.max(...occupied.map(i=>i%COLS));
        const minRow=Math.min(...occupied.map(i=>Math.floor(i/COLS))),maxRow=Math.max(...occupied.map(i=>Math.floor(i/COLS)));
        return {width:field.width*(maxCol-minCol+1)/COLS,length:field.length*(maxRow-minRow+1)/ROWS,
            centerX:(field.centerX||0)+((minCol+maxCol+1)/2/COLS-.5)*field.width,
            centerZ:(field.centerZ||0)+((minRow+maxRow+1)/2/ROWS-.5)*field.length};
    }
    function compose(image,layout,createCanvas){const atlas=cleanAtlas(image,createCanvas),canvas=createCanvas(),size=Math.round(atlas.width/8);canvas.width=8*size;canvas.height=4*size;const ctx=canvas.getContext('2d');
        layout.cells.forEach((cell,i)=>{ctx.save();ctx.translate(i%8*size,Math.floor(i/8)*size);drawTile(ctx,cell,size,atlas);ctx.restore();});return canvas;}
    function canLabels(layout){
        const counts={},labels={};
        for(const slot of features(layout,{width:2.4,length:1.2,centerX:0,centerZ:0}).canSlots){
            if(slot.color)labels[slot.key]=slot.color[0].toUpperCase()+(counts[slot.color]=(counts[slot.color]||0)+1);
        }
        return labels;
    }
    root.SimFieldLayout={localExample,localShuffle,localJuniorCatalog,localSeniorCatalog,quickBoxExample,interiorSide,category,structureParts,objectCells,placeObject,drawObjectTile,canLabels,occupiedBounds,setCan,shuffleCans,catalog,basicCatalog,rescueCatalog,rescueExample,rescueShuffle,KEY,initial,normalize,load,save,shuffle,shuffleOriginal,connectedShuffle,validateConnected,startPose,originalGroups,route,ports,transform,features,drawTile,cleanAtlas,compose,types};
    if(typeof module!=='undefined')module.exports=root.SimFieldLayout;
})(typeof window!=='undefined'?window:globalThis);
