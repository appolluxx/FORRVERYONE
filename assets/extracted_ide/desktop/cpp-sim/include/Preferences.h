// SIM adapter for the Arduino-ESP32 Preferences API; raw bytes retain 64-bit precision.
#pragma once
#include <Arduino.h>
#include <cstring>
#include <vector>
enum PreferenceType { PT_I8,PT_U8,PT_I16,PT_U16,PT_I32,PT_U32,PT_I64,PT_U64,PT_STR,PT_BLOB,PT_INVALID };
extern "C" __attribute__((import_module("roboblocks"),import_name("preferences"))) int rb_preferences(int,const char*,const char*,const char*,int,void*,size_t);
class Preferences {
 std::string ns,partition;bool started=false,readOnly=false;
 int request(int op,const char* key,int type=0,void* data=nullptr,size_t len=0){return rb_preferences(op,ns.c_str(),partition.c_str(),key?key:"",type,data,len);}
 size_t put(const char* key,int type,const void* data,size_t len){if(!started||readOnly||!key||!data||!len)return 0;return request(1,key,type,const_cast<void*>(data),len);}
 template<class T>T get(const char* key,int type,T fallback){T value;if(!started||!key||request(2,key,type,&value,sizeof(value))!=sizeof(value))return fallback;return value;}
public:
 bool begin(const char* name,bool ro=false,const char* label=nullptr){if(started||!name||!strlen(name)||strlen(name)>15)return false;ns=name;partition=label?label:"nvs";readOnly=ro;started=request(0,"",ro)!=0;return started;}
 void end(){started=false;}
 bool clear(){return started&&!readOnly&&request(4,"");}
 bool remove(const char* key){return started&&!readOnly&&key&&request(5,key);}
 PreferenceType getType(const char* key){return started&&key?(PreferenceType)request(3,key):PT_INVALID;}
 bool isKey(const char* key){return getType(key)!=PT_INVALID;}
 size_t putChar(const char* key,int8_t value){return put(key,PT_I8,&value,sizeof(value));}
 int8_t getChar(const char* key,int8_t fallback=0){return get<int8_t>(key,PT_I8,fallback);}
 size_t putUChar(const char* key,uint8_t value){return put(key,PT_U8,&value,sizeof(value));}
 uint8_t getUChar(const char* key,uint8_t fallback=0){return get<uint8_t>(key,PT_U8,fallback);}
 size_t putShort(const char* key,int16_t value){return put(key,PT_I16,&value,sizeof(value));}
 int16_t getShort(const char* key,int16_t fallback=0){return get<int16_t>(key,PT_I16,fallback);}
 size_t putUShort(const char* key,uint16_t value){return put(key,PT_U16,&value,sizeof(value));}
 uint16_t getUShort(const char* key,uint16_t fallback=0){return get<uint16_t>(key,PT_U16,fallback);}
 size_t putInt(const char* key,int32_t value){return put(key,PT_I32,&value,sizeof(value));}
 int32_t getInt(const char* key,int32_t fallback=0){return get<int32_t>(key,PT_I32,fallback);}
 size_t putUInt(const char* key,uint32_t value){return put(key,PT_U32,&value,sizeof(value));}
 uint32_t getUInt(const char* key,uint32_t fallback=0){return get<uint32_t>(key,PT_U32,fallback);}
 size_t putLong(const char* key,int32_t value){return put(key,PT_I32,&value,sizeof(value));}
 int32_t getLong(const char* key,int32_t fallback=0){return get<int32_t>(key,PT_I32,fallback);}
 size_t putULong(const char* key,uint32_t value){return put(key,PT_U32,&value,sizeof(value));}
 uint32_t getULong(const char* key,uint32_t fallback=0){return get<uint32_t>(key,PT_U32,fallback);}
 size_t putLong64(const char* key,int64_t value){return put(key,PT_I64,&value,sizeof(value));}
 int64_t getLong64(const char* key,int64_t fallback=0){return get<int64_t>(key,PT_I64,fallback);}
 size_t putULong64(const char* key,uint64_t value){return put(key,PT_U64,&value,sizeof(value));}
 uint64_t getULong64(const char* key,uint64_t fallback=0){return get<uint64_t>(key,PT_U64,fallback);}
 size_t putFloat(const char* key,float value){return put(key,PT_BLOB,&value,sizeof(value));}
 float getFloat(const char* key,float fallback=NAN){return get<float>(key,PT_BLOB,fallback);}
 size_t putDouble(const char* key,double value){return put(key,PT_BLOB,&value,sizeof(value));}
 double getDouble(const char* key,double fallback=NAN){return get<double>(key,PT_BLOB,fallback);}
 size_t putBool(const char* key,bool value){return putUChar(key,value?1:0);}
 bool getBool(const char* key,bool fallback=false){return getUChar(key,fallback)!=0;}
 size_t putString(const char* key,const char* value){if(!value)return 0;const auto size=strlen(value);return put(key,PT_STR,value,size+1)?size:0;}
 size_t putString(const char* key,String value){return putString(key,value.c_str());}
 size_t getString(const char* key,char* value,size_t maxLen){return started&&key&&value&&maxLen?request(2,key,PT_STR,value,maxLen):0;}
 String getString(const char* key,String fallback=String()) {if(!started||!key)return fallback;const int len=request(2,key,PT_STR);if(len<=0)return fallback;std::vector<char> value(len);if(request(2,key,PT_STR,value.data(),len)!=len)return fallback;return String(value.data());}
 size_t putBytes(const char* key,const void* value,size_t len){return put(key,PT_BLOB,value,len);}
 size_t getBytesLength(const char* key){return started&&key?request(2,key,PT_BLOB):0;}
 size_t getBytes(const char* key,void* value,size_t len){if(!value||!len)return getBytesLength(key);return started&&key?request(2,key,PT_BLOB,value,len):0;}
 size_t freeEntries(){return request(6,"");}
};
