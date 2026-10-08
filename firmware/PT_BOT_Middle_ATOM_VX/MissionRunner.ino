// =============================================================================
// PT-BOT ATOM VX · HIGH-SPEED DYNAMIC MISSION RUNNER
// Instant 0.5-Second Serial Mission Protocol with NVS Flash Persistence
// =============================================================================

#include <Preferences.h>

#define MAX_MISSION_STEPS 64

enum CommandOp : uint8_t {
  OP_NONE = 0,
  OP_FF = 1,
  OP_BB = 2,
  OP_SPIN = 3,
  OP_SETFRONT = 4,
  OP_SETBACK = 5,
  OP_DROP_FL = 6,
  OP_DROP_FR = 7,
  OP_DROP_B = 8,
  OP_DROP_F = 9,
  OP_STOP = 10
};

struct DynamicStep {
  uint8_t op;
  int16_t param1;
  uint16_t param2;
};

DynamicStep dynamic_mission[MAX_MISSION_STEPS];
uint8_t dynamic_mission_count = 0;
bool dynamic_mission_loaded = false;

Preferences missionPrefs;

void loadMissionFromNVS() {
  missionPrefs.begin("ptbot_mission", true); // Read-only
  dynamic_mission_count = missionPrefs.getUChar("count", 0);
  if (dynamic_mission_count > 0 && dynamic_mission_count <= MAX_MISSION_STEPS) {
    size_t len = dynamic_mission_count * sizeof(DynamicStep);
    missionPrefs.getBytes("steps", dynamic_mission, len);
    dynamic_mission_loaded = true;
    Serial.print(F("[NVS] Loaded saved mission from Flash: "));
    Serial.print(dynamic_mission_count);
    Serial.println(F(" steps. Ready!"));
  } else {
    dynamic_mission_loaded = false;
  }
  missionPrefs.end();
}

void saveMissionToNVS() {
  missionPrefs.begin("ptbot_mission", false); // Read-Write
  missionPrefs.putUChar("count", dynamic_mission_count);
  size_t len = dynamic_mission_count * sizeof(DynamicStep);
  missionPrefs.putBytes("steps", dynamic_mission, len);
  missionPrefs.end();
  Serial.println(F("[NVS] Mission successfully committed to Flash."));
}

void clearMissionNVS() {
  missionPrefs.begin("ptbot_mission", false);
  missionPrefs.clear();
  missionPrefs.end();
  dynamic_mission_count = 0;
  dynamic_mission_loaded = false;
  Serial.println(F("[NVS] Cleared. Falling back to default C++ Box1-4 routines."));
}

void executeDynamicMission() {
  Serial.print(F("[RUN] Executing Dynamic Mission (Total: "));
  Serial.print(dynamic_mission_count);
  Serial.println(F(" steps)..."));

  for (uint8_t i = 0; i < dynamic_mission_count; i++) {
    DynamicStep &step = dynamic_mission[i];
    Serial.print(F(" [#"));
    Serial.print(i + 1);
    Serial.print(F("] OP:"));
    Serial.print(step.op);
    Serial.print(F(" P1:"));
    Serial.print(step.param1);
    Serial.print(F(" P2:"));
    Serial.println(step.param2);

    switch (step.op) {
      case OP_FF:
        FF(step.param1, step.param2);
        break;
      case OP_BB:
        BB(step.param1, step.param2);
        break;
      case OP_SPIN:
        spinDegree(step.param1);
        break;
      case OP_SETFRONT:
        SetFront(step.param1, step.param2);
        break;
      case OP_SETBACK:
        SetBack(step.param1, step.param2);
        break;
      case OP_DROP_FL:
        DropFL();
        break;
      case OP_DROP_FR:
        DropFR();
        break;
      case OP_DROP_B:
        DropB();
        break;
      case OP_DROP_F:
        DropF();
        break;
      case OP_STOP:
        motorStop();
        break;
      default:
        break;
    }
  }
  motorStop();
  Serial.println(F("[RUN:COMPLETE] 100 PTS Finished in target zone!"));
}

// Parse single line from Serial stream
void processMissionLine(String line) {
  line.trim();
  if (line.length() == 0) return;

  if (line == "PING") {
    Serial.println(F("PONG:ATOM_VX_READY"));
    return;
  }
  if (line == "MISSION:CLEAR") {
    clearMissionNVS();
    return;
  }
  if (line.startsWith("MISSION:START:")) {
    dynamic_mission_count = 0;
    dynamic_mission_loaded = false;
    Serial.println(F("[ACK] MISSION:START_ACCEPTED"));
    return;
  }
  if (line == "MISSION:COMMIT") {
    if (dynamic_mission_count > 0) {
      dynamic_mission_loaded = true;
      saveMissionToNVS();
      Serial.print(F("[ACK] MISSION:COMMITTED:"));
      Serial.println(dynamic_mission_count);
    } else {
      Serial.println(F("[ERR] MISSION:EMPTY"));
    }
    return;
  }

  // Parse step format: STEP:<idx>:<OP>:<P1>:<P2>
  // e.g. STEP:1:FF:88:360 or STEP:2:SPIN:90:0
  if (line.startsWith("STEP:")) {
    int firstColon = line.indexOf(':', 5);
    int secondColon = line.indexOf(':', firstColon + 1);
    int thirdColon = line.indexOf(':', secondColon + 1);

    if (firstColon > 0 && secondColon > 0) {
      String opStr = line.substring(firstColon + 1, secondColon);
      opStr.toUpperCase();
      int p1 = 0;
      int p2 = 0;

      if (thirdColon > 0) {
        p1 = line.substring(secondColon + 1, thirdColon).toInt();
        p2 = line.substring(thirdColon + 1).toInt();
      } else {
        p1 = line.substring(secondColon + 1).toInt();
      }

      uint8_t opCode = OP_NONE;
      if (opStr == "FF") opCode = OP_FF;
      else if (opStr == "BB") opCode = OP_BB;
      else if (opStr == "SPIN") opCode = OP_SPIN;
      else if (opStr == "SETFRONT") opCode = OP_SETFRONT;
      else if (opStr == "SETBACK") opCode = OP_SETBACK;
      else if (opStr == "DROP_FL" || opStr == "DROPFL") opCode = OP_DROP_FL;
      else if (opStr == "DROP_FR" || opStr == "DROPFR") opCode = OP_DROP_FR;
      else if (opStr == "DROP_B" || opStr == "DROPB") opCode = OP_DROP_B;
      else if (opStr == "DROP_F" || opStr == "DROPF") opCode = OP_DROP_F;
      else if (opStr == "STOP") opCode = OP_STOP;

      if (opCode != OP_NONE && dynamic_mission_count < MAX_MISSION_STEPS) {
        dynamic_mission[dynamic_mission_count].op = opCode;
        dynamic_mission[dynamic_mission_count].param1 = p1;
        dynamic_mission[dynamic_mission_count].param2 = p2;
        dynamic_mission_count++;
        Serial.print(F("[STEP:OK] "));
        Serial.println(dynamic_mission_count);
      }
    }
  }
}

void checkSerialMission() {
  while (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    processMissionLine(line);
  }
}
