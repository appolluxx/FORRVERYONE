import board
import utime

i2c = board.i2c
pca = board.pca
pca.freq(1000)
forward = 0
backward = 1
left = 0
right = 1
WD2 = 0
WD4 = 1
motor_move_status = False
motor_drive_mode = WD4
previous_error = 0
ramp_up = 0.1
ramp_down = 0.1

def clamp_speed(speed):
    return 100 if speed > 100 else -100 if speed < -100 else speed

def set_motor_drive(drive_mode):
    global motor_drive_mode
    motor_drive_mode = drive_mode

def drive_single(motor, speed, invert=False):
    global motor_move_status
    speed = clamp_speed(speed)
    pwm_speed = int((abs(speed) / 100) * 4095)
    if pwm_speed > 0:
        motor_move_status = True
    if motor == 1:
        if speed < 0:
            pca.duty(12, 4095, invert)
            pca.duty(13, pwm_speed, invert)
        elif speed > 0:
            pca.duty(12, 0, invert)
            pca.duty(13, pwm_speed, invert)
        else:
            pca.duty(12, 0, invert)
            pca.duty(13, 0, invert)
    elif motor == 2:
        if speed < 0:
            pca.duty(14, 4095, invert)
            pca.duty(15, pwm_speed, invert)
        elif speed > 0:
            pca.duty(14, 0, invert)
            pca.duty(15, pwm_speed, invert)
        else:
            pca.duty(14, 0, invert)
            pca.duty(15, 0, invert)
    elif motor == 3:
        if speed < 0:
            pca.duty(10, 4095, invert)
            pca.duty(11, pwm_speed, invert)
        elif speed > 0:
            pca.duty(10, 0, invert)
            pca.duty(11, pwm_speed, invert)
        else:
            pca.duty(10, 0, invert)
            pca.duty(11, 0, invert)
    elif motor == 4:
        if speed < 0:
            pca.duty(8, 4095, invert)
            pca.duty(9, pwm_speed, invert)
        elif speed > 0:
            pca.duty(8, 0, invert)
            pca.duty(9, pwm_speed, invert)
        else:
            pca.duty(8, 0, invert)
            pca.duty(9, 0, invert)
            
def drive_all(speed1, speed2, speed3, speed4):
    speed1 = clamp_speed(speed1)
    speed2 = clamp_speed(speed2)
    speed3 = clamp_speed(speed3)
    speed4 = clamp_speed(speed4)
    drive_single(1, speed1)
    drive_single(2, speed2)
    drive_single(3, speed3)
    drive_single(4, speed4)
    
def move(direction, speed):
    if direction == forward:
        if motor_drive_mode == WD2:
            drive_single(1, speed)
            drive_single(2, speed)
        else:  
            drive_all(speed, speed, speed, speed)
    elif direction == backward:
        if motor_drive_mode == WD2:
            drive_single(1, -speed)
            drive_single(2, -speed)
        else:  
            drive_all(-speed, -speed, -speed, -speed)
        
def spin(direction, speed):
    if direction == left:
        if motor_drive_mode == WD2:
            drive_single(1, -speed)
            drive_single(2, speed)
        else:
            drive_all(-speed, -speed, speed, speed)
    elif direction == right:
        if motor_drive_mode == WD2:
            drive_single(1, speed)
            drive_single(2, -speed)
        else:
            drive_all(speed, speed, -speed, -speed)
            
def turn_front(direction, speed):
    if direction == left:
        if motor_drive_mode == WD2:
            drive_single(1, 0)
            drive_single(2, speed)
        else:
            drive_all(0, 0, speed, speed)
    elif direction == right:
        if motor_drive_mode == WD2:
            drive_single(1, speed)
            drive_single(2, 0)
        else:
            drive_all(speed, speed, 0, 0)
            
def turn_back(direction, speed):
    if direction == left:
        if motor_drive_mode == WD2:
            drive_single(1, -speed)
            drive_single(2, 0)
        else:
            drive_all(-speed, -speed, 0, 0)
    elif direction == right:
        if motor_drive_mode == WD2:
            drive_single(1, 0)
            drive_single(2, -speed)
        else:
            drive_all(0, 0, -speed, -speed)
            
def mecanum_move(vx, vy, r):
  lf = (vx + vy) + r
  lb = (vx - vy) - r
  rf = (vx - vy) + r
  rb = (vx + vy) - r
  lb = -lb
  rf = -rf
  drive_all(lf, lb, rf, rb)
            
def stop():
    global motor_move_status
    if motor_drive_mode == WD2:
        drive_single(1, 0)
        drive_single(2, 0)
    else:
        drive_all(0, 0, 0, 0)
    motor_move_status = False
        
def set_ramp_move_imu(set_ramp_up, set_ramp_down):
    global ramp_up, ramp_down
    ramp_up = set_ramp_up
    ramp_down = set_ramp_down
        
def forward_degree(degree, base_speed, max_speed, kp, kd):
    global previous_error
    error = degree - board.angle_read(board.yaw)
    if error > 180:
        error -= 360
    elif error < -180:
        error += 360
    derivative = error - previous_error
    pd_value = (error * kp) + (derivative * kd)
    if pd_value > max_speed:
        pd_value = max_speed
    elif pd_value < -max_speed:
        pd_value = -max_speed
    speed_left = base_speed + pd_value
    speed_right = base_speed - pd_value
    if motor_drive_mode == WD2:
        drive_single(1, speed_left)
        drive_single(2, speed_right)
    else:
        drive_all(speed_left, speed_left, speed_right, speed_right)
    previous_error = error
    utime.sleep_ms(10)
    
def backward_degree(degree, base_speed, max_speed, kp, kd):
    global previous_error
    error = degree - board.angle_read(board.yaw)
    if error > 180:
        error -= 360
    elif error < -180:
        error += 360
    derivative = error - previous_error
    pd_value = (error * kp) + (derivative * kd)
    if pd_value > max_speed:
        pd_value = max_speed
    elif pd_value < -max_speed:
        pd_value = -max_speed
    speed_left = base_speed - pd_value
    speed_right = base_speed + pd_value
    if motor_drive_mode == WD2:
        drive_single(1, -speed_left)
        drive_single(2, -speed_right)
    else:
        drive_all(-speed_left, -speed_left, -speed_right, -speed_right)
    previous_error = error
    utime.sleep_ms(10)

def forward_degree_time(degree, start_speed, max_speed, kp, kd, duration_s):
    global previous_error, ramp_up, ramp_down
    previous_error = 0
    start_time = utime.ticks_ms()
    current_speed = start_speed
    while True:
        elapsed_time = utime.ticks_diff(utime.ticks_ms(), start_time) / 1000
        remaining_time = duration_s - elapsed_time
        if elapsed_time <= ramp_up:
            current_speed = start_speed + (elapsed_time / ramp_up) * (max_speed - start_speed)
        elif remaining_time <= ramp_down:
            current_speed = start_speed + (remaining_time / ramp_down) * (max_speed - start_speed)
            if current_speed < start_speed:
                current_speed = start_speed
        else:
            current_speed = max_speed
        current_angle = board.angle_read(board.yaw)
        error = degree - current_angle
        if error > 180:
            error -= 360
        elif error < -180:
            error += 360
        derivative = error - previous_error
        pd_value = (error * kp) + (derivative * kd)
        pd_value = max(-max_speed, min(max_speed, pd_value))
        speed_left = current_speed + pd_value
        speed_right = current_speed - pd_value
        if motor_drive_mode == WD2:
            drive_single(1, speed_left)
            drive_single(2, speed_right)
        else:
            drive_all(speed_left, speed_left, speed_right, speed_right)
        previous_error = error
        if elapsed_time >= duration_s:
            stop()
            break
    
def backward_degree_time(degree, start_speed, max_speed, kp, kd, duration_s):
    global previous_error, ramp_up, ramp_down
    previous_error = 0
    start_time = utime.ticks_ms()
    current_speed = start_speed
    while True:
        elapsed_time = utime.ticks_diff(utime.ticks_ms(), start_time) / 1000
        remaining_time = duration_s - elapsed_time
        if elapsed_time <= ramp_up:
            current_speed = start_speed + (elapsed_time / ramp_up) * (max_speed - start_speed)
        elif remaining_time <= ramp_down:
            current_speed = start_speed + (remaining_time / ramp_down) * (max_speed - start_speed)
            if current_speed < start_speed:
                current_speed = start_speed
        else:
            current_speed = max_speed
        current_angle = board.angle_read(board.yaw)
        error = degree - current_angle
        if error > 180:
            error -= 360
        elif error < -180:
            error += 360
        derivative = error - previous_error
        pd_value = (error * kp) + (derivative * kd)
        pd_value = max(-max_speed, min(max_speed, pd_value))
        speed_left = current_speed - pd_value
        speed_right = current_speed + pd_value
        if motor_drive_mode == WD2:
            drive_single(1, -speed_left)
            drive_single(2, -speed_right)
        else:
            drive_all(-speed_left, -speed_left, -speed_right, -speed_right)
        previous_error = error
        if elapsed_time >= duration_s:
            stop()
            break
    
def spin_degree(target_degree, small_angle_threshold, stop_threshold, min_speed, max_speed, kp, kd, stable_time=20):
    global previous_error
    previous_error = 0
    stable_start_time = None
    while True:
        current_angle = board.angle_read(board.yaw)
        error = target_degree - current_angle
        if error > 180:
            error -= 360
        elif error < -180:
            error += 360
        derivative = error - previous_error
        pd_value = (error * kp) + (derivative * kd)
        if pd_value > max_speed:
            pd_value = max_speed
        elif pd_value < -max_speed:
            pd_value = -max_speed
        if -stop_threshold <= error <= stop_threshold:
            if stable_start_time is None:
                stable_start_time = utime.ticks_ms()
            elif utime.ticks_diff(utime.ticks_ms(), stable_start_time) >= stable_time:
                stop()
                break
        else:
            stable_start_time = None
        if stop_threshold < error < small_angle_threshold:
            spin(right, min_speed)
        elif -small_angle_threshold < error < -stop_threshold:
            spin(left, min_speed)
        else:
            if motor_drive_mode == WD2:
                drive_single(1, pd_value)
                drive_single(2, -pd_value)
            else:
                drive_all(pd_value, pd_value, -pd_value, -pd_value)
        previous_error = error
        utime.sleep_ms(10)

def turn_degree_front(target_degree, small_angle_threshold, stop_threshold, min_speed, max_speed, kp, kd, stable_time=20):
    global previous_error
    previous_error = 0
    stable_start_time = None
    while True:
        current_angle = board.angle_read(board.yaw)
        error = target_degree - current_angle
        if error > 180:
            error -= 360
        elif error < -180:
            error += 360
        derivative = error - previous_error
        pd_value = (error * kp) + (derivative * kd)
        pd_value = max(-max_speed, min(max_speed, pd_value))
        if stop_threshold < error < small_angle_threshold:
            drive_all(min_speed, min_speed, 0, 0)
        elif -small_angle_threshold < error < -stop_threshold:
            drive_all(0, 0, min_speed, min_speed)
        elif -stop_threshold <= error <= stop_threshold:
            if stable_start_time is None:
                stable_start_time = utime.ticks_ms()
            elif utime.ticks_diff(utime.ticks_ms(), stable_start_time) >= stable_time:
                stop()
                break
        else:
            if error <= 0:
                if motor_drive_mode == WD2:
                    drive_single(1, 20)
                    drive_single(2, -pd_value)
                else:
                    drive_all(20, 20, -pd_value, -pd_value)
            else:
                if motor_drive_mode == WD2:
                    drive_single(1, pd_value)
                    drive_single(2, 20)
                else:
                    drive_all(pd_value, pd_value, 20, 20)
        previous_error = error
        utime.sleep_ms(10)
        
def turn_degree_back(target_degree, small_angle_threshold, stop_threshold, min_speed, max_speed, kp, kd, stable_time=20):
    global previous_error
    previous_error = 0
    stable_start_time = None
    while True:
        current_angle = board.angle_read(board.yaw)
        error = target_degree - current_angle
        if error > 180:
            error -= 360
        elif error < -180:
            error += 360
        derivative = error - previous_error
        pd_value = (error * kp) + (derivative * kd)
        pd_value = max(-max_speed, min(max_speed, pd_value))
        if stop_threshold < error < small_angle_threshold:
            drive_all(0, 0, -min_speed, -min_speed)
        elif -small_angle_threshold < error < -stop_threshold:
            drive_all(-min_speed, -min_speed, 0, 0)
        elif -stop_threshold <= error <= stop_threshold:
            if stable_start_time is None:
                stable_start_time = utime.ticks_ms()
            elif utime.ticks_diff(utime.ticks_ms(), stable_start_time) >= stable_time:
                stop()
                break
        else:
            if error <= 0:
                if motor_drive_mode == WD2:
                    drive_single(1, pd_value)
                    drive_single(2, -20)
                else:
                    drive_all(pd_value, pd_value, -20, -20)
            else:
                if motor_drive_mode == WD2:
                    drive_single(1, -20)
                    drive_single(2, -pd_value)
                else:
                    drive_all(-20, -20, -pd_value, -pd_value)
        previous_error = error
