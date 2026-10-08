import re
import os

TARGET_FILE = r"D:\Workspace\robot\web.html"

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    content = f.read()

print("Initial file size:", len(content))

# =============================================================================
# 1. MODAL HTML: ADD SEMANTIC DIALOG ATTRIBUTES & CLOSE BUTTONS
# =============================================================================
content = content.replace(
    '<div id="lineStyleModal" role="dialog" aria-label="Choose line placement" aria-modal="false" style="position: fixed; display: none;">',
    '<div id="lineStyleModal" role="dialog" aria-label="Choose line placement" aria-modal="true" style="position: fixed; display: none;">',
    1
)

content = content.replace(
    '<div id="shortcutsModal" onclick="closeShortcutsModal(event)">',
    '<div id="shortcutsModal" role="dialog" aria-modal="true" aria-labelledby="shortcutsTitle" onclick="closeShortcutsModal(event)">',
    1
)

content = content.replace(
    '<h3 class="modal-title">Keyboard Shortcuts</h3>',
    '<h3 class="modal-title" id="shortcutsTitle">Keyboard Shortcuts</h3>',
    1
)

# =============================================================================
# 2. REFACTOR SerialRobotLink: DISCONNECT-SAFE LIFECYCLE & GUARANTEED WRITER RELEASE
# =============================================================================
OLD_SERIAL_ROBOT_LINK = re.search(r'class SerialRobotLink \{[\s\S]*?\n\}\n\n//', content)
if not OLD_SERIAL_ROBOT_LINK:
    print("Warning: could not locate class SerialRobotLink via regex")
else:
    NEW_SERIAL_ROBOT_LINK = """class SerialRobotLink {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;
        this.port = null;
        this.reader = null;
        this.keepReading = false;
        this.closedPromise = null;
        this.isConnected = false;
        this.baudRate = 115200;
        this.rxBuffer = '';
        this.isDemoMode = false;
        this.demoTimer = null;

        // Auto-detect physical hardware disconnection
        if (typeof navigator !== 'undefined' && 'serial' in navigator) {
            navigator.serial.addEventListener('disconnect', (e) => {
                if (e.target === this.port) {
                    console.warn('[WebSerial] Physical hardware disconnected');
                    this._forceDisconnectCleanup();
                }
            });
        }
    }

    isSupported() {
        return (typeof navigator !== 'undefined' && 'serial' in navigator);
    }

    async connect(baud = 115200) {
        if (!this.isSupported()) {
            throw new Error('WebSerial not supported in this browser. Please use Chrome, Edge, or Opera.');
        }
        if (this.isConnected) {
            await this.disconnect();
        }
        try {
            this.baudRate = baud;
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: this.baudRate });
            this.isConnected = true;
            this.keepReading = true;
            this.closedPromise = this._startReadLoop();
            if (this.callbacks.onConnect) this.callbacks.onConnect(this.port);
            audioFX.playSerial(true);
            return true;
        } catch (err) {
            this.isConnected = false;
            throw err;
        }
    }

    async _startReadLoop() {
        while (this.port && this.port.readable && this.keepReading) {
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable).catch(() => {});
            this.reader = textDecoder.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await this.reader.read();
                    if (done) break;
                    if (value) this._handleChunk(value);
                }
            } catch (err) {
                console.warn('[WebSerial] Read loop stream ended:', err);
                break;
            } finally {
                try { this.reader.releaseLock(); } catch (_) {}
                await readableStreamClosed.catch(() => {});
            }
        }
    }

    _handleChunk(chunk) {
        this.rxBuffer += chunk;
        const lines = this.rxBuffer.split(/\\r?\\n/);
        this.rxBuffer = lines.pop(); // Retain incomplete line
        // Prevent buffer bloat if high-speed bursts occur
        if (lines.length > 50) lines.splice(0, lines.length - 20);
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) this._parseLine(trimmed);
        }
    }

    _parseLine(line) {
        if (this.callbacks.onRawLine) this.callbacks.onRawLine(line);

        // Parse YAW
        const yawMatch = line.match(/(?:YAW|GYRO|HEADING|IMU)[\\s:=]+([-\\d.]+)/i);
        if (yawMatch && this.callbacks.onYaw) {
            this.callbacks.onYaw(parseFloat(yawMatch[1]));
        }

        // Parse IR Reflectance
        const irMatch = line.match(/IR[\\s:=]+([\\d,\\s]+)/i);
        if (irMatch && this.callbacks.onIR) {
            const vals = irMatch[1].split(/[, ]+/).filter(Boolean).map(v => parseInt(v, 10));
            this.callbacks.onIR(vals);
        }

        // Parse Battery Voltage
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
            throw new Error('Robot hardware port is not open');
        }
        const encoder = new TextEncoder();
        const writer = this.port.writable.getWriter();
        try {
            await writer.write(encoder.encode(trimmed + '\\n'));
            if (this.callbacks.onTx) this.callbacks.onTx(trimmed);
        } finally {
            writer.releaseLock(); // ALWAYS guaranteed release!
        }
    }

    async disconnect() {
        this.keepReading = false;
        if (this.reader) {
            await this.reader.cancel().catch(() => {});
        }
        if (this.closedPromise) {
            await this.closedPromise.catch(() => {});
        }
        if (this.port) {
            await this.port.close().catch(() => {});
            this.port = null;
        }
        this._forceDisconnectCleanup();
    }

    _forceDisconnectCleanup() {
        if (this.demoTimer) {
            clearInterval(this.demoTimer);
            this.demoTimer = null;
        }
        this.isConnected = false;
        this.isDemoMode = false;
        if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
        audioFX.playSerial(false);
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
"""
    content = content[:OLD_SERIAL_ROBOT_LINK.start()] + NEW_SERIAL_ROBOT_LINK + "\n// " + content[OLD_SERIAL_ROBOT_LINK.end():]
    print("Replaced SerialRobotLink cleanly")

# =============================================================================
# 3. REFACTOR Isometric3DTheater: 60FPS RAF LOOP, isDirty FLAG & HiDPI SCALING
# =============================================================================
OLD_3D_THEATER = re.search(r'class Isometric3DTheater \{[\s\S]*?\n\}\n\nclass SimulationController', content)
if not OLD_3D_THEATER:
    print("Warning: could not locate class Isometric3DTheater")
else:
    # Read existing 3D theater methods but upgrade with RAF loop and HiDPI
    NEW_3D_THEATER = """class Isometric3DTheater {
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

        // High-Performance 60fps RAF Architecture
        this.isDirty = true;
        this.rafId = null;

        // Interactive Drag State
        this.isDragging = false;
        this.dragMode = 'orbit';
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Robot 3D Position & State
        this.robot = {
            active: false,
            x: 0,
            y: 0,
            z: 0,
            heading: 0,
            wheelAngle: 0,
            recoilOffset: 0,
            droppedCubes: []
        };

        this.seesawTilts = {};

        this._setupHiDPI();
        this._startRenderLoop();
        this._setupEvents();
    }

    _setupHiDPI() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const displayWidth = Math.round(rect.width || 720);
        const displayHeight = Math.round(rect.height || 380);

        if (this.canvas.width !== displayWidth * dpr || this.canvas.height !== displayHeight * dpr) {
            this.canvas.width = displayWidth * dpr;
            this.canvas.height = displayHeight * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.isDirty = true;
        }
    }

    _startRenderLoop() {
        const loop = () => {
            if (this.isDirty) {
                this._renderFrame();
                this.isDirty = false;
            }
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    requestRender() {
        this.isDirty = true;
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
            this.requestRender(); // Throttled through RAF!
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            this.zoom = Math.max(0.4, Math.min(2.8, this.zoom * delta));
            this.requestRender();
        }, { passive: false });

        window.addEventListener('resize', () => {
            this._setupHiDPI();
            this.requestRender();
        }, { passive: true });
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
        this.requestRender();
    }

    toggleFollow() {
        this.followRobot = !this.followRobot;
        this.requestRender();
        return this.followRobot;
    }

    project(x, y, z = 0) {
        const grid = this.getGridManager();
        const arenaW = (grid.cols || 8) * 300;
        const arenaH = (grid.rows || 4) * 300;

        let cx = x - arenaW / 2;
        let cy = y - arenaH / 2;
        let cz = z;

        if (this.followRobot && this.robot.active) {
            cx -= (this.robot.x - arenaW / 2);
            cy -= (this.robot.y - arenaH / 2);
        }

        const radYaw = (this.yaw * Math.PI) / 180;
        const cosY = Math.cos(radYaw);
        const sinY = Math.sin(radYaw);
        const rx = cx * cosY - cy * sinY;
        const ry = cx * sinY + cy * cosY;

        const radPitch = (this.pitch * Math.PI) / 180;
        const cosP = Math.cos(radPitch);
        const sinP = Math.sin(radPitch);
        const px = rx;
        const py = ry * cosP - cz * sinP;
        const pz = ry * sinP + cz * cosP;

        const scale = 0.22 * this.zoom;
        const screenX = (this.canvas.clientWidth || 720) / 2 + this.panX + px * scale;
        const screenY = (this.canvas.clientHeight || 380) / 2 + this.panY + py * scale;

        return { x: screenX, y: screenY, depth: pz };
    }

    updateRobotPosition(xMm, yMm, headingDeg, moving = true, recoil = 0) {
        this.robot.active = true;
        this.robot.x = xMm;
        this.robot.y = yMm;
        this.robot.heading = headingDeg;
        this.robot.recoilOffset = recoil;
        if (moving) this.robot.wheelAngle = (this.robot.wheelAngle + 18) % 360;

        const grid = this.getGridManager();
        const col = Math.floor(xMm / 300);
        const row = Math.floor(yMm / 300);
        const cellIdx = row * (grid.cols || 8) + col;
        const cell = grid.getCell(cellIdx);

        if (cell) {
            if (cell.type === 'bridge') {
                const subX = (xMm % 300) / 300;
                if (subX < 0.28) this.robot.z = (subX / 0.28) * 50;
                else if (subX > 0.72) this.robot.z = ((1 - subX) / 0.28) * 50;
                else this.robot.z = 50;
            } else if (cell.type === 'seesaw') {
                const subX = (xMm % 300) / 300;
                const tilt = (subX - 0.5) * 22;
                this.seesawTilts[cellIdx] = tilt;
                this.robot.z = 24 + (subX - 0.5) * 28;
            } else {
                this.robot.z = 0;
            }
        } else {
            this.robot.z = 0;
        }

        this.requestRender();
    }

    dropCube(cellIdx) {
        const grid = this.getGridManager();
        const col = cellIdx % (grid.cols || 8);
        const row = Math.floor(cellIdx / (grid.cols || 8));
        this.robot.droppedCubes.push({
            x: col * 300 + 150,
            y: row * 300 + 150,
            z: 10,
            color: '#f59e0b'
        });
        audioFX.playDrop();
        this.requestRender();
    }

    clearDroppedCubes() {
        this.robot.droppedCubes = [];
        this.seesawTilts = {};
        this.requestRender();
    }

    render() {
        this.requestRender();
    }

    _renderFrame() {
        const ctx = this.ctx;
        const w = this.canvas.clientWidth || 720;
        const h = this.canvas.clientHeight || 380;
        ctx.clearRect(0, 0, w, h);

        const grid = this.getGridManager();
        const cols = grid.cols || 8;
        const rows = grid.rows || 4;

        this._drawPedestal(cols, rows);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellIdx = r * cols + c;
                const cell = grid.getCell(cellIdx) || { type: 'empty' };
                this._drawCell3D(c, r, cell);
            }
        }

        for (const cube of this.robot.droppedCubes) {
            this._drawBox3D(cube.x - 20, cube.y - 20, 0, 40, 40, 35, '#f59e0b', '#d97706');
        }

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
        const depth = 35;

        const p1b = this.project(x1, y1, -depth);
        const p2b = this.project(x2, y1, -depth);
        const p3b = this.project(x2, y2, -depth);
        const p4b = this.project(x1, y2, -depth);

        const p1t = this.project(x1, y1, 0);
        const p2t = this.project(x2, y1, 0);
        const p3t = this.project(x2, y2, 0);
        const p4t = this.project(x1, y2, 0);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(p4t.x, p4t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p3b.x, p3b.y); ctx.lineTo(p4b.x, p4b.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(p2t.x, p2t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p3b.x, p3b.y); ctx.lineTo(p2b.x, p2b.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(p1t.x, p1t.y); ctx.lineTo(p2t.x, p2t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p4t.x, p4t.y);
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

        let floorFill = '#f8fafc';
        if (cell.type === 'start') floorFill = '#dcfce7';
        else if (cell.type === 'finish') floorFill = '#fee2e2';
        else if (cell.type === 'checkpoint') floorFill = '#fef3c7';
        else if (cell.type === 'tunnel') floorFill = '#1e293b';
        else if (cell.type === 'blackhole') floorFill = '#020617';

        ctx.fillStyle = floorFill;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.stroke();

        const bw = 20;
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
        const rampW = 80;
        const bridgeH = 45;
        this._drawRamp3D(x1, y1, rampW, 300, 0, bridgeH, '#2563eb', '#1d4ed8');
        this._drawBox3D(x1 + rampW, y1, 0, 140, 300, bridgeH, '#3b82f6', '#1e40af');
        this._drawRamp3D(x1 + 220, y1, rampW, 300, bridgeH, 0, '#2563eb', '#1d4ed8');
    }

    _drawSeesaw3D(x1, y1, tiltAngle) {
        const cx = x1 + 150;
        this._drawBox3D(cx - 15, y1 + 20, 0, 30, 260, 22, '#475569', '#334155');

        const rad = (tiltAngle * Math.PI) / 180;
        const zLeft = 22 - Math.sin(rad) * 130;
        const zRight = 22 + Math.sin(rad) * 130;

        const p1 = this.project(x1 + 10, y1 + 20, zLeft);
        const p2 = this.project(x1 + 290, y1 + 20, zRight);
        const p3 = this.project(x1 + 290, y1 + 280, zRight);
        const p4 = this.project(x1 + 10, y1 + 280, zLeft);

        this.ctx.fillStyle = '#eab308';
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#ca8a04';
        this.ctx.stroke();
    }

    _drawBumps3D(x1, y1) {
        for (let i = 0; i < 7; i++) {
            const bx = x1 + 30 + i * 36;
            this._drawBox3D(bx, y1 + 15, 0, 8, 270, 6, '#ea580c', '#c2410c');
        }
    }

    _drawTunnel3D(x1, y1) {
        const h = 55;
        this._drawBox3D(x1 + 10, y1 + 10, 0, 25, 280, h, '#334155', '#1e293b');
        this._drawBox3D(x1 + 265, y1 + 10, 0, 25, 280, h, '#334155', '#1e293b');
        this._drawBox3D(x1 + 10, y1 + 10, h, 280, 280, 8, '#475569', '#1e293b');
    }

    _drawDropBay3D(x1, y1, dropType) {
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
            this._drawBox3D(x1 + 300 - wallT, y1, 0, wallT, 300, wallH, '#1e3a8a', '#172554');
        }
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
        const p2t = this.project(x + w, y + z + d - z);
        const p3t = this.project(x + w, y + h, z + d);
        const p4t = this.project(x, y + h, z + d);

        ctx.fillStyle = sideColor;
        ctx.beginPath();
        ctx.moveTo(p4t.x, p4t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p3b.x, p3b.y); ctx.lineTo(p4b.x, p4b.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p2t.x, p2t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p3b.x, p3b.y); ctx.lineTo(p2b.x, p2b.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(p1t.x, p1t.y); ctx.lineTo(p2t.x, p2t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p4t.x, p4t.y);
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
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = sideColor;
        ctx.stroke();
    }

    _drawRobot3D() {
        const ctx = this.ctx;
        const headingRad = (this.robot.heading * Math.PI) / 180;
        const cosH = Math.cos(headingRad);
        const sinH = Math.sin(headingRad);

        // Factor in recoil offset if squaring line
        const rx = this.robot.x - (this.robot.recoilOffset * sinH);
        const ry = this.robot.y + (this.robot.recoilOffset * cosH);
        const rz = this.robot.z;

        const half = 90;
        const h = 32;

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

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(p4t.x, p4t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p3b.x, p3b.y); ctx.lineTo(p4b.x, p4b.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p2t.x, p2t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p3b.x, p3b.y); ctx.lineTo(p2b.x, p2b.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(p1t.x, p1t.y); ctx.lineTo(p2t.x, p2t.y); ctx.lineTo(p3t.x, p3t.y); ctx.lineTo(p4t.x, p4t.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0071e3';
        ctx.lineWidth = 2;
        ctx.stroke();

        const frontCenter = {
            x: rx + 0 * cosH - (-half * 0.7) * sinH,
            y: ry + 0 * sinH + (-half * 0.7) * cosH
        };
        const ptArrow = this.project(frontCenter.x, frontCenter.y, rz + 10 + h + 2);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(ptArrow.x, ptArrow.y, 6 * this.zoom, 0, Math.PI * 2);
        ctx.fill();

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
    content = content[:OLD_3D_THEATER.start()] + NEW_3D_THEATER + "\n\nclass SimulationController" + content[OLD_3D_THEATER.end():]
    print("Replaced Isometric3DTheater cleanly with RAF and HiDPI")

# =============================================================================
# 4. REFACTOR SimulationController: GENERATION-TOKEN CANCELLATION
# =============================================================================
OLD_SIM_CONTROLLER = re.search(r'class SimulationController \{[\s\S]*?\n\}\n\n// =============================================================================\n// 8\. UI CONTROLLER', content)
if not OLD_SIM_CONTROLLER:
    print("Warning: could not locate class SimulationController")
else:
    NEW_SIM_CONTROLLER = """class SimulationController {
    constructor(callbacks = {}) {
        this.isAnimating = false;
        this.generation = 0; // Generation token prevents state corruption
        this.animTimeout = null;
        this.callbacks = callbacks;
    }

    start(pathNodes, getCoordinates) {
        if (!pathNodes || pathNodes.length < 2) return false;
        this.stop();
        this.isAnimating = true;
        this.generation++;
        const currentGen = this.generation;

        if (this.callbacks.onStart) this.callbacks.onStart();
        this._step(0, pathNodes, getCoordinates, currentGen);
        return true;
    }

    stop() {
        this.isAnimating = false;
        this.generation++; // Immediately invalidate any pending step callbacks!
        if (this.animTimeout) {
            clearTimeout(this.animTimeout);
            this.animTimeout = null;
        }
        if (this.callbacks.onStop) this.callbacks.onStop();
    }

    _step(idx, pathNodes, getCoordinates, currentGen) {
        if (!this.isAnimating || this.generation !== currentGen) return;
        if (idx >= pathNodes.length - 1) {
            this.animTimeout = setTimeout(() => {
                if (this.generation !== currentGen) return;
                this.stop();
                if (this.callbacks.onComplete) this.callbacks.onComplete();
            }, Config.MANEUVERS.SIM_COMPLETION_DELAY_MS);
            return;
        }

        const start = pathNodes[idx];
        const end = pathNodes[idx + 1];
        if (!start || !end) { this.stop(); return; }

        const { x: x1, y: y1 } = getCoordinates(start.cellIdx);
        const { x: x2, y: y2 } = getCoordinates(end.cellIdx);

        let angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 90;
        if (end.fn === 'BB') {
            angle = (angle + 180) % 360;
        }

        const moveDuration = Math.max(end.timer || 300, Config.MANEUVERS.MIN_STEP_DURATION_MS);

        if (this.callbacks.onStep) {
            this.callbacks.onStep({
                x1, y1, x2, y2, angle, moveDuration,
                isInitial: true,
                stepIdx: idx,
                targetNode: end
            });
        }

        this.animTimeout = setTimeout(() => {
            if (!this.isAnimating || this.generation !== currentGen) return;
            if (this.callbacks.onStep) {
                this.callbacks.onStep({
                    x1, y1, x2, y2, angle, moveDuration,
                    isInitial: false,
                    stepIdx: idx,
                    targetNode: end
                });
            }
            this.animTimeout = setTimeout(() => {
                if (!this.isAnimating || this.generation !== currentGen) return;
                this._step(idx + 1, pathNodes, getCoordinates, currentGen);
            }, moveDuration);
        }, Config.MANEUVERS.SIM_ROTATION_TRANSITION_MS);
    }
}
"""
    content = content[:OLD_SIM_CONTROLLER.start()] + NEW_SIM_CONTROLLER + "\n\n// =============================================================================\n// 8. UI CONTROLLER" + content[OLD_SIM_CONTROLLER.end():]
    print("Replaced SimulationController cleanly with generation token")

# =============================================================================
# 5. REFACTOR KINEMATICS & KINEMATIC STEP SYNCHRONIZATION
# =============================================================================
# Update calculateStepTiming in PathfindingEngine
OLD_CALC_TIMING = re.search(r'static calculateStepTiming\(terrain, tilesCount, profile\) \{[\s\S]*?\n    \}', content)
if OLD_CALC_TIMING:
    NEW_CALC_TIMING = """static calculateStepTiming(terrain, tilesCount, profile) {
        if (terrain === 'bridge') return { timer: profile.bridgeTimerMs * tilesCount, speed: Config.OBSTACLE_SPEEDS.bridge };
        if (terrain === 'bump') return { timer: profile.bumpTimerMs * tilesCount, speed: Config.OBSTACLE_SPEEDS.bump };
        if (terrain === 'seesaw') return { timer: profile.seesawTimerMs * tilesCount, speed: Config.OBSTACLE_SPEEDS.seesaw };
        if (terrain === 'tunnel') return { timer: profile.tunnelTimerMs * tilesCount, speed: profile.speed };

        // Corrected 300mm cell piecewise kinematics:
        // Single cell: 120ms ramp-up (55mm) + 120ms cruise (190mm) + 120ms ramp-down (55mm) = 360ms
        if (tilesCount === 1) {
            return { timer: profile.baseTimerMs, speed: profile.speed };
        }
        // Multi-cell cruise: 110mm total ramp distance (240ms ramp time)
        // Cruise distance = tilesCount * 300mm - 110mm
        // Cruise time at 0.92 mm/ms = cruiseDist / 0.92
        const totalDistMm = tilesCount * 300;
        const cruiseDistMm = totalDistMm - 110;
        const cruiseTimeMs = Math.round(cruiseDistMm / 0.92);
        const calibratedTimerMs = 240 + cruiseTimeMs;

        return {
            timer: calibratedTimerMs,
            speed: profile.speed
        };
    }"""
    content = content[:OLD_CALC_TIMING.start()] + NEW_CALC_TIMING + content[OLD_CALC_TIMING.end():]
    print("Replaced calculateStepTiming with exact kinematic piecewise model")

# Update C++ Header Macro in CodeGenerator
content = re.sub(
    r'#define TIME_FLAT\(n\)\s+\([\s\S]*?\)',
    r'#define TIME_FLAT(n) ( (n) == 1 ? T_FLAT_BASE : (240 + (int)(((n) * 300 - 110) / 0.92f)) )',
    content
)

# Synchronize SetFront and Servo Drops in solveMission
OLD_SOLVE_MISSION = re.search(r'static solveMission\(gridManager, profile\) \{[\s\S]*?\n        return nodes;\n    \}', content)
if OLD_SOLVE_MISSION:
    NEW_SOLVE_MISSION = """static solveMission(gridManager, profile) {
        const { start, finish, checkpoints, drops } = gridManager.getSpecialCells();
        if (!start) throw new Error('MISSION_ABORT: No START tile found on arena. Place START tile first.');
        if (checkpoints.length === 0 && drops.length === 0 && !finish) {
            throw new Error('MISSION_ABORT: No mission goals found (Checkpoint / Drop / Finish).');
        }

        const nodes = [];
        let currentCellIdx = start.index;
        nodes.push({
            cellIdx: currentCellIdx,
            fn: 'FF',
            speed: profile.speed,
            timer: profile.baseTimerMs,
            dist: 1,
            terrain: 'flat',
            leg: 'START'
        });

        const unvisited = [...checkpoints, ...drops];
        let legCounter = 1;

        while (unvisited.length > 0) {
            let bestPath = null;
            let bestTargetIdx = -1;
            let minDistance = Infinity;

            for (let i = 0; i < unvisited.length; i++) {
                const path = this.findShortestPathBFS(currentCellIdx, unvisited[i].index, gridManager);
                if (path && path.length < minDistance) {
                    minDistance = path.length;
                    bestPath = path;
                    bestTargetIdx = i;
                }
            }

            if (!bestPath) throw new Error('ROUTE_ERROR: Target unreachable (blocked by walls or black holes)!');

            const targetNode = unvisited[bestTargetIdx];
            const isDropTarget = targetNode.type.startsWith('drop');
            const segments = this.extractSmoothSegments(bestPath, gridManager);
            const currentLegName = legCounter <= 4 ? `BOX${legCounter}` : 'END';

            for (const seg of segments) {
                const { timer, speed } = this.calculateStepTiming(seg.terrain, seg.tilesCount, profile);
                nodes.push({
                    cellIdx: seg.to,
                    fn: 'FF',
                    speed,
                    timer,
                    dist: seg.tilesCount,
                    terrain: seg.terrain,
                    leg: currentLegName
                });

                // Synchronize line squaring alignment after crossing physical obstacles
                if (['bump', 'bridge', 'seesaw'].includes(seg.terrain)) {
                    nodes.push({
                        cellIdx: seg.to,
                        fn: 'SetFront',
                        speed: 20,
                        timer: profile.recoilTimerMs,
                        dist: 0,
                        terrain: seg.terrain,
                        leg: currentLegName,
                        note: 'Perpendicular line squaring error reset'
                    });
                }
            }

            // If entering a drop zone: align and release package
            if (isDropTarget) {
                nodes.push({
                    cellIdx: targetNode.index,
                    fn: 'SetFront',
                    speed: 20,
                    timer: profile.recoilTimerMs,
                    dist: 0,
                    terrain: 'flat',
                    leg: currentLegName,
                    note: 'Square line alignment before package release'
                });

                const servoConfig = Config.SERVO_CONFIGS.THREE_DROP;
                const dropFn = servoConfig[(legCounter - 1) % servoConfig.length].slice(0, -2);
                nodes.push({
                    cellIdx: targetNode.index,
                    fn: dropFn,
                    speed: 0,
                    timer: 350,
                    dist: 0,
                    terrain: 'flat',
                    leg: currentLegName,
                    note: `Release rescue cube (+15 pts)`
                });
            }

            // Retreat straight (BB) out of the drop corridor
            if (isDropTarget && bestPath.length >= 2) {
                const retreatCell = bestPath[bestPath.length - 2];
                nodes.push({
                    cellIdx: retreatCell,
                    fn: 'BB',
                    speed: profile.speed,
                    timer: profile.baseTimerMs,
                    dist: 1,
                    terrain: 'flat',
                    leg: currentLegName,
                    note: 'Retreat straight out of drop zone to main corridor'
                });
                currentCellIdx = retreatCell;
                legCounter++;
            } else {
                currentCellIdx = targetNode.index;
            }

            unvisited.splice(bestTargetIdx, 1);
        }

        // Final leg to FINISH
        if (finish) {
            const path = this.findShortestPathBFS(currentCellIdx, finish.index, gridManager);
            if (path) {
                const segments = this.extractSmoothSegments(path, gridManager);
                for (const seg of segments) {
                    const { timer, speed } = this.calculateStepTiming(seg.terrain, seg.tilesCount, profile);
                    nodes.push({
                        cellIdx: seg.to,
                        fn: 'FF',
                        speed,
                        timer,
                        dist: seg.tilesCount,
                        terrain: seg.terrain,
                        leg: 'END'
                    });

                    if (['bump', 'bridge', 'seesaw'].includes(seg.terrain)) {
                        nodes.push({
                            cellIdx: seg.to,
                            fn: 'SetFront',
                            speed: 20,
                            timer: profile.recoilTimerMs,
                            dist: 0,
                            terrain: seg.terrain,
                            leg: 'END',
                            note: 'Line squaring error reset'
                        });
                    }
                }
                nodes.push({
                    cellIdx: finish.index,
                    fn: 'STOP',
                    speed: 0,
                    timer: 0,
                    dist: 0,
                    terrain: 'flat',
                    leg: 'END',
                    note: 'Full stop in finish goal zone (+10 pts)'
                });
            }
        }

        return nodes;
    }"""
    content = content[:OLD_SOLVE_MISSION.start()] + NEW_SOLVE_MISSION + content[OLD_SOLVE_MISSION.end():]
    print("Synchronized solveMission trajectory with SetFront and Drop actions")

# =============================================================================
# 6. HARDEN importMissionJSON AGAINST DOS & SCHEMA CORRUPTION
# =============================================================================
OLD_IMPORT = re.search(r'importMissionJSON\(event\) \{[\s\S]*?\n    \}', content)
if OLD_IMPORT:
    NEW_IMPORT = """importMissionJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Harden against file DoS
        if (file.size > 2 * 1024 * 1024) {
            ToastService.show('Import Rejected: File exceeds 2MB safety threshold', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (typeof parsed !== 'object' || parsed === null) throw new Error('Root payload must be an object');

                const cols = Number(parsed.COLS);
                const rows = Number(parsed.ROWS);
                if (!Number.isInteger(cols) || cols < Config.ARENA.MIN_DIMENSION || cols > Config.ARENA.MAX_DIMENSION) {
                    throw new Error(`Invalid COLS (${Config.ARENA.MIN_DIMENSION}-${Config.ARENA.MAX_DIMENSION})`);
                }
                if (!Number.isInteger(rows) || rows < Config.ARENA.MIN_DIMENSION || rows > Config.ARENA.MAX_DIMENSION) {
                    throw new Error(`Invalid ROWS (${Config.ARENA.MIN_DIMENSION}-${Config.ARENA.MAX_DIMENSION})`);
                }
                if (!Array.isArray(parsed.gridData) || parsed.gridData.length !== cols * rows) {
                    throw new Error(`gridData array length must match ${cols * rows}`);
                }

                // Stop any running simulation before mutating state
                this.stopPreview();
                this.gridManager.deserialize(parsed);
                this.pathNodes = Array.isArray(parsed.pathNodes) ? parsed.pathNodes : [];
                this.selectedNodeIdx = null;

                if (this.dom.colsInput) this.dom.colsInput.value = cols;
                if (this.dom.rowsInput) this.dom.rowsInput.value = rows;

                this.resizeArenaCanvas();
                this.initGrid();
                this.renderPath();
                this.updateConfigPanel();
                if (this.theater3D) this.theater3D.requestRender();
                ToastService.show('Mission successfully validated and loaded', 'success');
            } catch (err) {
                ToastService.show(`Import Rejected: ${err.message}`, 'error');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    }"""
    content = content[:OLD_IMPORT.start()] + NEW_IMPORT + content[OLD_IMPORT.end():]
    print("Hardened importMissionJSON against DoS and invalid schema")

# =============================================================================
# 7. RESOLVE SPACEBAR & KEYBOARD SHORTCUT CONFLICTS
# =============================================================================
OLD_KEYDOWN = re.search(r'_handleKeydown\(event\) \{[\s\S]*?\n    \}', content)
if OLD_KEYDOWN:
    NEW_KEYDOWN = """_handleKeydown(event) {
        const tag = event.target.tagName;
        const isInputOrInteractive = ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) ||
                                     event.target.isContentEditable ||
                                     event.target.closest('#shortcutsModal') ||
                                     event.target.closest('#lineStyleModal');

        if (isInputOrInteractive) {
            if (event.key === 'Escape') {
                this.closeAllModals();
            }
            return;
        }

        // Prevent Spacebar conflicts with button focus
        if (event.key === ' ' || event.code === 'Space') {
            if (tag === 'BUTTON') return; // Allow native button activation without hijacking!
            event.preventDefault();
            this.togglePreview();
            return;
        }

        if (event.key === 'Escape') {
            this.closeAllModals();
            return;
        }

        if (event.key === 'a' || event.key === 'A') {
            event.preventDefault();
            this.autoCalculateMission();
            return;
        }

        if (event.key === '1') {
            this.setMode(1);
            return;
        }

        if (event.key === '2') {
            this.setMode(2);
            return;
        }

        if (event.key === 't' || event.key === 'T') {
            this.toggleTheme();
            return;
        }

        if (event.key === 'm' || event.key === 'M') {
            this.toggleAudio();
            return;
        }

        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (this.selectedNodeIdx !== null) {
                this.deleteNode();
            }
        }
    }"""
    content = content[:OLD_KEYDOWN.start()] + NEW_KEYDOWN + content[OLD_KEYDOWN.end():]
    print("Resolved Spacebar and form element keydown conflicts")

# =============================================================================
# 8. WCAG 2.1 AA MODAL FOCUS TRAPPING & ESCAPE RESTORATION
# =============================================================================
MODAL_HELPERS = """
// WCAG 2.1 AA Accessible Focus Trapping & Restoration
let lastFocusedElement = null;

function trapFocus(modalEl) {
    const focusable = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    modalEl.onkeydown = (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        } else if (e.key === 'Escape') {
            closeShortcutsModal();
        }
    };
    first.focus();
}

function openShortcutsModal() {
    lastFocusedElement = document.activeElement;
    const modal = document.getElementById('shortcutsModal');
    modal.style.display = 'flex';
    trapFocus(modal);
}

function closeShortcutsModal(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('icon-btn') && e.target.textContent !== '✕') return;
    const modal = document.getElementById('shortcutsModal');
    modal.style.display = 'none';
    modal.onkeydown = null;
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}
"""

content = content.replace(
    "function openShortcutsModal() { uiController.openShortcutsModal(); }",
    "// Replaced with accessible WCAG modal handler",
    1
)
content = content.replace(
    "function closeShortcutsModal(e) { uiController.closeShortcutsModal(e); }",
    MODAL_HELPERS,
    1
)

# Also ensure closeAllModals method exists on UIController
content = content.replace(
    "    closeAllDropdowns() {",
    """    closeAllModals() {
        if (this.dom.lineStyleModal) this.dom.lineStyleModal.style.display = 'none';
        const shortcuts = document.getElementById('shortcutsModal');
        if (shortcuts) shortcuts.style.display = 'none';
        this.closeAllDropdowns();
        if (lastFocusedElement) {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
    }

    closeAllDropdowns() {""",
    1
)

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Finished applying all refactors! Output size:", len(content))
