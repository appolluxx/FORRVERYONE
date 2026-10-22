Blockly.defineBlocksWithJsonArray([
  {
    "type": "motor_drive_single",
    "message0": "%1 motor %2 speed %3 %",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "motor",
        "options": [
          ["left", "1"],
          ["right", "2"]
        ]
      },
      {
        "type": "input_value",
        "name": "speed",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_drive_all",
    "message0": "%1 speed left %2 speed right %3",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "speed1",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "speed2",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_move",
    "message0": "%1 move %2 speed %3 %",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "move",
        "options": [
          ["forward", "forward"],
          ["backward", "backward"]
        ]
      },
      {
        "type": "input_value",
        "name": "speed",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_turn_front",
    "message0": "%1 turn front %2 speed %3 %",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "turn",
        "options": [
          ["left", "left"],
          ["right", "right"]
        ]
      },
      {
        "type": "input_value",
        "name": "speed",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_turn_back",
    "message0": "%1 turn back %2 speed %3 %",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "turn",
        "options": [
          ["left", "left"],
          ["right", "right"]
        ]
      },
      {
        "type": "input_value",
        "name": "speed",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_spin",
    "message0": "%1 spin %2 speed %3 %",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "spin",
        "options": [
          ["left", "left"],
          ["right", "right"]
        ]
      },
      {
        "type": "input_value",
        "name": "speed",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_stop",
    "message0": "%1 motor stop",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_set_ramp",
    "message0": "%1 set ramp up %2 ramp down %3 seconds",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "ramp_up",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "ramp_down",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_move_forward_degree",
    "message0": "%1 move forward degree %2 angle %3 min speed %4 max speed %5 KP %6 KD %7",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "angle",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "min_speed",
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
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_move_backward_degree",
    "message0": "%1 move backward degree %2 angle %3 min speed %4 max speed %5 KP %6 KD %7",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "angle",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "min_speed",
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
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_move_forward_degree_time",
    "message0": "%1 move forward degree %2 angle %3 start speed %4 max speed %5 KP %6 KD %7 time %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "angle",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "start_speed",
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
      },
      {
        "type": "input_value",
        "name": "time",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_move_backward_degree_time",
    "message0": "%1 move backward degree %2 angle %3 start speed %4 max speed %5 KP %6 KD %7 time %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "angle",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "start_speed",
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
      },
      {
        "type": "input_value",
        "name": "time",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_spin_degree",
    "message0": "%1 spin degree %2 angle %3 stop threshold %4 min speed %5 max speed %6 KP %7 KD %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "angle",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "stop_threshold",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "min_speed",
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
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_turn_degree_front",
    "message0": "%1 turn degree front %2 angle %3 stop threshold %4 min speed %5 max speed %6 KP %7 KD %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "angle",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "stop_threshold",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "min_speed",
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
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "motor_turn_degree_back",
    "message0": "%1 turn degree back %2 angle %3 stop threshold %4 min speed %5 max speed %6 KP %7 KD %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "angle",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "stop_threshold",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "min_speed",
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
    "colour": "#3498DB",
    "tooltip": "",
    "helpUrl": ""
  }
]);