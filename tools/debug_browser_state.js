const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
    const win = new BrowserWindow({ show: false });
    await win.loadURL('http://127.0.0.1:4848/tactical_planner.html');
    await new Promise(r => setTimeout(r, 2000));

    const state = await win.webContents.executeJavaScript(`
        ({
            typeofActiveProject: typeof activeProject,
            activeProjectId: typeof activeProject !== 'undefined' ? activeProject.id : null,
            activeProjectWaypoints: typeof activeProject !== 'undefined' ? activeProject.waypoints?.length : null,
            typeofCurrentRouteIR: typeof currentRouteIR,
            currentRouteIRValid: typeof currentRouteIR !== 'undefined' && currentRouteIR ? currentRouteIR.isValid : null,
            hasArenaCanvas: Boolean(document.getElementById('arena2dCanvas'))
        })
    `);

    console.log("Browser State (Direct scope):", state);
    win.destroy();
    app.quit();
});
