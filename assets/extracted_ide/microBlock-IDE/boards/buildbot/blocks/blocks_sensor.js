Blockly.defineBlocksWithJsonArray([
  {
    "type": "imu_set_offset",
    "message0": "%1 set angle %2 to %3 degree",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/sensor.png`,
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
        "src": `boards/buildbot/images/sensor.png`,
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
    "type": "ultrasonic_read_distance",
    "message0": "%1 ultrasonic read trigger %2 echo %3",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/sensor.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "trigger_pin",
        "options": [
          ["IO1", "IO1"],
          ["IO2", "IO2"]
        ]
      },
      {
        "type": "field_dropdown",
        "name": "echo_pin",
        "options": [
          ["IO1", "IO1"],
          ["IO2", "IO2"]
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
        "src": `boards/buildbot/images/sensor.png`,
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
  }
]);