Blockly.defineBlocksWithJsonArray([
  {
    "type": "gamepad_auto_connect",
    "message0": "%1 gamepad auto connect",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "gamepad_delete_device",
    "message0": "%1 gamepad delete device",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#4C49F2",
    "helpUrl": ""
  },
  {
    "type": "gamepad_is_connected",
    "message0": "%1 gamepad is connected ?",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "gamepad_read_button",
    "message0": "%1 gamepad read button %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "button",
        "options": [
          ["UP", "UP"],
          ["DOWN", "DOWN"],
          ["LEFT", "LEFT"],
          ["RIGHT", "RIGHT"],
          ["CROSS", "CROSS"],
          ["CIRCLE", "CIRCLE"],
          ["SQUARE", "SQUARE"],
          ["TRIANGLE", "TRIANGLE"],
          ["L1", "L1"],
          ["L2", "L2"],
          ["R1", "R1"],
          ["R2", "R2"],
          ["THUMB L", "THUMB_L"],
          ["THUMB R", "THUMB_R"],
          ["PS", "PS"],
          ["SHARE", "SHARE"],
          ["OPTIONS", "OPTIONS"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "gamepad_read_analog",
    "message0": "%1 gamepad read analog %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "axis",
        "options": [
          ["LX", "LX"],
          ["LY", "LY"],
          ["RX", "RX"],
          ["RY", "RY"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "gamepad_read_gyro",
    "message0": "%1 gamepad read gyroscope %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "axis",
        "options": [
          ["X", "X"],
          ["Y", "Y"],
          ["Z", "Z"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "gamepad_read_accel",
    "message0": "%1 gamepad read accelerometer %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "axis",
        "options": [
          ["X", "X"],
          ["Y", "Y"],
          ["Z", "Z"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "gamepad_set_lightbar_color",
    "message0": "%1 gamepad set lightbar color %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      },
      {
        'type': 'field_colour',
        'name': 'color',
        'colour': '#00FF00',
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#4C49F2",
    "helpUrl": ""
  },
  {
    "type": "gamepad_set_rumble",
    "message0": "%1 gamepad set rumble %2 seconds",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "duration",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#4C49F2",
    "helpUrl": ""
  },
  {
    "type": "ps2_auto_connect",
    "message0": "%1 PS2 auto connect",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "ps2_is_connected",
    "message0": "%1 PS2 is connected ?",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "ps2_read_button",
    "message0": "%1 PS2 read button %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "button",
        "options": [
          ["UP", "UP"],
          ["DOWN", "DOWN"],
          ["LEFT", "LEFT"],
          ["RIGHT", "RIGHT"],
          ["CROSS", "CROSS"],
          ["CIRCLE", "CIRCLE"],
          ["SQUARE", "SQUARE"],
          ["TRIANGLE", "TRIANGLE"],
          ["L1", "L1"],
          ["L2", "L2"],
          ["R1", "R1"],
          ["R2", "R2"],
          ["SELECT", "SELECT"],
          ["START", "START"],
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "ps2_read_analog",
    "message0": "%1 PS2 read analog %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/gamepad.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "axis",
        "options": [
          ["LX", "LX"],
          ["LY", "LY"],
          ["RX", "RX"],
          ["RY", "RY"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#4C49F2",
    "tooltip": "",
    "helpUrl": ""
  }
]);