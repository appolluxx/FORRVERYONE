const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../web.html');
let html = fs.readFileSync(targetFile, 'utf8');

console.log('Original size:', html.length);

// 1. Locate Isometric3DTheater start and SimulationController start
const isoMarker = 'class Isometric3DTheater {';
const simMarker = 'class SimulationController {';

const isoIdx = html.indexOf(isoMarker);
const simIdx = html.indexOf(simMarker);

if (isoIdx === -1 || simIdx === -1) {
    console.error('Could not find class Isometric3DTheater or class SimulationController');
    process.exit(1);
}

// Find header comment before Isometric3DTheater
const headerComment = '// =============================================================================\r\n// 1.7 HARDWARE-ACCELERATED 3D ISOMETRIC ARENA THEATER (PURE HTML5 CANVAS)\r\n// =============================================================================\r\n';
let replaceStart = html.lastIndexOf('// =============================================================================', isoIdx);
if (replaceStart === -1) replaceStart = isoIdx;

const THREE_D_CLASS = `// =============================================================================
// 1.7 ADVANCED THREE.JS WEBGL 3D TACTICAL ARENA THEATER
// Full 3D Physics Simulation, PBR Shading, Dynamic Lighting & OrbitControls
// =============================================================================
class ThreeDTheater {
    constructor(container, gridManagerProvider) {
        this.container = container;
        this.getGridManager = gridManagerProvider;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this.arenaGroup = null;
        this.robotGroup = null;
        this.pathLineMesh = null;
        this.droppedCubesGroup = null;

        this.seesawPivots = {}; // cellIdx -> THREE.Group
        this.wheelMeshes = [];
        this.statusLed = null;
        this.statusLedLight = null;

        this.followRobot = false;
        this.robotPos = { x: 0, y: 0, z: 0, heading: 0, wheelAngle: 0, recoil: 0 };

        this.isInitialized = false;
        this.rafId = null;

        this.init();
    }

    init() {
        if (typeof THREE === 'undefined') {
            console.warn('[ThreeDTheater] THREE.js not available yet, retrying...');
            setTimeout(() => this.init(), 100);
            return;
        }

        const width = this.container.clientWidth || 720;
        const height = this.container.clientHeight || 380;

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0f1d);
        this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.00032);

        // 2. Camera (Perspective millimeter space)
        this.camera = new THREE.PerspectiveCamera(40, width / height, 20, 10000);
        this.camera.position.set(0, 1400, 1600);

        // 3. Renderer with Soft Shadows & Antialiasing
        try {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        } catch (e) {
            console.warn('[ThreeDTheater] WebGLRenderer creation failed:', e);
            return;
        }

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (THREE.sRGBEncoding) this.renderer.outputEncoding = THREE.sRGBEncoding;

        // Clean existing canvases in container
        const oldCanvas = this.container.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();
        this.container.prepend(this.renderer.domElement);

        // 4. OrbitControls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't dip below table
            this.controls.minDistance = 300;
            this.controls.maxDistance = 3800;
            this.controls.target.set(0, 0, 0);
        }

        // 5. Lighting
        this._setupLighting();

        // 6. Arena Groups
        this.arenaGroup = new THREE.Group();
        this.scene.add(this.arenaGroup);

        this.droppedCubesGroup = new THREE.Group();
        this.scene.add(this.droppedCubesGroup);

        // 7. Build Arena & Robot
        this.rebuildArena();
        this._buildRobotModel();

        // 8. Event Listeners
        window.addEventListener('resize', () => this.handleResize(), { passive: true });

        this.isInitialized = true;
        this._startAnimationLoop();
    }

    _setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.62);
        this.scene.add(ambient);

        const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.35);
        this.scene.add(hemiLight);

        // Key Sun Light with Shadow Camera
        const sun = new THREE.DirectionalLight(0xfff7ed, 0.85);
        sun.position.set(700, 1500, 900);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 200;
        sun.shadow.camera.far = 4000;
        sun.shadow.camera.left = -1600;
        sun.shadow.camera.right = 1600;
        sun.shadow.camera.top = 1100;
        sun.shadow.camera.bottom = -1100;
        sun.shadow.bias = -0.0006;
        this.scene.add(sun);

        // Cool Blue Specular Rim Light
        const rim = new THREE.DirectionalLight(0x38bdf8, 0.4);
        rim.position.set(-1100, 800, -900);
        this.scene.add(rim);
    }

    _startAnimationLoop() {
        const animate = () => {
            this.rafId = requestAnimationFrame(animate);

            // LED pulse animation
            if (this.statusLedLight) {
                this.statusLedLight.intensity = 0.8 + Math.sin(Date.now() * 0.006) * 0.4;
            }

            if (this.controls) {
                if (this.followRobot && this.robotGroup) {
                    const rPos = this.robotGroup.position;
                    const hRad = this.robotGroup.rotation.y;
                    const offsetDistance = 650;
                    const offsetHeight = 480;

                    const targetCamX = rPos.x - Math.sin(hRad) * offsetDistance;
                    const targetCamZ = rPos.z - Math.cos(hRad) * offsetDistance;

                    this.camera.position.lerp(new THREE.Vector3(targetCamX, offsetHeight, targetCamZ), 0.08);
                    this.controls.target.lerp(new THREE.Vector3(rPos.x, rPos.y + 20, rPos.z), 0.12);
                }
                this.controls.update();
            }

            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        this.rafId = requestAnimationFrame(animate);
    }

    handleResize() {
        if (!this.renderer || !this.camera) return;
        const width = this.container.clientWidth || 720;
        const height = this.container.clientHeight || 380;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    requestRender() {
        this.render();
    }

    // Convert Cell & Grid indices to 3D world millimeter coordinates (Centered around 0,0)
    gridToWorld(col, row) {
        const grid = this.getGridManager();
        const cols = grid.cols || 8;
        const rows = grid.rows || 4;
        const arenaW = cols * 300;
        const arenaD = rows * 300;

        const x = (col * 300 + 150) - arenaW / 2;
        const z = (row * 300 + 150) - arenaD / 2;
        return { x, z, arenaW, arenaD };
    }

    rebuildArena() {
        if (!this.scene || !this.arenaGroup) return;

        // Clear existing arena meshes
        while (this.arenaGroup.children.length > 0) {
            const obj = this.arenaGroup.children[0];
            this.arenaGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
        }
        this.seesawPivots = {};

        const grid = this.getGridManager();
        const cols = grid.cols || 8;
        const rows = grid.rows || 4;
        const arenaW = cols * 300;
        const arenaD = rows * 300;

        // 1. Beveled Table Pedestal
        const tableGeo = new THREE.BoxGeometry(arenaW + 80, 36, arenaD + 80);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.25 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, -18, 0);
        table.receiveShadow = true;
        this.arenaGroup.add(table);

        // 2. Build 32 Cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellIdx = r * cols + c;
                const cell = grid.getCell(cellIdx) || { type: 'empty' };
                this._buildCell3D(c, r, cell, cellIdx);
            }
        }
    }

    _buildCell3D(col, row, cell, cellIdx) {
        const { x, z } = this.gridToWorld(col, row);
        const cellGroup = new THREE.Group();
        cellGroup.position.set(x, 0, z);

        // Tile Floor Plane
        let tileColor = 0xf8fafc;
        if (cell.type === 'start') tileColor = 0xdcfce7;
        else if (cell.type === 'finish') tileColor = 0xfee2e2;
        else if (cell.type === 'checkpoint') tileColor = 0xfef3c7;
        else if (cell.type === 'tunnel') tileColor = 0x1e293b;
        else if (cell.type === 'blackhole') tileColor = 0x020617;

        const floorGeo = new THREE.PlaneGeometry(298, 298);
        const floorMat = new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.6, metalness: 0.05 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.2;
        floor.receiveShadow = true;
        cellGroup.add(floor);

        // 20mm Scaled Black Boundary Lines
        const bw = 20;
        const borderMat = new THREE.MeshBasicMaterial({ color: 0x090a0f });
        const addBorder = (bx, bz, bwX, bwZ) => {
            const bGeo = new THREE.PlaneGeometry(bwX, bwZ);
            const bMesh = new THREE.Mesh(bGeo, borderMat);
            bMesh.rotation.x = -Math.PI / 2;
            bMesh.position.set(bx, 0.4, bz);
            cellGroup.add(bMesh);
        };

        if (cell.type.includes('line_top') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_w' || cell.type === 'drop_e') {
            addBorder(0, -150 + bw / 2, 300, bw);
        }
        if (cell.type.includes('line_bottom') || cell.type === 'line_surround' || cell.type === 'drop_s' || cell.type === 'drop_w' || cell.type === 'drop_e') {
            addBorder(0, 150 - bw / 2, 300, bw);
        }
        if (cell.type.includes('line_left') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_s' || cell.type === 'drop_w') {
            addBorder(-150 + bw / 2, 0, bw, 300);
        }
        if (cell.type.includes('line_right') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_s' || cell.type === 'drop_e') {
            addBorder(150 - bw / 2, 0, bw, 300);
        }

        // Special 3D Obstacles
        if (cell.type === 'bridge') {
            this._buildBridgeMesh(cellGroup);
        } else if (cell.type === 'seesaw') {
            this._buildSeesawMesh(cellGroup, cellIdx);
        } else if (cell.type === 'bump') {
            this._buildBumpsMesh(cellGroup);
        } else if (cell.type === 'tunnel') {
            this._buildTunnelMesh(cellGroup);
        } else if (cell.type.startsWith('drop_')) {
            this._buildDropBayMesh(cellGroup, cell.type);
        } else if (cell.type === 'checkpoint') {
            this._buildCheckpointMesh(cellGroup);
        } else if (cell.type === 'start') {
            this._buildStartFinishBadge(cellGroup, 'START', 0x10b981);
        } else if (cell.type === 'finish') {
            this._buildStartFinishBadge(cellGroup, 'FINISH', 0xef4444);
        }

        this.arenaGroup.add(cellGroup);
    }

    _buildBridgeMesh(parent) {
        const bridgeGroup = new THREE.Group();
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.5 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.85 });

        // Flat Center Deck (50mm high)
        const deckGeo = new THREE.BoxGeometry(140, 6, 270);
        const deck = new THREE.Mesh(deckGeo, bridgeMat);
        deck.position.set(0, 47, 0);
        deck.castShadow = true;
        deck.receiveShadow = true;
        bridgeGroup.add(deck);

        // Incline Ramp
        const rampInGeo = new THREE.BoxGeometry(82, 6, 270);
        const rampIn = new THREE.Mesh(rampInGeo, bridgeMat);
        rampIn.position.set(-110, 24, 0);
        rampIn.rotation.z = Math.atan2(47, 80);
        rampIn.castShadow = true;
        rampIn.receiveShadow = true;
        bridgeGroup.add(rampIn);

        // Decline Ramp
        const rampOut = new THREE.Mesh(rampInGeo, bridgeMat);
        rampOut.position.set(110, 24, 0);
        rampOut.rotation.z = -Math.atan2(47, 80);
        rampOut.castShadow = true;
        rampOut.receiveShadow = true;
        bridgeGroup.add(rampOut);

        // Side Guard Rails
        [-130, 130].forEach(zOffset => {
            const railGeo = new THREE.CylinderGeometry(3, 3, 290, 8);
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.rotation.z = Math.PI / 2;
            rail.position.set(0, 65, zOffset);
            rail.castShadow = true;
            bridgeGroup.add(rail);

            [-100, 0, 100].forEach(xOffset => {
                const postGeo = new THREE.CylinderGeometry(2.5, 2.5, 45, 8);
                const post = new THREE.Mesh(postGeo, railMat);
                post.position.set(xOffset, 40, zOffset);
                bridgeGroup.add(post);
            });
        });

        parent.add(bridgeGroup);
    }

    _buildSeesawMesh(parent, cellIdx) {
        const seesawGroup = new THREE.Group();

        // Triangular Fulcrum Pivot
        const fulcrumGeo = new THREE.ConeGeometry(18, 22, 4);
        const fulcrumMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.3 });
        const fulcrum = new THREE.Mesh(fulcrumGeo, fulcrumMat);
        fulcrum.rotation.y = Math.PI / 4;
        fulcrum.position.set(0, 11, 0);
        fulcrum.castShadow = true;
        seesawGroup.add(fulcrum);

        // Tilting Dynamic Board Pivot
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(0, 22, 0);

        const plankGeo = new THREE.BoxGeometry(280, 8, 240);
        const plankMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.2 });
        const plank = new THREE.Mesh(plankGeo, plankMat);
        plank.castShadow = true;
        plank.receiveShadow = true;
        pivotGroup.add(plank);

        seesawGroup.add(pivotGroup);
        this.seesawPivots[cellIdx] = pivotGroup;
        parent.add(seesawGroup);
    }

    _buildBumpsMesh(parent) {
        const bumpMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.55, metalness: 0.1 });
        for (let i = 0; i < 7; i++) {
            const bx = -105 + i * 35;
            const bumpGeo = new THREE.CylinderGeometry(3.5, 3.5, 260, 12);
            const bump = new THREE.Mesh(bumpGeo, bumpMat);
            bump.rotation.x = Math.PI / 2;
            bump.position.set(bx, 3.5, 0);
            bump.castShadow = true;
            bump.receiveShadow = true;
            parent.add(bump);
        }
    }

    _buildTunnelMesh(parent) {
        const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.3 });
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

        // 4 Pillars
        [-130, 130].forEach(px => {
            [-130, 130].forEach(pz => {
                const pillarGeo = new THREE.BoxGeometry(16, 62, 16);
                const pillar = new THREE.Mesh(pillarGeo, tunnelMat);
                pillar.position.set(px, 31, pz);
                pillar.castShadow = true;
                parent.add(pillar);
            });
        });

        // Arch Roof
        const roofGeo = new THREE.BoxGeometry(276, 8, 276);
        const roof = new THREE.Mesh(roofGeo, tunnelMat);
        roof.position.set(0, 62, 0);
        roof.castShadow = true;
        parent.add(roof);

        // Neon Glow Trim
        const trimGeo = new THREE.BoxGeometry(280, 2, 4);
        [-138, 138].forEach(tz => {
            const trim = new THREE.Mesh(trimGeo, neonMat);
            trim.position.set(0, 66, tz);
            parent.add(trim);
        });
    }

    _buildDropBayMesh(parent, dropType) {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.3 });
        const wallH = 28;
        const wallT = 16;

        // 3-Sided Containment Walls
        const walls = [];
        if (dropType === 'drop_n') {
            walls.push({ x: 0, z: -150 + wallT / 2, w: 300, d: wallT });
            walls.push({ x: -150 + wallT / 2, z: 0, w: wallT, d: 300 });
            walls.push({ x: 150 - wallT / 2, z: 0, w: wallT, d: 300 });
        } else if (dropType === 'drop_s') {
            walls.push({ x: 0, z: 150 - wallT / 2, w: 300, d: wallT });
            walls.push({ x: -150 + wallT / 2, z: 0, w: wallT, d: 300 });
            walls.push({ x: 150 - wallT / 2, z: 0, w: wallT, d: 300 });
        } else if (dropType === 'drop_e') {
            walls.push({ x: 150 - wallT / 2, z: 0, w: wallT, d: 300 });
            walls.push({ x: 0, z: -150 + wallT / 2, w: 300, d: wallT });
            walls.push({ x: 0, z: 150 - wallT / 2, w: 300, d: wallT });
        } else {
            walls.push({ x: -150 + wallT / 2, z: 0, w: wallT, d: 300 });
            walls.push({ x: 0, z: -150 + wallT / 2, w: 300, d: wallT });
            walls.push({ x: 0, z: 150 - wallT / 2, w: 300, d: wallT });
        }

        walls.forEach(w => {
            const wGeo = new THREE.BoxGeometry(w.w, wallH, w.d);
            const wMesh = new THREE.Mesh(wGeo, wallMat);
            wMesh.position.set(w.x, wallH / 2, w.z);
            wMesh.castShadow = true;
            wMesh.receiveShadow = true;
            parent.add(wMesh);
        });

        // Glowing Blue Target Disc
        const targetGeo = new THREE.CylinderGeometry(28, 28, 2, 24);
        const targetMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.6 });
        const target = new THREE.Mesh(targetGeo, targetMat);
        target.position.set(0, 1, 0);
        parent.add(target);
    }

    _buildCheckpointMesh(parent) {
        const discGeo = new THREE.CylinderGeometry(28, 28, 3, 24);
        const discMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.5, metalness: 0.4 });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.position.set(0, 1.5, 0);
        disc.castShadow = true;
        parent.add(disc);

        // Floating Hologram Beacon Ring
        const ringGeo = new THREE.TorusGeometry(32, 1.5, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, 20, 0);
        parent.add(ring);
    }

    _buildStartFinishBadge(parent, label, colorHex) {
        const badgeGeo = new THREE.BoxGeometry(160, 4, 160);
        const badgeMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4, metalness: 0.2 });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(0, 2, 0);
        badge.receiveShadow = true;
        parent.add(badge);
    }

    _buildRobotModel() {
        if (!this.scene) return;
        if (this.robotGroup) this.scene.remove(this.robotGroup);

        this.robotGroup = new THREE.Group();
        this.wheelMeshes = [];

        // Main 180x180x32 Carbon Chassis
        const chassisGeo = new THREE.BoxGeometry(176, 26, 176);
        const chassisMat = new THREE.MeshStandardMaterial({ color: 0x182030, metalness: 0.5, roughness: 0.35 });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.set(0, 21, 0);
        chassis.castShadow = true;
        this.robotGroup.add(chassis);

        // Anodized Aluminum Top Plate with Bevels
        const plateGeo = new THREE.BoxGeometry(152, 4, 152);
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x0071e3, metalness: 0.8, roughness: 0.2 });
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(0, 36, 0);
        plate.castShadow = true;
        this.robotGroup.add(plate);

        // ESP32-WROOM MCU Shield
        const mcuGeo = new THREE.BoxGeometry(32, 5, 26);
        const mcuMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.9, roughness: 0.2 });
        const mcu = new THREE.Mesh(mcuGeo, mcuMat);
        mcu.position.set(0, 40, -10);
        this.robotGroup.add(mcu);

        // Blinking Green Status LED
        const ledGeo = new THREE.SphereGeometry(3, 12, 12);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        this.statusLed = new THREE.Mesh(ledGeo, ledMat);
        this.statusLed.position.set(20, 41, -10);
        this.robotGroup.add(this.statusLed);

        this.statusLedLight = new THREE.PointLight(0x10b981, 1.2, 70);
        this.statusLedLight.position.set(20, 43, -10);
        this.robotGroup.add(this.statusLedLight);

        // Direction Arrow (Orange Nose Cone)
        const noseGeo = new THREE.ConeGeometry(8, 16, 12);
        const noseMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.rotation.x = -Math.PI / 2;
        nose.position.set(0, 40, -68);
        this.robotGroup.add(nose);

        // 4 High-Grip Rubber Wheels with Silver Hubs
        const wheelGeo = new THREE.CylinderGeometry(21.5, 21.5, 22, 24);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.1 });
        const hubMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });

        const wheelPositions = [
            { x: -94, z: -55 }, // Front-Left
            { x: 94, z: -55 },  // Front-Right
            { x: -94, z: 55 },  // Rear-Left
            { x: 94, z: 55 }   // Rear-Right
        ];

        wheelPositions.forEach(wp => {
            const wheelHolder = new THREE.Group();
            wheelHolder.position.set(wp.x, 21.5, wp.z);

            const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
            wheelMesh.rotation.z = Math.PI / 2;
            wheelMesh.castShadow = true;
            wheelHolder.add(wheelMesh);

            const hubGeo = new THREE.CylinderGeometry(9, 9, 23, 16);
            const hubMesh = new THREE.Mesh(hubGeo, hubMat);
            hubMesh.rotation.z = Math.PI / 2;
            wheelHolder.add(hubMesh);

            this.robotGroup.add(wheelHolder);
            this.wheelMeshes.push(wheelMesh);
        });

        // 3D Rescue Payload Cubes Mounted on Robot
        [-35, 0, 35].forEach((offset) => {
            const cubeGeo = new THREE.BoxGeometry(26, 26, 26);
            const cubeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.2 });
            const cube = new THREE.Mesh(cubeGeo, cubeMat);
            cube.position.set(offset, 51, 35);
            cube.castShadow = true;
            this.robotGroup.add(cube);
        });

        this.scene.add(this.robotGroup);
    }

    updateRobotPosition(xMm, yMm, headingDeg, moving = true, recoil = 0) {
        if (!this.robotGroup) return;

        const grid = this.getGridManager();
        const cols = grid.cols || 8;
        const rows = grid.rows || 4;
        const arenaW = cols * 300;
        const arenaD = rows * 300;

        // Heading in Three.js (0 = North: -Z, 90 = East: +X, 180 = South: +Z, 270 = West: -X)
        const radHeading = (headingDeg * Math.PI) / 180;

        // Apply recoil offset along heading vector
        const worldX = (xMm - arenaW / 2) - Math.sin(radHeading) * recoil;
        const worldZ = (yMm - arenaD / 2) + Math.cos(radHeading) * recoil;

        // Vertical elevation check (Bridge / Seesaw)
        const col = Math.floor(xMm / 300);
        const row = Math.floor(yMm / 300);
        const cellIdx = row * cols + col;
        const cell = grid.getCell(cellIdx);
        let worldY = 0;

        if (cell) {
            if (cell.type === 'bridge') {
                const subX = (xMm % 300) / 300;
                if (subX < 0.28) worldY = (subX / 0.28) * 50;
                else if (subX > 0.72) worldY = ((1 - subX) / 0.28) * 50;
                else worldY = 50;
            } else if (cell.type === 'seesaw') {
                const subX = (xMm % 300) / 300;
                const tiltRad = ((subX - 0.5) * 22 * Math.PI) / 180;
                if (this.seesawPivots[cellIdx]) {
                    this.seesawPivots[cellIdx].rotation.z = tiltRad;
                }
                worldY = 22 + (subX - 0.5) * 28;
            }
        }

        this.robotGroup.position.set(worldX, worldY, worldZ);
        this.robotGroup.rotation.y = -radHeading + Math.PI; // Match forward nose

        // Wheel Rotation Animation
        if (moving) {
            this.wheelMeshes.forEach(w => {
                w.rotation.x += 0.25;
            });
        }
    }

    dropCube(cellIdx) {
        if (!this.scene || !this.droppedCubesGroup) return;
        const grid = this.getGridManager();
        const col = cellIdx % (grid.cols || 8);
        const row = Math.floor(cellIdx / (grid.cols || 8));
        const { x, z } = this.gridToWorld(col, row);

        const cubeGeo = new THREE.BoxGeometry(34, 34, 34);
        const cubeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.25 });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set(x, 17, z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.droppedCubesGroup.add(cube);

        if (typeof audioFX !== 'undefined' && audioFX.playDrop) audioFX.playDrop();
    }

    clearDroppedCubes() {
        if (!this.droppedCubesGroup) return;
        while (this.droppedCubesGroup.children.length > 0) {
            const c = this.droppedCubesGroup.children[0];
            this.droppedCubesGroup.remove(c);
            if (c.geometry) c.geometry.dispose();
        }
        Object.values(this.seesawPivots).forEach(p => {
            if (p) p.rotation.z = 0;
        });
    }

    updateTrajectoryLine(pathNodes) {
        if (!this.scene) return;
        if (this.pathLineMesh) {
            this.scene.remove(this.pathLineMesh);
            if (this.pathLineMesh.geometry) this.pathLineMesh.geometry.dispose();
            this.pathLineMesh = null;
        }

        if (!pathNodes || pathNodes.length < 2) return;

        const points = [];
        pathNodes.forEach(node => {
            const grid = this.getGridManager();
            const col = grid.getCol(node.cellIdx);
            const row = grid.getRow(node.cellIdx);
            const { x, z } = this.gridToWorld(col, row);
            const y = node.terrain === 'bridge' ? 52 : 3.5;
            points.push(new THREE.Vector3(x, y, z));
        });

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineDashedMaterial({ color: 0x00f0ff, dashSize: 25, gapSize: 12, linewidth: 3 });
        this.pathLineMesh = new THREE.Line(lineGeo, lineMat);
        this.pathLineMesh.computeLineDistances();
        this.scene.add(this.pathLineMesh);
    }

    setCameraPreset(preset) {
        if (!this.camera || !this.controls) return;
        this.followRobot = false;

        if (preset === 'iso') {
            this.camera.position.set(0, 1400, 1600);
            this.controls.target.set(0, 0, 0);
        } else if (preset === 'top') {
            this.camera.position.set(0, 2400, 10);
            this.controls.target.set(0, 0, 0);
        } else if (preset === 'front') {
            this.camera.position.set(0, 400, 1450);
            this.controls.target.set(0, 50, 0);
        }
        if (typeof audioFX !== 'undefined' && audioFX.playClick) audioFX.playClick();
    }

    toggleFollow() {
        this.followRobot = !this.followRobot;
        if (typeof audioFX !== 'undefined' && audioFX.playClick) audioFX.playClick();
        return this.followRobot;
    }
}

`;

html = html.substring(0, replaceStart) + THREE_D_CLASS + html.substring(simIdx);
console.log('Replaced Isometric3DTheater with ThreeDTheater successfully!');

// 2. Update initGrid() to trigger this.theater3D.rebuildArena()
if (html.includes('this.renderGridCells();')) {
    html = html.replace(
        'this.renderGridCells();\n        this.renderCoordinateAxes();',
        'this.renderGridCells();\n        this.renderCoordinateAxes();\n        if (this.theater3D && this.theater3D.rebuildArena) this.theater3D.rebuildArena();'
    );
    console.log('Hooked rebuildArena into initGrid');
}

// 3. Update _handleSimulationStart() to clear dropped cubes and position robot
const simStartTarget = `    _handleSimulationStart() {
        const btn = this.dom.previewBtn;
        if (btn) {
            btn.innerText = '⏹ Stop';
            btn.classList.add('is-running');
            btn.setAttribute('aria-pressed', 'true');
        }
        if (this.dom.robotPreview) {
            this.dom.robotPreview.style.display = 'block';
        }
    }`;

const simStartReplacement = `    _handleSimulationStart() {
        const btn = this.dom.previewBtn;
        if (btn) {
            btn.innerText = '⏹ Stop';
            btn.classList.add('is-running');
            btn.setAttribute('aria-pressed', 'true');
        }
        if (this.dom.robotPreview) {
            this.dom.robotPreview.style.display = 'block';
        }
        if (this.theater3D) {
            this.theater3D.clearDroppedCubes();
            if (this.pathNodes && this.pathNodes.length > 0) {
                const startNode = this.pathNodes[0];
                const col = this.gridManager.getCol(startNode.cellIdx);
                const row = this.gridManager.getRow(startNode.cellIdx);
                this.theater3D.updateRobotPosition(col * 300 + 150, row * 300 + 150, 0, false);
            }
        }
    }`;

if (html.includes(simStartTarget)) {
    html = html.replace(simStartTarget, simStartReplacement);
    console.log('Updated _handleSimulationStart with 3D cube reset');
}

// 4. Update _handleSimulationStep to sync robot pose and dropped cubes in 3D
const simStepTarget = `    _handleSimulationStep({ x1, y1, x2, y2, angle, moveDuration, isInitial }) {
        const bot = this.dom.robotPreview;
        if (!bot) return;

        if (isInitial) {
            bot.style.transition = 'transform 0.18s ease';
            bot.style.left = \`\${x1}px\`;
            bot.style.top = \`\${y1}px\`;
            bot.style.transform = \`translate(-50%, -50%) rotate(\${angle}deg)\`;
        } else {
            bot.style.transition = \`top \${moveDuration}ms linear, left \${moveDuration}ms linear, transform 0.18s ease\`;
            bot.style.left = \`\${x2}px\`;
            bot.style.top = \`\${y2}px\`;
        }
    }`;

const simStepReplacement = `    _handleSimulationStep({ x1, y1, x2, y2, angle, moveDuration, isInitial, stepIdx, targetNode }) {
        const bot = this.dom.robotPreview;
        if (bot) {
            if (isInitial) {
                bot.style.transition = 'transform 0.18s ease';
                bot.style.left = \`\${x1}px\`;
                bot.style.top = \`\${y1}px\`;
                bot.style.transform = \`translate(-50%, -50%) rotate(\${angle}deg)\`;
            } else {
                bot.style.transition = \`top \${moveDuration}ms linear, left \${moveDuration}ms linear, transform 0.18s ease\`;
                bot.style.left = \`\${x2}px\`;
                bot.style.top = \`\${y2}px\`;
            }
        }

        if (this.theater3D && this.pathNodes && this.pathNodes[stepIdx]) {
            const currentNode = isInitial ? this.pathNodes[stepIdx] : (targetNode || this.pathNodes[stepIdx + 1]);
            if (currentNode) {
                const col = this.gridManager.getCol(currentNode.cellIdx);
                const row = this.gridManager.getRow(currentNode.cellIdx);
                const xMm = col * 300 + 150;
                const yMm = row * 300 + 150;
                this.theater3D.updateRobotPosition(xMm, yMm, angle, !isInitial);
                if (!isInitial && targetNode && targetNode.drop) {
                    this.theater3D.dropCube(targetNode.cellIdx);
                }
                if (this.dom.theater3DTelemetry) {
                    this.dom.theater3DTelemetry.innerHTML = \`<span>X: \${Math.round(xMm)}mm</span><span>|</span><span>Y: \${Math.round(yMm)}mm</span><span>|</span><span>Yaw: \${Math.round(angle)}°</span>\`;
                }
            }
        }
    }`;

if (html.includes(simStepTarget)) {
    html = html.replace(simStepTarget, simStepReplacement);
    console.log('Updated _handleSimulationStep with 3D pose & drop sync');
}

// 5. Update setArenaViewMode('3D') to call handleResize()
if (html.includes('if (this.theater3D) this.theater3D.render();')) {
    html = html.replace(
        'if (this.theater3D) this.theater3D.render();\n            ToastService.show(\'Switched to 3D Isometric Theater\', \'info\');',
        'if (this.theater3D) { this.theater3D.handleResize(); this.theater3D.render(); }\n            ToastService.show(\'Switched to 3D Tactical Arena Theater\', \'info\');'
    );
    console.log('Updated setArenaViewMode 3D transition');
}

// 6. Update _init3DTheater() to also sync trajectory line
const init3DTarget = `    _init3DTheater() {
        if (this.dom.canvas3D) {
            this.theater3D = new ThreeDTheater(this.dom.arena3DContainer, () => this.gridManager);
            // Locate start cell if available
            const startIdx = this.gridManager.cells.findIndex(c => c && c.type === 'start');
            if (startIdx !== -1) {
                const col = this.gridManager.getCol(startIdx);
                const row = this.gridManager.getRow(startIdx);
                this.theater3D.updateRobotPosition(col * 300 + 150, row * 300 + 150, 0, false);
            }
            this.theater3D.render();
        }
    }`;

const init3DReplacement = `    _init3DTheater() {
        if (this.dom.arena3DContainer) {
            this.theater3D = new ThreeDTheater(this.dom.arena3DContainer, () => this.gridManager);
            // Locate start cell if available
            const startIdx = this.gridManager.cells.findIndex(c => c && c.type === 'start');
            if (startIdx !== -1) {
                const col = this.gridManager.getCol(startIdx);
                const row = this.gridManager.getRow(startIdx);
                this.theater3D.updateRobotPosition(col * 300 + 150, row * 300 + 150, 0, false);
            }
            if (this.pathNodes && this.pathNodes.length > 0) {
                this.theater3D.updateTrajectoryLine(this.pathNodes);
            }
            this.theater3D.render();
        }
    }`;

if (html.includes(init3DTarget)) {
    html = html.replace(init3DTarget, init3DReplacement);
    console.log('Updated _init3DTheater');
}

fs.writeFileSync(targetFile, html, 'utf8');
console.log('Saved web.html successfully! New size:', html.length);
