/**
 * =============================================================================
 * PT-BOT TACTICAL IDE · NATIVE ELECTRON DESKTOP RUNNER
 * Standalone Desktop Application with Full Hardware & Serial Integration
 * =============================================================================
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

let mainWindow = null;

process.on('uncaughtException', (err) => {
    console.error('[Main UncaughtException]', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main UnhandledRejection]', reason);
});

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const ARDUINO_CLI_PATH = 'C:\\Users\\john\\AppData\\Local\\Programs\\Arduino IDE\\resources\\app\\lib\\backend\\resources\\arduino-cli.exe';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 920,
        minWidth: 1100,
        minHeight: 720,
        title: 'PT-BOT Atom VX · Tactical Mission IDE',
        backgroundColor: '#0a0f1d',
        autoHideMenuBar: true, // Clean IDE look, press Alt to reveal menu
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Allow local file loading and offline assets
        }
    });

    // -------------------------------------------------------------------------
    // WEBSERIAL HARDWARE GRANTS (Auto-authorize ESP32 USB ports in Electron)
    // -------------------------------------------------------------------------
    mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
        event.preventDefault();
        if (portList && portList.length > 0) {
            // Auto-select first matching serial port or CP210x device
            const cp210 = portList.find(p => (p.displayName || '').includes('CP210') || (p.portName || '').includes('COM'));
            callback((cp210 || portList[0]).portId);
        } else {
            callback('');
        }
    });

    mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
        if (permission === 'serial') return true;
        return true;
    });

    mainWindow.webContents.session.setDevicePermissionHandler((details) => {
        if (details.deviceType === 'serial') return true;
        return true;
    });

    // Renderer console logging
    mainWindow.webContents.on('console-message', (event) => {
        const msg = (event && event.message) ? event.message : event;
        if (event && event.level >= 2) {
            console.warn(`[Renderer] ${msg}`);
        }
    });

    mainWindow.loadFile(path.join(ROOT_DIR, 'apps', 'web', 'index.html'));

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[PT-BOT IDE] Application UI initialized successfully.');
    });

    mainWindow.on('close', (e) => {
        console.log('[Main Window] close event fired');
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// -----------------------------------------------------------------------------
// NATIVE IPC HANDLERS (Direct OS & Hardware Execution)
// -----------------------------------------------------------------------------

// 1. Detect COM ports via Windows PowerShell
ipcMain.handle('get-com-ports', async () => {
    return new Promise((resolve) => {
        const psCmd = `powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::getportnames() -join ','"`;
        exec(psCmd, (err, stdout) => {
            if (err || !stdout) return resolve([]);
            const ports = stdout.trim().split(',').filter(p => p.trim().length > 0);
            resolve(ports.map(p => ({ port: p.trim(), label: `${p.trim()} (USB Serial Port)` })));
        });
    });
});

// 2. 1-Click Flash firmware via background arduino-cli (921,600 baud)
ipcMain.handle('flash-arduino-cli', async (event, { port, baud, sketchFolder }) => {
    return new Promise((resolve) => {
        const targetPort = port || 'COM3';
        const uploadBaud = baud || '921600';
        const sketchDir = sketchFolder
            ? path.join(ROOT_DIR, 'firmware', sketchFolder)
            : path.join(ROOT_DIR, 'firmware', 'PT_BOT_Middle_3Drop_ATOM_VX');

        if (!fs.existsSync(ARDUINO_CLI_PATH)) {
            return resolve({ success: false, error: `arduino-cli.exe not found at: ${ARDUINO_CLI_PATH}` });
        }

        const args = [
            'compile',
            '--fqbn', 'esp32:esp32:esp32',
            '--upload',
            '-p', targetPort,
            '--upload-field', `upload.speed=${uploadBaud}`,
            sketchDir
        ];

        mainWindow.webContents.send('flash-log', `[EXEC] arduino-cli compile & upload (${uploadBaud} baud)...\n`);

        const child = spawn(ARDUINO_CLI_PATH, args);

        child.stdout.on('data', (data) => {
            mainWindow.webContents.send('flash-log', data.toString());
        });

        child.stderr.on('data', (data) => {
            mainWindow.webContents.send('flash-log', data.toString());
        });

        child.on('close', (code) => {
            if (code === 0) {
                mainWindow.webContents.send('flash-log', `\n[SUCCESS] Firmware flashed successfully!\n`);
                resolve({ success: true });
            } else {
                mainWindow.webContents.send('flash-log', `\n[ERROR] Process exited with code ${code}\n`);
                resolve({ success: false, code });
            }
        });
    });
});

// 3. Native Save / Load mission files directly to data/arenas/ directory
ipcMain.handle('save-mission-file', async (event, { filename, content }) => {
    try {
        const targetPath = path.join(ROOT_DIR, 'data', 'arenas', path.basename(filename));
        fs.writeFileSync(targetPath, JSON.stringify(content, null, 2), 'utf8');
        return { success: true, path: targetPath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('list-mission-files', async () => {
    try {
        const arenaDir = path.join(ROOT_DIR, 'data', 'arenas');
        const files = fs.readdirSync(arenaDir).filter(f => f.endsWith('.json'));
        return { success: true, files };
    } catch (err) {
        return { success: false, files: [] };
    }
});

// App Lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
