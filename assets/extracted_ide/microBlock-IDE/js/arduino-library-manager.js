window.createArduinoLibraryManager=function({api,bridge,setBusy}){
 const dialog=document.getElementById('library-dialog'),$=id=>id==='library-dialog'?dialog:dialog.querySelector('#'+id);let host;let libraries=[],working=false,limit=40;
 const text=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;};
 function render(){
  const query=$('query').value.toLowerCase().trim(),filter=$('library-filter').value,category=$('library-category').value;
  const matches=libraries.filter(l=>(!query||(l.name+' '+l.author+' '+l.description).toLowerCase().includes(query))&&(!category||l.category===category)&&(filter!=='installed'||l.installed));
  $('library-count').textContent=matches.length.toLocaleString()+' libraries';$('library-results').replaceChildren();
  for(const lib of matches.slice(0,limit)){
   const card=text('article','','library-card'),heading=text('div','','library-heading');heading.append(text('h3',lib.name));
   if(lib.installed)heading.append(text('span',lib.bundled?'Included with board':'Installed · '+lib.installed,'library-badge'));
   card.append(heading,text('div',lib.author||'Community library','library-author'),text('p',(lib.description||'Arduino library').replace(/<[^>]*>/g,' ')));
   const row=text('div','','library-actions');row.append(text('span',lib.category,'library-category'));
   if(lib.versions.length){const versions=document.createElement('select');versions.setAttribute('aria-label','Version of '+lib.name);for(const v of lib.versions)versions.add(new Option(v,v));if(lib.versions.includes(lib.installed))versions.value=lib.installed;
    const install=text('button','Install','primary');const update=()=>{install.textContent=lib.installed===versions.value?'Installed':'Install';install.disabled=working||lib.installed===versions.value;};versions.onchange=update;update();versions.disabled=working;
    install.onclick=()=>run('Installing '+lib.name+'…',async()=>{await api('install-library',{name:lib.name,version:versions.value});await load(false);$('library-message').textContent=lib.name+' installed. Ready to use.';});row.append(versions,install);
   }
   card.append(row);$('library-results').append(card);
  }
  if(!matches.length)$('library-results').append(text('div',working?'Loading library catalog…':'No libraries found. Try another search or add a ZIP.','library-empty'));
  $('library-more').hidden=matches.length<=limit;$('library-more').disabled=working;
 }
 async function load(refresh){const result=await api('libraries',{refresh});libraries=result.libraries;await bridge.refreshExamples?.();$('library-message').textContent=result.warning||'Browse the catalog or add your own ZIP. Installed libraries work offline.';const selected=$('library-category').value;$('library-category').replaceChildren(new Option('All categories',''));for(const name of [...new Set(libraries.map(l=>l.category))].sort())$('library-category').add(new Option(name,name));$('library-category').value=selected;render();}
 async function run(message,fn){if(working)return;working=true;setBusy(true);$('library-message').textContent=message;dialog.querySelectorAll('button,select,input').forEach(e=>e.disabled=true);try{await fn();}catch(e){$('library-message').textContent=e.message;}finally{working=false;setBusy(false);dialog.querySelectorAll('button,select,input').forEach(e=>e.disabled=false);render();}}
 $('close-libraries').onclick=()=>host?.close();
 $('library-refresh').onclick=()=>run('Refreshing library catalog…',()=>load(true));
 $('library-zip').onclick=()=>run('Choose a library ZIP…',async()=>{const path=await bridge.selectLibraryZip();if(!path){$('library-message').textContent='ZIP installation canceled.';return;}$('library-message').textContent='Installing ZIP library…';await api('install-library-zip',{path});await load(false);$('library-message').textContent='ZIP library installed. Ready to include in your sketch.';});
 for(const id of ['query','library-filter','library-category'])$(id).addEventListener('input',()=>{limit=40;render();$('library-results').scrollTop=0;});
 $('library-more').onclick=()=>{limit+=40;render();};
 return {open(){host=bridge.openLibraries(dialog);run('Loading library catalog…',()=>load(false));}};
};
