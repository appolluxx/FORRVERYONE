void DropF() {
  servoWrite(CH_SERVO_FRONT, ServoFront_Drop);
  delay(250);
  servoWrite(CH_SERVO_FRONT, ServoFront_Lock);
}

void DropB() {
  servoWrite(CH_SERVO_BACK, ServoBack_Drop);
  delay(250);
  servoWrite(CH_SERVO_BACK, ServoBack_Lock);
}

void DropF(int speed) {
  SetFront_Drop(speed);
  SetFront(20);
  DropF();
}

void DropB(int speed) {
  SetBack_Drop(speed);
  SetBack(20);
  DropB();
}