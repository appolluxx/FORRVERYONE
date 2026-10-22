const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            offscreen: false,
            nodeIntegration: false
        }
    });

    win.webContents.on('console-message', (e) => {
        console.log('[BROWSER CONSOLE]', e.message);
    });

    await win.loadURL('data:text/html,<html><body><canvas id="c"></canvas><script>' +
        'const canvas = document.getElementById("c");' +
        'const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");' +
        'console.log("GL CONTEXT INITIALIZED:", Boolean(gl));' +
        'if (gl) { console.log("RENDERER:", gl.getParameter(gl.RENDERER)); }' +
        '</script></body></html>'
    );

    setTimeout(() => {
        app.quit();
    }, 1500);
});
