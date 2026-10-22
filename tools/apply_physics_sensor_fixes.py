import re

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace animateSimulation() implementation with the improved physics, optical raycast, and heading interpolation
old_sim_regex = r'function animateSimulation\(\)\s*\{[\s\S]*?\n\s*\}\n\s*function updateTelemetryHUD'

new_sim_code = """function animateSimulation() {
            requestAnimationFrame(animateSimulation);

            if (isSimRunning && robotMesh && activeProject.loaded) {
                const waypoints = activeProject.waypoints;
                const totalSegments = waypoints.length - 1;
                simProgress += 0.0012 * simSpeed;

                if (simProgress >= 1.0) {
                    simProgress = 1.0;
                    isSimRunning = false;
                    document.getElementById('btnSimPlay').className = "sim-btn primary";
                    document.getElementById('btnSimPlayText').textContent = "Run Sim";
                    document.getElementById('btnSimPlayIcon').className = "fas fa-play";
                    logTerminal(`[SUCCESS] ${activeProject.name} completed successfully! (100% path covered)`);
                }

                document.getElementById('simProgressFill').style.width = `${(simProgress * 100).toFixed(0)}%`;
                document.getElementById('lblSimProgressPct').textContent = `${(simProgress * 100).toFixed(0)}%`;

                const segFloat = simProgress * totalSegments;
                const segIdx = Math.min(Math.floor(segFloat), totalSegments - 1);
                const segT = segFloat - segIdx;

                const pStart = waypoints[segIdx];
                const pEnd = waypoints[segIdx + 1];

                // 1. Position interpolation
                const posX = THREE.MathUtils.lerp(pStart.x, pEnd.x, segT);
                const posZ = THREE.MathUtils.lerp(pStart.z, pEnd.z, segT);

                // 2. Physics & Elevation Model (Elevated Bridge & Chopsticks)
                let posY = 0.02; // Baseline chassis elevation (resting on ground floor Y=0 with r=28mm wheels)
                let pitchAngle = 0;
                let rollAngle = 0;
                let reflectance = 0.08;
                let surfaceStatus = "TRACKING";

                if (activeProject.id === "atom-vx-rescue-five-points") {
                    // Five-Point Route moves from +X towards -X over the bridge (X from 0.35 down to -0.40, Z in [0.05, 0.25])
                    if (posX >= -0.40 && posX <= 0.35 && posZ >= 0.05 && posZ <= 0.25) {
                        if (posX > 0.05) {
                            // Incline Climb Ramp: X in [0.05, 0.35] (entering from +X moving to -X)
                            const tClimb = THREE.MathUtils.clamp((0.35 - posX) / 0.30, 0, 1);
                            posY = 0.02 + tClimb * 0.05; // Climbs from 0.02m to 0.07m (+50mm elevation)
                            pitchAngle = 0.262; // +15 deg climb pitch
                            surfaceStatus = "BRIDGE CLIMB (+15°)";
                        } else if (posX < -0.15) {
                            // Decline Ramp: X in [-0.40, -0.15] (exiting towards -X)
                            const tDesc = THREE.MathUtils.clamp((-0.15 - posX) / 0.25, 0, 1);
                            posY = 0.07 - tDesc * 0.05; // Descends from 0.07m to 0.02m
                            pitchAngle = -0.262; // -15 deg descent pitch
                            surfaceStatus = "BRIDGE DESCENT (-15°)";
                        } else {
                            // Elevated Bridge Deck Platform: X in [-0.15, 0.05]
                            posY = 0.07; // Deck elevation +50mm
                            pitchAngle = 0;
                            surfaceStatus = "BRIDGE DECK (+50mm)";
                        }
                    }

                    // Chopstick Speed Bumps: X in [0.65, 0.90], Z in [0.05, 0.25]
                    if (posX >= 0.65 && posX <= 0.90 && posZ >= 0.05 && posZ <= 0.25) {
                        const freq = Math.sin((posX - 0.65) * 120);
                        posY = 0.02 + Math.abs(freq) * 0.005;
                        pitchAngle = freq * 0.08;
                        reflectance = 0.689;
                        surfaceStatus = "CROSSING BUMP (Bamboo 0.689)";
                    }
                } else {
                    // Quick Drop Box 4 ENC Drop Trigger
                    if (pStart.drop && segT > 0.3 && droppedBoxMeshes.length < segIdx) {
                        const boxColors = { 'BOX1': 0xef4444, 'BOX2': 0x3b82f6, 'BOX3': 0xf59e0b, 'BOX4': 0x10b981 };
                        spawnDroppedBox(pStart.x, pStart.z, boxColors[pStart.drop] || 0x10b981);
                        logTerminal(`[PAYLOAD] ${pStart.drop} deployed successfully at (${pStart.x}, ${pStart.z})`);
                    }
                }

                robotMesh.position.set(posX, posY, posZ);

                // 3. Heading-Lock PD Control with Shortest-Arc Interpolation
                const targetYawDeg = pEnd.heading;
                let currentYawDeg = Math.round((robotMesh.rotation.y * 180) / Math.PI);
                while (currentYawDeg > 180) currentYawDeg -= 360;
                while (currentYawDeg < -180) currentYawDeg += 360;

                let headingError = targetYawDeg - currentYawDeg;
                while (headingError > 180) headingError -= 360;
                while (headingError < -180) headingError += 360;

                const deriv = headingError - headingSimState.prevError;
                headingSimState.filtDeriv = 0.70 * headingSimState.filtDeriv + 0.30 * deriv;
                headingSimState.prevError = headingError;
                const pdCorrection = THREE.MathUtils.clamp((headingError * headingSimState.kp) + (headingSimState.filtDeriv * headingSimState.kd), -60, 60);

                // Shortest angular arc interpolation (handles ±180° and 360° wraparound smoothly)
                const targetYawRad = (targetYawDeg * Math.PI) / 180;
                let currentYawRad = robotMesh.rotation.y;
                let diffRad = targetYawRad - currentYawRad;
                while (diffRad > Math.PI) diffRad -= 2 * Math.PI;
                while (diffRad < -Math.PI) diffRad += 2 * Math.PI;
                robotMesh.rotation.y += diffRad * 0.08;
                while (robotMesh.rotation.y > Math.PI) robotMesh.rotation.y -= 2 * Math.PI;
                while (robotMesh.rotation.y < -Math.PI) robotMesh.rotation.y += 2 * Math.PI;

                robotMesh.rotation.x = pitchAngle;

                // 4. S-Curve Motion Kinematics & Motor Gauges
                let baseSpd = pStart.speed || 60;
                let motionPhase = "CRUISE";
                if (segT < 0.2) {
                    const sFactor = 0.5 * (1.0 - Math.cos((segT / 0.2) * Math.PI));
                    baseSpd = 25 + sFactor * (baseSpd - 25);
                    motionPhase = "RAMP-UP (120ms)";
                } else if (segT > 0.8) {
                    const sFactor = 0.5 * (1.0 - Math.cos(((1.0 - segT) / 0.2) * Math.PI));
                    baseSpd = 20 + sFactor * (baseSpd - 20);
                    motionPhase = segT > 0.95 ? "BRAKE PULSE (15ms)" : "RAMP-DOWN (120ms)";
                }

                const mLeft = THREE.MathUtils.clamp(Math.round(baseSpd + pdCorrection), -100, 100);
                const mRight = THREE.MathUtils.clamp(Math.round(baseSpd - pdCorrection), -100, 100);

                // Spin wheels
                robotWheelMeshes.forEach(w => {
                    w.rotation.y += (baseSpd / 60) * 0.2 * simSpeed;
                });

                // 5. 8-Channel Optical Line Sensor Model & Centroid (2D Vector Normal Projection)
                const dxSeg = pEnd.x - pStart.x;
                const dzSeg = pEnd.z - pStart.z;
                const segLen = Math.hypot(dxSeg, dzSeg);
                let tx = 1.0, tz = 0.0;
                if (segLen > 1e-5) {
                    tx = dxSeg / segLen;
                    tz = dzSeg / segLen;
                }
                const nx = tz;
                const nz = -tx;

                // Cross-track distance from robot position to segment line
                const crossTrack = (posX - pStart.x) * nx + (posZ - pStart.z) * nz;

                const isChopstickZone = (activeProject.id === "atom-vx-rescue-five-points" && posX >= 0.65 && posX <= 0.90 && posZ >= 0.05 && posZ <= 0.25);

                let sensorReadings = [];
                let weights = [-42, -30, -18, -6, 6, 18, 30, 42];
                let weightedSum = 0;
                let sumVal = 0;
                let highCount = 0;
                let activeCount = 0;

                for (let i = 0; i < 8; i++) {
                    let sensorOffsetMm = weights[i];
                    let distFromLine = Math.abs(crossTrack + (sensorOffsetMm / 1000.0));
                    let chRefl = 0.08;

                    if (isChopstickZone) {
                        chRefl = 0.689; // Bamboo rods across entire track
                    } else if (distFromLine <= 0.010) {
                        chRefl = 0.92; // 20mm black line (10mm half-width)
                    } else if (distFromLine <= 0.018) {
                        let tFall = (distFromLine - 0.010) / 0.008;
                        chRefl = 0.92 - tFall * (0.92 - 0.08);
                    } else {
                        chRefl = 0.08; // Background white mat
                    }

                    let adcRaw = Math.round(chRefl * 1023);
                    let calPct = THREE.MathUtils.clamp(Math.round(((adcRaw - 120) / (920 - 120)) * 100), 3, 98);
                    sensorReadings.push(calPct);

                    if (calPct > 25) {
                        weightedSum += sensorOffsetMm * calPct;
                        sumVal += calPct;
                        activeCount++;
                    }
                    if (calPct > 85) {
                        highCount++;
                    }
                }

                let centroidMm = "0.0";
                if (sumVal === 0 || activeCount === 0) {
                    surfaceStatus = "OFF LINE (Loss of Line)";
                    centroidMm = "0.0";
                } else if (isChopstickZone) {
                    surfaceStatus = "CROSSING BUMP (Bamboo 0.689)";
                    centroidMm = (weightedSum / sumVal).toFixed(1);
                    reflectance = 0.689;
                } else if (highCount >= 6) {
                    surfaceStatus = "JUNCTION (All Channels Active)";
                    centroidMm = (weightedSum / sumVal).toFixed(1);
                    reflectance = 0.92;
                } else {
                    surfaceStatus = "ON LINE (0.92)";
                    centroidMm = (weightedSum / sumVal).toFixed(1);
                    reflectance = 0.92;
                }

                // Add to trail
                addTrailPoint(robotMesh.position);

                // Update HUD
                currentYawDeg = Math.round((robotMesh.rotation.y * 180) / Math.PI);
                const elevMm = ((posY - 0.02) * 1000).toFixed(0);
                const speedVal = ((baseSpd / 100) * 85 * simSpeed).toFixed(1);

                updateTelemetryHUD(
                    currentYawDeg,
                    (pitchAngle * 180 / Math.PI).toFixed(1),
                    rollAngle,
                    speedVal,
                    (posX * 100).toFixed(1),
                    (posZ * 100).toFixed(1),
                    elevMm,
                    mLeft, mLeft, mRight, mRight,
                    targetYawDeg,
                    motionPhase,
                    pdCorrection,
                    `Refl ${reflectance.toFixed(3)}`,
                    surfaceStatus,
                    sensorReadings,
                    centroidMm
                );

                // Follow camera mode
                if (simCamMode === 'follow') {
                    camera.position.set(posX + 0.6, posY + 0.7, posZ + 0.8);
                    controls.target.set(posX, posY, posZ);
                }
            }

            controls.update();
            renderer.render(scene, camera);
        }
        function updateTelemetryHUD"""

# In new_sim_code, any ` inside htmlContent template string must be escaped as \`
# and ${ must be escaped as \${
new_sim_escaped = new_sim_code.replace("`", "\\`")
new_sim_escaped = re.sub(r'(?<!\\)\$\{', r'\\${', new_sim_escaped)

updated_text = re.sub(old_sim_regex, new_sim_escaped, text)

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(updated_text)

print("Updated build_rescue_sim_ide.js successfully!")
