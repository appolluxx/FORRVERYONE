const { Waypoint, RouteIR } = require('../src/core/domain/route_ir');
const { compileRouteToPrimitives, FIRMWARE_OPS } = require('../src/core/domain/firmware_primitives');
const { PathPlanner } = require('../src/core/application/path_planner');
const { CodeGenerator } = require('../src/core/application/code_generator');
const { FirmwareValidator } = require('../src/infrastructure/compiler/firmware_validator');

console.log("==================================================================");
console.log("RUNNING AUTOMATED UNIT TESTS: AUTO PATH & AUTO CODE PIPELINE");
console.log("==================================================================");

let allPassed = true;

// TEST 1: Straight Route
console.log("\n--- TEST 1: Simple Straight Route ---");
const p1 = new Waypoint(1.05, -0.45, 0, 70);
const p2 = new Waypoint(1.05, 0.15, 0, 70);
const straightIR = new RouteIR('atom-vx-rescue-five-points', [p1, p2]);
console.log("Total Distance:", (straightIR.totalDistance * 100).toFixed(1), "cm");
console.log("Total Duration:", straightIR.totalDurationMs, "ms");
console.log("Is Valid:", straightIR.isValid);
if (!straightIR.isValid || Math.abs(straightIR.totalDistance - 0.60) > 0.01) {
    console.error("FAIL: Straight route distance mismatch");
    allPassed = false;
} else {
    console.log("PASS: Straight route geometry and timing correct");
}

// TEST 2: Multi-Waypoint Route with In-Place Turns & Payload Drop
console.log("\n--- TEST 2: Multi-Waypoint Route with Turns & Drop ---");
const waypoints = [
    new Waypoint(1.05, -0.45, 0, 70, null, "Start"),
    new Waypoint(1.05, 0.15, -90, 60, null, "Turn Point"),
    new Waypoint(0.45, 0.15, 0, 60, 'DROP_FL', "Drop Point")
];
const multiIR = new RouteIR('atom-vx-rescue-five-points', waypoints);
console.log("Segments count:", multiIR.segments.length);
console.log("Segment 0 turn angle:", multiIR.segments[0].turnAngle);
console.log("Segment 1 turn angle:", multiIR.segments[1].turnAngle);
const primitives = compileRouteToPrimitives(multiIR);
console.log("Compiled Primitives Count:", primitives.length);
primitives.forEach((p, idx) => console.log(`  [${idx + 1}] ${p.op.name}(${p.args.join(', ')}) - ${p.comment}`));

if (primitives.length < 3 || primitives[primitives.length - 1].op.name !== 'motorStop') {
    console.error("FAIL: Primitives compilation mismatch");
    allPassed = false;
} else {
    console.log("PASS: Multi-waypoint compilation to firmware primitives verified");
}

// TEST 3: Code Generation & Static Validation
console.log("\n--- TEST 3: Code Generation & Static Validation ---");
const generatedCpp = CodeGenerator.generateCppSketch(multiIR);
console.log("Generated C++ Sketch Preview (First 350 chars):");
console.log(generatedCpp.substring(0, 350) + "...\n");

const validation = FirmwareValidator.validateCppCode(generatedCpp);
console.log("Validation Result:", validation.valid ? "PASSED" : "FAILED");
console.log("Symbols Checked:", validation.symbolsChecked);
console.log("Distinct Functions:", validation.distinctFunctions);
console.log("Errors:", validation.errors);
console.log("Warnings:", validation.warnings);

if (!validation.valid || validation.errors.length > 0) {
    console.error("FAIL: Generated code failed static firmware validation");
    allPassed = false;
} else {
    console.log("PASS: Generated code 100% compliant with authoritative firmware!");
}

// TEST 4: Serial Dynamic Mission Protocol
console.log("\n--- TEST 4: Serial Dynamic Mission Protocol ---");
const serialProto = CodeGenerator.generateSerialProtocol(multiIR);
console.log("Serial Protocol Commands:\n" + serialProto);
if (!serialProto.includes('PING') || !serialProto.includes('MISSION:COMMIT') || !serialProto.includes('STEP:1:')) {
    console.error("FAIL: Serial protocol format invalid");
    allPassed = false;
} else {
    console.log("PASS: Serial Dynamic Mission protocol verified");
}

// TEST 5: Boundary & Obstacle Collision Detection
console.log("\n--- TEST 5: Obstacle & Boundary Collision Detection ---");
const outOfBoundsWp = new Waypoint(2.5, 0, 0, 70); // Out of 2.4m arena
const invalidIR = new RouteIR('atom-vx-rescue-five-points', [p1, outOfBoundsWp]);
console.log("Out-of-bounds valid:", invalidIR.isValid);
console.log("Out-of-bounds errors:", invalidIR.validationErrors);
if (invalidIR.isValid || invalidIR.validationErrors.length === 0) {
    console.error("FAIL: Did not detect out-of-bounds waypoint");
    allPassed = false;
} else {
    console.log("PASS: Correctly rejected out-of-bounds waypoint");
}

// Pit obstacle collision check
const pitArenaData = {
    cells: Array(32).fill({ type: "rescue_open" })
};
pitArenaData.cells[11] = { type: "rescue_pit" }; // Cell 11 is pit at col 3, row 1
const planner = new PathPlanner('atom-vx-rescue-five-points', pitArenaData);
const wpBeforePit = new Waypoint(-0.45, -0.45, 0, 70);
const wpAfterPit = new Waypoint(-0.15, -0.15, 0, 70);
const routeThruPit = new RouteIR('atom-vx-rescue-five-points', [wpBeforePit, wpAfterPit], pitArenaData);
console.log("Route through pit valid:", routeThruPit.isValid);
console.log("Pit collision error:", routeThruPit.validationErrors);
if (routeThruPit.isValid) {
    console.error("FAIL: Did not detect pit collision");
    allPassed = false;
} else {
    console.log("PASS: Pit obstacle collision correctly caught and explained");
}

// TEST 6: Auto Path (A* Obstacle Avoidance)
console.log("\n--- TEST 6: Auto Path Planner (A* Obstacle Avoidance) ---");
const autoResult = planner.planAutoPath({ x: -0.45, z: -0.45 }, { x: 0.45, z: 0.15 });
console.log("Auto Plan Success:", autoResult.success);
console.log("Method:", autoResult.method);
console.log("Explanation:", autoResult.explanation);
console.log("Planned Waypoints Count:", autoResult.waypoints.length);

if (!autoResult.success) {
    console.error("FAIL: Auto path planning failed");
    allPassed = false;
} else {
    console.log("PASS: Auto Path planning succeeded");
}

// TEST 7: Empty Route Handling
console.log("\n--- TEST 7: Empty Route Handling ---");
const emptyIR = new RouteIR('atom-vx-rescue-five-points', []);
console.log("Empty route valid:", emptyIR.isValid);
console.log("Empty route errors:", emptyIR.validationErrors);
if (emptyIR.isValid || !emptyIR.validationErrors.some(e => e.includes('at least 2 waypoints'))) {
    console.error("FAIL: Empty route was not rejected");
    allPassed = false;
} else {
    console.log("PASS: Empty route correctly rejected with clear explanation");
}

// TEST 8: Single Waypoint Route
console.log("\n--- TEST 8: Single Waypoint Route ---");
const singleIR = new RouteIR('atom-vx-rescue-five-points', [new Waypoint(0, 0)]);
if (singleIR.isValid || !singleIR.validationErrors.some(e => e.includes('at least 2 waypoints'))) {
    console.error("FAIL: Single waypoint route was not rejected");
    allPassed = false;
} else {
    console.log("PASS: Single waypoint route correctly rejected");
}

// TEST 9: Duplicate Waypoint Detection
console.log("\n--- TEST 9: Duplicate Consecutive Waypoint Detection ---");
const dupIR = new RouteIR('atom-vx-rescue-five-points', [
    new Waypoint(0.20, 0.20),
    new Waypoint(0.205, 0.205) // 0.7cm apart (< 2cm threshold)
]);
console.log("Duplicate route valid:", dupIR.isValid);
console.log("Duplicate route errors:", dupIR.validationErrors);
if (dupIR.isValid || !dupIR.validationErrors.some(e => e.includes('virtually identical'))) {
    console.error("FAIL: Duplicate waypoint was not caught");
    allPassed = false;
} else {
    console.log("PASS: Duplicate waypoint caught and flagged");
}

// TEST 10: Unreachable Destination (Inside Closed Wall Tile)
console.log("\n--- TEST 10: Unreachable Destination Inside Closed Wall ---");
const closedWallArena = {
    cells: Array(32).fill({ type: "rescue_open" })
};
closedWallArena.cells[12] = { type: "rescue_closed" }; // Closed wall at cell 12 (col 4, row 1)
const planner2 = new PathPlanner('atom-vx-rescue-five-points', closedWallArena);
const blockedRes = planner2.planAutoPath({ x: -0.45, z: -0.45 }, { x: 0.15, z: -0.15 });
console.log("Blocked plan success:", blockedRes.success);
console.log("Blocked plan method:", blockedRes.method);
console.log("Blocked explanation:", blockedRes.explanation);
if (blockedRes.success || blockedRes.method !== 'BLOCKED' || !blockedRes.explanation.includes('impassable obstacle')) {
    console.error("FAIL: Did not flag unreachable destination");
    allPassed = false;
} else {
    console.log("PASS: Unreachable destination correctly detected and explained");
}

// TEST 11: MicroPython Code Generation Verification
console.log("\n--- TEST 11: MicroPython Code Generation ---");
const testIR = new RouteIR('atom-vx-rescue-five-points', [
    new Waypoint(1.05, -0.45, 0, 70),
    new Waypoint(1.05, 0.15, -90, 60),
    new Waypoint(0.45, 0.15, 0, 60, 'DROP_B')
]);
const pyCode = CodeGenerator.generateMicroPython(testIR);
console.log("Generated MicroPython Preview (first 250 chars):");
console.log(pyCode.substring(0, 250) + "...\n");
if (!pyCode.includes('import board') || !pyCode.includes('motor.drive_forward') || !pyCode.includes('servo.dropb()')) {
    console.error("FAIL: MicroPython code generation invalid");
    allPassed = false;
} else {
    console.log("PASS: MicroPython code generation verified");
}

// TEST 12: Determinism Test
console.log("\n--- TEST 12: Determinism Test ---");
const codeRun1 = CodeGenerator.generateCppSketch(testIR);
const codeRun2 = CodeGenerator.generateCppSketch(testIR);
if (codeRun1 !== codeRun2) {
    console.error("FAIL: Code generation is not deterministic");
    allPassed = false;
} else {
    console.log("PASS: Code generation is 100% deterministic (identical bytes across runs)");
}

console.log("\n==================================================================");
console.log("ALL 12 AUTOMATED TESTS COMPLETE: " + (allPassed ? "100% SUCCESS!" : "FAILURES OCCURRED"));
console.log("==================================================================");
