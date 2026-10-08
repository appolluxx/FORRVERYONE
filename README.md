# PT-BOT Atom VX · Tactical Mission Suite & Autonomous Firmware

Autonomous robotics competition system designed for the **Intermediate Secondary School Robotics Competition** (100 Max Points, 3-minute mission window, 3-hour on-site programming allowance).

Enterprise-grade, feature-driven architecture adhering to **Clean Architecture**.

---

## Quick Start

### 1. Launch PT-BOT Tactical IDE (Desktop App Mode)
Double-click [`launch_ide.bat`](launch_ide.bat) (or run `npm start`).
* **Native Desktop Window:** Standalone chromeless Windows desktop app powered by Electron.
* **⚡ 0.5-Second Quick Upload:** Click **⚡ Auto Path** &rarr; click **⚡ Quick Upload**. Directly sends mission waypoints to the robot's NVS Flash via USB Serial in **under 500ms** (zero compilation wait!).
* **🔨 1-Click Native Flash:** Click **🔨 Flash C++** to compile and flash full Arduino firmware via background `arduino-cli` at 921,600 baud.
* **100% Offline:** Runs directly from disk without Internet connectivity.

### 2. Run CLI Mission Solver
Solve trajectories and output Arduino C++ routines directly from terminal:
```bash
npm run solve
# or: node tools/cli/solve_cli.js
```
To solve a custom arena file:
```bash
node tools/cli/solve_cli.js data/arenas/jaajaj.json
```

### 3. Verify Project Integrity
Run the automated test suite to verify all file paths, JSON datasets, and firmware sketches:
```bash
npm test
# or: node tools/testing/verify_project.js
```

### 4. Run Headless Local Hardware Bridge Server
```bash
npm run server
# or: node src/infrastructure/server/ide_server.js
```

---

## Clean Architecture Directory Structure

```text
D:\Workspace\robot\
├── package.json                                       # Root NPM package configuration ("main": "apps/desktop/main.js")
├── package-lock.json                                  # Dependency lockfile
├── launch_ide.bat                                     # Desktop launcher forwarder
├── Launch_IDE.vbs                                     # Silent desktop launcher forwarder
├── README.md                                          # [This File] Architectural overview & quick start
│
├── apps/                                              # Presentation Layer
│   ├── desktop/                                       # Native Desktop Application (Electron)
│   │   ├── main.js                                    # Electron main process & OS hardware IPC
│   │   ├── launch_ide.bat                             # Desktop launcher script
│   │   └── Launch_IDE.vbs                             # Silent background launcher
│   └── web/                                           # Tactical Mission Planner UI (LEGO EV3 Classroom Theme)
│       ├── index.html                                 # Primary single-page tactile planner & 3D WebGL simulator
│       ├── tactical_planner.html                      # Offline web entrypoint alias
│       └── web.html                                   # Web entrypoint alias
│
├── src/                                               # Core Domain & Infrastructure Adapters
│   ├── core/                                          # Domain entities, kinematics rules, scoring & solver
│   │   ├── domain/                                    # Pure business logic models
│   │   └── application/                               # Mission planning & path computation services
│   └── infrastructure/                                # Hardware bridges & external I/O
│       ├── hardware/                                  # WebSerial & Windows COM scanners
│       └── server/                                    # Local HTTP & SSE hardware backend server
│           └── ide_server.js                          # Port 4848 compilation bridge & REST API
│
├── data/                                              # Domain Datasets
│   └── arenas/                                        # Tactical 8x4 arena layout definitions
│       ├── official_field_mission.json                # Standard 100-point competition layout
│       ├── jaajaj.json                                # Alternative tactical test arena
│       └── normal.json                                # Baseline arena layout
│
├── firmware/                                          # Embedded ESP32 C++ Sketches (100% Arduino IDE compatible)
│   ├── PT_BOT_Middle_3Drop_ATOM_VX/                   # 3-Servo Drop Firmware (ESP32)
│   │   ├── PT_BOT_Middle_3Drop_ATOM_VX.ino
│   │   ├── Func_Move.ino                              # S-Curve 120ms ramp + PID Heading Lock
│   │   ├── Func_Spint-Turn.ino                        # In-place PD spin rotation
│   │   ├── DropBox.ino                                # Servo drop triggers (CH2 FL, CH1 FR, CH0 Rear)
│   │   ├── Sensor.ino                                 # IR reflectance calibration routines
│   │   ├── BOX1.ino ... BOX4.ino                      # Modular mission sequence per box
│   │   ├── MissionRunner.ino                          # High-speed NVS mission executor
│   │   └── Endmission.ino                             # Finish zone docking
│   └── PT_BOT_Middle_ATOM_VX/                         # 2-Servo Standard Drop Firmware
│       └── ...
│
├── assets/                                            # Presentation & 3D Engine Assets
│   ├── lib/                                           # Vendor simulation libraries
│   │   ├── three.min.js                               # WebGL 3D rendering engine
│   │   └── OrbitControls.js                           # Interactive 3D camera controls
│   └── images/                                        # Visual reference media
│       ├── robot_chassis.jpg                          # PT-BOT chassis photo
│       └── field_reference.jpg                        # Competition arena photo
│
├── docs/                                              # Technical Documentation & Rulebooks
│   ├── architecture/                                  # Architectural manuals & audit reports
│   │   ├── tactical_playbook.md                       # Master engineering playbook & pinouts
│   │   └── audit_adversarial_report.txt               # Adversarial edge-case audit report
│   ├── rules/                                         # Official competition regulations
│   │   └── robot_competition_rules_intermediate.pdf  # Rulebook (Rule 11, obstacles, scoring)
│   └── manuals/                                       # Hardware manuals
│       ├── PT-BOT_Atom_VX_Assembly_Guide.pdf          # Chassis mechanical assembly
│       └── PT-BOT_Atom_VX_User_Manual.pdf             # ESP32 mainboard user manual
│
├── drivers/                                           # Hardware Operating System Drivers
│   └── cp210x/                                        # Silicon Labs CP210x USB-to-UART VCP drivers
│
├── tools/                                             # Automation, CLI & QA Test Suites
│   ├── cli/                                           # Command-line tools
│   │   ├── solve_cli.js                               # Terminal trajectory solver & C++ generator
│   │   └── launch_planner.bat                         # Browser tactical planner launcher
│   ├── testing/                                       # Test & validation suites
│   │   └── verify_project.js                          # Project integrity validation suite
│   └── migration/                                     # Utility & migration scripts
│       └── ...
│
└── archives/                                          # Historical Archives & Cold Storage
    ├── backups/                                       # Codebase & memory diagnostics backups
    └── legacy-ui/                                     # Historical planner backups
```

---

## Competition Summary (100 Points Max)

* **Checkpoints (x2):** 15 points each = **30 points**
* **Drop Zones (x4):** 15 points each = **60 points**
* **Finish Zone (x1):** 10 points = **10 points**
* **Rule 11 (Critical):** 300mm arena cells with 20mm black borders leave only 40mm wheel clearance per side for the 180mm chassis. Wheels must NEVER touch black lines. In-place spin turns (`spinDegree`) are strictly enforced.

For complete engineering formulas, physics timing models, and on-site tuning parameters, see [`docs/architecture/tactical_playbook.md`](docs/architecture/tactical_playbook.md).
