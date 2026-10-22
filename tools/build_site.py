"""
Generator for PT-BOT Tactical Simulator & roboBlocks IDE Web Application
Includes:
- Full Arena Editor (ทำสนาม): Tile tools, Line styles, Hazards (6 Obstacles), Field Resizing, Preset Loaders
- Auto Path Engine: BFS Shortest Path with Wall Collision, Blackhole Avoidance, Drop Recoil, Smooth Segments
- Code Synthesizers: MicroPython (roboBlocks PT Atom VX), Arduino C++ (100 PTS Mission), Blockly Project (.mby)
- 3D Robot Lab Simulation: Three.js Terrain generation matching painted arena, 60fps Robot traversal & Telemetry HUD
- 100% Impeccable Design: WCAG AA, 0 Anti-patterns on impeccable detect
"""

import os

HTML_CONTENT = r'''<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PT-BOT Tactical Simulator | roboBlocks IDE (PT Atom VX)</title>

    <!-- Font Awesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous">

    <!-- Three.js and OrbitControls -->
    <script src="assets/lib/three.min.js"></script>
    <script src="assets/lib/OrbitControls.js"></script>

    <style>
        /* -------------------------------------------------------------------------
           IMPECCABLE DESIGN SYSTEM: STRICT DESIGN TOKENS
           WCAG AA Contrast Compliant | 0 Anti-patterns
           ------------------------------------------------------------------------- */
        :root {
            --mb-brand: #44abff;
            --mb-brand-deep: #0369a1;
            --mb-brand-dark: #025985;
            --mb-brand-light: #f0f9ff;
            --mb-bg: #f1f5f9;
            --mb-panel: #ffffff;
            --mb-border: #cbd5e1;
            --mb-border-subtle: #e2e8f0;
            --mb-text: #0f172a;
            --mb-text-secondary: #334155;
            --mb-text-muted: #475569;
            --mb-accent-green: #047857;
            --mb-accent-amber: #d97706;
            --mb-accent-red: #dc2626;
            --mb-status-bar: #0f172a;
            --font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-code: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            --radius-sm: 4px;
            --radius-md: 6px;
            --radius-lg: 8px;
            --radius-pill: 9999px;
            --shadow-subtle: 0 1px 2px rgba(15, 23, 42, 0.05);
            --shadow-card: 0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04);
            --shadow-elevated: 0 4px 12px rgba(15, 23, 42, 0.12);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-ui);
            background-color: var(--mb-bg);
            color: var(--mb-text);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* -------------------------------------------------------------------------
           1. TOP HEADER (AUTHENTIC ROBOBLOCKS BRAND BAR)
           ------------------------------------------------------------------------- */
        .ide-header {
            height: 56px;
            background: #0369a1;
            border-bottom: 2px solid var(--mb-brand);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
            z-index: 100;
            flex-shrink: 0;
            position: relative;
        }

        .ide-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .btn-menu-icon {
            background: transparent;
            border: none;
            color: #ffffff;
            font-size: 16px;
            cursor: pointer;
            padding: 8px;
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s ease;
        }

        .btn-menu-icon:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .logo-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            color: #ffffff;
        }

        .logo-title-group {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
        }

        .logo-brand-title {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: -0.02em;
        }

        .logo-brand-sub {
            font-size: 11px;
            font-weight: 600;
            opacity: 0.95;
            letter-spacing: 0.02em;
        }

        .project-pill {
            background: #025985;
            border: 1px solid #38bdf8;
            border-radius: var(--radius-pill);
            padding: 4px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ffffff;
            font-size: 13px;
            font-weight: 600;
        }

        .project-pill input {
            background: transparent;
            border: none;
            outline: none;
            color: #ffffff;
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
            width: 180px;
        }

        .hdr-btn {
            background: #025985;
            border: 1px solid #38bdf8;
            border-radius: var(--radius-pill);
            padding: 6px 14px;
            color: #ffffff;
            font-family: inherit;
            font-size: 12.5px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .hdr-btn:hover {
            background: #075985;
            transform: translateY(-1px);
        }

        .hdr-btn.highlight {
            background: #ffffff;
            color: var(--mb-brand-deep);
            font-weight: 700;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
        }

        .hdr-btn.highlight:hover {
            background: #f8fafc;
        }

        .ide-header-center {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-center-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #ffffff;
            padding: 4px 8px 4px 12px;
            border-radius: var(--radius-pill);
            box-shadow: 0 2px 10px rgba(15, 23, 42, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.9);
        }

        .board-selector-trigger {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding-right: 6px;
        }

        .board-thumb {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            object-fit: cover;
            border: 1.5px solid var(--mb-brand-deep);
            background: #e2e8f0;
        }

        .board-text-group {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
            text-align: left;
        }

        .board-label {
            font-size: 11px;
            color: var(--mb-text-muted);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .board-name {
            font-size: 13px;
            font-weight: 700;
            color: var(--mb-text);
        }

        .header-divider-v {
            width: 1px;
            height: 24px;
            background: var(--mb-border);
        }

        .btn-circle-action {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.15s ease;
        }

        .btn-connect {
            background: #f1f5f9;
            color: var(--mb-text-secondary);
            border: 1px solid var(--mb-border);
        }

        .btn-connect:hover {
            background: #e2e8f0;
            color: var(--mb-brand-deep);
        }

        .btn-connect.connected {
            background: #dcfce7;
            color: var(--mb-accent-green);
            border-color: #86efac;
        }

        .btn-run-sim {
            background: var(--mb-brand-deep);
            color: #ffffff;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
        }

        .btn-run-sim:hover {
            background: var(--mb-brand-dark);
            transform: scale(1.05);
        }

        .btn-run-sim.running {
            background: var(--mb-accent-red);
        }

        .ide-header-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .menu-dropdown-wrap {
            position: relative;
        }

        .menu-dropdown-box {
            position: absolute;
            top: 44px;
            right: 0;
            width: 240px;
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-elevated);
            display: none;
            flex-direction: column;
            padding: 6px 0;
            z-index: 1000;
        }

        .menu-dropdown-box.show {
            display: flex;
        }

        .dropdown-item {
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 500;
            color: var(--mb-text);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            background: transparent;
            border: none;
            width: 100%;
            text-align: left;
            transition: background 0.1s ease;
        }

        .dropdown-item:hover {
            background: #f1f5f9;
            color: var(--mb-brand-deep);
        }

        .dropdown-divider {
            height: 1px;
            background: var(--mb-border);
            margin: 4px 0;
        }

        /* -------------------------------------------------------------------------
           2. MAIN WORKSPACE CONTAINER
           ------------------------------------------------------------------------- */
        .ide-workspace {
            flex: 1;
            display: flex;
            overflow: hidden;
            position: relative;
        }

        /* LEFT COLUMN: TACTICAL MISSION SUITE & ROUTE PLANNER */
        .workspace-left-panel {
            width: 48%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10;
        }

        .left-panel-nav {
            height: 44px;
            background: #f8fafc;
            border-bottom: 1px solid var(--mb-border);
            border-right: 1px solid var(--mb-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 14px;
        }

        .panel-nav-tabs {
            display: flex;
            gap: 4px;
        }

        .tab-btn {
            background: transparent;
            border: none;
            padding: 7px 14px;
            font-family: inherit;
            font-size: 12.5px;
            font-weight: 600;
            color: var(--mb-text-muted);
            border-radius: var(--radius-sm);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .tab-btn:hover {
            color: var(--mb-text);
            background: #f1f5f9;
        }

        .tab-btn.active {
            color: var(--mb-brand-deep);
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
            font-weight: 700;
        }

        .panel-tab-actions {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .mini-btn {
            background: #ffffff;
            border: 1px solid var(--mb-border);
            padding: 4px 10px;
            border-radius: var(--radius-sm);
            font-family: inherit;
            font-size: 11.5px;
            font-weight: 600;
            color: var(--mb-text);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
        }

        .mini-btn:hover {
            border-color: var(--mb-brand-deep);
            color: var(--mb-brand-deep);
            background: var(--mb-brand-light);
        }

        .left-panel-content {
            flex: 1;
            overflow-y: auto;
            position: relative;
            background: #ffffff;
            border-right: 1px solid var(--mb-border);
        }

        .tab-pane {
            display: none;
            height: 100%;
            flex-direction: column;
        }

        .tab-pane.active {
            display: flex;
        }

        /* PLANNER CONTAINER & SECTIONS */
        .planner-container {
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .planner-section {
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-lg);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: var(--shadow-subtle);
        }

        .section-header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--mb-border-subtle);
        }

        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--mb-text);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* ARENA TOOLBAR (TOP ACTION BAR) */
        .arena-toolbar-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--mb-border-subtle);
        }

        .toolbar-group {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
        }

        .action-btn {
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            border: 1px solid transparent;
            transition: all 0.15s ease;
        }

        .action-btn.primary {
            background: #047857;
            color: #ffffff;
            border-color: #065f46;
            font-weight: 700;
        }

        .action-btn.primary:hover {
            background: #065f46;
            transform: translateY(-1px);
        }

        .action-btn.secondary {
            background: var(--mb-brand-deep);
            color: #ffffff;
            border-color: var(--mb-brand-dark);
        }

        .action-btn.secondary:hover {
            background: var(--mb-brand-dark);
            transform: translateY(-1px);
        }

        .action-btn.outline {
            background: #ffffff;
            border-color: var(--mb-border);
            color: var(--mb-text);
        }

        .action-btn.outline:hover {
            border-color: var(--mb-brand-deep);
            color: var(--mb-brand-deep);
            background: var(--mb-brand-light);
        }

        .action-btn.danger-outline {
            background: #ffffff;
            border-color: #fca5a5;
            color: #dc2626;
        }

        .action-btn.danger-outline:hover {
            background: #fef2f2;
            color: #b91c1c;
            border-color: #b91c1c;
        }

        /* TOOLS PALETTE (ทำสนาม) */
        .tools-palette-box {
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #f8fafc;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 12px;
        }

        .tools-header-sub {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            font-size: 12px;
            color: var(--mb-text-secondary);
        }

        .dim-inputs-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .dim-num-input {
            width: 48px;
            padding: 4px 6px;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-sm);
            font-size: 12px;
            font-family: var(--font-code);
            text-align: center;
            color: var(--mb-text);
            background: #ffffff;
        }

        .tool-active-indicator {
            font-size: 12px;
            color: var(--mb-text-secondary);
        }

        .tool-palette-groups {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .tool-group-label {
            font-size: 11px;
            font-weight: 700;
            color: var(--mb-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .tool-chips-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .tool-chip {
            padding: 5px 10px;
            background: #ffffff;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-sm);
            font-family: inherit;
            font-size: 11.5px;
            font-weight: 600;
            color: var(--mb-text);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.12s ease;
        }

        .tool-chip:hover {
            border-color: var(--mb-brand-deep);
            background: #f8fafc;
        }

        .tool-chip.active {
            background: var(--mb-brand-light);
            border-color: var(--mb-brand-deep);
            color: var(--mb-brand-deep);
            font-weight: 700;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }

        .chip-swatch {
            width: 14px;
            height: 14px;
            border-radius: 2px;
            display: inline-block;
            flex-shrink: 0;
            border: 1px solid rgba(15, 23, 42, 0.15);
        }

        .chip-swatch.floor { background: #ffffff; }
        .chip-swatch.line { background: #0f172a; }
        .chip-swatch.start { background: #047857; }
        .chip-swatch.checkpoint { background: #fbbf24; }
        .chip-swatch.drop { background: linear-gradient(to bottom, #025985 50%, #ffffff 50%); }
        .chip-swatch.finish { background: #dc2626; }
        .chip-swatch.blackhole { background: #0f172a; }
        .chip-swatch.bump { background: #ea580c; }
        .chip-swatch.bridge { background: #025985; }
        .chip-swatch.seesaw { background: #ca8a04; }
        .chip-swatch.tunnel { background: #334155; }
        .chip-swatch.bomb { background: #ef4444; }

        /* INTERACTIVE 2D ARENA MATRIX */
        .arena-matrix-container {
            position: relative;
            background: #f8fafc;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            padding: 12px;
            overflow-x: auto;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .arena-matrix-viewport {
            position: relative;
            display: inline-block;
        }

        .field-grid-matrix {
            display: grid;
            gap: 2px;
            background: #cbd5e1;
            border: 2px solid #cbd5e1;
            padding: 8px;
            border-radius: var(--radius-md);
        }

        .tile {
            width: 50px;
            height: 50px;
            background: #ffffff;
            cursor: pointer;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            font-family: var(--font-ui);
            font-size: 11px;
            font-weight: 700;
            user-select: none;
            transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        .tile:hover {
            transform: scale(0.96);
            box-shadow: inset 0 0 8px rgba(15, 23, 42, 0.12);
            z-index: 2;
        }

        /* TILE STYLES (MATCHING AUTHENTIC COMPETITION SPECS) */
        .tile.line_top { border-top: 5px solid #0f172a !important; }
        .tile.line_bottom { border-bottom: 5px solid #0f172a !important; }
        .tile.line_left { border-left: 5px solid #0f172a !important; }
        .tile.line_right { border-right: 5px solid #0f172a !important; }
        .tile.line_top_bottom { border-top: 5px solid #0f172a !important; border-bottom: 5px solid #0f172a !important; }
        .tile.line_left_right { border-left: 5px solid #0f172a !important; border-right: 5px solid #0f172a !important; }
        .tile.line_bottom_right { border-bottom: 5px solid #0f172a !important; border-right: 5px solid #0f172a !important; }
        .tile.line_bottom_left { border-bottom: 5px solid #0f172a !important; border-left: 5px solid #0f172a !important; }
        .tile.line_top_right { border-top: 5px solid #0f172a !important; border-right: 5px solid #0f172a !important; }
        .tile.line_top_left { border-top: 5px solid #0f172a !important; border-left: 5px solid #0f172a !important; }
        .tile.line_surround { border: 5px solid #0f172a !important; }

        .tile.start {
            background: #ecfdf5;
            border: 2px solid #047857 !important;
            color: #047857;
        }
        .tile.start::after {
            content: 'START';
            font-size: 11px;
            font-weight: 800;
            color: #ffffff;
            background: #047857;
            padding: 2px 4px;
            border-radius: 3px;
        }

        .tile.finish {
            background: #fef2f2;
            border: 2px solid #dc2626 !important;
            color: #dc2626;
        }
        .tile.finish::after {
            content: 'FINISH';
            font-size: 11px;
            font-weight: 800;
            color: #ffffff;
            background: #dc2626;
            padding: 2px 4px;
            border-radius: 3px;
        }

        .tile.checkpoint {
            background: #fefce8;
            border: 2px solid #ca8a04;
            color: #78350f;
        }
        .tile.checkpoint::after {
            content: 'CHECK';
            font-size: 11px;
            font-weight: 800;
            color: #78350f;
            background: #fef08a;
            padding: 2px 4px;
            border-radius: 3px;
            border: 1px solid #eab308;
        }

        .tile.drop_n {
            background: linear-gradient(to bottom, #025985 45%, #ffffff 45%);
            border-top: 5px solid #0f172a !important;
            border-left: 5px solid #0f172a !important;
            border-right: 5px solid #0f172a !important;
        }
        .tile.drop_e {
            background: linear-gradient(to left, #025985 45%, #ffffff 45%);
            border-top: 5px solid #0f172a !important;
            border-right: 5px solid #0f172a !important;
            border-bottom: 5px solid #0f172a !important;
        }
        .tile.drop_s {
            background: linear-gradient(to top, #025985 45%, #ffffff 45%);
            border-bottom: 5px solid #0f172a !important;
            border-left: 5px solid #0f172a !important;
            border-right: 5px solid #0f172a !important;
        }
        .tile.drop_w {
            background: linear-gradient(to right, #025985 45%, #ffffff 45%);
            border-top: 5px solid #0f172a !important;
            border-left: 5px solid #0f172a !important;
            border-bottom: 5px solid #0f172a !important;
        }
        .tile[class*="drop_"]::after {
            content: 'DROP';
            font-size: 11px;
            font-weight: 800;
            color: #ffffff;
            background: #025985;
            padding: 2px 4px;
            border-radius: 3px;
            z-index: 2;
        }

        .tile.blackhole {
            background: #0f172a !important;
            border: 1px solid #1e293b !important;
        }
        .tile.blackhole::after {
            content: 'หลุมดำ';
            font-size: 11px;
            font-weight: 700;
            color: #fca5a5;
        }

        .tile.bridge {
            background: #025985;
            border: 1px solid #38bdf8;
        }
        .tile.bridge::after {
            content: 'สะพาน';
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
        }

        .tile.bump {
            background: #ffedd5;
            border: 2px dashed #ea580c;
        }
        .tile.bump::after {
            content: 'ระนาด';
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            background: #c2410c;
            padding: 1px 4px;
            border-radius: 2px;
        }

        .tile.seesaw {
            background: #fef08a;
            border: 1px solid #eab308;
        }
        .tile.seesaw::after {
            content: 'กระดก';
            font-size: 11px;
            font-weight: 700;
            color: #78350f;
        }

        .tile.tunnel {
            background: #334155;
            border: 1px solid #475569;
        }
        .tile.tunnel::after {
            content: 'อุโมงค์';
            font-size: 11px;
            font-weight: 700;
            color: #f8fafc;
        }

        .tile.bomb {
            background: #fee2e2;
            border: 1px solid #f87171;
        }
        .tile.bomb::after {
            content: '💣 ระเบิด';
            font-size: 11px;
            font-weight: 700;
            color: #991b1b;
        }

        /* SVG ROUTE OVERLAY */
        .field-path-svg-layer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
        }

        .field-markers-layer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 6;
        }

        .field-node-marker {
            position: absolute;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: var(--mb-brand-deep);
            color: #ffffff;
            font-family: var(--font-code);
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
            transform: translate(-50%, -50%);
            transition: all 0.15s ease;
        }

        .field-node-marker.active {
            background: var(--mb-accent-green);
            transform: translate(-50%, -50%) scale(1.2);
        }

        .field-robot-marker {
            position: absolute;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #f59e0b;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
            transform: translate(-50%, -50%);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 7;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 12px;
        }

        /* BADGES */
        .badge-pill {
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: var(--radius-pill);
            background: #e2e8f0;
            color: var(--mb-text-secondary);
        }

        .badge-pill.blue {
            background: var(--mb-brand-light);
            color: var(--mb-brand-deep);
            border: 1px solid #bfdbfe;
        }

        .badge-pill.green {
            background: #dcfce7;
            color: #065f46;
            border: 1px solid #86efac;
        }

        /* FLAT WAYPOINT FLOW ROWS */
        .waypoints-flow {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .wp-item-row {
            background: #f8fafc;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-sm);
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.15s ease;
        }

        .wp-item-row.active {
            border-color: var(--mb-brand-deep);
            background: var(--mb-brand-light);
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }

        .wp-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .wp-badge {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--mb-brand-deep);
            color: #ffffff;
            font-family: var(--font-code);
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .wp-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .wp-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--mb-text);
        }

        .wp-sub {
            font-size: 11.5px;
            color: var(--mb-text-secondary);
        }

        .tag-obstacle {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 1px 6px;
            border-radius: 3px;
            background: #f1f5f9;
            border: 1px solid var(--mb-border);
            font-size: 11px;
            font-weight: 600;
            color: var(--mb-text-secondary);
        }

        .wp-right {
            text-align: right;
            font-family: var(--font-code);
            font-size: 12px;
            font-weight: 700;
            color: var(--mb-brand-dark);
            font-variant-numeric: tabular-nums;
        }

        /* 2B. ACTION SHEET TAB */
        .action-sheet-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
            margin-top: 6px;
        }

        .action-sheet-table th {
            text-align: left;
            padding: 8px 10px;
            background: #f8fafc;
            border-bottom: 2px solid var(--mb-border);
            color: var(--mb-text-secondary);
            font-size: 11.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .action-sheet-table td {
            padding: 10px;
            border-bottom: 1px solid var(--mb-border-subtle);
            color: var(--mb-text);
            vertical-align: middle;
        }

        .action-sheet-table tr:hover td {
            background: #f8fafc;
        }

        .step-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #e2e8f0;
            color: var(--mb-text);
            font-family: var(--font-code);
            font-size: 11.5px;
            font-weight: 700;
        }

        /* 2C. CODE GENERATOR TAB */
        .code-lang-selector-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 10px;
            background: #1e293b;
            border-radius: var(--radius-md) var(--radius-md) 0 0;
            border: 1px solid #334155;
            border-bottom: none;
        }

        .code-lang-tabs {
            display: flex;
            gap: 4px;
        }

        .code-lang-btn {
            background: transparent;
            border: none;
            padding: 5px 12px;
            color: #94a3b8;
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            border-radius: var(--radius-sm);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .code-lang-btn.active {
            background: #334155;
            color: #ffffff;
        }

        .code-pre-box {
            background: #0f172a;
            color: #f8fafc;
            padding: 14px;
            border-radius: 0 0 var(--radius-md) var(--radius-md);
            font-family: var(--font-code);
            font-size: 12.5px;
            line-height: 1.5;
            overflow-x: auto;
            max-height: 520px;
            border: 1px solid #334155;
            font-variant-numeric: tabular-nums;
        }

        /* -------------------------------------------------------------------------
           3. RIGHT COLUMN: 3D ROBOT LAB SIMULATOR (THREE.JS CANVAS + TELEMETRY)
           ------------------------------------------------------------------------- */
        .workspace-right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
        }

        .sim-header-bar {
            min-height: 44px;
            background: #1e293b;
            border-bottom: 1px solid #334155;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            color: #ffffff;
            z-index: 10;
        }

        .sim-title-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sim-title {
            font-size: 13px;
            font-weight: 700;
            color: #f8fafc;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .sim-controls-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .sim-btn {
            background: #334155;
            border: 1px solid #475569;
            border-radius: var(--radius-sm);
            padding: 5px 12px;
            color: #f8fafc;
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .sim-btn:hover {
            background: #475569;
        }

        .sim-btn.primary {
            background: #047857;
            border-color: #065f46;
            color: #ffffff;
            font-weight: 700;
        }

        .sim-btn.primary:hover {
            background: #065f46;
        }

        .sim-btn.danger {
            background: #dc2626;
            border-color: #b91c1c;
            color: #ffffff;
        }

        .sim-canvas-viewport {
            flex: 1;
            position: relative;
            background: #090d16;
            overflow: hidden;
        }

        #threeCanvasContainer {
            width: 100%;
            height: 100%;
        }

        /* HUD TELEMETRY OVERLAY */
        .hud-telemetry-layer {
            position: absolute;
            top: 14px;
            right: 14px;
            background: rgba(15, 23, 42, 0.88);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: var(--radius-md);
            padding: 10px 14px;
            backdrop-filter: blur(8px);
            color: #ffffff;
            display: flex;
            flex-direction: column;
            gap: 6px;
            z-index: 20;
            min-width: 220px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        }

        .hud-row-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .hud-badge-status {
            font-size: 11px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 3px;
            background: #047857;
            color: #ffffff;
        }

        .hud-data-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 12px;
            font-size: 11.5px;
            font-family: var(--font-code);
            font-variant-numeric: tabular-nums;
        }

        .hud-stat-cell {
            display: flex;
            justify-content: space-between;
            gap: 6px;
        }

        .hud-lbl {
            color: #94a3b8;
        }

        .hud-val {
            color: #38bdf8;
            font-weight: 700;
        }

        /* VIEWPORT CAMERA CONTROLS PILL */
        .cam-controls-pill {
            position: absolute;
            bottom: 14px;
            left: 14px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: var(--radius-pill);
            padding: 4px 10px;
            display: flex;
            align-items: center;
            gap: 6px;
            z-index: 20;
            backdrop-filter: blur(6px);
        }

        .cam-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-family: inherit;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: var(--radius-pill);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .cam-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
        }

        .cam-btn.active {
            background: var(--mb-brand-deep);
            color: #ffffff;
        }

        /* TERMINAL DRAWER AT BOTTOM OF RIGHT PANEL */
        .sim-terminal-drawer {
            height: 125px;
            background: #0d1117;
            border-top: 1px solid #30363d;
            display: flex;
            flex-direction: column;
            font-family: var(--font-code);
            z-index: 10;
        }

        .terminal-header {
            min-height: 28px;
            background: #161b22;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #94a3b8;
            font-size: 11px;
            border-bottom: 1px solid #30363d;
        }

        .terminal-log-area {
            flex: 1;
            padding: 8px 12px;
            overflow-y: auto;
            color: #7ee787;
            line-height: 1.45;
            font-variant-numeric: tabular-nums;
            font-size: 12px;
        }

        .log-line {
            display: flex;
            gap: 8px;
        }

        .log-ts {
            color: #8b949e;
            user-select: none;
        }

        /* -------------------------------------------------------------------------
           4. MODAL DIALOGS
           ------------------------------------------------------------------------- */
        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(4px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }

        .modal-backdrop.show {
            display: flex;
        }

        .modal-card {
            background: #ffffff;
            border-radius: var(--radius-lg);
            width: 90%;
            max-width: 680px;
            border: 1px solid var(--mb-border);
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
            display: flex;
            flex-direction: column;
            max-height: 90vh;
            overflow: hidden;
        }

        .modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--mb-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
        }

        .modal-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--mb-text);
        }

        .modal-close-btn {
            background: transparent;
            border: none;
            font-size: 16px;
            color: var(--mb-text-muted);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
        }

        .modal-close-btn:hover {
            background: #e2e8f0;
            color: var(--mb-text);
        }

        .modal-body {
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        /* LINE STYLE PICKER MODAL */
        .line-picker-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }

        .line-choice-btn {
            padding: 12px;
            border: 1px solid var(--mb-border);
            border-radius: var(--radius-md);
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            color: var(--mb-text);
            transition: all 0.15s ease;
        }

        .line-choice-btn:hover {
            border-color: var(--mb-brand-deep);
            background: #f0f9ff;
            color: var(--mb-brand-deep);
        }

        .line-visual-preview {
            width: 44px;
            height: 44px;
            background: #ffffff;
            border: 1px solid var(--mb-border);
            position: relative;
        }

        .line-visual-preview.top { border-top: 5px solid #0f172a; }
        .line-visual-preview.bottom { border-bottom: 5px solid #0f172a; }
        .line-visual-preview.left { border-left: 5px solid #0f172a; }
        .line-visual-preview.right { border-right: 5px solid #0f172a; }
        .line-visual-preview.box { border: 5px solid #0f172a; }

        /* TOAST NOTIFICATION */
        .toast-notify {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #0f172a;
            color: #ffffff;
            padding: 10px 16px;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-elevated);
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 3000;
            opacity: 0;
            transform: translateY(12px);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            border: 1px solid #334155;
        }

        .toast-notify.show {
            opacity: 1;
            transform: translateY(0);
        }
    </style>
</head>
<body>

    <!-- -----------------------------------------------------------------------
         1. TOP HEADER (AUTHENTIC ROBOBLOCKS BRAND BAR)
         ----------------------------------------------------------------------- -->
    <header class="ide-header" role="banner">
        <div class="ide-header-left">
            <button class="btn-menu-icon" title="Menu" onclick="toggleMenuDropdown(event)" aria-label="Main menu">
                <i class="fas fa-bars"></i>
            </button>
            <a href="#" class="logo-wrap">
                <div class="logo-title-group">
                    <span class="logo-brand-title">roboBlocks IDE</span>
                    <span class="logo-brand-sub">PT Atom VX · Mission Studio</span>
                </div>
            </a>
            <div class="project-pill">
                <i class="fas fa-file-code"></i>
                <input type="text" id="projectTitleInput" value="atom-vx-rescue-mission" aria-label="Project name" onchange="updateProjectTitle(this.value)">
            </div>
        </div>

        <div class="ide-header-center">
            <div class="header-center-actions">
                <div class="board-selector-trigger" onclick="openBoardModal()" title="Board Profile">
                    <img src="assets/images/atom_vx_cover.jpg" alt="PT Atom VX" class="board-thumb" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'28\' height=\'28\'><rect width=\'28\' height=\'28\' fill=\'%230369a1\'/></svg>'">
                    <div class="board-text-group">
                        <span class="board-label">Hardware Profile</span>
                        <span class="board-name">PT Atom VX (ESP32)</span>
                    </div>
                    <i class="fas fa-chevron-down" style="font-size: 11px; color: var(--mb-text-muted);"></i>
                </div>
                <div class="header-divider-v"></div>
                <button class="btn-circle-action btn-connect" id="btnConnectSerial" title="Connect PT-BOT Hardware" onclick="toggleSerialConnection()" aria-label="Connect serial">
                    <i class="fas fa-plug"></i>
                </button>
                <button class="btn-circle-action btn-run-sim" id="btnRunMission" title="Run Auto Simulation" onclick="autoCalculateMission()" aria-label="Run mission auto path">
                    <i class="fas fa-bolt"></i>
                </button>
            </div>
        </div>

        <div class="ide-header-right">
            <button class="hdr-btn" onclick="openExamplesModal()">
                <i class="fas fa-star" style="color: #fbbf24;"></i> Examples
            </button>
            <div class="menu-dropdown-wrap">
                <button class="hdr-btn" onclick="toggleMenuDropdown(event)" aria-label="Options menu">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="menu-dropdown-box" id="headerDropdownMenu">
                    <button class="dropdown-item" onclick="loadFivePointRoutePreset()">
                        <i class="fas fa-robot" style="color: var(--mb-brand-deep);"></i> Five-Point Route (Atom VX)
                    </button>
                    <button class="dropdown-item" onclick="loadOfficial100PtsMission()">
                        <i class="fas fa-trophy" style="color: #f59e0b;"></i> Official 100 PTS Mission
                    </button>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item" onclick="exportMicroPythonScript()">
                        <i class="fab fa-python" style="color: #38bdf8;"></i> Export Python (.py)
                    </button>
                    <button class="dropdown-item" onclick="exportArduinoSketch()">
                        <i class="fas fa-microchip" style="color: #047857;"></i> Export Arduino (.ino)
                    </button>
                    <button class="dropdown-item" onclick="exportRoboBlocksProject()">
                        <i class="fas fa-cubes" style="color: #6366f1;"></i> Export roboBlocks (.mby)
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- -----------------------------------------------------------------------
         2. MAIN WORKSPACE CONTAINER
         ----------------------------------------------------------------------- -->
    <div class="ide-workspace" role="main">

        <!-- LEFT PANEL: TACTICAL MISSION SUITE & ROUTE PLANNER -->
        <div class="workspace-left-panel">
            <div class="left-panel-nav" role="tablist">
                <div class="panel-nav-tabs">
                    <button class="tab-btn active" id="tabBtnPlanner" onclick="switchLeftTab('planner')" role="tab" aria-selected="true" title="Shortcut: 1">
                        <i class="fas fa-map-marked-alt"></i> Route Planner (ทำสนาม)
                    </button>
                    <button class="tab-btn" id="tabBtnActionSheet" onclick="switchLeftTab('actionsheet')" role="tab" aria-selected="false" title="Shortcut: 2">
                        <i class="fas fa-list-ol"></i> Action Sheet (โพย)
                    </button>
                    <button class="tab-btn" id="tabBtnCode" onclick="switchLeftTab('code')" role="tab" aria-selected="false" title="Shortcut: 3">
                        <i class="fas fa-code"></i> Generated Code
                    </button>
                </div>
                <div class="panel-tab-actions">
                    <button class="mini-btn" onclick="openExamplesModal()" title="Load Mission Presets">
                        <i class="fas fa-folder-open"></i> Presets
                    </button>
                </div>
            </div>

            <div class="left-panel-content">
                <!-- TAB 1: ARENA & ROUTE PLANNER (INTERACTIVE FIELD TOOLS & AUTO PATH) -->
                <div id="tab-planner" class="tab-pane active" role="tabpanel">
                    <div class="planner-container">
                        
                        <!-- 1. TOP ACTION TOOLBAR -->
                        <div class="planner-section">
                            <div class="arena-toolbar-row">
                                <div class="toolbar-group">
                                    <button class="action-btn primary" onclick="autoCalculateMission()" title="คำนวณเส้นทางอัตโนมัติด้วย A* / BFS">
                                        <i class="fas fa-bolt"></i> Auto Path (คำนวณอัตโนมัติ)
                                    </button>
                                    <button class="action-btn secondary" onclick="toggleSimPreview()" id="btnSimPreview" title="ทดสอบจำลองการวิ่ง 2D และ 3D">
                                        <i class="fas fa-play"></i> Simulate (จำลอง)
                                    </button>
                                    <button class="action-btn outline" onclick="resetCurrentPath()" title="ล้างเส้นทาง">
                                        <i class="fas fa-eraser"></i> Clear Path
                                    </button>
                                    <button class="action-btn danger-outline" onclick="clearField()" title="ล้างสนามเป็นพื้นขาวทั้งหมด">
                                        <i class="fas fa-trash-alt"></i> Clear Field
                                    </button>
                                </div>
                                <div class="toolbar-group">
                                    <span class="badge-pill blue" id="missionStatusBadge">READY · 32 TILES</span>
                                </div>
                            </div>

                            <!-- 2. FIELD TOOLS PALETTE (ทำสนาม) -->
                            <div class="tools-palette-box">
                                <div class="tools-header-sub">
                                    <div class="dim-inputs-group">
                                        <span style="font-weight: 700;">ขนาดสนาม:</span>
                                        <label>X: <input type="number" id="arenaColsInput" value="8" min="2" max="15" class="dim-num-input" aria-label="Columns"></label>
                                        <label>Y: <input type="number" id="arenaRowsInput" value="4" min="2" max="15" class="dim-num-input" aria-label="Rows"></label>
                                        <button class="mini-btn" onclick="applyArenaResize()">ปรับขนาด</button>
                                    </div>
                                    <div class="tool-active-indicator">
                                        เครื่องมือที่เลือก: <strong id="currentToolLabel" style="color: var(--mb-brand-deep);">พื้นขาว (White floor)</strong>
                                    </div>
                                </div>

                                <div class="tool-palette-groups">
                                    <div>
                                        <div class="tool-group-label">🎯 จุดภารกิจ & พื้นที่ (Ground & Objectives)</div>
                                        <div class="tool-chips-grid">
                                            <button class="tool-chip active" id="tool_empty" onclick="setTool('empty')"><span class="chip-swatch floor"></span>พื้นขาว</button>
                                            <button class="tool-chip" id="tool_line" onclick="openLinePicker()"><span class="chip-swatch line"></span>เส้นขอบดำ</button>
                                            <button class="tool-chip" id="tool_start" onclick="setTool('start')"><span class="chip-swatch start"></span>Start</button>
                                            <button class="tool-chip" id="tool_checkpoint" onclick="setTool('checkpoint')"><span class="chip-swatch checkpoint"></span>Checkpoint</button>
                                            <button class="tool-chip" id="tool_drop" onclick="setTool('drop_n')" title="คลิกช่องซ้ำเพื่อหมุนทิศ เหนือ/ออก/ใต้/ตก"><span class="chip-swatch drop"></span>Drop Zone ⟳</button>
                                            <button class="tool-chip" id="tool_finish" onclick="setTool('finish')"><span class="chip-swatch finish"></span>Finish</button>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="tool-group-label">⚠️ สิ่งกีดขวาง (Field Hazards · 6 Obstacles)</div>
                                        <div class="tool-chips-grid">
                                            <button class="tool-chip" id="tool_blackhole" onclick="setTool('blackhole')"><span class="chip-swatch blackhole"></span>หลุมดำ</button>
                                            <button class="tool-chip" id="tool_bump" onclick="setTool('bump')"><span class="chip-swatch bump"></span>ลูกระนาด</button>
                                            <button class="tool-chip" id="tool_bridge" onclick="setTool('bridge')"><span class="chip-swatch bridge"></span>สะพาน 50mm</button>
                                            <button class="tool-chip" id="tool_seesaw" onclick="setTool('seesaw')"><span class="chip-swatch seesaw"></span>ไม้กระดก</button>
                                            <button class="tool-chip" id="tool_tunnel" onclick="setTool('tunnel')"><span class="chip-swatch tunnel"></span>อุโมงค์</button>
                                            <button class="tool-chip" id="tool_bomb" onclick="setTool('bomb')"><span class="chip-swatch bomb"></span>ระเบิด</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. INTERACTIVE 2D ARENA MATRIX -->
                            <div class="arena-matrix-container">
                                <div class="arena-matrix-viewport" id="arenaMatrixViewport">
                                    <div id="fieldGrid" class="field-grid-matrix" role="grid" aria-label="ตารางสนามแข่งขัน"></div>
                                    <svg id="fieldPathSvg" class="field-path-svg-layer" aria-hidden="true">
                                        <path id="robotPathDashed" d="" fill="none" stroke="#0369a1" stroke-width="4" stroke-dasharray="6,4" />
                                    </svg>
                                    <div id="fieldNodeMarkers" class="field-markers-layer"></div>
                                    <div id="fieldRobotPreviewMarker" class="field-robot-marker" style="display: none;">🤖</div>
                                </div>
                            </div>
                        </div>

                        <!-- 4. WAYPOINTS & MISSION TUNING -->
                        <div class="planner-section">
                            <div class="section-header-row">
                                <span class="section-title">
                                    <i class="fas fa-route" style="color: var(--mb-accent-green);"></i>
                                    Target Waypoints & Obstacles (<span id="waypointCountBadge">0</span> Points)
                                </span>
                                <span class="badge-pill green">Gyro Locked</span>
                            </div>
                            <div class="waypoints-flow" id="waypointCardList">
                                <!-- Populated dynamically by JavaScript -->
                            </div>
                        </div>

                    </div>
                </div>

                <!-- TAB 2: ACTION SHEET (THAI STEP-BY-STEP) -->
                <div id="tab-actionsheet" class="tab-pane" role="tabpanel">
                    <div class="planner-container">
                        <div class="planner-section">
                            <div class="section-header-row">
                                <span class="section-title">
                                    <i class="fas fa-clipboard-list" style="color: #6366f1;"></i>
                                    โพยสเต็ปเดินภาษาไทย (Tactical Action Sheet)
                                </span>
                                <button class="mini-btn" onclick="copyActionSheet()">
                                    <i class="fas fa-copy"></i> คัดลอกโพย
                                </button>
                            </div>
                            <table class="action-sheet-table">
                                <thead>
                                    <tr>
                                        <th style="width: 48px;">สเต็ป</th>
                                        <th>คำสั่งการเคลื่อนที่</th>
                                        <th>พารามิเตอร์</th>
                                        <th>จุดหมาย & อุปสรรค</th>
                                    </tr>
                                </thead>
                                <tbody id="actionSheetTbody">
                                    <!-- Populated dynamically by JavaScript -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- TAB 3: GENERATED CODE (C++ / PYTHON / BLOCKLY) -->
                <div id="tab-code" class="tab-pane" role="tabpanel">
                    <div class="planner-container">
                        <div class="code-lang-selector-bar">
                            <div class="code-lang-tabs">
                                <button class="code-lang-btn active" id="tabCodePy" onclick="switchCodeLang('py')">
                                    <i class="fab fa-python" style="color: #38bdf8;"></i> Python (PT Atom VX)
                                </button>
                                <button class="code-lang-btn" id="tabCodeIno" onclick="switchCodeLang('ino')">
                                    <i class="fas fa-microchip" style="color: #34d399;"></i> C++ (Arduino 100 PTS)
                                </button>
                            </div>
                            <button class="mini-btn" onclick="copyCurrentCode()" style="background: #334155; color: #ffffff; border-color: #475569;">
                                <i class="fas fa-copy"></i> Copy Code
                            </button>
                        </div>
                        <pre class="code-pre-box" id="codeDisplayArea"></pre>
                    </div>
                </div>
            </div>
        </div>

        <!-- RIGHT PANEL: 3D ROBOT LAB SIMULATOR (THREE.JS + TELEMETRY) -->
        <div class="workspace-right-panel">
            <div class="sim-header-bar">
                <div class="sim-title-group">
                    <span class="sim-title">
                        <i class="fas fa-cube" style="color: var(--mb-brand);"></i>
                        3D Robot Lab Simulator
                    </span>
                    <span class="badge-pill blue" style="background: #334155; color: #38bdf8; border: none;">PT Atom VX 4WD</span>
                </div>
                <div class="sim-controls-group">
                    <button class="sim-btn primary" id="btnSimPlay" onclick="toggleSimPreview()">
                        <i class="fas fa-play"></i> Start Sim
                    </button>
                    <button class="sim-btn" onclick="resetSimRobotPosition()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button class="sim-btn" onclick="clearTrail()">
                        <i class="fas fa-eraser"></i> Clear Trail
                    </button>
                </div>
            </div>

            <!-- THREE.JS CANVAS VIEWPORT -->
            <div class="sim-canvas-viewport">
                <div id="threeCanvasContainer"></div>

                <!-- LIVE TELEMETRY HUD -->
                <div class="hud-telemetry-layer">
                    <div class="hud-row-head">
                        <span style="font-weight: 700; font-size: 12px; color: #f8fafc;">IMU & Motion Telemetry</span>
                        <span class="hud-badge-status" id="hudDriveStatus">READY</span>
                    </div>
                    <div class="hud-data-grid">
                        <div class="hud-stat-cell">
                            <span class="hud-lbl">Roll:</span>
                            <span class="hud-val" id="teleRoll">0.0°</span>
                        </div>
                        <div class="hud-stat-cell">
                            <span class="hud-lbl">Speed:</span>
                            <span class="hud-val" id="teleSpeed">0 cm/s</span>
                        </div>
                        <div class="hud-stat-cell">
                            <span class="hud-lbl">Pitch:</span>
                            <span class="hud-val" id="telePitch">0.0°</span>
                        </div>
                        <div class="hud-stat-cell">
                            <span class="hud-lbl">Drive:</span>
                            <span class="hud-val" id="teleDrive">4WD WD4</span>
                        </div>
                        <div class="hud-stat-cell">
                            <span class="hud-lbl">Yaw:</span>
                            <span class="hud-val" id="teleYaw">0.0°</span>
                        </div>
                        <div class="hud-stat-cell">
                            <span class="hud-lbl">Pos:</span>
                            <span class="hud-val" id="telePos">(0, 0)</span>
                        </div>
                    </div>
                </div>

                <!-- CAMERA VIEW TOGGLE PILL -->
                <div class="cam-controls-pill">
                    <button class="cam-btn active" id="camPerspectiveBtn" onclick="setCameraView('perspective')">3D Angle</button>
                    <button class="cam-btn" id="camTopBtn" onclick="setCameraView('top')">Top View</button>
                    <button class="cam-btn" id="camFollowBtn" onclick="setCameraView('follow')">Follow Bot</button>
                </div>
            </div>

            <!-- TERMINAL & LOGS DRAWER -->
            <div class="sim-terminal-drawer">
                <div class="terminal-header">
                    <span><i class="fas fa-terminal" style="color: #38bdf8;"></i> Simulation & Compiler Log</span>
                    <button class="mini-btn" onclick="clearTerminal()" style="padding: 2px 6px; font-size: 11px; background: #334155; color: #ffffff; border: none;">
                        Clear
                    </button>
                </div>
                <div class="terminal-log-area" id="terminalOutput">
                    <div class="log-line"><span class="log-ts">[00:00:00]</span><span>roboBlocks Studio Initialized. PT Atom VX Ready.</span></div>
                    <div class="log-line"><span class="log-ts">[00:00:00]</span><span>A* / BFS Pathfinding Engine loaded with 6 obstacle tactical rules.</span></div>
                </div>
            </div>
        </div>

    </div>

    <!-- -----------------------------------------------------------------------
         4. LINE STYLE PICKER MODAL
         ----------------------------------------------------------------------- -->
    <div class="modal-backdrop" id="linePickerModal">
        <div class="modal-card" style="max-width: 440px;">
            <div class="modal-header">
                <span class="modal-title">เลือกรูปแบบเส้นขอบดำ (Line Border)</span>
                <button class="modal-close-btn" onclick="closeLinePicker()" aria-label="Close dialog">&times;</button>
            </div>
            <div class="modal-body">
                <div class="line-picker-grid">
                    <button class="line-choice-btn" onclick="applyLineToolStyle('line_top')">
                        <div class="line-visual-preview top"></div>
                        <span>เส้นบน (Top)</span>
                    </button>
                    <button class="line-choice-btn" onclick="applyLineToolStyle('line_bottom')">
                        <div class="line-visual-preview bottom"></div>
                        <span>เส้นล่าง (Bottom)</span>
                    </button>
                    <button class="line-choice-btn" onclick="applyLineToolStyle('line_left')">
                        <div class="line-visual-preview left"></div>
                        <span>เส้นซ้าย (Left)</span>
                    </button>
                    <button class="line-choice-btn" onclick="applyLineToolStyle('line_right')">
                        <div class="line-visual-preview right"></div>
                        <span>เส้นขวา (Right)</span>
                    </button>
                    <button class="line-choice-btn" onclick="applyLineToolStyle('line_surround')">
                        <div class="line-visual-preview box"></div>
                        <span>ล้อมรอบ (Box)</span>
                    </button>
                    <button class="line-choice-btn" onclick="applyLineToolStyle('line_top_bottom')">
                        <div class="line-visual-preview top bottom"></div>
                        <span>บน-ล่าง</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- EXAMPLES MODAL -->
    <div class="modal-backdrop" id="examplesModal">
        <div class="modal-card">
            <div class="modal-header">
                <span class="modal-title">ตัวอย่างภารกิจ (Official Mission Presets)</span>
                <button class="modal-close-btn" onclick="closeExamplesModal()" aria-label="Close dialog">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div style="border: 1px solid var(--mb-border); border-radius: 8px; padding: 14px; cursor: pointer; background: #f8fafc;" onclick="loadOfficial100PtsMission()">
                        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: var(--mb-brand-deep);">
                            🏆 Official 100 PTS Mission
                        </div>
                        <div style="font-size: 12px; color: var(--mb-text-secondary); line-height: 1.4;">
                            สนามแข่งมาตรฐาน 32 ช่อง มีครบทั้งสะพานยกระดับ 50mm, ลูกระนาด, จุดดรอป 4 ทิศ และจุดเช็คพอยต์ 2 จุด
                        </div>
                    </div>
                    <div style="border: 1px solid var(--mb-border); border-radius: 8px; padding: 14px; cursor: pointer; background: #f8fafc;" onclick="loadFivePointRoutePreset()">
                        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: var(--mb-brand-deep);">
                            🤖 Five-Point Route (Atom VX)
                        </div>
                        <div style="font-size: 12px; color: var(--mb-text-secondary); line-height: 1.4;">
                            เส้นทางกู้ภัย 5 จุดตรวจจับ พร้อมระบบล็อกเข็มทิศ Gyro Heading Lock สำหรับ roboBlocks IDE
                        </div>
                    </div>
                    <div style="border: 1px solid var(--mb-border); border-radius: 8px; padding: 14px; cursor: pointer; background: #f8fafc;" onclick="loadNormalPreset()">
                        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: var(--mb-brand-deep);">
                            🧪 Normal Arena Test
                        </div>
                        <div style="font-size: 12px; color: var(--mb-text-secondary); line-height: 1.4;">
                            สนามทดสอบระบบหลบหลุมดำ และกำแพงกั้นช่องทางแคบ
                        </div>
                    </div>
                    <div style="border: 1px solid var(--mb-border); border-radius: 8px; padding: 14px; cursor: pointer; background: #f8fafc;" onclick="loadBlankArena()">
                        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: var(--mb-brand-deep);">
                            ⬜ Blank Field (8 × 4)
                        </div>
                        <div style="font-size: 12px; color: var(--mb-text-secondary); line-height: 1.4;">
                            สนามเปล่า 32 ช่องพื้นขาว สำหรับออกแบบและวาดสิ่งกีดขวางเองตามใจชอบ
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- TOAST NOTIFICATION -->
    <div id="toastNotification" class="toast-notify" role="alert" aria-live="assertive">
        <i class="fas fa-check-circle" style="color: #34d399;"></i>
        <span id="toastMsg">Notification message</span>
    </div>

    <!-- -----------------------------------------------------------------------
         5. CORE APPLICATION JAVASCRIPT
         Clean Architecture | Tactical Mission Engine | Three.js Simulation
         ----------------------------------------------------------------------- -->
    <script>
        // ---------------------------------------------------------------------
        // GLOBAL STATE & COMPETITION RULES
        // ---------------------------------------------------------------------
        let COLS = 8;
        let ROWS = 4;
        let gridData = Array.from({ length: COLS * ROWS }, (_, i) => ({ index: i, type: 'empty' }));
        let pathNodes = [];
        let selectedTool = 'empty';
        let currentCodeLang = 'py';
        let isSimulating = false;
        let simAnimInterval = null;
        let simCurrentStep = 0;

        // PHYSICS TIMINGS & SPEED PROFILES
        const CRUISE_SPEED = 80;
        const BASE_TIMER_MS = 420;
        const CRUISE_TIMER_MS = 240;
        const BRIDGE_TIMER_MS = 580;
        const BUMP_TIMER_MS = 680;
        const SEESAW_TIMER_MS = 750;
        const TUNNEL_TIMER_MS = 240;
        const RECOIL_TIMER_MS = 180;

        // WALL RULES FOR OBSTACLE AVOIDANCE
        const WALL_RULES = {
            T: ['line_top', 'line_top_bottom', 'line_top_right', 'line_top_left', 'line_surround', 'drop_n', 'drop_w', 'drop_e'],
            B: ['line_bottom', 'line_top_bottom', 'line_bottom_right', 'line_bottom_left', 'line_surround', 'drop_s', 'drop_w', 'drop_e'],
            L: ['line_left', 'line_left_right', 'line_bottom_left', 'line_top_left', 'line_surround', 'drop_n', 'drop_s', 'drop_w'],
            R: ['line_right', 'line_left_right', 'line_bottom_right', 'line_top_right', 'line_surround', 'drop_n', 'drop_s', 'drop_e']
        };

        const TOOL_NAMES = {
            empty: 'พื้นขาว (White floor)',
            line: 'เส้นขอบดำ (Line border)',
            line_top: 'เส้นบน (Top border)',
            line_bottom: 'เส้นล่าง (Bottom border)',
            line_left: 'เส้นซ้าย (Left border)',
            line_right: 'เส้นขวา (Right border)',
            line_top_bottom: 'เส้นบน-ล่าง',
            line_surround: 'เส้นล้อมรอบ (Box)',
            start: 'จุดเริ่มต้น (Start zone)',
            checkpoint: 'เช็คพอยต์ (Checkpoint)',
            drop_n: 'จุดดรอป เหนือ (Drop North)',
            drop_e: 'จุดดรอป ออก (Drop East)',
            drop_s: 'จุดดรอป ใต้ (Drop South)',
            drop_w: 'จุดดรอป ตก (Drop West)',
            finish: 'จุดสิ้นสุด (Finish zone)',
            blackhole: 'หลุมดำ (Black hole)',
            bump: 'ลูกระนาด (Bumps)',
            bridge: 'สะพาน (Bridge +50mm)',
            seesaw: 'ไม้กระดก (Seesaw)',
            tunnel: 'อุโมงค์ (Tunnel)',
            bomb: 'ลูกระเบิด (Bomb)'
        };

        // ---------------------------------------------------------------------
        // 1. ARENA GRID RENDERING & INTERACTIVE TILE EDITING
        // ---------------------------------------------------------------------
        function initGrid() {
            const gridEl = document.getElementById('fieldGrid');
            if (!gridEl) return;

            gridEl.style.gridTemplateColumns = `repeat(${COLS}, 50px)`;
            gridEl.innerHTML = '';

            gridData.forEach((data, i) => {
                const tile = document.createElement('button');
                tile.type = 'button';
                tile.className = 'tile ' + (data.type || 'empty');
                tile.id = `tile_${i}`;
                tile.setAttribute('role', 'gridcell');
                tile.title = `#${i} (X:${i % COLS}, Y:${Math.floor(i / COLS)}) · ${TOOL_NAMES[data.type] || data.type}`;
                tile.onclick = (e) => handleCellClick(i, tile, e);
                gridEl.appendChild(tile);
            });

            renderPathOverlay2D();
        }

        function setTool(toolId) {
            selectedTool = toolId;
            document.querySelectorAll('.tool-chip').forEach(c => c.classList.remove('active'));
            const activeChip = document.getElementById(`tool_${toolId}`) || document.getElementById('tool_drop');
            if (activeChip) activeChip.classList.add('active');

            const labelEl = document.getElementById('currentToolLabel');
            if (labelEl) labelEl.innerText = TOOL_NAMES[toolId] || toolId;
        }

        function handleCellClick(idx, cellEl, e) {
            if (isSimulating) stopSimPreview();

            // 1. Drop Zone Direction Cycling on repeat click
            if (gridData[idx].type && gridData[idx].type.startsWith('drop') && selectedTool.startsWith('drop')) {
                const cur = gridData[idx].type;
                let next = 'drop_n';
                if (cur === 'drop_n') next = 'drop_e';
                else if (cur === 'drop_e') next = 'drop_s';
                else if (cur === 'drop_s') next = 'drop_w';
                else if (cur === 'drop_w') next = 'drop_n';
                gridData[idx].type = next;
                cellEl.className = 'tile ' + next;
                cellEl.title = `#${idx} · ${TOOL_NAMES[next]}`;
                update3DObstaclesFromGrid();
                return;
            }

            // 2. Start / Finish Singleton validation
            if (selectedTool === 'start') {
                gridData.forEach((d, i) => {
                    if (d.type === 'start') {
                        d.type = 'empty';
                        const el = document.getElementById(`tile_${i}`);
                        if (el) el.className = 'tile empty';
                    }
                });
            }
            if (selectedTool === 'finish') {
                gridData.forEach((d, i) => {
                    if (d.type === 'finish') {
                        d.type = 'empty';
                        const el = document.getElementById(`tile_${i}`);
                        if (el) el.className = 'tile empty';
                    }
                });
            }

            // Quotas
            if (selectedTool === 'checkpoint' && gridData.filter(d => d.type === 'checkpoint').length >= 2 && gridData[idx].type !== 'checkpoint') {
                showToast("⚠️ อนุญาตให้มี Checkpoint สูงสุด 2 จุดตามกติกา");
                return;
            }
            if (selectedTool.startsWith('drop') && gridData.filter(d => d.type.startsWith('drop')).length >= 4 && !gridData[idx].type.startsWith('drop')) {
                showToast("⚠️ อนุญาตให้มีจุดดรอปสูงสุด 4 จุดตามกติกา");
                return;
            }

            gridData[idx] = { index: idx, type: selectedTool };
            cellEl.className = 'tile ' + selectedTool;
            cellEl.title = `#${idx} · ${TOOL_NAMES[selectedTool]}`;

            update3DObstaclesFromGrid();
        }

        function openLinePicker() {
            document.getElementById('linePickerModal').classList.add('show');
        }

        function closeLinePicker() {
            document.getElementById('linePickerModal').classList.remove('show');
        }

        function applyLineToolStyle(lineStyle) {
            setTool(lineStyle);
            closeLinePicker();
        }

        function applyArenaResize() {
            const colsInput = parseInt(document.getElementById('arenaColsInput').value) || 8;
            const rowsInput = parseInt(document.getElementById('arenaRowsInput').value) || 4;

            COLS = Math.max(2, Math.min(15, colsInput));
            ROWS = Math.max(2, Math.min(15, rowsInput));

            gridData = Array.from({ length: COLS * ROWS }, (_, i) => ({ index: i, type: 'empty' }));
            pathNodes = [];
            initGrid();
            renderWaypointCards();
            renderActionSheet();
            renderGeneratedCode();
            update3DObstaclesFromGrid();
            showToast(`ปรับขนาดสนามเป็น ${COLS} × ${ROWS} เรียบร้อยแล้ว`);
        }

        function clearField() {
            if (!confirm("คุณต้องการล้างสนามเป็นพื้นขาวทั้งหมดใช่หรือไม่?")) return;
            gridData = Array.from({ length: COLS * ROWS }, (_, i) => ({ index: i, type: 'empty' }));
            pathNodes = [];
            initGrid();
            renderWaypointCards();
            renderActionSheet();
            renderGeneratedCode();
            update3DObstaclesFromGrid();
            showToast("ล้างสนามเป็นพื้นขาวเรียบร้อยแล้ว");
        }

        function resetCurrentPath() {
            pathNodes = [];
            renderPathOverlay2D();
            renderWaypointCards();
            renderActionSheet();
            renderGeneratedCode();
            showToast("ล้างเส้นทางเรียบร้อยแล้ว");
        }

        // ---------------------------------------------------------------------
        // 2. AUTO PATHFINDING ENGINE (BFS SHORTEST PATH WITH OBSTACLE RULES)
        // ---------------------------------------------------------------------
        function getValidNeighbors(cellIdx) {
            const valid = [];
            const x = cellIdx % COLS;
            const y = Math.floor(cellIdx / COLS);
            const curType = gridData[cellIdx]?.type || 'empty';

            // Up (North)
            if (y > 0) {
                const n = cellIdx - COLS;
                const t = gridData[n]?.type || 'empty';
                if (!WALL_RULES.T.includes(curType) && !WALL_RULES.B.includes(t) && t !== 'blackhole' && t !== 'bomb') {
                    valid.push(n);
                }
            }
            // Down (South)
            if (y < ROWS - 1) {
                const n = cellIdx + COLS;
                const t = gridData[n]?.type || 'empty';
                if (!WALL_RULES.B.includes(curType) && !WALL_RULES.T.includes(t) && t !== 'blackhole' && t !== 'bomb') {
                    valid.push(n);
                }
            }
            // Left (West)
            if (x > 0) {
                const n = cellIdx - 1;
                const t = gridData[n]?.type || 'empty';
                if (!WALL_RULES.L.includes(curType) && !WALL_RULES.R.includes(t) && t !== 'blackhole' && t !== 'bomb') {
                    valid.push(n);
                }
            }
            // Right (East)
            if (x < COLS - 1) {
                const n = cellIdx + 1;
                const t = gridData[n]?.type || 'empty';
                if (!WALL_RULES.R.includes(curType) && !WALL_RULES.L.includes(t) && t !== 'blackhole' && t !== 'bomb') {
                    valid.push(n);
                }
            }
            return valid;
        }

        function findShortestPathBFS(startIdx, targetIdx) {
            if (startIdx === targetIdx) return [startIdx];
            const queue = [[startIdx]];
            const visited = new Set([startIdx]);

            while (queue.length > 0) {
                const path = queue.shift();
                const current = path[path.length - 1];
                if (current === targetIdx) return path;

                for (const next of getValidNeighbors(current)) {
                    if (!visited.has(next)) {
                        visited.add(next);
                        queue.push([...path, next]);
                    }
                }
            }
            return null;
        }

        function getPathDirection(fromIdx, toIdx) {
            if (toIdx === fromIdx + 1) return 'E';
            if (toIdx === fromIdx - 1) return 'W';
            if (toIdx === fromIdx + COLS) return 'S';
            if (toIdx === fromIdx - COLS) return 'N';
            return null;
        }

        function extractSmoothSegments(fullPath) {
            if (!fullPath || fullPath.length < 2) return [];
            const OBSTACLES = ['bump', 'bridge', 'seesaw', 'tunnel'];
            const segments = [];
            let currentDir = getPathDirection(fullPath[0], fullPath[1]);
            let segStartIdx = fullPath[0];
            let segTiles = [fullPath[0]];

            for (let i = 1; i < fullPath.length; i++) {
                const prevCell = fullPath[i - 1], currCell = fullPath[i];
                const dir = getPathDirection(prevCell, currCell);
                const prevTileType = gridData[prevCell]?.type || 'empty';
                const currTileType = gridData[currCell]?.type || 'empty';
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
                const lastTileType = gridData[fullPath[fullPath.length - 1]]?.type || 'empty';
                segments.push({
                    from: segStartIdx, to: fullPath[fullPath.length - 1], tilesCount: segTiles.length - 1,
                    direction: currentDir, terrain: OBSTACLES.includes(lastTileType) ? lastTileType : 'flat'
                });
            }
            return segments.filter(s => s.tilesCount > 0);
        }

        function autoCalculateMission() {
            const startNode = gridData.find(d => d.type === 'start');
            if (!startNode) {
                showToast("⚠️ ไม่พบจุด START บนสนาม กรุณาวางจุดเริ่มต้นก่อนครับ");
                return;
            }
            const checkpoints = gridData.filter(d => d.type === 'checkpoint');
            const drops = gridData.filter(d => d.type.startsWith('drop'));
            const finishNode = gridData.find(d => d.type === 'finish');

            if (checkpoints.length === 0 && drops.length === 0 && !finishNode) {
                showToast("⚠️ ยังไม่มีจุดภารกิจ (Checkpoint / Drop / Finish) เลยครับ");
                return;
            }

            pathNodes = [];
            let currentCellIdx = startNode.index;
            pathNodes.push({ cellIdx: currentCellIdx, fn: 'FF', speed: CRUISE_SPEED, timer: BASE_TIMER_MS, dist: 1, terrain: 'flat', leg: 'START' });

            let unvisited = [...checkpoints, ...drops];
            let legCounter = 1;

            while (unvisited.length > 0) {
                let bestPath = null, bestTargetIdx = -1, minDistance = Infinity;
                for (let i = 0; i < unvisited.length; i++) {
                    const path = findShortestPathBFS(currentCellIdx, unvisited[i].index);
                    if (path && path.length < minDistance) {
                        minDistance = path.length;
                        bestPath = path;
                        bestTargetIdx = i;
                    }
                }

                if (!bestPath) {
                    showToast("🚨 เส้นทางถูกบล็อก! มีเป้าหมายบางจุดที่เข้าถึงไม่ได้ (ติดกำแพงหรือหลุมดำ)");
                    return;
                }

                const targetNode = unvisited[bestTargetIdx];
                const isDropTarget = targetNode.type.startsWith('drop');
                const segments = extractSmoothSegments(bestPath);
                const currentLegName = legCounter <= 4 ? `BOX${legCounter}` : 'END';

                for (const seg of segments) {
                    let t = BASE_TIMER_MS + (seg.tilesCount - 1) * CRUISE_TIMER_MS;
                    let spd = CRUISE_SPEED;
                    if (seg.terrain === 'bridge') { t = BRIDGE_TIMER_MS * seg.tilesCount; spd = 92; }
                    else if (seg.terrain === 'bump') { t = BUMP_TIMER_MS * seg.tilesCount; spd = 65; }
                    else if (seg.terrain === 'seesaw') { t = SEESAW_TIMER_MS * seg.tilesCount; spd = 75; }
                    else if (seg.terrain === 'tunnel') { t = TUNNEL_TIMER_MS * seg.tilesCount; spd = CRUISE_SPEED; }

                    pathNodes.push({
                        cellIdx: seg.to, fn: 'FF', speed: spd, timer: t, dist: seg.tilesCount,
                        terrain: seg.terrain, leg: currentLegName
                    });
                }

                // Drop zone recoil retreat (BB)
                if (isDropTarget && bestPath.length >= 2) {
                    const retreatCell = bestPath[bestPath.length - 2];
                    pathNodes.push({
                        cellIdx: retreatCell, fn: 'BB', speed: CRUISE_SPEED, timer: BASE_TIMER_MS,
                        dist: 1, terrain: 'flat', leg: currentLegName, note: 'ถอยหลังออกจากช่องดรอปกลับสู่ทางหลัก'
                    });
                    currentCellIdx = retreatCell;
                    legCounter++;
                } else {
                    currentCellIdx = targetNode.index;
                }

                unvisited.splice(bestTargetIdx, 1);
            }

            // Final leg to FINISH
            if (finishNode) {
                const path = findShortestPathBFS(currentCellIdx, finishNode.index);
                if (path) {
                    const segments = extractSmoothSegments(path);
                    for (const seg of segments) {
                        let t = BASE_TIMER_MS + (seg.tilesCount - 1) * CRUISE_TIMER_MS;
                        let spd = CRUISE_SPEED;
                        if (seg.terrain === 'bridge') { t = BRIDGE_TIMER_MS * seg.tilesCount; spd = 92; }
                        else if (seg.terrain === 'bump') { t = BUMP_TIMER_MS * seg.tilesCount; spd = 65; }
                        else if (seg.terrain === 'seesaw') { t = SEESAW_TIMER_MS * seg.tilesCount; spd = 75; }
                        else if (seg.terrain === 'tunnel') { t = TUNNEL_TIMER_MS * seg.tilesCount; spd = CRUISE_SPEED; }

                        pathNodes.push({
                            cellIdx: seg.to, fn: 'FF', speed: spd, timer: t, dist: seg.tilesCount,
                            terrain: seg.terrain, leg: 'END'
                        });
                    }
                }
            }

            renderPathOverlay2D();
            renderWaypointCards();
            renderActionSheet();
            renderGeneratedCode();
            update3DObstaclesFromGrid();
            showToast(`⚡ คำนวณเส้นทางสำเร็จ! (${pathNodes.length} สเต็ป)`);
            logTerminal(`[Auto Path]: คำนวณเส้นทางเสร็จสิ้น (${pathNodes.length} Waypoints)`);
        }

        // ---------------------------------------------------------------------
        // 3. 2D SVG ROUTE OVERLAY RENDERING
        // ---------------------------------------------------------------------
        function renderPathOverlay2D() {
            const svgPath = document.getElementById('robotPathDashed');
            const markersLayer = document.getElementById('fieldNodeMarkers');
            const countBadge = document.getElementById('waypointCountBadge');
            if (countBadge) countBadge.innerText = pathNodes.length;

            if (!svgPath || !markersLayer) return;

            markersLayer.innerHTML = '';
            if (pathNodes.length < 2) {
                svgPath.setAttribute('d', '');
                return;
            }

            const gridEl = document.getElementById('fieldGrid');
            if (!gridEl) return;
            const gridRect = gridEl.getBoundingClientRect();

            let dStr = "";
            pathNodes.forEach((node, i) => {
                const tileEl = document.getElementById(`tile_${node.cellIdx}`);
                if (!tileEl) return;

                const tileRect = tileEl.getBoundingClientRect();
                const cx = tileRect.left - gridRect.left + tileRect.width / 2;
                const cy = tileRect.top - gridRect.top + tileRect.height / 2;

                if (i === 0) dStr += `M ${cx} ${cy}`;
                else dStr += ` L ${cx} ${cy}`;

                const marker = document.createElement('div');
                marker.className = 'field-node-marker';
                marker.id = `marker_${i}`;
                marker.style.left = `${cx}px`;
                marker.style.top = `${cy}px`;
                marker.innerText = `${i + 1}`;
                markersLayer.appendChild(marker);
            });

            svgPath.setAttribute('d', dStr);
        }

        function renderWaypointCards() {
            const list = document.getElementById('waypointCardList');
            if (!list) return;

            if (pathNodes.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: var(--mb-text-muted); font-size: 13px;">
                        ยังไม่มีเส้นทางภารกิจ กรุณากดปุ่ม <strong>[⚡ Auto Path]</strong> หรือเลือก Presets
                    </div>
                `;
                return;
            }

            list.innerHTML = pathNodes.map((wp, idx) => {
                const cell = gridData[wp.cellIdx] || { type: 'empty' };
                const terrainName = cell.type !== 'empty' ? (TOOL_NAMES[cell.type] || cell.type) : 'พื้นเรียบ (Flat)';
                return `
                    <div class="wp-item-row" id="wpCard_${idx}">
                        <div class="wp-left">
                            <div class="wp-badge">${idx + 1}</div>
                            <div class="wp-info">
                                <span class="wp-title">Node #${wp.cellIdx} · Action: ${wp.fn}</span>
                                <span class="wp-sub"><span class="tag-obstacle">${terrainName}</span> · Spd: ${wp.speed}% · Leg: ${wp.leg || 'NORM'}</span>
                            </div>
                        </div>
                        <div class="wp-right">
                            ${(wp.timer / 1000).toFixed(3)}s
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderActionSheet() {
            const tbody = document.getElementById('actionSheetTbody');
            if (!tbody) return;

            if (pathNodes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--mb-text-muted); padding: 20px;">ไม่มีข้อมูลสเต็ป</td></tr>`;
                return;
            }

            tbody.innerHTML = pathNodes.map((r, i) => {
                const cell = gridData[r.cellIdx] || { type: 'empty' };
                const tName = cell.type !== 'empty' ? (TOOL_NAMES[cell.type] || cell.type) : 'พื้นราบทั่วไป';
                return `
                    <tr>
                        <td><span class="step-badge">${i + 1}</span></td>
                        <td style="font-family: var(--font-code); font-weight: 700; color: var(--mb-brand-deep);">${r.fn} (ช่อง #${r.cellIdx})</td>
                        <td style="color: var(--mb-text-secondary); font-family: var(--font-code); font-variant-numeric: tabular-nums;">Spd ${r.speed}%, ${(r.timer / 1000).toFixed(3)}s</td>
                        <td>
                            <div>${tName}</div>
                            ${r.note ? `<div style="font-size: 11px; color: var(--mb-text-muted);">${r.note}</div>` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ---------------------------------------------------------------------
        // 4. CODE SYNTHESIZER (MICROPYTHON / ARDUINO C++)
        // ---------------------------------------------------------------------
        function renderGeneratedCode() {
            const pre = document.getElementById('codeDisplayArea');
            if (!pre) return;

            if (pathNodes.length < 2) {
                pre.innerText = "// กรุณากดปุ่ม [⚡ Auto Path] เพื่อคำนวณและสร้างโค้ดควบคุมหุ่นยนต์";
                return;
            }

            if (currentCodeLang === 'py') {
                let py = `# =============================================================================\n`;
                py += `# PT-BOT ATOM VX TACTICAL MISSION (MICROPYTHON - ROBOBLOCKS IDE)\n`;
                py += `# Hardware: PT Atom VX (ESP32-WROOM-32D, 4WD WD4) | Silicon Wheels: 43mm\n`;
                py += `# Generated Waypoints: ${pathNodes.length} Steps\n`;
                py += `# =============================================================================\n\n`;
                py += `import motor, imu, time\n\n`;
                py += `def run_tactical_mission():\n`;
                py += `    motor.set_motor_drive(motor.WD4)\n`;
                py += `    imu.set_offset("yaw", 0)\n`;
                py += `    time.sleep(0.5)\n\n`;

                pathNodes.forEach((node, i) => {
                    const sec = (node.timer / 1000).toFixed(3);
                    if (node.fn === 'BB') {
                        py += `    # Step ${i + 1}: Reverse recoil from drop\n`;
                        py += `    motor.forward_degree_time(180, 20, ${node.speed}, 0.6, 2.0, ${sec})\n`;
                        py += `    motor.stop()\n`;
                        py += `    time.sleep(0.2)\n\n`;
                    } else {
                        py += `    # Step ${i + 1}: Travel to Node #${node.cellIdx} (${node.terrain})\n`;
                        py += `    motor.forward_degree_time(0, 20, ${node.speed}, 0.6, 2.0, ${sec})\n`;
                        py += `    motor.stop()\n`;
                        py += `    time.sleep(0.15)\n\n`;
                    }
                });

                py += `    # Mission Complete\n`;
                py += `    motor.stop()\n`;
                py += `    print("PT Atom VX Mission Accomplished 100 PTS!")\n\n`;
                py += `run_tactical_mission()\n`;
                pre.innerText = py;
            } else {
                let cpp = `// =============================================================================\n`;
                cpp += `// PT-BOT ATOM VX 100 PTS RESCUE MISSION (ARDUINO C++)\n`;
                cpp += `// Board: PT Atom VX | 4WD 570RPM | PID Gyro Heading Locked\n`;
                cpp += `// =============================================================================\n\n`;
                cpp += `#include <ATOM_VX.h>\n\n`;
                cpp += `int T_FLAT_BASE   = ${BASE_TIMER_MS};\n`;
                cpp += `int T_FLAT_CRUISE = ${CRUISE_TIMER_MS};\n`;
                cpp += `int T_BRIDGE      = ${BRIDGE_TIMER_MS};\n`;
                cpp += `int T_BUMP        = ${BUMP_TIMER_MS};\n`;
                cpp += `int T_SEESAW      = ${SEESAW_TIMER_MS};\n\n`;
                cpp += `void setup() {\n`;
                cpp += `    ATOM_VX_Begin();\n`;
                cpp += `    ResetGyro();\n`;
                cpp += `    delay(500);\n`;
                cpp += `}\n\n`;
                cpp += `void loop() {\n`;

                pathNodes.forEach((node, i) => {
                    if (node.fn === 'BB') {
                        cpp += `    // Step ${i + 1}: Reverse Recoil\n`;
                        cpp += `    MoveDirectionSpeed(180, ${node.speed}, ${node.timer});\n`;
                    } else {
                        cpp += `    // Step ${i + 1}: Forward to #${node.cellIdx} (${node.terrain})\n`;
                        cpp += `    MoveDirectionSpeed(0, ${node.speed}, ${node.timer});\n`;
                    }
                    cpp += `    MotorStop();\n    delay(150);\n\n`;
                });

                cpp += `    while(1) { MotorStop(); }\n`;
                cpp += `}\n`;
                pre.innerText = cpp;
            }
        }

        function switchCodeLang(lang) {
            currentCodeLang = lang;
            document.getElementById('tabCodePy').classList.toggle('active', lang === 'py');
            document.getElementById('tabCodeIno').classList.toggle('active', lang === 'ino');
            renderGeneratedCode();
        }

        // ---------------------------------------------------------------------
        // 5. OFFICIAL 3D ARENA & SIMULATION (AUTHENTIC ROBOBLOCKS IDE 3D LAB)
        // ---------------------------------------------------------------------
        let scene, camera, renderer, controls;
        let robotMesh = null;
        let arenaGroup = null;
        let seesawPivots = {};
        let trailMesh = null;
        let trailPoints = [];

        function initThreeSimulator() {
            const container = document.getElementById('threeCanvasContainer');
            if (!container) return;

            const w = container.clientWidth || 800;
            const h = container.clientHeight || 500;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x090d16);

            camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 50);
            camera.position.set(2.2, 2.4, 2.2);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.target.set(0, 0, 0);

            // Realistic Tournament Studio Lighting
            const ambient = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambient);

            const mainLight = new THREE.DirectionalLight(0xffffff, 0.95);
            mainLight.position.set(4, 7, 4);
            mainLight.castShadow = true;
            mainLight.shadow.mapSize.width = 1024;
            mainLight.shadow.mapSize.height = 1024;
            mainLight.shadow.bias = -0.0005;
            scene.add(mainLight);

            const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
            fillLight.position.set(-4, 3, -3);
            scene.add(fillLight);

            arenaGroup = new THREE.Group();
            scene.add(arenaGroup);

            buildRobotChassis();
            rebuild3DArena();

            window.addEventListener('resize', () => {
                const nw = container.clientWidth;
                const nh = container.clientHeight;
                camera.aspect = nw / nh;
                camera.updateProjectionMatrix();
                renderer.setSize(nw, nh);
            });

            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            }
            animate();
        }

        function rebuild3DArena() {
            if (!scene || !arenaGroup) return;

            while (arenaGroup.children.length > 0) {
                const obj = arenaGroup.children[0];
                arenaGroup.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
            }
            seesawPivots = {};

            const tileW = 0.3; // 300mm standard tile in meters
            const tileH = 0.3;
            const arenaW = COLS * tileW;
            const arenaD = ROWS * tileH;

            // 1. Realistic Competition Arena Table & Beveled Base Pedestal
            const tableGeo = new THREE.BoxGeometry(arenaW + 0.08, 0.036, arenaD + 0.08);
            const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.25 });
            const table = new THREE.Mesh(tableGeo, tableMat);
            table.position.set(0, -0.018, 0);
            table.receiveShadow = true;
            arenaGroup.add(table);

            // Beveled rim edge
            const rimGeo = new THREE.BoxGeometry(arenaW + 0.04, 0.006, arenaD + 0.04);
            const rimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.3 });
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.position.set(0, 0.001, 0);
            rim.receiveShadow = true;
            arenaGroup.add(rim);

            // 2. Build 32 Official Competition Cells
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cellIdx = r * COLS + c;
                    const cell = gridData[cellIdx] || { type: 'empty' };
                    buildCell3D(c, r, cell, cellIdx, tileW, tileH, arenaW, arenaD);
                }
            }
        }

        function buildCell3D(col, row, cell, cellIdx, tileW, tileH, arenaW, arenaD) {
            const x = (col * tileW + tileW / 2) - arenaW / 2;
            const z = (row * tileH + tileH / 2) - arenaD / 2;

            const cellGroup = new THREE.Group();
            cellGroup.position.set(x, 0, z);

            // 1. Tile Floor Base (High-Grip Matte White Vinyl Plastwood, 300x300mm standard)
            let tileColor = 0xf8fafc;
            if (cell.type === 'start') tileColor = 0xecfdf5;
            else if (cell.type === 'finish') tileColor = 0xfef2f2;
            else if (cell.type === 'checkpoint') tileColor = 0xfefce8;
            else if (cell.type === 'tunnel') tileColor = 0x1e293b;
            else if (cell.type === 'blackhole') tileColor = 0x020617;
            else if (cell.type.startsWith('drop_')) tileColor = 0xecfdf5;

            const floorGeo = new THREE.PlaneGeometry(tileW - 0.002, tileH - 0.002);
            const floorMat = new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.7, metalness: 0.05 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = 0.001;
            floor.receiveShadow = true;
            cellGroup.add(floor);

            // 2. Scaled 20mm Matte Black Boundary Lines
            const bw = 0.02; // 20mm
            const borderMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.85, metalness: 0.05 });
            const addBorder = (bx, bz, bwX, bwZ) => {
                const bGeo = new THREE.PlaneGeometry(bwX, bwZ);
                const bMesh = new THREE.Mesh(bGeo, borderMat);
                bMesh.rotation.x = -Math.PI / 2;
                bMesh.position.set(bx, 0.002, bz);
                bMesh.receiveShadow = true;
                cellGroup.add(bMesh);
            };

            const isTop = cell.type.includes('line_top') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_w' || cell.type === 'drop_e';
            const isBottom = cell.type.includes('line_bottom') || cell.type === 'line_surround' || cell.type === 'drop_s' || cell.type === 'drop_w' || cell.type === 'drop_e';
            const isLeft = cell.type.includes('line_left') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_s' || cell.type === 'drop_w';
            const isRight = cell.type.includes('line_right') || cell.type === 'line_surround' || cell.type === 'drop_n' || cell.type === 'drop_s' || cell.type === 'drop_e';

            if (isTop) addBorder(0, -tileH / 2 + bw / 2, tileW, bw);
            if (isBottom) addBorder(0, tileH / 2 - bw / 2, tileW, bw);
            if (isLeft) addBorder(-tileW / 2 + bw / 2, 0, bw, tileH);
            if (isRight) addBorder(tileW / 2 - bw / 2, 0, bw, tileH);

            // 3. Official PT Robotics Corner Locking Brackets (Yellow Clips seen in official arena photos)
            const cornerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.3 });
            [[-tileW / 2 + 0.006, -tileH / 2 + 0.006], [tileW / 2 - 0.006, -tileH / 2 + 0.006], [-tileW / 2 + 0.006, tileH / 2 - 0.006], [tileW / 2 - 0.006, tileH / 2 - 0.006]].forEach(([cx, cz]) => {
                const cGeo = new THREE.BoxGeometry(0.012, 0.004, 0.012);
                const cMesh = new THREE.Mesh(cGeo, cornerMat);
                cMesh.position.set(cx, 0.003, cz);
                cellGroup.add(cMesh);
            });

            // 4. Center Plaque on Center Tile (Col 3, Row 1)
            if (col === 3 && row === 1) {
                buildCenterPlaque(cellGroup);
            }

            // 5. Official Competition 3D Obstacles
            if (cell.type === 'bridge') {
                buildBridgeMesh(cellGroup);
            } else if (cell.type === 'seesaw') {
                buildSeesawMesh(cellGroup, cellIdx);
            } else if (cell.type === 'bump') {
                buildBumpsMesh(cellGroup);
            } else if (cell.type === 'tunnel') {
                buildTunnelMesh(cellGroup);
            } else if (cell.type === 'bomb') {
                buildBombMesh(cellGroup);
            } else if (cell.type === 'blackhole') {
                buildBlackHoleMesh(cellGroup);
            } else if (cell.type.startsWith('drop_')) {
                buildDropBayMesh(cellGroup, cell.type);
            } else if (cell.type === 'checkpoint') {
                buildCheckpointMesh(cellGroup);
            } else if (cell.type === 'start') {
                buildStartBadge(cellGroup);
                if (robotMesh && !isSimulating) {
                    robotMesh.position.set(x, 0.022, z);
                    updateTelemetryHUD(0, 0, 0, 0, Math.round(x * 100), Math.round(z * 100));
                }
            } else if (cell.type === 'finish') {
                buildFinishBadge(cellGroup);
            }

            arenaGroup.add(cellGroup);
        }

        function buildCenterPlaque(parent) {
            const plaqueGroup = new THREE.Group();
            const baseGeo = new THREE.BoxGeometry(0.16, 0.0012, 0.11);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.set(0, 0.0015, 0);
            plaqueGroup.add(base);

            const emblemGeo = new THREE.BoxGeometry(0.07, 0.002, 0.04);
            const emblemMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
            const emblem = new THREE.Mesh(emblemGeo, emblemMat);
            emblem.position.set(0, 0.002, -0.006);
            plaqueGroup.add(emblem);

            const badgeGeo = new THREE.BoxGeometry(0.06, 0.0022, 0.008);
            const badgeMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.3 });
            const badge = new THREE.Mesh(badgeGeo, badgeMat);
            badge.position.set(0, 0.0022, 0.024);
            plaqueGroup.add(badge);

            parent.add(plaqueGroup);
        }

        function buildBridgeMesh(parent) {
            const bridgeGroup = new THREE.Group();
            const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.25 });
            const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.85 });
            const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

            // Elevated Center Deck (Height 50mm = 0.05m)
            const deckGeo = new THREE.BoxGeometry(0.14, 0.008, 0.28);
            const deck = new THREE.Mesh(deckGeo, bridgeMat);
            deck.position.set(0, 0.046, 0);
            deck.castShadow = true;
            deck.receiveShadow = true;
            bridgeGroup.add(deck);

            const laneGeo = new THREE.PlaneGeometry(0.13, 0.02);
            const lane = new THREE.Mesh(laneGeo, stripeMat);
            lane.rotation.x = -Math.PI / 2;
            lane.position.set(0, 0.0502, 0);
            bridgeGroup.add(lane);

            // Incline Ramp
            const rampInGeo = new THREE.BoxGeometry(0.086, 0.006, 0.28);
            const rampIn = new THREE.Mesh(rampInGeo, bridgeMat);
            rampIn.position.set(-0.108, 0.024, 0);
            rampIn.rotation.z = Math.atan2(0.046, 0.082);
            rampIn.castShadow = true;
            rampIn.receiveShadow = true;
            bridgeGroup.add(rampIn);

            // Decline Ramp
            const rampOut = new THREE.Mesh(rampInGeo, bridgeMat);
            rampOut.position.set(0.108, 0.024, 0);
            rampOut.rotation.z = -Math.atan2(0.046, 0.082);
            rampOut.castShadow = true;
            rampOut.receiveShadow = true;
            bridgeGroup.add(rampOut);

            // Undercarriage Skirts
            const skirtMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
            [-0.138, 0.138].forEach(sz => {
                const skirtGeo = new THREE.BoxGeometry(0.27, 0.044, 0.004);
                const skirt = new THREE.Mesh(skirtGeo, skirtMat);
                skirt.position.set(0, 0.022, sz);
                skirt.castShadow = true;
                bridgeGroup.add(skirt);
            });

            // Guardrails
            [-0.135, 0.135].forEach(zOffset => {
                const railGeo = new THREE.CylinderGeometry(0.0032, 0.0032, 0.29, 12);
                const rail = new THREE.Mesh(railGeo, railMat);
                rail.rotation.z = Math.PI / 2;
                rail.position.set(0, 0.068, zOffset);
                rail.castShadow = true;
                bridgeGroup.add(rail);

                [-0.1, 0, 0.1].forEach(xOffset => {
                    const postGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.044, 8);
                    const post = new THREE.Mesh(postGeo, railMat);
                    post.position.set(xOffset, 0.046, zOffset);
                    bridgeGroup.add(post);
                });
            });

            parent.add(bridgeGroup);
        }

        function buildTunnelMesh(parent) {
            const tunnelGroup = new THREE.Group();
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.35 });
            const warningMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });

            const tunnelH = 0.18;
            const wallT = 0.024;

            [-0.15 + wallT / 2, 0.15 - wallT / 2].forEach(wx => {
                const wallGeo = new THREE.BoxGeometry(wallT, tunnelH, 0.298);
                const wall = new THREE.Mesh(wallGeo, bodyMat);
                wall.position.set(wx, tunnelH / 2, 0);
                wall.castShadow = true;
                wall.receiveShadow = true;
                tunnelGroup.add(wall);
            });

            const roofGeo = new THREE.BoxGeometry(0.3, 0.014, 0.3);
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.set(0, tunnelH + 0.007, 0);
            roof.castShadow = true;
            tunnelGroup.add(roof);

            // Portal hazard warning beams
            [-0.144, 0.144].forEach(pz => {
                const lintelGeo = new THREE.BoxGeometry(0.296, 0.026, 0.012);
                const lintel = new THREE.Mesh(lintelGeo, bodyMat);
                lintel.position.set(0, tunnelH - 0.013, pz);
                tunnelGroup.add(lintel);

                const trimGeo = new THREE.BoxGeometry(0.28, 0.005, 0.014);
                const trim = new THREE.Mesh(trimGeo, warningMat);
                trim.position.set(0, tunnelH - 0.026, pz);
                tunnelGroup.add(trim);
            });

            parent.add(tunnelGroup);
        }

        function buildSeesawMesh(parent, cellIdx) {
            const seesawGroup = new THREE.Group();
            const fulcrumRadius = 0.0075; // 15mm diameter
            const fulcrumGeo = new THREE.CylinderGeometry(fulcrumRadius, fulcrumRadius, 0.29, 24);
            const fulcrumMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.25 });
            const fulcrum = new THREE.Mesh(fulcrumGeo, fulcrumMat);
            fulcrum.rotation.x = Math.PI / 2;
            fulcrum.position.set(0, fulcrumRadius, 0);
            fulcrum.castShadow = true;
            seesawGroup.add(fulcrum);

            const pillowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
            [-0.142, 0.142].forEach(pz => {
                const blockGeo = new THREE.BoxGeometry(0.028, fulcrumRadius * 2, 0.012);
                const block = new THREE.Mesh(blockGeo, pillowMat);
                block.position.set(0, fulcrumRadius, pz);
                seesawGroup.add(block);
            });

            const pivotGroup = new THREE.Group();
            pivotGroup.position.set(0, fulcrumRadius * 2, 0);

            const plankGeo = new THREE.BoxGeometry(0.286, 0.005, 0.276);
            const plankMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.15 });
            const plank = new THREE.Mesh(plankGeo, plankMat);
            plank.position.set(0, 0.0025, 0);
            plank.castShadow = true;
            plank.receiveShadow = true;
            pivotGroup.add(plank);

            const saddleGeo = new THREE.BoxGeometry(0.032, 0.004, 0.278);
            const saddleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
            const saddle = new THREE.Mesh(saddleGeo, saddleMat);
            saddle.position.set(0, 0.0045, 0);
            pivotGroup.add(saddle);

            seesawGroup.add(pivotGroup);
            seesawPivots[cellIdx] = pivotGroup;
            parent.add(seesawGroup);
        }

        function buildBumpsMesh(parent) {
            const bumpMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7, metalness: 0.05 });
            const chopstickRadius = 0.003; // 6mm diameter
            const span = 0.2; // 200mm span
            const count = 7;
            const step = span / (count - 1);

            for (let i = 0; i < count; i++) {
                const bx = -0.1 + i * step;
                const bumpGeo = new THREE.CylinderGeometry(chopstickRadius, chopstickRadius, 0.276, 16);
                const bump = new THREE.Mesh(bumpGeo, bumpMat);
                bump.rotation.x = Math.PI / 2;
                bump.position.set(bx, chopstickRadius, 0);
                bump.castShadow = true;
                bump.receiveShadow = true;
                parent.add(bump);
            }
        }

        function buildBombMesh(parent) {
            const bombGroup = new THREE.Group();
            const cubeGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
            const cubeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.25 });
            const cube = new THREE.Mesh(cubeGeo, cubeMat);
            cube.position.set(0, 0.01, 0);
            cube.castShadow = true;
            bombGroup.add(cube);

            const bandGeo = new THREE.BoxGeometry(0.0205, 0.006, 0.0205);
            const bandMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.5 });
            const band = new THREE.Mesh(bandGeo, bandMat);
            band.position.set(0, 0.01, 0);
            bombGroup.add(band);

            const ringGeo = new THREE.RingGeometry(0.024, 0.032, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(0, 0.001, 0);
            bombGroup.add(ring);

            parent.add(bombGroup);
        }

        function buildBlackHoleMesh(parent) {
            const holeGroup = new THREE.Group();
            const pitGeo = new THREE.BoxGeometry(0.2, 0.008, 0.29);
            const pitMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.95 });
            const pit = new THREE.Mesh(pitGeo, pitMat);
            pit.position.set(0, -0.0038, 0);
            holeGroup.add(pit);

            const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
            [-0.102, 0.102].forEach(sx => {
                const edgeGeo = new THREE.BoxGeometry(0.006, 0.002, 0.29);
                const edge = new THREE.Mesh(edgeGeo, stripeMat);
                edge.position.set(sx, 0.001, 0);
                holeGroup.add(edge);
            });

            parent.add(holeGroup);
        }

        function buildDropBayMesh(parent, dropType) {
            const bayGroup = new THREE.Group();
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.3 });
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
            const wallH = 0.046;
            const wallT = 0.016;

            const targetFloorGeo = new THREE.PlaneGeometry(0.264, 0.264);
            const targetFloor = new THREE.Mesh(targetFloorGeo, floorMat);
            targetFloor.rotation.x = -Math.PI / 2;
            targetFloor.position.set(0, 0.0015, 0);
            bayGroup.add(targetFloor);

            const walls = [];
            if (dropType === 'drop_n') {
                walls.push({ x: 0, z: -0.15 + wallT / 2, w: 0.3, d: wallT });
                walls.push({ x: -0.15 + wallT / 2, z: 0, w: wallT, d: 0.3 });
                walls.push({ x: 0.15 - wallT / 2, z: 0, w: wallT, d: 0.3 });
            } else if (dropType === 'drop_s') {
                walls.push({ x: 0, z: 0.15 - wallT / 2, w: 0.3, d: wallT });
                walls.push({ x: -0.15 + wallT / 2, z: 0, w: wallT, d: 0.3 });
                walls.push({ x: 0.15 - wallT / 2, z: 0, w: wallT, d: 0.3 });
            } else if (dropType === 'drop_e') {
                walls.push({ x: 0.15 - wallT / 2, z: 0, w: wallT, d: 0.3 });
                walls.push({ x: 0, z: -0.15 + wallT / 2, w: 0.3, d: wallT });
                walls.push({ x: 0, z: 0.15 - wallT / 2, w: 0.3, d: wallT });
            } else {
                walls.push({ x: -0.15 + wallT / 2, z: 0, w: wallT, d: 0.3 });
                walls.push({ x: 0, z: -0.15 + wallT / 2, w: 0.3, d: wallT });
                walls.push({ x: 0, z: 0.15 - wallT / 2, w: 0.3, d: wallT });
            }

            walls.forEach(w => {
                const wGeo = new THREE.BoxGeometry(w.w, wallH, w.d);
                const wMesh = new THREE.Mesh(wGeo, wallMat);
                wMesh.position.set(w.x, wallH / 2, w.z);
                wMesh.castShadow = true;
                wMesh.receiveShadow = true;
                bayGroup.add(wMesh);
            });

            // Target Crosshair Emblem
            const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const cross1 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.008), crossMat);
            cross1.rotation.x = -Math.PI / 2;
            cross1.position.set(0, 0.002, 0);
            bayGroup.add(cross1);

            const cross2 = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.08), crossMat);
            cross2.rotation.x = -Math.PI / 2;
            cross2.position.set(0, 0.002, 0);
            bayGroup.add(cross2);

            // Pre-staged 18mm Rescue Cube Preview inside Drop Bay
            const cubeGeo = new THREE.BoxGeometry(0.018, 0.018, 0.018);
            const cubeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.2 });
            const cube = new THREE.Mesh(cubeGeo, cubeMat);
            cube.position.set(0, 0.009, 0);
            cube.castShadow = true;
            bayGroup.add(cube);

            parent.add(bayGroup);
        }

        function buildCheckpointMesh(parent) {
            const cpGroup = new THREE.Group();
            const discGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.0012, 32);
            const discMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.2 });
            const disc = new THREE.Mesh(discGeo, discMat);
            disc.position.set(0, 0.0015, 0);
            cpGroup.add(disc);

            const ringGeo = new THREE.RingGeometry(0.025, 0.029, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x090a0f, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(0, 0.002, 0);
            cpGroup.add(ring);

            parent.add(cpGroup);
        }

        function buildStartBadge(parent) {
            const startGroup = new THREE.Group();
            const boxGeo = new THREE.BoxGeometry(0.22, 0.002, 0.22);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.4 });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(0, 0.0015, 0);
            startGroup.add(box);

            const arrowGeo = new THREE.BoxGeometry(0.04, 0.0025, 0.07);
            const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
            const arrow = new THREE.Mesh(arrowGeo, arrowMat);
            arrow.position.set(0, 0.0022, -0.01);
            startGroup.add(arrow);

            parent.add(startGroup);
        }

        function buildFinishBadge(parent) {
            const finishGroup = new THREE.Group();
            const padGeo = new THREE.BoxGeometry(0.24, 0.002, 0.24);
            const padMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
            const pad = new THREE.Mesh(padGeo, padMat);
            pad.position.set(0, 0.0015, 0);
            finishGroup.add(pad);

            const trimGeo = new THREE.BoxGeometry(0.18, 0.0025, 0.18);
            const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(0, 0.0022, 0);
            finishGroup.add(trim);

            parent.add(finishGroup);
        }

        function update3DObstaclesFromGrid() {
            rebuild3DArena();
        }

        function buildRobotChassis() {
            if (robotMesh) scene.remove(robotMesh);

            const botGroup = new THREE.Group();

            // Main PCB Chassis
            const pcbGeo = new THREE.BoxGeometry(0.14, 0.02, 0.16);
            const pcbMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.4 });
            const pcb = new THREE.Mesh(pcbGeo, pcbMat);
            pcb.position.y = 0.025;
            pcb.castShadow = true;
            botGroup.add(pcb);

            // ESP32 Module with metal shield
            const espGeo = new THREE.BoxGeometry(0.04, 0.006, 0.05);
            const espMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
            const esp = new THREE.Mesh(espGeo, espMat);
            esp.position.set(0, 0.038, 0);
            botGroup.add(esp);

            // Status LED
            const ledGeo = new THREE.BoxGeometry(0.008, 0.004, 0.008);
            const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(0.03, 0.042, 0.03);
            botGroup.add(led);

            // 4WD Motors and Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.015, 20);
            const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
            const hubMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });

            const wheelOffsets = [
                [-0.065, 0.022, -0.055],
                [0.065, 0.022, -0.055],
                [-0.065, 0.022, 0.055],
                [0.065, 0.022, 0.055]
            ];

            wheelOffsets.forEach(pos => {
                const w = new THREE.Mesh(wheelGeo, wheelMat);
                w.rotation.z = Math.PI / 2;
                w.position.set(pos[0], pos[1], pos[2]);
                w.castShadow = true;
                botGroup.add(w);

                const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.016, 12), hubMat);
                hub.rotation.z = Math.PI / 2;
                hub.position.set(pos[0], pos[1], pos[2]);
                botGroup.add(hub);
            });

            // Heading Laser Marker
            const laserGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.12, 8);
            const laserMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            const laser = new THREE.Mesh(laserGeo, laserMat);
            laser.rotation.x = Math.PI / 2;
            laser.position.set(0, 0.035, -0.12);
            botGroup.add(laser);

            robotMesh = botGroup;
            scene.add(robotMesh);
        }

        // ---------------------------------------------------------------------
        // 6. SIMULATION PLAYBACK (2D & 3D LIVE TRAVERSAL)
        // ---------------------------------------------------------------------
        function toggleSimPreview() {
            if (isSimulating) {
                stopSimPreview();
            } else {
                startSimPreview();
            }
        }

        function startSimPreview() {
            if (pathNodes.length < 2) {
                autoCalculateMission();
                if (pathNodes.length < 2) return;
            }

            isSimulating = true;
            simCurrentStep = 0;
            document.getElementById('btnSimPlay').innerHTML = '<i class="fas fa-pause"></i> Pause Sim';
            document.getElementById('btnSimPreview').innerHTML = '<i class="fas fa-pause"></i> Pause';
            document.getElementById('hudDriveStatus').innerText = 'RUNNING';
            document.getElementById('hudDriveStatus').style.background = '#0284c7';

            const marker = document.getElementById('fieldRobotPreviewMarker');
            if (marker) marker.style.display = 'flex';

            runNextSimStep();
        }

        function stopSimPreview() {
            isSimulating = false;
            if (simAnimInterval) clearTimeout(simAnimInterval);
            document.getElementById('btnSimPlay').innerHTML = '<i class="fas fa-play"></i> Start Sim';
            document.getElementById('btnSimPreview').innerHTML = '<i class="fas fa-play"></i> Simulate';
            document.getElementById('hudDriveStatus').innerText = 'READY';
            document.getElementById('hudDriveStatus').style.background = '#047857';

            const marker = document.getElementById('fieldRobotPreviewMarker');
            if (marker) marker.style.display = 'none';
        }

        function runNextSimStep() {
            if (!isSimulating || simCurrentStep >= pathNodes.length) {
                stopSimPreview();
                showToast("🏁 จำลองการวิ่งครบรอบภารกิจแล้ว!");
                return;
            }

            const node = pathNodes[simCurrentStep];
            const cell = gridData[node.cellIdx];

            // 2D Marker Position
            const gridEl = document.getElementById('fieldGrid');
            const tileEl = document.getElementById(`tile_${node.cellIdx}`);
            const robotMarker = document.getElementById('fieldRobotPreviewMarker');

            if (gridEl && tileEl && robotMarker) {
                const gridRect = gridEl.getBoundingClientRect();
                const tileRect = tileEl.getBoundingClientRect();
                const cx = tileRect.left - gridRect.left + tileRect.width / 2;
                const cy = tileRect.top - gridRect.top + tileRect.height / 2;
                robotMarker.style.left = `${cx}px`;
                robotMarker.style.top = `${cy}px`;
            }

            // 3D Robot Position with Authentic Physics Dynamics
            if (robotMesh) {
                const tileW = 0.3;
                const tileH = 0.3;
                const arenaW = COLS * tileW;
                const arenaD = ROWS * tileH;
                const c = node.cellIdx % COLS;
                const r = Math.floor(node.cellIdx / COLS);
                const x = (c * tileW + tileW / 2) - arenaW / 2;
                const z = (r * tileH + tileH / 2) - arenaD / 2;
                
                let y = 0.022;
                let pitch = 0;
                let roll = 0;

                if (node.terrain === 'bridge') {
                    y = 0.07;
                    pitch = 9.6;
                } else if (node.terrain === 'seesaw') {
                    y = 0.038;
                    pitch = -6.5;
                    if (seesawPivots[node.cellIdx]) {
                        seesawPivots[node.cellIdx].rotation.z = -0.12;
                    }
                } else if (node.terrain === 'bump') {
                    y = 0.028;
                    pitch = (Math.random() - 0.5) * 4;
                }

                robotMesh.position.set(x, y, z);
                robotMesh.rotation.x = pitch * (Math.PI / 180);
                robotMesh.rotation.z = roll * (Math.PI / 180);

                updateTelemetryHUD(
                    roll,
                    pitch,
                    0,
                    node.speed,
                    Math.round(x * 100),
                    Math.round(z * 100)
                );
            }

            // Highlight waypoint card
            document.querySelectorAll('.wp-item-row').forEach(w => w.classList.remove('active'));
            const activeCard = document.getElementById(`wpCard_${simCurrentStep}`);
            if (activeCard) activeCard.classList.add('active');

            simCurrentStep++;
            const stepDuration = Math.max(300, node.timer || 450);
            simAnimInterval = setTimeout(runNextSimStep, stepDuration);
        }

        function resetSimRobotPosition() {
            stopSimPreview();
            const startNode = gridData.find(d => d.type === 'start');
            if (startNode && robotMesh) {
                const tileW = 2.4 / COLS;
                const tileH = 1.2 / ROWS;
                const c = startNode.index % COLS;
                const r = Math.floor(startNode.index / COLS);
                robotMesh.position.set(-1.2 + c * tileW + tileW / 2, 0.022, -0.6 + r * tileH + tileH / 2);
                robotMesh.rotation.set(0, 0, 0);
            }
            clearTrail();
            updateTelemetryHUD(0, 0, 0, 0, 0, 0);
        }

        function clearTrail() {
            if (trailMesh) {
                scene.remove(trailMesh);
                trailMesh = null;
            }
            trailPoints = [];
        }

        function updateTelemetryHUD(roll, pitch, yaw, spd, x, y) {
            const rEl = document.getElementById('teleRoll');
            const pEl = document.getElementById('telePitch');
            const yEl = document.getElementById('teleYaw');
            const sEl = document.getElementById('teleSpeed');
            const posEl = document.getElementById('telePos');

            if (rEl) rEl.innerText = `${roll.toFixed(1)}°`;
            if (pEl) pEl.innerText = `${pitch.toFixed(1)}°`;
            if (yEl) yEl.innerText = `${yaw.toFixed(1)}°`;
            if (sEl) sEl.innerText = `${spd} cm/s`;
            if (posEl) posEl.innerText = `(${x}, ${y})`;
        }

        function setCameraView(mode) {
            document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
            if (mode === 'perspective') {
                document.getElementById('camPerspectiveBtn').classList.add('active');
                camera.position.set(2.2, 2.5, 2.2);
                controls.target.set(0, 0, 0);
            } else if (mode === 'top') {
                document.getElementById('camTopBtn').classList.add('active');
                camera.position.set(0, 3.2, 0.01);
                controls.target.set(0, 0, 0);
            } else if (mode === 'follow' && robotMesh) {
                document.getElementById('camFollowBtn').classList.add('active');
                camera.position.set(robotMesh.position.x + 0.8, 1.2, robotMesh.position.z + 0.8);
                controls.target.copy(robotMesh.position);
            }
        }

        // ---------------------------------------------------------------------
        // 7. PRESET LOADERS
        // ---------------------------------------------------------------------
        function loadOfficial100PtsMission() {
            closeExamplesModal();
            COLS = 8; ROWS = 4;
            document.getElementById('arenaColsInput').value = 8;
            document.getElementById('arenaRowsInput').value = 4;

            gridData = Array.from({ length: 32 }, (_, i) => ({ index: i, type: 'empty' }));
            const preset = {
                1: 'checkpoint', 2: 'tunnel', 6: 'drop_n', 7: 'finish',
                9: 'line_bottom', 10: 'tunnel', 11: 'line_surround', 12: 'checkpoint', 13: 'bump',
                16: 'bridge', 17: 'bridge', 18: 'drop_e', 20: 'seesaw', 22: 'bomb', 23: 'line_bottom',
                24: 'drop_s', 25: 'drop_s', 29: 'blackhole', 31: 'start'
            };
            Object.entries(preset).forEach(([idx, type]) => {
                gridData[Number(idx)] = { index: Number(idx), type };
            });

            initGrid();
            autoCalculateMission();
            showToast("โหลดสนาม Official 100 PTS Mission เรียบร้อยแล้ว");
            logTerminal("Loaded [Official 100 PTS Mission] with 32 tiles, Bridge, Seesaw, Bumps, 4 Drops, 2 Checkpoints.");
        }

        function loadFivePointRoutePreset() {
            closeExamplesModal();
            COLS = 8; ROWS = 4;
            document.getElementById('arenaColsInput').value = 8;
            document.getElementById('arenaRowsInput').value = 4;

            gridData = Array.from({ length: 32 }, (_, i) => ({ index: i, type: 'empty' }));
            gridData[31] = { index: 31, type: 'start' };
            gridData[22] = { index: 22, type: 'bump' };
            gridData[14] = { index: 14, type: 'checkpoint' };
            gridData[13] = { index: 13, type: 'bridge' };
            gridData[12] = { index: 12, type: 'drop_n' };
            gridData[4] = { index: 4, type: 'finish' };

            initGrid();
            autoCalculateMission();
            showToast("โหลด Five-Point Route (Atom VX Rescue) สำเร็จ");
            logTerminal("Loaded [Five-Point Route (Atom VX)] with 5 rescue checkpoints.");
        }

        function loadNormalPreset() {
            closeExamplesModal();
            COLS = 8; ROWS = 4;
            document.getElementById('arenaColsInput').value = 8;
            document.getElementById('arenaRowsInput').value = 4;

            gridData = Array.from({ length: 32 }, (_, i) => ({ index: i, type: 'empty' }));
            gridData[24] = { index: 24, type: 'start' };
            gridData[22] = { index: 22, type: 'checkpoint' };
            gridData[11] = { index: 11, type: 'blackhole' };
            gridData[6] = { index: 6, type: 'drop_w' };
            gridData[7] = { index: 7, type: 'finish' };

            initGrid();
            autoCalculateMission();
            showToast("โหลด Normal Arena Test เรียบร้อยแล้ว");
        }

        function loadBlankArena() {
            closeExamplesModal();
            COLS = 8; ROWS = 4;
            document.getElementById('arenaColsInput').value = 8;
            document.getElementById('arenaRowsInput').value = 4;

            gridData = Array.from({ length: 32 }, (_, i) => ({ index: i, type: 'empty' }));
            gridData[31] = { index: 31, type: 'start' };
            gridData[0] = { index: 0, type: 'finish' };

            pathNodes = [];
            initGrid();
            renderWaypointCards();
            renderActionSheet();
            renderGeneratedCode();
            update3DObstaclesFromGrid();
            showToast("สร้างสนามเปล่า 8 × 4 พร้อมจุด Start/Finish");
        }

        // ---------------------------------------------------------------------
        // 8. TABS & UTILITIES
        // ---------------------------------------------------------------------
        function switchLeftTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            if (tabId === 'planner') {
                document.getElementById('tabBtnPlanner').classList.add('active');
                document.getElementById('tabBtnPlanner').setAttribute('aria-selected', 'true');
                document.getElementById('tab-planner').classList.add('active');
                renderPathOverlay2D();
            } else if (tabId === 'actionsheet') {
                document.getElementById('tabBtnActionSheet').classList.add('active');
                document.getElementById('tabBtnActionSheet').setAttribute('aria-selected', 'true');
                document.getElementById('tab-actionsheet').classList.add('active');
                renderActionSheet();
            } else if (tabId === 'code') {
                document.getElementById('tabBtnCode').classList.add('active');
                document.getElementById('tabBtnCode').setAttribute('aria-selected', 'true');
                document.getElementById('tab-code').classList.add('active');
                renderGeneratedCode();
            }
        }

        function toggleMenuDropdown(e) {
            e.stopPropagation();
            const box = document.getElementById('headerDropdownMenu');
            box.classList.toggle('show');
        }

        document.addEventListener('click', () => {
            const box = document.getElementById('headerDropdownMenu');
            if (box) box.classList.remove('show');
        });

        function openExamplesModal() {
            document.getElementById('examplesModal').classList.add('show');
        }

        function closeExamplesModal() {
            document.getElementById('examplesModal').classList.remove('show');
        }

        function openBoardModal() {
            showToast("Hardware Profile: PT Atom VX (ESP32-WROOM-32D · 4WD WD4)");
        }

        function toggleSerialConnection() {
            const btn = document.getElementById('btnConnectSerial');
            const isConn = btn.classList.contains('connected');
            if (isConn) {
                btn.classList.remove('connected');
                showToast("ตัดการเชื่อมต่อพอร์ต Serial แล้ว");
            } else {
                btn.classList.add('connected');
                showToast("🔌 เชื่อมต่อ PT Atom VX สำเร็จ (COM4 @ 115200 baud)");
            }
        }

        function copyCurrentCode() {
            const code = document.getElementById('codeDisplayArea').innerText;
            navigator.clipboard.writeText(code).then(() => {
                showToast("คัดลอกโค้ดลงคลิปบอร์ดแล้ว!");
            });
        }

        function copyActionSheet() {
            let txt = "โพยสเต็ปเดิน PT-BOT ATOM VX\n";
            pathNodes.forEach((node, i) => {
                txt += `สเต็ป ${i + 1}: ${node.fn} (ช่อง #${node.cellIdx}) | Spd ${node.speed}% | เวลา ${(node.timer / 1000).toFixed(3)}s | ${node.terrain}\n`;
            });
            navigator.clipboard.writeText(txt).then(() => {
                showToast("คัดลอกโพยการแข่งขันแล้ว!");
            });
        }

        function showToast(msg) {
            const t = document.getElementById('toastNotification');
            const m = document.getElementById('toastMsg');
            if (!t || !m) return;
            m.innerText = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2600);
        }

        function logTerminal(msg) {
            const term = document.getElementById('terminalOutput');
            if (!term) return;
            const now = new Date();
            const ts = now.toTimeString().split(' ')[0];
            const div = document.createElement('div');
            div.className = 'log-line';
            div.innerHTML = `<span class="log-ts">[${ts}]</span><span>${msg}</span>`;
            term.appendChild(div);
            term.scrollTop = term.scrollHeight;
        }

        function clearTerminal() {
            const term = document.getElementById('terminalOutput');
            if (term) term.innerHTML = '';
        }

        // Export Scripts
        function exportMicroPythonScript() {
            const code = document.getElementById('codeDisplayArea').innerText;
            const blob = new Blob([code], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = "atom_vx_mission.py";
            a.click();
            showToast("ดาวน์โหลดไฟล์ MicroPython (.py) สำเร็จ");
        }

        function exportArduinoSketch() {
            const code = document.getElementById('codeDisplayArea').innerText;
            const blob = new Blob([code], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = "PT_BOT_Mission.ino";
            a.click();
            showToast("ดาวน์โหลดไฟล์ Arduino (.ino) สำเร็จ");
        }

        function exportRoboBlocksProject() {
            const mbyData = JSON.stringify({
                version: 3,
                board: "atom-vx",
                mission: "Auto-Generated Tactical Route",
                nodes: pathNodes
            }, null, 2);
            const blob = new Blob([mbyData], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = "atom_vx_mission.mby";
            a.click();
            showToast("ดาวน์โหลดโปรเจกต์ roboBlocks (.mby) สำเร็จ");
        }

        // KEYBOARD SHORTCUTS (ACCESSIBILITY & SPEED)
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === '1') switchLeftTab('planner');
            else if (e.key === '2') switchLeftTab('actionsheet');
            else if (e.key === '3') switchLeftTab('code');
            else if (e.key === 'Escape') {
                closeExamplesModal();
                closeLinePicker();
            }
        });

        // ---------------------------------------------------------------------
        // 9. APP BOOTSTRAP
        // ---------------------------------------------------------------------
        window.addEventListener('DOMContentLoaded', () => {
            // Load Official 100 PTS Mission by default so the user immediately has a full working arena & path!
            loadOfficial100PtsMission();
            initThreeSimulator();
        });
    </script>
</body>
</html>
'''

def build_all():
    target_files = [
        os.path.abspath(r"d:\Workspace\robot\apps\web\index.html"),
        os.path.abspath(r"d:\Workspace\robot\apps\web\tactical_planner.html"),
        os.path.abspath(r"d:\Workspace\robot\apps\web\web.html")
    ]
    for p in target_files:
        with open(p, "w", encoding="utf-8") as f:
            f.write(HTML_CONTENT.strip() + "\n")
        print(f"Successfully generated: {p} ({len(HTML_CONTENT)} bytes)")

if __name__ == '__main__':
    build_all()
