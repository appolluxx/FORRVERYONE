(function(root){
 'use strict';
 const localDemo=(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('examplesLocal')==='1')||(typeof root.nodeRequire==='function'&&root.nodeRequire('process').env.ROBOBLOCKS_EXAMPLES_LOCAL==='1');
 const sessionKey=localDemo?'roboblocks-local-examples-session':'roboblocks-session';
 const readToken=()=>{try{return localStorage.getItem(sessionKey)||sessionStorage.getItem(sessionKey)||'';}catch(_){return '';}};
 const storeToken=value=>{try{if(value)localStorage.setItem(sessionKey,value);else localStorage.removeItem(sessionKey);sessionStorage.removeItem(sessionKey);}catch(_){try{if(value)sessionStorage.setItem(sessionKey,value);else sessionStorage.removeItem(sessionKey);}catch(_){}}};
 let token=readToken(),user=null,configuration;
 if(token)storeToken(token);
 let photoPromise;
 function nativePhoto(address){
  if(typeof root.nodeRequire!=='function'||!address)return Promise.resolve('');
  return new Promise(resolve=>{
   try{
    const url=new URL(address);if(url.protocol!=='https:'||!url.hostname.endsWith('.googleusercontent.com')||url.port||url.username||url.password){resolve('');return;}
    const Buffer=root.nodeRequire('buffer').Buffer;
    const req=root.nodeRequire('https').get(url,res=>{
     const type=(res.headers['content-type']||'').split(';')[0];
     if(res.statusCode!==200||!['image/jpeg','image/png','image/webp','image/gif'].includes(type)){res.resume();resolve('');return;}
     const chunks=[];let size=0;
     res.on('data',chunk=>{size+=chunk.length;if(size>512*1024){res.destroy();resolve('');}else chunks.push(chunk);});
     res.on('end',()=>resolve('data:'+type+';base64,'+Buffer.concat(chunks).toString('base64')));res.on('error',()=>resolve(''));
    });req.setTimeout(8000,()=>{req.destroy();resolve('');});req.on('error',()=>resolve(''));
   }catch(_){resolve('');}
  });
 }
 function profilePhoto(){
  const picture=user?.picture;
  return photoPromise||(photoPromise=request('/api/me/avatar').then(r=>r.picture).catch(()=>'').then(src=>src||nativePhoto(picture)).then(src=>{if(!src)photoPromise=null;return src;}));
 }
 const button=document.getElementById('account-signin');
 const config=()=>localDemo?Promise.resolve({apiBase:'http://127.0.0.1:8092'}):configuration||(configuration=fetch('account-config.json',{cache:'no-store'}).then(r=>r.json()));
 async function request(route,data,method){
  const {apiBase}=await config();const response=await fetch(apiBase.replace(/\/$/,'')+route,{method:method||(data?'POST':'GET'),headers:{...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store',signal:AbortSignal.timeout(35000)});
  let value;try{value=await response.json();}catch{throw Error('The account service is not available yet. You can continue using the IDE without signing in.');}
  if(!response.ok){if(response.status===401){token='';user=null;storeToken('');render();}throw Error(value.error||'Account request failed.');}return value;
 }
 function avatar(container){
  container.replaceChildren();
  if(!user){const icon=document.createElement('i');icon.className='fas fa-user';container.append(icon);return;}
  const initial=document.createElement('span');initial.textContent=(user.name||user.email).trim().slice(0,1).toUpperCase();container.append(initial);
  const owner=user;
  if(user.picture)profilePhoto().then(src=>{if(!src||user!==owner||!container.contains(initial))return;const image=document.createElement('img');image.alt='Profile photo';image.onload=()=>{initial.hidden=true;};image.onerror=()=>{image.remove();initial.hidden=false;};image.src=src;container.append(image);});
 }
 function render(){
  button.querySelector('.account-name').textContent=user?(user.name||user.email):'Sign in';
  button.classList.toggle('is-signed-in',!!user);button.setAttribute('aria-label',user?'Your account: '+user.name+' ('+user.email+')':'Sign in');
  avatar(button.querySelector('.account-avatar'));root.dispatchEvent(new Event('account-changed'));root.dispatchEvent(new Event('resize'));
 }
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const accountRole=u=>u.admin?'Admin':u.role==='teacher'||u.permissions?.includes('delivery.generate')?'Teacher':'User';
 function show(direct=false){
  const content=el('section');content.className='account-panel';
  if(user){content.classList.add('account-overview');const profile=el('div');profile.className='account-profile';const photo=el('div');photo.className='account-avatar';avatar(photo);const identity=el('div');identity.className='account-identity';identity.append(el('small','ROBOBLOCKS ACCOUNT'),el('h2',user.name||'Your account'),el('p',user.email));profile.append(photo,identity);content.append(profile);}
  else content.append(el('h2','Sign in to roboBlocks IDE'),el('p','Sign-in is optional. Blocks, projects and SIM work without an account.'));
  const status=el('p');status.setAttribute('role','status');content.append(status);
  const openDialog=()=>root.IDEToolWindows.open({id:'account',title:'Your account',width:620,height:530,content});
  let win=direct&&!user?{closed:false,close(){this.closed=true;}}:openDialog();
  if(!user){
   const login=el('button','Continue with Google');login.className='account-primary';content.append(login);
   login.onclick=async()=>{
    login.disabled=true;button.disabled=true;status.textContent='Opening Google sign-in...';
    const native=typeof root.nodeRequire==='function';
    const width=Math.min(500,screen.availWidth),height=Math.min(680,screen.availHeight);
    const left=Math.max(0,(root.screenX||0)+(root.outerWidth-width)/2),top=Math.max(0,(root.screenY||0)+(root.outerHeight-height)/2);
    const tab=native?null:root.open('about:blank','roboblocks-google-signin','popup=yes,width='+width+',height='+height+',left='+Math.round(left)+',top='+Math.round(top));
    try{
     if(!native&&!tab)throw Error('Allow pop-ups to sign in with Google.');
     const start=await request('/api/auth/start',{});const {apiBase}=await config();if(new URL(start.url).origin!==new URL(apiBase).origin)throw Error('Invalid sign-in address.');
     if(native)await root.nodeRequire('electron').shell.openExternal(start.url);else{tab.opener=null;tab.location=start.url;}
     status.textContent='Complete sign-in in your browser, then return here.';
     for(let i=0;i<100&&!win.closed;i++){
      await new Promise(r=>setTimeout(r,2500));const result=await request('/api/auth/poll',{id:start.id,proof:start.proof});
      if(result.token){token=result.token;user=result.user;photoPromise=null;storeToken(token);render();try{tab?.close();}catch(_){}win.close();openAccount();return;}
     }
     if(!win.closed){status.textContent='Sign-in timed out. Please try again.';if(direct)win=openDialog();}
    }catch(e){tab?.close();status.textContent=e.message;if(direct)win=openDialog();}finally{login.disabled=false;button.disabled=false;}
   };
   if(direct)login.click();
  }else{
   const summary=el('div');summary.className='account-summary';content.append(summary);
   for(const [label,value] of [['ACCOUNT TYPE',user.admin?'Administrator':'Member'],['SIGN-IN METHOD','Google']]){const item=el('div');item.append(el('small',label),el('strong',value));summary.append(item);}
   const access=el('div');access.className='account-access';const allowed=user.admin||user.permissions.includes('delivery.generate');const accessHead=el('div');accessHead.className='account-access-heading';const icon=el('i');icon.className='fas fa-route';icon.setAttribute('aria-hidden','true');const badge=el('span',allowed?'Enabled':'Not enabled');badge.className='account-badge'+(allowed?' enabled':'');accessHead.append(icon,el('strong','Delivery planner'),badge);access.append(accessHead,el('p',allowed?'Plan your route and generate a complete delivery program.':'Your administrator can enable route planning and program generation.'));content.append(access);
   const actions=el('div');actions.className='account-actions';content.append(actions);
   if(user.admin){const manage=el('button','Manage users');manage.className='account-primary';actions.append(manage);manage.onclick=()=>manageUsers(status);}
   const logout=el('button','Sign out');logout.className='account-signout';actions.append(logout);logout.onclick=async()=>{try{await request('/api/auth/logout',{});}finally{token='';user=null;storeToken('');render();win.close();}};
  }
 }
 async function manageUsers(status){
  try{
   const {users}=await request('/api/admin/users'),drafts=new Map(),saving=new Set(),photos=new Map();
   // The user API returns records in registration order (new accounts append).
   const registrationOrder=new Map(users.map((u,index)=>[u.id,index]));
   const content=el('section');content.className='account-panel users-manager';
   const heading=el('header'),intro=el('div');intro.append(el('h2','Manage users'),el('p','Manage account access and Teacher permissions.'));heading.append(intro);
   const stats=el('div');stats.className='users-stats';
   const controls=el('div');controls.className='users-controls';
   const searchBox=el('label');searchBox.className='users-search';const icon=el('i');icon.className='fas fa-search';icon.setAttribute('aria-hidden','true');
   const search=el('input');search.type='search';search.placeholder='Search name or email';search.setAttribute('aria-label','Search users by name or email');searchBox.append(icon,search);
   const select=(label,options)=>{const field=el('label');field.className='users-filter';field.append(el('span',label));const input=el('select');input.setAttribute('aria-label',label);for(const [value,text]of options)input.add(new Option(text,value));field.append(input);controls.append(field);return input;};
   controls.append(searchBox);
   const roleFilter=select('Role',[['','All roles'],['Admin','Admin'],['Teacher','Teacher'],['User','User']]);
   const activeFilter=select('Status',[['','All accounts'],['active','Active'],['disabled','Disabled']]);
   const sort=select('Sort by',[['name','Name'],['email','Email'],['role','Role'],['registration','Registration: oldest first']]);
   const reset=el('button','Reset filters');reset.className='users-reset';controls.append(reset);
   const notice=el('p');notice.className='users-notice';notice.setAttribute('role','status');
   const summary=el('div');summary.className='users-results-summary';summary.setAttribute('aria-live','polite');
   const scroll=el('div');scroll.className='users-table-scroll';const table=el('table'),thead=el('thead'),header=el('tr');
   for(const text of ['User','Role','Account status','Registered','Last sign-in']){const th=el('th',text);th.scope='col';header.append(th);}thead.append(header);const tbody=el('tbody');table.append(thead,tbody);scroll.append(table);
   content.append(heading,stats,controls,notice,summary,scroll);
   function photo(u){const box=el('span');box.className='account-avatar';box.textContent=(u.name||u.email||'?').trim().slice(0,1).toUpperCase();
    try{const address=new URL(u.picture);if(address.protocol==='https:'&&address.hostname.endsWith('.googleusercontent.com')){const image=el('img');image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';image.src=address.href;let retried=false;image.onerror=async()=>{if(retried){image.remove();return;}retried=true;if(!photos.has(address.href))photos.set(address.href,nativePhoto(address.href));const src=await photos.get(address.href);if(src)image.src=src;else image.remove();};box.append(image);}}catch(_){}return box;
   }
   function renderUsers(){
    stats.replaceChildren();for(const [label,count]of [['Total users',users.length],['Active',users.filter(u=>u.enabled).length],['Teachers',users.filter(u=>accountRole(u)==='Teacher').length],['Admins',users.filter(u=>u.admin).length]]){const card=el('div');card.append(el('span',label),el('strong',String(count)));stats.append(card);}
    const query=search.value.trim().toLocaleLowerCase(),visible=users.filter(u=>(!query||((u.name||'')+' '+u.email).toLocaleLowerCase().includes(query))&&(!roleFilter.value||accountRole(u)===roleFilter.value)&&(!activeFilter.value||!!u.enabled===(activeFilter.value==='active')));
    visible.sort((a,b)=>sort.value==='registration'?registrationOrder.get(a.id)-registrationOrder.get(b.id):String(sort.value==='role'?accountRole(a):a[sort.value]||a.email).localeCompare(String(sort.value==='role'?accountRole(b):b[sort.value]||b.email),undefined,{sensitivity:'base',numeric:true}));
    summary.textContent=visible.length+' of '+users.length+' users';tbody.replaceChildren();
    if(!visible.length){const row=el('tr'),empty=el('td',users.length?'No users match these filters.':'Users will appear here after their first Google sign-in.');empty.colSpan=5;empty.className='users-empty';row.append(empty);tbody.append(row);}
    for(const u of visible){
     const row=el('tr'),identity=el('td'),profile=el('div');profile.className='users-identity';const text=el('div'),name=el('strong',u.name||'Unnamed user'),email=el('span',u.email);name.title=u.name||'';email.title=u.email;text.append(name,email);profile.append(photo(u),text);identity.append(profile);row.append(identity);
     const protectedOwner=u.owner===true||(u.owner===undefined&&u.admin);
     const draft=drafts.get(u.id)||{enabled:!!u.enabled,role:accountRole(u).toLowerCase()};
     const role=el('td'),roleSelect=el('select');roleSelect.className='users-role-select';roleSelect.setAttribute('aria-label','Role for '+u.email);for(const value of ['user','teacher','admin'])roleSelect.add(new Option(value[0].toUpperCase()+value.slice(1),value));roleSelect.value=draft.role;roleSelect.disabled=protectedOwner||saving.has(u.id);role.append(roleSelect);row.append(role);
     const enabled=el('input'),activeText=el('span',draft.enabled?'Active':'Disabled'),td=el('td'),wrap=el('label');wrap.className='users-toggle';enabled.type='checkbox';enabled.setAttribute('role','switch');enabled.checked=draft.enabled;enabled.disabled=protectedOwner||saving.has(u.id);enabled.setAttribute('aria-label','Account active for '+u.email);wrap.append(enabled,activeText);td.append(wrap);row.append(td);
     for(const value of [u.createdAt,u.lastLoginAt]){const cell=el('td');cell.className='users-date';const date=value?new Date(value):null;if(date&&Number.isFinite(date.getTime())){const time=el('time',date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}));time.dateTime=date.toISOString();time.title=date.toLocaleString();cell.append(time,el('small',date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})));}else cell.textContent='\u2014';row.append(cell);}
     row.classList.toggle('is-saving',saving.has(u.id));row.setAttribute('aria-busy',String(saving.has(u.id)));
     enabled.onchange=roleSelect.onchange=async()=>{
      if(protectedOwner||saving.has(u.id))return;
      draft.enabled=enabled.checked;draft.role=roleSelect.value;drafts.set(u.id,draft);activeText.textContent=draft.enabled?'Active':'Disabled';
      saving.add(u.id);enabled.disabled=roleSelect.disabled=true;row.classList.add('is-saving');row.setAttribute('aria-busy','true');notice.textContent='Updating '+u.email+'…';notice.classList.remove('is-error');try{
      const result=await request('/api/admin/users',{id:u.id,enabled:draft.enabled,role:draft.role},'PATCH');Object.assign(u,result.user);drafts.delete(u.id);notice.textContent='Permissions saved for '+u.email;notice.classList.remove('is-error');
      if(user?.id===u.id){user={...user,...result.user};render();root.dispatchEvent(new Event('account-changed'));}
     }catch(e){drafts.delete(u.id);notice.textContent='Could not update '+u.email+'. '+e.message;notice.classList.add('is-error');}finally{saving.delete(u.id);renderUsers();}};
     tbody.append(row);
    }
   }
   search.oninput=renderUsers;roleFilter.onchange=activeFilter.onchange=sort.onchange=renderUsers;reset.onclick=()=>{search.value='';roleFilter.value=activeFilter.value='';sort.value='name';renderUsers();};renderUsers();
   root.IDEToolWindows.open({id:'users',title:'Manage users',width:1280,height:800,content});
  }catch(e){status.textContent=e.message;}
 }
 let closePopover=null;
 function openAccount(){
  if(closePopover){closePopover();return;}
  if(!user){show(true);return;}
  const panel=el('section');panel.className='account-popover';panel.id='account-popover';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Your account');
  const photo=el('div');photo.className='account-avatar';avatar(photo);
  const identity=el('div');identity.className='account-popover-identity';
  const heading=el('div');heading.className='account-popover-name';
  const role=el('span',accountRole(user));role.className='account-role account-role-'+accountRole(user).toLowerCase();heading.append(el('strong',user.name||'Your account'),role);
  const connection=el('span','Signed in with Google');connection.className='account-popover-connection';
  identity.append(heading,el('span',user.email),connection);
  const profile=el('div');profile.className='account-popover-profile';profile.append(photo,identity);
  const logout=el('button','Logout');logout.type='button';panel.append(profile,logout);document.body.append(panel);
  if(user.admin){const manage=el('button','Manage users');manage.type='button';manage.className='account-manage';panel.insertBefore(manage,logout);const status=el('p');status.className='account-popover-status';status.setAttribute('role','status');panel.append(status);manage.onclick=async()=>{manage.disabled=true;await manageUsers(status);manage.disabled=false;if(!status.textContent)closePopover?.();};}
  const events=new AbortController();
  const position=()=>{const rect=button.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(rect.right-panel.offsetWidth,innerWidth-panel.offsetWidth-8))+'px';panel.style.top=Math.max(8,Math.min(rect.bottom+10,innerHeight-panel.offsetHeight-8))+'px';};
  closePopover=()=>{events.abort();panel.remove();button.setAttribute('aria-expanded','false');button.removeAttribute('aria-controls');closePopover=null;};
  button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',panel.id);position();
  // Blockly and SIM consume pointer events; dismiss before their handlers run.
  document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!button.contains(e.target))closePopover?.();},{capture:true,signal:events.signal});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePopover?.();button.focus();}},{signal:events.signal});
  root.addEventListener('resize',position,{signal:events.signal});
  logout.onclick=async()=>{logout.disabled=true;try{await request('/api/auth/logout',{});}catch(_){}finally{token='';user=null;photoPromise=null;storeToken('');closePopover?.();render();button.focus();}};
  logout.focus({preventScroll:true});
 }
 async function openAdminTool(id){
  const result=await request('/api/me');if(!result.user?.admin||!result.user.enabled)throw Error('Administrator access required.');
  if(typeof root.nodeRequire!=='function')throw Error('This tool requires Electron.');
  return root.nodeRequire('electron').ipcRenderer.invoke('admin-tool-open',{id,token});
 }
 async function openManageUsers(){const status=el('p');await manageUsers(status);if(status.textContent)throw Error(status.textContent);}
 root.IDEAccount={openAdminTool,manageUsers:openManageUsers,request,url:async route=>{const c=await config();const base=/^\/api\/examples(?:\/|$)/.test(route)&&c.publicExamplesBase?c.publicExamplesBase:c.apiBase;return base.replace(/\/$/,'')+route;},show:openAccount,get user(){return user;}};button.onclick=openAccount;
 if(localDemo)request('/api/dev/session',{}).then(r=>{token=r.token;user=r.user;storeToken(token);render();}).catch(e=>NotifyE(e.message));
 else if(token)request('/api/me').then(r=>{user=r.user;render();}).catch(()=>{});
 render();
})(window);
