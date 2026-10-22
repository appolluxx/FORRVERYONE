let editor = null, editorReadonly = true;
let useMode = 'block';
let onKeyUpTimer = null;
let modeSwitchBusy = false;
let editorModeRequest = 0;
let settingEditorValue = false;
const ROUNDTRIP_FILE = '/.roboblocks-roundtrip.json';
let blockModeView=null;
const modeFileKey=()=>file_name_select.replace(/\.(xml|py)$/, '');
function restoreBlockModeView(){
    const view=blockModeView;
    if(!view||useMode!=='block'||view.tree!==vFSTree||view.board!==boardId||view.file!==modeFileKey())return false;
    if(blocklyWorkspace.scale!==view.scale)blocklyWorkspace.setScale(view.scale);
    blocklyWorkspace.scroll(view.x,view.y);
    return true;
}
function updatePythonCodeChrome(){
    const board=boards.find(item=>item.id===boardId),language=board?.isArduinoPlatform?'C++':'Python';
    const file=(file_name_select||'main.py').replace(/\.xml$/,board?.isArduinoPlatform?'.ino':'.py');
    document.querySelectorAll('[data-python-file]').forEach(node=>node.textContent=file);
    document.querySelectorAll('.python-code-language').forEach(node=>node.textContent=language);
    $('#python-code-title').text(language);$('#python-code-board').text(board?.name||'');
    $('#python-code-state').text(isEmbed?'Read only':'Ready');
}

function roundtripRecords() {
    try { return JSON.parse(fs.read(ROUNDTRIP_FILE) || '{}'); } catch (_) { return {}; }
}
function saveRoundtripRecord(name, patch) {
    const records = roundtripRecords();
    records[name] = Object.assign({}, records[name] || {}, patch, {version:1, board:boardId});
    fs.write(ROUNDTRIP_FILE, JSON.stringify(records));
}
function setIDECodeValue(code) {
    settingEditorValue = true;
    try { editor.setValue(code || ''); }
    finally { settingEditorValue = false; updatePythonCodeChrome(); }
}
function setEditorModeView(value) {
    const returningFromCode=useMode==='code';
    if(value===2&&useMode==='block')blockModeView={tree:vFSTree,board:boardId,file:modeFileKey(),scale:blocklyWorkspace.scale,x:blocklyWorkspace.scrollX,y:blocklyWorkspace.scrollY};
    $('#blocks-editor').css('display', value === 1 ? 'flex' : 'none');
    $('#code-editor').css('display', value === 2 ? 'flex' : 'none');
    $('#mode-select-switch > li').removeClass('active');
    $(`#mode-select-switch > li[data-value='${value}']`).addClass('active');
    useMode = value === 1 ? 'block' : 'code';
    if(value===2)updatePythonCodeChrome();
    if (value === 1) {
        Blockly.triggleResize();
        if(returningFromCode){
            restoreBlockModeView();
            const request=editorModeRequest;
            requestAnimationFrame(()=>{if(request===editorModeRequest)restoreBlockModeView();});
        }
    }
    else if (editor) editor.layout();
}
async function ensureCodeEditor(isArduinoPlatform) {
    if (editor) return;
    await IDEMonaco.load();
    if (editor) return;
    registerPythonCompletions();
    const projectSources=()=>{
        const sources={};
        for(const path of fs.walk('/'))if(path.endsWith('.py')&&!path.startsWith('/extension/')&&!path.startsWith('/.')){const text=fs.read(path);if(typeof text==='string')sources[path.replace(/^\//,'')]=text;}
        sources[file_name_select.replace(/\.xml$/,'.py')]=editor?.getValue()||'';
        return sources;
    };
    projectSources.currentFile=()=>file_name_select.replace(/\.xml$/,'.py');
    IDEProjectCompletions.register(monaco,'python',projectSources);
    editor = monaco.editor.create($('#code-editor > article')[0], {
        ...IDECodeTheme.options(monaco),
        language: isArduinoPlatform ? 'cpp' : 'python', readOnly:isEmbed, automaticLayout:true
    });
    IDEProjectCompletions.attach(monaco,editor,isArduinoPlatform?'cpp':'python');
    editor.onDidChangeCursorPosition(e=>$('#python-cursor-position').text('Ln '+e.position.lineNumber+', Col '+e.position.column));
    // Includes paste, undo, IME and touch keyboard edits, not just keyup.
    editor.onDidChangeModelContent(() => {
        if (settingEditorValue || isEmbed || modeSwitchBusy || useMode !== 'code') return;
        if (file_name_select.endsWith('.xml')) {
            const base = file_name_select.replace(/\.xml$/, '');
            file_name_select = base + '.py';
            // The original blocks remain in the roundtrip record, including IDs
            // and layout. The active file is Python until conversion succeeds.
            fs.remove('/' + base + '.xml');
        }
        if (!file_name_select.endsWith('.py')) return;
        editor._projectTree = vFSTree;
        editor._projectFile = file_name_select;
        fs.write('/' + file_name_select, editor.getValue());
        updatePythonCodeChrome();
        clearTimeout(onKeyUpTimer);
        const context = { file:file_name_select, tree:vFSTree };
        workspaceSaveContext = context;
        onKeyUpTimer = setTimeout(() => {
            onKeyUpTimer = null;
            if (context.file === file_name_select && context.tree === vFSTree) saveCodeToLocal();
        }, 250);
    });
}

async function switchIDEEditorMode(value) {
    value = Number(value);
    if (value !== 1 && value !== 2) return false;
    if (modeSwitchBusy) return false;
    // Extension modules are libraries, never input for Code-to-Block conversion.
    if (value === 1 && (/^extension\/.+\/modules\/.+\.py$/.test(file_name_select) ||
        (file_name_select.endsWith('.py') && fs.walk('/extension').some(path =>
            path.includes('/modules/') && path.split('/modules/')[1] === file_name_select)))) {
        saveCodeToLocal();
        if (typeof fs.read('/main.xml') === 'string') {
            file_name_select = 'main.xml';
            await updateWorkspace();
            return true;
        }
        NotifyW('Open your main program from Project Files.');
        return false;
    }
    const request = ++editorModeRequest;
    const board = boards.find(item => item.id === boardId);
    const isArduinoPlatform = !!board?.isArduinoPlatform;
    clearTimeout(onKeyUpTimer);
    onKeyUpTimer = null;
    if (workspaceSaveContext && workspaceSaveContext.file === file_name_select && workspaceSaveContext.tree === vFSTree) saveCodeToLocal();
    if (value === 2) {
        const loadingContext = {tree:vFSTree, file:file_name_select, board:boardId};
        await ensureCodeEditor(isArduinoPlatform);
        if (request !== editorModeRequest || loadingContext.tree !== vFSTree || loadingContext.file !== file_name_select || loadingContext.board !== boardId) return false;
        monaco.editor.setModelLanguage(editor.getModel(), isArduinoPlatform ? 'cpp' : 'python');
        // Clicking Code again must never regenerate over the user's draft.
        if (useMode !== 'code' || editor._projectTree !== vFSTree || editor._projectFile !== file_name_select) {
            const isPythonFile = file_name_select.endsWith('.py');
            const code = isPythonFile ? (fs.read('/' + file_name_select) || '')
                : (isArduinoPlatform ? Blockly.JavaScript : Blockly.Python).workspaceToCode(blocklyWorkspace);
            if (!isPythonFile && !isArduinoPlatform) {
                const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(blocklyWorkspace));
                saveRoundtripRecord(file_name_select.replace(/\.xml$/, ''), {xml, code});
            }
            setIDECodeValue(code);
        }
        editor._projectTree = vFSTree;
        editor._projectFile = file_name_select;
        editor.updateOptions({readOnly:!!isEmbed});
        setEditorModeView(2);
        return true;
    }
    if (!file_name_select.endsWith('.py')) {
        setEditorModeView(1);
        return true;
    }
    if (isArduinoPlatform) {
        NotifyW('Code to Block currently supports Python only. Your code has been kept.');
        return false;
    }
    const source = editor ? editor.getValue() : fs.read('/' + file_name_select) || '';
    const context = {file:file_name_select, tree:vFSTree, board:boardId};
    const base = context.file.replace(/\.py$/, '');
    const beforeXml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(blocklyWorkspace));
    const previousBlocks = fs.read('/' + base + '.xml');
    const previousRecord = fs.read(ROUNDTRIP_FILE);
    modeSwitchBusy = true;
    if (editor) editor.updateOptions({readOnly:true});
    let replaced = false;
    try {
        cancelWorkspaceSave();
        // Load extension definitions without reloading the editor or workspace.
        await updataWorkspaceAndCategoryFromvFS(true);
        if (vFSTree !== context.tree || file_name_select !== context.file || boardId !== context.board) return false;
        const snapshot = roundtripRecords()[base];
        const unchanged = snapshot?.version === 1 && snapshot.board === boardId &&
            typeof snapshot.xml === 'string' && snapshot.code?.replace(/\r\n/g,'\n') === source.replace(/\r\n/g,'\n');
        const result = unchanged
            ? {dom:Blockly.utils.xml.textToDom(snapshot.xml), restored:true, rawCount:0}
            : (snapshot?.version === 1 && snapshot.board === boardId &&
                (CodeToBlocks.updateWaits(source, snapshot) || CodeToBlocks.updateParameters(source, snapshot))) ||
                CodeToBlocks.convert(source, {workspace:blocklyWorkspace, boardId});
        if (result.unmappedWait) {
            NotifyW('Could not match this sleep edit to a Wait block. Python and original blocks are preserved.');
            return false;
        }
        if (result.fullSource && snapshot?.version === 1 && snapshot.board === boardId &&
            snapshot.xml && !snapshot.xml.includes(CodeToBlocks.FULL_SOURCE)) {
            NotifyW('These edits cannot be represented by the existing blocks yet. Your Python and original blocks are preserved.');
            return false;
        }
        Blockly.Events.disable();
        try {
            replaced = true;
            blocklyWorkspace.clear();
            Blockly.Xml.domToWorkspace(result.dom, blocklyWorkspace);
        } finally { Blockly.Events.enable(); }
        saveRoundtripRecord(base, {lastSource:source, lastBlocks:beforeXml});
        fs.write('/' + base + '.xml', Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(blocklyWorkspace)));
        fs.remove('/' + context.file);
        file_name_select = base + '.xml';
        setEditorModeView(1);
        await saveCodeToLocal();
        if (result.updated) NotifyS('Block values updated. Original blocks preserved.');
        else if (result.restored) NotifyS('Original blocks restored.');
        else if (result.fullSource && result.rawCount) NotifyS('Python preserved in an editable code block. Matching blocks are not available for this code yet.');
        else if (result.rawCount) NotifyS('Converted supported commands. Other code is preserved in Python code blocks.');
        else NotifyS('Python converted to blocks.');
        if(!restoreBlockModeView())blocklyWorkspace.scrollCenter();
        return true;
    } catch (error) {
        if (vFSTree === context.tree && boardId === context.board &&
            (file_name_select === context.file || file_name_select === base + '.xml')) {
            if (replaced) {
                Blockly.Events.disable();
                try { blocklyWorkspace.clear(); Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(beforeXml),blocklyWorkspace); }
                finally { Blockly.Events.enable(); }
            }
            file_name_select = context.file;
            fs.write('/' + context.file, source);
            if (previousBlocks === undefined) fs.remove('/' + base + '.xml');
            else fs.write('/' + base + '.xml', previousBlocks);
            if (previousRecord === undefined) fs.remove(ROUNDTRIP_FILE);
            else fs.write(ROUNDTRIP_FILE, previousRecord);
            setEditorModeView(2);
        }
        console.error('Code to Block failed:', error);
        NotifyE('Could not convert this code. Your Python and original blocks have been kept.');
        return false;
    } finally {
        modeSwitchBusy = false;
        if (editor) editor.updateOptions({readOnly:!!isEmbed});
        // A project opened while extensions were loading owns the editor now.
        // Its initial tab click may have been deferred by modeSwitchBusy.
        if (vFSTree !== context.tree || boardId !== context.board ||
            (file_name_select !== context.file && file_name_select !== base + '.xml')) {
            await switchIDEEditorMode(file_name_select.endsWith('.py') ? 2 : 1);
        }
    }
}
window.switchIDEEditorMode = switchIDEEditorMode;
$('#mode-select-switch > li').click(function () {
    window.__modeSwitchPromise = switchIDEEditorMode($(this).attr('data-value'));
    window.__modeSwitchPromise.catch(error => { console.error(error); NotifyE('Could not switch editor mode. Your project has been kept.'); });
});

let __Function = () => "";
let __Number = 0;
let __Text = "";
let __Array = [];

// Helper function to return the monaco completion item type of a thing
function getType(thing, isMember) {
    isMember = (isMember == undefined) ? (typeof isMember == "boolean") ? isMember : false : false; // Give isMember a default value of false

    switch ((typeof thing).toLowerCase()) {
        case "object":
            return monaco.languages.CompletionItemKind.Class;

        case "function":
            return (isMember) ? monaco.languages.CompletionItemKind.Method : monaco.languages.CompletionItemKind.Function;

        default:
            return (isMember) ? monaco.languages.CompletionItemKind.Property : monaco.languages.CompletionItemKind.Variable;
    }
}

let autoCompletionDictionary = { };

// Register object that will return autocomplete items 
let pythonCompletionsRegistered = false;
function registerPythonCompletions() {
if (pythonCompletionsRegistered) return;
monaco.languages.registerCompletionItemProvider('python', {
    // Run this function when the period or open parenthesis is typed (and anything after a space)
    triggerCharacters: ['.', '('],

    // Function to generate autocompletion results
    provideCompletionItems: function (model, position, token) {
        // Split everything the user has typed on the current line up at each space, and only look at the last word
        var last_chars = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
        if (last_chars.lastIndexOf("(") >= 0) {
            last_chars = last_chars.substring(last_chars.lastIndexOf("(") + 1, last_chars.length);
        }
        var words = last_chars.replace("\t", "").split(" ");
        var active_typing = words[words.length - 1]; // What the user is currently typing (everything after the last space)

        // If the last character typed is a period then we need to look at member objects of the obj object 
        var is_member = active_typing.charAt(active_typing.length - 1) == ".";

        // Array of autocompletion results
        var result = [];

        // Used for generic handling between member and non-member objects
        var last_token = autoCompletionDictionary;
        var prefix = '';

        if (is_member) {
            // Is a member, get a list of all members, and the prefix
            var parents = active_typing.substring(0, active_typing.length - 1).split(".");
            last_token = autoCompletionDictionary[parents[0]];
            prefix = parents[0];

            // Loop through all the parents the current one will have (to generate prefix)
            for (var i = 1; i < parents.length; i++) {
                if (last_token && Object.prototype.hasOwnProperty.call(last_token,parents[i])) {
                    prefix += '.' + parents[i];
                    last_token = last_token[parents[i]];
                } else {
                    // Not valid
                    return result;
                }
            }

            prefix += '.';
        }

        // Get all the child properties of the last token
        for (var prop in last_token) {
            // Do not show properites that begin with "__"
            if (last_token.hasOwnProperty(prop) && !prop.startsWith("__")) {
                // Get the detail type (try-catch) incase object does not have prototype 
                var details = '';
                try {
                    details = last_token[prop].__proto__.constructor.name;
                } catch (e) {
                    details = typeof last_token[prop];
                }

                // Create completion object
                var to_push = {
                    label: prefix + prop,
                    kind: getType(last_token[prop], is_member),
                    detail: details,
                    insertText: prop
                };

                // Change insertText and documentation for functions
                if (to_push.detail.toLowerCase() == 'function') {
                    to_push.insertText += "(";
                    // to_push.documentation = (last_token[prop].toString()).split("{")[0]; // Show function prototype in the documentation popup
                } else if (Array.isArray(last_token[prop])) {
                    to_push.insertText += "[";
                }

                // Add to final results
                result.push(to_push);
            }
        }

        return {
            suggestions: result
        };
    }
});
pythonCompletionsRegistered = true;
}
