"""
Replaces 3D WebGL renderer and animates robot position directly onto 2D Tactical Canvases:
1. Both #arena2dCanvas and #arenaTheaterCanvas render identical high-res field.
2. animateSimulation calculates (rx, rz, rYaw) and renders the robot chassis, heading ray, and trail directly on 2D!
3. Telemetry HUD and simulation progress slider update smoothly in real time.
"""
with open('tools/generate_clean_master.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update drawArena2D to support rendering to both arena2dCanvas and arenaTheaterCanvas, including simulated robot & trail
new_draw_system = """        // Current simulated robot pose
        let currentSimRobotPose = { x: 1.05, z: 0.45, yaw: 90, speed: 0, visible: true };

        function drawArena2D() {
            renderArenaToCanvas('arena2dCanvas');
            renderArenaToCanvas('arenaTheaterCanvas');
        }

        function renderArenaToCanvas(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);

            const cols = 8;
            const rows = 4;
            const tw = w / cols;
            const th = h / rows;
            const arena = currentArenaData || ARENA_FIVE_POINTS;
            const cellsList = arena.gridData || arena.cells || [];

            // Draw Grid & Tiles
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = r * cols + c;
                    const x = c * tw;
                    const y = r * th;
                    const cell = cellsList[idx];
                    const type = (cell && cell.type ? cell.type : '').toLowerCase();

                    // Background Colors
                    if (type === 'pit' || type === 'blackhole' || type.includes('pit')) {
                        ctx.fillStyle = "#fee2e2";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#ef4444";
                        ctx.beginPath();
                        ctx.arc(x + tw/2, y + th/2, tw * 0.22, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#ffffff";
                        ctx.font = `bold ${Math.round(tw * 0.16)}px monospace`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("PIT", x + tw/2, y + th/2);
                    } else if (type === 'bridge' || type.includes('bridge')) {
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#d97706";
                        ctx.font = `bold ${Math.round(tw * 0.15)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("BRIDGE 50mm", x + tw/2, y + th/2);
                    } else if (type === 'bump' || type === 'bumps' || type.includes('bump')) {
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.strokeStyle = "#b45309";
                        ctx.lineWidth = 2;
                        const stickSpacing = tw / 9;
                        for (let i = 1; i <= 7; i++) {
                            const bx = x + i * stickSpacing;
                            ctx.beginPath();
                            ctx.moveTo(bx, y + 6);
                            ctx.lineTo(bx, y + th - 6);
                            ctx.stroke();
                        }
                        ctx.fillStyle = "#92400e";
                        ctx.font = `bold ${Math.round(tw * 0.13)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.fillText("7 BUMPS", x + tw/2, y + th - 8);
                    } else if (type === 'seesaw' || type.includes('seesaw')) {
                        ctx.fillStyle = "#f3e8ff";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#7c3aed";
                        ctx.font = `bold ${Math.round(tw * 0.15)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("SEESAW", x + tw/2, y + th/2);
                    } else if (type === 'tunnel' || type.includes('tunnel')) {
                        ctx.fillStyle = "#334155";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#ffffff";
                        ctx.font = `bold ${Math.round(tw * 0.15)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("TUNNEL", x + tw/2, y + th/2);
                    } else if (type === 'bomb' || type.includes('bomb')) {
                        ctx.fillStyle = "#fee2e2";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#dc2626";
                        ctx.beginPath();
                        ctx.arc(x + tw/2, y + th/2, tw * 0.20, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#ffffff";
                        ctx.font = `bold ${Math.round(tw * 0.14)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("BOMB", x + tw/2, y + th/2);
                    } else if (type === 'start' || type === 'rescue_start') {
                        ctx.fillStyle = "#d1fae5";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#059669";
                        ctx.font = `bold ${Math.round(tw * 0.16)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("START", x + tw/2, y + th/2);
                    } else if (type === 'finish' || type === 'rescue_finish') {
                        ctx.fillStyle = "#dbeafe";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#2563eb";
                        ctx.font = `bold ${Math.round(tw * 0.16)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("FINISH", x + tw/2, y + th/2);
                    } else if (type.includes('drop')) {
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#b45309";
                        ctx.font = `bold ${Math.round(tw * 0.15)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("DROP", x + tw/2, y + th/2);
                    } else if (type.includes('checkpoint')) {
                        ctx.fillStyle = "#e0f2fe";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#0284c7";
                        ctx.font = `bold ${Math.round(tw * 0.15)}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("CP", x + tw/2, y + th/2);
                    }

                    // Border
                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, tw, th);

                    // Track Lines
                    ctx.strokeStyle = "#0f172a";
                    ctx.lineWidth = Math.max(3, tw * 0.07);
                    if (type.includes('top')) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tw, y); ctx.stroke();
                    }
                    if (type.includes('bottom')) {
                        ctx.beginPath(); ctx.moveTo(x, y + th); ctx.lineTo(x + tw, y + th); ctx.stroke();
                    }
                    if (type.includes('left')) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + th); ctx.stroke();
                    }
                    if (type.includes('right')) {
                        ctx.beginPath(); ctx.moveTo(x + tw, y); ctx.lineTo(x + tw, y + th); ctx.stroke();
                    }
                    if (type.includes('surround')) {
                        ctx.strokeRect(x + 2, y + 2, tw - 4, th - 4);
                    }
                }
            }

            // Draw Planned Route Path
            const waypoints = activeProject.waypoints || [];
            if (waypoints.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = "#0284c7";
                ctx.lineWidth = Math.max(2.5, tw * 0.05);
                ctx.setLineDash([8, 5]);

                waypoints.forEach((pt, idx) => {
                    const canvasX = ((pt.x + 1.20) / 2.40) * w;
                    const canvasY = ((pt.z + 0.60) / 1.20) * h;
                    if (idx === 0) ctx.moveTo(canvasX, canvasY);
                    else ctx.lineTo(canvasX, canvasY);
                });
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw Trail (if any)
                if (trailPoints.length > 1) {
                    ctx.beginPath();
                    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
                    ctx.lineWidth = Math.max(2, tw * 0.04);
                    trailPoints.forEach((tp, idx) => {
                        const tx = ((tp.x + 1.20) / 2.40) * w;
                        const ty = ((tp.z + 0.60) / 1.20) * h;
                        if (idx === 0) ctx.moveTo(tx, ty);
                        else ctx.lineTo(tx, ty);
                    });
                    ctx.stroke();
                }

                // Draw Waypoint Points
                waypoints.forEach((pt, idx) => {
                    const canvasX = ((pt.x + 1.20) / 2.40) * w;
                    const canvasY = ((pt.z + 0.60) / 1.20) * h;
                    const isSelected = (idx === selectedWpIndex);
                    const ptRadius = Math.max(7, tw * 0.14);

                    ctx.beginPath();
                    ctx.arc(canvasX, canvasY, isSelected ? ptRadius * 1.3 : ptRadius, 0, Math.PI * 2);
                    ctx.fillStyle = (idx === 0) ? "#10b981" : ((idx === waypoints.length - 1) ? "#2563eb" : (isSelected ? "#f59e0b" : "#0284c7"));
                    ctx.fill();
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    if (pt.angle !== undefined) {
                        const rad = (pt.angle * Math.PI) / 180;
                        const arrowLen = ptRadius * 1.8;
                        const ax = canvasX + Math.cos(rad) * arrowLen;
                        const ay = canvasY + Math.sin(rad) * arrowLen;
                        ctx.beginPath();
                        ctx.strokeStyle = "#0f172a";
                        ctx.lineWidth = 2;
                        ctx.moveTo(canvasX, canvasY);
                        ctx.lineTo(ax, ay);
                        ctx.stroke();
                    }

                    ctx.fillStyle = "#ffffff";
                    ctx.font = `bold ${Math.round(ptRadius * 0.9)}px monospace`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(idx + 1, canvasX, canvasY);
                });
            }

            // Draw Real-time Simulated Robot (ATOM VX 4WD Chassis)
            if (currentSimRobotPose && currentSimRobotPose.visible) {
                const rx = ((currentSimRobotPose.x + 1.20) / 2.40) * w;
                const ry = ((currentSimRobotPose.z + 0.60) / 1.20) * h;
                const rYaw = currentSimRobotPose.yaw || 0;
                const robotW = tw * 0.55;
                const robotH = tw * 0.45;

                ctx.save();
                ctx.translate(rx, ry);
                ctx.rotate((rYaw * Math.PI) / 180);

                // 4WD Wheels
                ctx.fillStyle = "#0f172a";
                const ww = robotW * 0.28;
                const wh = robotH * 0.25;
                ctx.fillRect(-robotW/2 - 2, -robotH/2, ww, wh); // FL
                ctx.fillRect(-robotW/2 - 2, robotH/2 - wh, ww, wh); // BL
                ctx.fillRect(robotW/2 - ww + 2, -robotH/2, ww, wh); // FR
                ctx.fillRect(robotW/2 - ww + 2, robotH/2 - wh, ww, wh); // BR

                // Robot Main Chassis Body
                ctx.fillStyle = "#0284c7";
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-robotW/2, -robotH/2, robotW, robotH, 5);
                ctx.fill();
                ctx.stroke();

                // Direction Indicator Nose (Front)
                ctx.fillStyle = "#38bdf8";
                ctx.beginPath();
                ctx.moveTo(robotW/2, 0);
                ctx.lineTo(robotW/2 - 6, -5);
                ctx.lineTo(robotW/2 - 6, 5);
                ctx.closePath();
                ctx.fill();

                // Gyro Compass Label
                ctx.fillStyle = "#ffffff";
                ctx.font = `bold ${Math.round(robotW * 0.22)}px monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("VX", 0, 0);

                ctx.restore();
            }
        }
"""

# Replace old drawArena2D
old_draw_start = "        function drawArena2D() {"
old_draw_end = "        // ---------------------------------------------------------------------"

idx_start = code.find(old_draw_start)
idx_end = code.find(old_draw_end, idx_start)
assert idx_start != -1 and idx_end != -1, "drawArena2D boundary not found"

# Escape double braces for python f-string format
escaped_draw_system = new_draw_system.replace("{", "{{").replace("}", "}}")
code = code[:idx_start] + escaped_draw_system + "\n        " + code[idx_end:]
print("Replaced drawArena2D with dual high-res 2D canvas & real-time chassis rendering!")

# 2. Update animateSimulation and sim helpers to run without Three.js
new_sim_engine = """        function build3DArenaObstacles() {
            // Synchronizes 2D obstacles & updates display
            drawArena2D();
        }

        function initThreeJsSimulator() {
            // 2D Tactical Simulation Engine initialization
            window.addEventListener('resize', () => {
                drawArena2D();
            });
            requestAnimationFrame(animateSimulation);
        }

        function addTrailPoint(x, y, z) {
            trailPoints.push({ x, z });
            if (trailPoints.length > 500) trailPoints.shift();
        }

        function clearTrail() {
            trailPoints = [];
            drawArena2D();
        }

        function animateSimulation() {
            requestAnimationFrame(animateSimulation);

            if (isSimRunning && activeProject.waypoints.length >= 2) {
                const wps = activeProject.waypoints;
                const totalSegments = wps.length - 1;
                simProgress += 0.0025 * simSpeed;

                if (simProgress >= 1.0) {
                    simProgress = 1.0;
                    isSimRunning = false;
                    document.getElementById('playText').textContent = 'Run';
                    document.getElementById('playIcon').className = 'fas fa-play';
                    showToast("Mission Execution Finished!");
                }

                const curSeg = Math.min(totalSegments - 1, Math.floor(simProgress * totalSegments));
                const segT = (simProgress * totalSegments) - curSeg;
                const p1 = wps[curSeg];
                const p2 = wps[curSeg + 1];

                const rx = p1.x + (p2.x - p1.x) * segT;
                const rz = p1.z + (p2.z - p1.z) * segT;
                const rYaw = p1.angle + (p2.angle - p1.angle) * segT;

                currentSimRobotPose.x = rx;
                currentSimRobotPose.z = rz;
                currentSimRobotPose.yaw = rYaw;
                currentSimRobotPose.speed = p2.speed || 70;

                addTrailPoint(rx, 0, rz);
                updateTelemetryHUD(rx, rz, rYaw, p2.speed || 70);

                // Update timeline slider
                const slider = document.getElementById('simProgressSlider');
                if (slider) slider.value = Math.round(simProgress * 1000);
                const curTimeEl = document.getElementById('timeCurrent');
                if (curTimeEl) {
                    const totalDur = (activeProject.waypoints.reduce((acc, wp) => acc + (wp.time || 0.45), 0));
                    curTimeEl.textContent = (simProgress * totalDur).toFixed(2) + 's';
                }

                drawArena2D();
            }
        }

        function updateTelemetryHUD(x, z, yaw, spd) {
            const elYaw = document.getElementById('hudYaw');
            if (elYaw) elYaw.textContent = yaw.toFixed(1) + '°';

            const elSpd = document.getElementById('hudSpeed');
            if (elSpd) elSpd.textContent = (spd * 0.85).toFixed(1) + ' cm/s';

            const elPos = document.getElementById('hudPos');
            if (elPos) elPos.textContent = (x * 100).toFixed(0) + ', ' + (z * 100).toFixed(0);

            const elTgt = document.getElementById('hudTargetDeg');
            if (elTgt) elTgt.textContent = yaw.toFixed(0) + '°';

            const elPwm = document.getElementById('hudPWM');
            if (elPwm) elPwm.textContent = Math.round(spd) + ' / ' + Math.round(spd);

            const elPhase = document.getElementById('hudMotionPhase');
            if (elPhase) elPhase.textContent = isSimRunning ? 'RUNNING' : 'IDLE';
        }

        function toggleSimRun() {
            if (simProgress >= 1.0) resetSimRun();
            isSimRunning = !isSimRunning;
            const icon = document.getElementById('playIcon');
            const txt = document.getElementById('playText');
            if (isSimRunning) {
                if (icon) icon.className = 'fas fa-pause';
                if (txt) txt.textContent = 'Pause';
            } else {
                if (icon) icon.className = 'fas fa-play';
                if (txt) txt.textContent = 'Run';
            }
        }

        function resetSimRun() {
            isSimRunning = false;
            simProgress = 0;
            const icon = document.getElementById('playIcon');
            const txt = document.getElementById('playText');
            if (icon) icon.className = 'fas fa-play';
            if (txt) txt.textContent = 'Run';
            clearTrail();

            const startWp = activeProject.waypoints[0] || { x: 1.05, z: 0.45, angle: 90 };
            currentSimRobotPose.x = startWp.x;
            currentSimRobotPose.z = startWp.z;
            currentSimRobotPose.yaw = startWp.angle || 90;
            currentSimRobotPose.speed = 0;

            const slider = document.getElementById('simProgressSlider');
            if (slider) slider.value = 0;
            const curTimeEl = document.getElementById('timeCurrent');
            if (curTimeEl) curTimeEl.textContent = '0.00s';

            updateTelemetryHUD(startWp.x, startWp.z, startWp.angle || 90, 0);
            drawArena2D();
        }

        function cycleSimSpeed() {
            const speeds = [1, 2, 4];
            const nextIdx = (speeds.indexOf(simSpeed) + 1) % speeds.length;
            simSpeed = speeds[nextIdx];
            const btn = document.getElementById('btnSpeed');
            if (btn) btn.innerHTML = `<i class="fas fa-bolt"></i> ${simSpeed}x`;
        }

        function onScrubSimulation(val) {
            simProgress = parseFloat(val) / 1000;
            if (activeProject.waypoints.length >= 2) {
                const wps = activeProject.waypoints;
                const totalSegments = wps.length - 1;
                const curSeg = Math.min(totalSegments - 1, Math.floor(simProgress * totalSegments));
                const segT = (simProgress * totalSegments) - curSeg;
                const p1 = wps[curSeg];
                const p2 = wps[curSeg + 1];

                const rx = p1.x + (p2.x - p1.x) * segT;
                const rz = p1.z + (p2.z - p1.z) * segT;
                const rYaw = p1.angle + (p2.angle - p1.angle) * segT;

                currentSimRobotPose.x = rx;
                currentSimRobotPose.z = rz;
                currentSimRobotPose.yaw = rYaw;
                updateTelemetryHUD(rx, rz, rYaw, p2.speed || 70);
                drawArena2D();
            }
        }
"""

old_sim_start = "        function build3DArenaObstacles() {"
old_sim_end = "        function setCameraView(mode) {"

idx_sim_start = code.find(old_sim_start)
idx_sim_end = code.find(old_sim_end, idx_sim_start)
assert idx_sim_start != -1 and idx_sim_end != -1, "build3DArenaObstacles boundary not found"

escaped_sim_engine = new_sim_engine.replace("{", "{{").replace("}", "}}")
code = code[:idx_sim_start] + escaped_sim_engine + "\n        " + code[idx_sim_end:]
print("Replaced 3D engine with 2D Tactical Simulation Engine!")

with open('tools/generate_clean_master.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("generate_clean_master.py successfully updated with pure 2D switcher!")
