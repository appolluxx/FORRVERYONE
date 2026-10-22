(function () {
    'use strict';
    const windows = new Map();
    const dock = document.createElement('nav');
    dock.className = 'ide-tool-dock';dock.setAttribute('aria-label', 'Minimized windows');
    document.body.appendChild(dock);
    const icon = name => ({minimize:'M4 17h16', maximize:'M5 5h14v14H5z',
        restore:'M8 5V3h13v13h-2M3 8h13v13H3z', close:'m6 6 12 12M18 6 6 18'})[name];
    function openNative(options){
        const child=window.open(options.url||'about:blank','roboblocks-tool-'+options.id,
            'width='+(options.width||1280)+',height='+(options.height||820)+',resizable='+(options.resizable===false?'no':'yes'));
        if(!child)return null;
        let cleaned=false;
        const cleanup=()=>{if(cleaned)return;cleaned=true;windows.delete(options.id);options.onClose?.();};
        const api={focus:()=>child.focus(),close:()=>child.close(),get closed(){return child.closed;},
            get document(){return child.document;},get window(){return child;},
            addEventListener:(...args)=>child.addEventListener(...args),
            get ResizeObserver(){return child.ResizeObserver;},getComputedStyle:node=>child.getComputedStyle(node),
            matchMedia:query=>child.matchMedia(query),setTimeout:(fn,delay)=>child.setTimeout(fn,delay)};
        windows.set(options.id,api);
        const ready=()=>{try{window.installTouchSelectionGuard?.(child);window.IDEStyledSelect?.install(child);}catch(_){}child.document.title=options.title;child.addEventListener('beforeunload',cleanup,{once:true});options.onLoad?.(api);};
        child.addEventListener('resize',()=>options.onResize?.());
        if(options.url)child.addEventListener('load',ready,{once:true});else ready();
        return api;
    }
    function open(options) {
        const existing = windows.get(options.id);
        if (existing && !existing.closed) {existing.focus();return existing;}
        // Content-backed dialogs depend on their existing IDE document.
        // Independent tool documents use native chrome in the desktop app.
        if(typeof isElectron!=='undefined'&&isElectron&&!options.content&&options.id!=='assembly')return openNative(options);
        const previousFocus = document.activeElement;
        const dialog = document.createElement('dialog');dialog.className='ide-tool-window';dialog.dataset.toolWindow=options.id;
        const header = document.createElement('header');header.className='ide-tool-titlebar';
        const logo = document.createElement('img');logo.src=new URL('favicon.ico',document.baseURI).href;logo.alt='';
        const title = document.createElement('strong');title.id='ide-tool-title-'+options.id;title.textContent=options.title;
        dialog.setAttribute('aria-labelledby',title.id);
        const controls = document.createElement('div');controls.className='ide-tool-controls';
        const buttons = {};
        ['minimize','maximize','close'].forEach(action=>{
            const button=document.createElement('button');button.type='button';button.dataset.action=action;
            button.setAttribute('aria-label',action[0].toUpperCase()+action.slice(1)+' '+options.title);
            button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+icon(action)+'"/></svg>';
            controls.appendChild(button);buttons[action]=button;
        });
        header.append(logo,title,controls);
        const frame=document.createElement(options.content?'div':'iframe');frame.className='ide-tool-frame';frame.title=options.title;if(options.content){frame.classList.add('ide-tool-content');frame.appendChild(options.content);}
        const grip=document.createElement('div');grip.className='ide-tool-resize';grip.setAttribute('aria-hidden','true');
        if(options.resizable===false){grip.style.display='none';buttons.maximize.style.display='none';}
        dialog.append(header,frame,grip);document.body.appendChild(dialog);
        let closed=false,minimized=false,maximized=false,task=null,gesture=null;
        let bounds={width:Math.min(options.width||1280,innerWidth-24),height:Math.min(options.height||820,innerHeight-24)};
        bounds.left=Math.max(0,(innerWidth-bounds.width)/2);bounds.top=Math.max(0,(innerHeight-bounds.height)/2);
        const listeners=new Map();
        const emit=(type)=>{
            for(const fn of listeners.get(type)||[])try{fn(new Event(type));}catch(error){console.error(error);}
        };
        function fit(){
            const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
            bounds.width=Math.min(Math.max(Math.min(560,width),bounds.width),width);
            bounds.height=Math.min(Math.max(Math.min(320,height),bounds.height),height);
            bounds.left=Math.max(0,Math.min(bounds.left,width-bounds.width));
            bounds.top=Math.max(0,Math.min(bounds.top,height-bounds.height));
            const b=maximized?{left:0,top:0,width,height}:bounds;
            for(const key of ['left','top','width','height'])dialog.style[key]=b[key]+'px';
        }
        function resized(){
            if(closed)return;
            fit();options.onResize?.();
        }
        function focus(){
            if(closed)return;
            minimized=false;task?.remove();task=null;
            if(!dialog.open)dialog.showModal();
            fit();frame.contentWindow?.focus();options.onResize?.();
        }
        function stopGesture(){
            gesture=null;dialog.classList.remove('is-adjusting');
        }
        function close(){
            if(closed)return;
            stopGesture();
            // Run lifecycle cleanup before detaching a live SIM canvas or editor.
            emit('beforeunload');
            try{if(!options.content)frame.contentWindow.dispatchEvent(new frame.contentWindow.Event('beforeunload'));}catch(_){}
            closed=true;windows.delete(options.id);task?.remove();observer.disconnect();
            window.removeEventListener('resize',resized);window.visualViewport?.removeEventListener('resize',resized);
            options.onClose?.();
            dialog.close();dialog.remove();listeners.clear();
            if(previousFocus?.isConnected)previousFocus.focus();
        }
        function minimize(){
            if(closed||minimized)return;
            stopGesture();emit('blur');minimized=true;dialog.close();
            task=document.createElement('div');task.className='ide-tool-task';task.dataset.toolTask=options.id;
            const restore=document.createElement('button');restore.type='button';restore.textContent=options.title;restore.setAttribute('aria-label','Restore '+options.title);restore.onclick=focus;
            const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='×';dismiss.setAttribute('aria-label','Close '+options.title);dismiss.onclick=close;
            task.append(restore,dismiss);dock.appendChild(task);options.onResize?.();
        }
        function maximize(){
            if(options.resizable===false)return;
            maximized=!maximized;dialog.classList.toggle('is-maximized',maximized);
            buttons.maximize.setAttribute('aria-label',(maximized?'Restore ':'Maximize ')+options.title);
            buttons.maximize.querySelector('path').setAttribute('d',icon(maximized?'restore':'maximize'));resized();
        }
        buttons.close.onclick=close;buttons.minimize.onclick=minimize;buttons.maximize.onclick=maximize;
        header.addEventListener('dblclick',event=>{if(!event.target.closest('button'))maximize();});
        dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
        function start(event,resize){
            if(resize&&options.resizable===false)return;
            if(event.button!==0||maximized||(!resize&&event.target.closest('button')))return;
            event.preventDefault();gesture={id:event.pointerId,x:event.clientX,y:event.clientY,resize,bounds:{...bounds}};
            event.currentTarget.setPointerCapture(event.pointerId);dialog.classList.add('is-adjusting');
        }
        header.addEventListener('pointerdown',event=>start(event,false));grip.addEventListener('pointerdown',event=>start(event,true));
        dialog.addEventListener('pointermove',event=>{
            if(!gesture||event.pointerId!==gesture.id)return;
            const x=event.clientX-gesture.x,y=event.clientY-gesture.y,b=gesture.bounds;
            if(gesture.resize){bounds.width=b.width+x;bounds.height=b.height+y;}
            else{bounds.left=b.left+x;bounds.top=b.top+y;}
            resized();
        });
        ['pointerup','pointercancel','lostpointercapture'].forEach(type=>dialog.addEventListener(type,stopGesture));
        const observer=new ResizeObserver(()=>options.onResize?.());observer.observe(frame);
        window.addEventListener('resize',resized);window.visualViewport?.addEventListener('resize',resized);
        const api={element:dialog,frame,focus,close,minimize,maximize,
            get closed(){return closed;},get minimized(){return minimized;},get maximized(){return maximized;},
            get document(){return options.content?document:frame.contentDocument;},get window(){return options.content?window:frame.contentWindow;},
            addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
            get ResizeObserver(){return (frame.contentWindow||window).ResizeObserver;},
            getComputedStyle(node){return (frame.contentWindow||window).getComputedStyle(node);},
            matchMedia(query){return (frame.contentWindow||window).matchMedia(query);},
            setTimeout(fn,delay){return (frame.contentWindow||window).setTimeout(fn,delay);}
        };
        windows.set(options.id,api);
        const forwardBlur=()=>emit('blur');
        function bindFrameEvents(){
            if(options.content)return;
            frame.contentWindow.removeEventListener('blur',forwardBlur);
            frame.contentWindow.addEventListener('blur',forwardBlur);
        }
        bindFrameEvents();
        frame.addEventListener('load',()=>{if(!closed){try{window.installTouchSelectionGuard?.(frame.contentWindow);window.IDEStyledSelect?.install(frame.contentWindow);}catch(_){}bindFrameEvents();options.onLoad?.(api);options.onResize?.();}});
        if(options.url)frame.src=options.url;
        focus();return api;
    }
    window.IDEToolWindows={open,get:id=>windows.get(id),closeAll(){for(const item of [...windows.values()])item.close();}};
    window.addEventListener('beforeunload',()=>window.IDEToolWindows.closeAll());
})();
