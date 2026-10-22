const extensionIndexURL = "https://microblock-ide.github.io/microBlock-extension-index/main.json";
let extensionIndex = null;

// Request GitHub images directly with CORS so they work in the isolated SIM page.
const extensionIconURL = info => {
    const icon = String(info.icon || '');
    if (/^(https?:|data:|blob:)/i.test(icon)) return icon;
    const repo = new URL(info.github);
    if (repo.hostname === 'github.com') {
        const repository = repo.pathname.replace(/\/+$/, '').replace(/\.git$/, '');
        return `https://raw.githubusercontent.com${repository}/master/${icon.replace(/^\/+/, '')}`;
    }
    return `${info.github.replace(/\/+$/, '')}/raw/master/${icon.replace(/^\/+/, '')}`;
};

let updateExtensionIndex = async () => {
    let extensionIndexFromAPI = await fetch(extensionIndexURL, { 
        redirect: "follow",
        headers: { 
            // "Accept": "application/vnd.github.v3.raw" 
        },
    });
    if (!extensionIndexFromAPI.ok) {
        NotifyE("Load extension index fail");
        return false;
    }
    extensionIndexFromAPI = await extensionIndexFromAPI.json();
    extensionIndex = extensionIndexFromAPI;

    return true;
}

let installExtension = async (extensionId) => {
    if (typeof extensionIndex[extensionId] === "undefined") {
        NotifyE("Not found " + extensionId + " in extension index");
        return false;
    }
    const extension = extensionIndex[extensionId];
    const extensionLocalPath = `/extension/${extensionId}`;
    
    let downloadRepo = await downloadRepoFromGitHubStoreInFS(extension.github, extensionLocalPath, msg => NotifyE(msg));
    if (!downloadRepo) {
        NotifyE("Download " + extension.name + " fail");
        return false;
    }

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

    if (extension?.supportArduinoPlatform && Array.isArray(extension?.depends)) {
        await arduino_check_and_install_library(extension?.depends);
    }

    updateBlockCategory();

    NotifyS(`Install ${extension.name} extension successful`);
    saveCodeToLocal();

    return true;
}

let removeExtension = async (extensionId) => {
    fs.remove(`/extension/${extensionId}`);
    if (isElectron) {
        const extensionRoot = path.resolve(sharedObj.extensionDir);
        const extensionPath = path.resolve(extensionRoot, extensionId);
        const relative = path.relative(extensionRoot, extensionPath);
        if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Invalid extension path');
        nodeFS.rmSync(extensionPath, { recursive: true, force: true });
    }

    updateBlockCategory();

    NotifyS(`Uninstall ${extensionId} successful`);
    saveCodeToLocal();

    return true;
}

$("#open-extension-dialog").click(async () => {
    const existing=window.IDEToolWindows.get('extensions');
    if(existing){existing.focus();return;}
    $('#extension-dialog .extension-list').empty();
    const content=document.getElementById('extension-dialog');
    const anchor=document.createComment('extension-dialog');content.before(anchor);
    content.classList.add('extension-window-content');
    content.querySelector('header .title').innerHTML='<span class="extension-studio-mark" aria-hidden="true"><i class="fas fa-cubes"></i></span><span><strong>Extensions</strong><small>ROBOT LAB / EXTENSIONS</small></span>';
    document.getElementById('open-extension-creator').setAttribute('aria-label','Add extension');
    window.IDEToolWindows.open({id:'extensions',title:'Extensions',width:1280,height:920,content,
        onClose(){anchor.replaceWith(content);content.classList.remove('extension-window-content','show','hide');$('.add-extension-box').hide();}});

    Notiflix.Block.Standard("#extension-dialog > section", 'Loading...');

    try {
        if (!extensionIndex && !(await updateExtensionIndex())) return;
        $(".extension-category-list > li:first-child").click();
    } catch(error) { NotifyE('Could not load extensions. Check your connection and try again.'); }
    finally { Notiflix.Block.Remove("#extension-dialog > section"); }

});

let uploadModuleList = [];

Blockly.Python.addUploadModule = (module) => {
    uploadModuleList.push(module);
}

$("#open-extension-creator").click(() => {
    $(".add-extension-box").fadeIn();
});

let showExtensionList = (extensionList) => {
    $("#extension-dialog .extension-list").html('');

    let extensionInstalledList = fs.ls("/extension");
    if (isElectron) {
        extensionInstalledList = extensionInstalledList.concat(nodeFS.ls(sharedObj.extensionDir));
    }
    const board = boards.find(board => board.id === boardId);
    for (const [id, info] of Object.entries(extensionList)) {
        if (Array.isArray(info?.chip) && (!info.chip.includes(board.chip))) { // Skip if chip not support
            continue;
        }

        if (board?.isArduinoPlatform && (!info?.supportArduinoPlatform)) { // Skip if Arduino and extension not defined support Arduino
            continue;
        }

        $("#extension-dialog .extension-list").append(`
        <li>
            <div class="extension-box${extensionInstalledList.indexOf(id) >= 0 ? " installed" : ""}" data-extension-id="${id}">
                <div class="header">
                    <div class="cover">
                        <img crossorigin="anonymous" src="${info.icon}" alt="${info.name}">
                    </div>
                    <div class="detail">
                        <div class="name">${info.name}<span class="installed-icon"><i class="fas fa-check-circle"></i></span></div>
                        <div class="author">${info.author ? info.author : 'None'}</div>
                        <div class="other">
                            <span class="version" style="background-color: ${info.color}">${info.version ? info.version : 'None'}</span>
                            <a href=";" onclick="shell.openExternal('${info.github ? info.github : '#'}'); return false;" target="_blank"><i class="fab fa-github"></i></a>
                        </div>
                    </div>
                </div>
                <div class="description">${info.description ? info.description : '<i>No description</i>'}</div>
                <div class="button">
                    <button class="extension-install"><i class="fas fa-download"></i> Install</button>
                    <button class="extension-uninstall"><i class="fas fa-trash-alt"></i> Uninstall</button>
                </div>
            </div>
        </li>
        `);
    }

    $(".extension-install").click(async function() {
        let extensionId = $(this).parents(".extension-box").attr("data-extension-id");
        let queryBox = `.extension-box[data-extension-id='${extensionId}']`;
        Notiflix.Block.Standard(queryBox, 'Installing...');

        if (await installExtension(extensionId)) {
            $(queryBox).addClass("installed");
        }

        Notiflix.Block.Remove(queryBox);
    });

    $(".extension-uninstall").click(async function() {
        let extensionId = $(this).parents(".extension-box").attr("data-extension-id");
        let queryBox = `.extension-box[data-extension-id='${extensionId}']`;

        if (removeExtension(extensionId)) {
            $(queryBox).removeClass("installed");
        }
    });
}

$(".extension-category-list > li").click(function() {
    let categoryName = $(this).text();

    let extensionList = { };
    if (categoryName != "Installed") {
        for (const [id, info] of Object.entries(extensionIndex)) {
            if (categoryName !== "All" && categoryName !== info.category) {
                continue;
            }
            extensionList[id] = JSON.parse(JSON.stringify(info));
            extensionList[id].icon = extensionIconURL(info);
        }
    } else {
        for (const extensionId of fs.ls("/extension")) {
            let extension = fs.read(`/extension/${extensionId}/extension.js`);
            extension = eval(extension);
            extensionList[extensionId] = extension;
            extensionList[extensionId].icon = fs.read(`/extension/${extensionId}/${extension.icon}`);
        }
    }

    showExtensionList(extensionList);

    $(".extension-category-list > li").removeClass("active");
    $(this).addClass("active");
});

$("#extension-keyword").keyup(function() { 
    let keyword = $(this).val().toLowerCase();

    $(".extension-category-list > li").removeClass("active");

    let extensionList = { };
    for (const [id, info] of Object.entries(extensionIndex)) {
        if (info.name.toLowerCase().indexOf(keyword) < 0) {
            continue;
        }
        extensionList[id] = JSON.parse(JSON.stringify(info));
        extensionList[id].icon = extensionIconURL(info);
    }

    showExtensionList(extensionList);
});

$("#form-add-extension").submit(async function(e) {
    e.preventDefault();

    let gitHubURL = $("#extension-github-url").val().match(/https:\/\/github\.com\/[^\/]+\/[^\/]+/);
    if (gitHubURL == null) {
        NotifyE("GitHub url not match");
        return;
    }
    gitHubURL = gitHubURL[0];

    Notiflix.Block.Standard(".add-extension-box", 'Loading...');

    // Call to API, See microBlock Back-end: https://github.com/microBlock-IDE/microBlock-backend
    let addExtensionToIndex = await fetch("https://us-central1-ublock-c0a08.cloudfunctions.net/extension", { 
        method: "post",
        body: gitHubURL,
        redirect: "follow"
    });
    let rosAddExtension = await addExtensionToIndex.json();
    if (addExtensionToIndex.status !== 200) {
        console.log("Add extension error", rosAddExtension);
        NotifyE("Add extension error, See console to more detail");
    } else {
        NotifyS(`Add/Update ${rosAddExtension.extension.name} extension successful`);
        $("#extension-github-url").val("");
    }

    Notiflix.Block.Remove(".add-extension-box");
});

$("#form-add-extension button[type='reset']").click(() => {
    $(".add-extension-box").fadeOut();
});

// $("#open-extension-dialog").click();
