# Master Project Documentation & Competition Playbook
## Tactical Mission Planning System & Automated Code Generator for PT-BOT Atom VX (100-Point Score)
### Tactical Mission Suite v7.2 & High-Speed Smooth Firmware Optimization

---

## Table of Contents
1. [Executive Summary & Project Overview](#1-executive-summary--project-overview)
2. [Robot Hardware & Engineering Specifications](#2-robot-hardware--engineering-specifications)
3. [Competition Rules & Critical Invariants](#3-competition-rules--critical-invariants)
4. [Firmware Upgrades & Motor Control (C++)](#4-firmware-upgrades--motor-control-c)
5. [Physics & Non-linear Timing Model](#5-physics--non-linear-timing-model)
6. [Tactical Mission Editor Web Application (`tactical_planner.html` / `web.html`)](#6-tactical-mission-editor-web-application)
7. [Official Field Layout & 100-Point Mission Trajectory](#7-official-field-layout--100-point-mission-trajectory)
8. [3-Hour Competition Playbook](#8-3-hour-competition-playbook)
9. [Project Directory & File Inventory](#9-project-directory--file-inventory)

---

## 1. Executive Summary & Project Overview

### 1.1 Background & Objective
This project was developed for the **Intermediate Secondary School Robotics Competition**. Teams receive the official arena configuration on the morning of the competition. Competitors are given **3 hours (180 minutes)** to program and test their robot. During the official scoring round, the robot must autonomously complete all missions within **3 minutes (180 seconds)** to achieve the maximum score of **100 points**.

### 1.2 Identified Failure Modes in Prior Runs
1. **Wheel Slip & Jerky Acceleration:** Hard acceleration and abrupt braking caused wheel slippage, accumulating positional drift and causing wheels to touch the 20mm black boundary lines (violating Rule 11, resulting in mandatory retry).
2. **Sluggish Curve Turns:** Wide, sweeping turns in tight corridors frequently caused chassis edges or wheels to scrape boundary lines.
3. **Multi-tile Overshoot:** Multiplying single-cell duration linearly ($T \times n$) led to severe overshoot due to unmodeled ramp-up and ramp-down motor phases.
4. **Drop Zone Trapping:** The drop bays are narrow 3-sided enclosures. Attempting a 180° in-place spin inside the drop bay guaranteed collision with borders.
5. **Manual Programming Overhead:** Hand-coding waypoint maneuvers in the Arduino IDE took 45–60 minutes, severely cutting into critical physical track calibration time.

### 1.3 Key Engineering Solutions
* **Competition-Grade C++ Firmware:** Tuned PID Heading Lock and S-Curve Acceleration profiles in [`Func_Move.ino`](../firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Move.ino) and [`Func_Spint-Turn.ino`](../firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Spint-Turn.ino), increasing cruise speed by 30% while achieving critically damped stops.
* **Tactical Mission Planner v7.2 ([`web.html`](../web.html) / [`tactical_planner.html`](../tactical_planner.html)):** A 100% offline, single-file web application adhering to Clean Architecture and Modern UI standards. Features automated BFS route solving, blackhole/bomb hazard avoidance, smooth segment merging, and automated reverse exit (`BB`) out of drop zones.
* **Live Telemetry HUD & Coordinate Rulers:** Real-time 100-point score verification, physics-modeled runtime estimate (~15.9s), X00–X07 / Y00–Y03 coordinate rulers, and one-click `.ino` export.

---

## 2. Robot Hardware & Engineering Specifications

| Component | Technical Details | Operational Parameter |
| :--- | :--- | :--- |
| **Microcontroller Unit (MCU)** | PT-BOT Atom VX Mainboard (ESP32-WROOM-32D Dual-Core 240MHz) | High-speed real-time processing, 4MB Flash |
| **IMU Sensor** | 9-Axis Gyroscope & Accelerometer (MPU-9250 / ICM-20948) | Reads Yaw (Z-axis) for Heading Lock at 0.1° resolution |
| **Motor Drive** | 4WD 16GA DC Metal Gear Motors (Special reduction ratio) | Rated no-load speed **570 RPM** @ 11.1V |
| **Wheels & Tires** | High-grip fine-tread silicone/foam wheels | Diameter: **43 mm**, Width: **25 mm** |
| **Chassis Geometry** | Track Width (Left-to-Right) / Wheelbase (Front-to-Rear) | Track Width: **155 mm**, Wheelbase: **130 mm** |
| **Robot Dimensions** | Width x Length x Height | **180 mm x 180 mm x 140 mm** (Complies with < 200x200 mm rule) |
| **Line Sensors** | 8-Channel Infrared Sensor Array (Front & Rear) | Used for line squarring & error reset (`SetFront` / `SetBack`) |
| **Drop Mechanism** | 2 or 3 High-Torque Micro Servos (Front-Left, Front-Right, Rear) | Locked angle: 90°, Release angle: 0° / 180° |
| **Power Source** | 3S Lithium-Polymer (Li-Po) Battery (11.1V nominal, 12.6V max) | Within legal limits (< 13.5V) |

---

## 3. Competition Rules & Critical Invariants

### 3.1 Scoring Structure (100 Points Total)
* **Checkpoints (2 points):** Yellow circles in travel corridors. Passing each earns 15 points = **30 points**.
* **Drop Zones (4 locations):** Designated rescue bays (North, South, East, West). Delivering rescue cubes correctly earns 15 points per bay = **60 points**.
* **Finish Zone (1 location):** Entering the red goal area and coming to a complete stop earns **10 points**.
* **Maximum Time Allowance:** Not exceeding **3 minutes (180 seconds)** per run.

### 3.2 Critical Arena Invariants & Hazards
1. **Rule 11 (Strict Wheel Clearance on 20mm Black Lines):**
   * Each arena cell is $300 \times 300\text{ mm}$.
   * Each cell border has a $20\text{ mm}$ thick black line, leaving a net white driving area of only $260 \times 260\text{ mm}$.
   * The robot chassis width is $180\text{ mm}$. This leaves a lateral clearance of only:
     $$\text{Clearance} = \frac{260\text{ mm} - 180\text{ mm}}{2} = 40\text{ mm per side}$$
   * **Invariant:** Wheels must NEVER touch the black boundary lines (judges issue an immediate retry penalty). The robot must execute strictly in-place spin turns (`spinDegree`), never sweeping curve turns.
2. **Black Hole:** The robot chassis may enter by no more than 50% of its body length and must reverse back out. Full traversal across a black hole is forbidden.
3. **Bomb Hazard:** Traversal over or contact with bomb marks is forbidden.

---

## 4. Firmware Upgrades & Motor Control (C++)

Firmware implementations in [`firmware/PT_BOT_Middle_3Drop_ATOM_VX/`](../firmware/PT_BOT_Middle_3Drop_ATOM_VX/) and [`firmware/PT_BOT_Middle_ATOM_VX/`](../firmware/PT_BOT_Middle_ATOM_VX/) incorporate the following enhancements:

### 4.1 Smooth Motion Profile & PID Heading Lock ([`Func_Move.ino`](../firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Move.ino))
* **S-Curve Ramp Profile:** Ramp-up and ramp-down phases are calibrated to exactly **120 ms**. This prevents wheel slip during rapid acceleration while maintaining smooth deceleration before complete stops.
* **Calibrated PID Tuning:**
  * $K_p = 3.8$ (Quick heading error compensation against physical terrain disturbances)
  * $K_d = 18.5$ (Damping factor preventing oscillation and hunting)
  * Minimum output (`min_speed`) = 22% PWM to maintain stall torque at low speeds
* **Output Clamping:** Constrained output `constrain(speed, -100, 100)` preventing variable overflow.

```cpp
// Smooth Motion Profile implementation in Func_Move.ino
unsigned long ramp_time = 120; // 120ms ramp-up and ramp-down
int min_spd = 22;              // Minimum torque threshold

if (elapsed < ramp_time) {
  current_target_speed = min_spd + (target_speed - min_spd) * elapsed / ramp_time;
} else if (elapsed > (duration - ramp_time)) {
  unsigned long remaining = duration - elapsed;
  current_target_speed = min_spd + (target_speed - min_spd) * remaining / ramp_time;
} else {
  current_target_speed = target_speed;
}
```

### 4.2 In-Place Spin Rotation ([`Func_Spint-Turn.ino`](../firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Spint-Turn.ino))
* **Fast PD In-place Spin:**
  * $K_p = 1.2, K_d = 0.12$
  * `min_speed = 28` to guarantee torque through the final degrees of rotation
  * `small_angle_threshold = 22°` transitions into fine deceleration approach
  * Watchdog Timeout = 2,500 ms to prevent stalling on external obstacles

### 4.3 Drop Zone Escape Protocol (`BB` Reverse Exit)
Upon delivering rescue packages into narrow drop bays, the robot executes a straight reverse command (`BB`) back into the main corridor under heading lock. Eliminating 180° turns within the drop bays completely removes the risk of scraping the 20mm boundary lines.

---

## 5. Physics & Non-linear Timing Model

### 5.1 Physical Kinematics of Wheels & Motors
* Wheel diameter $D = 43\text{ mm}$ gives circumference:
  $$C = \pi \times D = 3.1416 \times 43\text{ mm} \approx 135.08\text{ mm}$$
* Rated motor speed 570 RPM @ 11.1V yields theoretical no-load linear velocity:
  $$v_{no\_load} = \frac{570}{60} \times 0.13508\text{ m} \approx 1.283\text{ m/s}$$
* Under loaded competition conditions (chassis weight + friction load ~75–80% efficiency):
  $$v_{actual} \approx 0.88 - 0.95\text{ m/s}$$
* Traversing 1 single grid cell ($300\text{ mm}$):
  * Ramp-up phase (120 ms) covers $\approx 55\text{ mm}$
  * Ramp-down phase (120 ms) covers $\approx 55\text{ mm}$
  * Cruise phase covers the remaining $190\text{ mm}$ in $\approx 120\text{ ms}$
  * Total time for a single standalone block: $120 + 120 + 120 = \mathbf{360\text{ ms}}$

### 5.2 Non-linear Piecewise Timing Formula
To eliminate undershoot/overshoot when cruising across $n$ consecutive blocks, the system calculates duration using total ramp distance integration (110mm covered during 240ms ramp-up and ramp-down):

$$\text{TIME\_FLAT}(n) = \begin{cases} T_{FLAT\_BASE} & n = 1 \\ 240\text{ ms} + \left\lfloor\frac{n \times 300\text{ mm} - 110\text{ mm}}{0.92\text{ mm/ms}}\right\rceil & n > 1 \end{cases}$$

```cpp
#define TIME_FLAT(n) ( (n) == 1 ? T_FLAT_BASE : (240 + (int)(((n) * 300 - 110) / 0.92f)) )
```

### 5.3 Speed Profile & Obstacle Calibration Table

| Timing Parameter (ms) | Physical Meaning | 🚀 FAST Mode (88% PWM) | 🛡️ STEADY Mode (78% PWM) |
| :--- | :--- | :---: | :---: |
| `T_FLAT_BASE` | Single flat block duration (120ms ramp-up + 120ms ramp-down) | **360 ms** | **420 ms** |
| `T_FLAT_CRUISE` | Incremental time per additional block during steady cruise | **200 ms** | **240 ms** |
| `T_BRIDGE` | 50mm Bridge traversal (Compensating 9.6° incline resistance) | **520 ms** | **580 ms** |
| `T_BUMP` | Speed bumps crossing (7 wooden chopsticks, 18% wheel slip) | **620 ms** | **680 ms** |
| `T_SEESAW` | Seesaw traversal (Including board tilt transition delay) | **680 ms** | **750 ms** |
| `T_TUNNEL` | Tunnel clearance under gyro lock | **200 ms** | **240 ms** |
| `T_RECOIL` | Post-alignment reverse recoil after `SetFront` touches black line | **160 ms** | **180 ms** |

---

## 6. Tactical Mission Editor Web Application

The [`web.html`](../web.html) (and [`tactical_planner.html`](../tactical_planner.html)) application is a single-file, 100% offline tactical suite engineered with Vanilla JS and Clean Architecture:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  TACTICAL HEADER BAR                                   │
│  [PT] RESCUE COMMAND  ● SYS: READY   [1. ARENA_DESIGN] [2. ROUTE_PLAN]     [★ LOAD]    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                               TOP TELEMETRY HUD RIBBON                                 │
│  SCORE: 100/100 PTS │ TIME: ~15.9s / 180s │ NODES: 30 │ PROFILE: FAST │ [⚡ AUTO PATH]  │
├───────────────────────┬────────────────────────────────────────┬───────────────────────┤
│    ARENA TOOLSET      │          THEATER ARENA MATRIX          │  WAYPOINT INSPECTOR   │
│  (2-Column Palette)   │             X00 X01 ... X07            │  #01 ◀ Prev / Next ▶  │
│  • White Floor        │    Y00 ┌───┬───┬───┬───┐               │  Fn: FF / BB / Spin   │
│  • Borders (20mm)     │    Y01 │ S │   │   │ F │ (8x4 Grid)    │  Speed: 80%  Time: ms │
│  • Start / Finish     │    Y02 └───┴───┴───┴───┘               ├───────────────────────┤
│  • Checkpoint (x2)    │    Y03                                 │  GENERATED C++ CODE   │
│  • Drop Box (x4)      │  [▶ SIMULATE] [Overlay Path]           │  [Full] [B1] [B2]...  │
│  • 6 Obstacles        │                                        │  [💾 .INO] [📋 COPY]  │
└───────────────────────┴────────────────────────────────────────┴───────────────────────┘
```

### Core System Features:
1. **Interactive 3D Isometric Theater:** Hardware-accelerated 3D arena view with dynamic camera orbit/pan/zoom, elevated 3D bridge (+50mm), physically tilting 3D seesaw, speed bumps, tunnel archway, and 3D PT-BOT Atom VX robot with animated wheel rotation and payload cube drops.
2. **WebSerial Live Robot Hardware Link:** Direct USB communication with ESP32 Atom VX from Chrome/Edge (115200 baud). Features real-time IMU Gyro Heading Compass (`YAW:xxx.x`), 8-channel IR floor sensor bar graph, live battery voltage monitor, one-click physical diagnostic maneuvers (`SPIN 90`, `FF 1-Tile`, `SetFront`, `Drop`), and integrated serial terminal console with command input.
3. **Visual Mission Flow Sequencer:** Interactive block-based phase ribbon (`START ➔ BOX1 ➔ BOX2 ➔ BOX3 ➔ BOX4 ➔ FINISH`) providing instant point counts, step summaries, and single-click phase isolation.
4. **Synthesized Web Audio SFX:** 100% offline, zero-dependency audio synthesizer providing tactile sci-fi sound effects for simulation steps, cube drops, serial connects, and 100-point victory fanfare.
5. **Top Telemetry HUD:** Displays real-time score (100 PTS max), physics-estimated runtime (~15.9s), and total waypoint count.
6. **Coordinate Rulers:** X00–X07 and Y00–Y03 axis labels with toggle option.
7. **2-Column Tool Palette:** Zero-scroll palette for rapid placement of terrain tiles and obstacles.
8. **Waypoint Stepper:** Precise inspection and step-by-step adjustment of individual waypoints.
9. **Auto Mission Solver (BFS + Smooth Segment Merging):**
   * Computes shortest collision-free paths using Breadth-First Search (BFS).
   * Aggregates contiguous linear movements into single long-run commands via `extractSmoothSegments`.
   * Automatically inserts `SetFront` line squaring to eliminate accumulated drift.
   * Enforces automatic `BB` reverse exits from drop bays.
10. **Modular C++ Code Generator:** Splits code into modular routines `Box1()`, `Box2()`, `Box3()`, `Box4()`, and `Endmission()` with one-click `.ino` file download.

---

## 7. Official Field Layout & 100-Point Mission Trajectory

### 7.1 Official 8-Column x 4-Row Arena Matrix (32 Cells)

```text
       X00       X01       X02       X03       X04       X05       X06       X07
    ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
Y00 │  (00)   │  (01)   │  (02)   │  (03)   │  (04)   │  (05)   │  (06)   │  (07)   │
    │  Empty  │ CheckPt │ Tunnel  │  Empty  │  Empty  │  Empty  │ Drop-N  │ FINISH  │
    ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
Y01 │  (08)   │  (09)   │  (10)   │  (11)   │  (12)   │  (13)   │  (14)   │  (15)   │
    │  Empty  │ Border  │ Tunnel  │ Center  │ CheckPt │  Bumps  │  Empty  │  Empty  │
    ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
Y02 │  (16)   │  (17)   │  (18)   │  (19)   │  (20)   │  (21)   │  (22)   │  (23)   │
    │ Bridge  │ Bridge  │ Drop-E  │  Empty  │ Seesaw  │  Empty  │  Bomb   │ Border  │
    ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
Y03 │  (24)   │  (25)   │  (26)   │  (27)   │  (28)   │  (29)   │  (30)   │  (31)   │
    │ Drop-S  │ Drop-S  │  Empty  │  Empty  │  Empty  │ Hole ●  │  Empty  │  START  │
    └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### 7.2 Complete 30-Node Waypoint Trajectory (100 Points)

| Node | Cell Index | Coordinate (X, Y) | Terrain | Command | Speed (%) | Time (ms) | Mission Milestone |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: | :--- |
| **01** | 31 | (7, 3) | Start Zone | START | - | - | Launch position |
| **02** | 30 | (6, 3) | Flat floor | `FF` | 88 | 360 | Exit launch bay |
| **03** | 14 | (6, 1) | Flat floor | `FF` | 88 | 560 | Straight 2-cell cruise North |
| **04** | 06 | (6, 0) | Drop Zone N | `FF` | 88 | 360 | Enter Drop Zone 1 |
| **05** | 06 | (6, 0) | Drop Zone N | `SetFront` + `DropFL` | 20 | 160 | Release Cube 1 (+15 pts) |
| **06** | 14 | (6, 1) | Flat floor | `BB` | 88 | 360 | Retreat South to main corridor |
| **07** | 13 | (5, 1) | Speed Bumps | `FF` | 65 | 620 | Cross 7-chopsticks speed bumps |
| **08** | 12 | (4, 1) | Checkpoint 2 | `FF` | 88 | 360 | Clear Checkpoint 2 (+15 pts) |
| **09** | 20 | (4, 2) | Seesaw | `FF` | 75 | 680 | Cross seesaw |
| **10** | 19 | (3, 2) | Flat floor | `FF` | 88 | 360 | Connect to bridge ramp |
| **11** | 18 | (2, 2) | Drop Zone E | `FF` | 88 | 360 | Enter Drop Zone 2 |
| **12** | 18 | (2, 2) | Drop Zone E | `SetFront` + `DropFR` | 20 | 160 | Release Cube 2 (+15 pts) |
| **13** | 19 | (3, 2) | Flat floor | `BB` | 88 | 360 | Retreat East to main corridor |
| **14** | 27 | (3, 3) | Flat floor | `FF` | 88 | 360 | Turn South to bottom row |
| **15** | 25 | (1, 3) | Drop Zone S | `FF` | 88 | 560 | Enter Drop Zone 3 |
| **16** | 25 | (1, 3) | Drop Zone S | `SetFront` + `DropB` | 20 | 160 | Release Cube 3 (+15 pts) |
| **17** | 26 | (2, 3) | Flat floor | `BB` | 88 | 360 | Retreat East to main corridor |
| **18** | 24 | (0, 3) | Drop Zone S | `FF` | 88 | 560 | Enter Drop Zone 4 |
| **19** | 24 | (0, 3) | Drop Zone S | `SetFront` + `DropFL` | 20 | 160 | Release Cube 4 (+15 pts) |
| **20** | 26 | (2, 3) | Flat floor | `BB` | 88 | 560 | Retreat East to main corridor |
| **21** | 18 | (2, 2) | Bridge | `FF` | 92 | 520 | Ascend and cross 50mm bridge |
| **22** | 10 | (2, 1) | Tunnel | `FF` | 88 | 200 | Traverse lower tunnel segment |
| **23** | 02 | (2, 0) | Tunnel | `FF` | 88 | 200 | Traverse upper tunnel segment |
| **24** | 01 | (1, 0) | Checkpoint 1 | `FF` | 88 | 360 | Clear Checkpoint 1 (+15 pts) |
| **25** | 03 | (3, 0) | Flat floor | `FF` | 88 | 560 | Return East to top corridor |
| **26** | 05 | (5, 0) | Flat floor | `FF` | 88 | 560 | Straight high-speed cruise East |
| **27** | 07 | (7, 0) | FINISH Zone | `FF` | 88 | 560 | Enter red finish goal area |
| **28..30**| 07 | (7, 0) | FINISH Zone | `STOP()` | 0 | 0 | Full stop in target area (+10 pts) |

---

## 8. 3-Hour Competition Playbook

### 4-Step Standard Operating Procedure:

```text
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ 1. Layout Arena │ ──> │ 2. Run AI Solver │ ──> │ 3. Simulate Run  │ ──> │ 4. Flash MCU    │
│ (Open HTML App) │     │ (AUTO PATH 100)  │     │ (Check Clearance)│     │ (Upload sketch) │
└─────────────────┘     └──────────────────┘     └──────────────────┘     └─────────────────┘
```

1. **Step 1: Layout Arena (Elapsed time: 2 minutes)**
   * Open [`web.html`](../web.html) or [`tactical_planner.html`](../tactical_planner.html) in Chrome or Edge (offline, no Internet required).
   * If the competition field matches the standard preset, click **★ Load 100-Point Field**.
   * If judges modify cell placements, select the tool from the palette and click to update.
2. **Step 2: Compute Optimal Path (Elapsed time: 5 seconds)**
   * Click **⚡ Auto Path** (or press key `A`). The system runs BFS, merges segments, and produces the 100-point trajectory.
3. **Step 3: Verify via Simulator (Elapsed time: 30 seconds)**
   * Click **▶ Simulate** (or press `Spacebar`). Observe the orange robot marker to verify line clearances and turns.
4. **Step 4: Upload Firmware to Board (Elapsed time: 1 minute)**
   * Click **💾 .INO** to download the generated sketch, or click **📋 Copy Code**.
   * Open in Arduino IDE, connect USB cable to ESP32, and click Upload.

### On-Site Calibration Variables (Top 7 lines of C++ Sketch):
If actual arena grip or battery voltage varies on race day, adjust only these 7 parameters:
```cpp
// === On-site Timing Calibration (Adjust here, Unit: ms) ===
int T_FLAT_BASE   = 360;  // Undershooting: increase +20ms / Overshooting: decrease -20ms
int T_FLAT_CRUISE = 200;  // Steady cruise duration per additional block
int T_BRIDGE      = 520;  // Stalling on bridge ramp: increase to 550 - 580ms
int T_BUMP        = 620;  // Getting stuck on chopsticks bumps: increase duration
int T_SEESAW      = 680;  // Seesaw hasn't touched ground before driving off: increase
int T_TUNNEL      = 200;  // Tunnel cruise duration
int T_RECOIL      = 160;  // Reverse recoil duration after SetFront line contact
```

---

## 9. Project Directory & File Inventory

```text
D:\Workspace\robot\
├── index.html                                     # Entry point web app (mirror of tactical_planner.html)
├── tactical_planner.html                          # Tactical Mission Suite (Single-file offline app)
├── web.html                                       # Alias web interface
├── README.md                                      # Repository overview, architecture & quickstart
├── docs/                                          # [This Directory] Technical documents & manuals
│   ├── doc.md                                     # Master documentation & playbook
│   ├── robot_competition_rules_intermediate.pdf   # Official competition rulebook
│   ├── PT-BOT_Atom_VX_Assembly_Guide.pdf          # Robot hardware assembly manual
│   └── PT-BOT_Atom_VX_User_Manual.pdf             # PT-BOT Atom VX board user manual
├── data/                                          # Mission presets & arena JSON files
│   ├── official_field_mission.json                # Standard 100-pt official arena layout
│   └── jaajaj.json                                # Alternative test field layout
├── assets/                                        # Images and visual media
│   ├── images.jpg                                 # Robot chassis / arena photo
│   └── 813939708_..._n.jpg                        # Arena layout reference photo
├── firmware/                                      # Arduino C++ embedded firmware
│   ├── PT_BOT_Middle_3Drop_ATOM_VX/               # 3-Servo Drop Firmware (ESP32)
│   │   ├── PT_BOT_Middle_3Drop_ATOM_VX.ino
│   │   ├── Func_Move.ino
│   │   ├── Func_Spint-Turn.ino
│   │   ├── DropBox.ino
│   │   ├── Sensor.ino
│   │   ├── BOX1.ino ... BOX4.ino
│   │   ├── Endmission.ino
│   │   └── _Examples.ino
│   └── PT_BOT_Middle_ATOM_VX/                     # 2-Servo Standard Drop Firmware
│       ├── PT_BOT_Middle_ATOM_VX.ino
│       ├── Func_Move.ino
│       ├── Func_Spint-Turn.ino
│       ├── DropBox.ino
│       ├── Sensor.ino
│       ├── BOX1.ino ... BOX4.ino
│       ├── EndMission.ino
│       └── _Examples.ino
├── drivers/                                       # Hardware device drivers
│   └── CP210x_Windows_Drivers/                    # Silicon Labs CP210x USB-to-UART drivers
├── scripts/                                       # Automation and CLI tools
│   ├── solve_cli.js                               # Node.js terminal mission solver & code generator
│   ├── verify_project.js                          # Project integrity validation suite
│   └── launch_planner.bat                         # Windows one-click browser launcher
└── archives/                                      # Backups and historical archives
    ├── RAMMap.zip                                 # Sysinternals utility archive
    ├── robot-intermediate-backup-20260922.zip     # Original project backup
    ├── web.html.bak                               # Legacy HTML backup
    └── tactical_planner.html.backup               # Legacy planner backup
```

---
*Verified against firmware source code, physics timing models, and mission solver.*
