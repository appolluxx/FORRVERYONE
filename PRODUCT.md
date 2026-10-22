# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Robotics competition students, coaches, STEM educators, and autonomous robot engineers in Thailand competing in the Intermediate Rescue & Delivery Robot Championship using the PT Atom VX 4WD (ESP32-WROOM-32D) platform.

## Product Purpose

PT-BOT Tactical IDE & 3D Simulator: An integrated mission control suite and high-fidelity 3D WebGL simulator. It enables teams to test, plan, and verify competition missions (such as the Five-Point Route) with realistic physics for obstacles (50mm elevated bridges and 7-rod bamboo chopsticks) and export production-ready Arduino C++ and MicroPython firmware without needing visual block puzzles.

## Positioning

The only dedicated tactical suite aligned 100% with the official competition rules and roboBlocks IDE specifications. It features authentic physical obstacle geometry, gyro-locked trajectory paths, real-time IMU telemetry, and dual C++/Python synthesis.

## Operating Context

Classroom robotics labs, competition pit areas, and field test tables. Operates in two modes:
1. High-speed local web interface in any modern browser (`http://127.0.0.1:4848`).
2. Standalone Electron desktop app with native WebSerial USB port access to ESP32 microcontrollers.
Runs completely offline with zero cloud latency.

## Capabilities and Constraints

- **Chassis & Drive**: PT Atom VX 4WD (WD4) with 4-wheel independent silicone drive.
- **IMU Gyro Lock**: Digital heading stabilization (KP=0.6, KD=2.0) with yaw reset.
- **Physical Obstacles**: 
  - Official 50mm Elevated Bridge (15° Incline Ramp, +50mm Deck Platform with side rails, 15° Decline Ramp).
  - Official Chopsticks Speed Bumps (7 cylindrical bamboo rods, 6mm diameter, 300mm length, Rule 8.2).
- **Target Waypoints**: 5-point route with non-linear physics timing and milestone triggers.
- **Code Synthesizer**: Generates clean Arduino C++ (`MissionRunner.ino`) and MicroPython (`main.py`).
- **Telemetry Stream**: Real-time Roll, Pitch, Yaw, Velocity, Coordinates (X, Z), and Elevation (Y).
- **User Preference**: No Blockly puzzle block editor; pure tactical overview, action sheet, and 3D simulation.

## Brand Commitments

- **Header Identity**: Authentic roboBlocks brand header (`#44abff`, `#389cf5`) with "based on microBlock" subtitle.
- **Typography & Clean UI**: Impeccable typography system (no AI slop, no low-contrast text, 11px floor for all functional text).
- **Hardware Integration**: Authentic board profile badge for PT Atom VX.

## Evidence on Hand

- `docs/rules/robot_competition_rules_intermediate.pdf` (Rules 8.2 and 8.3).
- `assets/models/PT-BOT_Atom_VX.glb` (Official 6.5MB 3D model).
- `assets/images/atom-vx-rescue-five-points.png` (Official mission preview artwork).
- `data/arenas/rescue_five_points_layout.json` (Canonical 32-tile field layout).

## Product Principles

1. **Simulation Fidelity is Truth**: 3D mechanics and visual representations must match the physical rules of the arena down to millimeter heights and rod diameters.
2. **Tactical Density Over Toy Blocks**: Present clear, dense information (Action Sheets, Waypoint tables, IMU telemetry) rather than slow drag-and-drop block interfaces.
3. **Deterministic Reliability**: Zero external runtime dependencies; instant loading, 100% offline functionality.
4. **Immediate Accessibility**: High-contrast, legible typography conforming to WCAG AA, with intuitive keyboard shortcuts.
