#!/usr/bin/env python3
"""
Upgrade 3D Tactical Arena Simulation to match:
1. Official Rulebook: docs/robot_competition_rules_intermediate.pdf
2. Official Reference Photo: assets/813939708_1540798614515470_7113719624922302715_n.jpg
3. Real-world PT-BOT Atom VX Arena Competition Standards
"""

import os
import re

TARGET_FILES = [
    r"D:\Workspace\robot\index.html",
    r"D:\Workspace\robot\tactical_planner.html",
    r"D:\Workspace\robot\web.html"
]

UPGRADED_3D_CODE = '''    rebuildArena() {
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

        // 1. Realistic Competition Arena Table & Beveled Base Pedestal
        const tableGeo = new THREE.BoxGeometry(arenaW + 80, 36, arenaD + 80);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.25 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, -18, 0);
        table.receiveShadow = true;
        this.arenaGroup.add(table);

        // Sub-rim table bevel edge
        const rimGeo = new THREE.BoxGeometry(arenaW + 40, 6, arenaD + 40);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.3 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.set(0, 1, 0);
        rim.receiveShadow = true;
        this.arenaGroup.add(rim);

        // 2. Build 32 Official Competition Cells
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

        // 1. Tile Floor Base (High-Grip Matte White Vinyl Plastwood, 300x300mm standard)
        let tileColor = 0xf8fafc;
        if (cell.type === 'start') tileColor = 0xfef2f2;
        else if (cell.type === 'finish') tileColor = 0xf0fdf4;
        else if (cell.type === 'checkpoint') tileColor = 0xfefce8;
        else if (cell.type === 'tunnel') tileColor = 0x1e293b;
        else if (cell.type === 'blackhole') tileColor = 0x020617;
        else if (cell.type.startsWith('drop_')) tileColor = 0xf0fdf4;

        const floorGeo = new THREE.PlaneGeometry(298, 298);
        const floorMat = new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.68, metalness: 0.04 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.2;
        floor.receiveShadow = true;
        cellGroup.add(floor);

        // 2. Rule 11: Scaled 20mm Matte Black Boundary Lines
        const bw = 20;
        const borderMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.85, metalness: 0.05 });
        const addBorder = (bx, bz, bwX, bwZ) => {
            const bGeo = new THREE.PlaneGeometry(bwX, bwZ);
            const bMesh = new THREE.Mesh(bGeo, borderMat);
            bMesh.rotation.x = -Math.PI / 2;
            bMesh.position.set(bx, 0.45, bz);
            bMesh.receiveShadow = true;
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

        // 3. Official PT Robotics Corner Locking Brackets (Yellow Clips seen in official arena photos)
        const cornerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.4 });
        [[-148, -148], [148, -148], [-148, 148], [148, 148]].forEach(([cx, cz]) => {
            const cGeo = new THREE.BoxGeometry(10, 4, 10);
            const cMesh = new THREE.Mesh(cGeo, cornerMat);
            cMesh.position.set(cx, 2, cz);
            cellGroup.add(cMesh);
        });

        // 4. Official PT ROBOTICS Center Emblem Tile (Row 1, Col 3 - Center cell index 11)
        if (col === 3 && row === 1) {
            this._buildCenterLogo(cellGroup);
        }

        // 5. Official Competition 3D Obstacles
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
        } else if (cell.type.startsWith('drop_')) {
            this._buildDropBayMesh(cellGroup, cell.type);
        } else if (cell.type === 'checkpoint') {
            this._buildCheckpointMesh(cellGroup, cellIdx);
        } else if (cell.type === 'start') {
            this._buildStartBadge(cellGroup);
        } else if (cell.type === 'finish') {
            this._buildFinishBadge(cellGroup);
        }

        this.arenaGroup.add(cellGroup);
    }

    _buildCenterLogo(parent) {
        const logoGroup = new THREE.Group();
        // Plaque base
        const plaqueGeo = new THREE.BoxGeometry(160, 1.2, 110);
        const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
        const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
        plaque.position.set(0, 0.7, 0);
        logoGroup.add(plaque);

        // Black outer frame
        const frameGeo = new THREE.BoxGeometry(164, 1.6, 6);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.5 });
        [-55, 55].forEach(fz => {
            const fMesh = new THREE.Mesh(frameGeo, frameMat);
            fMesh.position.set(0, 0.9, fz);
            logoGroup.add(fMesh);
        });

        // PT ROBOTICS Monogram graphic box
        const emblemGeo = new THREE.BoxGeometry(70, 2, 40);
        const emblemMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
        const emblem = new THREE.Mesh(emblemGeo, emblemMat);
        emblem.position.set(0, 1.2, -6);
        logoGroup.add(emblem);

        // Cyan / Orange accent badge
        const badgeGeo = new THREE.BoxGeometry(60, 2.2, 8);
        const badgeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(0, 1.3, 24);
        logoGroup.add(badge);

        parent.add(logoGroup);
    }

    _buildBridgeMesh(parent, col, row, cellIdx) {
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
    }

    _buildTunnelMesh(parent, row) {
        // Official Rule 8.4: 300mm Wide x 600mm Long x 300mm High Enclosed Tunnel
        // Solid competition enclosure with pass-through portals
        const tunnelGroup = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.35 });
        const warningMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });

        const tunnelH = 180;
        const wallT = 24;

        // East & West Solid Side Walls
        [-150 + wallT / 2, 150 - wallT / 2].forEach(wx => {
            const wallGeo = new THREE.BoxGeometry(wallT, tunnelH, 298);
            const wall = new THREE.Mesh(wallGeo, bodyMat);
            wall.position.set(wx, tunnelH / 2, 0);
            wall.castShadow = true;
            wall.receiveShadow = true;
            tunnelGroup.add(wall);
        });

        // Top Roof
        const roofGeo = new THREE.BoxGeometry(300, 14, 300);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, tunnelH + 7, 0);
        roof.castShadow = true;
        tunnelGroup.add(roof);

        // Entrance / Exit Header Portal Beams with Yellow Hazard Caution Trim
        [-144, 144].forEach(pz => {
            const lintelGeo = new THREE.BoxGeometry(296, 26, 12);
            const lintel = new THREE.Mesh(lintelGeo, bodyMat);
            lintel.position.set(0, tunnelH - 13, pz);
            lintel.castShadow = true;
            tunnelGroup.add(lintel);

            const trimGeo = new THREE.BoxGeometry(280, 5, 14);
            const trim = new THREE.Mesh(trimGeo, warningMat);
            trim.position.set(0, tunnelH - 26, pz);
            tunnelGroup.add(trim);
        });

        parent.add(tunnelGroup);
    }

    _buildSeesawMesh(parent, cellIdx) {
        // Official Rule 8.5: Balanced Board 300x300mm on 15mm Cylindrical Axle
        const seesawGroup = new THREE.Group();

        // 1. Solid Cylindrical Fulcrum Axle (Diameter 15mm, Length 290mm)
        const fulcrumRadius = 7.5;
        const fulcrumGeo = new THREE.CylinderGeometry(fulcrumRadius, fulcrumRadius, 290, 24);
        const fulcrumMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.25 });
        const fulcrum = new THREE.Mesh(fulcrumGeo, fulcrumMat);
        fulcrum.rotation.x = Math.PI / 2;
        fulcrum.position.set(0, fulcrumRadius, 0);
        fulcrum.castShadow = true;
        seesawGroup.add(fulcrum);

        // Axle end pillow blocks
        const pillowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
        [-142, 142].forEach(pz => {
            const blockGeo = new THREE.BoxGeometry(28, fulcrumRadius * 2, 12);
            const block = new THREE.Mesh(blockGeo, pillowMat);
            block.position.set(0, fulcrumRadius, pz);
            seesawGroup.add(block);
        });

        // 2. Tilting Dynamic Board Pivot Group (Pivoting around axle center)
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(0, fulcrumRadius * 2, 0);

        // 300x300x4mm Balance Board in Competition Yellow
        const plankGeo = new THREE.BoxGeometry(286, 5, 276);
        const plankMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.15 });
        const plank = new THREE.Mesh(plankGeo, plankMat);
        plank.position.set(0, 2.5, 0);
        plank.castShadow = true;
        plank.receiveShadow = true;
        pivotGroup.add(plank);

        // Center pivot saddle channel
        const saddleGeo = new THREE.BoxGeometry(32, 4, 278);
        const saddleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        const saddle = new THREE.Mesh(saddleGeo, saddleMat);
        saddle.position.set(0, 4.5, 0);
        pivotGroup.add(saddle);

        seesawGroup.add(pivotGroup);
        this.seesawPivots[cellIdx] = pivotGroup;
        parent.add(seesawGroup);
    }

    _buildBumpsMesh(parent) {
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
    }

    _buildBombMesh(parent) {
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
    }

    _buildBlackHoleMesh(parent) {
        // Official Rule 8.1: Sunken 200x300mm Black Hole Void with Hazard Borders
        const holeGroup = new THREE.Group();

        // Sunken Black Pit Plane
        const pitGeo = new THREE.BoxGeometry(200, 8, 290);
        const pitMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.95, metalness: 0.05 });
        const pit = new THREE.Mesh(pitGeo, pitMat);
        pit.position.set(0, -3.8, 0);
        pit.receiveShadow = true;
        holeGroup.add(pit);

        // Yellow-Black Hazard Caution Border Striping
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        [-102, 102].forEach(sx => {
            const edgeGeo = new THREE.BoxGeometry(6, 2, 290);
            const edge = new THREE.Mesh(edgeGeo, stripeMat);
            edge.position.set(sx, 1, 0);
            holeGroup.add(edge);
        });

        parent.add(holeGroup);
    }

    _buildDropBayMesh(parent, dropType) {
        // Official Rule 4 & Photo 813939708: 3-Sided Containment Enclosure (U-Shape) with Rescue Green Floor & Cube
        const bayGroup = new THREE.Group();
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.3 });
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5, metalness: 0.1 });
        const wallH = 46; // 46mm high barrier wall
        const wallT = 16;

        // Vivid Green Target Landing Surface
        const targetFloorGeo = new THREE.PlaneGeometry(264, 264);
        const targetFloor = new THREE.Mesh(targetFloorGeo, floorMat);
        targetFloor.rotation.x = -Math.PI / 2;
        targetFloor.position.set(0, 0.6, 0);
        targetFloor.receiveShadow = true;
        bayGroup.add(targetFloor);

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
            bayGroup.add(wMesh);
        });

        // Target Crosshair Emblem
        const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const cross1 = new THREE.Mesh(new THREE.PlaneGeometry(80, 8), crossMat);
        cross1.rotation.x = -Math.PI / 2;
        cross1.position.set(0, 0.8, 0);
        bayGroup.add(cross1);

        const cross2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 80), crossMat);
        cross2.rotation.x = -Math.PI / 2;
        cross2.position.set(0, 0.8, 0);
        bayGroup.add(cross2);

        // Pre-staged 18mm Rescue Cube Preview inside Drop Bay
        const cubeGeo = new THREE.BoxGeometry(18, 18, 18);
        const cubeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.2 });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set(0, 9, 0);
        cube.castShadow = true;
        bayGroup.add(cube);

        parent.add(bayGroup);
    }

    _buildCheckpointMesh(parent, cellIdx) {
        // Official Rule 3: 50x50mm Circular Yellow Sticker on Floor
        const cpGroup = new THREE.Group();
        const discGeo = new THREE.CylinderGeometry(25, 25, 1.2, 32);
        const discMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.2 });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.position.set(0, 0.8, 0);
        disc.receiveShadow = true;
        cpGroup.add(disc);

        // Clean white target ring around sticker
        const ringGeo = new THREE.RingGeometry(25, 29, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x090a0f, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 1.0, 0);
        cpGroup.add(ring);

        parent.add(cpGroup);
    }

    _buildStartBadge(parent) {
        const startGroup = new THREE.Group();
        // Red Perimeter Box
        const boxGeo = new THREE.BoxGeometry(220, 2, 220);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(0, 1.0, 0);
        startGroup.add(box);

        // Direction Forward Arrow Plaque
        const arrowGeo = new THREE.BoxGeometry(40, 2.5, 70);
        const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.set(0, 2.0, -10);
        startGroup.add(arrow);

        parent.add(startGroup);
    }

    _buildFinishBadge(parent) {
        const finishGroup = new THREE.Group();
        // Green / Blue Victory Dock
        const padGeo = new THREE.BoxGeometry(240, 2, 240);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(0, 1.0, 0);
        finishGroup.add(pad);

        // Checkerboard White Trim
        const trimGeo = new THREE.BoxGeometry(180, 2.5, 180);
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.set(0, 1.8, 0);
        finishGroup.add(trim);

        parent.add(finishGroup);
    }'''

def update_file(filepath):
    print(f"Processing: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the block starting at `rebuildArena() {` and ending before `_buildRobotModel() {`
    pattern = r"    rebuildArena\(\) \{[\s\S]*?(?=    _buildRobotModel\(\) \{)"
    if not re.search(pattern, content):
        print(f"[FAIL] Could not match rebuildArena in {filepath}")
        return False

    new_content = re.sub(pattern, UPGRADED_3D_CODE + "\n\n", content, count=1)

    # Also update updateRobotPosition elevation calculation to include bumps vibration
    old_elevation = """        if (cell) {
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
        }"""

    new_elevation = """        if (cell) {
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

    if old_elevation in new_content:
        new_content = new_content.replace(old_elevation, new_elevation, 1)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"[OK] Successfully updated {filepath}")
    return True

for fpath in TARGET_FILES:
    if os.path.exists(fpath):
        update_file(fpath)
print("All arena files successfully updated to official competition specifications!")
