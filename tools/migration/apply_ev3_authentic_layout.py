#!/usr/bin/env python3
"""
PT-BOT Tactical Mission Suite
EV3 Classroom App v1.5.3 Authentic Layout & UX/UI Upgrade
- Instant boot into Studio Workspace (zero fake splash screen or landing page)
- Authentic LEGO EV3 Classroom header, purple home button, brick status & action controller
- Clean Scratch/EV3 block category palette with Thai/English labels
- Direct obstacle tools: Chopsticks (H/V rotate), Corner Bomb (4 corners), Bridge 3-section (Up/High/Down), Seesaw, Tunnel
- Clean EV3 Port View with 8-channel IR sensor monitor & live Gyro Compass
"""

import os
import re

TARGET_FILES = [
    r"D:\Workspace\robot\apps\web\index.html",
    r"D:\Workspace\robot\apps\web\tactical_planner.html",
    r"D:\Workspace\robot\apps\web\web.html"
]

def transform_file(filepath):
    print(f"Applying EV3 Classroom layout to: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Hide splash screen and welcome screen by default, show studioView directly
    html = re.sub(
        r'<div id="splashScreen"[^>]*>',
        r'<div id="splashScreen" style="display: none !important;">',
        html
    )
    html = re.sub(
        r'<div id="welcomeView"[^>]*>',
        r'<div id="welcomeView" style="display: none;">',
        html
    )
    html = re.sub(
        r'<div id="studioView"[^>]*>',
        r'<div id="studioView" style="display: flex; flex-direction: column; width: 100%; height: 100vh;">',
        html
    )

    # 2. Update AppRouter.init() to launch directly into studioView with zero delay
    old_init = """    static init() {
        const skipLaunch = localStorage.getItem('ptbot_skip_welcome') === 'true';
        const checkbox = document.getElementById('welcomeStartupCheckbox');
        if (checkbox) checkbox.checked = !skipLaunch;

        // Auto-detect USB COM port on welcome screen
        AppRouter.detectHardwareStatus();

        // Splash Sequence (~1.4s)
        const splash = document.getElementById('splashScreen');
        const fill = document.getElementById('splashFill');
        const status = document.getElementById('splashStatus');

        if (splash && fill && status) {
            const steps = [
                { p: 25, msg: 'LEGO Education PT-BOT Suite Ready' },
                { p: 55, msg: 'SCANNING USB WEBSERIAL BUS...' },
                { p: 85, msg: 'LOADING BFS TACTICAL SOLVER & 3D ASSETS...' },
                { p: 100, msg: 'SYSTEM READY.' }
            ];
            let stepIdx = 0;

            const timer = setInterval(() => { AppRouter.dismissSplash(skipLaunch); clearInterval(timer); return;
                if (stepIdx < steps.length) {
                    const s = steps[stepIdx];
                    fill.style.width = `${s.p}%`;
                    status.textContent = s.msg;
                    stepIdx++;
                } else {
                    clearInterval(timer);
                    setTimeout(() => {
                        AppRouter.dismissSplash(skipLaunch);
                    }, 240);
                }
            }, 300);

            // Allow click or space to skip immediately
            splash.onclick = () => {
                clearInterval(timer);
                AppRouter.dismissSplash(skipLaunch);
            };

            const keyHandler = (e) => {
                if (e.code === 'Space' || e.key === 'Escape' || e.key === 'Enter') {
                    clearInterval(timer);
                    document.removeEventListener('keydown', keyHandler);
                    AppRouter.dismissSplash(skipLaunch);
                }
            };
            document.addEventListener('keydown', keyHandler, { once: true });
        } else {
            if (skipLaunch) {
                AppRouter.showStudio();
            } else {
                AppRouter.showWelcome();
            }
        }
    }"""

    new_init = """    static init() {
        // Immediate launch into EV3 Classroom Studio Workspace (Zero Delay!)
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        AppRouter.showStudio();
        AppRouter.detectHardwareStatus();
    }"""

    if old_init in html:
        html = html.replace(old_init, new_init)
    else:
        # Regex fallback for init
        html = re.sub(
            r'static init\(\)\s*\{[\s\S]*?AppRouter\.detectHardwareStatus\(\);[\s\S]*?\}\s*static dismissSplash',
            r'''static init() {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        AppRouter.showStudio();
        AppRouter.detectHardwareStatus();
    }

    static dismissSplash''',
            html
        )

    # 3. Update Left Tool Palette with friendly EV3 / Scratch categories and explicit obstacle controls
    old_tools = """            <div class="section-eyebrow" style="margin-top: 8px;"><span>PALETTE</span><span>TILES</span></div>
            <h2 class="section-title">Ground & Goals</h2>
            <div class="tool-grid">
                <button class="tool-item active" type="button" aria-pressed="true" onclick="setTool('empty', this)"><span class="swatch" style="background: #ffffff; border: 1px solid #cbd5e1;"></span>White floor</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('line', this)"><span class="swatch" style="background: #ffffff; border: 3px solid #0f172a;"></span>Line border</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('start', this)"><span class="swatch" style="background: var(--apple-green);"></span>Start zone</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('checkpoint', this)"><span class="swatch" style="background: var(--apple-amber);"></span>Checkpoint</button>
                <button class="tool-item" type="button" aria-label="Drop zone tool" title="Click an existing drop zone to rotate direction." aria-pressed="false" onclick="setTool('drop_n', this)"><span class="swatch" style="background: linear-gradient(to bottom, #2563eb 50%, #ffffff 50%); border: 1px solid #1e293b;"></span>Drop zone</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('finish', this)"><span class="swatch" style="background: var(--apple-red);"></span>Finish zone</button>
            </div>

            <div class="section-eyebrow" style="margin-top: 12px;"><span>HAZARDS</span><span>6 OBSTACLES</span></div>
            <h2 class="section-title">Field Obstacles</h2>
            <div class="tool-grid">
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('blackhole', this)"><span class="swatch" style="background: #090a0f;"></span>Black Hole</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('bump', this)"><span class="swatch" style="background: #ea580c;"></span>Speed Bumps</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('bridge', this)"><span class="swatch" style="background: #2563eb;"></span>Bridge</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('seesaw', this)"><span class="swatch" style="background: #ca8a04;"></span>Seesaw</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('tunnel', this)"><span class="swatch" style="background: #475569;"></span>Tunnel</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('bomb', this)"><span class="swatch" style="background: #ef4444;"></span>Bomb</button>
            </div>"""

    new_tools = """            <div class="section-eyebrow" style="margin-top: 8px;"><span>GROUND & GOALS</span><span>พื้นสนาม & เป้าหมาย</span></div>
            <h2 class="section-title">พื้นและจุดทำคะแนน</h2>
            <div class="tool-grid">
                <button class="tool-item active" type="button" aria-pressed="true" onclick="setTool('empty', this)"><span class="swatch" style="background: #ffffff; border: 1px solid #cbd5e1;"></span>⚪ พื้นขาว (White)</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('line', this)"><span class="swatch" style="background: #ffffff; border: 3px solid #0f172a;"></span>⬛ เส้นขอบดำ 20mm</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('start', this)"><span class="swatch" style="background: var(--apple-green);"></span>🚩 จุดปล่อยตัว (Start)</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('checkpoint', this)"><span class="swatch" style="background: var(--apple-amber);"></span>📍 เช็คพอยต์ (15 แต้ม)</button>
                <button class="tool-item" type="button" aria-label="Drop zone tool" title="คลิกซ้ำบนช่องสนามเพื่อหมุนทิศเหนือ/ใต้/ออก/ตก" aria-pressed="false" onclick="setTool('drop_n', this)"><span class="swatch" style="background: linear-gradient(to bottom, #2563eb 50%, #ffffff 50%); border: 1px solid #1e293b;"></span>📦 วางกล่อง (15 แต้ม ↻)</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('finish', this)"><span class="swatch" style="background: var(--apple-red);"></span>🏁 จุดสิ้นสุด (10 แต้ม)</button>
            </div>

            <div class="section-eyebrow" style="margin-top: 14px;"><span>OBSTACLES</span><span>สิ่งกีดขวางระดับกลาง</span></div>
            <h2 class="section-title">สิ่งกีดขวางการแข่งขัน</h2>
            <div class="tool-grid">
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('bump', this)" title="คลิกซ้ำบนช่องเพื่อหมุน แนวนอน ↔ หรือ แนวตั้ง ↕ (หุ่นยนต์ต้องเบารถ)"><span class="swatch" style="background: #ea580c;"></span>🥢 ตะเกียบ (Chopstick ↻)</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('bomb', this)" title="คลิกซ้ำบนช่องเพื่อเลือกลงมุมเส้นดำ 4 มุม (TL, TR, BR, BL)"><span class="swatch" style="background: #ef4444;"></span>💣 ระเบิดมุม (Bomb ↻)</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('bridge', this)" title="คลิกซ้ำบนช่องเพื่อเปลี่ยนเป็น: ทางขึ้น ↗ / ยกระดับ ═ / ทางลง ↘"><span class="swatch" style="background: #2563eb;"></span>🌉 สะพาน 3 ระดับ (Bridge ↻)</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('seesaw', this)" title="ไม้กระดก"><span class="swatch" style="background: #ca8a04;"></span>⚖️ ไม้กระดก (Seesaw)</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('tunnel', this)" title="อุโมงค์ลอด"><span class="swatch" style="background: #475569;"></span>🚇 อุโมงค์ (Tunnel)</button>
                <button class="tool-item" type="button" aria-pressed="false" onclick="setTool('blackhole', this)" title="หลุมดำ"><span class="swatch" style="background: #090a0f;"></span>🕳️ หลุมดำ (Void)</button>
            </div>"""

    if old_tools in html:
        html = html.replace(old_tools, new_tools)

    # 4. Update Header Labels to EV3 Classroom Friendly UI
    html = html.replace(
        'title="กลับหน้าแรก (Project Hub)"',
        'title="หน้าแรก EV3 Project Hub"'
    )
    html = html.replace(
        '<span style="color: var(--lego-green); font-size: 0.65rem; font-weight: 800;">● บันทึกแล้ว</span>',
        '<span style="color: #00a859; font-size: 0.72rem; font-weight: 800; background: #e6f9ee; padding: 2px 8px; border-radius: 9999px;">● บันทึกแล้ว</span>'
    )
    html = html.replace(
        '>01 · Field Design<',
        '>01 · ออกแบบสนาม (Field)<'
    )
    html = html.replace(
        '>02 · Plan Route<',
        '>02 · วางแผนเส้นทาง (Route)<'
    )
    html = html.replace(
        '>⚡ Auto Path<',
        '>⚡ คำนวณเส้นทาง (Auto Path)<'
    )
    html = html.replace(
        '>▶ Simulate<',
        '>▶ จำลองการวิ่ง (Simulate)<'
    )
    html = html.replace(
        '>⚡ Quick Upload<',
        '>⚡ อัปโหลดด่วน (Quick Upload)<'
    )
    html = html.replace(
        '>🔨 Flash C++<',
        '>🔨 แฟลชบอร์ด (Flash C++)<'
    )
    html = html.replace(
        '<span id="headerSerialText">Connect Robot</span>',
        '<span id="headerSerialText">เชื่อมต่อหุ่นยนต์ (Connect)</span>'
    )

    # 5. Update Right Deck Tab Headers
    html = html.replace(
        '>🎯 Mission & Waypoints<',
        '>🎯 ปรับแต่งเส้นทาง (Inspector)<'
    )
    html = html.replace(
        '>⚡ Firmware Engine<',
        '>⚡ โค้ด Arduino C++ (Code)<'
    )
    html = html.replace(
        '>🔌 Live Robot Link<',
        '>🔌 EV3 Port View & เซนเซอร์<'
    )

    # 6. Update Clear Buttons
    html = html.replace(
        '>Clear route<',
        '>ล้างเส้นทาง (Clear Route)<'
    )
    html = html.replace(
        '>Clear field<',
        '>ล้างสนามทั้งหมด (Clear Field)<'
    )

    # 7. Update 2D / 3D Buttons
    html = html.replace(
        '>2D Grid<',
        '>2D สนาม<'
    )
    html = html.replace(
        '>3D Theater<',
        '>3D เสมือนจริง<'
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"Successfully transformed: {filepath}")

if __name__ == "__main__":
    for p in TARGET_FILES:
        if os.path.exists(p):
            transform_file(p)
        else:
            print(f"File not found: {p}")
