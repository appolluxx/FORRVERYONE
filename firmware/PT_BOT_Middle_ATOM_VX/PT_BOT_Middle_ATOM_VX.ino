#include <PTBOTAtomVX.h>

//                    S0   S1   S2   S3   S4   S5   S6   S7
int sensor_min[] = { 150, 150, 150, 150, 150, 150, 150, 150 };
int sensor_max[] = { 350, 350, 350, 350, 350, 350, 350, 350 };
float power_factor = 1.0;

int line_value[] = { 0, 0, 0, 0, 0, 0, 0, 0 };
float current_degree = 0;
float previous_error_forward = 0;

// =============================================================================
// TIMING MODEL & TILE DISTANCE MACROS (Non-linear Acceleration Compensation)
// =============================================================================
int T_FLAT_BASE   = 420;  // 1 ช่องแรก (รวมเวลาเร่ง Ramp-up 120ms + เบรก Ramp-down 120ms)
int T_FLAT_CRUISE = 240;  // เวลาคงที่ต่อช่องถัดไปเมื่อวิ่งทางตรงยาว
int T_BRIDGE      = 580;  // ขึ้นสะพาน 50mm
int T_BUMP        = 680;  // ลูกระนาด 7 อัน
int T_SEESAW      = 750;  // ไม้กระดก
int T_TUNNEL      = 240;  // อุโมงค์
int T_RECOIL      = 180;  // ถอยหลังหลังจับเส้นดำ

#define TIME_FLAT(n) ( (n) == 1 ? T_FLAT_BASE : (T_FLAT_BASE + ((n) - 1) * T_FLAT_CRUISE) )

//----------ค่าเซอร์โว 1 ด้านหน้า----------//
#define CH_SERVO_FRONT 1   // ช่องที่เสียบเซอร์โว ชุดปล่อยหน้า
int ServoFront_Lock = 0;   // ล็อคลูกบาศก์หน้า S1
int ServoFront_Drop = 60;  // ปล่อยลูกบาศก์หน้า S1

//----------ค่าเซอร์โว 0 ด้านหลัง----------//
#define CH_SERVO_BACK 0   // ช่องที่เสียบเซอร์โว ชุดปล่อยหลัง
int ServoBack_Lock = 0;   // ล็อคลูกบาศก์หลัง S0
int ServoBack_Drop = 60;  // ปล่อยลูกบาศก์หลัง S0

long delayALL = 0;

void setup() {
  Serial.begin(115200);
  initialize();
  config();
  // ShowValue_Sensor();  // โชว์ค่าเซ็นเซอร์
  // calibrateIMU();

  //---------------ตั้งค่าความเร็วเลี้ยว และมุมองศาเลี้ยว Gyro Sensor---------------//
  setSpeed_spin(100);             // ความเร็วสูงสุด เลี้ยวแบบหมุน ปรับได้ตั้งแต่ 0-100
  setSpeed_turn(100);             // ความเร็วสูงสุด เลี้ยวแบบดีโค้ง ปรับได้ตั้งแต่ 0-100
  
  //---------(เลขยิ่งน้อยมาก หุ่นยนต์ยิ่งเลี้ยวเกินมุมฉาก ปรับได้ตั้งแต่ 0.0-15.0)----------//
  setDegreeStop_SpinLeft(2.85);   // เลี้ยวแบบหมุน กำหนดความคลาดเคลื่อนที่ยอมรับได้ ซ้าย
  setDegreeStop_SpinRight(2.95);  // เลี้ยวแบบหมุน กำหนดความคลาดเคลื่อนที่ยอมรับได้ ขวา

  //---------(เลขยิ่งน้อยมาก หุ่นยนต์ยิ่งเลี้ยวเกินมุมฉาก ปรับได้ตั้งแต่ 0.0-15.0)----------//
  setDegreeStop_TurnLeft(4.0);   // เลี้ยวแบบดีโค้ง กำหนดความคลาดเคลื่อนที่ยอมรับได้ ซ้าย
  setDegreeStop_TurnRight(4.0);  // เลี้ยวแบบดีโค้ง กำหนดความคลาดเคลื่อนที่ยอมรับได้ ขวา
  //-----------------------------------------------------------------------//
}

void loop() {
  STOP();
  setAngleOffset();
  current_degree = 0;

  // ทดสอบวิ่ง 3 ช่อง ด้วยสปีด 84
  FF(84, TIME_FLAT(3));
}
