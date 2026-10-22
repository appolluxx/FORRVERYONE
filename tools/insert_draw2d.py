import os

ROOT_DIR = r"D:\Workspace\robot"
builder_path = os.path.join(ROOT_DIR, "build_rescue_sim_ide.js")

with open(builder_path, "r", encoding="utf-8") as f:
    code = f.read()

draw_func = '''        // ---------------------------------------------------------------------
        // 2D TACTICAL ARENA CANVAS RENDERER
        // ---------------------------------------------------------------------
        let selectedWpIndex = 0;

        function drawArena2D() {
            const canvas = document.getElementById('arena2dCanvas');
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

                    // Background / Hazard Colors
                    if (type === 'pit' || type === 'blackhole' || type.includes('pit')) {
                        ctx.fillStyle = "#fee2e2";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#ef4444";
                        ctx.beginPath();
                        ctx.arc(x + tw/2, y + th/2, 16, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#ffffff";
                        ctx.font = "bold 9px monospace";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("PIT", x + tw/2, y + th/2);
                    } else if (type === 'bridge' || type.includes('bridge')) {
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#d97706";
                        ctx.font = "bold 9px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("BRIDGE", x + tw/2, y + th/2);
                    } else if (type === 'bump' || type === 'bumps' || type.includes('bump')) {
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.strokeStyle = "#b45309";
                        ctx.lineWidth = 1.5;
                        for (let i = 0; i < 7; i++) {
                            const bx = x + 8 + i * 6;
                            ctx.beginPath();
                            ctx.moveTo(bx, y + 6);
                            ctx.lineTo(bx, y + th - 6);
                            ctx.stroke();
                        }
                        ctx.fillStyle = "#92400e";
                        ctx.font = "bold 8px sans-serif";
                        ctx.textAlign = "center";
                        ctx.fillText("BUMPS", x + tw/2, y + th - 8);
                    } else if (type === 'seesaw' || type.includes('seesaw')) {
                        ctx.fillStyle = "#f3e8ff";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#7c3aed";
                        ctx.font = "bold 9px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("SEESAW", x + tw/2, y + th/2);
                    } else if (type === 'tunnel' || type.includes('tunnel')) {
                        ctx.fillStyle = "#334155";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#ffffff";
                        ctx.font = "bold 9px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("TUNNEL", x + tw/2, y + th/2);
                    } else if (type === 'bomb' || type.includes('bomb')) {
                        ctx.fillStyle = "#fee2e2";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#dc2626";
                        ctx.beginPath();
                        ctx.arc(x + tw/2, y + th/2, 14, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#ffffff";
                        ctx.font = "bold 8px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("BOMB", x + tw/2, y + th/2);
                    } else if (type === 'start' || type === 'rescue_start') {
                        ctx.fillStyle = "#d1fae5";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#059669";
                        ctx.font = "bold 10px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("START", x + tw/2, y + th/2);
                    } else if (type === 'finish' || type === 'rescue_finish') {
                        ctx.fillStyle = "#dbeafe";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#2563eb";
                        ctx.font = "bold 10px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("FINISH", x + tw/2, y + th/2);
                    } else if (type.includes('drop')) {
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#b45309";
                        ctx.font = "bold 9px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("DROP", x + tw/2, y + th/2);
                    } else if (type.includes('checkpoint')) {
                        ctx.fillStyle = "#e0f2fe";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#0284c7";
                        ctx.font = "bold 9px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("CP", x + tw/2, y + th/2);
                    }

                    // Cell Border Grid lines
                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, tw, th);

                    // Track Line Decals
                    ctx.strokeStyle = "#0f172a";
                    ctx.lineWidth = 4;
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

            // Draw Waypoints & Planned Trajectory
            const waypoints = activeProject.waypoints || [];
            if (waypoints.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = "#0284c7";
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);

                waypoints.forEach((pt, idx) => {
                    const canvasX = ((pt.x + 1.20) / 2.40) * w;
                    const canvasY = ((pt.z + 0.60) / 1.20) * h;
                    if (idx === 0) ctx.moveTo(canvasX, canvasY);
                    else ctx.lineTo(canvasX, canvasY);
                });
                ctx.stroke();
                ctx.setLineDash([]);

                // Waypoint Node Badges
                waypoints.forEach((pt, idx) => {
                    const canvasX = ((pt.x + 1.20) / 2.40) * w;
                    const canvasY = ((pt.z + 0.60) / 1.20) * h;
                    const isSelected = (idx === selectedWpIndex);

                    ctx.beginPath();
                    ctx.arc(canvasX, canvasY, isSelected ? 10 : 7, 0, Math.PI * 2);
                    ctx.fillStyle = (idx === 0) ? "#10b981" : ((idx === waypoints.length - 1) ? "#2563eb" : (isSelected ? "#f59e0b" : "#0284c7"));
                    ctx.fill();
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Heading indicator arrow
                    if (pt.angle !== undefined) {
                        const rad = (pt.angle * Math.PI) / 180;
                        const arrowLen = 12;
                        const ax = canvasX + Math.cos(rad) * arrowLen;
                        const ay = canvasY + Math.sin(rad) * arrowLen;
                        ctx.beginPath();
                        ctx.strokeStyle = "#0f172a";
                        ctx.lineWidth = 1.5;
                        ctx.moveTo(canvasX, canvasY);
                        ctx.lineTo(ax, ay);
                        ctx.stroke();
                    }

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 8px monospace";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(idx + 1, canvasX, canvasY);
                });
            }
        }
'''

target = '        function renderActionSheet() {'
if 'function drawArena2D()' not in code and target in code:
    code = code.replace(target, draw_func + '\n\n        function renderActionSheet() {')
    print("Inserted drawArena2D function successfully!")

with open(builder_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Updated build_rescue_sim_ide.js with drawArena2D.")
