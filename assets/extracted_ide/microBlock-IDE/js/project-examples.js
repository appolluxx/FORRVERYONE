(() => {
 let dialog,entries=[],busy=false,current=null;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const versionTitle=title=>title.replace(/\bv(?=\d+\.\d+)/g,'V');
 const boardName=id=>boards.find(b=>b.id===id)?.name||id;
 const category=e=>e.board;
 const isArduino=e=>e.language==='arduino'||(!e.language&&!!boards.find(b=>b.id===e.board)?.isArduinoPlatform);
 const isRecommended=e=>e.recommended===true;
 const api=async(route)=>{const address=await IDEAccount.url(route);const r=await fetch(address,{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Examples server unavailable.');const data=await r.json();data.offlineCache=r.headers.get('X-Roboblocks-Offline')==='1';return data;};
 async function catalog(){
  const response=await fetch('examples/index.json');if(!response.ok)throw Error('Could not load examples.');
  const local=(await response.json()).examples;
  for(const entry of local)entry.title=versionTitle(entry.title);
  try{const data=await api('/api/examples');const deleted=new Set(data.deletedIds||[]);const merged=new Map(local.filter(e=>!deleted.has(e.id)).map(e=>[e.id,e]));for(const e of data.examples){e.title=versionTitle(e.title);const old=merged.get(e.id)||{};const title=old.title&&old.title.toLowerCase()===e.title.toLowerCase()?old.title:e.title;merged.set(e.id,{...old,...e,title,remote:true,image:await IDEAccount.url('/api/examples/'+e.id+'/image?revision='+e.revision),imageVersion:e.revision});}return {entries:[...merged.values()],online:!data.offlineCache};}
  catch{return {entries:local,online:false};}
 }
 async function open(entry){
  let data;
  if(entry.remote){const result=await api('/api/examples/'+entry.id+'?revision='+entry.revision);data=result.project;}
  else{if(!/^[a-z0-9_-]+\.mby$/i.test(entry.file))throw Error('Invalid example filename.');const r=await fetch('examples/'+entry.file);if(!r.ok)throw Error('Could not load example.');data=await r.text();}
  const arduino=JSON.parse(data).format==='roboblocks-arduino';
  if(arduino&&!isElectron){NotifyW('Install the Windows app to use Arduino examples.');return false;}
  if(arduino&&!window.IDEArduino)throw Error('Arduino examples require the desktop IDE.');
  if(!arduino)parseProjectData(data);
  if(!await NotifyConfirm('Open this example? It will replace the current workspace. Save your work first if needed.'))return false;
  window.motorSimulation?.stop();projectFilePath=null;saveAsFlag=true;github_project_repo=null;
  if(arduino){await IDEArduino.importProject(JSON.parse(data),entry.title+'.json');await IDEArduino.rememberExample(entry);}
  else {await openProjectFromData(data,entry.title+'.mby');await rememberSource(entry);}$('#project-create-dialog .close-btn').click();return true;
 }
 document.getElementById('open-examples')?.addEventListener('click',()=>window.openProjectExamples());
 window.openProjectExamples=async function(){
  if(!dialog){dialog=el('dialog');dialog.id='project-examples-dialog';dialog.setAttribute('aria-labelledby','project-examples-title');dialog.innerHTML='<header><div><h2 id="project-examples-title">Examples</h2><p>Pick a project. Make it your own.</p></div><button class="examples-close" aria-label="Close" type="button">&times;</button></header><nav class="examples-types" aria-label="Filter by type"></nav><nav class="examples-boards" aria-label="Filter by board"></nav><section class="examples-list"></section><footer></footer>';dialog.querySelector('.examples-close').onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});document.body.append(dialog);}
  if(!dialog.open)dialog.showModal();const area=dialog.querySelector('.examples-list');area.textContent='Loading examples...';
  try{const loaded=await catalog();entries=loaded.entries;dialog.querySelector('footer').textContent=loaded.online?'Up to date from server. Examples open as a new project.':'Offline examples. Showing the last available projects on this device.';
   const nav=dialog.querySelector('.examples-boards'),types=dialog.querySelector('.examples-types');nav.replaceChildren();types.replaceChildren();let selectedType='all',selectedBoard='all';const categories=[...new Set(entries.map(category))];
   const render=filter=>{selectedBoard=filter;[...types.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===selectedType)));[...nav.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.board===filter)));area.replaceChildren();
    for(const entry of entries.filter(e=>(filter==='all'||category(e)===filter)&&(selectedType==='all'||(selectedType==='recommended'?isRecommended(e):selectedType==='arduino'?isArduino(e):!isArduino(e)))).sort((a,b)=>a.title.localeCompare(b.title,'en',{sensitivity:'base',numeric:true})||a.board.localeCompare(b.board))){
     const desktopOnly=isArduino(entry)&&!isElectron;const card=el(desktopOnly?'div':'button');if(!desktopOnly)card.type='button';card.className='example-card';
     const preview=el('div');preview.className='example-card-preview';preview.dataset.state='loading';preview.setAttribute('aria-busy','true');
     const placeholder=el('span','Loading preview');placeholder.className='example-card-placeholder';
     const image=el('img');image.alt=entry.title+' simulation preview';image.loading='lazy';image.decoding='async';
     if(entry.remote)image.crossOrigin='anonymous';
     let objectURL=null;
     const settled=ready=>{preview.dataset.state=ready?'ready':'error';preview.setAttribute('aria-busy','false');if(!ready)placeholder.textContent='Preview unavailable';if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}};
     image.onload=()=>settled(true);image.onerror=()=>settled(false);
     preview.append(image,placeholder);
     const url=new URL(entry.image+(entry.imageVersion&&!entry.remote?'?v='+encodeURIComponent(entry.imageVersion):''),document.baseURI).href;
     if(window.IDEOfflineData){IDEOfflineData.imageURL(url).then(src=>{objectURL=src;image.src=src;}).catch(()=>{image.src=url;});}
     else image.src=url;
     const info=el('div'),meta=el('div');meta.className='example-meta';const arduino=isArduino(entry);const badge=el('span');badge.className='example-language';badge.dataset.language=arduino?'arduino':'block';badge.innerHTML=arduino?'<i class="fas fa-microchip" aria-hidden="true"></i> Arduino':'<i class="fas fa-puzzle-piece" aria-hidden="true"></i> Block';meta.append(el('small',entry.board==='buildbot'?'BUILD BOT':entry.board==='atom-vx'?'ATOM VX':entry.board.toUpperCase()),badge);info.append(meta,el('strong',entry.title),el('p',entry.description));card.append(preview,info);
     if(arduino&&!isElectron){card.dataset.desktopOnly='true';}

     card.onclick=async()=>{if(busy||arduino&&!isElectron)return;busy=true;card.disabled=true;dialog.close();try{if(!await open(entry))dialog.showModal();}catch(e){dialog.showModal();const error=el('p',e.message);error.className='examples-error';area.prepend(error);}finally{busy=false;card.disabled=false;}};const tile=el('div');tile.className='example-tile';tile.append(card);area.append(tile);
     if(arduino&&!isElectron){const download=el('a','Install IDE');download.title='Install the Windows app to use this example';download.setAttribute('aria-label','Download and install the Windows IDE to use '+entry.title);download.className='example-install-ide';download.href='https://pt-robotics.com/files/roboblocks/roboBlocks-IDE-latest.exe';const icon=el('i');icon.className='fas fa-download';icon.setAttribute('aria-hidden','true');download.prepend(icon);preview.append(download);}
     if(IDEAccount.user?.admin&&loaded.online){
      const remove=el('button');remove.type='button';remove.className='example-delete';remove.setAttribute('aria-label','Delete '+entry.title);remove.innerHTML='<i class="fas fa-trash-alt" aria-hidden="true"></i>';tile.append(remove);
      remove.onclick=async()=>{
       if(busy)return;busy=true;remove.disabled=true;
       try{
        dialog.close();const confirmed=await NotifyConfirm('Delete "'+entry.title+'" from Examples? Your current workspace will be kept.');dialog.showModal();
        if(!confirmed)return;
        await IDEAccount.request('/api/admin/examples/'+entry.id+'/delete',{expectedRevision:entry.revision||0});
        entries=entries.filter(e=>e.id!==entry.id);await api('/api/examples');
        if(current?.id===entry.id){current=null;await saveCodeToLocal();}
        render(filter);dialog.querySelector('footer').textContent='Deleted: '+entry.title;
       }catch(e){if(!dialog.open)dialog.showModal();const error=el('p',e.message);error.className='examples-error';error.setAttribute('role','alert');area.prepend(error);}
       finally{busy=false;remove.disabled=false;}
      };
     }
    }
   };
   for(const [id,label,icon] of [['all','All','fa-th-large'],['recommended','Recommended','fa-star'],['block','Block','fa-puzzle-piece'],['arduino','Arduino','fa-microchip']]){const button=el('button');button.type='button';button.dataset.type=id;const glyph=el('i');glyph.className='fas '+icon;glyph.setAttribute('aria-hidden','true');button.append(glyph,document.createTextNode(' '+label));button.onclick=()=>{if(!busy){selectedType=id;render(selectedBoard);}};types.append(button);}
   for(const id of ['all',...categories]){const button=el('button',id==='all'?'All boards':boardName(id));button.type='button';button.dataset.board=id;button.onclick=()=>{if(!busy)render(id);};nav.append(button);}render('all');
  }catch(e){area.textContent=e.message;}
 };
 async function chooseSave(adapter=null){
  if(!IDEAccount.user?.admin)return false;
  return new Promise(resolve=>{
   const source=adapter?adapter.source:current,box=el('dialog');box.className='example-save-dialog';box.setAttribute('aria-labelledby','example-save-title');box.innerHTML='<header><span class="example-save-mark"><i class="fas fa-save" aria-hidden="true"></i></span><div><h2 id="example-save-title">Save project</h2><p>Keep your work. Share your next idea.</p></div><button type="button" data-close aria-label="Close">&times;</button></header><div class="example-save-body"><button type="button" class="example-local-save"><span class="example-file-icon"><i class="fas fa-download" aria-hidden="true"></i></span><span><strong>Save to your device</strong><small>Keep a personal copy as an .mby file</small></span><span class="example-file-type">.mby</span></button><div class="example-section-heading"><strong>Publish to Examples</strong><span>ADMIN</span></div><div class="example-publish-grid"><figure><img class="example-save-preview" alt="Current SIM preview"><figcaption><span class="example-preview-dot"></span>Current SIM preview</figcaption></figure><div class="example-save-fields"><label>Example title<input data-title maxlength="100" placeholder="Give your example a name"></label><label>Description<textarea data-description maxlength="800" rows="3" placeholder="What will learners explore?"></textarea></label><p class="example-save-source"></p></div></div><p data-status role="status" aria-live="polite"></p><section data-history hidden><label>Previous versions<select aria-label="Previous revision"></select></label><button type="button" data-restore>Restore version</button></section></div><footer><div class="example-save-secondary"><button type="button" data-history-open><i class="fas fa-history" aria-hidden="true"></i> Version history</button></div><div class="example-save-actions"><button type="button" data-new>Publish new</button><button type="button" data-update>Update example</button></div></footer>';
   const recommendation=el('label');recommendation.className='example-recommended-option example-tab-access-row';
   const recommendCheck=el('input');recommendCheck.type='checkbox';recommendCheck.dataset.recommended='';recommendCheck.checked=!!source&&isRecommended(source);
   const recommendText=el('span','Recommended');recommendText.className='example-tab-name';
   const recommendState=el('span');recommendState.className='example-tab-state';recommendState.setAttribute('aria-hidden','true');
   const recommendSwitch=el('span');recommendSwitch.className='example-tab-switch';recommendSwitch.setAttribute('aria-hidden','true');
   recommendCheck.setAttribute('aria-label','Recommended');recommendCheck.setAttribute('role','switch');
   const updateRecommendation=()=>{recommendState.textContent=recommendCheck.checked?'On':'Off';recommendation.classList.toggle('is-hidden',!recommendCheck.checked);};
   recommendCheck.onchange=updateRecommendation;updateRecommendation();
   recommendation.append(recommendText,recommendState,recommendCheck,recommendSwitch);box.querySelector('.example-section-heading').append(recommendation);
   if(adapter){
    box.querySelector('.example-local-save small').textContent='Save an Arduino sketch ZIP to your device';
    box.querySelector('.example-file-type').textContent='.zip';
    adapter.configure?.(box.querySelector('.example-save-body'));
   }
   box.querySelector('[data-title]').value=source?.title||$('#project-name').val()||'My example';box.querySelector('[data-description]').value=source?.description||'';
   const update=box.querySelector('[data-update]'),history=box.querySelector('[data-history-open]'),status=box.querySelector('[data-status]');update.disabled=!source;history.hidden=!source?.remote;
   box.querySelector('.example-save-source').textContent=source?'Updating: '+source.title:'Publish this project as a new example.';
   let saving=false,finished=false;const close=value=>{if(finished)return;finished=true;box.close();box.remove();resolve(value);};
   box.querySelector('[data-close]').onclick=()=>{if(!saving)close(true);};box.addEventListener('cancel',e=>{e.preventDefault();if(!saving)close(true);});box.querySelector('.example-local-save').onclick=()=>close(false);
   const lock=value=>{saving=value;box.querySelectorAll('button,input,textarea,select').forEach(n=>n.disabled=value);if(!value)update.disabled=!source;};
   let image;const preview=()=>{image=window.motorSimulation?.captureExampleImage?.();if(image)box.querySelector('img').src=image;};
   document.body.append(box);box.showModal();try{preview();}catch(e){status.textContent=e.message;}
   const confirm=async message=>{box.close();const yes=await NotifyConfirm(message);if(!finished)box.showModal();return yes;};
   async function publish(isNew){
    lock(true);try{
     const title=box.querySelector('[data-title]').value.trim();if(!title)throw Error('Enter an example title.');
     if(!isNew&&!await confirm('Replace "'+source.title+'" on the examples server? The previous version will be kept.'))return;
     preview();if(!image)throw Error('Wait for the SIM scene to load before saving an example.');
     const project=adapter?await adapter.serialize():await serializeProjectData();const parsed=adapter?JSON.parse(project):parseProjectData(project);const board=adapter?parsed.board:JSON.parse(parsed.files['config.json']).board;
     const id=isNew?('example-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)):source.id;
     status.textContent='Saving to examples server...';
     const result=await IDEAccount.request('/api/admin/examples/'+id,{title,description:box.querySelector('[data-description]').value,recommended:recommendCheck.checked,tag:board,board,language:adapter?'arduino':boards.find(b=>b.id===board)?.isArduinoPlatform?'arduino':'python',project,image,expectedRevision:isNew?null:(source.revision||0)},'POST');
     if(adapter)await adapter.remember({...result.entry,remote:true});else await rememberSource({...result.entry,remote:true});await api('/api/examples');NotifyS('Example saved to server: '+result.entry.title);close(true);
    }catch(e){status.textContent=e.message;}finally{if(!finished)lock(false);}
   }
   update.onclick=()=>publish(false);box.querySelector('[data-new]').onclick=()=>publish(true);
   history.onclick=async()=>{lock(true);try{const data=await IDEAccount.request('/api/admin/examples/'+source.id+'/history');const section=box.querySelector('[data-history]'),select=section.querySelector('select');select.replaceChildren();for(const e of data.revisions){const option=el('option','Revision '+e.revision+(e.updatedAt?' / '+new Date(e.updatedAt).toLocaleString():' / bundled original')+' / '+(e.updatedByName||(e.revision?'Unknown author':'Bundled example')));option.value=e.revision;select.append(option);}box.querySelector('.example-save-body').append(section);section.hidden=false;requestAnimationFrame(()=>{if(box.isConnected&&box.open)section.scrollIntoView({block:'end',behavior:'smooth'});});}catch(e){status.textContent=e.message;}finally{lock(false);}};
   box.querySelector('[data-restore]').onclick=async()=>{lock(true);try{const revision=Number(box.querySelector('[data-history] select').value);if(!await confirm('Restore server example to revision '+revision+'? Your workspace stays unchanged.'))return;await IDEAccount.request('/api/admin/examples/'+source.id+'/restore',{revision,expectedRevision:source.revision});if(adapter)await adapter.remember(null);else {current=null;await saveCodeToLocal();}NotifyS('Example restored on server. Reopen it from Examples to edit.');close(true);}catch(e){status.textContent=e.message;}finally{if(!finished)lock(false);}};
  });
 }
 async function rememberSource(entry){current={...entry,server:await IDEAccount.url('')};await saveCodeToLocal();}
 async function restoreSource(entry){
  current=null;
  if(!entry||typeof entry.id!=='string'||entry.board!==boardId)return;
  if(entry.server!==await IDEAccount.url(''))return;
  current={...entry};
 }
 window.ProjectExamples={chooseSave,restoreSource,clearSource(){current=null;},get current(){return current;}};
})();
