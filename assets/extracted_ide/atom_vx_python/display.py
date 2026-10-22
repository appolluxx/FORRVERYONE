from machine import Pin, SPI
import st7789
import ubinascii
import gc

tft = st7789.ST7789(
    SPI(1, baudrate = 30000000, sck = Pin(18), mosi = Pin(23), miso = Pin(19)),
    128,
    160,
    cs = Pin(33, Pin.OUT),
    dc = Pin(12, Pin.OUT),
    rotation = 1,
    options = 0,
    use_drawbuffer = True,
    reversed_backlight = True)
tft.init()

def color_hex(color):
    if type(color) is str:
        color = int(color[1:], 16)
    r = (color >> 16) & 0xFF
    g = (color >> 8) & 0xFF
    b = color & 0xFF
    return st7789.color565(r, g, b)

def fill(color):
    SPI(1, baudrate = 30000000, sck = Pin(18), mosi = Pin(23), miso = Pin(19))
    tft.fill(color)

def text(text, x, y, color, font):
    SPI(1, baudrate = 30000000, sck = Pin(18), mosi = Pin(23), miso = Pin(19))
    tft.write(font, text, x, y, color)
    
def line(x1, x2, y1, y2, color):
    tft.line(x1, x2, y1, y2, color)
    
def rect(x, y, width, height, color):
    tft.rect(x, y, width, height, color)
    
def fill_rect(x, y, width, height, color):
    tft.fill_rect(x, y, width, height, color)
    
def circle(x, y, r, color):
    tft.circle(x, y, r, color)
    
def fill_circle(x, y, r, color):
    tft.fill_circle(x, y, r, color)
    
def image(data, x, y):
    try:
        SPI(1, baudrate = 30000000, sck = Pin(18), mosi = Pin(23), miso = Pin(19))
        decoded_data = ubinascii.a2b_base64(data)
        tft.jpg(decoded_data, x, y, st7789.FAST)
    except Exception as e:
        print("Error displaying image:", e)
    gc.collect()