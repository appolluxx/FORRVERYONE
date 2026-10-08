# DESIGN SYSTEM SPECIFICATION: LINEAR-VERCEL FUSION (8PT / MONOCHROME-90 / 1PX BORDER)
**Role:** Principal Product Designer  
**Architecture:** Enterprise-grade Minimalist Figma-Grade Design System  
**Inspirations:** Linear (dense craft), Vercel (monochrome precision), Stripe (fintech micro-clarity)  
**Target:** Desktop & Web Mission Suites, Developer Tools, High-Performance Analytics

---

## 1. DESIGN PHILOSOPHY & FOUNDATIONAL PRINCIPLES

1. **Software-Craft Minimalism**: The UI exists to frame and accelerate work, not distract. Every pixel is intentional, high-density, and devoid of frivolous ornamentation.
2. **1px Hairline Elevation over Heavy Shadows**: Traditional fuzzy shadows are replaced by high-contrast 1px hairline border strokes (`rgba(255, 255, 255, 0.08)` in dark mode, `rgba(0, 0, 0, 0.08)` in light mode) paired with stepped background luminance levels.
3. **90/10 Monochrome-Neutral Ratio**: 90% of the canvas consists of pure monochrome neutral tones (Zinc/Slate spectrum: `#09090b` to `#f4f4f5`). 10% is reserved for a single chromatic functional accent (Electric Indigo `#5e6ad2` / `#6366f1`) and crisp semantic indicators.
4. **8pt Strict Spatial Grid**: Every dimension, margin, padding, row height, and icon container is derived from the 8pt grid with a 4pt sub-grid for micro-alignments.
5. **Information Density & Tabular Precision**: Typography uses tight negative letter-spacing for headers and enabled `tnum` (tabular numerals) for telemetry, coordinates, and timings.

---

## 2. FOUNDATIONAL DESIGN TOKENS

### 2.1 Color Architecture (90/10 Monochrome + Single Functional Accent)

```css
:root {
  /* Canvas & Background Surfaces */
  --color-canvas-base: #09090b;       /* Zinc 950 - Root application viewport */
  --color-surface-subtle: #0f0f12;    /* Recessed panels, codeblocks, table headers */
  --color-surface-1: #141418;         /* Primary container, sidebar, cards */
  --color-surface-2: #1c1c22;         /* Hover state, modal panels, slide-overs */
  --color-surface-3: #26262e;         /* Elevated popovers, tooltips, active rows */
  
  /* 1px Hairline Border Tokens */
  --color-border-subtle: rgba(255, 255, 255, 0.06);  /* Divider lines, internal grids */
  --color-border-default: rgba(255, 255, 255, 0.10); /* Standard 1px card/panel boundaries */
  --color-border-hover: rgba(255, 255, 255, 0.18);   /* Interactive hover stroke */
  --color-border-strong: rgba(255, 255, 255, 0.28);  /* Active inputs, modal boundaries */

  /* Text & Ink Tokens */
  --color-text-primary: #f4f4f5;      /* Zinc 100 - Primary headings, active values */
  --color-text-secondary: #a1a1aa;    /* Zinc 400 - Body copy, descriptions, nav labels */
  --color-text-tertiary: #71717a;     /* Zinc 500 - Captions, disabled text, icons */
  --color-text-muted: #52525b;        /* Zinc 600 - Micro-metadata, shortcuts */

  /* Single Functional Accent (Electric Indigo / Linear Lavender) */
  --color-accent-primary: #5e6ad2;    /* Primary CTA, active toggles, focus rings */
  --color-accent-hover: #717de0;      /* Primary button hover */
  --color-accent-subtle: rgba(94, 106, 210, 0.12); /* Selected row background, badge tint */
  --color-accent-border: rgba(94, 106, 210, 0.35); /* Focus ring, active card border */
  --color-accent-text: #828fff;       /* High-contrast text on dark backgrounds */

  /* Semantic Telemetry Tokens */
  --color-success: #10b981;           /* Emerald 500 - Pass, Connected, Active */
  --color-success-subtle: rgba(16, 185, 129, 0.12);
  --color-warning: #f59e0b;           /* Amber 500 - Hazard, Unsaved, Slow */
  --color-warning-subtle: rgba(245, 158, 11, 0.12);
  --color-error: #ef4444;             /* Red 500 - Collision, Disconnected, Fail */
  --color-error-subtle: rgba(239, 68, 68, 0.12);
  --color-info: #0284c7;              /* Sky 600 - Information banner */
  --color-info-subtle: rgba(2, 132, 199, 0.12);
}
```

### 2.2 8pt Spatial Grid & Dimension System

| Token | Pixels | Application |
|---|---|---|
| `space-0.5` | `2px` | Micro hairline offsets, badge padding |
| `space-1` | `4px` | Sub-grid baseline, button micro-gaps |
| `space-2` | `8px` | Standard compact padding, icon-text gap |
| `space-3` | `12px` | Form field internal horizontal padding |
| `space-4` | `16px` | Container padding, standard element gap |
| `space-5` | `20px` | Card internal padding (compact) |
| `space-6` | `24px` | Section spacing, card padding (standard) |
| `space-8` | `32px` | Header bottom margins, panel separation |
| `space-10` | `40px` | Large container padding |
| `space-12` | `48px` | Global app header height |
| `space-16` | `64px` | Collapsed sidebar width, page section gap |
| `space-20` | `80px` | Hero padding |

### 2.3 Typography Scale (Inter / Geist Sans + Geist Mono)

Font stacks:
* **UI & Body**: `font-family: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
* **Code & Telemetry**: `font-family: 'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace; font-feature-settings: 'tnum' 1;`

| Role | Size | Line Height | Weight | Tracking | Purpose |
|---|---|---|---|---|---|
| **Display** | `32px` | `38px` (1.18) | 600 (SemiBold) | `-0.035em` | Auth headings, splash metrics |
| **Headline** | `24px` | `30px` (1.25) | 600 (SemiBold) | `-0.025em` | View titles, major modal headers |
| **Title** | `18px` | `24px` (1.33) | 600 (SemiBold) | `-0.020em` | Card titles, panel drawer titles |
| **Subhead** | `15px` | `20px` (1.33) | 500 (Medium) | `-0.010em` | Section dividers, table groups |
| **Body Default** | `13px` | `18px` (1.38) | 400 (Regular) | `-0.005em` | Primary UI labels, table cells |
| **Body Medium** | `13px` | `18px` (1.38) | 500 (Medium) | `-0.005em` | Button labels, active nav links |
| **Caption** | `11px` | `14px` (1.27) | 400 (Regular) | `0.000em` | Timestamps, helper text, breadcrumbs |
| **Micro / Badge** | `10px` | `12px` (1.20) | 600 (SemiBold) | `+0.040em` | Status pills, keyboard shortcuts |
| **Code / TNum** | `12px` | `16px` (1.33) | 400 (Regular) | `0.000em` | Waypoints, coordinates, memory hex |

### 2.4 Corner Radii Standards

* `radius-xs` (`4px`): Micro badges, keyboard shortcuts (`<kbd>`), small tooltips.
* `radius-sm` (`6px`): Segmented control pills, dropdown menu items, sub-navigation links.
* `radius-md` (`8px`): Standard interactive elements — buttons, text inputs, selects.
* `radius-lg` (`12px`): Cards, detail panels, floating toolbars.
* `radius-xl` (`16px`): Modals, dialogs, slide-over panels.
* `radius-full` (`9999px`): Avatars, toggle pills, circular icon buttons.

---

## 3. APPLICATION SHELL & STRUCTURAL WIREFRAMES

### 3.1 Global Desktop App Shell Layout

```text
+----------------------------------------------------------------------------------------------------+
|  [PT-BOT IDE]  Mission 01: Inter-School  [v8.2.0]     (Cmd+K Quick Nav)      [COM3 Connected] (User)|
+--------------------+---------------------------------------------------------------+---------------+
| WORKSPACE          | BREADCRUMBS: Fleets / PT-BOT-01 / Tactical Arena (8x4)         | RIGHT DRAWER  |
| [Tactical Ops v]   |                                                               | (SLIDE-OVER)  |
+--------------------+---------------------------------------------------------------+               |
| NAVIGATION         | VIEW ACTION BAR:                                              | [X] Close Esc |
|                    | [Search Missions...]  [Filter: All v]  [+ New Path]  [Flash]  |               |
| (*) Arena Studio   +---------------------------------------------------------------+ DETAILS:      |
| ( ) Trajectories   | 3D WEBGL ARENA / DATA TABLE VIEW                              | Waypoint #04  |
| ( ) Firmware Flash | +-----------------------------------------------------------+ | ------------- |
| ( ) Hardware Tele  | |  [0,0]      [1,0]      [2,0] Bridge   [3,0]      [4,0]       | | Coord: X6, Y0 |
| ( ) Mission Logs   | |  [0,1]      [1,1] Bump [2,1]          [3,1] Bomb [4,1]       | | Speed: 88%    |
|                    | |  [0,2] Drop [1,2]      [2,2] Seesaw   [3,2]      [4,2] Check | | Time:  360ms  |
| SYSTEM STATUS      | |  [0,3]      [1,3]      [2,3]          [3,3]      [4,3] Start | | Leg:   BOX1   |
| Battery: 12.4V     | +-----------------------------------------------------------+ | Action: Align |
| CPU Load: 14%      | MISSION TIMELINE & SENSOR HUD:                                | ------------- |
| Latency:  1.2ms    | [## Waypoint 01] -> [## Waypoint 02] -> [## Waypoint 03]      | [Save Changes]|
+--------------------+---------------------------------------------------------------+---------------+
| FOOTER: WebSerial @ 921,600 baud | NVS Flash Sync: OK | Zero Compile Engine (500ms)| [Help ?]      |
+----------------------------------------------------------------------------------------------------+
```

### 3.2 Navigation Anatomy
* **Sidebar Rail**:
  * Width: `240px` (Expanded) / `64px` (Collapsed).
  * 1px Right Border: `var(--color-border-default)`.
  * Workspace Header: `48px` height with logo mark, workspace title, and chevron switcher.
  * Nav Items: `32px` row height, `8px` corner radius, `12px` font size.
  * Active State: `background: var(--color-surface-2)`, `color: var(--color-text-primary)`, `border-left: 2px solid var(--color-accent-primary)`.
  * Keyboard Shortcut Badges: `<kbd>` with `10px` Geist Mono, recessed background, `4px` radius.

---

## 4. AUTHENTICATION EXPERIENCE (MINIMALIST CRAFT)

```text
                                  +---------------------------------------+
                                  |                 [o]                   |
                                  |           PT-BOT ATOM VX              |
                                  |    Tactical Mission Control Suite     |
                                  |                                       |
                                  |  +---------------------------------+  |
                                  |  | [G] Continue with Hardware Key  |  |
                                  |  +---------------------------------+  |
                                  |  ----------------- or ----------------- |
                                  |  Email address                        |
                                  |  [ engineer@team-robot.org         ]  |
                                  |                                       |
                                  |  Security Passcode                    |
                                  |  [ *******************           (o) ]  |
                                  |                                       |
                                  |  +---------------------------------+  |
                                  |  | Continue with Mission Access  ->|  |
                                  |  +---------------------------------+  |
                                  |                                       |
                                  |  (i) 100% Offline Local Session       |
                                  +---------------------------------------+
```

* **Surface**: Centered floating card (`380px` fixed width), `background: var(--color-surface-1)`, `border: 1px solid var(--color-border-default)`, `border-radius: var(--radius-xl)`.
* **Micro-Interactions**: Inputs highlight with 1px `var(--color-accent-primary)` stroke and subtle outer ring `box-shadow: 0 0 0 3px var(--color-accent-border)`.

---

## 5. DATA LISTS & HIGH-DENSITY DATA TABLES

### 5.1 Table Architecture
* **Header Row**: `36px` height, uppercase micro-typography (`10px` tracking `+0.04em`), `color: var(--color-text-tertiary)`, bottom border 1px.
* **Data Row**: `40px` height (or `32px` in compact mode), tabular font alignment, hover highlight `var(--color-surface-2)`.
* **Checkbox Column**: `36px` width, centered 16px square checkbox with 4px radius.
* **Status Badges**:
  * Pass / Active: Emerald dot (`6px`) + text `Ready` inside `rgba(16, 185, 129, 0.1)` capsule.
  * Warning / In-Progress: Amber dot + text `Aligning`.
  * Error / Collision: Red dot + text `Obstacle Fault`.
* **Row Actions**: Persistent on hover; 3-dot action button with 6px radius.

---

## 6. SLIDE-OVER DETAIL DRAWER (SHEET)

### 6.1 Drawer Specifications
* **Placement**: Fixed right anchor, `width: 480px` (or `600px` on wide screens).
* **Backdrop**: `rgba(0, 0, 0, 0.60)` with `backdrop-filter: blur(4px)`.
* **Animation**: Hardware-accelerated slide-in `transform: translateX(0)` with 200ms cubic bezier `(0.16, 1, 0.3, 1)`.
* **Header**: `48px` height containing category eyebrow, title, and close icon button (`Esc` listener).
* **Segmented Tabs**: 4px padding, 6px radius pills: `[Overview]  [Kinematics]  [C++ Code]  [Audit Log]`.
* **Key-Value Metadata Grid**:
  ```text
  TARGET CELL      X6, Y0 (Drop Zone 1)
  APPROACH SPEED   88% PWM S-Curve (360ms)
  SERVO TRIGGER    DropFL() [CH2 45-deg]
  HEADING LOCK     PID Gyro Hold (0.0-deg Error)
  ```
* **Footer Actions**: Pinned bottom bar with `1px` top border: `[Cancel]` and `[Save to NVS Flash]`.

---

## 7. FORMS, FORM CONTROLS & INPUT SYSTEM

### 7.1 Field Sizing & States

```text
[ Idle Input State ]
+--------------------------------------------------------------+
| Base Speed (PWM %)                                   [ 88 ] %|
+--------------------------------------------------------------+

[ Active Focus State (1px Accent + 3px Subtle Ring) ]
+--------------------------------------------------------------+
| Base Speed (PWM %)                                   [ 88 ] %|
+--------------------------------------------------------------+
 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 Border: #5e6ad2 | Ring: rgba(94, 106, 210, 0.25)

[ Validation Error State ]
+--------------------------------------------------------------+
| Max Speed Exceeded                                  [ 105 ] %|
+--------------------------------------------------------------+
 ! Value cannot exceed 100% PWM safe duty cycle.
```

* **Input Heights**:
  * Compact: `28px`
  * Standard: `36px`
  * Large / Hero: `44px`
* **Toggle Switches**: `36px x 20px` track, `16px` white circular thumb, `2px` internal padding, smooth 150ms spring slide.
* **Segmented Radio Controls**: Encapsulated track with `var(--color-surface-subtle)`, sliding active pill with `var(--color-surface-2)` and `1px` hairline border.

---

## 8. EXPLICIT SYSTEM STATES

### 8.1 Loading Skeleton System
Instead of generic spinning wheels, layouts render structured geometric pulse skeletons:
* **Background**: `var(--color-surface-2)`.
* **Shimmer Gradient**: Linear gradient from `rgba(255, 255, 255, 0)` to `rgba(255, 255, 255, 0.05)` to `rgba(255, 255, 255, 0)`.
* **Animation**: 1.5s infinite linear sweep.

### 8.2 Zero-Data Empty States
```text
                          +-------------------------+
                          |           [o]           |
                          |   No Waypoints Defined  |
                          |                         |
                          | Click the 3D Arena or   |
                          | press Auto-Route to     |
                          | generate the 34-point   |
                          | mission trajectory.     |
                          |                         |
                          |    [ + Auto Solve ]     |
                          +-------------------------+
```
* **Typography**: Title `15px 600`, Description `13px 400` with `max-width: 44ch`, centered CTA button.

### 8.3 Error & Toast Feedback System
* **Position**: Fixed bottom-right corner (`bottom: 24px`, `right: 24px`), stacked vertically with `8px` gap.
* **Dimensions**: Min-width `320px`, max-width `420px`.
* **Structure**:
  * 1px Border Stroke: Colored according to severity.
  * Icon (16px): Success check, Warning triangle, Error octagon, Info circle.
  * Title & Subtext: High-contrast title, concise description.
  * Action: Optional inline button (e.g. `[Retry]`, `[Undo]`).
  * Dismiss Timer: Subtle `2px` animated progress bar along the bottom edge.

---

## 9. IMPLEMENTATION CHECKLIST ACROSS SCREENS

- [x] Strict 8pt grid token system defined in CSS / design tokens.
- [x] 90/10 monochrome palette implemented with single functional accent `#5e6ad2`.
- [x] 1px hairline border elevation model replacing fuzzy box-shadows.
- [x] Tabular numerals (`tnum`) applied across all coordinates, timers, and speeds.
- [x] Uniform corner radii (`6px`, `8px`, `12px`, `16px`) standardized.
- [x] App shell navigation and collapsable sidebar engineered.
- [x] High-density data lists with status pills and inline actions designed.
- [x] 480px slide-over detail drawer with tabbed kinematics and code views specified.
- [x] Explicit skeleton loaders, empty zero-states, and feedback toasts architected.
