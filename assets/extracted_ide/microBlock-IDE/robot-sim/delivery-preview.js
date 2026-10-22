(function(root){
    'use strict';

    root.SimDeliveryPreview={mount({doc,host,board,readLayout,readAtlas}){
        const section=doc.createElement('details');section.className='studio-storage delivery-planner';section.open=true;
        section.innerHTML='<summary>Delivery planner <span class="delivery-beta">Preview</span></summary><div class="storage-content"><p>Collect cans and deliver each one to its matching color. Start and finish at START.</p><button type="button" class="primary" data-plan>Plan delivery</button><p data-plan-status role="status"></p><label data-leg-label hidden>Can mission<select data-leg aria-label="Delivery mission"></select></label><label data-route-filter-label hidden>Show route<select data-route-filter aria-label="Show route"><option value="both">Pick up + Deliver</option><option value="pickup">Pick up only</option><option value="delivery">Deliver only</option></select></label><p data-route-legend hidden><span style="color:#087fe8">Blue: Pick up</span> / <span style="color:#dd6500">Orange: Deliver</span></p><ol data-deliveries></ol><p class="delivery-estimate" data-estimate></p></div>';
        host.prepend(section);
        const generate=doc.createElement('button');generate.type='button';generate.className='primary';generate.textContent='Generate blocks';generate.hidden=true;section.querySelector('.storage-content').appendChild(generate);
        const overlay=doc.createElementNS('http://www.w3.org/2000/svg','svg');overlay.classList.add('delivery-route-overlay');overlay.setAttribute('viewBox','0 0 800 400');overlay.setAttribute('aria-hidden','true');board.appendChild(overlay);
        const q=s=>section.querySelector(s),status=q('[data-plan-status]'),button=q('[data-plan]'),select=q('[data-leg]');
        let worker=null,result=null,fingerprint='',generation=0;
        const signature=layout=>JSON.stringify({cells:layout.cells.map(({locked,...cell})=>cell),canColors:layout.canColors});
        function clear(){result=null;highlight();overlay.replaceChildren();q('[data-deliveries]').replaceChildren();q('[data-estimate]').textContent='';q('[data-leg-label]').hidden=true;q('[data-route-filter-label]').hidden=true;q('[data-route-legend]').hidden=true;generate.hidden=true;}
        function cancel(){generation++;worker?.terminate();worker=null;button.disabled=false;button.textContent='Plan delivery';}
        const traceCache=new Map();
        function traceSegment(leg){
            const points=[];
            for(const edge of leg.segments){
                const a=result.points[edge.from],b=result.points[edge.to];
                if(!a||!b)continue;
                const cell=Number(edge.from.split(':')[0]);
                if(['track','obstacle'].includes(edge.kind)&&Number.isInteger(cell)){
                    const tile=result.layout.cells[cell],key=JSON.stringify([cell,tile.type,tile.source,tile.rotation,edge.from.split(':')[1],edge.to.split(':')[1]]);
                    let local=traceCache.get(key);
                    if(!local){
                        const origin=[cell%8,Math.floor(cell/8)];
                        local=root.SimDeliveryTrace.trace(doc,tile,readAtlas?.(),[a[0]*8-origin[0],a[1]*4-origin[1]],[b[0]*8-origin[0],b[1]*4-origin[1]],cell);
                        traceCache.set(key,local);
                    }
                    points.push(...local.map(([x,y])=>[(cell%8+x)*100,(Math.floor(cell/8)+y)*100]));
                }else points.push([a[0]*800,a[1]*400],[b[0]*800,b[1]*400]);
            }
            return points;
        }
        function sampled(points){
            const out=[];for(const p of points)if(!out.length||Math.hypot(p[0]-out.at(-1)[0],p[1]-out.at(-1)[1])>=3)out.push(p);
            if(points.length&&out.at(-1)!==points.at(-1))out.push(points.at(-1));return out;
        }
        function tangent(points,i){const a=points[Math.max(0,i-2)],b=points[Math.min(points.length-1,i+2)],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;return [dx/n,dy/n];}
        function lane(points,other){return points.map((p,i)=>{
            const t=tangent(points,i);let offset=4;
            // When both legs travel the same line in the same direction,
            // put delivery on the opposite side as well.
            if(other?.length){let best=-1,distance=64;other.forEach((q,j)=>{const d=(p[0]-q[0])**2+(p[1]-q[1])**2;if(d<distance){distance=d;best=j;}});
                if(best>=0){const u=tangent(other,best);if(t[0]*u[0]+t[1]*u[1]>0.5)offset=-4;}}
            return [p[0]-t[1]*offset,p[1]+t[0]*offset];
        });}
        function svg(tag,attrs){const node=doc.createElementNS(overlay.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;}
        function highlight(){
            const target=result&&select.value!=='all'?result.deliveries[Number(select.value)/2]?.can.key:null;
            board.querySelectorAll('.can-station').forEach(node=>{
                node.classList.toggle('mission-target',!!target&&node.dataset.station===target);
                node.classList.toggle('mission-muted',!!target&&node.dataset.station!==target);
            });
        }
        function draw(){
            highlight();
            overlay.replaceChildren();if(!result)return;
            if(select.value==='all'){
                for(let i=0;i<result.legs.length;i+=2)drawMission(i);
                q('[data-route-filter]').disabled=false;q('[data-route-legend]').hidden=false;
            }else drawMission(Number(select.value));
        }
        function drawMission(index){
            const leg=result.legs[index];if(!leg)return;
            const home=leg.to==='start',filter=q('[data-route-filter]').value;
            q('[data-route-filter]').disabled=home;
            q('[data-route-legend]').hidden=home;
            let pickup,delivery;try{pickup=sampled(traceSegment(leg));if(!home)delivery=sampled(traceSegment(result.legs[index+1]));}catch(error){status.textContent=error.message;return;}
            const routes=[];
            if(home||filter!=='delivery')routes.push({points:lane(pickup),color:'#087fe8',kind:home?'home':'pickup',label:home?'H':'P'});
            if(!home&&filter!=='pickup')routes.push({points:lane(delivery,pickup),color:'#ee790d',kind:'delivery',label:'D'});
            for(const {points,color,kind,label}of routes){
                const group=svg('g',{'data-route-kind':kind});overlay.appendChild(group);
                const attrs={points:points.map(p=>p.join(',')).join(' '),fill:'none','stroke-linejoin':'round','stroke-linecap':'round'};
                group.appendChild(svg('polyline',{...attrs,stroke:'white','stroke-width':5}));
                group.appendChild(svg('polyline',{...attrs,stroke:color,'stroke-width':2.6}));
                let distance=0;
                for(let i=1;i<points.length;i++){
                    distance+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
                    if(distance<42)continue;distance=0;const [x,y]=points[i],t=tangent(points,i),angle=Math.atan2(t[1],t[0])*180/Math.PI;
                    group.appendChild(svg('path',{d:'M -4 -3 L 1 0 L -4 3',transform:'translate('+x+' '+y+') rotate('+angle+')',fill:'none',stroke:'white','stroke-width':4,'stroke-linejoin':'round'}));
                    group.appendChild(svg('path',{d:'M -4 -3 L 1 0 L -4 3',transform:'translate('+x+' '+y+') rotate('+angle+')',fill:'none',stroke:color,'stroke-width':2,'stroke-linejoin':'round'}));
                }
                const p=points.at(-1);if(p){group.appendChild(svg('circle',{cx:p[0],cy:p[1],r:7,fill:color,stroke:'white','stroke-width':2}));const text=svg('text',{x:p[0],y:p[1]+3,'text-anchor':'middle',fill:'white','font-size':9});text.textContent=label;group.appendChild(text);}
            }
        }
        q('[data-route-filter]').onchange=draw;
        const selectedMission=()=>select.value==='all'?'all':Number(select.value)===result.deliveries.length*2?'end mission':'can '+(Number(select.value)/2+1);
        const generateLabel=()=>selectedMission()==='all'?'Generate all missions':'Generate '+selectedMission();
        select.onchange=()=>{generate.textContent=generateLabel();draw();};
        button.onclick=()=>{
            if(!root.IDEAccount?.user){root.IDEAccount?.show();status.textContent='Sign in with an authorized account to plan a delivery.';return;}
            cancel();clear();const layout=root.SimFieldLayout.normalize(readLayout()),token=generation;fingerprint=signature(layout);
            button.disabled=true;button.textContent='Planning…';status.textContent='Checking routes and delivery order…';
            worker={terminate(){this.cancelled=true;},postMessage(data){root.IDEAccount.request('/api/delivery/plan',data).then(value=>{if(!this.cancelled)this.onmessage({data:value});}).catch(error=>{if(!this.cancelled)this.onmessage({data:{error:error.message}});});}};const current=worker;
            const timeout=setTimeout(()=>{if(worker===current){cancel();status.textContent='Planning took too long. Try fewer cans.';}},30000);
            const finish=()=>{clearTimeout(timeout);current.terminate();if(worker===current)worker=null;button.disabled=false;button.textContent='Plan delivery';};
            current.onerror=()=>{if(token!==generation)return;finish();status.textContent='Could not start the route planner.';};
            current.onmessage=async event=>{
                if(token!==generation)return;finish();if(event.data.error){status.textContent=event.data.error;return;}
                result=event.data.plan;status.textContent='Route ready. This is a plan preview, not a tested driving program.';
                select.replaceChildren();const list=q('[data-deliveries]'),canLabels=root.SimFieldLayout.canLabels(result.layout);
                result.deliveries.forEach((d,i)=>{
                    const item=doc.createElement('li');item.textContent='Can '+(i+1)+' - '+canLabels[d.can.key]+' to '+d.can.color+' zone (panel '+(d.zone.cell+1)+')';list.appendChild(item);
                    const option=doc.createElement('option');option.value=i*2;option.textContent='Can '+(i+1)+' - Pick up '+canLabels[d.can.key]+' / '+d.can.color+' zone';select.appendChild(option);
                });
                if(result.returnToStart){const option=doc.createElement('option');option.value=result.legs.length-1;option.textContent='Return to START';select.appendChild(option);}
                const all=doc.createElement('option');all.value='all';all.textContent='All missions - Entire field';select.appendChild(all);
                q('[data-leg-label]').hidden=false;q('[data-route-filter-label]').hidden=false;q('[data-route-legend]').hidden=false;
                generate.textContent=generateLabel();generate.hidden=false;
                q('[data-estimate]').textContent='Estimated '+Math.round(result.estimatedSeconds)+' s · '+result.metres.toFixed(1)+' m. Best order for the estimated travel costs; actual driving time may differ. Colored lines are offset slightly from the tracks for clarity. Arrows show travel direction.';
                draw();
                try{await root.motorSimulation.alignToPlan(result);}
                catch(error){if(token===generation)status.textContent='Route ready. Could not align the robot: '+error.message;}
            };
            current.postMessage({layout});
        };
        generate.onclick=async()=>{
            if(!result)return;const plan=result;generate.disabled=true;
            try{
                status.textContent='Generating editable Custom blocks…';
                if(typeof blocklyWorkspace==='undefined'||typeof file_name_select==='undefined'||!file_name_select.endsWith('.xml'))throw Error('Open the OPT program in Block mode first.');
                const selection=selectedMission();
                const generated=await root.IDEAccount.request('/api/delivery/generate',{layout:plan.layout,selection});
                if(result!==plan||doc.defaultView.closed)return;
                const applied=root.SimFieldLayout.load();
                if(!applied||signature(applied)!==signature(generated.plan.layout)){
                    await root.motorSimulation.setFieldLayout(generated.plan.layout);
                    if(result!==plan||doc.defaultView.closed)return;
                    await root.motorSimulation.alignToPlan(generated.plan);
                    if(result!==plan||doc.defaultView.closed)return;
                }
                root.SimDeliveryBlocks.applyToWorkspace(blocklyWorkspace,root.Blockly,generated.plan,selection,generated.steps);
                if(typeof saveCodeToLocal==='function')saveCodeToLocal();
                status.textContent='Updated '+(selection==='all'?'all can missions and end mission':selection)+' in your workspace. Other functions are preserved. Each can continues from the previous delivery position. Use Undo to revert.';
            }catch(error){status.textContent=error.message;}finally{generate.disabled=false;}
        };
        doc.defaultView.addEventListener('beforeunload',cancel);
        return {highlight,update(){const next=signature(readLayout());if(fingerprint&&next!==fingerprint){cancel();clear();fingerprint=next;status.textContent='Field changed. Plan again to update the route.';}},dispose(){cancel();section.remove();overlay.remove();}};
    }};
})(window);
