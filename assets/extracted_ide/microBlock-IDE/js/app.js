let extensionList = [];
let projectFilePath = null;
let saveAsFlag = false;
let autoConnectPause = false;
window.autoConnectPause = false;
var blocklyWorkspace;
const ROS_POSE_TABLE_STORAGE_KEY = "ros_pose_table_state";
const PROJECT_ASSEMBLY_STORAGE_KEY = "robot_assembly_v1";
const PROJECT_ASSEMBLY_GUIDE_STORAGE_KEY = "robot_assembly_guide_v1";
const PROJECT_NAME_STORAGE_KEY = "microblock_project_name";
const PROJECT_FILE_FORMAT = "microBlockProject";
const PROJECT_FILE_VERSION = 3;

function getAssemblyStateForProject() {
    try {
        const parts = JSON.parse(localStorage.getItem(PROJECT_ASSEMBLY_STORAGE_KEY));
        if (!Array.isArray(parts) && typeof vFSTree !== 'undefined' && vFSTree && (vFSTree['assembly.json'] || vFSTree['/assembly.json'])) {
            const saved = JSON.parse(vFSTree['assembly.json'] || vFSTree['/assembly.json']);
            if (saved && Array.isArray(saved.parts)) return saved;
        }
        return {
            schemaVersion: 1,
            boardId: boardId || "",
            parts: Array.isArray(parts) ? parts : []
        };
    } catch (_) {
        return { schemaVersion: 1, boardId: boardId || "", parts: [] };
    }
}

function normalizeAssemblyGuideState(value) {
    const sessions = Object.create(null);
    if (value && value.sessions && typeof value.sessions === 'object' && !Array.isArray(value.sessions)) {
        Object.keys(value.sessions).forEach(key => {
            const session = value.sessions[key];
            if (!session || session.schema !== 1 || typeof session.productId !== 'string' || typeof session.guideRevision !== 'string' ||
                !Number.isInteger(session.completedCount) || session.completedCount < 0 ||
                (session.lastStepId !== null && typeof session.lastStepId !== 'string')) return;
            sessions[key] = { schema: 1, productId: session.productId, guideRevision: session.guideRevision,
                completedCount: session.completedCount, lastStepId: session.lastStepId };
        });
    }
    return { sessions };
}

function getAssemblyGuideStateForProject() {
    try { return normalizeAssemblyGuideState(JSON.parse(localStorage.getItem(PROJECT_ASSEMBLY_GUIDE_STORAGE_KEY))); }
    catch (_) { return { sessions: {} }; }
}

function getRosPoseTableStateForProject() {
    try {
        const raw = localStorage.getItem(ROS_POSE_TABLE_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return null;
        }
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        return {
            items: items,
            nextId: Math.max(1, parseInt(parsed.nextId, 10) || 1),
            homeId: typeof parsed.homeId === "string" ? parsed.homeId : null
        };
    } catch (error) {
        console.warn("Read ROS pose table state fail", error);
        return null;
    }
}

function applyProjectMeta(meta) {
    window.ProjectGeometry.restore(meta).catch(error=>{console.error(error);NotifyE("Could not restore imported models: "+error.message);});
    try{const pose=window.SimDefaultPosition&&SimDefaultPosition.normalize(meta&&meta.defaultRobotPosition);if(pose)SimDefaultPosition.save(pose);else localStorage.removeItem('robot_default_position_v1');}catch(_){localStorage.removeItem('robot_default_position_v1');}
    try {
        const field=window.SimFieldLayout&&SimFieldLayout.normalize(meta&&meta.fieldLayout);
        if(field)localStorage.setItem('robot_field_layout_v1',JSON.stringify(field));else localStorage.removeItem('robot_field_layout_v1');
    } catch (_) { localStorage.removeItem('robot_field_layout_v1'); }
    if (meta && meta.rosPoseTable) {
        localStorage.setItem(ROS_POSE_TABLE_STORAGE_KEY, JSON.stringify(meta.rosPoseTable));
    } else {
        localStorage.removeItem(ROS_POSE_TABLE_STORAGE_KEY);
    }
    if (meta && meta.assembly && Array.isArray(meta.assembly.parts)) {
        localStorage.setItem(PROJECT_ASSEMBLY_STORAGE_KEY, JSON.stringify(meta.assembly.parts));
    } else {
        localStorage.removeItem(PROJECT_ASSEMBLY_STORAGE_KEY);
    }
    if (meta && meta.assemblyGuide && meta.assemblyGuide.sessions && typeof meta.assemblyGuide.sessions === 'object' && !Array.isArray(meta.assemblyGuide.sessions)) {
        localStorage.setItem(PROJECT_ASSEMBLY_GUIDE_STORAGE_KEY, JSON.stringify(normalizeAssemblyGuideState(meta.assemblyGuide)));
    } else {
        localStorage.removeItem(PROJECT_ASSEMBLY_GUIDE_STORAGE_KEY);
    }
    localStorage.setItem('robot_assembly_guide_revision', Date.now() + '-' + Math.random().toString(36).slice(2));
    localStorage.setItem('robot_assembly_revision', Date.now() + '-' + Math.random().toString(36).slice(2));
    window.dispatchEvent(new Event('robot-assembly-guide-change'));
    window.dispatchEvent(new Event('robot-assembly-change'));
}

async function serializeProjectData() {
    saveCodeToLocal();
    const files = Object.assign({}, vFSTree || {});
    // Assembly is already stored in meta. The pre-update recovery snapshot is
    // session data, not a second robot to embed in every saved program.
    delete files['/assembly.json'];
    delete files['/assembly-before-equipment-update.json'];
    delete files['assembly.json'];
    delete files['assembly-before-equipment-update.json'];
    const assembly=getAssemblyStateForProject();
    const importedGeometry=await window.ProjectGeometry.capture(assembly.parts);
    return JSON.stringify({
        format: PROJECT_FILE_FORMAT,
        version: PROJECT_FILE_VERSION,
        files,
        meta: {
            rosPoseTable: getRosPoseTableStateForProject(),
            assembly,
            ...(importedGeometry?{importedGeometry}:{}),
            assemblyGuide: getAssemblyGuideStateForProject(),
            fieldLayout: window.SimFieldLayout ? SimFieldLayout.load() : null,
            defaultRobotPosition: window.SimDefaultPosition ? SimDefaultPosition.load() : null
        }
    });
}

function parseProjectData(data) {
    const parsed = JSON.parse(data);
    // Project packages saved by Electron also open on the web. Resolve bundled
    // equipment against this installation instead of the desktop-only protocol.
    for (const part of parsed?.meta?.assembly?.parts || []) {
        const base = part.productBaseUrl;
        if(typeof base==='string'){try{const path=new URL(base,document.baseURI).pathname;if(/^\/(products|examples)\//.test(path))part.productBaseUrl=new URL('.'+path,document.baseURI).href;}catch(_){}}
        if (typeof base === 'string' && /^microblock:\/\/\.\/(products|examples)\//.test(base)) {
            part.productBaseUrl = new URL(base.replace('microblock://./', './'), document.baseURI).href;
        }
    }

    if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        parsed.format === PROJECT_FILE_FORMAT &&
        parsed.files &&
        typeof parsed.files === "object"
    ) {
        const files = Object.assign({}, parsed.files);
        if (parsed.meta && parsed.meta.assembly && Array.isArray(parsed.meta.assembly.parts)) files['/assembly.json'] = JSON.stringify(parsed.meta.assembly);
        return {
            files,
            meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : null
        };
    }
    return {
        files: parsed,
        meta: null
    };
}

function syncHeaderProjectName() {
    const projectName = ($("#project-name").val() || "").trim() || "myProject";
    $("#project-name").val(projectName);
    localStorage.setItem(PROJECT_NAME_STORAGE_KEY, projectName);
}

function syncResponsiveHeaderTitles() {
    const compactHeader = window.innerWidth <= 1500;
    const compactProjectGroup = window.innerWidth <= 1280;

    const rightHeaderButtons = [
        ["#open-extension-dialog", "Extension"],
        ["#open-dashboard", "Dashboard"],
        ["#open-examples", "Examples"],
        ["#open-ros", "ROS Tools"],
        ["#open-terminal", "Robot Lab"],
    ];

    const projectGroupButtons = [
        ["#open-project", "Open Project"],
        ["#save-project", "Save Project"],
    ];

    rightHeaderButtons.forEach(([selector, title]) => {
        const button=document.querySelector(selector);
        $(selector).attr("title",button&&!button._tippy&&!window.IDELayout?.hasVisibleLabel(button)?title:null);
    });

    projectGroupButtons.forEach(([selector, title]) => {
        const button=document.querySelector(selector);
        $(selector).attr("title",button&&!button._tippy&&!window.IDELayout?.hasVisibleLabel(button)?title:null);
    });
}

function isAutoConnectPaused() {
    return !!window.autoConnectPause || !!autoConnectPause || !!window.arduinoSerialOwnership || !!window.IDEArduino?.active;
}

function getDefaultCategoryIconByName(categoryName = "") {
    const name = String(categoryName || "").trim().toLowerCase();
    const iconMap = {
        "control": `images/icon/process.png`,
        "operators": `images/icon/maths.png`,
        "operator": `images/icon/maths.png`,
        "variables": `images/icon/relativity.png`,
        "function": `images/icon/jigsaw.png`,
        "functions": `images/icon/jigsaw.png`,
        "advanced": `images/icon/expert.png`,
        "advance": `images/icon/expert.png`,
    };
    return iconMap[name] || "";
}

function resolveCategoryIcon(category, currentBoardId) {
    if (category && typeof category.icon === "string" && category.icon.length > 0) {
        return category.icon.startsWith("/")
            ? category.icon.replace(/^\/+/, "")
            : `boards/${currentBoardId}/${category.icon}`;
    }
    return getDefaultCategoryIconByName(category?.name);
}

function appendCategoryIconAndWait(container, iconSrc, fallbackSrc) {
    const initialSrc = iconSrc || fallbackSrc;
    if (!initialSrc) return Promise.resolve();

    return new Promise(resolve => {
        const image = document.createElement("img");
        let fallbackApplied = false;
        let settled = false;

        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };

        image.alt = "";
        image.addEventListener("load", finish);
        image.addEventListener("error", () => {
            if (!fallbackApplied && fallbackSrc && initialSrc !== fallbackSrc) {
                fallbackApplied = true;
                image.src = fallbackSrc;
                return;
            }
            finish();
        });
        container.appendChild(image);
        image.src = initialSrc;
    });
}

let updateBlockCategory = async () => {
    if (isEmbed) return;

    var categoryIconList = [];
    let toolboxTextXML = `<xml xmlns="https://developers.google.com/blockly/xml">`;

    const board = boards.find(board => board?.id === boardId);
    const level = board?.level?.find(level => level.name === levelName);
    const toolboxTree = level?.blocks || blocksTree;
    for (let category of toolboxTree) {
        toolboxTextXML += `<category name="${category.name}" colour="${category.color}"${typeof category.blocks === "string" ? ` custom="${category.blocks}"` : ''}>`;
        if (typeof category.blocks === "object") {
            for (let block of category.blocks) {
                if (typeof block === "object") {
                    toolboxTextXML += block.xml;
                } else {
                    if (typeof Blockly.Blocks[block] !== "undefined") {
                        if (typeof Blockly.Blocks[block].xml !== "undefined") {
                            toolboxTextXML += Blockly.Blocks[block].xml;
                        } else {
                            toolboxTextXML += `<block type="${block}"></block>`;
                        }
                    } else {
                        console.warn(block, "undefined, forget add blocks_xxx.js ?");
                    }
                }
            }
        } else if (typeof category.blocks === "function") {
            let xmlList = category.blocks(blocklyWorkspace);
            for (let xml of xmlList) {
                toolboxTextXML += Blockly.Xml.domToText(xml);
            }
        }
        toolboxTextXML += `</category>`;
        categoryIconList.push(resolveCategoryIcon(category, boardId));
    }

    // Extenstion
    extenstionTree = [];
    for (const extensionId of fs.ls("/extension")) {
        let extension = fs.read(`/extension/${extensionId}/extension.js`);
        extension = eval(extension);
        if (board?.isArduinoPlatform && (!extension?.supportArduinoPlatform)) { // Skip if select board arduino but extension not support arduino
            continue;
        }
        extenstionTree.push(extension);
        categoryIconList.push(fs.read(`/extension/${extensionId}/${extension.icon}`));
    }
    if (isElectron) {
        let extensionDir = sharedObj.extensionDir;
        for (const extensionId of nodeFS.ls(extensionDir)) {
            let extension = await readFileAsync(`${extensionDir}/${extensionId}/extension.js`);
            extension = extension.toString();
            extension = eval(extension);
            extenstionTree.push(extension);
            categoryIconList.push(`${extensionDir}/${extensionId}/${extension.icon}`);
        }
    }

    for (let category of extenstionTree) {
        toolboxTextXML += `<category name="${category.name}" colour="${category.color}"${typeof category.blocks === "string" ? ` custom="${category.blocks}"` : ''}>`;
        if (typeof category.blocks === "object") {
            for (let block of category.blocks) {
                if (typeof block === "object") {
                    toolboxTextXML += block.xml;
                } else {
                    if (typeof Blockly.Blocks[block] !== "undefined") {
                        if (typeof Blockly.Blocks[block].xml !== "undefined") {
                            toolboxTextXML += Blockly.Blocks[block].xml;
                        } else {
                            toolboxTextXML += `<block type="${block}"></block>`;
                        }
                    } else {
                        console.warn(block, "undefined, forget add blocks_xxx.js ?");
                    }
                }
            }
        } else if (typeof category.blocks === "function") {
            let xmlList = category.blocks(blocklyWorkspace);
            for (let xml of xmlList) {
                toolboxTextXML += Blockly.Xml.domToText(xml);
            }
        }
        toolboxTextXML += `</category>`;
    }

    toolboxTextXML += `</xml>`;

    let toolboxXML = Blockly.utils.xml.textToDom(toolboxTextXML);

    blocklyWorkspace.updateToolbox(toolboxXML);
    /* blocklyWorkspace.scrollbar.resize(); */

    const categoryIconReadyList = [];
    for (const [index, element] of Object.entries($("span.blocklyTreeIcon"))) {
        if (typeof element === "object" && element.nodeType !== undefined) {
            const categoryName = $(element).closest(".blocklyTreeRow").find(".blocklyTreeLabel").text().trim();
            const defaultIcon = getDefaultCategoryIconByName(categoryName);
            const iconSrc = categoryIconList[index] || defaultIcon;
            categoryIconReadyList.push(appendCategoryIconAndWait(element, iconSrc, defaultIcon));
        }
    }
    await Promise.all(categoryIconReadyList);
};

Blockly.triggleResize = function (e) {
    // Python and Arduino hide the blocks surface. Resizing Blockly to zero
    // changes its scroll bounds and loses the user's previous viewport.
    if(!blocklyArea.offsetWidth||!blocklyArea.offsetHeight)return;
    // Position the workspace relative to its containing block, including
    // when the shared application header sits above the editor.
    var element = blocklyArea;
    var x = 0;
    var y = 0;
    do {
        x += element.offsetLeft;
        y += element.offsetTop;
        element = element.offsetParent;
    } while (element && element !== blocklyDiv.offsetParent);
    // Position blocklyDiv over blocklyArea.
    blocklyDiv.style.left = x + 'px';
    blocklyDiv.style.top = y + 'px';
    blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
    blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
    Blockly.svgResize(blocklyWorkspace);
};

let embedOption = {
    id: "",
    width: 0,
    height: 0,
    blockOnly: 0,
    fit: 0
};

if (isEmbed) {
    $("body").addClass("embed");
    $(".page").addClass("embed");
    $(".page > .main > footer").hide();
    $(".top-bar-button").hide();
    $(".blocklyToolboxDiv").hide();
    $(".embed-only").show();

    $("#embed-edit").click(() => {
        window.open(`https://ide.microblock.app/?open=${pageParams.get("open") || ""}`, "_blank");
    });

    let allParams = {};
    for (let p of pageParams) {
        allParams[p[0]] = ((v) => {
            if (v.indexOf("%") > 0) return v;
            return parseInt(v) || 0;
        })(p[1]);
    }
    embedOption = Object.assign(embedOption, allParams);

    if (embedOption.blockOnly == 1) {
        $(".ide-header").hide();
        // blocklyWorkspace.scrollbar.dispose();
        // blocklyWorkspace.zoomControls_.dispose();
        // blocklyWorkspace.zoomControls_.svgGroup_.remove();
    }

    // Blockly.triggleResize();
}

var blocklyArea = document.getElementById('blocklyArea');
var blocklyDiv = document.getElementById('blocklyDiv');

// Blockly defaults to 25px touch scrollbars, which consume too much tablet space.
if (navigator.maxTouchPoints > 0) Blockly.Scrollbar.scrollbarThickness = 12;
blocklyWorkspace = Blockly.inject(blocklyDiv, {
    media: 'blockly/media/',
    toolbox: document.getElementById('toolbox'),
    grid: {
        spacing: 25,
        length: 1,
        colour: '#888',
        snap: true
    },
    trashcan: true,
    zoom: {
        controls: true,
        wheel: (isEmbed && embedOption.blockOnly) ? false : true,
        pinch: !(isEmbed && embedOption.blockOnly),
        startScale: 1,
        maxScale: Infinity,
        minScale: 0.3,
        scaleSpeed: 1.2
    },
    scrollbars: (isEmbed && embedOption.blockOnly) ? false : true,
    comments: true,
    disable: true,
    maxBlocks: Infinity,
    rtl: false,
    oneBasedIndex: false,
    sounds: true,
    readOnly: isEmbed,

    /* Option */
    renderer: localStorage.getItem("renderer") || "geras",
    theme: Blockly.Themes.Zelos,
});

// Apply shadow colours in the same render pass, in both workspace and flyout.
// This avoids a pale first frame and repeated scans of the entire workspace.
const originalBlockApplyColour = Blockly.BlockSvg.prototype.applyColour;
Blockly.BlockSvg.prototype.applyColour = function () {
    originalBlockApplyColour.apply(this, arguments);
    if (!this.isShadow() || !this.pathObject || !this.style) return;
    const primaryColour = this.style.colourPrimary || this.getColour();
    if (!primaryColour) return;
    if (this.pathObject.svgPath) {
        this.pathObject.svgPath.setAttribute('fill', primaryColour);
        this.pathObject.svgPath.setAttribute('stroke', 'none');
    }
    if (this.pathObject.svgPathDark) this.pathObject.svgPathDark.setAttribute('fill', primaryColour);
    for (const input of this.inputList) {
        for (const field of input.fieldRow) {
            if (!(field instanceof Blockly.FieldDropdown)) continue;
            for (const arrow of [field.arrow, field.svgArrow]) {
                if (!arrow) continue;
                arrow.style.display = '';arrow.style.opacity = '1';arrow.style.fill = '#ffffff';
                arrow.setAttribute('visibility', 'visible');
            }
        }
    }
};
// End synchronous shadow colours.

window.addEventListener('resize', Blockly.triggleResize, false);
// Flex panels and tablet orientation can settle after the window resize event.
let workspaceResizeFrame = 0;
const observeWorkspaceSize = () => {
    cancelAnimationFrame(workspaceResizeFrame);
    workspaceResizeFrame = requestAnimationFrame(() => {
        Blockly.triggleResize();
        if (typeof editor !== 'undefined' && editor) editor.layout();
    });
};
new ResizeObserver(observeWorkspaceSize).observe(blocklyArea);
if (window.visualViewport) window.visualViewport.addEventListener('resize', observeWorkspaceSize);
window.addEventListener('resize', syncResponsiveHeaderTitles, false);
Blockly.triggleResize();
syncResponsiveHeaderTitles();

// Blockly selects categories on pointerdown. On touch, wait until release so
// browsing the category list does not open a flyout under a scrolling finger.
const touchToolbox = document.getElementById('blocklyDiv');
if (touchToolbox) {
    let categoryTap = null;
    const categoryPointers = new Set();
    touchToolbox.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch') return;
        if (!event.target.closest('.blocklyToolboxDiv')) return;
        if (blocklyWorkspace.isDragging()) return;
        categoryPointers.add(event.pointerId);
        event.stopImmediatePropagation();
        if (!event.isPrimary) { categoryTap = null; return; }
        const row = event.target.closest('.blocklyTreeRow');
        categoryTap = row ? { row, id:event.pointerId, x:event.clientX, y:event.clientY, scroll:touchToolbox.scrollTop } : null;
        // Do not preventDefault: Safari must retain native list scrolling.
    }, true);
    touchToolbox.addEventListener('pointermove', event => {
        if (categoryTap && event.pointerId === categoryTap.id &&
            Math.hypot(event.clientX-categoryTap.x,event.clientY-categoryTap.y)>8) categoryTap = null;
    }, true);
    document.addEventListener('pointercancel', event => {
        categoryPointers.delete(event.pointerId);
        if (categoryTap?.id === event.pointerId) categoryTap = null;
    }, true);
    document.addEventListener('pointerup', event => {
        // Only consume gestures that STARTED in the category list. A block
        // dropped here still needs Blockly's pointerup to finish/delete it.
        if (!categoryPointers.delete(event.pointerId)) return;
        event.stopImmediatePropagation();
        const tap = categoryTap;
        categoryTap = null;
        if (!tap || event.pointerId !== tap.id || Math.abs(touchToolbox.scrollTop-tap.scroll)>2 ||
            !tap.row.contains(event.target) || Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>8) return;
        event.preventDefault();
        const toolbox = blocklyWorkspace.getToolbox();
        const item = toolbox.getToolboxItemById(tap.row.id);
        if (item && item.isSelectable()) {
            toolbox.setSelectedItem(item);
            item.onClick(event);
            Blockly.hideChaff(true);
        }
    }, true);
    touchToolbox.addEventListener('mousedown', event => {
        if (event.sourceCapabilities?.firesTouchEvents && event.target.closest('.blocklyToolboxDiv')) event.stopImmediatePropagation();
    }, true);
}

/** Override Blockly.alert() with custom implementation. */
Blockly.dialog.setAlert((message, callback) => {
    Notiflix.Report.Info("Alert", message, "OK", callback);
});

/** Override Blockly.confirm() with custom implementation. */
Blockly.dialog.setConfirm((message, callback) => {
    Notiflix.Confirm.Show('Are you Confirm ?', message, 'Yes', 'No', function () {
        callback(true);
    },
        function () {
            callback(false);
        });
});

Notiflix.Confirm.Init({
    plainText: false,
    cssAnimationStyle: "fade",
    cssAnimationDuration: 0,
    cssAnimationDurationFade: 0
});

/** Override Blockly.prompt() with custom implementation. */
Blockly.dialog.setPrompt((message, defaultValue, callback) => {
    Notiflix.Confirm.Show("Prompt", `${message}<br><br><input type="text" id="prompt-input" value="${defaultValue}">`, 'OK', 'Cancle', function () {
        callback($("#prompt-input").val());
    },
        function () {
            callback(null);
        });
});

const selectRenderer = renderer => {
    localStorage.setItem("renderer", renderer);
    window.location.reload();
};

if (isElectron) {
    nodeFS.walk = (dir) => {
        return new Promise((resolve, reject) => {
            let files = [];
            dive(dir, (err, file) => {
                files.push(file);
            }, () => {
                resolve(files);
            });
        });
    };

    nodeFS.ls = (dir) => nodeFS.readdirSync(dir).filter(f => nodeFS.statSync(path.join(dir, f)).isDirectory());
}

file_name_select = "main.xml";

const updateWorkspace = async () => {
    cancelWorkspaceSave();
    if (file_name_select.endsWith(".xml")) { // Update block
        const code = fs.read(`/${file_name_select}`);
        blocklyWorkspace.clear();
        $("#mode-select-switch > li[data-value='1']").click();
        if (code) {
            try {
                Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(code), blocklyWorkspace);
            } catch (e) {
                console.log(e);
            }
            blocklyWorkspace.scrollCenter();
        }
    }

    if (file_name_select.endsWith(".py")) {
        await switchIDEEditorMode(2);
    }
}

/* Auto Save to localStorage */
const updataWorkspaceAndCategoryFromvFS = async (disable_load_fs) => {
    if (!vFSTree) {
        vFSTree = {};
    }

    for (const extensionId of fs.ls("/extension")) {
        let extensionLocalPath = `/extension/${extensionId}`;
        let blocksFile = fs.walk(`${extensionLocalPath}/blocks`);
        for (const file of blocksFile) {
            if (file.endsWith(".js")) {
                let jsContent = fs.read(`${extensionLocalPath}/blocks/${file}`);
                try {
                    eval(jsContent);
                } catch (e) {
                    NotifyE("Script run error: " + e.toString());
                    console.error(e);
                }
            } else {
                console.warn("Why file " + file + " in blocks ? support .js only so skip it");
            }
        }
    }

    if (isElectron) {
        // Load local extension
        let extensionDir = sharedObj.extensionDir;
        for (const extensionId of nodeFS.ls(extensionDir)) {
            let extensionLocalPath = `${extensionDir}/${extensionId}`;
            let blocksFile = await nodeFS.walk(`${extensionLocalPath}/blocks`);
            for (const file of blocksFile) {
                if (file.endsWith(".js")) {
                    let jsContent = await readFileAsync(file);
                    jsContent = jsContent.toString();
                    try {
                        eval(jsContent);
                    } catch (e) {
                        NotifyE("Script run error: " + e.toString());
                        console.error(e);
                    }
                } else {
                    console.warn("Why file " + file + " in blocks ? support .js only so skip it");
                }
            }
        }
    }

    await updateBlockCategory();

    if (disable_load_fs) {
        return;
    }

    await updateWorkspace();
}

let hotUpdate = async () => {
    if (!vFSTree) {
        vFSTree = {};
    }
    let configFileContent = fs.read("/config.json");
    if (configFileContent) {
        let projectConfig = JSON.parse(configFileContent);
        if (projectConfig) {
            // useMode = projectConfig?.mode || "block";
            boardId = projectConfig?.board || null;
            levelName = projectConfig?.level || null;
        }
    }

    const file_list = fs.ls("/");
    if (file_list.indexOf("main.py") >= 0) {
        useMode = "code";
        file_name_select = "main.py";
    } else if (file_list.indexOf("main.xml") >= 0) {
        useMode = "block";
        file_name_select = "main.xml";
    } else {
        useMode = "block";
    }

    if ((!boardId) || (!levelName)) {
        boardId = boards[0].id;
        levelName = boards[0].level[0].name;
    }

    await loadBoard();
    if (useMode === "block") {
        await updataWorkspaceAndCategoryFromvFS();
    } else if (useMode === "code") {
        await updateWorkspace();
    }
    window.dispatchEvent(new CustomEvent('robot-project-loaded', { detail: { boardId: boardId } }));
}


let loadCodeAlready = false;
let callHotUpdate = true;
// Project files (including images and libraries) can exceed localStorage's
// small quota. Keep the recovery snapshot in an IndexedDB transaction.
let recoveryDBPromise;
function recoveryDatabase() {
    if (!recoveryDBPromise) recoveryDBPromise = new Promise((resolve,reject) => {
        const request = indexedDB.open('roboblocks-project-recovery',1);
        request.onupgradeneeded = () => request.result.createObjectStore('projects');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return recoveryDBPromise;
}
async function readProjectRecovery() {
    const db = await recoveryDatabase();
    return new Promise((resolve,reject) => {
        const tx = db.transaction('projects');
        const store = tx.objectStore('projects');
        const request = store.get('current');
        const source = store.get('exampleSource');
        tx.oncomplete = () => resolve({files:request.result, exampleSource:source.result});
        tx.onerror = () => reject(tx.error);
    });
}
let recoveryWrite = Promise.resolve();
function writeProjectRecovery(files) {
    const snapshot = JSON.stringify(files);
    const exampleSource = window.ProjectExamples?.current ? JSON.parse(JSON.stringify(window.ProjectExamples.current)) : null;
    recoveryWrite = recoveryWrite.catch(() => {}).then(async () => {
        const db = await recoveryDatabase();
        await new Promise((resolve,reject) => {
            const tx = db.transaction('projects','readwrite');
            tx.objectStore('projects').put(snapshot,'current');
            tx.objectStore('projects').put(exampleSource,'exampleSource');
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('Recovery save aborted'));
        });
        localStorage.removeItem('autoSaveFS');
    });
    recoveryWrite.catch(error => {
        console.error('Project recovery save failed:',error);
        NotifyE('Recovery storage could not be saved. Download your project before closing this page.');
    });
    return recoveryWrite;
}

if (isElectron) {
    for (let arg of sharedObj.argv) {
        if (arg.endsWith(".mby")) {
            let filePath = arg;
            console.log(filePath);
            if (nodeFS.existsSync(filePath)) {
                const projectData = parseProjectData(nodeFS.readFileSync(filePath).toString());
                vFSTree = projectData.files;
                applyProjectMeta(projectData.meta);
                loadCodeAlready = true;
                sharedObj.argv = [];
            }
            break;
        }
    }
}

let startupPromise = null;
{
    let openArg = pageParams.get("open");
    if (openArg) {
        startupPromise = (async (fileName) => {
            Notiflix.Block.Standard("body", 'Loading...');

            let fileContent = await fetch(`https://us-central1-ublock-c0a08.cloudfunctions.net/share/files/${fileName}`, {
                method: "get",
                redirect: "follow"
            });

            fileContent = await fileContent.text();

            await openProjectFromData(fileContent, fileName);

            Notiflix.Block.Remove("body");

            if (isEmbed) {
                if (embedOption.blockOnly == 1) {
                    blocklyWorkspace.zoomControls_.svgGroup_.remove();
                }
                let { width, height } = blocklyWorkspace.getCanvas().getBBox();
                let updateFrameSize = window.parent.microBlock.updateFrameSize;
                if (updateFrameSize) {
                    let fSizeW = embedOption.width;
                    let fSizeH = embedOption.height;
                    if (fSizeW === 0) fSizeW = `${width + 20 + (embedOption.blockOnly != 1 ? 20 : 0)}px`;
                    if (fSizeH === 0) fSizeH = `${height + 20 + (embedOption.blockOnly != 1 ? 60 : 0)}px`;
                    updateFrameSize(embedOption.id, fSizeW, fSizeH);
                    setTimeout(() => {
                        blocklyWorkspace.scrollCenter();
                        if (embedOption.fit == 1) {
                            blocklyWorkspace.zoomToFit();
                        }
                    }, 10);
                }
            }
        })(openArg);
        callHotUpdate = false;
    }
}

window.arduinoStartupPending = false;
try {
    const savedArduino = isElectron && JSON.parse(localStorage.getItem('roboblocks-active-arduino'));
    window.arduinoStartupPending = !loadCodeAlready && !pageParams.get('open') && ['buildbot','atom-vx','atom-mini','strom-mini'].includes(savedArduino?.board);
} catch (_) {}

if (!loadCodeAlready) {
    vFSTree = JSON.parse(localStorage.getItem("autoSaveFS"));
}

if (callHotUpdate) {
    startupPromise = (async () => {
        let recoveredExample = null;
        if (!loadCodeAlready) {
            try {
                const saved = await readProjectRecovery();
                if (saved?.files) { vFSTree = JSON.parse(saved.files); recoveredExample = saved.exampleSource; }
            } catch (error) { console.warn('Read recovery storage failed:',error); }
        }
        await hotUpdate();
        await window.ProjectExamples?.restoreSource(recoveredExample);
    })();
}

Promise.resolve(startupPromise)
    .catch(error => console.error("Application startup failed:", error))
    .finally(() => { performance.mark("ide-workspace-ready"); if(!window.arduinoStartupPending) $("#full-loading").fadeOut(()=>document.body.classList.remove("workspace-booting")); });

var workspaceSaveTimer = null;
var workspaceSaveContext = null;
function cancelWorkspaceSave() {
    clearTimeout(workspaceSaveTimer);
    workspaceSaveTimer = null;
    workspaceSaveContext = null;
}
const scheduleWorkspaceSave = event => {
    if (!event || event.isUiEvent) return;
    if (event.workspaceId && event.workspaceId !== blocklyWorkspace.id) return;
    clearTimeout(workspaceSaveTimer);
    workspaceSaveContext = { file: file_name_select, tree: vFSTree };
    const commit = () => {
        const context = workspaceSaveContext;
        if (!context || context.file !== file_name_select || context.tree !== vFSTree) { cancelWorkspaceSave(); return; }
        if (blocklyWorkspace.isDragging()) { workspaceSaveTimer = setTimeout(commit, 150); return; }
        saveCodeToLocal();
    };
    workspaceSaveTimer = setTimeout(commit, 250);
};
let saveCodeToLocal = () => {
    cancelWorkspaceSave();
    syncHeaderProjectName();
    const file_write_path = `/${file_name_select}`;
    if (file_write_path.endsWith(".xml")) {
        // fs.remove("/main.py");
        try {
            var xmlText = Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(blocklyWorkspace));
            fs.write(file_write_path, xmlText);
        } catch (e) {
            console.log(e);
        }
    } else if (file_write_path.endsWith(".py")) {
        // fs.remove("/main.xml");
        fs.write(file_write_path, editor.getValue());
    }
    fs.write("/config.json", JSON.stringify({
        mode: useMode,
        github: github_project_repo,
        board: boardId,
        level: levelName
    }));
    return writeProjectRecovery(vFSTree);
};

blocklyWorkspace.addChangeListener(scheduleWorkspaceSave);
window.addEventListener('beforeunload', () => {
    if (workspaceSaveContext) saveCodeToLocal();
});
window.addEventListener('pagehide', () => {
    if (workspaceSaveContext) saveCodeToLocal();
});
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && workspaceSaveContext) saveCodeToLocal();
});
/* -------------- */

/*
$("#new-project").click(async () => {
    if (await NotifyConfirm("All blocks will lost. Are you sure of new project ?")) {
        blocklyWorkspace.clear();
        if (editor) editor.setValue("");
        vFSTree = "";
        vFSTree = { };

        updateBlockCategory();
    }
});
*/

$("#save-project").click(async () => {
    if(window.IDEArduino?.active){window.IDEArduino.command("save");return;}
    try {
    if(await window.ProjectExamples?.chooseSave())return;
    if (!github_project_repo) { // Save to local
        if (!isElectron) {
            let data = await serializeProjectData();
            let blob = new Blob([data], { type: "application/json" });
            let url = window.URL.createObjectURL(blob);

            let link = document.createElement("a");
            link.download = $("#project-name").val() + ".mby";
            link.href = url;
            link.click();

            window.URL.revokeObjectURL(url);

            statusLog("Save project");
        } else {
            let OpenFilePath = "";
            if ((!projectFilePath) || saveAsFlag) {
                let result = await dialog.showSaveDialog({
                    filters: [{
                        name: 'roboBlocks IDE',
                        extensions: ['mby']
                    }],
                    defaultPath: $("#project-name").val() + ".mby"
                });

                if (result.canceled) {
                    return;
                }

                projectFilePath = result.filePath;
                saveAsFlag = false;
            }

            nodeFS.writeFile(projectFilePath, await serializeProjectData(), err => {
                if (err) {
                    NotifyE("Save project fail: " + err.toString());
                    return;
                }

                NotifyS("Save project at " + projectFilePath);
                statusLog("Save project at " + projectFilePath);
            });
        }
    } else { // Save to GitHub
        await saveCodeToGitHub();
    }
    } catch(error) { NotifyE("Save project failed: "+error.message); console.error(error); }
});

let openProjectFromData = async (data, path) => {
    if(/\.(ino|cpp|c|h|hpp)$/i.test(path)){if(!isElectron)throw Error('Arduino projects are available in the desktop IDE.');await window.IDEArduino.importSketch(path);return;}
    if(/\.zip$/i.test(path)){if(!isElectron)throw Error('Arduino projects are available in the desktop IDE.');await window.IDEArduino.importArchive(data,path);return;}

    let arduinoProject;try{arduinoProject=JSON.parse(String(data));}catch(_){}
    if(arduinoProject?.format==='roboblocks-arduino'){
        if(!isElectron)throw Error('Arduino projects are available in the desktop IDE.');
        await window.IDEArduino.importProject(arduinoProject,path);return;
    }
    let projectData = parseProjectData(data);
    // Leaving Arduino reveals the previous Blockly workspace. Keep its layout
    // measurable, but concealed until board/extension loading and rendering end.
    const projectSurface = document.querySelector('article.main');
    projectSurface?.classList.add('project-opening');
    projectSurface?.setAttribute('aria-busy', 'true');
    try {
    await window.IDEArduino?.leave();
    window.ProjectExamples?.clearSource();
    cancelWorkspaceSave();
    vFSTree = projectData.files;
    applyProjectMeta(projectData.meta);
    await window.ProjectGeometry.ready;
    await hotUpdate();
    if (!isEmbed) NotifyS("Open project " + path)
    statusLog("Open project " + path);
    $("#project-name").val(path.split(/[\\\/]/).pop().replace(".mby", ""));
    syncHeaderProjectName();
    // Importing does not always emit a Blockly change event. Persist the
    // loaded project now, rather than waiting for the first edit/unload.
    try {
        await saveCodeToLocal();
    } catch (error) {
        console.error('Project recovery save failed:', error);
        NotifyE('Project opened, but browser recovery storage could not be saved. Download a copy before closing this page.');
    }
    } finally {
        try {
            Blockly.triggleResize();
            // Allow queued SVG rendering/resizing to settle before revealing it.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        } finally {
            projectSurface?.classList.remove('project-opening');
            projectSurface?.removeAttribute('aria-busy');
        }
    }
}

let openProject = async (filePath) => {
    if (!await NotifyConfirm("All blocks will lost. Are you sure of open project ?")) {
        return;
    }

    if (!isElectron) {
        let input = document.createElement("input");
        input.type = "file";
        input.accept = ".mby";
        input.addEventListener("change", function () {
            // console.log(this.files);
            let fileName = this.files[0].name.replace(".mby", "");
            let fr = new FileReader();
            fr.onload = async () => {
                openProjectFromData(fr.result, fileName);
            };
            fr.readAsText(this.files[0]);
        }, false);
        input.click();
    } else {
        let OpenFilePath = null;
        if (!filePath) {
            let result = await dialog.showOpenDialogSync({
                properties: [
                    'openFile'
                ],
                filters: [{
                    name: 'roboBlocks IDE',
                    extensions: ['mby','json','zip','ino','cpp','c','h','hpp']
                }]
            });

            if (result == undefined) {
                return;
            }

            OpenFilePath = result[0];
        } else {
            OpenFilePath = filePath;
        }

        nodeFS.readFile(OpenFilePath, async (err, data) => {
            if (err) {
                NotifyE("Open project fail: " + err.toString());
                return;
            }

            try {
                let isArduinoProject=/\.(zip|ino|cpp|c|h|hpp)$/i.test(OpenFilePath);
                try { isArduinoProject=isArduinoProject||JSON.parse(String(data)).format==='roboblocks-arduino'; } catch(_) {}
                await openProjectFromData(data, OpenFilePath);
                if(!isArduinoProject)projectFilePath = OpenFilePath;
            } catch(error) { NotifyE('Open project failed: '+error.message); }
        });
    }
};

$("#open-project").click(async () => {

    openProject();
});

$("#open-help").click(() => {
    if (!isElectron) {
        window.open("https://microblock.app/", "_blank");
    } else {
        shell.openExternal("https://microblock.app/");
    }
});

let imageSelectUpdate = (sel) => {
    $(sel).find("li > div").click(function () {
        $(sel).find("li > div").removeClass("active");
        $(this).addClass("active");
    });
};

$(() => {
    for (sel of $(".image-select")) {
        imageSelectUpdate(sel);
    }
    const savedProjectName = (localStorage.getItem(PROJECT_NAME_STORAGE_KEY) || "").trim();
    if (savedProjectName) {
        $("#project-name").val(savedProjectName);
    }
    syncHeaderProjectName();
    $("#project-name").on("input change", syncHeaderProjectName);
});

let statusLog = text => {
    let now = new Date();
    $("#text-status").text(`${text} at ${now.getHours()}:${(now.getMinutes() < 10 ? "0" : "")}${now.getMinutes()}:${(now.getSeconds() < 10 ? "0" : "")}${now.getSeconds()}`);
};

$(document).keydown(function (event) {
    // console.log(event)
    if (event.ctrlKey) {
        let key = event.key;
        if (key === 's') { // Ctrl + S -> Save
            event.preventDefault();
            $("#save-project").click();
        } else if (key === 'n') { // Ctrl + N -> New
            event.preventDefault();
            $("#new-project").click();
        } else if (key === 'o') { // Ctrl + O -> Open
            event.preventDefault();
            $("#open-project").click();
        } else if (key === 'h') { // Ctrl + H -> Help
            event.preventDefault();
            $("#open-help").click();
        } else if (key === 't') { // Ctrl + T -> Terminal
            event.preventDefault();
            $("#open-terminal").click();
        } else if (key === 'u') { // Ctrl + U -> Upload
            event.preventDefault();
            $("#upload-program").click();
        }
    }

    return true;
});

$("body")[0].addEventListener("drop", (e) => {
    e.preventDefault();

    if (e.dataTransfer.items.length > 0) {
        let fPath = e.dataTransfer.items[0].getAsFile().path;

        // console.log(fPath);
        if (fPath.endsWith(".mby")) {
            openProject(fPath);
        }
    }
});

$("body")[0].addEventListener("dragover", (e) => {
    e.preventDefault();
});

let autoConnectFlag = true;
window.autoConnectFlag = true;
let timerAutoConnect = null;
let autoConnectBusy = false;

function getAutoConnectFlag() {
    if (typeof window.autoConnectFlag === "boolean") {
        autoConnectFlag = window.autoConnectFlag;
    } else {
        window.autoConnectFlag = autoConnectFlag;
    }
    return autoConnectFlag;
}

let initialAutoConnectCheck = async () => {
    const autoConnectEnabled = getAutoConnectFlag();
    if (autoConnectEnabled && !isAutoConnectPaused() && boardId && isElectron && !currentTransport && deviceMode === MODE_REAL_DEVICE && !autoConnectBusy) {
        let board = boards.find(board => board.id === boardId);
        let usbInfo = board.usb?.[0];
        let portList = await serialAPI.SerialPort.list();
        if (portList && usbInfo) {
            let port = portList.find(info =>
                info.productId?.toString(16).toUpperCase() === usbInfo.productId?.toUpperCase() &&
                info.vendorId?.toString(16).toUpperCase() === usbInfo.vendorId?.toUpperCase()
            );
            if (port) {
                console.log(`⚡ Auto-connect (Electron): ${port.path}`);
                serialConnectElectron(port.path, true);
            }
        }
    }
    else if (
        autoConnectEnabled &&
        !isAutoConnectPaused() &&
        boardId &&
        !isElectron &&
        !currentTransport &&
        deviceMode === MODE_REAL_DEVICE &&
        !autoConnectBusy &&
        navigator.serial &&
        typeof navigator.serial.getPorts === "function"
    ) {
        try {
            const ports = await navigator.serial.getPorts();
            if (ports.length > 0) {
                const port = ports[0];
                const info = port.getInfo();
                const productId = info.usbProductId?.toString(16).toUpperCase();
                const vendorId = info.usbVendorId?.toString(16).toUpperCase();

                const board = boards.find(b =>
                    b.usb?.some(u =>
                        u.vendorId?.toUpperCase() === vendorId &&
                        u.productId?.toUpperCase() === productId
                    )
                );

                if (board && board.id === boardId) {
                    console.log(`⚡ Auto-connect (Web): ${board.name}`);
                    if (!serialPort && !isSerialConnecting) {
                        serialConnectWeb(true);
                    }
                }
            }
        } catch (e) {
            console.warn("⚠️ Web auto-connect failed:", e);
        }
    }

    if (timerAutoConnect) clearTimeout(timerAutoConnect);
    timerAutoConnect = setTimeout(autoConnectCheck, autoConnectEnabled ? 500 : 5000);
};

autoConnectCheck = async () => {
    const autoConnectEnabled = getAutoConnectFlag();
    if (autoConnectEnabled && !isAutoConnectPaused() && boardId && isElectron && !currentTransport && deviceMode === MODE_REAL_DEVICE && !autoConnectBusy) {
        autoConnectBusy = true;
        try {
            const lastBoardId = localStorage.getItem("ptbot_last_board_id");
            const lastTransport = localStorage.getItem("ptbot_last_transport");
            const lastSerialPort = localStorage.getItem("ptbot_last_serial_port");
            const lastWifiHost = localStorage.getItem("ptbot_wifi_ip");
            const lastWifiPort = +localStorage.getItem("ptbot_wifi_port") || 8080;
            const board = boards.find(board => board.id === boardId);
            const usbInfo = board?.usb?.[0];
            const portList = await serialAPI.SerialPort.list();

            if (lastBoardId === boardId && lastTransport === "wifi" && lastWifiHost && !currentTransport) {
                try {
                    console.log(`Auto-connect last Wi-Fi target (Electron): ${lastWifiHost}:${lastWifiPort}`);
                    await connectWiFiREPL(lastWifiHost, lastWifiPort);
                } catch (wifiError) {
                    console.warn("Auto-connect last Wi-Fi target failed:", wifiError);
                    try {
                        localStorage.removeItem("ptbot_last_board_id");
                        localStorage.removeItem("ptbot_last_transport");
                        localStorage.removeItem("ptbot_wifi_ip");
                        localStorage.removeItem("ptbot_wifi_port");
                    } catch { }
                }
            }

            if (lastBoardId === boardId && lastTransport === "usb" && lastSerialPort && !currentTransport) {
                const lastPortStillExists = portList?.some(info => info.path === lastSerialPort);
                if (lastPortStillExists) {
                    console.log(`Auto-connect last USB port (Electron): ${lastSerialPort}`);
                    await serialConnectElectron(lastSerialPort, true);
                }
            }

            if (!currentTransport && portList && usbInfo) {
                const port = portList.find(info =>
                    info.productId?.toString(16).toUpperCase() === usbInfo.productId?.toString(16).toUpperCase() &&
                    info.vendorId?.toString(16).toUpperCase() === usbInfo.vendorId?.toString(16).toUpperCase()
                );
                if (port) {
                    console.log(`Auto-connect detected board (Electron): ${port.path}`);
                    await serialConnectElectron(port.path, true);
                }
            }
        } finally {
            autoConnectBusy = false;
        }
    }
    else if (
        autoConnectEnabled &&
        !isAutoConnectPaused() &&
        boardId &&
        !isElectron &&
        !currentTransport &&
        deviceMode === MODE_REAL_DEVICE &&
        !autoConnectBusy &&
        navigator.serial &&
        typeof navigator.serial.getPorts === "function"
    ) {
        autoConnectBusy = true;
        try {
            const ports = await navigator.serial.getPorts();
            if (ports.length > 0) {
                const port = ports[0];
                const info = port.getInfo();
                const productId = info.usbProductId?.toString(16).toUpperCase();
                const vendorId = info.usbVendorId?.toString(16).toUpperCase();

                const board = boards.find(b =>
                    b.usb?.some(u =>
                        u.vendorId?.toUpperCase() === vendorId &&
                        u.productId?.toUpperCase() === productId
                    )
                );

                if (board && board.id === boardId) {
                    console.log(`Auto-connect (Web): ${board.name}`);
                    if (!serialPort && !isSerialConnecting) {
                        await serialConnectWeb(true);
                    }
                }
            }
        } catch (e) {
            console.warn("Web auto-connect failed:", e);
        } finally {
            autoConnectBusy = false;
        }
    }

    if (timerAutoConnect) clearTimeout(timerAutoConnect);
    timerAutoConnect = setTimeout(autoConnectCheck, autoConnectEnabled ? 500 : 5000);
};

setTimeout(autoConnectCheck, 500);

