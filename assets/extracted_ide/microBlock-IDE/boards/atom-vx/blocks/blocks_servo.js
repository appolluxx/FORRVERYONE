Blockly.defineBlocksWithJsonArray([
    {
        "type": "servo_set_degree",
        "message0": "%1 servo %2 turn %3 degree",
        "args0": [
            {
                "type": "field_image",
                "src": `boards/atom-vx/images/motor.png`,
                "width": 20,
                "height": 20
            },
            {
                "type": "field_dropdown",
                "name": "servo",
                "options": [
                    ["0", "0"],
                    ["1", "1"],
                    ["2", "2"],
                    ["3", "3"],
                    ["4", "4"],
                    ["5", "5"],
                    ["6", "6"]
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
        "colour": "#3498DB",
        "tooltip": "",
        "helpUrl": ""
    }
]);