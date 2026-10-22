with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update SimulationController to handle smooth arc curve turns!
old_sim_step = """        let angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 90;
        if (end.fn === 'BB') {
            angle = (angle + 180) % 360;
        }

        const moveDuration = Math.max(end.timer || 300, Config.MANEUVERS.MIN_STEP_DURATION_MS);

        if (this.callbacks.onStep) {
            this.callbacks.onStep({
                x1, y1, x2, y2, angle, moveDuration,
                isInitial: true
            });
        }

        this.animTimeout = setTimeout(() => {
            if (!this.isAnimating) return;
            if (this.callbacks.onStep) {
                this.callbacks.onStep({
                    x1, y1, x2, y2, angle, moveDuration,
                    isInitial: false
                });
            }
            this.animTimeout = setTimeout(() => {
                this._step(idx + 1, pathNodes, getCoordinates);
            }, moveDuration);
        }, Config.MANEUVERS.SIM_ROTATION_TRANSITION_MS);"""

new_sim_step = """        let angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 90;
        if (end.fn === 'BB') {
            angle = (angle + 180) % 360;
        }

        const moveDuration = Math.max(end.timer || 300, Config.MANEUVERS.MIN_STEP_DURATION_MS);
        const isArcMode = (end.turnMode === 'ARC_CURVE');
        const rotDuration = isArcMode ? 80 : Config.MANEUVERS.SIM_ROTATION_TRANSITION_MS;

        if (this.callbacks.onStep) {
            this.callbacks.onStep({
                x1, y1, x2, y2, angle, moveDuration,
                isInitial: true,
                isArc: isArcMode
            });
        }

        this.animTimeout = setTimeout(() => {
            if (!this.isAnimating) return;
            if (this.callbacks.onStep) {
                this.callbacks.onStep({
                    x1, y1, x2, y2, angle, moveDuration,
                    isInitial: false,
                    isArc: isArcMode
                });
            }
            this.animTimeout = setTimeout(() => {
                this._step(idx + 1, pathNodes, getCoordinates);
            }, moveDuration);
        }, rotDuration);"""

assert old_sim_step in content, "old_sim_step not found"
content = content.replace(old_sim_step, new_sim_step)
print("Updated SimulationController._step!")

# 2. Update UIController._handleSimulationStep for smooth kinematics transition
old_handle_step = """    _handleSimulationStep({ x1, y1, x2, y2, angle, moveDuration, isInitial }) {
        const bot = this.dom.robotPreview;
        if (!bot) return;

        if (isInitial) {
            bot.style.transition = 'transform 0.18s ease';
            bot.style.left = `${x1}px`;
            bot.style.top = `${y1}px`;
            bot.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        } else {
            bot.style.transition = `top ${moveDuration}ms linear, left ${moveDuration}ms linear, transform 0.18s ease`;
            bot.style.left = `${x2}px`;
            bot.style.top = `${y2}px`;
        }
    }"""

new_handle_step = """    _handleSimulationStep({ x1, y1, x2, y2, angle, moveDuration, isInitial, isArc }) {
        const bot = this.dom.robotPreview;
        if (!bot) return;

        if (isInitial) {
            const rotTime = isArc ? '0.08s ease-out' : '0.18s cubic-bezier(0.4, 0, 0.2, 1)';
            bot.style.transition = `transform ${rotTime}`;
            bot.style.left = `${x1}px`;
            bot.style.top = `${y1}px`;
            bot.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        } else {
            // S-Curve physical momentum easing
            const easeCurve = isArc ? 'cubic-bezier(0.25, 0.1, 0.25, 1)' : 'linear';
            bot.style.transition = `top ${moveDuration}ms ${easeCurve}, left ${moveDuration}ms ${easeCurve}, transform 0.18s ease`;
            bot.style.left = `${x2}px`;
            bot.style.top = `${y2}px`;
        }
    }"""

assert old_handle_step in content, "old_handle_step not found"
content = content.replace(old_handle_step, new_handle_step)
print("Updated UIController._handleSimulationStep!")

# 3. Update renderPath to draw rounded smooth curves for ARC_CURVE mode!
old_render_path_loop = """        this.pathNodes.forEach((node, i) => {
            const { x, y } = this.getCellCenterPx(node.cellIdx);
            svgD += `${i === 0 ? 'M' : 'L'}${x} ${y} `;"""

new_render_path_loop = """        const profile = Config.PROFILES[this.currentProfile] || Config.PROFILES.NORMAL;
        const isArcCurve = (profile.turnMode === 'ARC_CURVE');

        if (isArcCurve && this.pathNodes.length > 2) {
            // Smooth rounded arc curve SVG path
            const pts = this.pathNodes.map(n => this.getCellCenterPx(n.cellIdx));
            svgD = `M ${pts[0].x} ${pts[0].y} `;
            const cornerRadius = Math.min(24, this.cellSizePx * 0.35);

            for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const curr = pts[i];
                const next = pts[i + 1];

                if (!next) {
                    svgD += `L ${curr.x} ${curr.y} `;
                } else {
                    // Check if direction changes (Corner)
                    const d1x = curr.x - prev.x;
                    const d1y = curr.y - prev.y;
                    const d2x = next.x - curr.x;
                    const d2y = next.y - curr.y;
                    const isCorner = (d1x !== 0 && d2y !== 0) || (d1y !== 0 && d2x !== 0);

                    if (isCorner) {
                        const len1 = Math.hypot(d1x, d1y);
                        const len2 = Math.hypot(d2x, d2y);
                        const r = Math.min(cornerRadius, len1 / 2, len2 / 2);
                        const startArcX = curr.x - (d1x / len1) * r;
                        const startArcY = curr.y - (d1y / len1) * r;
                        const endArcX = curr.x + (d2x / len2) * r;
                        const endArcY = curr.y + (d2y / len2) * r;

                        svgD += `L ${startArcX} ${startArcY} Q ${curr.x} ${curr.y} ${endArcX} ${endArcY} `;
                    } else {
                        svgD += `L ${curr.x} ${curr.y} `;
                    }
                }
            }
        } else {
            this.pathNodes.forEach((node, i) => {
                const { x, y } = this.getCellCenterPx(node.cellIdx);
                svgD += `${i === 0 ? 'M' : 'L'}${x} ${y} `;
            });
        }

        this.pathNodes.forEach((node, i) => {
            const { x, y } = this.getCellCenterPx(node.cellIdx);"""

assert old_render_path_loop in content, "old_render_path_loop not found"
content = content.replace(old_render_path_loop, new_render_path_loop)
print("Updated renderPath with smooth curve SVG rendering!")

# 4. Update default profile to NORMAL
content = content.replace("this.currentProfile = 'FAST';", "this.currentProfile = 'NORMAL';")
print("Updated default profile to NORMAL!")

with open('apps/web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 3 complete.")
