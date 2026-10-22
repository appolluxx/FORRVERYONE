window.IDECodeTheme={options(monaco){monaco.editor.defineTheme('roboblocks-code',{base:'vs',inherit:true,rules:[{token:'comment',foreground:'718096',fontStyle:''},{token:'keyword',foreground:'7655AF'},{token:'keyword.control',foreground:'7655AF'},{token:'string',foreground:'237969'},{token:'string.escape',foreground:'A46729'},{token:'number',foreground:'AC5B32'},{token:'type',foreground:'167D91'},{token:'type.identifier',foreground:'167D91'},{token:'identifier',foreground:'33465C'},{token:'predefined',foreground:'2865AB'},{token:'delimiter',foreground:'66768A'},{token:'operators',foreground:'66768A'},{token:'operator',foreground:'66768A'},{token:'keyword.operator',foreground:'66768A'},{token:'annotation',foreground:'7655AF'}],colors:{'editor.background':'#FFFFFF','editor.foreground':'#30445B','editorLineNumber.foreground':'#A3B4C5','editorLineNumber.activeForeground':'#258BD3','editor.lineHighlightBackground':'#F2F8FE','editor.lineHighlightBorder':'#F2F8FE','editor.selectionBackground':'#D9EDFF','editor.inactiveSelectionBackground':'#EAF3FA','editorCursor.foreground':'#1999EF','editorIndentGuide.background':'#EAF0F6','editorIndentGuide.activeBackground':'#B7D7ED','editorWidget.border':'#DCE8F2','editorSuggestWidget.background':'#FFFFFF','editorSuggestWidget.border':'#DCE8F2','editorSuggestWidget.selectedBackground':'#E7F2FF','editorSuggestWidget.highlightForeground':'#1689D6','editorGutter.background':'#FFFFFF','scrollbarSlider.background':'#91A4B84D','scrollbarSlider.hoverBackground':'#748CA680','scrollbarSlider.activeBackground':'#5B789BB3','scrollbar.shadow':'#00000000'}});return {quickSuggestions:{other:true,comments:false,strings:false},quickSuggestionsDelay:120,suggestOnTriggerCharacters:true,tabCompletion:'on',acceptSuggestionOnEnter:'on',parameterHints:{enabled:true},wordBasedSuggestions:true,theme:'roboblocks-code',fontFamily:'Cascadia Code, Consolas, monospace',fontSize:14,lineHeight:24,padding:{top:18,bottom:18},cursorBlinking:'smooth',smoothScrolling:true,renderLineHighlight:'all',lineNumbersMinChars:3,minimap:{enabled:false},scrollBeyondLastLine:false,scrollbar:{verticalScrollbarSize:10,horizontalScrollbarSize:10,useShadows:false,verticalHasArrows:false,horizontalHasArrows:false},overviewRulerLanes:0,hideCursorInOverviewRuler:true,overviewRulerBorder:false};}};
// A shared preference for the Python editor and the inline Arduino workspace.
(function(){
 const key='roboblocks-code-theme';
 let selected='light',engine=null;
 try{selected=localStorage.getItem(key)==='dark'?'dark':'light';}catch(_){}
 function refresh(){
  const surface=document.getElementById('code-editor')||document.body;
  if(!surface)return;
  surface.dataset.codeTheme=selected;
  const button=surface.querySelector('.code-theme-switch');
  if(button){button.setAttribute('aria-checked',String(selected==='dark'));button.setAttribute('aria-label',selected==='dark'?'Dark theme. Switch to light':'Light theme. Switch to dark');}
  if(engine)engine.editor.setTheme(selected==='dark'?'roboblocks-code-dark':'roboblocks-code');
 }
 const original=window.IDECodeTheme.options;
 window.IDECodeTheme.options=function(monaco){
  engine=monaco;
  const options=original(monaco);
  monaco.editor.defineTheme('roboblocks-code-dark',{base:'vs-dark',inherit:true,rules:[
   {token:'comment',foreground:'8393A8'}, {token:'keyword',foreground:'C4A1ED'},
   {token:'string',foreground:'9BD5BB'}, {token:'string.escape',foreground:'E4BF87'},
   {token:'number',foreground:'E9B08E'}, {token:'type',foreground:'75CBD5'},
   {token:'type.identifier',foreground:'75CBD5'}, {token:'identifier',foreground:'D5DFED'},
   {token:'predefined',foreground:'91C6FF'}, {token:'delimiter',foreground:'A0AEC0'},
   {token:'operator',foreground:'A0AEC0'}, {token:'keyword.operator',foreground:'A0AEC0'}
  ],colors:{'editor.background':'#18212F','editor.foreground':'#D5DFED','editorGutter.background':'#18212F',
   'editorLineNumber.foreground':'#718198','editorLineNumber.activeForeground':'#91C6FF',
   'editor.lineHighlightBackground':'#202D40','editor.lineHighlightBorder':'#202D40',
   'editorCursor.foreground':'#91C6FF','editor.selectionBackground':'#345373',
   'editor.inactiveSelectionBackground':'#2A3C53','editorIndentGuide.background':'#2D3B4F',
   'editorIndentGuide.activeBackground':'#506784','editorWidget.background':'#202D40',
   'editorWidget.border':'#3B4E67','editorSuggestWidget.background':'#202D40',
   'editorSuggestWidget.foreground':'#D5DFED','editorSuggestWidget.border':'#3B4E67',
   'editorSuggestWidget.selectedBackground':'#304A68','editorSuggestWidget.highlightForeground':'#91C6FF',
   'scrollbarSlider.background':'#91A7C04D','scrollbarSlider.hoverBackground':'#A0B6D080','scrollbarSlider.activeBackground':'#ACC5E0B3','scrollbar.shadow':'#00000000'}});
  options.theme=selected==='dark'?'roboblocks-code-dark':'roboblocks-code';refresh();return options;
 };
 function init(){
  const header=document.querySelector('.code-header, .python-code-header');
  if(!header)return;
  const button=document.createElement('button');
  button.type='button';button.className='code-theme-switch';button.setAttribute('role','switch');
  button.innerHTML='<span class="theme-light">☀ Light</span><span class="theme-dark">☾ Dark</span>';
  button.addEventListener('click',()=>{selected=selected==='dark'?'light':'dark';try{localStorage.setItem(key,selected);}catch(_){}refresh();});
  header.append(button);refresh();
 }
 window.addEventListener('storage',event=>{if(event.key===key){selected=event.newValue==='dark'?'dark':'light';refresh();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
