void spinDegree(int relative_degree) {
  int min_speed = 28;                // Minimum motor speed (High torque quick cornering without stall)
  int max_speed = 100;               // Maximum motor speed
  float kp = 1.35;                   // KP (Agile cornering response)
  float kd = 0.16;                   // KD (Critically damped stopping)
  float small_angle_threshold = 22;  // Deceleration transition zone (deg)
  float stop_threshold = 2.2;        // Allowed angle tolerance
  float previous_error = 0;
  float filtered_derivative = 0;
  float target_degree = current_degree + relative_degree;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  unsigned long turn_timeout = millis();

  while (1) {
    if (millis() - turn_timeout > 2500) {
      motorStop();
      break;
    }
    float current_angle = angleRead(YAW);
    float error = target_degree - current_angle;
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;

    float derivative = error - previous_error;
    filtered_derivative = 0.70f * filtered_derivative + 0.30f * derivative;
    previous_error = error;

    int pd_value = (int)((error * kp) + (filtered_derivative * kd));
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;

    float abs_error = fabsf(error);

    if (abs_error <= stop_threshold) {
      // Snap-turn active counter-torque brake (15ms) to kill rotational inertia
      int brake_dir = (relative_degree >= 0) ? -1 : 1;
      motorWrite(brake_dir * 25, brake_dir * 25, -brake_dir * 25, -brake_dir * 25);
      delay(15);
      motorStop();
      break;
    } else if (abs_error < small_angle_threshold) {
      // Smooth continuous approach speed scaling without abrupt step-down
      float factor = abs_error / small_angle_threshold;
      int approach_speed = min_speed + (int)(factor * (max_speed * 0.45f - min_speed));
      if (error > 0) {
        motorWrite(approach_speed, approach_speed, -approach_speed, -approach_speed);
      } else {
        motorWrite(-approach_speed, -approach_speed, approach_speed, approach_speed);
      }
    } else {
      motorWrite(pd_value, pd_value, -pd_value, -pd_value);
    }
  }
}

void turnDegreeFront(int relative_degree) {
  int min_speed = 30;                // Minimum motor speed
  int max_speed = 100;               // Maximum motor speed
  float kp = 1.25;                   // KP
  float kd = 0.1;                    // KD
  float small_angle_threshold = 60;  // Robot drops to min speed when approaching target angle
  float stop_threshold = 7.75;       // Allowed angle tolerance
  unsigned long timer_turn = 0;
  float previous_error = 0;
  float target_degree = current_degree + relative_degree;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  while (1) {
    float current_angle = angleRead(YAW);
    float error = target_degree - current_angle;
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    if (error > stop_threshold && error < small_angle_threshold) {
      motorWrite(min_speed, min_speed, 0, 0);
      timer_turn = millis();
    } else if (error < -stop_threshold && error > -small_angle_threshold) {
      motorWrite(0, 0, min_speed, min_speed);
      timer_turn = millis();
    } else if (error >= -stop_threshold && error <= stop_threshold) {
      // motorStop();
      break;
    } else {
      if (error <= 0) motorWrite(20, 20, -pd_value, -pd_value);
      else if (error > 0) motorWrite(pd_value, pd_value, 20, 20);
      timer_turn = millis();
    }
    previous_error = error;
  }
}

void turnDegreeFront(int speedLeft, int speedRight) {
  int min_speed = 0;
  int max_speed = 0;
  if (speedLeft < speedRight) {
    min_speed = speedLeft;
    max_speed = speedRight;
  } else {
    min_speed = speedRight;
    max_speed = speedLeft;
  }
  float kp = 3.25;                   // KP
  float kd = 0.1;                    // KD
  float small_angle_threshold = 20;  // Robot drops to min speed when approaching target angle
  float stop_threshold = 7.75;       // Allowed angle tolerance
  unsigned long timer_turn = 0;
  float previous_error = 0;
  int relative_degree = 0;
  if (speedLeft < speedRight) relative_degree = -90;
  else relative_degree = 90;
  float target_degree = current_degree + relative_degree;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  while (1) {
    float current_angle = angleRead(YAW);
    float error = target_degree - current_angle;
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    if (error > stop_threshold && error < small_angle_threshold) {
      motorWrite(min_speed, min_speed, 0, 0);
      timer_turn = millis();
    } else if (error < -stop_threshold && error > -small_angle_threshold) {
      motorWrite(0, 0, min_speed, min_speed);
      timer_turn = millis();
    } else if (error >= -stop_threshold && error <= stop_threshold) {
      // motorStop();
      break;
    } else {
      if (error <= 0) motorWrite(min_speed, min_speed, -pd_value, -pd_value);
      else if (error > 0) motorWrite(pd_value, pd_value, min_speed, min_speed);
      timer_turn = millis();
    }
    previous_error = error;
  }
}

void turnDegreeBack(int relative_degree) {
  int min_speed = 30;                // Minimum motor speed
  int max_speed = 100;               // Maximum motor speed
  float kp = 1.25;                   // KP
  float kd = 0.1;                    // KD
  float small_angle_threshold = 60;  // Robot drops to min speed when approaching target angle
  float stop_threshold = 7.75;       // Allowed angle tolerance
  unsigned long timer_turn = 0;
  float previous_error = 0;
  float target_degree = current_degree + relative_degree;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  while (1) {
    float current_angle = angleRead(YAW);
    float error = target_degree - current_angle;
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    if (error > stop_threshold && error < small_angle_threshold) {
      motorWrite(0, 0, -min_speed, -min_speed);
      timer_turn = millis();
    } else if (error < -stop_threshold && error > -small_angle_threshold) {
      motorWrite(-min_speed, -min_speed, 0, 0);
      timer_turn = millis();
    } else if (error >= -stop_threshold && error <= stop_threshold) {
      motorStop();
      break;
    } else {
      if (error <= 0) motorWrite(pd_value, pd_value, -20, -20);
      else if (error > 0) motorWrite(-20, -20, -pd_value, -pd_value);
      timer_turn = millis();
    }
    previous_error = error;
  }
}

void turnDegreeBack(int speedRight, int speedLeft) {
  int min_speed = 0;
  int max_speed = 0;
  if (speedLeft < speedRight) {
    min_speed = speedLeft;
    max_speed = speedRight;
  } else {
    min_speed = speedRight;
    max_speed = speedLeft;
  }
  float kp = 3.25;                   // KP
  float kd = 0.1;                    // KD
  float small_angle_threshold = 20;  // Robot drops to min speed when approaching target angle
  float stop_threshold = 7.75;       // Allowed angle tolerance
  unsigned long timer_turn = 0;
  float previous_error = 0;
  int relative_degree = 0;
  if (speedLeft < speedRight) relative_degree = 90;
  else relative_degree = -90;
  float target_degree = current_degree + relative_degree;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  while (1) {
    float current_angle = angleRead(YAW);
    float error = target_degree - current_angle;
    if (error > 180) error -= 360;
    else if (error < -180) error += 360;
    float derivative = error - previous_error;
    int pd_value = (error * kp) + (derivative * kd);
    if (pd_value > max_speed) pd_value = max_speed;
    else if (pd_value < -max_speed) pd_value = -max_speed;
    if (error > stop_threshold && error < small_angle_threshold) {
      motorWrite(0, 0, -min_speed, -min_speed);
      timer_turn = millis();
    } else if (error < -stop_threshold && error > -small_angle_threshold) {
      motorWrite(-min_speed, -min_speed, 0, 0);
      timer_turn = millis();
    } else if (error >= -stop_threshold && error <= stop_threshold) {
      motorStop();
      break;
    } else {
      if (error <= 0) motorWrite(pd_value, pd_value, -min_speed, -min_speed);
      else if (error > 0) motorWrite(-min_speed, -min_speed, -pd_value, -pd_value);
      timer_turn = millis();
    }
    previous_error = error;
  }
}

void LL(float time) {
  float target_degree = current_degree - 90;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  motorWrite(-100, -100, 100, 100);
  delay(time * power_factor);
  motorStop();
  delay(50);
}

void RR(float time) {
  float target_degree = current_degree + 90;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  motorWrite(100, 100, -100, -100);
  delay(time * power_factor);
  motorStop();
  delay(50);
}

void TT(int speedTurnLeft, int speedTurnRight, float time) {
  float target_degree = 0;
  if (speedTurnLeft < speedTurnRight) target_degree = current_degree - 90;
  else target_degree = current_degree + 90;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  motorWrite(speedTurnLeft, speedTurnLeft, speedTurnRight, speedTurnRight);
  delay(time * power_factor);
  motorStop();
}

void TTB(int speedTurnRight, int speedTurnLeft, float time) {
  float target_degree = 0;
  if (speedTurnRight < speedTurnLeft) target_degree = current_degree - 90;
  else target_degree = current_degree + 90;
  if (target_degree > 180) target_degree -= 360;
  if (target_degree < -180) target_degree += 360;
  current_degree = target_degree;
  motorWrite(-speedTurnLeft, -speedTurnLeft, -speedTurnRight, -speedTurnRight);
  delay(time * power_factor);
  motorStop();
}
