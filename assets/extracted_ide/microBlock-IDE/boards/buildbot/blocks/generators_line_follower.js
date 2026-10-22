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
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';
    var dropdown_position = block.getFieldValue('position');
    var code = dropdown_position;
    return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['line_follower_postion_sensor_front'] = function (block) {
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';
    var dropdown_position = block.getFieldValue('position');
    var code = dropdown_position;
    return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['line_follower_turn_direction'] = function (block) {
    var direction = block.getFieldValue('direction');
    var code = `robot.${direction}`;
    return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['line_follower_calibrate'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';

    var code = `line_follower.calibrate()\n`;
    return code;
};

Blockly.Python['line_follower_read_line_position'] = function (block) {
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';
    var code = `line_follower.read_position()`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['line_follower_read_sensor'] = function (block) {
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';
    var position = block.getFieldValue('position');
    var code = `line_follower.read_sensor(${position})`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['line_follower_read_sensor_calibrated'] = function (block) {
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';
    var position = block.getFieldValue('position');
    var code = `line_follower.read_calibrated_sensor(${position})`;
    return [code, Blockly.Python.ORDER_NONE];
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
    var end_speed = Blockly.Python.valueToCode(block, 'end_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);
    var stop = Blockly.Python.valueToCode(block, 'stop', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.follow_line_time(${start_speed}, ${end_speed}, ${KP}, ${KD}, ${time}, ${stop})\n`;
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
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';
    var motor_left = Blockly.Python.valueToCode(block, 'motor_left', Blockly.Python.ORDER_ATOMIC);
    var motor_right = Blockly.Python.valueToCode(block, 'motor_right', Blockly.Python.ORDER_ATOMIC);
    var postion_sensor = Blockly.Python.valueToCode(block, 'postion_sensor', Blockly.Python.ORDER_ATOMIC);
    var count = Blockly.Python.valueToCode(block, 'count', Blockly.Python.ORDER_ATOMIC);

    var code = `line_follower.move_check_sensor(${motor_left}, ${motor_right}, ${postion_sensor}, ${count})\n`;
    return code;
};

Blockly.Python['line_follower_spin_check_sensor'] = function(block) {
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
    Blockly.Python.definitions_['import_line_follower'] = 'import line_follower';
    var direction = Blockly.Python.valueToCode(block, 'direction', Blockly.Python.ORDER_ATOMIC);
    var slow_speed = Blockly.Python.valueToCode(block, 'slow_speed', Blockly.Python.ORDER_ATOMIC);
    var fast_speed = Blockly.Python.valueToCode(block, 'fast_speed', Blockly.Python.ORDER_ATOMIC);
    var fast_speed_time = Blockly.Python.valueToCode(block, 'fast_speed_time', Blockly.Python.ORDER_ATOMIC);
    var postion_sensor = Blockly.Python.valueToCode(block, 'postion_sensor', Blockly.Python.ORDER_ATOMIC);
    var code = `line_follower.turn_check_sensor(${direction}, ${slow_speed}, ${fast_speed}, ${fast_speed_time}, ${postion_sensor})\n`;
    return code;
};