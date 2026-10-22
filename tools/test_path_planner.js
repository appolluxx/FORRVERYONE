// Test Autonomous Path Planner
const fs = require('fs');

class TestPathPlanner {
    static getValidNeighbors(cellIdx, grid) {
        const cols = 8;
        const rows = 4;
        const c = cellIdx % cols;
        const r = Math.floor(cellIdx / cols);
        const neighbors = [];

        const blockedTypes = ['pit', 'blackhole', 'rescue_pit', 'bomb', 'rescue_bomb'];

        // North
        if (r > 0) {
            const n = cellIdx - cols;
            const t = (grid[n]?.type || '').toLowerCase();
            if (!blockedTypes.some(b => t.includes(b))) neighbors.push({ idx: n, dir: 'N' });
        }
        // South
        if (r < rows - 1) {
            const s = cellIdx + cols;
            const t = (grid[s]?.type || '').toLowerCase();
            if (!blockedTypes.some(b => t.includes(b))) neighbors.push({ idx: s, dir: 'S' });
        }
        // East
        if (c < cols - 1) {
            const e = cellIdx + 1;
            const t = (grid[e]?.type || '').toLowerCase();
            if (!blockedTypes.some(b => t.includes(b))) neighbors.push({ idx: e, dir: 'E' });
        }
        // West
        if (c > 0) {
            const w = cellIdx - 1;
            const t = (grid[w]?.type || '').toLowerCase();
            if (!blockedTypes.some(b => t.includes(b))) neighbors.push({ idx: w, dir: 'W' });
        }

        return neighbors;
    }

    static findShortestPathBFS(startIdx, targetIdx, grid) {
        if (startIdx === targetIdx) return [startIdx];
        const queue = [[startIdx]];
        const visited = new Set([startIdx]);

        while (queue.length > 0) {
            const path = queue.shift();
            const curr = path[path.length - 1];
            if (curr === targetIdx) return path;

            const neighbors = this.getValidNeighbors(curr, grid);
            for (const n of neighbors) {
                if (!visited.has(n.idx)) {
                    visited.add(n.idx);
                    queue.push([...path, n.idx]);
                }
            }
        }
        return null;
    }

    static planFullMission(arenaData) {
        const grid = arenaData.gridData || arenaData.cells || [];
        // Find special cells
        let startIdx = -1;
        let finishIdx = -1;
        const checkpoints = [];
        const drops = [];

        grid.forEach((cell, idx) => {
            const t = (cell.type || '').toLowerCase();
            if (t === 'start' || t === 'rescue_start') startIdx = idx;
            else if (t === 'finish' || t === 'rescue_finish') finishIdx = idx;
            else if (t.includes('checkpoint')) checkpoints.push(idx);
            else if (t.includes('drop') || t.includes('box')) drops.push(idx);
        });

        if (startIdx === -1) startIdx = 31; // default bottom-right
        if (finishIdx === -1) finishIdx = 0;  // default top-left

        const waypoints = [];
        let currCell = startIdx;
        let currHeading = 90; // Facing South/Start default

        const cellToCoord = (idx) => {
            const c = idx % 8;
            const r = Math.floor(idx / 8);
            return {
                x: parseFloat((-1.05 + c * 0.30).toFixed(2)),
                z: parseFloat((-0.45 + r * 0.30).toFixed(2))
            };
        };

        const startCoord = cellToCoord(startIdx);
        waypoints.push({
            id: 1,
            x: startCoord.x,
            z: startCoord.z,
            label: "START (Bay Launch)",
            fn: "START",
            speed: 0,
            time: 0,
            angle: currHeading,
            kp: 0.6,
            kd: 2.0
        });

        // Sequence of goals: Checkpoints -> Drops -> Finish
        const goals = [...checkpoints, ...drops];
        if (finishIdx !== -1 && !goals.includes(finishIdx)) {
            goals.push(finishIdx);
        }

        let unvisited = [...goals];
        let legCount = 1;

        while (unvisited.length > 0) {
            // Find closest reachable goal
            let bestPath = null;
            let bestGoalIdx = -1;

            for (let i = 0; i < unvisited.length; i++) {
                const target = unvisited[i];
                const p = this.findShortestPathBFS(currCell, target, grid);
                if (p && (!bestPath || p.length < bestPath.length)) {
                    bestPath = p;
                    bestGoalIdx = i;
                }
            }

            if (!bestPath) {
                console.warn("Target unreachable, breaking loop");
                break;
            }

            const goalCell = unvisited[bestGoalIdx];
            unvisited.splice(bestGoalIdx, 1);

            // Convert path into straight segments
            for (let i = 1; i < bestPath.length; i++) {
                const fromCell = bestPath[i - 1];
                const toCell = bestPath[i];
                const fc = fromCell % 8, fr = Math.floor(fromCell / 8);
                const tc = toCell % 8, tr = Math.floor(toCell / 8);

                let desiredHeading = currHeading;
                if (tc > fc) desiredHeading = 0;        // East
                else if (tc < fc) desiredHeading = 180; // West
                else if (tr > fr) desiredHeading = 90;  // South
                else if (tr < fr) desiredHeading = -90; // North

                const coord = cellToCoord(toCell);
                const tileType = (grid[toCell]?.type || '').toLowerCase();

                let stepSpeed = 70;
                let stepTime = 0.45;
                if (tileType.includes('bridge')) { stepSpeed = 55; stepTime = 1.1; }
                else if (tileType.includes('bump')) { stepSpeed = 45; stepTime = 0.85; }
                else if (tileType.includes('seesaw')) { stepSpeed = 40; stepTime = 0.95; }

                // Insert turn if heading changed
                if (desiredHeading !== currHeading) {
                    currHeading = desiredHeading;
                }

                const isGoal = (toCell === goalCell);
                let fn = "FORWARD";
                let label = `WP ${waypoints.length + 1}`;

                if (isGoal) {
                    if (tileType.includes('drop')) {
                        const dropServos = ["DROP_FL", "DROP_FR", "DROP_B", "DROP_FL"];
                        fn = dropServos[(legCount - 1) % 4];
                        label = `DROP ZONE ${legCount}`;
                        legCount++;
                    } else if (tileType.includes('checkpoint')) {
                        label = `CHECKPOINT ${toCell}`;
                    } else if (toCell === finishIdx) {
                        fn = "STOP";
                        label = "FINISH DOCK";
                    }
                }

                waypoints.push({
                    id: waypoints.length + 1,
                    x: coord.x,
                    z: coord.z,
                    label,
                    fn,
                    speed: stepSpeed,
                    time: stepTime,
                    angle: currHeading,
                    kp: 0.6,
                    kd: 2.0
                });

                // If drop, add backward recoil step
                if (isGoal && tileType.includes('drop') && bestPath.length >= 2) {
                    const recoilCell = bestPath[i - 1];
                    const recoilCoord = cellToCoord(recoilCell);
                    waypoints.push({
                        id: waypoints.length + 1,
                        x: recoilCoord.x,
                        z: recoilCoord.z,
                        label: `RECOIL RETREAT`,
                        fn: "BACKWARD",
                        speed: 50,
                        time: 0.35,
                        angle: currHeading,
                        kp: 0.6,
                        kd: 2.0
                    });
                }
            }

            currCell = goalCell;
        }

        return waypoints;
    }
}

// Test with official_field_mission.json
const officialField = JSON.parse(fs.readFileSync('data/arenas/official_field_mission.json', 'utf8'));
const planned = TestPathPlanner.planFullMission(officialField);
console.log(`Planned ${planned.length} waypoints for Official Field.`);
console.log("Sample waypoints:", planned.slice(0, 5));
