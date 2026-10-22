(() => {
 'use strict';
 const stylesheet=new URL('../css/styled-select.css',document.currentScript.src).href;
 function install(win){
  const doc=win.document;if(doc.__ideSelectInstalled)return;doc.__ideSelectInstalled=true;
  const style=doc.createElement('link');style.rel='stylesheet';style.href=stylesheet;doc.head.append(style);
  let menu=null,source=null,active=-1,items=[],query='',queryTimer,sequence=0;
  function close(focus=false){sequence++;const previous=source;menu?.remove();menu=null;source=null;items=[];previous?.setAttribute('aria-expanded','false');if(focus&&previous?.isConnected)previous.focus();}
  function highlight(index){if(!items.length)return;active=(index+items.length)%items.length;items.forEach((node,i)=>node.classList.toggle('is-active',i===active));menu.setAttribute('aria-activedescendant',items[active].id);items[active].scrollIntoView({block:'nearest'});}
  function choose(index){const item=items[index];if(!item||!source)return;const select=source,changed=select.selectedIndex!==Number(item.dataset.index);select.selectedIndex=Number(item.dataset.index);close(true);if(changed){select.dispatchEvent(new win.Event('input',{bubbles:true}));select.dispatchEvent(new win.Event('change',{bubbles:true}));}}
  async function open(select){
   if(source===select){close(true);return;}close();const token=sequence;select.focus();
   try{await select.ideBeforeOpen?.();}catch(error){console.error(error);}
   if(token!==sequence||!select.isConnected||select.disabled)return;
   source=select;select.setAttribute('aria-expanded','true');menu=doc.createElement('div');menu.className='ide-select-menu';const singleLine=select.hasAttribute('data-single-line');if(singleLine){menu.classList.add('is-single-line');menu.style.width='max-content';}menu.setAttribute('popover','manual');menu.setAttribute('role','listbox');menu.setAttribute('aria-label',select.getAttribute('aria-label')||'Options');menu.tabIndex=-1;
   let group=null;
   [...select.options].forEach((option,index)=>{
    if(option.hidden)return;const parent=option.parentElement;
    if(parent.tagName==='OPTGROUP'&&group!==parent){group=parent;const title=doc.createElement('div');title.className='ide-select-group';title.textContent=parent.label;menu.append(title);}
    const row=doc.createElement('div');row.className='ide-select-option';row.textContent=option.label;row.dataset.index=index;row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.selected));row.id='ide-select-option-'+index;
    if(option.disabled||parent.disabled){row.setAttribute('aria-disabled','true');}else{const at=items.length;items.push(row);row.onpointermove=()=>highlight(at);row.onclick=()=>choose(at);}
    menu.append(row);
   });
   if(!menu.childElementCount){const empty=doc.createElement('div');empty.className='ide-select-empty';empty.textContent='No options available';menu.append(empty);}
   (select.closest('dialog[open]')||doc.body).append(menu);if(menu.showPopover)menu.showPopover();
   const rect=select.getBoundingClientRect(),contentWidth=singleLine?Math.ceil(menu.getBoundingClientRect().width):0,width=Math.min(Math.max(rect.width,190,contentWidth),win.innerWidth-16);menu.style.width=width+'px';menu.style.left=Math.max(8,Math.min(rect.left,win.innerWidth-width-8))+'px';
   const below=win.innerHeight-rect.bottom-8,above=rect.top-8,up=below<Math.min(menu.scrollHeight,280)&&above>below;menu.style.maxHeight=Math.max(40,Math.min(320,up?above:below))+'px';menu.style.top=(up?Math.max(8,rect.top-menu.getBoundingClientRect().height-5):rect.bottom+5)+'px';
   menu.focus();const selected=items.findIndex(row=>Number(row.dataset.index)===select.selectedIndex);highlight(Math.max(0,selected));
  }
  const target=e=>{const select=e.target.closest?.('select');return select&&!select.multiple&&select.size<=1&&!select.disabled?select:null;};
  doc.addEventListener('pointerdown',e=>{const select=target(e);if(select&&e.button===0){e.preventDefault();open(select);}else if(menu&&!menu.contains(e.target))close();},true);
  doc.addEventListener('keydown',e=>{
   if(!menu){const select=target(e);if(select&&['Enter',' ','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open(select);}return;}
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
   if(e.key==='Tab'){close(true);return;}
   if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){e.preventDefault();if(e.key==='Enter'||e.key===' ')choose(active);else highlight(e.key==='Home'?0:e.key==='End'?items.length-1:active+(e.key==='ArrowDown'?1:-1));return;}
   if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){query+=e.key.toLowerCase();clearTimeout(queryTimer);queryTimer=win.setTimeout(()=>query='',600);const found=items.findIndex(row=>row.textContent.toLowerCase().startsWith(query));if(found>=0)highlight(found);}
  },true);
  doc.addEventListener('scroll',e=>{if(menu&&!menu.contains(e.target))close();},true);win.addEventListener('resize',()=>close());win.addEventListener('blur',()=>close());
 }
 window.IDEStyledSelect={install};install(window);
})();
