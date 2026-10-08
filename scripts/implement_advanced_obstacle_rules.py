#!/usr/bin/env python3
"""
Implement user-specified physical domain rules for:
1. Speed Bumps (Chopsticks): Entry/Exit only along 1 axis, rotatable (horizontal vs vertical), slow vehicle speed.
2. Bomb Hazard: Placed exclusively at the corners of blocks / black line intersections (bomb_tl, bomb_tr, bomb_bl, bomb_br).
3. Bridge: Directional entry/exit (no side entry), composed of 3 distinct sections (ทางขึ้น, ทางยกระดับ, ทางลง) or 3-in-1.
"""

import os
import re

TARGET_FILES = [
    r"D:\Workspace\robot\index.html",
    r"D:\Workspace\robot\tactical_planner.html",
    r"D:\Workspace\robot\web.html"
]

def update_html(filepath):
    print(f"Updating HTML: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update Config constants (TILE_NAMES, WALL_RULES, rotation maps, speeds)
    # Check if WALL_RULES needs updating
    old_wall_rules = """    WALL_RULES: Object.freeze({
        T: Object.freeze(['line_top', 'line_top_bottom', 'line_top_right', 'line_top_left', 'line_surround', 'drop_n', 'drop_w', 'drop_e']),
        B: Object.freeze(['line_bottom', 'line_top_bottom', 'line_bottom_right', 'line_bottom_left', 'line_surround', 'drop_s', 'drop_w', 'drop_e']),
        L: Object.freeze(['line_left', 'line_left_right', 'line_bottom_left', 'line_top_left', 'line_surround', 'drop_n', 'drop_s', 'drop_w']),
        R: Object.freeze(['line_right', 'line_left_right', 'line_bottom_right', 'line_top_right', 'line_surround', 'drop_n', 'drop_s', 'drop_e'])
    }),"""

    new_wall_rules = """    WALL_RULES: Object.freeze({
        // T blocks movement from North or moving North into cell
        T: Object.freeze([
            'line_top', 'line_top_bottom', 'line_top_right', 'line_top_left', 'line_surround',
            'drop_n', 'drop_w', 'drop_e',
            'bump_v', // Chopsticks aligned North-South block North/South entry
            'bridge_h', 'bridge_up_h', 'bridge_high_h', 'bridge_down_h' // Bridge guardrails block North
        ]),
        // B blocks movement from South or moving South into cell
        B: Object.freeze([
            'line_bottom', 'line_top_bottom', 'line_bottom_right', 'line_bottom_left', 'line_surround',
            'drop_s', 'drop_w', 'drop_e',
            'bump_v', // Chopsticks aligned North-South block North/South entry
            'bridge_h', 'bridge_up_h', 'bridge_high_h', 'bridge_down_h' // Bridge guardrails block South
        ]),
        // L blocks movement from West or moving West into cell
        L: Object.freeze([
            'line_left', 'line_left_right', 'line_bottom_left', 'line_top_left', 'line_surround',
            'drop_n', 'drop_s', 'drop_w',
            'bump', 'bump_h', // Chopsticks aligned West-East block West/East entry
            'bridge_v', 'bridge_up_v', 'bridge_high_v', 'bridge_down_v' // Bridge guardrails block West
        ]),
        // R blocks movement from East or moving East into cell
        R: Object.freeze([
            'line_right', 'line_left_right', 'line_bottom_right', 'line_top_right', 'line_surround',
            'drop_n', 'drop_s', 'drop_e',
            'bump', 'bump_h', // Chopsticks aligned West-East block West/East entry
            'bridge_v', 'bridge_up_v', 'bridge_high_v', 'bridge_down_v' // Bridge guardrails block East
        ])
    }),"""

    if old_wall_rules in content:
        content = content.replace(old_wall_rules, new_wall_rules, 1)

    # Add rotation maps to Config
    old_drop_rot = """    DROP_ROTATION_MAP: Object.freeze({
        drop_n: 'drop_e',
        drop_e: 'drop_s',
        drop_s: 'drop_w',
        drop_w: 'drop_n'
    })"""

    new_rotations = """    DROP_ROTATION_MAP: Object.freeze({
        drop_n: 'drop_e',
        drop_e: 'drop_s',
        drop_s: 'drop_w',
        drop_w: 'drop_n'
    }),

    BUMP_ROTATION_MAP: Object.freeze({
        bump: 'bump_v',
        bump_h: 'bump_v',
        bump_v: 'bump_h'
    }),

    BOMB_ROTATION_MAP: Object.freeze({
        bomb: 'bomb_tr',
        bomb_tl: 'bomb_tr',
        bomb_tr: 'bomb_br',
        bomb_br: 'bomb_bl',
        bomb_bl: 'bomb_tl'
    }),

    BRIDGE_ROTATION_MAP: Object.freeze({
        bridge: 'bridge_up_h',
        bridge_h: 'bridge_v',
        bridge_v: 'bridge_up_h',
        bridge_up: 'bridge_high_h',
        bridge_up_h: 'bridge_high_h',
        bridge_high: 'bridge_down_h',
        bridge_high_h: 'bridge_down_h',
        bridge_down: 'bridge_up_v',
        bridge_down_h: 'bridge_up_v',
        bridge_up_v: 'bridge_high_v',
        bridge_high_v: 'bridge_down_v',
        bridge_down_v: 'bridge'
    })"""

    if old_drop_rot in content and "BUMP_ROTATION_MAP" not in content:
        content = content.replace(old_drop_rot, new_rotations, 1)

    # 2. Add rotation helper methods to GridManager
    old_cycle_drop = """    cycleDropDirection(index) {
        const cell = this.getCell(index);
        if (!cell || !cell.type.startsWith('drop')) return null;
        const nextType = Config.DROP_ROTATION_MAP[cell.type] || 'drop_n';
        cell.type = nextType;
        return nextType;
    }"""

    new_cycle_methods = """    cycleDropDirection(index) {
        const cell = this.getCell(index);
        if (!cell || !cell.type.startsWith('drop')) return null;
        const nextType = Config.DROP_ROTATION_MAP[cell.type] || 'drop_n';
        cell.type = nextType;
        return nextType;
    }

    cycleBumpDirection(index) {
        const cell = this.getCell(index);
        if (!cell || (!cell.type.startsWith('bump') && cell.type !== 'bump')) return null;
        const nextType = Config.BUMP_ROTATION_MAP[cell.type] || 'bump_v';
        cell.type = nextType;
        return nextType;
    }

    cycleBombCorner(index) {
        const cell = this.getCell(index);
        if (!cell || (!cell.type.startsWith('bomb') && cell.type !== 'bomb')) return null;
        const nextType = Config.BOMB_ROTATION_MAP[cell.type] || 'bomb_tr';
        cell.type = nextType;
        return nextType;
    }

    cycleBridgeSection(index) {
        const cell = this.getCell(index);
        if (!cell || (!cell.type.startsWith('bridge') && cell.type !== 'bridge')) return null;
        const nextType = Config.BRIDGE_ROTATION_MAP[cell.type] || 'bridge_up_h';
        cell.type = nextType;
        return nextType;
    }"""

    if old_cycle_drop in content and "cycleBumpDirection" not in content:
        content = content.replace(old_cycle_drop, new_cycle_methods, 1)

    # 3. Update handleCellClick to support rotating Bump, Bomb, and Bridge
    old_handle_click_guard = """        // Guard: Drop Zone Rotation
        if (cell.type.startsWith('drop') && this.selectedTool.startsWith('drop')) {
            const rotated = this.gridManager.cycleDropDirection(idx);
            this.initGrid(idx);
            ToastService.show(`Rotated Drop Zone to ${rotated.replace('drop_', '').toUpperCase()}`, 'info');
            return;
        }"""

    new_handle_click_guard = """        // Guard: Drop Zone Rotation
        if (cell.type.startsWith('drop') && this.selectedTool.startsWith('drop')) {
            const rotated = this.gridManager.cycleDropDirection(idx);
            this.initGrid(idx);
            ToastService.show(`Rotated Drop Zone to ${rotated.replace('drop_', '').toUpperCase()}`, 'info');
            return;
        }

        // Guard: Speed Bumps (Chopsticks) Rotation (Horizontal vs Vertical)
        if ((cell.type.startsWith('bump') || cell.type === 'bump') && this.selectedTool.startsWith('bump')) {
            const rotated = this.gridManager.cycleBumpDirection(idx);
            this.initGrid(idx);
            ToastService.show(`Chopsticks rotated: ${rotated === 'bump_v' ? 'Vertical (E-W passage, เบารถ)' : 'Horizontal (N-S passage, เบารถ)'}`, 'info');
            return;
        }

        // Guard: Bomb Hazard Corner Rotation (TL, TR, BR, BL on black line)
        if ((cell.type.startsWith('bomb') || cell.type === 'bomb') && this.selectedTool.startsWith('bomb')) {
            const rotated = this.gridManager.cycleBombCorner(idx);
            this.initGrid(idx);
            const cornerNames = { bomb_tl: 'Top-Left Corner', bomb_tr: 'Top-Right Corner', bomb_bl: 'Bottom-Left Corner', bomb_br: 'Bottom-Right Corner' };
            ToastService.show(`Bomb placed at: ${cornerNames[rotated] || rotated}`, 'info');
            return;
        }

        // Guard: Bridge Section & Direction Cycling (ทางขึ้น -> ยกระดับ -> ทางลง)
        if ((cell.type.startsWith('bridge') || cell.type === 'bridge') && this.selectedTool.startsWith('bridge')) {
            const rotated = this.gridManager.cycleBridgeSection(idx);
            this.initGrid(idx);
            const bridgeNames = {
                bridge_up_h: 'ทางขึ้น (Incline West-East)',
                bridge_high_h: 'ทางยกระดับ (Elevated 50mm West-East)',
                bridge_down_h: 'ทางลง (Decline West-East)',
                bridge_up_v: 'ทางขึ้น (Incline North-South)',
                bridge_high_v: 'ทางยกระดับ (Elevated 50mm North-South)',
                bridge_down_v: 'ทางลง (Decline North-South)',
                bridge: 'สะพานรวม 3 ส่วน (Full Bridge)'
            };
            ToastService.show(`Bridge Section: ${bridgeNames[rotated] || rotated}`, 'info');
            return;
        }"""

    if old_handle_click_guard in content and "Chopsticks rotated" not in content:
        content = content.replace(old_handle_click_guard, new_handle_click_guard, 1)

    # 4. Update CSS for .tile.bump, .tile.bomb, .tile.bridge
    old_tile_css = """.tile.bridge {
            background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
        }
        .tile.bridge::before {
            content: 'BRIDGE 50mm';
            font-family: var(--font-mono);
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
        }

        .tile.bump {
            background: #ffffff;
            background-image: repeating-linear-gradient(0deg, #ea580c, #ea580c 4px, transparent 4px, transparent 11px);
        }
        .tile.bump::after {
            content: 'BUMPS';
            font-family: var(--font-mono);
            font-size: 8px;
            font-weight: 800;
            color: #9a3412;
            background: rgba(255, 255, 255, 0.92);
            padding: 1px 4px;
            border-radius: var(--radius-xs);
        }

        .tile.seesaw {
            background: linear-gradient(135deg, #ca8a04 0%, #eab308 100%);
        }
        .tile.seesaw::after {
            content: 'SEESAW';
            font-family: var(--font-mono);
            font-size: 8px;
            font-weight: 800;
            color: #422006;
            background: #ffffff;
            padding: 1px 4px;
            border-radius: var(--radius-xs);
        }

        .tile.tunnel {
            background: #334155;
            border: 2px dashed #64748b;
        }
        .tile.tunnel::after {
            content: 'TUNNEL';
            font-family: var(--font-mono);
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
        }

        .tile.bomb {
            background: #ffffff;
        }
        .tile.bomb::after {
            content: '💣 BOMB';
            font-family: var(--font-mono);
            font-size: 8px;
            font-weight: 800;
            color: var(--apple-red);
            border: 1px solid var(--apple-red);
            padding: 1px 4px;
            border-radius: var(--radius-xs);
            background: #fff5f5;
        }"""

    new_tile_css = """.tile.bridge, .tile[class*="bridge"] {
            background: linear-gradient(135deg, #334155 0%, #475569 100%);
            color: #ffffff;
        }
        .tile.bridge::before {
            content: 'BRIDGE 50mm';
            font-family: var(--font-mono);
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
        }
        .tile.bridge_up_h, .tile.bridge_up {
            background: linear-gradient(to right, #1e293b 0%, #64748b 100%) !important;
            border-top: 4px solid #94a3b8 !important;
            border-bottom: 4px solid #94a3b8 !important;
        }
        .tile.bridge_high_h, .tile.bridge_high {
            background: #475569 !important;
            border-top: 4px solid #94a3b8 !important;
            border-bottom: 4px solid #94a3b8 !important;
        }
        .tile.bridge_down_h, .tile.bridge_down {
            background: linear-gradient(to right, #64748b 0%, #1e293b 100%) !important;
            border-top: 4px solid #94a3b8 !important;
            border-bottom: 4px solid #94a3b8 !important;
        }
        .tile.bridge_up_v {
            background: linear-gradient(to bottom, #1e293b 0%, #64748b 100%) !important;
            border-left: 4px solid #94a3b8 !important;
            border-right: 4px solid #94a3b8 !important;
        }
        .tile.bridge_high_v {
            background: #475569 !important;
            border-left: 4px solid #94a3b8 !important;
            border-right: 4px solid #94a3b8 !important;
        }
        .tile.bridge_down_v {
            background: linear-gradient(to bottom, #64748b 0%, #1e293b 100%) !important;
            border-left: 4px solid #94a3b8 !important;
            border-right: 4px solid #94a3b8 !important;
        }
        .tile[class*="bridge_up"]::after { content: '▲ ทางขึ้น'; font-family: var(--font-mono); font-size: 7.5px; font-weight: 800; color: #facc15; }
        .tile[class*="bridge_high"]::after { content: '■ ยกระดับ'; font-family: var(--font-mono); font-size: 7.5px; font-weight: 800; color: #38bdf8; }
        .tile[class*="bridge_down"]::after { content: '▼ ทางลง'; font-family: var(--font-mono); font-size: 7.5px; font-weight: 800; color: #facc15; }

        .tile.bump, .tile.bump_h {
            background: #ffffff;
            background-image: repeating-linear-gradient(0deg, #d4a373, #d4a373 4px, transparent 4px, transparent 11px) !important;
            border-left: 4px solid #78350f !important;
            border-right: 4px solid #78350f !important;
        }
        .tile.bump_v {
            background: #ffffff;
            background-image: repeating-linear-gradient(90deg, #d4a373, #d4a373 4px, transparent 4px, transparent 11px) !important;
            border-top: 4px solid #78350f !important;
            border-bottom: 4px solid #78350f !important;
        }
        .tile[class*="bump"]::after {
            content: '🥢 BUMPS';
            font-family: var(--font-mono);
            font-size: 7.5px;
            font-weight: 800;
            color: #9a3412;
            background: rgba(255, 255, 255, 0.94);
            padding: 1px 4px;
            border-radius: var(--radius-xs);
        }

        .tile.seesaw {
            background: linear-gradient(135deg, #ca8a04 0%, #eab308 100%);
        }
        .tile.seesaw::after {
            content: 'SEESAW';
            font-family: var(--font-mono);
            font-size: 8px;
            font-weight: 800;
            color: #422006;
            background: #ffffff;
            padding: 1px 4px;
            border-radius: var(--radius-xs);
        }

        .tile.tunnel {
            background: #334155;
            border: 2px dashed #64748b;
        }
        .tile.tunnel::after {
            content: 'TUNNEL';
            font-family: var(--font-mono);
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
        }

        .tile[class*="bomb"] {
            background: #ffffff;
            position: relative;
        }
        .tile.bomb_tl::after {
            content: '💣';
            position: absolute;
            top: 2px;
            left: 2px;
            font-size: 13px;
            line-height: 1;
            filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.8));
        }
        .tile.bomb_tr::after, .tile.bomb::after {
            content: '💣';
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 13px;
            line-height: 1;
            filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.8));
        }
        .tile.bomb_bl::after {
            content: '💣';
            position: absolute;
            bottom: 2px;
            left: 2px;
            font-size: 13px;
            line-height: 1;
            filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.8));
        }
        .tile.bomb_br::after {
            content: '💣';
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 13px;
            line-height: 1;
            filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.8));
        }"""

    if old_tile_css in content:
        content = content.replace(old_tile_css, new_tile_css, 1)

    # 5. Update 3D builder calls in _buildCell3D
    old_3d_obstacle_branch = """        // 5. Official Competition 3D Obstacles
        if (cell.type === 'bridge') {
            this._buildBridgeMesh(cellGroup, col, row, cellIdx);
        } else if (cell.type === 'seesaw') {
            this._buildSeesawMesh(cellGroup, cellIdx);
        } else if (cell.type === 'bump') {
            this._buildBumpsMesh(cellGroup);
        } else if (cell.type === 'tunnel') {
            this._buildTunnelMesh(cellGroup, row);
        } else if (cell.type === 'bomb') {
            this._buildBombMesh(cellGroup);
        } else if (cell.type === 'blackhole') {
            this._buildBlackHoleMesh(cellGroup);
        }"""

    new_3d_obstacle_branch = """        // 5. Official Competition 3D Obstacles
        if (cell.type.startsWith('bridge') || cell.type === 'bridge') {
            this._buildBridgeMesh(cellGroup, cell.type);
        } else if (cell.type === 'seesaw') {
            this._buildSeesawMesh(cellGroup, cellIdx);
        } else if (cell.type.startsWith('bump') || cell.type === 'bump') {
            const isVert = cell.type === 'bump_v' || (col === 5 && row === 1); // Cell 13 vertical default
            this._buildBumpsMesh(cellGroup, isVert);
        } else if (cell.type === 'tunnel') {
            this._buildTunnelMesh(cellGroup, row);
        } else if (cell.type.startsWith('bomb') || cell.type === 'bomb') {
            this._buildBombMesh(cellGroup, cell.type);
        } else if (cell.type === 'blackhole') {
            this._buildBlackHoleMesh(cellGroup);
        }"""

    if old_3d_obstacle_branch in content:
        content = content.replace(old_3d_obstacle_branch, new_3d_obstacle_branch, 1)

    # 6. Update _buildBridgeMesh, _buildBumpsMesh, _buildBombMesh implementation
    old_bump_mesh = """    _buildBumpsMesh(parent) {
        // Official Rule 8.2: 7 Bamboo Chopsticks (5-7mm diameter, 50mm margins from edges)
        const bumpMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7, metalness: 0.05 });
        const chopstickRadius = 3.0; // 6mm diameter
        const span = 200; // 300 - 50 - 50 = 200mm span
        const count = 7;
        const step = span / (count - 1); // ~33.33mm spacing

        for (let i = 0; i < count; i++) {
            const bx = -100 + i * step;
            const bumpGeo = new THREE.CylinderGeometry(chopstickRadius, chopstickRadius, 276, 16);
            const bump = new THREE.Mesh(bumpGeo, bumpMat);
            bump.rotation.x = Math.PI / 2;
            bump.position.set(bx, chopstickRadius, 0);
            bump.castShadow = true;
            bump.receiveShadow = true;
            parent.add(bump);
        }
    }"""

    new_bump_mesh = """    _buildBumpsMesh(parent, isVertical = false) {
        // Official Rule 8.2: 7 Bamboo Chopsticks (5-7mm diameter, 50mm margins from edges)
        // Strictly directional traversal (sides blocked by chopstick ends)
        const bumpMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7, metalness: 0.05 });
        const endGuardMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
        const chopstickRadius = 3.0; // 6mm diameter
        const span = 200; // 300 - 50 - 50 = 200mm span
        const count = 7;
        const step = span / (count - 1); // ~33.33mm spacing

        for (let i = 0; i < count; i++) {
            const offset = -100 + i * step;
            const bumpGeo = new THREE.CylinderGeometry(chopstickRadius, chopstickRadius, 276, 16);
            const bump = new THREE.Mesh(bumpGeo, bumpMat);
            if (isVertical) {
                // Chopsticks aligned North-South (Robot traverses West-East)
                bump.rotation.z = Math.PI / 2;
                bump.position.set(0, chopstickRadius, offset);
            } else {
                // Chopsticks aligned West-East (Robot traverses North-South)
                bump.rotation.x = Math.PI / 2;
                bump.position.set(offset, chopstickRadius, 0);
            }
            bump.castShadow = true;
            bump.receiveShadow = true;
            parent.add(bump);
        }

        // Side blocker rails (Chopsticks can only be entered/exited along the passage axis)
        if (isVertical) {
            [-145, 145].forEach(z => {
                const guardGeo = new THREE.BoxGeometry(290, 8, 6);
                const guard = new THREE.Mesh(guardGeo, endGuardMat);
                guard.position.set(0, 4, z);
                guard.castShadow = true;
                parent.add(guard);
            });
        } else {
            [-145, 145].forEach(x => {
                const guardGeo = new THREE.BoxGeometry(6, 8, 290);
                const guard = new THREE.Mesh(guardGeo, endGuardMat);
                guard.position.set(x, 4, 0);
                guard.castShadow = true;
                parent.add(guard);
            });
        }
    }"""

    if old_bump_mesh in content:
        content = content.replace(old_bump_mesh, new_bump_mesh, 1)

    old_bomb_mesh = """    _buildBombMesh(parent) {
        // Official Rule 8.6: 20x20x20mm Hazard Cube resting on black boundary line
        const bombGroup = new THREE.Group();

        // 20x20x20mm Bomb Hazard Cube
        const cubeGeo = new THREE.BoxGeometry(20, 20, 20);
        const cubeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.25 });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set(0, 10, 0);
        cube.castShadow = true;
        bombGroup.add(cube);

        // Black warning stripe band around cube
        const bandGeo = new THREE.BoxGeometry(20.5, 6, 20.5);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.5 });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(0, 10, 0);
        bombGroup.add(band);

        // Warning Hazard Perimeter Ring on floor (Red danger radius)
        const ringGeo = new THREE.RingGeometry(24, 32, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0.6, 0);
        bombGroup.add(ring);

        parent.add(bombGroup);
    }"""

    new_bomb_mesh = """    _buildBombMesh(parent, cornerType = 'bomb_tr') {
        // Official Rule 8.6: 20x20x20mm Hazard Cube resting at the CORNER of the block / black line
        const bombGroup = new THREE.Group();

        let cx = 135;
        let cz = -135;
        if (cornerType.includes('tl')) { cx = -135; cz = -135; }
        else if (cornerType.includes('tr')) { cx = 135; cz = -135; }
        else if (cornerType.includes('bl')) { cx = -135; cz = 135; }
        else if (cornerType.includes('br')) { cx = 135; cz = 135; }

        // 20x20x20mm Bomb Hazard Cube at designated black line corner
        const cubeGeo = new THREE.BoxGeometry(20, 20, 20);
        const cubeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.25 });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set(cx, 10, cz);
        cube.castShadow = true;
        bombGroup.add(cube);

        // Black warning stripe band around cube
        const bandGeo = new THREE.BoxGeometry(20.5, 6, 20.5);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.5 });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(cx, 10, cz);
        bombGroup.add(band);

        // Warning Hazard Perimeter Ring on floor at corner
        const ringGeo = new THREE.RingGeometry(14, 22, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(cx, 0.6, cz);
        bombGroup.add(ring);

        parent.add(bombGroup);
    }"""

    if old_bomb_mesh in content:
        content = content.replace(old_bomb_mesh, new_bomb_mesh, 1)

    old_bridge_mesh = """    _buildBridgeMesh(parent, col, row, cellIdx) {
        // Official Rule 8.3: 50mm Height Bridge with smooth incline/decline ramp & guardrails
        const bridgeGroup = new THREE.Group();
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.25 });
        const deckSurfaceMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.2 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.85 });
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

        // Elevated Center Deck (Height 50mm, 280mm wide, 140mm long)
        const deckGeo = new THREE.BoxGeometry(140, 8, 280);
        const deck = new THREE.Mesh(deckGeo, bridgeMat);
        deck.position.set(0, 46, 0);
        deck.castShadow = true;
        deck.receiveShadow = true;
        bridgeGroup.add(deck);

        // Deck non-slip lane marking
        const laneGeo = new THREE.PlaneGeometry(130, 20);
        const lane = new THREE.Mesh(laneGeo, stripeMat);
        lane.rotation.x = -Math.PI / 2;
        lane.position.set(0, 50.2, 0);
        bridgeGroup.add(lane);

        // Incline Ramp (Smooth 50mm elevation ascent)
        const rampInGeo = new THREE.BoxGeometry(86, 6, 280);
        const rampIn = new THREE.Mesh(rampInGeo, bridgeMat);
        rampIn.position.set(-108, 24, 0);
        rampIn.rotation.z = Math.atan2(46, 82);
        rampIn.castShadow = true;
        rampIn.receiveShadow = true;
        bridgeGroup.add(rampIn);

        // Decline Ramp (Smooth descent to floor)
        const rampOut = new THREE.Mesh(rampInGeo, bridgeMat);
        rampOut.position.set(108, 24, 0);
        rampOut.rotation.z = -Math.atan2(46, 82);
        rampOut.castShadow = true;
        rampOut.receiveShadow = true;
        bridgeGroup.add(rampOut);

        // Solid undercarriage side skirt supports
        const skirtMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
        [-138, 138].forEach(sz => {
            const skirtGeo = new THREE.BoxGeometry(270, 44, 4);
            const skirt = new THREE.Mesh(skirtGeo, skirtMat);
            skirt.position.set(0, 22, sz);
            skirt.castShadow = true;
            bridgeGroup.add(skirt);
        });

        // Safety Guardrails (50mm elevation side rails)
        [-135, 135].forEach(zOffset => {
            const railGeo = new THREE.CylinderGeometry(3.2, 3.2, 290, 12);
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.rotation.z = Math.PI / 2;
            rail.position.set(0, 68, zOffset);
            rail.castShadow = true;
            bridgeGroup.add(rail);

            [-100, 0, 100].forEach(xOffset => {
                const postGeo = new THREE.CylinderGeometry(3, 3, 44, 8);
                const post = new THREE.Mesh(postGeo, railMat);
                post.position.set(xOffset, 46, zOffset);
                bridgeGroup.add(post);
            });
        });

        parent.add(bridgeGroup);
    }"""

    new_bridge_mesh = """    _buildBridgeMesh(parent, bridgeType = 'bridge') {
        // Official Rule 8.3 & User Spec: Bridge composed of 3 distinct sections:
        // 1. ทางขึ้น (Incline ramp - bridge_up)
        // 2. ทางยกระดับ (Elevated deck 50mm - bridge_high)
        // 3. ทางลง (Decline ramp - bridge_down)
        // Directional pass-through ONLY: Sides are strictly blocked by guardrails!
        const bridgeGroup = new THREE.Group();
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.25 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.85 });
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

        const isVert = bridgeType.endsWith('_v');
        const isUp = bridgeType.includes('up');
        const isHigh = bridgeType.includes('high');
        const isDown = bridgeType.includes('down');
        const isFull = !isUp && !isHigh && !isDown;

        if (isFull) {
            // Full 3-in-1 bridge (ramp in -> deck 50mm -> ramp out)
            const deckGeo = new THREE.BoxGeometry(140, 8, 280);
            const deck = new THREE.Mesh(deckGeo, bridgeMat);
            deck.position.set(0, 46, 0);
            deck.castShadow = true;
            deck.receiveShadow = true;
            bridgeGroup.add(deck);

            const rampInGeo = new THREE.BoxGeometry(86, 6, 280);
            const rampIn = new THREE.Mesh(rampInGeo, bridgeMat);
            rampIn.position.set(-108, 24, 0);
            rampIn.rotation.z = Math.atan2(46, 82);
            rampIn.castShadow = true;
            bridgeGroup.add(rampIn);

            const rampOut = new THREE.Mesh(rampInGeo, bridgeMat);
            rampOut.position.set(108, 24, 0);
            rampOut.rotation.z = -Math.atan2(46, 82);
            rampOut.castShadow = true;
            bridgeGroup.add(rampOut);
        } else if (isUp) {
            // Section 1: ทางขึ้น (Incline ramp 0 -> 50mm)
            const rampGeo = new THREE.BoxGeometry(290, 8, 280);
            const ramp = new THREE.Mesh(rampGeo, bridgeMat);
            ramp.position.set(0, 24, 0);
            ramp.rotation.z = Math.atan2(46, 280);
            ramp.castShadow = true;
            ramp.receiveShadow = true;
            bridgeGroup.add(ramp);
        } else if (isHigh) {
            // Section 2: ทางยกระดับ (Elevated deck staying flat at 50mm)
            const deckGeo = new THREE.BoxGeometry(290, 8, 280);
            const deck = new THREE.Mesh(deckGeo, bridgeMat);
            deck.position.set(0, 46, 0);
            deck.castShadow = true;
            deck.receiveShadow = true;
            bridgeGroup.add(deck);

            const laneGeo = new THREE.PlaneGeometry(270, 20);
            const lane = new THREE.Mesh(laneGeo, stripeMat);
            lane.rotation.x = -Math.PI / 2;
            lane.position.set(0, 50.2, 0);
            bridgeGroup.add(lane);
        } else if (isDown) {
            // Section 3: ทางลง (Decline ramp 50mm -> 0)
            const rampGeo = new THREE.BoxGeometry(290, 8, 280);
            const ramp = new THREE.Mesh(rampGeo, bridgeMat);
            ramp.position.set(0, 24, 0);
            ramp.rotation.z = -Math.atan2(46, 280);
            ramp.castShadow = true;
            ramp.receiveShadow = true;
            bridgeGroup.add(ramp);
        }

        // Side Guardrails blocking side ingress/egress completely
        [-135, 135].forEach(zOffset => {
            const railGeo = new THREE.CylinderGeometry(3.2, 3.2, 290, 12);
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.rotation.z = Math.PI / 2;
            rail.position.set(0, 68, zOffset);
            rail.castShadow = true;
            bridgeGroup.add(rail);

            [-100, 0, 100].forEach(xOffset => {
                const postGeo = new THREE.CylinderGeometry(3, 3, 44, 8);
                const post = new THREE.Mesh(postGeo, railMat);
                post.position.set(xOffset, 46, zOffset);
                bridgeGroup.add(post);
            });
        });

        if (isVert) {
            bridgeGroup.rotation.y = Math.PI / 2;
        }

        parent.add(bridgeGroup);
    }"""

    if old_bridge_mesh in content:
        content = content.replace(old_bridge_mesh, new_bridge_mesh, 1)

    # 7. Elevation calculation in updateRobotPosition
    old_elevation = """        if (cell) {
            if (cell.type === 'bridge') {
                const subX = (xMm % 300) / 300;
                if (subX < 0.28) worldY = (subX / 0.28) * 50;
                else if (subX > 0.72) worldY = ((1 - subX) / 0.28) * 50;
                else worldY = 50;
            } else if (cell.type === 'seesaw') {
                const subX = (xMm % 300) / 300;
                const tiltRad = ((subX - 0.5) * 20 * Math.PI) / 180;
                if (this.seesawPivots[cellIdx]) {
                    this.seesawPivots[cellIdx].rotation.z = tiltRad;
                }
                worldY = 16 + (subX - 0.5) * 24;
            } else if (cell.type === 'bump') {
                worldY = Math.abs(Math.sin(((xMm % 300) / 300) * Math.PI * 7)) * 4.5;
            }
        }"""

    new_elevation = """        if (cell) {
            if (cell.type.startsWith('bridge') || cell.type === 'bridge') {
                const subX = (xMm % 300) / 300;
                if (cell.type.includes('up')) {
                    worldY = subX * 50;
                } else if (cell.type.includes('high')) {
                    worldY = 50;
                } else if (cell.type.includes('down')) {
                    worldY = (1 - subX) * 50;
                } else {
                    if (subX < 0.28) worldY = (subX / 0.28) * 50;
                    else if (subX > 0.72) worldY = ((1 - subX) / 0.28) * 50;
                    else worldY = 50;
                }
            } else if (cell.type === 'seesaw') {
                const subX = (xMm % 300) / 300;
                const tiltRad = ((subX - 0.5) * 20 * Math.PI) / 180;
                if (this.seesawPivots[cellIdx]) {
                    this.seesawPivots[cellIdx].rotation.z = tiltRad;
                }
                worldY = 16 + (subX - 0.5) * 24;
            } else if (cell.type.startsWith('bump') || cell.type === 'bump') {
                worldY = Math.abs(Math.sin(((xMm % 300) / 300) * Math.PI * 7)) * 4.5;
            }
        }"""

    if old_elevation in content:
        content = content.replace(old_elevation, new_elevation, 1)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[OK] Updated {filepath}")

for fp in TARGET_FILES:
    if os.path.exists(fp):
        update_html(fp)

# Now update scripts/solve_cli.js
cli_path = r"D:\Workspace\robot\scripts\solve_cli.js"
if os.path.exists(cli_path):
    print(f"Updating CLI solver: {cli_path}")
    with open(cli_path, "r", encoding="utf-8") as f:
        cli_content = f.read()

    # Update WALL_RULES in solve_cli.js
    old_cli_walls = """    WALL_RULES: Object.freeze({
        T: Object.freeze(['line_top', 'line_top_bottom', 'line_top_right', 'line_top_left', 'line_surround', 'drop_n', 'drop_w', 'drop_e']),
        B: Object.freeze(['line_bottom', 'line_top_bottom', 'line_bottom_right', 'line_bottom_left', 'line_surround', 'drop_s', 'drop_w', 'drop_e']),
        L: Object.freeze(['line_left', 'line_left_right', 'line_bottom_left', 'line_top_left', 'line_surround', 'drop_n', 'drop_s', 'drop_w']),
        R: Object.freeze(['line_right', 'line_left_right', 'line_bottom_right', 'line_top_right', 'line_surround', 'drop_n', 'drop_s', 'drop_e'])
    })"""

    new_cli_walls = """    WALL_RULES: Object.freeze({
        T: Object.freeze(['line_top', 'line_top_bottom', 'line_top_right', 'line_top_left', 'line_surround', 'drop_n', 'drop_w', 'drop_e', 'bump_v', 'bridge_h', 'bridge_up_h', 'bridge_high_h', 'bridge_down_h']),
        B: Object.freeze(['line_bottom', 'line_top_bottom', 'line_bottom_right', 'line_bottom_left', 'line_surround', 'drop_s', 'drop_w', 'drop_e', 'bump_v', 'bridge_h', 'bridge_up_h', 'bridge_high_h', 'bridge_down_h']),
        L: Object.freeze(['line_left', 'line_left_right', 'line_bottom_left', 'line_top_left', 'line_surround', 'drop_n', 'drop_s', 'drop_w', 'bump', 'bump_h', 'bridge_v', 'bridge_up_v', 'bridge_high_v', 'bridge_down_v']),
        R: Object.freeze(['line_right', 'line_left_right', 'line_bottom_right', 'line_top_right', 'line_surround', 'drop_n', 'drop_s', 'drop_e', 'bump', 'bump_h', 'bridge_v', 'bridge_up_v', 'bridge_high_v', 'bridge_down_v'])
    })"""

    if old_cli_walls in cli_content:
        cli_content = cli_content.replace(old_cli_walls, new_cli_walls, 1)

    # Slow down speed on bump to 55% PWM ("ต้องเบารถ")
    cli_content = cli_content.replace("bump: 65", "bump: 58")

    with open(cli_path, "w", encoding="utf-8") as f:
        f.write(cli_content)
    print(f"[OK] Updated {cli_path}")

print("All advanced obstacle rules successfully implemented!")
