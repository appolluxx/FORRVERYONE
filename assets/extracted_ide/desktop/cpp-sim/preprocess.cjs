'use strict';
// Arduino concatenates sketch tabs and declares free functions before use.
function mask(source){return source.replace(/R"([^ ()\\\t\r\n]{0,16})\([\s\S]*?\)\1"|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|^[ \t]*#[^\n]*(?:\\\n[^\n]*)*/gm,m=>m.replace(/[^\n]/g,' '));}
function preprocess(files){
 const names=['sketch.ino',...Object.keys(files).filter(n=>n.endsWith('.ino')&&n!=='sketch.ino').sort()];
 const sources=names.map(name=>({name,source:files[name].replace(/\r\n?/g,'\n')}));
 const declarations=[];
 for(const entry of sources){
  const clean=mask(entry.source);let depth=0,start=0;const edits=[];
  for(let i=0;i<clean.length;i++){
   if(clean[i]==='{'){
    if(depth===0){
     const head=clean.slice(start,i),match=/((?:(?:static|inline|constexpr|extern)\s+)*(?:[\w:<>]+[\s*&]+)+([A-Za-z_]\w*)\s*\(([^{};]*)\)\s*(?:noexcept\s*)?)$/.exec(head);
     if(match&&!/^(if|while|for|switch|catch)$/.test(match[2])){
      const offset=start+match.index,signature=entry.source.slice(offset,i).trim();
      declarations.push(signature+';');
      // Default arguments belong on the generated declaration only.
      const paramsStart=offset+match[1].indexOf('(')+1,paramsEnd=entry.source.lastIndexOf(')',i);
      let nesting=0,defaultStart=-1;
      for(let p=paramsStart;p<=paramsEnd;p++){
       const c=clean[p];if(nesting===0&&(c===','||p===paramsEnd)&&defaultStart>=0){edits.push([defaultStart,p]);defaultStart=-1;}
       if(c==='='&&nesting===0&&defaultStart<0)defaultStart=p;
       if('([{'.includes(c))nesting++;if(')]}'.includes(c))nesting--;
      }
     }
    }depth++;
   }else if(clean[i]==='}'){depth--;if(depth===0)start=i+1;}
   else if(clean[i]===';'&&depth===0)start=i+1;
  }
  for(const [a,b] of edits.reverse())entry.source=entry.source.slice(0,a)+entry.source.slice(a,b).replace(/[^\n]/g,' ')+entry.source.slice(b);
 }
 const includes=[...new Set(sources.flatMap(e=>e.source.match(/^\s*#\s*include[^\n]+/gm)||[]))].join('\n');
 return '#include <Arduino.h>\n'+includes+'\n'+declarations.join('\n')+'\n'+sources.map(e=>'#line 1 "'+e.name+'"\n'+e.source).join('\n');
}
module.exports={preprocess,mask};
