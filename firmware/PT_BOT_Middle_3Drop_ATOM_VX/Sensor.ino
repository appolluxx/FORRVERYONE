void calibrateMinMax() {
  unsigned long timer = millis();
  for (byte i = 0; i < 8; i++) {
    sensor_min[i] = 1023;
    sensor_max[i] = 0;
  }
  motorWrite(1000, 1000, 1000, 1000);
  while (1) {
    for (byte i = 0; i < 8; i++) {
      int sensor_value = adcRead(i);
      if (sensor_value < sensor_min[i]) sensor_min[i] = sensor_value;
      if (sensor_value > sensor_max[i]) sensor_max[i] = sensor_value;
    }
    if (millis() - timer > 2000) {
      motorStop();
      Serial.print("MIN: ");
      for (byte i = 0; i < 8; i++) {
        Serial.print(sensor_min[i]);
        if (i < 7) Serial.print(", ");
        else Serial.println();
      }
      Serial.print("MAX: ");
      for (byte i = 0; i < 8; i++) {
        Serial.print(sensor_max[i]);
        if (i < 7) Serial.print(", ");
        else Serial.println();
      }
      break;
    }
  }
}

void readLine() {
  for (byte i = 0; i < 8; i++) {
    line_value[i] = map(adcRead(i), sensor_min[i], sensor_max[i], 0, 100);
    if (line_value[i] < 0) line_value[i] = 0;
    else if (line_value[i] > 100) line_value[i] = 100;
  }
}

void ShowValue_Sensor() {
  lcdClear();
  while (1) {
    // readLine();
    int num_sensor = 8;
    int sensor_values[num_sensor];          // Declare variable type Array To store value Sensor
    for (int i = 0; i < num_sensor; i++) {  // Read loop values Sensor All 6 units
      // sensor_values[i] = line_value[i];     // Load values Sensor Each stored in variable
      sensor_values[i] = adcRead(i);  // Load values Sensor Each stored in variable
    }
    lcdDrawChart(sensor_values, num_sensor);  // Plot sensor values Sensor All 8 Units / usage: lcdDrawChart(Sensor values [Variable type Array], Count Sensor)
    delay(100);
  }
}

void config() {
  servoWrite(CH_SERVO_FRONT_LEFT, ServoFrontLeft_Lock);
  servoWrite(CH_SERVO_FRONT_RIGHT, ServoFrontRight_Lock);
  servoWrite(CH_SERVO_BACK, ServoBack_Lock);
  lcdClear();

  lcdSetTextSize(2);
  lcdPrintText(10, 1, "SERVO VALUE", 0xf800);
  lcdSetTextSize(1);
  lcdPrintText(25, 20, "FrontLeft Lock:", 0xffff);
  lcdPrintText(25, 40, "FrontLeft Drop:", 0xffff);
  lcdPrintText(25, 60, "FrontRight Lock:", 0xffff);
  lcdPrintText(25, 80, "FrontRight Drop:", 0xffff);
  lcdPrintText(25, 100, "Back Lock:", 0xffff);
  lcdPrintText(25, 120, "Back Drop:", 0xffff);
  lcdPrintText(125, 20, "       ", 0xffff);
  lcdPrintText(125, 20, String(ServoFrontLeft_Lock), 0xffff);
  lcdPrintText(125, 40, "       ", 0xffff);
  lcdPrintText(125, 40, String(ServoFrontLeft_Drop), 0xffff);
  lcdPrintText(125, 60, "       ", 0xffff);
  lcdPrintText(125, 60, String(ServoFrontRight_Lock), 0xffff);
  lcdPrintText(125, 80, "       ", 0xffff);
  lcdPrintText(125, 80, String(ServoFrontRight_Drop), 0xffff);
  lcdPrintText(125, 100, "       ", 0xffff);
  lcdPrintText(125, 100, String(ServoBack_Lock), 0xffff);
  lcdPrintText(125, 120, "       ", 0xffff);
  lcdPrintText(125, 120, String(ServoBack_Drop), 0xffff);
}

void STOP() {
  motorStop();
  while (!switchRead(A) && !switchRead(B)) {
    checkSerialMission();
    delay(5);
  }
}