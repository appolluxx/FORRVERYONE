# Read the current index.html and backup
with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update PROFILES in Config to include MAX100 and ARC_CURVE modes
old_profiles = """    PROFILES: Object.freeze({
        FAST: Object.freeze({
            id: 'FAST',
            label: '🚀 High-Agility 88% PWM',
            toastLabel: 'Applied Agile Speed Profile (88% PWM)',
            speed: 88,
            baseTimerMs: 360,
            cruiseTimerMs: 200,
            bridgeTimerMs: 520,
            bumpTimerMs: 620,
            seesawTimerMs: 680,
            tunnelTimerMs: 200,
            recoilTimerMs: 160
        }),
        STEADY: Object.freeze({
            id: 'STEADY',
            label: '🛡️ Steady-Run 78% PWM',
            toastLabel: 'Applied Steady Run Profile (78% PWM)',
            speed: 78,
            baseTimerMs: 420,
            cruiseTimerMs: 240,
            bridgeTimerMs: 580,
            bumpTimerMs: 680,
            seesawTimerMs: 750,
            tunnelTimerMs: 240,
            recoilTimerMs: 180
        })
    }),"""

new_profiles = """    PROFILES: Object.freeze({
        NORMAL: Object.freeze({
            id: 'NORMAL',
            label: '🛡️ ปกติ (Normal 78% PWM)',
            toastLabel: 'เลือกโหมดการวิ่ง: วิ่งปกติ (Normal 78% PWM · คุมหัวไจโรแม่นยำ)',
            speed: 78,
            turnMode: 'SPIN_90',
            baseTimerMs: 420,
            cruiseTimerMs: 240,
            bridgeTimerMs: 580,
            bumpTimerMs: 680,
            seesawTimerMs: 750,
            tunnelTimerMs: 240,
            recoilTimerMs: 180,
            turnDurationMs: 260
        }),
        MAX100: Object.freeze({
            id: 'MAX100',
            label: '⚡ เร็วเต็มสปีด 100 (Max 100% PWM)',
            toastLabel: 'เลือกโหมดการวิ่ง: วิ่งเร็ว 100% PWM (Max Speed Sprint · ไจโร S-Curve เร่งเต็มข้อ)',
            speed: 100,
            turnMode: 'SPIN_90',
            baseTimerMs: 280,
            cruiseTimerMs: 150,
            bridgeTimerMs: 440,
            bumpTimerMs: 520,
            seesawTimerMs: 580,
            tunnelTimerMs: 150,
            recoilTimerMs: 140,
            turnDurationMs: 200
        }),
        ARC_CURVE: Object.freeze({
            id: 'ARC_CURVE',
            label: '🔄 เลี้ยวโค้งสมูท (Arc Turn · ไม่หยุดหมุน 90°)',
            toastLabel: 'เลือกโหมดการวิ่ง: เลี้ยวโค้ง Smooth Arc Turn (เลี้ยวโค้งลื่นไหล turnDegreeFront รัศมีกว้าง)',
            speed: 84,
            turnMode: 'ARC_CURVE',
            baseTimerMs: 380,
            cruiseTimerMs: 210,
            bridgeTimerMs: 540,
            bumpTimerMs: 640,
            seesawTimerMs: 700,
            tunnelTimerMs: 210,
            recoilTimerMs: 160,
            turnDurationMs: 180
        }),
        FAST: Object.freeze({
            id: 'FAST',
            label: '🚀 ไฮสปีด (Agile 88% PWM)',
            toastLabel: 'เลือกโหมดการวิ่ง: ไฮสปีด Agile (88% PWM)',
            speed: 88,
            turnMode: 'SPIN_90',
            baseTimerMs: 360,
            cruiseTimerMs: 200,
            bridgeTimerMs: 520,
            bumpTimerMs: 620,
            seesawTimerMs: 680,
            tunnelTimerMs: 200,
            recoilTimerMs: 160,
            turnDurationMs: 240
        })
    }),"""

assert old_profiles in content, "old_profiles not found"
content = content.replace(old_profiles, new_profiles)
print("Updated PROFILES in Config!")

# 2. Update HTML select options in header
old_select_html = """        <select id="speedProfileSelect" class="action-select" onchange="applySpeedProfile()" title="Motor PWM velocity profile">
            <option value="FAST">🚀 Fast · 88% PWM</option>
            <option value="STEADY">🛡️ Steady · 78% PWM</option>
        </select>"""

new_select_html = """        <select id="speedProfileSelect" class="action-select" onchange="applySpeedProfile()" title="รูปแบบการวิ่งและเลี้ยว (Motion & Turning Profile)">
            <option value="NORMAL">🛡️ วิ่งปกติ (Normal · 78% PWM)</option>
            <option value="MAX100">⚡ วิ่งเร็ว 100 (Max 100% PWM)</option>
            <option value="ARC_CURVE">🔄 เลี้ยวโค้งสมูท (Arc Curve · ไม่สะบัด 90°)</option>
            <option value="FAST">🚀 ไฮสปีด (Fast · 88% PWM)</option>
        </select>"""

assert old_select_html in content, "old_select_html not found"
content = content.replace(old_select_html, new_select_html)
print("Updated speedProfileSelect in HTML header!")

with open('apps/web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 1 complete.")
