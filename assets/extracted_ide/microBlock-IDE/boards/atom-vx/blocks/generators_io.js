Blockly.Python['io_digital_write'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_machine_import_pin'] = 'from machine import Pin';

    var pin = block.getFieldValue('pin');
    var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);

    var code = `Pin(${pin}, Pin.OUT).value(${value})\n`;
    return code;
};

Blockly.Python['io_analog_write'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_machine_import_pin'] = 'from machine import Pin';
    Blockly.Python.definitions_['from_machine_import_pwm'] = 'from machine import PWM';

    var pin = block.getFieldValue('pin');
    var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);
    var code = `PWM(Pin(${pin}), freq=1000, duty=int(${value}))\n`;
    return code;
};

Blockly.Python['io_digital_read'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_machine_import_pin'] = 'from machine import Pin';

    var pin = block.getFieldValue('pin');
    var pull = block.getFieldValue('pull');

    if (pull == "Pin.PULL_NONE") {
        var code = `Pin(${pin}, Pin.IN).value()`;
    }
    else {
        var code = `Pin(${pin}, Pin.IN, ${pull}).value()`;
    }

    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['io_analog_read'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var pin = block.getFieldValue('pin');

    if (pin == "0" || pin == "1" || pin == "2" || pin == "3" || pin == "4" || pin == "5" || pin == "6" || pin == "7") {
        var code = `board.read_adc(${pin})`;
    }
    else {
        var code = `board.mcu_io_read_adc(${pin.substring(2)})`;
    }

    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.JavaScript['io_pin'] = function (block) {
    var pin = block.getFieldValue('pin');
    var code = `"${pin}"`;
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.Python['io_tx_pin'] = function (block) {
    var pin = block.getFieldValue('pin');
    var code = pin;
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.Python['io_rx_pin'] = function (block) {
    var pin = block.getFieldValue('pin');
    var code = pin;
    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.Python['io_pin'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var pin = block.getFieldValue('pin');

    if (pin == "ADC0" || pin == "ADC1" || pin == "ADC2" || pin == "ADC3" || pin == "ADC4" || pin == "ADC5" || pin == "ADC6" || pin == "ADC7") {
        var code = `board.${pin}`;
    }
    else {
        var code = pin.substring(2);
    }

    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['switch_is_press'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var dropdown_n = block.getFieldValue('n');

    var code = `board.switch_read(board.${dropdown_n}) == 1`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['switch_is_release'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var dropdown_n = block.getFieldValue('n');

    var code = `board.switch_read(board.${dropdown_n}) == 0`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['switch_get_value'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var dropdown_n = block.getFieldValue('n');

    var code = `board.switch_read(board.${dropdown_n})`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['switch_on_pressed'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var dropdown_pin = block.getFieldValue('pin');
    var statements_callback = Blockly.Python.statementToCode(block, 'callback');

    // -----------------------------
    var globals = [];
    var varName;
    var workspace = block.workspace;
    var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
    for (var i = 0, variable; variable = variables[i]; i++) {
      varName = variable.name;
      if (block.getVars().indexOf(varName) == -1) {
        globals.push(Blockly.Python.nameDB_.getName(varName,
            Blockly.VARIABLE_CATEGORY_NAME));
      }
    }
    // Add developer variables.
    var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
    for (var i = 0; i < devVarList.length; i++) {
      globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
          Blockly.Names.DEVELOPER_VARIABLE_TYPE));
    }
  
    globals = globals.length ?
        Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';
    // -----------------------------

    if (!statements_callback) {
        statements_callback = Blockly.Python.INDENT + 'pass';
    }

    var functionName = Blockly.Python.provideFunction_(
        dropdown_pin + 'PressCB',
        ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '(_=None):',
        globals,
        statements_callback]);

    Blockly.Python.definitions_[dropdown_pin + 'PressCB'] += `\n\nboard.switch_pressed(board.${dropdown_pin}, ${functionName})\n`;

    return '';
};

Blockly.Python['io_knob_read'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var code = `board.knob_read()`;
    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['io_buzzer_beep'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var duration = Blockly.Python.valueToCode(block, 'duration', Blockly.Python.ORDER_ATOMIC);

    var code = `board.beep(${duration})\n`;
    return code;
};