with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update PathfindingEngine.solveMission to inject turnMode into nodes
old_solve_start = """        const nodes = [];
        let currentCellIdx = start.index;
        nodes.push({
            cellIdx: currentCellIdx,
            fn: 'FF',
            speed: profile.speed,
            timer: profile.baseTimerMs,
            dist: 1,
            terrain: 'flat',
            leg: 'START'
        });"""

new_solve_start = """        const nodes = [];
        let currentCellIdx = start.index;
        nodes.push({
            cellIdx: currentCellIdx,
            fn: 'FF',
            speed: profile.speed,
            timer: profile.baseTimerMs,
            dist: 1,
            terrain: 'flat',
            leg: 'START',
            turnMode: profile.turnMode || 'SPIN_90'
        });"""

assert old_solve_start in content, "old_solve_start not found"
content = content.replace(old_solve_start, new_solve_start)

# In the loop for segments:
old_seg_push = """                nodes.push({
                    cellIdx: seg.to,
                    fn: 'FF',
                    speed,
                    timer,
                    dist: seg.tilesCount,
                    terrain: seg.terrain,
                    leg: currentLegName
                });"""

new_seg_push = """                nodes.push({
                    cellIdx: seg.to,
                    fn: 'FF',
                    speed,
                    timer,
                    dist: seg.tilesCount,
                    terrain: seg.terrain,
                    leg: currentLegName,
                    turnMode: profile.turnMode || 'SPIN_90'
                });"""

assert old_seg_push in content, "old_seg_push not found"
content = content.replace(old_seg_push, new_seg_push)

# For finish leg:
old_finish_push = """                    nodes.push({
                        cellIdx: seg.to,
                        fn: 'FF',
                        speed,
                        timer,
                        dist: seg.tilesCount,
                        terrain: seg.terrain,
                        leg: 'END'
                    });"""

new_finish_push = """                    nodes.push({
                        cellIdx: seg.to,
                        fn: 'FF',
                        speed,
                        timer,
                        dist: seg.tilesCount,
                        terrain: seg.terrain,
                        leg: 'END',
                        turnMode: profile.turnMode || 'SPIN_90'
                    });"""

assert old_finish_push in content, "old_finish_push not found"
content = content.replace(old_finish_push, new_finish_push)
print("Updated PathfindingEngine.solveMission!")

# 2. Update CodeGenerator to generate turnDegreeFront / smooth curve turns when turnMode is ARC_CURVE!
old_code_gen_loop = """            if (curr.fn === 'BB') {
                stepLines.push(`  BB(${curr.speed || profile.speed}, TIME_FLAT(${dist})); // Retreat straight out of drop zone back to corridor`);
            } else {
                let targetHeading = currentHeading;
                if (cX > pX) targetHeading = 90;
                else if (cX < pX) targetHeading = -90;
                else if (cY > pY) targetHeading = 180;
                else if (cY < pY) targetHeading = 0;

                let diff = targetHeading - currentHeading;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;

                if (diff !== 0) {
                    stepLines.push(`  spinDegree(${diff}); // In-place spin ${diff} deg`);
                    currentHeading = targetHeading;
                }"""

new_code_gen_loop = """            if (curr.fn === 'BB') {
                stepLines.push(`  BB(${curr.speed || profile.speed}, TIME_FLAT(${dist})); // Retreat straight out of drop zone back to corridor`);
            } else {
                let targetHeading = currentHeading;
                if (cX > pX) targetHeading = 90;
                else if (cX < pX) targetHeading = -90;
                else if (cY > pY) targetHeading = 180;
                else if (cY < pY) targetHeading = 0;

                let diff = targetHeading - currentHeading;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;

                if (diff !== 0) {
                    if (profile.turnMode === 'ARC_CURVE' && Math.abs(diff) === 90) {
                        // Smooth Continuous Arc Curve without dead stop
                        stepLines.push(`  turnDegreeFront(${diff}); // Continuous Smooth Arc Turn ${diff > 0 ? '+90° (Right Curve)' : '-90° (Left Curve)'}`);
                    } else {
                        // In-place Gyro Stabilized Spin
                        stepLines.push(`  spinDegree(${diff}); // In-place spin ${diff} deg (Gyro Locked)`);
                    }
                    currentHeading = targetHeading;
                }"""

assert old_code_gen_loop in content, "old_code_gen_loop not found"
content = content.replace(old_code_gen_loop, new_code_gen_loop)
print("Updated CodeGenerator for ARC_CURVE and MAX100 modes!")

# 3. Update PhysicsAndScoringEngine telemetry calculation for turn timings
old_telemetry_turn = """            if (diff !== 0) {
                totalTimeMs += Math.abs(diff) === 180 ? Config.MANEUVERS.TURN_180_DURATION_MS : Config.MANEUVERS.TURN_90_DURATION_MS;
                currentHeading = targetHeading;
            }"""

new_telemetry_turn = """            if (diff !== 0) {
                const isArc = (curr.turnMode === 'ARC_CURVE' && Math.abs(diff) === 90);
                const turnDuration = isArc 
                    ? 180 
                    : (Math.abs(diff) === 180 ? Config.MANEUVERS.TURN_180_DURATION_MS : (curr.speed === 100 ? 200 : Config.MANEUVERS.TURN_90_DURATION_MS));
                totalTimeMs += turnDuration;
                currentHeading = targetHeading;
            }"""

assert old_telemetry_turn in content, "old_telemetry_turn not found"
content = content.replace(old_telemetry_turn, new_telemetry_turn)
print("Updated PhysicsAndScoringEngine telemetry turn time calculation!")

with open('apps/web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 2 complete.")
