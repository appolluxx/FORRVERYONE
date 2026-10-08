// =============================================================================
// SMOOTH MOTION KINEMATICS HELPERS (COSINE S-CURVE & FILTERED HEADING LOCK)
// =============================================================================
inline int calculate_scurve_speed(unsigned long elapsed, unsigned long remaining, int min_spd, int max_spd, int ramp_u, int ramp_d) {
  if (ramp_u > 0 && elapsed < (unsigned long)ramp_u) {
    float progress = (float)elapsed / (float)ramp_u;
    float s_factor = 0.5f * (1.0f - cosf(progress * 3.14159265f));
    return min_spd + (int)(s_factor * (max_spd - min_spd));
  } else if (ramp_d > 0 && remaining < (unsigned long)ramp_d) {
    float progress = (float)remaining / (float)ramp_d;
    if (progress < 0.0f) progress = 0.0f;
    float s_factor = 0.5f * (1.0f - cosf(progress * 3.14159265f));
    int spd = min_spd + (int)(s_factor * (max_spd - min_spd));
    return (spd < min_spd) ? min_spd : spd;
  }
  return max_spd;
}

inline int calculate_heading_pd(float target_deg, float &prev_err, float &filt_deriv, float kp, float kd, int max_limit) {
  float error = target_deg - angleRead(YAW);
  if (error > 180.0f) error -= 360.0f;
  else if (error < -180.0f) error += 360.0f;
  float deriv = error - prev_err;
  filt_deriv = 0.70f * filt_deriv + 0.30f * deriv; // Low-pass filter (cuts high-frequency IMU noise)
  prev_err = error;
  int pd = (int)((error * kp) + (filt_deriv * kd));
  if (pd > max_limit) pd = max_limit;
  else if (pd < -max_limit) pd = -max_limit;
  return pd;
}

void FF(int speed) {
  int base_speed = speed;  // Initial start speed and pre-stop speed
  int max_speed = 80;      // Maximum motor speed
  float kp = 3.5;          // KP
  float kd = 17.0;         // KD
  static float filtered_deriv_fwd = 0;
  int pd_value = calculate_heading_pd(current_degree, previous_error_forward, filtered_deriv_fwd, kp, kd, max_speed);
  int speed_left = base_speed + pd_value;
  int speed_right = base_speed - pd_value;
  motorWrite(speed_left, speed_left, speed_right, speed_right);
}

void FF(int speed, float timer) {
  int min_speed = 22;     // Initial start speed (Fast launch without latency)
  int max_speed = speed;  // Maximum motor speed
  float kp = 3.8;         // KP (Straight line stability lock)
  float kd = 18.5;        // KD (Dampening jerk/shake)
  int ramp_up = 120;      // Cosine S-Curve ramp-up (120ms zero-jerk)
  int ramp_down = 120;    // Cosine S-Curve ramp-down (120ms zero-jerk)
  unsigned long timer_forward = millis();
  float previous_error = 0;
  float filtered_derivative = 0;

  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = (timer > elapsed_time) ? (timer - elapsed_time) : 0;

    int current_speed = calculate_scurve_speed(elapsed_time, remaining_time, min_speed, max_speed, ramp_up, ramp_down);
    int pd_value = calculate_heading_pd(current_degree, previous_error, filtered_derivative, kp, kd, max_speed);

    int speed_left = constrain(current_speed + pd_value, -100, 100);
    int speed_right = constrain(current_speed - pd_value, -100, 100);
    motorWrite(speed_left, speed_left, speed_right, speed_right);

    if (elapsed_time >= timer * power_factor) {
      // Active dynamic brake counter-pulse (15ms) to kill forward momentum
      int brake_spd = (current_speed > 35) ? 18 : 10;
      motorWrite(-brake_spd, -brake_spd, -brake_spd, -brake_spd);
      delay(15);
      motorStop();
      break;
    }
  }
}

void FF(int speed, float timer, char select) {
  int min_speed = 22;     // Initial start speed (Fast launch without latency)
  int max_speed = speed;  // Maximum motor speed
  float kp = 3.8;         // KP (Straight line stability lock)
  float kd = 18.5;        // KD (Dampening jerk/shake)
  int ramp_up = 120;      // Cosine S-Curve ramp-up (120ms zero-jerk)
  int ramp_down = 120;    // Cosine S-Curve ramp-down (120ms zero-jerk)
  unsigned long timer_forward = millis();
  float previous_error = 0;
  float filtered_derivative = 0;

  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = (timer > elapsed_time) ? (timer - elapsed_time) : 0;

    int current_speed = calculate_scurve_speed(elapsed_time, remaining_time, min_speed, max_speed, ramp_up, ramp_down);
    int pd_value = calculate_heading_pd(current_degree, previous_error, filtered_derivative, kp, kd, max_speed);

    int speed_left = constrain(current_speed + pd_value, -100, 100);
    int speed_right = constrain(current_speed - pd_value, -100, 100);
    motorWrite(speed_left, speed_left, speed_right, speed_right);

    if (elapsed_time >= timer * power_factor) {
      // Active dynamic brake counter-pulse (15ms) to kill forward momentum
      int brake_spd = (current_speed > 35) ? 18 : 10;
      motorWrite(-brake_spd, -brake_spd, -brake_spd, -brake_spd);
      delay(15);
      motorStop();
      break;
    }
  }
  delay(delayALL);

  if (select == 'L') {
    spinDegree(-90);
  } else if (select == 'R') {
    spinDegree(90);
  } else if (select == 'l') {
    turnDegreeFront(-90);
  } else if (select == 'r') {
    turnDegreeFront(90);
  }
  motorStop();
  delay(delayALL);
}

void FF(int speed, float timer, char select, float turnTimer) {
  int min_speed = 15;     // Initial start speed and pre-stop speed
  int max_speed = speed;  // Maximum motor speed
  float kp = 3.5;         // KP
  float kd = 17.0;        // KD
  int ramp_up = 200;       // Robot ramps up from min to max speed within ramp_up duration
  int ramp_down = 200;      // Robot ramps down from max to min speed within ramp_down duration before stopping
  int current_speed = min_speed;
  unsigned long timer_forward = millis();
  float previous_error = 0;
  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = timer - elapsed_time;
    if (elapsed_time <= ramp_up) {
      current_speed = min_speed + (float)elapsed_time / ramp_up * (max_speed - min_speed);
    } else if (remaining_time <= ramp_down) {
      current_speed = min_speed + (float)remaining_time / ramp_down * (max_speed - min_speed);
      if (current_speed < min_speed) current_speed = min_speed;
    } else current_speed = max_speed;
    float error = current_degree - angleRead(YAW);
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    int speed_left = current_speed + pd_value;
    int speed_right = current_speed - pd_value;
    motorWrite(speed_left, speed_left, speed_right, speed_right);
    if (elapsed_time >= timer * power_factor) {
      motorStop();
      break;
    }
    previous_error = error;
  }
  if (select == 'L') {
    LL(turnTimer);
  } else if (select == 'R') {
    RR(turnTimer);
  }
  delay(delayALL);
}

void FF_turn(int speed, float timer) {
  int min_speed = speed;  // Initial start speed and pre-stop speed
  int max_speed = speed;  // Maximum motor speed
  float kp = 3.5;         // KP
  float kd = 17.0;        // KD
  int ramp_up = 0;       // Robot ramps up from min to max speed within ramp_up duration
  int ramp_down = 0;      // Robot ramps down from max to min speed within ramp_down duration before stopping
  int current_speed = min_speed;
  unsigned long timer_forward = millis();
  float previous_error = 0;
  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = timer - elapsed_time;
    if (elapsed_time <= ramp_up) {
      current_speed = min_speed + (float)elapsed_time / ramp_up * (max_speed - min_speed);
    } else if (remaining_time <= ramp_down) {
      current_speed = min_speed + (float)remaining_time / ramp_down * (max_speed - min_speed);
      if (current_speed < min_speed) current_speed = min_speed;
    } else current_speed = max_speed;
    float error = current_degree - angleRead(YAW);
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    int speed_left = current_speed + pd_value;
    int speed_right = current_speed - pd_value;
    motorWrite(speed_left, speed_left, speed_right, speed_right);
    if (elapsed_time >= timer * power_factor) {
      // motorStop();
      break;
    }
    previous_error = error;
  }
}

void BB(int speed) {
  int base_speed = speed;  // Initial start speed and pre-stop speed
  int max_speed = 80;      // Maximum motor speed
  float kp = 3.5;          // KP
  float kd = 17.0;         // KD
  static float filtered_deriv_rev = 0;
  int pd_value = calculate_heading_pd(current_degree, previous_error_forward, filtered_deriv_rev, kp, kd, max_speed);
  int speed_left = base_speed - pd_value;
  int speed_right = base_speed + pd_value;
  motorWrite(-speed_left, -speed_left, -speed_right, -speed_right);
}

void BB(int speed, float timer) {
  int min_speed = 22;     // Initial start speed (Fast reverse launch)
  int max_speed = speed;  // Maximum motor speed
  float kp = 3.8;         // KP
  float kd = 18.5;        // KD
  int ramp_up = 120;      // Cosine S-Curve ramp-up
  int ramp_down = 120;    // Cosine S-Curve ramp-down
  unsigned long timer_forward = millis();
  float previous_error = 0;
  float filtered_derivative = 0;

  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = (timer > elapsed_time) ? (timer - elapsed_time) : 0;

    int current_speed = calculate_scurve_speed(elapsed_time, remaining_time, min_speed, max_speed, ramp_up, ramp_down);
    int pd_value = calculate_heading_pd(current_degree, previous_error, filtered_derivative, kp, kd, max_speed);

    int speed_left = constrain(current_speed - pd_value, -100, 100);
    int speed_right = constrain(current_speed + pd_value, -100, 100);
    motorWrite(-speed_left, -speed_left, -speed_right, -speed_right);

    if (elapsed_time >= timer * power_factor) {
      // Active dynamic brake counter-pulse (15ms) to kill reverse momentum
      int brake_spd = (current_speed > 35) ? 18 : 10;
      motorWrite(brake_spd, brake_spd, brake_spd, brake_spd);
      delay(15);
      motorStop();
      break;
    }
  }
}

void BB(int speed, float timer, char select) {
  int min_speed = 22;     // Initial start speed (Fast reverse launch)
  int max_speed = speed;  // Maximum motor speed
  float kp = 3.8;         // KP
  float kd = 18.5;        // KD
  int ramp_up = 120;      // Cosine S-Curve ramp-up
  int ramp_down = 120;    // Cosine S-Curve ramp-down
  unsigned long timer_forward = millis();
  float previous_error = 0;
  float filtered_derivative = 0;

  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = (timer > elapsed_time) ? (timer - elapsed_time) : 0;

    int current_speed = calculate_scurve_speed(elapsed_time, remaining_time, min_speed, max_speed, ramp_up, ramp_down);
    int pd_value = calculate_heading_pd(current_degree, previous_error, filtered_derivative, kp, kd, max_speed);

    int speed_left = constrain(current_speed - pd_value, -100, 100);
    int speed_right = constrain(current_speed + pd_value, -100, 100);
    motorWrite(-speed_left, -speed_left, -speed_right, -speed_right);

    if (elapsed_time >= timer * power_factor) {
      // Active dynamic brake counter-pulse (15ms) to kill reverse momentum
      int brake_spd = (current_speed > 35) ? 18 : 10;
      motorWrite(brake_spd, brake_spd, brake_spd, brake_spd);
      delay(15);
      motorStop();
      break;
    }
  }
  delay(delayALL);

  if (select == 'L') {
    spinDegree(-90);
  } else if (select == 'R') {
    spinDegree(90);
  } else if (select == 'l') {
    turnDegreeBack(-90);
  } else if (select == 'r') {
    turnDegreeBack(90);
  }
  motorStop();
  delay(delayALL);
}

void BB(int speed, float timer, char select, float turnTimer) {
  int min_speed = 15;     // Initial start speed and pre-stop speed
  int max_speed = speed;  // Maximum motor speed
  float kp = 3.5;         // KP
  float kd = 17.0;        // KD
  int ramp_up = 200;       // Robot ramps up from min to max speed within ramp_up duration
  int ramp_down = 200;      // Robot ramps down from max to min speed within ramp_down duration before stopping
  int current_speed = min_speed;
  unsigned long timer_forward = millis();
  float previous_error = 0;
  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = timer - elapsed_time;
    if (elapsed_time <= ramp_up) {
      current_speed = min_speed + (float)elapsed_time / ramp_up * (max_speed - min_speed);
    } else if (remaining_time <= ramp_down) {
      current_speed = min_speed + (float)remaining_time / ramp_down * (max_speed - min_speed);
      if (current_speed < min_speed) current_speed = min_speed;
    } else current_speed = max_speed;
    float error = current_degree - angleRead(YAW);
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    int speed_left = current_speed - pd_value;
    int speed_right = current_speed + pd_value;
    motorWrite(-speed_left, -speed_left, -speed_right, -speed_right);
    if (elapsed_time >= timer * power_factor) {
      motorStop();
      break;
    }
    previous_error = error;
  }

  if (select == 'L') {
    LL(turnTimer);
  }
  if (select == 'R') {
    RR(turnTimer);
  }
  delay(delayALL);
}

void BB_turn(int speed, float timer) {
  int min_speed = speed;  // Initial start speed and pre-stop speed
  int max_speed = speed;  // Maximum motor speed
  float kp = 2.8;         // KP
  float kd = 17.0;        // KD
  int ramp_up = 0;        // Robot ramps up from min to max speed within ramp_up duration
  int ramp_down = 0;      // Robot ramps down from max to min speed within ramp_down duration before stopping
  int current_speed = min_speed;
  unsigned long timer_forward = millis();
  float previous_error = 0;
  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = timer - elapsed_time;
    if (elapsed_time <= ramp_up) {
      current_speed = min_speed + (float)elapsed_time / ramp_up * (max_speed - min_speed);
    } else if (remaining_time <= ramp_down) {
      current_speed = min_speed + (float)remaining_time / ramp_down * (max_speed - min_speed);
      if (current_speed < min_speed) current_speed = min_speed;
    } else current_speed = max_speed;
    float error = current_degree - angleRead(YAW);
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    int speed_left = current_speed - pd_value;
    int speed_right = current_speed + pd_value;
    motorWrite(-speed_left, -speed_left, -speed_right, -speed_right);
    if (elapsed_time >= timer * power_factor) {
      break;
    }
    previous_error = error;
  }
}

void SetFront_Drop(int speed) {
  previous_error_forward = 0;
  while (1) {
    readLine();
    if (line_value[1] <= 10 && line_value[2] <= 10) {
      motorStop();
      break;
    } else FF(speed);
  }
}

void SetFront(int speed) {
  previous_error_forward = 0;
  while (1) {
    readLine();
    if (line_value[0] <= 10 && line_value[3] <= 10) {
      motorStop();
      break;
    } else {
      if (line_value[0] <= 10) {
        motorWrite(1, -15);
        motorWrite(2, -15);
      } else {
        motorWrite(1, speed);
        motorWrite(2, speed);
      }
      if (line_value[3] <= 10) {
        motorWrite(3, -15);
        motorWrite(4, -15);
      } else {
        motorWrite(3, speed);
        motorWrite(4, speed);
      }
    }
  }
  setAngleOffset();
  current_degree = 0;
}

void SetFront(int speed, float timer) {
  SetFront(speed);
  delay(10);
  motorTimeDegree(-speed, timer);
  delay(delayALL);
}

void SetFront(int speed, float timer, char select) {
  SetFront(speed, timer);
  if (select == 'L') {
    spinDegree(-90);
  }
  if (select == 'R') {
    spinDegree(90);
  }
  delay(delayALL);
}

void SetFront(int speed, float timer, char select, float turnTimer) {
  SetFront(speed, timer);
  if (select == 'L') {
    LL(turnTimer);
  }
  if (select == 'R') {
    RR(turnTimer);
  }
  delay(delayALL);
}

void SetBack_Drop(int speed) {
  previous_error_forward = 0;
  while (1) {
    readLine();
    if (line_value[6] <= 10 && line_value[5] <= 10) {
      motorStop();
      break;
    } else BB(speed);
  }
}

void SetBack(int speed) {
  previous_error_forward = 0;
  while (1) {
    readLine();
    if (line_value[7] <= 10 && line_value[4] <= 10) {
      motorStop();
      break;
    } else {
      if (line_value[4] <= 10) {
        motorWrite(3, 15);
        motorWrite(4, 15);
      } else {
        motorWrite(3, -speed);
        motorWrite(4, -speed);
      }
      if (line_value[7] <= 10) {
        motorWrite(1, 15);
        motorWrite(2, 15);
      } else {
        motorWrite(1, -speed);
        motorWrite(2, -speed);
      }
    }
  }
  setAngleOffset();
  current_degree = 0;
}

void SetBack(int speed, float timer) {
  SetBack(speed);
  delay(10);
  motorTimeDegree(speed, timer);
  delay(delayALL);
}

void SetBack(int speed, float timer, char select) {
  SetBack(speed, timer);
  if (select == 'L') {
    spinDegree(-90);
  }
  if (select == 'R') {
    spinDegree(90);
  }
  delay(delayALL);
}

void SetBack(int speed, float timer, char select, float turnTimer) {
  SetBack(speed, timer);
  if (select == 'L') {
    LL(turnTimer);
  }
  if (select == 'R') {
    RR(turnTimer);
  }
  delay(delayALL);
}

void motorTimeDegree(int speed, float timer) {
  int base_speed = speed;  // Initial start speed and pre-stop speed
  int max_speed = 80;      // Maximum motor speed
  float kp = 3.5;          // KP
  float kd = 0.1;          // KD
  unsigned long timer_forward = millis();
  float previous_error = 0;
  while (1) {
    unsigned long elapsed_time = millis() - timer_forward;
    unsigned long remaining_time = timer - elapsed_time;
    float error = current_degree - angleRead(YAW);
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error_forward;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    int speed_left = base_speed + pd_value;
    int speed_right = base_speed - pd_value;
    motorWrite(speed_left, speed_left, speed_right, speed_right);
    previous_error_forward = error;
    if (elapsed_time >= timer * power_factor) {
      motorStop();
      break;
    }
  }
}