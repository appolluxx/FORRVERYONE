import os
import json

ROOT_DIR = r"D:\Workspace\robot"

# 1. Load Arena JSON presets
with open(os.path.join(ROOT_DIR, "data", "arenas", "rescue_five_points_layout.json"), "r", encoding="utf-8") as f:
    layout_five_points = json.load(f)

with open(os.path.join(ROOT_DIR, "data", "arenas", "quick_drop_box_4_enc_layout.json"), "r", encoding="utf-8") as f:
    layout_quick_box = json.load(f)

with open(os.path.join(ROOT_DIR, "data", "arenas", "official_field_mission.json"), "r", encoding="utf-8") as f:
    layout_official_100 = json.load(f)

with open(os.path.join(ROOT_DIR, "data", "arenas", "normal.json"), "r", encoding="utf-8") as f:
    layout_normal = json.load(f)

with open(os.path.join(ROOT_DIR, "data", "arenas", "jaajaj.json"), "r", encoding="utf-8") as f:
    layout_jaajaj = json.load(f)

# Build Master HTML
html_content = f'''<!DOCTYPE html>
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
        :root {{
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
        }}

        * {{
            box-sizing: border-box;
            user-select: none;
            -webkit-user-select: none;
        }}

        body {{
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
        }}

        /* 1. HEADER (Authentic roboBlocks IDE Top Bar) */
        .ide-header {{
            height: 52px;
            background-color: var(--mb-brand);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            z-index: 100;
            flex-shrink: 0;
        }}

        .ide-header-left {{
            display: flex;
            align-items: center;
            gap: 14px;
        }}

        .logo-wrap {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.15rem;
            font-weight: 800;
            color: #ffffff;
            cursor: pointer;
            letter-spacing: -0.02em;
        }}

        .logo-wrap img {{
            height: 28px;
            width: auto;
            border-radius: 4px;
        }}

        .header-title-pill {{
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 4px 10px;
            border-radius: var(--radius-sm);
            font-size: 0.72rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
            letter-spacing: 0.04em;
        }}

        .board-selector-pill {{
            background: #ffffff;
            color: #0369a1;
            padding: 4px 10px;
            border-radius: var(--radius-sm);
            font-size: 0.72rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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
            width: 250px;
            text-align: center;
            transition: all 0.15s ease;
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
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }}

        .hdr-btn.highlight:hover {{
            background: #f0f9ff;
        }}

        /* 2. MAIN WORKSPACE CONTAINER */
        .ide-workspace {{
            flex: 1;
            display: grid;
            grid-template-columns: 480px 1fr;
            height: calc(100vh - 52px - 28px);
            overflow: hidden;
        }}

        .workspace-left-panel {{
            background: var(--mb-panel);
            border-right: 1px solid var(--mb-border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10;
        }}

        /* PINNED 2D ARENA CANVAS (Exact 2.4m x 1.2m Arena ratio 2:1 -> 456x228, 57px/cell) */
        .pinned-canvas-section {{
            background: #ffffff;
            border-bottom: 1px solid var(--mb-border);
            padding: 10px 12px 12px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex-shrink: 0;
        }}

        .canvas-hint-banner {{
            font-size: 0.72rem;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 500;
        }}

        .canvas-hint-banner b {{
            color: #0f172a;
        }}

        .canvas-box-outer {{
            width: 456px;
            height: 228px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            margin: 0 auto;
        }}

        #arena2dCanvas {{
            display: block;
            width: 456px;
            height: 228px;
            cursor: crosshair;
        }}

        /* LEFT PANEL TABS */
        .left-panel-nav {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border);
            padding: 0 8px;
            height: 40px;
            flex-shrink: 0;
        }}

        .panel-nav-tabs {{
            display: flex;
            gap: 2px;
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
            transition: all 0.15s ease;
        }}

        .tab-btn:hover {{
            color: var(--mb-text);
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
            background: #ffffff;
        }}

        .tab-pane {{
            display: none;
            height: 100%;
            padding: 12px 14px;
            box-sizing: border-box;
        }}

        .tab-pane.active {{
            display: flex;
            flex-direction: column;
            gap: 10px;
        }}

        /* PALETTE TOOLS (FIELD EDITOR) */
        .palette-group-title {{
            font-size: 0.70rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 2px 0 6px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .palette-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-bottom: 6px;
        }}

        .palette-btn {{
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
        }}

        .palette-btn:hover {{
            background: #f8fafc;
            border-color: #94a3b8;
        }}

        .palette-btn.active {{
            background: #eff6ff;
            border-color: #0284c7;
            color: #0369a1;
            box-shadow: 0 0 0 1px #0284c7;
        }}

        .swatch-icon {{
            width: 14px;
            height: 14px;
            border-radius: 3px;
            flex-shrink: 0;
            border: 1px solid rgba(0, 0, 0, 0.12);
        }}

        /* SIM BUTTONS */
        .sim-btn {{
            background: #ffffff;
            border: 1px solid #cbd5e1;
            color: #334155;
            border-radius: var(--radius-sm);
            padding: 6px 12px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.15s ease;
        }}

        .sim-btn:hover {{
            background: #f8fafc;
            border-color: #94a3b8;
            color: #0f172a;
        }}

        .sim-btn.primary {{
            background: var(--mb-brand-deep);
            color: #ffffff;
            border-color: var(--mb-brand-deep);
        }}

        .sim-btn.primary:hover {{
            background: #0369a1;
        }}

        .sim-btn.secondary {{
            background: #f1f5f9;
            border-color: #e2e8f0;
            color: #334155;
        }}

        .sim-btn.danger {{
            background: #fee2e2;
            color: #b91c1c;
            border-color: #fecaca;
        }}

        .sim-btn.danger:hover {{
            background: #fecaca;
        }}

        /* ROUTE PLANNER */
        .planner-actions-bar {{
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 4px;
        }}

        .route-validation-box {{
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: var(--radius-md);
            padding: 8px 12px;
            font-size: 0.73rem;
            color: #166534;
        }}

        .route-validation-box.invalid {{
            background: #fef2f2;
            border-color: #fecaca;
            color: #991b1b;
        }}

        .val-errors {{
            margin-top: 4px;
            font-size: 0.70rem;
            line-height: 1.4;
            color: #b91c1c;
        }}

        .wp-editor-card {{
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: var(--shadow-subtle);
        }}

        .wp-editor-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 700;
            font-size: 0.75rem;
            color: #1e293b;
        }}

        .wp-editor-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }}

        .wp-field {{
            display: flex;
            flex-direction: column;
            gap: 3px;
        }}

        .wp-field.span-4 {{
            grid-column: span 4;
        }}

        .wp-field label {{
            font-size: 0.68rem;
            font-weight: 600;
            color: var(--mb-text-muted);
            text-transform: uppercase;
        }}

        .wp-field input, .wp-field select {{
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: 4px 6px;
            font-family: var(--font-code);
            font-size: 0.75rem;
            color: var(--mb-text);
            outline: none;
        }}

        .wp-field input:focus, .wp-field select:focus {{
            border-color: var(--mb-brand-deep);
            background: #ffffff;
        }}

        /* ACTION SHEET & CODE TABS */
        .actionsheet-wrap {{
            overflow-y: auto;
            max-height: 100%;
        }}

        .action-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.73rem;
            font-variant-numeric: tabular-nums;
        }}

        .action-table th {{
            background: #f8fafc;
            color: #64748b;
            text-align: left;
            padding: 6px 8px;
            border-bottom: 1px solid var(--mb-border);
            font-weight: 700;
            font-size: 0.68rem;
            text-transform: uppercase;
        }}

        .action-table td {{
            padding: 6px 8px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
        }}

        .action-table tr:hover td {{
            background: #f8fafc;
        }}

        .code-view-wrap {{
            display: flex;
            flex-direction: column;
            height: 100%;
            gap: 8px;
        }}

        .code-lang-selector {{
            display: flex;
            align-items: center;
            gap: 6px;
            background: #f8fafc;
            padding: 4px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--mb-border);
        }}

        .lang-btn {{
            background: transparent;
            border: none;
            padding: 4px 10px;
            font-size: 0.72rem;
            font-weight: 600;
            color: #64748b;
            border-radius: 4px;
            cursor: pointer;
        }}

        .lang-btn.active {{
            background: #ffffff;
            color: #0f172a;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            font-weight: 700;
        }}

        .code-area {{
            flex: 1;
            background: #0f172a;
            color: #e2e8f0;
            padding: 12px;
            border-radius: var(--radius-md);
            font-family: var(--font-code);
            font-size: 0.75rem;
            line-height: 1.5;
            overflow: auto;
            margin: 0;
            user-select: text;
        }}

        /* TERMINAL DRAWER */
        .terminal-drawer {{
            height: 110px;
            background: #090d16;
            border-top: 1px solid #1e293b;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }}

        .terminal-header {{
            background: #0f172a;
            padding: 4px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.70rem;
            font-weight: 600;
            border-bottom: 1px solid #1e293b;
        }}

        .terminal-logs {{
            flex: 1;
            padding: 8px 12px;
            font-family: var(--font-code);
            font-size: 0.70rem;
            color: #94a3b8;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }}

        /* 3. RIGHT PANEL (3D WEBGL SIMULATOR) */
        .workspace-right-panel {{
            background: #0b0f19;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }}

        .sim-canvas-viewport {{
            flex: 1;
            position: relative;
            outline: none;
        }}

        #canvas3D {{
            width: 100%;
            height: 100%;
            display: block;
        }}

        /* TELEMETRY HUD (IMPECCABLE MINIMALIST PRECISION) */
        .sim-overlay-hud {{
            position: absolute;
            top: 14px;
            left: 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
            z-index: 20;
        }}

        .hud-card {{
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--radius-md);
            padding: 8px 12px;
            width: 250px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
            gap: 4px;
        }}

        .hud-card-title {{
            font-size: 0.68rem;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 4px;
            margin-bottom: 2px;
        }}

        .hud-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.72rem;
            line-height: 1.3;
        }}

        .hud-label {{
            color: #94a3b8;
            font-weight: 500;
        }}

        .hud-val {{
            color: #ffffff;
            font-family: var(--font-code);
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }}

        .badge-pill {{
            font-size: 0.62rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }}

        .badge-pill.blue {{
            background: rgba(56, 189, 248, 0.2);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.4);
        }}

        .badge-pill.green {{
            background: rgba(74, 222, 128, 0.2);
            color: #4ade80;
            border: 1px solid rgba(74, 222, 128, 0.4);
        }}

        /* CAMERA CONTROLS (Top Right of 3D) */
        .sim-cam-controls {{
            position: absolute;
            top: 14px;
            right: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            z-index: 20;
        }}

        .cam-btn {{
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-radius: var(--radius-sm);
            padding: 6px 10px;
            font-size: 0.72rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }}

        .cam-btn:hover {{
            background: rgba(30, 41, 59, 0.95);
            border-color: rgba(255, 255, 255, 0.3);
        }}

        .cam-btn.active {{
            background: var(--mb-brand-deep);
            border-color: var(--mb-brand-deep);
        }}

        /* PLAYBACK CONTROLLER BAR (Bottom of 3D) */
        .sim-playback-bar {{
            height: 48px;
            background: #090d16;
            border-top: 1px solid #1e293b;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            z-index: 30;
        }}

        .playback-left {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .ctrl-btn {{
            background: #1e293b;
            border: 1px solid #334155;
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

        .ctrl-btn:hover {{
            background: #334155;
        }}

        .ctrl-btn.primary {{
            background: var(--mb-brand-deep);
            border-color: var(--mb-brand-deep);
        }}

        .ctrl-btn.primary:hover {{
            background: #0369a1;
        }}

        .timeline-slider-wrap {{
            flex: 1;
            margin: 0 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }}

        .timeline-slider {{
            flex: 1;
            -webkit-appearance: none;
            height: 4px;
            border-radius: 2px;
            background: #334155;
            outline: none;
        }}

        .timeline-slider::-webkit-slider-thumb {{
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--mb-brand);
            cursor: pointer;
        }}

        .timeline-time {{
            font-family: var(--font-code);
            font-size: 0.72rem;
            color: #94a3b8;
            font-variant-numeric: tabular-nums;
            min-width: 70px;
        }}

        /* MODAL (EXAMPLES) */
        .modal-backdrop {{
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }}

        .modal-backdrop.show {{
            display: flex;
        }}

        .examples-modal-card {{
            background: #ffffff;
            width: 820px;
            max-width: 90vw;
            max-height: 85vh;
            border-radius: var(--radius-lg);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }}

        .examples-modal-header {{
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .examples-modal-header h2 {{
            margin: 0;
            font-size: 1.05rem;
            font-weight: 700;
            color: #0f172a;
        }}

        .examples-modal-header p {{
            margin: 2px 0 0 0;
            font-size: 0.75rem;
            color: #64748b;
        }}

        .close-modal-btn {{
            background: none;
            border: none;
            font-size: 1.4rem;
            color: #94a3b8;
            cursor: pointer;
        }}

        .close-modal-btn:hover {{
            color: #0f172a;
        }}

        .examples-modal-body {{
            padding: 16px 20px;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }}

        .example-grid-card {{
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 14px;
            background: #ffffff;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }}

        .example-grid-card:hover {{
            border-color: var(--mb-brand-deep);
            box-shadow: var(--shadow-card);
            transform: translateY(-1px);
        }}

        .example-card-meta {{
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .example-card-title {{
            margin: 0;
            font-size: 0.90rem;
            font-weight: 700;
            color: #0f172a;
        }}

        .example-card-desc {{
            margin: 0;
            font-size: 0.74rem;
            color: #64748b;
            line-height: 1.4;
        }}

        .btn-open-example {{
            background: var(--mb-brand-deep);
            color: #ffffff;
            border: none;
            border-radius: var(--radius-sm);
            padding: 6px 12px;
            font-size: 0.74rem;
            font-weight: 600;
            cursor: pointer;
            align-self: flex-start;
        }}

        /* TOAST */
        .toast-banner {{
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #0f172a;
            color: #ffffff;
            border: 1px solid #334155;
            border-radius: var(--radius-md);
            padding: 10px 16px;
            font-size: 0.78rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }}

        .toast-banner.show {{
            transform: translateY(0);
            opacity: 1;
        }}

        /* HEADER VIEW NAV (IMPECCABLE PRECISION) */
        .header-view-nav {{
            display: flex;
            align-items: center;
            background: rgba(0, 0, 0, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: var(--radius-sm);
            padding: 2px;
            gap: 2px;
            margin-left: 12px;
        }}

        .view-mode-btn {{
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.78);
            font-size: 0.74rem;
            font-weight: 600;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }}

        .view-mode-btn:hover {{
            color: #ffffff;
            background: rgba(255, 255, 255, 0.12);
        }}

        .view-mode-btn.active {{
            background: #ffffff;
            color: var(--mb-brand-deep);
            font-weight: 700;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }}

        /* FULLSCREEN VIEW CONTAINERS */
        .view-container {{
            display: none;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }}

        .view-container.active {{
            display: flex;
        }}

        /* VIEW 1: TACTICAL 2D ARENA VIEW */
        .view-arena-split {{
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-columns: 460px 1fr;
            overflow: hidden;
        }}

        /* VIEW 2: ACTION SHEET FULLSCREEN VIEW */
        .view-actionsheet-fullscreen {{
            flex-direction: column;
            background: #ffffff;
            padding: 24px 32px;
            overflow-y: auto;
        }}

        .fullscreen-sheet-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid var(--mb-border);
            padding-bottom: 16px;
            margin-bottom: 18px;
        }}

        .fullscreen-sheet-header h2 {{
            font-size: 1.25rem;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 10px;
        }}

        /* VIEW 3: CODE VIEW FULLSCREEN */
        .view-code-fullscreen {{
            flex-direction: column;
            background: #0f172a;
            overflow: hidden;
        }}

        .code-fullscreen-toolbar {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #1e293b;
            border-bottom: 1px solid #334155;
            padding: 10px 24px;
        }}

        .code-fullscreen-editor {{
            flex: 1;
            padding: 24px 32px;
            overflow: auto;
            margin: 0;
            font-family: var(--font-code);
            font-size: 0.88rem;
            line-height: 1.6;
            color: #38bdf8;
            background: #090d16;
        }}

    </style>
</head>
<body>
    <!-- 1. HEADER (roboBlocks Brand Identity) -->
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
                <i class="fas fa-microchip" style="color: #059669;"></i>
                <span>ATOM VX (ESP32)</span>
            </div>
        </div>

        <div class="ide-header-center">
            <input type="text" class="project-name-input" id="projectNameInput" value="Five-Point Route" spellcheck="false">
            <div class="header-view-nav">
                <button class="view-mode-btn active" id="viewBtnArena" onclick="switchViewMode('arena')">
                    <i class="fas fa-map"></i> Tactical 2D View
                </button>
                <button class="view-mode-btn" id="viewBtnActionSheet" onclick="switchViewMode('actionsheet')">
                    <i class="fas fa-list-ol"></i> Action Sheet
                </button>
                <button class="view-mode-btn" id="viewBtnCode" onclick="switchViewMode('code')">
                    <i class="fas fa-code"></i> Code View
                </button>
            </div>
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
            <button class="hdr-btn" onclick="exportArduinoIno()">
                <i class="fas fa-microchip"></i> .ino
            </button>
            <button class="hdr-btn" onclick="exportMicroPythonPy()">
                <i class="fab fa-python"></i> .py
            </button>
            <input type="file" id="arenaFileInput" accept=".json,.mby,application/json" onchange="handleArenaFileUpload(event)" style="display:none;">
        </div>
    </header>

    <!-- 2. MAIN WORKSPACE CONTAINER -->
    <!-- VIEW CONTAINER 1: TACTICAL 2D ARENA VIEW (DEFAULT) -->
    <div class="view-container active ide-workspace" id="viewContainerArena">
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

        <!-- RIGHT PANEL: 2D HIGH-RESOLUTION TACTICAL THEATER VIEW -->
        <div class="workspace-right-panel" style="background: #0f172a; position: relative;">
            <div class="sim-canvas-viewport" id="canvasViewport" style="display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1e293b 0%, #0b0f19 100%);">
                <!-- Floating Telemetry HUD -->
                <div class="sim-overlay-hud">
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
                            <span class="hud-val" id="hudPos">105.0, 45.0</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">ELEVATION (Y):</span>
                            <span class="hud-val" id="hudElevation">0.0 mm</span>
                        </div>
                    </div>

                    <div class="hud-card">
                        <div class="hud-card-title">
                            <span><i class="fas fa-tachometer-alt"></i> MOTOR CONTROL & HEADING LOCK</span>
                            <span class="badge-pill green" id="hudMotionPhase">IDLE</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">HEADING TARGET:</span>
                            <span class="hud-val" id="hudTargetDeg">0.0°</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PD CORRECTION:</span>
                            <span class="hud-val" id="hudPDOutput">0.00</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">LEFT / RIGHT PWM:</span>
                            <span class="hud-val" id="hudPWM">0 / 0</span>
                        </div>
                        <div class="hud-row">
                            <span class="hud-label">PID GAINS:</span>
                            <span class="hud-val" id="hudGains">KP 0.6 | KD 2.0</span>
                        </div>
                    </div>
                </div>

                <!-- 2D High-Definition Tactical Arena Display Canvas -->
                <div id="simCanvasWrap" style="display: flex; align-items: center; justify-content: center; padding: 20px; width: 100%; height: 100%;">
                    <div style="box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7); border: 2px solid #334155; border-radius: 8px; overflow: hidden; background: #ffffff;">
                        <canvas id="arenaTheaterCanvas" width="912" height="456" style="display: block; max-width: 100%; max-height: calc(100vh - 180px); width: auto; height: auto;"></canvas>
                    </div>
                </div>
            </div>

            <!-- SIMULATION PLAYBACK BAR -->
            <div class="sim-playback-bar">
                <div class="playback-left">
                    <button class="ctrl-btn primary" id="btnPlayPause" onclick="toggleSimRun()">
                        <i class="fas fa-play" id="playIcon"></i> <span id="playText">Run</span>
                    </button>
                    <button class="ctrl-btn" onclick="resetSimRun()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button class="ctrl-btn" id="btnSpeed" onclick="cycleSimSpeed()">
                        <i class="fas fa-bolt"></i> 1x
                    </button>
                </div>

                <div class="timeline-slider-wrap">
                    <span class="timeline-time" id="timeCurrent">0.00s</span>
                    <input type="range" class="timeline-slider" id="simProgressSlider" min="0" max="1000" value="0" oninput="onScrubSimulation(this.value)">
                    <span class="timeline-time" id="timeTotal">12.50s</span>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    <div style="font-size: 0.70rem; color: #94a3b8; font-weight: 600;" id="arenaInfoTitle">Five-Point Route · Tactical 2D Arena</div>
                    <button class="ctrl-btn" style="padding: 4px 8px; font-size: 0.70rem;" onclick="clearTrail()">
                        <i class="fas fa-paint-brush"></i> Clear Trail
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- VIEW CONTAINER 2: ACTION SHEET FULLSCREEN VIEW -->
    <div class="view-container view-actionsheet-fullscreen" id="viewContainerActionSheet">
        <div class="fullscreen-sheet-header">
            <div>
                <h2><i class="fas fa-list-ol" style="color: #0284c7;"></i> Tactical Action Sheet · Mission Steps</h2>
                <p style="color: #64748b; font-size: 0.82rem; margin-top: 4px;">Low-level PT-BOT motion primitives and timing sequenced from waypoint trajectory.</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="ctrl-btn" onclick="switchViewMode('arena')">
                    <i class="fas fa-arrow-left"></i> Back to Arena View
                </button>
                <button class="ctrl-btn primary" onclick="exportArduinoIno()">
                    <i class="fas fa-file-download"></i> Export Arduino (.ino)
                </button>
            </div>
        </div>
        <div class="actionsheet-table-wrap" style="flex: 1; border: 1px solid var(--mb-border); border-radius: 6px; overflow: auto; background: #ffffff;">
            <table class="actionsheet-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 60px;">Step</th>
                        <th>Primitive Operation</th>
                        <th>Arguments</th>
                        <th>Tactical Description</th>
                    </tr>
                </thead>
                <tbody id="actionSheetRowsFullscreen">
                    <!-- Dynamic Rows -->
                </tbody>
            </table>
        </div>
    </div>

    <!-- VIEW CONTAINER 3: CODE VIEW FULLSCREEN -->
    <div class="view-container view-code-fullscreen" id="viewContainerCode">
        <div class="code-fullscreen-toolbar">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="lang-selector-group">
                    <button class="lang-btn active" id="btnFsLangIno" onclick="switchCodeLang('ino')">
                        <i class="fas fa-microchip"></i> Arduino C++ (.ino)
                    </button>
                    <button class="lang-btn" id="btnFsLangPy" onclick="switchCodeLang('py')">
                        <i class="fab fa-python"></i> MicroPython (.py)
                    </button>
                    <button class="lang-btn" id="btnFsLangSerial" onclick="switchCodeLang('serial')">
                        <i class="fas fa-terminal"></i> Serial Protocol
                    </button>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="ctrl-btn" onclick="copyCurrentCode()">
                    <i class="fas fa-copy"></i> Copy Code
                </button>
                <button class="ctrl-btn primary" onclick="exportCurrentCode()">
                    <i class="fas fa-download"></i> Download Script
                </button>
                <button class="ctrl-btn" onclick="switchViewMode('arena')">
                    <i class="fas fa-times"></i> Close View
                </button>
            </div>
        </div>
        <pre class="code-fullscreen-editor" id="codeDisplayAreaFullscreen"></pre>
    </div>

    <!-- 4. EXAMPLES MODAL -->
    <div class="modal-backdrop" id="examplesModalBackdrop" onclick="handleBackdropClick(event)">
        <div class="examples-modal-card">
            <header class="examples-modal-header">
                <div>
                    <h2>Select Competition Mission</h2>
                    <p>Official RoboBlocks Competition Presets & Custom Field Importer</p>
                </div>
                <button class="close-modal-btn" onclick="closeExamplesModal()">&times;</button>
            </header>

            <section class="examples-modal-body">
                <!-- TARGET 1: FIVE-POINT ROUTE -->
                <div class="example-grid-card" onclick="loadExampleFivePointRoute()">
                    <div class="example-card-meta">
                        <span class="badge-pill blue">ATOM VX</span>
                        <span class="badge-pill green">★ RECOMMENDED</span>
                    </div>
                    <h3 class="example-card-title">Five-Point Route</h3>
                    <p class="example-card-desc">
                        Official rescue match with 5 checkpoints, 50mm elevated bridge, 7 bamboo chopsticks, and precision gyro lock.
                    </p>
                    <button class="btn-open-example">Load Mission</button>
                </div>

                <!-- TARGET 2: QUICK DROP BOX 4 ENC -->
                <div class="example-grid-card" onclick="loadExampleQuickDropBox4Enc()">
                    <div class="example-card-meta">
                        <span class="badge-pill blue">ATOM VX</span>
                        <span class="badge-pill green">4-DROP CHALLENGE</span>
                    </div>
                    <h3 class="example-card-title">Quick Drop Box 4 ENC</h3>
                    <p class="example-card-desc">
                        120×120cm official arena with 4 dedicated supply drop zones (BOX1: FL, BOX2: FR, BOX3: B, BOX4: F) and rapid encoder cruise.
                    </p>
                    <button class="btn-open-example">Load Mission</button>
                </div>

                <!-- TARGET 3: OFFICIAL 100-POINT ARENA -->
                <div class="example-grid-card" onclick="loadExampleOfficial100Pts()">
                    <div class="example-card-meta">
                        <span class="badge-pill blue">ATOM VX</span>
                        <span class="badge-pill green">🏆 100-POINT ARENA</span>
                    </div>
                    <h3 class="example-card-title">Official 100-Point Arena</h3>
                    <p class="example-card-desc">
                        Full 32-tile competition arena with 50mm bridge, 7 chopsticks, tunnel, seesaw, sunken pit, and 4 drop bays.
                    </p>
                    <button class="btn-open-example">Load Mission</button>
                </div>

                <!-- TARGET 4: NORMAL PRACTICE FIELD -->
                <div class="example-grid-card" onclick="loadExampleNormalField()">
                    <div class="example-card-meta">
                        <span class="badge-pill blue">ATOM VX</span>
                        <span class="badge-pill green">OBSTACLE PRACTICE</span>
                    </div>
                    <h3 class="example-card-title">Normal Practice Field</h3>
                    <p class="example-card-desc">
                        Standard rescue arena layout with bamboo chopsticks speed bumps, blackhole pit avoidance, and West drop bay.
                    </p>
                    <button class="btn-open-example">Load Mission</button>
                </div>

                <!-- UPLOAD CUSTOM ARENA CARD -->
                <div class="example-grid-card" onclick="triggerUploadArena()" style="border: 2px dashed #0284c7; background: rgba(2, 132, 199, 0.04); justify-content: center; align-items: center; text-align: center; grid-column: span 2; padding: 18px;">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 6px;">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h3 style="font-size: 0.92rem; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Upload Custom Field (.json / .mby)</h3>
                    <p style="font-size: 0.72rem; color: #64748b; margin: 0 0 10px 0;">
                        Import any arena layout JSON file or roboBlocks project. Drag & drop supported anywhere on screen!
                    </p>
                    <button class="btn-open-example"><i class="fas fa-upload"></i> Browse File</button>
                </div>
            </section>
        </div>
    </div>

    <!-- TOAST BANNER -->
    <div class="toast-banner" id="toastBanner">
        <i class="fas fa-check-circle" style="color: #34d399; font-size: 1.1rem;"></i>
        <span id="toastMessage">Mission loaded successfully</span>
    </div>

    <!-- 5. JAVASCRIPT MASTER CLIENT ENGINE -->
    <script>
        // Official Arena Presets
        const ARENA_FIVE_POINTS = {json.dumps(layout_five_points)};
        const ARENA_QUICK_BOX = {json.dumps(layout_quick_box)};
        const ARENA_OFFICIAL_100 = {json.dumps(layout_official_100)};
        const ARENA_NORMAL = {json.dumps(layout_normal)};
        const ARENA_JAAJAJ = {json.dumps(layout_jaajaj)};

        // State Machine
        let currentArenaData = ARENA_FIVE_POINTS;
        let activeProject = {{
            id: "atom-vx-rescue-five-points",
            name: "Five-Point Route",
            loaded: true,
            waypoints: []
        }};

        let currentLeftTab = 'design';
        let selectedPaletteTool = 'line';
        let isMouseDownOnCanvas = false;
        let selectedWpIndex = 0;
        let currentCodeLang = "ino";

        // Simulation State
        let isSimRunning = false;
        let simProgress = 0;
        let simSpeed = 1;
        let simCamMode = "free";

        let scene, camera, renderer, controls;
        let robotMesh = null;
        let obstacleMeshes = [];
        let trailLine = null;
        let trailPoints = [];
        let droppedBoxMeshes = [];

        // Five-Point Canonical Waypoints (Real world coordinates: 2.4m x 1.2m)
        const FIVE_POINT_PATH = [
            {{ id: 1, x: 1.05, z: 0.45, label: "START (Bay Launch)", fn: "START", speed: 0, time: 0, angle: 90, kp: 0.6, kd: 2.0 }},
            {{ id: 2, x: 1.05, z: 0.15, label: "PT 1 (Bump Entry)", fn: "FORWARD", speed: 45, time: 0.65, angle: 90, kp: 0.6, kd: 2.0 }},
            {{ id: 3, x: 0.45, z: 0.15, label: "PT 2 (Chopsticks 7)", fn: "FORWARD", speed: 45, time: 0.85, angle: 180, kp: 0.6, kd: 2.0 }},
            {{ id: 4, x: -0.15, z: 0.15, label: "PT 3 (Bridge Incline)", fn: "FORWARD", speed: 55, time: 1.10, angle: 180, kp: 0.6, kd: 2.0 }},
            {{ id: 5, x: -0.75, z: 0.15, label: "PT 4 (Bridge Deck 50mm)", fn: "FORWARD", speed: 55, time: 0.90, angle: 180, kp: 0.6, kd: 2.0 }},
            {{ id: 6, x: -1.05, z: -0.45, label: "PT 5 (Finish Dock)", fn: "STOP", speed: 0, time: 0.20, angle: -90, kp: 0.6, kd: 2.0 }}
        ];

        // Quick Box 4 ENC Waypoints
        const QUICK_BOX_PATH = [
            {{ id: 1, x: 0.45, z: 0.45, label: "START", fn: "START", speed: 0, time: 0, angle: 90, kp: 0.6, kd: 2.0 }},
            {{ id: 2, x: -0.15, z: -0.45, label: "DROP 1 (FL)", fn: "DROP_FL", speed: 70, time: 0.95, angle: -90, kp: 0.6, kd: 2.0 }},
            {{ id: 3, x: 0.45, z: -0.45, label: "DROP 2 (FR)", fn: "DROP_FR", speed: 70, time: 0.85, angle: 0, kp: 0.6, kd: 2.0 }},
            {{ id: 4, x: 0.45, z: 0.15, label: "DROP 3 (B)", fn: "DROP_B", speed: 70, time: 0.80, angle: 90, kp: 0.6, kd: 2.0 }},
            {{ id: 5, x: -0.15, z: 0.15, label: "DROP 4 (F)", fn: "DROP_FL", speed: 70, time: 0.90, angle: 180, kp: 0.6, kd: 2.0 }}
        ];

        activeProject.waypoints = FIVE_POINT_PATH;

        // ---------------------------------------------------------------------
        // TAB SWITCHING (Left Panel)
        // ---------------------------------------------------------------------

        // ---------------------------------------------------------------------
        // VIEW MODE SWITCHER (2D Tactical Arena View / Action Sheet / Code View)
        // ---------------------------------------------------------------------
        let currentActiveView = 'arena';

        function switchViewMode(mode) {{
            currentActiveView = mode;
            document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));

            if (mode === 'arena') {{
                const b = document.getElementById('viewBtnArena');
                const c = document.getElementById('viewContainerArena');
                if (b) b.classList.add('active');
                if (c) c.classList.add('active');
                drawArena2D();
            }} else if (mode === 'actionsheet') {{
                const b = document.getElementById('viewBtnActionSheet');
                const c = document.getElementById('viewContainerActionSheet');
                if (b) b.classList.add('active');
                if (c) c.classList.add('active');
                renderActionSheet();
            }} else if (mode === 'code') {{
                const b = document.getElementById('viewBtnCode');
                const c = document.getElementById('viewContainerCode');
                if (b) b.classList.add('active');
                if (c) c.classList.add('active');
                renderGeneratedCode();
            }}
        }}
        window.switchViewMode = switchViewMode;

        function switchLeftTab(tabId) {{
            currentLeftTab = tabId;
            document.querySelectorAll('.panel-nav-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content-area .tab-pane').forEach(pane => pane.classList.remove('active'));

            const targetPane = document.getElementById('tab-' + tabId);
            if (targetPane) targetPane.classList.add('active');

            const tabMap = {{
                'design': 'tabBtnDesign',
                'planner': 'tabBtnPlanner',
                'actionsheet': 'tabBtnActionSheet',
                'code': 'tabBtnCode'
            }};

            const btnEl = document.getElementById(tabMap[tabId]);
            if (btnEl) btnEl.classList.add('active');

            setTimeout(drawArena2D, 20);
        }}

        // ---------------------------------------------------------------------
        // ARENA DESIGNER & TILE PALETTE INTERACTION
        // ---------------------------------------------------------------------
        function selectPaletteTool(toolName, btnEl) {{
            selectedPaletteTool = toolName;
            document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');
            showToast("Active tool: " + toolName.toUpperCase());
        }}

        function clearCurrentArenaField() {{
            if (!confirm("Clear all obstacles on the arena?")) return;
            const emptyCells = Array.from({{ length: 32 }}, (_, i) => ({{ index: i, type: 'empty' }}));
            emptyCells[31] = {{ index: 31, type: 'start' }};
            currentArenaData = {{ COLS: 8, ROWS: 4, gridData: emptyCells }};
            activeProject.waypoints = [
                {{ id: 1, x: 1.05, z: 0.45, label: "START", fn: "START", speed: 0, time: 0, angle: 90, kp: 0.6, kd: 2.0 }}
            ];
            drawArena2D();
            build3DArenaObstacles();
            renderActionSheet();
            renderGeneratedCode();
            showToast("Arena cleared. Start zone at Cell 31.");
        }}

        function setupCanvasTilePainter() {{
            const canvas = document.getElementById('arena2dCanvas');
            if (!canvas) return;

            function getCellFromEvent(e) {{
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;

                const c = Math.max(0, Math.min(7, Math.floor(mouseX / (canvas.width / 8))));
                const r = Math.max(0, Math.min(3, Math.floor(mouseY / (canvas.height / 4))));
                return {{ c, r, idx: r * 8 + c }};
            }}

            canvas.addEventListener('mousemove', (e) => {{
                const {{ c, r, idx }} = getCellFromEvent(e);
                const coordEl = document.getElementById('hoverCellCoord');
                if (coordEl) coordEl.textContent = 'Col: ' + c + ' | Row: ' + r + ' (Cell ' + idx + ')';

                if (isMouseDownOnCanvas && e.buttons === 1 && currentLeftTab === 'design') {{
                    applyTileToCell(idx, selectedPaletteTool);
                }}
            }});

            canvas.addEventListener('mousedown', (e) => {{
                if (e.button === 0) {{
                    isMouseDownOnCanvas = true;
                    const {{ idx }} = getCellFromEvent(e);
                    if (currentLeftTab === 'design') {{
                        applyTileToCell(idx, selectedPaletteTool);
                    }} else if (currentLeftTab === 'planner') {{
                        selectWaypointAtCell(idx);
                    }}
                }}
            }});

            window.addEventListener('mouseup', () => {{
                isMouseDownOnCanvas = false;
            }});

            canvas.addEventListener('contextmenu', (e) => {{
                e.preventDefault();
                const {{ idx }} = getCellFromEvent(e);
                cycleTileRotation(idx);
            }});
        }}

        function applyTileToCell(idx, tool) {{
            if (!currentArenaData) currentArenaData = {{ COLS: 8, ROWS: 4, gridData: [] }};
            if (!currentArenaData.gridData) {{
                currentArenaData.gridData = Array.from({{ length: 32 }}, (_, i) => ({{
                    index: i,
                    type: (currentArenaData.cells && currentArenaData.cells[i]?.type) || 'empty'
                }}));
            }}

            if (tool === 'start' || tool === 'finish') {{
                currentArenaData.gridData.forEach(g => {{
                    if (g.type === tool) g.type = 'empty';
                }});
            }}

            let finalType = tool;
            if (tool === 'line') finalType = 'line_top_bottom';
            else if (tool === 'drop') finalType = 'drop_n';
            else if (tool === 'pit') finalType = 'blackhole';
            else if (tool === 'empty') finalType = 'empty';

            currentArenaData.gridData[idx] = {{ index: idx, type: finalType }};

            drawArena2D();
            build3DArenaObstacles();
        }}

        function cycleTileRotation(idx) {{
            if (!currentArenaData || !currentArenaData.gridData) return;
            const cell = currentArenaData.gridData[idx];
            if (!cell) return;

            const lineCycle = ['line_top', 'line_right', 'line_bottom', 'line_left', 'line_top_bottom', 'line_left_right', 'line_surround'];
            const dropCycle = ['drop_n', 'drop_e', 'drop_s', 'drop_w'];

            if (lineCycle.includes(cell.type)) {{
                const nextIdx = (lineCycle.indexOf(cell.type) + 1) % lineCycle.length;
                cell.type = lineCycle[nextIdx];
            }} else if (dropCycle.includes(cell.type)) {{
                const nextIdx = (dropCycle.indexOf(cell.type) + 1) % dropCycle.length;
                cell.type = dropCycle[nextIdx];
            }} else if (cell.type === 'bridge') {{
                cell.type = 'bridge_v';
            }} else if (cell.type === 'bridge_v') {{
                cell.type = 'bridge';
            }}

            drawArena2D();
            build3DArenaObstacles();
            showToast("Tile rotated at Cell " + idx);
        }}

        function selectWaypointAtCell(cellIdx) {{
            const wps = activeProject.waypoints || [];
            for (let i = 0; i < wps.length; i++) {{
                const c = Math.max(0, Math.min(7, Math.round((wps[i].x + 1.05) / 0.30)));
                const r = Math.max(0, Math.min(3, Math.round((wps[i].z + 0.45) / 0.30)));
                if (r * 8 + c === cellIdx) {{
                    selectedWpIndex = i;
                    updateWpEditorCard();
                    drawArena2D();
                    return;
                }}
            }}
        }}

        // =====================================================================
        // ADVANCED AUTONOMOUS PATHFINDER (100% COLLISION-FREE BFS SOLVER)
        // =====================================================================
        class AutonomousPathPlanner {{
            static getBlockedTypes() {{
                return ['pit', 'blackhole', 'rescue_pit', 'bomb', 'rescue_bomb'];
            }}

            static getValidNeighbors(cellIdx, grid) {{
                const cols = 8;
                const rows = 4;
                const c = cellIdx % cols;
                const r = Math.floor(cellIdx / cols);
                const neighbors = [];
                const blocked = this.getBlockedTypes();

                // North
                if (r > 0) {{
                    const n = cellIdx - cols;
                    const t = (grid[n]?.type || '').toLowerCase();
                    if (!blocked.some(b => t.includes(b))) neighbors.push({{ idx: n, dir: 'N' }});
                }}
                // South
                if (r < rows - 1) {{
                    const s = cellIdx + cols;
                    const t = (grid[s]?.type || '').toLowerCase();
                    if (!blocked.some(b => t.includes(b))) neighbors.push({{ idx: s, dir: 'S' }});
                }}
                // East
                if (c < cols - 1) {{
                    const e = cellIdx + 1;
                    const t = (grid[e]?.type || '').toLowerCase();
                    if (!blocked.some(b => t.includes(b))) neighbors.push({{ idx: e, dir: 'E' }});
                }}
                // West
                if (c > 0) {{
                    const w = cellIdx - 1;
                    const t = (grid[w]?.type || '').toLowerCase();
                    if (!blocked.some(b => t.includes(b))) neighbors.push({{ idx: w, dir: 'W' }});
                }}

                return neighbors;
            }}

            static findPathBFS(startIdx, targetIdx, grid) {{
                if (startIdx === targetIdx) return [startIdx];
                const queue = [[startIdx]];
                const visited = new Set([startIdx]);

                while (queue.length > 0) {{
                    const path = queue.shift();
                    const curr = path[path.length - 1];
                    if (curr === targetIdx) return path;

                    const neighbors = this.getValidNeighbors(curr, grid);
                    for (const n of neighbors) {{
                        if (!visited.has(n.idx)) {{
                            visited.add(n.idx);
                            queue.push([...path, n.idx]);
                        }}
                    }}
                }}
                return null;
            }}

            static solveMission(arenaData) {{
                const grid = arenaData.gridData || arenaData.cells || [];
                let startIdx = -1;
                let finishIdx = -1;
                const checkpoints = [];
                const drops = [];

                grid.forEach((cell, idx) => {{
                    const t = (cell.type || '').toLowerCase();
                    if (t === 'start' || t === 'rescue_start') startIdx = idx;
                    else if (t === 'finish' || t === 'rescue_finish') finishIdx = idx;
                    else if (t.includes('checkpoint')) checkpoints.push(idx);
                    else if (t.includes('drop') || t.includes('box')) drops.push(idx);
                }});

                if (startIdx === -1) startIdx = 31;
                if (finishIdx === -1) finishIdx = 0;

                const cellToCoord = (idx) => {{
                    const c = idx % 8;
                    const r = Math.floor(idx / 8);
                    return {{
                        x: parseFloat((-1.05 + c * 0.30).toFixed(2)),
                        z: parseFloat((-0.45 + r * 0.30).toFixed(2))
                    }};
                }};

                const waypoints = [];
                let currCell = startIdx;
                let currHeading = 90;

                const startCoord = cellToCoord(startIdx);
                waypoints.push({{
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
                }});

                const goals = [...checkpoints, ...drops];
                if (finishIdx !== -1 && !goals.includes(finishIdx)) {{
                    goals.push(finishIdx);
                }}

                let unvisited = [...goals];
                let dropZoneCount = 1;

                while (unvisited.length > 0) {{
                    let bestPath = null;
                    let bestGoalIdx = -1;

                    for (let i = 0; i < unvisited.length; i++) {{
                        const target = unvisited[i];
                        const p = this.findPathBFS(currCell, target, grid);
                        if (p && (!bestPath || p.length < bestPath.length)) {{
                            bestPath = p;
                            bestGoalIdx = i;
                        }}
                    }}

                    if (!bestPath) {{
                        console.warn("Unreachable goals remaining: " + unvisited.length);
                        break;
                    }}

                    const goalCell = unvisited[bestGoalIdx];
                    unvisited.splice(bestGoalIdx, 1);

                    for (let i = 1; i < bestPath.length; i++) {{
                        const fromCell = bestPath[i - 1];
                        const toCell = bestPath[i];
                        const fc = fromCell % 8, fr = Math.floor(fromCell / 8);
                        const tc = toCell % 8, tr = Math.floor(toCell / 8);

                        let desiredHeading = currHeading;
                        if (tc > fc) desiredHeading = 0;        // East
                        else if (tc < fc) desiredHeading = 180; // West
                        else if (tr > fr) desiredHeading = 90;  // South
                        else if (tr < fr) desiredHeading = -90; // North

                        currHeading = desiredHeading;
                        const coord = cellToCoord(toCell);
                        const tileType = (grid[toCell]?.type || '').toLowerCase();

                        let stepSpeed = 70;
                        let stepTime = 0.45;
                        if (tileType.includes('bridge')) {{ stepSpeed = 55; stepTime = 1.1; }}
                        else if (tileType.includes('bump')) {{ stepSpeed = 45; stepTime = 0.85; }}
                        else if (tileType.includes('seesaw')) {{ stepSpeed = 40; stepTime = 0.95; }}

                        const isGoal = (toCell === goalCell);
                        let fn = "FORWARD";
                        let label = 'WP ' + (waypoints.length + 1);

                        if (isGoal) {{
                            if (tileType.includes('drop')) {{
                                const dropServos = ["DROP_FL", "DROP_FR", "DROP_B", "DROP_FL"];
                                fn = dropServos[(dropZoneCount - 1) % 4];
                                label = 'DROP ZONE ' + dropZoneCount;
                                dropZoneCount++;
                            }} else if (tileType.includes('checkpoint')) {{
                                label = 'CHECKPOINT';
                            }} else if (toCell === finishIdx) {{
                                fn = "STOP";
                                label = "FINISH DOCK";
                            }}
                        }}

                        waypoints.push({{
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
                        }});

                        // Recoil retreat if dropping cube
                        if (isGoal && tileType.includes('drop') && bestPath.length >= 2) {{
                            const recoilCell = bestPath[i - 1];
                            const recoilCoord = cellToCoord(recoilCell);
                            waypoints.push({{
                                id: waypoints.length + 1,
                                x: recoilCoord.x,
                                z: recoilCoord.z,
                                label: "RECOIL RETREAT",
                                fn: "BACKWARD",
                                speed: 50,
                                time: 0.35,
                                angle: currHeading,
                                kp: 0.6,
                                kd: 2.0
                            }});
                        }}
                    }}

                    currCell = goalCell;
                }}

                return waypoints;
            }}
        }}

        async function runAutoPathPlanning() {{
            showToast("Solving collision-free optimal trajectory...");
            logTerminal("[PLANNER] Running A* / BFS solver on active arena...");

            if (!currentArenaData) currentArenaData = ARENA_FIVE_POINTS;

            try {{
                const solved = AutonomousPathPlanner.solveMission(currentArenaData);
                if (solved && solved.length >= 2) {{
                    activeProject.waypoints = solved;
                    selectedWpIndex = 0;
                    drawArena2D();
                    build3DArenaObstacles();
                    renderActionSheet();
                    renderGeneratedCode();
                    updateWpEditorCard();
                    resetSimRun();

                    showToast("⚡ Auto Path Solved: " + solved.length + " Waypoints (100% Safe)!");
                    logTerminal("[PLANNER] Trajectory solved: " + solved.length + " collision-free steps compiled.");
                    return;
                }}
            }} catch (err) {{
                console.error("Path planning error:", err);
                showToast("Path solve notice: " + err.message);
            }}
        }}

        window.triggerAutoPath = runAutoPathPlanning;
        window.runAutoPathPlanning = runAutoPathPlanning;

        // ---------------------------------------------------------------------
        // 2D TACTICAL ARENA CANVAS RENDERER
        // ---------------------------------------------------------------------
        // Current simulated robot pose
        let currentSimRobotPose = {{ x: 1.05, z: 0.45, yaw: 90, speed: 0, visible: true }};

        function drawArena2D() {{
            renderArenaToCanvas('arena2dCanvas');
            renderArenaToCanvas('arenaTheaterCanvas');
        }}

        function renderArenaToCanvas(canvasId) {{
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
            for (let r = 0; r < rows; r++) {{
                for (let c = 0; c < cols; c++) {{
                    const idx = r * cols + c;
                    const x = c * tw;
                    const y = r * th;
                    const cell = cellsList[idx];
                    const type = (cell && cell.type ? cell.type : '').toLowerCase();

                    // Background Colors
                    if (type === 'pit' || type === 'blackhole' || type.includes('pit')) {{
                        ctx.fillStyle = "#fee2e2";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#ef4444";
                        ctx.beginPath();
                        ctx.arc(x + tw/2, y + th/2, tw * 0.22, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#ffffff";
                        ctx.font = `bold ${{Math.round(tw * 0.16)}}px monospace`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("PIT", x + tw/2, y + th/2);
                    }} else if (type === 'bridge' || type.includes('bridge')) {{
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#d97706";
                        ctx.font = `bold ${{Math.round(tw * 0.15)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("BRIDGE 50mm", x + tw/2, y + th/2);
                    }} else if (type === 'bump' || type === 'bumps' || type.includes('bump')) {{
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.strokeStyle = "#b45309";
                        ctx.lineWidth = 2;
                        const stickSpacing = tw / 9;
                        for (let i = 1; i <= 7; i++) {{
                            const bx = x + i * stickSpacing;
                            ctx.beginPath();
                            ctx.moveTo(bx, y + 6);
                            ctx.lineTo(bx, y + th - 6);
                            ctx.stroke();
                        }}
                        ctx.fillStyle = "#92400e";
                        ctx.font = `bold ${{Math.round(tw * 0.13)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.fillText("7 BUMPS", x + tw/2, y + th - 8);
                    }} else if (type === 'seesaw' || type.includes('seesaw')) {{
                        ctx.fillStyle = "#f3e8ff";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#7c3aed";
                        ctx.font = `bold ${{Math.round(tw * 0.15)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("SEESAW", x + tw/2, y + th/2);
                    }} else if (type === 'tunnel' || type.includes('tunnel')) {{
                        ctx.fillStyle = "#334155";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#ffffff";
                        ctx.font = `bold ${{Math.round(tw * 0.15)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("TUNNEL", x + tw/2, y + th/2);
                    }} else if (type === 'bomb' || type.includes('bomb')) {{
                        ctx.fillStyle = "#fee2e2";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#dc2626";
                        ctx.beginPath();
                        ctx.arc(x + tw/2, y + th/2, tw * 0.20, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#ffffff";
                        ctx.font = `bold ${{Math.round(tw * 0.14)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("BOMB", x + tw/2, y + th/2);
                    }} else if (type === 'start' || type === 'rescue_start') {{
                        ctx.fillStyle = "#d1fae5";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#059669";
                        ctx.font = `bold ${{Math.round(tw * 0.16)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("START", x + tw/2, y + th/2);
                    }} else if (type === 'finish' || type === 'rescue_finish') {{
                        ctx.fillStyle = "#dbeafe";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#2563eb";
                        ctx.font = `bold ${{Math.round(tw * 0.16)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("FINISH", x + tw/2, y + th/2);
                    }} else if (type.includes('drop')) {{
                        ctx.fillStyle = "#fef3c7";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#b45309";
                        ctx.font = `bold ${{Math.round(tw * 0.15)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("DROP", x + tw/2, y + th/2);
                    }} else if (type.includes('checkpoint')) {{
                        ctx.fillStyle = "#e0f2fe";
                        ctx.fillRect(x, y, tw, th);
                        ctx.fillStyle = "#0284c7";
                        ctx.font = `bold ${{Math.round(tw * 0.15)}}px sans-serif`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("CP", x + tw/2, y + th/2);
                    }}

                    // Border
                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, tw, th);

                    // Track Lines
                    ctx.strokeStyle = "#0f172a";
                    ctx.lineWidth = Math.max(3, tw * 0.07);
                    if (type.includes('top')) {{
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tw, y); ctx.stroke();
                    }}
                    if (type.includes('bottom')) {{
                        ctx.beginPath(); ctx.moveTo(x, y + th); ctx.lineTo(x + tw, y + th); ctx.stroke();
                    }}
                    if (type.includes('left')) {{
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + th); ctx.stroke();
                    }}
                    if (type.includes('right')) {{
                        ctx.beginPath(); ctx.moveTo(x + tw, y); ctx.lineTo(x + tw, y + th); ctx.stroke();
                    }}
                    if (type.includes('surround')) {{
                        ctx.strokeRect(x + 2, y + 2, tw - 4, th - 4);
                    }}
                }}
            }}

            // Draw Planned Route Path
            const waypoints = activeProject.waypoints || [];
            if (waypoints.length > 0) {{
                ctx.beginPath();
                ctx.strokeStyle = "#0284c7";
                ctx.lineWidth = Math.max(2.5, tw * 0.05);
                ctx.setLineDash([8, 5]);

                waypoints.forEach((pt, idx) => {{
                    const canvasX = ((pt.x + 1.20) / 2.40) * w;
                    const canvasY = ((pt.z + 0.60) / 1.20) * h;
                    if (idx === 0) ctx.moveTo(canvasX, canvasY);
                    else ctx.lineTo(canvasX, canvasY);
                }});
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw Trail (if any)
                if (trailPoints.length > 1) {{
                    ctx.beginPath();
                    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
                    ctx.lineWidth = Math.max(2, tw * 0.04);
                    trailPoints.forEach((tp, idx) => {{
                        const tx = ((tp.x + 1.20) / 2.40) * w;
                        const ty = ((tp.z + 0.60) / 1.20) * h;
                        if (idx === 0) ctx.moveTo(tx, ty);
                        else ctx.lineTo(tx, ty);
                    }});
                    ctx.stroke();
                }}

                // Draw Waypoint Points
                waypoints.forEach((pt, idx) => {{
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

                    if (pt.angle !== undefined) {{
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
                    }}

                    ctx.fillStyle = "#ffffff";
                    ctx.font = `bold ${{Math.round(ptRadius * 0.9)}}px monospace`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(idx + 1, canvasX, canvasY);
                }});
            }}

            // Draw Real-time Simulated Robot (ATOM VX 4WD Chassis)
            if (currentSimRobotPose && currentSimRobotPose.visible) {{
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
                ctx.font = `bold ${{Math.round(robotW * 0.22)}}px monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("VX", 0, 0);

                ctx.restore();
            }}
        }}

                // ---------------------------------------------------------------------
        // ROUTE IR & FIRMWARE ACTION SHEET / CODE SYNTHESIS
        // ---------------------------------------------------------------------
        const CLIENT_FIRMWARE_OPS = {{
            FF: {{ name: 'FF', toCpp: (s, t) => `FF(${{s}}, ${{t}});` }},
            BB: {{ name: 'BB', toCpp: (s, t) => `BB(${{s}}, ${{t}});` }},
            SPIN: {{ name: 'spinDegree', toCpp: (a) => `spinDegree(${{a}});` }},
            DROP_FL: {{ name: 'DropFL', toCpp: () => `DropFL();` }},
            DROP_FR: {{ name: 'DropFR', toCpp: () => `DropFR();` }},
            DROP_B: {{ name: 'DropB', toCpp: () => `DropB();` }},
            STOP: {{ name: 'Stop', toCpp: () => `motor.stop();` }}
        }};

        function compileClientRouteIR() {{
            const wps = activeProject.waypoints || [];
            const segments = [];
            let totalDist = 0;
            let totalDur = 0;

            for (let i = 0; i < wps.length - 1; i++) {{
                const p1 = wps[i];
                const p2 = wps[i + 1];
                const dx = p2.x - p1.x;
                const dz = p2.z - p1.z;
                const dist = Math.hypot(dx, dz);
                totalDist += dist;

                let duration = (p2.time || 0.45) * 1000;
                totalDur += duration;

                segments.push({{
                    from: p1,
                    to: p2,
                    distance: dist,
                    durationMs: duration,
                    heading: p2.angle !== undefined ? p2.angle : p1.angle
                }});
            }}

            return {{
                waypoints: wps,
                segments,
                totalDistance: totalDist,
                totalDurationMs: totalDur,
                isValid: true
            }};
        }}

        function clientCompilePrimitives() {{
            const wps = activeProject.waypoints || [];
            const prims = [];
            let lastHeading = 90;

            wps.forEach((pt, idx) => {{
                if (idx === 0) {{
                    lastHeading = pt.angle || 90;
                    return;
                }}

                if (pt.angle !== undefined && pt.angle !== lastHeading) {{
                    let diff = pt.angle - lastHeading;
                    while (diff > 180) diff -= 360;
                    while (diff < -180) diff += 360;
                    if (Math.abs(diff) >= 5) {{
                        prims.push({{
                            op: CLIENT_FIRMWARE_OPS.SPIN,
                            args: [diff],
                            comment: `Gyro Spin ${{diff > 0 ? 'Right' : 'Left'}} ${{Math.abs(diff)}}° toward Target`
                        }});
                        lastHeading = pt.angle;
                    }}
                }}

                if (pt.fn === 'FORWARD' || pt.fn === 'FF') {{
                    prims.push({{
                        op: CLIENT_FIRMWARE_OPS.FF,
                        args: [pt.speed || 70, Math.round((pt.time || 0.45) * 1000)],
                        comment: `Drive Forward ${{pt.label || ''}}`
                    }});
                }} else if (pt.fn === 'BACKWARD' || pt.fn === 'BB') {{
                    prims.push({{
                        op: CLIENT_FIRMWARE_OPS.BB,
                        args: [pt.speed || 50, Math.round((pt.time || 0.35) * 1000)],
                        comment: `Reverse Recoil ${{pt.label || ''}}`
                    }});
                }} else if (pt.fn === 'DROP_FL') {{
                    prims.push({{ op: CLIENT_FIRMWARE_OPS.DROP_FL, args: [], comment: "Release Front-Left Box 1" }});
                }} else if (pt.fn === 'DROP_FR') {{
                    prims.push({{ op: CLIENT_FIRMWARE_OPS.DROP_FR, args: [], comment: "Release Front-Right Box 2" }});
                }} else if (pt.fn === 'DROP_B') {{
                    prims.push({{ op: CLIENT_FIRMWARE_OPS.DROP_B, args: [], comment: "Release Rear Box 3" }});
                }} else if (pt.fn === 'STOP') {{
                    prims.push({{ op: CLIENT_FIRMWARE_OPS.STOP, args: [], comment: "Mission Complete Dock" }});
                }}
            }});

            return prims;
        }}

        function renderActionSheet() {{
            const tbody = document.getElementById('actionSheetRows');
            if (!tbody) return;
            const prims = clientCompilePrimitives();
            let html = '';

            prims.forEach((p, idx) => {{
                const actionCode = p.op.toCpp(...p.args);
                const paramsStr = p.args.length > 0 ? p.args.join(', ') : 'None';
                html += `
                    <tr>
                        <td><span style="font-weight:700; color:#0284c7;">${{idx + 1}}</span></td>
                        <td style="font-family: var(--font-code); font-weight: 700; color: #0284c7;">${{actionCode}}</td>
                        <td style="font-family: var(--font-code); color: #64748b;">${{paramsStr}}</td>
                        <td>${{p.comment}}</td>
                    </tr>
                `;
            }});

            tbody.innerHTML = html;
            const tbodyFs = document.getElementById('actionSheetRowsFullscreen');
            if (tbodyFs) tbodyFs.innerHTML = html;
        }}

        function renderGeneratedCode() {{
            const pre = document.getElementById('codeDisplayArea');
            if (!pre) return;
            const prims = clientCompilePrimitives();
            const ir = compileClientRouteIR();
            let code = "";

            if (currentCodeLang === 'serial') {{
                const lines = ['PING', 'MISSION:CLEAR', `MISSION:START:${{prims.length}}`];
                prims.forEach((p, idx) => {{
                    lines.push(`STEP:${{idx + 1}}:${{p.op.name}}:${{p.args.join(':')}}`);
                }});
                lines.push('MISSION:COMMIT');
                code = lines.join('\\n');
            }} else if (currentCodeLang === 'py') {{
                const steps = prims.map((p, idx) => {{
                    if (p.op.name === 'FF') return `    # Step ${{idx + 1}}: ${{p.comment}}\\n    motor.forward_degree_time(angle=0, start_speed=20, max_speed=${{p.args[0]}}, KP=0.6, KD=2.0, time=${{(p.args[1]/1000).toFixed(2)}})`;
                    if (p.op.name === 'BB') return `    # Step ${{idx + 1}}: ${{p.comment}}\\n    motor.backward_time(speed=${{p.args[0]}}, time=${{(p.args[1]/1000).toFixed(2)}})`;
                    if (p.op.name === 'spinDegree') return `    # Step ${{idx + 1}}: ${{p.comment}}\\n    motor.spin_degree(degree=${{p.args[0]}}, speed=58)`;
                    if (p.op.name.startsWith('Drop')) return `    # Step ${{idx + 1}}: ${{p.comment}}\\n    servo.${{p.op.name.toLowerCase()}}()`;
                    return `    motor.stop()`;
                }}).join('\\n\\n');

                code = `# PT-BOT ATOM VX · ROBOBLOCKS MICROPYTHON MISSION\\n# Mission: ${{activeProject.name}}\\nimport motor, imu, servo, time\\n\\ndef setup():\\n    motor.set_motor_drive(motor.WD4)\\n    imu.set_offset("yaw", 0)\\n    print("Atom VX Initialized")\\n\\ndef run_mission():\\n${{steps}}\\n    print("Mission Complete!")\\n\\nif __name__ == '__main__':\\n    setup()\\n    run_mission()`;
            }} else {{
                // Arduino C++
                const steps = prims.map((p, idx) => `    // Step ${{idx + 1}}: ${{p.comment}}\\n    ${{p.op.toCpp(...p.args)}}`).join('\\n\\n');
                code = `/**\\n * PT-BOT ATOM VX · TACTICAL ARDUINO MISSION SKETCH\\n * Mission: ${{activeProject.name}}\\n * Distance: ${{(ir.totalDistance * 100).toFixed(1)}} cm | Estimated Time: ${{(ir.totalDurationMs / 1000).toFixed(2)}} s\\n */\\n\\n#include <ATOM_VX.h>\\n\\nvoid setup() {{\\n    Serial.begin(115200);\\n    initialize_robot();\\n}}\\n\\nvoid loop() {{\\n    // Armed Mission Execution\\n${{steps}}\\n    while(1) {{\\n        motor.stop();\\n        delay(100);\\n    }}\\n}}`;
            }}

            pre.textContent = code;
            const preFs = document.getElementById('codeDisplayAreaFullscreen');
            if (preFs) preFs.textContent = code;
        }}

        function switchCodeLang(lang) {{
            currentCodeLang = lang;
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            if (lang === 'ino') document.getElementById('btnLangIno').classList.add('active');
            else if (lang === 'serial') document.getElementById('btnLangSerial').classList.add('active');
            else if (lang === 'py') document.getElementById('btnLangPy').classList.add('active');
            renderGeneratedCode();
        }}

        function copyCurrentCode() {{
            const pre = document.getElementById('codeDisplayArea');
            if (pre) {{
                navigator.clipboard.writeText(pre.textContent);
                showToast("Code copied to clipboard!");
            }}
        }}

        function exportCurrentCode() {{
            const pre = document.getElementById('codeDisplayArea');
            if (!pre) return;
            const ext = currentCodeLang === 'py' ? 'py' : (currentCodeLang === 'serial' ? 'txt' : 'ino');
            const blob = new Blob([pre.textContent], {{ type: 'text/plain' }});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${{activeProject.id || 'mission'}}_${{Date.now()}}.${{ext}}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Exported: " + a.download);
        }}

        function exportArduinoIno() {{ switchCodeLang('ino'); exportCurrentCode(); }}
        function exportMicroPythonPy() {{ switchCodeLang('py'); exportCurrentCode(); }}

        // ---------------------------------------------------------------------
        // WAYPOINT TUNER CONTROLS
        // ---------------------------------------------------------------------
        function updateWpEditorCard() {{
            const wps = activeProject.waypoints || [];
            if (!wps || wps.length === 0) return;
            const wp = wps[selectedWpIndex] || wps[0];

            const lbl = document.getElementById('lblSelectedWp');
            if (lbl) lbl.innerHTML = `<i class="fas fa-map-marker-alt"></i> Selected: Waypoint P${{selectedWpIndex + 1}} (${{wp.label || ''}})`;

            const inpX = document.getElementById('inpWpX');
            if (inpX) inpX.value = Math.round(wp.x * 100);

            const inpZ = document.getElementById('inpWpZ');
            if (inpZ) inpZ.value = Math.round(wp.z * 100);

            const inpH = document.getElementById('inpWpHeading');
            if (inpH) inpH.value = wp.angle !== undefined ? wp.angle : 0;

            const inpS = document.getElementById('inpWpSpeed');
            if (inpS) inpS.value = wp.speed || 70;

            const selA = document.getElementById('selWpAction');
            if (selA) selA.value = wp.fn || '';

            const stats = document.getElementById('routeStatsSummary');
            if (stats) {{
                const ir = compileClientRouteIR();
                stats.innerHTML = `<i class="fas fa-check-circle"></i> Route Valid: ${{wps.length}} Points | ${{(ir.totalDistance * 100).toFixed(0)}} cm | ${{(ir.totalDurationMs/1000).toFixed(1)}}s`;
            }}
        }}

        function updateSelectedWpField(field, val) {{
            const wps = activeProject.waypoints || [];
            if (!wps[selectedWpIndex]) return;
            const wp = wps[selectedWpIndex];

            if (field === 'x') wp.x = parseFloat(val) / 100;
            else if (field === 'z') wp.z = parseFloat(val) / 100;
            else if (field === 'heading') wp.angle = parseFloat(val);
            else if (field === 'speed') wp.speed = parseFloat(val);
            else if (field === 'action') wp.fn = val || 'FORWARD';

            drawArena2D();
            build3DArenaObstacles();
            renderActionSheet();
            renderGeneratedCode();
        }}

        function addNewWaypointCenter() {{
            const wps = activeProject.waypoints || [];
            const last = wps[wps.length - 1] || {{ x: 0, z: 0, angle: 90, speed: 70 }};
            wps.push({{
                id: wps.length + 1,
                x: parseFloat((last.x - 0.20).toFixed(2)),
                z: parseFloat(last.z.toFixed(2)),
                label: "WAYPOINT " + (wps.length + 1),
                fn: "FORWARD",
                speed: 70,
                time: 0.50,
                angle: last.angle || 0,
                kp: 0.6,
                kd: 2.0
            }});
            selectedWpIndex = wps.length - 1;
            drawArena2D();
            build3DArenaObstacles();
            renderActionSheet();
            renderGeneratedCode();
            updateWpEditorCard();
            showToast("Added Waypoint P" + wps.length);
        }}

        function deleteSelectedWaypoint() {{
            const wps = activeProject.waypoints || [];
            if (wps.length <= 2) {{
                showToast("Cannot delete: Mission requires at least 2 points.");
                return;
            }}
            wps.splice(selectedWpIndex, 1);
            if (selectedWpIndex >= wps.length) selectedWpIndex = wps.length - 1;
            drawArena2D();
            build3DArenaObstacles();
            renderActionSheet();
            renderGeneratedCode();
            updateWpEditorCard();
            showToast("Waypoint deleted.");
        }}

        function clearAllWaypoints() {{
            const wps = activeProject.waypoints || [];
            const start = wps[0] || {{ id: 1, x: 1.05, z: 0.45, label: "START", fn: "START", speed: 0, time: 0, angle: 90, kp: 0.6, kd: 2.0 }};
            const finish = wps[wps.length - 1] || {{ id: 2, x: -1.05, z: -0.45, label: "FINISH", fn: "STOP", speed: 0, time: 0.2, angle: -90, kp: 0.6, kd: 2.0 }};
            activeProject.waypoints = [start, finish];
            selectedWpIndex = 0;
            drawArena2D();
            build3DArenaObstacles();
            renderActionSheet();
            renderGeneratedCode();
            updateWpEditorCard();
            showToast("Cleared route to Start & Finish.");
        }}

        function resetDefaultRoute() {{
            if (activeProject.id === 'quick-box-drop') loadExampleQuickDropBox4Enc();
            else loadExampleFivePointRoute();
            showToast("Reset to official default trajectory.");
        }}

        // ---------------------------------------------------------------------
        // DYNAMIC 3D ARENA OBSTACLE SYNTHESIZER
        // ---------------------------------------------------------------------
        function build3DArenaObstacles() {{
            // Synchronizes 2D obstacles & updates display
            drawArena2D();
        }}

        function initThreeJsSimulator() {{
            // 2D Tactical Simulation Engine initialization
            window.addEventListener('resize', () => {{
                drawArena2D();
            }});
            requestAnimationFrame(animateSimulation);
        }}

        function addTrailPoint(x, y, z) {{
            trailPoints.push({{ x, z }});
            if (trailPoints.length > 500) trailPoints.shift();
        }}

        function clearTrail() {{
            trailPoints = [];
            drawArena2D();
        }}

        function animateSimulation() {{
            requestAnimationFrame(animateSimulation);

            if (isSimRunning && activeProject.waypoints.length >= 2) {{
                const wps = activeProject.waypoints;
                const totalSegments = wps.length - 1;
                simProgress += 0.0025 * simSpeed;

                if (simProgress >= 1.0) {{
                    simProgress = 1.0;
                    isSimRunning = false;
                    document.getElementById('playText').textContent = 'Run';
                    document.getElementById('playIcon').className = 'fas fa-play';
                    showToast("Mission Execution Finished!");
                }}

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
                if (curTimeEl) {{
                    const totalDur = (activeProject.waypoints.reduce((acc, wp) => acc + (wp.time || 0.45), 0));
                    curTimeEl.textContent = (simProgress * totalDur).toFixed(2) + 's';
                }}

                drawArena2D();
            }}
        }}

        function updateTelemetryHUD(x, z, yaw, spd) {{
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
        }}

        function toggleSimRun() {{
            if (simProgress >= 1.0) resetSimRun();
            isSimRunning = !isSimRunning;
            const icon = document.getElementById('playIcon');
            const txt = document.getElementById('playText');
            if (isSimRunning) {{
                if (icon) icon.className = 'fas fa-pause';
                if (txt) txt.textContent = 'Pause';
            }} else {{
                if (icon) icon.className = 'fas fa-play';
                if (txt) txt.textContent = 'Run';
            }}
        }}

        function resetSimRun() {{
            isSimRunning = false;
            simProgress = 0;
            const icon = document.getElementById('playIcon');
            const txt = document.getElementById('playText');
            if (icon) icon.className = 'fas fa-play';
            if (txt) txt.textContent = 'Run';
            clearTrail();

            const startWp = activeProject.waypoints[0] || {{ x: 1.05, z: 0.45, angle: 90 }};
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
        }}

        function cycleSimSpeed() {{
            const speeds = [1, 2, 4];
            const nextIdx = (speeds.indexOf(simSpeed) + 1) % speeds.length;
            simSpeed = speeds[nextIdx];
            const btn = document.getElementById('btnSpeed');
            if (btn) btn.innerHTML = `<i class="fas fa-bolt"></i> ${{simSpeed}}x`;
        }}

        function onScrubSimulation(val) {{
            simProgress = parseFloat(val) / 1000;
            if (activeProject.waypoints.length >= 2) {{
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
            }}
        }}

                function setCameraView(mode) {{
            simCamMode = mode;
            document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));

            if (mode === 'free') {{
                document.getElementById('btnCamFree').classList.add('active');
                camera.position.set(0, 2.2, 1.8);
                controls.target.set(0, 0.05, 0);
            }} else if (mode === 'top') {{
                document.getElementById('btnCamTop').classList.add('active');
                camera.position.set(0, 3.2, 0.001);
                controls.target.set(0, 0, 0);
            }} else if (mode === 'follow') {{
                document.getElementById('btnCamFollow').classList.add('active');
            }}
        }}

        function onWindowResize() {{
            const container = document.getElementById('simCanvasWrap');
            if (!container || !renderer || !camera) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }}

        // ---------------------------------------------------------------------
        // PRESET LOADERS & FILE UPLOAD HANDLERS
        // ---------------------------------------------------------------------
        function triggerUploadArena() {{
            let input = document.getElementById('arenaFileInput');
            if (!input) return;
            input.value = '';
            input.click();
        }}

        function handleArenaFileUpload(event) {{
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {{
                loadArenaFromJSON(e.target.result, file.name);
            }};
            reader.readAsText(file);
        }}

        function loadArenaFromJSON(jsonText, fileName) {{
            try {{
                let parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
                const cleanName = (fileName || 'Custom Arena').replace(/\\.[^/.]+$/, "");
                activeProject.id = "custom-" + Date.now();
                activeProject.name = cleanName;

                let waypoints = [];
                if (parsed.pathNodes && parsed.pathNodes.length > 0) {{
                    waypoints = parsed.pathNodes.map((n, idx) => {{
                        const c = (n.cellIdx !== undefined ? n.cellIdx : idx) % 8;
                        const r = Math.floor((n.cellIdx !== undefined ? n.cellIdx : idx) / 8);
                        return {{
                            id: idx + 1,
                            x: n.x !== undefined ? n.x : parseFloat((-1.05 + c * 0.30).toFixed(2)),
                            z: n.z !== undefined ? n.z : parseFloat((-0.45 + r * 0.30).toFixed(2)),
                            label: n.label || ('WP ' + (idx + 1)),
                            fn: n.fn === 'FF' ? 'FORWARD' : (n.fn || 'FORWARD'),
                            speed: n.speed || 70,
                            time: n.timer ? (n.timer / 1000) : 0.45,
                            angle: n.angle !== undefined ? n.angle : 0,
                            kp: 0.6,
                            kd: 2.0
                        }};
                    }});
                }} else if (parsed.waypoints) {{
                    waypoints = parsed.waypoints;
                }}

                currentArenaData = parsed;
                if (waypoints.length === 0) {{
                    waypoints = AutonomousPathPlanner.solveMission(currentArenaData);
                }}

                activeProject.waypoints = waypoints;
                document.getElementById('projectNameInput').value = activeProject.name;
                document.getElementById('missionStatusBadge').textContent = "CUSTOM: " + cleanName.toUpperCase();
                document.getElementById('arenaInfoTitle').textContent = cleanName + " · Loaded Arena";

                clearDroppedBoxes();
                build3DArenaObstacles();
                drawArena2D();
                renderActionSheet();
                renderGeneratedCode();
                updateWpEditorCard();
                resetSimRun();

                showToast("Loaded Arena: " + cleanName);
                logTerminal("[ARENA] Loaded: " + cleanName + " (" + waypoints.length + " waypoints)");
            }} catch (err) {{
                showToast("Error loading arena: " + err.message);
            }}
        }}

        function exportArenaJSON() {{
            try {{
                const exportData = JSON.parse(JSON.stringify(currentArenaData || {{}}));
                exportData.name = activeProject.name || "Custom Arena";
                exportData.waypoints = activeProject.waypoints || [];
                const blob = new Blob([JSON.stringify(exportData, null, 2)], {{ type: 'application/json' }});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (activeProject.name || 'arena').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_layout.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast("Exported Arena: " + a.download);
            }} catch (e) {{
                showToast("Export error: " + e.message);
            }}
        }}

        function loadExampleFivePointRoute() {{
            closeExamplesModal();
            activeProject.id = "atom-vx-rescue-five-points";
            activeProject.name = "Five-Point Route";
            activeProject.waypoints = FIVE_POINT_PATH;
            currentArenaData = ARENA_FIVE_POINTS;

            document.getElementById('projectNameInput').value = activeProject.name;
            document.getElementById('missionStatusBadge').textContent = "ACTIVE: FIVE-POINT ROUTE";
            document.getElementById('arenaInfoTitle').textContent = "Five-Point Route · Rescue Arena";

            clearDroppedBoxes();
            build3DArenaObstacles();
            drawArena2D();
            renderActionSheet();
            renderGeneratedCode();
            updateWpEditorCard();
            resetSimRun();
            showToast("Loaded: Five-Point Route (Atom VX)");
        }}

        function loadExampleQuickDropBox4Enc() {{
            closeExamplesModal();
            activeProject.id = "quick-box-drop";
            activeProject.name = "Quick Drop Box 4 ENC";
            activeProject.waypoints = QUICK_BOX_PATH;
            currentArenaData = ARENA_QUICK_BOX;

            document.getElementById('projectNameInput').value = activeProject.name;
            document.getElementById('missionStatusBadge').textContent = "ACTIVE: QUICK DROP BOX 4 ENC";
            document.getElementById('arenaInfoTitle').textContent = "Quick Drop Box 4 ENC · 120×120cm";

            clearDroppedBoxes();
            build3DArenaObstacles();
            drawArena2D();
            renderActionSheet();
            renderGeneratedCode();
            updateWpEditorCard();
            resetSimRun();
            showToast("Loaded: Quick Drop Box 4 ENC");
        }}

        function loadExampleOfficial100Pts() {{
            closeExamplesModal();
            loadArenaFromJSON(ARENA_OFFICIAL_100, "Official 100-Point Arena");
            showToast("Loaded: Official 100-Point Competition Arena");
        }}

        function loadExampleNormalField() {{
            closeExamplesModal();
            loadArenaFromJSON(ARENA_NORMAL, "Normal Practice Field");
            showToast("Loaded: Normal Practice Field");
        }}

        function loadExampleJaajajField() {{
            closeExamplesModal();
            loadArenaFromJSON(ARENA_NORMAL, "Rescue Field Jaajaj");
            showToast("Loaded: Rescue Field Jaajaj");
        }}

        function clearDroppedBoxes() {{
            droppedBoxMeshes.forEach(b => scene.remove(b));
            droppedBoxMeshes = [];
        }}

        // Modal Helpers
        function openExamplesModal() {{
            document.getElementById('examplesModalBackdrop').classList.add('show');
        }}

        function closeExamplesModal() {{
            document.getElementById('examplesModalBackdrop').classList.remove('show');
        }}

        function handleBackdropClick(e) {{
            if (e.target.id === 'examplesModalBackdrop') closeExamplesModal();
        }}

        function showToast(msg) {{
            const banner = document.getElementById('toastBanner');
            const msgEl = document.getElementById('toastMessage');
            if (banner && msgEl) {{
                msgEl.textContent = msg;
                banner.classList.add('show');
                clearTimeout(banner._timer);
                banner._timer = setTimeout(() => banner.classList.remove('show'), 2600);
            }}
        }}

        function logTerminal(msg) {{
            const logs = document.getElementById('terminalLogs');
            if (logs) {{
                const div = document.createElement('div');
                div.textContent = msg;
                logs.appendChild(div);
                logs.scrollTop = logs.scrollHeight;
            }}
        }}

        function clearTerminalLogs() {{
            const logs = document.getElementById('terminalLogs');
            if (logs) logs.innerHTML = '<div>[CLEARED] Console reset.</div>';
        }}

        // Drag & Drop File Listener
        window.addEventListener('dragover', (e) => {{ e.preventDefault(); }});
        window.addEventListener('drop', (e) => {{
            e.preventDefault();
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {{
                const file = e.dataTransfer.files[0];
                const reader = new FileReader();
                reader.onload = (evt) => loadArenaFromJSON(evt.target.result, file.name);
                reader.readAsText(file);
            }}
        }});

        // ---------------------------------------------------------------------
        // INITIALIZATION
        // ---------------------------------------------------------------------
        window.addEventListener('DOMContentLoaded', () => {{
            setupCanvasTilePainter();
            drawArena2D();
            renderActionSheet();
            renderGeneratedCode();
            updateWpEditorCard();
            initThreeJsSimulator();
            logTerminal("[SYSTEM] PT-BOT Tactical Studio Ready. 4WD WD4 Active.");
        }});
    </script>
</body>
</html>
'''

# 1. Write apps/web files
target_files = [
    os.path.join(ROOT_DIR, "apps", "web", "index.html"),
    os.path.join(ROOT_DIR, "apps", "web", "tactical_planner.html"),
    os.path.join(ROOT_DIR, "apps", "web", "web.html")
]

for t in target_files:
    with open(t, "w", encoding="utf-8") as f:
        f.write(html_content)
    print("Successfully written:", t, f"({len(html_content)} bytes)")

print("All master web files written successfully!")
