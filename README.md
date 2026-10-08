# PT-BOT Atom VX · Tactical Mission Suite & Autonomous Firmware

Autonomous robotics competition system designed for the **Intermediate Secondary School Robotics Competition** (100 Max Points, 3-minute mission window, 3-hour on-site programming allowance).

---

## Quick Start

### 1. Launch PT-BOT Tactical IDE (Desktop App Mode)
Double-click [`launch_ide.bat`](launch_ide.bat) (or [`scripts/launch_planner.bat`](scripts/launch_planner.bat)).
* **Native Desktop Window:** Opens as a standalone chromeless Windows desktop app.
* **⚡ 0.5-Second Quick Upload:** Click **⚡ Auto Path** &rarr; click **⚡ Quick Upload**. Directly sends mission waypoints to the robot's NVS Flash via USB Serial in **under 500ms** (zero compilation wait!).
* **🔨 1-Click Native Flash:** Click **🔨 Flash C++** to compile and flash full Arduino firmware via background `arduino-cli` at 921,600 baud.
* **100% Offline:** Runs directly from disk without Internet connectivity.

### 2. Run CLI Mission Solver
Solve trajectories and output Arduino C++ routines directly from terminal:
```bash
node scripts/solve_cli.js
```
To solve a custom arena file:
```bash
node scripts/solve_cli.js data/jaajaj.json
```

### 3. Verify Project Integrity
Run the automated test suite to verify all file paths, JSON datasets, and firmware sketches:
```bash
node scripts/verify_project.js
```

---

## Directory Structure

```text
D:\Workspace\robot\
├── index.html                                     # Web application entry point (tactical planner)
├── tactical_planner.html                          # Tactical Mission Suite (Single-file offline app)
├── web.html                                       # Alias web application
├── README.md                                      # [This File] Repository overview & quickstart
│
├── docs/                                          # Technical documentation, manuals & rulebooks
│   ├── doc.md                                     # Master documentation & competition playbook
│   ├── robot_competition_rules_intermediate.pdf   # Official competition rules
│   ├── PT-BOT_Atom_VX_Assembly_Guide.pdf          # Hardware assembly manual
│   └── PT-BOT_Atom_VX_User_Manual.pdf             # ESP32 mainboard user manual & pinouts
│
├── data/                                          # Arena layout & mission datasets
│   ├── official_field_mission.json                # Standard 100-point arena layout
│   └── jaajaj.json                                # Alternative test field configuration
│
├── firmware/                                      # Arduino C++ embedded firmware projects
│   ├── PT_BOT_Middle_3Drop_ATOM_VX/               # 3-Servo Drop Firmware (ESP32)
│   │   ├── PT_BOT_Middle_3Drop_ATOM_VX.ino
│   │   ├── Func_Move.ino                          # S-Curve 120ms ramp + PID Heading Lock
│   │   ├── Func_Spint-Turn.ino                    # In-place PD spin rotation
│   │   ├── DropBox.ino                            # Servo drop triggers (CH2 FL, CH1 FR, CH0 Rear)
│   │   ├── Sensor.ino                             # IR reflectance calibration routines
│   │   ├── BOX1.ino ... BOX4.ino                  # Modular mission sequence per box
│   │   └── Endmission.ino                         # Finish zone docking
│   └── PT_BOT_Middle_ATOM_VX/                     # 2-Servo Standard Drop Firmware
│       └── ...
│
├── drivers/                                       # Hardware USB drivers
│   └── CP210x_Windows_Drivers/                    # Silicon Labs CP210x USB-to-UART VCP drivers
│
├── assets/                                        # Visual media and photos
│   ├── images.jpg                                 # Robot chassis / arena photo
│   └── 813939708_..._n.jpg                        # Arena reference photo
│
├── scripts/                                       # Automation and CLI tools
│   ├── launch_planner.bat                         # One-click browser launcher
│   ├── solve_cli.js                               # Node.js terminal trajectory solver
│   └── verify_project.js                          # Project integrity validation suite
│
└── archives/                                      # Backups and historical archives
    ├── RAMMap.zip                                 # Sysinternals RAMMap diagnostic tool
    ├── robot-intermediate-backup-20260922.zip     # Original project backup archive
    ├── web.html.bak                               # Legacy HTML backup
    └── tactical_planner.html.backup               # Legacy planner backup
```

---

## Competition Summary (100 Points Max)

* **Checkpoints (x2):** 15 points each = **30 points**
* **Drop Zones (x4):** 15 points each = **60 points**
* **Finish Zone (x1):** 10 points = **10 points**
* **Rule 11 (Critical):** 300mm arena cells with 20mm black borders leave only 40mm wheel clearance per side for the 180mm chassis. Wheels must NEVER touch black lines. In-place spin turns (`spinDegree`) are strictly enforced.

For complete engineering formulas, physics timing models, and on-site tuning parameters, see [`docs/doc.md`](docs/doc.md).
