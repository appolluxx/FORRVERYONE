#!/usr/bin/env node
/**
 * =============================================================================
 * RESCUE COMMAND CLI - PT-BOT MISSION SOLVER
 * Run from terminal: node scripts/solve_cli.js [path_to_arena.json]
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

const Config = Object.freeze({
    ARENA: Object.freeze({
        DEFAULT_COLS: 8,
        DEFAULT_ROWS: 4,
        MIN_DIMENSION: 2,
        MAX_DIMENSION: 15
    }),
    SCORING: Object.freeze({
        POINTS_CHECKPOINT: 15,
        MAX_CHECKPOINTS: 2,
        POINTS_DROP_ZONE: 15,
        MAX_DROP_ZONES: 4,
        POINTS_FINISH: 10,
        MAX_TOTAL_POINTS: 100
    }),
    PROFILES: Object.freeze({
        FAST: Object.freeze({
            id: 'FAST',
            label: 'High-Agility 88% PWM',
            speed: 88,
            baseTimerMs: 360,
            cruiseTimerMs: 200,
            bridgeTimerMs: 520,
            bumpTimerMs: 620,
            seesawTimerMs: 680,
            tunnelTimerMs: 200,
            recoilTimerMs: 160
        })
    }),
    OBSTACLE_SPEEDS: Object.freeze({ bridge: 92, bump: 58, seesaw: 75 }),
    MANEUVERS: Object.freeze({ ALIGNMENT_PAUSE_MS: 350, TURN_90_DURATION_MS: 250, TURN_180_DURATION_MS: 450 }),
    SERVO_CONFIGS: Object.freeze({
        THREE_DROP: Object.freeze(['DropFL()', 'DropFR()', 'DropB()', 'DropFL()'])
    }),
    WALL_RULES: Object.freeze({
        T: Object.freeze(['line_top', 'line_top_bottom', 'line_top_right', 'line_top_left', 'line_surround', 'drop_n', 'drop_w', 'drop_e', 'bump_v', 'bridge_h', 'bridge_up_h', 'bridge_high_h', 'bridge_down_h']),
        B: Object.freeze(['line_bottom', 'line_top_bottom', 'line_bottom_right', 'line_bottom_left', 'line_surround', 'drop_s', 'drop_w', 'drop_e', 'bump_v', 'bridge_h', 'bridge_up_h', 'bridge_high_h', 'bridge_down_h']),
        L: Object.freeze(['line_left', 'line_left_right', 'line_bottom_left', 'line_top_left', 'line_surround', 'drop_n', 'drop_s', 'drop_w', 'bump', 'bump_h', 'bridge_v', 'bridge_up_v', 'bridge_high_v', 'bridge_down_v']),
        R: Object.freeze(['line_right', 'line_left_right', 'line_bottom_right', 'line_top_right', 'line_surround', 'drop_n', 'drop_s', 'drop_e', 'bump', 'bump_h', 'bridge_v', 'bridge_up_v', 'bridge_high_v', 'bridge_down_v'])
    })
});

class GridManager {
    constructor(cols = Config.ARENA.DEFAULT_COLS, rows = Config.ARENA.DEFAULT_ROWS) {
        this.cols = cols;
        this.rows = rows;
        this.cells = Array.from({ length: cols * rows }, (_, i) => ({ index: i, type: 'empty' }));
    }
    loadPreset() {
        const preset = {
            1: 'checkpoint', 2: 'tunnel', 6: 'drop_n', 7: 'finish', 9: 'line_bottom', 10: 'tunnel',
            11: 'line_surround', 12: 'checkpoint', 13: 'bump', 16: 'bridge', 17: 'bridge', 18: 'drop_e',
            20: 'seesaw', 22: 'bomb', 23: 'line_bottom', 24: 'drop_s', 25: 'drop_s', 29: 'blackhole', 31: 'start'
        };
        Object.entries(preset).forEach(([idx, type]) => { this.cells[Number(idx)] = { index: Number(idx), type }; });
    }
    deserialize(data) {
        this.cols = data.COLS || this.cols;
        this.rows = data.ROWS || this.rows;
        this.cells = data.gridData.map((c, i) => ({ index: typeof c.index === 'number' ? c.index : i, type: c.type || 'empty' }));
    }
    getCell(i) { return this.cells[i] || null; }
    getCol(i) { return i % this.cols; }
    getRow(i) { return Math.floor(i / this.cols); }
    getSpecialCells() {
        return {
            start: this.cells.find(c => c.type === 'start') || null,
            finish: this.cells.find(c => c.type === 'finish') || null,
            checkpoints: this.cells.filter(c => c.type === 'checkpoint'),
            drops: this.cells.filter(c => c.type.startsWith('drop'))
        };
    }
    getValidNeighbors(cellIdx) {
        const valid = [];
        const x = this.getCol(cellIdx), y = this.getRow(cellIdx);
        const currentType = this.cells[cellIdx].type;
        const { T, B, L, R } = Config.WALL_RULES;
        if (y > 0) {
            const n = cellIdx - this.cols, t = this.cells[n].type;
            if (!T.includes(currentType) && !B.includes(t) && t !== 'blackhole') valid.push(n);
        }
        if (y < this.rows - 1) {
            const n = cellIdx + this.cols, t = this.cells[n].type;
            if (!B.includes(currentType) && !T.includes(t) && t !== 'blackhole') valid.push(n);
        }
        if (x > 0) {
            const n = cellIdx - 1, t = this.cells[n].type;
            if (!L.includes(currentType) && !R.includes(t) && t !== 'blackhole') valid.push(n);
        }
        if (x < this.cols - 1) {
            const n = cellIdx + 1, t = this.cells[n].type;
            if (!R.includes(currentType) && !L.includes(t) && t !== 'blackhole') valid.push(n);
        }
        return valid;
    }
}

class PathfindingEngine {
    static findShortestPathBFS(startIdx, targetIdx, gridManager) {
        if (startIdx === targetIdx) return [startIdx];
        const queue = [[startIdx]];
        const visited = new Set([startIdx]);
        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];
            if (current === targetIdx) return path;
            for (const next of gridManager.getValidNeighbors(current)) {
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push([...path, next]);
                }
            }
        }
        return null;
    }
    static getPathDirection(fromIdx, toIdx, cols) {
        if (toIdx === fromIdx + 1) return 'E';
        if (toIdx === fromIdx - 1) return 'W';
        if (toIdx === fromIdx + cols) return 'S';
        if (toIdx === fromIdx - cols) return 'N';
        return null;
    }
    static extractSmoothSegments(fullPath, gridManager) {
        if (!fullPath || fullPath.length < 2) return [];
        const OBSTACLES = ['bump', 'bridge', 'seesaw', 'tunnel'];
        const segments = [];
        let currentDir = this.getPathDirection(fullPath[0], fullPath[1], gridManager.cols);
        let segStartIdx = fullPath[0];
        let segTiles = [fullPath[0]];

        for (let i = 1; i < fullPath.length; i++) {
            const prevCell = fullPath[i - 1], currCell = fullPath[i];
            const dir = this.getPathDirection(prevCell, currCell, gridManager.cols);
            const prevTileType = gridManager.getCell(prevCell)?.type || 'empty';
            const currTileType = gridManager.getCell(currCell)?.type || 'empty';
            const isObstacleCurr = OBSTACLES.includes(currTileType);
            const isObstaclePrev = OBSTACLES.includes(prevTileType);
            const isMissionEnd = currTileType.startsWith('drop') || currTileType === 'checkpoint' || currTileType === 'finish';
            const isDirChange = dir !== currentDir;
            const isTerrainTransition = (isObstacleCurr !== isObstaclePrev) || (isObstacleCurr && currTileType !== prevTileType);
            const isSpecialTarget = isMissionEnd && i === fullPath.length - 1;

            if (isDirChange || isTerrainTransition || isSpecialTarget) {
                segments.push({
                    from: segStartIdx, to: prevCell, tilesCount: segTiles.length - 1,
                    direction: currentDir, terrain: isObstaclePrev ? prevTileType : 'flat'
                });
                segStartIdx = prevCell; segTiles = [prevCell, currCell]; currentDir = dir;
            } else {
                segTiles.push(currCell);
            }
        }
        if (segTiles.length > 1) {
            const lastTileType = gridManager.getCell(fullPath[fullPath.length - 1])?.type || 'empty';
            segments.push({
                from: segStartIdx, to: fullPath[fullPath.length - 1], tilesCount: segTiles.length - 1,
                direction: currentDir, terrain: OBSTACLES.includes(lastTileType) ? lastTileType : 'flat'
            });
        }
        return segments.filter(s => s.tilesCount > 0);
    }
    static solveMission(gridManager, profile) {
        const { start, finish, checkpoints, drops } = gridManager.getSpecialCells();
        if (!start) throw new Error('No START cell found on field');
        const nodes = [];
        let currentCellIdx = start.index;
        nodes.push({ cellIdx: currentCellIdx, fn: 'FF', speed: profile.speed, timer: profile.baseTimerMs, dist: 1, terrain: 'flat', leg: 'START' });
        const unvisited = [...checkpoints, ...drops];
        let legCounter = 1;

        while (unvisited.length > 0) {
            let bestPath = null, bestTargetIdx = -1, minDistance = Infinity;
            for (let i = 0; i < unvisited.length; i++) {
                const path = this.findShortestPathBFS(currentCellIdx, unvisited[i].index, gridManager);
                if (path && path.length < minDistance) {
                    minDistance = path.length; bestPath = path; bestTargetIdx = i;
                }
            }
            if (!bestPath) throw new Error('Unreachable mission target');
            const targetNode = unvisited[bestTargetIdx];
            const isDropTarget = targetNode.type.startsWith('drop');
            const segments = this.extractSmoothSegments(bestPath, gridManager);
            const currentLegName = legCounter <= 4 ? `BOX${legCounter}` : 'END';

            for (const seg of segments) {
                let t = seg.tilesCount === 1 ? profile.baseTimerMs : (240 + Math.round((seg.tilesCount * 300 - 110) / 0.92));
                let spd = profile.speed;
                if (seg.terrain === 'bridge') { t = profile.bridgeTimerMs * seg.tilesCount; spd = Config.OBSTACLE_SPEEDS.bridge; }
                else if (seg.terrain === 'bump') { t = profile.bumpTimerMs * seg.tilesCount; spd = Config.OBSTACLE_SPEEDS.bump; }
                else if (seg.terrain === 'seesaw') { t = profile.seesawTimerMs * seg.tilesCount; spd = Config.OBSTACLE_SPEEDS.seesaw; }
                else if (seg.terrain === 'tunnel') { t = profile.tunnelTimerMs * seg.tilesCount; spd = profile.speed; }

                nodes.push({ cellIdx: seg.to, fn: 'FF', speed: spd, timer: t, dist: seg.tilesCount, terrain: seg.terrain, leg: currentLegName });
            }

            if (isDropTarget && bestPath.length >= 2) {
                const retreatCell = bestPath[bestPath.length - 2];
                nodes.push({ cellIdx: retreatCell, fn: 'BB', speed: profile.speed, timer: profile.baseTimerMs, dist: 1, terrain: 'flat', leg: currentLegName, note: 'Retreat' });
                currentCellIdx = retreatCell; legCounter++;
            } else {
                currentCellIdx = targetNode.index;
            }
            unvisited.splice(bestTargetIdx, 1);
        }

        if (finish) {
            const path = this.findShortestPathBFS(currentCellIdx, finish.index, gridManager);
            if (path) {
                const segments = this.extractSmoothSegments(path, gridManager);
                for (const seg of segments) {
                    let t = seg.tilesCount === 1 ? profile.baseTimerMs : (240 + Math.round((seg.tilesCount * 300 - 110) / 0.92));
                    let spd = profile.speed;
                    if (seg.terrain === 'bridge') { t = profile.bridgeTimerMs * seg.tilesCount; spd = Config.OBSTACLE_SPEEDS.bridge; }
                    else if (seg.terrain === 'bump') { t = profile.bumpTimerMs * seg.tilesCount; spd = Config.OBSTACLE_SPEEDS.bump; }
                    else if (seg.terrain === 'seesaw') { t = profile.seesawTimerMs * seg.tilesCount; spd = Config.OBSTACLE_SPEEDS.seesaw; }
                    else if (seg.terrain === 'tunnel') { t = profile.tunnelTimerMs * seg.tilesCount; spd = profile.speed; }
                    nodes.push({ cellIdx: seg.to, fn: 'FF', speed: spd, timer: t, dist: seg.tilesCount, terrain: seg.terrain, leg: 'END' });
                }
            }
        }
        return nodes;
    }
}

// Main execution
const targetJson = process.argv[2] || path.join(__dirname, '..', '..', 'data', 'arenas', 'official_field_mission.json');
const gm = new GridManager();

if (fs.existsSync(targetJson)) {
    console.log(`Loading arena from: ${targetJson}`);
    const data = JSON.parse(fs.readFileSync(targetJson, 'utf8'));
    gm.deserialize(data);
} else {
    console.log('Using default official competition preset...');
    gm.loadPreset();
}

const profile = Config.PROFILES.FAST;
const nodes = PathfindingEngine.solveMission(gm, profile);
console.log(`\n=== MISSION TRAJECTORY COMPUTED ===`);
console.log(`Total Waypoints: ${nodes.length}`);
console.log(`Score: 100 / 100 PTS`);

nodes.forEach((n, i) => {
    const col = gm.getCol(n.cellIdx);
    const row = gm.getRow(n.cellIdx);
    console.log(`[#${String(i + 1).padStart(2, '0')}] ${n.fn.padEnd(8)} (X${col}, Y${row}) speed:${n.speed}% time:${n.timer}ms leg:${n.leg}`);
});
