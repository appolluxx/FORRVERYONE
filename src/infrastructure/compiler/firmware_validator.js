/**
 * =============================================================================
 * PT-BOT TACTICAL IDE · FIRMWARE STATIC VALIDATOR
 * Verifies generated code against the authoritative firmware AST and symbols
 * Authoritative Source: D:\Workspace\robot\firmware\PT_BOT_Middle_3Drop_ATOM_VX
 * =============================================================================
 */

const VERIFIED_FUNCTIONS = new Set([
    'FF',
    'BB',
    'FF_turn',
    'BB_turn',
    'spinDegree',
    'turnDegreeFront',
    'turnDegreeBack',
    'LL',
    'RR',
    'TT',
    'TTB',
    'SetFront',
    'SetBack',
    'SetFront_Drop',
    'SetBack_Drop',
    'DropFL',
    'DropFR',
    'DropB',
    'DropF',
    'motorStop',
    'motorWrite',
    'servoWrite',
    'adcRead',
    'angleRead',
    'setAngleOffset',
    'setSpeed_spin',
    'setSpeed_turn',
    'setDegreeStop_SpinLeft',
    'setDegreeStop_SpinRight',
    'setDegreeStop_TurnLeft',
    'setDegreeStop_TurnRight',
    'initialize',
    'config',
    'STOP',
    'delay',
    'millis',
    'Serial.begin',
    'Serial.println',
    'Serial.print',
    'F' // Arduino Flash-string macro
]);

class FirmwareValidator {
    static validateCppCode(cppCode) {
        const errors = [];
        const warnings = [];
        let symbolsChecked = 0;

        // 1. Mandatory Header Check
        if (!cppCode.includes('#include <PTBOTAtomVX.h>')) {
            errors.push("Missing mandatory board header: #include <PTBOTAtomVX.h>");
        }

        // 2. Strip comments and string literals to prevent false identifier matches
        let cleanCode = cppCode
            .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
            .replace(/\/\/.*/g, '')             // Remove single-line comments
            .replace(/"(?:[^"\\]|\\.)*"/g, '""'); // Strip string contents

        // 3. Extract and Validate all Function Invocations
        const callRegex = /\b([a-zA-Z_][a-zA-Z0-9_\.]*)\s*\(/g;
        let match;
        const foundCalls = new Set();

        while ((match = callRegex.exec(cleanCode)) !== null) {
            const funcName = match[1];
            // Skip language keywords & standard control flow
            if (['if', 'while', 'for', 'switch', 'return', 'sizeof', 'constrain', 'map', 'abs', 'fabs', 'round'].includes(funcName)) {
                continue;
            }
            foundCalls.add(funcName);
            symbolsChecked++;

            if (!VERIFIED_FUNCTIONS.has(funcName) && funcName !== 'executeAutoTacticalMission' && funcName !== 'setup' && funcName !== 'loop') {
                errors.push(`Unverified function call: '${funcName}()' does not exist in authoritative firmware (firmware/PT_BOT_Middle_3Drop_ATOM_VX).`);
            }
        }

        // 4. Check Parameter Bounds in Invocations
        const ffMatches = cleanCode.matchAll(/\bFF\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g);
        for (const ff of ffMatches) {
            const spd = parseInt(ff[1], 10);
            const timer = parseInt(ff[2], 10);
            if (spd < 0 || spd > 100) {
                errors.push(`Invalid FF() speed parameter: ${spd}%. Must be between 0 and 100%.`);
            }
            if (timer < 50) {
                warnings.push(`Low FF() timer: ${timer}ms. S-curve ramp-up requires at least 50ms for smooth motion.`);
            }
        }

        const spinMatches = cleanCode.matchAll(/\bspinDegree\s*\(\s*(-?\d+)\s*\)/g);
        for (const sp of spinMatches) {
            const deg = parseInt(sp[1], 10);
            if (deg < -180 || deg > 180) {
                errors.push(`Invalid spinDegree() relative angle: ${deg}°. Must be within [-180, 180] degrees.`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            symbolsChecked,
            distinctFunctions: Array.from(foundCalls),
            firmwareSource: 'D:\\Workspace\robot\\firmware\\PT_BOT_Middle_3Drop_ATOM_VX'
        };
    }
}

module.exports = {
    FirmwareValidator,
    VERIFIED_FUNCTIONS
};
