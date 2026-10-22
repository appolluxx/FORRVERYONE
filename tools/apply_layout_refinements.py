with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Clean up duplicate buttons in Mode 2 (Route Guidance panel)
old_planner_info = """        <!-- Mode 2 Information & Rules -->
        <div id="plannerInfo" style="display:none;">
            <div class="section-eyebrow"><span>AUTONOMOUS</span><span>PLAYBOOK</span></div>
            <h2 class="section-title">Route Guidance</h2>
            <button class="btn-ui primary" type="button" style="width:100%; margin-bottom: 6px;" onclick="autoCalculateMission()">⚡ Auto Path Solver</button>
            <button class="btn-ui accent" type="button" style="width:100%; margin-bottom: 10px;" onclick="togglePreview()">▶ Simulate Route</button>
            <div class="tactical-guide-card">
                <b style="color: var(--apple-amber); font-family: var(--font-mono); font-size: 0.68rem;">[TACTICAL INVARIANTS]:</b><br>
                • In-place turn with <b>spinDegree(±90)</b> to avoid 20mm borders<br>
                • Smooth linear cruise with <b>TIME_FLAT(n)</b> profile<br>
                • Auto retreat <b>BB(...)</b> from drop zones without 180° turns<br>
                • 2 CP (30) + 4 Drops (60) + Finish (10) = <b>100 Max Points</b>
            </div>
        </div>"""

new_planner_info = """        <!-- Mode 2 Information & Rules -->
        <div id="plannerInfo" style="display:none;">
            <div class="section-eyebrow"><span>AUTONOMOUS</span><span>TACTICAL GUIDE</span></div>
            <h2 class="section-title">Route Configuration</h2>
            
            <div class="tactical-guide-card" style="margin-top: 6px;">
                <b style="color: var(--apple-amber); font-family: var(--font-mono); font-size: 0.68rem;">[TACTICAL SPECIFICATION]:</b><br>
                • <b>Auto Path & Motion</b>: กำหนดเส้นทางและเลือกโหมดการวิ่ง (ปกติ / สปีด 100 / เลี้ยวโค้งสมูท) ได้ที่แถบด้านบน<br>
                • <b>Waypoint Tuning</b>: ปรับแต่งความเร็ว PWM (0-100) และระยะเวลา Time (ms) ทีละจุดได้ที่แผงด้านขวา<br>
                • <b>Drop Zone Recoil</b>: ระบบจะถอยตรง <b>BB(...)</b> ออกจากซอยกล่องกู้ภัยอัตโนมัติ<br>
                • <b>Scoring</b>: 2 Checkpoints (30) + 4 Drops (60) + Finish (10) = <b>100 คะแนนเต็ม</b>
            </div>
        </div>"""

assert old_planner_info in text, "old_planner_info not found"
text = text.replace(old_planner_info, new_planner_info)
print("1. Removed duplicate Auto Path Solver and Simulate Route buttons in left panel!")

# 2. Add direct, convenient Action Buttons to Header (.ino download, JSON Export, Presets)
old_header_actions = """        <button class="btn-ui primary" type="button" onclick="autoCalculateMission()" title="Compute optimal smooth path [A]">⚡ Auto path</button>
        <button class="btn-ui accent" type="button" id="previewBtn" aria-pressed="false" onclick="togglePreview()" title="Simulate robot run [Space]">▶ Simulate</button>

        <!-- Actions Dropdown -->
        <div class="dropdown" id="actionsDropdown">
            <button class="icon-btn" type="button" onclick="toggleDropdown('actionsDropdown')" title="Project options" aria-label="Project actions">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            <div class="dropdown-menu">
                <button class="dropdown-item" type="button" onclick="loadSampleOfficialField(); closeAllDropdowns();">★ Load 100-Point Field</button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" type="button" onclick="saveProject(); closeAllDropdowns();">💾 Save Project</button>
                <button class="dropdown-item" type="button" onclick="exportMissionJSON(); closeAllDropdowns();">📤 Export JSON</button>
                <button class="dropdown-item" type="button" onclick="triggerImportJSON(); closeAllDropdowns();">📥 Import JSON</button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" type="button" onclick="openShortcutsModal(); closeAllDropdowns();">⌨ Shortcuts (?)</button>
            </div>
        </div>"""

new_header_actions = """        <button class="btn-ui primary" type="button" onclick="autoCalculateMission()" title="Compute optimal smooth path [A]">⚡ Auto path</button>
        <button class="btn-ui accent" type="button" id="previewBtn" aria-pressed="false" onclick="togglePreview()" title="Simulate robot run [Space]">▶ Simulate</button>
        <button class="btn-ui" type="button" onclick="downloadInoFile()" title="Download Arduino .ino sketch">💾 .ino</button>

        <!-- Actions Dropdown -->
        <div class="dropdown" id="actionsDropdown">
            <button class="icon-btn" type="button" onclick="toggleDropdown('actionsDropdown')" title="Project options & Presets" aria-label="Project actions">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            <div class="dropdown-menu">
                <div class="dropdown-header" style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); padding: 4px 12px; text-transform: uppercase;">สนามตัวอย่าง (Presets)</div>
                <button class="dropdown-item" type="button" onclick="loadSampleOfficialField(); closeAllDropdowns();">★ Load Official 100-Point Arena</button>
                <button class="dropdown-item" type="button" onclick="loadPresetNormalField(); closeAllDropdowns();">🏟️ Load Normal Practice Field</button>
                <button class="dropdown-item" type="button" onclick="loadPresetJaajajField(); closeAllDropdowns();">🤖 Load Rescue Field Jaajaj</button>
                <div class="dropdown-divider"></div>
                <div class="dropdown-header" style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); padding: 4px 12px; text-transform: uppercase;">การจัดการไฟล์ (File I/O)</div>
                <button class="dropdown-item" type="button" onclick="saveProject(); closeAllDropdowns();">💾 Save Project (Local)</button>
                <button class="dropdown-item" type="button" onclick="exportMissionJSON(); closeAllDropdowns();">📤 Export Field (.json)</button>
                <button class="dropdown-item" type="button" onclick="triggerImportJSON(); closeAllDropdowns();">📥 Import Field (.json)</button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" type="button" onclick="openShortcutsModal(); closeAllDropdowns();">⌨ Keyboard Shortcuts (?)</button>
            </div>
        </div>"""

assert old_header_actions in text, "old_header_actions not found"
text = text.replace(old_header_actions, new_header_actions)
print("2. Enhanced Header actions with direct .ino export and complete Presets menu!")

# 3. Add loadPresetNormalField and loadPresetJaajajField methods to UIController
old_controller_methods = """    loadSampleOfficialField(silent = false) {
        this.stopPreview();
        this.gridManager.loadOfficialPreset();
        this.pathNodes = [];
        this.selectedNodeIdx = null;

        if (this.dom.colsInput) this.dom.colsInput.value = this.gridManager.cols;
        if (this.dom.rowsInput) this.dom.rowsInput.value = this.gridManager.rows;

        this.resizeArenaCanvas();
        this.initGrid();
        this.autoCalculateMission(true);

        if (!silent) {
            ToastService.show('★ Loaded official competition field & computed 100-pt route!', 'success');
        }
    }"""

new_controller_methods = """    loadSampleOfficialField(silent = false) {
        this.stopPreview();
        this.gridManager.loadOfficialPreset();
        this.pathNodes = [];
        this.selectedNodeIdx = null;

        if (this.dom.colsInput) this.dom.colsInput.value = this.gridManager.cols;
        if (this.dom.rowsInput) this.dom.rowsInput.value = this.gridManager.rows;

        this.resizeArenaCanvas();
        this.initGrid();
        this.autoCalculateMission(true);

        if (!silent) {
            ToastService.show('★ Loaded official competition field & computed 100-pt route!', 'success');
        }
    }

    async loadPresetNormalField() {
        this.stopPreview();
        try {
            const resp = await fetch('data/arenas/normal.json');
            if (resp.ok) {
                const data = await resp.json();
                this.gridManager.deserialize(data);
                this.pathNodes = [];
                this.selectedNodeIdx = null;
                if (this.dom.colsInput) this.dom.colsInput.value = this.gridManager.cols;
                if (this.dom.rowsInput) this.dom.rowsInput.value = this.gridManager.rows;
                this.resizeArenaCanvas();
                this.initGrid();
                this.autoCalculateMission(true);
                ToastService.show('🏟️ Loaded Normal Practice Field preset!', 'success');
                return;
            }
        } catch (e) {
            console.warn('Preset fetch fallback', e);
        }
        this.loadSampleOfficialField();
    }

    async loadPresetJaajajField() {
        this.stopPreview();
        try {
            const resp = await fetch('data/arenas/jaajaj.json');
            if (resp.ok) {
                const data = await resp.json();
                this.gridManager.deserialize(data);
                this.pathNodes = [];
                this.selectedNodeIdx = null;
                if (this.dom.colsInput) this.dom.colsInput.value = this.gridManager.cols;
                if (this.dom.rowsInput) this.dom.rowsInput.value = this.gridManager.rows;
                this.resizeArenaCanvas();
                this.initGrid();
                this.autoCalculateMission(true);
                ToastService.show('🤖 Loaded Rescue Field Jaajaj preset!', 'success');
                return;
            }
        } catch (e) {
            console.warn('Preset fetch fallback', e);
        }
        this.loadSampleOfficialField();
    }"""

assert old_controller_methods in text, "old_controller_methods not found"
text = text.replace(old_controller_methods, new_controller_methods)
print("3. Added loadPresetNormalField and loadPresetJaajajField controllers!")

# 4. Add window wrappers
old_wrappers = """function exportMissionJSON() { uiController.exportMissionJSON(); }
function triggerImportJSON() { uiController.triggerImportJSON(); }
function importMissionJSON(e) { uiController.importMissionJSON(e); }
function loadSampleOfficialField(s) { uiController.loadSampleOfficialField(s); }"""

new_wrappers = """function exportMissionJSON() { uiController.exportMissionJSON(); }
function triggerImportJSON() { uiController.triggerImportJSON(); }
function importMissionJSON(e) { uiController.importMissionJSON(e); }
function loadSampleOfficialField(s) { uiController.loadSampleOfficialField(s); }
function loadPresetNormalField() { uiController.loadPresetNormalField(); }
function loadPresetJaajajField() { uiController.loadPresetJaajajField(); }"""

assert old_wrappers in text, "old_wrappers not found"
text = text.replace(old_wrappers, new_wrappers)
print("4. Added window function wrappers for presets!")

with open('apps/web/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Applied layout fixes to index.html successfully!")
