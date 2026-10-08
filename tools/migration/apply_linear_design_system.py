#!/usr/bin/env python3
"""
PT-BOT Atom VX Tactical Mission Suite
Linear / Stripe / Vercel Minimalist Figma-Grade Design System Application Script
Author: Principal Product Designer
"""

import os
import re

TARGET_FILES = [
    r"D:\Workspace\robot\apps\web\index.html",
    r"D:\Workspace\robot\apps\web\tactical_planner.html",
    r"D:\Workspace\robot\apps\web\web.html"
]

NEW_CSS_STYLES = """
        /* ==========================================================================
           FIGMA-GRADE MINIMALIST DESIGN SYSTEM (LINEAR / VERCEL / STRIPE FUSION)
           - 8pt Spatial Grid Architecture
           - 90/10 Monochrome-Neutral Palette (Zinc-950 to Zinc-50 + Electric Indigo Accent)
           - 1px Border-Driven Surfaces (Elimination of Heavy Shadows & Neon Glows)
           - Tight Typographic Hierarchy (Inter / Geist with Tabular Numerals)
           - Uniform Corner Radii (4px / 6px / 8px / 12px / 16px)
           ========================================================================== */

        :root {
            /* 90% Monochrome Neutral Base (Dark Canvas Default) */
            --bg-base: #09090b;          /* Zinc-950 Viewport Canvas */
            --bg-canvas: #09090b;        /* Root Workspace Background */
            --bg-sidebar: #0f0f12;       /* Zinc-900 Left/Right Rail */
            --bg-surface: #141418;       /* Primary Panel & Card Surface */
            --bg-card: #141418;          /* Card Background */
            --bg-card-hover: #1c1c22;    /* Interactive Card Hover */
            --bg-raised: #1c1c22;        /* Popovers, Flyouts, Slide-Overs */
            --bg-inset: #0d0d10;         /* Inputs, Code Editors, Recessed Areas */

            /* 1px Hairline Border System (Replaces Heavy Shadows) */
            --border-default: rgba(255, 255, 255, 0.08); /* 1px Standard Border */
            --border-subtle: rgba(255, 255, 255, 0.05);  /* 1px Internal Dividers */
            --border-hover: rgba(255, 255, 255, 0.18);   /* 1px Hover Stroke */
            --border-strong: rgba(255, 255, 255, 0.28);  /* 1px Focus / Active Stroke */
            --border-glass: rgba(255, 255, 255, 0.08);   /* Backwards compatible */

            /* Elevation: Subtle Step, Zero Heavy Glow */
            --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.35);
            --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.40);
            --shadow-md: 0 6px 16px rgba(0, 0, 0, 0.50);
            --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.65);
            --shadow-none: none;

            /* Text & Ink Tokens */
            --text-primary: #f4f4f5;     /* Zinc-100 Headings & Active Values */
            --text-secondary: #a1a1aa;   /* Zinc-400 Body Copy & Descriptions */
            --text-muted: #71717a;       /* Zinc-500 Captions & Column Headers */
            --text-quaternary: #52525b;  /* Zinc-600 Micro-Badges & Shortcuts */

            /* 10% Single Functional Accent: Electric Indigo / Linear Lavender */
            --accent-primary: #5e6ad2;
            --accent-hover: #717de0;
            --accent-subtle: rgba(94, 106, 210, 0.12);
            --accent-border: rgba(94, 106, 210, 0.35);
            --accent-text: #828fff;

            /* Telemetry & Domain Status Tokens (Precise, Non-Glowing) */
            --color-success: #10b981;
            --color-success-subtle: rgba(16, 185, 129, 0.12);
            --color-warning: #f59e0b;
            --color-warning-subtle: rgba(245, 158, 11, 0.12);
            --color-error: #ef4444;
            --color-error-subtle: rgba(239, 68, 68, 0.12);
            --color-info: #0284c7;
            --color-info-subtle: rgba(2, 132, 199, 0.12);

            /* Legacy Compatible Palette Aliases */
            --apple-blue: #5e6ad2;
            --apple-blue-hover: #717de0;
            --apple-blue-subtle: rgba(94, 106, 210, 0.12);
            --apple-green: #10b981;
            --apple-green-hover: #34d399;
            --apple-green-subtle: rgba(16, 185, 129, 0.12);
            --apple-amber: #f59e0b;
            --apple-amber-hover: #fbbf24;
            --apple-amber-subtle: rgba(245, 158, 11, 0.12);
            --apple-red: #ef4444;
            --apple-red-hover: #f87171;
            --apple-red-subtle: rgba(239, 68, 68, 0.12);
            --lego-yellow: #f59e0b;
            --lego-green: #10b981;
            --lego-blue: #5e6ad2;
            --lego-red: #ef4444;

            /* 8pt Spatial Grid Tokens */
            --space-1: 4px;
            --space-2: 8px;
            --space-3: 12px;
            --space-4: 16px;
            --space-5: 20px;
            --space-6: 24px;
            --space-8: 32px;
            --space-10: 40px;
            --space-12: 48px;
            --space-16: 64px;

            /* Uniform Corner Radii Standards */
            --radius-xs: 4px;            /* Badges, micro-tags, <kbd> */
            --radius-sm: 6px;            /* Segmented pills, dropdown items */
            --radius-md: 8px;            /* Buttons, inputs, search bars */
            --radius-lg: 12px;           /* Cards, arena frame, HUD container */
            --radius-xl: 16px;           /* Modals, drawers, dialogs */
            --radius-pill: 9999px;       /* Toggle switches, status dots */

            /* Grid Dimensions */
            --cell-size: 78px;
            --cell-line: 6px;
            --cell-accent-line: 4px;
            --marker-size: 22px;
            --focus-ring: 0 0 0 2px rgba(94, 106, 210, 0.40);

            /* Typography */
            --font-sans: "Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: "JetBrains Mono", "Geist Mono", Menlo, monospace;
            --ease-linear: cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Light Mode: Stripe / Vercel Minimalist Paper Precision */
        [data-theme="light"] {
            --bg-base: #fafafa;
            --bg-canvas: #f4f4f5;
            --bg-sidebar: #ffffff;
            --bg-surface: #ffffff;
            --bg-card: #ffffff;
            --bg-card-hover: #f9f9fb;
            --bg-raised: #ffffff;
            --bg-inset: #f4f4f5;

            --border-default: rgba(0, 0, 0, 0.08);
            --border-subtle: rgba(0, 0, 0, 0.05);
            --border-hover: rgba(0, 0, 0, 0.16);
            --border-strong: rgba(0, 0, 0, 0.28);
            --border-glass: rgba(0, 0, 0, 0.08);

            --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
            --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
            --shadow-lg: 0 12px 28px rgba(0, 0, 0, 0.10);

            --text-primary: #09090b;
            --text-secondary: #52525b;
            --text-muted: #71717a;
            --text-quaternary: #a1a1aa;

            --accent-primary: #5e6ad2;
            --accent-hover: #4f5bb8;
            --accent-subtle: rgba(94, 106, 210, 0.08);
            --accent-border: rgba(94, 106, 210, 0.25);
            --accent-text: #4f5bb8;
        }

        /* --- GLOBAL RESETS & FOUNDATION --- */
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: var(--bg-base);
            color: var(--text-primary);
            font-family: var(--font-sans);
            font-size: 13px;
            line-height: 1.45;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            user-select: none;
        }

        /* Modern Hairline Scrollbars */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: var(--border-default);
            border-radius: var(--radius-pill);
        }
        ::-webkit-scrollbar-thumb:hover {
            background: var(--border-hover);
        }

        /* --- APPLICATION COMMAND HEADER (48PX FIXED) --- */
        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 48px;
            padding: 0 16px;
            background: var(--bg-sidebar);
            border-bottom: 1px solid var(--border-default);
            z-index: 1000;
            position: relative;
        }

        .brand-section {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ev3-home-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: var(--radius-md);
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .ev3-home-btn:hover {
            color: var(--text-primary);
            border-color: var(--border-hover);
            background: var(--bg-card-hover);
        }

        .ev3-project-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 4px 10px;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            font-size: 12px;
        }

        .ev3-project-pill input {
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-family: var(--font-sans);
            font-size: 12px;
            font-weight: 500;
            outline: none;
            width: 140px;
        }
        .ev3-project-pill input:focus {
            color: var(--accent-text);
        }

        .header-center-zone {
            display: flex;
            align-items: center;
        }

        .mode-toggle {
            display: inline-flex;
            background: var(--bg-inset);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            padding: 2px;
            gap: 2px;
        }

        .mode-btn {
            padding: 5px 12px;
            border-radius: var(--radius-sm);
            border: none;
            background: transparent;
            color: var(--text-secondary);
            font-family: var(--font-sans);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .mode-btn:hover {
            color: var(--text-primary);
        }
        .mode-btn.active {
            background: var(--bg-surface);
            color: var(--text-primary);
            border: 1px solid var(--border-default);
            box-shadow: var(--shadow-xs);
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Minimalist Input & Select Controls */
        .action-select, .dim-input, .input-text {
            height: 32px;
            padding: 0 10px;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-family: var(--font-sans);
            font-size: 12px;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .action-select:focus, .dim-input:focus, .input-text:focus {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 2px var(--accent-subtle);
        }

        /* 1px Border Precision Buttons */
        .btn-ui {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            height: 32px;
            padding: 0 12px;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-family: var(--font-sans);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s var(--ease-linear);
            white-space: nowrap;
        }
        .btn-ui:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
        }
        .btn-ui:active {
            transform: translateY(1px);
        }

        .btn-ui.primary {
            background: var(--accent-primary);
            border-color: var(--accent-primary);
            color: #ffffff;
        }
        .btn-ui.primary:hover {
            background: var(--accent-hover);
            border-color: var(--accent-hover);
        }

        .btn-ui.accent {
            background: var(--bg-surface);
            border-color: var(--accent-border);
            color: var(--accent-text);
        }
        .btn-ui.accent:hover {
            background: var(--accent-subtle);
            border-color: var(--accent-primary);
        }

        .icon-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: var(--radius-md);
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .icon-btn:hover {
            color: var(--text-primary);
            border-color: var(--border-hover);
            background: var(--bg-card-hover);
        }
        .icon-btn svg {
            width: 16px;
            height: 16px;
            stroke: currentColor;
            stroke-width: 1.75;
            fill: none;
        }

        /* --- MAIN THREE-COLUMN WORKSPACE --- */
        main {
            display: grid;
            grid-template-columns: 260px 1fr 340px;
            height: calc(100vh - 48px);
            background: var(--bg-base);
            overflow: hidden;
        }

        /* --- LEFT SIDEBAR (TOOLS & CONTROLS) --- */
        aside.control-panel {
            background: var(--bg-sidebar);
            border-right: 1px solid var(--border-default);
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .section-eyebrow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 6px;
        }

        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            letter-spacing: -0.015em;
            margin-bottom: 8px;
        }

        .arena-dim-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 12px;
        }

        .dim-inputs {
            display: flex;
            align-items: flex-end;
            gap: 8px;
        }
        .dim-inputs .input-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .dim-inputs label {
            font-size: 11px;
            color: var(--text-muted);
        }
        .dim-input {
            width: 100%;
        }

        /* Tool Grid (Linear Tile Palette) */
        .tool-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
        }

        .tool-item {
            display: flex;
            align-items: center;
            gap: 8px;
            height: 36px;
            padding: 0 10px;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            font-family: var(--font-sans);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            text-align: left;
            transition: all 0.12s ease;
        }
        .tool-item:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            color: var(--text-primary);
        }
        .tool-item.active {
            background: var(--accent-subtle);
            border-color: var(--accent-primary);
            color: var(--text-primary);
        }
        .tool-item .swatch {
            width: 12px;
            height: 12px;
            border-radius: var(--radius-xs);
            flex-shrink: 0;
        }

        /* --- CENTER THEATER (MISSION ARENA) --- */
        .arena-container {
            display: flex;
            flex-direction: column;
            position: relative;
            background: var(--bg-base);
            overflow: hidden;
            padding: 16px;
        }

        .arena-frame {
            flex: 1;
            position: relative;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        #arena3DContainer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 5;
        }

        .grid-matrix {
            position: relative;
            z-index: 10;
            display: grid;
            background: var(--bg-inset);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            padding: 4px;
            gap: 2px;
            box-shadow: var(--shadow-sm);
        }

        .tile {
            position: relative;
            width: var(--cell-size);
            height: var(--cell-size);
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-xs);
            cursor: pointer;
            transition: all 0.1s ease;
        }
        .tile:hover {
            border-color: var(--accent-primary);
            background: var(--bg-card-hover);
        }

        /* Floating HUD Telemetry Bar */
        .hud-overlay {
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 50;
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 8px 16px;
            background: var(--bg-sidebar);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-full);
            box-shadow: var(--shadow-md);
            font-family: var(--font-mono);
            font-size: 11px;
            font-feature-settings: 'tnum' 1;
        }

        .hud-stat-item {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--text-secondary);
        }
        .hud-stat-item strong {
            color: var(--text-primary);
            font-weight: 600;
        }

        /* 2D / 3D Segmented Toggle Pill */
        .view-mode-pill {
            position: absolute;
            top: 24px;
            right: 24px;
            z-index: 50;
            display: inline-flex;
            background: var(--bg-sidebar);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-full);
            padding: 3px;
            gap: 2px;
            box-shadow: var(--shadow-sm);
        }
        .view-pill-btn {
            padding: 4px 10px;
            border-radius: var(--radius-full);
            border: none;
            background: transparent;
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .view-pill-btn.active {
            background: var(--accent-primary);
            color: #ffffff;
        }

        /* --- RIGHT SLIDE-OVER DRAWER (INSPECTOR, CODE & BENCH) --- */
        aside.deck-panel {
            background: var(--bg-sidebar);
            border-left: 1px solid var(--border-default);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 20;
        }

        .deck-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-default);
        }

        .deck-tabs {
            display: flex;
            gap: 4px;
            padding: 8px 16px;
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border-default);
        }

        .deck-tab-btn {
            flex: 1;
            padding: 6px 8px;
            background: transparent;
            border: 1px solid transparent;
            border-radius: var(--radius-sm);
            color: var(--text-secondary);
            font-family: var(--font-sans);
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            text-align: center;
            transition: all 0.15s ease;
        }
        .deck-tab-btn:hover {
            color: var(--text-primary);
        }
        .deck-tab-btn.active {
            background: var(--bg-sidebar);
            border-color: var(--border-default);
            color: var(--text-primary);
        }

        .deck-tab-content {
            display: none;
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            flex-direction: column;
            gap: 16px;
        }
        .deck-tab-content.active {
            display: flex;
        }

        /* Configuration Cards */
        .config-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 14px;
        }

        .form-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
        }
        .form-row label {
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 500;
        }

        /* Sliders */
        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 4px;
            background: var(--bg-inset);
            border-radius: var(--radius-pill);
            outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: var(--radius-pill);
            background: var(--accent-primary);
            border: 2px solid var(--bg-surface);
            cursor: pointer;
            transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
        }

        /* Transpiled Code Editor */
        .code-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--bg-inset);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            overflow: hidden;
        }
        .code-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border-default);
            font-size: 11px;
            color: var(--text-muted);
        }
        pre.code-editor {
            flex: 1;
            padding: 12px;
            margin: 0;
            overflow: auto;
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--text-secondary);
            line-height: 1.5;
        }

        /* Live Hardware Bench */
        .sensor-array-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 4px;
            height: 80px;
            background: var(--bg-inset);
            padding: 8px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-default);
        }
        .sensor-bar-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            gap: 4px;
        }
        .sensor-fill-track {
            flex: 1;
            width: 100%;
            background: var(--bg-surface);
            border-radius: var(--radius-xs);
            overflow: hidden;
            display: flex;
            align-items: flex-end;
            border: 1px solid var(--border-subtle);
        }
        .sensor-bar {
            width: 100%;
            background: var(--accent-primary);
            transition: height 0.08s ease;
        }

        .serial-console-box {
            height: 140px;
            background: var(--bg-inset);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            padding: 10px;
            overflow-y: auto;
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--accent-text);
            line-height: 1.4;
        }

        /* --- EXPLICIT SYSTEM STATES (SKELETONS, EMPTY, TOASTS) --- */
        /* 1. Loading Skeleton System */
        .skeleton {
            background: var(--bg-card-hover);
            border-radius: var(--radius-sm);
            position: relative;
            overflow: hidden;
        }
        .skeleton::after {
            content: "";
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent);
            animation: skeleton-sweep 1.6s infinite;
        }
        @keyframes skeleton-sweep {
            100% { transform: translateX(100%); }
        }

        /* 2. Zero-Data Empty States */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 32px 16px;
            gap: 12px;
        }
        .empty-state-icon {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-md);
            background: var(--bg-inset);
            border: 1px solid var(--border-default);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
        }
        .empty-state-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
        }
        .empty-state-sub {
            font-size: 11px;
            color: var(--text-muted);
            max-width: 38ch;
            line-height: 1.4;
        }

        /* 3. Toast Notifications (Bottom-Right Stack) */
        #toastContainer {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        }
        .toast {
            pointer-events: auto;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 300px;
            max-width: 400px;
            padding: 10px 14px;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            font-size: 12px;
            color: var(--text-primary);
            animation: toast-in 0.2s var(--ease-linear);
            position: relative;
            overflow: hidden;
        }
        .toast.success { border-color: rgba(16, 185, 129, 0.4); }
        .toast.warning { border-color: rgba(245, 158, 11, 0.4); }
        .toast.error { border-color: rgba(239, 68, 68, 0.4); }
        @keyframes toast-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* --- MINIMALIST LAUNCHER & AUTH HUB (#welcomeView) --- */
        #welcomeView {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100vh;
            background: var(--bg-base);
            overflow-y: auto;
        }

        .welcome-navbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 48px;
            padding: 0 24px;
            border-bottom: 1px solid var(--border-default);
            background: var(--bg-sidebar);
        }

        .welcome-container {
            max-width: 1080px;
            margin: 0 auto;
            padding: 40px 24px;
            display: flex;
            flex-direction: column;
            gap: 32px;
            width: 100%;
        }

        .welcome-hero {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .welcome-hero h1 {
            font-size: 24px;
            font-weight: 600;
            letter-spacing: -0.025em;
            color: var(--text-primary);
        }
        .welcome-hero p {
            font-size: 13px;
            color: var(--text-secondary);
        }

        /* Linear-Style 1px Action Cards */
        .welcome-grid-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }

        .launch-card {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 180px;
            padding: 16px;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            cursor: pointer;
            transition: all 0.15s var(--ease-linear);
        }
        .launch-card:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            transform: translateY(-1px);
        }

        .launch-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .launch-card-icon {
            width: 32px;
            height: 32px;
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            border: 1px solid var(--border-default);
        }
        .launch-card-badge {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: var(--radius-xs);
            background: var(--bg-inset);
            color: var(--text-muted);
            border: 1px solid var(--border-subtle);
        }
        .launch-card-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            margin-top: 12px;
        }
        .launch-card-sub {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.4;
            margin-top: 4px;
        }
        .launch-card-action {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 500;
            color: var(--accent-text);
            padding-top: 12px;
            border-top: 1px solid var(--border-subtle);
        }

        .welcome-split-deck {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 16px;
        }

        .hub-panel {
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 16px;
        }
        .hub-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-default);
            margin-bottom: 12px;
        }
        .hub-panel-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .spec-item-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-subtle);
            font-size: 11px;
        }
        .spec-item-label {
            color: var(--text-muted);
        }
        .spec-item-value {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-feature-settings: 'tnum' 1;
        }

        .welcome-footer {
            max-width: 1080px;
            margin: 0 auto;
            padding: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-muted);
            border-top: 1px solid var(--border-default);
            width: 100%;
        }

        /* Minimalist Modal Windows */
        .modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-window {
            background: var(--bg-sidebar);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-lg);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px;
            border-bottom: 1px solid var(--border-default);
        }
        .modal-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
        }
        .modal-body {
            padding: 18px;
            overflow-y: auto;
        }
        .modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 18px;
            border-top: 1px solid var(--border-default);
            background: var(--bg-surface);
        }

        /* Modern Status Pills */
        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 2px 8px;
            border-radius: var(--radius-full);
            background: var(--bg-inset);
            border: 1px solid var(--border-default);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.02em;
            color: var(--text-secondary);
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--color-success);
        }

        /* Splash Screen */
        #splashScreen {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: var(--bg-base);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
        }
        .splash-progress-track {
            width: 240px;
            height: 2px;
            background: var(--bg-inset);
            border-radius: var(--radius-pill);
            overflow: hidden;
        }
        .splash-progress-fill {
            height: 100%;
            width: 0%;
            background: var(--accent-primary);
            transition: width 0.2s ease;
        }
        .splash-status-text {
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--text-muted);
        }
"""

def update_file(filepath):
    print(f"Processing: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace <style>...</style> block
    style_start = content.find('<style>')
    style_end = content.find('</style>')
    if style_start == -1 or style_end == -1:
        print(f"Error: Could not locate <style> block in {filepath}")
        return False

    new_content = content[:style_start + len('<style>')] + "\n" + NEW_CSS_STYLES + "\n    " + content[style_end:]

    # 2. Update Splash text to enterprise title
    new_content = re.sub(
        r'<div id="splashStatus" class="splash-status-text">.*?</div>',
        r'<div id="splashStatus" class="splash-status-text">PT-BOT Atom VX · Tactical Mission Suite</div>',
        new_content
    )

    # 3. Update Project Hub labels from toy-like Thai/Lego to Linear/Vercel standard
    new_content = new_content.replace(
        'title="กลับหน้าแรก (Project Hub)"',
        'title="Workspace Overview (Project Hub)"'
    )
    new_content = new_content.replace(
        '<span style="color: var(--lego-green); font-size: 0.65rem; font-weight: 800;">● บันทึกแล้ว</span>',
        '<span class="status-pill" style="font-size: 10px; border-color: rgba(16, 185, 129, 0.3); color: #10b981;"><span class="status-dot"></span>SYNCED</span>'
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Successfully updated: {filepath}")
    return True

if __name__ == "__main__":
    for p in TARGET_FILES:
        if os.path.exists(p):
            update_file(p)
        else:
            print(f"File not found: {p}")
