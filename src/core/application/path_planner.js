/**
 * =============================================================================
 * PT-BOT TACTICAL IDE · AUTO PATH PLANNER
 * Collision-aware tactical route generator for PT Atom VX on competition arenas
 * =============================================================================
 */

const { Waypoint, RouteSegment, RouteIR, ARENA_BOUNDS, ROBOT_RADIUS } = require('../domain/route_ir');

class PathPlanner {
    constructor(projectId = 'atom-vx-rescue-five-points', arenaData = null) {
        this.projectId = projectId;
        this.arenaData = arenaData;
        this.bounds = ARENA_BOUNDS[projectId] || ARENA_BOUNDS['atom-vx-rescue-five-points'];
        this.waypoints = [];
    }

    setArena(projectId, arenaData) {
        this.projectId = projectId;
        this.arenaData = arenaData;
        this.bounds = ARENA_BOUNDS[projectId] || ARENA_BOUNDS['atom-vx-rescue-five-points'];
    }

    setWaypoints(waypoints) {
        this.waypoints = waypoints.map(w => new Waypoint(w.x, w.z, w.heading, w.speed, w.action || w.drop, w.desc));
        return this.compileRoute();
    }

    addWaypoint(x, z, heading = null, speed = 70, action = null, desc = "") {
        let calcHeading = heading;
        if (calcHeading === null && this.waypoints.length > 0) {
            const prev = this.waypoints[this.waypoints.length - 1];
            const dx = x - prev.x;
            const dz = z - prev.z;
            calcHeading = Math.round((Math.atan2(dx, dz) * 180) / Math.PI);
            while (calcHeading > 180) calcHeading -= 360;
            while (calcHeading < -180) calcHeading += 360;
        } else if (calcHeading === null) {
            calcHeading = 0;
        }

        const wp = new Waypoint(x, z, calcHeading, speed, action, desc);
        this.waypoints.push(wp);
        return this.compileRoute();
    }

    insertWaypoint(index, wp) {
        this.waypoints.splice(index, 0, new Waypoint(wp.x, wp.z, wp.heading, wp.speed, wp.action, wp.desc));
        return this.compileRoute();
    }

    updateWaypoint(index, updates) {
        if (index >= 0 && index < this.waypoints.length) {
            const cur = this.waypoints[index];
            this.waypoints[index] = new Waypoint(
                updates.x !== undefined ? updates.x : cur.x,
                updates.z !== undefined ? updates.z : cur.z,
                updates.heading !== undefined ? updates.heading : cur.heading,
                updates.speed !== undefined ? updates.speed : cur.speed,
                updates.action !== undefined ? updates.action : cur.action,
                updates.desc !== undefined ? updates.desc : cur.desc
            );
        }
        return this.compileRoute();
    }

    removeWaypoint(index) {
        if (index >= 0 && index < this.waypoints.length) {
            this.waypoints.splice(index, 1);
        }
        return this.compileRoute();
    }

    clearRoute() {
        this.waypoints = [];
        return this.compileRoute();
    }

    compileRoute() {
        return new RouteIR(this.projectId, this.waypoints, this.arenaData);
    }

    /**
     * Line of sight collision check between two arbitrary points
     */
    isSegmentClear(pA, pB) {
        const testSeg = new RouteSegment(pA, pB, 0);
        const testIR = new RouteIR(this.projectId, [pA, pB], this.arenaData);
        return testIR.checkSegmentCollision(testSeg, this.bounds) === null;
    }

    /**
     * Discrete Grid A* Path Search with Line-of-Sight Shortcut Simplification
     */
    planAutoPath(startPose, destPose, speed = 70) {
        const start = new Waypoint(startPose.x, startPose.z, startPose.heading || 0, speed, null, "Auto Start");
        const dest = new Waypoint(destPose.x, destPose.z, destPose.heading || 0, speed, destPose.action, "Auto Destination");

        // 1. Check direct line of sight first
        if (this.isSegmentClear(start, dest)) {
            const dx = dest.x - start.x;
            const dz = dest.z - start.z;
            let hd = Math.round((Math.atan2(dx, dz) * 180) / Math.PI);
            while (hd > 180) hd -= 360;
            while (hd < -180) hd += 360;
            start.heading = hd;

            const directIR = new RouteIR(this.projectId, [start, dest], this.arenaData);
            return {
                success: true,
                waypoints: [start, dest],
                routeIR: directIR,
                method: "DIRECT_LINE_OF_SIGHT",
                explanation: "Direct linear path is completely clear of obstacles."
            };
        }

        // 2. Setup Discrete 10cm Grid
        const gridSize = 0.10; // 10 cm resolution
        const minX = this.bounds.minX + 0.10;
        const maxX = this.bounds.maxX - 0.10;
        const minZ = this.bounds.minZ + 0.10;
        const maxZ = this.bounds.maxZ - 0.10;

        const gridCols = Math.round((maxX - minX) / gridSize);
        const gridRows = Math.round((maxZ - minZ) / gridSize);

        const toGridX = (x) => Math.max(0, Math.min(gridCols, Math.round((x - minX) / gridSize)));
        const toGridZ = (z) => Math.max(0, Math.min(gridRows, Math.round((z - minZ) / gridSize)));
        const toWorldX = (c) => minX + c * gridSize;
        const toWorldZ = (r) => minZ + r * gridSize;

        const isGridBlocked = (c, r) => {
            const wx = toWorldX(c);
            const wz = toWorldZ(r);

            if (this.arenaData && this.arenaData.cells) {
                const cellW = (this.bounds.maxX - this.bounds.minX) / this.bounds.cols;
                const cellH = (this.bounds.maxZ - this.bounds.minZ) / this.bounds.rows;

                const tileC = Math.floor((wx - this.bounds.minX) / cellW);
                const tileR = Math.floor((wz - this.bounds.minZ) / cellH);

                if (tileC >= 0 && tileC < this.bounds.cols && tileR >= 0 && tileR < this.bounds.rows) {
                    const idx = tileR * this.bounds.cols + tileC;
                    const cell = this.arenaData.cells[idx];
                    if (cell && (cell.type === 'rescue_pit' || cell.type === 'rescue_closed')) {
                        return true;
                    }
                }
            }
            return false;
        };

        const startC = toGridX(start.x);
        const startR = toGridZ(start.z);
        const destC = toGridX(dest.x);
        const destR = toGridZ(dest.z);

        if (isGridBlocked(destC, destR)) {
            const directIR = new RouteIR(this.projectId, [start, dest], this.arenaData);
            return {
                success: false,
                waypoints: [start],
                routeIR: directIR,
                method: "BLOCKED",
                explanation: `Destination (${dest.x.toFixed(2)}, ${dest.z.toFixed(2)}) is inside an impassable obstacle.`
            };
        }

        // Discrete A* Search
        const nodeMap = new Map();
        const getKey = (c, r) => `${c}_${r}`;

        const startNode = {
            c: startC,
            r: startR,
            g: 0,
            h: Math.hypot(destC - startC, destR - startR),
            parent: null
        };

        nodeMap.set(getKey(startC, startR), startNode);
        const openList = [startNode];
        const closedSet = new Set();
        let targetNode = null;

        const neighborOffsets = [
            { dc: 1, dr: 0, cost: 1.0 },
            { dc: -1, dr: 0, cost: 1.0 },
            { dc: 0, dr: 1, cost: 1.0 },
            { dc: 0, dr: -1, cost: 1.0 },
            { dc: 1, dr: 1, cost: 1.414 },
            { dc: -1, dr: 1, cost: 1.414 },
            { dc: 1, dr: -1, cost: 1.414 },
            { dc: -1, dr: -1, cost: 1.414 }
        ];

        let steps = 0;
        const maxSteps = 2500;

        while (openList.length > 0 && steps < maxSteps) {
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
                if (closedSet.has(nKey) || isGridBlocked(nc, nr)) continue;

                const tentativeG = current.g + off.cost;
                let neighbor = nodeMap.get(nKey);

                if (!neighbor) {
                    neighbor = {
                        c: nc,
                        r: nr,
                        g: tentativeG,
                        h: Math.hypot(destC - nc, destR - nr),
                        parent: current
                    };
                    nodeMap.set(nKey, neighbor);
                    openList.push(neighbor);
                } else if (tentativeG < neighbor.g) {
                    neighbor.g = tentativeG;
                    neighbor.parent = current;
                }
            }
        }

        if (!targetNode) {
            const directIR = new RouteIR(this.projectId, [start, dest], this.arenaData);
            return {
                success: false,
                waypoints: [start],
                routeIR: directIR,
                method: "BLOCKED",
                explanation: `No obstacle-free path could be found to (${dest.x.toFixed(2)}, ${dest.z.toFixed(2)}).`
            };
        }

        // Trace back raw grid path
        const rawPoints = [];
        let curr = targetNode;
        while (curr) {
            rawPoints.unshift({ x: toWorldX(curr.c), z: toWorldZ(curr.r) });
            curr = curr.parent;
        }

        // Greedy Line-of-Sight Shortcut Simplification (Raycast Pruning)
        // Ensures EVERY shortcut is strictly collision-free
        const waypoints = [start];
        let anchorIdx = 0;

        while (anchorIdx < rawPoints.length - 1) {
            let furthestIdx = anchorIdx + 1;
            for (let checkIdx = rawPoints.length - 1; checkIdx > anchorIdx + 1; checkIdx--) {
                const pA = new Waypoint(rawPoints[anchorIdx].x, rawPoints[anchorIdx].z);
                const pB = new Waypoint(rawPoints[checkIdx].x, rawPoints[checkIdx].z);
                if (this.isSegmentClear(pA, pB)) {
                    furthestIdx = checkIdx;
                    break;
                }
            }

            if (furthestIdx === rawPoints.length - 1) {
                waypoints.push(dest);
                break;
            } else {
                const pt = rawPoints[furthestIdx];
                waypoints.push(new Waypoint(pt.x, pt.z, 0, speed, null, `Nav Waypoint ${waypoints.length}`));
                anchorIdx = furthestIdx;
            }
        }

        // Compute segment headings
        for (let i = 0; i < waypoints.length - 1; i++) {
            const dx = waypoints[i + 1].x - waypoints[i].x;
            const dz = waypoints[i + 1].z - waypoints[i].z;
            let hd = Math.round((Math.atan2(dx, dz) * 180) / Math.PI);
            while (hd > 180) hd -= 360;
            while (hd < -180) hd += 360;
            waypoints[i].heading = hd;
        }
        waypoints[waypoints.length - 1].heading = destPose.heading !== undefined ? destPose.heading : waypoints[waypoints.length - 2].heading;

        const autoIR = new RouteIR(this.projectId, waypoints, this.arenaData);
        return {
            success: autoIR.isValid,
            waypoints: waypoints,
            routeIR: autoIR,
            method: "ASTAR_OBSTACLE_AVOIDANCE",
            explanation: `Successfully routed around obstacles using ${waypoints.length} tactical waypoints (${(autoIR.totalDistance * 100).toFixed(1)} cm total length).`
        };
    }
}

module.exports = {
    PathPlanner
};
