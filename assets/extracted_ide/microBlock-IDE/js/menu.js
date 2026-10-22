// One command model for browser menus and desktop keyboard accelerators.
(() => {
    const openExternal = url => isElectron ? shell.openExternal(url) : window.open(url, '_blank', 'noopener,noreferrer');
    async function showAbout() {
        let version = isElectron ? pjson.version : '';
        if (!version) {
            try { version = (await (await fetch('asset-manifest.json')).json()).appVersion || ''; } catch (_) {}
        }
        let dialog = document.getElementById('ide-about-dialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'ide-about-dialog';
            dialog.setAttribute('aria-labelledby', 'ide-about-title');
            dialog.innerHTML = '<button class="ide-about-close" type="button" aria-label="Close">&times;</button><img class="ide-about-logo" src="images/logo/roboblocks_app_icon.png" alt=""><h2 id="ide-about-title">roboBlocks IDE</h2><span class="ide-about-version"></span><p class="ide-about-description">Create. Code. Simulate.</p><p class="ide-about-credit">Based on microBlock</p><div class="ide-about-footer"><button class="ide-about-website" type="button">PT Robotics <span aria-hidden="true">&#8599;</span></button><button class="ide-about-done" type="button" autofocus>Done</button></div>';
            dialog.querySelector('.ide-about-close').onclick = () => dialog.close();
            dialog.querySelector('.ide-about-done').onclick = () => dialog.close();
            dialog.querySelector('.ide-about-website').onclick = () => openExternal('https://pt-robotics.com');
            dialog.addEventListener('click', event => {
                const rect = dialog.getBoundingClientRect();
                if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
            });
            document.body.appendChild(dialog);
        }
        dialog.querySelector('.ide-about-version').textContent = version ? 'Version ' + version : '';
        if (!dialog.open) dialog.showModal();
    }
    function editHistory(redo) {
        const command = redo ? 'redo' : 'undo';
        if(window.IDEArduino?.active){window.IDEArduino.command(command);return;}
        const active = document.activeElement;
        if (active?.matches('input, textarea, [contenteditable="true"]') && !active.closest('.monaco-editor')) document.execCommand(command);
        else if (typeof useMode !== 'undefined' && useMode === 'code' && typeof editor !== 'undefined' && editor) {
            editor.focus(); editor.trigger('menu', command, null);
        } else if (typeof blocklyWorkspace !== 'undefined' && blocklyWorkspace) blocklyWorkspace.undo(redo);
    }
    async function editClipboard(command) {
        const contents = remote.getCurrentWindow().webContents;
        // Monaco keeps the selection in its model, not in a native text field.
        if (typeof editor === 'undefined' || !editor || !editor.hasTextFocus()) {
            contents[command]();
            return;
        }
        const model = editor.getModel();
        if (!model) return;
        if (command !== 'copy' && editor.getOption(monaco.editor.EditorOption.readOnly)) return;
        // Electron 44 exposes clipboard in the main process; older releases
        // also expose it directly in the renderer. Both may return Promises.
        const clipboard = window.nodeRequire('electron').clipboard || remote.clipboard;
        const selections = editor.getSelections();
        if (command === 'copy' || command === 'cut') {
            const ranges = selections.map(selection => {
                if (!selection.isEmpty()) return selection;
                const line = selection.startLineNumber;
                return line < model.getLineCount()
                    ? new monaco.Range(line, 1, line + 1, 1)
                    : new monaco.Range(line, 1, line, model.getLineMaxColumn(line));
            });
            await clipboard.writeText(ranges.map(range => model.getValueInRange(range)).join(model.getEOL()));
            if (command === 'copy') return;
            if(editor.getModel()!==model||editor.getOption(monaco.editor.EditorOption.readOnly))return;
            editor.pushUndoStop();
            editor.executeEdits('native-clipboard', ranges.map(range => ({range, text:'', forceMoveMarkers:true})));
            editor.pushUndoStop();
        } else {
            const text = await clipboard.readText();
            if (!text || editor.getModel()!==model || editor.getOption(monaco.editor.EditorOption.readOnly)) return;
            editor.pushUndoStop();
            editor.executeEdits('native-clipboard', selections.map(range => ({range, text, forceMoveMarkers:true})));
            editor.pushUndoStop();
        }
        editor.focus();
    }
    const createTemplate = () => [
        {
            label: 'File',
            submenu: [
                {
                    label: "New",
                    accelerator: 'Ctrl+N',
                    click: () => $("#new-project").click()
                },
                {
                    label: "Open",
                    accelerator: 'Ctrl+O',
                    click: () => $("#open-project").click()
                },
                {
                    label: "Save",
                    accelerator: 'Ctrl+S',
                    click: () => $("#save-project").click()
                },
                {
                    label: "Save As",
                    accelerator: 'Ctrl+Shift+S',
                    click: () => {
                        if(window.IDEArduino?.active){window.IDEArduino.command('save-as');return;}
                        saveAsFlag = true;
                        $("#save-project").click();
                    }
                },
                { type: 'separator' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => editClipboard('cut') },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => editClipboard('copy') },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => editClipboard('paste') },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'Tools',
            submenu: [
                { label:'Undo', shortcut:'Ctrl+Z', click:() => editHistory(false) },
                { label:'Redo', shortcut:'Ctrl+Y', click:() => editHistory(true) },
                { type:'separator' },
                {
                    type:'checkbox', label:'Follow running block',
                    checked:localStorage.getItem('sim-follow-running-block')!=='0',
                    click:item=>{
                        localStorage.setItem('sim-follow-running-block',item.checked?'1':'0');
                        window.dispatchEvent(new CustomEvent('sim-block-follow-change',{detail:{enabled:item.checked}}));
                    }
                },
                { type:'separator' },
                {
                    label: "Console",
                    submenu: [
                        {
                            type: "checkbox",
                            label: "Board initial",
                            click: e => localStorage.setItem("show-console-board-initial", e.checked ? "1" : "-1"),
                            checked: +localStorage.getItem("show-console-board-initial") !== -1
                        },
                        {
                            type: "checkbox",
                            label: "Upload",
                            click: e => localStorage.setItem("show-console-upload", e.checked ? "1" : "-1"),
                            checked: +localStorage.getItem("show-console-upload") !== -1
                        },
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Update Firmware',
                    click: () => firewareUpgradeFlow()
                },
                { type: 'separator' },
                { role: 'reload' }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Join us on Facebook',
                    click: () => openExternal('https://www.facebook.com/LPRobotics')
                },
                {
                    label: 'Report Issue',
                    click: () => openExternal('https://lin.ee/YiG71vX')
                },
                { type: 'separator' },
                {
                    label: 'About',
                    click: async () => {
                        await showAbout();
                    }
                },
            ]
        }
    ];
    function portable(items) {
        return items.filter(item => item.label !== 'Edit' && item.role !== 'toggledevtools' &&
            (item.label !== 'Update Firmware' || !window.IDEArduino?.active) &&
            (isElectron || !['quit', 'toggledevtools'].includes(item.role)) &&
            (isElectron || item.label !== 'Update Firmware' ||
                (!!navigator.serial && typeof boards !== 'undefined' && /^ESP32/i.test(boards.find(board => board.id === boardId)?.chip || '')))
        ).map(item => {
            const value = {...item};
            if (value.role === 'help') value.label = 'Help';
            if (value.role === 'reload') { value.label = 'Reload'; value.click = () => location.reload(); }
            if (value.role === 'quit') { value.label = 'Exit'; value.click = () => remote.app.quit(); }
            if (value.submenu) value.submenu = portable(value.submenu);
            return value;
        }).filter((item, index, all) => item.type !== 'separator' ||
            (index > 0 && all[index - 1].type !== 'separator' &&
                all.slice(index + 1).some(next => next.type !== 'separator')));
    }
    window.IDEApplicationMenus = {
        items() {
            const items = portable(createTemplate());
            if (isElectron) items.find(item => item.label === 'Help').submenu.unshift(
                {label:'Software Update', click:() => ipcRenderer.send('app-update-open-request')}, {type:'separator'});
            if(isElectron && window.IDEArduino?.active)items.find(item=>item.label==='File').submenu.splice(2,0,{label:'Examples',submenu:window.IDEArduino.exampleMenu()});
            const toolsMenu=items.find(item=>item.label==='Tools');
            const toolItems=toolsMenu.submenu.filter(item=>item.type!=='separator');
            const editing=toolItems.filter(item=>['Undo','Redo'].includes(item.label));
            const workspace=isElectron && window.IDEArduino?.active
                ? [{label:'Libraries',click:()=>window.IDEArduino.command('libraries')},{label:'Board Manager',click:()=>window.IDEArduinoDownloads.openBoards()}]
                : toolItems.filter(item=>['Follow running block','Console'].includes(item.label));
            const application=toolItems.filter(item=>['Update Firmware','Reload'].includes(item.label));
            if(isElectron && window.IDEAccount?.user?.admin){
                const adminTools=[
                    {label:'Manage users',click:()=>IDEAccount.manageUsers()}
                ];
                if(isElectron)adminTools.unshift(
                    {label:'Product Editor',click:()=>IDEAccount.openAdminTool('product-editor')},
                    {label:'Sound Tuner',click:()=>IDEAccount.openAdminTool('sound-tuner')},
                    {type:'separator'});
                application.push({label:'Admin tools',submenu:adminTools});
            }
            toolsMenu.submenu=[editing,workspace,application].filter(group=>group.length)
                .flatMap((group,index)=>index?[{type:'separator'},...group]:group);
            return items;
        }
    };
    if (isElectron) {
        const restoreArduinoConnection = () => {
            window.arduinoSerialOwnership=false;
            if(window._arduinoAutoConnect !== undefined){autoConnectFlag=window.autoConnectFlag=window._arduinoAutoConnect;delete window._arduinoAutoConnect;}
        };
        window.restoreArduinoConnection=restoreArduinoConnection;
        window.openArduinoWorkspace = async (board, options = {}) => {
            await window.IDEArduino?.prepareLeave();
            window.arduinoSerialOwnership=true;
            // A legacy auto-connect already opening the port must finish before
            // releasing it; otherwise it can claim COM3 after Arduino starts.
            try { await window.legacySerialConnecting; } catch (_) {}
            if(window._arduinoAutoConnect === undefined){
                window._arduinoAutoConnect=window.autoConnectFlag;
                autoConnectFlag=window.autoConnectFlag=false;
                if(serialPort){
                    const port=serialPort;
                    await new Promise((resolve,reject)=>{
                        const timeout=setTimeout(()=>reject(Error('Could not release the serial port. Disconnect your board and try again.')),5000);
                        const done=()=>{clearTimeout(timeout);resolve();};
                        try {const result=port.close(done);if(result?.then)result.then(done,done);}catch(_){done();}
                    }).catch(e=>{restoreArduinoConnection();throw e;});
                    serialPort=null;
                }
            }
            try {const result=await ipcRenderer.invoke('arduino-open',{board,...Object.fromEntries(Object.entries(options).filter(([key])=>key!=='simulationMeta'))});await window.IDEArduino.mount(result,{resetSimulation:options.newProject===true,meta:options.simulationMeta});return true;}
            catch(e){restoreArduinoConnection();throw e;}
        };
        // Child windows can replace the application menu. Keep editor clipboard
        // shortcuts working even when this window's menu accelerator is absent.
        document.addEventListener('keydown', event => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey ||
                typeof editor === 'undefined' || !editor || !editor.hasTextFocus()) return;
            const command = {KeyC:'copy', KeyX:'cut', KeyV:'paste'}[event.code];
            if (!command) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            editClipboard(command);
        }, true);
        remote.Menu.setApplicationMenu(remote.Menu.buildFromTemplate(createTemplate()));
        const win = remote.getCurrentWindow();
        win.setAutoHideMenuBar(false);
        win.setMenuBarVisibility(false);
    }
})();
