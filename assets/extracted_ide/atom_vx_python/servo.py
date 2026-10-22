import board
from pca9685 import PCA9685

i2c = board.i2c
pca = PCA9685(i2c, address = 0x5F)
pca.freq(50)

servo_angle = [0, 0, 0, 0, 0, 0, 0]

def set_degree(channel, angle):
    global servo_angle
    servo_pin = [6, 5, 4, 0, 1, 2, 3]
    min_pulse = 110
    max_pulse = 550
    pulse = int(min_pulse + (angle / 180) * (max_pulse - min_pulse))
    pca.duty(servo_pin[channel], pulse)
    servo_angle[channel] = angle
    
def read_angle(channel):
    global servo_angle
    return servo_angle[channel]
