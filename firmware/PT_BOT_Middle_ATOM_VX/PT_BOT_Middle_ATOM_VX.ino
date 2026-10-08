#include <PTBOTAtomVX.h>

//                    S0   S1   S2   S3   S4   S5   S6   S7
int sensor_min[] = { 150, 150, 150, 150, 150, 150, 150, 150 };
int sensor_max[] = { 350, 350, 350, 350, 350, 350, 350, 350 };
float power_factor = 1.0;

int line_value[] = { 0, 0, 0, 0, 0, 0, 0, 0 };
float current_degree = 0;
float previous_error_forward = 0;

//----------Servo calibration values 1 Front----------//
#define CH_SERVO_FRONT 1   // Servo channel for Front drop
int ServoFront_Lock = 0;   // Lock cube Front S1
int ServoFront_Drop = 60;  // Drop cube Front S1

//----------Servo calibration values 0 Rear----------//
#define CH_SERVO_BACK 0   // Servo channel for Rear drop
int ServoBack_Lock = 0;   // Lock cube Rear S0
int ServoBack_Drop = 60;  // Drop cube Rear S0

long delayALL = 0;

void setup() {
  Serial.begin(115200);
  initialize();
  config();
  // ShowValue_Sensor();  // Show sensor values
  // calibrateIMU();

  //---------------Set turn speed and gyro angles Gyro Sensor---------------//
  setSpeed_spin(100);             // Max in-place spin speed, adjustable 0-100 0-100
  setSpeed_turn(100);             // Max curve turn speed, adjustable 0-100 0-100
  
  //---------(Smaller value causes more overshoot past 90 deg, adjustable 0.0-15.0 0.0-15.0)----------//
  setDegreeStop_SpinLeft(2.85);   // In-place spin tolerance left (deg)
  setDegreeStop_SpinRight(2.95);  // In-place spin tolerance right (deg)

  //---------(Smaller value causes more overshoot past 90 deg, adjustable 0.0-15.0 0.0-15.0)----------//
  setDegreeStop_TurnLeft(4.0);   // Curve turn tolerance left (deg)
  setDegreeStop_TurnRight(4.0);  // Curve turn tolerance right (deg)
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
