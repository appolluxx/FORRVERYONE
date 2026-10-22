(function(){
    'use strict';
    const L=window.SimFieldLayout,toolbar=document.querySelector('.motor-sim-toolbar');if(!L||!toolbar)return;
    const workerURL=new URL('field-layout-worker.js',document.currentScript.src).href;
    const button=document.createElement('button');button.type='button';button.id='motor-sim-edit-field';button.setAttribute('aria-label','Field editor');button.setAttribute('aria-describedby','sim-tip-edit-field');
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg><span id="sim-tip-edit-field" class="sim-tool-tip" role="tooltip">Field editor</span>';toolbar.insertBefore(button,toolbar.querySelector('#motor-sim-popout'));
    const update=()=>button.hidden=false;update();
    ['robot-project-reset','robot-assembly-change','sim-viewport-moved'].forEach(e=>window.addEventListener(e,update));
    const labels={blank:'Blank',straight:'Straight',curve:'Curve',tee:'T junction',cross:'Crossroads',start:'START',finish:'FINISH'};
    for(const tile of [...L.rescueCatalog,...L.localJuniorCatalog,...L.localSeniorCatalog])labels[tile.type]=tile.name;
    let editorWindow=null;
    window.addEventListener('robot-project-reset',()=>{if(editorWindow&&!editorWindow.closed)editorWindow.close();});
    button.onclick=async()=>{
        if(editorWindow&&!editorWindow.closed){editorWindow.focus();return;}
        window.motorSimulation.stop();
        const child=window.IDEToolWindows.open({id:'field',title:'Field Editor',width:1280,height:920});
        if(!child)return;
        editorWindow=child;child.addEventListener('beforeunload',()=>{if(editorWindow===child)editorWindow=null;});
        const doc=child.document;doc.title='Field studio — roboBlocks';doc.body.style.cssText='margin:0;background:#eef4fa;overflow:hidden';
        const base=doc.createElement('base');base.href=document.baseURI;doc.head.appendChild(base);
        window.IDEStyledSelect?.install(doc.defaultView);
        const style=doc.createElement('link');style.rel='stylesheet';style.href=new URL('field-editor.css',workerURL).href;doc.head.appendChild(style);
        const dialog=doc.createElement('main');dialog.className='field-editor';dialog.setAttribute('aria-labelledby','field-editor-title');
        dialog.innerHTML=`<header class="studio-header">
          <div class="studio-brand"><span class="studio-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 3h18v18H3zM3 11h18M11 3v18M16 11v10"/></svg></span><div><h1 id="field-editor-title">Field studio</h1><p class="studio-subtitle">ROBOT LAB / FIELD DESIGN</p></div></div>
          <div class="studio-header-actions"><label class="shuffle-category"><span>Category</span><select data-shuffle-category data-single-line aria-label="Category to shuffle"><option value="delivery-robot-primary">DELIVERY ROBOT PRIMARY</option><option value="basic-tracks">BASIC TRACKS</option><option value="rescue-robot">RESCUE ROBOT</option><option value="quick-box-drop">QUICK BOX DROP</option><option value="lga-junior">DELIVERY ROBOT JUNIOR</option><option value="lga-senior">DELIVERY ROBOT SENIOR</option></select></label><button data-action="shuffle" title="Shuffle panels from the selected category">Shuffle layout</button><button data-action="apply" class="primary">Apply field</button></div>
        </header>
        <div class="studio-body"><section class="studio-workspace" aria-label="Field workspace">
          <nav class="studio-toolbar" aria-label="Panel tools"><button data-action="rotate" title="Rotate selected panel clockwise (R)">Rotate 90° <kbd>R</kbd></button><button data-action="lock" title="Lock or unlock selected panel (L)">Lock panel</button><span class="tool-divider"></span><button data-action="original" class="quiet" title="Restore all original panel positions">Restore original</button><span data-slot></span></nav>
          <div class="studio-canvas"><div class="field-board"><span class="board-dimension horizontal">240 CM</span><span class="board-dimension vertical">120 CM</span><div class="field-editor-grid" role="grid" aria-label="Field, 8 columns and 4 rows"></div><div class="can-stations" aria-label="Can stations"></div></div></div>
          <div class="studio-canvas-info"><span>8 × 4 panels · 30 × 30 cm · 5 mm thick</span><span class="shortcut-hints">Drag to swap · <kbd>R</kbd> Rotate · <kbd>L</kbd> Lock</span></div>
        </section><aside class="studio-sidebar" aria-label="Panel library and saved layouts">
          <div class="sidebar-heading"><span class="count-badge">${L.catalog.length+L.basicCatalog.length+L.rescueCatalog.length+L.localJuniorCatalog.length+L.localSeniorCatalog.length}</span><h2>Panel library</h2><p>Scroll to browse. Touch and hold a panel to drag.<br>Rotate panels to connect their routes.</p></div>
          <div class="panel-categories"><details class="panel-category" open data-category="delivery-robot-primary"><summary><span>DELIVERY ROBOT PRIMARY</span><span class="category-count">${L.catalog.length}</span></summary><div class="field-editor-palette" role="group" aria-label="DELIVERY ROBOT PRIMARY"></div></details><details class="panel-category" open data-category="basic-tracks"><summary><span>BASIC TRACKS</span><span class="category-count">${L.basicCatalog.length}</span></summary><div class="field-editor-palette" role="group" aria-label="BASIC TRACKS"></div></details><details class="panel-category" open data-category="rescue-robot"><summary><span>RESCUE ROBOT</span><span class="category-count">${L.rescueCatalog.length}</span></summary><div class="field-editor-palette" role="group" aria-label="RESCUE ROBOT"></div></details><details class="panel-category" data-category="lga-junior"><summary><span>DELIVERY ROBOT JUNIOR</span><span class="category-count">${L.localJuniorCatalog.length}</span></summary><div class="field-editor-palette" role="group" aria-label="DELIVERY ROBOT JUNIOR"></div></details><details class="panel-category" data-category="lga-senior"><summary><span>DELIVERY ROBOT SENIOR</span><span class="category-count">${L.localSeniorCatalog.length}</span></summary><div class="field-editor-palette" role="group" aria-label="DELIVERY ROBOT SENIOR"></div></details></div>
          <details class="studio-storage can-controls"><summary>Objects</summary><div class="storage-content can-settings"><h3 class="object-category-title">Cans <span data-can-count></span></h3><p class="can-help">Drag any color onto a station. Shuffle balances colors across stations.</p><div class="can-library" aria-label="Can library"></div><div class="storage-row"><select data-can-station aria-label="Can station"></select><select data-can-color aria-label="Can color"><option value="red">Red</option><option value="yellow">Yellow</option><option value="green">Green</option><option value="">Empty</option></select></div><div class="file-actions"><button data-action="shuffle-cans">Shuffle cans</button><button data-action="clear-cans">Clear</button></div></div></details>
          <details class="studio-storage"><summary>Saved layouts</summary><div class="storage-content">
            <label for="preset-name">Save current layout</label><div class="storage-row"><input id="preset-name" data-name maxlength="60" placeholder="Layout name"><button data-action="save-preset">Save</button></div>
            <label for="preset-list">Your presets</label><div class="storage-row"><select id="preset-list" data-presets aria-label="Saved presets"></select><button data-action="load-preset">Load</button></div>
            <div class="file-actions field-file-actions"><button data-action="export-svg" title="Full-size artwork with PT ROBOTICS border for Adobe Illustrator">Export SVG</button><button data-action="export">Export JSON</button><label class="file-button">Import JSON<input data-import type="file" accept=".json,application/json" aria-label="Import field JSON"></label></div>
          </div></details>
        </aside></div>
        <footer class="studio-footer"><p data-validation aria-live="polite"></p><p class="field-editor-status" role="status"></p><label class="layout-code">Layout ID<input data-seed value="1" readonly title="Generated automatically with every shuffle"></label></footer>`;
        doc.body.appendChild(dialog);child.focus();
        const editable=target=>target?.closest?.('input,textarea,[contenteditable=true]');
        ['contextmenu','selectstart'].forEach(type=>doc.addEventListener(type,e=>{if(!editable(e.target))e.preventDefault();},true));
        // WebKit can create a selection after a double tap/hold without selectstart.
        const selectionElement=node=>node?.nodeType===1?node:node?.parentElement;
        const clearFieldSelection=()=>{
            const selection=doc.getSelection();if(!selection||selection.isCollapsed)return;
            if(editable(selectionElement(selection.anchorNode))&&editable(selectionElement(selection.focusNode)))return;
            selection.removeAllRanges();
        };
        doc.addEventListener('selectionchange',clearFieldSelection);
        doc.addEventListener('pointerdown',e=>{if(!editable(e.target))clearFieldSelection();},true);
        doc.addEventListener('pointerup',clearFieldSelection,true);
        doc.addEventListener('touchend',clearFieldSelection,{passive:true});
        const canvasArea=dialog.querySelector('.studio-canvas'),fieldBoard=dialog.querySelector('.field-board');
        const fitBoard=new child.ResizeObserver(()=>{
            const css=child.getComputedStyle(canvasArea),availableWidth=canvasArea.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),availableHeight=canvasArea.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
            fieldBoard.style.width=Math.max(0,Math.min(1100,availableWidth,availableHeight*2))+'px';
        });fitBoard.observe(canvasArea);child.addEventListener('beforeunload',()=>fitBoard.disconnect());
        let draft=L.normalize(L.load()||L.initial()),selected=0,brush=null,atlas=null,busy=false,solver=null,cancelSolve=null,selectedStation=0;
        child.addEventListener('beforeunload',()=>{if(cancelSolve)cancelSolve();});
        const query=s=>dialog.querySelector(s),status=text=>query('.field-editor-status').textContent=text;
        const seed=query('[data-seed]');seed.value=draft.seed;
        const deliveryPreview=window.SimDeliveryPreview?.mount({doc,host:query('.studio-sidebar'),board:fieldBoard,readLayout:()=>draft,readAtlas:()=>atlas});
        const tiles=[],palette=[],grid=query('.field-editor-grid');
        const stationSelect=query('[data-can-station]'),colorSelect=query('[data-can-color]'),stationLayer=query('.can-stations');
        const readSlots=()=>L.features(draft,{width:2.4,length:1.2,centerX:0,centerZ:0}).canSlots;
        stationSelect.onchange=()=>{selectedStation=stationSelect.value;redraw();};
        function placeCan(color,station){
            if(busy)return;
            selectedStation=station;
            L.setCan(draft,selectedStation,color);redraw();
        }
        colorSelect.onchange=()=>placeCan(colorSelect.value||null,selectedStation);
        const canType='application/x-field-can';
        for(const [color,fill] of [['red','#ed353d'],['yellow','#ffdb28'],['green','#12a869']]){
            const card=doc.createElement('button');card.type='button';card.className='can-library-item';card.draggable=true;card.dataset.can=color;card.setAttribute('aria-label','Place '+color+' can');card.title='Drag to a station or click to place at the selected station';
            card.innerHTML='<svg viewBox="0 0 48 64" aria-hidden="true"><ellipse cx="24" cy="57" rx="17" ry="4" fill="#20354b18"/><path d="M8 12v38c0 9 32 9 32 0V12" fill="'+fill+'"/><path d="M12 15v33" stroke="white" stroke-opacity=".3" stroke-width="3"/><ellipse cx="24" cy="12" rx="16" ry="6" fill="'+fill+'" stroke="#ffffffaa" stroke-width="2"/><ellipse cx="24" cy="12" rx="10" ry="3" fill="#ffffff35"/><path d="M8 50c0 8 32 8 32 0" fill="none" stroke="#00000020" stroke-width="2"/></svg><span>'+color[0].toUpperCase()+color.slice(1)+'</span>';
            card.onclick=()=>placeCan(color,selectedStation);
            card.ondragstart=e=>{if(busy){e.preventDefault();return;}e.dataTransfer.setData(canType,JSON.stringify({color}));e.dataTransfer.effectAllowed='copy';dialog.classList.add('dragging-can');};
            query('.can-library').appendChild(card);enablePointerDrag(card,card.querySelector('svg'),()=>({color}));
        }
        const reducedMotion=child.matchMedia('(prefers-reduced-motion: reduce)').matches;
        function animateTiles(indices=tiles.map((_,i)=>i)){
            if(reducedMotion)return;
            indices.forEach((i,n)=>tiles[i].node.animate([{transform:'scale(.9)',opacity:.5},{transform:'scale(1)',opacity:1}],{duration:230,delay:Math.min(n*9,140),easing:'ease-out'}));
        }
        function clearDrag(){dialog.classList.remove('dragging-can','dragging-panel','remove-panel-preview');tiles.forEach(t=>t.node.classList.remove('drag-source','drop-target'));stationLayer.querySelectorAll('.can-drop-target').forEach(n=>n.classList.remove('can-drop-target'));}
        // One pointer gesture handles mouse, pen and touch, including cancellation.
        function enablePointerDrag(node,preview,payload){
            node.draggable=false;
            let pointer=null,ghost=null,moved=false,suppressClick=false,holdTimer=null;
            const library=!!node.closest('.studio-sidebar');
            const cleanup=()=>{clearTimeout(holdTimer);holdTimer=null;node.classList.remove('drag-ready');const id=pointer?.id;pointer=null;if(ghost)ghost.remove();ghost=null;
                if(id!==undefined&&node.hasPointerCapture(id))node.releasePointerCapture(id);clearDrag();};
            node.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
            node.addEventListener('pointerdown',e=>{
                if(e.button!==0||busy||pointer||e.isPrimary===false)return;
                const data=payload();if(!data)return;
                suppressClick=false;moved=false;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,data,ready:!(library&&e.pointerType==='touch')};
                if(!pointer.ready)holdTimer=child.setTimeout(()=>{if(pointer){pointer.ready=true;node.classList.add('drag-ready');}},500);
                node.setPointerCapture(e.pointerId);
            });
            node.addEventListener('pointermove',e=>{
                if(!pointer||e.pointerId!==pointer.id)return;
                const distance=Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y);
                if(!pointer.ready){if(distance>8){suppressClick=true;cleanup();}return;}
                if(!moved&&distance<6)return;
                e.preventDefault();moved=true;const data=pointer.data;
                dialog.classList.add(data.color?'dragging-can':'dragging-panel');
                if(!ghost){if(preview.tagName==='CANVAS'){ghost=doc.createElement('canvas');ghost.width=ghost.height=128;ghost.getContext('2d').drawImage(preview,0,0,128,128);}else ghost=preview.cloneNode(true);
                    ghost.classList.add('field-drag-preview');doc.body.appendChild(ghost);}
                ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
                const target=doc.elementFromPoint(e.clientX,e.clientY),slot=target?.closest('.field-tile'),station=target?.closest('.can-station');
                tiles.forEach(t=>t.node.classList.toggle('drop-target',!data.color&&t.node===slot&&!draft.cells[Number(t.node.dataset.index)].locked));
                stationLayer.querySelectorAll('.can-station').forEach(n=>n.classList.toggle('can-drop-target',!!data.color&&n===station));
                dialog.classList.toggle('remove-panel-preview',data.from!==undefined&&!!target&&!target.closest('.field-board'));
                if(data.from!==undefined)tiles[data.from].node.classList.add('drag-source');
            });
            node.addEventListener('pointerup',e=>{
                if(!pointer||e.pointerId!==pointer.id)return;
                const data=pointer.data,target=doc.elementFromPoint(e.clientX,e.clientY),slot=target?.closest('.field-tile'),station=target?.closest('.can-station');
                const dropped=moved;cleanup();
                if(!dropped)return;suppressClick=true;
                if(busy)return;
                if(data.color){if(station)placeCan(data.color,station.dataset.station);return;}
                if(data.objectIndex!==undefined){
                    if(slot){const i=Number(slot.dataset.index);try{L.placeObject(draft,{...draft.objects[data.objectIndex],cell:i},data.objectIndex);}catch(error){status(error.message);}}
                    else if(target&&!target.closest('.field-board'))draft.objects.splice(data.objectIndex,1);
                    redraw();return;
                }
                if(slot){const i=Number(slot.dataset.index);if(draft.cells[i].locked)return;
                    if(data.from!==undefined){if(draft.cells[data.from].locked)return;[draft.cells[data.from],draft.cells[i]]=[draft.cells[i],draft.cells[data.from]];}
                    else place(data.tile,i);
                    selected=i;brush=null;redraw();animateTiles([i]);
                }else if(data.from!==undefined&&target&&!target.closest('.field-board')&&!draft.cells[data.from].locked){
                    draft.cells[data.from]={type:'blank',rotation:0,locked:false};redraw();
                }
            });
            // Prevent native panning only after the hold has armed a library drag.
            node.addEventListener('touchmove',e=>{if(pointer?.ready&&library&&e.cancelable)e.preventDefault();},{passive:false});
            node.addEventListener('pointercancel',()=>{suppressClick=moved;cleanup();});
            node.addEventListener('lostpointercapture',()=>{if(pointer){suppressClick=moved;cleanup();}});
            node.addEventListener('dragstart',e=>e.preventDefault());
            child.addEventListener('blur',cleanup);child.addEventListener('beforeunload',cleanup);
        }
        function enableLibraryDrag(node,canvas,tile){enablePointerDrag(node,canvas,()=>({tile}));}
        doc.addEventListener('dragstart',e=>{if(e.dataTransfer&&!Array.from(e.dataTransfer.types).includes(canType))dialog.classList.add('dragging-panel');});
        doc.addEventListener('dragend',clearDrag);doc.addEventListener('drop',clearDrag);
        function paint(canvas,tile){const ctx=canvas.getContext('2d'),size=canvas.width;ctx.clearRect(0,0,size,size);if(tile.objectType){L.drawObjectTile(ctx,{type:tile.objectType,rotation:tile.rotation},size);return;}
            if(tile.type==='blank'){ctx.fillStyle='#e2e7ed';ctx.fillRect(0,0,size,size);return;}
            if(atlas||tile.type!=='original')L.drawTile(ctx,tile,size,atlas);
            if(atlas&&tile.type==='original'&&tile.source===12){ctx.save();ctx.translate(size/2,size/2);ctx.rotate(tile.rotation*Math.PI/2);ctx.translate(-size/2,-size/2);ctx.strokeStyle='#cba477';ctx.lineWidth=size*.005/.3;for(let i=0;i<7;i++){const x=(.2+i*.1)*size;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size);ctx.stroke();}ctx.restore();}
        }
        let detectedCategory=null,shownCategory=null;
        function showSelectedCategory(force=false){
            const category=query('[data-shuffle-category]').value;
            if(!force&&category===shownCategory)return;
            shownCategory=category;
            dialog.querySelectorAll('.panel-category').forEach(section=>section.open=section.dataset.category===category);
            query('.panel-categories').scrollTop=0;
        }
        function syncCategory(force=false){
            const next=L.category(draft);
            if(next&&(force||next!==detectedCategory))query('[data-shuffle-category]').value=next;
            detectedCategory=next;
            showSelectedCategory(force);
        }
        function redraw(){syncCategory();const quick=query('[data-shuffle-category]').value==='quick-box-drop';query('[data-action=shuffle]').textContent=quick?'Load field':'Shuffle layout';draft.cells.forEach((c,i)=>{const {node,canvas,tag}=tiles[i];paint(canvas,c);const object=draft.objects?.find(o=>L.objectCells(o).includes(i));if(object)L.drawObjectTile(canvas.getContext('2d'),{...object,local:L.category(draft).startsWith('lga-')},canvas.width);node.setAttribute('aria-selected',String(i===selected));node.draggable=false;tag.textContent=`${i+1}${c.locked?' · 🔒':''}`;node.setAttribute('aria-label',`Slot ${i+1} ${c.locked?'Locked ':''}${labels[c.type]||'Original panel '+(c.source+1)}`);});
            deliveryPreview?.update();
            const planner=query('.delivery-planner');if(planner)planner.hidden=L.category(draft).startsWith('lga-');
            query('[data-slot]').textContent=`Slot ${selected+1}${brush?' · Place '+(labels[brush.type]||'Panel '+(brush.source+1)):' · Select mode'}`;
            query('[data-action=lock]').textContent=draft.cells[selected].locked?'Unlock panel':'Lock panel';
            query('[data-action=rotate]').disabled=busy||draft.cells[selected].locked;
            const checked=L.validateConnected(draft);query('[data-validation]').textContent=checked.message;query('[data-validation]').dataset.valid=checked.ok;
            query('[data-action=apply]').disabled=busy||!atlas||!checked.ok;
            palette.forEach(p=>p.node.setAttribute('aria-pressed',String(brush===p.tile)));
            const slots=readSlots(),canLabels=L.canLabels(draft);
            if(!slots.some(s=>s.key===selectedStation))selectedStation=slots.length?slots[0].key:null;
            stationSelect.textContent='';slots.forEach((slot,i)=>{const option=doc.createElement('option');option.value=slot.key;option.textContent=(canLabels[slot.key]||'Empty')+' - Station '+(i+1);stationSelect.appendChild(option);});
            stationSelect.value=selectedStation||'';colorSelect.value=(slots.find(s=>s.key===selectedStation)||{}).color||'';
            stationSelect.disabled=colorSelect.disabled=busy||!slots.length;
            query('[data-can-count]').textContent=slots.filter(s=>s.color).length+' cans / '+slots.length+' stations';
            stationLayer.textContent='';slots.forEach((slot,number)=>{const node=doc.createElement('button');node.type='button';node.className='can-station';node.dataset.station=slot.key;node.dataset.color=slot.color||'empty';node.style.left=(slot.u*100)+'%';node.style.top=(slot.v*100)+'%';node.textContent=canLabels[slot.key]||' + ';node.disabled=busy;node.setAttribute('aria-pressed',String(slot.key===selectedStation));node.setAttribute('aria-label','Station '+(number+1)+': '+(slot.color||'empty'));node.title=(canLabels[slot.key]||'Empty')+' - Station '+(number+1)+' · '+(slot.color||'Empty');node.onclick=()=>{selectedStation=slot.key;query('.can-controls').open=true;redraw();};node.ondragover=e=>{if(busy||!Array.from(e.dataTransfer.types).includes(canType))return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='copy';node.classList.add('can-drop-target');};
                node.ondragleave=()=>node.classList.remove('can-drop-target');
                node.ondrop=e=>{if(!Array.from(e.dataTransfer.types).includes(canType))return;e.preventDefault();e.stopPropagation();try{const payload=JSON.parse(e.dataTransfer.getData(canType));if(['red','yellow','green'].includes(payload.color)){placeCan(payload.color,slot.key);const placed=stationLayer.children[slots.indexOf(slot)];if(!reducedMotion&&placed)placed.animate([{transform:'translate(-50%,-50%) scale(1.5)'},{transform:'translate(-50%,-50%) scale(1)'}],{duration:220,easing:'ease-out'});}}catch(_){}finally{clearDrag();}};
                stationLayer.appendChild(node);});
            deliveryPreview?.highlight();
        }
        function place(tile,i){
            if(tile.objectType){try{L.placeObject(draft,{type:tile.objectType,cell:i,rotation:tile.rotation||0,shape:tile.shape||'straight'});status('Object placed on white panels.');}catch(error){status(error.message);}return;}

            if(draft.cells[i].locked){status('Unlock this slot before placing a panel.');return;}
            draft.cells[i]={type:tile.type,...(tile.type==='original'?{source:tile.source}:{}),rotation:tile.rotation||0,locked:false};animateTiles([i]);
        }
        // Only an explicit drop in this window, outside the board, removes a panel.
        // Cancelled drags and drops in other applications leave it untouched.
        doc.addEventListener('dragover',e=>{if(!busy&&!e.target.closest('.field-board')&&e.dataTransfer&&Array.from(e.dataTransfer.types).includes('application/x-field-cell')){e.preventDefault();e.dataTransfer.dropEffect='move';dialog.classList.add('remove-panel-preview');}});
        doc.addEventListener('drop',e=>{
            if(busy||e.target.closest('.field-board')||!e.dataTransfer)return;
            const raw=e.dataTransfer.getData('application/x-field-cell');if(!/^\d+$/.test(raw))return;
            const i=Number(raw);if(i>=32||draft.cells[i].locked)return;
            e.preventDefault();draft.cells[i]={type:'blank',rotation:0,locked:false};brush=null;clearDrag();redraw();status('Panel removed. Drag it from Panel library to place it again.');
        });
        async function shuffleConnected(){
            if(busy)return;
            if(draft.cells.every(c=>c.locked)){status('Unlock a panel before shuffling.');return;}
            const randomWords=new Uint32Array(2);window.crypto.getRandomValues(randomWords);
            const nextSeed=Array.from(randomWords,n=>n.toString(16).padStart(8,'0')).join('');
            busy=true;status('Connecting panels and checking routes…');
            dialog.querySelectorAll('button,input,select').forEach(node=>node.disabled=true);
            try{
                draft=await new Promise((resolve,reject)=>{
                    solver=new Worker(workerURL);
                    const finish=(error,value)=>{clearTimeout(timeout);if(solver)solver.terminate();solver=null;cancelSolve=null;if(error)reject(error);else resolve(value);};
                    const timeout=setTimeout(()=>finish(Error('Layout search timed out. Try unlocking some panels.')),30000);
                    cancelSolve=()=>finish(Error('Field editor closed'));
                    solver.onmessage=e=>finish(e.data.error?Error(e.data.error):null,e.data.layout);
                    solver.onerror=e=>finish(Error(e.message||'Could not arrange the field'));
                    solver.postMessage({layout:draft,seed:nextSeed,category:query('[data-shuffle-category]').value});
                });seed.value=draft.seed;brush=null;if(!child.closed){animateTiles();status('New connected layout ready.');}
            }finally{busy=false;if(!child.closed){dialog.querySelectorAll('button,input,select').forEach(node=>node.disabled=false);redraw();}}
        }
        for(let i=0;i<32;i++){const node=doc.createElement('button');node.type='button';node.className='field-tile';node.setAttribute('role','gridcell');node.dataset.index=i;const canvas=doc.createElement('canvas');canvas.width=canvas.height=128;const tag=doc.createElement('span');node.append(canvas,tag);grid.appendChild(node);tiles.push({node,canvas,tag});enablePointerDrag(node,canvas,()=>{if(draft.cells[i].locked)return null;const objectIndex=draft.objects?.findIndex(o=>L.objectCells(o).includes(i));return objectIndex>=0?{objectIndex}:draft.cells[i].type==='blank'?null:{from:i};});
            node.onclick=()=>{selected=i;if(brush&&!draft.cells[i].locked)place(brush,i);redraw();};
            node.ondragstart=e=>{if(busy||draft.cells[i].locked||draft.cells[i].type==='blank'){e.preventDefault();return;}e.dataTransfer.setData('application/x-field-cell',String(i));e.dataTransfer.effectAllowed='move';if(e.dataTransfer.setDragImage)e.dataTransfer.setDragImage(canvas,canvas.clientWidth/2,canvas.clientHeight/2);child.setTimeout(()=>node.classList.add('drag-source'),0);};
            node.ondragover=e=>{dialog.classList.remove('remove-panel-preview');if(!Array.from(e.dataTransfer.types).includes(canType)&&!busy&&!draft.cells[i].locked){e.preventDefault();e.dataTransfer.dropEffect='move';tiles.forEach(t=>t.node.classList.toggle('drop-target',t.node===node));}};
            node.ondragleave=e=>{if(!node.contains(e.relatedTarget))node.classList.remove('drop-target');};
            node.ondrop=e=>{e.preventDefault();if(Array.from(e.dataTransfer.types).includes(canType)||busy||draft.cells[i].locked)return;const raw=e.dataTransfer.getData('application/x-field-cell'),tile=e.dataTransfer.getData('application/x-field-tile');
                if(raw!==''&&/^\d+$/.test(raw)){const from=Number(raw);if(from<32&&!draft.cells[from].locked)[draft.cells[from],draft.cells[i]]=[draft.cells[i],draft.cells[from]];}
                else if(tile){try{const parsed=JSON.parse(tile),check=L.initial();check.cells[0]=parsed;place(L.normalize(check).cells[0],i);}catch(_){} }
                selected=i;clearDrag();redraw();animateTiles([i,...(raw!==''&&Number(raw)<32?[Number(raw)]:[])]);};
        }
        [...L.catalog.map(tile=>({tile,category:'delivery-robot-primary',label:'DELIVERY ROBOT PRIMARY'})),...L.basicCatalog.map(tile=>({tile,category:'basic-tracks',label:'BASIC TRACKS'})),...L.rescueCatalog.map(tile=>({tile,category:'rescue-robot',label:'RESCUE ROBOT'})),...L.localJuniorCatalog.map(tile=>({tile,category:'lga-junior',label:'DELIVERY ROBOT JUNIOR'})),...L.localSeniorCatalog.map(tile=>({tile,category:'lga-senior',label:'DELIVERY ROBOT SENIOR'}))].forEach(({tile,category,label:categoryLabel})=>{const node=doc.createElement('button');node.type='button';node.draggable=true;const canvas=doc.createElement('canvas');canvas.width=canvas.height=80;const label=doc.createElement('small');label.textContent=tile.name;node.dataset.category=category;node.dataset.type=tile.type;if(tile.source!==undefined)node.dataset.source=tile.source;node.setAttribute('aria-label',categoryLabel+', '+tile.name);node.append(canvas,label);query('[data-category="'+category+'"] .field-editor-palette').appendChild(node);palette.push({node,canvas,tile});node.onclick=()=>{brush=brush===tile?null:tile;redraw();};node.ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-field-tile',JSON.stringify(tile));};enableLibraryDrag(node,canvas,tile);});
        const objectsGroup=doc.createElement('div');objectsGroup.className='storage-content rescue-obstacles';
        const objectsTitle=doc.createElement('h3');objectsTitle.className='object-category-title';objectsTitle.textContent='Rescue obstacles';objectsGroup.appendChild(objectsTitle);
        for(const [objectType,name,rotation] of [['bridge_ramp','Bridge - Up ramp',0],['bridge_platform','Bridge - Platform',0],['bridge_ramp','Bridge - Down ramp',2],['tunnel','Tunnel',0]]){
            const node=doc.createElement('button');node.type='button';node.setAttribute('aria-label','Place '+name);node.title=name;
            const canvas=doc.createElement('canvas');canvas.width=canvas.height=80;canvas.style.width='64px';canvas.style.height='64px';
            const tile={objectType,rotation},label=doc.createElement('span');label.textContent=name.replace(/^Bridge - /,'');node.append(canvas,label);paint(canvas,tile);
            node.onclick=()=>{brush=tile;status('Choose white panels for '+name+'.');};enableLibraryDrag(node,canvas,tile);objectsGroup.appendChild(node);
        }
        query('.can-controls').appendChild(objectsGroup);
        const close=()=>{child.close();button.focus();};doc.addEventListener('keydown',e=>{if(e.key==='Escape'){if(brush){brush=null;redraw();}else close();}});
        function presets(){try{return JSON.parse(localStorage.getItem('robot_field_presets_v1'))||{};}catch(_){return {};}}
        function refreshPresets(){const select=query('[data-presets]');select.textContent='';Object.keys(presets()).forEach(name=>{const option=doc.createElement('option');option.textContent=option.value=name;select.appendChild(option);});}
        query('[data-shuffle-category]').onchange=()=>{
            const category=query('[data-shuffle-category]').value;
            showSelectedCategory(true);
            if(category==='lga-junior'||category==='lga-senior'){draft=L.localExample(category==='lga-senior');seed.value=draft.seed;brush=null;redraw();status('Delivery Robot: 240 x 120 cm; green/yellow/red platforms 50/100/150 mm. Press Apply field.');return;}
            if(query('[data-shuffle-category]').value==='quick-box-drop'){draft=L.quickBoxExample();seed.value=draft.seed;brush=null;redraw();status('Quick Box Drop: 120 x 120 cm. Initial position: zone 5. Press Apply field.');}
        };
        const actions={'shuffle-cans':()=>{const words=new Uint32Array(2);window.crypto.getRandomValues(words);draft=L.shuffleCans(draft,Array.from(words).join('-'));status('Can colors shuffled across available stations.');},'clear-cans':()=>{readSlots().forEach(slot=>L.setCan(draft,slot.key,null));},rotate:()=>{const i=draft.objects?.findIndex(o=>L.objectCells(o).includes(selected));if(i>=0){L.placeObject(draft,{...draft.objects[i],rotation:(draft.objects[i].rotation+1)%4},i);return;}const c=draft.cells[selected];if(!c.locked)c.rotation=(c.rotation+1)%4;},lock:()=>{draft.cells[selected].locked=!draft.cells[selected].locked;},remove:()=>{const i=draft.objects?.findIndex(o=>L.objectCells(o).includes(selected));if(i>=0){draft.objects.splice(i,1);return;}if(!draft.cells[selected].locked)draft.cells[selected]={type:'blank',rotation:0,locked:false};},original:()=>{draft=['lga-junior','lga-senior'].includes(query('[data-shuffle-category]').value)?L.localExample(query('[data-shuffle-category]').value==='lga-senior'):query('[data-shuffle-category]').value==='quick-box-drop'?L.quickBoxExample():query('[data-shuffle-category]').value==='rescue-robot'?L.rescueExample():L.normalize(L.initial());seed.value=draft.seed;brush=null;},shuffle:shuffleConnected,
            'save-preset':()=>{const name=query('[data-name]').value.trim();if(!name)throw Error('Enter a preset name');const saved=presets();Object.defineProperty(saved,name,{value:L.normalize({...draft,seed:seed.value}),enumerable:true,configurable:true,writable:true});localStorage.setItem('robot_field_presets_v1',JSON.stringify(saved));refreshPresets();status('Preset saved');},
            'load-preset':()=>{const value=L.normalize(presets()[query('[data-presets]').value]);if(!value)throw Error('Choose a preset');draft=value;syncCategory(true);seed.value=draft.seed;brush=null;},
            'export-svg':()=>{const name=query('[data-name]').value.trim()||'robot-field',result=window.SimFieldVector.exportSVG(draft,{atlas,title:name}),url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'})),a=doc.createElement('a');a.href=url;a.download=name.replace(/[<>:"/\\|?*]/g,'_')+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('SVG exported with PT ROBOTICS border: '+result.width+' x '+result.height+' mm. Field: '+result.fieldWidth+' x '+result.fieldHeight+' mm. Open in Illustrator to save as .ai.'+(result.hasRaster?' Original kit panels retain their source image resolution.':''));},
            export:()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({...draft,seed:seed.value},null,2)],{type:'application/json'})),a=doc.createElement('a');a.href=url;a.download='robot-field.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
            apply:async()=>{const apply=query('[data-action=apply]');apply.disabled=true;try{status('Applying field…');await window.motorSimulation.setFieldLayout({...draft,seed:seed.value});status('Field applied.');}finally{apply.disabled=false;}}
        };
        dialog.addEventListener('click',async e=>{const node=e.target.closest('[data-action]');if(!node)return;try{await actions[node.dataset.action]();if(!child.closed&&dialog.isConnected)redraw();}catch(error){status(error.message);}});
        grid.addEventListener('keydown',e=>{if(['r','l'].includes(e.key)){e.preventDefault();actions[e.key==='r'?'rotate':'lock']();redraw();}const d={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.key];if(d){e.preventDefault();selected=Math.max(0,Math.min(31,selected+d));tiles[selected].node.focus();redraw();}});
        query('[data-import]').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>100000)throw Error('Field file is too large');const value=L.normalize(JSON.parse(await file.text()));if(!value)throw Error('Invalid field file');draft=value;syncCategory(true);seed.value=draft.seed;brush=null;redraw();}catch(error){status(error.message);}};
        refreshPresets();redraw();query('[data-action=apply]').disabled=true;
        try{const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not load field artwork'));img.src='robot-sim/fields/opt-primary-2025.png';});atlas=L.cleanAtlas(image,()=>doc.createElement('canvas'));palette.forEach(p=>paint(p.canvas,p.tile));redraw();}
        catch(error){status(error.message);}
    };
})();
