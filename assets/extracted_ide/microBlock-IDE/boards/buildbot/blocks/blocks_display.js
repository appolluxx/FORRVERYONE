Blockly.defineBlocksWithJsonArray([
  {
    "type": "display_draw_text",
    "message0": "%1 display draw text %2 text %3 x %4 y %5 colour %6",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/display.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "text",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "x",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "y",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "color",
        "check": "Colour",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#EB49AA",
    "tooltip": "Draw text on screen",
    "helpUrl": ""
  },
  {
    "type": "display_draw_line",
    "message0": "%1 display draw line %2 start x %3 start y %4 x end %5 y end %6 colour %7",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/display.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "x1",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "y1",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "x2",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "y2",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "color",
        "check": "Colour",
        "align": "RIGHT"
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#EB49AA",
    "tooltip": "Draw line on screen",
    "helpUrl": ""
  },
  {
    "type": "display_draw_rect",
    "message0": "%1 display draw rectangle %2 x start %3 y start %4 width %5 height %6 colour %7 fill %8",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/display.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "x",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "y",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "width",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "height",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "color",
        "check": "Colour",
        "align": "RIGHT"
      },
      {
        "type": "field_dropdown",
        "name": "fill",
        "options": [
          [
            "No",
            "0"
          ],
          [
            "Yes",
            "1"
          ]
        ]
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#EB49AA",
    "tooltip": "Draw rectangle on screen",
    "helpUrl": ""
  },
  {
    "type": "display_draw_circle",
    "message0": "%1 display draw circle %2 x center %3 y center %4 radius %5 colour %6 fill %7",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/display.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "x",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "y",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "r",
        "check": "Number",
        "align": "RIGHT"
      },
      {
        "type": "input_value",
        "name": "color",
        "check": "Colour",
        "align": "RIGHT"
      },
      {
        "type": "field_dropdown",
        "name": "fill",
        "options": [
          [
            "No",
            "0"
          ],
          [
            "Yes",
            "1"
          ]
        ]
      }
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#EB49AA",
    "tooltip": "Draw circle on screen",
    "helpUrl": ""
  },
  {
    "type": "display_fill",
    "message0": "%1 display fill colour %2",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/display.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_value",
        "name": "color",
        "check": "Colour"
      },
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#EB49AA",
    "tooltip": "Fill screen with color",
    "helpUrl": ""
  },
  {
    "type": "display_draw_image",
    "message0": "%1 show image %2 %3 position x %4 y %5 pixel",
    "args0": [
      {
        "type": "field_image",
        "src": `boards/buildbot/images/display.png`,
        "width": 20,
        "height": 20
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "field_display_buildbot",
        "name": "image",
        "colour": "#ff0000"
      },
      {
        "type": "input_value",
        "name": "x",
        "check": "Number"
      },
      {
        "type": "input_value",
        "name": "y",
        "check": "Number"
      },
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#EB49AA",
    "tooltip": "Show image on screen",
    "helpUrl": ""
  }
]);
