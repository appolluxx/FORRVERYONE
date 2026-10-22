(()=>{
 function install(win){const doc=win.document;if(doc.__touchSelectionGuard)return;doc.__touchSelectionGuard=true;
 const allowed='input,textarea:not(.xterm-helper-textarea),[contenteditable="true"],.monaco-editor,#terminal-serial-panel .xterm-rows';
 const region=node=>(node?.nodeType===1?node:node?.parentElement)?.closest(allowed);
 const style=doc.createElement('style');style.textContent='html,body,body *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,textarea,[contenteditable="true"],.monaco-editor,.monaco-editor *,#terminal-serial-panel .xterm-rows,#terminal-serial-panel .xterm-rows *{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}';doc.head.append(style);
 const tipSelectors='.action-tooltip,.sim-tool-tip,[role="tooltip"],[data-tippy-root],.blocklyTooltipDiv';
 const tipStyle=doc.createElement('style');tipStyle.textContent=tipSelectors.split(',').map(s=>'html[data-touch-ui="true"] '+s).join(',')+'{display:none!important;visibility:hidden!important}';doc.head.append(tipStyle);
 const titles=new Map();let lastTouch=0;
 function touchMode(value){doc.documentElement.dataset.touchUi=String(value);if(value){win.tippy?.hideAll?.({duration:0});}else{for(const [node,title]of titles)if(!node.hasAttribute('title'))node.setAttribute('title',title);titles.clear();}}
 touchMode(win.matchMedia('(hover: none), (pointer: coarse)').matches);
 let touch=false,owner=null;
 const begin=event=>{if(event.pointerType==='mouse'&&performance.now()-lastTouch<1000)return;touch=event.type==='touchstart'||event.pointerType==='touch';if(!touch){touchMode(false);return;}lastTouch=performance.now();touchMode(true);for(let node=event.target;node&&node!==doc;node=node.parentElement){if(node.hasAttribute?.('title')){titles.set(node,node.getAttribute('title'));node.removeAttribute('title');}}owner=region(event.target);if(owner?.classList.contains('xterm-rows')&&!event.target.textContent?.trim())owner=null;if(!owner)win.getSelection()?.removeAllRanges();};
 doc.addEventListener('pointerdown',begin,true);doc.addEventListener('touchstart',begin,{capture:true,passive:true});
 doc.addEventListener('selectstart',event=>{if(!region(event.target)||(touch&&(!owner||!owner.contains(event.target))))event.preventDefault();},true);
 doc.addEventListener('contextmenu',event=>{if(touch&&!region(event.target))event.preventDefault();},true);
 doc.addEventListener('selectionchange',()=>{if(!touch)return;const s=win.getSelection();if(!s||s.isCollapsed)return;if(!owner||!owner.contains(s.anchorNode)||!owner.contains(s.focusNode)||!s.toString().trim())s.removeAllRanges();});
 }
 window.installTouchSelectionGuard=install;install(window);
})();
