Blockly.defineBlocksWithJsonArray([
  {
    "type": "line_follower_calibrate",
    "message0": "%1 calibrate sensor",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/line_follower.png`,
        "width": 20,
        "height": 20
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#E03434",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "line_follower_read_line_position",
    "message0": "%1 read line position",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/line_follower.png`,
        "width": 20,
        "height": 20
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#E03434",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "line_follower_follow_line",
    "message0": "%1 follow line %2 base speed %3 max speed %4 KP %5 KD %6",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/line_follower.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "base_speed",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "max_speed",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "KP",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "KD",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#E03434",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "line_follower_follow_line_time",
    "message0": "%1 follow line check time %2 start speed %3 end speed %4 KP %5 KD %6 time %7 stop %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/line_follower.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "start_speed",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "end_speed",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "KP",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "KD",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "time",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "stop",
        "check": "Boolean",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#E03434",
    "tooltip": "",
    "helpUrl": ""
  }
]);

Blockly.Blocks['line_follower_junction'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        [{
          "src": "boards/buildbot/images/line_left.png",
          "width": 40,
          "height": 40
        }, "line_left"],
        [{
          "src": "boards/buildbot/images/line_center.png",
          "width": 40,
          "height": 40
        }, "line_center"],
        [{
          "src": "boards/buildbot/images/line_right.png",
          "width": 40,
          "height": 40
        }, "line_right"]
      ]), "junction_type");
    this.setOutput(true, "junction_type");
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_stop_point'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ["front sensor", "sensor_front"],
        ["side sensor", "sensor_side"],
        ["no stop", "no_stop"],
      ]), "stop_point");
    this.setOutput(true, "stop_point");
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_postion_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ["ADC0", "0"],
        ["ADC1", "1"],
        ["ADC2", "2"],
        ["ADC3", "3"],
        ["ADC4", "4"],
        ["ADC5", "5"],
        ["ADC6", "6"],
        ["ADC7", "7"],
        ["ADC8", "8"],
        ["ADC9", "9"]
      ]), "position");
    this.setOutput(true, "postion_sensor_type");
    this.setInputsInline(true);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_postion_sensor_front'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ["ADC0", "0"],
        ["ADC1", "1"],
        ["ADC2", "2"],
        ["ADC3", "3"],
        ["ADC4", "4"],
        ["ADC5", "5"],
        ["ADC6", "6"],
        ["ADC7", "7"]
      ]), "position");
    this.setOutput(true, "postion_sensor_front_type");
    this.setInputsInline(true);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_turn_direction'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ["left", "left"],
        ["right", "right"]
      ]), "direction");
    this.setOutput(true, "turn_direction_type");
    this.setInputsInline(true);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_read_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/buildbot/images/line_follower.png", 20, 20))
      .appendField("read sensor")
      .appendField(new Blockly.FieldDropdown([
        ["ADC0", "0"],
        ["ADC1", "1"],
        ["ADC2", "2"],
        ["ADC3", "3"],
        ["ADC4", "4"],
        ["ADC5", "5"],
        ["ADC6", "6"],
        ["ADC7", "7"],
        ["ADC8", "8"],
        ["ADC9", "9"]
      ]), "position");
    this.setOutput(true, ["Number", "Boolean"]);
    this.setInputsInline(true);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_read_sensor_calibrated'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/buildbot/images/line_follower.png", 20, 20))
      .appendField("read calibrated sensor")
      .appendField(new Blockly.FieldDropdown([
        ["ADC0", "0"],
        ["ADC1", "1"],
        ["ADC2", "2"],
        ["ADC3", "3"],
        ["ADC4", "4"],
        ["ADC5", "5"],
        ["ADC6", "6"],
        ["ADC7", "7"],
        ["ADC8", "8"],
        ["ADC9", "9"]
      ]), "position");
    this.setOutput(true, ["Number", "Boolean"]);
    this.setInputsInline(true);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_follow_line_junction'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/buildbot/images/line_follower.png", 20, 20))
      .appendField("follow line check junction");
    this.appendValueInput("start_speed")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("start speed");
    this.appendValueInput("max_speed")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("max speed");
    this.appendValueInput("KP")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("KP");
    this.appendValueInput("KD")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("KD");
    this.appendValueInput("junction")
      .setCheck("junction_type")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("check junction");
    this.appendValueInput("count")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("count");
    this.appendValueInput("stop_point")
      .setCheck("stop_point")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("stop point");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_follow_line_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/buildbot/images/line_follower.png", 20, 20))
      .appendField("follow line check sensor");
    this.appendValueInput("start_speed")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("start speed");
    this.appendValueInput("max_speed")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("max speed");
    this.appendValueInput("KP")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("KP");
    this.appendValueInput("KD")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("KD");
    this.appendValueInput("postion_sensor")
      .setCheck("postion_sensor_type")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("check sensor");
    this.appendValueInput("count")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("count");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_move_check_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/buildbot/images/line_follower.png", 20, 20))
      .appendField("move check sensor");
    this.appendValueInput("motor_left")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("motor left");
    this.appendValueInput("motor_right")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("motor right");
    this.appendValueInput("postion_sensor")
      .setCheck("postion_sensor_type")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("check sensor");
    this.appendValueInput("count")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("count");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_spin_check_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/buildbot/images/line_follower.png", 20, 20))
      .appendField("spin check sensor");
    this.appendValueInput("direction")
      .setCheck("turn_direction_type")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("direction");
    this.appendValueInput("slow_speed")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("slow speed");
    this.appendValueInput("fast_speed")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("fast speed");
    this.appendValueInput("fast_speed_time")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("fast speed time");
    this.appendValueInput("postion_sensor")
      .setCheck("postion_sensor_front_type")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("check sensor");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['line_follower_turn_check_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/buildbot/images/line_follower.png", 20, 20))
      .appendField("turn check sensor");
    this.appendValueInput("direction")
      .setCheck("turn_direction_type")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("direction");
    this.appendValueInput("slow_speed")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("slow speed");
    this.appendValueInput("fast_speed")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("fast speed");
    this.appendValueInput("fast_speed_time")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("fast speed time");
    this.appendValueInput("postion_sensor")
      .setCheck("postion_sensor_front_type")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("check sensor");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#E03434");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};