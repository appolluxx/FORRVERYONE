Blockly.Python['motor_drive_single'] = function(block) {
    var motor = block.getFieldValue('motor');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.motor_drive(${motor}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_drive_all'] = function(block) {
    var speed1 = Blockly.Python.valueToCode(block, 'speed1', Blockly.Python.ORDER_ATOMIC);
    var speed2 = Blockly.Python.valueToCode(block, 'speed2', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.motor_drive_all(${speed1}, ${speed2})\n`;
    return code;
};

Blockly.Python['motor_move'] = function(block) {
    var move = block.getFieldValue('move');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.move(robot.${move}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_spin'] = function(block) {
    var spin = block.getFieldValue('spin');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.spin(robot.${spin}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_turn_front'] = function(block) {
    var turn = block.getFieldValue('turn');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.turn_front(robot.${turn}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_turn_back'] = function(block) {
    var turn = block.getFieldValue('turn');
    var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.turn_back(robot.${turn}, ${speed})\n`;
    return code;
};

Blockly.Python['motor_stop'] = function(block) {
    var code = `robot.motor_stop_all()\n`;
    return code;
};

Blockly.Python['motor_set_ramp'] = function(block) {
    var ramp_up = Blockly.Python.valueToCode(block, 'ramp_up', Blockly.Python.ORDER_ATOMIC);
    var ramp_down = Blockly.Python.valueToCode(block, 'ramp_down', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.set_ramp(${ramp_up}, ${ramp_down})\n`;
    return code;
};

Blockly.Python['motor_move_forward_degree'] = function(block) {
    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.forward_degree(${angle}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['motor_move_backward_degree'] = function(block) {
    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.backward_degree(${angle}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['motor_move_forward_degree_time'] = function(block) {
    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.forward_degree_time(${angle}, ${start_speed}, ${max_speed}, ${KP}, ${KD}, ${time})\n`;
    return code;
};

Blockly.Python['motor_move_backward_degree_time'] = function(block) {
    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var start_speed = Blockly.Python.valueToCode(block, 'start_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);
    var time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.backward_degree_time(${angle}, ${start_speed}, ${max_speed}, ${KP}, ${KD}, ${time})\n`;
    return code;
};

Blockly.Python['motor_spin_degree'] = function(block) {
    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var stop_threshold = Blockly.Python.valueToCode(block, 'stop_threshold', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);

    var code = `robot.spin_degree(${angle}, ${stop_threshold}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['motor_turn_degree_front'] = function(block) {
    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var stop_threshold = Blockly.Python.valueToCode(block, 'stop_threshold', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);

    var code = `robot.turn_degree_front(${angle}, ${stop_threshold}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};

Blockly.Python['motor_turn_degree_back'] = function(block) {
    var angle = Blockly.Python.valueToCode(block, 'angle', Blockly.Python.ORDER_ATOMIC);
    var stop_threshold = Blockly.Python.valueToCode(block, 'stop_threshold', Blockly.Python.ORDER_ATOMIC);
    var min_speed = Blockly.Python.valueToCode(block, 'min_speed', Blockly.Python.ORDER_ATOMIC);
    var max_speed = Blockly.Python.valueToCode(block, 'max_speed', Blockly.Python.ORDER_ATOMIC);
    var KP = Blockly.Python.valueToCode(block, 'KP', Blockly.Python.ORDER_ATOMIC);
    var KD = Blockly.Python.valueToCode(block, 'KD', Blockly.Python.ORDER_ATOMIC);

    var code = `robot.turn_degree_back(${angle}, ${stop_threshold}, ${min_speed}, ${max_speed}, ${KP}, ${KD})\n`;
    return code;
};