Blockly.Python['io_digital_write'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_digitalio'] = 'import digitalio';

    var pin = block.getFieldValue('pin');
    var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);

    Blockly.Python.definitions_['PIN_' + pin] = 'PIN_' + pin + ' = digitalio.DigitalInOut(board.' + pin + ')\n' + 'PIN_' + pin + '.direction = digitalio.Direction.OUTPUT';

    var code = `PIN_${pin}.value = ${value}\n`;
    return code;
};

Blockly.Python['io_analog_write'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_pwmio'] = 'import pwmio';

    var pin = block.getFieldValue('pin');
    var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);

    Blockly.Python.definitions_['PIN_' + pin] = 'PIN_' + pin + ' = pwmio.PWMOut(board.' + pin + ', frequency=1000, duty_cycle=0)'

    var duty = Math.floor(value * 65535 / 1023);
    var code = `PIN_${pin}.duty_cycle = ${duty}\n`;
    return code;
};

Blockly.Python['io_digital_read'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_digitalio'] = 'import digitalio';

    var pin = block.getFieldValue('pin');
    var pull = block.getFieldValue('pull');

    if (pull == "NONE") {
        Blockly.Python.definitions_['PIN_' + pin] = 'PIN_' + pin + ' = digitalio.DigitalInOut(board.' + pin + ')\n' + 'PIN_' + pin + '.direction = digitalio.Direction.INPUT';
    }
    else {
        Blockly.Python.definitions_['PIN_' + pin] = 'PIN_' + pin + ' = digitalio.DigitalInOut(board.' + pin + ')\n' + 'PIN_' + pin + '.direction = digitalio.Direction.INPUT\n' + 'PIN_' + pin + '.pull = digitalio.Pull.' + pull;
    }

    var code = `PIN_${pin}.value`;

    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['io_analog_read'] = function (block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_analogio'] = 'import analogio';

    var pin = block.getFieldValue('pin');

    Blockly.Python.definitions_['PIN_' + pin] = 'PIN_' + pin + ' = analogio.AnalogIn(board.' + pin + ')'

    var code = `PIN_${pin}.value >> 6`;

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

Blockly.Python['switch_on_pressed'] = function(block) {
    var dropdown_pin = block.getFieldValue('pin');
    var pollInterval = block.getField('POLL_INTERVAL') ? Number(block.getFieldValue('POLL_INTERVAL')) : 0.05;
    if (!Number.isFinite(pollInterval) || pollInterval < 0) pollInterval = 0.05;
    var statements_callback = Blockly.Python.statementToCode(block, 'callback');

    var globals = [];
    var workspace = block.workspace;
    var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
    for (var i = 0, variable; variable = variables[i]; i++) {
      var varName = variable.name;
      if (block.getVars().indexOf(varName) == -1) {
        globals.push(Blockly.Python.nameDB_.getName(varName,
            Blockly.VARIABLE_CATEGORY_NAME));
      }
    }
    var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
    for (var i = 0; i < devVarList.length; i++) {
      globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
          Blockly.Names.DEVELOPER_VARIABLE_TYPE));
    }

    globals = globals.length ?
        Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

    Blockly.Python.IN_ASYNC = true;
    var statements_callback = Blockly.Python.statementToCode(block, 'callback');
    Blockly.Python.IN_ASYNC = false;

    if (statements_callback) {
      statements_callback = statements_callback
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => Blockly.Python.INDENT + Blockly.Python.INDENT + Blockly.Python.INDENT + line)
        .join('\n') + '\n';
    } else {
      statements_callback = Blockly.Python.INDENT + Blockly.Python.INDENT + Blockly.Python.INDENT + "pass\n";
    }

    var functionName = Blockly.Python.provideFunction_(
        dropdown_pin + '_on_press',
        [
          `async def ${Blockly.Python.FUNCTION_NAME_PLACEHOLDER_}():`,
          globals,
          Blockly.Python.INDENT + "while True:",
          Blockly.Python.INDENT + Blockly.Python.INDENT + `if (robot.read_button_${dropdown_pin}() == True):`,
          statements_callback,
          Blockly.Python.INDENT + Blockly.Python.INDENT + `await asyncio.sleep(${pollInterval})`
        ]);

    return '';
};

Blockly.Python['switch_get_value'] = function (block) {
    Blockly.Python.definitions_['import_robot'] = 'import robot';

    var dropdown_n = block.getFieldValue('n');

    if (dropdown_n == "SW_A") {
        var code = `robot.read_button_a()`
    }
    else if (dropdown_n == "SW_B") {
        var code = `robot.read_button_b()`
    }

    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['switch_is_press'] = function (block) {
    Blockly.Python.definitions_['import_robot'] = 'import robot';

    var dropdown_n = block.getFieldValue('n');

    if (dropdown_n == "SW_A") {
        var code = `robot.read_button_a() == True`
    }
    else if (dropdown_n == "SW_B") {
        var code = `robot.read_button_b() == True`
    }

    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['switch_is_release'] = function (block) {
    Blockly.Python.definitions_['import_robot'] = 'import robot';

    var dropdown_n = block.getFieldValue('n');

    if (dropdown_n == "SW_A") {
        var code = `robot.read_button_a() == False`
    }
    else if (dropdown_n == "SW_B") {
        var code = `robot.read_button_b() == False`
    }

    return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['play_sound_frequency'] = function(block) {
    var frequency = Blockly.Python.valueToCode(block, 'frequency', Blockly.Python.ORDER_ATOMIC);
    var duration = Blockly.Python.valueToCode(block, 'duration', Blockly.Python.ORDER_ATOMIC);
    var code = `robot.tone(${frequency}, ${duration})\n`;
    return code;
};
