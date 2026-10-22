/**
 * =============================================================================
 * BUILDER SCRIPT: PT-ROBOTICS ROBOBLOCKS STYLE IDE + OFFICIAL 3D SIMULATOR
 * Fully Integrated Capabilities (from Reverse-Engineered roboBlocks IDE):
 *  1. Motor Control & Heading Lock (4WD WD4 differential, filtered PD, S-curve)
 *  2. Line Sensor & Line Following (8-ch SPI ADC array, centroid, 0.689 bamboo)
 *  3. Physics & Competition Field (15° bridge, 50mm elevation, 7 chopsticks, traction)
 *  4. Hardware Timing (PCA9685 540µs/write -> 2160µs batch, 1200µs ADC, 20ms loop)
 *  5. 3D Robot & Field Models: STRICT ASSET SELECTION
 *     - Only "Five-Point Route" & "Quick Drop Box 4 ENC"
 *     - Authentic PT-BOT_Atom_VX.glb (6.53 MB) with high-detail procedural fallback
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const layoutFivePoints = {"version": 1, "seed": "rescue-pdf-example", "cells": [{"type": "rescue_corner", "rotation": 1, "locked": false}, {"type": "rescue_drop", "rotation": 3, "locked": false}, {"type": "rescue_open", "rotation": 0, "locked": false}, {"type": "rescue_edge", "rotation": 2, "locked": false}, {"type": "rescue_corridor", "rotation": 0, "locked": false}, {"type": "rescue_corner", "rotation": 2, "locked": false}, {"type": "rescue_corner", "rotation": 1, "locked": false}, {"type": "rescue_start", "rotation": 0, "locked": false}, {"type": "rescue_edge", "rotation": 1, "locked": false}, {"type": "rescue_edge", "rotation": 2, "locked": false}, {"type": "rescue_open", "rotation": 0, "locked": false}, {"type": "rescue_pit", "rotation": 1, "locked": false}, {"type": "rescue_closed", "rotation": 0, "locked": false}, {"type": "rescue_edge", "rotation": 1, "locked": false}, {"type": "rescue_edge", "rotation": 0, "locked": false}, {"type": "rescue_edge", "rotation": 3, "locked": false}, {"type": "rescue_corridor", "rotation": 1, "locked": false}, {"type": "rescue_edge", "rotation": 1, "locked": false}, {"type": "rescue_checkpoint_corner", "rotation": 0, "locked": false}, {"type": "rescue_open", "rotation": 0, "locked": false}, {"type": "rescue_open", "rotation": 0, "locked": false}, {"type": "rescue_open", "rotation": 0, "locked": false}, {"type": "rescue_checkpoint_corridor", "rotation": 0, "locked": false}, {"type": "rescue_edge", "rotation": 3, "locked": false}, {"type": "rescue_finish", "rotation": 1, "locked": false}, {"type": "rescue_drop", "rotation": 0, "locked": false}, {"type": "rescue_drop", "rotation": 1, "locked": false}, {"type": "rescue_edge", "rotation": 0, "locked": false}, {"type": "rescue_open", "rotation": 0, "locked": false}, {"type": "rescue_open", "rotation": 0, "locked": false}, {"type": "rescue_drop", "rotation": 1, "locked": false}, {"type": "rescue_corner", "rotation": 3, "locked": false}], "canColors": [null, null, null, null, null, null], "objects": [{"type": "tunnel", "cell": 2, "rotation": 0}, {"type": "bridge_platform", "cell": 29, "rotation": 0}, {"type": "bridge_ramp", "cell": 28, "rotation": 0}, {"type": "bridge_ramp", "cell": 21, "rotation": 1}]};
const layoutOfficial100 = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'arenas', 'official_field_mission.json'), 'utf8'));
const layoutNormal = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'arenas', 'normal.json'), 'utf8'));
const layoutJaajaj = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'arenas', 'jaajaj.json'), 'utf8'));
const layoutQuickBox = {"version": 1, "preset": "quick-box-drop", "seed": "quick-box-drop", "cells": [{"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "quick_box_0", "rotation": 0, "locked": true}, {"type": "rescue_corner", "rotation": 2, "locked": true}, {"type": "rescue_edge", "rotation": 2, "locked": true}, {"type": "quick_box_3", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "quick_box_4", "rotation": 0, "locked": true}, {"type": "rescue_edge", "rotation": 0, "locked": true}, {"type": "rescue_open", "rotation": 0, "locked": true}, {"type": "quick_box_7", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "quick_box_8", "rotation": 0, "locked": true}, {"type": "rescue_edge", "rotation": 3, "locked": true}, {"type": "rescue_open", "rotation": 0, "locked": true}, {"type": "quick_box_11", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "quick_box_12", "rotation": 0, "locked": true}, {"type": "rescue_edge", "rotation": 0, "locked": true}, {"type": "rescue_edge", "rotation": 0, "locked": true}, {"type": "quick_box_15", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}, {"type": "blank", "rotation": 0, "locked": true}], "canColors": [null, null, null, null, null, null], "name": "Quick Drop Box 4 ENC", "description": "Official 4-Zone Rescue Supply Box Delivery Mission (120x120cm core, 4 Drop Targets: BOX1-4)", "field": {"width": 2.4, "length": 1.2, "rows": 4, "cols": 8, "tileSize": 0.3}, "dropZones": [{"id": "BOX1", "name": "Drop Zone 1 (Front Left)", "x": -0.15, "z": -0.45, "cell": 2, "label": "BOX 1 (FL)"}, {"id": "BOX2", "name": "Drop Zone 2 (Front Right)", "x": 0.45, "z": -0.45, "cell": 5, "label": "BOX 2 (FR)"}, {"id": "BOX3", "name": "Drop Zone 3 (Rear Right)", "x": 0.45, "z": 0.15, "cell": 21, "label": "BOX 3 (B)"}, {"id": "BOX4", "name": "Drop Zone 4 (Rear Left)", "x": -0.15, "z": 0.15, "cell": 18, "label": "BOX 4 (F)"}], "startPose": {"x": 0.45, "y": 0.02, "z": 0.45, "heading": 90}};

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>roboBlocks IDE · PT Atom VX Tactical Mission & 3D Simulator</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="assets/lib/three.min.js"></script>
    <script src="assets/lib/OrbitControls.js"></script>
    <script src="assets/lib/GLTFLoader.js"></script>

    <style>
        
        /* -------------------------------------------------------------------------
           IMPECCABLE DESIGN SYSTEM: LINEAR/VERCEL PINNED STUDIO LAYOUT
           ------------------------------------------------------------------------- */
        :root {
            --mb-brand: #44abff;
            --mb-brand-deep: #0284c7;
            --mb-brand-light: #f0f9ff;
            --mb-bg: #0b0f19;
            --mb-panel: #ffffff;
            --mb-border: #e2e8f0;
            --mb-border-subtle: #f1f5f9;
            --mb-text: #0f172a;
            --mb-text-muted: #64748b;
            --font-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-code: "JetBrains Mono", "SF Mono", monospace;
            --radius-sm: 6px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
            --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }

        body {
            font-family: var(--font-ui);
            background: #090d16;
            color: var(--mb-text);
            margin: 0;
            padding: 0;
            overflow: hidden;
            height: 100vh;
            display: flex;
            flex-direction: column;
            -webkit-font-smoothing: antialiased;
        }

        .ide-workspace {
            flex: 1;
            display: grid;
            grid-template-columns: 480px 1fr;
            height: calc(100vh - 52px - 28px);
            overflow: hidden;
        }

        .workspace-left-panel {
            background: var(--mb-panel);
            border-right: 1px solid var(--mb-border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10;
        }

        .pinned-canvas-section {
            background: #ffffff;
            border-bottom: 1px solid var(--mb-border);
            padding: 10px 12px 12px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .canvas-hint-banner {
            font-size: 0.72rem;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 500;
        }

        .canvas-hint-banner b {
            color: #0f172a;
        }

        .canvas-box-outer {
            width: 456px;
            height: 228px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            margin: 0 auto;
        }

        #arena2dCanvas {
            display: block;
            width: 456px;
            height: 228px;
            cursor: crosshair;
        }

        .left-panel-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border);
            padding: 0 8px;
            height: 42px;
            flex-shrink: 0;
        }

        .panel-nav-tabs {
            display: flex;
            gap: 2px;
        }

        .tab-btn {
            background: transparent;
            border: none;
            padding: 8px 12px;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--mb-text-muted);
            border-bottom: 2px solid transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .tab-btn:hover {
            color: var(--mb-text);
        }

        .tab-btn.active {
            color: var(--mb-brand-deep);
            border-bottom-color: var(--mb-brand-deep);
            font-weight: 700;
        }

        .tab-content-area {
            flex: 1;
            overflow-y: auto;
            position: relative;
            background: #ffffff;
        }

        .tab-pane {
            display: none;
            height: 100%;
            padding: 12px 14px;
            box-sizing: border-box;
        }

        .tab-pane.active {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        /* PALETTE TOOLS */
        .palette-group-title {
            font-size: 0.70rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 4px 0 6px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .palette-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-bottom: 8px;
        }

        .palette-btn {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 7px 10px;
            font-size: 0.74rem;
            font-weight: 600;
            color: #1e293b;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.12s ease;
            text-align: left;
        }

        .palette-btn:hover {
            background: #f8fafc;
            border-color: #94a3b8;
        }

        .palette-btn.active {
            background: #eff6ff;
            border-color: #0284c7;
            color: #0369a1;
            box-shadow: 0 0 0 1px #0284c7;
        }

        .swatch-icon {
            width: 14px;
            height: 14px;
            border-radius: 3px;
            flex-shrink: 0;
            border: 1px solid rgba(0, 0, 0, 0.12);
        }

        /* LEFT PANEL: TACTICAL MISSION SUITE & ROUTE PLANNER */
        .workspace-left-panel {
            background: var(--mb-panel);
            border-right: 1px solid var(--mb-border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10;
        }

        .left-panel-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border);
            padding: 0 8px;
            height: 40px;
        }

        .panel-nav-tabs {
            display: flex;
            gap: 4px;
        }

        .tab-btn {
            background: transparent;
            border: none;
            padding: 8px 12px;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--mb-text-muted);
            border-bottom: 2px solid transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .tab-btn.active {
            color: var(--mb-brand-deep);
            border-bottom-color: var(--mb-brand-deep);
            font-weight: 700;
        }

        .tab-content-area {
            flex: 1;
            overflow-y: auto;
            position: relative;
        }

        .tab-pane {
            display: none;
            height: 100%;
        }

        .tab-pane.active {
            display: flex;
            flex-direction: column;
        }

        /* Planner View */
        .planner-canvas-wrap {
            flex: 1;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .planner-actions-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 4px;
        }
        .route-validation-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: var(--radius-md);
            padding: 8px 12px;
            font-size: 0.73rem;
            color: #166534;
        }
        .route-validation-box.invalid {
            background: #fef2f2;
            border-color: #fecaca;
            color: #991b1b;
        }
        .val-errors {
            margin-top: 4px;
            font-size: 0.70rem;
            line-height: 1.4;
            color: #b91c1c;
        }
        .wp-editor-card {
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: var(--shadow-subtle);
        }
        .wp-editor-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 700;
            font-size: 0.75rem;
            color: #1e293b;
        }
        .wp-editor-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }
        .wp-field {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .wp-field label {
            font-size: 0.65rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
        }
        .wp-field input, .wp-field select {
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 4px 6px;
            font-size: 0.74rem;
            font-family: var(--font-code);
            background: #f8fafc;
        }
        .wp-field.span-2 {
            grid-column: span 2;
        }
        .wp-field.span-4 {
            grid-column: span 4;
        }
        .code-val-badge {
            font-size: 0.65rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: var(--radius-pill);
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(16, 185, 129, 0.15);
            color: #059669;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .code-val-badge.invalid {
            background: rgba(239, 68, 68, 0.15);
            color: #dc2626;
            border-color: rgba(239, 68, 68, 0.3);
        }
        .planner-actions-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 4px;
        }
        .route-validation-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: var(--radius-md);
            padding: 8px 12px;
            font-size: 0.73rem;
            color: #166534;
        }
        .route-validation-box.invalid {
            background: #fef2f2;
            border-color: #fecaca;
            color: #991b1b;
        }
        .val-errors {
            margin-top: 4px;
            font-size: 0.70rem;
            line-height: 1.4;
            color: #b91c1c;
        }
        .wp-editor-card {
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: var(--shadow-subtle);
        }
        .wp-editor-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 700;
            font-size: 0.75rem;
            color: #1e293b;
        }
        .wp-editor-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }
        .wp-field {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .wp-field label {
            font-size: 0.65rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
        }
        .wp-field input, .wp-field select {
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 4px 6px;
            font-size: 0.74rem;
            font-family: var(--font-code);
            background: #f8fafc;
        }
        .wp-field.span-2 {
            grid-column: span 2;
        }
        .wp-field.span-4 {
            grid-column: span 4;
        }
        .code-val-badge {
            font-size: 0.65rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: var(--radius-pill);
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(16, 185, 129, 0.15);
            color: #059669;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .code-val-badge.invalid {
            background: rgba(239, 68, 68, 0.15);
            color: #dc2626;
            border-color: rgba(239, 68, 68, 0.3);
        }
        .arena-canvas-box {
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 8px;
            box-shadow: var(--shadow-subtle);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        #arena2dCanvas {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            width: 100%;
            height: 210px;
            display: block;
        }

        .planner-info-card {
            background: #f8fafc;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 12px;
            font-size: 0.75rem;
            line-height: 1.5;
        }

        .planner-info-title {
            font-weight: 700;
            color: var(--mb-text);
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .badge-pill {
            font-size: 0.65rem;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: var(--radius-pill);
            display: inline-block;
        }

        .badge-pill.blue {
            background: #e0f2fe;
            color: #0369a1;
        }

        .badge-pill.green {
            background: #dcfce7;
            color: #15803d;
        }

        .badge-pill.amber {
            background: #fef3c7;
            color: #b45309;
        }

        /* Action Sheet Table View */
        .actionsheet-wrap {
            flex: 1;
            padding: 14px;
            overflow-y: auto;
        }

        .action-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.75rem;
        }

        .action-table th {
            background: #f1f5f9;
            color: var(--mb-text-muted);
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 1px solid var(--mb-border);
        }

        .action-table td {
            padding: 8px 10px;
            border-bottom: 1px solid var(--mb-border-subtle);
            vertical-align: middle;
        }

        .action-table tr:hover td {
            background: #f8fafc;
        }

        .step-badge {
            background: #0284c7;
            color: #ffffff;
            font-weight: 800;
            font-size: 0.68rem;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
        }

        .tag-obstacle {
            font-size: 0.65rem;
            font-weight: 700;
            background: #fef3c7;
            color: #b45309;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .tag-drop {
            font-size: 0.65rem;
            font-weight: 700;
            background: #dcfce7;
            color: #166534;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        /* Code Generation View */
        .code-view-wrap {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #1e293b;
            color: #f8fafc;
        }

        .code-lang-selector {
            display: flex;
            gap: 2px;
            padding: 6px 10px;
            background: #0f172a;
            border-bottom: 1px solid #334155;
        }

        .lang-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            padding: 4px 10px;
            font-size: 0.72rem;
            font-weight: 600;
            border-radius: var(--radius-sm);
            cursor: pointer;
        }

        .lang-btn.active {
            background: #334155;
            color: #ffffff;
            font-weight: 700;
        }

        .code-area {
            flex: 1;
            padding: 12px;
            font-family: var(--font-code);
            font-size: 0.74rem;
            line-height: 1.5;
            overflow: auto;
            white-space: pre;
            color: #e2e8f0;
        }

        /* -------------------------------------------------------------------------
           3. RIGHT PANEL: 3D OFFICIAL SIMULATOR
           ------------------------------------------------------------------------- */
        .workspace-right-panel {
            background: #0b1120;
            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .sim-canvas-viewport {
            flex: 1;
            width: 100%;
            height: 100%;
            position: relative;
        }

        /* Floating Telemetry HUD */
        .sim-overlay-hud {
            position: absolute;
            top: 14px;
            left: 14px;
            z-index: 20;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        }

        .hud-card {
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(148, 163, 184, 0.25);
            border-radius: var(--radius-md);
            padding: 10px 14px;
            color: #ffffff;
            font-family: var(--font-code);
            font-size: 0.70rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
            pointer-events: auto;
            min-width: 290px;
        }

        .hud-card-title {
            font-size: 0.68rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: var(--mb-brand);
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 4px;
        }

        .hud-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2px 0;
        }

        .hud-label {
            color: #94a3b8;
            font-weight: 500;
        }

        .hud-val {
            font-weight: 700;
            color: #38bdf8;
        }

        /* Motor Gauges Grid */
        .motor-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-top: 4px;
        }

        .motor-gauge-box {
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 3px 6px;
        }

        .motor-gauge-bar {
            height: 4px;
            background: #334155;
            border-radius: 2px;
            margin-top: 2px;
            overflow: hidden;
        }

        .motor-gauge-fill {
            height: 100%;
            background: #38bdf8;
            width: 0%;
            transition: width 0.05s ease;
        }

        /* Optical 8-Channel Line Sensor Bars */
        .sensor-array-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 3px;
            align-items: flex-end;
            height: 38px;
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 4px;
            margin-top: 4px;
        }

        .sensor-bar-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: flex-end;
        }

        .sensor-bar-fill {
            width: 100%;
            background: #22c55e;
            border-radius: 1px;
            min-height: 2px;
            transition: height 0.05s ease, background 0.1s ease;
        }

        .sensor-bar-lbl {
            font-size: 0.55rem;
            color: #94a3b8;
            margin-top: 2px;
        }

        /* Camera Angle Controls */
        .sim-cam-controls {
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 20;
            display: flex;
            gap: 6px;
        }

        .cam-pill-btn {
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(148, 163, 184, 0.25);
            color: #94a3b8;
            border-radius: var(--radius-pill);
            padding: 6px 12px;
            font-size: 0.72rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .cam-pill-btn:hover, .cam-pill-btn.active {
            background: var(--mb-brand-deep);
            color: #ffffff;
            border-color: var(--mb-brand-deep);
        }

        /* Simulation Playback Toolbar */
        .sim-bottom-toolbar {
            height: 52px;
            background: rgba(15, 23, 42, 0.95);
            border-top: 1px solid rgba(148, 163, 184, 0.2);
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 20;
        }

        .sim-controls-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sim-btn {
            border: none;
            border-radius: var(--radius-sm);
            padding: 7px 14px;
            font-size: 0.76rem;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .sim-btn.primary {
            background: #10b981;
            color: #ffffff;
        }

        .sim-btn.primary:hover {
            background: #059669;
        }

        .sim-btn.secondary {
            background: #334155;
            color: #f1f5f9;
        }

        .sim-btn.secondary:hover {
            background: #475569;
        }

        .sim-btn.danger {
            background: #ef4444;
            color: #ffffff;
        }

        .sim-btn.danger:hover {
            background: #dc2626;
        }

        .sim-progress-wrap {
            flex: 1;
            max-width: 320px;
            margin: 0 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .sim-progress-bar {
            height: 6px;
            background: #1e293b;
            border-radius: 3px;
            overflow: hidden;
            position: relative;
        }

        .sim-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #38bdf8, #10b981);
            width: 0%;
            transition: width 0.05s ease;
        }

        .sim-progress-lbl {
            display: flex;
            justify-content: space-between;
            font-size: 0.66rem;
            color: #94a3b8;
            font-family: var(--font-code);
        }

        /* -------------------------------------------------------------------------
           4. BOTTOM STATUS BAR & SERIAL TERMINAL
           ------------------------------------------------------------------------- */
        .ide-status-bar {
            height: 28px;
            background: var(--mb-status-bar);
            color: #94a3b8;
            font-size: 0.70rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            z-index: 100;
            flex-shrink: 0;
            border-top: 1px solid #334155;
        }

        .status-left, .status-right {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #10b981;
        }

        .status-dot.orange {
            background: #f59e0b;
        }

        /* Bottom Terminal Drawer */
        .terminal-drawer {
            height: 120px;
            background: #0f172a;
            border-top: 1px solid #334155;
            color: #cbd5e1;
            font-family: var(--font-code);
            font-size: 0.72rem;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 15;
        }

        .terminal-header {
            height: 26px;
            background: #1e293b;
            padding: 0 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #334155;
        }

        .terminal-logs {
            flex: 1;
            padding: 8px 12px;
            overflow-y: auto;
            line-height: 1.45;
        }

        /* -------------------------------------------------------------------------
           5. EXAMPLES MODAL DIALOG (STRICT ASSET SELECTION: ONLY 2 TARGETS)
           ------------------------------------------------------------------------- */
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(5px);
            z-index: 999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }

        .modal-backdrop.open {
            opacity: 1;
            pointer-events: auto;
        }

        .examples-modal-card {
            width: 760px;
            max-width: 90vw;
            background: #ffffff;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-modal);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--mb-border);
            animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalPop {
            0% { transform: scale(0.95) translateY(10px); }
            100% { transform: scale(1) translateY(0); }
        }

        .examples-modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--mb-border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #ffffff;
        }

        .examples-header-title h2 {
            font-size: 1.15rem;
            font-weight: 800;
            color: var(--mb-text);
        }

        .examples-header-title p {
            font-size: 0.76rem;
            color: var(--mb-text-muted);
            margin-top: 2px;
        }

        .close-modal-btn {
            background: none;
            border: none;
            font-size: 1.3rem;
            color: var(--mb-text-muted);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
        }

        .close-modal-btn:hover {
            background: #f1f5f9;
            color: var(--mb-text);
        }

        .examples-modal-filters {
            padding: 10px 20px;
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border-subtle);
            display: flex;
            gap: 8px;
        }

        .filter-chip {
            background: #ffffff;
            border: 1px solid var(--mb-border);
            padding: 4px 12px;
            border-radius: var(--radius-pill);
            font-size: 0.72rem;
            font-weight: 600;
            color: var(--mb-text-muted);
            cursor: pointer;
        }

        .filter-chip.active {
            background: var(--mb-brand-deep);
            color: #ffffff;
            border-color: var(--mb-brand-deep);
        }

        .examples-modal-body {
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            max-height: 480px;
            overflow-y: auto;
            background: #f8fafc;
        }

        .example-grid-card {
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-subtle);
        }

        .example-grid-card:hover {
            transform: translateY(-2px);
            border-color: var(--mb-brand);
            box-shadow: 0 8px 20px rgba(68, 171, 255, 0.18);
        }

        .example-grid-card.featured {
            border: 2px solid var(--mb-brand);
        }

        .example-img-wrap {
            height: 140px;
            background: #e2e8f0;
            position: relative;
            overflow: hidden;
        }

        .example-img-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .featured-tag {
            position: absolute;
            top: 8px;
            right: 8px;
            background: #f59e0b;
            color: #ffffff;
            font-size: 0.60rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: var(--radius-pill);
            letter-spacing: 0.4px;
        }

        .official-tag {
            position: absolute;
            top: 8px;
            right: 8px;
            background: #10b981;
            color: #ffffff;
            font-size: 0.60rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: var(--radius-pill);
            letter-spacing: 0.4px;
        }

        .example-body-wrap {
            padding: 12px 14px;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .example-card-meta {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .example-board-badge {
            font-size: 0.62rem;
            font-weight: 800;
            color: #0369a1;
            background: #e0f2fe;
            padding: 2px 6px;
            border-radius: 4px;
        }

        .example-tag-badge {
            font-size: 0.62rem;
            font-weight: 600;
            color: var(--mb-text-muted);
        }

        .example-card-title {
            font-size: 0.95rem;
            font-weight: 800;
            color: var(--mb-text);
        }

        .example-card-desc {
            font-size: 0.72rem;
            color: var(--mb-text-muted);
            line-height: 1.45;
        }

        .example-card-footer {
            padding: 10px 14px;
            border-top: 1px solid var(--mb-border-subtle);
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .btn-open-example {
            background: var(--mb-brand-deep);
            color: #ffffff;
            border: none;
            border-radius: var(--radius-sm);
            padding: 6px 14px;
            font-size: 0.74rem;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background 0.15s ease;
        }

        .btn-open-example:hover {
            background: #0284c7;
        }

        /* Toast notifications */
        .toast-banner {
            position: fixed;
            bottom: 38px;
            right: 20px;
            background: #1e293b;
            color: #ffffff;
            border: 1px solid #475569;
            border-radius: var(--radius-md);
            padding: 10px 18px;
            font-size: 0.78rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
            z-index: 1000;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .toast-banner.show {
            transform: translateY(0);
            opacity: 1;
        }

        /* ARENA DESIGNER & TILE PALETTE */
        .palette-section-title {
            font-size: 0.72rem;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin: 12px 0 6px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .tool-palette-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-bottom: 10px;
        }

        .palette-tool-btn {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 7px 10px;
            font-size: 0.73rem;
            font-weight: 600;
            color: #1e293b;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.15s ease;
            text-align: left;
        }

        .palette-tool-btn:hover {
            background: #f8fafc;
            border-color: #94a3b8;
        }

        .palette-tool-btn.active {
            background: #eff6ff;
            border-color: #0284c7;
            color: #0369a1;
            box-shadow: 0 0 0 1px #0284c7;
        }

        .swatch-icon {
            width: 14px;
            height: 14px;
            border-radius: 3px;
            flex-shrink: 0;
            border: 1px solid rgba(0, 0, 0, 0.15);
        }

        .arena-edit-canvas-wrap {
            position: relative;
            background: #f8fafc;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .canvas-hint-banner {
            font-size: 0.70rem;
            color: #64748b;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 4px;
        }

    </style>
</head>
<body>

    <!-- -----------------------------------------------------------------------
         1. TOP HEADER (ROBOBLOCKS BRAND BAR)
         ----------------------------------------------------------------------- -->
    <header class="ide-header">
        <div class="ide-header-left">
            <div class="logo-wrap" onclick="openExamplesModal()">
                <img src="assets/images/roboblocks_logo.png" alt="roboBlocks" onerror="this.style.display='none'">
                <span>roboBlocks</span>
            </div>
            <div class="header-title-pill">
                <i class="fas fa-crosshairs"></i> TACTICAL MISSION IDE
            </div>
            <div class="board-selector-pill">
                <i class="fas fa-microchip" style="color: #4ade80;"></i>
                <span>ATOM VX (ESP32)</span>
            </div>
        </div>

        <div class="ide-header-center">
            <input type="text" class="project-name-input" id="projectNameInput" value="Five-Point Route" spellcheck="false">
        </div>

        <div class="ide-header-right">
            <button class="hdr-btn highlight" id="btnOpenExamples" onclick="openExamplesModal()">
                <i class="fas fa-star" style="color: #f59e0b;"></i> Examples
            </button>
            <button class="hdr-btn" id="btnUploadField" onclick="triggerUploadArena()" title="Upload Field Layout (.json, .mby)">
                <i class="fas fa-file-upload"></i> Upload Field
            </button>
            <button class="hdr-btn" id="btnExportField" onclick="exportArenaJSON()" title="Export Field Layout (.json)">
                <i class="fas fa-file-download"></i> Export Field
            </button>
            <input type="file" id="arenaFileInput" accept=".json,.mby,application/json" onchange="handleArenaFileUpload(event)" style="display:none;">
            <button class="hdr-btn" onclick="exportArduinoIno()">
                <i class="fas fa-microchip"></i> .ino
            </button>
            <button class="hdr-btn" onclick="exportMicroPythonPy()">
                <i class="fab fa-python"></i> .py
            </button>
        </div>
    </header>

    <!-- -----------------------------------------------------------------------
         2. MAIN WORKSPACE CONTAINER
         ----------------------------------------------------------------------- -->
    <div class="ide-workspace">

                <!-- LEFT PANEL: TACTICAL MISSION SUITE & ARENA STUDIO -->
        <div class="workspace-left-panel">
            <!-- PINNED TOP: INTERACTIVE 2.4m x 1.2m TACTICAL ARENA GRID -->
            <div class="pinned-canvas-section">
                <div class="canvas-hint-banner">
                    <span><i class="fas fa-th"></i> <b>Tactical Arena Grid (2.4m × 1.2m)</b> · 32 Cells (300mm)</span>
                    <span id="hoverCellCoord" style="font-family: var(--font-code); font-weight: 700; color: #0284c7;">Col: - | Row: -</span>
                </div>
                <div class="canvas-box-outer">
                    <canvas id="arena2dCanvas" width="456" height="228"></canvas>
                </div>
            </div>

            <!-- TABS NAVIGATION -->
            <div class="left-panel-nav">
                <div class="panel-nav-tabs">
                    <button class="tab-btn active" id="tabBtnDesign" onclick="switchLeftTab('design')">
                        <i class="fas fa-pencil-ruler"></i> Field Editor
                    </button>
                    <button class="tab-btn" id="tabBtnPlanner" onclick="switchLeftTab('planner')">
                        <i class="fas fa-route"></i> Route Planner
                    </button>
                    <button class="tab-btn" id="tabBtnActionSheet" onclick="switchLeftTab('actionsheet')">
                        <i class="fas fa-list-ol"></i> Action Sheet
                    </button>
                    <button class="tab-btn" id="tabBtnCode" onclick="switchLeftTab('code')">
                        <i class="fas fa-code"></i> Code
                    </button>
                </div>
                <div class="panel-tab-actions">
                    <span class="badge-pill blue" id="missionStatusBadge">ACTIVE: FIVE-POINT ROUTE</span>
                </div>
            </div>

            <div class="tab-content-area">
                <!-- TAB 0: ARENA DESIGNER PALETTE -->
                <div class="tab-pane active" id="tab-design">
                    <div class="palette-group-title">
                        <span><i class="fas fa-map-marker-alt"></i> Ground & Goals</span>
                        <span style="font-size: 0.65rem; color: #94a3b8;">Click canvas to paint · Right-click rotates</span>
                    </div>
                    <div class="palette-grid">
                        <button class="palette-btn active" data-tool="line" onclick="selectPaletteTool('line', this)">
                            <span class="swatch-icon" style="background: #ffffff; border: 3px solid #0f172a;"></span> Line Track
                        </button>
                        <button class="palette-btn" data-tool="start" onclick="selectPaletteTool('start', this)">
                            <span class="swatch-icon" style="background: #10b981;"></span> Start Launch
                        </button>
                        <button class="palette-btn" data-tool="checkpoint" onclick="selectPaletteTool('checkpoint', this)">
                            <span class="swatch-icon" style="background: #38bdf8;"></span> Checkpoint
                        </button>
                        <button class="palette-btn" data-tool="drop" onclick="selectPaletteTool('drop', this)">
                            <span class="swatch-icon" style="background: #f59e0b;"></span> Drop Zone
                        </button>
                        <button class="palette-btn" data-tool="finish" onclick="selectPaletteTool('finish', this)">
                            <span class="swatch-icon" style="background: #2563eb;"></span> Finish Dock
                        </button>
                        <button class="palette-btn" data-tool="empty" onclick="selectPaletteTool('empty', this)">
                            <span class="swatch-icon" style="background: #ffffff; border: 1px dashed #94a3b8;"></span> Floor (Erase)
                        </button>
                    </div>

                    <div class="palette-group-title">
                        <span><i class="fas fa-exclamation-triangle"></i> Competition Hazards</span>
                        <span style="font-size: 0.65rem; color: #94a3b8;">Physics raycast obstacles</span>
                    </div>
                    <div class="palette-grid">
                        <button class="palette-btn" data-tool="bridge" onclick="selectPaletteTool('bridge', this)">
                            <span class="swatch-icon" style="background: #d97706;"></span> Bridge 50mm
                        </button>
                        <button class="palette-btn" data-tool="bump" onclick="selectPaletteTool('bump', this)">
                            <span class="swatch-icon" style="background: #d2a679;"></span> 7 Chopsticks
                        </button>
                        <button class="palette-btn" data-tool="seesaw" onclick="selectPaletteTool('seesaw', this)">
                            <span class="swatch-icon" style="background: #7c3aed;"></span> Seesaw Teeter
                        </button>
                        <button class="palette-btn" data-tool="tunnel" onclick="selectPaletteTool('tunnel', this)">
                            <span class="swatch-icon" style="background: #334155;"></span> Dark Tunnel
                        </button>
                        <button class="palette-btn" data-tool="pit" onclick="selectPaletteTool('pit', this)">
                            <span class="swatch-icon" style="background: #0f172a; border-color: #ef4444;"></span> Black Hole Pit
                        </button>
                        <button class="palette-btn" data-tool="bomb" onclick="selectPaletteTool('bomb', this)">
                            <span class="swatch-icon" style="background: #dc2626;"></span> Hazard Bomb
                        </button>
                    </div>

                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="sim-btn primary" style="flex: 2; height: 36px; font-weight: 700;" onclick="triggerAutoPath()">
                            <i class="fas fa-magic"></i> ⚡ Auto Solve Path (100% Collision-Free)
                        </button>
                        <button class="sim-btn secondary" style="flex: 1; height: 36px;" onclick="clearCurrentArenaField()">
                            <i class="fas fa-trash-alt"></i> Clear Field
                        </button>
                    </div>
                </div>

                <!-- TAB 1: 2D ROUTE PLANNER & WAYPOINT TUNER -->
                <div class="tab-pane" id="tab-planner">
                    <div class="planner-actions-bar">
                        <button class="sim-btn primary" id="btnAutoPath" onclick="triggerAutoPath()">
                            <i class="fas fa-magic"></i> Auto Path (A*)
                        </button>
                        <button class="sim-btn secondary" id="btnAddWp" onclick="addNewWaypointCenter()">
                            <i class="fas fa-plus-circle"></i> Add Point
                        </button>
                        <button class="sim-btn secondary" id="btnUploadFieldPlan" onclick="triggerUploadArena()" title="Upload Field Layout (.json, .mby)">
                            <i class="fas fa-file-upload"></i> Upload
                        </button>
                        <button class="sim-btn secondary" id="btnExportFieldPlan" onclick="exportArenaJSON()" title="Export Field (.json)">
                            <i class="fas fa-file-download"></i> Export
                        </button>
                        <button class="sim-btn secondary" id="btnResetDefault" onclick="resetDefaultRoute()">
                            <i class="fas fa-undo"></i> Default
                        </button>
                        <button class="sim-btn danger" id="btnClearRoute" onclick="clearAllWaypoints()">
                            <i class="fas fa-trash"></i> Clear
                        </button>
                    </div>

                    <div id="routeValidationBox" class="route-validation-box">
                        <div class="val-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <span id="routeStatsSummary"><i class="fas fa-check-circle"></i> Route Valid: 5 Points | 100% Feasible</span>
                            <span id="routeFeasibilityBadge" class="badge-pill blue">EXECUTABLE TRAJECTORY</span>
                        </div>
                        <div id="routeValidationErrors" class="val-errors" style="display: none;"></div>
                    </div>

                    <div class="wp-editor-card" id="wpEditorCard">
                        <div class="wp-editor-header">
                            <span id="lblSelectedWp"><i class="fas fa-map-marker-alt"></i> Selected: Waypoint P1 (Start)</span>
                            <button class="sim-btn danger" style="padding: 2px 8px; font-size: 0.68rem;" id="btnDeletePoint" onclick="deleteSelectedWaypoint()">
                                <i class="fas fa-times"></i> Delete Point
                            </button>
                        </div>
                        <div class="wp-editor-grid">
                            <div class="wp-field">
                                <label>X (cm)</label>
                                <input type="number" id="inpWpX" step="1" onchange="updateSelectedWpField('x', this.value)">
                            </div>
                            <div class="wp-field">
                                <label>Z (cm)</label>
                                <input type="number" id="inpWpZ" step="1" onchange="updateSelectedWpField('z', this.value)">
                            </div>
                            <div class="wp-field">
                                <label>Heading (°)</label>
                                <input type="number" id="inpWpHeading" step="5" min="-180" max="180" onchange="updateSelectedWpField('heading', this.value)">
                            </div>
                            <div class="wp-field">
                                <label>Speed (%)</label>
                                <input type="number" id="inpWpSpeed" step="5" min="20" max="100" onchange="updateSelectedWpField('speed', this.value)">
                            </div>
                            <div class="wp-field span-4">
                                <label>Payload Action</label>
                                <select id="selWpAction" onchange="updateSelectedWpField('action', this.value)">
                                    <option value="">None (Continuous Cruise)</option>
                                    <option value="DROP_FL">DropFL (Front-Left Box 1)</option>
                                    <option value="DROP_FR">DropFR (Front-Right Box 2)</option>
                                    <option value="DROP_B">DropB (Rear Supply Box 3)</option>
                                    <option value="STOP">STOP (Mission Complete Dock)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: ACTION SHEET TABLE -->
                <div class="tab-pane" id="tab-actionsheet">
                    <div class="actionsheet-wrap">
                        <table class="action-table">
                            <thead>
                                <tr>
                                    <th style="width: 45px;">Step</th>
                                    <th>C++ Action Call</th>
                                    <th>Parameters</th>
                                    <th>Description / Target</th>
                                </tr>
                            </thead>
                            <tbody id="actionSheetRows">
                                <!-- Populated dynamically by renderActionSheet() -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- TAB 3: GENERATED CODE (C++ / MicroPython) -->
                <div class="tab-pane" id="tab-code">
                    <div class="code-view-wrap">
                        <div class="code-lang-selector">
                            <button class="lang-btn active" id="btnLangIno" onclick="switchCodeLang('ino')">Arduino C++ (.ino)</button>
                            <button class="lang-btn" id="btnLangSerial" onclick="switchCodeLang('serial')">Dynamic Serial</button>
                            <button class="lang-btn" id="btnLangPy" onclick="switchCodeLang('py')">MicroPython (.py)</button>
                            <span id="codeValBadge" class="code-val-badge" style="margin-left: 10px;">
                                <i class="fas fa-check-circle"></i> 100% FIRMWARE VERIFIED
                            </span>
                            <button class="hdr-btn" style="margin-left: auto; padding: 2px 8px; font-size: 0.68rem;" onclick="copyCurrentCode()">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <button class="hdr-btn" style="padding: 2px 8px; font-size: 0.68rem;" onclick="exportCurrentCode()">
                                <i class="fas fa-file-download"></i> Export
                            </button>
                        </div>
                        <pre class="code-area" id="codeDisplayArea">// Generating tactical code...</pre>
                    </div>
                </div>
            </div>

            <!-- Bottom Console / Serial Log -->
            <div class="terminal-drawer">
                <div class="terminal-header">
                    <span style="font-weight: 700; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-terminal"></i> Mission Control Console
                    </span>
                    <button style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 0.72rem;" onclick="clearTerminalLogs()">
                        <i class="fas fa-trash-alt"></i> Clear
                    </button>
                </div>
                <div class="terminal-logs" id="terminalLogs">
                    <div>[READY] roboBlocks IDE Tactical Mission Engine active.</div>
                    <div>[HARDWARE] PT Atom VX 4WD Skid-Steer profile locked.</div>
                </div>
            </div>
        </div>

        <!-- RIGHT PANEL: 3D OFFICIAL SIMULATOR -->
        <div class="workspace-right-panel">
            <div class="sim-canvas-viewport" id="canvasViewport">
                <!-- Floating Telemetry HUD -->
                <div class="sim-overlay-hud">
                    <!-- Card 1: Kinematics & Pose -->
                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-compass"></i> POSE & KINEMATICS</span>
                            <span class="badge-pill blue" id="hudDriveMode">4WD WD4</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">YAW HEADING:</span>
                            <span class="hud-val" id="hudYaw">0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PITCH / ROLL:</span>
                            <span class="hud-val" id="hudPitchRoll">0.0° / 0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">VELOCITY:</span>
                            <span class="hud-val" id="hudSpeed">0.0 cm/s</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">POSITION (X, Z):</span>
                            <span class="hud-val" id="hudPos">105.0, -45.0</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">ELEVATION (Y):</span>
                            <span class="hud-val" id="hudElevation">0.0 mm</span>
                        </div>
                    </div>

                    <!-- Card 2: Motor Control & Heading Lock PD -->
                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-tachometer-alt"></i> MOTOR CONTROL & HEADING LOCK</span>
                            <span class="badge-pill green" id="hudMotionPhase">IDLE</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">TARGET / ERROR:</span>
                            <span class="hud-val" id="hudHeadingError">Tgt 0° | Err 0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">FILTERED DERIV / PD:</span>
                            <span class="hud-val" id="hudPDOutput">dFilt 0.00 | PD ±0</span>
                        </div>
                        <div class="motor-grid">
                            <div class="motor-gauge-box">
                                <div class="hud-row" style="font-size: 0.60rem;"><span>M1 (FL):</span><span id="m1Val">0%</span></div>
                                <div class="motor-gauge-bar"><div class="motor-gauge-fill" id="m1Bar"></div></div>
                            </div>
                            <div class="motor-gauge-box">
                                <div class="hud-row" style="font-size: 0.60rem;"><span>M3 (FR):</span><span id="m3Val">0%</span></div>
                                <div class="motor-gauge-bar"><div class="motor-gauge-fill" id="m3Bar"></div></div>
                            </div>
                            <div class="motor-gauge-box">
                                <div class="hud-row" style="font-size: 0.60rem;"><span>M2 (BL):</span><span id="m2Val">0%</span></div>
                                <div class="motor-gauge-bar"><div class="motor-gauge-fill" id="m2Bar"></div></div>
                            </div>
                            <div class="motor-gauge-box">
                                <div class="hud-row" style="font-size: 0.60rem;"><span>M4 (BR):</span><span id="m4Val">0%</span></div>
                                <div class="motor-gauge-bar"><div class="motor-gauge-fill" id="m4Bar"></div></div>
                            </div>
                        </div>
                    </div>

                    <!-- Card 3: 8-Channel Line Sensor Array & Centroid -->
                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-wave-square"></i> 8-CH LINE SENSOR ARRAY (ADC0..ADC7)</span>
                            <span class="badge-pill amber" id="hudReflectanceIdx">Mat 0.08</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">LINE CENTROID:</span>
                            <span class="hud-val" id="hudCentroid">0.0 mm (Centered)</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">SURFACE STATUS:</span>
                            <span class="hud-val" id="hudSurfaceStatus" style="color: #4ade80;">TRACKING</span>
                        </div>
                        <div class="sensor-array-grid" id="sensorBarsContainer">
                            <!-- 8 optical bars -->
                            <div class="sensor-bar-col"><div class="sensor-bar-fill" id="sbar0" style="height: 10%;"></div><span class="sensor-bar-lbl">A0</span></div>
                            <div class="sensor-bar-col"><div class="sensor-bar-fill" id="sbar1" style="height: 10%;"></div><span class="sensor-bar-lbl">A1</span></div>
                            <div class="sensor-bar-col"><div class="sensor-bar-fill" id="sbar2" style="height: 10%;"></div><span class="sensor-bar-lbl">A2</span></div>
                            <div class="sensor-bar-col"><div class="sensor-bar-fill" id="sbar3" style="height: 10%;"></div><span class="sensor-bar-lbl">A3</span></div>
                            <div class="sensor-bar-col"><div class="sensor-bar-fill" id="sbar4" style="height: 10%;"></div><span class="sensor-bar-lbl">A4</span></div>
                            <div class="sensor-bar-col"><div class="sensor-bar-fill" id="sbar5" style="height: 10%;"></div><span class="sensor-bar-lbl">A5</span></div>
                            <div class="sensor-bar-col"><div class="sensor-bar-fill" id="sbar6" style="height: 10%;"></div><span class="sensor-bar-lbl">A6</span></div>
                            <div class="sensor-bar-col"><div class="sensor-bar-fill" id="sbar7" style="height: 10%;"></div><span class="sensor-bar-lbl">A7</span></div>
                        </div>
                    </div>

                    <!-- Card 4: Hardware Timing & Bus Latencies -->
                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-stopwatch"></i> HARDWARE TIMING & BUS DELAYS</span>
                            <span style="font-size: 0.60rem; color: #4ade80;">Zero Double-Counting</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PCA9685 I2C BATCH:</span>
                            <span class="hud-val">2,160 µs <span style="font-size: 0.58rem; color: #94a3b8;">[540µs×4 Measured]</span></span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">SPI ADC 8-CH SCAN:</span>
                            <span class="hud-val">1,200 µs <span style="font-size: 0.58rem; color: #94a3b8;">[Source]</span></span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">FIRMWARE LOOP:</span>
                            <span class="hud-val">20.0 ms (50 Hz) <span style="font-size: 0.58rem; color: #94a3b8;">[Source]</span></span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">ROTOR TIME CONSTANT:</span>
                            <span class="hud-val">τ_m = 35 ms <span style="font-size: 0.58rem; color: #94a3b8;">[Inferred]</span></span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">DYNAMIC BRAKE PULSE:</span>
                            <span class="hud-val">15 ms active reverse</span>
                        </div>
                    </div>
                </div>

                <!-- Camera Angle Controls -->
                <div class="sim-cam-controls">
                    <button class="cam-pill-btn active" id="camFreeBtn" onclick="setCameraView('free')">
                        <i class="fas fa-video"></i> Free Orbit
                    </button>
                    <button class="cam-pill-btn" id="camFollowBtn" onclick="setCameraView('follow')">
                        <i class="fas fa-car-side"></i> Follow Robot
                    </button>
                    <button class="cam-pill-btn" id="camTopBtn" onclick="setCameraView('top')">
                        <i class="fas fa-satellite"></i> Top View
                    </button>
                </div>
            </div>

            <!-- Simulation Controls Toolbar -->
            <div class="sim-bottom-toolbar">
                <div class="sim-controls-left">
                    <button class="sim-btn primary" id="btnSimPlay" onclick="toggleSimRun()">
                        <i class="fas fa-play" id="btnSimPlayIcon"></i>
                        <span id="btnSimPlayText">Run Sim</span>
                    </button>
                    <button class="sim-btn secondary" onclick="resetSimRun()">
                        <i class="fas fa-redo-alt"></i> Reset
                    </button>
                    <button class="sim-btn secondary" onclick="cycleSimSpeed()">
                        <i class="fas fa-forward"></i> <span id="lblSimSpeed">1x</span>
                    </button>
                </div>

                <div class="sim-progress-wrap">
                    <div class="sim-progress-lbl">
                        <span>MISSION PROGRESS</span>
                        <span id="lblSimProgressPct">0%</span>
                    </div>
                    <div class="sim-progress-bar">
                        <div class="sim-progress-fill" id="simProgressFill"></div>
                    </div>
                </div>

                <div class="sim-controls-right" style="display: flex; gap: 8px;">
                    <button class="sim-btn secondary" onclick="handleConnectSerial()">
                        <i class="fas fa-link"></i> WebSerial
                    </button>
                    <button class="sim-btn secondary" onclick="handleUploadFirmware()">
                        <i class="fas fa-upload"></i> Flash Target
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- -------------------------------------------------------------------------
         4. BOTTOM STATUS BAR
         ------------------------------------------------------------------------- -->
    <footer class="ide-status-bar">
        <div class="status-left">
            <div class="status-item">
                <span class="status-dot"></span>
                <span>Native Backend: Port 4848 (Online)</span>
            </div>
            <div class="status-item">
                <span>Model: PT-BOT_Atom_VX.glb (6.53 MB Verified)</span>
            </div>
        </div>
        <div class="status-right">
            <div class="status-item">
                <span>Physics: Rigid Body + Traction + 50mm Bridge + 7 Chopsticks</span>
            </div>
            <div class="status-item">
                <span>roboBlocks IDE v2.0.4 Embedded</span>
            </div>
        </div>
    </footer>

    <!-- -------------------------------------------------------------------------
         5. EXAMPLES MODAL DIALOG (STRICT ASSET SELECTION: EXACTLY 2 TARGETS)
         ------------------------------------------------------------------------- -->
    <div class="modal-backdrop" id="examplesModalBackdrop" onclick="handleBackdropClick(event)">
        <div class="examples-modal-card">
            <header class="examples-modal-header">
                <div class="examples-header-title">
                    <h2>Select Competition Mission</h2>
                    <p>Strict Asset Selection: Exactly 2 Authorized RoboBlocks Competition Presets</p>
                </div>
                <button class="close-modal-btn" onclick="closeExamplesModal()">&times;</button>
            </header>

            <nav class="examples-modal-filters">
                <button class="filter-chip active"><i class="fas fa-th-large"></i> All Missions</button>
                <button class="filter-chip"><i class="fas fa-star"></i> Recommended</button>
                <button class="filter-chip"><i class="fas fa-robot"></i> PT Atom VX</button>
            </nav>

            <section class="examples-modal-body">
                <!-- TARGET 1: FIVE-POINT ROUTE -->
                <div class="example-grid-card featured" onclick="loadExampleFivePointRoute()">
                    <div class="example-img-wrap">
                        <img src="assets/images/atom-vx-rescue-five-points.png" alt="Five-Point Route Preview" onerror="this.src='assets/images/field_reference.jpg'">
                        <span class="featured-tag">★ RECOMMENDED</span>
                    </div>
                    <div class="example-body-wrap">
                        <div class="example-card-meta">
                            <span class="example-board-badge">ATOM VX</span>
                            <span class="example-tag-badge">Robot activities</span>
                        </div>
                        <h3 class="example-card-title">Five-Point Route</h3>
                        <p class="example-card-desc">
                            Drive through 5 checkpoints with timed turns, filtered heading-lock PD control, 50mm elevated bridge (15° incline/decline), and 7 bamboo chopstick speed bumps (0.689 reflectance).
                        </p>
                    </div>
                    <div class="example-card-footer">
                        <span style="font-size: 0.68rem; color: #0284c7; font-weight: 700;">Official Rescue Mission</span>
                        <button class="btn-open-example">
                            <i class="fas fa-folder-open"></i> Load Mission
                        </button>
                    </div>
                </div>

                <!-- TARGET 2: QUICK DROP BOX 4 ENC -->
                <div class="example-grid-card" onclick="loadExampleQuickDropBox4Enc()">
                    <div class="example-img-wrap">
                        <img src="assets/images/atom_vx_cover.jpg" alt="Quick Drop Box 4 ENC">
                        <span class="official-tag">★ 4-DROP CHALLENGE</span>
                    </div>
                    <div class="example-body-wrap">
                        <div class="example-card-meta">
                            <span class="example-board-badge">ATOM VX</span>
                            <span class="example-tag-badge">Competition Match</span>
                        </div>
                        <h3 class="example-card-title">Quick Drop Box 4 ENC</h3>
                        <p class="example-card-desc">
                            120×120cm official arena with 16 quick-box boundary decals, 4 dedicated supply drop zones (BOX1: FL, BOX2: FR, BOX3: B, BOX4: F), and dynamic supply cube deployment.
                        </p>
                    </div>
                    <div class="example-card-footer">
                        <span style="font-size: 0.68rem; color: #10b981; font-weight: 700;">4-Zone Delivery Challenge</span>
                        <button class="btn-open-example" style="background: #10b981;">
                            <i class="fas fa-folder-open"></i> Load Mission
                        </button>
                    </div>
                </div>

                <!-- TARGET 3: OFFICIAL 100-POINT ARENA -->
                <div class="example-grid-card" onclick="loadExampleOfficial100Pts()">
                    <div class="example-img-wrap">
                        <img src="assets/images/atom_vx_sensor.png" alt="Official 100-Point Field">
                        <span class="official-tag" style="background: #e11d48;">🏆 100-POINT ARENA</span>
                    </div>
                    <div class="example-body-wrap">
                        <div class="example-card-meta">
                            <span class="example-board-badge">ATOM VX</span>
                            <span class="example-tag-badge">National Match</span>
                        </div>
                        <h3 class="example-card-title">Official 100-Point Arena</h3>
                        <p class="example-card-desc">
                            Full 32-tile competition arena with 50mm bridge, 7 chopsticks, tunnel, seesaw, sunken pit, and 4 drop zones.
                        </p>
                    </div>
                    <div class="example-card-footer">
                        <span style="font-size: 0.68rem; color: #e11d48; font-weight: 700;">Full 100-Point Circuit</span>
                        <button class="btn-open-example" style="background: #e11d48;">
                            <i class="fas fa-folder-open"></i> Load Mission
                        </button>
                    </div>
                </div>

                <!-- TARGET 4: NORMAL PRACTICE FIELD -->
                <div class="example-grid-card" onclick="loadExampleNormalField()">
                    <div class="example-img-wrap">
                        <img src="assets/images/atom_vx_motor.png" alt="Normal Field">
                        <span class="official-tag" style="background: #d97706;">🥢 BUMPS & PIT</span>
                    </div>
                    <div class="example-body-wrap">
                        <div class="example-card-meta">
                            <span class="example-board-badge">ATOM VX</span>
                            <span class="example-tag-badge">Obstacle Practice</span>
                        </div>
                        <h3 class="example-card-title">Normal Practice Field</h3>
                        <p class="example-card-desc">
                            Standard rescue arena layout with bamboo chopsticks speed bumps, blackhole pit avoidance, and West drop bay.
                        </p>
                    </div>
                    <div class="example-card-footer">
                        <span style="font-size: 0.68rem; color: #d97706; font-weight: 700;">Tactical Obstacles</span>
                        <button class="btn-open-example" style="background: #d97706;">
                            <i class="fas fa-folder-open"></i> Load Mission
                        </button>
                    </div>
                </div>

                <!-- UPLOAD CUSTOM ARENA CARD -->
                <div class="example-grid-card" onclick="triggerUploadArena()" style="border: 2px dashed #0284c7; background: rgba(2, 132, 199, 0.04); cursor: pointer; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 10px;">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h3 style="font-size: 0.92rem; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Upload Custom Field</h3>
                    <p style="font-size: 0.72rem; color: #64748b; line-height: 1.4; margin-bottom: 12px;">
                        Import any arena layout JSON file (.json) or roboBlocks project (.mby). Drag & drop anywhere!
                    </p>
                    <button class="btn-open-example" style="background: #0284c7;">
                        <i class="fas fa-upload"></i> Browse File
                    </button>
                </div>
            </section>
        </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast-banner" id="toastBanner">
        <i class="fas fa-check-circle" style="color: #34d399; font-size: 1.1rem;"></i>
        <span id="toastMessage">Mission loaded successfully</span>
    </div>

    <!-- -----------------------------------------------------------------------
         6. CORE LOGIC, 3D SIMULATOR ENGINE & TACTICAL PLANNER
         ----------------------------------------------------------------------- -->
    <script>
        // Official Arena Layout Data
        const ARENA_OFFICIAL_100 = ${JSON.stringify(layoutOfficial100)};
        const ARENA_NORMAL = ${JSON.stringify(layoutNormal)};
        const ARENA_JAAJAJ = ${JSON.stringify(layoutJaajaj)};
        const ARENA_FIVE_POINTS = ${JSON.stringify(layoutFivePoints)};
        const ARENA_QUICK_BOX = ${JSON.stringify(layoutQuickBox)};

        let currentArenaData = ARENA_FIVE_POINTS;

        // State Machine
        let activeProject = {
            id: "atom-vx-rescue-five-points",
            name: "Five-Point Route",
            loaded: true,
            waypoints: []
        };

        let currentCodeLang = "ino";
        let isSimRunning = false;
        let simProgress = 0;
        let simSpeed = 1;
        let simCamMode = "free"; // "free" | "follow" | "top"

        // Three.js Globals
        let scene, camera, renderer, controls;
        let robotMesh = null;
        let robotWheelMeshes = [];
        let trailLine = null;
        let trailPoints = [];
        let obstacleMeshes = [];
        let droppedBoxMeshes = [];

        // Heading Lock PD Sim State
        let headingSimState = {
            prevError: 0,
            filtDeriv: 0,
            kp: 3.5,
            kd: 17.0,
            maxSpeed: 80
        };

        // 1. FIVE-POINT ROUTE WAYPOINTS (Real world coordinates in arena: 2.4m x 1.2m)
        const FIVE_POINT_PATH = [
            { x: 1.05, z: -0.45, y: 0.0, heading: 0,   desc: "Point 1: วิ่งตรงด้วยไจโร 0° ออกตัวจาก START", speed: 70, time: 1.5, obstacle: "Normal" },
            { x: 1.05, z: 0.15,  y: 0.0, heading: -90, desc: "Point 2: เลี้ยวซ้าย 90° อยู่กับที่ มุ่งหน้า -90°", speed: 60, time: 0.8, obstacle: "Turn L" },
            { x: 0.45, z: 0.15,  y: 0.0, heading: 0,   desc: "Point 3: เลี้ยวขวา 90° ข้ามลูกระนาดตะเกียบ (Chopstick Bumps)", speed: 60, time: 1.4, obstacle: "Chopstick Bumps" },
            { x: -0.15, z: 0.15, y: 0.05, heading: 90, desc: "Point 4: เลี้ยวขวา 90° ไต่ขึ้นสะพานยกระดับ 50mm", speed: 65, time: 1.8, obstacle: "Bridge (+50mm)" },
            { x: -0.75, z: -0.15, y: 0.0, heading: 0,  desc: "Point 5: เลี้ยวซ้าย 90° จอดนิ่งดรอปเสบียง (Drop Supply)", speed: 70, time: 1.2, obstacle: "Drop Zone" }
        ];

        // 2. QUICK DROP BOX 4 ENC WAYPOINTS (Official Quick Box Drop 120x120cm core)
        const QUICK_BOX_PATH = [
            { x: 0.45,  z: 0.45,  y: 0.0, heading: 90,  desc: "Start: ออกตัวจากโซนเริ่ม Quick Box 15", speed: 60, time: 0.5, obstacle: "Start Bay", drop: null },
            { x: -0.15, z: -0.45, y: 0.0, heading: 0,   desc: "Drop 1 (BOX 1): วิ่งเข้าช่อง Drop Front Left (DropFL)", speed: 70, time: 1.2, obstacle: "Drop Bay 1", drop: "BOX1" },
            { x: 0.45,  z: -0.45, y: 0.0, heading: 90,  desc: "Drop 2 (BOX 2): ไจโรหมุน 90° เข้า Drop Front Right (DropFR)", speed: 65, time: 1.0, obstacle: "Drop Bay 2", drop: "BOX2" },
            { x: 0.45,  z: 0.15,  y: 0.0, heading: 180, desc: "Drop 3 (BOX 3): เลี้ยวถอยเข้า Drop Rear (DropB)", speed: 60, time: 1.1, obstacle: "Drop Bay 3", drop: "BOX3" },
            { x: -0.15, z: 0.15,  y: 0.0, heading: 270, desc: "Drop 4 (BOX 4): ลุยเข้า Drop Front Dual (DropF)", speed: 70, time: 1.3, obstacle: "Drop Bay 4", drop: "BOX4" },
            { x: 0.45,  z: 0.45,  y: 0.0, heading: 90,  desc: "Finish: ถอยกลับเข้าฐานภารกิจและหยุดนิ่ง (STOP)", speed: 50, time: 0.8, obstacle: "Home Base", drop: null }
        ];

        activeProject.waypoints = FIVE_POINT_PATH;

        // ---------------------------------------------------------------------
        // APPLICATION INITIALIZATION
        // ---------------------------------------------------------------------
        window.addEventListener('DOMContentLoaded', () => {
            initThreeJsSimulator();
            initArena2dCanvas();
            renderActionSheet();
            renderGeneratedCode();

            logTerminal("roboBlocks Tactical Mission Suite initialized.");
            logTerminal("Hardware profile: PT Atom VX 4WD (WD4) locked.");
            logTerminal("Default Mission: [Five-Point Route] loaded.");
        });

        // ---------------------------------------------------------------------
        // EXAMPLES MODAL LOGIC (STRICT SELECTION OF 2 AUTHORIZED MISSIONS)
        // ---------------------------------------------------------------------
        function openExamplesModal() {
            document.getElementById('examplesModalBackdrop').classList.add('open');
        }

        function closeExamplesModal() {
            document.getElementById('examplesModalBackdrop').classList.remove('open');
        }

        function handleBackdropClick(e) {
            if (e.target.id === 'examplesModalBackdrop') {
                closeExamplesModal();
            }
        }


        // ---------------------------------------------------------------------
        // ARENA UPLOAD, IMPORT, EXPORT & PRESET CONTROLLER
        // ---------------------------------------------------------------------
        function triggerUploadArena() {
            let input = document.getElementById('arenaFileInput');
            if (!input) {
                input = document.createElement('input');
                input.type = 'file';
                input.id = 'arenaFileInput';
                input.accept = '.json,.mby,application/json';
                input.style.display = 'none';
                input.onchange = handleArenaFileUpload;
                document.body.appendChild(input);
            }
            input.value = '';
            input.click();
        }

        function handleArenaFileUpload(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                showToast("File exceeds 5MB safety limit");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                loadArenaFromJSON(e.target.result, file.name);
            };
            reader.readAsText(file);
        }

        function loadArenaFromJSON(jsonText, fileName) {
            try {
                let parsed = null;
                if (typeof jsonText === 'string') {
                    parsed = JSON.parse(jsonText);
                } else if (typeof jsonText === 'object') {
                    parsed = jsonText;
                }
                if (!parsed) throw new Error("Invalid JSON payload");

                const cleanName = (fileName || 'Custom Arena').replace(/\.[^/.]+$/, "");
                activeProject.id = "custom-" + Date.now();
                activeProject.name = cleanName;
                activeProject.loaded = true;

                // Normalize waypoints
                let waypoints = [];
                if (parsed.pathNodes && Array.isArray(parsed.pathNodes) && parsed.pathNodes.length > 0) {
                    waypoints = parsed.pathNodes.map((node, idx) => {
                        let x = node.x;
                        let z = node.z;
                        if (x === undefined && node.cellIdx !== undefined) {
                            const c = node.cellIdx % 8;
                            const r = Math.floor(node.cellIdx / 8);
                            x = parseFloat((-1.05 + c * 0.30).toFixed(2));
                            z = parseFloat((-0.45 + r * 0.30).toFixed(2));
                        }
                        let fnName = node.fn || "FORWARD";
                        if (fnName === "FF") fnName = "FORWARD";
                        if (fnName === "BB") fnName = "BACKWARD";
                        if (fnName === "spinDegree") fnName = (node.angle < 0) ? "TURN_LEFT" : "TURN_RIGHT";
                        if (fnName === "turnDegreeFront") fnName = (node.angle < 0) ? "TURN_LEFT" : "TURN_RIGHT";

                        return {
                            id: idx + 1,
                            x: x !== undefined ? x : 0,
                            z: z !== undefined ? z : 0,
                            label: node.label || ('WP ' + (idx + 1)),
                            fn: fnName,
                            speed: node.speed || 70,
                            time: node.timer ? parseFloat((node.timer / 1000).toFixed(2)) : (node.time || 0.5),
                            angle: node.angle !== undefined ? node.angle : 0,
                            kp: node.kp || 0.6,
                            kd: node.kd || 2.0
                        };
                    });
                } else if (parsed.waypoints && Array.isArray(parsed.waypoints) && parsed.waypoints.length > 0) {
                    waypoints = parsed.waypoints;
                }

                currentArenaData = parsed;

                // If no waypoints provided, auto-compute default start to targets
                if (waypoints.length === 0) {
                    let startIdx = 31;
                    let targetIdx = 0;
                    if (parsed.gridData) {
                        const sIdx = parsed.gridData.findIndex(g => g.type === 'start');
                        if (sIdx !== -1) startIdx = sIdx;
                        const fIdx = parsed.gridData.findIndex(g => g.type === 'finish' || (g.type && g.type.includes('drop')) || g.type === 'checkpoint');
                        if (fIdx !== -1) targetIdx = fIdx;
                    } else if (parsed.cells) {
                        const sIdx = parsed.cells.findIndex(c => c.type === 'rescue_start');
                        if (sIdx !== -1) startIdx = sIdx;
                        const fIdx = parsed.cells.findIndex(c => c.type === 'rescue_finish' || (c.type && c.type.includes('drop')));
                        if (fIdx !== -1) targetIdx = fIdx;
                    }

                    const sc = startIdx % 8;
                    const sr = Math.floor(startIdx / 8);
                    const tc = targetIdx % 8;
                    const tr = Math.floor(targetIdx / 8);

                    const sx = parseFloat((-1.05 + sc * 0.30).toFixed(2));
                    const sz = parseFloat((-0.45 + sr * 0.30).toFixed(2));
                    const tx = parseFloat((-1.05 + tc * 0.30).toFixed(2));
                    const tz = parseFloat((-0.45 + tr * 0.30).toFixed(2));

                    waypoints = [
                        { id: 1, x: sx, z: sz, label: "START", fn: "START", speed: 0, time: 0, angle: 90, kp: 0.6, kd: 2.0 },
                        { id: 2, x: sx, z: parseFloat(((sz + tz)/2).toFixed(2)), label: "WP 1 (NAV)", fn: "FORWARD", speed: 60, time: 0.8, angle: 90, kp: 0.6, kd: 2.0 },
                        { id: 3, x: tx, z: tz, label: "TARGET DOCK", fn: "STOP", speed: 0, time: 0.2, angle: 90, kp: 0.6, kd: 2.0 }
                    ];
                }

                activeProject.waypoints = waypoints;

                const nameInput = document.getElementById('projectNameInput');
                if (nameInput) nameInput.value = activeProject.name;

                const badge = document.getElementById('missionStatusBadge');
                if (badge) {
                    badge.textContent = "CUSTOM: " + activeProject.name.toUpperCase();
                    badge.className = "badge-pill blue";
                }

                const titleEl = document.getElementById('arenaInfoTitle');
                if (titleEl) titleEl.textContent = activeProject.name + ' · Loaded Arena';

                const descEl = document.getElementById('arenaInfoDesc');
                if (descEl) {
                    const cellCount = (parsed.gridData ? parsed.gridData.length : (parsed.cells ? parsed.cells.length : 32));
                    descEl.textContent = 'Custom arena imported with ' + cellCount + ' tiles, ' + waypoints.length + ' route waypoints, and dynamic 3D obstacle synthesis.';
                }

                clearDroppedBoxes();
                build3DArenaObstacles();
                drawArena2D();
                renderActionSheet();
                renderGeneratedCode();
                resetSimRun();

                showToast('Loaded Arena: ' + cleanName);
                logTerminal('[ARENA] Loaded field layout: ' + cleanName + ' (' + waypoints.length + ' waypoints)');
            } catch (err) {
                console.error("Load Arena Error:", err);
                showToast("Error loading arena: " + err.message);
                logTerminal('[ERROR] Failed to parse arena file: ' + err.message);
            }
        }

        function exportArenaJSON() {
            try {
                let exportData = {};
                if (currentArenaData && (currentArenaData.gridData || currentArenaData.cells)) {
                    exportData = JSON.parse(JSON.stringify(currentArenaData));
                } else {
                    exportData = { COLS: 8, ROWS: 4, gridData: [] };
                }
                exportData.name = activeProject.name || "Custom Arena";
                exportData.waypoints = activeProject.waypoints || [];
                exportData.pathNodes = (activeProject.waypoints || []).map(wp => {
                    const c = Math.max(0, Math.min(7, Math.round((wp.x + 1.05) / 0.30)));
                    const r = Math.max(0, Math.min(3, Math.round((wp.z + 0.45) / 0.30)));
                    return {
                        cellIdx: r * 8 + c,
                        x: wp.x,
                        z: wp.z,
                        label: wp.label,
                        fn: wp.fn,
                        speed: wp.speed,
                        timer: Math.round(wp.time * 1000),
                        angle: wp.angle
                    };
                });

                const jsonStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const cleanName = (activeProject.name || 'arena').toLowerCase().replace(/[^a-z0-9_]/g, '_');
                a.download = cleanName + '_layout.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToast('Exported Arena: ' + a.download);
                logTerminal('[EXPORT] Arena JSON exported: ' + a.download);
            } catch (err) {
                showToast("Export error: " + err.message);
            }
        }

        function loadExampleOfficial100Pts() {
            closeExamplesModal();
            loadArenaFromJSON(ARENA_OFFICIAL_100, "Official 100-Point Field");
            showToast("Loaded: Official 100-Point Competition Field");
            logTerminal("Loaded official mission: [Official 100-Point Field]");
        }

        function loadExampleNormalField() {
            closeExamplesModal();
            loadArenaFromJSON(ARENA_NORMAL, "Normal Field (Bumps & Pit)");
            showToast("Loaded: Normal Field");
            logTerminal("Loaded arena: [Normal Field]");
        }

        function loadExampleJaajajField() {
            closeExamplesModal();
            loadArenaFromJSON(ARENA_JAAJAJ, "Jaajaj Rescue Field");
            showToast("Loaded: Jaajaj Field");
            logTerminal("Loaded arena: [Jaajaj Field]");
        }

        // Global Drag & Drop Support
        window.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith('.json') || file.name.endsWith('.mby') || file.type.includes('json')) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        loadArenaFromJSON(evt.target.result, file.name);
                    };
                    reader.readAsText(file);
                } else {
                    showToast("Please drop a valid .json or .mby arena file");
                }
            }
        });

        function loadExampleFivePointRoute() {
            closeExamplesModal();

            activeProject.id = "atom-vx-rescue-five-points";
            activeProject.name = "Five-Point Route";
            activeProject.loaded = true;
            activeProject.waypoints = FIVE_POINT_PATH;
            currentArenaData = ARENA_FIVE_POINTS;

            document.getElementById('projectNameInput').value = activeProject.name;
            document.getElementById('missionStatusBadge').textContent = "ACTIVE: FIVE-POINT ROUTE";
            document.getElementById('missionStatusBadge').className = "badge-pill blue";
            document.getElementById('arenaInfoTitle').textContent = "Five-Point Route · Rescue Arena";
            document.getElementById('arenaInfoDesc').textContent = "32-Tile Grid (2.4m × 1.2m) with 50mm Elevated Bridge (15° incline/decline), 7 Bamboo Chopstick Bumps (reflectance 0.689), and 5 precision checkpoints.";

            clearDroppedBoxes();
            build3DArenaObstacles();
            setupCanvasTilePainter();
            drawArena2D();
            renderActionSheet();
            renderGeneratedCode();
            resetSimRun();

            showToast("Loaded: Five-Point Route (atom-vx-rescue-five-points)");
            logTerminal("Loaded official mission: [Five-Point Route]");
        }

        function loadExampleQuickDropBox4Enc() {
            closeExamplesModal();

            activeProject.id = "quick-box-drop";
            activeProject.name = "Quick Drop Box 4 ENC";
            activeProject.loaded = true;
            activeProject.waypoints = QUICK_BOX_PATH;
            currentArenaData = ARENA_QUICK_BOX;

            document.getElementById('projectNameInput').value = activeProject.name;
            document.getElementById('missionStatusBadge').textContent = "ACTIVE: QUICK DROP BOX 4 ENC";
            document.getElementById('missionStatusBadge').className = "badge-pill green";
            document.getElementById('arenaInfoTitle').textContent = "Quick Drop Box 4 ENC · 120×120cm Arena";
            document.getElementById('arenaInfoDesc').textContent = "16 Quick-Box boundary decals, 4 dedicated Supply Drop Zones (BOX 1: FL, BOX 2: FR, BOX 3: B, BOX 4: F), and dynamic supply cube deployment.";

            clearDroppedBoxes();
            build3DArenaObstacles();
            drawArena2D();
            renderActionSheet();
            renderGeneratedCode();
            resetSimRun();

            showToast("Loaded: Quick Drop Box 4 ENC (quick-box-drop)");
            logTerminal("Loaded official mission: [Quick Drop Box 4 ENC]");
        }

        // ---------------------------------------------------------------------
        // TAB SWITCHING (LEFT PANEL)
        // ---------------------------------------------------------------------
        function switchLeftTab(tabId) {
            document.querySelectorAll('.panel-nav-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content-area .tab-pane').forEach(pane => pane.classList.remove('active'));

            const targetPane = document.getElementById('tab-' + tabId);
            if (targetPane) targetPane.classList.add('active');

            const tabMap = {
                'design': 'tabBtnDesign',
                'planner': 'tabBtnPlanner',
                'actionsheet': 'tabBtnActionSheet',
                'code': 'tabBtnCode'
            };

            const btnEl = document.getElementById(tabMap[tabId]);
            if (btnEl) btnEl.classList.add('active');

            if (tabId === 'design' || tabId === 'planner') {
                setTimeout(drawArena2D, 30);
            }
        }

        function switchCodeLang(lang) {
            currentCodeLang = lang;
            const btnIno = document.getElementById('btnLangIno');
            const btnSerial = document.getElementById('btnLangSerial');
            const btnPy = document.getElementById('btnLangPy');

            if (btnIno) btnIno.className = (lang === 'ino') ? "lang-btn active" : "lang-btn";
            if (btnSerial) btnSerial.className = (lang === 'serial') ? "lang-btn active" : "lang-btn";
            if (btnPy) btnPy.className = (lang === 'py') ? "lang-btn active" : "lang-btn";

            renderGeneratedCode();
        }

        // Tab switching helper supporting both naming conventions
        function switchTab(tabName) {
            if (tabName === 'actions' || tabName === 'actionsheet') {
                switchLeftTab('actionsheet');
            } else if (tabName === 'code') {
                switchLeftTab('code');
            } else {
                switchLeftTab('planner');
            }
        }
        window.switchTab = switchTab;

        function copyCurrentCode() {
            const pre = document.getElementById('codeDisplayArea');
            if (!pre) return;
            navigator.clipboard.writeText(pre.textContent).then(() => {
                showToast("Code copied to clipboard!");
            }).catch(() => {
                showToast("Failed to copy code.");
            });
        }

        function exportCurrentCode() {
            const pre = document.getElementById('codeDisplayArea');
            if (!pre) return;
            const ext = currentCodeLang === 'ino' ? 'ino' : (currentCodeLang === 'py' ? 'py' : 'txt');
            const filename = \`ptbot_mission_\${activeProject.id}.\${ext}\`;
            const blob = new Blob([pre.textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast(\`Exported \${filename}\`);
        }

        async function handleConnectSerial() {
            if ('serial' in navigator) {
                try {
                    const port = await navigator.serial.requestPort();
                    await port.open({ baudRate: 115200 });
                    showToast("Connected to PT Atom VX via WebSerial (115200 baud)!");
                    logTerminal("[SERIAL] Connected to ESP32 CP210x USB device.");
                } catch (err) {
                    console.warn(err);
                    logTerminal(\`[SERIAL] Connect error or cancelled: \${err.message}\`);
                }
            } else {
                showToast("WebSerial not supported in this browser. Running offline simulator mode.");
            }
        }

        function initThreeJsSimulator() {
            const container = document.getElementById('canvasViewport');
            if (!container) return;

            const width = container.clientWidth;
            const height = container.clientHeight;

            // Scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0f172a);
            scene.fog = new THREE.FogExp2(0x0f172a, 0.12);

            // Camera
            camera = new THREE.PerspectiveCamera(48, width / height, 0.05, 50);
            camera.position.set(1.6, 1.8, 2.2);

            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);

            // Controls
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.06;
            controls.target.set(0, 0, 0);
            controls.maxPolarAngle = Math.PI / 2 - 0.02;

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
            scene.add(ambientLight);

            const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
            sunLight.position.set(3, 6, 4);
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 2048;
            sunLight.shadow.mapSize.height = 2048;
            sunLight.shadow.camera.near = 0.5;
            sunLight.shadow.camera.far = 15;
            sunLight.shadow.bias = -0.0005;
            scene.add(sunLight);

            const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
            fillLight.position.set(-4, 3, -3);
            scene.add(fillLight);

            // Floor & Obstacles
            buildBaseFloor();
            build3DArenaObstacles();
            initTrailLine();
            loadRobotModel();

            // Resize listener
            window.addEventListener('resize', onWindowResize);

            // Animation Loop
            animateSimulation();
        }

        function buildBaseFloor() {
            // Main competition mat (2.4m x 1.2m)
            const floorGeo = new THREE.PlaneGeometry(2.4, 1.2);
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.75,
                metalness: 0.1
            });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            // Outer Arena Border Walls (PVC borders)
            const borderMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
            const bNorth = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.05, 0.02), borderMat);
            bNorth.position.set(0, 0.025, -0.61);
            scene.add(bNorth);

            const bSouth = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.05, 0.02), borderMat);
            bSouth.position.set(0, 0.025, 0.61);
            scene.add(bSouth);

            const bWest = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 1.24), borderMat);
            bWest.position.set(-1.21, 0.025, 0);
            scene.add(bWest);

            const bEast = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 1.24), borderMat);
            bEast.position.set(1.21, 0.025, 0);
            scene.add(bEast);

            // Grid tile lines (8x4 tiles = 32 tiles)
            const gridHelper = new THREE.GridHelper(2.4, 8, 0x94a3b8, 0xe2e8f0);
            gridHelper.position.y = 0.001;
            gridHelper.scale.set(1, 1, 0.5);
            scene.add(gridHelper);
        }

                function build3DArenaObstacles() {
            if (!scene) return;
            // Remove previous obstacles
            obstacleMeshes.forEach(m => scene.remove(m));
            obstacleMeshes = [];

            const arena = currentArenaData || ARENA_FIVE_POINTS;
            const cellsList = arena.cells || arena.gridData || [];

            // Standard obstacle materials
            const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
            const railMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
            const chopstickMat = new THREE.MeshStandardMaterial({ color: 0xd2a679, roughness: 0.6 });
            const seesawMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 });
            const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
            const pitMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
            const bombMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });

            cellsList.forEach((cell, idx) => {
                const type = (cell.type || '').toLowerCase();
                if (!type || type === 'empty' || type === 'blank') return;

                const c = idx % 8;
                const r = Math.floor(idx / 8);
                const x = parseFloat((-1.05 + c * 0.30).toFixed(3));
                const z = parseFloat((-0.45 + r * 0.30).toFixed(3));

                // 1. BRIDGE (50mm elevation, incline/decline ramps, safety guardrails)
                if (type === 'bridge' || type.includes('bridge')) {
                    const rampUp = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.015, 0.26), bridgeMat);
                    rampUp.position.set(x - 0.08, 0.025, z);
                    rampUp.rotation.z = Math.PI * 0.083;
                    rampUp.castShadow = true;
                    rampUp.receiveShadow = true;
                    scene.add(rampUp);
                    obstacleMeshes.push(rampUp);

                    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.26), bridgeMat);
                    deck.position.set(x, 0.05, z);
                    deck.castShadow = true;
                    deck.receiveShadow = true;
                    scene.add(deck);
                    obstacleMeshes.push(deck);

                    const rampDown = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.015, 0.26), bridgeMat);
                    rampDown.position.set(x + 0.08, 0.025, z);
                    rampDown.rotation.z = -Math.PI * 0.083;
                    rampDown.castShadow = true;
                    rampDown.receiveShadow = true;
                    scene.add(rampDown);
                    obstacleMeshes.push(rampDown);

                    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.015), railMat);
                    r1.position.set(x, 0.06, z - 0.13);
                    scene.add(r1);
                    obstacleMeshes.push(r1);

                    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.015), railMat);
                    r2.position.set(x, 0.06, z + 0.13);
                    scene.add(r2);
                    obstacleMeshes.push(r2);
                }
                // 2. SPEED BUMPS (7 bamboo rods with 0.689 reflectance)
                else if (type === 'bump' || type === 'bumps' || type.includes('bump')) {
                    for (let i = 0; i < 7; i++) {
                        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.25, 12), chopstickMat);
                        rod.rotation.x = Math.PI / 2;
                        rod.position.set(x - 0.10 + (i * 0.033), 0.005, z);
                        rod.castShadow = true;
                        scene.add(rod);
                        obstacleMeshes.push(rod);
                    }
                }
                // 3. SEESAW (Center pivot fulcrum & angled plank)
                else if (type === 'seesaw' || type.includes('seesaw')) {
                    const fulcrum = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.24, 16), railMat);
                    fulcrum.rotation.x = Math.PI / 2;
                    fulcrum.position.set(x, 0.015, z);
                    scene.add(fulcrum);
                    obstacleMeshes.push(fulcrum);

                    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, 0.22), seesawMat);
                    plank.position.set(x, 0.025, z);
                    plank.rotation.z = 0.12;
                    plank.castShadow = true;
                    scene.add(plank);
                    obstacleMeshes.push(plank);
                }
                // 4. TUNNEL (4 Corner Posts & Roof Lintel)
                else if (type === 'tunnel' || type.includes('tunnel')) {
                    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, 0.26), tunnelMat);
                    roof.position.set(x, 0.12, z);
                    scene.add(roof);
                    obstacleMeshes.push(roof);

                    [-0.12, 0.12].forEach(px => {
                        [-0.12, 0.12].forEach(pz => {
                            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 10), railMat);
                            post.position.set(x + px, 0.06, z + pz);
                            scene.add(post);
                            obstacleMeshes.push(post);
                        });
                    });
                }
                // 5. PIT / BLACKHOLE
                else if (type === 'pit' || type === 'blackhole' || type.includes('pit')) {
                    const pitHole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 32), pitMat);
                    pitHole.position.set(x, -0.028, z);
                    scene.add(pitHole);
                    obstacleMeshes.push(pitHole);

                    const rim = new THREE.Mesh(new THREE.RingGeometry(0.118, 0.138, 32), new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide }));
                    rim.rotation.x = Math.PI / 2;
                    rim.position.set(x, 0.002, z);
                    scene.add(rim);
                    obstacleMeshes.push(rim);
                }
                // 6. BOMB HAZARD
                else if (type === 'bomb' || type.includes('bomb')) {
                    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), bombMat);
                    bMesh.position.set(x, 0.04, z);
                    bMesh.castShadow = true;
                    scene.add(bMesh);
                    obstacleMeshes.push(bMesh);

                    const dangerRing = new THREE.Mesh(new THREE.RingGeometry(0.10, 0.12, 32), new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide }));
                    dangerRing.rotation.x = Math.PI / 2;
                    dangerRing.position.set(x, 0.002, z);
                    scene.add(dangerRing);
                    obstacleMeshes.push(dangerRing);
                }
                // 7. DROP ZONES
                else if (type.includes('drop')) {
                    const dzPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.18), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }));
                    dzPlate.position.set(x, 0.002, z);
                    scene.add(dzPlate);
                    obstacleMeshes.push(dzPlate);

                    const dRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.14, 32), new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }));
                    dRing.rotation.x = Math.PI / 2;
                    dRing.position.set(x, 0.003, z);
                    scene.add(dRing);
                    obstacleMeshes.push(dRing);

                    const dBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6 }));
                    dBeacon.position.set(x, 0.09, z);
                    scene.add(dBeacon);
                    obstacleMeshes.push(dBeacon);
                }
                // 8. CHECKPOINTS
                else if (type === 'checkpoint' || type.includes('checkpoint')) {
                    const cpRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
                    cpRing.rotation.x = Math.PI / 2;
                    cpRing.position.set(x, 0.002, z);
                    scene.add(cpRing);
                    obstacleMeshes.push(cpRing);

                    const cpBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.15, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 }));
                    cpBeacon.position.set(x, 0.075, z);
                    scene.add(cpBeacon);
                    obstacleMeshes.push(cpBeacon);
                }
                // 9. START
                else if (type === 'start' || type.includes('start')) {
                    const startPad = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.003, 0.20), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
                    startPad.position.set(x, 0.001, z);
                    scene.add(startPad);
                    obstacleMeshes.push(startPad);
                }
                // 10. FINISH
                else if (type === 'finish' || type.includes('finish')) {
                    const finPad = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.003, 0.20), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
                    finPad.position.set(x, 0.001, z);
                    scene.add(finPad);
                    obstacleMeshes.push(finPad);
                }
            });

            // Target rings & glowing beacons for waypoints
            if (activeProject.waypoints && activeProject.waypoints.length > 0) {
                activeProject.waypoints.forEach((pt, idx) => {
                    const ringColor = (idx === 0) ? 0x10b981 : ((idx === activeProject.waypoints.length - 1) ? 0x2563eb : 0x38bdf8);
                    const ringGeo = new THREE.RingGeometry(0.05, 0.07, 32);
                    const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.x = Math.PI / 2;
                    ring.position.set(pt.x, 0.002, pt.z);
                    scene.add(ring);
                    obstacleMeshes.push(ring);

                    const beaconGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.15, 8);
                    const beaconMat = new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.5 });
                    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
                    beacon.position.set(pt.x, 0.075, pt.z);
                    scene.add(beacon);
                    obstacleMeshes.push(beacon);
                });
            }
        }

        function spawnDroppedBox(x, z, colorHex) {
            const boxGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
            const boxMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.2, roughness: 0.3 });
            const boxMesh = new THREE.Mesh(boxGeo, boxMat);
            boxMesh.position.set(x, 0.025, z);
            boxMesh.castShadow = true;
            boxMesh.receiveShadow = true;
            scene.add(boxMesh);
            droppedBoxMeshes.push(boxMesh);
        }

        function clearDroppedBoxes() {
            droppedBoxMeshes.forEach(b => scene.remove(b));
            droppedBoxMeshes = [];
        }

        // ---------------------------------------------------------------------
        // ROBOT 3D MODEL LOADER (PT-BOT_Atom_VX.glb + PROCEDURAL FALLBACK)
        // ---------------------------------------------------------------------
        function loadRobotModel() {
            const loader = new THREE.GLTFLoader();
            loader.load(
                'assets/models/PT-BOT_Atom_VX.glb',
                (gltf) => {
                    robotMesh = gltf.scene;
                    robotMesh.scale.set(0.85, 0.85, 0.85);
                    const startP = activeProject.waypoints[0];
                    robotMesh.position.set(startP.x, 0.02, startP.z);
                    robotMesh.rotation.set(0, (startP.heading * Math.PI) / 180, 0);

                    robotMesh.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            if (child.name.toLowerCase().includes('wheel') || child.name.toLowerCase().includes('tire')) {
                                robotWheelMeshes.push(child);
                            }
                        }
                    });

                    scene.add(robotMesh);
                    logTerminal("Authentic 3D Model: PT-BOT_Atom_VX.glb loaded successfully.");
                },
                undefined,
                (error) => {
                    console.warn("Could not load GLTF, falling back to high-detail procedural 4WD chassis:", error);
                    createProceduralRobotChassis();
                }
            );
        }

        function createProceduralRobotChassis() {
            robotMesh = new THREE.Group();

            // Main Aluminum Body
            const bodyGeo = new THREE.BoxGeometry(0.18, 0.04, 0.16);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.035;
            body.castShadow = true;
            robotMesh.add(body);

            // Top PCB Board (Atom VX green board)
            const pcbGeo = new THREE.BoxGeometry(0.14, 0.005, 0.12);
            const pcbMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
            const pcb = new THREE.Mesh(pcbGeo, pcbMat);
            pcb.position.y = 0.06;
            robotMesh.add(pcb);

            // Front IR Sensor Array Plate (140mm width, +100mm offset)
            const sensorGeo = new THREE.BoxGeometry(0.04, 0.015, 0.14);
            const sensorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
            const sensorPlate = new THREE.Mesh(sensorGeo, sensorMat);
            sensorPlate.position.set(0.10, 0.02, 0);
            robotMesh.add(sensorPlate);

            // 4 Silicone Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.022, 24);
            const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

            const wheelOffsets = [
                { x: 0.06, z: 0.09 },
                { x: 0.06, z: -0.09 },
                { x: -0.06, z: 0.09 },
                { x: -0.06, z: -0.09 }
            ];

            wheelOffsets.forEach(pos => {
                const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(pos.x, 0.028, pos.z);
                wheel.castShadow = true;
                robotMesh.add(wheel);
                robotWheelMeshes.push(wheel);
            });

            const startP = activeProject.waypoints[0];
            robotMesh.position.set(startP.x, 0.02, startP.z);
            robotMesh.rotation.set(0, (startP.heading * Math.PI) / 180, 0);
            scene.add(robotMesh);
            logTerminal("Procedural High-Detail 4WD Chassis fallback active.");
        }

        // ---------------------------------------------------------------------
        // TRAIL LINE
        // ---------------------------------------------------------------------
        function initTrailLine() {
            const maxPoints = 1200;
            const positions = new Float32Array(maxPoints * 3);
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setDrawRange(0, 0);

            const material = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                linewidth: 2,
                transparent: true,
                opacity: 0.8
            });

            trailLine = new THREE.Line(geometry, material);
            scene.add(trailLine);
        }

        function addTrailPoint(pos) {
            if (!trailLine) return;
            trailPoints.push(pos.clone());
            if (trailPoints.length > 1200) trailPoints.shift();

            const positions = trailLine.geometry.attributes.position.array;
            for (let i = 0; i < trailPoints.length; i++) {
                positions[i * 3] = trailPoints[i].x;
                positions[i * 3 + 1] = trailPoints[i].y + 0.003;
                positions[i * 3 + 2] = trailPoints[i].z;
            }
            trailLine.geometry.attributes.position.needsUpdate = true;
            trailLine.geometry.setDrawRange(0, trailPoints.length);
        }

        function clearTrail() {
            trailPoints = [];
            if (trailLine) {
                trailLine.geometry.setDrawRange(0, 0);
            }
        }

        // ---------------------------------------------------------------------
        // SIMULATION EXECUTION LOOP WITH MOTOR PD & OPTICAL RAYCAST
        // ---------------------------------------------------------------------
        function toggleSimRun() {
            if (!activeProject.loaded) {
                openExamplesModal();
                return;
            }

            isSimRunning = !isSimRunning;
            const btn = document.getElementById('btnSimPlay');
            const btnText = document.getElementById('btnSimPlayText');
            const btnIcon = document.getElementById('btnSimPlayIcon');

            if (isSimRunning) {
                btn.className = "sim-btn danger";
                btnText.textContent = "Pause";
                btnIcon.className = "fas fa-pause";
                logTerminal(\`[RUN] Executing \${activeProject.name} simulation...\`);
            } else {
                btn.className = "sim-btn primary";
                btnText.textContent = "Run Sim";
                btnIcon.className = "fas fa-play";
                logTerminal("[PAUSE] Simulation paused.");
            }
        }

        function resetSimRun() {
            isSimRunning = false;
            simProgress = 0;
            document.getElementById('btnSimPlay').className = "sim-btn primary";
            document.getElementById('btnSimPlayText').textContent = "Run Sim";
            document.getElementById('btnSimPlayIcon').className = "fas fa-play";
            document.getElementById('simProgressFill').style.width = "0%";
            document.getElementById('lblSimProgressPct').textContent = "0%";

            clearDroppedBoxes();
            clearTrail();

            if (robotMesh && activeProject.waypoints.length > 0) {
                const p0 = activeProject.waypoints[0];
                robotMesh.position.set(p0.x, 0.02, p0.z);
                robotMesh.rotation.set(0, (p0.heading * Math.PI) / 180, 0);
            }

            updateTelemetryHUD(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "IDLE", 0, "Mat 0.08", "TRACKING", [3, 3, 3, 3, 3, 3, 3, 3]);
            logTerminal("[RESET] Simulation reset to start waypoint.");
        }

        function cycleSimSpeed() {
            if (simSpeed === 1) simSpeed = 2;
            else if (simSpeed === 2) simSpeed = 5;
            else simSpeed = 1;
            document.getElementById('lblSimSpeed').textContent = \`\${simSpeed}x\`;
            logTerminal(\`[SPEED] Simulator speed set to \${simSpeed}x\`);
        }

        function setCameraView(mode) {
            simCamMode = mode;
            document.getElementById('camFreeBtn').classList.toggle('active', mode === 'free');
            document.getElementById('camFollowBtn').classList.toggle('active', mode === 'follow');
            document.getElementById('camTopBtn').classList.toggle('active', mode === 'top');

            if (mode === 'top') {
                camera.position.set(0, 3.2, 0.001);
                controls.target.set(0, 0, 0);
            } else if (mode === 'free') {
                camera.position.set(1.6, 1.8, 2.2);
                controls.target.set(0, 0, 0);
            }
        }

        function animateSimulation() {
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
                    logTerminal(\`[SUCCESS] \${activeProject.name} completed successfully! (100% path covered)\`);
                }

                document.getElementById('simProgressFill').style.width = \`\${(simProgress * 100).toFixed(0)}%\`;
                document.getElementById('lblSimProgressPct').textContent = \`\${(simProgress * 100).toFixed(0)}%\`;

                const segFloat = simProgress * totalSegments;
                const segIdx = Math.min(Math.floor(segFloat), totalSegments - 1);
                const segT = segFloat - segIdx;

                const pStart = waypoints[segIdx];
                const pEnd = waypoints[segIdx + 1];

                // 1. Position interpolation
                const posX = THREE.MathUtils.lerp(pStart.x, pEnd.x, segT);
                const posZ = THREE.MathUtils.lerp(pStart.z, pEnd.z, segT);

                // 2. Physics & Elevation Model (Elevated Bridge & Chopsticks)
                let posY = 0.02;
                let pitchAngle = 0;
                let rollAngle = 0;
                let reflectance = 0.08;
                let surfaceStatus = "TRACKING";

                if (activeProject.id === "atom-vx-rescue-five-points") {
                    // Bridge Traversal (X between -0.4 and 0.3)
                    if (posX >= -0.4 && posX <= 0.3 && posZ >= 0.05 && posZ <= 0.25) {
                        if (posX < -0.15) {
                            // Incline 15 deg
                            pitchAngle = 0.262; // 15 deg climb
                            posY = 0.02 + ((posX - (-0.4)) / 0.25) * 0.05;
                            surfaceStatus = "BRIDGE CLIMB (15°)";
                        } else if (posX > 0.05) {
                            // Decline 15 deg
                            pitchAngle = -0.262; // -15 deg descent
                            posY = 0.07 - ((posX - 0.05) / 0.25) * 0.05;
                            surfaceStatus = "BRIDGE DESCENT (-15°)";
                        } else {
                            // Bridge Deck Platform (+50mm)
                            posY = 0.07;
                            pitchAngle = 0;
                            surfaceStatus = "BRIDGE DECK (+50mm)";
                        }
                    }

                    // Chopstick Speed Bumps (X between 0.65 and 0.90)
                    if (posX >= 0.65 && posX <= 0.90 && posZ >= 0.05 && posZ <= 0.25) {
                        // High-frequency pitch oscillation and vertical bounce
                        const freq = Math.sin((posX - 0.65) * 120);
                        posY = 0.02 + Math.abs(freq) * 0.005;
                        pitchAngle = freq * 0.08;
                        reflectance = 0.689; // Authentic reverse-engineered bamboo reflectance!
                        surfaceStatus = "CROSSING BUMP (Bamboo 0.689)";
                    }
                } else {
                    // Quick Drop Box 4 ENC Drop Trigger
                    if (pStart.drop && segT > 0.3 && droppedBoxMeshes.length < (segIdx)) {
                        const boxColors = { 'BOX1': 0xef4444, 'BOX2': 0x3b82f6, 'BOX3': 0xf59e0b, 'BOX4': 0x10b981 };
                        spawnDroppedBox(pStart.x, pStart.z, boxColors[pStart.drop] || 0x10b981);
                        logTerminal(\`[PAYLOAD] \${pStart.drop} deployed successfully at (\${pStart.x}, \${pStart.z})\`);
                    }
                }

                robotMesh.position.set(posX, posY, posZ);

                // 3. Heading-Lock PD Control
                const targetYawDeg = pEnd.heading;
                let currentYawDeg = Math.round((robotMesh.rotation.y * 180) / Math.PI);
                let headingError = targetYawDeg - currentYawDeg;
                while (headingError > 180) headingError -= 360;
                while (headingError < -180) headingError += 360;

                const deriv = headingError - headingSimState.prevError;
                headingSimState.filtDeriv = 0.70 * headingSimState.filtDeriv + 0.30 * deriv;
                headingSimState.prevError = headingError;
                const pdCorrection = THREE.MathUtils.clamp((headingError * headingSimState.kp) + (headingSimState.filtDeriv * headingSimState.kd), -60, 60);

                const targetYawRad = (targetYawDeg * Math.PI) / 180;
                robotMesh.rotation.y = THREE.MathUtils.lerp(robotMesh.rotation.y, targetYawRad, 0.08);
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

                // 5. 8-Channel Optical Line Sensor Model & Centroid
                // Distance to central corridor line
                let distToLine = Math.abs(posZ - (pStart.z));
                if (distToLine < 0.02) {
                    reflectance = Math.max(reflectance, 0.92);
                    if (surfaceStatus === "TRACKING") surfaceStatus = "ON LINE (0.92)";
                }

                // Generate 8-channel simulated ADC readings
                let sensorReadings = [];
                let weights = [-42, -30, -18, -6, 6, 18, 30, 42];
                let weightedSum = 0;
                let sumVal = 0;

                for (let i = 0; i < 8; i++) {
                    let sensorOffsetMm = weights[i];
                    let lateralDistM = Math.abs(sensorOffsetMm / 1000 - distToLine);
                    let chRefl = reflectance;
                    if (lateralDistM > 0.025 && reflectance > 0.6) {
                        chRefl = 0.08; // Sensor fell off line/bump
                    }
                    let adcRaw = Math.round(chRefl * 1023);
                    let calPct = THREE.MathUtils.clamp(Math.round(((adcRaw - 120) / (920 - 120)) * 100), 3, 98);
                    sensorReadings.push(calPct);
                    if (calPct > 25) {
                        weightedSum += sensorOffsetMm * calPct;
                        sumVal += calPct;
                    }
                }

                let centroidMm = sumVal > 0 ? (weightedSum / sumVal).toFixed(1) : "0.0";

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
                    \`Refl \${reflectance.toFixed(3)}\`,
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

        function updateTelemetryHUD(yaw, pitch, roll, spd, x, z, elev, m1, m2, m3, m4, tgtYaw, phase, pd, reflText, surfStatus, sensorVals, centroidMm) {
            document.getElementById('hudYaw').textContent = \`\${yaw}°\`;
            document.getElementById('hudPitchRoll').textContent = \`\${pitch}° / \${roll}°\`;
            document.getElementById('hudSpeed').textContent = \`\${spd} cm/s\`;
            document.getElementById('hudPos').textContent = \`\${x}, \${z}\`;
            document.getElementById('hudElevation').textContent = \`\${elev} mm\`;

            document.getElementById('hudHeadingError').textContent = \`Tgt \${tgtYaw}° | Err \${(tgtYaw - yaw).toFixed(1)}°\`;
            document.getElementById('hudPDOutput').textContent = \`dFilt \${headingSimState.filtDeriv.toFixed(2)} | PD \${pd >= 0 ? '+' : ''}\${pd}\`;
            document.getElementById('hudMotionPhase').textContent = phase;

            document.getElementById('m1Val').textContent = \`\${m1}%\`;
            document.getElementById('m1Bar').style.width = \`\${Math.abs(m1)}%\`;
            document.getElementById('m2Val').textContent = \`\${m2}%\`;
            document.getElementById('m2Bar').style.width = \`\${Math.abs(m2)}%\`;
            document.getElementById('m3Val').textContent = \`\${m3}%\`;
            document.getElementById('m3Bar').style.width = \`\${Math.abs(m3)}%\`;
            document.getElementById('m4Val').textContent = \`\${m4}%\`;
            document.getElementById('m4Bar').style.width = \`\${Math.abs(m4)}%\`;

            document.getElementById('hudReflectanceIdx').textContent = reflText;
            document.getElementById('hudSurfaceStatus').textContent = surfStatus;
            document.getElementById('hudCentroid').textContent = \`\${centroidMm} mm\`;

            if (sensorVals && sensorVals.length === 8) {
                for (let i = 0; i < 8; i++) {
                    const el = document.getElementById(\`sbar\${i}\`);
                    if (el) {
                        el.style.height = \`\${sensorVals[i]}%\`;
                        el.style.background = sensorVals[i] > 60 ? '#10b981' : (sensorVals[i] > 25 ? '#f59e0b' : '#334155');
                    }
                }
            }
        }

        function onWindowResize() {
            const container = document.getElementById('canvasViewport');
            if (!container || !renderer || !camera) return;
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }

        // ---------------------------------------------------------------------
        // TERMINAL & TOAST UTILITIES
        // ---------------------------------------------------------------------
        function logTerminal(msg) {
            const term = document.getElementById('terminalLogs');
            if (!term) return;
            const div = document.createElement('div');
            const timeStr = new Date().toTimeString().split(' ')[0];
            div.textContent = \`[\${timeStr}] \${msg}\`;
            term.appendChild(div);
            term.scrollTop = term.scrollHeight;
        }

        function clearTerminalLogs() {
            const term = document.getElementById('terminalLogs');
            if (term) term.innerHTML = '';
        }

        function showToast(msg) {
            const toast = document.getElementById('toastBanner');
            const toastMsg = document.getElementById('toastMessage');
            if (!toast || !toastMsg) return;
            toastMsg.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3200);
        }

        function copyCurrentCode() {
            const pre = document.getElementById('codeDisplayArea');
            if (pre) {
                navigator.clipboard.writeText(pre.textContent).then(() => {
                    showToast("Code copied to clipboard!");
                });
            }
        }

        function exportArduinoIno() {
            renderGeneratedCode();
            const pre = document.getElementById('codeDisplayArea');
            const blob = new Blob([pre.textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`\${activeProject.id}.ino\`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(\`Exported \${activeProject.id}.ino\`);
        }

        function exportMicroPythonPy() {
            switchCodeLang('py');
            const pre = document.getElementById('codeDisplayArea');
            const blob = new Blob([pre.textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`\${activeProject.id}.py\`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(\`Exported \${activeProject.id}.py\`);
        }

        async function handleConnectSerial() {
            if ('serial' in navigator) {
                try {
                    const port = await navigator.serial.requestPort();
                    await port.open({ baudRate: 115200 });
                    showToast("Connected to PT Atom VX via WebSerial (115200 baud)!");
                    logTerminal("[SERIAL] Connected to ESP32 CP210x USB device.");
                } catch (err) {
                    console.warn(err);
                    logTerminal(\`[SERIAL] Connect error or cancelled: \${err.message}\`);
                }
            } else {
                showToast("WebSerial not supported in this browser. Running offline simulator mode.");
            }
        }

        function handleUploadFirmware() {
            showToast("Simulating firmware flash to PT Atom VX (921,600 baud)...");
            logTerminal("[FLASH] Connecting to ESP32 bootloader...");
            setTimeout(() => {
                logTerminal("[FLASH] Erasing flash partition 0x10000...");
            }, 500);
            setTimeout(() => {
                logTerminal("[FLASH] Flashing MissionRunner.bin (100% complete)");
                logTerminal("[FLASH] Hardware rebooting. Mission armed.");
                showToast("Upload complete! Robot ready.");
            }, 1200);
        }
    </script>
</body>
</html>
`;

// Write to files
const targets = [
    path.join(ROOT_DIR, 'apps', 'web', 'index.html'),
    path.join(ROOT_DIR, 'apps', 'web', 'tactical_planner.html'),
    path.join(ROOT_DIR, 'apps', 'web', 'web.html')
];

targets.forEach(tgt => {
    fs.writeFileSync(tgt, htmlContent, 'utf8');
    console.log('Successfully written:', tgt);
});

console.log('All files built successfully!');
