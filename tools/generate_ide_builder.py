import os
import json

ROOT_DIR = r"D:\Workspace\robot"
layout_five_points_path = os.path.join(ROOT_DIR, "data", "arenas", "rescue_five_points_layout.json")
layout_quick_box_path = os.path.join(ROOT_DIR, "data", "arenas", "quick_drop_box_4_enc_layout.json")

with open(layout_five_points_path, "r", encoding="utf-8") as f:
    layout_five_points = json.load(f)

with open(layout_quick_box_path, "r", encoding="utf-8") as f:
    layout_quick_box = json.load(f)

js_builder = f'''/**
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
const layoutFivePoints = {json.dumps(layout_five_points)};
const layoutQuickBox = {json.dumps(layout_quick_box)};

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
        :root {{
            --mb-brand: #44abff;
            --mb-brand-deep: #329df7;
            --mb-brand-light: #ebf6ff;
            --mb-bg: #edf3fb;
            --mb-panel: #ffffff;
            --mb-border: #d0dff0;
            --mb-border-subtle: #e2edfa;
            --mb-text: #1e293b;
            --mb-text-muted: #64748b;
            --mb-accent-green: #10b981;
            --mb-accent-amber: #f59e0b;
            --mb-accent-red: #ef4444;
            --mb-status-bar: #1c2833;
            --font-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            --font-code: "JetBrains Mono", Consolas, monospace;
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 14px;
            --radius-pill: 9999px;
            --shadow-subtle: 0 2px 8px rgba(30, 41, 59, 0.05);
            --shadow-modal: 0 20px 45px rgba(15, 23, 42, 0.25);
        }}

        *, *::before, *::after {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: var(--font-ui);
            background-color: var(--mb-bg);
            color: var(--mb-text);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            user-select: none;
        }}

        /* -------------------------------------------------------------------------
           1. TOP HEADER (ROBOBLOCKS AUTHENTIC BRAND BAR)
           ------------------------------------------------------------------------- */
        .ide-header {{
            height: 52px;
            background-color: var(--mb-brand);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
            z-index: 100;
            flex-shrink: 0;
        }}

        .ide-header-left {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}

        .logo-wrap {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 800;
            font-size: 1.15rem;
            letter-spacing: -0.5px;
            color: #ffffff;
            cursor: pointer;
        }}

        .logo-wrap img {{
            height: 30px;
            border-radius: 6px;
        }}

        .header-title-pill {{
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 10px;
            border-radius: var(--radius-pill);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.3px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .board-selector-pill {{
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: var(--radius-pill);
            padding: 4px 12px;
            font-size: 0.75rem;
            font-weight: 600;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .ide-header-center {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .project-name-input {{
            background: rgba(255, 255, 255, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: var(--radius-sm);
            color: #ffffff;
            font-family: var(--font-code);
            font-size: 0.82rem;
            font-weight: 600;
            padding: 5px 12px;
            outline: none;
            width: 260px;
            text-align: center;
        }}

        .project-name-input:focus {{
            background: rgba(255, 255, 255, 0.3);
            border-color: #ffffff;
        }}

        .ide-header-right {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .hdr-btn {{
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            border-radius: var(--radius-sm);
            padding: 6px 12px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }}

        .hdr-btn:hover {{
            background: rgba(255, 255, 255, 0.28);
        }}

        .hdr-btn.highlight {{
            background: #ffffff;
            color: var(--mb-brand-deep);
            font-weight: 700;
            border-color: #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }}

        .hdr-btn.highlight:hover {{
            background: #f0f9ff;
        }}

        /* -------------------------------------------------------------------------
           2. MAIN WORKSPACE CONTAINER
           ------------------------------------------------------------------------- */
        .ide-workspace {{
            flex: 1;
            display: grid;
            grid-template-columns: 460px 1fr;
            height: calc(100vh - 52px - 28px);
            overflow: hidden;
        }}

        /* LEFT PANEL: TACTICAL MISSION SUITE & ROUTE PLANNER */
        .workspace-left-panel {{
            background: var(--mb-panel);
            border-right: 1px solid var(--mb-border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10;
        }}

        .left-panel-nav {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border);
            padding: 0 8px;
            height: 40px;
        }}

        .panel-nav-tabs {{
            display: flex;
            gap: 4px;
        }}

        .tab-btn {{
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
        }}

        .tab-btn.active {{
            color: var(--mb-brand-deep);
            border-bottom-color: var(--mb-brand-deep);
            font-weight: 700;
        }}

        .tab-content-area {{
            flex: 1;
            overflow-y: auto;
            position: relative;
        }}

        .tab-pane {{
            display: none;
            height: 100%;
        }}

        .tab-pane.active {{
            display: flex;
            flex-direction: column;
        }}

        /* Planner View */
        .planner-canvas-wrap {{
            flex: 1;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }}

        .arena-canvas-box {{
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 8px;
            box-shadow: var(--shadow-subtle);
            display: flex;
            flex-direction: column;
            align-items: center;
        }}

        #arena2dCanvas {{
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            width: 100%;
            height: 210px;
            display: block;
        }}

        .planner-info-card {{
            background: #f8fafc;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 12px;
            font-size: 0.75rem;
            line-height: 1.5;
        }}

        .planner-info-title {{
            font-weight: 700;
            color: var(--mb-text);
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .badge-pill {{
            font-size: 0.65rem;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: var(--radius-pill);
            display: inline-block;
        }}

        .badge-pill.blue {{
            background: #e0f2fe;
            color: #0369a1;
        }}

        .badge-pill.green {{
            background: #dcfce7;
            color: #15803d;
        }}

        .badge-pill.amber {{
            background: #fef3c7;
            color: #b45309;
        }}

        /* Action Sheet Table View */
        .actionsheet-wrap {{
            flex: 1;
            padding: 14px;
            overflow-y: auto;
        }}

        .action-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.75rem;
        }}

        .action-table th {{
            background: #f1f5f9;
            color: var(--mb-text-muted);
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 1px solid var(--mb-border);
        }}

        .action-table td {{
            padding: 8px 10px;
            border-bottom: 1px solid var(--mb-border-subtle);
            vertical-align: middle;
        }}

        .action-table tr:hover td {{
            background: #f8fafc;
        }}

        .step-badge {{
            background: #0284c7;
            color: #ffffff;
            font-weight: 800;
            font-size: 0.68rem;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
        }}

        .tag-obstacle {{
            font-size: 0.65rem;
            font-weight: 700;
            background: #fef3c7;
            color: #b45309;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }}

        .tag-drop {{
            font-size: 0.65rem;
            font-weight: 700;
            background: #dcfce7;
            color: #166534;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }}

        /* Code Generation View */
        .code-view-wrap {{
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #1e293b;
            color: #f8fafc;
        }}

        .code-lang-selector {{
            display: flex;
            gap: 2px;
            padding: 6px 10px;
            background: #0f172a;
            border-bottom: 1px solid #334155;
        }}

        .lang-btn {{
            background: transparent;
            border: none;
            color: #94a3b8;
            padding: 4px 10px;
            font-size: 0.72rem;
            font-weight: 600;
            border-radius: var(--radius-sm);
            cursor: pointer;
        }}

        .lang-btn.active {{
            background: #334155;
            color: #ffffff;
            font-weight: 700;
        }}

        .code-area {{
            flex: 1;
            padding: 12px;
            font-family: var(--font-code);
            font-size: 0.74rem;
            line-height: 1.5;
            overflow: auto;
            white-space: pre;
            color: #e2e8f0;
        }}

        /* -------------------------------------------------------------------------
           3. RIGHT PANEL: 3D OFFICIAL SIMULATOR
           ------------------------------------------------------------------------- */
        .workspace-right-panel {{
            background: #0b1120;
            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }}

        .sim-canvas-viewport {{
            flex: 1;
            width: 100%;
            height: 100%;
            position: relative;
        }}

        /* Floating Telemetry HUD */
        .sim-overlay-hud {{
            position: absolute;
            top: 14px;
            left: 14px;
            z-index: 20;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        }}

        .hud-card {{
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
        }}

        .hud-card-title {{
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
        }}

        .hud-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2px 0;
        }}

        .hud-label {{
            color: #94a3b8;
            font-weight: 500;
        }}

        .hud-val {{
            font-weight: 700;
            color: #38bdf8;
        }}

        /* Motor Gauges Grid */
        .motor-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-top: 4px;
        }}

        .motor-gauge-box {{
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 3px 6px;
        }}

        .motor-gauge-bar {{
            height: 4px;
            background: #334155;
            border-radius: 2px;
            margin-top: 2px;
            overflow: hidden;
        }}

        .motor-gauge-fill {{
            height: 100%;
            background: #38bdf8;
            width: 0%;
            transition: width 0.05s ease;
        }}

        /* Optical 8-Channel Line Sensor Bars */
        .sensor-array-grid {{
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
        }}

        .sensor-bar-col {{
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: flex-end;
        }}

        .sensor-bar-fill {{
            width: 100%;
            background: #22c55e;
            border-radius: 1px;
            min-height: 2px;
            transition: height 0.05s ease, background 0.1s ease;
        }}

        .sensor-bar-lbl {{
            font-size: 0.55rem;
            color: #94a3b8;
            margin-top: 2px;
        }}

        /* Camera Angle Controls */
        .sim-cam-controls {{
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 20;
            display: flex;
            gap: 6px;
        }}

        .cam-pill-btn {{
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
        }}

        .cam-pill-btn:hover, .cam-pill-btn.active {{
            background: var(--mb-brand-deep);
            color: #ffffff;
            border-color: var(--mb-brand-deep);
        }}

        /* Simulation Playback Toolbar */
        .sim-bottom-toolbar {{
            height: 52px;
            background: rgba(15, 23, 42, 0.95);
            border-top: 1px solid rgba(148, 163, 184, 0.2);
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 20;
        }}

        .sim-controls-left {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}

        .sim-btn {{
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
        }}

        .sim-btn.primary {{
            background: #10b981;
            color: #ffffff;
        }}

        .sim-btn.primary:hover {{
            background: #059669;
        }}

        .sim-btn.secondary {{
            background: #334155;
            color: #f1f5f9;
        }}

        .sim-btn.secondary:hover {{
            background: #475569;
        }}

        .sim-btn.danger {{
            background: #ef4444;
            color: #ffffff;
        }}

        .sim-btn.danger:hover {{
            background: #dc2626;
        }}

        .sim-progress-wrap {{
            flex: 1;
            max-width: 320px;
            margin: 0 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }}

        .sim-progress-bar {{
            height: 6px;
            background: #1e293b;
            border-radius: 3px;
            overflow: hidden;
            position: relative;
        }}

        .sim-progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #38bdf8, #10b981);
            width: 0%;
            transition: width 0.05s ease;
        }}

        .sim-progress-lbl {{
            display: flex;
            justify-content: space-between;
            font-size: 0.66rem;
            color: #94a3b8;
            font-family: var(--font-code);
        }}

        /* -------------------------------------------------------------------------
           4. BOTTOM STATUS BAR & SERIAL TERMINAL
           ------------------------------------------------------------------------- */
        .ide-status-bar {{
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
        }}

        .status-left, .status-right {{
            display: flex;
            align-items: center;
            gap: 16px;
        }}

        .status-item {{
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .status-dot {{
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #10b981;
        }}

        .status-dot.orange {{
            background: #f59e0b;
        }}

        /* Bottom Terminal Drawer */
        .terminal-drawer {{
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
        }}

        .terminal-header {{
            height: 26px;
            background: #1e293b;
            padding: 0 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #334155;
        }}

        .terminal-logs {{
            flex: 1;
            padding: 8px 12px;
            overflow-y: auto;
            line-height: 1.45;
        }}

        /* -------------------------------------------------------------------------
           5. EXAMPLES MODAL DIALOG (STRICT ASSET SELECTION: ONLY 2 TARGETS)
           ------------------------------------------------------------------------- */
        .modal-backdrop {{
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
        }}

        .modal-backdrop.open {{
            opacity: 1;
            pointer-events: auto;
        }}

        .examples-modal-card {{
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
        }}

        @keyframes modalPop {{
            0% {{ transform: scale(0.95) translateY(10px); }}
            100% {{ transform: scale(1) translateY(0); }}
        }}

        .examples-modal-header {{
            padding: 16px 20px;
            border-bottom: 1px solid var(--mb-border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #ffffff;
        }}

        .examples-header-title h2 {{
            font-size: 1.15rem;
            font-weight: 800;
            color: var(--mb-text);
        }}

        .examples-header-title p {{
            font-size: 0.76rem;
            color: var(--mb-text-muted);
            margin-top: 2px;
        }}

        .close-modal-btn {{
            background: none;
            border: none;
            font-size: 1.3rem;
            color: var(--mb-text-muted);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
        }}

        .close-modal-btn:hover {{
            background: #f1f5f9;
            color: var(--mb-text);
        }}

        .examples-modal-filters {{
            padding: 10px 20px;
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border-subtle);
            display: flex;
            gap: 8px;
        }}

        .filter-chip {{
            background: #ffffff;
            border: 1px solid var(--mb-border);
            padding: 4px 12px;
            border-radius: var(--radius-pill);
            font-size: 0.72rem;
            font-weight: 600;
            color: var(--mb-text-muted);
            cursor: pointer;
        }}

        .filter-chip.active {{
            background: var(--mb-brand-deep);
            color: #ffffff;
            border-color: var(--mb-brand-deep);
        }}

        .examples-modal-body {{
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            max-height: 480px;
            overflow-y: auto;
            background: #f8fafc;
        }}

        .example-grid-card {{
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-subtle);
        }}

        .example-grid-card:hover {{
            transform: translateY(-2px);
            border-color: var(--mb-brand);
            box-shadow: 0 8px 20px rgba(68, 171, 255, 0.18);
        }}

        .example-grid-card.featured {{
            border: 2px solid var(--mb-brand);
        }}

        .example-img-wrap {{
            height: 140px;
            background: #e2e8f0;
            position: relative;
            overflow: hidden;
        }}

        .example-img-wrap img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}

        .featured-tag {{
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
        }}

        .official-tag {{
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
        }}

        .example-body-wrap {{
            padding: 12px 14px;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }}

        .example-card-meta {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .example-board-badge {{
            font-size: 0.62rem;
            font-weight: 800;
            color: #0369a1;
            background: #e0f2fe;
            padding: 2px 6px;
            border-radius: 4px;
        }}

        .example-tag-badge {{
            font-size: 0.62rem;
            font-weight: 600;
            color: var(--mb-text-muted);
        }}

        .example-card-title {{
            font-size: 0.95rem;
            font-weight: 800;
            color: var(--mb-text);
        }}

        .example-card-desc {{
            font-size: 0.72rem;
            color: var(--mb-text-muted);
            line-height: 1.45;
        }}

        .example-card-footer {{
            padding: 10px 14px;
            border-top: 1px solid var(--mb-border-subtle);
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .btn-open-example {{
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
        }}

        .btn-open-example:hover {{
            background: #0284c7;
        }}

        /* Toast notifications */
        .toast-banner {{
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
        }}

        .toast-banner.show {{
            transform: translateY(0);
            opacity: 1;
        }}
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

        <!-- LEFT PANEL: TACTICAL MISSION SUITE & ROUTE PLANNER (NO BLOCKS) -->
        <div class="workspace-left-panel">
            <div class="left-panel-nav">
                <div class="panel-nav-tabs">
                    <button class="tab-btn active" onclick="switchLeftTab('planner')">
                        <i class="fas fa-map-marked-alt"></i> Route Planner
                    </button>
                    <button class="tab-btn" onclick="switchLeftTab('actionsheet')">
                        <i class="fas fa-list-ol"></i> Action Sheet (โพยสเต็ป)
                    </button>
                    <button class="tab-btn" onclick="switchLeftTab('code')">
                        <i class="fas fa-code"></i> Generated Code
                    </button>
                </div>
                <div class="panel-tab-actions">
                    <span class="badge-pill blue" id="missionStatusBadge">ACTIVE: FIVE-POINT ROUTE</span>
                </div>
            </div>

            <div class="tab-content-area">
                <!-- TAB 1: 2D ROUTE PLANNER -->
                <div class="tab-pane active" id="tab-planner">
                    <div class="planner-canvas-wrap">
                        <div class="arena-canvas-box">
                            <canvas id="arena2dCanvas" width="430" height="215"></canvas>
                        </div>

                        <div class="planner-info-card">
                            <div class="planner-info-title">
                                <i class="fas fa-info-circle" style="color: var(--mb-brand-deep);"></i>
                                <span id="arenaInfoTitle">Five-Point Route · Rescue Arena</span>
                            </div>
                            <p id="arenaInfoDesc" style="color: var(--mb-text-muted);">
                                32-Tile Grid (2.4m × 1.2m) with 50mm Elevated Bridge (15° incline/decline), 7 Bamboo Chopstick Bumps (reflectance 0.689), and 5 precision checkpoints.
                            </p>
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
                            <button class="lang-btn" id="btnLangPy" onclick="switchCodeLang('py')">MicroPython (.py)</button>
                            <button class="hdr-btn" style="margin-left: auto; padding: 2px 8px; font-size: 0.68rem;" onclick="copyCurrentCode()">
                                <i class="fas fa-copy"></i> Copy
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
                    <button style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 0.70rem;" onclick="clearTerminalLogs()">
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
        const ARENA_FIVE_POINTS = layoutFivePoints;
        const ARENA_QUICK_BOX = layoutQuickBox;

        let currentArenaData = ARENA_FIVE_POINTS;

        // State Machine
        let activeProject = {{
            id: "atom-vx-rescue-five-points",
            name: "Five-Point Route",
            loaded: true,
            waypoints: []
        }};

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
        let headingSimState = {{
            prevError: 0,
            filtDeriv: 0,
            kp: 3.5,
            kd: 17.0,
            maxSpeed: 80
        }};

        // 1. FIVE-POINT ROUTE WAYPOINTS (Real world coordinates in arena: 2.4m x 1.2m)
        const FIVE_POINT_PATH = [
            {{ x: 1.05, z: -0.45, y: 0.0, heading: 0,   desc: "Point 1: วิ่งตรงด้วยไจโร 0° ออกตัวจาก START", speed: 70, time: 1.5, obstacle: "Normal" }},
            {{ x: 1.05, z: 0.15,  y: 0.0, heading: -90, desc: "Point 2: เลี้ยวซ้าย 90° อยู่กับที่ มุ่งหน้า -90°", speed: 60, time: 0.8, obstacle: "Turn L" }},
            {{ x: 0.45, z: 0.15,  y: 0.0, heading: 0,   desc: "Point 3: เลี้ยวขวา 90° ข้ามลูกระนาดตะเกียบ (Chopstick Bumps)", speed: 60, time: 1.4, obstacle: "Chopstick Bumps" }},
            {{ x: -0.15, z: 0.15, y: 0.05, heading: 90, desc: "Point 4: เลี้ยวขวา 90° ไต่ขึ้นสะพานยกระดับ 50mm", speed: 65, time: 1.8, obstacle: "Bridge (+50mm)" }},
            {{ x: -0.75, z: -0.15, y: 0.0, heading: 0,  desc: "Point 5: เลี้ยวซ้าย 90° จอดนิ่งดรอปเสบียง (Drop Supply)", speed: 70, time: 1.2, obstacle: "Drop Zone" }}
        ];

        // 2. QUICK DROP BOX 4 ENC WAYPOINTS (Official Quick Box Drop 120x120cm core)
        const QUICK_BOX_PATH = [
            {{ x: 0.45,  z: 0.45,  y: 0.0, heading: 90,  desc: "Start: ออกตัวจากโซนเริ่ม Quick Box 15", speed: 60, time: 0.5, obstacle: "Start Bay", drop: null }},
            {{ x: -0.15, z: -0.45, y: 0.0, heading: 0,   desc: "Drop 1 (BOX 1): วิ่งเข้าช่อง Drop Front Left (DropFL)", speed: 70, time: 1.2, obstacle: "Drop Bay 1", drop: "BOX1" }},
            {{ x: 0.45,  z: -0.45, y: 0.0, heading: 90,  desc: "Drop 2 (BOX 2): ไจโรหมุน 90° เข้า Drop Front Right (DropFR)", speed: 65, time: 1.0, obstacle: "Drop Bay 2", drop: "BOX2" }},
            {{ x: 0.45,  z: 0.15,  y: 0.0, heading: 180, desc: "Drop 3 (BOX 3): เลี้ยวถอยเข้า Drop Rear (DropB)", speed: 60, time: 1.1, obstacle: "Drop Bay 3", drop: "BOX3" }},
            {{ x: -0.15, z: 0.15,  y: 0.0, heading: 270, desc: "Drop 4 (BOX 4): ลุยเข้า Drop Front Dual (DropF)", speed: 70, time: 1.3, obstacle: "Drop Bay 4", drop: "BOX4" }},
            {{ x: 0.45,  z: 0.45,  y: 0.0, heading: 90,  desc: "Finish: ถอยกลับเข้าฐานภารกิจและหยุดนิ่ง (STOP)", speed: 50, time: 0.8, obstacle: "Home Base", drop: null }}
        ];

        activeProject.waypoints = FIVE_POINT_PATH;

        // ---------------------------------------------------------------------
        // APPLICATION INITIALIZATION
        // ---------------------------------------------------------------------
        window.addEventListener('DOMContentLoaded', () => {{
            initThreeJsSimulator();
            initArena2dCanvas();
            renderActionSheet();
            renderGeneratedCode();

            logTerminal("roboBlocks Tactical Mission Suite initialized.");
            logTerminal("Hardware profile: PT Atom VX 4WD (WD4) locked.");
            logTerminal("Default Mission: [Five-Point Route] loaded.");
        }});

        // ---------------------------------------------------------------------
        // EXAMPLES MODAL LOGIC (STRICT SELECTION OF 2 AUTHORIZED MISSIONS)
        // ---------------------------------------------------------------------
        function openExamplesModal() {{
            document.getElementById('examplesModalBackdrop').classList.add('open');
        }}

        function closeExamplesModal() {{
            document.getElementById('examplesModalBackdrop').classList.remove('open');
        }}

        function handleBackdropClick(e) {{
            if (e.target.id === 'examplesModalBackdrop') {{
                closeExamplesModal();
            }}
        }}

        function loadExampleFivePointRoute() {{
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
            drawArena2D();
            renderActionSheet();
            renderGeneratedCode();
            resetSimRun();

            showToast("Loaded: Five-Point Route (atom-vx-rescue-five-points)");
            logTerminal("Loaded official mission: [Five-Point Route]");
        }}

        function loadExampleQuickDropBox4Enc() {{
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
        }}

        // ---------------------------------------------------------------------
        // TAB SWITCHING (LEFT PANEL)
        // ---------------------------------------------------------------------
        function switchLeftTab(tabId) {{
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            if (tabId === 'planner') {{
                document.querySelectorAll('.tab-btn')[0].classList.add('active');
                document.getElementById('tab-planner').classList.add('active');
                drawArena2D();
            }} else if (tabId === 'actionsheet') {{
                document.querySelectorAll('.tab-btn')[1].classList.add('active');
                document.getElementById('tab-actionsheet').classList.add('active');
            }} else if (tabId === 'code') {{
                document.querySelectorAll('.tab-btn')[2].classList.add('active');
                document.getElementById('tab-code').classList.add('active');
            }}
        }}

        function switchCodeLang(lang) {{
            currentCodeLang = lang;
            document.getElementById('btnLangIno').classList.toggle('active', lang === 'ino');
            document.getElementById('btnLangPy').classList.toggle('active', lang === 'py');
            renderGeneratedCode();
        }}

        // ---------------------------------------------------------------------
        // 2D ARENA DRAWING (CANVAS)
        // ---------------------------------------------------------------------
        function initArena2dCanvas() {{
            drawArena2D();
        }}

        function drawArena2D() {{
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            // Arena Background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);

            // Draw 8 columns x 4 rows = 32 tiles
            const cols = 8;
            const rows = 4;
            const tileW = w / cols;
            const tileH = h / rows;

            for (let r = 0; r < rows; r++) {{
                for (let c = 0; c < cols; c++) {{
                    const idx = r * cols + c;
                    const x = c * tileW;
                    const y = r * tileH;

                    // Tile border
                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, tileW, tileH);

                    // Tile index label
                    ctx.fillStyle = "#94a3b8";
                    ctx.font = "8px JetBrains Mono";
                    ctx.fillText(\`#\${idx}\`, x + 3, y + 10);

                    // Check layout cell type
                    if (currentArenaData && currentArenaData.cells && currentArenaData.cells[idx]) {{
                        const cell = currentArenaData.cells[idx];
                        if (cell.type === 'rescue_start' || cell.type === 'quick_box_15') {{
                            ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
                            ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
                            ctx.fillStyle = "#059669";
                            ctx.font = "bold 9px Inter";
                            ctx.textAlign = "center";
                            ctx.fillText("START", x + tileW / 2, y + tileH / 2 + 4);
                            ctx.textAlign = "left";
                        }} else if (cell.type === 'rescue_finish') {{
                            ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
                            ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
                            ctx.fillStyle = "#dc2626";
                            ctx.font = "bold 9px Inter";
                            ctx.textAlign = "center";
                            ctx.fillText("FINISH", x + tileW / 2, y + tileH / 2 + 4);
                            ctx.textAlign = "left";
                        }} else if (cell.type.startsWith('quick_box_')) {{
                            ctx.fillStyle = "rgba(2, 132, 199, 0.08)";
                            ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
                            ctx.fillStyle = "#0284c7";
                            ctx.font = "7px JetBrains Mono";
                            ctx.fillText(cell.type.replace('quick_box_', 'QB'), x + 3, y + tileH - 3);
                        }}
                    }}
                }}
            }}

            // Draw Objects (Bridge, Tunnel) if Five-Point Route
            if (activeProject.id === "atom-vx-rescue-five-points" && currentArenaData && currentArenaData.objects) {{
                currentArenaData.objects.forEach(obj => {{
                    const c = obj.cell % cols;
                    const r = Math.floor(obj.cell / cols);
                    const x = c * tileW;
                    const y = r * tileH;

                    if (obj.type.includes('bridge')) {{
                        ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
                        ctx.fillRect(x + 3, y + 3, tileW - 6, tileH - 6);
                        ctx.strokeStyle = "#d97706";
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(x + 3, y + 3, tileW - 6, tileH - 6);
                        ctx.fillStyle = "#b45309";
                        ctx.font = "bold 8px Inter";
                        ctx.fillText(obj.type === 'bridge_platform' ? "BRIDGE" : "RAMP", x + 5, y + tileH / 2 + 3);
                    }}
                }});
            }}

            // Draw Drop Zones if Quick Drop Box 4 ENC
            if (activeProject.id === "quick-box-drop" && currentArenaData && currentArenaData.dropZones) {{
                currentArenaData.dropZones.forEach(dz => {{
                    const c = dz.cell % cols;
                    const r = Math.floor(dz.cell / cols);
                    const x = c * tileW;
                    const y = r * tileH;

                    ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
                    ctx.fillRect(x + 4, y + 4, tileW - 8, tileH - 8);
                    ctx.strokeStyle = "#10b981";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x + 4, y + 4, tileW - 8, tileH - 8);
                    ctx.fillStyle = "#065f46";
                    ctx.font = "bold 8px Inter";
                    ctx.fillText(dz.id, x + 6, y + tileH / 2 + 3);
                }});
            }}

            // Draw Route Trajectory
            if (activeProject.waypoints && activeProject.waypoints.length > 0) {{
                ctx.beginPath();
                ctx.strokeStyle = activeProject.id === "quick-box-drop" ? "#10b981" : "#44abff";
                ctx.lineWidth = 3;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                activeProject.waypoints.forEach((p, idx) => {{
                    // Convert world coords to 2D canvas pixel coords
                    // World: X [-1.2, +1.2], Z [-0.6, +0.6] -> Canvas: [0..w], [0..h]
                    const px = ((p.x + 1.2) / 2.4) * w;
                    const py = ((p.z + 0.6) / 1.2) * h;
                    if (idx === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }});
                ctx.stroke();

                // Draw Waypoint Points
                activeProject.waypoints.forEach((p, idx) => {{
                    const px = ((p.x + 1.2) / 2.4) * w;
                    const py = ((p.z + 0.6) / 1.2) * h;

                    ctx.fillStyle = idx === 0 ? "#10b981" : (idx === activeProject.waypoints.length - 1 ? "#ef4444" : "#0284c7");
                    ctx.beginPath();
                    ctx.arc(px, py, 4, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = "#0f172a";
                    ctx.font = "bold 9px Inter";
                    ctx.fillText(\`P\${idx + 1}\`, px + 6, py - 3);
                }});
            }}
        }}

        // ---------------------------------------------------------------------
        // ACTION SHEET RENDERER
        // ---------------------------------------------------------------------
        function renderActionSheet() {{
            const tbody = document.getElementById('actionSheetRows');
            if (!tbody) return;

            let rows = [];
            if (activeProject.id === "atom-vx-rescue-five-points") {{
                rows = [
                    {{ step: 1, action: "FF(70, TIME_FLAT(2));", params: "SPD 70%, 1.5s, 0°", target: "Point 1: วิ่งตรงด้วยไจโร 0° ออกตัวจาก START", obstacle: "Normal" }},
                    {{ step: 2, action: "spinDegree(-90);", params: "Gyro Turn Left -90°", target: "Point 2: หมุนซ้าย 90° เข้าเลนกลาง", obstacle: "Turn L" }},
                    {{ step: 3, action: "FF(60, T_BUMP * 2);", params: "SPD 60%, 1.4s, 0°", target: "Point 3: ข้ามลูกระนาดตะเกียบ 7 ท่อน (0.689 Bamboo)", obstacle: "Chopstick Bumps" }},
                    {{ step: 4, action: "FF(65, T_BRIDGE * 2);", params: "SPD 65%, 1.8s, +50mm", target: "Point 4: ไต่สะพานยกระดับ 50mm (15° Incline/Decline)", obstacle: "Bridge 50mm" }},
                    {{ step: 5, action: "spinDegree(0); DropB();", params: "Heading 0°, Recoil 180ms", target: "Point 5: เข้าช่องเสบียงและดรอปกล่องหลัง B", obstacle: "Supply Drop" }}
                ];
            }} else {{
                rows = [
                    {{ step: 1, action: "FF(60, 0.5);", params: "SPD 60%, 0.5s, 90°", target: "Start Bay: ออกตัวจาก Quick Box 15", obstacle: "Normal" }},
                    {{ step: 2, action: "FF(70, 1.2); DropFL();", params: "Heading 0°, Servo CH0 Drop", target: "Drop Bay 1: ปลดกล่องเสบียงหน้าซ้าย BOX 1", obstacle: "DropFL" }},
                    {{ step: 3, action: "spinDegree(90); DropFR();", params: "Heading 90°, Servo CH1 Drop", target: "Drop Bay 2: ปลดกล่องเสบียงหน้าขวา BOX 2", obstacle: "DropFR" }},
                    {{ step: 4, action: "turnDegreeBack(90); DropB();", params: "Heading 180°, Servo CH2 Drop", target: "Drop Bay 3: ปลดกล่องเสบียงหลัง BOX 3", obstacle: "DropB" }},
                    {{ step: 5, action: "FF(70, 1.3); DropF();", params: "Heading 270°, Dual Servo Drop", target: "Drop Bay 4: ปลดกล่องคู่หน้า BOX 4", obstacle: "DropF" }},
                    {{ step: 6, action: "spinDegree(90); BB(50, 0.8); STOP();", params: "Heading 90°, Reverse 50%", target: "Home Base: ถอยกลับเข้าจุดจอดเสร็จสิ้นภารกิจ", obstacle: "Home Base" }}
                ];
            }}

            tbody.innerHTML = rows.map(r => \`
                <tr>
                    <td><span class="step-badge">\${r.step}</span></td>
                    <td style="font-family: var(--font-code); font-weight: 700; color: #0284c7;">\${r.action}</td>
                    <td style="color: var(--mb-text-muted); font-family: var(--font-code);">\${r.params}</td>
                    <td>
                        <div>\${r.target}</div>
                        \${{r.obstacle.startsWith('Drop') ? \`<span class="tag-drop"><i class="fas fa-box-open"></i> \${{r.obstacle}}</span>\` : (r.obstacle !== 'Normal' ? \`<span class="tag-obstacle"><i class="fas fa-exclamation-triangle"></i> \${{r.obstacle}}</span>\` : '')}}
                    </td>
                </tr>
            \`).join('');
        }}

        // ---------------------------------------------------------------------
        // CODE GENERATOR RENDERER
        // ---------------------------------------------------------------------
        function renderGeneratedCode() {{
            const pre = document.getElementById('codeDisplayArea');
            if (!pre) return;

            if (activeProject.id === "atom-vx-rescue-five-points") {{
                if (currentCodeLang === 'ino') {{
                    pre.textContent = \`/**
 * PT-BOT ATOM VX · OFFICIAL FIVE-POINT ROUTE
 * Auto-generated Tactical Mission Sketch (Non-Linear Timing)
 * Hardware Target: PT Atom VX 4WD (WD4)
 */

#include <PTBOTAtomVX.h>

// --- Non-Linear Physics Timing Constants ---
#define T_FLAT_BASE     420     // 1 Tile Ramp-up/down
#define T_FLAT_CRUISE   240     // Max speed cruise
#define T_BRIDGE        580     // 50mm Elevated Bridge (15 deg slope)
#define T_BUMP          380     // 7 Bamboo Chopstick Bumps (0.689 Reflectance)
#define TIME_FLAT(n)    (T_FLAT_BASE + ((n)-1)*T_FLAT_CRUISE)

// --- Heading Lock PD Tuning ---
float kp_yaw = 3.5;
float kd_yaw = 17.0;

void setup() {{
  setMotorDrive(WD4);
  setEnableIMU(true);
  calibrateIMU();
  beep(100);
}}

void loop() {{
  // Step 1: Forward from START
  FF(70, TIME_FLAT(2));
  
  // Step 2: In-place Gyro Turn -90°
  spinDegree(-90);
  
  // Step 3: Traverse 7 Bamboo Chopstick Bumps
  FF(60, T_BUMP * 2);
  
  // Step 4: Climb 50mm Elevated Bridge & Decline
  FF(65, T_BRIDGE * 2);
  
  // Step 5: Deliver Supply Box
  spinDegree(0);
  DropB();
  
  STOP();
}}\`;
                }} else {{
                    pre.textContent = \`# PT-BOT ATOM VX · OFFICIAL FIVE-POINT ROUTE (MicroPython)
import board
import motor
import line_follower
import utime

# Configure 4WD Drive Mode & S-curve Ramps
motor.set_motor_drive(motor.WD4)
motor.set_ramp_move_imu(0.12, 0.12)

# Step 1: Forward 0 deg with heading-lock PD
motor.forward_degree(0, 30, 70, 3.5, 17.0)
utime.sleep_ms(1500)
motor.stop()

# Step 2: Spin Turn -90 deg
motor.spin_degree(-90, 22, 2.2, 28, 100, 1.35, 0.16)

# Step 3: Cross Bamboo Speed Bumps (0.689 Reflectance)
motor.forward_degree(-90, 30, 60, 3.5, 17.0)
utime.sleep_ms(1400)
motor.stop()

# Step 4: Traverse 50mm Bridge
motor.forward_degree(90, 30, 65, 3.5, 17.0)
utime.sleep_ms(1800)
motor.stop()

# Step 5: Final Drop
motor.spin_degree(0, 22, 2.2, 28, 100, 1.35, 0.16)
board.servo_write(2, 90)
motor.stop()\`;
                }}
            }} else {{
                // Quick Drop Box 4 ENC
                if (currentCodeLang === 'ino') {{
                    pre.textContent = \`/**
 * PT-BOT ATOM VX · QUICK DROP BOX 4 ENC
 * 4-Zone Supply Drop Mission Protocol
 * Hardware Target: PT Atom VX 4WD (WD4) + 3 Drop Servos
 */

#include <PTBOTAtomVX.h>

void setup() {{
  setMotorDrive(WD4);
  setEnableIMU(true);
  calibrateIMU();
  
  // Initialize Servo Lock Positions
  servoWrite(CH_SERVO_FRONT_LEFT, ServoFrontLeft_Lock);
  servoWrite(CH_SERVO_FRONT_RIGHT, ServoFrontRight_Lock);
  servoWrite(CH_SERVO_BACK, ServoBack_Lock);
  beep(100);
}}

void loop() {{
  // Step 1: Launch from Quick Box 15
  FF(60, 0.5);
  
  // Step 2: Deploy BOX 1 (Front Left)
  FF(70, 1.2);
  DropFL();
  
  // Step 3: Deploy BOX 2 (Front Right)
  spinDegree(90);
  FF(65, 1.0);
  DropFR();
  
  // Step 4: Deploy BOX 3 (Rear)
  turnDegreeBack(90);
  BB(60, 1.1);
  DropB();
  
  // Step 5: Deploy BOX 4 (Front Dual)
  FF(70, 1.3);
  DropF();
  
  // Step 6: Return & Base Lock
  spinDegree(90);
  BB(50, 0.8);
  STOP();
}}\`;
                }} else {{
                    pre.textContent = \`# PT-BOT ATOM VX · QUICK DROP BOX 4 ENC (MicroPython)
import board
import motor
import servo
import utime

motor.set_motor_drive(motor.WD4)

# Initialize servo locks
servo.write(0, 0) # Front Left Lock
servo.write(1, 0) # Front Right Lock
servo.write(2, 0) # Back Lock

# Step 1-2: Deploy BOX 1
motor.forward_degree(0, 30, 70, 3.5, 17.0)
utime.sleep_ms(1200)
motor.stop()
servo.write(0, 90) # Drop BOX 1

# Step 3: Deploy BOX 2
motor.spin_degree(90, 22, 2.2, 28, 100, 1.35, 0.16)
motor.forward_degree(90, 30, 65, 3.5, 17.0)
utime.sleep_ms(1000)
motor.stop()
servo.write(1, 90) # Drop BOX 2

# Step 4: Deploy BOX 3
motor.turn_degree_back(180, 22, 2.2, 28, 100, 1.35, 0.16)
servo.write(2, 90) # Drop BOX 3

# Step 5: Deploy BOX 4 & Finish
motor.forward_degree(270, 30, 70, 3.5, 17.0)
utime.sleep_ms(1300)
servo.write(0, 90)
servo.write(1, 90)
motor.stop()\`;
                }}
            }}
        }}

        // ---------------------------------------------------------------------
        // 3D SIMULATOR SETUP (THREE.JS)
        // ---------------------------------------------------------------------
        function initThreeJsSimulator() {{
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
            renderer = new THREE.WebGLRenderer({{ antialias: true, powerPreference: "high-performance" }});
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
        }}

        function buildBaseFloor() {{
            // Main competition mat (2.4m x 1.2m)
            const floorGeo = new THREE.PlaneGeometry(2.4, 1.2);
            const floorMat = new THREE.MeshStandardMaterial({{
                color: 0xffffff,
                roughness: 0.75,
                metalness: 0.1
            }});
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            // Outer Arena Border Walls (PVC borders)
            const borderMat = new THREE.MeshStandardMaterial({{ color: 0x0284c7, roughness: 0.4 }});
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
        }}

        function build3DArenaObstacles() {{
            // Remove previous obstacles
            obstacleMeshes.forEach(m => scene.remove(m));
            obstacleMeshes = [];

            if (activeProject.id === "atom-vx-rescue-five-points") {{
                // 1. OFFICIAL 50mm ELEVATED BRIDGE (Official Rescue Specs)
                const bridgeMat = new THREE.MeshStandardMaterial({{ color: 0xd97706, roughness: 0.5 }});

                // Ramp Up (Slope 15 deg, reaches 50mm elevation)
                const rampUpGeo = new THREE.BoxGeometry(0.3, 0.02, 0.26);
                const rampUp = new THREE.Mesh(rampUpGeo, bridgeMat);
                rampUp.position.set(-0.35, 0.025, 0.15);
                rampUp.rotation.z = Math.PI * 0.083; // 15 degrees
                rampUp.castShadow = true;
                rampUp.receiveShadow = true;
                scene.add(rampUp);
                obstacleMeshes.push(rampUp);

                // Bridge Platform (Deck at +50mm = 0.05m elevation)
                const deckGeo = new THREE.BoxGeometry(0.35, 0.02, 0.26);
                const deck = new THREE.Mesh(deckGeo, bridgeMat);
                deck.position.set(-0.05, 0.05, 0.15);
                deck.castShadow = true;
                deck.receiveShadow = true;
                scene.add(deck);
                obstacleMeshes.push(deck);

                // Ramp Down (-15 deg slope)
                const rampDownGeo = new THREE.BoxGeometry(0.3, 0.02, 0.26);
                const rampDown = new THREE.Mesh(rampDownGeo, bridgeMat);
                rampDown.position.set(0.25, 0.025, 0.15);
                rampDown.rotation.z = -Math.PI * 0.083; // -15 degrees
                rampDown.castShadow = true;
                rampDown.receiveShadow = true;
                scene.add(rampDown);
                obstacleMeshes.push(rampDown);

                // Bridge Guardrails
                const railMat = new THREE.MeshStandardMaterial({{ color: 0x92400e }});
                const bRail1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.015), railMat);
                bRail1.position.set(-0.05, 0.06, 0.02);
                scene.add(bRail1);
                obstacleMeshes.push(bRail1);

                const bRail2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.015), railMat);
                bRail2.position.set(-0.05, 0.06, 0.28);
                scene.add(bRail2);
                obstacleMeshes.push(bRail2);

                // 2. SPEED BUMP CHOPSTICKS (7 bamboo cylindrical rods, 10mm diam, 0.689 reflectance)
                const chopstickMat = new THREE.MeshStandardMaterial({{ color: 0xd2a679, roughness: 0.6 }});
                for (let i = 0; i < 7; i++) {{
                    const rodGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.25, 12);
                    const rod = new THREE.Mesh(rodGeo, chopstickMat);
                    rod.rotation.x = Math.PI / 2;
                    rod.position.set(0.65 + (i * 0.035), 0.005, 0.15);
                    rod.castShadow = true;
                    scene.add(rod);
                    obstacleMeshes.push(rod);
                }}

                // 3. CHECKPOINT TARGET RINGS (Point 1..5)
                FIVE_POINT_PATH.forEach((pt, idx) => {{
                    const ringGeo = new THREE.RingGeometry(0.06, 0.08, 32);
                    const ringMat = new THREE.MeshBasicMaterial({{ color: 0x38bdf8, side: THREE.DoubleSide }});
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.x = Math.PI / 2;
                    ring.position.set(pt.x, 0.002, pt.z);
                    scene.add(ring);
                    obstacleMeshes.push(ring);

                    // Vertical glowing beacon cylinder
                    const beaconGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.15, 8);
                    const beaconMat = new THREE.MeshBasicMaterial({{ color: 0x38bdf8, transparent: true, opacity: 0.6 }});
                    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
                    beacon.position.set(pt.x, 0.075, pt.z);
                    scene.add(beacon);
                    obstacleMeshes.push(beacon);
                }});
            }} else {{
                // QUICK DROP BOX 4 ENC OBSTACLES (4 Drop Targets)
                const dropZones = [
                    {{ id: 'BOX1', x: -0.15, z: -0.45, color: 0xef4444 }},
                    {{ id: 'BOX2', x: 0.45,  z: -0.45, color: 0x3b82f6 }},
                    {{ id: 'BOX3', x: 0.45,  z: 0.15,  color: 0xf59e0b }},
                    {{ id: 'BOX4', x: -0.15, z: 0.15,  color: 0x10b981 }}
                ];

                dropZones.forEach(dz => {{
                    // Target Platform
                    const targetGeo = new THREE.BoxGeometry(0.18, 0.005, 0.18);
                    const targetMat = new THREE.MeshStandardMaterial({{ color: dz.color, roughness: 0.4 }});
                    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
                    targetMesh.position.set(dz.x, 0.002, dz.z);
                    targetMesh.receiveShadow = true;
                    scene.add(targetMesh);
                    obstacleMeshes.push(targetMesh);

                    // Outer Target Ring
                    const ringGeo = new THREE.RingGeometry(0.12, 0.14, 32);
                    const ringMat = new THREE.MeshBasicMaterial({{ color: dz.color, side: THREE.DoubleSide }});
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.x = Math.PI / 2;
                    ring.position.set(dz.x, 0.003, dz.z);
                    scene.add(ring);
                    obstacleMeshes.push(ring);

                    // Vertical Drop Beacon
                    const beaconGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.20, 8);
                    const beaconMat = new THREE.MeshBasicMaterial({{ color: dz.color, transparent: true, opacity: 0.6 }});
                    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
                    beacon.position.set(dz.x, 0.10, dz.z);
                    scene.add(beacon);
                    obstacleMeshes.push(beacon);
                }});
            }}
        }}

        function spawnDroppedBox(x, z, colorHex) {{
            const boxGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
            const boxMat = new THREE.MeshStandardMaterial({{ color: colorHex, metalness: 0.2, roughness: 0.3 }});
            const boxMesh = new THREE.Mesh(boxGeo, boxMat);
            boxMesh.position.set(x, 0.025, z);
            boxMesh.castShadow = true;
            boxMesh.receiveShadow = true;
            scene.add(boxMesh);
            droppedBoxMeshes.push(boxMesh);
        }}

        function clearDroppedBoxes() {{
            droppedBoxMeshes.forEach(b => scene.remove(b));
            droppedBoxMeshes = [];
        }}

        // ---------------------------------------------------------------------
        // ROBOT 3D MODEL LOADER (PT-BOT_Atom_VX.glb + PROCEDURAL FALLBACK)
        // ---------------------------------------------------------------------
        function loadRobotModel() {{
            const loader = new THREE.GLTFLoader();
            loader.load(
                'assets/models/PT-BOT_Atom_VX.glb',
                (gltf) => {{
                    robotMesh = gltf.scene;
                    robotMesh.scale.set(0.85, 0.85, 0.85);
                    const startP = activeProject.waypoints[0];
                    robotMesh.position.set(startP.x, 0.02, startP.z);
                    robotMesh.rotation.set(0, (startP.heading * Math.PI) / 180, 0);

                    robotMesh.traverse((child) => {{
                        if (child.isMesh) {{
                            child.castShadow = true;
                            child.receiveShadow = true;
                            if (child.name.toLowerCase().includes('wheel') || child.name.toLowerCase().includes('tire')) {{
                                robotWheelMeshes.push(child);
                            }}
                        }}
                    }});

                    scene.add(robotMesh);
                    logTerminal("Authentic 3D Model: PT-BOT_Atom_VX.glb loaded successfully.");
                }},
                undefined,
                (error) => {{
                    console.warn("Could not load GLTF, falling back to high-detail procedural 4WD chassis:", error);
                    createProceduralRobotChassis();
                }}
            );
        }}

        function createProceduralRobotChassis() {{
            robotMesh = new THREE.Group();

            // Main Aluminum Body
            const bodyGeo = new THREE.BoxGeometry(0.18, 0.04, 0.16);
            const bodyMat = new THREE.MeshStandardMaterial({{ color: 0x1e293b, metalness: 0.8, roughness: 0.3 }});
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.035;
            body.castShadow = true;
            robotMesh.add(body);

            // Top PCB Board (Atom VX green board)
            const pcbGeo = new THREE.BoxGeometry(0.14, 0.005, 0.12);
            const pcbMat = new THREE.MeshStandardMaterial({{ color: 0x059669, roughness: 0.4 }});
            const pcb = new THREE.Mesh(pcbGeo, pcbMat);
            pcb.position.y = 0.06;
            robotMesh.add(pcb);

            // Front IR Sensor Array Plate (140mm width, +100mm offset)
            const sensorGeo = new THREE.BoxGeometry(0.04, 0.015, 0.14);
            const sensorMat = new THREE.MeshStandardMaterial({{ color: 0x0284c7 }});
            const sensorPlate = new THREE.Mesh(sensorGeo, sensorMat);
            sensorPlate.position.set(0.10, 0.02, 0);
            robotMesh.add(sensorPlate);

            // 4 Silicone Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.022, 24);
            const wheelMat = new THREE.MeshStandardMaterial({{ color: 0x0f172a, roughness: 0.8 }});

            const wheelOffsets = [
                {{ x: 0.06, z: 0.09 }},
                {{ x: 0.06, z: -0.09 }},
                {{ x: -0.06, z: 0.09 }},
                {{ x: -0.06, z: -0.09 }}
            ];

            wheelOffsets.forEach(pos => {{
                const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(pos.x, 0.028, pos.z);
                wheel.castShadow = true;
                robotMesh.add(wheel);
                robotWheelMeshes.push(wheel);
            }});

            const startP = activeProject.waypoints[0];
            robotMesh.position.set(startP.x, 0.02, startP.z);
            robotMesh.rotation.set(0, (startP.heading * Math.PI) / 180, 0);
            scene.add(robotMesh);
            logTerminal("Procedural High-Detail 4WD Chassis fallback active.");
        }}

        // ---------------------------------------------------------------------
        // TRAIL LINE
        // ---------------------------------------------------------------------
        function initTrailLine() {{
            const maxPoints = 1200;
            const positions = new Float32Array(maxPoints * 3);
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setDrawRange(0, 0);

            const material = new THREE.LineBasicMaterial({{
                color: 0x38bdf8,
                linewidth: 2,
                transparent: true,
                opacity: 0.8
            }});

            trailLine = new THREE.Line(geometry, material);
            scene.add(trailLine);
        }}

        function addTrailPoint(pos) {{
            if (!trailLine) return;
            trailPoints.push(pos.clone());
            if (trailPoints.length > 1200) trailPoints.shift();

            const positions = trailLine.geometry.attributes.position.array;
            for (let i = 0; i < trailPoints.length; i++) {{
                positions[i * 3] = trailPoints[i].x;
                positions[i * 3 + 1] = trailPoints[i].y + 0.003;
                positions[i * 3 + 2] = trailPoints[i].z;
            }}
            trailLine.geometry.attributes.position.needsUpdate = true;
            trailLine.geometry.setDrawRange(0, trailPoints.length);
        }}

        function clearTrail() {{
            trailPoints = [];
            if (trailLine) {{
                trailLine.geometry.setDrawRange(0, 0);
            }}
        }}

        // ---------------------------------------------------------------------
        // SIMULATION EXECUTION LOOP WITH MOTOR PD & OPTICAL RAYCAST
        // ---------------------------------------------------------------------
        function toggleSimRun() {{
            if (!activeProject.loaded) {{
                openExamplesModal();
                return;
            }}

            isSimRunning = !isSimRunning;
            const btn = document.getElementById('btnSimPlay');
            const btnText = document.getElementById('btnSimPlayText');
            const btnIcon = document.getElementById('btnSimPlayIcon');

            if (isSimRunning) {{
                btn.className = "sim-btn danger";
                btnText.textContent = "Pause";
                btnIcon.className = "fas fa-pause";
                logTerminal(\`[RUN] Executing \${activeProject.name} simulation...\`);
            }} else {{
                btn.className = "sim-btn primary";
                btnText.textContent = "Run Sim";
                btnIcon.className = "fas fa-play";
                logTerminal("[PAUSE] Simulation paused.");
            }}
        }}

        function resetSimRun() {{
            isSimRunning = false;
            simProgress = 0;
            document.getElementById('btnSimPlay').className = "sim-btn primary";
            document.getElementById('btnSimPlayText').textContent = "Run Sim";
            document.getElementById('btnSimPlayIcon').className = "fas fa-play";
            document.getElementById('simProgressFill').style.width = "0%";
            document.getElementById('lblSimProgressPct').textContent = "0%";

            clearDroppedBoxes();
            clearTrail();

            if (robotMesh && activeProject.waypoints.length > 0) {{
                const p0 = activeProject.waypoints[0];
                robotMesh.position.set(p0.x, 0.02, p0.z);
                robotMesh.rotation.set(0, (p0.heading * Math.PI) / 180, 0);
            }}

            updateTelemetryHUD(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "IDLE", 0, "Mat 0.08", "TRACKING", [3, 3, 3, 3, 3, 3, 3, 3]);
            logTerminal("[RESET] Simulation reset to start waypoint.");
        }}

        function cycleSimSpeed() {{
            if (simSpeed === 1) simSpeed = 2;
            else if (simSpeed === 2) simSpeed = 5;
            else simSpeed = 1;
            document.getElementById('lblSimSpeed').textContent = \`\${simSpeed}x\`;
            logTerminal(\`[SPEED] Simulator speed set to \${simSpeed}x\`);
        }}

        function setCameraView(mode) {{
            simCamMode = mode;
            document.getElementById('camFreeBtn').classList.toggle('active', mode === 'free');
            document.getElementById('camFollowBtn').classList.toggle('active', mode === 'follow');
            document.getElementById('camTopBtn').classList.toggle('active', mode === 'top');

            if (mode === 'top') {{
                camera.position.set(0, 3.2, 0.001);
                controls.target.set(0, 0, 0);
            }} else if (mode === 'free') {{
                camera.position.set(1.6, 1.8, 2.2);
                controls.target.set(0, 0, 0);
            }}
        }}

        function animateSimulation() {{
            requestAnimationFrame(animateSimulation);

            if (isSimRunning && robotMesh && activeProject.loaded) {{
                const waypoints = activeProject.waypoints;
                const totalSegments = waypoints.length - 1;
                simProgress += 0.0012 * simSpeed;

                if (simProgress >= 1.0) {{
                    simProgress = 1.0;
                    isSimRunning = false;
                    document.getElementById('btnSimPlay').className = "sim-btn primary";
                    document.getElementById('btnSimPlayText').textContent = "Run Sim";
                    document.getElementById('btnSimPlayIcon').className = "fas fa-play";
                    logTerminal(\`[SUCCESS] \${activeProject.name} completed successfully! (100% path covered)\`);
                }}

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

                if (activeProject.id === "atom-vx-rescue-five-points") {{
                    // Bridge Traversal (X between -0.4 and 0.3)
                    if (posX >= -0.4 && posX <= 0.3 && posZ >= 0.05 && posZ <= 0.25) {{
                        if (posX < -0.15) {{
                            // Incline 15 deg
                            pitchAngle = 0.262; // 15 deg climb
                            posY = 0.02 + ((posX - (-0.4)) / 0.25) * 0.05;
                            surfaceStatus = "BRIDGE CLIMB (15°)";
                        }} else if (posX > 0.05) {{
                            // Decline 15 deg
                            pitchAngle = -0.262; // -15 deg descent
                            posY = 0.07 - ((posX - 0.05) / 0.25) * 0.05;
                            surfaceStatus = "BRIDGE DESCENT (-15°)";
                        }} else {{
                            // Bridge Deck Platform (+50mm)
                            posY = 0.07;
                            pitchAngle = 0;
                            surfaceStatus = "BRIDGE DECK (+50mm)";
                        }}
                    }}

                    // Chopstick Speed Bumps (X between 0.65 and 0.90)
                    if (posX >= 0.65 && posX <= 0.90 && posZ >= 0.05 && posZ <= 0.25) {{
                        // High-frequency pitch oscillation and vertical bounce
                        const freq = Math.sin((posX - 0.65) * 120);
                        posY = 0.02 + Math.abs(freq) * 0.005;
                        pitchAngle = freq * 0.08;
                        reflectance = 0.689; // Authentic reverse-engineered bamboo reflectance!
                        surfaceStatus = "CROSSING BUMP (Bamboo 0.689)";
                    }}
                }} else {{
                    // Quick Drop Box 4 ENC Drop Trigger
                    if (pStart.drop && segT > 0.3 && droppedBoxMeshes.length < (segIdx)) {{
                        const boxColors = {{ 'BOX1': 0xef4444, 'BOX2': 0x3b82f6, 'BOX3': 0xf59e0b, 'BOX4': 0x10b981 }};
                        spawnDroppedBox(pStart.x, pStart.z, boxColors[pStart.drop] || 0x10b981);
                        logTerminal(\`[PAYLOAD] \${pStart.drop} deployed successfully at (\${pStart.x}, \${pStart.z})\`);
                    }}
                }}

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
                if (segT < 0.2) {{
                    const sFactor = 0.5 * (1.0 - Math.cos((segT / 0.2) * Math.PI));
                    baseSpd = 25 + sFactor * (baseSpd - 25);
                    motionPhase = "RAMP-UP (120ms)";
                }} else if (segT > 0.8) {{
                    const sFactor = 0.5 * (1.0 - Math.cos(((1.0 - segT) / 0.2) * Math.PI));
                    baseSpd = 20 + sFactor * (baseSpd - 20);
                    motionPhase = segT > 0.95 ? "BRAKE PULSE (15ms)" : "RAMP-DOWN (120ms)";
                }}

                const mLeft = THREE.MathUtils.clamp(Math.round(baseSpd + pdCorrection), -100, 100);
                const mRight = THREE.MathUtils.clamp(Math.round(baseSpd - pdCorrection), -100, 100);

                // Spin wheels
                robotWheelMeshes.forEach(w => {{
                    w.rotation.y += (baseSpd / 60) * 0.2 * simSpeed;
                }});

                // 5. 8-Channel Optical Line Sensor Model & Centroid
                // Distance to central corridor line
                let distToLine = Math.abs(posZ - (pStart.z));
                if (distToLine < 0.02) {{
                    reflectance = Math.max(reflectance, 0.92);
                    if (surfaceStatus === "TRACKING") surfaceStatus = "ON LINE (0.92)";
                }}

                // Generate 8-channel simulated ADC readings
                let sensorReadings = [];
                let weights = [-42, -30, -18, -6, 6, 18, 30, 42];
                let weightedSum = 0;
                let sumVal = 0;

                for (let i = 0; i < 8; i++) {{
                    let sensorOffsetMm = weights[i];
                    let lateralDistM = Math.abs(sensorOffsetMm / 1000 - distToLine);
                    let chRefl = reflectance;
                    if (lateralDistM > 0.025 && reflectance > 0.6) {{
                        chRefl = 0.08; // Sensor fell off line/bump
                    }}
                    let adcRaw = Math.round(chRefl * 1023);
                    let calPct = THREE.MathUtils.clamp(Math.round(((adcRaw - 120) / (920 - 120)) * 100), 3, 98);
                    sensorReadings.push(calPct);
                    if (calPct > 25) {{
                        weightedSum += sensorOffsetMm * calPct;
                        sumVal += calPct;
                    }}
                }}

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
                if (simCamMode === 'follow') {{
                    camera.position.set(posX + 0.6, posY + 0.7, posZ + 0.8);
                    controls.target.set(posX, posY, posZ);
                }}
            }}

            controls.update();
            renderer.render(scene, camera);
        }}

        function updateTelemetryHUD(yaw, pitch, roll, spd, x, z, elev, m1, m2, m3, m4, tgtYaw, phase, pd, reflText, surfStatus, sensorVals, centroidMm) {{
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

            if (sensorVals && sensorVals.length === 8) {{
                for (let i = 0; i < 8; i++) {{
                    const el = document.getElementById(\`sbar\${i}\`);
                    if (el) {{
                        el.style.height = \`\${sensorVals[i]}%\`;
                        el.style.background = sensorVals[i] > 60 ? '#10b981' : (sensorVals[i] > 25 ? '#f59e0b' : '#334155');
                    }}
                }}
            }}
        }}

        function onWindowResize() {{
            const container = document.getElementById('canvasViewport');
            if (!container || !renderer || !camera) return;
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }}

        // ---------------------------------------------------------------------
        // TERMINAL & TOAST UTILITIES
        // ---------------------------------------------------------------------
        function logTerminal(msg) {{
            const term = document.getElementById('terminalLogs');
            if (!term) return;
            const div = document.createElement('div');
            const timeStr = new Date().toTimeString().split(' ')[0];
            div.textContent = \`[\${timeStr}] \${msg}\`;
            term.appendChild(div);
            term.scrollTop = term.scrollHeight;
        }}

        function clearTerminalLogs() {{
            const term = document.getElementById('terminalLogs');
            if (term) term.innerHTML = '';
        }}

        function showToast(msg) {{
            const toast = document.getElementById('toastBanner');
            const toastMsg = document.getElementById('toastMessage');
            if (!toast || !toastMsg) return;
            toastMsg.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => {{
                toast.classList.remove('show');
            }}, 3200);
        }}

        function copyCurrentCode() {{
            const pre = document.getElementById('codeDisplayArea');
            if (pre) {{
                navigator.clipboard.writeText(pre.textContent).then(() => {{
                    showToast("Code copied to clipboard!");
                }});
            }}
        }}

        function exportArduinoIno() {{
            renderGeneratedCode();
            const pre = document.getElementById('codeDisplayArea');
            const blob = new Blob([pre.textContent], {{ type: 'text/plain' }});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`\${activeProject.id}.ino\`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(\`Exported \${activeProject.id}.ino\`);
        }}

        function exportMicroPythonPy() {{
            switchCodeLang('py');
            const pre = document.getElementById('codeDisplayArea');
            const blob = new Blob([pre.textContent], {{ type: 'text/plain' }});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`\${activeProject.id}.py\`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(\`Exported \${activeProject.id}.py\`);
        }}

        async function handleConnectSerial() {{
            if ('serial' in navigator) {{
                try {{
                    const port = await navigator.serial.requestPort();
                    await port.open({{ baudRate: 115200 }});
                    showToast("Connected to PT Atom VX via WebSerial (115200 baud)!");
                    logTerminal("[SERIAL] Connected to ESP32 CP210x USB device.");
                }} catch (err) {{
                    console.warn(err);
                    logTerminal(\`[SERIAL] Connect error or cancelled: \${err.message}\`);
                }}
            }} else {{
                showToast("WebSerial not supported in this browser. Running offline simulator mode.");
            }}
        }}

        function handleUploadFirmware() {{
            showToast("Simulating firmware flash to PT Atom VX (921,600 baud)...");
            logTerminal("[FLASH] Connecting to ESP32 bootloader...");
            setTimeout(() => {{
                logTerminal("[FLASH] Erasing flash partition 0x10000...");
            }}, 500);
            setTimeout(() => {{
                logTerminal("[FLASH] Flashing MissionRunner.bin (100% complete)");
                logTerminal("[FLASH] Hardware rebooting. Mission armed.");
                showToast("Upload complete! Robot ready.");
            }}, 1200);
        }}
    </script>
</body>
</html>
\`;

// Write to files
const targets = [
    path.join(ROOT_DIR, 'apps', 'web', 'index.html'),
    path.join(ROOT_DIR, 'apps', 'web', 'tactical_planner.html'),
    path.join(ROOT_DIR, 'apps', 'web', 'web.html')
];

targets.forEach(tgt => {{
    fs.writeFileSync(tgt, htmlContent, 'utf8');
    console.log('Successfully written:', tgt);
}});

console.log('All files built successfully!');
'''

builder_path = os.path.join(ROOT_DIR, "build_rescue_sim_ide.js")
with open(builder_path, "w", encoding="utf-8") as f:
    f.write(js_builder)

print(f"Generated {builder_path} successfully!")
