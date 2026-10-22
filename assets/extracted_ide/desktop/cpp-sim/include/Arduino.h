#pragma once
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <math.h>
#include <string>
#include <algorithm>
using byte = uint8_t;
using boolean = bool;
class String: public std::string {
public:
 using std::string::string;
 String(const std::string& s):std::string(s){}
 String(int n):std::string(std::to_string(n)){}
 String(unsigned int n):std::string(std::to_string(n)){}
 String(long n):std::string(std::to_string(n)){}
 String(unsigned long n):std::string(std::to_string(n)){}
 String(double n,unsigned char digits=2){char b[96];snprintf(b,sizeof(b),"%.*f",std::min(12,(int)digits),n);assign(b);}
 long toInt()const{return strtol(c_str(),nullptr,10);}
 float toFloat()const{return strtof(c_str(),nullptr);}
};
using std::min;
using std::max;
#define HIGH 1
#define LOW 0
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define DEC 10
#define HEX 16
#define OCT 8
#define BIN 2
#define F(value) value
#define PROGMEM
extern "C" __attribute__((import_module("roboblocks"),import_name("call"))) double rb_call(int,double,double);
extern "C" __attribute__((import_module("roboblocks"),import_name("write"))) void rb_write(const char*,size_t);
inline unsigned long millis(){return (unsigned long)rb_call(0,0,0);}
inline unsigned long micros(){return (unsigned long)(rb_call(0,0,0)*1000);}
inline void delay(unsigned long ms){rb_call(1,ms,0);}
inline void delayMicroseconds(unsigned int us){rb_call(1,us/1000.0,0);}
inline void yield(){delay(1);}
inline void pinMode(int pin,int mode){rb_call(6,pin,mode);}
inline int digitalRead(int pin){return (int)rb_call(3,pin,0);}
inline int analogRead(int pin){return (int)rb_call(7,pin,0);}
inline void digitalWrite(int pin,int value){rb_call(8,pin,value);}
inline void analogWrite(int pin,int value){rb_call(20,pin,value);}
inline void analogReadResolution(int bits){rb_call(21,bits,0);}
inline unsigned long pulseIn(int pin,int level,unsigned long timeout=1000000){if(level!=HIGH)return 0;return (unsigned long)rb_call(16,pin,timeout);}
template<class T,class L,class H> inline auto constrain(T n,L low,H high){using V=typename std::common_type<T,L,H>::type;return min(V(high),max(V(low),V(n)));}
inline long map(long n,long a,long b,long x,long y){return (n-a)*(y-x)/(b-a)+x;}
inline void tone(int pin,unsigned int frequency,unsigned long duration=0){rb_call(4,frequency,duration);}
inline void noTone(int pin){rb_call(4,0,0);}
class HardwareSerial {
public:
 void begin(unsigned long){}
 void end(){}
 operator bool()const{return true;}
 size_t print(const char* s){size_t n=std::char_traits<char>::length(s);rb_write(s,n);return n;}
 size_t print(char* s){return print(static_cast<const char*>(s));}
 size_t print(const String& s){rb_write(s.data(),s.size());return s.size();}
 size_t print(const std::string& s){rb_write(s.data(),s.size());return s.size();}
 size_t print(char c){rb_write(&c,1);return 1;}
 size_t print(double n,int digits=2){char s[96];snprintf(s,sizeof(s),"%.*f",std::min(12,std::max(0,digits)),n);return print(s);}
 template<class T> size_t print(T n){return print(std::to_string(n));}
 size_t println(){return print("\n");}
 template<class T> size_t println(const T& n){return print(n)+println();}
 size_t println(double n,int digits){return print(n,digits)+println();}
 template<class... Args> int printf(const char* format,Args... args){char s[2048];int n=snprintf(s,sizeof(s),format,args...);if(n>0)rb_write(s,std::min(n,2047));return n;}
 int available(){return 0;}
};
inline HardwareSerial Serial;
#include "sim-tasks.h"
