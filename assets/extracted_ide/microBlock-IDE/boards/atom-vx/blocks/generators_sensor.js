Blockly.Python['imu_set_offset'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var angle = block.getFieldValue('angle');
    var degree = Blockly.Python.valueToCode(block, 'degree', Blockly.Python.ORDER_ATOMIC);

    var code = `board.set_angle_offset(board.${angle}, ${degree})\n`;
    return code;
};

Blockly.Python['imu_read_angle'] = function (block) {
    Blockly.Python.definitions_['import_imu'] = 'import imu';

    var angle = block.getFieldValue('angle');
    var index = {
        roll: 0,
        pitch: 1,
        yaw: 2
    }[angle] || 0;

    var code = `imu.read_angles()[${index}]`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['imu_read_quaternion'] = function (block) {
    Blockly.Python.definitions_['import_imu'] = 'import imu';

    var index = block.getFieldValue('value');

    var code = `imu.read_quaternion()[${index}]`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['imu_read_accel'] = function (block) {
    Blockly.Python.definitions_['import_imu'] = 'import imu';

    var index = block.getFieldValue('axis');

    var code = `imu.read_accel()[${index}]`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['imu_read_gyro'] = function (block) {
    Blockly.Python.definitions_['import_imu'] = 'import imu';

    var index = block.getFieldValue('axis');

    var code = `imu.read_gyro()[${index}]`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['ultrasonic_read_distance'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_machine_import_pin'] = 'from machine import Pin';

    var trigger_pin = block.getFieldValue('trigger_pin');
    var echo_pin = block.getFieldValue('echo_pin');

    Blockly.Python.definitions_['trigger_echo_pin_' + trigger_pin] = 'trigger_pin_' + trigger_pin + ' = Pin(' + trigger_pin + ', Pin.OUT)\n' + 'echo_pin_' + echo_pin + ' = Pin(' + echo_pin + ', Pin.IN)';

    var code = `board.ultrasonic_read(trigger_pin_${trigger_pin}, echo_pin_${echo_pin})`;
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

Blockly.Python['color_tcs34725_read'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var color = block.getFieldValue('color');

    var code = `board.tcs34725_read(board.${color})`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['encoder_init'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_encoder'] = 'import encoder';

    var unit = block.getFieldValue('unit');
    var pin_a = block.getFieldValue('pin_a');
    var pin_b = block.getFieldValue('pin_b');

    var code = `encoder.init(${pin_a}, ${pin_b}, ${unit})\n`;
    return code;
};

Blockly.Python['encoder_read'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_encoder'] = 'import encoder';

    var unit = block.getFieldValue('unit');

    var code = `encoder.read(${unit})`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['encoder_reset'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_encoder'] = 'import encoder';

    var unit = block.getFieldValue('unit');

    var code = `encoder.reset(${unit})`;
    return code
};

Blockly.Python['ms200_read'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_uros'] = 'import uros';

    var unit = block.getFieldValue('unit');

    if (unit == "distance") {
        var code = `uros.ms200_read_distance()`;
    }
    else if (unit == "intensity") {
        var code = `uros.ms200_read_intensity()`;
    }

    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['ms200_read_at_angle'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_uros'] = 'import uros';

    var unit = block.getFieldValue('unit');
    var angle = block.getFieldValue('angle');

    if (unit == "distance") {
        var code = `uros.ms200_read_distance()[${angle}]`;
    }
    else if (unit == "intensity") {
        var code = `uros.ms200_read_intensity()[${angle}]`;
    }

    return [code, Blockly.Python.ORDER_NONE];
};
