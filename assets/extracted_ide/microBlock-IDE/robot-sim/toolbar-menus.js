(function(){
    'use strict';
    const toolbar=document.querySelector('.motor-sim-toolbar');if(!toolbar)return;
    const groups=[];
    function menuGroup(id,label,icon,entries,before){
        const group=document.createElement('div');group.className='sim-view-picker sim-action-picker';
        toolbar.insertBefore(group,before||null);
        const trigger=document.createElement('button');trigger.type='button';trigger.id=id;
        trigger.setAttribute('aria-label',label);trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
        trigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icon+'</svg><span class="sim-tool-tip" role="tooltip">'+label+'</span>';
        const menu=document.createElement('div');menu.className='sim-view-menu';menu.id=id+'-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label',label);trigger.setAttribute('aria-controls',menu.id);group.append(trigger,menu);
        const close=focus=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();};
        const items=[];
        entries.forEach(([node,text])=>{if(!node)return;node.textContent=text;node.removeAttribute('aria-describedby');node.removeAttribute('title');node.setAttribute('aria-label',text);node.setAttribute('role','menuitem');node.addEventListener('click',()=>close(true));menu.appendChild(node);items.push(node);});
        const open=()=>{groups.forEach(g=>g.close(false));toolbar.querySelectorAll('.sim-view-menu').forEach(m=>{if(m!==menu)m.hidden=true;});const view=document.getElementById('motor-sim-view');if(view)view.setAttribute('aria-expanded','false');menu.hidden=false;trigger.setAttribute('aria-expanded','true');const first=items.find(n=>!n.disabled&&!n.hidden);if(first)first.focus();};
        trigger.onclick=()=>menu.hidden?open():close(false);
        group.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(menu.hidden){open();return;}const enabled=items.filter(n=>!n.disabled&&!n.hidden),i=enabled.indexOf(group.ownerDocument.activeElement);if(enabled.length)enabled[(i+(e.key==='ArrowDown'?1:-1)+enabled.length)%enabled.length].focus();}});
        groups.push({group,close});
    }
    const assembly=document.getElementById('open-assembly-mode'),field=document.getElementById('motor-sim-edit-field');
    menuGroup('motor-sim-edit-actions','Edit','<path d="m15 4 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/>',[[assembly,'Assembly'],[field,'Field editor']],document.getElementById('motor-sim-popout'));
    const heading=document.querySelector('.sim-telemetry-heading');
    if(heading){const controls=document.createElement('span');controls.className='sim-board-buttons';controls.setAttribute('role','group');controls.setAttribute('aria-label','Board buttons');heading.insertBefore(controls,heading.querySelector('.sim-telemetry-state'));toolbar.querySelectorAll('button[aria-label^="Board button "]').forEach(node=>controls.appendChild(node));}
    let activeDocument=null;
    const outside=e=>groups.forEach(g=>{if(!g.group.contains(e.target))g.close(false);});
    function bind(){if(activeDocument)activeDocument.removeEventListener('pointerdown',outside);activeDocument=toolbar.ownerDocument;activeDocument.addEventListener('pointerdown',outside);groups.forEach(g=>g.close(false));}
    window.addEventListener('sim-viewport-moved',bind);bind();
})();
