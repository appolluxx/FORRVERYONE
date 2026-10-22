Blockly.Python['servo_set_degree'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_servo'] = 'import servo';

    var servo = block.getFieldValue('servo');
    var degree = Blockly.Python.valueToCode(block, 'degree', Blockly.Python.ORDER_ATOMIC);

    var code = `servo.set_degree(${servo}, ${degree})\n`;
    return code;
};