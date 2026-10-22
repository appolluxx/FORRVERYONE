Blockly.Python['imu_set_offset'] = function(block) {
    var angle = block.getFieldValue('angle');
    var degree = Blockly.Python.valueToCode(block, 'degree', Blockly.Python.ORDER_ATOMIC);

    var code = `robot.set_angle_offset(robot.${angle}, ${degree})\n`;
    return code;
};

Blockly.Python['imu_read_angle'] = function (block) {
    var angle = block.getFieldValue('angle');

    var code = `robot.read_angle(robot.${angle})`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['ultrasonic_read_distance'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var trigger_pin = block.getFieldValue('trigger_pin');
    var echo_pin = block.getFieldValue('echo_pin');

    var code = `round(robot.read_ultrasonic(board.${trigger_pin}, board.${echo_pin}), 2)`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['vl53L0x_read_distance'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_machine_import_pin'] = 'from machine import Pin';

    var scl_pin = block.getFieldValue('scl_pin');
    var sda_pin = block.getFieldValue('sda_pin');

    Blockly.Python.definitions_['i2c_pin_' + scl_pin] = 'scl_pin_' + scl_pin + ' = Pin(' + scl_pin + ')\n' + 'sda_pin_' + sda_pin + ' = Pin(' + sda_pin + ')';

    var code = `board.VL53L0X_read(scl_pin_${scl_pin}, sda_pin_${sda_pin})`;
    return [code, Blockly.Python.ORDER_NONE];
};