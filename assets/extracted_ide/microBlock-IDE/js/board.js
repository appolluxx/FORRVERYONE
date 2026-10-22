let boards = [];
let boardId = null;
let levelName = null;

let addBoard = board => boards.push(board);

let boardIdSelect = null;
let headerBoardTagSelect = "Recommend";
let newProjectLanguage = 'block';
function refreshProjectLanguage() {
    document.getElementById('project-download-ide').hidden = isElectron;
    document.querySelector('.project-arduino-mode').classList.toggle('has-download', !isElectron);
    const arduinoOnly = !!boards.find(board => board.id === boardIdSelect)?.arduinoOnly;
    const supported = isElectron && ['buildbot', 'atom-vx', 'atom-mini', 'strom-mini'].includes(boardIdSelect);
    if (arduinoOnly) newProjectLanguage = 'arduino';
    if (newProjectLanguage === 'arduino' && !supported && !arduinoOnly) newProjectLanguage = 'block';
    $('#project-language-options button').each(function () {
        this.disabled = this.dataset.language === 'arduino' ? !supported : arduinoOnly;
        this.setAttribute('aria-pressed', String(this.dataset.language === newProjectLanguage));
    });
    $('#project-language-note').text(!isElectron ? 'Arduino C++ is available in the Windows app.' : !supported ? 'Select a supported Arduino board.' : newProjectLanguage === 'arduino' ? 'Compile and upload to your board in the Arduino C++ editor.' : 'Use blocks or Python with your robot and SIM.');
}
$('#project-language-options button').on('click', function () {
    newProjectLanguage = this.dataset.language;
    refreshProjectLanguage();
});

function getBoardAssetPath(boardId, assetPath) {
    return `boards/${boardId}/${String(assetPath || "").replace(/^\/+/, "")}`;
}

function refreshRosToolsVisibility() {
    const currentBoard = boards.find(board => board.id === boardId);
    const showRosTools = !!currentBoard?.showRosTools;
    const $rosButton = $("#open-ros");
    const $rosItem = $rosButton.closest("li");
    if (!$rosButton.length || !$rosItem.length) {
        return;
    }

    $rosButton.toggle(showRosTools);
    $rosItem.toggle(showRosTools);
}

function buildHeaderBoardTagList(boardList) {
    return ["Recommend"].concat(
        boardList
            .map(board => Array.isArray(board.tags) ? board.tags : [])
            .reduce((accumulator, currentValue) => accumulator.concat(currentValue), [])
            .filter((item, index, arr) => arr.indexOf(item) === index)
            .sort()
    );
}

function getHeaderBoardFilteredList(boardList) {
    if (!headerBoardTagSelect || headerBoardTagSelect === "Recommend") {
        return boardList;
    }
    return boardList.filter(board => Array.isArray(board.tags) && board.tags.indexOf(headerBoardTagSelect) >= 0);
}

function renderHeaderBoardMenu(boardList, currentValue) {
    const filteredBoardList = getHeaderBoardFilteredList(boardList);
    const tags = buildHeaderBoardTagList(boardList);

    return `
        <ul id="header-board-tags-list">
            ${tags.map(tag => `<li${tag === headerBoardTagSelect ? ' class="active"' : ""}>${tag}</li>`).join("")}
        </ul>
        <div class="header-board-options-grid">
            ${filteredBoardList.map(board => `
                <button type="button" class="header-board-option${board.id === currentValue ? " active" : ""}" data-board-id="${board.id}" role="option" aria-selected="${board.id === currentValue ? "true" : "false"}">
                    <img src="${getBoardAssetPath(board.id, board.image)}" alt="${board.name}">
                    <span class="header-board-option-name">${board.name}</span>
                </button>
            `).join("")}
        </div>
    `;
}

async function resetWorkspaceForBoard(nextBoardId, projectName = "myProject") {
    await window.IDEArduino?.leave();
    window.ProjectExamples?.clearSource();
    cancelWorkspaceSave();
    boardId = nextBoardId;
    levelName = boards.find(board => board.id === boardId).level[0].name;
    refreshRosToolsVisibility();

    if (window.motorSimulation) window.motorSimulation.stop();
    try { localStorage.setItem('ptbot_selected_board_id', boardId); } catch (_) { }

    fs.ls("/").filter(a => a.endsWith(".py") || a.endsWith(".xml")).map(a => fs.remove("/" + a));
    fs.remove('/assembly.json');
    localStorage.removeItem("ros_pose_table_state");
    localStorage.removeItem('robot_assembly_v1');
    localStorage.removeItem('robot_field_layout_v1');
    localStorage.removeItem('robot_default_position_v1');
    localStorage.removeItem('robot_assembly_guide_v1');
    localStorage.setItem('robot_assembly_guide_revision', Date.now() + '-' + Math.random().toString(36).slice(2));
    localStorage.setItem('robot_assembly_revision', Date.now() + '-' + Math.random().toString(36).slice(2));

    blocklyWorkspace.clear();
    window.dispatchEvent(new CustomEvent('robot-project-reset', { detail: { boardId: nextBoardId } }));
    if (editor) editor.setValue("");

    await loadBoard();

    file_name_select = "main." + (useMode === "block" ? "xml" : "py");

    {
        const board = boards.find(board => board.id === (boardId || "buildbot"));
        if (board?.defaultCode) {
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(board.defaultCode), blocklyWorkspace);
        }
    }

    if (useMode === "block") {
        updataWorkspaceAndCategoryFromvFS(true);
        blocklyWorkspace.setScale(blocklyWorkspace.options.zoomOptions.startScale);
        blocklyWorkspace.scrollCenter();
    }

    $("#project-name").val(projectName);
    if (typeof syncHeaderProjectName === "function") {
        syncHeaderProjectName();
    }
}

function refreshHeaderBoardSelect() {
    const $picker = $("#header-board-picker");
    const $menu = $("#header-board-menu");
    const $trigger = $("#header-board-trigger");
    const $triggerImage = $("#header-board-trigger-image");
    const $triggerLabel = $("#header-board-trigger-label");
    if (!$picker.length || !$menu.length || !$trigger.length) {
        return;
    }

    const boardList = boards.filter(board => isElectron || (!board?.isArduinoPlatform && !board?.arduinoOnly));
    const currentValue = boardId || boardIdSelect || "";
    const currentBoard = boardList.find(board => board.id === currentValue) || boardList[0] || null;

    $menu.html(renderHeaderBoardMenu(boardList, currentValue));

    if (currentBoard) {
        $triggerImage.attr("src", getBoardAssetPath(currentBoard.id, currentBoard.image));
        $triggerImage.attr("alt", currentBoard.name);
        $triggerLabel.text(currentBoard.name);
    }
    refreshRosToolsVisibility();

    $trigger.off("click").on("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = !$menu.hasClass("active");
        $menu.toggleClass("active", willOpen);
        $picker.toggleClass("menu-open", willOpen);
        $trigger.attr("aria-expanded", willOpen ? "true" : "false");
    });

    $menu.off("click", "#header-board-tags-list > li").on("click", "#header-board-tags-list > li", function (event) {
        event.stopPropagation();
        headerBoardTagSelect = $(this).text().trim() || "Recommend";
        $menu.html(renderHeaderBoardMenu(boardList, currentValue));
    });

    $menu.off("click", ".header-board-option").on("click", ".header-board-option", async function (event) {
        event.stopPropagation();
        const nextBoardId = $(this).attr("data-board-id");
        if (!nextBoardId || nextBoardId === boardId) {
            $menu.removeClass("active");
            $trigger.attr("aria-expanded", "false");
            return;
        }
        const ok = await NotifyConfirm("All blocks will lost. Are you sure of switch board ?");
        if (!ok) {
            return;
        }

        const currentBoard = boards.find(board => board.id === boardId);
        if (typeof currentBoard?.onDispose === "function") {
            await currentBoard.onDispose(blocklyWorkspace, currentBoard);
        }

        boardIdSelect = nextBoardId;
        if (boards.find(board => board.id === nextBoardId)?.arduinoOnly) {
            await window.openArduinoWorkspace(nextBoardId, {newProject:true,name:'myProject'});
        } else await resetWorkspaceForBoard(nextBoardId, "myProject");
        saveCodeToLocal();
        statusLog("Switch board to " + boards.find(board => board.id === boardId).name);
        $menu.removeClass("active");
        $picker.removeClass("menu-open");
        $trigger.attr("aria-expanded", "false");
        headerBoardTagSelect = "Recommend";
    });
}

$(document).off("click.headerBoardMenu").on("click.headerBoardMenu", function (event) {
    if (!$(event.target).closest("#header-board-picker").length) {
        $("#header-board-menu").removeClass("active");
        $("#header-board-picker").removeClass("menu-open");
        $("#header-board-trigger").attr("aria-expanded", "false");
    }
});

$("#new-project").off("click").on("click", async (e, meta = {}) => {
    if(meta.skipConfirm === true && window.IDEArduino?.active) return;
    const skipConfirm = meta.skipConfirm === true || window.SKIP_NEW_PROJECT_CONFIRM === true;

    if (!skipConfirm) {
        const ok = await NotifyConfirm("All blocks will lost. Are you sure of new project ?");
        if (!ok) return;
    }

    boardIdSelect = boardId || "buildbot";
    newProjectLanguage = 'block';
    refreshProjectLanguage();

    const tags_list = ["Recommend"]
        .concat(boards
            .map(a => a.tags)
            .reduce((accumulator, currentValue) => accumulator.concat(currentValue))
            .filter((item, index, arr) => arr.indexOf(item) === index)
            .sort()
        );
    // console.log("tags list", tags_list);
    $("#boards-tags-list").html(tags_list.map(tag => `<li>${tag}</li>`).join(""));
    $("#boards-tags-list > li").click(e => {
        $("#boards-tags-list > li").removeClass("active");
        $(e.currentTarget).addClass("active");

        const tag_select = e.currentTarget.textContent;
        // console.log(tag_select);
        let board_id_in_tag_list = [];
        if (tag_select === "Recommend") {
            board_id_in_tag_list = [
                boardId, 'buildbot', 'atom-vx', 'atom-mini', 'strom-mini'
            ].filter((item, index, arr) => boards.some(b=>b.id===item) && arr.indexOf(item) === index).slice(0, 5);
        } else {
            board_id_in_tag_list = boards.filter(board => board.tags.indexOf(tag_select) >= 0).map(board => board.id);
        }

        $("#hardware-select ul").html(
            board_id_in_tag_list.map(board_id => {
                const board = boards.find(a => a.id === board_id);
                if ((!isElectron) && (board?.isArduinoPlatform || board?.arduinoOnly)) {
                    return "";
                }

                return `
                    <li>
                        <div data-board-id="${board.id}"${board.id === boardIdSelect ? 'class="active"' : ""}>
                            <div class="image"><img src="${getBoardAssetPath(board.id, board.image)}" alt=""></div>
                            <div class="name">${board.name}</div>
                        </div>
                    </li>
                `
            }).join("")
        );

        $("#hardware-select ul > li > div").click(e => {
            $("#hardware-select ul > li > div").removeClass("active");
            $(e.currentTarget).addClass("active");

            boardIdSelect = $(e.currentTarget).attr("data-board-id");
            refreshProjectLanguage();
            // console.log(boardIdSelect);
        });
    });

    $("#boards-tags-list > li:first-child").click();

    $("#project-create-dialog").show();
});

$("#project-create-dialog .close-btn").click(() => $("#project-create-dialog").hide())
$('#cancel-project-btn').on('click',()=>$('#project-create-dialog').hide());
$('#project-create-dialog form').on('submit',e=>{e.preventDefault();$('#create-project-btn').click();});

let arduinoConsoleTerm = {
    scroll: () => {
        $("#arduino-console-dialog pre").scrollTop($("#arduino-console-dialog pre")[0].scrollHeight);
    },
    writeln: text => {
        $("#arduino-console-dialog pre")[0].innerText += text + "\r\n";
        arduinoConsoleTerm.scroll();
    },
    write: text => {
        $("#arduino-console-dialog pre")[0].innerText += text;
        arduinoConsoleTerm.scroll();
    },
    clear: () => {
        $("#arduino-console-dialog pre")[0].innerText = "";
    }
};

let loadBoard = async () => {
    if (window.motorSimulation) window.motorSimulation.stop();
    if (!boardId || !levelName) {
        return;
    }
    refreshRosToolsVisibility();
    const board = boards.find(board => board.id === boardId);
    if (!board) {
        console.warn("Board definition not found:", boardId);
        return;
    }
    try { localStorage.setItem('ptbot_selected_board_id', boardId); } catch (_) { }
    let scripts = [];
    scripts = scripts.concat(board.script);
    scripts = scripts.concat(board.blocks);
    if (typeof board.simulator !== "undefined") {
        scripts = scripts.concat(board.simulator.script);
    }
    // Fetch independent assets together, then evaluate in the board's original
    // order because later definitions can depend on earlier scripts.
    const sources = await Promise.allSettled(scripts.map(async fPath => {
        const response = await fetch(getBoardAssetPath(board.id, fPath));
        if (!response.ok) throw new Error('Board script failed: ' + fPath + ' (' + response.status + ')');
        return response.text();
    }));
    for (const source of sources) {
        if (source.status === 'rejected') { console.warn(source.reason); continue; }
        try { eval(source.value); } catch (error) { console.warn(error); }
    }

    for (let fPath of board.css) {
        let link = document.createElement('link');
        link.rel = "stylesheet";
        link.href = getBoardAssetPath(board.id, fPath);
        document.head.appendChild(link);
    }

    await updateBlockCategory();
    refreshHeaderBoardSelect();

    autoCompletionDictionary = board.autoCompletion;

    $("#board-name").text(board.name);
    $("#level-name").text(levelName);

    if (typeof board.simulator !== "undefined") {
        let last_deivce_mode = +localStorage.getItem("last_deivce_mode");
        switchModeTo(last_deivce_mode);
    } else {
        switchModeTo(MODE_REAL_DEVICE);
    }

    if (typeof board?.onLoad === "function") {
        await board.onLoad(blocklyWorkspace, board);
    }
    if (window.motorSimulation && window.motorSimulation.reloadBoard) window.motorSimulation.reloadBoard();

    if (board?.isArduinoPlatform) {
        if (+localStorage.getItem("show-console-board-initial") !== -1) {
            // console.log("show", +localStorage.getItem("show-console-board-initial"), +localStorage.getItem("show-console-board-initial") !== -1);
            $("#arduino-console-dialog .title").text("Loading...");
            ShowDialog($("#arduino-console-dialog"));
        }
        arduinoConsoleTerm.clear();
        /*
        if (typeof arduinoInitTerm === "undefined") {
            arduinoInitTerm = new Terminal();
            if (typeof arduinInitFitAddon === "undefined") {
                arduinInitFitAddon = new FitAddon.FitAddon();
            }
            arduinoInitTerm.loadAddon(arduinInitFitAddon);
            arduinoInitTerm.open($("#arduino-console-dialog > section")[0]);
            try {
                arduinInitFitAddon.fit();
            } catch(e) {
                
            }
        } else {
            arduinoInitTerm.clear();
        }
        */
        // await arduino_board_init();
        arduino_board_init().then(() => {
            $("#arduino-console-dialog .title").text("Finish");
            CloseDialog($("#arduino-console-dialog"));
        }).catch(e => {
            console.warn(e);
            $("#arduino-console-dialog .title").text("Load board FAIL");
        });
    }
}

$("#create-project-btn").click(async () => {
    refreshProjectLanguage();
    if (newProjectLanguage === 'arduino') {
        try {
            if (await window.openArduinoWorkspace(boardIdSelect, { newProject: true, name: $('#project-name-input').val() })) $('#project-create-dialog').hide();
        } catch (error) { NotifyW(error.message); }
        return;
    }
    try { await window.IDEArduino?.leave(); } catch(error) { NotifyW(error.message); return; }
    {
        const board = boards.find(board => board.id === (boardId || "buildbot"));
        if (typeof board?.onDispose === "function") {
            await board.onDispose(blocklyWorkspace, board);
        }
    }

    let projectName = $("#project-name-input").val();
    setEditorModeView(1);
    await resetWorkspaceForBoard(boardIdSelect, projectName);

    $("#project-create-dialog").hide();
    NotifyS("New project " + projectName);
    statusLog("New project " + projectName);

    saveCodeToLocal();
});
