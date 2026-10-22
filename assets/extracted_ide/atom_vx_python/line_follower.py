import esp32
import board
import motor
import utime

left = 0
center = 1
right = 2
line_left = 0
line_center = 1
line_right = 2
sensor_front = 0
sensor_center = 1
sensor_left_pin = []
sensor_center_pin = []
sensor_right_pin = []
sensor_left_line_cal = []
sensor_left_floor_cal = []
sensor_center_line_cal = []
sensor_center_floor_cal = []
sensor_right_line_cal = []
sensor_right_floor_cal = []
switch_min_max = False
last_position = 0
previous_error = 0
ramp_up = 0.1
ramp_down = 0.1

nvs = esp32.NVS("storage")

def map_value(x, in_min, in_max, out_min, out_max):
    return (x - in_min) * (out_max - out_min) // (in_max - in_min) + out_min

def load_calibration():
    global sensor_left_line_cal, sensor_left_floor_cal
    global sensor_center_line_cal, sensor_center_floor_cal
    global sensor_right_line_cal, sensor_right_floor_cal
    sensor_left_line_cal = []
    sensor_left_floor_cal = []
    sensor_center_line_cal = []
    sensor_center_floor_cal = []
    sensor_right_line_cal = []
    sensor_right_floor_cal = []
    for key, prefix in zip(["left", "center", "right"], ["llc", "clc", "rlc"]):
        for i in range(len(sensor_left_pin if key == "left" else sensor_center_pin if key == "center" else sensor_right_pin)):
            try:
                value = nvs.get_i32(f"{prefix}{i}")
            except OSError:
                value = 4095
            if key == "left":
                sensor_left_line_cal.append(value)
            elif key == "center":
                sensor_center_line_cal.append(value)
            else:
                sensor_right_line_cal.append(value)
    for key, prefix in zip(["left", "center", "right"], ["lfc", "cfc", "rfc"]):
        for i in range(len(sensor_left_pin if key == "left" else sensor_center_pin if key == "center" else sensor_right_pin)):
            try:
                value = nvs.get_i32(f"{prefix}{i}")
            except OSError:
                value = 0
            if key == "left":
                sensor_left_floor_cal.append(value)
            elif key == "center":
                sensor_center_floor_cal.append(value)
            else:
                sensor_right_floor_cal.append(value)

def set_sensor(sensor_left, sensor_center, sensor_right):
    global sensor_left_pin, sensor_center_pin, sensor_right_pin
    sensor_left_pin = sensor_left
    sensor_center_pin = sensor_center
    sensor_right_pin = sensor_right
    load_calibration()
    
def calibrate():
    global sensor_left_line_cal, sensor_left_floor_cal
    global sensor_center_line_cal, sensor_center_floor_cal
    global sensor_right_line_cal, sensor_right_floor_cal
    board.beep(0.05)
    utime.sleep(1)
    sensor_min = {
        "left": [4095] * len(sensor_left_pin),
        "center": [4095] * len(sensor_center_pin),
        "right": [4095] * len(sensor_right_pin),
    }
    sensor_max = {
        "left": [0] * len(sensor_left_pin),
        "center": [0] * len(sensor_center_pin),
        "right": [0] * len(sensor_right_pin),
    }
    board.read_adc(0)
    timer_read_sensor = utime.ticks_ms()
    while utime.ticks_diff(utime.ticks_ms(), timer_read_sensor) < 5000:
        for key, sensor_list in zip(["left", "center", "right"], [sensor_left_pin, sensor_center_pin, sensor_right_pin]):
            for i, pin in enumerate(sensor_list):
                sensor_value = board.mcu_io_read_adc(pin) if pin < 100 else board.read_adc(pin - 100)
                if sensor_value < sensor_min[key][i]:
                    sensor_min[key][i] = sensor_value
                elif sensor_value > sensor_max[key][i]:
                    sensor_max[key][i] = sensor_value
        utime.sleep_ms(1)
    sensor_left_line_cal = sensor_min["left"]
    sensor_left_floor_cal = sensor_max["left"]
    sensor_center_line_cal = sensor_min["center"]
    sensor_center_floor_cal = sensor_max["center"]
    sensor_right_line_cal = sensor_min["right"]
    sensor_right_floor_cal = sensor_max["right"]
    
    for key, prefix in zip(["left", "center", "right"], ["llc", "clc", "rlc"]):
        for i, value in enumerate(sensor_min[key]):
            nvs.set_i32(f"{prefix}{i}", value)
    for key, prefix in zip(["left", "center", "right"], ["lfc", "cfc", "rfc"]):
        for i, value in enumerate(sensor_max[key]):
            nvs.set_i32(f"{prefix}{i}", value)
    nvs.commit()
    board.beep(0.05)
    
def switch_min_to_max():
    global switch_min_max
    switch_min_max = True
    
def read_sensor(position, channel):
    global sensor_left_pin, sensor_center_pin, sensor_right_pin
    if position == left:
        if sensor_left_pin[channel] < 100:
            return board.mcu_io_read_adc(sensor_left_pin[channel])
        else:
            return board.read_adc(sensor_left_pin[channel] - 100)
    elif position == center:
        if sensor_center_pin[channel] < 100:
            return board.mcu_io_read_adc(sensor_center_pin[channel])
        else:
            return board.read_adc(sensor_center_pin[channel] - 100)
    elif position == right:
        if sensor_right_pin[channel] < 100:
            return board.mcu_io_read_adc(sensor_right_pin[channel])
        else:
            return board.read_adc(sensor_right_pin[channel] - 100)

def read_calibrated_sensor(position, channel):
    global sensor_left_pin, sensor_center_pin, sensor_right_pin
    global sensor_left_line_cal, sensor_left_floor_cal
    global sensor_center_line_cal, sensor_center_floor_cal
    global sensor_right_line_cal, sensor_right_floor_cal
    global switch_min_max
    
    def clamp(value, min_val=0, max_val=100):
        return max(min_val, min(value, max_val))

    if position == left:
        if sensor_left_pin[channel] < 100:
            raw_value = board.mcu_io_read_adc(sensor_left_pin[channel])
        else:
            raw_value = board.read_adc(sensor_left_pin[channel] - 100)
        if switch_min_max == False:
            mapped_value = map_value(raw_value, sensor_left_line_cal[channel], sensor_left_floor_cal[channel], 0, 100)
        else:
            mapped_value = map_value(raw_value, sensor_left_line_cal[channel], sensor_left_floor_cal[channel], 100, 0)
        return clamp(mapped_value)

    elif position == center:
        if sensor_center_pin[channel] < 100:
            raw_value = board.mcu_io_read_adc(sensor_center_pin[channel])
        else:
            raw_value = board.read_adc(sensor_center_pin[channel] - 100)
        if switch_min_max == False:
            mapped_value = map_value(raw_value, sensor_center_line_cal[channel], sensor_center_floor_cal[channel], 0, 100)
        else:
            mapped_value = map_value(raw_value, sensor_center_line_cal[channel], sensor_center_floor_cal[channel], 100, 0)
        return clamp(mapped_value)

    elif position == right:
        if sensor_right_pin[channel] < 100:
            raw_value = board.mcu_io_read_adc(sensor_right_pin[channel])
        else:
            raw_value = board.read_adc(sensor_right_pin[channel] - 100)
        if switch_min_max == False:
            mapped_value = map_value(raw_value, sensor_right_line_cal[channel], sensor_right_floor_cal[channel], 0, 100)
        else:
            mapped_value = map_value(raw_value, sensor_right_line_cal[channel], sensor_right_floor_cal[channel], 100, 0)
        return clamp(mapped_value)

def read_position():
    global last_position

    num_sensors = len(sensor_center_pin)
    if num_sensors < 2:
        return 0
    spacing = 100
    max_position = ((num_sensors - 1) * spacing) // 2
    average = 0
    sum_value = 0
    on_line = False
    for i in range(num_sensors):
        sensor_value = 100 - read_calibrated_sensor(center, i)
        if sensor_value > 40:
            on_line = True
            position = (i * spacing) - max_position
            average += sensor_value * position
            sum_value += sensor_value
    if not on_line:
        if last_position < 0:
            return max_position
        else:
            return -max_position
    last_position = average // sum_value
    return -last_position

def read_junction(front_only = ''):
    found_l = 0
    found_c = 0
    found_r = 0
    half_count = (len(sensor_center_pin) // 2)
    if front_only != 'f':
        for i in range(len(sensor_left_pin)):
            if read_calibrated_sensor(left, i) < 50:
                found_l += 1
    left_count = 0
    right_count = 0
    for i in range(len(sensor_center_pin)):
        if read_calibrated_sensor(center, i) < 50:
            found_c += 1
            if i < half_count:
                left_count += 1
            elif i >= half_count:
                right_count += 1
    if left_count >= half_count:
        found_l += 1
    if right_count >= half_count:
        found_r += 1
    if front_only != 'f':
        for i in range(len(sensor_right_pin)):
            if read_calibrated_sensor(right, i) < 50:
                found_r += 1
    if found_c >= len(sensor_center_pin):
        return line_center
    elif found_l >= 1:
        return line_left
    elif found_r >= 1:
        return line_right
    else:
        return -1

def set_ramp_follow_line(set_ramp_up, set_ramp_down):
    global ramp_up, ramp_down
    ramp_up = set_ramp_up
    ramp_down = set_ramp_down

def follow_line(min_speed, max_speed, kp, kd):
    global previous_error
    error = read_position()
    P = error
    D = error - previous_error
    pd_value = (P * kp) + (D * kd)
    previous_error = error
    left_motor_speed = min_speed - pd_value
    right_motor_speed = min_speed + pd_value
    left_motor_speed = max(0, min(left_motor_speed, max_speed))
    right_motor_speed = max(0, min(right_motor_speed, max_speed))
    if motor.motor_drive_mode == motor.WD2:
        motor.drive_single(1, left_motor_speed)
        motor.drive_single(2, right_motor_speed)
    else:
        motor.drive_all(left_motor_speed, left_motor_speed, right_motor_speed, right_motor_speed)
            
def follow_line_time(min_speed, max_speed, kp, kd, duration, stop):
    global previous_error, ramp_up, ramp_down
    previous_error = 0
    current_speed = 0
    timer_start = utime.ticks_ms()
    while True:
        elapsed_time = utime.ticks_diff(utime.ticks_ms(), timer_start) / 1000
        if elapsed_time >= duration:
            break
        if ramp_up > 0 and elapsed_time <= ramp_up:
            current_speed = min_speed + (elapsed_time / ramp_up) * (max_speed - min_speed)
        elif ramp_down > 0 and elapsed_time >= duration - ramp_down:
            remaining_time = duration - elapsed_time
            current_speed = min_speed + (remaining_time / ramp_down) * (max_speed - min_speed)
            if current_speed < min_speed:
                current_speed = min_speed
        else:
            current_speed = max_speed
        follow_line(current_speed, 100, kp, kd)
    if stop == True:
        motor.stop()
        
def follow_line_junction(min_speed, max_speed, kp, kd, junction, count, stop_point):
    global previous_error, ramp_up, ramp_down
    previous_error = 0
    current_speed = 0
    current_count = 1
    timer_start = utime.ticks_ms()
    while True:
        if junction == read_junction('f'):
            if current_count == count:
                break
            else:
                while True:
                    if read_junction() == -1:
                        utime.sleep_ms(20)
                        current_count += 1
                        break
                    follow_line(current_speed, 100, kp, kd)
        elapsed_time = utime.ticks_diff(utime.ticks_ms(), timer_start) / 1000
        if ramp_up > 0 and elapsed_time <= ramp_up:
            current_speed = min_speed + (elapsed_time / ramp_up) * (max_speed - min_speed)
        else:
            current_speed = max_speed
        if read_junction() == -1:
            follow_line(current_speed, 100, kp, kd)
        else:
            motor.move(motor.forward, current_speed)
    if stop_point == sensor_center:
        while True:
            stop_condition_met = False
            for i in range(len(sensor_left_pin)):
                if read_calibrated_sensor(left, i) < 50:
                    stop_condition_met = True
                    break
            for i in range(len(sensor_right_pin)):
                if read_calibrated_sensor(right, i) < 50:
                    stop_condition_met = True
                    break
            if stop_condition_met:
                break
            elapsed_time = utime.ticks_diff(utime.ticks_ms(), timer_start) / 1000
            if ramp_up > 0 and elapsed_time <= ramp_up:
                current_speed = min_speed + (elapsed_time / ramp_up) * (max_speed - min_speed)
            else:
                current_speed = max_speed
            motor.move(motor.forward, current_speed)
    motor.stop()
    
def follow_line_sensor(min_speed, max_speed, kp, kd, position, channel, count):
    global previous_error, ramp_up, ramp_down
    previous_error = 0
    current_speed = 0
    current_count = 1
    timer_start = utime.ticks_ms()
    while True:
        if read_calibrated_sensor(position, channel) < 50:
            if current_count == count:
                break
            else:
                while True:
                    if read_calibrated_sensor(position, channel) > 50:
                        utime.sleep_ms(20)
                        current_count += 1
                        break
                    follow_line(current_speed, 100, kp, kd)
        elapsed_time = utime.ticks_diff(utime.ticks_ms(), timer_start) / 1000
        if ramp_up > 0 and elapsed_time <= ramp_up:
            current_speed = min_speed + (elapsed_time / ramp_up) * (max_speed - min_speed)
        else:
            current_speed = max_speed
        follow_line(current_speed, 100, kp, kd)
    motor.stop()
    
def move_check_sensor(speed1, speed2, speed3, speed4, position, channel, count):
    current_count = 1
    while True:
        if read_calibrated_sensor(position, channel) < 50:
            if current_count == count:
                break
            else:
                while True:
                    if read_calibrated_sensor(position, channel) > 50:
                        utime.sleep_ms(20)
                        current_count += 1
                        break
                    motor.drive_all(speed1, speed2, speed3, speed4)
        motor.drive_all(speed1, speed2, speed3, speed4)
    motor.stop()
    
def spin_check_sensor(direction, slow_speed, fast_speed, fast_speed_time, position, channel):
    timer_start = utime.ticks_ms()
    while True:
        elapsed_time = utime.ticks_diff(utime.ticks_ms(), timer_start) / 1000
        if elapsed_time >= fast_speed_time:
            break
        if direction == left:
            motor.spin(motor.left, fast_speed)
        elif direction == right:
            motor.spin(motor.right, fast_speed)
    while True:
        if read_calibrated_sensor(position, channel) < 50:
            break
        if direction == left:
            motor.spin(motor.left, slow_speed)
        elif direction == right:
            motor.spin(motor.right, slow_speed)
    motor.stop()
    
def turn_check_sensor(direction, slow_speed, fast_speed, fast_speed_time, position, channel):
    timer_start = utime.ticks_ms()
    while True:
        elapsed_time = utime.ticks_diff(utime.ticks_ms(), timer_start) / 1000
        if elapsed_time >= fast_speed_time:
            break
        if direction == left:
            motor.turn_front(motor.left, fast_speed)
        elif direction == right:
            motor.turn_front(motor.right, fast_speed)
    while True:
        if read_calibrated_sensor(position, channel) < 50:
            break
        if direction == left:
            motor.turn_front(motor.left, slow_speed)
        elif direction == right:
            motor.turn_front(motor.right, slow_speed)
    motor.stop()