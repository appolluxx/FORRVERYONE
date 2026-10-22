const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

let testResults = {
    networkErrors: [],
    consoleLogs: [],
    consoleErrors: [],
    uiElementsPresent: false,
    waypointsCount: 0,
    addedWaypoint: false,
    autoPathExecuted: false,
    routeIRValid: false,
    actionSheetPopulated: false,
    codeGenerationCppValid: false,
    codeGenerationSerialValid: false,
    codeGenerationPyValid: false,
    firmwareValidationBadgePass: false,
    passed: false
};

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
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
        console.log("Page loaded. Waiting for UI initialization...");

        // Wait up to 8 seconds for UI and activeProject
        let initialized = false;
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 200));
            initialized = await win.webContents.executeJavaScript(`
                Boolean(
                    window.activeProject &&
                    window.currentRouteIR &&
                    (document.getElementById('arena2dCanvas') || document.getElementById('autoPathCanvas'))
                )
            `);
            if (initialized) break;
        }

        if (!initialized) {
            throw new Error("UI failed to initialize within timeout");
        }
        console.log("UI and Auto Path Engine initialized successfully.");

        // 1. Verify Auto Path UI Elements
        testResults.uiElementsPresent = await win.webContents.executeJavaScript(`
            Boolean(
                document.getElementById('btnAutoPath') &&
                document.getElementById('btnAddWp') &&
                (document.getElementById('btnClearRoute') || document.getElementById('btnClearWp')) &&
                (document.getElementById('btnResetDefault') || document.getElementById('btnResetWp')) &&
                document.getElementById('wpEditorCard') &&
                (document.getElementById('arena2dCanvas') || document.getElementById('autoPathCanvas')) &&
                (document.getElementById('tab-actionsheet') || document.getElementById('tabActions')) &&
                (document.getElementById('tab-code') || document.getElementById('tabCode'))
            )
        `);
        console.log("1. Auto Path UI Elements Present:", testResults.uiElementsPresent);

        // 2. Check Default Waypoints
        testResults.waypointsCount = await win.webContents.executeJavaScript(`
            window.activeProject && window.activeProject.waypoints ? window.activeProject.waypoints.length : 0
        `);
        console.log("2. Initial Waypoints Count:", testResults.waypointsCount);

        // 3. Test Add Waypoint
        const wpCountBefore = testResults.waypointsCount;
        await win.webContents.executeJavaScript(`
            if (typeof addWaypointAtCenter === 'function') {
                addWaypointAtCenter();
            } else if (typeof addNewWaypointCenter === 'function') {
                addNewWaypointCenter();
            }
        `);
        const wpCountAfter = await win.webContents.executeJavaScript(`
            window.activeProject.waypoints.length
        `);
        testResults.addedWaypoint = (wpCountAfter === wpCountBefore + 1);
        console.log("3. Add Waypoint Succeeded:", testResults.addedWaypoint, `(${wpCountBefore} -> ${wpCountAfter})`);

        // 4. Test Auto Path A* Plan Execution
        console.log("4. Triggering Auto Path (A* Obstacle Avoidance)...");
        await win.webContents.executeJavaScript(`
            if (typeof runAutoPathPlanning === 'function') {
                runAutoPathPlanning();
            } else if (typeof triggerAutoPath === 'function') {
                triggerAutoPath();
            }
        `);
        
        // Wait a moment for async fetch to complete
        await new Promise(r => setTimeout(r, 600));

        const routeCheck = await win.webContents.executeJavaScript(`
            ({
                hasIR: Boolean(window.currentRouteIR),
                isValid: window.currentRouteIR ? window.currentRouteIR.isValid : false,
                segmentCount: window.currentRouteIR ? window.currentRouteIR.segments.length : 0,
                totalDistance: window.currentRouteIR ? window.currentRouteIR.totalDistance : 0
            })
        `);
        testResults.autoPathExecuted = routeCheck.hasIR && routeCheck.segmentCount > 0;
        testResults.routeIRValid = routeCheck.isValid;
        console.log("4. Auto Path Plan Result:", routeCheck);

        // 5. Test Tab 2: Action Sheet
        console.log("5. Testing Tab 2 (Action Sheet)...");
        await win.webContents.executeJavaScript(`
            if (typeof switchTab === 'function') {
                switchTab('actions');
            } else if (typeof switchLeftTab === 'function') {
                switchLeftTab('actionsheet');
            }
        `);
        await new Promise(r => setTimeout(r, 200));
        
        const actionCheck = await win.webContents.executeJavaScript(`
            const list = document.getElementById('actionSheetRows') || document.getElementById('actionList');
            const items = list ? list.querySelectorAll('.action-item, tr') : [];
            ({
                itemCount: items.length,
                hasSpin: Array.from(items).some(it => it.textContent.includes('spinDegree')),
                hasFF: Array.from(items).some(it => it.textContent.includes('FF(')),
                hasStop: Array.from(items).some(it => it.textContent.includes('motorStop'))
            })
        `);
        testResults.actionSheetPopulated = actionCheck.itemCount > 0;
        console.log("5. Action Sheet Result:", actionCheck);

        // 6. Test Tab 3: Generated Code (C++, Serial, MicroPython)
        console.log("6. Testing Tab 3 (Generated Code)...");
        await win.webContents.executeJavaScript(`
            if (typeof switchTab === 'function') {
                switchTab('code');
            } else if (typeof switchLeftTab === 'function') {
                switchLeftTab('code');
            }
        `);
        await new Promise(r => setTimeout(r, 200));

        // Check C++
        const cppCode = await win.webContents.executeJavaScript(`
            document.getElementById('codeDisplayArea').textContent
        `);
        testResults.codeGenerationCppValid = cppCode.includes('#include <PTBOTAtomVX.h>') &&
                                            cppCode.includes('executeAutoTacticalMission') &&
                                            cppCode.includes('motorStop()');
        console.log("6a. C++ Sketch Generation Valid:", testResults.codeGenerationCppValid);

        // Check Validation Badge
        const badgePass = await win.webContents.executeJavaScript(`
            const b = document.getElementById('codeValBadge');
            Boolean(b && b.textContent.includes('100% FIRMWARE VERIFIED'))
        `);
        testResults.firmwareValidationBadgePass = badgePass;
        console.log("6b. Firmware Validation Badge:", badgePass);

        // Switch to Serial
        await win.webContents.executeJavaScript(`
            switchCodeLang('serial');
        `);
        await new Promise(r => setTimeout(r, 200));
        const serialCode = await win.webContents.executeJavaScript(`
            document.getElementById('codeDisplayArea').textContent
        `);
        testResults.codeGenerationSerialValid = serialCode.includes('PING') &&
                                               serialCode.includes('MISSION:START') &&
                                               serialCode.includes('MISSION:COMMIT');
        console.log("6c. Dynamic Serial Protocol Valid:", testResults.codeGenerationSerialValid);

        // Switch to MicroPython
        await win.webContents.executeJavaScript(`
            switchCodeLang('py');
        `);
        await new Promise(r => setTimeout(r, 200));
        const pyCode = await win.webContents.executeJavaScript(`
            document.getElementById('codeDisplayArea').textContent
        `);
        testResults.codeGenerationPyValid = pyCode.includes('PT-BOT ATOM VX') &&
                                           (pyCode.includes('motor.') || pyCode.includes('imu.'));
        console.log("6d. MicroPython Generation Valid:", testResults.codeGenerationPyValid);

        // Switch back to C++
        await win.webContents.executeJavaScript(`
            switchCodeLang('ino');
        `);

        // Check Overall Pass Condition
        testResults.passed = testResults.uiElementsPresent &&
                             testResults.autoPathExecuted &&
                             testResults.actionSheetPopulated &&
                             testResults.codeGenerationCppValid &&
                             testResults.codeGenerationSerialValid &&
                             testResults.codeGenerationPyValid &&
                             testResults.consoleErrors.length === 0;

        console.log("\n==================================================");
        console.log("BROWSER ACCEPTANCE TEST SUMMARY:");
        console.log("Console Errors:", testResults.consoleErrors.length, testResults.consoleErrors);
        console.log("Network Errors:", testResults.networkErrors.length, testResults.networkErrors);
        console.log("OVERALL RESULT:", testResults.passed ? "PASSED (100%)" : "FAILED");
        console.log("==================================================");

        fs.writeFileSync(
            path.join(__dirname, 'browser_autopath_results.json'),
            JSON.stringify(testResults, null, 2),
            'utf-8'
        );

    } catch (err) {
        console.error("Test execution failed:", err);
        testResults.error = err.message;
        testResults.passed = false;
        fs.writeFileSync(
            path.join(__dirname, 'browser_autopath_results.json'),
            JSON.stringify(testResults, null, 2),
            'utf-8'
        );
    } finally {
        win.destroy();
        app.quit();
        process.exit(testResults.passed ? 0 : 1);
    }
});
