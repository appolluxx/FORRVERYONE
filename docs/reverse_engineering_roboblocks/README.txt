================================================================================
ROBOBLOCKS IDE REVERSE ENGINEERING — TECHNICAL DOCUMENTATION SUITE
================================================================================
Target System      : roboBlocks IDE v1.2.2 (Offline Edition)
Authoring Standard : Senior Reverse Engineer, Firmware Architect, & Documentation Specialist
Extracted Path     : D:\Workspace\robot\assets\extracted_ide\
Documentation Path : D:\Workspace\robot\docs\reverse_engineering_roboblocks\
================================================================================

1. EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
This documentation suite provides a comprehensive, ground-truth technical analysis of
the reverse-engineered roboBlocks IDE application. Every recovered file has been verified
by SHA-256 hash, line count, and structural syntax to ensure another developer or AI can
understand the recovered architecture without having to rediscover it from scratch.

2. DOCUMENTATION INDEX & READING GUIDE
--------------------------------------------------------------------------------
For a complete understanding of the system, read the deliverables in the following order:

1. README.txt (This document)
   - Master index, reading order, and technical scope.

2. COMPLETE_FILE_INVENTORY.txt
   - 100% comprehensive catalog of all 509 recovered files with sizes, formats,
     verified origins, and SHA-256 hash manifest.

3. APPLICATION_ARCHITECTURE.txt
   - High-level architecture: Electron main process, Chromium renderer, IPC channels,
     Blockly block-to-code pipeline, and dual MicroPython/Arduino toolchains.

4. ROBOTICS_AND_SIMULATION.txt
   - Deep dive into PT Atom VX hardware pinouts (ESP32, PCA9685, BNO055, ST7789),
     mathematical motor PD heading stabilization, trapezoidal ramp curves,
     and the 3D Cannon.js physics engine (50mm bridge, chopstick speed bumps).

5. CROSS_REFERENCE.txt
   - Matrix tables connecting physical hardware pins to firmware drivers, visual blocks
     to Python code generators, and 3D simulation components to physics models.

6. LIMITATIONS_AND_UNVERIFIED_FINDINGS.txt
   - Clear demarcation between verified facts vs. hypotheses, omitted node_modules,
     standalone execution requirements, and security certificate audits.

7. DOCUMENTATION_COVERAGE.txt
   - Statistical coverage metrics across all 509 files (100.0% cataloged).

8. FILE_DOCUMENTATION/ (Directory)
   - Modular, per-file technical explanations split into 9 distinct subsystems:

     * 01_ROOT_AND_DESKTOP.txt           (Electron main.js, package.json, C++ simulator)
     * 02_MICROBLOCK_CORE.txt            (Core JS controllers, serial.js, board.js)
     * 03_BLOCKLY_AND_BLOCKS.txt         (Blockly framework, standard logic blocks)
     * 04_BOARDS_ATOM_VX.txt             (Atom VX board index, motor/sensor codegen)
     * 05_BOARDS_BUILDBOT_AND_OTHERS.txt (BuildBot educational platform, mini boards)
     * 06_ROBOT_SIM_PHYSICS.txt          (assembly-physics.js, field-layout.js, optics)
     * 07_ATOM_VX_PYTHON_MODULES.txt     (motor.py, line_follower.py, board.py drivers)
     * 08_ASSETS_IMAGES_FONTS_MODELS.txt (3D GLB/STL models, icons, webfonts, audio)
     * 09_BIN_AND_TOOLS.txt              (Bundled esptool and clang-format utilities)

3. VERIFIED EXTRACTION ROOTS
--------------------------------------------------------------------------------
- Primary Source Root: D:\Workspace\robot\assets\extracted_ide\
- Embedded Python Root: D:\Workspace\robot\assets\extracted_ide\atom_vx_python\
- C++ Simulator Headers: D:\Workspace\robot\assets\extracted_ide\desktop\cpp-sim\include\
- Original Installed ASAR: C:\Users\john\AppData\Local\Programs\roboBlocks IDE\resources\app.asar

================================================================================
END OF README — ALL DELIVERABLES PRESERVED IN D:\Workspace\robot\docs\reverse_engineering_roboblocks\
================================================================================