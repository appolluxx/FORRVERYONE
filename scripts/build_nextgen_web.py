import re
import os
import shutil

SOURCE_HTML = r"D:\Workspace\robot\web.html"
BACKUP_HTML = r"D:\Workspace\robot\archives\web.html.v7.2.bak"

with open(SOURCE_HTML, "r", encoding="utf-8") as f:
    html = f.read()

# =============================================================================
# 1. NEW CSS STYLES
# =============================================================================
NEW_CSS = """
        /* ==========================================================================
           NEXT-GEN TACTICAL EXTENSIONS: 3D THEATER, WEBSERIAL & AUDIO HUD
           ========================================================================== */

        /* --- 3D ARENA THEATER STYLING --- */
        #arena3DContainer {
            display: none;
            position: relative;
            width: 720px;
            height: 380px;
            max-width: 100%;
            border-radius: var(--radius-lg);
            overflow: hidden;
            background: radial-gradient(circle at 50% 40%, #1e293b 0%, #0a0f1d 100%);
            border: 10px solid #1e293b;
            box-shadow: var(--shadow-pedestal), 0 0 0 1px var(--border-glass);
            user-select: none;
            transition: box-shadow 0.3s ease;
        }

        [data-theme="dark"] #arena3DContainer {
            background: radial-gradient(circle at 50% 40%, #151d2f 0%, #060910 100%);
            border-color: #0f172a;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        #canvas3D {
            width: 100%;
            height: 100%;
            display: block;
            cursor: grab;
        }

        #canvas3D:active {
            cursor: grabbing;
        }

        .theater-3d-hint {
            position: absolute;
            bottom: 10px;
            left: 12px;
            font-family: var(--font-mono);
            font-size: 0.62rem;
            color: #94a3b8;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            padding: 4px 9px;
            border-radius: var(--radius-xs);
            border: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .theater-3d-telemetry {
            position: absolute;
            top: 10px;
            right: 12px;
            font-family: var(--font-mono);
            font-size: 0.64rem;
            font-weight: 700;
            color: #38bdf8;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            padding: 4px 9px;
            border-radius: var(--radius-xs);
            border: 1px solid rgba(56, 189, 248, 0.25);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* --- MISSION SEQUENCER PHASE DECK (VISUAL BLOCKS) --- */
        .phase-deck {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            padding-bottom: 6px;
            margin-bottom: 12px;
            scrollbar-width: thin;
        }

        .phase-card {
            background: var(--glass-card);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            padding: 7px 10px;
            cursor: pointer;
            flex: 0 0 auto;
            min-width: 100px;
            transition: all 0.18s var(--ease-apple);
            display: flex;
            flex-direction: column;
            gap: 2px;
            user-select: none;
            box-shadow: var(--shadow-xs);
        }

        .phase-card:hover {
            background: var(--glass-card-hover);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
        }

        .phase-card.active {
            border-color: var(--apple-blue);
            background: var(--apple-blue-subtle);
            box-shadow: 0 0 0 1px var(--apple-blue), var(--shadow-sm);
        }

        .phase-card-title {
            font-family: var(--font-mono);
            font-size: 0.66rem;
            font-weight: 800;
            color: var(--text-primary);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .phase-card-pts {
            font-family: var(--font-mono);
            font-size: 0.6rem;
            font-weight: 700;
            color: var(--apple-green);
        }

        .phase-card-sub {
            font-size: 0.58rem;
            color: var(--text-muted);
            white-space: nowrap;
        }

        /* --- WEBSERIAL ROBOT LINK PANEL (TAB 3) --- */
        .serial-deck-card {
            background: var(--glass-card);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-md);
            padding: 12px;
            box-shadow: var(--shadow-xs);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .serial-conn-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .serial-status-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-family: var(--font-mono);
            font-size: 0.65rem;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: var(--radius-pill);
            background: var(--glass-inset);
            border: 1px solid var(--border-glass);
        }

        .serial-status-tag.connected {
            color: var(--apple-green);
            background: var(--apple-green-subtle);
            border-color: rgba(16, 185, 129, 0.3);
        }

        .serial-status-tag.disconnected {
            color: var(--text-muted);
        }

        /* Compass Visualizer */
        .compass-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
            background: var(--glass-inset);
            border-radius: var(--radius-sm);
            border: 1px solid var(--border-subtle);
        }

        .compass-dial-svg {
            width: 140px;
            height: 140px;
            overflow: visible;
        }

        .compass-needle {
            transition: transform 0.1s linear;
            transform-origin: 70px 70px;
        }

        .compass-heading-text {
            font-family: var(--font-mono);
            font-size: 1.15rem;
            font-weight: 800;
            color: var(--apple-amber);
            margin-top: 4px;
        }

        /* 8-Channel IR Line Sensor Visualizer */
        .sensor-bar-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 4px;
            align-items: flex-end;
            height: 64px;
            padding: 6px 4px 2px;
            background: var(--glass-inset);
            border-radius: var(--radius-sm);
            border: 1px solid var(--border-subtle);
        }

        .sensor-bar-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: flex-end;
            gap: 3px;
        }

        .sensor-fill-track {
            width: 100%;
            max-width: 18px;
            height: 44px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 3px;
            display: flex;
            align-items: flex-end;
            overflow: hidden;
            border: 1px solid var(--border-glass);
        }

        [data-theme="dark"] .sensor-fill-track {
            background: rgba(255, 255, 255, 0.05);
        }

        .sensor-fill-bar {
            width: 100%;
            background: linear-gradient(to top, var(--apple-blue), #38bdf8);
            border-radius: 2px;
            height: 20%;
            transition: height 0.08s ease, background 0.1s ease;
        }

        .sensor-fill-bar.line-active {
            background: linear-gradient(to top, #ea580c, var(--apple-amber));
        }

        .sensor-id-label {
            font-family: var(--font-mono);
            font-size: 0.58rem;
            font-weight: 700;
            color: var(--text-muted);
        }

        /* Diagnostics Action Buttons */
        .diag-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }

        .diag-btn {
            background: var(--glass-card);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-xs);
            color: var(--text-primary);
            font-family: var(--font-sans);
            font-size: 0.68rem;
            font-weight: 700;
            padding: 6px 8px;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }

        .diag-btn:hover {
            background: var(--glass-card-hover);
            border-color: var(--apple-blue);
            color: var(--apple-blue);
            transform: translateY(-1px);
        }

        .diag-btn:active {
            transform: scale(0.97);
        }

        .diag-btn.danger {
            color: var(--apple-red);
            border-color: rgba(239, 68, 68, 0.3);
        }

        .diag-btn.danger:hover {
            background: rgba(239, 68, 68, 0.1);
        }

        /* Serial Console Terminal */
        .serial-console-box {
            background: #0d1117;
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            padding: 8px;
            font-family: var(--font-mono);
            font-size: 0.66rem;
            color: #38bdf8;
            height: 140px;
            overflow-y: auto;
            scrollbar-width: thin;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .serial-input-row {
            display: flex;
            gap: 6px;
        }

        .serial-input-field {
            flex: 1;
            height: 28px;
            background: #0d1117;
            border: 1px solid var(--border-glass);
            color: #f8fafc;
            padding: 0 8px;
            font-family: var(--font-mono);
            font-size: 0.7rem;
            border-radius: var(--radius-xs);
            outline: none;
        }

        .serial-input-field:focus {
            border-color: var(--apple-blue);
        }
"""

# Inject CSS right before </style>
html = html.replace("</style>", NEW_CSS + "\n    </style>", 1)

# =============================================================================
# 2. HEADER UPDATES (SFX TOGGLE & WEBSERIAL BUTTON)
# =============================================================================
HEADER_INSERT = """
        <!-- Tactical Audio SFX -->
        <button class="icon-btn" type="button" id="sfxToggleBtn" onclick="toggleAudioFX()" title="Tactical Audio SFX [M]" aria-label="Toggle Sound Effects">
            <span id="sfxIcon">🔊</span>
        </button>

        <!-- WebSerial Hardware Link -->
        <button class="btn-ui" type="button" id="headerSerialBtn" onclick="toggleSerialConnection()" title="Connect to Robot via USB Serial">
            <span id="headerSerialDot" style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#94a3b8; margin-right:4px;"></span>
            <span id="headerSerialText">Connect Robot</span>
        </button>
"""

# Place right before <!-- Theme Toggle -->
html = html.replace('<!-- Theme Toggle -->', HEADER_INSERT + '\n        <!-- Theme Toggle -->', 1)

# =============================================================================
# 3. CENTER THEATER UPDATES (2D / 3D TOGGLE & 3D CANVAS)
# =============================================================================
VIEWPORT_TOOLBAR_REPLACE = """        <div class="viewport-toolbar" role="toolbar" aria-label="Arena Viewport Tools">
            <button class="view-btn active" type="button" id="viewMode2DBtn" onclick="setArenaViewMode('2D')" title="2D Orthographic Grid">2D Grid</button>
            <button class="view-btn" type="button" id="viewMode3DBtn" onclick="setArenaViewMode('3D')" title="3D Isometric Theater">3D Theater</button>
            <span id="sep3D" style="display:none; width: 1px; height: 14px; background: var(--border-glass); margin: 0 2px;"></span>
            <button class="view-btn" type="button" id="camPresetIsoBtn" onclick="set3DCameraPreset('iso')" title="Isometric Perspective" style="display:none;">Iso</button>
            <button class="view-btn" type="button" id="camPresetTopBtn" onclick="set3DCameraPreset('top')" title="Top-down 3D" style="display:none;">Top</button>
            <button class="view-btn" type="button" id="camFollowBtn" onclick="toggle3DCameraFollow()" title="Follow Robot" style="display:none;">Follow: Off</button>
            <span style="width: 1px; height: 14px; background: var(--border-glass); margin: 0 2px;"></span>
            <button class="view-btn" type="button" onclick="zoomIn()" title="Zoom In (+)">➕</button>
            <button class="view-btn" type="button" onclick="zoomReset()" id="zoomLabel" title="Reset Zoom">100%</button>
            <button class="view-btn" type="button" onclick="zoomOut()" title="Zoom Out (-)">➖</button>
            <span style="width: 1px; height: 14px; background: var(--border-glass); margin: 0 2px;"></span>
            <button class="view-btn" type="button" onclick="toggleRulers()" id="rulerToggleBtn" title="Toggle Rulers">Rulers</button>
        </div>"""

html = re.sub(r'<div class="viewport-toolbar".*?</div>', VIEWPORT_TOOLBAR_REPLACE, html, count=1, flags=re.DOTALL)

# Insert 3D Container inside .theater-body alongside .arena-frame
THEATER_3D_CONTAINER = """
                <!-- 3D ISOMETRIC ARENA THEATER -->
                <div id="arena3DContainer">
                    <canvas id="canvas3D" width="720" height="380"></canvas>
                    <div class="theater-3d-hint">
                        <span>🎮 Left-drag: Orbit · Right-drag: Pan · Wheel: Zoom</span>
                    </div>
                    <div class="theater-3d-telemetry" id="theater3DTelemetry">
                        <span>X: 0mm</span><span>|</span><span>Y: 0mm</span><span>|</span><span>Yaw: 0°</span>
                    </div>
                </div>
"""

html = html.replace('<div class="arena-frame">', THEATER_3D_CONTAINER + '                <div class="arena-frame">', 1)

# =============================================================================
# 4. RIGHT PANEL TAB DECK UPDATES (TAB 3 & MISSION SEQUENCER)
# =============================================================================
TAB_NAV_DECK_REPLACE = """        <div class="tab-nav-deck" role="tablist" aria-label="Right panel view selector">
            <button class="deck-tab-btn active" type="button" role="tab" id="deckTab1Btn" aria-selected="true" onclick="switchRightDeck('INSPECTOR')">🎯 Mission & Waypoints</button>
            <button class="deck-tab-btn" type="button" role="tab" id="deckTab2Btn" aria-selected="false" onclick="switchRightDeck('CODE')">⚡ Firmware Engine</button>
            <button class="deck-tab-btn" type="button" role="tab" id="deckTab3Btn" aria-selected="false" onclick="switchRightDeck('SERIAL')">🔌 Live Robot Link</button>
        </div>"""

html = re.sub(r'<div class="tab-nav-deck".*?</div>', TAB_NAV_DECK_REPLACE, html, count=1, flags=re.DOTALL)

# Insert Visual Mission Sequencer Deck before Waypoint Inspector in Tab 1
SEQUENCER_DECK = """
            <!-- VISUAL MISSION PHASE DECK (BLOCK SEQUENCER) -->
            <div class="section-eyebrow"><span>MISSION_CHAIN</span><span>VISUAL PHASES</span></div>
            <div class="phase-deck" id="missionPhaseDeck" role="tablist" aria-label="Mission phases"></div>
"""

html = html.replace('<section class="inspector-section" aria-labelledby="inspectorTitle">', '<section class="inspector-section" aria-labelledby="inspectorTitle">\n' + SEQUENCER_DECK, 1)

# Insert Tab 3 Content right after Tab 2
TAB_3_CONTENT = """
        <!-- TAB 3: LIVE WEBSERIAL ROBOT LINK & SENSOR TELEMETRY -->
        <div id="deckTabSerial" class="deck-tab-content" role="tabpanel" aria-labelledby="deckTab3Btn">
            <div class="section-eyebrow"><span>HARDWARE_LINK</span><span>WEBSERIAL ESP32</span></div>
            <h2 class="section-title">Robot Live Command</h2>

            <!-- Connection Deck -->
            <div class="serial-deck-card">
                <div class="serial-conn-row">
                    <span id="serialStatusPill" class="serial-status-tag disconnected">● DISCONNECTED</span>
                    <select id="serialBaudSelect" class="dim-input" style="width: 105px; height: 28px; font-size: 0.7rem;">
                        <option value="115200">115200 Baud</option>
                        <option value="57600">57600 Baud</option>
                        <option value="9600">9600 Baud</option>
                    </select>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-ui primary" type="button" style="flex: 1;" id="serialConnectBtn" onclick="toggleSerialConnection()">Connect USB Port</button>
                    <button class="btn-ui" type="button" style="font-size: 0.65rem;" onclick="toggleDemoMode()" id="demoModeBtn" title="Simulate telemetry without physical robot">Demo Feed</button>
                </div>
                <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-muted);">
                    <span>Port: <strong id="serialPortName" style="color: var(--text-primary);">-</strong></span>
                    <span>Battery: <strong id="serialBatteryVal" style="color: var(--apple-green);">11.8V (3S)</strong></span>
                </div>
            </div>

            <!-- Compass IMU Heading Dial -->
            <div class="serial-deck-card">
                <div class="section-eyebrow"><span>GYROSCOPE_IMU</span><span>MPU-9250 / ICM-20948</span></div>
                <div class="compass-box">
                    <svg class="compass-dial-svg" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="62" fill="none" stroke="var(--border-glass)" stroke-width="2"/>
                        <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="4,4"/>
                        <!-- Cardinal Labels -->
                        <text x="70" y="22" text-anchor="middle" font-family="var(--font-mono)" font-size="9" font-weight="800" fill="var(--apple-red)">N</text>
                        <text x="124" y="74" text-anchor="middle" font-family="var(--font-mono)" font-size="8" font-weight="700" fill="var(--text-muted)">E</text>
                        <text x="70" y="126" text-anchor="middle" font-family="var(--font-mono)" font-size="8" font-weight="700" fill="var(--text-muted)">S</text>
                        <text x="16" y="74" text-anchor="middle" font-family="var(--font-mono)" font-size="8" font-weight="700" fill="var(--text-muted)">W</text>
                        <!-- Compass Needle -->
                        <g id="compassNeedle" class="compass-needle">
                            <polygon points="70,25 75,70 65,70" fill="var(--apple-amber)"/>
                            <polygon points="70,115 75,70 65,70" fill="#64748b"/>
                            <circle cx="70" cy="70" r="4" fill="#ffffff" stroke="var(--apple-amber)" stroke-width="2"/>
                        </g>
                    </svg>
                    <div id="compassYawDisplay" class="compass-heading-text">0.0°</div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-ui" type="button" style="flex: 1; height: 26px; font-size: 0.65rem;" onclick="sendSerialCmd('TARE')">🎯 Zero / Tare Heading</button>
                    <button class="btn-ui" type="button" style="flex: 1; height: 26px; font-size: 0.65rem;" onclick="sendSerialCmd('CALIBRATE')">📊 Calibrate Gyro</button>
                </div>
            </div>

            <!-- 8-Channel IR Floor Sensor Array -->
            <div class="serial-deck-card">
                <div class="section-eyebrow"><span>IR_REFLECTANCE</span><span>8 CHANNELS</span></div>
                <div class="sensor-bar-grid">
                    <div class="sensor-bar-col"><div class="sensor-fill-track"><div id="irBar0" class="sensor-fill-bar" style="height: 15%;"></div></div><span class="sensor-id-label">S1</span></div>
                    <div class="sensor-bar-col"><div class="sensor-fill-track"><div id="irBar1" class="sensor-fill-bar" style="height: 18%;"></div></div><span class="sensor-id-label">S2</span></div>
                    <div class="sensor-bar-col"><div class="sensor-fill-track"><div id="irBar2" class="sensor-fill-bar line-active" style="height: 85%;"></div></div><span class="sensor-id-label">S3</span></div>
                    <div class="sensor-bar-col"><div class="sensor-fill-track"><div id="irBar3" class="sensor-fill-bar line-active" style="height: 90%;"></div></div><span class="sensor-id-label">S4</span></div>
                    <div class="sensor-bar-col"><div class="sensor-fill-track"><div id="irBar4" class="sensor-fill-bar line-active" style="height: 82%;"></div></div><span class="sensor-id-label">S5</span></div>
                    <div class="sensor-bar-col"><div class="sensor-fill-track"><div id="irBar5" class="sensor-fill-bar" style="height: 20%;"></div></div><span class="sensor-id-label">S6</span></div>
                    <div class="sensor-bar-col"><div class="sensor-fill-track"><div id="irBar6" class="sensor-fill-bar" style="height: 14%;"></div></div><span class="sensor-id-label">S7</span></div>
                    <div class="sensor-bar-col"><div class="sensor-fill-track"><div id="irBar7" class="sensor-fill-bar" style="height: 12%;"></div></div><span class="sensor-id-label">S8</span></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 0.62rem;">
                    <span style="color: var(--text-muted);">Threshold: &gt; 1500 (Black)</span>
                    <button class="btn-ui" type="button" style="height: 24px; font-size: 0.62rem; padding: 0 8px;" onclick="sendSerialCmd('CAL_LINE')">Calibrate Line</button>
                </div>
            </div>

            <!-- On-Site Diagnostic Actions -->
            <div class="serial-deck-card">
                <div class="section-eyebrow"><span>PHYSICAL_DIAGNOSTICS</span><span>FIELD TUNING</span></div>
                <div class="diag-grid">
                    <button class="diag-btn" type="button" onclick="sendSerialCmd('SPIN 90')">↻ Spin +90°</button>
                    <button class="diag-btn" type="button" onclick="sendSerialCmd('SPIN -90')">↺ Spin -90°</button>
                    <button class="diag-btn" type="button" onclick="sendSerialCmd('FF 88 360')">⬆ Cruise 1 Tile</button>
                    <button class="diag-btn" type="button" onclick="sendSerialCmd('SET_FRONT')">⬇ Align Line</button>
                    <button class="diag-btn" type="button" onclick="sendSerialCmd('DROP FL')">📦 Drop Front-L</button>
                    <button class="diag-btn" type="button" onclick="sendSerialCmd('DROP FR')">📦 Drop Front-R</button>
                    <button class="diag-btn" type="button" style="color: var(--apple-blue); border-color: rgba(0,113,227,0.3);" onclick="sendSerialCmd('START_MISSION')">⚡ Run Mission</button>
                    <button class="diag-btn danger" type="button" onclick="sendSerialCmd('STOP')">🚨 STOP MOTORS</button>
                </div>
            </div>

            <!-- Live Serial Monitor Log -->
            <div class="serial-deck-card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="section-eyebrow" style="margin: 0;"><span>SERIAL_TERMINAL</span><span>LOG</span></div>
                    <button class="btn-ui" type="button" style="height: 22px; font-size: 0.6rem; padding: 0 6px;" onclick="clearSerialLog()">Clear</button>
                </div>
                <div id="serialConsoleLog" class="serial-console-box">[SYSTEM] WebSerial Ready. Connect USB cable to ESP32 Atom VX.</div>
                <div class="serial-input-row">
                    <input type="text" id="serialInputField" class="serial-input-field" placeholder="Send command (e.g. FF 80 500)..." onkeydown="handleSerialInputKey(event)">
                    <button class="btn-ui primary" type="button" style="height: 28px; padding: 0 10px;" onclick="sendSerialInput()">Send</button>
                </div>
            </div>
        </div>
"""

html = html.replace('</div>\n    </aside>\n</main>', '</div>\n' + TAB_3_CONTENT + '    </aside>\n</main>', 1)

# =============================================================================
# 5. NEW JAVASCRIPT SERVICES (AudioFX, SerialRobotLink, Isometric3DTheater)
# =============================================================================
NEW_JS_SERVICES = """
// =============================================================================
// 1.5 TACTICAL WEB AUDIO SYNTHESIZER SERVICE (ZERO EXTERNAL ASSETS)
// =============================================================================
class AudioFX {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('ptbot_sfx') !== 'false';
    }

    _init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('ptbot_sfx', this.enabled ? 'true' : 'false');
        if (this.enabled) this.playTone(880, 'sine', 0.08, 0.1);
        return this.enabled;
    }

    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
        if (!this.enabled) return;
        try {
            this._init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playClick() { this.playTone(1200, 'triangle', 0.04, 0.08); }
    playStep() { this.playTone(600, 'sine', 0.05, 0.06); }
    playSolve() {
        if (!this.enabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.12, 0.12), idx * 65);
        });
    }
    playDrop() {
        if (!this.enabled) return;
        this.playTone(320, 'sawtooth', 0.15, 0.1);
        setTimeout(() => this.playTone(880, 'sine', 0.18, 0.14), 100);
    }
    playWin() {
        if (!this.enabled) return;
        const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        chord.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.35, 0.14), idx * 85);
        });
    }
    playSerial(connected) {
        if (!this.enabled) return;
        if (connected) {
            this.playTone(587.33, 'sine', 0.08, 0.1);
            setTimeout(() => this.playTone(880, 'sine', 0.12, 0.12), 90);
        } else {
            this.playTone(880, 'sine', 0.08, 0.1);
            setTimeout(() => this.playTone(440, 'sine', 0.12, 0.12), 90);
        }
    }
}
const audioFX = new AudioFX();

// =============================================================================
// 1.6 WEBSERIAL ROBOT HARDWARE LINK (DIRECT ESP32 COMMAND & TELEMETRY)
// =============================================================================
class SerialRobotLink {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.baudRate = 115200;
        this.rxBuffer = '';
        this.isDemoMode = false;
        this.demoTimer = null;
    }

    isSupported() {
        return ('serial' in navigator);
    }

    async connect(baud = 115200) {
        if (!this.isSupported()) {
            throw new Error('WebSerial not supported in this browser. Please use Chrome, Edge, or Opera.');
        }
        try {
            this.baudRate = baud;
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: this.baudRate });
            this.isConnected = true;
            this._startReadLoop();
            if (this.callbacks.onConnect) this.callbacks.onConnect(this.port);
            audioFX.playSerial(true);
            return true;
        } catch (err) {
            this.isConnected = false;
            throw err;
        }
    }

    async disconnect() {
        if (this.demoTimer) {
            clearInterval(this.demoTimer);
            this.demoTimer = null;
            this.isDemoMode = false;
        }
        if (this.reader) {
            try { await this.reader.cancel(); } catch (e) {}
            this.reader = null;
        }
        if (this.port) {
            try { await this.port.close(); } catch (e) {}
            this.port = null;
        }
        this.isConnected = false;
        if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
        audioFX.playSerial(false);
    }

    async _startReadLoop() {
        const textDecoder = new TextDecoderStream();
        this.port.readable.pipeTo(textDecoder.writable).catch(() => {});
        this.reader = textDecoder.readable.getReader();
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) this._handleChunk(value);
            }
        } catch (error) {
            console.warn('Serial read loop closed:', error);
        } finally {
            this.reader.releaseLock();
        }
    }

    _handleChunk(chunk) {
        this.rxBuffer += chunk;
        const lines = this.rxBuffer.split(/\\r?\\n/);
        this.rxBuffer = lines.pop();
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) this._parseLine(trimmed);
        }
    }

    _parseLine(line) {
        if (this.callbacks.onRawLine) this.callbacks.onRawLine(line);

        // YAW: 184.5 or [IMU] 184.5
        const yawMatch = line.match(/(?:YAW|GYRO|HEADING|IMU)[\\s:=]+([-\\d.]+)/i);
        if (yawMatch && this.callbacks.onYaw) {
            this.callbacks.onYaw(parseFloat(yawMatch[1]));
        }

        // IR line sensors: IR: 100,200,800,900,850,150,120,90
        const irMatch = line.match(/IR[\\s:=]+([\\d,\\s]+)/i);
        if (irMatch && this.callbacks.onIR) {
            const vals = irMatch[1].split(/[, ]+/).filter(Boolean).map(v => parseInt(v, 10));
            this.callbacks.onIR(vals);
        }

        // BAT: 11.8V
        const batMatch = line.match(/BAT[\\s:=]+([\\d.]+)V?/i);
        if (batMatch && this.callbacks.onBattery) {
            this.callbacks.onBattery(parseFloat(batMatch[1]));
        }
    }

    async sendLine(cmd) {
        const trimmed = (cmd || '').trim();
        if (!trimmed) return;
        if (this.isDemoMode) {
            if (this.callbacks.onRawLine) {
                this.callbacks.onRawLine(`[DEMO TX] > ${trimmed}`);
                setTimeout(() => this.callbacks.onRawLine(`[DEMO RX] OK: ${trimmed}`), 60);
            }
            return;
        }
        if (!this.isConnected || !this.port || !this.port.writable) {
            throw new Error('Robot is not connected');
        }
        const encoder = new TextEncoder();
        const writer = this.port.writable.getWriter();
        try {
            await writer.write(encoder.encode(trimmed + '\\n'));
            if (this.callbacks.onTx) this.callbacks.onTx(trimmed);
        } finally {
            writer.releaseLock();
        }
    }

    toggleDemo() {
        if (this.isDemoMode) {
            this.disconnect();
            return false;
        }
        this.isDemoMode = true;
        this.isConnected = true;
        let demoYaw = 0;
        this.demoTimer = setInterval(() => {
            demoYaw = (demoYaw + 2.5) % 360;
            if (this.callbacks.onYaw) this.callbacks.onYaw(demoYaw);
            // Simulate 8 IR sensors with black line in middle
            const ir = [
                120 + Math.floor(Math.random() * 40),
                150 + Math.floor(Math.random() * 50),
                2400 + Math.floor(Math.random() * 200),
                2600 + Math.floor(Math.random() * 150),
                2300 + Math.floor(Math.random() * 200),
                180 + Math.floor(Math.random() * 50),
                130 + Math.floor(Math.random() * 40),
                110 + Math.floor(Math.random() * 30)
            ];
            if (this.callbacks.onIR) this.callbacks.onIR(ir);
            if (this.callbacks.onBattery) this.callbacks.onBattery(11.84);
        }, 120);

        if (this.callbacks.onConnect) this.callbacks.onConnect({ demo: true });
        audioFX.playSerial(true);
        return true;
    }
}

// =============================================================================
// 1.7 HARDWARE-ACCELERATED 3D ISOMETRIC ARENA THEATER (PURE HTML5 CANVAS)
// =============================================================================
class Isometric3DTheater {
    constructor(canvas, gridManagerProvider) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.getGridManager = gridManagerProvider;

        // Camera State
        this.yaw = 45;      // Rotation around Z-axis (deg)
        this.pitch = 56;    // Tilt angle (deg)
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.followRobot = false;

        // Interactive drag
        this.isDragging = false;
        this.dragMode = 'orbit'; // 'orbit' or 'pan'
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Robot 3D Position & State
        this.robot = {
            active: false,
            x: 0,           // Arena mm
            y: 0,           // Arena mm
            z: 0,           // Elevation mm
            heading: 0,     // Deg (0 = North, 90 = East, 180 = South, 270 = West)
            wheelAngle: 0,  // Spin anim
            droppedCubes: []
        };

        // Seesaw physics state (cellIdx -> tiltAngle)
        this.seesawTilts = {};

        this._setupEvents();
    }

    _setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragMode = (e.button === 2 || e.shiftKey) ? 'pan' : 'orbit';
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            if (this.dragMode === 'orbit') {
                this.yaw = (this.yaw + dx * 0.45) % 360;
                this.pitch = Math.max(15, Math.min(85, this.pitch + dy * 0.4));
            } else {
                this.panX += dx;
                this.panY += dy;
            }
            this.render();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            this.zoom = Math.max(0.4, Math.min(2.8, this.zoom * delta));
            this.render();
        }, { passive: false });
    }

    setCameraPreset(preset) {
        if (preset === 'iso') {
            this.yaw = 45;
            this.pitch = 56;
            this.zoom = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.followRobot = false;
        } else if (preset === 'top') {
            this.yaw = 0;
            this.pitch = 84;
            this.zoom = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.followRobot = false;
        }
        this.render();
    }

    toggleFollow() {
        this.followRobot = !this.followRobot;
        this.render();
        return this.followRobot;
    }

    // Convert 3D Arena mm (X: 0..cols*300, Y: 0..rows*300, Z: 0..height) to 2D Screen Canvas Pixels
    project(x, y, z = 0) {
        const grid = this.getGridManager();
        const arenaW = (grid.cols || 8) * 300;
        const arenaH = (grid.rows || 4) * 300;

        // Centered coordinates
        let cx = x - arenaW / 2;
        let cy = y - arenaH / 2;
        let cz = z;

        if (this.followRobot && this.robot.active) {
            cx -= (this.robot.x - arenaW / 2);
            cy -= (this.robot.y - arenaH / 2);
        }

        // Yaw rotation around Z
        const radYaw = (this.yaw * Math.PI) / 180;
        const cosY = Math.cos(radYaw);
        const sinY = Math.sin(radYaw);
        const rx = cx * cosY - cy * sinY;
        const ry = cx * sinY + cy * cosY;

        // Pitch rotation around X
        const radPitch = (this.pitch * Math.PI) / 180;
        const cosP = Math.cos(radPitch);
        const sinP = Math.sin(radPitch);
        const px = rx;
        const py = ry * cosP - cz * sinP;
        const pz = ry * sinP + cz * cosP;

        // Orthographic/Isometric scale with Zoom
        const scale = 0.22 * this.zoom;
        const screenX = this.canvas.width / 2 + this.panX + px * scale;
        const screenY = this.canvas.height / 2 + this.panY + py * scale;

        return { x: screenX, y: screenY, depth: pz };
    }

    updateRobotPosition(xMm, yMm, headingDeg, moving = true) {
        this.robot.active = true;
        this.robot.x = xMm;
        this.robot.y = yMm;
        this.robot.heading = headingDeg;
        if (moving) this.robot.wheelAngle = (this.robot.wheelAngle + 18) % 360;

        // Check if robot is on Bridge or Seesaw to adjust height
        const grid = this.getGridManager();
        const col = Math.floor(xMm / 300);
        const row = Math.floor(yMm / 300);
        const cellIdx = row * grid.cols + col;
        const cell = grid.getCell(cellIdx);

        if (cell) {
            if (cell.type === 'bridge') {
                const subX = (xMm % 300) / 300;
                // Incline ramp up first 80mm, flat deck, ramp down last 80mm
                if (subX < 0.28) this.robot.z = (subX / 0.28) * 50;
                else if (subX > 0.72) this.robot.z = ((1 - subX) / 0.28) * 50;
                else this.robot.z = 50;
            } else if (cell.type === 'seesaw') {
                const subX = (xMm % 300) / 300;
                const tilt = (subX - 0.5) * 22; // -11 to +11 deg
                this.seesawTilts[cellIdx] = tilt;
                this.robot.z = 24 + (subX - 0.5) * 28;
            } else {
                this.robot.z = 0;
            }
        } else {
            this.robot.z = 0;
        }

        this.render();
    }

    dropCube(cellIdx) {
        const grid = this.getGridManager();
        const col = cellIdx % grid.cols;
        const row = Math.floor(cellIdx / grid.cols);
        this.robot.droppedCubes.push({
            x: col * 300 + 150,
            y: row * 300 + 150,
            z: 10,
            color: '#f59e0b'
        });
        audioFX.playDrop();
        this.render();
    }

    clearDroppedCubes() {
        this.robot.droppedCubes = [];
        this.seesawTilts = {};
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const grid = this.getGridManager();
        const cols = grid.cols || 8;
        const rows = grid.rows || 4;

        // 1. Draw 3D Wooden Pedestal Base
        this._drawPedestal(cols, rows);

        // 2. Draw 3D Grid Cells & Obstacles
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellIdx = r * cols + c;
                const cell = grid.getCell(cellIdx) || { type: 'empty' };
                this._drawCell3D(c, r, cell);
            }
        }

        // 3. Draw Dropped Rescue Cubes
        for (const cube of this.robot.droppedCubes) {
            this._drawBox3D(cube.x - 20, cube.y - 20, 0, 40, 40, 35, '#f59e0b', '#d97706');
        }

        // 4. Draw 3D Robot
        if (this.robot.active) {
            this._drawRobot3D();
        }
    }

    _drawPedestal(cols, rows) {
        const ctx = this.ctx;
        const margin = 50;
        const x1 = -margin;
        const y1 = -margin;
        const x2 = cols * 300 + margin;
        const y2 = rows * 300 + margin;
        const depth = 35; // mm height of table

        // Bottom corners
        const p1b = this.project(x1, y1, -depth);
        const p2b = this.project(x2, y1, -depth);
        const p3b = this.project(x2, y2, -depth);
        const p4b = this.project(x1, y2, -depth);

        // Top corners
        const p1t = this.project(x1, y1, 0);
        const p2t = this.project(x2, y1, 0);
        const p3t = this.project(x2, y2, 0);
        const p4t = this.project(x1, y2, 0);

        // Side skirts
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(p4t.x, p4t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p3b.x, p3b.y);
        ctx.lineTo(p4b.x, p4b.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(p2t.x, p2t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p3b.x, p3b.y);
        ctx.lineTo(p2b.x, p2b.y);
        ctx.closePath();
        ctx.fill();

        // Top Surface (Acrylic White Frame)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(p1t.x, p1t.y);
        ctx.lineTo(p2t.x, p2t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p4t.x, p4t.y);
        ctx.closePath();
        ctx.fill();
    }

    _drawCell3D(col, row, cell) {
        const ctx = this.ctx;
        const x1 = col * 300;
        const y1 = row * 300;
        const x2 = x1 + 300;
        const y2 = y1 + 300;

        const p1 = this.project(x1, y1, 0);
        const p2 = this.project(x2, y1, 0);
        const p3 = this.project(x2, y2, 0);
        const p4 = this.project(x1, y2, 0);

        // Base Floor Tone
        let floorFill = '#f8fafc';
        if (cell.type === 'start') floorFill = '#dcfce7';
        else if (cell.type === 'finish') floorFill = '#fee2e2';
        else if (cell.type === 'checkpoint') floorFill = '#fef3c7';
        else if (cell.type === 'tunnel') floorFill = '#1e293b';
        else if (cell.type === 'blackhole') floorFill = '#020617';

        ctx.fillStyle = floorFill;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();

        // Cell thin divider lines
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 20mm Scaled Boundary Lines (Black Border Rules)
        const bw = 20; // 20mm
        if (cell.type.includes('line_top') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_w' || cell.type === 'drop_e') {
            this._drawThickLine3D(x1, y1, x2, y1, bw, '#000000');
        }
        if (cell.type.includes('line_bottom') || cell.type === 'line_surround' || cell.type === 'drop_s' || cell.type === 'drop_w' || cell.type === 'drop_e') {
            this._drawThickLine3D(x1, y2, x2, y2, bw, '#000000');
        }
        if (cell.type.includes('line_left') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_s' || cell.type === 'drop_w') {
            this._drawThickLine3D(x1, y1, x1, y2, bw, '#000000');
        }
        if (cell.type.includes('line_right') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_s' || cell.type === 'drop_e') {
            this._drawThickLine3D(x2, y1, x2, y2, bw, '#000000');
        }

        // Special 3D Features
        if (cell.type === 'bridge') {
            this._drawBridge3D(x1, y1);
        } else if (cell.type === 'seesaw') {
            const cellIdx = row * (this.getGridManager().cols || 8) + col;
            this._drawSeesaw3D(x1, y1, this.seesawTilts[cellIdx] || 0);
        } else if (cell.type === 'bump') {
            this._drawBumps3D(x1, y1);
        } else if (cell.type === 'tunnel') {
            this._drawTunnel3D(x1, y1);
        } else if (cell.type.startsWith('drop_')) {
            this._drawDropBay3D(x1, y1, cell.type);
        } else if (cell.type === 'start') {
            this._drawStartPlatform3D(x1, y1);
        } else if (cell.type === 'finish') {
            this._drawFinishPlatform3D(x1, y1);
        } else if (cell.type === 'checkpoint') {
            this._drawCheckpoint3D(x1, y1);
        } else if (cell.type === 'bomb') {
            this._drawBomb3D(x1, y1);
        }
    }

    _drawThickLine3D(x1, y1, x2, y2, widthMm, color) {
        const p1 = this.project(x1, y1, 0.5);
        const p2 = this.project(x2, y2, 0.5);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = Math.max(2, widthMm * 0.22 * this.zoom);
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
    }

    _drawBridge3D(x1, y1) {
        // 50mm elevation ramp
        const rampW = 80;
        const bridgeH = 45;
        // Incline ramp
        this._drawRamp3D(x1, y1, rampW, 300, 0, bridgeH, '#2563eb', '#1d4ed8');
        // Flat deck
        this._drawBox3D(x1 + rampW, y1, 0, 140, 300, bridgeH, '#3b82f6', '#1e40af');
        // Decline ramp
        this._drawRamp3D(x1 + 220, y1, rampW, 300, bridgeH, 0, '#2563eb', '#1d4ed8');
    }

    _drawSeesaw3D(x1, y1, tiltAngle) {
        // Fulcrum triangular prism in center
        const cx = x1 + 150;
        const cy = y1 + 150;
        this._drawBox3D(cx - 15, y1 + 20, 0, 30, 260, 22, '#475569', '#334155');
        // Tilting deck
        const rad = (tiltAngle * Math.PI) / 180;
        const zLeft = 22 - Math.sin(rad) * 130;
        const zRight = 22 + Math.sin(rad) * 130;

        const p1 = this.project(x1 + 10, y1 + 20, zLeft);
        const p2 = this.project(x1 + 290, y1 + 20, zRight);
        const p3 = this.project(x1 + 290, y1 + 280, zRight);
        const p4 = this.project(x1 + 10, y1 + 280, zLeft);

        this.ctx.fillStyle = '#eab308';
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.lineTo(p4.x, p4.y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#ca8a04';
        this.ctx.stroke();
    }

    _drawBumps3D(x1, y1) {
        // 7 wooden chopsticks bumps
        for (let i = 0; i < 7; i++) {
            const bx = x1 + 30 + i * 36;
            this._drawBox3D(bx, y1 + 15, 0, 8, 270, 6, '#ea580c', '#c2410c');
        }
    }

    _drawTunnel3D(x1, y1) {
        // 3D Arch canopy
        const h = 55;
        // Left pillar
        this._drawBox3D(x1 + 10, y1 + 10, 0, 25, 280, h, '#334155', '#1e293b');
        // Right pillar
        this._drawBox3D(x1 + 265, y1 + 10, 0, 25, 280, h, '#334155', '#1e293b');
        // Top roof
        this._drawBox3D(x1 + 10, y1 + 10, h, 280, 280, 8, '#475569', '#1e293b');
    }

    _drawDropBay3D(x1, y1, dropType) {
        // 3-sided walls
        const wallH = 25;
        const wallT = 15;
        if (dropType === 'drop_n') {
            this._drawBox3D(x1, y1, 0, 300, wallT, wallH, '#1e3a8a', '#172554');
            this._drawBox3D(x1, y1, 0, wallT, 300, wallH, '#1e3a8a', '#172554');
            this._drawBox3D(x1 + 300 - wallT, y1, 0, wallT, 300, wallH, '#1e3a8a', '#172554');
        } else if (dropType === 'drop_s') {
            this._drawBox3D(x1, y1 + 300 - wallT, 0, 300, wallT, wallH, '#1e3a8a', '#172554');
            this._drawBox3D(x1, y1, 0, wallT, 300, wallH, '#1e3a8a', '#172554');
            this._drawBox3D(x1 + 300 - wallT, y1, 0, wallT, 300, wallH, '#1e3a8a', '#172554');
        } else if (dropType === 'drop_e') {
            this._drawBox3D(x1, y1, 0, 300, wallT, wallH, '#1e3a8a', '#172554');
            this._drawBox3D(x1 + 300 - wallT, y1, 0, wallT, 300, wallH, '#1e3a8a', '#172554');
            this._drawBox3D(x1, y1 + 300 - wallT, 0, 300, wallT, wallH, '#1e3a8a', '#172554');
        } else {
            this._drawBox3D(x1, y1, 0, 300, wallT, wallH, '#1e3a8a', '#172554');
            this._drawBox3D(x1, y1, 0, wallT, 300, wallH, '#1e3a8a', '#172554');
            this._drawBox3D(x1, y1 + 300 - wallT, 0, 300, wallT, wallH, '#1e3a8a', '#172554');
        }
        // Glowing target zone
        const pt = this.project(x1 + 150, y1 + 150, 1);
        this.ctx.fillStyle = '#2563eb';
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 14 * this.zoom, 0, Math.PI * 2);
        this.ctx.fill();
    }

    _drawStartPlatform3D(x1, y1) {
        this._drawBox3D(x1 + 40, y1 + 40, 0, 220, 220, 6, '#10b981', '#059669');
    }

    _drawFinishPlatform3D(x1, y1) {
        this._drawBox3D(x1 + 40, y1 + 40, 0, 220, 220, 6, '#ef4444', '#dc2626');
    }

    _drawCheckpoint3D(x1, y1) {
        const pt = this.project(x1 + 150, y1 + 150, 2);
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 22 * this.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    _drawBomb3D(x1, y1) {
        const pt = this.project(x1 + 150, y1 + 150, 1);
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 18 * this.zoom, 0, Math.PI * 2);
        this.ctx.fill();
    }

    _drawBox3D(x, y, z, w, h, d, topColor, sideColor) {
        const ctx = this.ctx;
        const p1b = this.project(x, y, z);
        const p2b = this.project(x + w, y, z);
        const p3b = this.project(x + w, y + h, z);
        const p4b = this.project(x, y + h, z);

        const p1t = this.project(x, y, z + d);
        const p2t = this.project(x + w, y, z + d);
        const p3t = this.project(x + w, y + h, z + d);
        const p4t = this.project(x, y + h, z + d);

        // Sides
        ctx.fillStyle = sideColor;
        ctx.beginPath();
        ctx.moveTo(p4t.x, p4t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p3b.x, p3b.y);
        ctx.lineTo(p4b.x, p4b.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p2t.x, p2t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p3b.x, p3b.y);
        ctx.lineTo(p2b.x, p2b.y);
        ctx.closePath();
        ctx.fill();

        // Top
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(p1t.x, p1t.y);
        ctx.lineTo(p2t.x, p2t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p4t.x, p4t.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = sideColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    _drawRamp3D(x, y, w, h, z1, z2, topColor, sideColor) {
        const ctx = this.ctx;
        const p1 = this.project(x, y, z1);
        const p2 = this.project(x + w, y, z2);
        const p3 = this.project(x + w, y + h, z2);
        const p4 = this.project(x, y + h, z1);

        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = sideColor;
        ctx.stroke();
    }

    _drawRobot3D() {
        const ctx = this.ctx;
        const rx = this.robot.x;
        const ry = this.robot.y;
        const rz = this.robot.z;
        const headingRad = (this.robot.heading * Math.PI) / 180;

        // Robot footprint: 180mm x 180mm, height 40mm
        const half = 90;
        const h = 32;

        // Chassis 4 corners rotated by heading
        const cosH = Math.cos(headingRad);
        const sinH = Math.sin(headingRad);

        const corners = [
            { x: -half, y: -half },
            { x: half, y: -half },
            { x: half, y: half },
            { x: -half, y: half }
        ].map(pt => ({
            x: rx + pt.x * cosH - pt.y * sinH,
            y: ry + pt.x * sinH + pt.y * cosH
        }));

        const p1b = this.project(corners[0].x, corners[0].y, rz + 10);
        const p2b = this.project(corners[1].x, corners[1].y, rz + 10);
        const p3b = this.project(corners[2].x, corners[2].y, rz + 10);
        const p4b = this.project(corners[3].x, corners[3].y, rz + 10);

        const p1t = this.project(corners[0].x, corners[0].y, rz + 10 + h);
        const p2t = this.project(corners[1].x, corners[1].y, rz + 10 + h);
        const p3t = this.project(corners[2].x, corners[2].y, rz + 10 + h);
        const p4t = this.project(corners[3].x, corners[3].y, rz + 10 + h);

        // Chassis Sides
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(p4t.x, p4t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p3b.x, p3b.y);
        ctx.lineTo(p4b.x, p4b.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p2t.x, p2t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p3b.x, p3b.y);
        ctx.lineTo(p2b.x, p2b.y);
        ctx.closePath();
        ctx.fill();

        // Top Face (Atom VX Board)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(p1t.x, p1t.y);
        ctx.lineTo(p2t.x, p2t.y);
        ctx.lineTo(p3t.x, p3t.y);
        ctx.lineTo(p4t.x, p4t.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0071e3';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Front Direction Indicator Arrow (Orange Triangle)
        const frontCenter = {
            x: rx + 0 * cosH - (-half * 0.7) * sinH,
            y: ry + 0 * sinH + (-half * 0.7) * cosH
        };
        const ptArrow = this.project(frontCenter.x, frontCenter.y, rz + 10 + h + 2);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(ptArrow.x, ptArrow.y, 6 * this.zoom, 0, Math.PI * 2);
        ctx.fill();

        // 4 Wheels
        const wheelOffsets = [
            { x: -half - 8, y: -half + 25 },
            { x: half + 8, y: -half + 25 },
            { x: -half - 8, y: half - 25 },
            { x: half + 8, y: half - 25 }
        ];

        for (const wo of wheelOffsets) {
            const wx = rx + wo.x * cosH - wo.y * sinH;
            const wy = ry + wo.x * sinH + wo.y * cosH;
            const pw = this.project(wx, wy, rz + 10);
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.arc(pw.x, pw.y, 5 * this.zoom, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
"""

# Insert JS services right before class SimulationController
html = html.replace('class SimulationController {', NEW_JS_SERVICES + '\nclass SimulationController {', 1)

# Save to web.html
with open(SOURCE_HTML, "w", encoding="utf-8") as f:
    f.write(html)

print("Step 1 complete: Injected CSS, HTML components, and core services into web.html")
