"""ATOM VX MicroPython device boundary; firmware Python files are unmodified.

The board's switch polling thread runs cooperatively at its original 20 ms
interval. Other native threads and unmodeled peripherals fail explicitly.
"""
import sys, types, json, time, io, base64, struct, binascii, ast, inspect, textwrap
from PIL import Image, ImageDraw
from _sim_native import invoke
try:
    from _sim_native import value as _native_value
except ImportError:
    _native_value = None

_scalar_ops = frozenset(('clock', 'time', 'sleep', 'imu', 'imu_offset',
                         'motor', 'digital', 'digital_write', 'i2c_write_time'))

def raw(op, *args):
    if _native_value is not None and op in _scalar_ops:
        try:
            return _native_value(op, *args)
        except Exception as error:
            raise RuntimeError(str(error)) from None
    reply = json.loads(invoke(json.dumps([op, *args])))
    if 'error' in reply:
        raise RuntimeError(reply['error'])
    return reply.get('value')

def module(name, **values):
    obj = types.ModuleType(name)
    obj.__dict__.update(values)
    sys.modules[name] = obj
    return obj

_tasks = []
_pumping = False
def pump():
    global _pumping
    if _pumping or not _tasks:
        return
    now = raw('clock')
    if not any(task[1] <= now for task in _tasks):
        return
    _pumping = True
    try:
        for task in list(_tasks):
            if task[1] <= now:
                try:
                    task[1] = now + max(0.001, float(next(task[0])))
                except StopIteration:
                    _tasks.remove(task)
    finally:
        _pumping = False

def call(op, *args):
    pump()
    return raw(op, *args)

def sleep(seconds):
    seconds = float(seconds)
    if seconds < 0:
        raise ValueError('sleep length must be non-negative')
    if not _tasks or _pumping:
        return raw('sleep', seconds)
    deadline = raw('clock') + seconds
    while True:
        pump()
        remaining = deadline - raw('clock')
        if remaining <= 0:
            return
        raw('sleep', min(0.02, remaining))

time.sleep = sleep
time.sleep_ms = lambda ms: sleep(ms / 1000)
time.sleep_us = lambda us: sleep(us / 1000000)
time.monotonic = lambda: call('clock')
time.time = lambda: call('time')
time.ticks_ms = lambda: int(call('clock') * 1000) & 0x3fffffff
time.ticks_us = lambda: int(call('clock') * 1000000) & 0x3fffffff
time.ticks_diff = lambda a,b: ((a-b+0x20000000) & 0x3fffffff)-0x20000000
time.ticks_add = lambda a,b: (a+b) & 0x3fffffff
sys.modules['utime'] = time
sys.modules['ustruct'] = struct
sys.modules['ubinascii'] = binascii
module('micropython', const=lambda value: value)

class _SwitchCoroutine(ast.NodeTransformer):
    def visit_Expr(self, node):
        expr = node.value
        if isinstance(expr, ast.Call) and isinstance(expr.func, ast.Attribute) and expr.func.attr == 'sleep_ms':
            return ast.copy_location(ast.Expr(ast.Yield(ast.BinOp(expr.args[0], ast.Div(), ast.Constant(1000)))), node)
        return self.generic_visit(node)

def start_thread(fn, args):
    if fn.__module__ != 'board' or fn.__name__ != 'SwitchLoopTask':
        raise NotImplementedError('ATOM SIM currently supports the board switch polling thread only')
    tree = _SwitchCoroutine().visit(ast.parse(textwrap.dedent(inspect.getsource(fn))))
    ast.fix_missing_locations(tree)
    namespace = {}
    exec(compile(tree, '<atom-switch-thread>', 'exec'), fn.__globals__, namespace)
    _tasks.append([namespace[fn.__name__](*args), raw('clock')])
    return len(_tasks)

module('_thread', start_new_thread=start_thread)

# Empty main loops must still service switches, as a second core would.
# Restrict tracing to user/firmware code, never the hardware boundary itself.
_trace_count = 0
_untraced_firmware = frozenset()
def _trace(frame, event, arg):
    global _trace_count
    if event == 'call':
        name = frame.f_code.co_filename
        # Stock motor/PCA helpers already enter the hardware boundary inside
        # their control loops, which pumps the switch task. Per-line callbacks
        # there duplicate that work; user code still needs them for empty loops.
        if name in _untraced_firmware:
            return None
        return _trace if (name.startswith('/home/sim/') and not name.endswith('_sim_hardware.py')) or name.startswith('<exec') else None
    if event == 'line':
        _trace_count += 1
        if _trace_count % 512 == 0:
            pump()
    return _trace
sys.settrace(_trace)

class Pin:
    IN=0; OUT=1; PULL_UP=2; PULL_DOWN=3; OPEN_DRAIN=4
    def __init__(self, number, mode=IN, pull=None, value=None):
        self.number = number.number if isinstance(number, Pin) else int(number)
        self.mode, self.pull, self.level = mode, pull, 0
        if value is not None: self.value(value)
    def value(self, value=None):
        if value is None:
            return self.level if self.mode == self.OUT else int(call('digital', 'IO'+str(self.number)))
        self.level = int(bool(value))
        if self.number != 15: call('digital_write', 'IO'+str(self.number), bool(value))
    def on(self): self.value(1)
    def off(self): self.value(0)
    def init(self, mode=IN, pull=None): self.mode,self.pull=mode,pull

class ADC:
    ATTN_11DB=3; WIDTH_12BIT=12
    def __init__(self,pin): self.pin=Pin(pin)
    def atten(self,value): pass
    def width(self,value):
        if value != 12: raise NotImplementedError('ADC width must be 12 bits')
    def read(self):
        if self.pin.number == 32: return 4095 if call('digital','ATOM_BUTTON_A') else 0
        return round(call('sensor','IO'+str(self.pin.number),'analog'))

class SPI:
    def __init__(self,*args,**kwargs): self.init(**kwargs)
    def init(self,**kwargs): pass
    def deinit(self): pass
    def write_readinto(self,output,result):
        if len(output)!=3 or output[0]!=1 or not output[1]&128:
            raise NotImplementedError('Only single-ended MCP3008 transfers are modeled')
        physical=(output[1]>>4)&7
        channel=[7,6,4,5,0,1,3,2].index(physical)
        value=round(max(0,min(4095,call('sensor','ADC'+str(channel),'analog')))*1023/4095)
        result[:]=bytes([0,(value>>8)&3,value&255])

class I2C:
    def __init__(self,*args,**kwargs):
        self.regs={0x40:bytearray(256),0x5f:bytearray(256)}; self.last={}
        self.frequency=float(kwargs.get('freq',400000))
        if not 0 < self.frequency <= 5000000: raise ValueError('Invalid I2C frequency')
    def scan(self): return [0x40,0x5f,0x4a]
    def _regs(self,address):
        if address not in self.regs: raise OSError('No simulated I2C device at '+hex(address))
        return self.regs[address]
    def readfrom_mem(self,address,register,size): return bytes(self._regs(address)[register:register+size])
    def writeto_mem(self,address,register,data):
        regs=self._regs(address)
        # Address + register + payload, nine clocks per byte including ACK.
        # Charge every transaction even when its PWM value has not changed.
        raw('i2c_write_time',len(data)+2,self.frequency)
        regs[register:register+len(data)]=data
        if register < 6 or register >= 70: return
        for channel in range((register-6)//4,min(16,(register+len(data)-7)//4+1)):
            on,off=struct.unpack_from('<HH',regs,6+channel*4)
            value=0 if off&4096 else 4095 if on&4096 else (off-on)&4095
            self.last[address,channel]=value
            if address==0x40:
                pairs=[(12,13),(14,15),(10,11),(8,9)]
                for motor,(direction,pwm) in enumerate(pairs,1):
                    if channel in (direction,pwm):
                        speed=self.last.get((address,pwm),0)/4095*100
                        if self.last.get((address,direction),0): speed=-speed
                        if self.last.get(('motor',motor))!=speed:
                            call('motor',motor,speed);self.last['motor',motor]=speed
                if channel==5: call('tone',1000,value/4095)
            elif channel in [6,5,4,0,1,2,3]:
                port=[6,5,4,0,1,2,3].index(channel)
                if value==0: call('servo_release',port)
                else: call('servo',port,max(0,min(180,(value-110)/440*180)))

def pulse(pin,level,timeout=1000000):
    value=call('pulse','IO'+str(Pin(pin).number),level,timeout)
    return -2 if value>=min(timeout,65535) else round(value*0.034/0.0343)
def unsupported(*args,**kwargs): raise NotImplementedError('This hardware peripheral is not modeled in ATOM SIM')
module('machine',Pin=Pin,SPI=SPI,I2C=I2C,ADC=ADC,time_pulse_us=pulse,reset=unsupported)
module('network',STA_IF=0,AP_IF=1,WLAN=unsupported)
class _ImuDisplayOffsets(list):
    def __setitem__(self,index,value):
        super().__setitem__(index,value)
        call('imu_display_offsets',list(self))
def read_angles():
    board=sys.modules.get('board')
    offsets=getattr(board,'angles_offset',None)
    if offsets is not None and not isinstance(offsets,_ImuDisplayOffsets):
        board.angles_offset=_ImuDisplayOffsets(offsets)
        call('imu_display_offsets',list(offsets))
    return tuple(call('imu',axis) for axis in ('roll','pitch','yaw'))
module('imu',init=lambda:None,address=lambda:0x4a,auto_calibrate=lambda:None,
       read_angles=read_angles,
       read_gyro=unsupported,read_accel=unsupported,read_quaternion=unsupported)

class NVS:
    def __init__(self,name):
        self.name=name
        data=bytes(raw('nvm_read')).rstrip(b'\0')
        self.all=json.loads(data.decode()) if data else {}
        self.values=self.all.setdefault(name,{})
    def get_i32(self,key):
        if key not in self.values: raise OSError(-2)
        return int(self.values[key])
    def set_i32(self,key,value): self.values[key]=int(value)
    def erase_key(self,key):
        if key not in self.values: raise OSError(-2)
        del self.values[key]
    def commit(self):
        saved=bytes(raw('nvm_read')).rstrip(b'\0')
        latest=json.loads(saved.decode()) if saved else {}
        latest[self.name]=self.values
        data=json.dumps(latest,separators=(',',':')).encode()
        if len(data)>4096: raise OSError('Simulated NVS is full')
        raw('nvm_write',list(data.ljust(4096,b'\0')))
module('esp32',NVS=NVS)

def rgb565(r,g,b): return ((r&248)<<8)|((g&252)<<3)|(b>>3)
def rgb(value): return ((value>>11)*255//31,((value>>5)&63)*255//63,(value&31)*255//31)
class ST7789:
    def __init__(self,spi,width,height,rotation=0,**kwargs):
        self.size=(height,width) if rotation%2 else (width,height)
        self.image=Image.new('RGB',self.size);self.draw=ImageDraw.Draw(self.image)
    def init(self): pass
    def show(self):
        data=io.BytesIO();self.image.save(data,format='PNG')
        call('display',{'type':'image','image':base64.b64encode(data.getvalue()).decode(),'x':0,'y':0})
    def fill(self,color): self.draw.rectangle((0,0,*self.size),fill=rgb(color));self.show()
    def line(self,x1,y1,x2,y2,color): self.draw.line((x1,y1,x2,y2),fill=rgb(color));self.show()
    def rect(self,x,y,w,h,color): self.draw.rectangle((x,y,x+w-1,y+h-1),outline=rgb(color));self.show()
    def fill_rect(self,x,y,w,h,color): self.draw.rectangle((x,y,x+w-1,y+h-1),fill=rgb(color));self.show()
    def circle(self,x,y,r,color): self.draw.ellipse((x-r,y-r,x+r,y+r),outline=rgb(color));self.show()
    def fill_circle(self,x,y,r,color): self.draw.ellipse((x-r,y-r,x+r,y+r),fill=rgb(color));self.show()
    def jpg(self,data,x,y,*args):
        source=Image.open(io.BytesIO(data) if isinstance(data,(bytes,bytearray)) else data).convert('RGB')
        self.image.paste(source,(x,y));self.show()
    def write(self,font,text,x,y,color,bg=0):
        origin=x
        for char in str(text):
            if char not in font.MAP: continue
            index=font.MAP.index(char);width=font.WIDTHS[index]
            offset=int.from_bytes(font.OFFSETS[index*font.OFFSET_WIDTH:(index+1)*font.OFFSET_WIDTH],'big')
            for row in range(font.HEIGHT):
                for col in range(width):
                    bit=offset+row*width+col
                    self.draw.point((x+col,y+row),fill=rgb(color if font.BITMAPS[bit//8]&(128>>(bit%8)) else bg))
            x+=width
        self.show();return x-origin
module('st7789',ST7789=ST7789,color565=rgb565,FAST=0,SLOW=1)
