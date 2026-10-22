(async function(){
 'use strict';const $=id=>document.getElementById(id),status=text=>$('status').textContent=text;
 const bridge=window.parent!==window?window.parent.IDEArduinoBridge:null;
 if(!bridge){status('Arduino C++ compile/upload is available in Electron only.');document.querySelectorAll('button').forEach(b=>b.disabled=true);return;}
 const ipcRenderer={invoke:(_channel,action,payload)=>bridge.invoke(action,payload),on:()=>{},send:()=>bridge.leave()},board=new URLSearchParams(location.search).get('board');let files={},current='sketch.ino',editor,busy=false,taskName=null,timer,loading=false,dirty=false,allowClose=false;
 const project=new URLSearchParams(location.search).get('project')||'';
 document.title=bridge.projectName?.()||new URLSearchParams(location.search).get('name')||'Arduino C++';
 let hiddenTabs=new Set(),restrictedTabs=new Set(),displayLocked=false;
 const isRestricted=name=>restrictedTabs.has(name)&&!bridge.isAdmin?.();
 // Keep the source layout without exposing its identifiers or contents in the editor.
 const lockedText=source=>String(source||'').replace(/[^\s]/g,'x');
 function showCurrentFile(){loading=true;displayLocked=isRestricted(current);$('editor').classList.toggle('code-restricted',displayLocked);editor.setValue(displayLocked?lockedText(files[current]):files[current]);editor.updateOptions({readOnly:displayLocked});loading=false;}
 let sketchLabel=document.title.replace(/\.ino$/i,'')+'.ino';
 const api=(action,p={})=>ipcRenderer.invoke('arduino-request',action,{...p,board,project});
 const log=text=>bridge.output(text);window.ArduinoWorkspace={peekFiles(){if(!editor)return null;store();return {...files};},output:log,async snapshot(){if((busy&&taskName!=="Compile")||!editor)throw Error("Wait for the Arduino editor to finish its current task.");await save();return {format:"roboblocks-arduino",version:1,board,current,hiddenTabs:[...hiddenTabs],restrictedTabs:[...restrictedTabs],files:JSON.parse(JSON.stringify(files))};},command(id){if(id==="undo"||id==="redo"){editor?.focus();editor?.trigger("menu",id,null);return;}if(busy)return;if(id==="upload"){requestUpload();return;}if(id==="libraries")libraries.open();else $(id)?.click();},async prepareLeave(){if(busy&&taskName!=='Compile')throw Error('Wait for the Arduino task to finish.');if(!editor)throw Error('Wait for the Arduino editor to load.');await save();allowClose=true;}};

 $('board').textContent=board==='buildbot'?'Build BOT · ESP32-S3':'ATOM VX · ESP32';
 let formatting=false;
 async function formatCode(){
  if(busy||formatting||!editor||isRestricted(current))return;
  formatting=true;const model=editor.getModel(),version=model.getVersionId(),view=editor.saveViewState();
  try{
   status('Formatting code...');
   const result=await api('format',{code:model.getValue(),filename:current});
   if(editor.getModel()!==model||model.getVersionId()!==version){status('Code changed; press Ctrl+T again.');return;}
   if(result.code!==model.getValue()){editor.pushUndoStop();editor.executeEdits('arduino-format',[{range:model.getFullModelRange(),text:result.code,forceMoveMarkers:true}]);editor.pushUndoStop();editor.restoreViewState(view);}
   editor.focus();status('Code formatted');
  }catch(error){status('Format failed');log(error.message);}
  finally{formatting=false;}
 }
 document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&event.code==='KeyT'&&editor?.hasTextFocus()){
   event.preventDefault();event.stopImmediatePropagation();formatCode();
  }
 },true);
 function store(){if(editor&&!displayLocked)files[current]=editor.getValue();}
 async function save(){clearTimeout(timer);store();const version=JSON.stringify(files);await api('save',{files,current,hiddenTabs:[...hiddenTabs],restrictedTabs:[...restrictedTabs]});if(JSON.stringify(files)===version)dirty=false;if(!busy){status('Saved locally');window.parent.IDEArduino?.prepareSim();}}
 async function task(name,fn){if(busy)return;busy=true;taskName=name;if(name==='Compile'||name==='Upload')window.ArduinoWorkspace.progress({percent:0,phase:'Preparing project',estimated:true});status(name+'…');const editable=name==='Compile'||name==='Upload';const locked=[...document.querySelectorAll('button')].filter(b=>!editable||!b.classList.contains('tab-label'));locked.forEach(b=>b.disabled=true);editor?.updateOptions({readOnly:!editable||isRestricted(current)});try{await fn();status(name+' complete');}catch(e){if(name==='Compile'||name==='Upload'){progressBox.classList.add('failed');progressBox.querySelector('[data-phase]').textContent=name+' failed';const bar=progressBox.querySelector('progress');if(!bar.hasAttribute('value'))bar.value=0;}status(name+' failed');log('\n'+e.message+'\n');}finally{busy=false;taskName=null;locked.forEach(b=>b.disabled=false);editor?.updateOptions({readOnly:isRestricted(current)});window.parent.IDEArduino?.prepareSim();}}
 function select(name){store();current=name;showCurrentFile();for(const button of $('tabs').children)button.classList.toggle('active',button.dataset.file===current);editor.focus();save().catch(e=>status(e.message));}
 function editFilename(name){
  if(busy||(name&&isRestricted(name)))return;
  if(name==='sketch.ino'){status('Change the project name to rename the main sketch.');return;}
  if(!name){let index=1;name='untitled.ino';while(Object.keys(files).some(n=>n.toLowerCase()===name.toLowerCase()))name='untitled'+(++index)+'.ino';store();files[name]='';select(name);tabs();}
  const tab=[...$('tabs').children].find(b=>b.dataset.file===name);if(!tab||tab.querySelector('input'))return;
  const input=document.createElement('input');input.className='tab-name-input';input.value=name;input.setAttribute('aria-label','Filename');input.spellcheck=false;input.autocomplete='off';tab.replaceChildren(input);tab.classList.add('renaming');let finished=false;
  const finish=cancel=>{
   if(finished)return;const next=cancel?name:input.value.trim();
   if(!cancel&&(!/^[a-zA-Z_][a-zA-Z0-9_.-]*\.(ino|cpp|c|h|hpp)$/.test(next)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(next)||Object.keys(files).some(n=>n!==name&&n.toLowerCase()===next.toLowerCase()))){status('Invalid or duplicate filename');input.setAttribute('aria-invalid','true');input.focus();return;}
   finished=true;store();if(next!==name){files=Object.fromEntries(Object.entries(files).map(([key,value])=>[key===name?next:key,value]));if(current===name)current=next;if(restrictedTabs.delete(name))restrictedTabs.add(next);if(hiddenTabs.delete(name))hiddenTabs.add(next);}
   tabs();save().catch(e=>status(e.message));
  };
  input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(false);}if(e.key==='Escape'){e.preventDefault();finish(true);}});
  input.addEventListener('pointerdown',e=>e.stopPropagation());input.addEventListener('click',e=>e.stopPropagation());input.addEventListener('dblclick',e=>e.stopPropagation());input.addEventListener('blur',()=>finish(false));
  input.focus();input.setSelectionRange(0,name.lastIndexOf('.'));tab.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 let confirmingDelete=false;
 async function deleteTab(name){
  if(busy||isRestricted(name)||confirmingDelete||name==='sketch.ino'||!Object.hasOwn(files,name))return;
  confirmingDelete=true;
  try{
   if(!await bridge.confirmDeleteTab(name)||busy||!window.frameElement?.isConnected||!Object.hasOwn(files,name)||isRestricted(name))return;
   store();
   const names=Object.keys(files),index=names.indexOf(name);
   if(current===name){current=names[index-1]||names[index+1]||'sketch.ino';showCurrentFile();}
   delete files[name];restrictedTabs.delete(name);hiddenTabs.delete(name);hiddenTabs.delete(current);tabs();dirty=true;await save();
  }catch(error){status(error.message);}finally{confirmingDelete=false;}
 }
 const tabBar=document.createElement('div');tabBar.className='tab-bar';$('tabs').before(tabBar);tabBar.append($('tabs'));
 // Map a mouse wheel to the horizontal strip while retaining native trackpad gestures.
 $('tabs').addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey)return;
  const strip=$('tabs');
  if(strip.scrollWidth<=strip.clientWidth)return;
  const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  const unit=event.deltaMode===1?24:event.deltaMode===2?strip.clientWidth:1;
  if(delta){event.preventDefault();strip.scrollLeft+=delta*unit;}
 },{passive:false});
 let tabDrag=null,suppressTabClick=false;
 const layoutLeft=tab=>tab.getBoundingClientRect().left-(new DOMMatrixReadOnly(getComputedStyle(tab).transform)).m41;
 function finishTabDrag(cancel=false){
  const drag=tabDrag;if(!drag)return;tabDrag=null;
  cancelAnimationFrame(drag.frame);
  if($('tabs').hasPointerCapture(drag.id))$('tabs').releasePointerCapture(drag.id);
  if(!drag.started)return;
  suppressTabClick=true;setTimeout(()=>suppressTabClick=false,0);
  const names=[...$('tabs').querySelectorAll('.file-tab')].map(tab=>tab.dataset.file);
  drag.tab.style.transform='';drag.tab.classList.remove('dragging');
  if(cancel||busy||confirmingDelete){tabs();return;}
  if(names.join('\n')===Object.keys(files).join('\n'))return;
  store();let index=0;const order=Object.keys(files).map(key=>hiddenTabs.has(key)?key:names[index++]);files=Object.fromEntries(order.map(key=>[key,files[key]]));tabs();dirty=true;
  save().catch(error=>status(error.message));
 }
 function moveTabDrag(now=performance.now()){
  const drag=tabDrag;if(!drag?.started)return;
  const strip=$('tabs'),bounds=strip.getBoundingClientRect(),source=drag.tab;
  // Scroll against the tab viewport; the menu has its own reserved space outside it.
  const right=bounds.right;
  const elapsed=Math.min(40,Math.max(0,now-(drag.lastFrame??now-16.67)));drag.lastFrame=now;
  const desiredLeft=drag.x-drag.grip;
  const zone=Math.min(48,(right-bounds.left)/4);
  const leftPressure=Math.max(0,Math.min(1,(bounds.left+zone-desiredLeft)/zone));
  const rightPressure=Math.max(0,Math.min(1,(desiredLeft+drag.width-right+zone)/zone));
  const pressure=rightPressure-leftPressure;
  strip.scrollLeft+=pressure*720*elapsed/1000;
  const main=strip.querySelector('[data-file="sketch.ino"]');
  const left=Math.max(bounds.left,main.getBoundingClientRect().right,Math.min(right-drag.width,desiredLeft));
  const center=left+drag.width/2;
  const candidates=[...strip.querySelectorAll('.file-tab')].filter(tab=>tab!==source&&tab!==main);
  const before=candidates.find(tab=>center<layoutLeft(tab)+tab.offsetWidth/2);
  const anchor=before||strip.querySelector('.tab-add');
  if(source.nextElementSibling!==anchor){
   const positions=new Map(candidates.map(tab=>[tab,tab.getBoundingClientRect().left]));
   strip.insertBefore(source,anchor);
   for(const tab of candidates){
    tab.getAnimations().forEach(animation=>animation.cancel());
    const delta=positions.get(tab)-layoutLeft(tab);
    if(delta&&!matchMedia('(prefers-reduced-motion: reduce)').matches)tab.animate([{transform:`translateX(${delta}px)`},{transform:'translateX(0)'}],{duration:140,easing:'ease-out'});
   }
  }
  source.style.transform=`translateX(${left-layoutLeft(source)}px)`;
  drag.frame=requestAnimationFrame(moveTabDrag);
 }
 $('tabs').addEventListener('pointermove',event=>{
  const drag=tabDrag;if(!drag||event.pointerId!==drag.id)return;
  drag.x=event.clientX;
  if(!drag.started&&Math.abs(drag.x-drag.start)>=4){
   drag.started=true;drag.tab.classList.add('dragging');
   $('tabs').setPointerCapture(drag.id);moveTabDrag();
  }
  if(drag.started)event.preventDefault();
 });
 window.addEventListener('pointerup',event=>{if(event.pointerId===tabDrag?.id)finishTabDrag();});
 window.addEventListener('pointercancel',()=>finishTabDrag(true));
 window.addEventListener('blur',()=>finishTabDrag(true));
 $('tabs').addEventListener('lostpointercapture',()=>finishTabDrag(true));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&tabDrag){event.preventDefault();finishTabDrag(true);}});
 $('tabs').addEventListener('click',event=>{if(suppressTabClick){event.preventDefault();event.stopImmediatePropagation();}},true);
 function tabs(){
  
  const previousScroll=$('tabs').scrollLeft;
  $('tabs').replaceChildren();
  for(const name of Object.keys(files)){
   if(hiddenTabs.has(name))continue;
   const tab=document.createElement('div');tab.dataset.file=name;tab.className='file-tab'+(name===current?' active':'');
   tab.draggable=false;
   tab.addEventListener('dragstart',event=>event.preventDefault());
   tab.addEventListener('pointerdown',event=>{
    if(event.button!==0||busy||confirmingDelete||name==='sketch.ino'||tab.querySelector('input')||event.target.closest('.tab-delete'))return;
    const rect=tab.getBoundingClientRect();
    tabDrag={tab,id:event.pointerId,start:event.clientX,x:event.clientX,grip:event.clientX-rect.left,width:rect.width,started:false,frame:0};
   });
   const label=document.createElement('button');label.textContent=name==='sketch.ino'?sketchLabel:name;label.className='tab-label';if(isRestricted(name)){label.classList.add('is-restricted');label.title='Code hidden by the example author';}label.onclick=()=>{if(!tab.querySelector('input'))select(name)};tab.ondblclick=()=>editFilename(name);tab.append(label);
   if(name!=='sketch.ino'&&!isRestricted(name)){
    const close=document.createElement('button');close.className='tab-delete';close.setAttribute('aria-label','Delete '+name);close.title='Delete '+name;
    close.onclick=e=>{e.stopPropagation();deleteTab(name);};close.ondblclick=e=>e.stopPropagation();tab.append(close);
   }
   $('tabs').append(tab);
  }
  const add=document.createElement('button');add.className='tab-add';add.textContent='+';add.title='Add file';add.setAttribute('aria-label','Add file');add.onclick=()=>editFilename(null);$('tabs').append(add);
  const manage=document.createElement('button');manage.className='tab-visibility';manage.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 6 5-6Z"/></svg>';manage.title='Show or hide tabs'+(hiddenTabs.size?' ('+hiddenTabs.size+' hidden)':'');manage.setAttribute('aria-label',manage.title);manage.setAttribute('aria-expanded','false');manage.onclick=()=>openTabMenu(manage);tabBar.querySelector('.tab-visibility')?.remove();tabBar.append(manage);$('tabs').scrollLeft=previousScroll;
 }
 let tabMenu=null,tabMenuTrigger=null;
 function closeTabMenu(){tabMenu?.remove();tabMenu=null;tabMenuTrigger?.setAttribute('aria-expanded','false');tabMenuTrigger=null;}
 function setTabVisible(name,visible){
  if(busy||name==='sketch.ino')return;
  store();
  if(visible)hiddenTabs.delete(name);else {hiddenTabs.add(name);if(current===name)select('sketch.ino');}
  tabs();save().catch(e=>status(e.message));
 }
 function openTabMenu(trigger){
  if(tabMenu){closeTabMenu();return;}if(busy)return;
  tabMenuTrigger=trigger;trigger.setAttribute('aria-expanded','true');
  tabMenu=document.createElement('div');tabMenu.className='tab-visibility-menu';tabMenu.setAttribute('role','dialog');tabMenu.setAttribute('aria-label','Visible tabs');
  const title=document.createElement('strong');title.textContent='Visible tabs';tabMenu.append(title);
  const hint=document.createElement('p');hint.textContent='Hidden files still compile and save with the project.';tabMenu.append(hint);
  for(const name of Object.keys(files)){
   const row=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');check.type='checkbox';check.checked=!hiddenTabs.has(name);check.disabled=name==='sketch.ino';text.textContent=name==='sketch.ino'?sketchLabel:name;
   check.onchange=()=>setTabVisible(name,check.checked);row.append(check,text);tabMenu.append(row);
  }
  const all=document.createElement('button');all.textContent='Show all tabs';all.onclick=()=>{if(busy)return;hiddenTabs.clear();tabs();save().catch(e=>status(e.message));closeTabMenu();};tabMenu.append(all);
  document.body.append(tabMenu);const rect=trigger.getBoundingClientRect();tabMenu.style.top=(rect.bottom+6)+'px';tabMenu.style.left=Math.max(8,Math.min(rect.left,innerWidth-300))+'px';tabMenu.querySelector('input:not(:disabled),button')?.focus();
 }
 document.addEventListener('pointerdown',e=>{if(tabMenu&&!tabMenu.contains(e.target)&&!e.target.closest('.tab-visibility'))closeTabMenu();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tabMenu){closeTabMenu();tabBar.querySelector('.tab-visibility')?.focus();}});
 window.addEventListener('resize',closeTabMenu);
 const progressBox=document.createElement('div');progressBox.id='compile-progress';progressBox.hidden=true;
 progressBox.innerHTML='<div><span data-phase></span><span data-percent></span></div><progress max="100" value="0" aria-label="Compilation progress"></progress>';
 document.querySelector('footer').before(progressBox);
 window.ArduinoWorkspace.progress=({percent,phase,estimated})=>{progressBox.hidden=false;progressBox.classList.remove('failed');progressBox.querySelector('[data-phase]').textContent=phase;progressBox.querySelector('[data-percent]').textContent=percent===null?'':(estimated?'~ ':'')+percent+'%';const bar=progressBox.querySelector('progress');if(percent===null)bar.removeAttribute('value');else bar.value=percent;};
 window.ArduinoWorkspace.setProjectName=name=>{document.title=name;sketchLabel=name.replace(/\.ino$/i,'')+'.ino';const label=$('tabs').querySelector('[data-file="sketch.ino"] .tab-label');if(label)label.textContent=sketchLabel;};

 $('verify').onclick=()=>task('Compile',async()=>{await save();log('\nVerifying '+$('board').textContent+'\n');await api('compile',{files:{...files}});});
 let selectingUpload=false;
 async function requestUpload(){
  if(busy||selectingUpload)return;
  selectingUpload=true;
  try{
   const port=await bridge.uploadPort();
   if(port)await task('Upload',async()=>{await save();log('\nCompiling and uploading to '+port+'\n');await api('upload',{files:{...files},port});});
  }catch(e){status(e.message);log(e.message+'\n');}
  finally{selectingUpload=false;}
 }
 window.ArduinoWorkspace.setRestrictedTabs=async names=>{if(!bridge.isAdmin?.())throw Error('Admin only');store();restrictedTabs=new Set(names.filter(n=>Object.hasOwn(files,n)));showCurrentFile();tabs();await save();};
 const accountChanged=()=>{if(!editor)return;store();showCurrentFile();tabs();};
 window.parent.addEventListener('account-changed',accountChanged);window.addEventListener('pagehide',()=>window.parent.removeEventListener('account-changed',accountChanged),{once:true});
 const libraries=createArduinoLibraryManager({api,bridge,setBusy(value){busy=value;editor?.updateOptions({readOnly:value||isRestricted(current)});$('verify').disabled=value;}});
 window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(!busy)parent.IDEArduino.command(e.shiftKey?'save-as':'save');}});
 window.addEventListener('beforeunload',e=>{
  if(editor){try{store();bridge.checkpoint({files,current,hiddenTabs:[...hiddenTabs],restrictedTabs:[...restrictedTabs]});dirty=false;}catch(error){e.preventDefault();e.returnValue=false;status(error.message);}}
 });
 try{const restored=await api('load');files=restored.files;restrictedTabs=new Set((restored.restrictedTabs||[]).filter(n=>Object.hasOwn(files,n)));hiddenTabs=new Set((restored.hiddenTabs||[]).filter(n=>n!=='sketch.ino'&&n!==restored.current&&Object.hasOwn(files,n)));if(Object.hasOwn(files,restored.current))current=restored.current;await IDEMonaco.load();IDEProjectCompletions.register(monaco,'cpp',()=>{store();return Object.fromEntries(Object.entries(files).filter(([name])=>!isRestricted(name)));});displayLocked=isRestricted(current);editor=monaco.editor.create($('editor'),{...IDECodeTheme.options(monaco),value:displayLocked?lockedText(files[current]):files[current],readOnly:displayLocked,language:'cpp',automaticLayout:true,minimap:{enabled:false},fontSize:14,scrollBeyondLastLine:false});$('editor').classList.toggle('code-restricted',displayLocked);IDEProjectCompletions.attach(monaco,editor,'cpp');editor.addAction({id:'arduino.autoFormat',label:'Auto Format (Ctrl+T)',contextMenuGroupId:'1_modification',contextMenuOrder:1,run:()=>formatCode()});editor.onDidChangeCursorPosition(e=>{$('cursor-position').textContent='Ln '+e.position.lineNumber+', Col '+e.position.column;});editor.onDidChangeModelContent(()=>{if(loading)return;dirty=true;store();clearTimeout(timer);timer=setTimeout(()=>save().catch(e=>status(e.message)),500);});tabs();status('Ready');window.parent.IDEArduino?.prepareSim();}catch(e){status(e.message);log(e.stack||e.message);}
})();
