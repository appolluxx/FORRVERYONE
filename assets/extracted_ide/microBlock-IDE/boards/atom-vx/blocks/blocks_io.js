const ATOM_VX_FIELD_HEIGHT = 20;
const ATOM_VX_NUMBER_TEXT_Y_OFFSET = 5;
const ATOM_VX_STRING_TEXT_Y_OFFSET = 5;

class AtomVxFieldNumber extends Blockly.FieldNumber {
  updateSize_(margin) {
    super.updateSize_(margin);
    this.size_.height = Math.max(this.size_.height, ATOM_VX_FIELD_HEIGHT);
    if (this.borderRect_) {
      this.borderRect_.setAttribute("height", String(this.size_.height));
    }
    if (this.textElement_) {
      this.textElement_.setAttribute("y", String(this.size_.height / 2 + ATOM_VX_NUMBER_TEXT_Y_OFFSET));
    }
  }
}

class AtomVxFieldTextInput extends Blockly.FieldTextInput {
  updateSize_(margin) {
    super.updateSize_(margin);
    this.size_.height = Math.max(this.size_.height, ATOM_VX_FIELD_HEIGHT);
    if (this.borderRect_) {
      this.borderRect_.setAttribute("height", String(this.size_.height));
    }
    if (this.textElement_) {
      this.textElement_.setAttribute("y", String(this.size_.height / 2 + ATOM_VX_STRING_TEXT_Y_OFFSET));
    }
  }
}

Blockly.Blocks['math_number'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new AtomVxFieldNumber(0), "NUM");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['text'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('"')
      .appendField(new AtomVxFieldTextInput(""), "TEXT")
      .appendField('"');
    this.setOutput(true, "String");
    this.setColour(160);
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.defineBlocksWithJsonArray([
  {
    "type": "io_digital_write",
    "message0": "%1 digital write pin %2 to %3",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "pin",
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
        "type": "input_value",
        "name": "value",
        "check": [
          "Boolean",
          "Number"
        ]
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "io_analog_write",
    "message0": "%1 PWM write pin %2 to %3",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "pin",
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
        "type": "input_value",
        "name": "value",
        "check": [
          "Boolean",
          "Number"
        ]
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "io_digital_read",
    "message0": "%1 digital read pin %2 with %3",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "pin",
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
        "name": "pull",
        "options": [
          ["NO PULL", "Pin.PULL_NONE"],
          ["PULL UP", "Pin.PULL_UP"],
          ["PULL DOWN", "Pin.PULL_DOWN"]
        ]
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "io_analog_read",
    "message0": "%1 analog read pin %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "pin",
        "options": function () { const fallback = [
            ["ADC0", "0"],
            ["ADC1", "1"],
            ["ADC2", "2"],
            ["ADC3", "3"],
            ["ADC4", "4"],
            ["ADC5", "5"],
            ["ADC6", "6"],
            ["ADC7", "7"],
            ["IO2", "IO2"],
            ["IO4", "IO4"],
            ["IO13", "IO13"],
            ["IO14", "IO14"],
            ["IO25", "IO25"],
            ["IO26", "IO26"],
            ["IO27", "IO27"],
            ["IO34", "IO34"],
            ["IO35", "IO35"],
            ["IO36", "IO36"],
            ["IO39", "IO39"],
        ]; return window.AssemblyProductConfig ? window.AssemblyProductConfig.pinOptions(fallback, ['analog'], this.getValue ? this.getValue() : null) : fallback; }
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "switch_is_press",
    "message0": "%1 switch %2 is press ?",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "n",
        "options": [
          ["A", "SW_A"],
          ["B", "SW_B"],
        ]
      }
    ],
    "output": null,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "switch_is_release",
    "message0": "%1 switch %2 is release ?",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "n",
        "options": [
          ["A", "SW_A"],
          ["B", "SW_B"],
        ]
      }
    ],
    "output": null,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "switch_get_value",
    "message0": "%1 switch %2 get value",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "field_dropdown",
        "name": "n",
        "options": [
          ["A", "SW_A"],
          ["B", "SW_B"],
        ]
      }
    ],
    "output": null,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "io_knob_read",
    "message0": "%1 knob read",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      }
    ],
    "output": [
      "Number",
      "Boolean"
    ],
    "inputsInline": true,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "io_buzzer_beep",
    "message0": "%1 beep %2 seconds",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/atom-vx/images/connector.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "duration",
        "check": [
          "Boolean",
          "Number"
        ]
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#E67E22",
    "tooltip": "",
    "helpUrl": ""
  }
]);

Blockly.Blocks['io_pin'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/atom-vx/images/connector.png", 20, 20))
      .appendField("pin")
      .appendField(new Blockly.FieldDropdown(function () { const fallback = [
        ["ADC0", "ADC0"],
        ["ADC1", "ADC1"],
        ["ADC2", "ADC2"],
        ["ADC3", "ADC3"],
        ["ADC4", "ADC4"],
        ["ADC5", "ADC5"],
        ["ADC6", "ADC6"],
        ["ADC7", "ADC7"],
        ["IO2", "IO2"],
        ["IO4", "IO4"],
        ["IO13", "IO13"],
        ["IO14", "IO14"],
        ["IO25", "IO25"],
        ["IO26", "IO26"],
        ["IO27", "IO27"],
        ["IO34", "IO34"],
        ["IO35", "IO35"],
        ["IO36", "IO36"],
        ["IO39", "IO39"],
      ]; return window.AssemblyProductConfig ? window.AssemblyProductConfig.pinOptions(fallback, ['analog', 'digital'], this.getValue ? this.getValue() : null) : fallback; }), "pin");

    this.setOutput(true, "pin_type");
    this.setColour("#E67E22");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['io_tx_pin'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/atom-vx/images/connector.png", 20, 20))
      .appendField("pin")
      .appendField(new Blockly.FieldDropdown([
        ["IO2", "2"],
        ["IO4", "4"],
        ["IO5", "5"],
        ["IO13", "13"],
        ["IO14", "14"],
        ["IO25", "25"],
        ["IO26", "26"],
        ["IO27", "27"]
      ]), "pin");

    this.setOutput(true, "tx_pin_type");
    this.setColour("#E67E22");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['io_rx_pin'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("boards/atom-vx/images/connector.png", 20, 20))
      .appendField("pin")
      .appendField(new Blockly.FieldDropdown([
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
        ["IO39", "39"]
      ]), "pin");

    this.setOutput(true, "rx_pin_type");
    this.setColour("#E67E22");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['switch_on_pressed'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(`boards/atom-vx/images/connector.png`, 20, 20))
      .appendField("switch")
      .appendField(new Blockly.FieldDropdown([
        ["A", "SW_A"],
        ["B", "SW_B"]
      ]), "pin")
      .appendField("on pressed");

    this.appendStatementInput("callback")
      .setCheck(null)

    this.setPreviousStatement(false);
    this.setNextStatement(false);
    this.setColour("#E67E22");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};
