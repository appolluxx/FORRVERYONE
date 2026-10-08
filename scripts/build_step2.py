import re

SOURCE_HTML = r"D:\Workspace\robot\web.html"

with open(SOURCE_HTML, "r", encoding="utf-8") as f:
    code = f.read()

# =============================================================================
# 1. EXPAND UIController CONSTRUCTOR & DOM CACHING
# =============================================================================
CONSTRUCTOR_EXTEND = """        this.audio = audioFX;
        this.serialLink = null;
        this.theater3D = null;
        this.arenaViewMode = '2D';
"""

code = code.replace(
    "        this.dom = {};",
    CONSTRUCTOR_EXTEND + "        this.dom = {};",
    1
)

# Expand _cacheDom with new elements
DOM_EXTEND = """            // Next-Gen 3D, Audio & Serial DOM elements
            arena3DContainer: document.getElementById('arena3DContainer'),
            canvas3D: document.getElementById('canvas3D'),
            theater3DTelemetry: document.getElementById('theater3DTelemetry'),
            viewMode2DBtn: document.getElementById('viewMode2DBtn'),
            viewMode3DBtn: document.getElementById('viewMode3DBtn'),
            sep3D: document.getElementById('sep3D'),
            camPresetIsoBtn: document.getElementById('camPresetIsoBtn'),
            camPresetTopBtn: document.getElementById('camPresetTopBtn'),
            camFollowBtn: document.getElementById('camFollowBtn'),
            missionPhaseDeck: document.getElementById('missionPhaseDeck'),
            deckTab3Btn: document.getElementById('deckTab3Btn'),
            deckTabSerial: document.getElementById('deckTabSerial'),
            sfxToggleBtn: document.getElementById('sfxToggleBtn'),
            sfxIcon: document.getElementById('sfxIcon'),
            headerSerialBtn: document.getElementById('headerSerialBtn'),
            headerSerialDot: document.getElementById('headerSerialDot'),
            headerSerialText: document.getElementById('headerSerialText'),
            serialStatusPill: document.getElementById('serialStatusPill'),
            serialBaudSelect: document.getElementById('serialBaudSelect'),
            serialConnectBtn: document.getElementById('serialConnectBtn'),
            serialPortName: document.getElementById('serialPortName'),
            serialBatteryVal: document.getElementById('serialBatteryVal'),
            demoModeBtn: document.getElementById('demoModeBtn'),
            compassNeedle: document.getElementById('compassNeedle'),
            compassYawDisplay: document.getElementById('compassYawDisplay'),
            serialConsoleLog: document.getElementById('serialConsoleLog'),
            serialInputField: document.getElementById('serialInputField'),
"""

code = code.replace(
    "            overlay: document.getElementById('pathOverlay')",
    "            overlay: document.getElementById('pathOverlay'),\n" + DOM_EXTEND.rstrip(','),
    1
)

# =============================================================================
# 2. UPDATE init() TO INITIALIZE 3D THEATER & WEBSERIAL LINK
# =============================================================================
INIT_EXTEND = """        this._init3DTheater();
        this._initSerialLink();
        this._updateAudioIcon();
"""

code = code.replace(
    "        this.autoCalculateMission(true);",
    "        this.autoCalculateMission(true);\n" + INIT_EXTEND,
    1
)

# =============================================================================
# 3. ADD METHODS TO UIController
# =============================================================================
NEW_METHODS = """
    _init3DTheater() {
        if (this.dom.canvas3D) {
            this.theater3D = new Isometric3DTheater(this.dom.canvas3D, () => this.gridManager);
            // Locate start cell if available
            const startIdx = this.gridManager.cells.findIndex(c => c && c.type === 'start');
            if (startIdx !== -1) {
                const col = this.gridManager.getCol(startIdx);
                const row = this.gridManager.getRow(startIdx);
                this.theater3D.updateRobotPosition(col * 300 + 150, row * 300 + 150, 0, false);
            }
            this.theater3D.render();
        }
    }

    _initSerialLink() {
        this.serialLink = new SerialRobotLink({
            onConnect: (port) => {
                const name = port.demo ? 'DEMO SIMULATOR' : 'ESP32 ATOM VX';
                if (this.dom.serialStatusPill) {
                    this.dom.serialStatusPill.className = 'serial-status-tag connected';
                    this.dom.serialStatusPill.textContent = '● CONNECTED';
                }
                if (this.dom.headerSerialDot) this.dom.headerSerialDot.style.background = 'var(--apple-green)';
                if (this.dom.headerSerialText) this.dom.headerSerialText.textContent = 'ESP32 Linked';
                if (this.dom.serialConnectBtn) this.dom.serialConnectBtn.textContent = 'Disconnect';
                if (this.dom.serialPortName) this.dom.serialPortName.textContent = name;
                ToastService.show(`Robot linked: ${name}`, 'success');
            },
            onDisconnect: () => {
                if (this.dom.serialStatusPill) {
                    this.dom.serialStatusPill.className = 'serial-status-tag disconnected';
                    this.dom.serialStatusPill.textContent = '● DISCONNECTED';
                }
                if (this.dom.headerSerialDot) this.dom.headerSerialDot.style.background = '#94a3b8';
                if (this.dom.headerSerialText) this.dom.headerSerialText.textContent = 'Connect Robot';
                if (this.dom.serialConnectBtn) this.dom.serialConnectBtn.textContent = 'Connect USB Port';
                if (this.dom.serialPortName) this.dom.serialPortName.textContent = '-';
                ToastService.show('Robot disconnected', 'info');
            },
            onYaw: (yaw) => {
                if (this.dom.compassNeedle) {
                    this.dom.compassNeedle.style.transform = `rotate(${yaw}deg)`;
                }
                if (this.dom.compassYawDisplay) {
                    this.dom.compassYawDisplay.textContent = `${yaw.toFixed(1)}°`;
                }
            },
            onIR: (vals) => {
                for (let i = 0; i < 8; i++) {
                    const bar = document.getElementById(`irBar${i}`);
                    if (bar) {
                        const val = vals[i] || 0;
                        const pct = Math.min(100, Math.max(5, (val / 4095) * 100));
                        bar.style.height = `${pct}%`;
                        if (val > 1500) bar.classList.add('line-active');
                        else bar.classList.remove('line-active');
                    }
                }
            },
            onBattery: (volts) => {
                if (this.dom.serialBatteryVal) {
                    this.dom.serialBatteryVal.textContent = `${volts.toFixed(1)}V (3S)`;
                }
            },
            onRawLine: (line) => {
                if (this.dom.serialConsoleLog) {
                    this.dom.serialConsoleLog.textContent += '\\n' + line;
                    this.dom.serialConsoleLog.scrollTop = this.dom.serialConsoleLog.scrollHeight;
                }
            }
        });
    }

    _updateAudioIcon() {
        if (this.dom.sfxIcon) {
            this.dom.sfxIcon.textContent = this.audio.enabled ? '🔊' : '🔇';
        }
    }

    toggleAudio() {
        const enabled = this.audio.toggle();
        this._updateAudioIcon();
        ToastService.show(`Audio SFX ${enabled ? 'Enabled' : 'Muted'}`, 'info');
    }

    setArenaViewMode(mode) {
        this.arenaViewMode = mode;
        this.audio.playClick();
        if (mode === '3D') {
            if (this.dom.frame) this.dom.frame.style.display = 'none';
            if (this.dom.axisHorizontal) this.dom.axisHorizontal.style.display = 'none';
            if (this.dom.axisVertical) this.dom.axisVertical.style.display = 'none';
            if (this.dom.arena3DContainer) this.dom.arena3DContainer.style.display = 'block';

            if (this.dom.viewMode2DBtn) this.dom.viewMode2DBtn.classList.remove('active');
            if (this.dom.viewMode3DBtn) this.dom.viewMode3DBtn.classList.add('active');

            if (this.dom.sep3D) this.dom.sep3D.style.display = 'inline-block';
            if (this.dom.camPresetIsoBtn) this.dom.camPresetIsoBtn.style.display = 'inline-flex';
            if (this.dom.camPresetTopBtn) this.dom.camPresetTopBtn.style.display = 'inline-flex';
            if (this.dom.camFollowBtn) this.dom.camFollowBtn.style.display = 'inline-flex';

            if (this.theater3D) this.theater3D.render();
            ToastService.show('Switched to 3D Isometric Theater', 'info');
        } else {
            if (this.dom.frame) this.dom.frame.style.display = 'block';
            if (this.dom.axisHorizontal && this.showRulers) this.dom.axisHorizontal.style.display = 'grid';
            if (this.dom.axisVertical && this.showRulers) this.dom.axisVertical.style.display = 'grid';
            if (this.dom.arena3DContainer) this.dom.arena3DContainer.style.display = 'none';

            if (this.dom.viewMode2DBtn) this.dom.viewMode2DBtn.classList.add('active');
            if (this.dom.viewMode3DBtn) this.dom.viewMode3DBtn.classList.remove('active');

            if (this.dom.sep3D) this.dom.sep3D.style.display = 'none';
            if (this.dom.camPresetIsoBtn) this.dom.camPresetIsoBtn.style.display = 'none';
            if (this.dom.camPresetTopBtn) this.dom.camPresetTopBtn.style.display = 'none';
            if (this.dom.camFollowBtn) this.dom.camFollowBtn.style.display = 'none';

            ToastService.show('Switched to 2D Plan Grid', 'info');
        }
    }

    set3DCameraPreset(preset) {
        if (this.theater3D) {
            this.theater3D.setCameraPreset(preset);
            this.audio.playClick();
        }
    }

    toggle3DCameraFollow() {
        if (this.theater3D) {
            const isFollow = this.theater3D.toggleFollow();
            if (this.dom.camFollowBtn) {
                this.dom.camFollowBtn.textContent = `Follow: ${isFollow ? 'On' : 'Off'}`;
                if (isFollow) this.dom.camFollowBtn.classList.add('active');
                else this.dom.camFollowBtn.classList.remove('active');
            }
            this.audio.playClick();
        }
    }

    toggleSerial() {
        if (!this.serialLink) return;
        if (this.serialLink.isConnected) {
            this.serialLink.disconnect();
        } else {
            const baud = parseInt(this.dom.serialBaudSelect?.value || '115200', 10);
            this.serialLink.connect(baud).catch((err) => {
                ToastService.show(err.message, 'error');
            });
        }
    }

    toggleDemoMode() {
        if (!this.serialLink) return;
        const active = this.serialLink.toggleDemo();
        if (this.dom.demoModeBtn) {
            this.dom.demoModeBtn.style.color = active ? 'var(--apple-green)' : '';
        }
    }

    sendSerialCmd(cmd) {
        if (!this.serialLink) return;
        this.serialLink.sendLine(cmd).catch(err => {
            ToastService.show(err.message, 'warning');
        });
        this.audio.playClick();
    }

    sendSerialInput() {
        const val = this.dom.serialInputField?.value;
        if (val) {
            this.sendSerialCmd(val);
            if (this.dom.serialInputField) this.dom.serialInputField.value = '';
        }
    }

    handleSerialKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.sendSerialInput();
        }
    }

    clearSerialLog() {
        if (this.dom.serialConsoleLog) {
            this.dom.serialConsoleLog.textContent = '[CLEARED] Ready.';
        }
    }

    renderMissionPhases() {
        if (!this.dom.missionPhaseDeck) return;
        const deck = this.dom.missionPhaseDeck;
        deck.innerHTML = '';

        if (!this.pathNodes || this.pathNodes.length === 0) {
            deck.innerHTML = '<span style="font-size:0.62rem; color:var(--text-muted); padding:4px;">No active mission route</span>';
            return;
        }

        // Group into legs: START, BOX1, BOX2, BOX3, BOX4, END
        const legs = [
            { key: 'START', label: '🏁 Launch', pts: 0, desc: 'Exit bay' },
            { key: 'BOX1', label: '📦 Drop N', pts: 15, desc: 'Zone 1 (FL)' },
            { key: 'BOX2', label: '📦 Drop E', pts: 15, desc: 'Bumps+CP2' },
            { key: 'BOX3', label: '📦 Drop S1', pts: 15, desc: 'Zone 3 (Rear)' },
            { key: 'BOX4', label: '📦 Drop S2', pts: 15, desc: 'Zone 4 (FL)' },
            { key: 'END', label: '🏆 Finish', pts: 40, desc: 'Bridge+Dock' }
        ];

        legs.forEach(leg => {
            const stepCount = this.pathNodes.filter(n => (n.leg || 'BOX1') === leg.key).length;
            const card = document.createElement('div');
            card.className = 'phase-card';
            card.onclick = () => this.highlightPhase(leg.key);
            card.innerHTML = `
                <div class="phase-card-title">
                    <span>${leg.label}</span>
                    <span class="phase-card-pts">+${leg.pts}p</span>
                </div>
                <div class="phase-card-sub">${stepCount} steps · ${leg.desc}</div>
            `;
            deck.appendChild(card);
        });
    }

    highlightPhase(legKey) {
        this.audio.playClick();
        const firstNodeIdx = this.pathNodes.findIndex(n => (n.leg || 'BOX1') === legKey);
        if (firstNodeIdx !== -1) {
            this.selectNode(firstNodeIdx);
            ToastService.show(`Focused mission leg: ${legKey}`, 'info');
        }
    }
"""

# Insert new methods into UIController right before triggerImportJSON
code = code.replace(
    "    triggerImportJSON() {",
    NEW_METHODS + "\n    triggerImportJSON() {",
    1
)

# =============================================================================
# 4. UPDATE switchRightDeck TO HANDLE 'SERIAL'
# =============================================================================
OLD_SWITCH_RIGHT_DECK = """    switchRightDeck(deck) {
        if (deck === 'INSPECTOR') {
            this.dom.deckTab1Btn.classList.add('active');
            this.dom.deckTab1Btn.setAttribute('aria-selected', 'true');
            this.dom.deckTab2Btn.classList.remove('active');
            this.dom.deckTab2Btn.setAttribute('aria-selected', 'false');
            this.dom.deckTabInspector.classList.add('active');
            this.dom.deckTabCode.classList.remove('active');
        } else {
            this.dom.deckTab2Btn.classList.add('active');
            this.dom.deckTab2Btn.setAttribute('aria-selected', 'true');
            this.dom.deckTab1Btn.classList.remove('active');
            this.dom.deckTab1Btn.setAttribute('aria-selected', 'false');
            this.dom.deckTabCode.classList.add('active');
            this.dom.deckTabInspector.classList.remove('active');
            this.generateCode();
        }
    }"""

NEW_SWITCH_RIGHT_DECK = """    switchRightDeck(deck) {
        this.audio.playClick();
        [this.dom.deckTab1Btn, this.dom.deckTab2Btn, this.dom.deckTab3Btn].forEach(b => {
            if (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); }
        });
        [this.dom.deckTabInspector, this.dom.deckTabCode, this.dom.deckTabSerial].forEach(c => {
            if (c) c.classList.remove('active');
        });

        if (deck === 'INSPECTOR') {
            if (this.dom.deckTab1Btn) { this.dom.deckTab1Btn.classList.add('active'); this.dom.deckTab1Btn.setAttribute('aria-selected', 'true'); }
            if (this.dom.deckTabInspector) this.dom.deckTabInspector.classList.add('active');
        } else if (deck === 'CODE') {
            if (this.dom.deckTab2Btn) { this.dom.deckTab2Btn.classList.add('active'); this.dom.deckTab2Btn.setAttribute('aria-selected', 'true'); }
            if (this.dom.deckTabCode) this.dom.deckTabCode.classList.add('active');
            this.generateCode();
        } else if (deck === 'SERIAL') {
            if (this.dom.deckTab3Btn) { this.dom.deckTab3Btn.classList.add('active'); this.dom.deckTab3Btn.setAttribute('aria-selected', 'true'); }
            if (this.dom.deckTabSerial) this.dom.deckTabSerial.classList.add('active');
        }
    }"""

code = code.replace(OLD_SWITCH_RIGHT_DECK, NEW_SWITCH_RIGHT_DECK, 1)

# =============================================================================
# 5. UPDATE SIMULATION STEP & START HANDLERS TO SYNCHRONIZE 3D MODEL
# =============================================================================
OLD_SIM_START = """    _handleSimulationStart() {
        this.dom.robotPreview.style.display = 'block';
        this.dom.previewBtn.textContent = '⏹ Stop';
        this.dom.previewBtn.setAttribute('aria-pressed', 'true');
        this.dom.previewBtn.classList.remove('accent');
        this.dom.previewBtn.classList.add('primary');
        ToastService.show('Simulation sequence running', 'info');
    }"""

NEW_SIM_START = """    _handleSimulationStart() {
        this.audio.playClick();
        this.dom.robotPreview.style.display = 'block';
        this.dom.previewBtn.textContent = '⏹ Stop';
        this.dom.previewBtn.setAttribute('aria-pressed', 'true');
        this.dom.previewBtn.classList.remove('accent');
        this.dom.previewBtn.classList.add('primary');
        if (this.theater3D) this.theater3D.clearDroppedCubes();
        ToastService.show('Simulation sequence running', 'info');
    }"""

code = code.replace(OLD_SIM_START, NEW_SIM_START, 1)

OLD_SIM_STEP = """    _handleSimulationStep({ x1, y1, x2, y2, angle, moveDuration, isInitial }) {
        if (isInitial) {
            this.dom.robotPreview.style.transition = 'none';
            this.dom.robotPreview.style.left = `${x1}px`;
            this.dom.robotPreview.style.top = `${y1}px`;
            this.dom.robotPreview.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        } else {
            this.dom.robotPreview.style.transition = `left ${moveDuration}ms linear, top ${moveDuration}ms linear, transform ${Config.MANEUVERS.SIM_ROTATION_TRANSITION_MS}ms ease`;
            this.dom.robotPreview.style.left = `${x2}px`;
            this.dom.robotPreview.style.top = `${y2}px`;
            this.dom.robotPreview.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        }
    }"""

NEW_SIM_STEP = """    _handleSimulationStep({ x1, y1, x2, y2, angle, moveDuration, isInitial, stepIdx }) {
        if (isInitial) {
            this.dom.robotPreview.style.transition = 'none';
            this.dom.robotPreview.style.left = `${x1}px`;
            this.dom.robotPreview.style.top = `${y1}px`;
            this.dom.robotPreview.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            this.audio.playStep();
        } else {
            this.dom.robotPreview.style.transition = `left ${moveDuration}ms linear, top ${moveDuration}ms linear, transform ${Config.MANEUVERS.SIM_ROTATION_TRANSITION_MS}ms ease`;
            this.dom.robotPreview.style.left = `${x2}px`;
            this.dom.robotPreview.style.top = `${y2}px`;
            this.dom.robotPreview.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        }

        // Synchronize 3D Isometric Robot Model
        if (this.theater3D) {
            const targetX = isInitial ? x1 : x2;
            const targetY = isInitial ? y1 : y2;
            const normX = (targetX / (this.gridManager.cols * this.cellSizePx)) * (this.gridManager.cols * 300);
            const normY = (targetY / (this.gridManager.rows * this.cellSizePx)) * (this.gridManager.rows * 300);
            this.theater3D.updateRobotPosition(normX, normY, angle, !isInitial);

            if (this.dom.theater3DTelemetry) {
                this.dom.theater3DTelemetry.innerHTML = `<span>X: ${Math.round(normX)}mm</span><span>|</span><span>Y: ${Math.round(normY)}mm</span><span>|</span><span>Yaw: ${Math.round(angle)}°</span>`;
            }
        }
    }"""

code = code.replace(OLD_SIM_STEP, NEW_SIM_STEP, 1)

OLD_SIM_COMPLETE = """    _handleSimulationComplete() {
        this.dom.robotPreview.style.display = 'none';
        this.dom.previewBtn.textContent = '▶ Simulate';
        this.dom.previewBtn.setAttribute('aria-pressed', 'false');
        this.dom.previewBtn.classList.remove('primary');
        this.dom.previewBtn.classList.add('accent');
        ToastService.show('Simulation run finished', 'success');
    }"""

NEW_SIM_COMPLETE = """    _handleSimulationComplete() {
        this.dom.robotPreview.style.display = 'none';
        this.dom.previewBtn.textContent = '▶ Simulate';
        this.dom.previewBtn.setAttribute('aria-pressed', 'false');
        this.dom.previewBtn.classList.remove('primary');
        this.dom.previewBtn.classList.add('accent');
        this.audio.playWin();
        ToastService.show('Mission Completed with 100 PTS!', 'success');
    }"""

code = code.replace(OLD_SIM_COMPLETE, NEW_SIM_COMPLETE, 1)

# Ensure autoCalculateMission updates missionPhaseDeck
code = code.replace(
    "        this.generateCode();",
    "        this.generateCode();\n        this.renderMissionPhases();",
    1
)

# =============================================================================
# 6. EXPORT NEW PUBLIC FAÇADE DELEGATES
# =============================================================================
NEW_DELEGATES = """
// Next-Gen Feature Global Delegates
function toggleAudioFX() { uiController.toggleAudio(); }
function setArenaViewMode(mode) { uiController.setArenaViewMode(mode); }
function set3DCameraPreset(preset) { uiController.set3DCameraPreset(preset); }
function toggle3DCameraFollow() { uiController.toggle3DCameraFollow(); }
function toggleSerialConnection() { uiController.toggleSerial(); }
function toggleDemoMode() { uiController.toggleDemoMode(); }
function sendSerialCmd(cmd) { uiController.sendSerialCmd(cmd); }
function sendSerialInput() { uiController.sendSerialInput(); }
function handleSerialInputKey(e) { uiController.handleSerialKey(e); }
function clearSerialLog() { uiController.clearSerialLog(); }
"""

code = code.replace(
    "// Bootstrap application on DOM ready",
    NEW_DELEGATES + "\n// Bootstrap application on DOM ready",
    1
)

# Write updated web.html
with open(SOURCE_HTML, "w", encoding="utf-8") as f:
    f.write(code)

print("Step 2 complete: Successfully integrated UIController and Public Delegates in web.html")
