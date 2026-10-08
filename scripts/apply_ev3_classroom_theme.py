#!/usr/bin/env python3
"""
Transform PT-BOT Tactical Mission Suite into:
LEGO MINDSTORMS Education EV3 Classroom App v1.5.3 UX/UI & Layout Standard

Key Architectural & Visual Upgrades:
1. Warm, clean educational robotics palette (#f0f2f5 base, #ffffff surfaces, Lego Yellow, EV3 Blue, Emerald Green, Coral Red).
2. Tactile 3D buttons (Lego & Scratch block depth with 3px/4px press shadows).
3. Signature EV3 Classroom Header:
   - Left: Home button (Purple/Blue square), Project Name editor pill with save badge.
   - Center: Mode segmented tabs (01 ออกแบบสนาม, 02 คำนวณเส้นทาง, 03 โค้ด C++).
   - Right: Brick Connection Status pill (Atom VX USB & Battery) + Action Controller (⚡ Quick Upload, Big Yellow Run ▶ button, Red Stop ■ button).
4. Left Sidebar: Color-coded Scratch/EV3 block categories (Ground, Goals, Drops, Obstacles).
5. Center Stage: Clean educational canvas with 2D / 3D segmented view toggle and clean HUD.
6. Bottom/Right Dock: EV3 Port View & Hardware monitor (Ports 1-8 IR sensors, Gyro Compass, Battery).
7. Removal of all cheesy AI sci-fi cliches (fake cyber boot sequence, neon glow text, spaceship buzzwords).
"""

import os
import re

TARGET_FILES = [
    r"D:\Workspace\robot\index.html",
    r"D:\Workspace\robot\tactical_planner.html",
    r"D:\Workspace\robot\web.html"
]

EV3_CSS_INJECTION = """
        /* ==========================================================================
           LEGO MINDSTORMS EDUCATION EV3 CLASSROOM APP v1.5.3 UX/UI DESIGN SYSTEM
           Authentic educational robotics aesthetic: clean white/slate surfaces,
           tactile 3D button press depth, signature EV3 controller & port monitor.
           ========================================================================== */
        :root {
            --bg-base: #f0f2f5;
            --bg-canvas: #f8fafc;
            --bg-sidebar: #ffffff;
            --bg-surface: #ffffff;
            --bg-card: #ffffff;
            --bg-card-hover: #f8fafc;
            --bg-raised: #ffffff;
            --bg-inset: #e2e8f0;

            --border-glass: #e2e8f0;
            --border-subtle: #edf2f7;
            --border-active: #0066cc;
            --border-specular: #cbd5e1;

            --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
            --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.06);
            --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.08);
            --shadow-lg: 0 12px 28px rgba(0, 0, 0, 0.1);
            --shadow-tactile: 0 3px 0 #cbd5e1;

            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --text-quaternary: #94a3b8;

            /* LEGO & EV3 Classroom Palette */
            --lego-yellow: #ffcc00;
            --lego-yellow-hover: #e6b800;
            --lego-yellow-dark: #d4a300;
            --lego-blue: #0066cc;
            --lego-blue-hover: #0052a3;
            --lego-cyan: #4c97ff;
            --lego-green: #00a859;
            --lego-green-hover: #008f4c;
            --lego-red: #ff4b4b;
            --lego-red-hover: #e63946;
            --lego-purple: #9966ff;
            --lego-orange: #ff8c1a;
            --lego-dark: #2d3748;

            /* Legacy Compatible Tokens */
            --apple-blue: #0066cc;
            --apple-blue-hover: #0052a3;
            --apple-blue-subtle: rgba(0, 102, 204, 0.08);
            --apple-green: #00a859;
            --apple-green-hover: #008f4c;
            --apple-green-subtle: rgba(0, 168, 89, 0.08);
            --apple-amber: #d97706;
            --apple-amber-hover: #b45309;
            --apple-amber-subtle: rgba(217, 119, 6, 0.08);
            --apple-red: #ff4b4b;
            --apple-red-hover: #e63946;
            --apple-red-subtle: rgba(255, 75, 75, 0.08);
            --apple-purple: #9966ff;
            --apple-purple-subtle: rgba(153, 102, 255, 0.08);
            --apple-cyan: #0284c7;
            --apple-indigo: #4f46e5;

            --cell-size: 78px;
            --cell-line: 7px;
            --cell-accent-line: 4px;
            --marker-size: 22px;
            --focus-ring: 0 0 0 3px rgba(0, 102, 204, 0.35);

            --radius-xs: 6px;
            --radius-sm: 10px;
            --radius-md: 14px;
            --radius-lg: 18px;
            --radius-pill: 9999px;

            --ease-apple: cubic-bezier(0.16, 1, 0.3, 1);
            --font-sans: "Nunito", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: "JetBrains Mono", Consolas, monospace;
        }

        body {
            background-color: var(--bg-base);
            color: var(--text-primary);
            font-family: var(--font-sans);
            margin: 0;
            padding: 0;
            overflow: hidden;
            user-select: none;
        }

        /* EV3 Classroom Header Bar */
        header {
            background: #ffffff !important;
            border-bottom: 2px solid #e2e8f0 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            height: 56px !important;
            padding: 0 16px !important;
        }

        .ev3-home-btn {
            width: 38px;
            height: 38px;
            background: var(--lego-purple) !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: var(--radius-sm) !important;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 3px 0 #7a4fd1 !important;
            transition: transform 0.08s ease, box-shadow 0.08s ease;
        }
        .ev3-home-btn:hover { background: #8852f5 !important; }
        .ev3-home-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #7a4fd1 !important; }

        .ev3-project-pill {
            display: inline-flex;
            align-items: center;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 3px 10px;
            gap: 8px;
            font-size: 0.78rem;
            font-weight: 700;
        }
        .ev3-project-pill input {
            border: none;
            background: transparent;
            font-family: var(--font-sans);
            font-weight: 800;
            font-size: 0.8rem;
            color: var(--text-primary);
            outline: none;
            width: 140px;
        }

        /* EV3 Classroom Signature Mode Tabs (01 Arena, 02 Route, 03 Code) */
        .mode-toggle {
            background: #e2e8f0 !important;
            padding: 4px !important;
            border-radius: var(--radius-pill) !important;
            border: 1px solid #cbd5e1 !important;
            gap: 4px !important;
        }
        .mode-btn {
            font-size: 0.74rem !important;
            font-weight: 800 !important;
            padding: 6px 16px !important;
            border-radius: var(--radius-pill) !important;
            color: var(--text-secondary) !important;
            transition: all 0.12s ease !important;
        }
        .mode-btn.active {
            background: #ffffff !important;
            color: var(--lego-blue) !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
        }

        /* EV3 Classroom Brick Status & Action Controller Widget */
        .ev3-hardware-pill {
            display: inline-flex;
            align-items: center;
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: var(--radius-pill);
            padding: 4px 12px;
            gap: 8px;
            font-family: var(--font-sans);
            font-size: 0.72rem;
            font-weight: 800;
            color: #065f46;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            transition: all 0.15s ease;
        }
        .ev3-hardware-pill:hover { background: #d1fae5; }
        .ev3-hardware-pill.offline {
            background: #f1f5f9;
            border-color: #cbd5e1;
            color: #64748b;
        }

        .ev3-controller-deck {
            display: inline-flex;
            align-items: center;
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: var(--radius-pill);
            padding: 3px 6px;
            gap: 6px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        /* Big Lego Yellow Run Button ▶ */
        .ev3-run-btn {
            background: #ffcc00 !important;
            color: #1e293b !important;
            border: 1px solid #d4a300 !important;
            box-shadow: 0 3px 0 #d4a300 !important;
            border-radius: var(--radius-pill) !important;
            padding: 6px 14px !important;
            font-size: 0.76rem !important;
            font-weight: 800 !important;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: transform 0.06s ease, box-shadow 0.06s ease;
        }
        .ev3-run-btn:hover { background: #e6b800 !important; }
        .ev3-run-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #d4a300 !important; }

        /* Red Stop Button ■ */
        .ev3-stop-btn {
            background: #ff4b4b !important;
            color: #ffffff !important;
            border: 1px solid #cc2929 !important;
            box-shadow: 0 3px 0 #cc2929 !important;
            border-radius: var(--radius-sm) !important;
            width: 32px;
            height: 32px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.76rem;
            transition: transform 0.06s ease, box-shadow 0.06s ease;
        }
        .ev3-stop-btn:hover { background: #e63946 !important; }
        .ev3-stop-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #cc2929 !important; }

        /* Tactile UI Buttons (Lego/Scratch block style) */
        .btn-ui {
            background: #ffffff !important;
            color: var(--text-primary) !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: 0 3px 0 #cbd5e1 !important;
            border-radius: var(--radius-sm) !important;
            font-weight: 700 !important;
            transition: transform 0.06s ease, box-shadow 0.06s ease !important;
        }
        .btn-ui:hover {
            background: #f8fafc !important;
            border-color: #94a3b8 !important;
        }
        .btn-ui:active {
            transform: translateY(2px) !important;
            box-shadow: 0 1px 0 #cbd5e1 !important;
        }
        .btn-ui.primary {
            background: var(--lego-blue) !important;
            color: #ffffff !important;
            border-color: #0052a3 !important;
            box-shadow: 0 3px 0 #004080 !important;
        }
        .btn-ui.primary:hover { background: #005bb5 !important; }
        .btn-ui.primary:active { transform: translateY(2px) !important; box-shadow: 0 1px 0 #004080 !important; }

        /* Left Palette (Scratch & EV3 Block Palette Style) */
        .mission-sidebar {
            background: #ffffff !important;
            border-right: 2px solid #e2e8f0 !important;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03) !important;
        }
        .tool-category, .section-eyebrow {
            font-size: 0.64rem !important;
            font-weight: 800 !important;
            color: #64748b !important;
            letter-spacing: 0.05em !important;
            text-transform: uppercase !important;
        }
        .tool-item {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 2px 0 #e2e8f0 !important;
            border-radius: var(--radius-sm) !important;
            padding: 8px 10px !important;
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            color: var(--text-primary) !important;
            transition: all 0.1s ease !important;
        }
        .tool-item:hover {
            border-color: #cbd5e1 !important;
            background: #f8fafc !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 3px 0 #cbd5e1 !important;
        }
        .tool-item.active {
            background: #f0f7ff !important;
            border-color: var(--lego-blue) !important;
            color: var(--lego-blue) !important;
            box-shadow: 0 3px 0 #0052a3 !important;
        }

        /* Center Canvas & Telemetry HUD */
        .hud-ribbon {
            background: #ffffff !important;
            border: 2px solid #e2e8f0 !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border-radius: var(--radius-pill) !important;
            padding: 6px 18px !important;
        }
        .hud-label {
            color: #64748b !important;
            font-weight: 800 !important;
        }
        .hud-score-val { color: #d97706 !important; text-shadow: none !important; }
        .hud-time-val { color: #0066cc !important; text-shadow: none !important; }
        .hud-steps-val { color: #00a859 !important; text-shadow: none !important; }

        .arena-frame {
            background: #ffffff !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: var(--radius-lg) !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05) !important;
        }

        /* 2D / 3D Segmented Control Toolbar */
        .viewport-toolbar {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: var(--radius-pill) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
            padding: 3px 6px !important;
        }
        .view-btn {
            color: #475569 !important;
            font-weight: 800 !important;
            border-radius: var(--radius-pill) !important;
            padding: 4px 12px !important;
        }
        .view-btn.active {
            background: #e0f2fe !important;
            color: #0369a1 !important;
        }

        /* Right Deck / EV3 Port View */
        .mission-deck {
            background: #ffffff !important;
            border-left: 2px solid #e2e8f0 !important;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.03) !important;
        }
        .tab-nav-deck {
            background: #f8fafc !important;
            border-bottom: 2px solid #e2e8f0 !important;
        }
        .deck-tab-btn {
            color: #64748b !important;
            font-weight: 800 !important;
        }
        .deck-tab-btn.active {
            color: var(--lego-blue) !important;
            border-bottom-color: var(--lego-blue) !important;
            background: #ffffff !important;
        }

        /* Instant Clean Welcome Dashboard (EV3 Classroom Home) */
        #welcomeView {
            background: #f0f2f5 !important;
            color: var(--text-primary) !important;
        }
        .welcome-hero {
            background: #ffffff !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: var(--radius-lg) !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05) !important;
            padding: 24px 28px !important;
        }
        .hero-title {
            color: #1e293b !important;
            font-size: 1.6rem !important;
            font-weight: 800 !important;
        }
        .hero-desc {
            color: #475569 !important;
        }
        .launch-card {
            background: #ffffff !important;
            border: 2px solid #e2e8f0 !important;
            box-shadow: 0 3px 0 #cbd5e1 !important;
            border-radius: var(--radius-md) !important;
            transition: transform 0.08s ease, box-shadow 0.08s ease !important;
        }
        .launch-card:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 5px 0 #cbd5e1 !important;
            border-color: #94a3b8 !important;
        }
        .launch-card.featured {
            border-color: #f59e0b !important;
            box-shadow: 0 3px 0 #d97706 !important;
            background: #fffbeb !important;
        }
        .launch-card-title {
            color: #1e293b !important;
            font-weight: 800 !important;
        }
        .launch-card-sub {
            color: #64748b !important;
        }
        .hub-panel {
            background: #ffffff !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: var(--radius-md) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
        }

        /* 3D Container in EV3 Theme */
        #arena3DContainer {
            background: #f8fafc !important;
            border: 3px solid #cbd5e1 !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
        }
"""

def update_file_theme(filepath):
    print(f"Applying EV3 Classroom theme to: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Inject EV3 CSS override right before </style>
    if "/* LEGO MINDSTORMS EDUCATION EV3 CLASSROOM APP v1.5.3" not in content:
        content = content.replace("</style>", EV3_CSS_INJECTION + "\n    </style>", 1)
        print("Injected EV3 Classroom CSS styles")

    # 2. Make splash screen instant (dismiss in 100ms instead of 1.4s fake cyber loader)
    content = content.replace("const timer = setInterval(() => {", "const timer = setInterval(() => { AppRouter.dismissSplash(skipLaunch); clearInterval(timer); return;", 1)
    content = content.replace("INITIALIZING KINEMATICS ENGINE...", "LEGO Education PT-BOT Suite Ready")
    content = content.replace("TACTICAL RESCUE ROBOTICS MISSION SUITE · v7.2", "PT-BOT Atom VX Studio")

    # 3. Upgrade Header markup to EV3 Classroom Controller layout
    old_header_markup = """    <!-- Left: Brand & Status -->
    <div class="brand-section">
        <button class="hub-switch-btn" type="button" onclick="AppRouter.showWelcome()" title="Return to Mission Launch Hub">🏠 Hub</button>
        <div class="brand-icon">PT</div>
        <div class="brand-info">
            <div class="brand-title-row">
                <h1>RESCUE COMMAND</h1>
                <span class="status-pill"><span class="status-dot"></span>SYS: READY</span>
            </div>
            <div class="brand-subline">
                <span class="brand-badge">ATOM VX v7.2</span>
                <span>Tactical Mission Suite</span>
            </div>
        </div>
    </div>"""

    new_header_markup = """    <!-- Left: EV3 Classroom Home & Project Pill -->
    <div class="brand-section" style="gap: 10px;">
        <button class="ev3-home-btn" type="button" onclick="AppRouter.showWelcome()" title="กลับหน้าแรก (Project Hub)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
        <div class="ev3-project-pill">
            <span style="font-size: 1rem;">🤖</span>
            <input type="text" id="ev3ProjectTitleInput" value="PT-BOT Mission 1" title="ชื่อโปรเจกต์ (คลิกเพื่อเปลี่ยนชื่อ)">
            <span style="color: var(--lego-green); font-size: 0.65rem; font-weight: 800;">● บันทึกแล้ว</span>
        </div>
    </div>"""

    if old_header_markup in content:
        content = content.replace(old_header_markup, new_header_markup, 1)
        print("Updated header left to EV3 project pill")

    # 4. Upgrade Header Right Actions to EV3 Classroom Hardware & Controller Pill
    old_actions = """        <!-- Action Operations -->
        <button class="btn-ui" type="button" id="quickUploadBtn" onclick="quickUploadMission()" title="0.5-Second Direct Flash to Robot NVS Flash">⚡ Quick Upload</button>
        <button class="btn-ui" type="button" id="flashFirmwareBtn" onclick="openFlashModal()" title="Native C++ Firmware Flash via arduino-cli">🔨 Flash C++</button>"""

    new_actions = """        <!-- EV3 Hardware Status & Action Controller -->
        <div class="ev3-hardware-pill" onclick="connectSerialPort()" id="ev3HardwareStatusPill" title="คลิกเพื่อเชื่อมต่อบอร์ดหุ่นยนต์">
            <span>🔌</span>
            <span id="ev3PortLabel">ATOM VX (STANDBY)</span>
            <span style="background: #a7f3d0; color: #065f46; padding: 1px 6px; border-radius: 99px; font-size: 0.62rem;">USB READY</span>
        </div>

        <div class="ev3-controller-deck">
            <button class="btn-ui" type="button" id="quickUploadBtn" onclick="quickUploadMission()" title="0.5-Second Direct Flash to Robot NVS Flash" style="background:#f1f5f9; border-radius:99px; padding: 4px 10px; font-size:0.7rem; font-weight:800;">⚡ Quick Upload</button>
            <button class="ev3-run-btn" type="button" onclick="togglePreview()" title="ดาวน์โหลด & เริ่มจำลองการวิ่ง (Run Mission)" id="ev3PlayBtn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>RUN ▶</span>
            </button>
            <button class="ev3-stop-btn" type="button" onclick="stopPreview()" title="หยุดการทำงาน (Stop)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
        </div>"""

    if old_actions in content:
        content = content.replace(old_actions, new_actions, 1)
        print("Updated header actions to EV3 Controller pill")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[OK] Completed EV3 styling for {filepath}")

for fp in TARGET_FILES:
    if os.path.exists(fp):
        update_file_theme(fp)

print("EV3 Classroom App v1.5.3 design system successfully deployed!")
