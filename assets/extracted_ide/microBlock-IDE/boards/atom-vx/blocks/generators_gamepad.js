function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');

    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `${r}, ${g}, ${b}`;
}

Blockly.Python['gamepad_auto_connect'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var code = `gamepad.auto_connect()\n`;
    return code;
};

Blockly.Python['gamepad_delete_device'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var code = `gamepad.delete_device()\n`;
    return code;
};

Blockly.Python['gamepad_is_connected'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var code = `gamepad.is_connected()`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['gamepad_read_button'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var button = block.getFieldValue('button');

    var code = `gamepad.read_button("${button}")`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['gamepad_read_analog'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var axis = block.getFieldValue('axis');

    var code = `gamepad.read_analog("${axis}")`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['gamepad_read_gyro'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var axis = block.getFieldValue('axis');

    var code = `gamepad.read_gyro("${axis}")`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['gamepad_read_accel'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var axis = block.getFieldValue('axis');

    var code = `gamepad.read_accel("${axis}")`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['gamepad_set_lightbar_color'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var color = block.getFieldValue('color');
    color = hexToRgb(color);

    var code = `gamepad.set_lightbar_color(${color})\n`;
    return code;
};

Blockly.Python['gamepad_set_rumble'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_gamepad'] = 'import gamepad';

    var duration = Blockly.Python.valueToCode(block, 'duration', Blockly.Python.ORDER_ATOMIC);
    duration = Math.floor(duration * 1000);

    var code = `gamepad.set_rumble(${duration})\n`;
    return code;
};

Blockly.Python['ps2_auto_connect'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_ps2'] = 'import ps2';

    var code = `ps2.init(cmd=26, clk=14, data=27, att=25)\n`;
    return code;
};

Blockly.Python['ps2_is_connected'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_ps2'] = 'import ps2';

    var code = `ps2.is_connected()`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['ps2_read_button'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_ps2'] = 'import ps2';

    var button = block.getFieldValue('button');

    var code = `ps2.read_button("${button}")`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['ps2_read_analog'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_ps2'] = 'import ps2';

    var axis = block.getFieldValue('axis');

    var code = `ps2.read_analog("${axis}")`;
    return [code, Blockly.Python.ORDER_NONE];
};