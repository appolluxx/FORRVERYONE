import esp32
import machine
from machine import Pin, I2C, SPI, ADC, time_pulse_us
import network
from pca9685 import PCA9685
import imu
from vl53l0x import VL53L0X
import display
import gc
import fonts.font_12
from time import sleep, sleep_us
import _thread
import utime

ADC0 = 100
ADC1 = 101
ADC2 = 102
ADC3 = 103
ADC4 = 104
ADC5 = 105
ADC6 = 106
ADC7 = 107
SW_A = 0
SW_B = Pin(0, Pin.IN, Pin.PULL_UP)
VL53L0X_init = False
tof = None
VL53L0X_last_distance = 0
i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=200000)
pca = PCA9685(i2c)
pca.freq(1300)
cs_adc_pin = Pin(15, Pin.OUT)
roll = 0
pitch = 1
yaw = 2
angles_offset = [0, 0, 0]

pca.duty(13, 0, False)
pca.duty(15, 0, False)
pca.duty(11, 0, False)
pca.duty(9, 0, False)

__sw_a_pressed = None
__sw_b_pressed = None

sleep(0.1)


def knob_read():
    adc = ADC(Pin(32))
    adc.atten(ADC.ATTN_11DB)
    adc.width(ADC.WIDTH_12BIT)
    return adc.read()


def switch_read(pin):
    if pin == SW_A:
        adc_value = knob_read()
        if adc_value == 0:
            return True
        else:
            return False
    elif pin == SW_B:
        return not pin.value()


def switch_pressed(pin, callback, press_threshold=100):
    global __sw_a_pressed, __sw_b_pressed
    if pin == SW_A:
        __sw_a_pressed = (callback, press_threshold)
    elif pin == SW_B:
        __sw_b_pressed = (callback, press_threshold)


def SwitchLoopTask():
    sw_a_press_start = None
    sw_b_press_start = None
    while True:
        sw_a = switch_read(SW_A)
        sw_b = switch_read(SW_B)
        if sw_a:
            if sw_a_press_start is None:
                sw_a_press_start = utime.ticks_ms()
        else:
            if sw_a_press_start is not None:
                hold_time = utime.ticks_diff(utime.ticks_ms(), sw_a_press_start)
                sw_a_press_start = None
                if __sw_a_pressed and hold_time >= __sw_a_pressed[1]:
                    __sw_a_pressed[0]()
        if sw_b:
            if sw_b_press_start is None:
                sw_b_press_start = utime.ticks_ms()
        else:
            if sw_b_press_start is not None:
                hold_time = utime.ticks_diff(utime.ticks_ms(), sw_b_press_start)
                sw_b_press_start = None
                if __sw_b_pressed and hold_time >= __sw_b_pressed[1]:
                    __sw_b_pressed[0]()
        utime.sleep_ms(20)


_thread.start_new_thread(SwitchLoopTask, ())


def beep(duration):
    pca.duty(5, 2000)
    sleep(duration)
    pca.duty(5, 0)


def check_imu_calibrated():
    if imu.address() in (0x4A, 0x4B):
        return

    try:
        nvs = esp32.NVS("imu_bias")
        nvs.get_i32("gyro_bias_x")
    except OSError as e:
        if e.args[0] in (-2, -4354):
            beep(0.05)
            display.fill(display.color_hex("#000000"))
            display.image("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAA3ADcDASIAAhEBAxEB/8QAGwABAAICAwAAAAAAAAAAAAAAAAgJBQcEBgr/xAAvEAABAwMEAQMCBAcAAAAAAAABAgMEAAUGBwgREiEJE0EiMRQ4dbIVFiMyM1Fh/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKqqUpQbz2Ybc4m6XXS34LPvD1jguxH5j0qM0HHOraeeqQfAJJHk81sOF6emUWXeVjWiGXT1W23Xt196HkkRju1MhtMOvlbQJ8OFLRQUqJ6KPnsngq7B6Qn5yLf+iz/2pqw7QHcLh+4DcFlOJZi3Bb1N0zy29s428B7Lj8HvIjfTweFlLKilafnqlfHIJoKXdwmlSND9a8wwRueq6NWKeuIiYpvop1IAKSU8ng8Ec/8Aa17Ugd//AOcrVj9ZV+xFR+oFKUoFKUoMvieYX3A79GveN3idYbxGJLM+3SFMPN8jg9VpII5BIqZuabH7vpBs0xHchassusXOy5Dvkz2ZKUJjRZa0iM6y4nhz3gXWVKJUf8h8DoSqNu17R5evOveF4T0cVDuU9H45TfYFEVH1vHsAepKEqAJHAKhXo31Aw6HqHgWSYrce/wDD77bJNske2rqr23mlNr4PweFHzQeYG73edf7pLuVzmP3C4S3VPSJUlwuOurUeVKUo+SSfk1xKzmdYdP09zS+YzdEFFwtE12E+ClSQVNrKewCgDweORyPsRWDoFKUoFKUoLPfRR0bFxyPNtTpjCvatzaLLb3Fsnqp5wBx8pc545SgNgp4Ph1J5HzbXUfNlWk8DbdtQxG03JcW2SEwTeL1MfKGkiQ9/VcU6vnghtJS2Fk/2NJ/1XRMU9UvQzLdW/wCSGLvLhsuvCNFyGYz7VvkO8kABZPKEkgcLUAk9h5HngK/fV80bGnm5VjKojCkWzMYIm9wyUo/FNENvpC+T3Vx7Sz4HHupHHyYL1ex6r2i7Oqu1adf4rLa7xh0hN5jvhCSsxiOklsLPkJKFJcIH3LCKonoFKUoFc6w3h/Hb5brrGS2uTBktymkvJ7IKkKCgFD5HIHIpSgkTuq3+aj7q4MWzXcxsexWMpDostqKg286EAd3VE8r4PYpT4Ce32JANRopSglNor6iupujukV404KYOT45Kgvw4KbuFLct/ujj6FA/U2AV8Nn7FXggDios0pQKUpQf/2Q==", 50, 10)
            gc.collect()
            display.text(str("Calibrating IMU"), 25, 75, display.color_hex("#ffffff"), fonts.font_12)
            display.text(str("please wait..."), 28, 95, display.color_hex("#ffffff"), fonts.font_12)
            imu.auto_calibrate()
            beep(0.05)
            sleep(0.05)
            beep(0.05)
            sleep(0.05)
            machine.reset()
        else:
            raise


def mcu_io_read_adc(analog_pin):
    adc = ADC(Pin(analog_pin))
    adc.atten(ADC.ATTN_11DB)
    adc.width(ADC.WIDTH_12BIT)
    return adc.read()


def read_adc(pin, is_differential=False):
    spi = SPI(1, baudrate=1000000, sck=Pin(18), mosi=Pin(23), miso=Pin(19))
    adc_pin = [7, 6, 4, 5, 0, 1, 3, 2]
    cs_adc_pin.value(0)
    out_buf = bytearray(3)
    out_buf[0] = 0x01
    out_buf[1] = ((not is_differential) << 7) | (adc_pin[pin] << 4)
    in_buf = bytearray(3)
    spi.write_readinto(out_buf, in_buf)
    cs_adc_pin.value(1)
    return ((in_buf[1] & 0x03) << 8) | in_buf[2]


def set_angle_offset(axis, degree):
    global angles_offset
    r, p, y = imu.read_angles()
    if axis == roll:
        angles_offset[0] = r - degree
    elif axis == pitch:
        angles_offset[1] = p - degree
    elif axis == yaw:
        angles_offset[2] = y - degree


def angle_read(axis):
    global angles_offset
    r, p, y = imu.read_angles()
    if axis == roll:
        adjusted = r - angles_offset[0]
        if adjusted > 360:
            adjusted -= 360
        elif adjusted < 0:
            adjusted += 360
        return adjusted
    elif axis == pitch:
        adjusted = p - angles_offset[1]
        if adjusted > 360:
            adjusted -= 360
        elif adjusted < 0:
            adjusted += 360
        return adjusted
    elif axis == yaw:
        adjusted = y - angles_offset[2]
        if adjusted > 360:
            adjusted -= 360
        elif adjusted < 0:
            adjusted += 360
        return adjusted


def ultrasonic_read(trigger_pin, echo_pin):
    trigger_pin.value(0)
    sleep_us(2)
    trigger_pin.value(1)
    sleep_us(10)
    trigger_pin.value(0)
    duration = time_pulse_us(echo_pin, 1, 30000)
    if duration < 0:
        return None
    distance = (duration * 0.0343) / 2
    sleep(0.01)
    return distance


def VL53L0X_read(scl_pin, sda_pin):
    global VL53L0X_init, tof, VL53L0X_last_distance
    if VL53L0X_init is False:
        try:
            i2c = I2C(1, scl=scl_pin, sda=sda_pin)
            tof = VL53L0X(i2c)
            sleep(0.1)
            _ = tof.measurement_timing_budget_us
            tof.set_measurement_timing_budget(50000)
            tof.set_Vcsel_pulse_period(tof.vcsel_period_type[0], 14)
            tof.set_Vcsel_pulse_period(tof.vcsel_period_type[1], 10)
            VL53L0X_init = True
        except Exception:
            return VL53L0X_last_distance
    try:
        distance = tof.ping() - 50
        if distance < 0:
            distance = 0
        VL53L0X_last_distance = distance
    except OSError:
        tof = None
        VL53L0X_init = False
        distance = VL53L0X_last_distance
    return distance


def connect_wifi(ssid, password):
    wifi_sta = network.WLAN(network.STA_IF)
    wifi_sta.active(True)
    wifi_sta.connect(ssid, password)
    print("Waiting for Wi-Fi connection...")
    while not wifi_sta.isconnected():
        sleep(1)
    ipaddr, netmask, gateway, dns = wifi_sta.ifconfig()
    print("IP address: ", ipaddr)


imu.init()
check_imu_calibrated()
