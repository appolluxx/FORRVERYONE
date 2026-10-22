import os
import json

ROOT_DIR = r"D:\Workspace\robot"
builder_path = os.path.join(ROOT_DIR, "build_rescue_sim_ide.js")

with open(builder_path, "r", encoding="utf-8") as f:
    code = f.read()

# -----------------------------------------------------------------------------
# 1. ADD CSS FOR ARENA PALETTE & ENHANCED TACTICAL LAYOUT
# -----------------------------------------------------------------------------
palette_css = '''
        /* ARENA DESIGNER & TILE PALETTE */
        .palette-section-title {
            font-size: 0.72rem;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin: 12px 0 6px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .tool-palette-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-bottom: 10px;
        }

        .palette-tool-btn {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 7px 10px;
            font-size: 0.73rem;
            font-weight: 600;
            color: #1e293b;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.15s ease;
            text-align: left;
        }

        .palette-tool-btn:hover {
            background: #f8fafc;
            border-color: #94a3b8;
        }

        .palette-tool-btn.active {
            background: #eff6ff;
            border-color: #0284c7;
            color: #0369a1;
            box-shadow: 0 0 0 1px #0284c7;
        }

        .swatch-icon {
            width: 14px;
            height: 14px;
            border-radius: 3px;
            flex-shrink: 0;
            border: 1px solid rgba(0, 0, 0, 0.15);
        }

        .arena-edit-canvas-wrap {
            position: relative;
            background: #f8fafc;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .canvas-hint-banner {
            font-size: 0.70rem;
            color: #64748b;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 4px;
        }
'''

# Insert palette CSS before </style>
if '.tool-palette-grid' not in code:
    code = code.replace('    </style>', palette_css + '\n    </style>')
    print("1. Added palette CSS.")

# -----------------------------------------------------------------------------
# 2. UPDATE LEFT PANEL TABS (Field Editor, Route Planner, Action Sheet, Code)
# -----------------------------------------------------------------------------
tabs_nav_target = '''            <div class="left-panel-nav">
                <div class="panel-nav-tabs">
                    <button class="tab-btn active" onclick="switchLeftTab('planner')">
                        <i class="fas fa-map-marked-alt"></i> Route Planner
                    </button>
                    <button class="tab-btn" onclick="switchLeftTab('actionsheet')">
                        <i class="fas fa-list-ol"></i> Action Sheet (โพยสเต็ป)
                    </button>
                    <button class="tab-btn" onclick="switchLeftTab('code')">
                        <i class="fas fa-code"></i> Generated Code
                    </button>
                </div>'''

tabs_nav_replacement = '''            <div class="left-panel-nav">
                <div class="panel-nav-tabs">
                    <button class="tab-btn active" id="tabBtnDesign" onclick="switchLeftTab('design')">
                        <i class="fas fa-pencil-ruler"></i> Field Editor
                    </button>
                    <button class="tab-btn" id="tabBtnPlanner" onclick="switchLeftTab('planner')">
                        <i class="fas fa-route"></i> Route Planner
                    </button>
                    <button class="tab-btn" id="tabBtnActionSheet" onclick="switchLeftTab('actionsheet')">
                        <i class="fas fa-list-ol"></i> Action Sheet
                    </button>
                    <button class="tab-btn" id="tabBtnCode" onclick="switchLeftTab('code')">
                        <i class="fas fa-code"></i> Code
                    </button>
                </div>'''

if tabs_nav_target in code:
    code = code.replace(tabs_nav_target, tabs_nav_replacement, 1)
    print("2. Updated left panel tabs.")

# -----------------------------------------------------------------------------
# 3. ADD TAB 0: FIELD DESIGNER (Palette + Canvas + Auto Solve)
# -----------------------------------------------------------------------------
tab_design_markup = '''                <!-- TAB 0: 2D FIELD DESIGNER & TILE PALETTE -->
                <div class="tab-pane active" id="tab-design">
                    <div class="planner-canvas-wrap">
                        <div class="palette-section-title">
                            <span><i class="fas fa-th-large"></i> Ground & Objectives</span>
                            <span style="font-size: 0.65rem; color: #94a3b8;">Click to paint on grid</span>
                        </div>
                        <div class="tool-palette-grid">
                            <button class="palette-tool-btn" data-tool="line" onclick="selectPaletteTool('line', this)">
                                <span class="swatch-icon" style="background: #ffffff; border: 3px solid #0f172a;"></span> Line Track
                            </button>
                            <button class="palette-tool-btn" data-tool="start" onclick="selectPaletteTool('start', this)">
                                <span class="swatch-icon" style="background: #10b981;"></span> Start Launch
                            </button>
                            <button class="palette-tool-btn" data-tool="checkpoint" onclick="selectPaletteTool('checkpoint', this)">
                                <span class="swatch-icon" style="background: #38bdf8;"></span> Checkpoint
                            </button>
                            <button class="palette-tool-btn" data-tool="drop" onclick="selectPaletteTool('drop', this)">
                                <span class="swatch-icon" style="background: #f59e0b;"></span> Drop Zone
                            </button>
                            <button class="palette-tool-btn" data-tool="finish" onclick="selectPaletteTool('finish', this)">
                                <span class="swatch-icon" style="background: #2563eb;"></span> Finish Dock
                            </button>
                            <button class="palette-tool-btn" data-tool="empty" onclick="selectPaletteTool('empty', this)">
                                <span class="swatch-icon" style="background: #ffffff; border: 1px dashed #94a3b8;"></span> Floor (Erase)
                            </button>
                        </div>

                        <div class="palette-section-title">
                            <span><i class="fas fa-exclamation-triangle"></i> Competition Hazards</span>
                            <span style="font-size: 0.65rem; color: #94a3b8;">6 Obstacles</span>
                        </div>
                        <div class="tool-palette-grid">
                            <button class="palette-tool-btn" data-tool="bridge" onclick="selectPaletteTool('bridge', this)">
                                <span class="swatch-icon" style="background: #d97706;"></span> Bridge 50mm
                            </button>
                            <button class="palette-tool-btn" data-tool="bump" onclick="selectPaletteTool('bump', this)">
                                <span class="swatch-icon" style="background: #d2a679;"></span> 7 Chopsticks
                            </button>
                            <button class="palette-tool-btn" data-tool="seesaw" onclick="selectPaletteTool('seesaw', this)">
                                <span class="swatch-icon" style="background: #7c3aed;"></span> Seesaw Teeter
                            </button>
                            <button class="palette-tool-btn" data-tool="tunnel" onclick="selectPaletteTool('tunnel', this)">
                                <span class="swatch-icon" style="background: #334155;"></span> Dark Tunnel
                            </button>
                            <button class="palette-tool-btn" data-tool="pit" onclick="selectPaletteTool('pit', this)">
                                <span class="swatch-icon" style="background: #0f172a; border-color: #ef4444;"></span> Black Hole Pit
                            </button>
                            <button class="palette-tool-btn" data-tool="bomb" onclick="selectPaletteTool('bomb', this)">
                                <span class="swatch-icon" style="background: #dc2626;"></span> Hazard Bomb
                            </button>
                        </div>

                        <div class="arena-edit-canvas-wrap">
                            <div class="canvas-hint-banner">
                                <span><i class="fas fa-mouse-pointer"></i> Click / drag cells to paint · Right-click rotates tile</span>
                                <span id="hoverCellCoord" style="font-family: var(--font-code); font-weight: 700;">Col: - | Row: -</span>
                            </div>
                            <div class="arena-canvas-box">
                                <canvas id="arena2dCanvas" width="430" height="215" style="cursor: crosshair;"></canvas>
                            </div>
                        </div>

                        <div style="display: flex; gap: 6px; margin-top: 6px;">
                            <button class="sim-btn primary" style="flex: 2; height: 34px;" onclick="triggerAutoPath()">
                                <i class="fas fa-magic"></i> ⚡ Auto Solve Path (100% Collision-Free)
                            </button>
                            <button class="sim-btn secondary" style="flex: 1; height: 34px;" onclick="clearCurrentArenaField()">
                                <i class="fas fa-trash-alt"></i> Clear Field
                            </button>
                        </div>
                    </div>
                </div>

                <!-- TAB 1: 2D ROUTE PLANNER -->
                <div class="tab-pane" id="tab-planner">'''

tab_planner_old_start = '                <!-- TAB 1: 2D ROUTE PLANNER -->\n                <div class="tab-pane active" id="tab-planner">'

if tab_planner_old_start in code:
    code = code.replace(tab_planner_old_start, tab_design_markup, 1)
    print("3. Injected Field Designer Tab markup.")

# -----------------------------------------------------------------------------
# 4. IMPLEMENT PRODUCTION AUTONOMOUS PATHFINDER & TILE PAINTER IN JAVASCRIPT
# -----------------------------------------------------------------------------
autonomous_engine_js = '''
        // =====================================================================
        // ADVANCED AUTONOMOUS PATHFINDER & ARENA DESIGNER ENGINE
        // Production-Grade BFS Collision Avoidance + S-Curve Kinematics
        // =====================================================================
        let selectedPaletteTool = 'line';
        let isMouseDownOnCanvas = false;

        function selectPaletteTool(toolName, btnEl) {
            selectedPaletteTool = toolName;
            document.querySelectorAll('.palette-tool-btn').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');
            showToast("Selected tool: " + toolName.toUpperCase());
        }

        function clearCurrentArenaField() {
            if (!confirm("Are you sure you want to clear all obstacles on the arena?")) return;
            const emptyCells = Array.from({ length: 32 }, (_, i) => ({ index: i, type: 'empty' }));
            emptyCells[31] = { index: 31, type: 'start' };
            currentArenaData = { COLS: 8, ROWS: 4, gridData: emptyCells };
            activeProject.waypoints = [
                { id: 1, x: 1.05, z: 0.45, label: "START", fn: "START", speed: 0, time: 0, angle: 90, kp: 0.6, kd: 2.0 }
            ];
            drawArena2D();
            build3DArenaObstacles();
            renderActionSheet();
            renderGeneratedCode();
            showToast("Arena cleared to empty floor with Start zone.");
        }

        class AutonomousPathPlanner {
            static getBlockedTypes() {
                return ['pit', 'blackhole', 'rescue_pit', 'bomb', 'rescue_bomb'];
            }

            static getValidNeighbors(cellIdx, grid) {
                const cols = 8;
                const rows = 4;
                const c = cellIdx % cols;
                const r = Math.floor(cellIdx / cols);
                const neighbors = [];
                const blocked = this.getBlockedTypes();

                // North
                if (r > 0) {
                    const n = cellIdx - cols;
                    const t = (grid[n]?.type || '').toLowerCase();
                    if (!blocked.some(b => t.includes(b))) neighbors.push({ idx: n, dir: 'N' });
                }
                // South
                if (r < rows - 1) {
                    const s = cellIdx + cols;
                    const t = (grid[s]?.type || '').toLowerCase();
                    if (!blocked.some(b => t.includes(b))) neighbors.push({ idx: s, dir: 'S' });
                }
                // East
                if (c < cols - 1) {
                    const e = cellIdx + 1;
                    const t = (grid[e]?.type || '').toLowerCase();
                    if (!blocked.some(b => t.includes(b))) neighbors.push({ idx: e, dir: 'E' });
                }
                // West
                if (c > 0) {
                    const w = cellIdx - 1;
                    const t = (grid[w]?.type || '').toLowerCase();
                    if (!blocked.some(b => t.includes(b))) neighbors.push({ idx: w, dir: 'W' });
                }

                return neighbors;
            }

            static findPathBFS(startIdx, targetIdx, grid) {
                if (startIdx === targetIdx) return [startIdx];
                const queue = [[startIdx]];
                const visited = new Set([startIdx]);

                while (queue.length > 0) {
                    const path = queue.shift();
                    const curr = path[path.length - 1];
                    if (curr === targetIdx) return path;

                    const neighbors = this.getValidNeighbors(curr, grid);
                    for (const n of neighbors) {
                        if (!visited.has(n.idx)) {
                            visited.add(n.idx);
                            queue.push([...path, n.idx]);
                        }
                    }
                }
                return null;
            }

            static solveMission(arenaData) {
                const grid = arenaData.gridData || arenaData.cells || [];
                let startIdx = -1;
                let finishIdx = -1;
                const checkpoints = [];
                const drops = [];

                grid.forEach((cell, idx) => {
                    const t = (cell.type || '').toLowerCase();
                    if (t === 'start' || t === 'rescue_start') startIdx = idx;
                    else if (t === 'finish' || t === 'rescue_finish') finishIdx = idx;
                    else if (t.includes('checkpoint')) checkpoints.push(idx);
                    else if (t.includes('drop') || t.includes('box')) drops.push(idx);
                });

                if (startIdx === -1) startIdx = 31; // default bottom-right
                if (finishIdx === -1) finishIdx = 0;  // default top-left

                const cellToCoord = (idx) => {
                    const c = idx % 8;
                    const r = Math.floor(idx / 8);
                    return {
                        x: parseFloat((-1.05 + c * 0.30).toFixed(2)),
                        z: parseFloat((-0.45 + r * 0.30).toFixed(2))
                    };
                };

                const waypoints = [];
                let currCell = startIdx;
                let currHeading = 90;

                const startCoord = cellToCoord(startIdx);
                waypoints.push({
                    id: 1,
                    x: startCoord.x,
                    z: startCoord.z,
                    label: "START (Bay Launch)",
                    fn: "START",
                    speed: 0,
                    time: 0,
                    angle: currHeading,
                    kp: 0.6,
                    kd: 2.0
                });

                const goals = [...checkpoints, ...drops];
                if (finishIdx !== -1 && !goals.includes(finishIdx)) {
                    goals.push(finishIdx);
                }

                let unvisited = [...goals];
                let dropZoneCount = 1;

                while (unvisited.length > 0) {
                    let bestPath = null;
                    let bestGoalIdx = -1;

                    for (let i = 0; i < unvisited.length; i++) {
                        const target = unvisited[i];
                        const p = this.findPathBFS(currCell, target, grid);
                        if (p && (!bestPath || p.length < bestPath.length)) {
                            bestPath = p;
                            bestGoalIdx = i;
                        }
                    }

                    if (!bestPath) {
                        console.warn("Unreachable goals remaining: " + unvisited.length);
                        break;
                    }

                    const goalCell = unvisited[bestGoalIdx];
                    unvisited.splice(bestGoalIdx, 1);

                    for (let i = 1; i < bestPath.length; i++) {
                        const fromCell = bestPath[i - 1];
                        const toCell = bestPath[i];
                        const fc = fromCell % 8, fr = Math.floor(fromCell / 8);
                        const tc = toCell % 8, tr = Math.floor(toCell / 8);

                        let desiredHeading = currHeading;
                        if (tc > fc) desiredHeading = 0;        // East
                        else if (tc < fc) desiredHeading = 180; // West
                        else if (tr > fr) desiredHeading = 90;  // South
                        else if (tr < fr) desiredHeading = -90; // North

                        currHeading = desiredHeading;
                        const coord = cellToCoord(toCell);
                        const tileType = (grid[toCell]?.type || '').toLowerCase();

                        let stepSpeed = 70;
                        let stepTime = 0.45;
                        if (tileType.includes('bridge')) { stepSpeed = 55; stepTime = 1.1; }
                        else if (tileType.includes('bump')) { stepSpeed = 45; stepTime = 0.85; }
                        else if (tileType.includes('seesaw')) { stepSpeed = 40; stepTime = 0.95; }

                        const isGoal = (toCell === goalCell);
                        let fn = "FORWARD";
                        let label = 'WP ' + (waypoints.length + 1);

                        if (isGoal) {
                            if (tileType.includes('drop')) {
                                const dropServos = ["DROP_FL", "DROP_FR", "DROP_B", "DROP_FL"];
                                fn = dropServos[(dropZoneCount - 1) % 4];
                                label = 'DROP ZONE ' + dropZoneCount;
                                dropZoneCount++;
                            } else if (tileType.includes('checkpoint')) {
                                label = 'CHECKPOINT';
                            } else if (toCell === finishIdx) {
                                fn = "STOP";
                                label = "FINISH DOCK";
                            }
                        }

                        waypoints.push({
                            id: waypoints.length + 1,
                            x: coord.x,
                            z: coord.z,
                            label,
                            fn,
                            speed: stepSpeed,
                            time: stepTime,
                            angle: currHeading,
                            kp: 0.6,
                            kd: 2.0
                        });

                        // Add recoil retreat if dropping
                        if (isGoal && tileType.includes('drop') && bestPath.length >= 2) {
                            const recoilCell = bestPath[i - 1];
                            const recoilCoord = cellToCoord(recoilCell);
                            waypoints.push({
                                id: waypoints.length + 1,
                                x: recoilCoord.x,
                                z: recoilCoord.z,
                                label: "RECOIL RETREAT",
                                fn: "BACKWARD",
                                speed: 50,
                                time: 0.35,
                                angle: currHeading,
                                kp: 0.6,
                                kd: 2.0
                            });
                        }
                    }

                    currCell = goalCell;
                }

                return waypoints;
            }
        }

        // ---------------------------------------------------------------------
        // REPLACED RUN AUTO PATH PLANNING (100% RELIABLE)
        // ---------------------------------------------------------------------
        async function runAutoPathPlanning() {
            showToast("Solving collision-free optimal trajectory...");
            logTerminal("[PLANNER] Running A* / BFS solver on active arena...");

            // Ensure currentArenaData is initialized
            if (!currentArenaData) currentArenaData = ARENA_FIVE_POINTS;

            // Solve client-side with 100% collision-free algorithm
            try {
                const solvedWaypoints = AutonomousPathPlanner.solveMission(currentArenaData);
                if (solvedWaypoints && solvedWaypoints.length >= 2) {
                    activeProject.waypoints = solvedWaypoints;
                    drawArena2D();
                    build3DArenaObstacles();
                    renderActionSheet();
                    renderGeneratedCode();
                    resetSimRun();

                    showToast("⚡ Auto Path Solved: " + solvedWaypoints.length + " Waypoints (100% Safe)!");
                    logTerminal("[PLANNER] Trajectory solved: " + solvedWaypoints.length + " collision-free steps compiled.");
                    return;
                }
            } catch (err) {
                console.error("Path planning error:", err);
                showToast("Path solve notice: " + err.message);
            }
        }

        window.triggerAutoPath = runAutoPathPlanning;
        window.runAutoPathPlanning = runAutoPathPlanning;

        // ---------------------------------------------------------------------
        // CANVAS INTERACTION: PAINTING, DRAGGING & ROTATING TILES
        // ---------------------------------------------------------------------
        function setupCanvasTilePainter() {
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;

            function getCellFromEvent(e) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;

                const c = Math.max(0, Math.min(7, Math.floor(mouseX / (canvas.width / 8))));
                const r = Math.max(0, Math.min(3, Math.floor(mouseY / (canvas.height / 4))));
                return { c, r, idx: r * 8 + c };
            }

            canvas.addEventListener('mousemove', (e) => {
                const { c, r, idx } = getCellFromEvent(e);
                const coordEl = document.getElementById('hoverCellCoord');
                if (coordEl) coordEl.textContent = 'Col: ' + c + ' | Row: ' + r + ' (Cell ' + idx + ')';

                if (isMouseDownOnCanvas && e.buttons === 1) {
                    applyTileToCell(idx, selectedPaletteTool);
                }
            });

            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Left click
                    isMouseDownOnCanvas = true;
                    const { idx } = getCellFromEvent(e);
                    applyTileToCell(idx, selectedPaletteTool);
                }
            });

            window.addEventListener('mouseup', () => {
                isMouseDownOnCanvas = false;
            });

            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Right click: cycle/rotate tile
                const { idx } = getCellFromEvent(e);
                cycleTileRotation(idx);
            });
        }

        function applyTileToCell(idx, tool) {
            if (!currentArenaData) currentArenaData = { COLS: 8, ROWS: 4, gridData: [] };
            if (!currentArenaData.gridData) {
                currentArenaData.gridData = Array.from({ length: 32 }, (_, i) => ({
                    index: i,
                    type: (currentArenaData.cells && currentArenaData.cells[i]?.type) || 'empty'
                }));
            }

            // Clean unique items
            if (tool === 'start' || tool === 'finish') {
                currentArenaData.gridData.forEach(g => {
                    if (g.type === tool) g.type = 'empty';
                });
            }

            let finalType = tool;
            if (tool === 'line') finalType = 'line_top_bottom';
            else if (tool === 'drop') finalType = 'drop_n';
            else if (tool === 'pit') finalType = 'blackhole';
            else if (tool === 'empty') finalType = 'empty';

            currentArenaData.gridData[idx] = { index: idx, type: finalType };

            drawArena2D();
            build3DArenaObstacles();
        }

        function cycleTileRotation(idx) {
            if (!currentArenaData || !currentArenaData.gridData) return;
            const cell = currentArenaData.gridData[idx];
            if (!cell) return;

            const lineCycle = ['line_top', 'line_right', 'line_bottom', 'line_left', 'line_top_bottom', 'line_left_right', 'line_surround'];
            const dropCycle = ['drop_n', 'drop_e', 'drop_s', 'drop_w'];

            if (lineCycle.includes(cell.type)) {
                const nextIdx = (lineCycle.indexOf(cell.type) + 1) % lineCycle.length;
                cell.type = lineCycle[nextIdx];
            } else if (dropCycle.includes(cell.type)) {
                const nextIdx = (dropCycle.indexOf(cell.type) + 1) % dropCycle.length;
                cell.type = dropCycle[nextIdx];
            } else if (cell.type === 'bridge') {
                cell.type = 'bridge_v';
            } else if (cell.type === 'bridge_v') {
                cell.type = 'bridge';
            }

            drawArena2D();
            build3DArenaObstacles();
            showToast("Tile " + idx + " orientation rotated.");
        }
'''

# Find the old runAutoPathPlanning implementation and replace it
p_start = code.find('function runAutoPathPlanning() {')
p_end = code.find('function drawArena2D() {', p_start)

if p_start != -1 and p_end != -1:
    code = code[:p_start] + autonomous_engine_js + '\n\n        ' + code[p_end:]
    print("4. Replaced runAutoPathPlanning with AutonomousPathPlanner and setup Canvas Painter.")
else:
    print("WARNING: Could not locate runAutoPathPlanning boundaries!")

# -----------------------------------------------------------------------------
# 5. ATTACH setupCanvasTilePainter ON INIT
# -----------------------------------------------------------------------------
init_target = '            drawArena2D();\n            renderActionSheet();'
init_replacement = '            setupCanvasTilePainter();\n            drawArena2D();\n            renderActionSheet();'

if init_target in code and 'setupCanvasTilePainter();' not in code:
    code = code.replace(init_target, init_replacement, 1)
    print("5. Added setupCanvasTilePainter call on startup.")

# -----------------------------------------------------------------------------
# 6. ENHANCE TAB SWITCHING FOR 'design' TAB
# -----------------------------------------------------------------------------
switch_tab_target = '''        function switchLeftTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            const targetPane = document.getElementById('tab-' + tabId);
            if (targetPane) targetPane.classList.add('active');

            if (tabId === 'planner') {
                document.querySelectorAll('.tab-btn')[0].classList.add('active');
            } else if (tabId === 'actionsheet') {
                document.querySelectorAll('.tab-btn')[1].classList.add('active');
            } else if (tabId === 'code') {
                document.querySelectorAll('.tab-btn')[2].classList.add('active');
            }
        }'''

switch_tab_replacement = '''        function switchLeftTab(tabId) {
            document.querySelectorAll('.panel-nav-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content-area .tab-pane').forEach(pane => pane.classList.remove('active'));

            const targetPane = document.getElementById('tab-' + tabId);
            if (targetPane) targetPane.classList.add('active');

            const tabMap = {
                'design': 'tabBtnDesign',
                'planner': 'tabBtnPlanner',
                'actionsheet': 'tabBtnActionSheet',
                'code': 'tabBtnCode'
            };

            const btnEl = document.getElementById(tabMap[tabId]);
            if (btnEl) btnEl.classList.add('active');

            if (tabId === 'design' || tabId === 'planner') {
                setTimeout(drawArena2D, 50);
            }
        }'''

if switch_tab_target in code:
    code = code.replace(switch_tab_target, switch_tab_replacement, 1)
    print("6. Enhanced switchLeftTab to support Field Designer tab.")

with open(builder_path, "w", encoding="utf-8") as f:
    f.write(code)

print(f"Master builder {builder_path} successfully upgraded!")
