(function(){
    const field=document.getElementById('motor-sim-field'),follow=document.getElementById('motor-sim-follow');
    if(!field||!follow)return;
    field.hidden=true;follow.hidden=true;
    const assemblyIcon=document.querySelector('#open-assembly-mode svg');
    if(assemblyIcon)assemblyIcon.innerHTML='<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18a2.1 2.1 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.4l-3.4 3.4-3-3 3.4-3.4Z"/>';
    const group=document.createElement('div');group.className='sim-view-picker';
    field.parentNode.insertBefore(group,field);
    const button=document.createElement('button');button.type='button';button.id='motor-sim-view';
    button.setAttribute('aria-label','View');button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9"/></svg><span class="sim-tool-tip" role="tooltip">View</span>';
    group.appendChild(button);
    const menu=document.createElement('div');menu.className='sim-view-menu';menu.id='motor-sim-view-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Camera views');group.appendChild(menu);
    button.setAttribute('aria-controls',menu.id);
    const scene=()=>window.motorSimulation&&motorSimulation._debugScene;
    const items=[];
    function close(focus){menu.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();}
    [['perspective','3D perspective'],['top','Top'],['field','Full field'],['follow','Follow robot']].forEach(([id,label])=>{
        const item=document.createElement('button');item.type='button';item.textContent=label;item.dataset.view=id;item.setAttribute('role',id==='follow'?'menuitemcheckbox':'menuitem');menu.appendChild(item);items.push(item);
        item.onclick=()=>{const sim=scene();if(sim){if(id==='follow')sim.setCameraFollow(!sim.isCameraFollowing());else sim.setCameraView(id);}close(true);};
    });
    function open(){
        const sim=scene();if(!sim)return;
        items.forEach(item=>{item.disabled=item.dataset.view==='field'&&!sim.hasField();if(item.dataset.view==='follow')item.setAttribute('aria-checked',String(sim.isCameraFollowing()));});
        menu.hidden=false;button.setAttribute('aria-expanded','true');items[0].focus();
    }
    button.onclick=()=>menu.hidden?open():close(false);
    group.addEventListener('keydown',event=>{
        if(event.key==='Escape'){close(true);event.stopPropagation();}
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
            event.preventDefault();if(menu.hidden){open();return;}
            const enabled=items.filter(item=>!item.disabled),index=enabled.indexOf(menu.ownerDocument.activeElement);
            enabled[(index+(event.key==='ArrowDown'?1:-1)+enabled.length)%enabled.length].focus();
        }
    });
    let activeDocument=null;
    const outside=event=>{if(!group.contains(event.target))close(false);};
    function bindDocument(){
        if(activeDocument)activeDocument.removeEventListener('pointerdown',outside);
        activeDocument=group.ownerDocument;activeDocument.addEventListener('pointerdown',outside);close(false);
    }
    window.addEventListener('sim-viewport-moved',bindDocument);bindDocument();
})();
