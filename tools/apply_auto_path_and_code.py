import re

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. ADD CSS FOR AUTO PATH & CODE
css_target = '.arena-canvas-box {'
css_replacement = '''.planner-actions-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 4px;
        }
        .route-validation-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: var(--radius-md);
            padding: 8px 12px;
            font-size: 0.73rem;
            color: #166534;
        }
        .route-validation-box.invalid {
            background: #fef2f2;
            border-color: #fecaca;
            color: #991b1b;
        }
        .val-errors {
            margin-top: 4px;
            font-size: 0.70rem;
            line-height: 1.4;
            color: #b91c1c;
        }
        .wp-editor-card {
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: var(--shadow-subtle);
        }
        .wp-editor-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 700;
            font-size: 0.75rem;
            color: #1e293b;
        }
        .wp-editor-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }
        .wp-field {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .wp-field label {
            font-size: 0.65rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
        }
        .wp-field input, .wp-field select {
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 4px 6px;
            font-size: 0.74rem;
            font-family: var(--font-code);
            background: #f8fafc;
        }
        .wp-field.span-2 {
            grid-column: span 2;
        }
        .wp-field.span-4 {
            grid-column: span 4;
        }
        .code-val-badge {
            font-size: 0.65rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: var(--radius-pill);
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(16, 185, 129, 0.15);
            color: #059669;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .code-val-badge.invalid {
            background: rgba(239, 68, 68, 0.15);
            color: #dc2626;
            border-color: rgba(239, 68, 68, 0.3);
        }
        .arena-canvas-box {'''

text = text.replace(css_target, css_replacement, 1)

# 2. UPDATE HTML IN TAB-PLANNER AND TAB-CODE
html_target_regex = r'<!-- TAB 1: 2D ROUTE PLANNER -->[\s\S]*?<!-- Bottom Console / Serial Log -->'
html_replacement = '''<!-- TAB 1: 2D ROUTE PLANNER -->
                <div class="tab-pane active" id="tab-planner">
                    <div class="planner-canvas-wrap">
                        <div class="planner-actions-bar">
                            <button class="sim-btn primary" id="btnAutoPath" onclick="triggerAutoPath()">
                                <i class="fas fa-magic"></i> Auto Path (A* Avoidance)
                            </button>
                            <button class="sim-btn secondary" id="btnAddWp" onclick="addNewWaypointCenter()">
                                <i class="fas fa-plus-circle"></i> Add Point
                            </button>
                            <button class="sim-btn secondary" id="btnRecalc" onclick="recalculateCurrentRoute()">
                                <i class="fas fa-sync-alt"></i> Recalc
                            </button>
                            <button class="sim-btn secondary" id="btnResetDefault" onclick="resetDefaultRoute()">
                                <i class="fas fa-undo"></i> Default
                            </button>
                            <button class="sim-btn danger" id="btnClearRoute" onclick="clearAllWaypoints()">
                                <i class="fas fa-trash"></i> Clear
                            </button>
                        </div>

                        <div class="arena-canvas-box">
                            <canvas id="arena2dCanvas" width="430" height="215"></canvas>
                        </div>

                        <div id="routeValidationBox" class="route-validation-box">
                            <div class="val-header" style="display: flex; justify-content: space-between; align-items: center;">
                                <span id="routeStatsSummary"><i class="fas fa-check-circle"></i> Route Valid: 5 Points | 180.0 cm | ~3.2s</span>
                                <span id="routeFeasibilityBadge" class="badge-pill blue">EXECUTABLE TRAJECTORY</span>
                            </div>
                            <div id="routeValidationErrors" class="val-errors" style="display: none;"></div>
                        </div>

                        <div class="wp-editor-card" id="wpEditorCard">
                            <div class="wp-editor-header">
                                <span id="lblSelectedWp"><i class="fas fa-map-marker-alt"></i> Selected: Waypoint P1 (Start)</span>
                                <button class="sim-btn danger" style="padding: 2px 8px; font-size: 0.68rem;" id="btnDeleteSelectedWp" onclick="deleteSelectedWaypoint()">
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
                                        <option value="">None (Continuous Waypoint)</option>
                                        <option value="DROP_FL">DropFL (Front-Left Box 1)</option>
                                        <option value="DROP_FR">DropFR (Front-Right Box 2)</option>
                                        <option value="DROP_B">DropB (Rear Box 3)</option>
                                        <option value="DROP_F">DropF (Dual Front Box 4)</option>
                                        <option value="SETFRONT">SetFront (Align Front Line)</option>
                                        <option value="SETBACK">SetBack (Align Rear Line)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="planner-info-card">
                            <div class="planner-info-title">
                                <i class="fas fa-info-circle" style="color: var(--mb-brand-deep);"></i>
                                <span id="arenaInfoTitle">Five-Point Route · Rescue Arena</span>
                            </div>
                            <p id="arenaInfoDesc" style="color: var(--mb-text-muted);">
                                32-Tile Grid (2.4m × 1.2m) with 50mm Elevated Bridge (15° incline/decline), 7 Bamboo Chopstick Bumps (reflectance 0.689), and 5 precision checkpoints.
                            </p>
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
                            <button class="lang-btn" id="btnLangSerial" onclick="switchCodeLang('serial')">Dynamic Serial (MissionRunner)</button>
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

            <!-- Bottom Console / Serial Log -->'''

text = re.sub(html_target_regex, html_replacement, text)

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated HTML & CSS in build_rescue_sim_ide.js successfully!")
