Blockly.defineBlocksWithJsonArray([
  {
    "type": "wifi_connect",
    "message0": "%1 connect wifi %2 ssid %3 password %4",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "ssid",
        "check": "String",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "password",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_init",
    "message0": "%1 initialize micro ROS %2 agent ip address %3 agent port %4 agent name space %5",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "ip_address",
        "check": "String",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "port",
        "check": "String",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "name_space",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_init_serial",
    "message0": "%1 initialize micro ROS %2 TX %3",
    "message1": "RX %1",
    "message2": "baud rate %1",
    "message3": "agent name space %1",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "tx_pin",
        "check": "tx_pin_type",
        "align": "RIGHT"
      }
    ],
    "args1": [
      {
        "type": "input_value",
        "name": "rx_pin",
        "check": "rx_pin_type",
        "align": "RIGHT"
      }
    ],
    "args2": [
      {
        "type": "input_value",
        "name": "baudrate",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "args3": [
      {
        "type": "input_value",
        "name": "name_space",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_publish_int",
    "message0": "%1 publish number",
    "message1": "topic %1",
    "message2": "data %1",
    "message3": "publish rate (Hz) %1",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      }
    ],
    "args1": [
      {
        "type": "input_value",
        "name": "topic",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "args2": [
      {
        "type": "input_value",
        "name": "data",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "args3": [
      {
        "type": "input_value",
        "name": "publish_rate",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_publish_string",
    "message0": "%1 publish string",
    "message1": "topic %1",
    "message2": "data %1",
    "message3": "publish rate (Hz) %1",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      }
    ],
    "args1": [
      {
        "type": "input_value",
        "name": "topic",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "args2": [
      {
        "type": "input_value",
        "name": "data",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "args3": [
      {
        "type": "input_value",
        "name": "publish_rate",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_publish_int_manual",
    "message0": "%1 publish number once",
    "message1": "topic %1",
    "message2": "data %1",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      }
    ],
    "args1": [
      {
        "type": "input_value",
        "name": "topic",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "args2": [
      {
        "type": "input_value",
        "name": "data",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_publish_string_manual",
    "message0": "%1 publish string once",
    "message1": "topic %1",
    "message2": "data %1",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      }
    ],
    "args1": [
      {
        "type": "input_value",
        "name": "topic",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "args2": [
      {
        "type": "input_value",
        "name": "data",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_subscribe_cmd_vel",
    "message0": "%1 on cmd vel topic %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "topic",
        "check": "String",
        "align": "RIGHT"
      }
    ],
    "message1": "%1",
    "args1": [
      {
        "type": "input_statement",
        "name": "callback"
      }
    ],
    "inputsInline": false,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_read_cmd_vel_full",
    "message0": "%1 read cmd vel %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "value",
        "options": [
          ["linear x", "0"],
          ["linear y", "1"],
          ["linear z", "2"],
          ["angular x", "3"],
          ["angular y", "4"],
          ["angular z", "5"]
        ]
      }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_publish_scan",
    "message0": "%1 publish scan %2 lidar tx %3 lidar rx %4 topic %5 publish rate %6 Hz",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "tx_pin",
        "check": "tx_pin_type",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "rx_pin",
        "check": "rx_pin_type",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "topic",
        "check": "String",
        "align": "RIGHT"
      },
      {
        "type": "field_number",
        "name": "publish_rate",
        "value": 30,
        "min": 1,
        "max": 30,
        "precision": 1
      }
    ],
    "inputsInline": false,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_publish_imu",
    "message0": "%1 publish IMU %2 orientation qw %3 qx %4 qy %5 qz %6 angular velocity gx %7 gy %8 gz %9 linear acceleration ax %10 ay %11 az %12 topic %13 publish rate (Hz) %14",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "qw",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "qx",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "qy",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "qz",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "gx",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "gy",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "gz",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "ax",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "ay",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "az",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "topic",
        "check": "String",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "publish_rate",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "micro_ros_publish_odom",
    "message0": "%1 publish diff odom %2 left speed (RPM) %3 right speed (RPM) %4 wheel radius (mm) %5 wheel base (mm) %6 topic %7 publish rate (Hz) %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/micro_ros.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "left_rpm",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "right_rpm",
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
      },
      {
        "type": "input_value",
        "name": "topic",
        "check": "String",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "publish_rate",
        "check": "Number",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "colour": "#2BD6B7",
    "tooltip": "",
    "helpUrl": ""
  }
]);
