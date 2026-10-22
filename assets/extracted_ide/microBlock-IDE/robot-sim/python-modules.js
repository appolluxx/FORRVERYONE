(function(root){
    'use strict';
    // Hardware-facing modules stop here; ordinary Extension Python runs intact.
    const display=`from _sim import invoke as call
def color_hex(color):
    return color
def fill(color):
    return call('display', {'type':'fill', 'color':color})
def text(text, x=0, y=0, color='#ffffff'):
    return call('display', {'type':'text', 'text':str(text), 'x':x, 'y':y, 'color':color})
def line(x, y, x2, y2, color='#ffffff'):
    return call('display', {'type':'line', 'x':x, 'y':y, 'x2':x2, 'y2':y2, 'color':color})
def rect(x, y, width, height, color='#ffffff', fill=False):
    return call('display', {'type':'rect', 'x':x, 'y':y, 'width':width, 'height':height, 'color':color, 'fill':fill})
def fill_rect(x,y,width,height,color='#ffffff'):
    return rect(x,y,width,height,color,True)
def circle(x,y,radius,color='#ffffff',fill=False):
    return call('display', {'type':'circle', 'x':x, 'y':y, 'radius':radius, 'color':color, 'fill':fill})
def fill_circle(x,y,radius,color='#ffffff'):
    return circle(x,y,radius,color,True)
def image(image,x=0,y=0):
    return call('display', {'type':'image', 'image':image, 'x':x, 'y':y})
`;
    const files={
        'display.py':display,
        'robot.py':`from _sim import invoke as call
from display import color_hex, text as display_text, image as display_image
forward = 'forward'
backward = 'backward'
left = 'left'
right = 'right'
roll = 'roll'
pitch = 'pitch'
yaw = 'yaw'
def read_angle(axis):
    return call('imu',axis)
def set_angle_offset(axis, degree):
    return call('imu_offset',axis,degree)
def motor_drive(motor, speed):
    return call('motor', motor, speed)
def motor_drive_all(left, right, m3=0, m4=0):
    return call('motors', left, right, m3, m4)
def motor_stop_all():
    return call('motors',0,0,0,0)
def move(direction, speed):
    if direction == backward:
        speed = -speed
    return call('drive',speed,speed)
def spin(direction,speed):
    if direction == left:
        speed = -speed
    return call('drive',speed,-speed)
def turn_front(direction,speed):
    return call('drive',0 if direction == left else speed,speed if direction == left else 0)
def turn_back(direction,speed):
    return call('drive',-speed if direction == left else 0,0 if direction == left else -speed)
def servo_set_degree(port, degree):
    return call('servo',port,degree)
`,
        'line_follower.py':`from _sim import invoke as call
import time
_last_error = None
def read_sensor(position):
    pin = str(position)
    if not pin.startswith('ADC'):
        pin = 'ADC' + pin
    return call('sensor',pin,'analog')
def follow_line(base_speed, max_speed, KP, KD):
    global _last_error
    # SIM reflectance: black=0, white=4095. ADC0..7 run left to right.
    strengths = [max(0.0,min(1.0,1.0-read_sensor(i)/4095.0)) for i in range(8)]
    total = sum(strengths)
    if total > 0.01:
        error = sum((i-3.5)*strengths[i] for i in range(8))/total/3.5*100.0
    else:
        error = 0.0 if _last_error is None else _last_error
    derivative = 0.0 if _last_error is None else error-_last_error
    correction = KP*error+KD*derivative
    _last_error = error
    limit = min(100.0,max(0.0,abs(max_speed)))
    left = max(-limit,min(limit,base_speed+correction))
    right = max(-limit,min(limit,base_speed-correction))
    call('drive',left,right)
    time.sleep(0.01)
`,
        'time.py':`from _sim import invoke as call
def sleep(seconds):
    return call('sleep',seconds)
def sleep_ms(milliseconds):
    return sleep(milliseconds / 1000.0)
def sleep_us(microseconds):
    return sleep(microseconds / 1000000.0)
def monotonic():
    return call('clock')
def monotonic_ns():
    return int(monotonic() * 1000000000)
perf_counter = monotonic
perf_counter_ns = monotonic_ns
def time():
    return call('time')
def time_ns():
    return int(time() * 1000000000)
def ticks_ms():
    return int(monotonic() * 1000)
def ticks_us():
    return int(monotonic() * 1000000)
def ticks_diff(new, old):
    return new - old
`,
        'analogio.py':`from _sim import invoke as call
class AnalogIn:
    def __init__(self,pin):
        self.pin = str(pin)
    @property
    def value(self):
        return min(65535,call('sensor',self.pin,'analog') * 16)
`,
        'board.py':Array.from({length:40},(_,i)=>'IO'+i+' = "IO'+i+'"').concat(Array.from({length:10},(_,i)=>'ADC'+i+' = "ADC'+i+'"')).join('\n')+`
from _sim import invoke as call
def read_adc(pin):
    pin = str(pin)
    return call('sensor',pin if pin.startswith('ADC') else 'ADC'+pin,'analog')
def mcu_io_read_adc(pin):
    return call('sensor','IO'+str(pin),'analog')
`
    };
    files['utime.py']=files['time.py'];
    root.SimPythonModules=files;
    if(typeof module!=='undefined')module.exports=files;
})(typeof self!=='undefined'?self:globalThis);
