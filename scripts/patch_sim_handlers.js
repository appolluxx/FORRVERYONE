const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../web.html');
let html = fs.readFileSync(targetFile, 'utf8');

// Regex replace _handleSimulationStart
html = html.replace(
    /_handleSimulationStart\(\) \{[\s\S]*?\r?\n    \}/,
    `_handleSimulationStart() {
        const btn = this.dom.previewBtn;
        if (btn) {
            btn.innerText = '⏹ Stop';
            btn.classList.add('is-running');
            btn.setAttribute('aria-pressed', 'true');
        }
        if (this.dom.robotPreview) {
            this.dom.robotPreview.style.display = 'block';
        }
        if (this.theater3D) {
            this.theater3D.clearDroppedCubes();
            if (this.pathNodes && this.pathNodes.length > 0) {
                const startNode = this.pathNodes[0];
                const col = this.gridManager.getCol(startNode.cellIdx);
                const row = this.gridManager.getRow(startNode.cellIdx);
                this.theater3D.updateRobotPosition(col * 300 + 150, row * 300 + 150, 0, false);
            }
        }
    }`
);

// Regex replace _handleSimulationStep
html = html.replace(
    /_handleSimulationStep\([^)]*\) \{[\s\S]*?\r?\n    \}/,
    `_handleSimulationStep({ x1, y1, x2, y2, angle, moveDuration, isInitial, stepIdx, targetNode }) {
        const bot = this.dom.robotPreview;
        if (bot) {
            if (isInitial) {
                bot.style.transition = 'transform 0.18s ease';
                bot.style.left = \`\${x1}px\`;
                bot.style.top = \`\${y1}px\`;
                bot.style.transform = \`translate(-50%, -50%) rotate(\${angle}deg)\`;
            } else {
                bot.style.transition = \`top \${moveDuration}ms linear, left \${moveDuration}ms linear, transform 0.18s ease\`;
                bot.style.left = \`\${x2}px\`;
                bot.style.top = \`\${y2}px\`;
            }
        }

        if (this.theater3D && this.pathNodes && this.pathNodes[stepIdx]) {
            const currentNode = isInitial ? this.pathNodes[stepIdx] : (targetNode || this.pathNodes[stepIdx + 1]);
            if (currentNode) {
                const col = this.gridManager.getCol(currentNode.cellIdx);
                const row = this.gridManager.getRow(currentNode.cellIdx);
                const xMm = col * 300 + 150;
                const yMm = row * 300 + 150;
                this.theater3D.updateRobotPosition(xMm, yMm, angle, !isInitial);
                if (!isInitial && targetNode && targetNode.drop) {
                    this.theater3D.dropCube(targetNode.cellIdx);
                }
                if (this.dom.theater3DTelemetry) {
                    this.dom.theater3DTelemetry.innerHTML = \`<span>X: \${Math.round(xMm)}mm</span><span>|</span><span>Y: \${Math.round(yMm)}mm</span><span>|</span><span>Yaw: \${Math.round(angle)}°</span>\`;
                }
            }
        }
    }`
);

// Regex replace _init3DTheater
html = html.replace(
    /_init3DTheater\(\) \{[\s\S]*?\r?\n    \}/,
    `_init3DTheater() {
        if (this.dom.arena3DContainer) {
            this.theater3D = new ThreeDTheater(this.dom.arena3DContainer, () => this.gridManager);
            const startIdx = this.gridManager.cells.findIndex(c => c && c.type === 'start');
            if (startIdx !== -1) {
                const col = this.gridManager.getCol(startIdx);
                const row = this.gridManager.getRow(startIdx);
                this.theater3D.updateRobotPosition(col * 300 + 150, row * 300 + 150, 0, false);
            }
            if (this.pathNodes && this.pathNodes.length > 0) {
                this.theater3D.updateTrajectoryLine(this.pathNodes);
            }
            this.theater3D.render();
        }
    }`
);

fs.writeFileSync(targetFile, html, 'utf8');
console.log('Successfully updated simulation handlers and _init3DTheater in web.html');
