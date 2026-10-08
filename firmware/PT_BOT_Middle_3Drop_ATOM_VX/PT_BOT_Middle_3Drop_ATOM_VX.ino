#include <PTBOTAtomVX.h>

//                    S0   S1   S2   S3   S4   S5   S6   S7
int sensor_min[] = { 100, 100, 100, 100, 100, 100, 100, 100 };  // Green surface calibrate
int sensor_max[] = { 400, 500, 800, 700, 600, 700, 800, 600 };  // White surface calibrate
float power_factor = 1.0;

int line_value[] = { 0, 0, 0, 0, 0, 0, 0, 0 };
float current_degree = 0;
float previous_error_forward = 0;

//----------Servo Front-Left values----------//
#define CH_SERVO_FRONT_LEFT 2   // Servo channel for Front-Left drop
int ServoFrontLeft_Lock = 95;   // Lock cube Front S2
int ServoFrontLeft_Drop = 50;  // Drop cube Front S2

//----------Servo Front-Right values----------//
#define CH_SERVO_FRONT_RIGHT 1   // Servo channel for Front-Right drop
int ServoFrontRight_Lock = 0;   // Lock cube Front S1
int ServoFrontRight_Drop = 55;  // Drop cube Front S1

//----------Servo calibration values 0 Rear----------//
#define CH_SERVO_BACK 0   // Servo channel for Rear drop
int ServoBack_Lock = 0;   // Lock cube Rear S0
int ServoBack_Drop = 55;  // Drop cube Rear S0

long delayALL = 0;
bool stateA = 0, stateB = 0, stateAB = 0;

void setup() {
  Serial.begin(115200);
  initialize();
  config();
  // ShowValue_Sensor();  // Show sensor values
  // calibrateIMU();

  //---------------Turn speed and gyro angle Gyro Sensor (Fast & Smooth)---------------//
  setSpeed_spin(100);             // Max in-place spin speed, adjustable 0-100 0-100
  setSpeed_turn(100);             // Max curve turn speed, adjustable 0-100 0-100
  setDegreeStop_SpinLeft(2.85);   // In-place spin tolerance left (deg)
  setDegreeStop_SpinRight(2.95);  // In-place spin tolerance right (deg)
  setDegreeStop_TurnLeft(4.0);    // Curve turn tolerance left (deg)
  setDegreeStop_TurnRight(4.0);   // Curve turn tolerance right (deg)

  // Load any previously uploaded dynamic mission from NVS Flash
  loadMissionFromNVS();
}

void loop() {
  STOP();
  setAngleOffset();
  current_degree = 0;
    
  if (dynamic_mission_loaded && dynamic_mission_count > 0) {
    executeDynamicMission();
  } else {
    Box1();
    Box2();
    Box3();
    Box4();
    Endmission();
  }
}
