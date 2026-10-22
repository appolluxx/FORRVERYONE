#include <Arduino.h>
#include <stdlib.h>
void setup();
void loop();
extern "C" void rb_setup(){setup();}
extern "C" void rb_loop(){loop();}
extern "C" int rb_requires_tasks(){return RB_REQUIRES_TASKS;}
extern "C" void rb_program(){setup();for(;;){loop();delay(1);}}
extern "C" void rb_task_run(int id){if(id>0&&id<=rb_task_count)rb_tasks[id-1].fn(rb_tasks[id-1].arg);}
extern "C" uintptr_t rb_stack_alloc(){return ((uintptr_t)malloc(256*1024)+256*1024)&~(uintptr_t)15;}
