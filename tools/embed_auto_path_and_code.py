import re

# Read the domain and application source files to ensure exact parity
with open(r'D:\Workspace\robot\src\core\domain\route_ir.js', 'r', encoding='utf-8') as f:
    route_ir_src = f.read()

with open(r'D:\Workspace\robot\src\core\domain\firmware_primitives.js', 'r', encoding='utf-8') as f:
    firmware_primitives_src = f.read()

with open(r'D:\Workspace\robot\src\core\application\path_planner.js', 'r', encoding='utf-8') as f:
    path_planner_src = f.read()

with open(r'D:\Workspace\robot\src\core\application\code_generator.js', 'r', encoding='utf-8') as f:
    code_generator_src = f.read()

with open(r'D:\Workspace\robot\src\infrastructure\compiler\firmware_validator.js', 'r', encoding='utf-8') as f:
    firmware_validator_src = f.read()

# Client-side JavaScript bundle for Auto Path & Auto Code
client_code = """
        // =====================================================================
        // AUTO PATH & AUTO CODE ENGINE (BROWSER RUNTIME)
        // Authoritative Firmware: firmware/PT_BOT_Middle_3Drop_ATOM_VX
        // =====================================================================

        const ROBOT_LENGTH = 0.18;
        const ROBOT_WIDTH = 0.14;
        const ROBOT_RADIUS = 0.114;

        const ARENA_BOUNDS = {
            'atom-vx-rescue-five-points': {
                minX: -1.20, maxX: 1.20,
                minZ: -0.60, maxZ: 0.60,
                cols: 8, rows: 4,
                tileW: 0.30, tileH: 0.30
            },
            'quick-box-drop': {
                minX: -0.60, maxX: 0.60,
                minZ: -0.60, maxZ: 0.60,
                cols: 4, rows: 4,
                tileW: 0.30, tileH: 0.30
            }
        };

        class ClientWaypoint {
            constructor(x, z, heading = 0, speed = 70, action = null, desc = "") {
                this.x = Number(x);
                this.z = Number(z);
                this.heading = Number(heading);
                this.speed = Math.max(20, Math.min(100, Number(speed)));
                this.action = action;
                this.desc = desc || "";
            }
        }

        class ClientRouteSegment {
            constructor(startWp, endWp, index) {
                this.index = index;
                this.start = startWp;
                this.end = endWp;

                const dx = endWp.x - startWp.x;
                const dz = endWp.z - startWp.z;
                this.distance = Math.hypot(dx, dz);

                let targetHeading = Math.round((Math.atan2(dx, dz) * 180) / Math.PI);
                while (targetHeading > 180) targetHeading -= 360;
                while (targetHeading < -180) targetHeading += 360;
                this.targetHeading = targetHeading;

                let turnAngle = this.targetHeading - startWp.heading;
                while (turnAngle > 180) turnAngle -= 360;
                while (turnAngle < -180) turnAngle += 360;
                this.turnAngle = turnAngle;

                const velocity = (startWp.speed / 100) * 0.85;
                const moveTimeSec = velocity > 0 ? this.distance / velocity : 0;
                this.moveDurationMs = Math.round(moveTimeSec * 1000);

                const spinVelocity = 250.0;
                this.turnDurationMs = Math.round((Math.abs(this.turnAngle) / spinVelocity) * 1000);

                this.isValid = true;
                this.collisionReason = null;
            }
        }

        class ClientRouteIR {
            constructor(projectId, waypoints, arenaData) {
                this.projectId = projectId;
                this.waypoints = waypoints.map(w => new ClientWaypoint(w.x, w.z, w.heading, w.speed, w.action || w.drop, w.desc));
                this.arenaData = arenaData;
                this.segments = [];
                this.totalDistance = 0;
                this.totalDurationMs = 0;
                this.isValid = true;
                this.validationErrors = [];

                this.compileSegments();
                this.validateRoute();
            }

            compileSegments() {
                this.segments = [];
                this.totalDistance = 0;
                this.totalDurationMs = 0;

                for (let i = 0; i < this.waypoints.length - 1; i++) {
                    const seg = new ClientRouteSegment(this.waypoints[i], this.waypoints[i + 1], i);
                    this.segments.push(seg);
                    this.totalDistance += seg.distance;
                    this.totalDurationMs += seg.turnDurationMs + seg.moveDurationMs;
                }
            }

            validateRoute() {
                this.validationErrors = [];
                this.isValid = true;

                if (this.waypoints.length < 2) {
                    this.validationErrors.push("Route requires at least 2 waypoints (Start and Destination).");
                    this.isValid = false;
                    return;
                }

                const bounds = ARENA_BOUNDS[this.projectId] || ARENA_BOUNDS['atom-vx-rescue-five-points'];
                const halfL = ROBOT_LENGTH / 2;
                const halfW = ROBOT_WIDTH / 2;

                for (let i = 0; i < this.waypoints.length; i++) {
                    const wp = this.waypoints[i];

                    if (wp.x - halfW < bounds.minX || wp.x + halfW > bounds.maxX ||
                        wp.z - halfL < bounds.minZ || wp.z + halfL > bounds.maxZ) {
                        this.validationErrors.push(
                            `Waypoint P${i + 1} (${wp.x.toFixed(2)}m, ${wp.z.toFixed(2)}m) collides with outer arena boundary walls.`
                        );
                        this.isValid = false;
                    }

                    if (i > 0) {
                        const prev = this.waypoints[i - 1];
                        const dist = Math.hypot(wp.x - prev.x, wp.z - prev.z);
                        if (dist < 0.02) {
                            this.validationErrors.push(
                                `Waypoints P${i} and P${i + 1} are virtually identical (distance ${(dist * 100).toFixed(1)} cm < 2 cm).`
                            );
                            this.isValid = false;
                        }
                    }
                }

                for (let i = 0; i < this.segments.length; i++) {
                    const seg = this.segments[i];
                    const collision = this.checkSegmentCollision(seg, bounds);
                    if (collision) {
                        seg.isValid = false;
                        seg.collisionReason = collision;
                        this.validationErrors.push(`Segment P${i + 1} -> P${i + 2}: ${collision}`);
                        this.isValid = false;
                    }
                }
            }

            checkSegmentCollision(seg, bounds) {
                const samples = 15;
                for (let s = 0; s <= samples; s++) {
                    const t = s / samples;
                    const x = seg.start.x + t * (seg.end.x - seg.start.x);
                    const z = seg.start.z + t * (seg.end.z - seg.start.z);

                    if (this.arenaData && this.arenaData.cells) {
                        const cellW = (bounds.maxX - bounds.minX) / bounds.cols;
                        const cellH = (bounds.maxZ - bounds.minZ) / bounds.rows;

                        const col = Math.floor((x - bounds.minX) / cellW);
                        const row = Math.floor((z - bounds.minZ) / cellH);

                        if (col >= 0 && col < bounds.cols && row >= 0 && row < bounds.rows) {
                            const idx = row * bounds.cols + col;
                            const cell = this.arenaData.cells[idx];

                            if (cell) {
                                if (cell.type === 'rescue_pit') {
                                    return `Obstacle collision: Impassable Pit Tile (#${idx}) at (${x.toFixed(2)}m, ${z.toFixed(2)}m).`;
                                }
                                if (cell.type === 'rescue_closed') {
                                    return `Obstacle collision: Impassable Closed Wall (#${idx}) at (${x.toFixed(2)}m, ${z.toFixed(2)}m).`;
                                }
                            }
                        }
                    }

                    if (this.projectId === 'atom-vx-rescue-five-points') {
                        if (x >= -0.15 && x <= 0.05 && z >= 0.0 && z <= 0.30) {
                            if (z < 0.05 || z > 0.25) {
                                return `Bridge Railing Hazard: Exceeds 20cm platform at (${x.toFixed(2)}m, ${z.toFixed(2)}m).`;
                            }
                        }
                    }
                }
                return null;
            }
        }

        const CLIENT_FIRMWARE_OPS = {
            FF: {
                name: 'FF',
                source: 'Func_Move.ino:44-75',
                toCpp: (spd, timer) => `FF(${Math.round(spd)}, ${Math.round(timer)});`,
                toSerial: (idx, spd, timer) => `STEP:${idx}:FF:${Math.round(spd)}:${Math.round(timer)}`
            },
            BB: {
                name: 'BB',
                source: 'Func_Move.ino:215-246',
                toCpp: (spd, timer) => `BB(${Math.round(spd)}, ${Math.round(timer)});`,
                toSerial: (idx, spd, timer) => `STEP:${idx}:BB:${Math.round(spd)}:${Math.round(timer)}`
            },
            SPIN: {
                name: 'spinDegree',
                source: 'Func_Spint-Turn.ino:1-56',
                toCpp: (deg) => `spinDegree(${Math.round(deg)});`,
                toSerial: (idx, deg) => `STEP:${idx}:SPIN:${Math.round(deg)}:0`
            },
            SETFRONT: {
                name: 'SetFront',
                source: 'Func_Move.ino:414-420',
                toCpp: (spd, timer) => `SetFront(${Math.round(spd)}, ${Math.round(timer)});`,
                toSerial: (idx, spd, timer) => `STEP:${idx}:SETFRONT:${Math.round(spd)}:${Math.round(timer)}`
            },
            SETBACK: {
                name: 'SetBack',
                source: 'Func_Move.ino:482-488',
                toCpp: (spd, timer) => `SetBack(${Math.round(spd)}, ${Math.round(timer)});`,
                toSerial: (idx, spd, timer) => `STEP:${idx}:SETBACK:${Math.round(spd)}:${Math.round(timer)}`
            },
            DROP_FL: {
                name: 'DropFL',
                source: 'DropBox.ino:10-15',
                toCpp: () => `DropFL();`,
                toSerial: (idx) => `STEP:${idx}:DROP_FL:0:0`
            },
            DROP_FR: {
                name: 'DropFR',
                source: 'DropBox.ino:17-22',
                toCpp: () => `DropFR();`,
                toSerial: (idx) => `STEP:${idx}:DROP_FR:0:0`
            },
            DROP_B: {
                name: 'DropB',
                source: 'DropBox.ino:24-28',
                toCpp: () => `DropB();`,
                toSerial: (idx) => `STEP:${idx}:DROP_B:0:0`
            },
            DROP_F: {
                name: 'DropF',
                source: 'DropBox.ino:1-8',
                toCpp: () => `DropF();`,
                toSerial: (idx) => `STEP:${idx}:DROP_F:0:0`
            },
            STOP: {
                name: 'motorStop',
                source: 'PTBOTAtomVX.h:40',
                toCpp: () => `motorStop();`,
                toSerial: (idx) => `STEP:${idx}:STOP:0:0`
            }
        };

        function clientCompilePrimitives(routeIR) {
            const primitives = [];
            for (let i = 0; i < routeIR.segments.length; i++) {
                const seg = routeIR.segments[i];

                if (Math.abs(seg.turnAngle) >= 3.0) {
                    primitives.push({
                        op: CLIENT_FIRMWARE_OPS.SPIN,
                        args: [seg.turnAngle],
                        comment: `Turn ${seg.turnAngle > 0 ? 'Right' : 'Left'} ${Math.abs(seg.turnAngle)}° toward P${i + 2}`,
                        targetWpIndex: i + 1
                    });
                }

                if (seg.distance > 0.01) {
                    primitives.push({
                        op: CLIENT_FIRMWARE_OPS.FF,
                        args: [seg.start.speed, seg.moveDurationMs],
                        comment: `Forward ${(seg.distance * 100).toFixed(1)} cm at ${seg.start.speed}% (${seg.moveDurationMs} ms)`,
                        targetWpIndex: i + 1
                    });
                }

                const targetWp = seg.end;
                if (targetWp.action) {
                    let actionOp = null;
                    if (targetWp.action === 'DROP_FL' || targetWp.action === 'BOX1') actionOp = CLIENT_FIRMWARE_OPS.DROP_FL;
                    else if (targetWp.action === 'DROP_FR' || targetWp.action === 'BOX2') actionOp = CLIENT_FIRMWARE_OPS.DROP_FR;
                    else if (targetWp.action === 'DROP_B' || targetWp.action === 'BOX3') actionOp = CLIENT_FIRMWARE_OPS.DROP_B;
                    else if (targetWp.action === 'DROP_F' || targetWp.action === 'BOX4') actionOp = CLIENT_FIRMWARE_OPS.DROP_F;
                    else if (targetWp.action === 'SETFRONT') actionOp = CLIENT_FIRMWARE_OPS.SETFRONT;
                    else if (targetWp.action === 'SETBACK') actionOp = CLIENT_FIRMWARE_OPS.SETBACK;

                    if (actionOp) {
                        primitives.push({
                            op: actionOp,
                            args: actionOp.name.startsWith('Set') ? [30, 200] : [],
                            comment: `Deploy action ${targetWp.action} at P${i + 2}`,
                            targetWpIndex: i + 1
                        });
                    }
                }
            }

            primitives.push({
                op: CLIENT_FIRMWARE_OPS.STOP,
                args: [],
                comment: 'Mission complete: stop all 4 drive motors',
                targetWpIndex: routeIR.waypoints.length - 1
            });
            return primitives;
        }

        // ---------------------------------------------------------------------
        // INTERACTIVE 2D CANVAS CONTROLLER
        // ---------------------------------------------------------------------
        let selectedWpIndex = 0;
        let isDraggingWp = false;
        let currentRouteIR = null;

        function initArena2dCanvas() {
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;

            canvas.addEventListener('mousedown', onCanvasMouseDown);
            window.addEventListener('mousemove', onCanvasMouseMove);
            window.addEventListener('mouseup', onCanvasMouseUp);
            canvas.addEventListener('dblclick', onCanvasDblClick);

            syncRouteAndUI();
        }

        function canvasPosToWorld(e, canvas) {
            const rect = canvas.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / canvas.clientWidth) * canvas.width;
            const py = ((e.clientY - rect.top) / canvas.clientHeight) * canvas.height;
            const wx = (px / canvas.width) * 2.4 - 1.2;
            const wz = (py / canvas.height) * 1.2 - 0.6;
            return { wx: Number(wx.toFixed(2)), wz: Number(wz.toFixed(2)) };
        }

        function onCanvasMouseDown(e) {
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;
            const pos = canvasPosToWorld(e, canvas);

            let closestIdx = -1;
            let closestDist = 0.12; // 12 cm hit radius

            activeProject.waypoints.forEach((p, idx) => {
                const d = Math.hypot(p.x - pos.wx, p.z - pos.wz);
                if (d < closestDist) {
                    closestDist = d;
                    closestIdx = idx;
                }
            });

            if (closestIdx !== -1) {
                selectedWpIndex = closestIdx;
                isDraggingWp = true;
                syncRouteAndUI();
            }
        }

        function onCanvasMouseMove(e) {
            if (!isDraggingWp || selectedWpIndex < 0 || selectedWpIndex >= activeProject.waypoints.length) return;
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;
            const pos = canvasPosToWorld(e, canvas);

            activeProject.waypoints[selectedWpIndex].x = pos.wx;
            activeProject.waypoints[selectedWpIndex].z = pos.wz;

            // Update headings
            recalculateCurrentRoute(false);
            syncRouteAndUI(false);
        }

        function onCanvasMouseUp() {
            if (isDraggingWp) {
                isDraggingWp = false;
                syncRouteAndUI(true);
            }
        }

        function onCanvasDblClick(e) {
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;
            const pos = canvasPosToWorld(e, canvas);

            activeProject.waypoints.push({
                x: pos.wx,
                z: pos.wz,
                heading: 0,
                speed: 70,
                action: null,
                desc: `Point ${activeProject.waypoints.length + 1}`
            });

            selectedWpIndex = activeProject.waypoints.length - 1;
            recalculateCurrentRoute(true);
            syncRouteAndUI(true);
            showToast(`Added Waypoint P${selectedWpIndex + 1} at (${pos.wx}m, ${pos.wz}m)`);
        }

        function selectWaypoint(index) {
            if (index >= 0 && index < activeProject.waypoints.length) {
                selectedWpIndex = index;
                syncRouteAndUI(false);
            }
        }

        function updateSelectedWpField(field, value) {
            if (selectedWpIndex < 0 || selectedWpIndex >= activeProject.waypoints.length) return;
            const wp = activeProject.waypoints[selectedWpIndex];

            if (field === 'x') wp.x = Number(value) / 100.0;
            else if (field === 'z') wp.z = Number(value) / 100.0;
            else if (field === 'heading') wp.heading = Number(value);
            else if (field === 'speed') wp.speed = Number(value);
            else if (field === 'action') wp.action = value || null;

            syncRouteAndUI(true);
        }

        function addNewWaypointCenter() {
            let lastX = 0.0, lastZ = 0.0;
            if (activeProject.waypoints.length > 0) {
                const prev = activeProject.waypoints[activeProject.waypoints.length - 1];
                lastX = Math.min(1.0, prev.x + 0.20);
                lastZ = prev.z;
            }

            activeProject.waypoints.push({
                x: Number(lastX.toFixed(2)),
                z: Number(lastZ.toFixed(2)),
                heading: 0,
                speed: 70,
                action: null,
                desc: `Point ${activeProject.waypoints.length + 1}`
            });

            selectedWpIndex = activeProject.waypoints.length - 1;
            recalculateCurrentRoute(true);
            syncRouteAndUI(true);
            showToast(`Added Waypoint P${selectedWpIndex + 1}`);
        }

        function deleteSelectedWaypoint() {
            if (activeProject.waypoints.length <= 2) {
                showToast("Route requires at least 2 waypoints (Start & End).");
                return;
            }

            activeProject.waypoints.splice(selectedWpIndex, 1);
            if (selectedWpIndex >= activeProject.waypoints.length) {
                selectedWpIndex = activeProject.waypoints.length - 1;
            }
            recalculateCurrentRoute(true);
            syncRouteAndUI(true);
            showToast("Waypoint deleted.");
        }

        function clearAllWaypoints() {
            activeProject.waypoints = [
                { x: 1.05, z: -0.45, heading: 0, speed: 70, action: null, desc: "Start Pose" },
                { x: -0.45, z: 0.15, heading: 0, speed: 70, action: null, desc: "Destination" }
            ];
            selectedWpIndex = 0;
            recalculateCurrentRoute(true);
            syncRouteAndUI(true);
            showToast("Route cleared to default Start & Goal.");
        }

        function resetDefaultRoute() {
            if (activeProject.id === "atom-vx-rescue-five-points") {
                loadExampleFivePointRoute();
            } else {
                loadExampleQuickDropBox4Enc();
            }
            showToast("Restored official competition route.");
        }

        function recalculateCurrentRoute(recomputeHeadings = true) {
            if (recomputeHeadings) {
                for (let i = 0; i < activeProject.waypoints.length - 1; i++) {
                    const dx = activeProject.waypoints[i + 1].x - activeProject.waypoints[i].x;
                    const dz = activeProject.waypoints[i + 1].z - activeProject.waypoints[i].z;
                    let hd = Math.round((Math.atan2(dx, dz) * 180) / Math.PI);
                    while (hd > 180) hd -= 360;
                    while (hd < -180) hd += 360;
                    activeProject.waypoints[i].heading = hd;
                }
            }
        }

        function triggerAutoPath() {
            if (activeProject.waypoints.length < 2) {
                showToast("Add a Start and Destination point first.");
                return;
            }

            const startPose = activeProject.waypoints[0];
            const destPose = activeProject.waypoints[activeProject.waypoints.length - 1];

            logTerminal(`[AUTO-PATH] Initiating A* obstacle avoidance from (${startPose.x}, ${startPose.z}) to (${destPose.x}, ${destPose.z})...`);

            // Discrete A* Search inside client
            const bounds = ARENA_BOUNDS[activeProject.id] || ARENA_BOUNDS['atom-vx-rescue-five-points'];
            const gridSize = 0.10;
            const minX = bounds.minX + 0.10;
            const maxX = bounds.maxX - 0.10;
            const minZ = bounds.minZ + 0.10;
            const maxZ = bounds.maxZ - 0.10;

            const gridCols = Math.round((maxX - minX) / gridSize);
            const gridRows = Math.round((maxZ - minZ) / gridSize);

            const toGridX = (x) => Math.max(0, Math.min(gridCols, Math.round((x - minX) / gridSize)));
            const toGridZ = (z) => Math.max(0, Math.min(gridRows, Math.round((z - minZ) / gridSize)));
            const toWorldX = (c) => Number((minX + c * gridSize).toFixed(2));
            const toWorldZ = (r) => Number((minZ + r * gridSize).toFixed(2));

            const isBlocked = (c, r) => {
                const wx = toWorldX(c);
                const wz = toWorldZ(r);
                if (currentArenaData && currentArenaData.cells) {
                    const cellW = (bounds.maxX - bounds.minX) / bounds.cols;
                    const cellH = (bounds.maxZ - bounds.minZ) / bounds.rows;
                    const tileC = Math.floor((wx - bounds.minX) / cellW);
                    const tileR = Math.floor((wz - bounds.minZ) / cellH);
                    if (tileC >= 0 && tileC < bounds.cols && tileR >= 0 && tileR < bounds.rows) {
                        const idx = tileR * bounds.cols + tileC;
                        const cell = currentArenaData.cells[idx];
                        if (cell && (cell.type === 'rescue_pit' || cell.type === 'rescue_closed')) return true;
                    }
                }
                return false;
            };

            const startC = toGridX(startPose.x);
            const startR = toGridZ(startPose.z);
            const destC = toGridX(destPose.x);
            const destR = toGridZ(destPose.z);

            if (isBlocked(destC, destR)) {
                showToast("Destination is inside an impassable obstacle!");
                logTerminal("[ERROR] Destination tile is impassable (Pit or Closed Wall).");
                return;
            }

            const nodeMap = new Map();
            const getKey = (c, r) => `${c}_${r}`;
            const startNode = { c: startC, r: startR, g: 0, h: Math.hypot(destC - startC, destR - startR), parent: null };
            nodeMap.set(getKey(startC, startR), startNode);
            const openList = [startNode];
            const closedSet = new Set();
            let targetNode = null;

            const neighborOffsets = [
                { dc: 1, dr: 0, cost: 1.0 }, { dc: -1, dr: 0, cost: 1.0 },
                { dc: 0, dr: 1, cost: 1.0 }, { dc: 0, dr: -1, cost: 1.0 },
                { dc: 1, dr: 1, cost: 1.414 }, { dc: -1, dr: 1, cost: 1.414 },
                { dc: 1, dr: -1, cost: 1.414 }, { dc: -1, dr: -1, cost: 1.414 }
            ];

            let steps = 0;
            while (openList.length > 0 && steps < 2500) {
                steps++;
                openList.sort((a, b) => (a.g + a.h) - (b.g + b.h));
                const current = openList.shift();
                const curKey = getKey(current.c, current.r);

                if (current.c === destC && current.r === destR) {
                    targetNode = current;
                    break;
                }

                closedSet.add(curKey);

                for (const off of neighborOffsets) {
                    const nc = current.c + off.dc;
                    const nr = current.r + off.dr;
                    if (nc < 0 || nc > gridCols || nr < 0 || nr > gridRows) continue;
                    const nKey = getKey(nc, nr);
                    if (closedSet.has(nKey) || isBlocked(nc, nr)) continue;

                    const tentativeG = current.g + off.cost;
                    let neighbor = nodeMap.get(nKey);
                    if (!neighbor) {
                        neighbor = { c: nc, r: nr, g: tentativeG, h: Math.hypot(destC - nc, destR - nr), parent: current };
                        nodeMap.set(nKey, neighbor);
                        openList.push(neighbor);
                    } else if (tentativeG < neighbor.g) {
                        neighbor.g = tentativeG;
                        neighbor.parent = current;
                    }
                }
            }

            if (!targetNode) {
                showToast("Could not find obstacle-free path to destination.");
                logTerminal("[ERROR] Path search exhausted without reaching destination.");
                return;
            }

            const rawPoints = [];
            let curr = targetNode;
            while (curr) {
                rawPoints.unshift({ x: toWorldX(curr.c), z: toWorldZ(curr.r) });
                curr = curr.parent;
            }

            // Raycast Pruning for clean waypoints
            const newWaypoints = [startPose];
            let anchor = 0;

            const isLineClear = (pA, pB) => {
                const seg = new ClientRouteSegment(pA, pB, 0);
                const testIR = new ClientRouteIR(activeProject.id, [pA, pB], currentArenaData);
                return testIR.checkSegmentCollision(seg, bounds) === null;
            };

            while (anchor < rawPoints.length - 1) {
                let furthest = anchor + 1;
                for (let c = rawPoints.length - 1; c > anchor + 1; c--) {
                    if (isLineClear(rawPoints[anchor], rawPoints[c])) {
                        furthest = c;
                        break;
                    }
                }
                if (furthest === rawPoints.length - 1) {
                    newWaypoints.push(destPose);
                    break;
                } else {
                    const pt = rawPoints[furthest];
                    newWaypoints.push({
                        x: pt.x,
                        z: pt.z,
                        heading: 0,
                        speed: 70,
                        action: null,
                        desc: `Nav Point ${newWaypoints.length}`
                    });
                    anchor = furthest;
                }
            }

            activeProject.waypoints = newWaypoints;
            selectedWpIndex = 0;
            recalculateCurrentRoute(true);
            syncRouteAndUI(true);

            logTerminal(`[AUTO-PATH:SUCCESS] Generated obstacle-avoiding route (${newWaypoints.length} waypoints).`);
            showToast(`Auto Path planned: ${newWaypoints.length} waypoints.`);
        }

        function syncRouteAndUI(updateCode = true) {
            currentRouteIR = new ClientRouteIR(activeProject.id, activeProject.waypoints, currentArenaData);

            // Update Validation Box
            const valBox = document.getElementById('routeValidationBox');
            const summarySpan = document.getElementById('routeStatsSummary');
            const feasBadge = document.getElementById('routeFeasibilityBadge');
            const errDiv = document.getElementById('routeValidationErrors');

            if (valBox && summarySpan && feasBadge) {
                valBox.className = currentRouteIR.isValid ? 'route-validation-box' : 'route-validation-box invalid';
                feasBadge.className = currentRouteIR.isValid ? 'badge-pill blue' : 'badge-pill red';
                feasBadge.textContent = currentRouteIR.isValid ? 'EXECUTABLE TRAJECTORY' : 'OBSTRUCTED ROUTE';

                summarySpan.innerHTML = currentRouteIR.isValid
                    ? `<i class="fas fa-check-circle" style="color: #10b981;"></i> Route Valid: ${currentRouteIR.waypoints.length} Points | ${(currentRouteIR.totalDistance * 100).toFixed(1)} cm | ~${(currentRouteIR.totalDurationMs / 1000).toFixed(2)}s`
                    : `<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Route Blocked: ${currentRouteIR.validationErrors.length} Issue(s) Detected`;

                if (errDiv) {
                    if (currentRouteIR.isValid) {
                        errDiv.style.display = 'none';
                        errDiv.innerHTML = '';
                    } else {
                        errDiv.style.display = 'block';
                        errDiv.innerHTML = currentRouteIR.validationErrors.map(e => `<div>• ${e}</div>`).join('');
                    }
                }
            }

            // Update Waypoint Inspector Fields
            if (selectedWpIndex >= 0 && selectedWpIndex < activeProject.waypoints.length) {
                const wp = activeProject.waypoints[selectedWpIndex];
                const lbl = document.getElementById('lblSelectedWp');
                if (lbl) lbl.innerHTML = `<i class="fas fa-map-marker-alt"></i> Selected: Waypoint P${selectedWpIndex + 1} ${selectedWpIndex === 0 ? '(Start)' : (selectedWpIndex === activeProject.waypoints.length - 1 ? '(Goal)' : '')}`;

                const inpX = document.getElementById('inpWpX');
                const inpZ = document.getElementById('inpWpZ');
                const inpHd = document.getElementById('inpWpHeading');
                const inpSpd = document.getElementById('inpWpSpeed');
                const selAct = document.getElementById('selWpAction');

                if (inpX) inpX.value = Math.round(wp.x * 100);
                if (inpZ) inpZ.value = Math.round(wp.z * 100);
                if (inpHd) inpHd.value = wp.heading;
                if (inpSpd) inpSpd.value = wp.speed || 70;
                if (selAct) selAct.value = wp.action || wp.drop || '';
            }

            // Redraw 2D Canvas
            drawArena2D();

            // Sync 3D robot start pose if stopped
            if (!isSimRunning && robotMesh && activeProject.waypoints.length > 0) {
                const p0 = activeProject.waypoints[0];
                robotMesh.position.set(p0.x, 0.02, p0.z);
                robotMesh.rotation.set(0, (p0.heading * Math.PI) / 180, 0);
            }

            // Render dependent views
            renderActionSheet();
            if (updateCode) {
                renderGeneratedCode();
            }
        }

        // ---------------------------------------------------------------------
        // 2D CANVAS DRAWING (WITH DYNAMIC HEADINGS & COLLISION VISUALIZATION)
        // ---------------------------------------------------------------------
        function drawArena2D() {
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            // Arena Background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);

            const cols = 8;
            const rows = 4;
            const tileW = w / cols;
            const tileH = h / rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = r * cols + c;
                    const x = c * tileW;
                    const y = r * tileH;

                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, tileW, tileH);

                    ctx.fillStyle = "#94a3b8";
                    ctx.font = "8px JetBrains Mono";
                    ctx.fillText(`#${idx}`, x + 3, y + 10);

                    if (currentArenaData && currentArenaData.cells && currentArenaData.cells[idx]) {
                        const cell = currentArenaData.cells[idx];
                        if (cell.type === 'rescue_start' || cell.type === 'quick_box_15') {
                            ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
                            ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
                            ctx.fillStyle = "#059669";
                            ctx.font = "bold 9px Inter";
                            ctx.textAlign = "center";
                            ctx.fillText("START", x + tileW / 2, y + tileH / 2 + 4);
                            ctx.textAlign = "left";
                        } else if (cell.type === 'rescue_finish') {
                            ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
                            ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
                            ctx.fillStyle = "#dc2626";
                            ctx.font = "bold 9px Inter";
                            ctx.textAlign = "center";
                            ctx.fillText("FINISH", x + tileW / 2, y + tileH / 2 + 4);
                            ctx.textAlign = "left";
                        } else if (cell.type === 'rescue_pit') {
                            ctx.fillStyle = "#1e293b";
                            ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
                            ctx.fillStyle = "#f87171";
                            ctx.font = "bold 8px Inter";
                            ctx.fillText("PIT HAZARD", x + 4, y + tileH / 2 + 3);
                        } else if (cell.type === 'rescue_closed') {
                            ctx.fillStyle = "#64748b";
                            ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
                            ctx.fillStyle = "#ffffff";
                            ctx.font = "bold 8px Inter";
                            ctx.fillText("WALL", x + 6, y + tileH / 2 + 3);
                        } else if (cell.type.startsWith('quick_box_')) {
                            ctx.fillStyle = "rgba(2, 132, 199, 0.08)";
                            ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
                            ctx.fillStyle = "#0284c7";
                            ctx.font = "7px JetBrains Mono";
                            ctx.fillText(cell.type.replace('quick_box_', 'QB'), x + 3, y + tileH - 3);
                        }
                    }
                }
            }

            // Draw Objects (Bridge)
            if (activeProject.id === "atom-vx-rescue-five-points" && currentArenaData && currentArenaData.objects) {
                currentArenaData.objects.forEach(obj => {
                    const c = obj.cell % cols;
                    const r = Math.floor(obj.cell / cols);
                    const x = c * tileW;
                    const y = r * tileH;

                    if (obj.type.includes('bridge')) {
                        ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
                        ctx.fillRect(x + 3, y + 3, tileW - 6, tileH - 6);
                        ctx.strokeStyle = "#d97706";
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(x + 3, y + 3, tileW - 6, tileH - 6);
                        ctx.fillStyle = "#b45309";
                        ctx.font = "bold 8px Inter";
                        ctx.fillText(obj.type === 'bridge_platform' ? "BRIDGE" : "RAMP", x + 5, y + tileH / 2 + 3);
                    }
                });
            }

            // Draw Drop Zones
            if (activeProject.id === "quick-box-drop" && currentArenaData && currentArenaData.dropZones) {
                currentArenaData.dropZones.forEach(dz => {
                    const c = dz.cell % cols;
                    const r = Math.floor(dz.cell / cols);
                    const x = c * tileW;
                    const y = r * tileH;

                    ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
                    ctx.fillRect(x + 4, y + 4, tileW - 8, tileH - 8);
                    ctx.strokeStyle = "#10b981";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x + 4, y + 4, tileW - 8, tileH - 8);
                    ctx.fillStyle = "#065f46";
                    ctx.font = "bold 8px Inter";
                    ctx.fillText(dz.id, x + 6, y + tileH / 2 + 3);
                });
            }

            // Draw Route Segments with Collision Diagnostics
            if (currentRouteIR && currentRouteIR.segments) {
                currentRouteIR.segments.forEach((seg, idx) => {
                    const p1x = ((seg.start.x + 1.2) / 2.4) * w;
                    const p1y = ((seg.start.z + 0.6) / 1.2) * h;
                    const p2x = ((seg.end.x + 1.2) / 2.4) * w;
                    const p2y = ((seg.end.z + 0.6) / 1.2) * h;

                    ctx.beginPath();
                    ctx.moveTo(p1x, p1y);
                    ctx.lineTo(p2x, p2y);

                    if (seg.isValid) {
                        ctx.strokeStyle = activeProject.id === "quick-box-drop" ? "#10b981" : "#0284c7";
                        ctx.lineWidth = 3;
                        ctx.setLineDash([]);
                    } else {
                        ctx.strokeStyle = "#ef4444";
                        ctx.lineWidth = 4;
                        ctx.setLineDash([5, 5]);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Collision warning icon at midpoint
                    if (!seg.isValid) {
                        const midX = (p1x + p2x) / 2;
                        const midY = (p1y + p2y) / 2;
                        ctx.fillStyle = "#ef4444";
                        ctx.beginPath();
                        ctx.arc(midX, midY, 6, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#ffffff";
                        ctx.font = "bold 9px Inter";
                        ctx.textAlign = "center";
                        ctx.fillText("!", midX, midY + 3);
                        ctx.textAlign = "left";
                    }
                });
            }

            // Draw Waypoints with Heading Arrows & Selection Rings
            activeProject.waypoints.forEach((p, idx) => {
                const px = ((p.x + 1.2) / 2.4) * w;
                const py = ((p.z + 0.6) / 1.2) * h;

                // Selection Ring
                if (idx === selectedWpIndex) {
                    ctx.strokeStyle = "#f59e0b";
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(px, py, 9, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Node Circle
                ctx.fillStyle = idx === 0 ? "#10b981" : (idx === activeProject.waypoints.length - 1 ? "#ef4444" : (p.action ? "#f59e0b" : "#0284c7"));
                ctx.beginPath();
                ctx.arc(px, py, 5, 0, Math.PI * 2);
                ctx.fill();

                // Directional Heading Arrow
                const rad = (p.heading * Math.PI) / 180.0;
                // In canvas: +Z is downward (+Y in canvas), -X is left (-X in canvas), +X is right
                const arrowLen = 14;
                const arrX = px + Math.sin(rad) * arrowLen;
                const arrY = py + Math.cos(rad) * arrowLen;

                ctx.strokeStyle = "#0f172a";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(arrX, arrY);
                ctx.stroke();

                // Label
                ctx.fillStyle = "#0f172a";
                ctx.font = "bold 9px Inter";
                ctx.fillText(`P${idx + 1}`, px + 8, py - 4);
            });
        }

        // ---------------------------------------------------------------------
        // DYNAMIC ACTION SHEET RENDERER
        // ---------------------------------------------------------------------
        function renderActionSheet() {
            const tbody = document.getElementById('actionSheetRows');
            if (!tbody || !currentRouteIR) return;

            const primitives = clientCompilePrimitives(currentRouteIR);

            tbody.innerHTML = primitives.map((p, idx) => {
                const cppCall = p.op.toCpp(...p.args);
                let paramsDesc = "";
                if (p.op.name === 'FF' || p.op.name === 'BB') {
                    paramsDesc = `Speed ${p.args[0]}%, ${p.args[1]} ms`;
                } else if (p.op.name === 'spinDegree') {
                    paramsDesc = `Gyro Spin ${p.args[0]}°`;
                } else if (p.op.name.startsWith('Drop')) {
                    paramsDesc = `Servo Trigger (${p.op.name})`;
                } else {
                    paramsDesc = "Stop All Motors";
                }

                return `
                    <tr>
                        <td><span class="step-badge">${idx + 1}</span></td>
                        <td style="font-family: var(--font-code); font-weight: 700; color: #0284c7;">${cppCall}</td>
                        <td style="color: var(--mb-text-muted); font-family: var(--font-code);">${paramsDesc}</td>
                        <td>
                            <div>${p.comment}</div>
                            <span class="tag-obstacle" style="background: rgba(2, 132, 199, 0.1); color: #0284c7; font-size: 0.65rem;">
                                <i class="fas fa-code-branch"></i> ${p.op.source}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ---------------------------------------------------------------------
        // DYNAMIC CODE GENERATOR (ARDUINO C++, SERIAL PROTOCOL, MICROPYTHON)
        // ---------------------------------------------------------------------
        function renderGeneratedCode() {
            const pre = document.getElementById('codeDisplayArea');
            const valBadge = document.getElementById('codeValBadge');
            if (!pre || !currentRouteIR) return;

            const primitives = clientCompilePrimitives(currentRouteIR);
            let code = "";

            if (currentCodeLang === 'serial') {
                const lines = ['PING', 'MISSION:CLEAR', `MISSION:START:${primitives.length}`];
                primitives.forEach((p, idx) => {
                    lines.push(p.op.toSerial(idx + 1, ...p.args));
                });
                lines.push('MISSION:COMMIT');
                code = lines.join('\\n');
            } else if (currentCodeLang === 'py') {
                const steps = primitives.map((p, idx) => {
                    if (p.op.name === 'FF') {
                        return `    # Step ${idx + 1}: ${p.comment}\\n    motor.drive_forward(speed=${p.args[0]}, duration_ms=${p.args[1]})`;
                    } else if (p.op.name === 'BB') {
                        return `    # Step ${idx + 1}: ${p.comment}\\n    motor.drive_reverse(speed=${p.args[0]}, duration_ms=${p.args[1]})`;
                    } else if (p.op.name === 'spinDegree') {
                        return `    # Step ${idx + 1}: ${p.comment}\\n    imu.spin_degree(${p.args[0]})`;
                    } else if (p.op.name.startsWith('Drop')) {
                        return `    # Step ${idx + 1}: ${p.comment}\\n    servo.${p.op.name.toLowerCase()}()`;
                    } else {
                        return `    # Step ${idx + 1}: ${p.comment}\\n    motor.stop()`;
                    }
                }).join('\\n\\n');

                code = `# PT-BOT ATOM VX · AUTO-GENERATED MICROPYTHON MISSION\\nimport board\\nimport motor\\nimport servo\\nimport imu\\nimport utime\\n\\ndef run_mission():\\n    print("[RUN] Starting MicroPython Autonomous Mission...")\\n    imu.reset_yaw()\\n\\n${steps}\\n\\n    print("[SUCCESS] Mission Completed.")\\n\\nif __name__ == "__main__":\\n    run_mission()\\n`;
            } else {
                // Arduino C++ (.ino)
                const missionBody = primitives.map((p, idx) => {
                    const cppCall = p.op.toCpp(...p.args);
                    return `    // Step ${idx + 1}: ${p.comment}\\n    ${cppCall}`;
                }).join('\\n\\n');

                code = `/**\\n * =============================================================================\\n * PT-BOT ATOM VX · AUTO-GENERATED TACTICAL MISSION SKETCH\\n * Mission: ${activeProject.name}\\n * Total Distance: ${(currentRouteIR.totalDistance * 100).toFixed(1)} cm | Est. Duration: ${(currentRouteIR.totalDurationMs / 1000).toFixed(2)} s\\n * Authoritative Firmware Grounding: firmware/PT_BOT_Middle_3Drop_ATOM_VX\\n * =============================================================================\\n */\\n\\n#include <PTBOTAtomVX.h>\\n\\n// Optical Line Sensor Calibration (ADC 0-1023)\\nint sensor_min[] = { 100, 100, 100, 100, 100, 100, 100, 100 };\\nint sensor_max[] = { 400, 500, 800, 700, 600, 700, 800, 600 };\\nfloat power_factor = 1.0;\\nint line_value[] = { 0, 0, 0, 0, 0, 0, 0, 0 };\\nfloat current_degree = 0;\\nfloat previous_error_forward = 0;\\n\\n// Servo Calibration: Front-Left (S2), Front-Right (S1), Rear (S0)\\n#define CH_SERVO_FRONT_LEFT 2\\nint ServoFrontLeft_Lock = 95;\\nint ServoFrontLeft_Drop = 50;\\n\\n#define CH_SERVO_FRONT_RIGHT 1\\nint ServoFrontRight_Lock = 0;\\nint ServoFrontRight_Drop = 55;\\n\\n#define CH_SERVO_BACK 0\\nint ServoBack_Lock = 0;\\nint ServoBack_Drop = 55;\\n\\nlong delayALL = 50;\\n\\nvoid setup() {\\n  Serial.begin(115200);\\n  initialize();\\n  config();\\n\\n  // Gyro IMU Turn Speed & Precision Stop Tolerances\\n  setSpeed_spin(100);\\n  setSpeed_turn(100);\\n  setDegreeStop_SpinLeft(2.85);\\n  setDegreeStop_SpinRight(2.95);\\n  setDegreeStop_TurnLeft(4.0);\\n  setDegreeStop_TurnRight(4.0);\\n\\n  Serial.println(F("[READY] PT-BOT Atom VX Mission Initialized."));\\n}\\n\\nvoid executeAutoTacticalMission() {\\n  Serial.println(F("[RUN] Starting Tactical Mission Sequence..."));\\n\\n${missionBody}\\n\\n  Serial.println(F("[SUCCESS] Tactical Mission Completed Successfully!"));\\n}\\n\\nvoid loop() {\\n  STOP();\\n  setAngleOffset();\\n  current_degree = 0;\\n\\n  executeAutoTacticalMission();\\n\\n  while (1) {\\n    motorStop();\\n    delay(500);\\n  }\\n}\\n`;
            }

            pre.textContent = code;

            if (valBadge) {
                if (currentRouteIR.isValid) {
                    valBadge.className = "code-val-badge";
                    valBadge.innerHTML = `<i class="fas fa-check-circle"></i> 100% FIRMWARE VERIFIED`;
                } else {
                    valBadge.className = "code-val-badge invalid";
                    valBadge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ROUTE HAS OBSTACLES`;
                }
            }
        }

        function copyCurrentCode() {
            const pre = document.getElementById('codeDisplayArea');
            if (pre) {
                navigator.clipboard.writeText(pre.textContent).then(() => {
                    showToast("Code copied to clipboard!");
                }).catch(() => {
                    showToast("Could not copy code.");
                });
            }
        }

        function exportCurrentCode() {
            const pre = document.getElementById('codeDisplayArea');
            if (!pre) return;
            const ext = currentCodeLang === 'ino' ? 'ino' : (currentCodeLang === 'py' ? 'py' : 'txt');
            const filename = `ptbot_mission_${activeProject.id}.${ext}`;
            const blob = new Blob([pre.textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`Exported ${filename}`);
        }
"""

# In client_code, escape backticks as \` and ${ as \${
client_code_escaped = client_code.replace("`", "\\`")
client_code_escaped = re.sub(r'(?<!\\)\$\{', r'\\${', client_code_escaped)

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = "function initArena2dCanvas() {"
end_marker = "function handleConnectSerial() {"

start_pos = text.find(start_marker)
end_pos = text.find(end_marker)

if start_pos == -1 or end_pos == -1:
    print(f"Error: Markers not found! start_pos={start_pos}, end_pos={end_pos}")
    exit(1)

new_text = text[:start_pos] + client_code_escaped + "\n        " + text[end_pos:]

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Embedded Auto Path & Auto Code engine into build_rescue_sim_ide.js successfully!")
