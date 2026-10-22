#pragma once
#include <Arduino.h>
#include <vector>
class TwoWire {
 int bus,address=0,reg=0,index=0;std::vector<uint8_t> tx,rx;
public:
 explicit TwoWire(int id=0):bus(id){}
 bool begin(int=-1,int=-1,uint32_t=100000){return true;}
 void setClock(uint32_t){}
 void beginTransmission(uint8_t addr){address=addr;tx.clear();}
 size_t write(uint8_t value){tx.push_back(value);return 1;}
 uint8_t endTransmission(bool=true){if(!tx.empty())reg=tx[0];return (uint8_t)rb_call(42,bus*128+address,reg);}
 size_t requestFrom(int addr,int count,bool=true){
  rx.clear();index=0;address=addr;
  // VL53L0X RESULT_RANGE_STATUS + 10: distance, big endian millimetres.
  const double value=rb_call(43,bus*128+address,reg);
  if(value<0)return 0;
  if(reg==0x1e){rx.push_back(((int)value>>8)&255);rx.push_back((int)value&255);}
  else rx.assign(std::min(32,count),0);
  if((int)rx.size()>count)rx.resize(count);return rx.size();
 }
 int available(){return rx.size()-index;}
 int read(){return available()?rx[index++]:-1;}
};
inline TwoWire Wire(0),Wire1(1);
