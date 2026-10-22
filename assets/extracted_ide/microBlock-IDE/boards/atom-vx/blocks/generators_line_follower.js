Blockly.Python['line_follower_junction'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var junction_type = block.getFieldValue('junction_type');

    var code = `line_follower.${junction_type}`;
    return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['line_follower_stop_point'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var stop_point = block.getFieldValue('stop_point');

    var code = `line_follower.${stop_point}`;
    return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['line_follower_postion_sensor'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var sensor = block.getFieldValue('sensor');
    var position = block.getFieldValue('position');
    position = position - 1;

    var code = `line_follower.${sensor}, ${position}`;
    return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['line_follower_turn_direction'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var direction = block.getFieldValue('direction');

    var code = `line_follower.${direction}`;
    return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['line_follower_set_sensor'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var left_sensor = Blockly.Python.valueToCode(block, 'left_sensor', Blockly.Python.ORDER_ATOMIC) || '[]';
    var center_sensor = Blockly.Python.valueToCode(block, 'center_sensor', Blockly.Python.ORDER_ATOMIC) || '[]';
    var right_sensor = Blockly.Python.valueToCode(block, 'right_sensor', Blockly.Python.ORDER_ATOMIC) || '[]';

    var code = `line_follower.set_sensor(${left_sensor}, ${center_sensor}, ${right_sensor})\n`;
    return code;
};

Blockly.Python['line_follower_calibrate'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var code = `line_follower.calibrate()\n`;
    return code;
};

Blockly.Python['line_follower_switch_min_max'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var code = `line_follower.switch_min_to_max()\n`;
    return code;
};

Blockly.Python['line_follower_read_line_position'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var code = `line_follower.read_position()`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['line_follower_read_sensor'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var sensor = block.getFieldValue('sensor');
    var position = block.getFieldValue('position');
    position = position - 1;

    var code = `line_follower.read_sensor(line_follower.${sensor}, ${position})`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['line_follower_read_sensor_calibrated'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var sensor = block.getFieldValue('sensor');
    var position = block.getFieldValue('position');
    position = position - 1;

    var code = `line_follower.read_calibrated_sensor(line_follower.${sensor}, ${position})`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['line_follower_set_ramp'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var ramp_up = Blockly.Python.valueToCode(block, 'ramp_up', Blockly.Python.ORDER_ATOMIC);
    var ramp_down = Blockly.Python.valueToCode(block, 'ramp_down', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.set_ramp_follow_line(${ramp_up}, ${ramp_down})\n`;
    return code;
};

Blockly.Python['line_follower_follow_line'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var base_speed = Blockly.Python.valueToCode(block, 'base_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.follow_line(${base_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['line_follower_follow_line_time'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);
    var stop = Blockly.Python.valueToCode(block, 'stop', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.follow_line_time(${start_speed}, ${max_speed}, ${KP}, ${KD}, ${time}, ${stop})\n`;
    return code;
};

Blockly.Python['line_follower_follow_line_junction'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var junction = Blockly.Python.valueToCode(block, 'junction', Blockly.Python.ORDER_ATOMIC);
    var count = Blockly.Python.valueToCode(block, 'count', Blockly.Python.ORDER_ATOMIC);
    var stop_point = Blockly.Python.valueToCode(block, 'stop_point', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.follow_line_junction(${start_speed}, ${max_speed}, ${KP}, ${KD}, ${junction}, ${count}, ${stop_point})\n`;
    return code;
};

Blockly.Python['line_follower_follow_line_sensor'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var postion_sensor = Blockly.Python.valueToCode(block, 'postion_sensor', Blockly.Python.ORDER_ATOMIC);
    var count = Blockly.Python.valueToCode(block, 'count', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.follow_line_sensor(${start_speed}, ${max_speed}, ${KP}, ${KD}, ${postion_sensor}, ${count})\n`;
    return code;
};

Blockly.Python['line_follower_move_check_sensor'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var motor_1 = Blockly.Python.valueToCode(block, 'motor_1', Blockly.Python.ORDER_ATOMIC);
    var motor_2 = Blockly.Python.valueToCode(block, 'motor_2', Blockly.Python.ORDER_ATOMIC);
    var motor_3 = Blockly.Python.valueToCode(block, 'motor_3', Blockly.Python.ORDER_ATOMIC);
    var motor_4 = Blockly.Python.valueToCode(block, 'motor_4', Blockly.Python.ORDER_ATOMIC);
    var postion_sensor = Blockly.Python.valueToCode(block, 'postion_sensor', Blockly.Python.ORDER_ATOMIC);
    var count = Blockly.Python.valueToCode(block, 'count', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.move_check_sensor(${motor_1}, ${motor_2}, ${motor_3}, ${motor_4}, ${postion_sensor}, ${count})\n`;
    return code;
};

Blockly.Python['line_follower_spin_check_sensor'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var direction = Blockly.Python.valueToCode(block, 'direction', Blockly.Python.ORDER_ATOMIC);
    var slow_speed = Blockly.Python.valueToCode(block, 'slow_speed', Blockly.Python.ORDER_ATOMIC);
    var fast_speed = Blockly.Python.valueToCode(block, 'fast_speed', Blockly.Python.ORDER_ATOMIC);
    var fast_speed_time = Blockly.Python.valueToCode(block, 'fast_speed_time', Blockly.Python.ORDER_ATOMIC);
    var postion_sensor = Blockly.Python.valueToCode(block, 'postion_sensor', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.spin_check_sensor(${direction}, ${slow_speed}, ${fast_speed}, ${fast_speed_time}, ${postion_sensor})\n`;
    return code;
};

Blockly.Python['line_follower_turn_check_sensor'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var direction = Blockly.Python.valueToCode(block, 'direction', Blockly.Python.ORDER_ATOMIC);
    var slow_speed = Blockly.Python.valueToCode(block, 'slow_speed', Blockly.Python.ORDER_ATOMIC);
    var fast_speed = Blockly.Python.valueToCode(block, 'fast_speed', Blockly.Python.ORDER_ATOMIC);
    var fast_speed_time = Blockly.Python.valueToCode(block, 'fast_speed_time', Blockly.Python.ORDER_ATOMIC);
    var postion_sensor = Blockly.Python.valueToCode(block, 'postion_sensor', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.turn_check_sensor(${direction}, ${slow_speed}, ${fast_speed}, ${fast_speed_time}, ${postion_sensor})\n`;
    return code;
};