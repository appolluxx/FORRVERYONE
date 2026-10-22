(() => {
 if (!isElectron) return;
 let frame=null,context=null,savingFile=false,libraryExamples=[],examplesError='',openingExample=false;
 const recoveryKey='roboblocks-active-arduino';
 const remember=()=>localStorage.setItem(recoveryKey,JSON.stringify(context));
 const child=()=>frame?.contentWindow?.ArduinoWorkspace;
 const prepareLeave=async()=>{if(frame){if(!child())throw Error('Wait for the Arduino editor to load.');await child().prepareLeave();}};
 const fingerprint=(files,name)=>window.nodeRequire('node:crypto').createHash('sha256').update(JSON.stringify([name,Object.keys(files).sort().map(key=>[key,files[key]])])).digest('hex');
 let selectingPort=null,prepareTimer=null,simRequestId=0;
 let monitorInput=null,monitorSuspended=false,lastMonitorError='',uploadConnection=null;
 const monitor=window.nodeRequire(path.join(remote.app.getAppPath(),'desktop/arduino-serial-monitor.cjs'))({
  SerialPort:serialAPI.SerialPort,
  output(text){ensureTerminal();term.write(text);},
  changed(){showArduinoPort(false);},
  error(error){NotifyE('Serial: '+error.message);}
 });
 async function connectMonitor(resumeUpload=false){
  if(!context?.port||(monitorSuspended&&!resumeUpload))return;
  ensureTerminal();monitorInput?.dispose();monitorInput=term.onData(text=>monitor.write(text));
  try{await monitor.open(context.port);lastMonitorError='';}
  catch(error){if(lastMonitorError!==error.message){lastMonitorError=error.message;NotifyE('Serial: '+error.message);}throw error;}
 }
 const simProgress=new Map();
 function prepareSim(){
  clearTimeout(prepareTimer);
  if(boards.find(board=>board.id===context?.board)?.simSupported===false)return;
  prepareTimer=setTimeout(()=>{
   const workspace=child();if(!context||!workspace?.peekFiles)return;
   const files=workspace.peekFiles();if(!files)return;
   ipcRenderer.invoke('arduino-request','compile-sim',{...context,files,background:true,jobId:'prepare-'+(++simRequestId)}).catch(()=>{});
  },1200);
 }
 ipcRenderer.on('arduino-sim-progress',(_,progress)=>simProgress.get(progress.jobId)?.(progress.phase));

 let portCheckPending=false,verifiedContext=null,verifiedPort=null,portPresent=false;
 async function refreshArduinoPort(){
  if(!context||!context.port||portCheckPending)return;
  const original=context,port=context.port;portCheckPending=true;
  try{
   const result=await ipcRenderer.invoke('arduino-request','ports',{board:original.board});
   if(context!==original||context.port!==port)return;
   verifiedContext=original;verifiedPort=port;
   portPresent=result.detected_ports.some(row=>row.port.address===port);
   if(portPresent&&!monitorSuspended&&monitor.path!==port)await connectMonitor();
  }catch(_){
   if(context===original&&context.port===port){verifiedContext=original;verifiedPort=port;portPresent=false;}
  }finally{portCheckPending=false;if(context===original)showArduinoPort(false);}
 }
 setInterval(()=>{if(frame)refreshArduinoPort();},1500);
 window.addEventListener('focus',()=>{if(frame)refreshArduinoPort();});
 function showArduinoPort(check=true){
  if(!context)return;
  const uploading=monitorSuspended&&uploadConnection?.context===context&&uploadConnection?.port===context.port;
  const ready=verifiedContext===context&&verifiedPort===context.port&&portPresent&&(monitor.path===context.port||uploading);
  $('#connect-device').show().toggleClass('arduino-port-ready',ready)
   .attr('aria-pressed',String(ready)).attr('title',context.port?'Serial / Upload: '+context.port+' - change port':'Connect serial port');
  $('#disconnect-device').hide();
  const text=context.port?(ready?'Connected: ':'Not connected: ')+context.port:'Select serial port';
  $('#header-board-connection-status').text(text).attr('title',text);
  if(check)refreshArduinoPort();
 }
 async function selectArduinoPort(){
  if(selectingPort)return selectingPort;
  const original=context;
  selectingPort=(async()=>{try{const port=await showPortSelect({usbOnly:true});if(context!==original)return null;context.port=port;remember();showArduinoPort();return port;}catch(error){if(error!=='cancel'&&error!=='not_select')NotifyE(String(error?.message||error));return null;}finally{selectingPort=null;}})();
  return selectingPort;
 }
 window.IDEArduino={
  get active(){return !!frame;},
  async rememberExample(entry){context.exampleSource=entry?{...entry,server:await IDEAccount.url('')}:null;remember();},
  prepareSim,
  async compileForSim(onProgress=()=>{}){
   if(!child())throw Error('Wait for the Arduino editor to load.');
   clearTimeout(prepareTimer);
   if(boards.find(board=>board.id===context?.board)?.simSupported===false)throw Error('SIM is not available for this board yet. Use Verify or Upload.');
   const original=context,snapshot=await child().snapshot(),jobId='run-'+(++simRequestId);
   simProgress.set(jobId,onProgress);
   let waitingForCompiler=false,lastToolPhase='';
   const reportTool=state=>{
    if(!waitingForCompiler||state.id!=='cpp-sim')return;
    const phase=state.phase||'downloading';if(phase===lastToolPhase)return;lastToolPhase=phase;
    const messages={paused:'C++ SIM compiler download is paused. Click Resume in the top bar to continue.',installing:'Installing C++ SIM compiler. SIM will start when it is ready.',ready:'C++ SIM compiler is ready. Preparing simulation...',downloading:'Downloading C++ SIM compiler. Please wait; progress is available in the top bar.',error:'C++ SIM compiler installation failed. Check downloads in the top bar.',cancelled:'C++ SIM compiler download was canceled. Retry from the top bar.'};
    onProgress(messages[phase]||messages.downloading);
   };
   const toolProgress=(_,state)=>reportTool(state);
   try{
    onProgress('Preparing code');
    const tools=await ipcRenderer.invoke('arduino-request','components',{board:original.board});
    const compiler=tools.find(tool=>tool.id==='cpp-sim');
    if(!compiler?.installed){
     waitingForCompiler=true;ipcRenderer.on('arduino-download-progress',toolProgress);reportTool(compiler||{id:'cpp-sim'});
     window.IDEArduinoDownloads?.show(compiler||{id:'cpp-sim',title:'C++ SIM compiler'});
     await ipcRenderer.invoke('arduino-request','install-component',{board:original.board,id:'cpp-sim'});
     waitingForCompiler=false;
     if(context!==original)throw Error('The Arduino project changed during SIM preparation.');
    }
    const result=await ipcRenderer.invoke('arduino-request','compile-sim',{...original,files:snapshot.files,jobId});
    if(context!==original)throw Error('The Arduino project changed during SIM compilation.');
    if(fingerprint(child()?.peekFiles()||{},original.board)!==fingerprint(snapshot.files,original.board))throw Error('Code changed during compilation. Press Run again to use the latest code.');
    return result;
   }finally{waitingForCompiler=false;ipcRenderer.removeListener('arduino-download-progress',toolProgress);simProgress.delete(jobId);}
  },
  prepareLeave,
  async mount(project,simulation={}){
   await prepareLeave();
   await monitor.close();monitorInput?.dispose();monitorInput=null;
   window.motorSimulation?.stop();
   if(simulation.resetSimulation){
    const meta=simulation.meta||null;
    await window.ProjectGeometry.restore(meta);
    delete vFSTree['assembly.json'];delete vFSTree['/assembly.json'];
    delete vFSTree['assembly-before-equipment-update.json'];delete vFSTree['/assembly-before-equipment-update.json'];
    if(meta?.assembly)vFSTree['assembly.json']=JSON.stringify(meta.assembly);
    // Clear the previous robot before loading the newly selected board.
    const restoredMeta=meta?{...meta}:null;if(restoredMeta)delete restoredMeta.importedGeometry;
    applyProjectMeta(restoredMeta);
   }
   if(boardId!==project.board){
    const nextBoard=boards.find(board=>board.id===project.board);
    if(!nextBoard)throw Error('Unsupported Arduino board.');
    const previousBoard=boards.find(board=>board.id===boardId);
    if(typeof previousBoard?.onDispose==='function')await previousBoard.onDispose(blocklyWorkspace,previousBoard);
    boardId=project.board;boardIdSelect=project.board;levelName=nextBoard.level[0].name;
    await loadBoard();
   }
   window.IDEToolWindows.get('arduino-libraries')?.close();frame?.remove();context=project;
   document.body.classList.add('arduino-workspace-active');
   frame=document.createElement('iframe');frame.id='arduino-inline-workspace';frame.title='Arduino C++ workspace';
   frame.src='arduino-editor.html?'+new URLSearchParams(project);
   document.querySelector('article.main').append(frame);
   window.dispatchEvent(new Event('ide-program-language-changed'));
   $('#project-name').val(context.name||'Arduino project');
   showArduinoPort();
   if(simulation.resetSimulation)await window.motorSimulation?.reloadBoard();
   remember();$('#project-create-dialog').hide();await refreshExamples();
  },
  async leave(){
   await prepareLeave();await monitor.close();monitorInput?.dispose();monitorInput=null;window.IDEToolWindows.get('arduino-libraries')?.close();frame?.remove();frame=null;context=null;
   verifiedContext=null;verifiedPort=null;portPresent=false;
   $('#connect-device').removeClass('arduino-port-ready').removeAttr('aria-pressed').attr('title','Connect');
   document.body.classList.remove('arduino-workspace-active');
   window.dispatchEvent(new Event('ide-program-language-changed'));
   localStorage.removeItem(recoveryKey);
   window.restoreArduinoConnection?.();
   updateHeaderBoardConnectionIndicator(!!currentTransport);
   Blockly.triggleResize();editor?.layout();
  },
  async command(id){
   try {
    if(id==='open'){await openProject();return;}
    if(id==='save'||id==='save-as')return await saveProjectFile(id==='save-as');
    child()?.command(id);
   }catch(error){NotifyE(error.message);}
  },
  async importArchive(bytes,filePath){
   const project=await window.nodeRequire(path.join(remote.app.getAppPath(),'desktop/arduino-project-archive.cjs')).decode(bytes,filePath);
   const board=project.config?.board||project.board||context?.board||(typeof boardId!=='undefined'?boardId:null);
   if(!['buildbot','atom-vx','atom-mini','strom-mini'].includes(board))throw Error('Select a supported Arduino board before opening a sketch.');
   await window.openArduinoWorkspace(board,{newProject:true,name:project.name,files:project.files,current:project.current,hiddenTabs:project.config?.hiddenTabs,restrictedTabs:project.config?.restrictedTabs,simulationMeta:project.config?.meta});
   if(project.config?.preferences!==undefined)localStorage.setItem('roboblocks-cpp-preferences-v1:'+board,JSON.stringify(project.config.preferences));
   context.filePath=filePath;context.savedFingerprint=fingerprint(project.files,context.name);remember();
  },
  async importSketch(filePath){
   const project=await window.nodeRequire(path.join(remote.app.getAppPath(),'desktop/arduino-project-archive.cjs')).readFolder(filePath);
   const board=project.config?.board||project.board||context?.board||(typeof boardId!=='undefined'?boardId:null);
   if(!['buildbot','atom-vx','atom-mini','strom-mini'].includes(board))throw Error('Select a supported Arduino board before opening a sketch.');
   await window.openArduinoWorkspace(board,{newProject:true,name:project.name,files:project.files,current:project.current,hiddenTabs:project.config?.hiddenTabs,restrictedTabs:project.config?.restrictedTabs,simulationMeta:project.config?.meta});
   if(project.config?.preferences!==undefined)localStorage.setItem('roboblocks-cpp-preferences-v1:'+board,JSON.stringify(project.config.preferences));
   context.savedFingerprint=fingerprint(project.files,context.name);remember();
  },
  async importProject(project,filePath){
   if(!['buildbot','atom-vx','atom-mini','strom-mini'].includes(project.board))throw Error('Unsupported Arduino board.');
   await window.openArduinoWorkspace(project.board,{newProject:true,name:project.name||filePath.split(/[\\/]/).pop().replace(/\.json$/i,''),files:project.files,current:project.current,hiddenTabs:project.hiddenTabs,restrictedTabs:project.restrictedTabs,simulationMeta:project.meta});
   if(project.preferences!==undefined)localStorage.setItem('roboblocks-cpp-preferences-v1:'+project.board,JSON.stringify(project.preferences));
   context.filePath=filePath;remember();
  }
 };
 function assertProjectExportAllowed(project){
  if(!IDEAccount.user?.admin&&(project.restrictedTabs||[]).some(name=>Object.hasOwn(project.files||{},name))){
   throw Error('This example contains protected tabs. Only an admin can save or export it. You can still run SIM and upload to your board.');
  }
 }
 async function saveProjectFile(saveAs=false){
  if(savingFile||!child())return false;
  savingFile=true;
  try{
   const exportSnapshot=await child().snapshot();
   assertProjectExportAllowed(exportSnapshot);
   if(IDEAccount.user?.admin&&window.ProjectExamples){
    const snapshot=exportSnapshot,restricted=new Set(snapshot.restrictedTabs||[]);
    const source=context.exampleSource?.server===await IDEAccount.url('')?context.exampleSource:null;
    if(await ProjectExamples.chooseSave({source,
     configure(body){
      const section=document.createElement('section');section.className='example-tab-access';
      const header=document.createElement('div');header.className='example-tab-access-heading';
      const heading=document.createElement('strong');heading.textContent='Tab visibility';
      const count=document.createElement('span'),names=Object.keys(snapshot.files);
      const updateCount=()=>{count.textContent=names.filter(name=>!restricted.has(name)).length+' / '+names.length+' visible';};
      header.append(heading,count);section.append(header);
      const hint=document.createElement('p');hint.textContent='Choose which tabs users can view. Hidden tabs still run and upload.';section.append(hint);
      const list=document.createElement('div');list.className='example-tab-access-list';section.append(list);
      for(const name of names){
       const displayName=name==='sketch.ino'?context.name.replace(/\.ino$/i,'')+'.ino':name;
       const row=document.createElement('label');row.className='example-tab-access-row';
       const icon=document.createElement('span');icon.className='example-tab-code-icon';icon.textContent='</>';icon.setAttribute('aria-hidden','true');
       const label=document.createElement('span');label.className='example-tab-name';label.textContent=displayName;label.title=displayName;
       const state=document.createElement('span');state.className='example-tab-state';state.setAttribute('aria-hidden','true');
       const check=document.createElement('input');check.type='checkbox';check.checked=!restricted.has(name);check.setAttribute('aria-label','Show '+displayName+' to users');
       const toggle=document.createElement('span');toggle.className='example-tab-switch';toggle.setAttribute('aria-hidden','true');
       const updateRow=()=>{row.classList.toggle('is-hidden',!check.checked);state.textContent=check.checked?'Visible':'Hidden';};
       check.onchange=()=>{check.checked?restricted.delete(name):restricted.add(name);updateRow();updateCount();};
       row.append(icon,label,state,check,toggle);list.append(row);updateRow();
      }updateCount();body.append(section);
     },
     async serialize(){
      const assembly=getAssemblyStateForProject(),importedGeometry=await window.ProjectGeometry.capture(assembly.parts);
      return JSON.stringify({...snapshot,name:context.name,restrictedTabs:[...restricted],meta:{assembly,...(importedGeometry?{importedGeometry}:{}),assemblyGuide:getAssemblyGuideStateForProject(),fieldLayout:window.SimFieldLayout?.load()||null,defaultRobotPosition:window.SimDefaultPosition?.load()||null},preferences:JSON.parse(localStorage.getItem('roboblocks-cpp-preferences-v1:'+context.board)||'{}')});
     },
     async remember(entry){await child().setRestrictedTabs([...restricted]);await IDEArduino.rememberExample(entry);}
    }))return true;
   }
   const assembly=getAssemblyStateForProject(),importedGeometry=await window.ProjectGeometry.capture(assembly.parts);
   const meta={assembly,...(importedGeometry?{importedGeometry}:{}),assemblyGuide:getAssemblyGuideStateForProject(),fieldLayout:window.SimFieldLayout?.load()||null,defaultRobotPosition:window.SimDefaultPosition?.load()||null};
   const project=await child().snapshot();
   assertProjectExportAllowed(project);
   const archive=await window.nodeRequire(path.join(remote.app.getAppPath(),'desktop/arduino-project-archive.cjs')).encode(context.name,project.files,{board:context.board,current:project.current,hiddenTabs:project.hiddenTabs,restrictedTabs:project.restrictedTabs,meta,preferences:JSON.parse(localStorage.getItem('roboblocks-cpp-preferences-v1:'+context.board)||'{}')});let target=context.filePath;
   const zipName=(String(context.name||archive.name).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'')||archive.name)+'.zip';
   if(!target||!target.toLowerCase().endsWith('.zip')||saveAs){const result=await dialog.showSaveDialog({defaultPath:target?path.join(path.dirname(target),zipName):zipName,filters:[{name:'Arduino sketch ZIP',extensions:['zip']}]});if(result.canceled||!result.filePath)return false;target=result.filePath;if(!target.toLowerCase().endsWith('.zip'))target+='.zip';}
   else if(path.basename(target)!==zipName){
    const renamed=path.join(path.dirname(target),zipName);
    // A hard link reserves the new name exclusively before removing the old one.
    // Windows needs rename for a change of letter case on the same path.
    if(target.toLowerCase()===renamed.toLowerCase())await nodeFS.promises.rename(target,renamed);
    else{
     try{await nodeFS.promises.link(target,renamed);}
     catch(error){if(error.code==='EEXIST')throw Error('A ZIP with this name already exists. Choose another project name or use Save As.');throw error;}
     try{await nodeFS.promises.unlink(target);}catch(error){await nodeFS.promises.unlink(renamed).catch(()=>{});throw error;}
    }
    target=renamed;context.filePath=target;remember();
   }
   assertProjectExportAllowed(project);
   await nodeFS.promises.writeFile(target,archive.bytes);context.filePath=target;context.archiveRenamePending=false;context.savedFingerprint=fingerprint(project.files,context.name);remember();NotifyS('Save project at '+target);return true;
  }finally{savingFile=false;}
 }
 async function openExample(board,example){
  if(openingExample||savingFile)return;openingExample=true;
  try{
   await prepareLeave();const original=context;
   const project=await ipcRenderer.invoke('arduino-request','read-example',{board,id:example.id});
   const snapshot=await child().snapshot();
   const unchanged=context.savedFingerprint===fingerprint(snapshot.files,context.name);
   const confirmed=unchanged||await NotifyConfirm('All code will be lost. Are you sure you want to open this example?');
   if(!confirmed||context!==original)return;
   if(context!==original)return;
   await window.openArduinoWorkspace(board,{newProject:true,name:project.name,files:project.files});
   context.savedFingerprint=fingerprint(project.files,context.name);remember();
  }catch(error){NotifyE(error.message);}finally{openingExample=false;}
 }
 async function refreshExamples(){
  if(!context)return;const board=context.board,project=context.project;libraryExamples=[];examplesError='';
  try{const items=await ipcRenderer.invoke('arduino-request','examples',{board});if(context?.board===board&&context?.project===project)libraryExamples=items;}
  catch(error){if(context?.board===board&&context?.project===project)examplesError=error.message;}
 }
 window.IDEArduino.exampleMenu=()=>{
  const published={label:'roboBlocks Examples...',click:()=>window.openProjectExamples()};
  if(!libraryExamples.length)return [published,{type:'separator'},{label:examplesError?'Could not load examples':'No library examples installed',enabled:false},{label:'Open Library Manager...',click:()=>window.IDEArduino.command('libraries')}];
  const board=context.board,groups=[];
  for(const example of libraryExamples){
   let group=groups.find(g=>g.label===example.library);if(!group){group={label:example.library,submenu:[]};groups.push(group);}
   let menu=group.submenu;const names=example.name.split(' / ');
   for(const name of names.slice(0,-1)){let branch=menu.find(g=>g.label===name&&g.submenu);if(!branch){branch={label:name,submenu:[]};menu.push(branch);}menu=branch.submenu;}
   menu.push({label:names.at(-1),click:()=>openExample(board,example)});
  }
  return [published,{type:'separator'},...groups];
 };
 async function requestWithDownloads(action,args,run){
  const phases=new Map(),shown=new Set(),original=context;
  const report=state=>{
   if(context!==original||!(state.id==='arduino-cli'||state.id?.startsWith('core:')))return;
   const phase=state.phase||'downloading';
   if(!shown.has(state.id)&&!['ready','error','cancelled'].includes(phase)){shown.add(state.id);window.IDEArduinoDownloads?.show(state);}
   if(phases.get(state.id)===phase)return;phases.set(state.id,phase);
   const name=state.title||'Arduino CLI';
   const text=phase==='paused'?name+' download is paused. Click Resume in the top bar to continue.':phase==='ready'?name+' is ready.':phase==='installing'?'Installing '+name+'. Please wait.':phase==='downloading'?'Downloading '+name+'. Please wait; progress is available in the top bar.':name+': '+(state.message||phase);
   window.IDEArduinoBridge.output(text+'\n');
  };
  const listener=(_,state)=>report(state);ipcRenderer.on('arduino-download-progress',listener);
  try{
   const tools=await ipcRenderer.invoke('arduino-request','components',{board:args.board});
   const cli=tools.find(tool=>tool.id==='arduino-cli');if(cli&&!cli.installed)report(cli);
   return await run();
  }finally{ipcRenderer.removeListener('arduino-download-progress',listener);}
 }
 window.IDEArduinoBridge={
  async uploadPort(){
   if(context?.port){const result=await ipcRenderer.invoke('arduino-request','ports',{board:context.board});if(result.detected_ports.some(row=>row.port.address===context.port))return context.port;context.port=null;remember();showArduinoPort();}
   return selectArduinoPort();
  },
  output(text){ensureTerminal();term.write(String(text).replace(/\r?\n/g,'\r\n'));},
  projectName:()=>context?.name||'Arduino project',
  isAdmin:()=>!!IDEAccount.user?.admin,
  async confirmDeleteTab(name){
   const original=context;
   const confirmed=await NotifyConfirm('Delete tab "'+name+'" and its code?');
   return confirmed&&context===original;
  },
  refreshExamples,
  openLibraries(content){
   if(!document.getElementById('arduino-library-styles')){const style=document.createElement('link');style.id='arduino-library-styles';style.rel='stylesheet';style.href='css/arduino-library-manager.css';document.head.append(style);}
   const source=content.ownerDocument;
   content.hidden=false;
   return window.IDEToolWindows.open({id:'arduino-libraries',title:'Library Manager',width:1280,height:800,content,onClose(){content.hidden=true;source.body.append(content);refreshExamples();}});
  },
  async selectLibraryZip(){const result=await dialog.showOpenDialog({title:'Add Arduino library',properties:['openFile'],filters:[{name:'Arduino library ZIP',extensions:['zip']}]});return result.canceled?null:result.filePaths[0];},
  async invoke(action,payload){
   if(!context)throw Error('No Arduino project is open');
   if(payload?.board!==context.board||payload?.project!==context.project)throw Error('The Arduino project changed.');
   const original=context,args={...payload,board:context.board,project:context.project};
   const request=()=>ipcRenderer.invoke('arduino-request',action,args);
   if(action==='compile'||action==='setup')return requestWithDownloads(action,args,request);
   if(action!=='upload')return request();
   uploadConnection=monitor.path===args.port?{context:original,port:args.port}:null;
   monitorSuspended=true;
   try{await monitor.close();return await requestWithDownloads(action,args,request);}
   finally{
    try{if(context===original)await connectMonitor(true);}
    catch(error){NotifyE('Serial: '+error.message);}
    finally{monitorSuspended=false;uploadConnection=null;showArduinoPort(false);}
   }
  },
  checkpoint(payload){if(!context)return;const result=ipcRenderer.sendSync('arduino-checkpoint',{...payload,board:context.board,project:context.project});if(result?.error)throw Error(result.error);},
  leave:()=>window.IDEArduino.leave()
 };
 const isCurrentTask=task=>context&&task?.board===context.board&&(task.project||'')===(context.project||'');
 ipcRenderer.on('arduino-output',(_,text,task)=>{if(isCurrentTask(task))child()?.output(text);});
 ipcRenderer.on('arduino-progress',(_,progress)=>{if(isCurrentTask(progress))child()?.progress(progress);});
 $('#project-name').on('input change',()=>{
  if(!context||!frame)return;
  const name=String($('#project-name').val()||'').trim();if(!name)return;
  if(context.name!==name)context.archiveRenamePending=true;
  context.name=name;remember();child()?.setProjectName(name);
 });
 // Capture native toolbar clicks before the Python handlers receive them.
 document.addEventListener('click',event=>{
  if(!frame)return;
  const button=event.target.closest('#save-project,#upload-program,#connect-device,#disconnect-device');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(button.id==='connect-device'||button.id==='disconnect-device'){selectArduinoPort();return;}
  window.IDEArduino.command({'save-project':'save','open-project':'open','upload-program':'upload'}[button.id]);
 },true);
 Promise.resolve(startupPromise).then(()=>setTimeout(async()=>{
  try{
  if(frame||loadCodeAlready||pageParams.get('open'))return;
  let saved;try{saved=JSON.parse(localStorage.getItem(recoveryKey));}catch(_){}
  if(!saved||!['buildbot','atom-vx','atom-mini','strom-mini'].includes(saved.board))return;
  await window.openArduinoWorkspace(saved.board,{resume:saved});context.filePath=saved.filePath;context.savedFingerprint=saved.savedFingerprint;context.exampleSource=saved.exampleSource;context.port=saved.port;remember();showArduinoPort();
  }
  catch(error){NotifyE('Could not restore Arduino project: '+error.message);}
  finally{window.arduinoStartupPending=false;$('#full-loading').stop(true,true).fadeOut(()=>document.body.classList.remove('workspace-booting'));}
 },0)).catch(()=>{window.arduinoStartupPending=false;$('#full-loading').stop(true,true).fadeOut(()=>document.body.classList.remove('workspace-booting'));});
})();
