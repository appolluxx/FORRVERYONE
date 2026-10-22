Blockly.Python['motor_set'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var motor = block.getFieldValue('motor');

    var code = `motor.set_motor_drive(motor.${motor})\n`;
    return code;
};

Blockly.Python['motor_drive_single'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var motor = block.getFieldValue('motor');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.drive_single(${motor}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_drive_all'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var speed1 = Blockly.Python.valueToCode(block, 'speed1', Blockly.Python.ORDER_ATOMIC);
    var speed2 = Blockly.Python.valueToCode(block, 'speed2', Blockly.Python.ORDER_ATOMIC);
    var speed3 = Blockly.Python.valueToCode(block, 'speed3', Blockly.Python.ORDER_ATOMIC);
    var speed4 = Blockly.Python.valueToCode(block, 'speed4', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.drive_all(${speed1}, ${speed2}, ${speed3}, ${speed4})\n`;
    return code;
};

Blockly.Python['motor_move'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var move = block.getFieldValue('move');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.move(motor.${move}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_spin'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var spin = block.getFieldValue('spin');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.spin(motor.${spin}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_turn_front'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var turn = block.getFieldValue('turn');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.turn_front(motor.${turn}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_turn_back'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var turn = block.getFieldValue('turn');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.turn_back(motor.${turn}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_move_mecanum'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var vx = Blockly.Python.valueToCode(block, 'vx', Blockly.Python.ORDER_ATOMIC);
    var vy = Blockly.Python.valueToCode(block, 'vy', Blockly.Python.ORDER_ATOMIC);
    var r = Blockly.Python.valueToCode(block, 'r', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.mecanum_move(${vx}, ${vy}, ${r})\n`;
    return code;
};

Blockly.Python['motor_set_ramp_using_imu'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var ramp_up = Blockly.Python.valueToCode(block, 'ramp_up', Blockly.Python.ORDER_ATOMIC);
    var ramp_down = Blockly.Python.valueToCode(block, 'ramp_down', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.set_ramp_move_imu(${ramp_up}, ${ramp_down})\n`;
    return code;
};

Blockly.Python['motor_move_forward_degree'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.forward_degree(${angle}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['motor_move_backward_degree'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.backward_degree(${angle}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['motor_move_forward_degree_time'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.forward_degree_time(${angle}, ${start_speed}, ${max_speed}, ${KP}, ${KD}, ${time})\n`;
    return code;
};

Blockly.Python['motor_move_backward_degree_time'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.backward_degree_time(${angle}, ${start_speed}, ${max_speed}, ${KP}, ${KD}, ${time})\n`;
    return code;
};

Blockly.Python['motor_move_forward_degree_time_ramp'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var ramp_up = Blockly.Python.valueToCode(block, 'ramp_up', Blockly.Python.ORDER_ATOMIC);
    var ramp_down = Blockly.Python.valueToCode(block, 'ramp_down', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.forward_degree_time(${angle}, ${start_speed}, ${max_speed}, ${KP}, ${KD}, ${time}, ${ramp_up}, ${ramp_down})\n`;
    return code;
};

Blockly.Python['motor_move_backward_degree_time_ramp'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var ramp_up = Blockly.Python.valueToCode(block, 'ramp_up', Blockly.Python.ORDER_ATOMIC);
    var ramp_down = Blockly.Python.valueToCode(block, 'ramp_down', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.backward_degree_time(${angle}, ${start_speed}, ${max_speed}, ${KP}, ${KD}, ${time}, ${ramp_up}, ${ramp_down})\n`;
    return code;
};

Blockly.Python['motor_spin_degree'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var slow_angle = Blockly.Python.valueToCode(block, 'slow_angle', Blockly.Python.ORDER_ATOMIC);
    var stop_threshold = Blockly.Python.valueToCode(block, 'stop_threshold', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.spin_degree(${angle}, ${slow_angle}, ${stop_threshold}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['motor_turn_degree_front'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';

    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var slow_angle = Blockly.Python.valueToCode(block, 'slow_angle', Blockly.Python.ORDER_ATOMIC);
    var stop_threshold = Blockly.Python.valueToCode(block, 'stop_threshold', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);

    var code = `motor.turn_degree_front(${angle}, ${slow_angle}, ${stop_threshold}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['motor_stop'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_motor'] = 'import motor';
  
    var code = `motor.stop()\n`;
    return code;
};

Blockly.Python['ddsm210_init'] = function(block) {
    Blockly.Python.definitions_['import_ddsm210'] = 'import ddsm210';

    var tx = Blockly.Python.valueToCode(block, 'tx', Blockly.Python.ORDER_ATOMIC) || '27';
    var rx = Blockly.Python.valueToCode(block, 'rx', Blockly.Python.ORDER_ATOMIC) || '14';
    var baud = Blockly.Python.valueToCode(block, 'baud', Blockly.Python.ORDER_ATOMIC) || '115200';

    Blockly.Python.definitions_['pre_start_ddsm210_init'] = `ddsm210.init(${tx}, ${rx}, ${baud})\n`;
    return '';
};

Blockly.Python['ddsm210_set_id'] = function(block) {
    Blockly.Python.definitions_['import_ddsm210'] = 'import ddsm210';

    var new_id = Blockly.Python.valueToCode(block, 'new_id', Blockly.Python.ORDER_ATOMIC) || '1';

    var code = `ddsm210.set_id(${new_id})\n`;
    return code;
};

Blockly.Python['ddsm210_set_velocity'] = function(block) {
    Blockly.Python.definitions_['import_ddsm210'] = 'import ddsm210';

    var motor_id = Blockly.Python.valueToCode(block, 'motor_id', Blockly.Python.ORDER_ATOMIC) || '1';
    var rpm = Blockly.Python.valueToCode(block, 'rpm', Blockly.Python.ORDER_ATOMIC) || '0.0';

    var code = `ddsm210.set_velocity(${motor_id}, ${rpm})\n`;
    return code;
};

Blockly.Python['ddsm210_diff_drive'] = function(block) {
    Blockly.Python.definitions_['import_ddsm210'] = 'import ddsm210';

    var linear_x = Blockly.Python.valueToCode(block, 'linear_x', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var angular_z = Blockly.Python.valueToCode(block, 'angular_z', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var left_id = Blockly.Python.valueToCode(block, 'left_id', Blockly.Python.ORDER_ATOMIC) || '1';
    var right_id = Blockly.Python.valueToCode(block, 'right_id', Blockly.Python.ORDER_ATOMIC) || '2';
    var wheel_radius = Blockly.Python.valueToCode(block, 'wheel_radius', Blockly.Python.ORDER_ATOMIC) || '50';
    var wheel_base = Blockly.Python.valueToCode(block, 'wheel_base', Blockly.Python.ORDER_ATOMIC) || '70';

    return `if ${wheel_radius} is not None and ${wheel_base} is not None:\n` +
        Blockly.Python.INDENT + `ddsm210.move_diff_drive(${linear_x}, ${angular_z}, ${left_id}, ${right_id}, ${wheel_radius}, ${wheel_base})\n`;
};

Blockly.Python['ddsm210_read_velocity'] = function(block) {
    Blockly.Python.definitions_['import_ddsm210'] = 'import ddsm210';

    var motor_id = Blockly.Python.valueToCode(block, 'motor_id', Blockly.Python.ORDER_ATOMIC) || '1';

    var code = `ddsm210.read_velocity(${motor_id})[0]`;
    return [code, Blockly.Python.ORDER_NONE];
};
