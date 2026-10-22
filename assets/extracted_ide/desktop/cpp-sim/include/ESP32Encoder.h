#pragma once
#include <Arduino.h>
enum class puType {none,up,down};
class ESP32Encoder {
 int pinA=-1,pinB=-1,mode=4;int64_t offset=0,pausedCount=0;bool paused=false;
 int64_t raw(){return pinA<0?0:(int64_t)rb_call(40,pinA,pinB)*(double)mode/4;}
public:
 inline static puType useInternalWeakPullResistors=puType::none;
 void attachFullQuad(int a,int b){pinA=a;pinB=b;mode=4;clearCount();}
 void attachHalfQuad(int a,int b){pinA=a;pinB=b;mode=2;clearCount();}
 void attachSingleEdge(int a,int b){pinA=a;pinB=b;mode=1;clearCount();}
 int64_t getCount(){return paused?pausedCount:raw()+offset;}
 int64_t clearCount(){setCount(0);return 0;}
 void setCount(int64_t value){offset=value-raw();pausedCount=value;}
 void pauseCount(){pausedCount=getCount();paused=true;}
 void resumeCount(){offset=pausedCount-raw();paused=false;}
 void detach(){pinA=pinB=-1;}
 void setFilter(uint16_t){}
};
