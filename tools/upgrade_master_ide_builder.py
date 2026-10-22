import os
import json

ROOT_DIR = r"D:\Workspace\robot"
builder_path = os.path.join(ROOT_DIR, "build_rescue_sim_ide.js")

with open(builder_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. TOP LAYOUT IMPORTS
top_target = 'const layoutQuickBox = '
top_replacement = '''const layoutOfficial100 = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'arenas', 'official_field_mission.json'), 'utf8'));
const layoutNormal = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'arenas', 'normal.json'), 'utf8'));
const layoutJaajaj = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'arenas', 'jaajaj.json'), 'utf8'));
const layoutQuickBox = '''

if top_target in code and 'const layoutOfficial100 =' not in code:
    code = code.replace(top_target, top_replacement, 1)
    print("1. Added top layout constants.")

# 2. HEADER BUTTONS
hdr_target = '''        <div class="ide-header-right">
            <button class="hdr-btn highlight" id="btnOpenExamples" onclick="openExamplesModal()">
                <i class="fas fa-star" style="color: #f59e0b;"></i> Examples
            </button>'''

hdr_replacement = '''        <div class="ide-header-right">
            <button class="hdr-btn highlight" id="btnOpenExamples" onclick="openExamplesModal()">
                <i class="fas fa-star" style="color: #f59e0b;"></i> Examples
            </button>
            <button class="hdr-btn" id="btnUploadField" onclick="triggerUploadArena()" title="Upload Field Layout (.json, .mby)">
                <i class="fas fa-file-upload"></i> Upload Field
            </button>
            <button class="hdr-btn" id="btnExportField" onclick="exportArenaJSON()" title="Export Field Layout (.json)">
                <i class="fas fa-file-download"></i> Export Field
            </button>
            <input type="file" id="arenaFileInput" accept=".json,.mby,application/json" onchange="handleArenaFileUpload(event)" style="display:none;">'''

if hdr_target in code and 'id="btnUploadField"' not in code:
    code = code.replace(hdr_target, hdr_replacement, 1)
    print("2. Added header Upload & Export Field buttons.")

# 3. PLANNER ACTIONS BAR BUTTONS
planner_target = '''                        <div class="planner-actions-bar">
                            <button class="sim-btn primary" id="btnAutoPath" onclick="triggerAutoPath()">
                                <i class="fas fa-magic"></i> Auto Path (A* Avoidance)
                            </button>
                            <button class="sim-btn secondary" id="btnAddWp" onclick="addNewWaypointCenter()">
                                <i class="fas fa-plus-circle"></i> Add Point
                            </button>'''

planner_replacement = '''                        <div class="planner-actions-bar">
                            <button class="sim-btn primary" id="btnAutoPath" onclick="triggerAutoPath()">
                                <i class="fas fa-magic"></i> Auto Path (A* Avoidance)
                            </button>
                            <button class="sim-btn secondary" id="btnAddWp" onclick="addNewWaypointCenter()">
                                <i class="fas fa-plus-circle"></i> Add Point
                            </button>
                            <button class="sim-btn secondary" id="btnUploadFieldPlan" onclick="triggerUploadArena()" title="Upload Field Layout (.json, .mby)">
                                <i class="fas fa-file-upload"></i> Upload Field
                            </button>
                            <button class="sim-btn secondary" id="btnExportFieldPlan" onclick="exportArenaJSON()" title="Export Field (.json)">
                                <i class="fas fa-file-download"></i> Export Field
                            </button>'''

if planner_target in code and 'id="btnUploadFieldPlan"' not in code:
    code = code.replace(planner_target, planner_replacement, 1)
    print("3. Added planner bar Upload & Export Field buttons.")

# 4. EXAMPLES MODAL CARDS
modal_target = '''                <!-- TARGET 2: QUICK DROP BOX 4 ENC -->
                <div class="example-grid-card" onclick="loadExampleQuickDropBox4Enc()">
                    <div class="example-img-wrap">
                        <img src="assets/images/atom_vx_cover.jpg" alt="Quick Drop Box 4 ENC">
                        <span class="official-tag">★ 4-DROP CHALLENGE</span>
                    </div>
                    <div class="example-body-wrap">
                        <div class="example-card-meta">
                            <span class="example-board-badge">ATOM VX</span>
                            <span class="example-tag-badge">Competition Match</span>
                        </div>
                        <h3 class="example-card-title">Quick Drop Box 4 ENC</h3>
                        <p class="example-card-desc">
                            120×120cm official arena with 16 quick-box boundary decals, 4 dedicated supply drop zones (BOX1: FL, BOX2: FR, BOX3: B, BOX4: F), and dynamic supply cube deployment.
                        </p>
                    </div>
                    <div class="example-card-footer">
                        <span style="font-size: 0.68rem; color: #10b981; font-weight: 700;">4-Zone Delivery Challenge</span>
                        <button class="btn-open-example" style="background: #10b981;">
                            <i class="fas fa-folder-open"></i> Load Mission
                        </button>
                    </div>
                </div>'''

modal_replacement = '''                <!-- TARGET 2: QUICK DROP BOX 4 ENC -->
                <div class="example-grid-card" onclick="loadExampleQuickDropBox4Enc()">
                    <div class="example-img-wrap">
                        <img src="assets/images/atom_vx_cover.jpg" alt="Quick Drop Box 4 ENC">
                        <span class="official-tag">★ 4-DROP CHALLENGE</span>
                    </div>
                    <div class="example-body-wrap">
                        <div class="example-card-meta">
                            <span class="example-board-badge">ATOM VX</span>
                            <span class="example-tag-badge">Competition Match</span>
                        </div>
                        <h3 class="example-card-title">Quick Drop Box 4 ENC</h3>
                        <p class="example-card-desc">
                            120×120cm official arena with 16 quick-box boundary decals, 4 dedicated supply drop zones (BOX1: FL, BOX2: FR, BOX3: B, BOX4: F), and dynamic supply cube deployment.
                        </p>
                    </div>
                    <div class="example-card-footer">
                        <span style="font-size: 0.68rem; color: #10b981; font-weight: 700;">4-Zone Delivery Challenge</span>
                        <button class="btn-open-example" style="background: #10b981;">
                            <i class="fas fa-folder-open"></i> Load Mission
                        </button>
                    </div>
                </div>

                <!-- TARGET 3: OFFICIAL 100-POINT ARENA -->
                <div class="example-grid-card" onclick="loadExampleOfficial100Pts()">
                    <div class="example-img-wrap">
                        <img src="assets/images/atom_vx_sensor.png" alt="Official 100-Point Field">
                        <span class="official-tag" style="background: #e11d48;">🏆 100-POINT ARENA</span>
                    </div>
                    <div class="example-body-wrap">
                        <div class="example-card-meta">
                            <span class="example-board-badge">ATOM VX</span>
                            <span class="example-tag-badge">National Match</span>
                        </div>
                        <h3 class="example-card-title">Official 100-Point Arena</h3>
                        <p class="example-card-desc">
                            Full 32-tile competition arena with 50mm bridge, 7 chopsticks, tunnel, seesaw, sunken pit, and 4 drop zones.
                        </p>
                    </div>
                    <div class="example-card-footer">
                        <span style="font-size: 0.68rem; color: #e11d48; font-weight: 700;">Full 100-Point Circuit</span>
                        <button class="btn-open-example" style="background: #e11d48;">
                            <i class="fas fa-folder-open"></i> Load Mission
                        </button>
                    </div>
                </div>

                <!-- TARGET 4: NORMAL PRACTICE FIELD -->
                <div class="example-grid-card" onclick="loadExampleNormalField()">
                    <div class="example-img-wrap">
                        <img src="assets/images/atom_vx_motor.png" alt="Normal Field">
                        <span class="official-tag" style="background: #d97706;">🥢 BUMPS & PIT</span>
                    </div>
                    <div class="example-body-wrap">
                        <div class="example-card-meta">
                            <span class="example-board-badge">ATOM VX</span>
                            <span class="example-tag-badge">Obstacle Practice</span>
                        </div>
                        <h3 class="example-card-title">Normal Practice Field</h3>
                        <p class="example-card-desc">
                            Standard rescue arena layout with bamboo chopsticks speed bumps, blackhole pit avoidance, and West drop bay.
                        </p>
                    </div>
                    <div class="example-card-footer">
                        <span style="font-size: 0.68rem; color: #d97706; font-weight: 700;">Tactical Obstacles</span>
                        <button class="btn-open-example" style="background: #d97706;">
                            <i class="fas fa-folder-open"></i> Load Mission
                        </button>
                    </div>
                </div>

                <!-- UPLOAD CUSTOM ARENA CARD -->
                <div class="example-grid-card" onclick="triggerUploadArena()" style="border: 2px dashed #0284c7; background: rgba(2, 132, 199, 0.04); cursor: pointer; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 10px;">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h3 style="font-size: 0.92rem; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Upload Custom Field</h3>
                    <p style="font-size: 0.72rem; color: #64748b; line-height: 1.4; margin-bottom: 12px;">
                        Import any arena layout JSON file (.json) or roboBlocks project (.mby). Drag & drop anywhere!
                    </p>
                    <button class="btn-open-example" style="background: #0284c7;">
                        <i class="fas fa-upload"></i> Browse File
                    </button>
                </div>'''

if modal_target in code and 'loadExampleOfficial100Pts()' not in code:
    code = code.replace(modal_target, modal_replacement, 1)
    print("4. Added preset cards and Upload card to Examples modal.")

# 5. JS PRESETS
js_preset_target = '        const ARENA_FIVE_POINTS = ${JSON.stringify(layoutFivePoints)};'
js_preset_replacement = '''        const ARENA_OFFICIAL_100 = ${JSON.stringify(layoutOfficial100)};
        const ARENA_NORMAL = ${JSON.stringify(layoutNormal)};
        const ARENA_JAAJAJ = ${JSON.stringify(layoutJaajaj)};
        const ARENA_FIVE_POINTS = ${JSON.stringify(layoutFivePoints)};'''

if js_preset_target in code and 'const ARENA_OFFICIAL_100 =' not in code:
    code = code.replace(js_preset_target, js_preset_replacement, 1)
    print("5. Added arena presets to JS.")

# 6. JS ARENA MANAGER & UPLOAD FUNCTIONS
manager_funcs = '''
        // ---------------------------------------------------------------------
        // ARENA UPLOAD, IMPORT, EXPORT & PRESET CONTROLLER
        // ---------------------------------------------------------------------
        function triggerUploadArena() {
            let input = document.getElementById('arenaFileInput');
            if (!input) {
                input = document.createElement('input');
                input.type = 'file';
                input.id = 'arenaFileInput';
                input.accept = '.json,.mby,application/json';
                input.style.display = 'none';
                input.onchange = handleArenaFileUpload;
                document.body.appendChild(input);
            }
            input.value = '';
            input.click();
        }

        function handleArenaFileUpload(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                showToast("File exceeds 5MB safety limit");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                loadArenaFromJSON(e.target.result, file.name);
            };
            reader.readAsText(file);
        }

        function loadArenaFromJSON(jsonText, fileName) {
            try {
                let parsed = null;
                if (typeof jsonText === 'string') {
                    parsed = JSON.parse(jsonText);
                } else if (typeof jsonText === 'object') {
                    parsed = jsonText;
                }
                if (!parsed) throw new Error("Invalid JSON payload");

                const cleanName = (fileName || 'Custom Arena').replace(/\\.[^/.]+$/, "");
                activeProject.id = "custom-" + Date.now();
                activeProject.name = cleanName;
                activeProject.loaded = true;

                // Normalize waypoints
                let waypoints = [];
                if (parsed.pathNodes && Array.isArray(parsed.pathNodes) && parsed.pathNodes.length > 0) {
                    waypoints = parsed.pathNodes.map((node, idx) => {
                        let x = node.x;
                        let z = node.z;
                        if (x === undefined && node.cellIdx !== undefined) {
                            const c = node.cellIdx % 8;
                            const r = Math.floor(node.cellIdx / 8);
                            x = parseFloat((-1.05 + c * 0.30).toFixed(2));
                            z = parseFloat((-0.45 + r * 0.30).toFixed(2));
                        }
                        let fnName = node.fn || "FORWARD";
                        if (fnName === "FF") fnName = "FORWARD";
                        if (fnName === "BB") fnName = "BACKWARD";
                        if (fnName === "spinDegree") fnName = (node.angle < 0) ? "TURN_LEFT" : "TURN_RIGHT";
                        if (fnName === "turnDegreeFront") fnName = (node.angle < 0) ? "TURN_LEFT" : "TURN_RIGHT";

                        return {
                            id: idx + 1,
                            x: x !== undefined ? x : 0,
                            z: z !== undefined ? z : 0,
                            label: node.label || ('WP ' + (idx + 1)),
                            fn: fnName,
                            speed: node.speed || 70,
                            time: node.timer ? parseFloat((node.timer / 1000).toFixed(2)) : (node.time || 0.5),
                            angle: node.angle !== undefined ? node.angle : 0,
                            kp: node.kp || 0.6,
                            kd: node.kd || 2.0
                        };
                    });
                } else if (parsed.waypoints && Array.isArray(parsed.waypoints) && parsed.waypoints.length > 0) {
                    waypoints = parsed.waypoints;
                }

                currentArenaData = parsed;

                // If no waypoints provided, auto-compute default start to targets
                if (waypoints.length === 0) {
                    let startIdx = 31;
                    let targetIdx = 0;
                    if (parsed.gridData) {
                        const sIdx = parsed.gridData.findIndex(g => g.type === 'start');
                        if (sIdx !== -1) startIdx = sIdx;
                        const fIdx = parsed.gridData.findIndex(g => g.type === 'finish' || (g.type && g.type.includes('drop')) || g.type === 'checkpoint');
                        if (fIdx !== -1) targetIdx = fIdx;
                    } else if (parsed.cells) {
                        const sIdx = parsed.cells.findIndex(c => c.type === 'rescue_start');
                        if (sIdx !== -1) startIdx = sIdx;
                        const fIdx = parsed.cells.findIndex(c => c.type === 'rescue_finish' || (c.type && c.type.includes('drop')));
                        if (fIdx !== -1) targetIdx = fIdx;
                    }

                    const sc = startIdx % 8;
                    const sr = Math.floor(startIdx / 8);
                    const tc = targetIdx % 8;
                    const tr = Math.floor(targetIdx / 8);

                    const sx = parseFloat((-1.05 + sc * 0.30).toFixed(2));
                    const sz = parseFloat((-0.45 + sr * 0.30).toFixed(2));
                    const tx = parseFloat((-1.05 + tc * 0.30).toFixed(2));
                    const tz = parseFloat((-0.45 + tr * 0.30).toFixed(2));

                    waypoints = [
                        { id: 1, x: sx, z: sz, label: "START", fn: "START", speed: 0, time: 0, angle: 90, kp: 0.6, kd: 2.0 },
                        { id: 2, x: sx, z: parseFloat(((sz + tz)/2).toFixed(2)), label: "WP 1 (NAV)", fn: "FORWARD", speed: 60, time: 0.8, angle: 90, kp: 0.6, kd: 2.0 },
                        { id: 3, x: tx, z: tz, label: "TARGET DOCK", fn: "STOP", speed: 0, time: 0.2, angle: 90, kp: 0.6, kd: 2.0 }
                    ];
                }

                activeProject.waypoints = waypoints;

                const nameInput = document.getElementById('projectNameInput');
                if (nameInput) nameInput.value = activeProject.name;

                const badge = document.getElementById('missionStatusBadge');
                if (badge) {
                    badge.textContent = "CUSTOM: " + activeProject.name.toUpperCase();
                    badge.className = "badge-pill blue";
                }

                const titleEl = document.getElementById('arenaInfoTitle');
                if (titleEl) titleEl.textContent = activeProject.name + ' · Loaded Arena';

                const descEl = document.getElementById('arenaInfoDesc');
                if (descEl) {
                    const cellCount = (parsed.gridData ? parsed.gridData.length : (parsed.cells ? parsed.cells.length : 32));
                    descEl.textContent = 'Custom arena imported with ' + cellCount + ' tiles, ' + waypoints.length + ' route waypoints, and dynamic 3D obstacle synthesis.';
                }

                clearDroppedBoxes();
                build3DArenaObstacles();
                drawArena2D();
                renderActionSheet();
                renderGeneratedCode();
                resetSimRun();

                showToast('Loaded Arena: ' + cleanName);
                logTerminal('[ARENA] Loaded field layout: ' + cleanName + ' (' + waypoints.length + ' waypoints)');
            } catch (err) {
                console.error("Load Arena Error:", err);
                showToast("Error loading arena: " + err.message);
                logTerminal('[ERROR] Failed to parse arena file: ' + err.message);
            }
        }

        function exportArenaJSON() {
            try {
                let exportData = {};
                if (currentArenaData && (currentArenaData.gridData || currentArenaData.cells)) {
                    exportData = JSON.parse(JSON.stringify(currentArenaData));
                } else {
                    exportData = { COLS: 8, ROWS: 4, gridData: [] };
                }
                exportData.name = activeProject.name || "Custom Arena";
                exportData.waypoints = activeProject.waypoints || [];
                exportData.pathNodes = (activeProject.waypoints || []).map(wp => {
                    const c = Math.max(0, Math.min(7, Math.round((wp.x + 1.05) / 0.30)));
                    const r = Math.max(0, Math.min(3, Math.round((wp.z + 0.45) / 0.30)));
                    return {
                        cellIdx: r * 8 + c,
                        x: wp.x,
                        z: wp.z,
                        label: wp.label,
                        fn: wp.fn,
                        speed: wp.speed,
                        timer: Math.round(wp.time * 1000),
                        angle: wp.angle
                    };
                });

                const jsonStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const cleanName = (activeProject.name || 'arena').toLowerCase().replace(/[^a-z0-9_]/g, '_');
                a.download = cleanName + '_layout.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToast('Exported Arena: ' + a.download);
                logTerminal('[EXPORT] Arena JSON exported: ' + a.download);
            } catch (err) {
                showToast("Export error: " + err.message);
            }
        }

        function loadExampleOfficial100Pts() {
            closeExamplesModal();
            loadArenaFromJSON(ARENA_OFFICIAL_100, "Official 100-Point Field");
            showToast("Loaded: Official 100-Point Competition Field");
            logTerminal("Loaded official mission: [Official 100-Point Field]");
        }

        function loadExampleNormalField() {
            closeExamplesModal();
            loadArenaFromJSON(ARENA_NORMAL, "Normal Field (Bumps & Pit)");
            showToast("Loaded: Normal Field");
            logTerminal("Loaded arena: [Normal Field]");
        }

        function loadExampleJaajajField() {
            closeExamplesModal();
            loadArenaFromJSON(ARENA_JAAJAJ, "Jaajaj Rescue Field");
            showToast("Loaded: Jaajaj Field");
            logTerminal("Loaded arena: [Jaajaj Field]");
        }

        // Global Drag & Drop Support
        window.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith('.json') || file.name.endsWith('.mby') || file.type.includes('json')) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        loadArenaFromJSON(evt.target.result, file.name);
                    };
                    reader.readAsText(file);
                } else {
                    showToast("Please drop a valid .json or .mby arena file");
                }
            }
        });
'''

five_point_target = '        function loadExampleFivePointRoute() {'
if five_point_target in code and 'function triggerUploadArena()' not in code:
    code = code.replace(five_point_target, manager_funcs + '\n        function loadExampleFivePointRoute() {', 1)
    print("6. Added Arena Manager functions.")

# 7. DYNAMIC 3D OBSTACLE BUILDER
dynamic_3d_builder = '''        function build3DArenaObstacles() {
            // Remove previous obstacles
            obstacleMeshes.forEach(m => scene.remove(m));
            obstacleMeshes = [];

            const arena = currentArenaData || ARENA_FIVE_POINTS;
            const cellsList = arena.cells || arena.gridData || [];

            // Standard obstacle materials
            const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
            const railMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
            const chopstickMat = new THREE.MeshStandardMaterial({ color: 0xd2a679, roughness: 0.6 });
            const seesawMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 });
            const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
            const pitMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
            const bombMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });

            cellsList.forEach((cell, idx) => {
                const type = (cell.type || '').toLowerCase();
                if (!type || type === 'empty' || type === 'blank') return;

                const c = idx % 8;
                const r = Math.floor(idx / 8);
                const x = parseFloat((-1.05 + c * 0.30).toFixed(3));
                const z = parseFloat((-0.45 + r * 0.30).toFixed(3));

                // 1. BRIDGE (50mm elevation, incline/decline ramps, safety guardrails)
                if (type === 'bridge' || type.includes('bridge')) {
                    const rampUp = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.015, 0.26), bridgeMat);
                    rampUp.position.set(x - 0.08, 0.025, z);
                    rampUp.rotation.z = Math.PI * 0.083;
                    rampUp.castShadow = true;
                    rampUp.receiveShadow = true;
                    scene.add(rampUp);
                    obstacleMeshes.push(rampUp);

                    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.26), bridgeMat);
                    deck.position.set(x, 0.05, z);
                    deck.castShadow = true;
                    deck.receiveShadow = true;
                    scene.add(deck);
                    obstacleMeshes.push(deck);

                    const rampDown = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.015, 0.26), bridgeMat);
                    rampDown.position.set(x + 0.08, 0.025, z);
                    rampDown.rotation.z = -Math.PI * 0.083;
                    rampDown.castShadow = true;
                    rampDown.receiveShadow = true;
                    scene.add(rampDown);
                    obstacleMeshes.push(rampDown);

                    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.015), railMat);
                    r1.position.set(x, 0.06, z - 0.13);
                    scene.add(r1);
                    obstacleMeshes.push(r1);

                    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.015), railMat);
                    r2.position.set(x, 0.06, z + 0.13);
                    scene.add(r2);
                    obstacleMeshes.push(r2);
                }
                // 2. SPEED BUMPS (7 bamboo rods with 0.689 reflectance)
                else if (type === 'bump' || type === 'bumps' || type.includes('bump')) {
                    for (let i = 0; i < 7; i++) {
                        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.25, 12), chopstickMat);
                        rod.rotation.x = Math.PI / 2;
                        rod.position.set(x - 0.10 + (i * 0.033), 0.005, z);
                        rod.castShadow = true;
                        scene.add(rod);
                        obstacleMeshes.push(rod);
                    }
                }
                // 3. SEESAW (Center pivot fulcrum & angled plank)
                else if (type === 'seesaw' || type.includes('seesaw')) {
                    const fulcrum = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.24, 16), railMat);
                    fulcrum.rotation.x = Math.PI / 2;
                    fulcrum.position.set(x, 0.015, z);
                    scene.add(fulcrum);
                    obstacleMeshes.push(fulcrum);

                    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, 0.22), seesawMat);
                    plank.position.set(x, 0.025, z);
                    plank.rotation.z = 0.12;
                    plank.castShadow = true;
                    scene.add(plank);
                    obstacleMeshes.push(plank);
                }
                // 4. TUNNEL (4 Corner Posts & Roof Lintel)
                else if (type === 'tunnel' || type.includes('tunnel')) {
                    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, 0.26), tunnelMat);
                    roof.position.set(x, 0.12, z);
                    scene.add(roof);
                    obstacleMeshes.push(roof);

                    [-0.12, 0.12].forEach(px => {
                        [-0.12, 0.12].forEach(pz => {
                            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 10), railMat);
                            post.position.set(x + px, 0.06, z + pz);
                            scene.add(post);
                            obstacleMeshes.push(post);
                        });
                    });
                }
                // 5. PIT / BLACKHOLE
                else if (type === 'pit' || type === 'blackhole' || type.includes('pit')) {
                    const pitHole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 32), pitMat);
                    pitHole.position.set(x, -0.028, z);
                    scene.add(pitHole);
                    obstacleMeshes.push(pitHole);

                    const rim = new THREE.Mesh(new THREE.RingGeometry(0.118, 0.138, 32), new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide }));
                    rim.rotation.x = Math.PI / 2;
                    rim.position.set(x, 0.002, z);
                    scene.add(rim);
                    obstacleMeshes.push(rim);
                }
                // 6. BOMB HAZARD
                else if (type === 'bomb' || type.includes('bomb')) {
                    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), bombMat);
                    bMesh.position.set(x, 0.04, z);
                    bMesh.castShadow = true;
                    scene.add(bMesh);
                    obstacleMeshes.push(bMesh);

                    const dangerRing = new THREE.Mesh(new THREE.RingGeometry(0.10, 0.12, 32), new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide }));
                    dangerRing.rotation.x = Math.PI / 2;
                    dangerRing.position.set(x, 0.002, z);
                    scene.add(dangerRing);
                    obstacleMeshes.push(dangerRing);
                }
                // 7. DROP ZONES
                else if (type.includes('drop')) {
                    const dzPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.18), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }));
                    dzPlate.position.set(x, 0.002, z);
                    scene.add(dzPlate);
                    obstacleMeshes.push(dzPlate);

                    const dRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.14, 32), new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }));
                    dRing.rotation.x = Math.PI / 2;
                    dRing.position.set(x, 0.003, z);
                    scene.add(dRing);
                    obstacleMeshes.push(dRing);

                    const dBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6 }));
                    dBeacon.position.set(x, 0.09, z);
                    scene.add(dBeacon);
                    obstacleMeshes.push(dBeacon);
                }
                // 8. CHECKPOINTS
                else if (type === 'checkpoint' || type.includes('checkpoint')) {
                    const cpRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
                    cpRing.rotation.x = Math.PI / 2;
                    cpRing.position.set(x, 0.002, z);
                    scene.add(cpRing);
                    obstacleMeshes.push(cpRing);

                    const cpBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.15, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 }));
                    cpBeacon.position.set(x, 0.075, z);
                    scene.add(cpBeacon);
                    obstacleMeshes.push(cpBeacon);
                }
                // 9. START
                else if (type === 'start' || type.includes('start')) {
                    const startPad = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.003, 0.20), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
                    startPad.position.set(x, 0.001, z);
                    scene.add(startPad);
                    obstacleMeshes.push(startPad);
                }
                // 10. FINISH
                else if (type === 'finish' || type.includes('finish')) {
                    const finPad = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.003, 0.20), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
                    finPad.position.set(x, 0.001, z);
                    scene.add(finPad);
                    obstacleMeshes.push(finPad);
                }
            });

            // Target rings & glowing beacons for waypoints
            if (activeProject.waypoints && activeProject.waypoints.length > 0) {
                activeProject.waypoints.forEach((pt, idx) => {
                    const ringColor = (idx === 0) ? 0x10b981 : ((idx === activeProject.waypoints.length - 1) ? 0x2563eb : 0x38bdf8);
                    const ringGeo = new THREE.RingGeometry(0.05, 0.07, 32);
                    const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.x = Math.PI / 2;
                    ring.position.set(pt.x, 0.002, pt.z);
                    scene.add(ring);
                    obstacleMeshes.push(ring);

                    const beaconGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.15, 8);
                    const beaconMat = new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.5 });
                    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
                    beacon.position.set(pt.x, 0.075, pt.z);
                    scene.add(beacon);
                    obstacleMeshes.push(beacon);
                });
            }
        }'''

b_start = code.find('function build3DArenaObstacles() {')
b_end = code.find('function spawnDroppedBox(', b_start)
if b_start != -1 and b_end != -1:
    code = code[:b_start] + dynamic_3d_builder + '\n\n        ' + code[b_end:]
    print("7. Replaced build3DArenaObstacles with dynamic 3D synthesizer.")

# 8. ENHANCED 2D ARENA DRAWING
enhanced_draw2d = '''        function drawArena2D() {
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);

            const cols = 8;
            const rows = 4;
            const tw = w / cols;
            const th = h / rows;
            const arena = currentArenaData || ARENA_FIVE_POINTS;
            const cellsList = arena.cells || arena.gridData || [];

            // Draw Tiles & Obstacles
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = r * cols + c;
                    const x = c * tw;
                    const y = r * th;
                    const cell = cellsList[idx];
                    const type = (cell && cell.type ? cell.type : '').toLowerCase();

                    // Tile border
                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, tw, th);

                    // Tile line decorations
                    ctx.strokeStyle = "#0f172a";
                    ctx.lineWidth = 3;
                    if (type.includes('top')) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tw, y); ctx.stroke();
                    }
                    if (type.includes('bottom')) {
                        ctx.beginPath(); ctx.moveTo(x, y + th); ctx.lineTo(x + tw, y + th); ctx.stroke();
                    }
                    if (type.includes('left')) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + th); ctx.stroke();
                    }
                    if (type.includes('right')) {
                        ctx.beginPath(); ctx.moveTo(x + tw, y); ctx.lineTo(x + tw, y + th); ctx.stroke();
                    }

                    // Special Tiles
                    if (type === 'pit' || type === 'blackhole' || type.includes('pit')) {
                        ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#dc2626";
                        ctx.font = "bold 9px sans-serif";
                        ctx.fillText("PIT", x + tw / 2 - 8, y + th / 2 + 3);
                    } else if (type === 'bridge' || type.includes('bridge')) {
                        ctx.fillStyle = "rgba(217, 119, 6, 0.22)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#d97706";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("BRIDGE", x + tw / 2 - 15, y + th / 2 + 3);
                    } else if (type === 'bump' || type === 'bumps' || type.includes('bump')) {
                        ctx.fillStyle = "rgba(210, 166, 121, 0.3)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#92400e";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("BUMPS", x + tw / 2 - 14, y + th / 2 + 3);
                    } else if (type === 'seesaw' || type.includes('seesaw')) {
                        ctx.fillStyle = "rgba(124, 58, 237, 0.22)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#7c3aed";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("SEESAW", x + tw / 2 - 16, y + th / 2 + 3);
                    } else if (type === 'tunnel' || type.includes('tunnel')) {
                        ctx.fillStyle = "rgba(51, 65, 85, 0.25)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#334155";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("TUNNEL", x + tw / 2 - 16, y + th / 2 + 3);
                    } else if (type === 'bomb' || type.includes('bomb')) {
                        ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#b91c1c";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("BOMB", x + tw / 2 - 12, y + th / 2 + 3);
                    } else if (type === 'start' || type === 'rescue_start') {
                        ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#059669";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("START", x + tw / 2 - 13, y + th / 2 + 3);
                    } else if (type === 'finish' || type === 'rescue_finish') {
                        ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#2563eb";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("FINISH", x + tw / 2 - 14, y + th / 2 + 3);
                    } else if (type.includes('drop')) {
                        ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#b45309";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("DROP", x + tw / 2 - 11, y + th / 2 + 3);
                    } else if (type.includes('checkpoint')) {
                        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#0284c7";
                        ctx.font = "bold 8px sans-serif";
                        ctx.fillText("CP", x + tw / 2 - 6, y + th / 2 + 3);
                    }
                }
            }

            // Draw Waypoints & Planned Route
            const waypoints = activeProject.waypoints || [];
            if (waypoints.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 2.5;
                ctx.setLineDash([4, 3]);

                waypoints.forEach((pt, idx) => {
                    const canvasX = ((pt.x + 1.20) / 2.40) * w;
                    const canvasY = ((pt.z + 0.60) / 1.20) * h;
                    if (idx === 0) ctx.moveTo(canvasX, canvasY);
                    else ctx.lineTo(canvasX, canvasY);
                });
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw Nodes
                waypoints.forEach((pt, idx) => {
                    const canvasX = ((pt.x + 1.20) / 2.40) * w;
                    const canvasY = ((pt.z + 0.60) / 1.20) * h;

                    ctx.beginPath();
                    ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
                    ctx.fillStyle = (idx === 0) ? "#10b981" : ((idx === waypoints.length - 1) ? "#2563eb" : "#38bdf8");
                    ctx.fill();
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = "#0f172a";
                    ctx.font = "bold 8px monospace";
                    ctx.fillText(idx + 1, canvasX - 2, canvasY - 8);
                });
            }
        }'''

d_start = code.find('function drawArena2D() {')
d_end = code.find('function renderActionSheet() {', d_start)
if d_start != -1 and d_end != -1:
    code = code[:d_start] + enhanced_draw2d + '\n\n        ' + code[d_end:]
    print("8. Replaced drawArena2D with multi-hazard renderer.")

with open(builder_path, "w", encoding="utf-8") as f:
    f.write(code)

print(f"Master builder {builder_path} updated successfully!")
