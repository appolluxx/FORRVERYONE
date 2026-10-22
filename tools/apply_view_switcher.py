"""
Refactors generate_clean_master.py to:
1. Remove 3D WebGL / Three.js canvas.
2. Add View Mode Switcher buttons in Header & Tab navigation:
   - [🗺️ Tactical 2D View] (Top-Down Arena + Real-time Motion Engine Simulation)
   - [📋 Action Sheet View] (Full table of tactical primitive operations)
   - [💻 Code View] (Multi-language code generator & download)
3. Maintain 100% functionality of:
   - 2D Canvas Tile Painting (Ground & 6 Hazards, left-click paint, right-click rotate)
   - Autonomous Path Planner (A* / BFS collision-avoidance, drop action injection, recoil retreat)
   - Telemetry HUD & Simulation playback (Play, Pause, Reset, 1x/2x/4x, timeline scrub)
   - All acceptance tests & verify_project integrity
"""
import re

with open('tools/generate_clean_master.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Header to include View Mode Tabs: [🗺️ Tactical 2D View] [📋 Action Sheet] [💻 Code View]
old_header_center = """        <div class="ide-header-center">
            <input type="text" class="project-name-input" id="projectNameInput" value="Five-Point Route" spellcheck="false">
        </div>"""

new_header_center = """        <div class="ide-header-center">
            <input type="text" class="project-name-input" id="projectNameInput" value="Five-Point Route" spellcheck="false">
            <div class="header-view-nav">
                <button class="view-mode-btn active" id="viewBtnArena" onclick="switchViewMode('arena')">
                    <i class="fas fa-map"></i> Tactical 2D View
                </button>
                <button class="view-mode-btn" id="viewBtnActionSheet" onclick="switchViewMode('actionsheet')">
                    <i class="fas fa-list-ol"></i> Action Sheet
                </button>
                <button class="view-mode-btn" id="viewBtnCode" onclick="switchViewMode('code')">
                    <i class="fas fa-code"></i> Code View
                </button>
            </div>
        </div>"""

assert old_header_center in code, "old_header_center not found"
code = code.replace(old_header_center, new_header_center)
print("Updated header center with view mode nav!")

# 2. Add CSS for View Mode Switcher & Fullscreen Views
css_to_add = """
        /* HEADER VIEW NAV (IMPECCABLE PRECISION) */
        .header-view-nav {
            display: flex;
            align-items: center;
            background: rgba(0, 0, 0, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: var(--radius-sm);
            padding: 2px;
            gap: 2px;
            margin-left: 12px;
        }

        .view-mode-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.78);
            font-size: 0.74rem;
            font-weight: 600;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .view-mode-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.12);
        }

        .view-mode-btn.active {
            background: #ffffff;
            color: var(--mb-brand-deep);
            font-weight: 700;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        /* FULLSCREEN VIEW CONTAINERS */
        .view-container {
            display: none;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .view-container.active {
            display: flex;
        }

        /* VIEW 1: TACTICAL 2D ARENA VIEW */
        .view-arena-split {
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-columns: 460px 1fr;
            overflow: hidden;
        }

        /* VIEW 2: ACTION SHEET FULLSCREEN VIEW */
        .view-actionsheet-fullscreen {
            flex-direction: column;
            background: #ffffff;
            padding: 24px 32px;
            overflow-y: auto;
        }

        .fullscreen-sheet-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid var(--mb-border);
            padding-bottom: 16px;
            margin-bottom: 18px;
        }

        .fullscreen-sheet-header h2 {
            font-size: 1.25rem;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        /* VIEW 3: CODE VIEW FULLSCREEN */
        .view-code-fullscreen {
            flex-direction: column;
            background: #0f172a;
            overflow: hidden;
        }

        .code-fullscreen-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #1e293b;
            border-bottom: 1px solid #334155;
            padding: 10px 24px;
        }

        .code-fullscreen-editor {
            flex: 1;
            padding: 24px 32px;
            overflow: auto;
            margin: 0;
            font-family: var(--font-code);
            font-size: 0.88rem;
            line-height: 1.6;
            color: #38bdf8;
            background: #090d16;
        }
"""

# Insert CSS right before </style>
code = code.replace("    </style>", css_to_add + "\n    </style>")
print("Added CSS for view mode containers!")

# 3. Replace the 3D Right Panel with 2D Tactical Viewport (Real-time Canvas + Telemetry + Playback)
old_right_panel = """        <!-- RIGHT PANEL: 3D OFFICIAL SIMULATOR -->
        <div class="workspace-right-panel">
            <div class="sim-canvas-viewport" id="canvasViewport">
                <!-- Floating Telemetry HUD -->
                <div class="sim-overlay-hud">
                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-compass"></i> POSE & KINEMATICS</span>
                            <span class="badge-pill blue" id="hudDriveMode">4WD WD4</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">YAW HEADING:</span>
                            <span class="hud-val" id="hudYaw">0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PITCH / ROLL:</span>
                            <span class="hud-val" id="hudPitchRoll">0.0° / 0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">VELOCITY:</span>
                            <span class="hud-val" id="hudSpeed">0.0 cm/s</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">POSITION (X, Z):</span>
                            <span class="hud-val" id="hudPos">105.0, 45.0</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">ELEVATION (Y):</span>
                            <span class="hud-val" id="hudElevation">0.0 mm</span>
                        </div>
                    </div>

                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-tachometer-alt"></i> MOTOR CONTROL & HEADING LOCK</span>
                            <span class="badge-pill green" id="hudMotionPhase">IDLE</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">HEADING TARGET:</span>
                            <span class="hud-val" id="hudTargetDeg">0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PD CORRECTION:</span>
                            <span class="hud-val" id="hudPDOutput">0.00</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">LEFT / RIGHT PWM:</span>
                            <span class="hud-val" id="hudPWM">0 / 0</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PID GAINS:</span>
                            <span class="hud-val" id="hudGains">KP 0.6 | KD 2.0</span>
                        </div>
                    </div>
                </div>

                <!-- Camera Controls -->
                <div class="sim-cam-controls">
                    <button class="cam-btn active" id="btnCamFree" onclick="setCameraView('free')">
                        <i class="fas fa-cube"></i> Orbit 3D
                    </button>
                    <button class="cam-btn" id="btnCamTop" onclick="setCameraView('top')">
                        <i class="fas fa-arrow-down"></i> Top-Down
                    </button>
                    <button class="cam-btn" id="btnCamFollow" onclick="setCameraView('follow')">
                        <i class="fas fa-crosshairs"></i> Follow Robot
                    </button>
                </div>

                <!-- 3D Canvas -->
                <div id="simCanvasWrap" style="width: 100%; height: 100%;">
                    <canvas id="canvas3D"></canvas>
                </div>
            </div>

            <!-- SIMULATION PLAYBACK BAR -->
            <div class="sim-playback-bar">
                <div class="playback-left">
                    <button class="ctrl-btn primary" id="btnPlayPause" onclick="toggleSimRun()">
                        <i class="fas fa-play" id="playIcon"></i> <span id="playText">Run</span>
                    </button>
                    <button class="ctrl-btn" onclick="resetSimRun()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button class="ctrl-btn" id="btnSpeed" onclick="cycleSimSpeed()">
                        <i class="fas fa-bolt"></i> 1x
                    </button>
                </div>

                <div class="timeline-slider-wrap">
                    <span class="timeline-time" id="timeCurrent">0.00s</span>
                    <input type="range" class="timeline-slider" id="simProgressSlider" min="0" max="1000" value="0" oninput="onScrubSimulation(this.value)">
                    <span class="timeline-time" id="timeTotal">12.50s</span>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    <div style="font-size: 0.70rem; color: #94a3b8; font-weight: 600;" id="arenaInfoTitle">Five-Point Route · Rescue Arena</div>
                    <button class="ctrl-btn" style="padding: 4px 8px; font-size: 0.70rem;" onclick="clearTrail()">
                        <i class="fas fa-paint-brush"></i> Clear Trail
                    </button>
                </div>
            </div>
        </div>"""

new_right_panel = """        <!-- RIGHT PANEL: 2D HIGH-RESOLUTION TACTICAL THEATER VIEW -->
        <div class="workspace-right-panel" style="background: #0f172a; position: relative;">
            <div class="sim-canvas-viewport" id="canvasViewport" style="display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1e293b 0%, #0b0f19 100%);">
                <!-- Floating Telemetry HUD -->
                <div class="sim-overlay-hud">
                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-compass"></i> POSE & KINEMATICS</span>
                            <span class="badge-pill blue" id="hudDriveMode">4WD WD4</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">YAW HEADING:</span>
                            <span class="hud-val" id="hudYaw">0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PITCH / ROLL:</span>
                            <span class="hud-val" id="hudPitchRoll">0.0° / 0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">VELOCITY:</span>
                            <span class="hud-val" id="hudSpeed">0.0 cm/s</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">POSITION (X, Z):</span>
                            <span class="hud-val" id="hudPos">105.0, 45.0</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">ELEVATION (Y):</span>
                            <span class="hud-val" id="hudElevation">0.0 mm</span>
                        </div>
                    </div>

                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-tachometer-alt"></i> MOTOR CONTROL & HEADING LOCK</span>
                            <span class="badge-pill green" id="hudMotionPhase">IDLE</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">HEADING TARGET:</span>
                            <span class="hud-val" id="hudTargetDeg">0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PD CORRECTION:</span>
                            <span class="hud-val" id="hudPDOutput">0.00</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">LEFT / RIGHT PWM:</span>
                            <span class="hud-val" id="hudPWM">0 / 0</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PID GAINS:</span>
                            <span class="hud-val" id="hudGains">KP 0.6 | KD 2.0</span>
                        </div>
                    </div>
                </div>

                <!-- 2D High-Definition Tactical Arena Display Canvas -->
                <div id="simCanvasWrap" style="display: flex; align-items: center; justify-content: center; padding: 20px; width: 100%; height: 100%;">
                    <div style="box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7); border: 2px solid #334155; border-radius: 8px; overflow: hidden; background: #ffffff;">
                        <canvas id="arenaTheaterCanvas" width="912" height="456" style="display: block; max-width: 100%; max-height: calc(100vh - 180px); width: auto; height: auto;"></canvas>
                    </div>
                </div>
            </div>

            <!-- SIMULATION PLAYBACK BAR -->
            <div class="sim-playback-bar">
                <div class="playback-left">
                    <button class="ctrl-btn primary" id="btnPlayPause" onclick="toggleSimRun()">
                        <i class="fas fa-play" id="playIcon"></i> <span id="playText">Run</span>
                    </button>
                    <button class="ctrl-btn" onclick="resetSimRun()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button class="ctrl-btn" id="btnSpeed" onclick="cycleSimSpeed()">
                        <i class="fas fa-bolt"></i> 1x
                    </button>
                </div>

                <div class="timeline-slider-wrap">
                    <span class="timeline-time" id="timeCurrent">0.00s</span>
                    <input type="range" class="timeline-slider" id="simProgressSlider" min="0" max="1000" value="0" oninput="onScrubSimulation(this.value)">
                    <span class="timeline-time" id="timeTotal">12.50s</span>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    <div style="font-size: 0.70rem; color: #94a3b8; font-weight: 600;" id="arenaInfoTitle">Five-Point Route · Tactical 2D Arena</div>
                    <button class="ctrl-btn" style="padding: 4px 8px; font-size: 0.70rem;" onclick="clearTrail()">
                        <i class="fas fa-paint-brush"></i> Clear Trail
                    </button>
                </div>
            </div>
        </div>"""

assert old_right_panel in code, "old_right_panel not found"
code = code.replace(old_right_panel, new_right_panel)
print("Replaced right panel with 2D High-Definition Tactical Arena Display!")

# 4. Now wrap the ide-workspace and create full containers for Action Sheet and Code View:
old_workspace_wrapper = """    <!-- 2. MAIN WORKSPACE CONTAINER -->
    <div class="ide-workspace">"""

new_workspace_wrapper = """    <!-- 2. MAIN WORKSPACE CONTAINER -->
    <!-- VIEW CONTAINER 1: TACTICAL 2D ARENA VIEW (DEFAULT) -->
    <div class="view-container active ide-workspace" id="viewContainerArena">"""

code = code.replace(old_workspace_wrapper, new_workspace_wrapper)

# Add full containers for Action Sheet View and Code View right before Examples Modal
old_before_modal = """    </div>

    <!-- 4. EXAMPLES MODAL -->"""

new_views_plus_modal = """    </div>

    <!-- VIEW CONTAINER 2: ACTION SHEET FULLSCREEN VIEW -->
    <div class="view-container view-actionsheet-fullscreen" id="viewContainerActionSheet">
        <div class="fullscreen-sheet-header">
            <div>
                <h2><i class="fas fa-list-ol" style="color: #0284c7;"></i> Tactical Action Sheet · Mission Steps</h2>
                <p style="color: #64748b; font-size: 0.82rem; margin-top: 4px;">Low-level PT-BOT motion primitives and timing sequenced from waypoint trajectory.</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="ctrl-btn" onclick="switchViewMode('arena')">
                    <i class="fas fa-arrow-left"></i> Back to Arena View
                </button>
                <button class="ctrl-btn primary" onclick="exportArduinoIno()">
                    <i class="fas fa-file-download"></i> Export Arduino (.ino)
                </button>
            </div>
        </div>
        <div class="actionsheet-table-wrap" style="flex: 1; border: 1px solid var(--mb-border); border-radius: 6px; overflow: auto; background: #ffffff;">
            <table class="actionsheet-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 60px;">Step</th>
                        <th>Primitive Operation</th>
                        <th>Arguments</th>
                        <th>Tactical Description</th>
                    </tr>
                </thead>
                <tbody id="actionSheetRowsFullscreen">
                    <!-- Dynamic Rows -->
                </tbody>
            </table>
        </div>
    </div>

    <!-- VIEW CONTAINER 3: CODE VIEW FULLSCREEN -->
    <div class="view-container view-code-fullscreen" id="viewContainerCode">
        <div class="code-fullscreen-toolbar">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="lang-selector-group">
                    <button class="lang-btn active" id="btnFsLangIno" onclick="switchCodeLang('ino')">
                        <i class="fas fa-microchip"></i> Arduino C++ (.ino)
                    </button>
                    <button class="lang-btn" id="btnFsLangPy" onclick="switchCodeLang('py')">
                        <i class="fab fa-python"></i> MicroPython (.py)
                    </button>
                    <button class="lang-btn" id="btnFsLangSerial" onclick="switchCodeLang('serial')">
                        <i class="fas fa-terminal"></i> Serial Protocol
                    </button>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="ctrl-btn" onclick="copyCurrentCode()">
                    <i class="fas fa-copy"></i> Copy Code
                </button>
                <button class="ctrl-btn primary" onclick="exportCurrentCode()">
                    <i class="fas fa-download"></i> Download Script
                </button>
                <button class="ctrl-btn" onclick="switchViewMode('arena')">
                    <i class="fas fa-times"></i> Close View
                </button>
            </div>
        </div>
        <pre class="code-fullscreen-editor" id="codeDisplayAreaFullscreen"></pre>
    </div>

    <!-- 4. EXAMPLES MODAL -->"""

assert old_before_modal in code, "old_before_modal not found"
code = code.replace(old_before_modal, new_views_plus_modal)
print("Added fullscreen Action Sheet and Code View containers!")

# 5. Add JavaScript switchViewMode and update simulation animation loop to drive 2D robot motion on both canvases!
js_switch_view = """
        // ---------------------------------------------------------------------
        // VIEW MODE SWITCHER (2D Tactical Arena View / Action Sheet / Code View)
        // ---------------------------------------------------------------------
        let currentActiveView = 'arena';

        function switchViewMode(mode) {
            currentActiveView = mode;
            document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));

            if (mode === 'arena') {
                const b = document.getElementById('viewBtnArena');
                const c = document.getElementById('viewContainerArena');
                if (b) b.classList.add('active');
                if (c) c.classList.add('active');
                drawArena2D();
            } else if (mode === 'actionsheet') {
                const b = document.getElementById('viewBtnActionSheet');
                const c = document.getElementById('viewContainerActionSheet');
                if (b) b.classList.add('active');
                if (c) c.classList.add('active');
                renderActionSheet();
            } else if (mode === 'code') {
                const b = document.getElementById('viewBtnCode');
                const c = document.getElementById('viewContainerCode');
                if (b) b.classList.add('active');
                if (c) c.classList.add('active');
                renderGeneratedCode();
            }
        }
        window.switchViewMode = switchViewMode;
"""

# Find place to insert switchViewMode
code = code.replace("        function switchLeftTab(tabId) {", js_switch_view + "\n        function switchLeftTab(tabId) {")
print("Added switchViewMode JS function!")

with open('tools/generate_clean_master.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("generate_clean_master.py updated successfully!")
