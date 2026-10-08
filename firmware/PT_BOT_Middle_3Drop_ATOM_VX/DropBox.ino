void DropF() {
  servoWrite(CH_SERVO_FRONT_LEFT, ServoFrontLeft_Drop);
  servoWrite(CH_SERVO_FRONT_RIGHT, ServoFrontRight_Drop);
  delay(350);
  servoWrite(CH_SERVO_FRONT_LEFT, ServoFrontLeft_Lock);
  servoWrite(CH_SERVO_FRONT_RIGHT, ServoFrontRight_Lock);
  delay(350);
}

void DropFL() {
  servoWrite(CH_SERVO_FRONT_LEFT, ServoFrontLeft_Drop);
  delay(350);
  servoWrite(CH_SERVO_FRONT_LEFT, ServoFrontLeft_Lock);
  delay(350);
}

void DropFR() {
  servoWrite(CH_SERVO_FRONT_RIGHT, ServoFrontRight_Drop);
  delay(350);
  servoWrite(CH_SERVO_FRONT_RIGHT, ServoFrontRight_Lock);
  delay(350);
}

void DropB() {
  servoWrite(CH_SERVO_BACK, ServoBack_Drop);
  delay(300);
  servoWrite(CH_SERVO_BACK, ServoBack_Lock);
}

void DropF(int speed) {
  SetFront_Drop(speed);
  SetFront(speed);
  DropF();
}

void DropFL(int speed) {
  SetFront_Drop(speed);
  SetFront(speed);
  DropFL();
}

void DropFR(int speed) {
  SetFront_Drop(speed);
  SetFront(speed);
  DropFR();
}

void DropB(int speed) {
  SetBack_Drop(speed);
  SetBack(speed);
  DropB();
}