"""Build BOT native-device boundary. Application and Adafruit sources stay intact."""
import sys, types, json, time, io, base64, struct
from PIL import Image
from _sim_native import invoke
try:
    from _sim_native import value as _native_value
except ImportError:
    _native_value = None

_scalar_ops = frozenset(('clock', 'time', 'sleep', 'digital', 'digital_write',
                         'drive', 'tone', 'servo_release', 'servo', 'sensor',
                         'imu', 'pulse'))

def call(op, *args):
    # Keep the same device transaction and simulated time while avoiding
    # Python JSON conversion for calls with scalar arguments and results.
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

# CircuitPython ignores annotations. CPython evaluates the optional typing
# imports in the unchanged Adafruit sources, so expose their buffer protocols.
import typing
module('circuitpython_typing', ReadableBuffer=typing.Any, WriteableBuffer=typing.Any)
module('circuitpython_typing.device_drivers', I2CDeviceDriver=typing.Any)

time.sleep = lambda seconds: call('sleep', seconds)
time.sleep_ms = lambda ms: time.sleep(ms / 1000)
time.sleep_us = lambda us: time.sleep(us / 1000000)
time.monotonic = lambda: call('clock')
time.monotonic_ns = lambda: int(time.monotonic() * 1000000000)
time.perf_counter = time.monotonic
time.perf_counter_ns = time.monotonic_ns
time.time = lambda: call('time')
time.time_ns = lambda: int(time.time() * 1000000000)
time.ticks_ms = lambda: int(time.monotonic() * 1000)
time.ticks_us = lambda: int(time.monotonic() * 1000000)
time.ticks_diff = lambda a, b: a - b
sys.modules['utime'] = time

# CPython's normal Task/Future machinery, with device-clock waits instead of
# OS file-descriptor polling. Hardware Python calls are synchronous, just as
# on the board; async sleeps allow other tasks to run.
import asyncio
class _FirmwareLoop(asyncio.BaseEventLoop):
    def __init__(self):
        super().__init__()
        self._selector = types.SimpleNamespace(select=self._wait)
    def _wait(self, timeout):
        time.sleep(0.05 if timeout is None else max(0, timeout))
        return []
    def _process_events(self, events): pass
    def _write_to_self(self): pass
def _run_async(main, *, debug=None):
    previous = asyncio.events._get_running_loop()
    loop = _FirmwareLoop()
    asyncio.events._set_running_loop(None)
    try:
        asyncio.set_event_loop(loop)
        if debug is not None: loop.set_debug(debug)
        return loop.run_until_complete(main)
    finally:
        for task in asyncio.all_tasks(loop): task.cancel()
        pending = asyncio.all_tasks(loop)
        if pending: loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        asyncio.set_event_loop(previous)
        asyncio.events._set_running_loop(previous)
asyncio.run = _run_async

class Pin:
    def __init__(self, number): self.number = number
    def __str__(self): return 'IO' + str(self.number)

class NVM(bytearray):
    def __setitem__(self, key, value):
        candidate = bytearray(self)
        candidate[key] = value
        if len(candidate) != len(self): raise ValueError('NVM has a fixed size')
        super().__setitem__(key, value)
        call('nvm_write', list(self))

module('board', **{'IO'+str(i): Pin(i) for i in range(49)})
module('microcontroller', Pin=Pin, nvm=NVM(call('nvm_read')))
module('storage')  # imported by firmware; unsupported operations remain errors
Direction = types.SimpleNamespace(INPUT=0, OUTPUT=1)
Pull = types.SimpleNamespace(UP=1, DOWN=0)
_pins = {}
class DigitalInOut:
    def __init__(self, pin):
        self.pin, self.direction, self.pull = pin, Direction.INPUT, None
        self._value = False
        _pins[pin.number] = self
    @property
    def value(self):
        if self.direction == Direction.OUTPUT: return self._value
        return bool(call('digital', str(self.pin)))
    @value.setter
    def value(self, value):
        self._value = bool(value)
        if self.pin.number in (5, 42):
            channel = 0 if self.pin.number == 5 else 1
            positive = not self._value if channel == 0 else self._value
            _motor[channel] = abs(_motor[channel]) * (1 if positive else -1)
            _drive_motors()
        elif self.pin.number != 11:
            call('digital_write', str(self.pin), self._value)
    def switch_to_output(self, value=False, **kwargs): self.direction = Direction.OUTPUT; self.value = value
    def switch_to_input(self, pull=None): self.direction = Direction.INPUT; self.pull = pull
    def deinit(self): pass
    def __enter__(self): return self
    def __exit__(self, *args): self.deinit()
module('digitalio', DigitalInOut=DigitalInOut, Direction=Direction, Pull=Pull)

_motor = [0, 0]
_last_motor_drive = None
def _drive_motors():
    global _last_motor_drive
    values = tuple(_motor)
    # Rewriting unchanged direction/PWM registers has no physical effect.
    # Changed writes still reach the renderer immediately, including the old
    # duty with a new direction before the subsequent PWM register write.
    if values != _last_motor_drive:
        call('drive', *values)
        _last_motor_drive = values

class PWMOut:
    def __init__(self, pin, duty_cycle=0, frequency=500, variable_frequency=False):
        self.pin, self.frequency = pin, frequency
        self.duty_cycle = duty_cycle
    @property
    def duty_cycle(self): return self._duty
    @duty_cycle.setter
    def duty_cycle(self, duty):
        if not 0 <= duty <= 65535: raise ValueError('PWM duty must be 0..65535')
        self._duty = duty
        if self.pin.number in (6, 12):
            channel = 0 if self.pin.number == 6 else 1
            direction = _pins.get(5 if channel == 0 else 42)
            positive = (not direction._value) if channel == 0 else direction._value
            _motor[channel] = duty / 65535 * 100 * (1 if positive else -1)
            _drive_motors()
        elif self.pin.number == 13:
            call('tone', self.frequency, duty / 65535)
        else: raise NotImplementedError('PWM device not configured on ' + str(self.pin))
    def deinit(self): self.duty_cycle = 0
module('pwmio', PWMOut=PWMOut)

class SPI:
    def __init__(self, **kwargs): self.locked = False
    def try_lock(self):
        if self.locked: return False
        self.locked = True; return True
    def unlock(self): self.locked = False
    def configure(self, **kwargs): pass
    def deinit(self): self.unlock()
    def write(self, *args, **kwargs): raise NotImplementedError('Raw SPI device is not configured')

class I2C(SPI):
    def __init__(self, *args, **kwargs):
        super().__init__()
        self.regs = bytearray(256); self.pointer = 0
    def scan(self): return [0x40, 0x4A]
    def _address(self, address):
        if address != 0x40: raise OSError('No register device at I2C address ' + hex(address))
    def writeto(self, address, buf, *, start=0, end=None, stop=True):
        self._address(address)
        data = bytes(buf[start:end])
        if not data: return
        self.pointer = data[0]
        for i, value in enumerate(data[1:]): self.regs[(self.pointer+i) % 256] = value
        if len(data) > 1 and 6 <= self.pointer < 70:
            for channel in range((self.pointer-6)//4, min(16, (self.pointer+len(data)-2-6)//4+1)):
                on, off = struct.unpack_from('<HH', self.regs, 6+channel*4)
                if off & 4096: call('servo_release', channel); continue
                if self.regs[254] < 3: continue
                frequency = 25000000 / 4096 / (self.regs[254]+1)
                pulse_us = ((off-on) & 4095) / 4096 / frequency * 1000000
                call('servo', channel, max(0, min(180, (pulse_us-750)/1500*180)))
    def readfrom_into(self, address, buf, *, start=0, end=None):
        self._address(address)
        end = len(buf) if end is None else end
        for i in range(start, end): buf[i] = self.regs[(self.pointer+i-start) % 256]
    def writeto_then_readfrom(self, address, out_buffer, in_buffer, *, out_start=0, out_end=None, in_start=0, in_end=None, **kwargs):
        self.writeto(address, out_buffer, start=out_start, end=out_end)
        self.readfrom_into(address, in_buffer, start=in_start, end=in_end)
module('busio', SPI=SPI, I2C=I2C)

class AnalogIn:
    def __init__(self, pin): self.pin = pin
    @property
    def value(self):
        pin = {3: 'ADC8', 4: 'ADC9'}.get(self.pin.number, str(self.pin))
        return round(max(0, min(4095, call('sensor', pin, 'analog'))) / 4095 * 65535)
    def deinit(self): pass
module('analogio', AnalogIn=AnalogIn)

_mins, _maxs, _last_position = [0]*8, [1023]*8, 0
def set_cal(mins, maxs):
    global _mins, _maxs
    if len(mins) != 8 or len(maxs) != 8: raise ValueError('set_cal requires 8 values')
    _mins = [int(v) for v in mins]
    _maxs = [max(int(v), _mins[i]+1) for i,v in enumerate(maxs)]
def raw_row():
    return tuple(call('adc_row'))
def raw_into(buf):
    values = raw_row()
    view = memoryview(buf).cast('B')
    if len(view) == 16: struct.pack_into('<8H', view, 0, *values)
    elif len(view) == 8:
        for i, value in enumerate(values): view[i] = min(255, value)
    else: raise ValueError('buf must be 8 or 16 bytes')
def position(threshold=20):
    global _last_position
    total = weighted = 0
    # Native raw-row API reverses physical MCP channels (out_items[7-ch]).
    # Assembly ADC labels follow that public row order, while position() in
    # the supplied C source scans physical channels directly.
    for i, raw in enumerate(reversed(raw_row())):
        value = min(100, max(0, raw-_mins[i])*100 // max(1, _maxs[i]-_mins[i]))
        strength = 100-value
        if strength > threshold:
            total += strength; weighted += strength * (-350+i*100)
    if not total: return -350 if _last_position < 0 else 350
    _last_position = int(weighted/total)  # C division truncates toward zero
    return _last_position
module('mcp3008_fast', init=lambda *a, **k: None, deinit=lambda: None,
       set_cal=set_cal, read_row_raw10=raw_row, read_row_raw10_into=raw_into, position=position)
# Observe firmware offset writes without changing the firmware's angle math.
class _ImuDisplayOffsets(list):
    def __setitem__(self, index, value):
        super().__setitem__(index, value)
        call('imu_display_offsets', list(self))

def _read_imu_angles():
    robot_module = sys.modules.get('robot')
    offsets = getattr(robot_module, 'angles_offset', None)
    if offsets is not None and not isinstance(offsets, _ImuDisplayOffsets):
        robot_module.angles_offset = _ImuDisplayOffsets(offsets)
        call('imu_display_offsets', list(offsets))
    return tuple(call('imu', axis) % 360 for axis in ('roll', 'pitch', 'yaw'))

module('imu', init=lambda *a: True, deinit=lambda: None,
       read_angles=_read_imu_angles,
       address=lambda: 0x4A)

class PulseIn:
    def __init__(self, pin, **kwargs): self.pin = pin; self.values = []
    def clear(self): self.values.clear()
    def pause(self): pass
    def resume(self): self.values = [call('pulse', str(self.pin))]
    def __len__(self): return len(self.values)
    def __getitem__(self, i): return self.values[i]
    def deinit(self): self.clear()
module('pulseio', PulseIn=PulseIn)

def rgb565(value): return ((value>>11 & 31)*255//31, (value>>5 & 63)*255//63, (value & 31)*255//31)
class Bitmap:
    def __init__(self, width, height, value_count):
        self.width, self.height = width, height
        self.pixels = [0]*(width*height)
        self._decoded = None
    def _index(self, key): return key[1]*self.width+key[0] if isinstance(key, tuple) else key
    def __getitem__(self, key):
        index = self._index(key)
        if self._decoded is not None:
            r,g,b = self._decoded.getpixel((index % self.width, index // self.width))
            return (r>>3)<<11 | (g>>2)<<5 | b>>3
        return self.pixels[index]
    def __setitem__(self, key, value):
        if self._decoded is not None: put_image(self, self._decoded)
        self.pixels[self._index(key)] = value
    def fill(self, value):
        self._decoded = None
        self.pixels[:] = [value]*len(self.pixels)
class Palette(list):
    def __init__(self, count): super().__init__([0]*count); self.transparent = set()
    def make_transparent(self, index): self.transparent.add(index)
class ColorConverter:
    def __init__(self, **kwargs): pass
class TileGrid:
    def __init__(self, bitmap, *, pixel_shader, x=0, y=0):
        self.bitmap, self.pixel_shader, self.x, self.y = bitmap, pixel_shader, x, y
class Group(list): pass
def raster(bitmap, shader=None):
    if bitmap._decoded is not None and not isinstance(shader, Palette):
        # Convert decoded GIF frames to the panel's RGB565 precision in native
        # Pillow operations, instead of two Python loops over every pixel.
        r,g,b = bitmap._decoded.split()
        return Image.merge('RGB', (r.point(lambda v: (v>>3)*255//31),
                                  g.point(lambda v: (v>>2)*255//63),
                                  b.point(lambda v: (v>>3)*255//31))).convert('RGBA')
    image = Image.new('RGBA', (bitmap.width, bitmap.height))
    colors = []
    for value in bitmap.pixels:
        if isinstance(shader, Palette):
            c = shader[value]; colors.append((c>>16 & 255, c>>8 & 255, c & 255, 0 if value in shader.transparent else 255))
        else: colors.append((*rgb565(value), 255))
    image.putdata(colors)
    return image
def show(image, x=0, y=0, fast=False):
    data = io.BytesIO(); image.save(data, format='PNG', compress_level=1 if fast else 6)
    call('display', {'type':'image', 'image':base64.b64encode(data.getvalue()).decode(), 'x':x, 'y':y})
class FourWire:
    def __init__(self, *args, **kwargs): pass
    def send(self, command, data):
        if command == 0x2C:
            if not isinstance(data, Bitmap): raise NotImplementedError('Raw display buffer format')
            # Firmware boot GIF is stored in portrait orientation; panel is rotated.
            show(raster(data).transpose(Image.Transpose.ROTATE_270), fast=True)
        elif command not in (0x2A, 0x2B): raise NotImplementedError('Display command '+hex(command))
class Display:
    def __init__(self, bus, init_sequence, *, width, height, **kwargs):
        self.bus, self.width, self.height, self.root_group = bus, width, height, Group()
        self.auto_refresh = False
    def refresh(self, **kwargs):
        image = Image.new('RGBA', (self.width, self.height), (0,0,0,255))
        for tile in self.root_group:
            layer = raster(tile.bitmap, tile.pixel_shader)
            image.paste(layer, (tile.x, tile.y), layer)
        show(image)
        return True
module('displayio', Bitmap=Bitmap, Palette=Palette, TileGrid=TileGrid, ColorConverter=ColorConverter,
       Colorspace=types.SimpleNamespace(RGB565_SWAPPED=1), FourWire=FourWire, Display=Display,
       Group=Group, release_displays=lambda: None)
def put_image(bitmap, image):
    bitmap.pixels[:] = [(r>>3)<<11 | (g>>2)<<5 | b>>3 for r,g,b in image.convert('RGB').getdata()]
    bitmap._decoded = None
class JpegDecoder:
    def open(self, data):
        self.image = Image.open(io.BytesIO(data)); return self.image.size
    def decode(self, bitmap): put_image(bitmap, self.image)
module('jpegio', JpegDecoder=JpegDecoder)
class OnDiskGif:
    def __init__(self, filename):
        self.image = Image.open(filename); self.width, self.height = self.image.size
        self.frame_count = self.image.n_frames; self.index = 0
        self.bitmap = Bitmap(self.width, self.height, 65536)
    def next_frame(self):
        self.image.seek(self.index)
        self.bitmap._decoded = self.image.convert('RGB')
        self.index = (self.index+1) % self.frame_count
        return self.image.info.get('duration', 100)/1000
    def deinit(self): self.image.close()
module('gifio', OnDiskGif=OnDiskGif)
