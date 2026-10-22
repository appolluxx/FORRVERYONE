Blockly.defineBlocksWithJsonArray([
  {
    "type": "imu_set_offset",
    "message0": "%1 set angle %2 to %3 degree",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "angle",
        "options": [
          ["roll", "roll"],
          ["pitch", "pitch"],
          ["yaw", "yaw"]
        ]
      },
      {
        "type": "input_value",
        "name": "degree",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "imu_read_angle",
    "message0": "%1 read angle %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "angle",
        "options": [
          ["roll", "roll"],
          ["pitch", "pitch"],
          ["yaw", "yaw"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "imu_read_quaternion",
    "message0": "%1 read quaternion %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "value",
        "options": [
          ["qw", "0"],
          ["qx", "1"],
          ["qy", "2"],
          ["qz", "3"]
        ]
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "imu_read_accel",
    "message0": "%1 read acceleration %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "axis",
        "options": [
          ["ax", "0"],
          ["ay", "1"],
          ["az", "2"]
        ]
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "imu_read_gyro",
    "message0": "%1 read gyroscope %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "axis",
        "options": [
          ["gx", "0"],
          ["gy", "1"],
          ["gz", "2"]
        ]
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "ultrasonic_read_distance",
    "message0": "%1 ultrasonic read trigger %2 echo %3",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "trigger_pin",
        "options": [
          ["IO2", "2"],
          ["IO4", "4"],
          ["IO5", "5"],
          ["IO13", "13"],
          ["IO14", "14"],
          ["IO25", "25"],
          ["IO26", "26"],
          ["IO27", "27"],
          ["RX2", "16"],
          ["TX2", "17"]
        ]
      },
      {
        "type": "field_dropdown",
        "name": "echo_pin",
        "options": [
          ["IO2", "2"],
          ["IO4", "4"],
          ["IO5", "5"],
          ["IO13", "13"],
          ["IO14", "14"],
          ["IO25", "25"],
          ["IO26", "26"],
          ["IO27", "27"],
          ["IO34", "34"],
          ["IO35", "35"],
          ["IO36", "36"],
          ["IO39", "39"],
          ["RX2", "16"],
          ["TX2", "17"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "vl53L0x_read_distance",
    "message0": "%1 VL53L0X read scl %2 sda %3",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "scl_pin",
        "options": [
          ["IO2", "2"],
          ["IO4", "4"],
          ["IO5", "5"],
          ["IO13", "13"],
          ["IO14", "14"],
          ["IO25", "25"],
          ["IO26", "26"],
          ["IO27", "27"],
          ["IO34", "34"],
          ["IO35", "35"],
          ["IO36", "36"],
          ["IO39", "39"],
          ["RX2", "16"],
          ["TX2", "17"]
        ]
      },
      {
        "type": "field_dropdown",
        "name": "sda_pin",
        "options": [
          ["IO2", "2"],
          ["IO4", "4"],
          ["IO5", "5"],
          ["IO13", "13"],
          ["IO14", "14"],
          ["IO25", "25"],
          ["IO26", "26"],
          ["IO27", "27"],
          ["IO34", "34"],
          ["IO35", "35"],
          ["IO36", "36"],
          ["IO39", "39"],
          ["RX2", "16"],
          ["TX2", "17"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "color_tcs34725_read",
    "message0": "%1 TCS34725 read %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "color",
        "options": [
          ["red", "red"],
          ["green", "green"],
          ["blue", "blue"],
          ["lux", "lux"],
          ["temp", "temp"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "encoder_init",
    "message0": "%1 initialize encoder %2 unit %3 pin A %4 pin B %5",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "field_dropdown",
        "name": "unit",
        "options": [
          ["0", "0"],
          ["1", "1"],
          ["2", "2"],
          ["3", "3"],
          ["4", "4"],
          ["5", "5"],
          ["6", "6"],
          ["7", "7"]
        ]
      },
      {
        "type": "field_dropdown",
        "name": "pin_a",
        "options": [
          ["IO2", "2"],
          ["IO4", "4"],
          ["IO5", "5"],
          ["IO13", "13"],
          ["IO14", "14"],
          ["IO25", "25"],
          ["IO26", "26"],
          ["IO27", "27"],
          ["IO34", "34"],
          ["IO35", "35"],
          ["IO36", "36"],
          ["IO39", "39"],
          ["RX2", "16"],
          ["TX2", "17"]
        ]
      },
      {
        "type": "field_dropdown",
        "name": "pin_b",
        "options": [
          ["IO2", "2"],
          ["IO4", "4"],
          ["IO5", "5"],
          ["IO13", "13"],
          ["IO14", "14"],
          ["IO25", "25"],
          ["IO26", "26"],
          ["IO27", "27"],
          ["IO34", "34"],
          ["IO35", "35"],
          ["IO36", "36"],
          ["IO39", "39"],
          ["RX2", "16"],
          ["TX2", "17"]
        ]
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#0ACC78",
    "helpUrl": ""
  },
  {
    "type": "encoder_read",
    "message0": "%1 encoder read counter %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "unit",
        "options": [
          ["0", "0"],
          ["1", "1"],
          ["2", "2"],
          ["3", "3"],
          ["4", "4"],
          ["5", "5"],
          ["6", "6"],
          ["7", "7"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#0ACC78",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "encoder_reset",
    "message0": "%1 encoder reset %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "unit",
        "options": [
          ["0", "0"],
          ["1", "1"],
          ["2", "2"],
          ["3", "3"],
          ["4", "4"],
          ["5", "5"],
          ["6", "6"],
          ["7", "7"]
        ]
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#0ACC78",
    "helpUrl": ""
  },
  {
    "type": "ms200_read",
    "message0": "%1 MS200 read %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "unit",
        "options": [
          ["distance", "distance"],
          ["intensity", "intensity"]
        ]
      }
    ],
    "output": "Array",
    "inputsInline": true,
    "colour": "#0ACC78",
    "helpUrl": ""
  },
  {
    "type": "ms200_read_at_angle",
    "message0": "%1 MS200 read %2 at angle %3",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "unit",
        "options": [
          ["distance", "distance"],
          ["intensity", "intensity"]
        ]
      },
      {
        "type": "field_number",
        "name": "angle",
        "value": 0,
        "min": 0,
        "max": 359,
        "precision": 1
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#0ACC78",
    "helpUrl": ""
  }
]);
