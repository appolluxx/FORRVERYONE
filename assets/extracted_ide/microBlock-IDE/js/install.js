(() => {
    if (isElectron || isEmbed) return;
    const entry=document.getElementById('install-pwa');
    const tablet=/iPad|Tablet/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)||(/Android/i.test(navigator.userAgent)&&!/Mobile/i.test(navigator.userAgent));
    const mobile=navigator.userAgentData?.mobile||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const windows=!mobile&&/Windows/i.test(navigator.userAgent);
    const media=matchMedia('(display-mode: standalone)');
    const installed=()=>media.matches||navigator.standalone===true;
    let prompt=null,registration=null,setupJob=null;
    let ready=false,downloading=false,attempted=false,failed=false,percent=0;
    const label=windows?'Download for Windows':'Install web app';
    entry.style.display=tablet?'none':'';entry.setAttribute('aria-label',label);
    if(entry._tippy){entry.removeAttribute('title');entry._tippy.setContent(label);}else entry.title=label;
    entry.querySelector('span').textContent=windows?'Download':'Install';
    const item=document.createElement('li');item.className='offline-download-entry';item.hidden=true;
    const button=document.createElement('button');button.id='offline-download-status';button.type='button';
    button.setAttribute('aria-label','Offline setup');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','offline-download-panel');
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m-4-4 4 4 4-4M5 17v3h14v-3"/></svg>';
    item.appendChild(button);entry.closest('li').after(item);
    const panel=document.createElement('section');panel.id='offline-download-panel';panel.className='offline-download-panel';panel.hidden=true;
    panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','offline-download-title');
    panel.innerHTML='<header><strong id="offline-download-title">Offline files</strong><button class="offline-panel-close" aria-label="Close offline progress" type="button">&times;</button></header><p class="offline-download-summary">Preparing offline setup...</p><progress max="100" value="0" aria-label="Offline download progress"></progress><p class="offline-download-detail" role="status" aria-live="polite">Checking offline availability...</p><button id="retry-offline-download" type="button" hidden>Retry</button><p class="offline-download-note">Keep the app open until the download finishes. You can continue working.</p>';
    document.body.appendChild(panel);
    const summary=panel.querySelector('.offline-download-summary'),detail=panel.querySelector('.offline-download-detail');
    const progress=panel.querySelector('progress'),retry=panel.querySelector('#retry-offline-download');
    function position(){
        if(panel.hidden)return;
        const rect=button.getBoundingClientRect(),width=Math.min(340,innerWidth-24);
        panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right-width))+'px';
        panel.style.top=Math.max(8,Math.min(rect.bottom+8,innerHeight-panel.offsetHeight-12))+'px';
    }
    function closePanel(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
    button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));position();};
    panel.querySelector('.offline-panel-close').onclick=closePanel;
    document.addEventListener('pointerdown',event=>{if(!panel.contains(event.target)&&!button.contains(event.target))closePanel();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){closePanel();button.focus();}});
    window.addEventListener('resize',position);
    function sync(){
        item.hidden=!installed()||(ready&&!downloading&&!failed);if(item.hidden)closePanel();
        button.dataset.state=failed?'error':downloading?'downloading':ready?'ready':'checking';
        button.setAttribute('aria-label',failed?'Offline download needs attention':downloading?`Downloading offline files: ${percent}%`:ready?'Ready for offline use':'Checking offline files');
        button.setAttribute('aria-busy',String(downloading));progress.value=percent;progress.hidden=ready||failed;
        retry.hidden=!failed;retry.disabled=downloading;
        summary.textContent=failed?'Download interrupted':downloading?`Downloading · ${percent}%`:ready?'Ready for offline use':'Preparing offline setup';
        position();
    }
    function worker(){return registration?.active||navigator.serviceWorker?.controller;}
    function check(){if(installed()&&worker()){worker().postMessage({type:'PWA_CLIENT'});worker().postMessage({type:'OFFLINE_STATUS',installed:true});}}
    async function download(){
        if(!installed()||!worker()||downloading)return;
        attempted=true;downloading=true;ready=false;failed=false;percent=0;
        detail.textContent='Downloading app, boards, models and Python SIM.';sync();
        try{await navigator.storage?.persist?.();}catch(_){}
        worker().postMessage({type:'RUN_PRECACHE',installed:true});
    }
    function autoDownload(){if(installed()&&!ready&&!downloading&&!attempted&&registration&&navigator.onLine!==false)download();}
    retry.onclick=()=>registration?download():setup();
    async function setup(){
        if(!installed()||setupJob)return setupJob;
        if(!isSecureContext||!('serviceWorker' in navigator)){
            failed=true;detail.textContent='Offline setup requires HTTPS and Service Worker support.';sync();return;
        }
        setupJob=(async()=>{
            const reg=await navigator.serviceWorker.register('/service-worker.js');
            registration=await navigator.serviceWorker.ready;check();
            reg.addEventListener('updatefound',()=>{const next=reg.installing;next?.addEventListener('statechange',()=>{
                if(next.state==='installed'&&reg.waiting){detail.textContent='Update available. Close all app windows and reopen to prepare the new offline files.';sync();}
            });});
        })().catch(error=>{failed=true;detail.textContent='Offline setup failed: '+error.message;sync();}).finally(()=>{setupJob=null;});
        return setupJob;
    }
    entry.onclick=async()=>{
        if(windows){const link=document.createElement('a');link.href='https://pt-robotics.com/files/roboblocks/roboBlocks-IDE-latest.exe';link.click();return;}
        if(prompt){const event=prompt;prompt=null;await event.prompt();await event.userChoice;}
        else if(typeof NotifyI==='function')NotifyI('Use your browser menu to add roboBlocks to your Home Screen.');
    };
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;});
    // Installation in a browser tab does not download files. First PWA launch does.
    window.addEventListener('appinstalled',()=>{prompt=null;if(installed()){sync();setup();}});
    const changed=()=>{sync();if(installed())setup();};
    if(media.addEventListener)media.addEventListener('change',changed);else media.addListener?.(changed);
    window.addEventListener('online',()=>{attempted=false;if(installed()){if(registration)check();else setup();}});
    navigator.serviceWorker?.addEventListener('controllerchange',check);
    navigator.serviceWorker?.addEventListener('message',event=>{
        if(!installed())return;
        const msg=event.data||{};
        if(msg.type==='PRECACHE_START'){downloading=true;ready=false;failed=false;detail.textContent='Downloading offline files...';}
        if(msg.type==='PRECACHE_PROGRESS'){downloading=true;failed=false;percent=msg.percent;detail.textContent=`${msg.done} of ${msg.total} files saved`;}
        if(msg.type==='PRECACHE_DONE'){downloading=false;ready=true;failed=false;percent=100;detail.textContent='Offline files are ready. New extensions and updates still need internet.';}
        if(msg.type==='PRECACHE_ERROR'){downloading=false;ready=false;failed=true;detail.textContent=msg.message+' Reconnect or free storage, then retry.';}
        if(msg.type==='OFFLINE_STATUS'){ready=msg.ready;if(ready)failed=false;if(!downloading)detail.textContent=ready?'Offline files are ready.':`App and simulation files${msg.bytes?' · '+Math.ceil(msg.bytes/1024/1024)+' MB':''}`;autoDownload();}
        sync();
    });
    sync();
    if(installed())setup();
    else if(isSecureContext&&navigator.serviceWorker?.getRegistration){
        // Upgrade a legacy worker without creating a new browser installation
        // or deleting the cache shared with an installed PWA.
        navigator.serviceWorker.getRegistration('/').then(reg=>reg?.update()).catch(()=>{});
    }
})();
