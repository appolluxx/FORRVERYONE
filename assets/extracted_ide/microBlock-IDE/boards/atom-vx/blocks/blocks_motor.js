Blockly.defineBlocksWithJsonArray([
  {
    "type": "motor_set",
    "message0": "%1 set motor drive %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "motor",
        "options": [
          ["2WD", "WD2"],
          ["4WD", "WD4"],
        ]
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
    "type": "motor_drive_single",
    "message0": "%1 motor %2 speed %3 %",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "motor",
        "options": [
          ["1", "1"],
          ["2", "2"],
          ["3", "3"],
          ["4", "4"]
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
    "message0": "%1 move all %2 motor 1 %3 motor 2 %4 motor 3 %5 motor 4 %6",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
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
      },
      {
        "type": "input_value",
        "name": "speed3",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "speed4",
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
    "type": "motor_move",
    "message0": "%1 move %2 speed %3 %",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
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
        "src": `boards/atom-vx/images/motor.png`,
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
        "src": `boards/atom-vx/images/motor.png`,
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
        "src": `boards/atom-vx/images/motor.png`,
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
    "type": "motor_move_mecanum",
    "message0": "%1 move mecanum %2 linear velocity x %3 linear velocity y %4 angular velocity %5",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "vx",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "vy",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "r",
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
    "type": "motor_set_ramp_using_imu",
    "message0": "%1 set ramp up %2 ramp down %3 seconds",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
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
        "src": `boards/atom-vx/images/motor.png`,
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
        "src": `boards/atom-vx/images/motor.png`,
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
        "src": `boards/atom-vx/images/motor.png`,
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
        "src": `boards/atom-vx/images/motor.png`,
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
    "message0": "%1 spin degree %2 angle %3 slow angle %4 stop threshold %5 min speed %6 max speed %7 KP %8 KD %9",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
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
        "name": "slow_angle",
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
    "message0": "%1 turn degree front %2 angle %3 slow angle %4 stop threshold %5 min speed %6 max speed %7 KP %8 KD %9",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
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
        "name": "slow_angle",
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
    "message0": "%1 turn degree back %2 angle %3 slow angle %4 stop threshold %5 min speed %6 max speed %7 KP %8 KD %9",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
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
        "name": "slow_angle",
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
    "type": "motor_stop",
    "message0": "%1 motor stop",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
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
    "type": "ddsm210_init",
    "message0": "%1 DDSM210 initialize",
    "message1": "TX %1",
    "message2": "RX %1",
    "message3": "baud rate %1",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      }
    ],
    "args1": [
      {
        "type": "input_value",
        "name": "tx",
        "check": "tx_pin_type",
        "align": "RIGHT"
      }
    ],
    "args2": [
      {
        "type": "input_value",
        "name": "rx",
        "check": "rx_pin_type",
        "align": "RIGHT"
      }
    ],
    "args3": [
      {
        "type": "input_value",
        "name": "baud",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "Initialize UART bus for DDSM210 motors",
    "helpUrl": ""
  },
  {
    "type": "ddsm210_set_id",
    "message0": "%1 DDSM210 set ID %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "new_id",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "Set DDSM210 motor ID. Connect only one motor on the bus.",
    "helpUrl": ""
  },
  {
    "type": "ddsm210_set_velocity",
    "message0": "%1 DDSM210 motor ID %2 speed %3 RPM",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "motor_id",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "rpm",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "Set DDSM210 motor velocity in RPM",
    "helpUrl": ""
  },
  {
    "type": "ddsm210_diff_drive",
    "message0": "%1 DDSM210 move diff drive %2 linear velocity x (m/s) %3 angular velocity (rad/s) %4 left motor ID %5 right motor ID %6 wheel radius (mm) %7 wheel base (mm) %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "linear_x",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "angular_z",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "left_id",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "right_id",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "wheel_radius",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "wheel_base",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#3498DB",
    "tooltip": "Convert differential-drive linear/angular velocity to DDSM210 wheel RPM",
    "helpUrl": ""
  },
  {
    "type": "ddsm210_read_velocity",
    "message0": "%1 DDSM210 read speed motor ID %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/motor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "motor_id",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "output": null,
    "colour": "#3498DB",
    "tooltip": "Read DDSM210 feedback: (rpm, temperature, error_code)",
    "helpUrl": ""
  }
]);
