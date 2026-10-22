/**
 * =============================================================================
 * PT-BOT TACTICAL IDE · AUTO CODE GENERATOR
 * Generates verified, deterministic firmware code directly from Route IR
 * Authoritative Source: D:\Workspace\robot\firmware\PT_BOT_Middle_3Drop_ATOM_VX
 * =============================================================================
 */

const { compileRouteToPrimitives } = require('../domain/firmware_primitives');

class CodeGenerator {
    /**
     * Generates a complete, authentic Arduino C++ mission sketch
     */
    static generateCppSketch(routeIR) {
        const primitives = compileRouteToPrimitives(routeIR);
        const projectName = routeIR.projectId === 'atom-vx-rescue-five-points' 
            ? 'Five-Point Route Tactical Mission' 
            : 'Quick Drop Box 4 ENC Mission';

        let missionBody = primitives.map((p, idx) => {
            const cppCall = p.op.toCpp(...p.args);
            const pad = "    ";
            return `${pad}// Step ${idx + 1}: ${p.comment}\n${pad}${cppCall}`;
        }).join('\n\n');

        const sketch = `/**
 * =============================================================================
 * PT-BOT ATOM VX · AUTO-GENERATED TACTICAL MISSION SKETCH
 * Mission: ${projectName}
 * Waypoints: ${routeIR.waypoints.length} | Segments: ${routeIR.segments.length}
 * Total Distance: ${(routeIR.totalDistance * 100).toFixed(1)} cm | Estimated Duration: ${(routeIR.totalDurationMs / 1000).toFixed(2)} s
 * Generated Deterministically by PT-BOT Tactical Planner
 * Authoritative Firmware Grounding: firmware/PT_BOT_Middle_3Drop_ATOM_VX
 * =============================================================================
 */

#include <PTBOTAtomVX.h>

// Optical Line Sensor Calibration (ADC 0-1023)
int sensor_min[] = { 100, 100, 100, 100, 100, 100, 100, 100 };
int sensor_max[] = { 400, 500, 800, 700, 600, 700, 800, 600 };
float power_factor = 1.0;
int line_value[] = { 0, 0, 0, 0, 0, 0, 0, 0 };
float current_degree = 0;
float previous_error_forward = 0;

// Servo Calibration: Front-Left (S2), Front-Right (S1), Rear (S0)
#define CH_SERVO_FRONT_LEFT 2
int ServoFrontLeft_Lock = 95;
int ServoFrontLeft_Drop = 50;

#define CH_SERVO_FRONT_RIGHT 1
int ServoFrontRight_Lock = 0;
int ServoFrontRight_Drop = 55;

#define CH_SERVO_BACK 0
int ServoBack_Lock = 0;
int ServoBack_Drop = 55;

long delayALL = 50;

void setup() {
  Serial.begin(115200);
  initialize();
  config();

  // Gyro IMU Turn Speed & Precision Stop Tolerances (from PT_BOT_Middle_3Drop_ATOM_VX.ino)
  setSpeed_spin(100);
  setSpeed_turn(100);
  setDegreeStop_SpinLeft(2.85);
  setDegreeStop_SpinRight(2.95);
  setDegreeStop_TurnLeft(4.0);
  setDegreeStop_TurnRight(4.0);

  Serial.println(F("[READY] PT-BOT Atom VX Autonomous Mission Initialized."));
}

void executeAutoTacticalMission() {
  Serial.println(F("[RUN] Starting Tactical Mission Sequence..."));

${missionBody}

  Serial.println(F("[SUCCESS] Tactical Mission Completed Successfully!"));
}

void loop() {
  STOP();             // Wait for user to press Button A or B to launch
  setAngleOffset();   // Calibrate zero gyro yaw datum
  current_degree = 0; // Initialize current heading tracking

  executeAutoTacticalMission();

  // Hold position indefinitely after completion
  while (1) {
    motorStop();
    delay(500);
  }
}
`;
        return sketch;
    }

    /**
     * Generates High-Speed Serial Mission Protocol lines (for MissionRunner.ino)
     */
    static generateSerialProtocol(routeIR) {
        const primitives = compileRouteToPrimitives(routeIR);
        const lines = [
            'PING',
            'MISSION:CLEAR',
            `MISSION:START:${primitives.length}`
        ];

        primitives.forEach((p, idx) => {
            const stepLine = p.op.toSerial(idx + 1, ...p.args);
            lines.push(stepLine);
        });

        lines.push('MISSION:COMMIT');
        return lines.join('\n');
    }

    /**
     * Generates MicroPython equivalent
     */
    static generateMicroPython(routeIR) {
        const primitives = compileRouteToPrimitives(routeIR);
        const codeLines = primitives.map((p, idx) => {
            if (p.op.name === 'FF') {
                return `    # Step ${idx + 1}: ${p.comment}\n    motor.drive_forward(speed=${p.args[0]}, duration_ms=${p.args[1]})`;
            } else if (p.op.name === 'BB') {
                return `    # Step ${idx + 1}: ${p.comment}\n    motor.drive_reverse(speed=${p.args[0]}, duration_ms=${p.args[1]})`;
            } else if (p.op.name === 'spinDegree') {
                return `    # Step ${idx + 1}: ${p.comment}\n    imu.spin_degree(${p.args[0]})`;
            } else if (p.op.name.startsWith('Drop')) {
                return `    # Step ${idx + 1}: ${p.comment}\n    servo.${p.op.name.toLowerCase()}()`;
            } else {
                return `    # Step ${idx + 1}: ${p.comment}\n    motor.stop()`;
            }
        }).join('\n\n');

        return `# PT-BOT ATOM VX · AUTO-GENERATED MICROPYTHON MISSION
import board
import motor
import servo
import imu
import utime

def run_mission():
    print("[RUN] Starting MicroPython Autonomous Mission...")
    imu.reset_yaw()

${codeLines}

    print("[SUCCESS] Mission Completed.")

if __name__ == "__main__":
    run_mission()
`;
    }
}

module.exports = {
    CodeGenerator
};
