(function(root){
    'use strict';
    const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    const number=value=>Number(Number(value).toFixed(6));
    // Standalone SVG navigation. Image previews and Illustrator ignore this script.
    const navigation=`<script><![CDATA[
    (function(){
        const svg=document.documentElement,original=svg.getAttribute('viewBox').split(/\\s+/).map(Number);
        let box=original.slice(),drag=null,printing=null;
        const update=()=>svg.setAttribute('viewBox',box.join(' '));
        const point=(x,y)=>{const p=svg.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(svg.getScreenCTM().inverse());};
        function zoom(factor,x,y){
            const p=point(x,y),width=Math.max(original[2]/40,Math.min(original[2]*2,box[2]*factor)),ratio=width/box[2];
            box=[p.x-(p.x-box[0])*ratio,p.y-(p.y-box[1])*ratio,width,box[3]*ratio];update();
        }
        svg.style.cursor='grab';
        svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-200,Math.min(200,e.deltaY))*.002),e.clientX,e.clientY);},{passive:false});
        svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,box:box.slice(),matrix:svg.getScreenCTM().inverse()};svg.setPointerCapture(e.pointerId);svg.style.cursor='grabbing';});
        svg.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y,m=drag.matrix;box=[drag.box[0]-dx*m.a-dy*m.c,drag.box[1]-dx*m.b-dy*m.d,drag.box[2],drag.box[3]];update();});
        const release=()=>{drag=null;svg.style.cursor='grab';};
        svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);
        svg.addEventListener('dblclick',()=>{box=original.slice();update();});
        window.addEventListener('keydown',e=>{if(e.key==='0'){box=original.slice();update();}else if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1.2:1/1.2,innerWidth/2,innerHeight/2);}});
        window.addEventListener('beforeprint',()=>{printing=box.slice();box=original.slice();update();});
        window.addEventListener('afterprint',()=>{if(printing){box=printing;printing=null;update();}});
    })();
    ]]></script>`;
    // Record the same drawing commands used by SIM as editable SVG shapes.
    function recorder(atlas){
        const elements=[],defs=[],stack=[];
        let state={fillStyle:'#000',strokeStyle:'#000',lineWidth:1,lineCap:'butt',lineJoin:'miter',font:'10px sans-serif',textAlign:'start',textBaseline:'alphabetic',transform:'',clips:[]},path=[];
        const xy=(x,y)=>number(x)+' '+number(y);
        function emit(shape){
            let output='<g transform="'+escape(state.transform)+'">'+shape+'</g>';
            for(const id of state.clips)output='<g clip-path="url(#'+id+')">'+output+'</g>';
            elements.push(output);
        }
        const paint=stroke=>stroke?'fill="none" stroke="'+escape(state.strokeStyle)+'" stroke-width="'+number(state.lineWidth)+'" stroke-linecap="'+escape(state.lineCap)+'" stroke-linejoin="'+escape(state.lineJoin)+'"':'fill="'+escape(state.fillStyle)+'"';
        const ctx={
            save(){stack.push({...state,clips:[...state.clips]});},restore(){state=stack.pop()||state;},
            translate(x,y){state.transform+=' translate('+xy(x,y)+')';},
            rotate(angle){state.transform+=' rotate('+number(angle*180/Math.PI)+')';},
            scale(x,y){state.transform+=' scale('+xy(x,y)+')';},
            beginPath(){path=[];},moveTo(x,y){path.push('M'+xy(x,y));},lineTo(x,y){path.push('L'+xy(x,y));},
            quadraticCurveTo(cx,cy,x,y){path.push('Q'+xy(cx,cy)+' '+xy(x,y));},
            rect(x,y,w,h){path.push('M'+xy(x,y)+'h'+number(w)+'v'+number(h)+'h'+number(-w)+'Z');},
            arc(x,y,r,start,end){
                const point=a=>xy(x+r*Math.cos(a),y+r*Math.sin(a));
                path.push((path.length?'L':'M')+point(start));
                if(Math.abs(end-start)>=Math.PI*2-1e-6){path.push('A'+xy(r,r)+' 0 1 1 '+point(start+Math.PI),'A'+xy(r,r)+' 0 1 1 '+point(start+Math.PI*2));}
                else path.push('A'+xy(r,r)+' 0 '+(Math.abs(end-start)>Math.PI?1:0)+' '+(end>=start?1:0)+' '+point(end));
            },
            fill(){emit('<path d="'+path.join(' ')+'" '+paint(false)+'/>');},
            stroke(){emit('<path d="'+path.join(' ')+'" '+paint(true)+'/>');},
            clip(){const id='clip-'+defs.length;defs.push('<clipPath id="'+id+'" clipPathUnits="userSpaceOnUse"><path transform="'+escape(state.transform)+'" d="'+path.join(' ')+'"/></clipPath>');state.clips.push(id);},
            fillRect(x,y,w,h){
                // One shared white background avoids antialias seams between panels.
                if(state.fillStyle==='white'&&x===0&&y===0&&w===300&&h===300)return;
                emit('<rect x="'+number(x)+'" y="'+number(y)+'" width="'+number(w)+'" height="'+number(h)+'" shape-rendering="crispEdges" '+paint(false)+'/>');
            },
            strokeRect(x,y,w,h){emit('<rect x="'+number(x)+'" y="'+number(y)+'" width="'+number(w)+'" height="'+number(h)+'" '+paint(true)+'/>');},
            fillText(text,x,y){
                const match=state.font.match(/([\d.]+)px\s+(.+)$/),size=match?match[1]:10,family=match?match[2]:'sans-serif';
                emit('<text x="'+number(x)+'" y="'+number(y)+'" font-size="'+size+'" font-family="'+escape(family)+'" font-weight="'+(/\bbold\b/.test(state.font)?'bold':'normal')+'" text-anchor="'+({center:'middle',right:'end',end:'end'}[state.textAlign]||'start')+'"'+(state.textBaseline==='middle'?' dominant-baseline="central"':'')+' '+paint(false)+'>'+escape(text)+'</text>');
            },
            drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh){
                if(!atlas)throw Error('Wait for the original field artwork to finish loading.');
                if(!defs.some(d=>d.startsWith('<image id="field-atlas"')))defs.push('<image id="field-atlas" width="'+atlas.width+'" height="'+atlas.height+'" href="'+escape(atlas.toDataURL('image/png'))+'"/>');
                emit('<svg x="'+dx+'" y="'+dy+'" width="'+dw+'" height="'+dh+'" viewBox="'+[sx,sy,sw,sh].join(' ')+'" preserveAspectRatio="none" overflow="hidden"><use href="#field-atlas"/></svg>');
            }
        };
        for(const key of ['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','font','textAlign','textBaseline'])Object.defineProperty(ctx,key,{get:()=>state[key],set:value=>{state[key]=value;}});
        return {ctx,elements,defs};
    }
    function fieldBorder(width,height){
        const mark=root.SimFieldWordmark;if(!mark)throw Error('Field border artwork is not loaded. Reopen the IDE.');
        const b=mark.bounds,scale=22/(b[3]-b[1]),textWidth=(b[2]-b[0])*scale,labels=[];
        function label(x,y,angle){labels.push('<g transform="translate('+number(x)+' '+number(y)+') rotate('+angle+') translate('+number(-textWidth/2)+' -11) scale('+number(scale)+') translate('+number(-b[0])+' '+number(-b[1])+')"><path d="'+escape(mark.path)+'" fill="#fff"/></g>');}
        const horizontal=Math.max(1,Math.round(width/600)),vertical=Math.max(1,Math.round(height/600));
        for(let i=0;i<horizontal;i++){const x=(i+.5)*width/horizontal;label(x,-30,0);label(x,height+30,180);}
        for(let i=0;i<vertical;i++){const y=(i+.5)*height/vertical;label(-30,y,-90);label(width+30,y,90);}
        return '<g id="field-border"><title>5 mm white gap / 50 mm black frame / 30 mm outer white margin</title><rect id="outer-trim-line" x="-84.75" y="-84.75" width="'+(width+169.5)+'" height="'+(height+169.5)+'" fill="none" stroke="#171717" stroke-width="0.5"/><path id="outer-border" d="M-55 -55H'+(width+55)+'V'+(height+55)+'H-55Z M-5 -5H'+(width+5)+'V'+(height+5)+'H-5Z" fill="#171717" fill-rule="evenodd"/><g id="pt-robotics-border"><title>PT ROBOTICS / Pervitina Dex</title>'+labels.join('')+'</g></g>';
    }
    function exportSVG(value,{atlas=null,title='Robot field',border=true}={}){
        const L=root.SimFieldLayout,layout=L.normalize(value);if(!layout)throw Error('Invalid field layout');
        const occupied=layout.cells.map((c,i)=>c.type==='blank'?-1:i).filter(i=>i>=0);if(!occupied.length)throw Error('Add field panels before exporting.');
        const minCol=Math.min(...occupied.map(i=>i%8)),maxCol=Math.max(...occupied.map(i=>i%8));
        const minRow=Math.min(...occupied.map(i=>Math.floor(i/8))),maxRow=Math.max(...occupied.map(i=>Math.floor(i/8)));
        const width=(maxCol-minCol+1)*300,height=(maxRow-minRow+1)*300,{ctx,elements,defs}=recorder(atlas);
        const tiles=[];
        layout.cells.forEach((cell,i)=>{
            if(cell.type==='blank')return;
            const start=elements.length;ctx.save();ctx.translate((i%8-minCol)*300,(Math.floor(i/8)-minRow)*300);
            // The kit's white panel has no raster artwork to embed.
            L.drawTile(ctx,cell.type==='original'&&cell.source===23?{...cell,type:'rescue_open'}:cell,300,atlas);ctx.restore();
            tiles.push('<g id="panel-'+(i+1)+'"><title>Panel '+(i+1)+' / '+escape(cell.type)+'</title>'+elements.slice(start).join('')+'</g>');
        });
        const structures=(layout.objects||[]).map((object,i)=>{
            const cells=L.objectCells(object);return '<g id="structure-'+(i+1)+'"><title>'+escape(object.type)+'</title>'+cells.filter(c=>c>=0).map(c=>'<rect x="'+((c%8-minCol)*300)+'" y="'+((Math.floor(c/8)-minRow)*300)+'" width="300" height="300" fill="none" stroke="#738393" stroke-width="1" stroke-dasharray="6 6"/>').join('')+'</g>';
        }).join('');
        const hasRaster=layout.cells.some(c=>c.type==='original'&&c.source!==23);
        const margin=border?85:0,pageWidth=width+margin*2,pageHeight=height+margin*2;
        const svg='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="'+pageWidth+'mm" height="'+pageHeight+'mm" viewBox="'+(-margin)+' '+(-margin)+' '+pageWidth+' '+pageHeight+'"><style>@media screen { :root { width: 100vw; height: 100vh; display: block; } }</style><title>'+escape(title)+'</title><desc>Scale 1:1. Panels 300 x 300 mm. '+(hasRaster?'Original kit artwork is embedded at its source resolution.':'Field markings are editable vector shapes.')+' Structure footprints are in a hidden reference layer.</desc><defs>'+defs.join('')+'</defs><rect id="field-background" x="'+(-margin)+'" y="'+(-margin)+'" width="'+pageWidth+'" height="'+pageHeight+'" fill="white"/>'+(border?fieldBorder(width,height):'')+'<g id="field-artwork">'+tiles.join('')+'</g><g id="structure-footprints" display="none">'+structures+'</g></svg>\n';
        return {svg:svg.replace('</svg>\n',navigation+'</svg>\n'),width:pageWidth,height:pageHeight,fieldWidth:width,fieldHeight:height,hasRaster};
    }
    root.SimFieldVector={exportSVG};
    if(typeof module!=='undefined')module.exports=root.SimFieldVector;
})(typeof window!=='undefined'?window:globalThis);
