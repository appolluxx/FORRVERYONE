/**
 * =============================================================================
 * PT-BOT TACTICAL IDE · VERIFIED FIRMWARE MOVEMENT PRIMITIVES
 * Grounded Strictly in D:\Workspace\robot\firmware\PT_BOT_Middle_3Drop_ATOM_VX
 * =============================================================================
 */

const FIRMWARE_OPS = {
    FF: {
        name: 'FF',
        opCode: 1,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Move.ino:44-75',
        description: 'Timed forward straight movement with S-curve acceleration and gyro heading lock',
        params: ['speed', 'timer'],
        validate: (spd, timer) => {
            if (spd < 0 || spd > 100) return 'Speed must be between 0 and 100%';
            if (timer < 50) return 'Timer must be at least 50 ms for S-curve completion';
            return null;
        },
        toCpp: (spd, timer) => `FF(${Math.round(spd)}, ${Math.round(timer)});`,
        toSerial: (idx, spd, timer) => `STEP:${idx}:FF:${Math.round(spd)}:${Math.round(timer)}`
    },
    BB: {
        name: 'BB',
        opCode: 2,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Move.ino:215-246',
        description: 'Timed reverse straight movement with S-curve acceleration and gyro heading lock',
        params: ['speed', 'timer'],
        validate: (spd, timer) => {
            if (spd < 0 || spd > 100) return 'Speed must be between 0 and 100%';
            if (timer < 50) return 'Timer must be at least 50 ms';
            return null;
        },
        toCpp: (spd, timer) => `BB(${Math.round(spd)}, ${Math.round(timer)});`,
        toSerial: (idx, spd, timer) => `STEP:${idx}:BB:${Math.round(spd)}:${Math.round(timer)}`
    },
    SPIN: {
        name: 'spinDegree',
        opCode: 3,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Spint-Turn.ino:1-56',
        description: 'In-place pivot turn using Gyro IMU YAW closed-loop PD control and counter-torque dynamic brake',
        params: ['relative_degree'],
        validate: (deg) => {
            if (deg < -180 || deg > 180) return 'Relative spin angle must be within [-180, 180] degrees';
            return null;
        },
        toCpp: (deg) => `spinDegree(${Math.round(deg)});`,
        toSerial: (idx, deg) => `STEP:${idx}:SPIN:${Math.round(deg)}:0`
    },
    SETFRONT: {
        name: 'SetFront',
        opCode: 4,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Move.ino:414-420',
        description: 'Front optical line alignment, then reverse away by timer ms and zero yaw angle offset',
        params: ['speed', 'timer'],
        validate: (spd, timer) => {
            if (spd < 10 || spd > 50) return 'SetFront speed should be between 10 and 50% for optical accuracy';
            return null;
        },
        toCpp: (spd, timer) => `SetFront(${Math.round(spd)}, ${Math.round(timer)});`,
        toSerial: (idx, spd, timer) => `STEP:${idx}:SETFRONT:${Math.round(spd)}:${Math.round(timer)}`
    },
    SETBACK: {
        name: 'SetBack',
        opCode: 5,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/Func_Move.ino:482-488',
        description: 'Rear optical line alignment, then forward away by timer ms and zero yaw angle offset',
        params: ['speed', 'timer'],
        validate: (spd, timer) => {
            if (spd < 10 || spd > 50) return 'SetBack speed should be between 10 and 50%';
            return null;
        },
        toCpp: (spd, timer) => `SetBack(${Math.round(spd)}, ${Math.round(timer)});`,
        toSerial: (idx, spd, timer) => `STEP:${idx}:SETBACK:${Math.round(spd)}:${Math.round(timer)}`
    },
    DROP_FL: {
        name: 'DropFL',
        opCode: 6,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/DropBox.ino:10-15',
        description: 'Front-Left servo payload deploy (Servo S2 from lock 95 deg to drop 50 deg)',
        params: [],
        validate: () => null,
        toCpp: () => `DropFL();`,
        toSerial: (idx) => `STEP:${idx}:DROP_FL:0:0`
    },
    DROP_FR: {
        name: 'DropFR',
        opCode: 7,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/DropBox.ino:17-22',
        description: 'Front-Right servo payload deploy (Servo S1 from lock 0 deg to drop 55 deg)',
        params: [],
        validate: () => null,
        toCpp: () => `DropFR();`,
        toSerial: (idx) => `STEP:${idx}:DROP_FR:0:0`
    },
    DROP_B: {
        name: 'DropB',
        opCode: 8,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/DropBox.ino:24-28',
        description: 'Rear servo payload deploy (Servo S0 from lock 0 deg to drop 55 deg)',
        params: [],
        validate: () => null,
        toCpp: () => `DropB();`,
        toSerial: (idx) => `STEP:${idx}:DROP_B:0:0`
    },
    DROP_F: {
        name: 'DropF',
        opCode: 9,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/DropBox.ino:1-8',
        description: 'Front dual servo payload deploy (both Front-Left and Front-Right)',
        params: [],
        validate: () => null,
        toCpp: () => `DropF();`,
        toSerial: (idx) => `STEP:${idx}:DROP_F:0:0`
    },
    STOP: {
        name: 'motorStop',
        opCode: 10,
        sourceFile: 'firmware/PT_BOT_Middle_3Drop_ATOM_VX/PTBOTAtomVX.h:40',
        description: 'Zero PWM output to all four motors',
        params: [],
        validate: () => null,
        toCpp: () => `motorStop();`,
        toSerial: (idx) => `STEP:${idx}:STOP:0:0`
    }
};

/**
 * Compiles a RouteIR instance into an array of verified Firmware Primitive invocations
 */
function compileRouteToPrimitives(routeIR) {
    const primitives = [];
    let currentHeading = routeIR.waypoints.length > 0 ? routeIR.waypoints[0].heading : 0;

    for (let i = 0; i < routeIR.segments.length; i++) {
        const seg = routeIR.segments[i];

        // 1. In-place Spin Turn to segment orientation if turnAngle != 0
        if (Math.abs(seg.turnAngle) >= 3.0) { // Tolerance threshold: >= 3 degrees
            primitives.push({
                op: FIRMWARE_OPS.SPIN,
                args: [seg.turnAngle],
                comment: `Turn ${seg.turnAngle > 0 ? 'Right' : 'Left'} ${Math.abs(seg.turnAngle)}° to face waypoint P${i + 2}`,
                targetWpIndex: i + 1
            });
            currentHeading = seg.targetHeading;
        }

        // 2. Forward Straight Travel with S-curve Heading Lock
        if (seg.distance > 0.01) { // Greater than 1 cm
            primitives.push({
                op: FIRMWARE_OPS.FF,
                args: [seg.start.speed, seg.moveDurationMs],
                comment: `Forward ${(seg.distance * 100).toFixed(1)} cm at ${seg.start.speed}% speed (${seg.moveDurationMs} ms)`,
                targetWpIndex: i + 1
            });
        }

        // 3. Optional Payload Action at the target waypoint
        const targetWp = seg.end;
        if (targetWp.action) {
            let actionOp = null;
            if (targetWp.action === 'DROP_FL' || targetWp.action === 'BOX1') actionOp = FIRMWARE_OPS.DROP_FL;
            else if (targetWp.action === 'DROP_FR' || targetWp.action === 'BOX2') actionOp = FIRMWARE_OPS.DROP_FR;
            else if (targetWp.action === 'DROP_B' || targetWp.action === 'BOX3') actionOp = FIRMWARE_OPS.DROP_B;
            else if (targetWp.action === 'DROP_F' || targetWp.action === 'BOX4') actionOp = FIRMWARE_OPS.DROP_F;
            else if (targetWp.action === 'SETFRONT') actionOp = FIRMWARE_OPS.SETFRONT;
            else if (targetWp.action === 'SETBACK') actionOp = FIRMWARE_OPS.SETBACK;

            if (actionOp) {
                primitives.push({
                    op: actionOp,
                    args: actionOp.params.length > 0 ? [30, 200] : [],
                    comment: `Deploy payload action (${targetWp.action}) at P${i + 2}`,
                    targetWpIndex: i + 1
                });
            }
        }
    }

    // Final Stop Primitive
    primitives.push({
        op: FIRMWARE_OPS.STOP,
        args: [],
        comment: 'Mission complete: stop all 4 drive motors',
        targetWpIndex: routeIR.waypoints.length - 1
    });

    return primitives;
}

module.exports = {
    FIRMWARE_OPS,
    compileRouteToPrimitives
};
