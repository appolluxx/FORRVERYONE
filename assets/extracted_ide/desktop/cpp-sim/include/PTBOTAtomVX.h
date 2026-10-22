#pragma once
#ifndef ROBOBLOCKS_ATOM_VX
#error "PTBOTAtomVX.h requires an ATOM VX project."
#endif
#include <Arduino.h>
#define A 0
#define B 1
inline void beep(int duration){rb_call(4,1000,duration>0?duration:0);delay(duration>0?duration:0);rb_call(4,0,0);}
inline bool switchRead(byte button,int debounce=50){
 static unsigned long released[2]={0,0};
 if(button>1)return false;
 const bool pressed=rb_call(2,button,0)!=0;
 const auto now=millis();
 if(!pressed){released[button]=now;return false;}
 return now-released[button]>=(unsigned long)max(0,debounce);
}

#define ROLL 0
#define PITCH 1
#define YAW 2
#define ADC0 0
#define ADC1 1
#define ADC2 2
#define ADC3 3
#define ADC4 4
#define ADC5 5
#define ADC6 6
#define ADC7 7
#define ST77XX_BLACK 0x0000
#define ST77XX_WHITE 0xffff
#define ST77XX_RED 0xf800
#define ST77XX_GREEN 0x07e0
#define ST77XX_BLUE 0x001f
#define ST77XX_YELLOW 0xffe0
#define ST77XX_CYAN 0x07ff
#define ST77XX_MAGENTA 0xf81f
#define ST77XX_ORANGE 0xfd20
inline void motorWrite(byte motor,int speed){rb_call(10,motor,constrain(speed,-100,100));}
inline void motorWrite(int a,int b,int c,int d){motorWrite(1,a);motorWrite(2,b);motorWrite(3,c);motorWrite(4,d);}
inline void motorStop(){motorWrite(0,0,0,0);}
inline void servoWrite(byte channel,byte degree){if(channel<=6)rb_call(11,channel,min(180,(int)degree));}
inline int adcRead(byte channel){return channel<=7?(int)rb_call(12,channel,0):-1;}
inline int knobRead(){return (int)rb_call(13,0,0);}
inline float angleRead(byte axis){return axis<=2?rb_call(14,axis,0):-1;}
inline void setAngleOffset(){for(int axis=0;axis<3;axis++)rb_call(15,axis,0);}
inline void setEnableIMU(bool enabled){rb_call(22,enabled,0);}
inline void calibrateIMU(){rb_call(23,0,0);}
inline float normalize360(float angle){return fmod(fmod(angle,360.0f)+360.0f,360.0f);}
inline bool waitForStableOrientation(float threshold=.05,int stableCount=50){
 float previous=angleRead(YAW);int stable=0;
 while(stable<stableCount){delay(20);float now=angleRead(YAW);float delta=fabs(now-previous);if(min(delta,360-delta)<threshold)stable++;else stable=0;previous=now;}
 return true;
}
extern "C" __attribute__((import_module("roboblocks"),import_name("display"))) void rb_display(int,int,int,int,int,int,const void*,int);
inline int rb_text_size=1;
inline void lcdClear(){rb_display(0,0,0,0,0,ST77XX_BLACK,nullptr,0);}
inline void lcdSetTextSize(byte size){rb_text_size=max(1,(int)size);}
inline void lcdPrintText(byte x,byte y,String text,int color){rb_display(1,x,y,rb_text_size,0,color,text.data(),text.length());}
inline void drawBitmap(int16_t x,int16_t y,const uint16_t* pixels,int16_t w,int16_t h){if(w>0&&h>0)rb_display(2,x,y,w,h,0,pixels,w*h);}
inline void lcdDrawChart(int values[],int count){if(count>0)rb_display(3,0,0,0,0,0,values,count);}

#include "atom-boot-logo.h"
#include <Wire.h>
inline const auto& logo=rb_atom_boot_logo;
class SimTFT {
 int x=0,y=0,size=1,color=ST77XX_WHITE,rotation=1;
public:
 void setRotation(uint8_t value){rotation=value&3;}
 void setCursor(int a,int b){x=a;y=b;}
 void setTextSize(uint8_t value){size=max(1,(int)value);}
 void setTextColor(uint16_t value){color=value;}
 void fillScreen(uint16_t value){rb_display(0,0,0,0,0,value,nullptr,0);}
 void fillRect(int a,int b,int w,int h,uint16_t value){rb_display(4,a,b,w,h,value,nullptr,rotation);}
 void drawRect(int a,int b,int w,int h,uint16_t value){rb_display(9,a,b,w,h,value,nullptr,rotation);}
 void drawLine(int a,int b,int c,int d,uint16_t value){rb_display(8,a,b,c,d,value,nullptr,rotation);}
 void drawFastHLine(int a,int b,int w,uint16_t value){if(w>0)fillRect(a,b,w,1,value);}
 void drawFastVLine(int a,int b,int h,uint16_t value){if(h>0)fillRect(a,b,1,h,value);}
 void drawPixel(int a,int b,uint16_t value){fillRect(a,b,1,1,value);}
 void fillCircle(int a,int b,int radius,uint16_t value){rb_display(6,a,b,radius,1,value,nullptr,rotation);}
 void drawCircle(int a,int b,int radius,uint16_t value){rb_display(6,a,b,radius,0,value,nullptr,rotation);}
 void fillRoundRect(int a,int b,int w,int h,int radius,uint16_t value){rb_display(7,a,b,w,h,value,(void*)(uintptr_t)max(0,radius),rotation*2+1);}
 void drawRoundRect(int a,int b,int w,int h,int radius,uint16_t value){rb_display(7,a,b,w,h,value,(void*)(uintptr_t)max(0,radius),rotation*2);}
 size_t print(const char* text){size_t len=strlen(text);rb_display(5,x,y,size,rotation,color,text,len);x+=len*6*size;return len;}
 size_t print(const String& text){return print(text.c_str());}
 template<class T> size_t print(T value){return print(String(value));}
};
inline SimTFT tft;
inline void initialize(){delay(500);motorStop();setAngleOffset();lcdClear();drawBitmap(0,0,rb_atom_boot_logo,160,128);beep(100);delay(50);beep(50);}
