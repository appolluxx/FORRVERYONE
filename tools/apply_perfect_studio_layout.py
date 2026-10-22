import os
import re

ROOT_DIR = r"D:\Workspace\robot"
builder_path = os.path.join(ROOT_DIR, "build_rescue_sim_ide.js")

with open(builder_path, "r", encoding="utf-8") as f:
    code = f.read()

# -----------------------------------------------------------------------------
# 1. CSS POLISH (Impeccable Minimalist Precision: 8pt Grid, 1px Hairline, Tabular Nums)
# -----------------------------------------------------------------------------
css_update = '''
        /* -------------------------------------------------------------------------
           IMPECCABLE DESIGN SYSTEM: LINEAR/VERCEL PINNED STUDIO LAYOUT
           ------------------------------------------------------------------------- */
        :root {
            --mb-brand: #44abff;
            --mb-brand-deep: #0284c7;
            --mb-brand-light: #f0f9ff;
            --mb-bg: #0b0f19;
            --mb-panel: #ffffff;
            --mb-border: #e2e8f0;
            --mb-border-subtle: #f1f5f9;
            --mb-text: #0f172a;
            --mb-text-muted: #64748b;
            --font-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-code: "JetBrains Mono", "SF Mono", monospace;
            --radius-sm: 6px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
            --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }

        body {
            font-family: var(--font-ui);
            background: #090d16;
            color: var(--mb-text);
            margin: 0;
            padding: 0;
            overflow: hidden;
            height: 100vh;
            display: flex;
            flex-direction: column;
            -webkit-font-smoothing: antialiased;
        }

        .ide-workspace {
            flex: 1;
            display: grid;
            grid-template-columns: 480px 1fr;
            height: calc(100vh - 52px - 28px);
            overflow: hidden;
        }

        .workspace-left-panel {
            background: var(--mb-panel);
            border-right: 1px solid var(--mb-border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10;
        }

        .pinned-canvas-section {
            background: #ffffff;
            border-bottom: 1px solid var(--mb-border);
            padding: 10px 12px 12px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .canvas-hint-banner {
            font-size: 0.72rem;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 500;
        }

        .canvas-hint-banner b {
            color: #0f172a;
        }

        .canvas-box-outer {
            width: 456px;
            height: 228px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            margin: 0 auto;
        }

        #arena2dCanvas {
            display: block;
            width: 456px;
            height: 228px;
            cursor: crosshair;
        }

        .left-panel-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border);
            padding: 0 8px;
            height: 42px;
            flex-shrink: 0;
        }

        .panel-nav-tabs {
            display: flex;
            gap: 2px;
        }

        .tab-btn {
            background: transparent;
            border: none;
            padding: 8px 12px;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--mb-text-muted);
            border-bottom: 2px solid transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .tab-btn:hover {
            color: var(--mb-text);
        }

        .tab-btn.active {
            color: var(--mb-brand-deep);
            border-bottom-color: var(--mb-brand-deep);
            font-weight: 700;
        }

        .tab-content-area {
            flex: 1;
            overflow-y: auto;
            position: relative;
            background: #ffffff;
        }

        .tab-pane {
            display: none;
            height: 100%;
            padding: 12px 14px;
            box-sizing: border-box;
        }

        .tab-pane.active {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        /* PALETTE TOOLS */
        .palette-group-title {
            font-size: 0.70rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 4px 0 6px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .palette-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-bottom: 8px;
        }

        .palette-btn {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 7px 10px;
            font-size: 0.74rem;
            font-weight: 600;
            color: #1e293b;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.12s ease;
            text-align: left;
        }

        .palette-btn:hover {
            background: #f8fafc;
            border-color: #94a3b8;
        }

        .palette-btn.active {
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
            border: 1px solid rgba(0, 0, 0, 0.12);
        }
'''

# Replace :root to ide-workspace styles
root_pos = code.find(':root {')
work_pos = code.find('/* LEFT PANEL: TACTICAL MISSION SUITE')
if root_pos != -1 and work_pos != -1:
    code = code[:root_pos] + css_update + '\n        ' + code[work_pos:]
    print("1. Replaced CSS with Impeccable Minimalist Precision tokens.")

# -----------------------------------------------------------------------------
# 2. RECONSTRUCT LEFT PANEL HTML: Pinned Canvas on Top + 4 Tabs Below
# -----------------------------------------------------------------------------
new_left_panel_html = '''        <!-- LEFT PANEL: TACTICAL MISSION SUITE & ARENA STUDIO -->
        <div class="workspace-left-panel">
            <!-- PINNED TOP: INTERACTIVE 2.4m x 1.2m TACTICAL ARENA GRID -->
            <div class="pinned-canvas-section">
                <div class="canvas-hint-banner">
                    <span><i class="fas fa-th"></i> <b>Tactical Arena Grid (2.4m × 1.2m)</b> · 32 Cells (300mm)</span>
                    <span id="hoverCellCoord" style="font-family: var(--font-code); font-weight: 700; color: #0284c7;">Col: - | Row: -</span>
                </div>
                <div class="canvas-box-outer">
                    <canvas id="arena2dCanvas" width="456" height="228"></canvas>
                </div>
            </div>

            <!-- TABS NAVIGATION -->
            <div class="left-panel-nav">
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
                </div>
                <div class="panel-tab-actions">
                    <span class="badge-pill blue" id="missionStatusBadge">ACTIVE: FIVE-POINT ROUTE</span>
                </div>
            </div>

            <div class="tab-content-area">
                <!-- TAB 0: ARENA DESIGNER PALETTE -->
                <div class="tab-pane active" id="tab-design">
                    <div class="palette-group-title">
                        <span><i class="fas fa-map-marker-alt"></i> Ground & Goals</span>
                        <span style="font-size: 0.65rem; color: #94a3b8;">Click canvas to paint · Right-click rotates</span>
                    </div>
                    <div class="palette-grid">
                        <button class="palette-btn active" data-tool="line" onclick="selectPaletteTool('line', this)">
                            <span class="swatch-icon" style="background: #ffffff; border: 3px solid #0f172a;"></span> Line Track
                        </button>
                        <button class="palette-btn" data-tool="start" onclick="selectPaletteTool('start', this)">
                            <span class="swatch-icon" style="background: #10b981;"></span> Start Launch
                        </button>
                        <button class="palette-btn" data-tool="checkpoint" onclick="selectPaletteTool('checkpoint', this)">
                            <span class="swatch-icon" style="background: #38bdf8;"></span> Checkpoint
                        </button>
                        <button class="palette-btn" data-tool="drop" onclick="selectPaletteTool('drop', this)">
                            <span class="swatch-icon" style="background: #f59e0b;"></span> Drop Zone
                        </button>
                        <button class="palette-btn" data-tool="finish" onclick="selectPaletteTool('finish', this)">
                            <span class="swatch-icon" style="background: #2563eb;"></span> Finish Dock
                        </button>
                        <button class="palette-btn" data-tool="empty" onclick="selectPaletteTool('empty', this)">
                            <span class="swatch-icon" style="background: #ffffff; border: 1px dashed #94a3b8;"></span> Floor (Erase)
                        </button>
                    </div>

                    <div class="palette-group-title">
                        <span><i class="fas fa-exclamation-triangle"></i> Competition Hazards</span>
                        <span style="font-size: 0.65rem; color: #94a3b8;">Physics raycast obstacles</span>
                    </div>
                    <div class="palette-grid">
                        <button class="palette-btn" data-tool="bridge" onclick="selectPaletteTool('bridge', this)">
                            <span class="swatch-icon" style="background: #d97706;"></span> Bridge 50mm
                        </button>
                        <button class="palette-btn" data-tool="bump" onclick="selectPaletteTool('bump', this)">
                            <span class="swatch-icon" style="background: #d2a679;"></span> 7 Chopsticks
                        </button>
                        <button class="palette-btn" data-tool="seesaw" onclick="selectPaletteTool('seesaw', this)">
                            <span class="swatch-icon" style="background: #7c3aed;"></span> Seesaw Teeter
                        </button>
                        <button class="palette-btn" data-tool="tunnel" onclick="selectPaletteTool('tunnel', this)">
                            <span class="swatch-icon" style="background: #334155;"></span> Dark Tunnel
                        </button>
                        <button class="palette-btn" data-tool="pit" onclick="selectPaletteTool('pit', this)">
                            <span class="swatch-icon" style="background: #0f172a; border-color: #ef4444;"></span> Black Hole Pit
                        </button>
                        <button class="palette-btn" data-tool="bomb" onclick="selectPaletteTool('bomb', this)">
                            <span class="swatch-icon" style="background: #dc2626;"></span> Hazard Bomb
                        </button>
                    </div>

                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="sim-btn primary" style="flex: 2; height: 36px; font-weight: 700;" onclick="triggerAutoPath()">
                            <i class="fas fa-magic"></i> ⚡ Auto Solve Path (100% Collision-Free)
                        </button>
                        <button class="sim-btn secondary" style="flex: 1; height: 36px;" onclick="clearCurrentArenaField()">
                            <i class="fas fa-trash-alt"></i> Clear Field
                        </button>
                    </div>
                </div>

                <!-- TAB 1: 2D ROUTE PLANNER & WAYPOINT TUNER -->
                <div class="tab-pane" id="tab-planner">
                    <div class="planner-actions-bar">
                        <button class="sim-btn primary" id="btnAutoPath" onclick="triggerAutoPath()">
                            <i class="fas fa-magic"></i> Auto Path (A*)
                        </button>
                        <button class="sim-btn secondary" id="btnAddWp" onclick="addNewWaypointCenter()">
                            <i class="fas fa-plus-circle"></i> Add Point
                        </button>
                        <button class="sim-btn secondary" id="btnUploadFieldPlan" onclick="triggerUploadArena()" title="Upload Field Layout (.json, .mby)">
                            <i class="fas fa-file-upload"></i> Upload
                        </button>
                        <button class="sim-btn secondary" id="btnExportFieldPlan" onclick="exportArenaJSON()" title="Export Field (.json)">
                            <i class="fas fa-file-download"></i> Export
                        </button>
                        <button class="sim-btn secondary" id="btnResetDefault" onclick="resetDefaultRoute()">
                            <i class="fas fa-undo"></i> Default
                        </button>
                        <button class="sim-btn danger" id="btnClearRoute" onclick="clearAllWaypoints()">
                            <i class="fas fa-trash"></i> Clear
                        </button>
                    </div>

                    <div id="routeValidationBox" class="route-validation-box">
                        <div class="val-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <span id="routeStatsSummary"><i class="fas fa-check-circle"></i> Route Valid: 5 Points | 100% Feasible</span>
                            <span id="routeFeasibilityBadge" class="badge-pill blue">EXECUTABLE TRAJECTORY</span>
                        </div>
                        <div id="routeValidationErrors" class="val-errors" style="display: none;"></div>
                    </div>

                    <div class="wp-editor-card" id="wpEditorCard">
                        <div class="wp-editor-header">
                            <span id="lblSelectedWp"><i class="fas fa-map-marker-alt"></i> Selected: Waypoint P1 (Start)</span>
                            <button class="sim-btn danger" style="padding: 2px 8px; font-size: 0.68rem;" id="btnDeletePoint" onclick="deleteSelectedWaypoint()">
                                <i class="fas fa-times"></i> Delete Point
                            </button>
                        </div>
                        <div class="wp-editor-grid">
                            <div class="wp-field">
                                <label>X (cm)</label>
                                <input type="number" id="inpWpX" step="1" onchange="updateSelectedWpField('x', this.value)">
                            </div>
                            <div class="wp-field">
                                <label>Z (cm)</label>
                                <input type="number" id="inpWpZ" step="1" onchange="updateSelectedWpField('z', this.value)">
                            </div>
                            <div class="wp-field">
                                <label>Heading (°)</label>
                                <input type="number" id="inpWpHeading" step="5" min="-180" max="180" onchange="updateSelectedWpField('heading', this.value)">
                            </div>
                            <div class="wp-field">
                                <label>Speed (%)</label>
                                <input type="number" id="inpWpSpeed" step="5" min="20" max="100" onchange="updateSelectedWpField('speed', this.value)">
                            </div>
                            <div class="wp-field span-4">
                                <label>Payload Action</label>
                                <select id="selWpAction" onchange="updateSelectedWpField('action', this.value)">
                                    <option value="">None (Continuous Cruise)</option>
                                    <option value="DROP_FL">DropFL (Front-Left Box 1)</option>
                                    <option value="DROP_FR">DropFR (Front-Right Box 2)</option>
                                    <option value="DROP_B">DropB (Rear Supply Box 3)</option>
                                    <option value="STOP">STOP (Mission Complete Dock)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: ACTION SHEET TABLE -->
                <div class="tab-pane" id="tab-actionsheet">
                    <div class="actionsheet-wrap">
                        <table class="action-table">
                            <thead>
                                <tr>
                                    <th style="width: 45px;">Step</th>
                                    <th>C++ Action Call</th>
                                    <th>Parameters</th>
                                    <th>Description / Target</th>
                                </tr>
                            </thead>
                            <tbody id="actionSheetRows">
                                <!-- Populated dynamically by renderActionSheet() -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- TAB 3: GENERATED CODE (C++ / MicroPython) -->
                <div class="tab-pane" id="tab-code">
                    <div class="code-view-wrap">
                        <div class="code-lang-selector">
                            <button class="lang-btn active" id="btnLangIno" onclick="switchCodeLang('ino')">Arduino C++ (.ino)</button>
                            <button class="lang-btn" id="btnLangSerial" onclick="switchCodeLang('serial')">Dynamic Serial</button>
                            <button class="lang-btn" id="btnLangPy" onclick="switchCodeLang('py')">MicroPython (.py)</button>
                            <span id="codeValBadge" class="code-val-badge" style="margin-left: 10px;">
                                <i class="fas fa-check-circle"></i> 100% FIRMWARE VERIFIED
                            </span>
                            <button class="hdr-btn" style="margin-left: auto; padding: 2px 8px; font-size: 0.68rem;" onclick="copyCurrentCode()">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <button class="hdr-btn" style="padding: 2px 8px; font-size: 0.68rem;" onclick="exportCurrentCode()">
                                <i class="fas fa-file-download"></i> Export
                            </button>
                        </div>
                        <pre class="code-area" id="codeDisplayArea">// Generating tactical code...</pre>
                    </div>
                </div>
            </div>

            <!-- Bottom Console / Serial Log -->
            <div class="terminal-drawer">
                <div class="terminal-header">
                    <span style="font-weight: 700; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-terminal"></i> Mission Control Console
                    </span>
                    <button style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 0.72rem;" onclick="clearTerminalLogs()">
                        <i class="fas fa-trash-alt"></i> Clear
                    </button>
                </div>
                <div class="terminal-logs" id="terminalLogs">
                    <div>[READY] roboBlocks IDE Tactical Mission Engine active.</div>
                    <div>[HARDWARE] PT Atom VX 4WD Skid-Steer profile locked.</div>
                </div>
            </div>
        </div>'''

# Replace left panel HTML
lp_start = code.find('<!-- LEFT PANEL: TACTICAL MISSION SUITE')
lp_end = code.find('<!-- RIGHT PANEL: 3D OFFICIAL SIMULATOR -->')

if lp_start != -1 and lp_end != -1:
    code = code[:lp_start] + new_left_panel_html + '\n\n        ' + code[lp_end:]
    print("2. Reconstructed left panel HTML with Pinned Canvas + Unified Tab Suite.")
else:
    print("WARNING: Could not locate left panel boundaries!")

with open(builder_path, "w", encoding="utf-8") as f:
    f.write(code)

print(f"Updated {builder_path} successfully!")
