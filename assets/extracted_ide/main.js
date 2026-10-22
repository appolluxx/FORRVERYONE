const { app, BrowserWindow, session, protocol, Menu, MenuItem, screen, nativeTheme } = require('electron')
// Native window chrome follows the operating system appearance.
nativeTheme.themeSource = 'system';
// Windows DirectComposition can leave the native inverted I-beam white on
// light surfaces until another text control repaints it (vscode#204103).
// Use the regular GPU presentation path; keep WebGL/hardware acceleration.
// Opt out for driver comparisons without changing the user's OS settings.
if (process.platform === 'win32' && process.env.ROBOBLOCKS_NATIVE_COMPOSITION !== '1') {
    app.commandLine.appendSwitch('disable-direct-composition');
}
// Electron 9 ships Chromium 83, where Wasm i64/BigInt interop is opt-in.
// CPython's Wasm runtime uses it for 64-bit values.
if (Number(process.versions.chrome.split('.')[0]) < 85) {
    app.commandLine.appendSwitch('js-flags', [app.commandLine.getSwitchValue('js-flags'), '--experimental-wasm-bigint'].filter(Boolean).join(' '));
}
const path = require('path');
const fs = require('fs');
// Development-only installation preview; its isolated profile survives restarts.
if (!app.isPackaged && fs.existsSync(path.join(__dirname, 'artifacts', 'fresh-install-next-start.json'))) {
    require('./tools/fresh-install-next-start.cjs').activate(app, __dirname);
}
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();
app.on('browser-window-created', (_event, window) => {
    if (window.webContents.getLastWebPreferences().nodeIntegration) remoteMain.enable(window.webContents);

});
const { autoUpdater } = require('electron-updater');
var ipcMain = require('electron').ipcMain;

const unpackedAppPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : __dirname;

global.sharedObj = {
    argv: process.argv,
    appSessionId: String(Date.now()),
    mainWin: null,
    dashboardWin: null,
    rosWin: null,
    rosRemoteDesktopWin: null,
    rosTerminalWins: [],
    rosTerminalCounter: 1,
    rosTerminalRegistry: [],
    isClosingApp: false,
    ptbotTransportState: {
        connected: false,
        transportType: "",
        host: "",
        port: 8080,
    },
    extensionDir: path.normalize(`${__dirname}/extension`),
	rootPath: path.normalize(`${__dirname}/microBlock-IDE`),
    unpackedRootPath: path.normalize(unpackedAppPath),
    esptoolDir: path.normalize(path.join(unpackedAppPath, 'bin', 'esptool')),
};

let appUpdateState = {
    phase: 'idle',
    currentVersion: app.getVersion(),
    latestVersion: '',
    percent: 0,
    transferred: 0,
    total: 0,
    bytesPerSecond: 0,
    message: 'Ready to check for updates',
};

function publishAppUpdateState(patch = {}) {
    appUpdateState = Object.assign({}, appUpdateState, patch, {
        currentVersion: app.getVersion(),
    });

    const mainWindow = global.sharedObj.mainWin;
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app-update-state', appUpdateState);
    }
    return appUpdateState;
}

function updateErrorMessage(error) {
    return String(error?.message || error || 'Unknown update error').replace(/\s+/g, ' ').trim();
}

function configureAppUpdater() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;

    autoUpdater.on('checking-for-update', () => {
        publishAppUpdateState({
            phase: 'checking',
            percent: 0,
            message: 'Checking for updates...',
        });
    });

    autoUpdater.on('update-available', (info) => {
        publishAppUpdateState({
            phase: 'available',
            latestVersion: info?.version || '',
            percent: 0,
            message: `Version ${info?.version || ''} is available`,
        });
        const mainWindow = global.sharedObj.mainWin;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app-update-open');
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        publishAppUpdateState({
            phase: 'not-available',
            latestVersion: info?.version || app.getVersion(),
            percent: 0,
            message: 'You already have the latest version',
        });
    });

    autoUpdater.on('download-progress', (progress) => {
        publishAppUpdateState({
            phase: 'downloading',
            percent: Number(progress?.percent) || 0,
            transferred: Number(progress?.transferred) || 0,
            total: Number(progress?.total) || 0,
            bytesPerSecond: Number(progress?.bytesPerSecond) || 0,
            message: 'Downloading update...',
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        publishAppUpdateState({
            phase: 'downloaded',
            latestVersion: info?.version || appUpdateState.latestVersion,
            percent: 100,
            message: 'Download complete. Opening the installer...',
        });
        setTimeout(() => {
            publishAppUpdateState({
                phase: 'installing',
                message: 'Opening the installer...',
            });
            autoUpdater.quitAndInstall(false, true);
        }, 500);
    });

    autoUpdater.on('error', (error) => {
        publishAppUpdateState({
            phase: 'error',
            message: updateErrorMessage(error),
        });
    });
}

async function checkForAppUpdate() {
    if (!app.isPackaged) {
        return publishAppUpdateState({
            phase: 'development',
            message: 'Updates can be tested from an installed production build only',
        });
    }

    if (['checking', 'available', 'downloading', 'downloaded', 'installing'].includes(appUpdateState.phase)) {
        return appUpdateState;
    }

    try {
        publishAppUpdateState({
            phase: 'checking',
            percent: 0,
            transferred: 0,
            total: 0,
            bytesPerSecond: 0,
            message: 'Checking for updates...',
        });
        await autoUpdater.checkForUpdates();
    } catch (error) {
        publishAppUpdateState({
            phase: 'error',
            message: updateErrorMessage(error),
        });
    }
    return appUpdateState;
}

function installAppUpdateMenuItem() {
    const applicationMenu = Menu.getApplicationMenu();
    const helpMenu = applicationMenu?.items?.find(item => item.role === 'help' || item.label === 'Help');
    if (!helpMenu?.submenu) return;

    const existingItem = helpMenu.submenu.items.find(item => item.id === 'check-for-app-updates');
    if (existingItem) helpMenu.submenu.remove(existingItem);
    const existingSeparator = helpMenu.submenu.items.find(item => item.id === 'check-for-app-updates-separator');
    if (existingSeparator) helpMenu.submenu.remove(existingSeparator);

    helpMenu.submenu.insert(0, new MenuItem({
        id: 'check-for-app-updates',
        label: 'Software Update...',
        accelerator: 'CmdOrCtrl+Shift+U',
        click: () => {
            const mainWindow = global.sharedObj.mainWin;
            if (!mainWindow || mainWindow.isDestroyed()) return;
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('app-update-open');
        },
    }));
    helpMenu.submenu.insert(1, new MenuItem({
        id: 'check-for-app-updates-separator',
        type: 'separator',
    }));
    Menu.setApplicationMenu(applicationMenu);
    global.sharedObj.mainWin?.setMenuBarVisibility(false);
}

ipcMain.handle('app-update-get-state', async () => appUpdateState);

ipcMain.on('app-update-open-request', (event) => {
    event.sender.send('app-update-open');
});

ipcMain.handle('app-update-check', checkForAppUpdate);

ipcMain.handle('app-update-download', async () => {
    if (appUpdateState.phase !== 'available') return false;

    publishAppUpdateState({
        phase: 'downloading',
        percent: 0,
        message: `Downloading version ${appUpdateState.latestVersion}...`,
    });
    try {
        await autoUpdater.downloadUpdate();
        return true;
    } catch (error) {
        publishAppUpdateState({
            phase: 'error',
            message: updateErrorMessage(error),
        });
        return false;
    }
});

protocol.registerSchemesAsPrivileged([
    { 
        scheme: 'microblock', 
        privileges: { 
            standard: true, 
            supportFetchAPI: true, 
            secure: true 
        }
    }
]);

function getRosTerminalRegistryPath() {
    return path.join(app.getPath('userData'), 'ros-terminal-registry.json');
}

function normalizeRosTerminalId(id) {
    return String(id || '').trim();
}

function saveRosTerminalRegistry() {
    try {
        fs.writeFileSync(
            getRosTerminalRegistryPath(),
            JSON.stringify({
                nextId: global.sharedObj.rosTerminalCounter,
                terminals: global.sharedObj.rosTerminalRegistry,
            }, null, 2),
            'utf8'
        );
    } catch (error) {}
}

function loadRosTerminalRegistry() {
    try {
        const raw = fs.readFileSync(getRosTerminalRegistryPath(), 'utf8');
        const parsed = JSON.parse(raw);
        global.sharedObj.rosTerminalCounter = Math.max(1, Number(parsed.nextId) || 1);
        global.sharedObj.rosTerminalRegistry = Array.isArray(parsed.terminals) ? parsed.terminals : [];
    } catch (error) {
        global.sharedObj.rosTerminalCounter = 1;
        global.sharedObj.rosTerminalRegistry = [];
    }
}

function upsertRosTerminalRegistryEntry(entry) {
    const id = normalizeRosTerminalId(entry.id);
    if (!id) return;
    const nextEntry = {
        id,
        title: entry.title || `Terminal ${id}`,
        target: entry.target || 'james@192.168.0.125',
        host: entry.host || '',
        port: Number(entry.port) || 8080,
        bridgeRunId: entry.bridgeRunId || '',
        hidden: entry.hidden !== false,
        focused: !!entry.focused,
    };
    const index = global.sharedObj.rosTerminalRegistry.findIndex((item) => normalizeRosTerminalId(item.id) === id);
    if (index >= 0) {
        global.sharedObj.rosTerminalRegistry[index] = Object.assign({}, global.sharedObj.rosTerminalRegistry[index], nextEntry);
    } else {
        global.sharedObj.rosTerminalRegistry.push(nextEntry);
    }
    global.sharedObj.rosTerminalRegistry.sort((a, b) => a.id - b.id);
    saveRosTerminalRegistry();
}

function removeRosTerminalRegistryEntry(terminalId) {
    const normalizedId = normalizeRosTerminalId(terminalId);
    global.sharedObj.rosTerminalRegistry = global.sharedObj.rosTerminalRegistry.filter((item) => normalizeRosTerminalId(item.id) !== normalizedId);
    saveRosTerminalRegistry();
}

function markAllRosTerminalsHidden() {
    global.sharedObj.rosTerminalRegistry = global.sharedObj.rosTerminalRegistry.map((item) => Object.assign({}, item, {
        hidden: true,
        focused: false,
    }));
    saveRosTerminalRegistry();
}

function createWindow() {
    loadRosTerminalRegistry();
    const partition = 'persist:microblock';
    const ses = session.fromPartition(partition);

    try {
        ses.setPermissionCheckHandler((webContents, permission) => {
            if (
                permission === 'clipboard-read' ||
                permission === 'clipboard-sanitized-write' ||
                permission === 'clipboard-write'
            ) {
                return true;
            }
            return false;
        });
        ses.setPermissionRequestHandler((webContents, permission, callback) => {
            if (
                permission === 'clipboard-read' ||
                permission === 'clipboard-sanitized-write' ||
                permission === 'clipboard-write'
            ) {
                callback(true);
                return;
            }
            callback(false);
        });
    } catch (error) {}

    ses.protocol.registerFileProtocol('microblock', (request, callback) => {
        try {
            const requestUrl = new URL(request.url);
            const hostPart = requestUrl.hostname && requestUrl.hostname !== '.'
                ? requestUrl.hostname
                : '';
            const requestPath = decodeURIComponent(requestUrl.pathname || '/');
            const relativePath = path.posix
                .join(hostPart, requestPath)
                .replace(/^\/+/, '');

            callback({
                path: path.normalize(path.join(__dirname, 'microBlock-IDE', relativePath)),
                headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' }
            });
        } catch (error) {
            callback({ error: -6 });
        }
    });
    
    global.sharedObj.mainWin = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 1280,
        minHeight: 820,
        webPreferences: {
            devTools: false,
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            partition: partition
        },
        icon: path.join(__dirname, "microBlock-IDE/favicon.png")
    })
    global.sharedObj.mainWin.setAutoHideMenuBar(false);
    global.sharedObj.mainWin.setMenuBarVisibility(false);
    // global.sharedObj.mainWin.loadFile("microBlock-IDE/index.html");
    global.sharedObj.mainWin.webContents.setWindowOpenHandler(({ frameName }) => {
        const tool={
            'roboblocks-tool-sim':{title:'Robot Lab',height:820},
            'roboblocks-tool-field':{title:'Field Editor',height:920}
        }[frameName];
        if (!tool&&!['roboblocks-sim','roboblocks-field-editor'].includes(frameName)) return { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { devTools: false } } };
        const options = {};
        options.icon = path.join(__dirname, 'microBlock-IDE/favicon.png');
        const fieldEditor=frameName==='roboblocks-field-editor'||frameName==='roboblocks-tool-field';
        options.title = tool?.title||(fieldEditor ? 'Field Editor' : 'Robot Lab');
        options.minWidth = fieldEditor ? 760 : 560;
        options.minHeight = fieldEditor ? 600 : 360;
        options.autoHideMenuBar = true;
        const area = screen.getDisplayMatching(global.sharedObj.mainWin.getBounds()).workArea;
        options.width = Math.min(1280, area.width);
        options.height = Math.min(tool?.height||(fieldEditor ? 920 : 820), area.height);
        options.x = Math.round(area.x + (area.width - options.width) / 2);
        options.y = Math.round(area.y + (area.height - options.height) / 2);
        options.webPreferences = { backgroundThrottling: false, devTools: false };
        return { action: 'allow', overrideBrowserWindowOptions: options };
    });
    global.sharedObj.mainWin.webContents.on('did-finish-load', installAppUpdateMenuItem);
    global.sharedObj.mainWin.webContents.once('did-finish-load', () => setTimeout(checkForAppUpdate, 1500));
    global.sharedObj.mainWin.loadURL("microblock://./index.html");
    global.sharedObj.mainWin.maximize();
    global.sharedObj.mainWin.webContents.on('context-menu', (event, params) => {
        const hasSelection = !!(params.selectionText && params.selectionText.trim());
        const template = [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut', enabled: !!params.isEditable },
            { role: 'copy', enabled: hasSelection },
            { role: 'paste', enabled: !!params.isEditable },
            { type: 'separator' },
            { role: 'selectAll' }
        ];
        const menu = Menu.buildFromTemplate(template);
        menu.popup({ window: global.sharedObj.mainWin });
    });

    // Open the DevTools.
    // mainWin.webContents.openDevTools()

    global.sharedObj.mainWin.on('close', () => {
        global.sharedObj.isClosingApp = true;
        arduinoService?.cancel();
        markAllRosTerminalsHidden();
        if (global.sharedObj.dashboardWin) {
            global.sharedObj.dashboardWin.close();
        }
        if (global.sharedObj.rosWin) {
            global.sharedObj.rosWin.close();
        }
        if (global.sharedObj.rosTerminalWins && global.sharedObj.rosTerminalWins.length) {
            global.sharedObj.rosTerminalWins.slice().forEach((win) => {
                if (win && !win.isDestroyed()) {
                    win.close();
                }
            });
        }
    });
}

function getRosTerminalWindowsState() {
    return global.sharedObj.rosTerminalWins
        .filter((win) => win && !win.isDestroyed())
        .map((win) => ({
            id: win.__rosTerminalId,
            title: win.__rosTerminalTitle || `Terminal ${win.__rosTerminalId}`,
            target: win.__rosTerminalTarget || "",
            host: win.__rosTerminalHost || "",
            port: Number(win.__rosTerminalPort) || 8080,
            bridgeRunId: win.__rosTerminalBridgeRunId || "",
            sessionName: win.__rosTerminalSessionName || "",
            hidden: !win.isVisible(),
            focused: win.isFocused(),
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function broadcastRosTerminalWindowsState() {
    global.sharedObj.rosTerminalWins = global.sharedObj.rosTerminalWins.filter((win) => win && !win.isDestroyed());
    if (global.sharedObj.rosWin && !global.sharedObj.rosWin.isDestroyed()) {
        try {
            global.sharedObj.rosWin.webContents.send("ros-terminal-windows-state", getRosTerminalWindowsState());
        } catch (error) {}
    }
}

function applyRemoteDesktopChrome(win) {
    return;
}

function createRosTerminalWindow(sshTarget, options = {}) {
    const target = sshTarget || options.target || 'james@192.168.0.125';
    const terminalId = normalizeRosTerminalId(options.id) || String(global.sharedObj.rosTerminalCounter++);
    const terminalHost = options.host || '';
    const terminalPort = Number(options.port) || 8080;
    const terminalBridgeRunId = options.bridgeRunId || '';
    const terminalSessionName = options.sessionName || '';
    const terminalAutoCommand = options.autoCommand || '';
    const terminalStartsHidden = !!options.hidden;
    const rosTerminalWin = new BrowserWindow({
        width: 960,
        height: 620,
        minWidth: 720,
        minHeight: 420,
        show: !terminalStartsHidden,
        frame: false,
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        backgroundColor: '#e9eef3',
        webPreferences: {
            devTools: false,
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, "microBlock-IDE/favicon.png")
    });

    rosTerminalWin.__rosTerminalId = terminalId;
    rosTerminalWin.__rosTerminalTarget = target;
    rosTerminalWin.__rosTerminalTitle = options.title || `Terminal ${terminalId}`;
    rosTerminalWin.__rosTerminalHost = terminalHost;
    rosTerminalWin.__rosTerminalPort = terminalPort;
    rosTerminalWin.__rosTerminalBridgeRunId = terminalBridgeRunId;
    rosTerminalWin.__rosTerminalSessionName = terminalSessionName;
    rosTerminalWin.__rosTerminalAutoCommand = terminalAutoCommand;

    global.sharedObj.rosTerminalWins.push(rosTerminalWin);
    upsertRosTerminalRegistryEntry({
        id: terminalId,
        title: rosTerminalWin.__rosTerminalTitle,
        target: target,
        host: terminalHost,
        port: terminalPort,
        bridgeRunId: terminalBridgeRunId,
        sessionName: terminalSessionName,
        hidden: terminalStartsHidden,
        focused: false,
    });

    rosTerminalWin.loadFile(path.join(__dirname, "microBlock-IDE/ros/terminal.html"), {
        query: {
            target: target,
            id: String(terminalId),
            title: rosTerminalWin.__rosTerminalTitle,
            session: terminalSessionName,
            run: terminalAutoCommand,
            host: terminalHost,
            port: String(terminalPort)
        }
    });

    rosTerminalWin.on('show', () => {
        if (global.sharedObj.isClosingApp) {
            broadcastRosTerminalWindowsState();
            return;
        }
        upsertRosTerminalRegistryEntry({
            id: terminalId,
            title: rosTerminalWin.__rosTerminalTitle,
            target: rosTerminalWin.__rosTerminalTarget,
            host: rosTerminalWin.__rosTerminalHost,
            port: rosTerminalWin.__rosTerminalPort,
            bridgeRunId: rosTerminalWin.__rosTerminalBridgeRunId,
            sessionName: rosTerminalWin.__rosTerminalSessionName,
            hidden: false,
            focused: rosTerminalWin.isFocused(),
        });
        broadcastRosTerminalWindowsState();
    });
    rosTerminalWin.on('hide', () => {
        if (global.sharedObj.isClosingApp) {
            broadcastRosTerminalWindowsState();
            return;
        }
        upsertRosTerminalRegistryEntry({
            id: terminalId,
            title: rosTerminalWin.__rosTerminalTitle,
            target: rosTerminalWin.__rosTerminalTarget,
            host: rosTerminalWin.__rosTerminalHost,
            port: rosTerminalWin.__rosTerminalPort,
            bridgeRunId: rosTerminalWin.__rosTerminalBridgeRunId,
            sessionName: rosTerminalWin.__rosTerminalSessionName,
            hidden: true,
            focused: false,
        });
        broadcastRosTerminalWindowsState();
    });
    rosTerminalWin.on('focus', () => {
        if (global.sharedObj.isClosingApp) {
            broadcastRosTerminalWindowsState();
            return;
        }
        upsertRosTerminalRegistryEntry({
            id: terminalId,
            title: rosTerminalWin.__rosTerminalTitle,
            target: rosTerminalWin.__rosTerminalTarget,
            host: rosTerminalWin.__rosTerminalHost,
            port: rosTerminalWin.__rosTerminalPort,
            bridgeRunId: rosTerminalWin.__rosTerminalBridgeRunId,
            sessionName: rosTerminalWin.__rosTerminalSessionName,
            hidden: false,
            focused: true,
        });
        broadcastRosTerminalWindowsState();
    });
    rosTerminalWin.on('blur', () => {
        if (global.sharedObj.isClosingApp) {
            broadcastRosTerminalWindowsState();
            return;
        }
        upsertRosTerminalRegistryEntry({
            id: terminalId,
            title: rosTerminalWin.__rosTerminalTitle,
            target: rosTerminalWin.__rosTerminalTarget,
            host: rosTerminalWin.__rosTerminalHost,
            port: rosTerminalWin.__rosTerminalPort,
            bridgeRunId: rosTerminalWin.__rosTerminalBridgeRunId,
            sessionName: rosTerminalWin.__rosTerminalSessionName,
            hidden: !rosTerminalWin.isVisible(),
            focused: false,
        });
        broadcastRosTerminalWindowsState();
    });
    rosTerminalWin.on('closed', () => {
        global.sharedObj.rosTerminalWins = global.sharedObj.rosTerminalWins.filter((win) => win !== rosTerminalWin);
        if (!global.sharedObj.isClosingApp) {
            removeRosTerminalRegistryEntry(terminalId);
        }
        broadcastRosTerminalWindowsState();
    });

    broadcastRosTerminalWindowsState();
    return rosTerminalWin;
}

ipcMain.on("show-dashboard", (event) => {
    if (global.sharedObj.dashboardWin) {
        if (!global.sharedObj.dashboardWin.isDestroyed()) {
            global.sharedObj.dashboardWin.focus();
            return;
        }
    }

    global.sharedObj.dashboardWin = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 1280,
        minHeight: 820,
        autoHideMenuBar: true,
        webPreferences: {
            devTools: false,
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, "microBlock-IDE/favicon.png")
    });

    global.sharedObj.dashboardWin.setMenuBarVisibility(false);
    global.sharedObj.dashboardWin.loadFile(path.join(__dirname, "microBlock-IDE/dashboard/index.html"));

    // global.sharedObj.dashboardWin.maximize();

    global.sharedObj.dashboardWin.on('close', () => {
        global.sharedObj.dashboardWin = null;
    });
});

ipcMain.on("show-ros", (event) => {
    if (global.sharedObj.rosWin) {
        if (!global.sharedObj.rosWin.isDestroyed()) {
            global.sharedObj.rosWin.focus();
            return;
        }
    }

    global.sharedObj.rosWin = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1280,
        minHeight: 820,
        title: "ROS Tools",
        autoHideMenuBar: true,
        webPreferences: {
            devTools: false,
            nodeIntegration: true,
            contextIsolation: false,
            partition: 'persist:microblock'
        },
        icon: path.join(__dirname, "microBlock-IDE/favicon.png")
    });
    global.sharedObj.rosWin.setMenuBarVisibility(false);

    global.sharedObj.rosWin.loadURL("microblock://./ros/index.html");
    global.sharedObj.rosWin.setTitle("ROS Tools");

    global.sharedObj.rosWin.webContents.on("did-finish-load", () => {
        try {
            global.sharedObj.rosWin.webContents.send("ptbot-transport-state", global.sharedObj.ptbotTransportState);
        } catch (error) {}
        try {
            global.sharedObj.rosWin.setTitle("ROS Tools");
        } catch (error) {}
        broadcastRosTerminalWindowsState();
    });

    global.sharedObj.rosWin.on('close', () => {
        global.sharedObj.rosWin = null;
    });
});

ipcMain.on("show-assembly-mode", () => {
    if (global.sharedObj.assemblyModeWin && !global.sharedObj.assemblyModeWin.isDestroyed()) {
        global.sharedObj.assemblyModeWin.focus();
        return;
    }

    global.sharedObj.assemblyModeWin = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 980,
        minHeight: 640,
        title: "Assembly Mode",
        show: false,
        backgroundColor: '#ffffff',
        autoHideMenuBar: true,
        webPreferences: {
            devTools: false,
            nodeIntegration: true,
            contextIsolation: false,
            partition: 'persist:microblock'
        },
        icon: path.join(__dirname, "microBlock-IDE/favicon.png")
    });
    global.sharedObj.assemblyModeWin.setMenuBarVisibility(false);
    const assemblyWindow = global.sharedObj.assemblyModeWin;
    assemblyWindow.once('ready-to-show', () => {
        if (assemblyWindow.isDestroyed()) return;
        assemblyWindow.show();
    });
    global.sharedObj.assemblyModeWin.loadURL("microblock://./robot-sim/assembly.html");
    global.sharedObj.assemblyModeWin.on('closed', () => {
        global.sharedObj.assemblyModeWin = null;
    });
});

ipcMain.on("show-ros-remote-desktop", (event, payload = {}) => {
    const host = String(payload.host || "").trim() || "192.168.1.106";
    const url = `http://${host}:6080/vnc.html?resize=scale&autoconnect=true`;

    if (global.sharedObj.rosRemoteDesktopWin) {
        if (!global.sharedObj.rosRemoteDesktopWin.isDestroyed()) {
            try {
                global.sharedObj.rosRemoteDesktopWin.loadURL(url);
            } catch (error) {}
            global.sharedObj.rosRemoteDesktopWin.show();
            global.sharedObj.rosRemoteDesktopWin.focus();
            return;
        }
    }

    global.sharedObj.rosRemoteDesktopWin = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
        title: "Remote Desktop",
        autoHideMenuBar: true,
        webPreferences: {
            devTools: false,
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, "microBlock-IDE/favicon.png")
    });
    global.sharedObj.rosRemoteDesktopWin.setMenuBarVisibility(false);
    global.sharedObj.rosRemoteDesktopWin.webContents.on("did-finish-load", () => {
        applyRemoteDesktopChrome(global.sharedObj.rosRemoteDesktopWin);
    });
    global.sharedObj.rosRemoteDesktopWin.loadURL(url);
    global.sharedObj.rosRemoteDesktopWin.on('close', () => {
        global.sharedObj.rosRemoteDesktopWin = null;
    });
});

ipcMain.on("ptbot-transport-state", (event, payload = {}) => {
    global.sharedObj.ptbotTransportState = {
        connected: !!payload.connected,
        transportType: payload.transportType || "",
        host: payload.host || "",
        port: Number(payload.port) || 8080,
    };

    if (global.sharedObj.rosWin && !global.sharedObj.rosWin.isDestroyed()) {
        try {
            global.sharedObj.rosWin.webContents.send("ptbot-transport-state", global.sharedObj.ptbotTransportState);
        } catch (error) {}
    }

    if (global.sharedObj.dashboardWin && !global.sharedObj.dashboardWin.isDestroyed()) {
        try {
            global.sharedObj.dashboardWin.webContents.send("ptbot-transport-state", global.sharedObj.ptbotTransportState);
        } catch (error) {}
    }
});

ipcMain.handle("get-ptbot-transport-state", async () => {
    return global.sharedObj.ptbotTransportState;
});

ipcMain.on("show-ros-terminal", (event, sshTarget) => {
    createRosTerminalWindow(sshTarget);
});

ipcMain.handle("create-ros-terminal", async (event, sshTarget) => {
    const payload = (typeof sshTarget === 'object' && sshTarget !== null) ? sshTarget : { target: sshTarget };
    const win = createRosTerminalWindow(payload.target, payload);
    return {
        id: win.__rosTerminalId,
        target: win.__rosTerminalTarget,
        title: win.__rosTerminalTitle,
        host: win.__rosTerminalHost,
        port: win.__rosTerminalPort,
        bridgeRunId: win.__rosTerminalBridgeRunId,
        sessionName: win.__rosTerminalSessionName
    };
});

ipcMain.handle("get-ros-terminal-windows", async () => {
    return getRosTerminalWindowsState();
});

ipcMain.on("show-ros-terminal-window", (event, terminalId) => {
    const normalizedId = normalizeRosTerminalId(terminalId);
    const win = global.sharedObj.rosTerminalWins.find((item) => item && !item.isDestroyed() && normalizeRosTerminalId(item.__rosTerminalId) === normalizedId);
    if (!win) {
        const savedEntry = global.sharedObj.rosTerminalRegistry.find((item) => normalizeRosTerminalId(item.id) === normalizedId);
        if (!savedEntry) return;
        const restoredWin = createRosTerminalWindow(savedEntry.target, {
            id: savedEntry.id,
            title: savedEntry.title,
            host: savedEntry.host,
            port: savedEntry.port,
            bridgeRunId: savedEntry.bridgeRunId,
            sessionName: savedEntry.sessionName,
        });
        restoredWin.show();
        restoredWin.focus();
        broadcastRosTerminalWindowsState();
        return;
    }
    if (win.isMinimized()) {
        win.restore();
    }
    win.show();
    win.focus();
    broadcastRosTerminalWindowsState();
});

ipcMain.on("restore-ros-terminal-window", (event, payload = {}) => {
    const terminalId = normalizeRosTerminalId(payload.id);
    if (!terminalId) return;
    const existingWin = global.sharedObj.rosTerminalWins.find((item) => item && !item.isDestroyed() && normalizeRosTerminalId(item.__rosTerminalId) === terminalId);
    if (existingWin) {
        if (existingWin.isMinimized()) {
            existingWin.restore();
        }
        existingWin.show();
        existingWin.focus();
        broadcastRosTerminalWindowsState();
        return;
    }
    const savedEntry = global.sharedObj.rosTerminalRegistry.find((item) => normalizeRosTerminalId(item.id) === terminalId) || {
        id: terminalId,
        title: payload.title || `Terminal ${terminalId}`,
        target: payload.target || 'james@192.168.0.125',
        host: payload.host || '',
        port: Number(payload.port) || 8080,
        bridgeRunId: payload.bridgeRunId || '',
        sessionName: payload.sessionName || '',
    };
    const restoredWin = createRosTerminalWindow(savedEntry.target, {
        id: savedEntry.id,
        title: savedEntry.title,
        host: savedEntry.host,
        port: savedEntry.port,
        bridgeRunId: savedEntry.bridgeRunId,
        sessionName: savedEntry.sessionName,
    });
    restoredWin.show();
    restoredWin.focus();
    broadcastRosTerminalWindowsState();
});

ipcMain.on("hide-ros-terminal-window", (event, terminalId) => {
    const normalizedId = normalizeRosTerminalId(terminalId);
    const win = global.sharedObj.rosTerminalWins.find((item) => item && !item.isDestroyed() && normalizeRosTerminalId(item.__rosTerminalId) === normalizedId);
    if (!win) return;
    win.hide();
    broadcastRosTerminalWindowsState();
});

ipcMain.on("close-ros-terminal-window", (event, terminalId) => {
    const normalizedId = normalizeRosTerminalId(terminalId);
    const win = global.sharedObj.rosTerminalWins.find((item) => item && !item.isDestroyed() && normalizeRosTerminalId(item.__rosTerminalId) === normalizedId);
    if (!win) return;
    win.close();
});

ipcMain.on("set-ros-terminal-title", (event, payload = {}) => {
    const terminalId = normalizeRosTerminalId(payload.id);
    const title = String(payload.title || "").trim();
    const win = global.sharedObj.rosTerminalWins.find((item) => item && !item.isDestroyed() && normalizeRosTerminalId(item.__rosTerminalId) === terminalId);
    if (!win) return;
    win.__rosTerminalTitle = title || `Terminal ${terminalId}`;
    try {
        win.setTitle(win.__rosTerminalTitle);
    } catch (error) {}
    upsertRosTerminalRegistryEntry({
        id: terminalId,
        title: win.__rosTerminalTitle,
        target: win.__rosTerminalTarget,
        host: win.__rosTerminalHost,
        port: win.__rosTerminalPort,
        bridgeRunId: win.__rosTerminalBridgeRunId,
        sessionName: win.__rosTerminalSessionName,
        hidden: !win.isVisible(),
        focused: win.isFocused(),
    });
    broadcastRosTerminalWindowsState();
});

ipcMain.on("sync-ros-terminal-bridge-run", (event, payload = {}) => {
    const host = String(payload.host || '').trim();
    const port = Number(payload.port) || 8080;
    const bridgeRunId = String(payload.bridgeRunId || '').trim();
    if (!host || !bridgeRunId) return;

    global.sharedObj.rosTerminalRegistry = global.sharedObj.rosTerminalRegistry.filter((item) => {
        if ((item.host || '') !== host || (Number(item.port) || 8080) !== port) {
            return true;
        }
        return !item.bridgeRunId || item.bridgeRunId === bridgeRunId;
    });

    global.sharedObj.rosTerminalWins.slice().forEach((win) => {
        if (!win || win.isDestroyed()) return;
        if ((win.__rosTerminalHost || '') !== host || (Number(win.__rosTerminalPort) || 8080) !== port) {
            return;
        }
        if (win.__rosTerminalBridgeRunId && win.__rosTerminalBridgeRunId !== bridgeRunId) {
            try {
                win.close();
            } catch (error) {}
        }
    });

    saveRosTerminalRegistry();
    broadcastRosTerminalWindowsState();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    configureAppUpdater();
    createWindow();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    global.sharedObj.isClosingApp = false;
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    global.sharedObj.isClosingApp = false;
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Launch only known maintenance applications, after checking the account API.
const adminToolProcesses = new Map();
ipcMain.handle('admin-tool-open', async (event, payload = {}) => {
    if (event.sender !== global.sharedObj.mainWin?.webContents) throw new Error('Main IDE window required.');
    const tools = {'product-editor':'tools/board-package-editor', 'sound-tuner':'tools/sound-tuner/main.cjs'};
    if (!Object.hasOwn(tools,payload.id) || typeof payload.token !== 'string' || payload.token.length > 4096) throw new Error('Invalid tool request.');
    if (app.isPackaged) throw new Error('These maintenance tools currently run from the development IDE. Open it with npm run start:examples or npm start.');
    const fsTools = require('node:fs'), pathTools = require('node:path');
    const configuration = JSON.parse(fsTools.readFileSync(pathTools.join(__dirname,'microBlock-IDE/account-config.json'),'utf8'));
    const base = process.env.ROBOBLOCKS_EXAMPLES_LOCAL === '1' ? 'http://127.0.0.1:8092' : configuration.apiBase;
    const response = await require('electron').net.fetch(base.replace(/\/$/,'')+'/api/me', {
        headers:{Authorization:'Bearer '+payload.token},signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Sign in as an administrator to open this tool.');
    const result = await response.json();
    if (!result.user?.admin || !result.user.enabled) throw new Error('Administrator access required.');
    if (adminToolProcesses.has(payload.id)) {adminToolProcesses.get(payload.id).send({type:'focus'});return {opened:true};}
    const env = {...process.env}; delete env.ELECTRON_RUN_AS_NODE;
    const child = require('node:child_process').spawn(process.execPath,[pathTools.join(__dirname,tools[payload.id])],{cwd:__dirname,env,windowsHide:false,stdio:['ignore','ignore','pipe','ipc']});
    adminToolProcesses.set(payload.id,child);
    if(payload.id==='sound-tuner')child.on('message',async message=>{
        if(message?.type!=='sound-server-request')return;
        try{
            const publish=message.action==='publish';if(!publish&&message.action!=='load')throw new Error('Invalid sound action.');
            const res=await require('electron').net.fetch(base.replace(/\/$/,'')+(publish?'/api/admin/sound-settings':'/api/sound-settings'),{method:publish?'POST':'GET',headers:{Authorization:'Bearer '+payload.token,'Content-Type':'application/json'},body:publish?JSON.stringify(message.data):undefined,signal:AbortSignal.timeout(15000)});
            const data=await res.json();if(!res.ok)throw new Error(data.error||'Sound server unavailable.');
            if(child.connected)child.send({type:'sound-server-response',id:message.id,data});
        }catch(error){if(child.connected)child.send({type:'sound-server-response',id:message.id,error:error.message});}
    });

    child.once('exit',()=>adminToolProcesses.delete(payload.id));
    await new Promise((resolve,reject)=>{
        let errors='';const timer=setTimeout(()=>{child.kill();reject(new Error('The tool did not finish opening. '+errors.slice(-1200)));},25000);
        child.stderr.on('data',chunk=>{errors=(errors+chunk.toString()).slice(-4000);});
        child.once('error',error=>{clearTimeout(timer);adminToolProcesses.delete(payload.id);reject(error);});
        child.once('exit',code=>{clearTimeout(timer);reject(new Error('Tool closed before it was ready ('+code+'). '+errors.slice(-1200)));});
        child.on('message',message=>{if(message?.type==='admin-tool-ready'){clearTimeout(timer);resolve();}});
    });
    return {opened:true};
});

// Desktop-only Arduino service, hosted by the main IDE renderer.
let arduinoService=null;
function createArduinoService(){return require('./desktop/arduino-service.cjs').create({root:unpackedAppPath,...require('./desktop/arduino-storage.cjs').prepare({userData:app.getPath('userData')}),packaged:app.isPackaged,onDownload:progress=>{const host=global.sharedObj.mainWin?.webContents;if(host&&!host.isDestroyed())host.send('arduino-download-progress',progress);}});}
ipcMain.handle('arduino-open',async(event,payload={})=>{
 if(event.sender!==global.sharedObj.mainWin?.webContents)throw Error('Invalid Arduino host');
 if(!['buildbot','atom-vx','atom-mini','strom-mini'].includes(payload.board))throw Error('Unsupported Arduino board');
 // Opening/checkpointing another project does not change an in-flight compile.
 if(payload.files)require('./desktop/arduino-service.cjs').validateFiles(payload.files);
 const projectIndex=path.join(app.getPath('userData'),'arduino-projects.json');
 let recent={};try{recent=JSON.parse(require('node:fs').readFileSync(projectIndex,'utf8'));}catch(_){}
 const previous=payload.resume||recent[payload.board]||{};
 if(previous.project&&!/^[a-z0-9-]{1,80}$/.test(previous.project))throw Error('Invalid Arduino project ID');
 const project=payload.newProject?require('node:crypto').randomUUID():(previous.project||'');
 const name=String(payload.newProject?payload.name||'Arduino C++':previous.name||'Arduino C++').slice(0,100);
 if(payload.files){
  if(!arduinoService)arduinoService=createArduinoService();
  await arduinoService.request('save',{board:payload.board,project,files:payload.files,current:payload.current,hiddenTabs:payload.hiddenTabs,restrictedTabs:payload.restrictedTabs});
 }
 recent[payload.board]={project,name};require('node:fs').writeFileSync(projectIndex,JSON.stringify(recent));
 return {board:payload.board,project,name};
});
ipcMain.handle('arduino-request',async(event,action,payload)=>{
 if(event.sender!==global.sharedObj.mainWin?.webContents)throw Error('Arduino is available only in the desktop IDE');
 if(global.sharedObj.isClosingApp)return {cancelled:true,closing:true};
 if(!arduinoService)arduinoService=createArduinoService();
 try{
  return await arduinoService.request(action,payload,text=>{if(!event.sender.isDestroyed())event.sender.send('arduino-output',text,{board:payload?.board,project:payload?.project});},progress=>{if(!event.sender.isDestroyed())event.sender.send(progress.kind==='sim'?'arduino-sim-progress':'arduino-progress',{...progress,board:payload?.board,project:payload?.project});});
 }catch(error){
  const cancelled=error?.code==='ABORT_ERR'||['Download canceled','Arduino task canceled'].includes(error?.message);
  if(global.sharedObj.isClosingApp&&cancelled)return {cancelled:true,closing:true};
  throw error;
 }
});
ipcMain.on('arduino-checkpoint',(event,payload)=>{
 try{
  if(event.sender!==global.sharedObj.mainWin?.webContents)throw Error('Invalid Arduino host');
  if(!arduinoService)arduinoService=createArduinoService();
  event.returnValue=arduinoService.checkpoint(payload);
 }catch(error){event.returnValue={error:error.message};}
});
