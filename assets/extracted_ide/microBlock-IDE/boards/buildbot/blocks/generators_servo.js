Blockly.Python['servo_set_degree'] = function(block) {
    Blockly.Python.definitions_['import_robot'] = 'import robot';

    var servo = block.getFieldValue('servo');
    var degree = Blockly.Python.valueToCode(block, 'degree', Blockly.Python.ORDER_ATOMIC);

    var code = `robot.servo_set_degree(${servo}, ${degree})\n`;
    return code;
};