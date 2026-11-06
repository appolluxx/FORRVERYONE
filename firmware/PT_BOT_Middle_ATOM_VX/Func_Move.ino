// =============================================================================
// SMOOTH MOTION KINEMATICS HELPERS (COSINE S-CURVE & FILTERED HEADING LOCK)
// =============================================================================
// =============================================================================
// ADAPTIVE S-CURVE JERK-FREE PROFILER (Starts at ~50% max speed, accelerates to max, decelerates to 50%)
// Prevents pitching/tipping front & rear upon sudden high torque start/stop.
// =============================================================================
inline int calculate_scurve_speed(unsigned long elapsed, unsigned long remaining, int min_spd, int max_spd, int ramp_u, int ramp_d) {
  // Ensure start speed is comfortably smooth (~50% of target speed, clamped within [25, 60])
  int smooth_base = (int)(max_spd * 0.50f);
  if (smooth_base < 25) smooth_base = 25;
  if (smooth_base > 60) smooth_base = 60;
  if (min_spd < smooth_base) min_spd = smooth_base;
  if (min_spd >= max_spd) return max_spd;

  if (ramp_u > 0 && elapsed < (unsigned long)ramp_u) {
    float progress = (float)elapsed / (float)ramp_u;
    // Cosine ease-in factor: 0.0 -> 1.0 (Zero Jerk Derivative)
    float s_factor = 0.5f * (1.0f - cosf(progress * 3.1415926535f));
    return min_spd + (int)(s_factor * (max_spd - min_spd));
  } else if (ramp_d > 0 && remaining < (unsigned long)ramp_d) {
    float progress = (float)remaining / (float)ramp_d;
    if (progress < 0.0f) progress = 0.0f;
    // Cosine ease-out factor: 1.0 -> 0.0 (Zero Jerk Derivative)
    float s_factor = 0.5f * (1.0f - cosf(progress * 3.1415926535f));
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

// =============================================================================
// GRID-BASED DISTANCE CALIBRATION (1 tile = 300mm standard rescue arena grid)
// Overloads: FF(tiles, speed) and BB(tiles, speed)
// =============================================================================
#ifndef T_FLAT_BASE
  #define T_FLAT_BASE 420
#endif
#ifndef T_FLAT_CRUISE
  #define T_FLAT_CRUISE 240
#endif

// Calculate duration in ms for n grid tiles with non-linear acceleration compensation
inline float calculate_tile_timer(int tiles, int speed) {
  if (tiles <= 0) tiles = 1;
  // Base duration for 1st tile (includes ramp up/down) + Cruise duration for successive tiles
  float base_ms = (float)T_FLAT_BASE;
  float cruise_ms = (float)T_FLAT_CRUISE;
  // Scale with motor speed relative to normal nominal 78% PWM
  float speed_scale = (speed > 0) ? (78.0f / (float)speed) : 1.0f;
  float total_timer = (tiles == 1 ? base_ms : (base_ms + (tiles - 1) * cruise_ms)) * speed_scale;
  return total_timer;
}

// Drive forward by discrete grid tiles: FF(tiles, speed) -> e.g. FF(1, 100) or FF(2, 78)
void FF_tiles(int tiles, int speed) {
  float timer = calculate_tile_timer(tiles, speed);
  FF(speed, timer);
}

// Reverse by discrete grid tiles: BB(tiles, speed) -> e.g. BB(1, 78)
void BB_tiles(int tiles, int speed) {
  float timer = calculate_tile_timer(tiles, speed);
  BB(speed, timer);
}
