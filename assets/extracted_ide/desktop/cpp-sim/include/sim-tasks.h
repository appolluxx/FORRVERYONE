#pragma once
#include <stdint.h>
using TaskHandle_t=void*;
using TaskFunction_t=void(*)(void*);
using BaseType_t=int;
using UBaseType_t=unsigned int;
using TickType_t=uint32_t;
#define portTICK_PERIOD_MS 1
#define pdMS_TO_TICKS(ms) (ms)
#define pdPASS 1
#define pdTRUE 1
#define pdFALSE 0
struct RBTask {TaskFunction_t fn;void* arg;};
inline RBTask rb_tasks[16]={};
inline int rb_task_count=0;
inline BaseType_t xTaskCreatePinnedToCore(TaskFunction_t fn,const char*,uint32_t,void* arg,UBaseType_t priority,TaskHandle_t* handle,BaseType_t){
 if(rb_task_count>=16)return 0;int id=++rb_task_count;rb_tasks[id-1]={fn,arg};if(handle)*handle=(void*)(uintptr_t)id;rb_call(30,id,priority);return pdPASS;
}
inline BaseType_t xTaskCreate(TaskFunction_t fn,const char* name,uint32_t size,void* arg,UBaseType_t priority,TaskHandle_t* handle){return xTaskCreatePinnedToCore(fn,name,size,arg,priority,handle,0);}
inline void vTaskDelay(TickType_t ticks){delay(ticks);}
inline void vTaskSuspend(TaskHandle_t task){rb_call(31,(uintptr_t)task,0);}
inline void vTaskResume(TaskHandle_t task){rb_call(32,(uintptr_t)task,0);}
inline void vTaskDelete(TaskHandle_t task){rb_call(33,(uintptr_t)task,0);}
inline void taskYIELD(){delay(0);}
