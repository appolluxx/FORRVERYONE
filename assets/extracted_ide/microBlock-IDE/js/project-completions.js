(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.IDEProjectCompletions=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 // Mask comments and string bodies without changing source offsets or lines.
 function mask(source,language){
  const pattern=language==='python'?/#[^\n]*|'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g:/\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g;
  return source.replace(pattern,text=>text.replace(/[^\n]/g,' '));
 }
 function parameters(text){
  const result=[];let start=0,depth=0,quote='',escaped=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if('([{<'.includes(c))depth++;if(')]}>'.includes(c))depth--;if(c===','&&depth===0){result.push(text.slice(start,i).trim());start=i+1;}}
  const last=text.slice(start).trim();if(last&&last!=='void')result.push(last);return result.filter(Boolean);
 }
 function symbols(source,language,file){
  const clean=mask(source,language),result=[];
  const pattern=language==='python'?/^([ \t]*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/gm:/\b([A-Za-z_]\w*(?:::\w+)*(?:\s*<[^;{}\n]+>)?(?:[ \t]+[A-Za-z_]\w*)*[ \t*&]+)([A-Za-z_]\w*)\s*\(/g;
  let match;
  while((match=pattern.exec(clean))){
   if(language==='python'&&match[1].replace(/\n/g,'').length)continue; // No unrelated class or nested methods in global suggestions.
   if(language==='cpp'&&/\b(return|throw|new|delete|else)\b/.test(match[1]))continue;
   const open=pattern.lastIndex-1;let depth=1,end=open+1;
   while(end<clean.length&&depth){if(clean[end]==='(')depth++;if(clean[end]===')')depth--;end++;}
   if(depth)continue;
   const tail=clean.slice(end);if(language==='python'?!/^\s*(?:->[^\n:]+)?\s*:/.test(tail):!/^\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?[;{]/.test(tail))continue;
   const args=parameters(source.slice(open+1,end-1));
   result.push({name:match[2],params:args,file,signature:match[2]+'('+args.join(', ')+')'});
  }
  return result;
 }
 const arduinoGlobals=symbols(`
 void pinMode(int pin, int mode);
 void digitalWrite(int pin, int value);
 int digitalRead(int pin);
 int analogRead(int pin);
 void analogWrite(int pin, int value);
 void analogReadResolution(int bits);
 void delay(unsigned long ms);
 void delayMicroseconds(unsigned int us);
 unsigned long millis();
 unsigned long micros();
 unsigned long pulseIn(int pin, int state, unsigned long timeout=1000000);
 unsigned long pulseInLong(int pin, int state, unsigned long timeout=1000000);
 void tone(int pin, unsigned int frequency, unsigned long duration=0);
 void noTone(int pin);
 void attachInterrupt(int interrupt, void (*callback)(), int mode);
 void detachInterrupt(int interrupt);
 int digitalPinToInterrupt(int pin);
 void interrupts();
 void noInterrupts();
 long map(long value, long fromLow, long fromHigh, long toLow, long toHigh);
 long constrain(long value, long low, long high);
 long random(long max);
 long random(long min, long max);
 void randomSeed(unsigned long seed);
 int abs(int value);
 int min(int a, int b);
 int max(int a, int b);
 int bitRead(unsigned long value, int bit);
 void bitWrite(unsigned long value, int bit, int bitValue);
 void bitSet(unsigned long value, int bit);
 void bitClear(unsigned long value, int bit);
 byte highByte(unsigned int value);
 byte lowByte(unsigned int value);
 `,'cpp','Arduino API');
 const serialMethods=symbols(`
 void begin(unsigned long baud);
 void end();
 size_t print(value, int format=DEC);
 size_t println(value, int format=DEC);
 size_t println();
 int available();
 int availableForWrite();
 int read();
 int peek();
 size_t write(value);
 size_t write(const uint8_t *buffer, size_t size);
 void flush();
 String readString();
 String readStringUntil(char terminator);
 size_t readBytes(char *buffer, size_t length);
 size_t readBytesUntil(char terminator, char *buffer, size_t length);
 long parseInt();
 float parseFloat();
 void setTimeout(unsigned long timeout);
 `,'cpp','Arduino Serial API');
 const arduinoValues=['HIGH','LOW','INPUT','OUTPUT','INPUT_PULLUP','INPUT_PULLDOWN','LED_BUILTIN','RISING','FALLING','CHANGE','DEC','HEX','OCT','BIN','PI','Serial','Serial0','Serial1','Serial2'].map(name=>({name,params:[],file:'Arduino API',signature:name,value:true}));
 function register(monaco,language,getFiles){
  const cache=new Map();
  function entries(model){
   const files=getFiles(model),active=new Set(Object.keys(files)),all=[];
   for(const [file,text]of Object.entries(files)){let entry=cache.get(file);if(!entry||entry.text!==text){entry={text,items:symbols(text,language,file)};cache.set(file,entry);}all.push(...entry.items);}
   for(const file of cache.keys())if(!active.has(file))cache.delete(file);return language==='cpp'?all.concat(arduinoGlobals,arduinoValues):all;
  }
  function available(model,position){
   const before=model.getValue().slice(0,model.getOffsetAt(position));
   // Let the board API provider handle members, rather than suggesting globals.
   if(language==='cpp'&&/\bSerial[012]?\s*\.\s*\w*$/.test(before))return serialMethods;
   if(/[.>]\s*\w*$/.test(before))return [];
   const all=entries(model);if(language!=='python')return all;
   const imports=[...before.matchAll(/^\s*from\s+([\w.]+)\s+import\s+([^\n]+)/gm)];
   return all.filter(item=>item.file===getFiles.currentFile?.()||imports.some(m=>item.file.replace(/\.py$/,'').replace(/\//g,'.').endsWith(m[1])&&(m[2].trim()==='*'||m[2].split(',').some(n=>n.trim()===item.name))));
  }
  const completion={triggerCharacters:['.'],provideCompletionItems(model,position){
   const word=model.getWordUntilPosition(position),range={startLineNumber:position.lineNumber,endLineNumber:position.lineNumber,startColumn:word.startColumn,endColumn:word.endColumn};
   const seen=new Set(),suggestions=[];
   for(const item of available(model,position)){if(seen.has(item.name))continue;seen.add(item.name);
    if(item.value){suggestions.push({label:item.name,kind:monaco.languages.CompletionItemKind.Variable,detail:item.file,insertText:item.name,range});continue;}
    const next=model.getLineContent(position.lineNumber).slice(position.column-1),hasParen=/^\s*\(/.test(next);
    const required=item.params.filter(p=>!p.includes('=')&&p!=='/'&&p!=='*');
    const placeholders=required.map((p,i)=>{const name=language==='python'?p.replace(/^\*+/,'').split(':')[0].trim():(p.match(/([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?$/)?.[1]||'arg'+(i+1));return '${'+(i+1)+':'+name.replace(/[$}\\]/g,'')+'}';});
    suggestions.push({label:item.name,kind:monaco.languages.CompletionItemKind.Function,detail:item.signature+' — '+item.file,insertText:hasParen?item.name:item.name+'('+placeholders.join(', ')+')$0',insertTextRules:monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,range,sortText:'0_'+item.name,command:hasParen?undefined:{id:'editor.action.triggerParameterHints',title:'Parameters'}});
   }return {suggestions};
  }};
  const signature={signatureHelpTriggerCharacters:['(',','],provideSignatureHelp(model,position){
   const before=mask(model.getValue().slice(0,model.getOffsetAt(position)),language);let level=0,open=-1;
   for(let i=before.length-1;i>=0;i--){if(before[i]===')')level++;if(before[i]==='('){if(!level){open=i;break;}level--;}}
   if(open<0)return null;const call=before.slice(0,open),name=call.match(/\b([A-Za-z_]\w*)\s*$/)?.[1];
   const serial=language==='cpp'&&/\bSerial[012]?\s*\.\s*\w+\s*$/.test(call);
   if(!serial&&/[.>]\s*\w+\s*$/.test(call))return null;
   const found=(serial?serialMethods:entries(model)).filter(item=>item.name===name&&!item.value);if(!found.length)return null;
   const typed=before.slice(open+1),count=parameters(typed+'placeholder').length-1;
   return {value:{signatures:found.map(item=>({label:item.signature,documentation:item.file,parameters:item.params.map(p=>({label:p}))})),activeSignature:0,activeParameter:Math.max(0,Math.min(count,found[0].params.length-1))},dispose(){}};
  }};
  const disposables=[monaco.languages.registerCompletionItemProvider(language,completion),monaco.languages.registerSignatureHelpProvider(language,signature)];
  return {completion,signature,dispose(){disposables.forEach(d=>d.dispose());cache.clear();}};
 }
 function attach(monaco,editor,language){
  let ids=[],timer,suggestTimer;
  function paint(){
   const model=editor.getModel();if(!model)return;const clean=mask(model.getValue(),language),ranges=[];
   for(const match of clean.matchAll(/\b([A-Za-z_]\w*)\s*(?=\()/g)){
    if(/^(if|for|while|switch|catch|sizeof|return|with|except|assert)$/.test(match[1]))continue;
    const start=model.getPositionAt(match.index),end=model.getPositionAt(match.index+match[1].length);
    ranges.push({range:new monaco.Range(start.lineNumber,start.column,end.lineNumber,end.column),options:{inlineClassName:'ide-code-function'}});
   }
   ids=editor.deltaDecorations(ids,ranges);
  }
  const change=editor.onDidChangeModelContent(()=>{clearTimeout(timer);timer=setTimeout(paint,120);});paint();
  const typed=editor.onDidType(text=>{
   if(!/[A-Za-z_]$/.test(text))return;
   const model=editor.getModel(),position=editor.getPosition(),line=model.getLineContent(position.lineNumber),tokens=monaco.editor.tokenize(line,language)[0]||[];
   const token=tokens.filter(t=>t.offset<position.column-1).pop();if(token&&/comment|string/.test(token.type))return;
   clearTimeout(suggestTimer);
   if(model.getWordUntilPosition(position).word)suggestTimer=setTimeout(()=>{if(editor.hasTextFocus()&&editor.getModel()===model)editor.trigger('project-completion','editor.action.triggerSuggest',{});},120);
  });
  return {dispose(){clearTimeout(timer);clearTimeout(suggestTimer);change.dispose();typed.dispose();editor.deltaDecorations(ids,[]);}};
 }
 return {symbols,register,attach};
});
