(()=>{
 if(!window.isElectron&&typeof isElectron!=='undefined'&&!isElectron)return;
 if(typeof ipcRenderer==='undefined')return;
 const states=new Map();let host,manager,working=false;
 const api=(action,p={})=>ipcRenderer.invoke('arduino-request',action,{board:'atom-vx',...p});
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const mb=n=>(n/1000000).toFixed(1)+' MB';
 const detailText=s=>!s.total?'':s.unit==='percent'?Math.floor(s.received||0)+'%':s.unit==='files'?`${s.received} / ${s.total} files`:`${mb(s.received||0)} / ${mb(s.total)}`;
 const panel=el('section','','arduino-download-panel');panel.hidden=true;panel.setAttribute('popover','auto');panel.setAttribute('aria-label','Arduino downloads');
 const heading=el('div','','arduino-download-heading');heading.append(el('strong','Arduino downloads'));const hide=el('button','×');hide.setAttribute('aria-label','Hide downloads');hide.onclick=()=>{panel.hidePopover();panel.hidden=true;};heading.append(hide);panel.append(heading);
 const list=el('div','','arduino-download-list');list.setAttribute('aria-live','polite');panel.append(list);
 const entry=el('div','','offline-download-entry arduino-download-entry');entry.hidden=true;
 const launcher=el('button','','arduino-download-launcher');launcher.id='arduino-download-status';launcher.type='button';launcher.title='Arduino downloads';launcher.setAttribute('aria-label','Show Arduino downloads');launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','arduino-download-panel');
 launcher.innerHTML='<svg class="arduino-download-ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="arduino-ring-track" cx="18" cy="18" r="16"/><circle class="arduino-ring-progress" cx="18" cy="18" r="16" pathLength="100"/></svg><svg class="arduino-download-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m-4-4 4 4 4-4M5 17v3h14v-3"/></svg>';
 entry.append(launcher);document.getElementById('install-pwa').closest('ul').before(entry);document.body.append(panel);panel.id='arduino-download-panel';
 function position(){if(panel.hidden)return;const rect=launcher.getBoundingClientRect(),width=Math.min(340,innerWidth-24);panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right-width))+'px';panel.style.top=Math.max(8,Math.min(rect.bottom+8,innerHeight-panel.offsetHeight-12))+'px';}
 function closePanel(){if(panel.matches(':popover-open'))panel.hidePopover();panel.hidden=true;launcher.setAttribute('aria-expanded','false');}
 hide.onclick=closePanel;launcher.onclick=()=>{if(panel.hidden)showPanel();else closePanel();};
 panel.addEventListener('toggle',event=>{if(event.newState==='closed'&&!panel.matches(':popover-open')){panel.hidden=true;launcher.setAttribute('aria-expanded','false');}});
 const watchedDocuments=new WeakSet();
 function watchFrames(root=document){for(const frame of root.querySelectorAll('iframe')){try{const doc=frame.contentDocument;if(doc&&!watchedDocuments.has(doc)){watchedDocuments.add(doc);doc.addEventListener('pointerdown',closePanel,true);doc.addEventListener('load',()=>watchFrames(doc),true);watchFrames(doc);}}catch(_){}}}
 document.addEventListener('load',event=>{if(event.target?.tagName==='IFRAME')watchFrames();},true);
 window.addEventListener('blur',()=>{setTimeout(()=>{if(document.activeElement?.tagName==='IFRAME')closePanel();},0);});
 function showPanel(){watchFrames();const modal=[...document.querySelectorAll('dialog:modal')].at(-1),parent=modal||document.body;if(panel.parentElement!==parent)parent.append(panel);panel.hidden=false;if(!panel.matches(':popover-open'))panel.showPopover();launcher.setAttribute('aria-expanded','true');position();}
 document.addEventListener('pointerdown',event=>{if(!panel.contains(event.target)&&!launcher.contains(event.target))closePanel();},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){closePanel();launcher.focus();}});window.addEventListener('resize',position);
 new MutationObserver(()=>{if(!panel.isConnected){document.body.append(panel);if(!panel.hidden)showPanel();}}).observe(document.body,{childList:true});
 function renderDownloads(){
  list.replaceChildren();
  for(const s of states.values()){
   const row=el('article','','arduino-download-item');row.dataset.id=s.id;row.append(el('strong',s.title+(s.version?' '+s.version:'')));
   const labels={downloading:'Downloading',installing:'Installing',paused:'Paused',ready:'Ready for offline use',cancelled:'Download canceled',error:'Download failed'};
   row.append(el('span',s.message||labels[s.phase]||s.phase));
   if(['downloading','installing','paused'].includes(s.phase)){
    const bar=el('progress');bar.max=s.total||100;if(s.total)bar.value=s.received||0;bar.setAttribute('aria-label',s.title+' progress');row.append(bar);
    row.append(el('small',detailText(s)));
    if(!s.id.startsWith('core:')){const toggle=el('button','','arduino-download-toggle'),label=s.phase==='paused'?'Resume':'Pause';toggle.type='button';toggle.title=label;toggle.setAttribute('aria-label',label+' '+s.title);toggle.dataset.action=label.toLowerCase();toggle.innerHTML=s.phase==='paused'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';toggle.onclick=async()=>{toggle.disabled=true;try{await api(s.phase==='paused'?'resume-component':'pause-component',{id:s.id});}catch(error){row.append(el('span',error.message));}finally{toggle.disabled=false;}};row.append(toggle);}
   }
   if(['error','cancelled'].includes(s.phase)){const retry=el('button','Retry');retry.onclick=async()=>{retry.disabled=true;try{if(s.id.startsWith('core:')){const [id,version]=s.id.slice(5).split('@');await api('install-board',{id,version});}else await api('install-component',{id:s.id});}catch(error){row.append(el('span',error.message));}finally{retry.disabled=false;}};row.append(retry);}
   list.append(row);
  }
 }
 ipcRenderer.on('arduino-download-progress',(_,state)=>{
  const prior=states.get(state.id);
  states.set(state.id,state);const rows=[...states.values()],active=rows.filter(s=>['downloading','installing'].includes(s.phase)),paused=rows.some(s=>s.phase==='paused'),failed=rows.some(s=>['error','cancelled'].includes(s.phase));
  entry.hidden=!active.length&&!failed&&!paused;launcher.dataset.state=failed?'error':active.length?'downloading':paused?'paused':'ready';launcher.setAttribute('aria-busy',String(!!active.length));
  const current=active[0],display=current||rows.find(s=>s.phase==='paused'),percent=display?.total?Math.max(0,Math.min(100,Math.floor((display.received||0)/display.total*100))):0;
  launcher.style.setProperty('--download-percent',String(percent));
  launcher.classList.toggle('is-indeterminate',!!current&&!current.total);
  launcher.setAttribute('aria-label',current?`${current.phase==='installing'?'Installing':'Downloading'} ${current.title}${percent===null?'':': '+percent+'%'}`:failed?'Arduino download needs attention':paused?'Arduino download paused':'Ready for offline use');launcher.title=launcher.getAttribute('aria-label');
  // Keep the same control between pointerdown and click while progress arrives.
  const row=[...list.children].find(n=>n.dataset.id===state.id);
  if(row&&prior?.phase===state.phase){
   const bar=row.querySelector('progress');if(bar){bar.max=state.total||100;if(state.total)bar.value=state.received||0;else bar.removeAttribute('value');}
   const detail=row.querySelector('small');if(detail)detail.textContent=detailText(state);
   if(state.message)row.querySelector('span').textContent=state.message;
  }else renderDownloads();
  if(entry.hidden)closePanel();else position();
 });
 async function openBoards(){
  if(host&&!host.closed){host.focus();return;}
  manager=el('section','','arduino-board-manager');
  const top=el('header');const title=el('div');title.append(el('h2','Board Manager'),el('p','Install and manage Arduino board packages.'));top.append(title);
  const controls=el('div','','arduino-board-controls'),query=el('input');query.placeholder='Search boards';query.setAttribute('aria-label','Search boards');const refresh=el('button','Refresh');controls.append(query,refresh);
  const message=el('p','','arduino-board-message');message.setAttribute('role','status');const results=el('div','','arduino-board-results');
  manager.append(top,controls,message,results);document.body.append(manager);
  host=IDEToolWindows.open({id:'arduino-boards',title:'Board Manager',width:1280,height:800,content:manager,onClose(){manager.remove();host=null;}});
  let boardRows=[];
  const run=async fn=>{if(working)return;working=true;render();try{await fn();}catch(error){message.textContent=error.message;}finally{working=false;render();}};
  function render(){
   refresh.disabled=working;results.replaceChildren();
   for(const item of boardRows.filter(x=>x.id!=='esp32:esp32'&&(x.name+' '+x.boards.join(' ')).toLowerCase().includes(query.value.toLowerCase()))){
    const card=el('article','','arduino-board-card');card.append(el('h3',item.name),el('p',item.maintainer),el('p',item.id.startsWith('PTBOT')?item.boards.join(' · '):'ESP32 support for Build BOT and compatible boards'));
    if(item.installed.length)card.append(el('span','Installed: '+item.installed.join(', '),'arduino-board-installed'));
    const actions=el('div','','arduino-board-actions'),versions=el('select');versions.setAttribute('aria-label',item.name+' version');
    for(const v of [...new Set([...item.versions,...item.installed])])versions.add(new Option(v,v));versions.value=item.selected||item.versions[0];versions.disabled=working;
    const install=el('button'),remove=el('button','Remove');
    const update=()=>{const has=item.installed.includes(versions.value);install.textContent=has?(item.selected===versions.value?'Selected':'Use this version'):'Install';install.disabled=working||has&&item.selected===versions.value;remove.hidden=!has;remove.disabled=working;};versions.onchange=update;update();
    install.onclick=()=>run(async()=>{message.textContent='Installing '+item.name+' '+versions.value+'…';await api('install-board',{id:item.id,version:versions.value});await load(false);});
    remove.onclick=()=>run(async()=>{if(!await NotifyConfirm('Remove '+item.name+' '+versions.value+'?'))return;await api('remove-board',{id:item.id,version:versions.value});await load(false);});
    actions.append(versions,install,remove);card.append(actions);results.append(card);
   }
  }
  async function load(refreshIndex){message.textContent='Loading boards…';const catalog=await api('boards',{refresh:refreshIndex});boardRows=catalog.packages;message.textContent=catalog.warning||'Installed boards can be used offline. Refresh to check for new versions.';render();}
  query.oninput=render;refresh.onclick=()=>run(()=>load(true));await run(()=>load(false));
 }
 window.IDEArduinoDownloads={openBoards,show(state){if(state){states.set(state.id,{...state,phase:state.phase||'downloading'});renderDownloads();}entry.hidden=false;showPanel();}};
 // Register progress UI before starting downloads. Only the two common
 // tools are automatic; board packages remain a Board Manager choice.
 const autoInstall=ArduinoAutoInstall.create({api,isOnline:()=>navigator.onLine!==false,onError:error=>console.warn('Arduino tool preparation:',error.message)});
 ipcRenderer.on('arduino-download-progress',(_,state)=>{if(state.phase==='cancelled')autoInstall.cancel(state.id);});
 window.addEventListener('online',()=>autoInstall.run());
 const start=()=>setTimeout(()=>autoInstall.run(),1500);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
