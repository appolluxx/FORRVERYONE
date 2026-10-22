const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

let testResults = {
    networkErrors: [],
    consoleLogs: [],
    consoleErrors: [],
    threeJsInitialized: false,
    modelLoaded: false,
    activeProject: null,
    telemetrySamplesFivePoints: [],
    telemetrySamplesQuickDrop: [],
    layoutSwitchSuccess: false,
    passed: false
};

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    session.defaultSession.webRequest.onCompleted((details) => {
        if (details.statusCode >= 400) {
            testResults.networkErrors.push({
                url: details.url,
                statusCode: details.statusCode
            });
        }
    });

    win.webContents.on('console-message', (event) => {
        testResults.consoleLogs.push({
            level: event.level,
            message: event.message
        });
        if (event.level >= 2 && !event.message.includes('Electron Security Warning')) {
            testResults.consoleErrors.push(event.message);
        }
    });

    try {
        console.log("Loading http://127.0.0.1:4848/tactical_planner.html ...");
        await win.loadURL('http://127.0.0.1:4848/tactical_planner.html');
        console.log("Page loaded. Waiting for 3D engine and GLTF model to load...");

        // Wait up to 10 seconds for robotMesh to load
        let loaded = false;
        for (let i = 0; i < 35; i++) {
            await new Promise(r => setTimeout(r, 300));
            loaded = await win.webContents.executeJavaScript(`
                Boolean(window.robotMesh && window.activeProject && window.activeProject.loaded)
            `);
            if (loaded) {
                console.log("Model and engine ready after " + ((i+1)*300) + "ms!");
                break;
            }
        }

        testResults.modelLoaded = loaded;

        // Inspect scene objects and project
        const engineState = await win.webContents.executeJavaScript(`
            ({
                projectName: window.activeProject ? window.activeProject.name : null,
                projectId: window.activeProject ? window.activeProject.id : null,
                waypointsCount: window.activeProject && window.activeProject.waypoints ? window.activeProject.waypoints.length : 0,
                hasRobotMesh: Boolean(window.robotMesh),
                hasWheelMeshes: Boolean(window.robotWheelMeshes && window.robotWheelMeshes.length > 0),
                wheelCount: window.robotWheelMeshes ? window.robotWheelMeshes.length : 0,
                sceneChildren: window.scene ? window.scene.children.length : 0
            })
        `);
        console.log("Engine State:", JSON.stringify(engineState, null, 2));
        testResults.activeProject = engineState.projectName;
        testResults.threeJsInitialized = engineState.hasRobotMesh;

        // Click Run Sim button for Five-Point Route
        console.log("Starting Five-Point Route simulation run...");
        await win.webContents.executeJavaScript(`
            (() => {
                const btn = document.getElementById('btnSimPlay');
                if (btn) btn.click();
            })();
        `);

        // Helper to sample telemetry
        const sampleTelemetry = async () => {
            return await win.webContents.executeJavaScript(`
                ({
                    progress: document.getElementById('lblSimProgressPct')?.textContent,
                    simRunning: window.isSimRunning,
                    yaw: document.getElementById('hudYaw')?.textContent,
                    pitchRoll: document.getElementById('hudPitchRoll')?.textContent,
                    speed: document.getElementById('hudSpeed')?.textContent,
                    pos: document.getElementById('hudPos')?.textContent,
                    elevation: document.getElementById('hudElevation')?.textContent,
                    headingError: document.getElementById('hudHeadingError')?.textContent,
                    pdOutput: document.getElementById('hudPDOutput')?.textContent,
                    motionPhase: document.getElementById('hudMotionPhase')?.textContent,
                    m1: document.getElementById('m1Val')?.textContent,
                    m2: document.getElementById('m2Val')?.textContent,
                    m3: document.getElementById('m3Val')?.textContent,
                    m4: document.getElementById('m4Val')?.textContent,
                    refl: document.getElementById('hudReflectanceIdx')?.textContent,
                    surfaceStatus: document.getElementById('hudSurfaceStatus')?.textContent,
                    centroid: document.getElementById('hudCentroid')?.textContent,
                    sensorBars: [0,1,2,3,4,5,6,7].map(i => document.getElementById('sbar' + i)?.style.height)
                })
            `);
        };

        // Sample telemetry across 4 seconds of active simulation
        for (let step = 0; step < 8; step++) {
            await new Promise(r => setTimeout(r, 500));
            const telemetry = await sampleTelemetry();
            testResults.telemetrySamplesFivePoints.push(telemetry);
        }

        // Test project switching to Quick Drop Box 4 ENC
        console.log("Testing project switch to Quick Drop Box 4 ENC...");
        await win.webContents.executeJavaScript(`
            (() => {
                if (typeof loadExampleQuickDropBox4Enc === 'function') {
                    loadExampleQuickDropBox4Enc();
                }
            })();
        `);

        await new Promise(r => setTimeout(r, 1500));
        const switchedState = await win.webContents.executeJavaScript(`
            ({
                projectId: window.activeProject ? window.activeProject.id : null,
                projectName: window.activeProject ? window.activeProject.name : null,
                waypointsCount: window.activeProject && window.activeProject.waypoints ? window.activeProject.waypoints.length : 0
            })
        `);
        console.log("Switched State:", JSON.stringify(switchedState, null, 2));
        if (switchedState.projectId === 'quick-box-drop' || switchedState.projectName === 'Quick Drop Box 4 ENC') {
            testResults.layoutSwitchSuccess = true;
        }

        // Start Quick Drop simulation run
        console.log("Starting Quick Drop Box 4 ENC simulation run...");
        await win.webContents.executeJavaScript(`
            (() => {
                const btn = document.getElementById('btnSimPlay');
                if (btn) btn.click();
            })();
        `);

        // Sample telemetry for Quick Drop
        for (let step = 0; step < 6; step++) {
            await new Promise(r => setTimeout(r, 500));
            const telemetry = await sampleTelemetry();
            testResults.telemetrySamplesQuickDrop.push(telemetry);
        }

        testResults.passed = testResults.modelLoaded && testResults.layoutSwitchSuccess && (testResults.networkErrors.length === 0) && (testResults.consoleErrors.length === 0);
    } catch (err) {
        console.error("Test execution failed:", err);
        testResults.error = err.message;
    } finally {
        console.log("=== BROWSER ACCEPTANCE TEST SUMMARY ===");
        console.log("Passed:", testResults.passed);
        console.log("Model Loaded:", testResults.modelLoaded);
        console.log("Layout Switch Success:", testResults.layoutSwitchSuccess);
        console.log("Network Errors (4xx/5xx):", testResults.networkErrors.length);
        console.log("Console Errors:", testResults.consoleErrors.length);
        console.log("FivePoints Telemetry Samples:", testResults.telemetrySamplesFivePoints.length);
        console.log("QuickDrop Telemetry Samples:", testResults.telemetrySamplesQuickDrop.length);

        fs.writeFileSync(
            path.join(__dirname, 'browser_test_results.json'),
            JSON.stringify(testResults, null, 2),
            'utf-8'
        );
        win.destroy();
        app.quit();
    }
});
