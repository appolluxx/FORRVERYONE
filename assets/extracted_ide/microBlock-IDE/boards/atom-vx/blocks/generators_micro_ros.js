// var originalFinish = Blockly.Python.finish;

// Blockly.Python.finish = function(code) {
//     var imports = [], definitions = [];
//     for (let name in Blockly.Python.definitions_) {
//       if (name.startsWith('import_')) imports.push(Blockly.Python.definitions_[name]);
//       else definitions.push(Blockly.Python.definitions_[name]);
//     }
//     var finalCode = imports.join('\n') + '\n\n';
//     const ws = Blockly.getMainWorkspace();
//     const all = ws.getAllBlocks();
//     const hasInit = all.some(b =>
//       b.type === 'micro_ros_init' && b.isEnabled()
//     );
//     if (hasInit && Blockly.Python.micro_ros_init_code) {
//       finalCode += Blockly.Python.micro_ros_init_code + '\n';
//     }
//     finalCode += definitions.join('\n') + '\n';
//     finalCode += code;
//     return finalCode;
// };

if (!Blockly.Python.atomVxDefinitionOrderPatched) {
    Blockly.Python.atomVxDefinitionOrderPatched = true;
    Blockly.Python.atomVxOriginalFinish = Blockly.Python.finish;
    Blockly.Python.finish = function(code) {
        var definitions = this.definitions_;
        var priority = function(key) {
            if (key.indexOf('import_') === 0) {
                return 0;
            }
            if (key.indexOf('pre_start_') === 0) {
                return 20;
            }
            if (key === 'start_micro_ros') {
                return 30;
            }
            return 100;
        };

        var orderedDefinitions = {};
        Object.keys(definitions).sort(function(a, b) {
            var priorityDiff = priority(a) - priority(b);
            return priorityDiff || 0;
        }).forEach(function(key) {
            orderedDefinitions[key] = definitions[key];
        });
        this.definitions_ = orderedDefinitions;

        return Blockly.Python.atomVxOriginalFinish.call(this, code);
    };
}

function normalizeMicroRosTopic(topic) {
    if (!topic) {
        return topic;
    }
    return topic.replace(/^(['"])\/+/, '$1');
}

function indentPythonCode(code, indent) {
    if (!code) {
        return code;
    }
    return code.split('\n').map(function(line) {
        return line ? indent + line : line;
    }).join('\n');
}

function cacheIndexedRead(code, readCall, cacheName, setupLines) {
    var pattern = new RegExp(readCall.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\(\\)\\[(\\d+)\\]');
    var match = code.match(pattern);
    if (!match) {
        return code;
    }
    if (setupLines.indexOf(cacheName) < 0) {
        setupLines.push(cacheName);
    }
    return code.replace(pattern, cacheName + '[' + match[1] + ']');
}

function cacheDdsm210ReadVelocity(code, setupLines) {
    var pattern = /ddsm210\.read_velocity\(([^)]+)\)\[0\]/;
    var match = code.match(pattern);
    if (!match) {
        return code;
    }

    var motorId = match[1].trim();
    var safeId = motorId.replace(/[^A-Za-z0-9_]/g, '_');
    var cacheName = '__ddsm210_rpm_' + safeId;
    var setupLine = cacheName + ' = ddsm210.read_velocity(' + motorId + ')[0]';
    if (setupLines.indexOf(setupLine) < 0) {
        setupLines.push(setupLine);
    }
    return code.replace(pattern, cacheName);
}

function defineManualMicroRosPublisherHelpers() {
    Blockly.Python.definitions_['manual_int_publisher_cache'] = '__uros_manual_int_publishers = {}\n';
    Blockly.Python.definitions_['manual_string_publisher_cache'] = '__uros_manual_string_publishers = {}\n';
    Blockly.Python.definitions_['manual_int_publisher_helper'] = [
        'def __uros_publish_int_once(topic, data):',
        Blockly.Python.INDENT + 'if topic not in __uros_manual_int_publishers:',
        Blockly.Python.INDENT + Blockly.Python.INDENT + 'uros.create_int_publisher(topic, 1)',
        Blockly.Python.INDENT + Blockly.Python.INDENT + '__uros_manual_int_publishers[topic] = True',
        Blockly.Python.INDENT + 'uros.update_int(topic, int(data))'
    ].join('\n');
    Blockly.Python.definitions_['manual_string_publisher_helper'] = [
        'def __uros_publish_string_once(topic, data):',
        Blockly.Python.INDENT + 'if topic not in __uros_manual_string_publishers:',
        Blockly.Python.INDENT + Blockly.Python.INDENT + 'uros.create_string_publisher(topic, 1)',
        Blockly.Python.INDENT + Blockly.Python.INDENT + '__uros_manual_string_publishers[topic] = True',
        Blockly.Python.INDENT + 'uros.update_string(topic, data)'
    ].join('\n');
}

Blockly.Python['wifi_connect'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';

    var ssid = Blockly.Python.valueToCode(block, 'ssid', Blockly.Python.ORDER_ATOMIC);
    var password = Blockly.Python.valueToCode(block, 'password', Blockly.Python.ORDER_ATOMIC);

    Blockly.Python.definitions_['connect_wifi'] = `board.connect_wifi(${ssid}, ${password})\n`;

    // var code = `board.connect_wifi(${ssid}, ${password})\n`;
    return '';
};

Blockly.Python['micro_ros_init'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_uros'] = 'import uros';

    var ip_address = Blockly.Python.valueToCode(block, 'ip_address', Blockly.Python.ORDER_ATOMIC);
    var port = Blockly.Python.valueToCode(block, 'port', Blockly.Python.ORDER_ATOMIC);
    var name_space = Blockly.Python.valueToCode(block, 'name_space', Blockly.Python.ORDER_ATOMIC);

    // Blockly.Python.micro_ros_init_code = `uros.start(${ip_address}, ${port}, ${name_space})\n`;

    Blockly.Python.definitions_['start_micro_ros'] = `uros.start(${ip_address}, ${port}, ${name_space})\n`;

    return ''
};

Blockly.Python['micro_ros_init_serial'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_uros'] = 'import uros';

    var tx_pin = Blockly.Python.valueToCode(block, 'tx_pin', Blockly.Python.ORDER_ATOMIC) || '27';
    var rx_pin = Blockly.Python.valueToCode(block, 'rx_pin', Blockly.Python.ORDER_ATOMIC) || '14';
    var baudrate = Blockly.Python.valueToCode(block, 'baudrate', Blockly.Python.ORDER_ATOMIC) || '115200';
    var name_space = Blockly.Python.valueToCode(block, 'name_space', Blockly.Python.ORDER_ATOMIC) || '"robot"';

    Blockly.Python.definitions_['start_micro_ros'] = `uros.start_serial(${tx_pin}, ${rx_pin}, ${baudrate}, ${name_space})\n`;

    return ''
};

Blockly.Python['micro_ros_publish_int'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_time_import_sleep'] = 'from time import sleep';
    Blockly.Python.definitions_['import_uros'] = 'import uros';
    Blockly.Python.definitions_['import_thread'] = 'import _thread';
    
    var topic = normalizeMicroRosTopic(Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC));
    var publish_rate = Blockly.Python.valueToCode(block, 'publish_rate', Blockly.Python.ORDER_ATOMIC);
    var data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);

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

    var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
    for (var i = 0; i < devVarList.length; i++) {
      globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
          Blockly.Names.DEVELOPER_VARIABLE_TYPE));
    }
  
    globals = globals.length ?
        Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

    var statements_callback = Blockly.Python.INDENT + `while True:\n`
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `uros.update_int(${topic}, int(${data}))\n`;
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `sleep(${1 / publish_rate})`;

    var functionName = Blockly.Python.provideFunction_(
        topic + 'publisher',
        ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '(_=None):',
        globals,
        statements_callback]);
    
    Blockly.Python.definitions_[topic + 'publisher'] += `\n\nuros.create_int_publisher(${topic}, ${publish_rate})\n`;
    Blockly.Python.definitions_[topic + 'publisher'] += `_thread.start_new_thread(${functionName}, ())\n`;

    return '';
};

Blockly.Python['micro_ros_publish_string'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_time_import_sleep'] = 'from time import sleep';
    Blockly.Python.definitions_['import_uros'] = 'import uros';
    Blockly.Python.definitions_['import_thread'] = 'import _thread';
    
    var topic = normalizeMicroRosTopic(Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC));
    var publish_rate = Blockly.Python.valueToCode(block, 'publish_rate', Blockly.Python.ORDER_ATOMIC);
    var data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);

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

    var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
    for (var i = 0; i < devVarList.length; i++) {
      globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
          Blockly.Names.DEVELOPER_VARIABLE_TYPE));
    }
  
    globals = globals.length ?
        Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

    var statements_callback = Blockly.Python.INDENT + `while True:\n`
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `uros.update_string(${topic}, ${data})\n`;
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `sleep(${1 / publish_rate})`;

    var functionName = Blockly.Python.provideFunction_(
        topic + 'publisher',
        ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '(_=None):',
        globals,
        statements_callback]);
    
    Blockly.Python.definitions_[topic + 'publisher'] += `\n\nuros.create_string_publisher(${topic}, ${publish_rate})\n`;
    Blockly.Python.definitions_[topic + 'publisher'] += `_thread.start_new_thread(${functionName}, ())\n`;

    return '';
};

Blockly.Python['micro_ros_publish_int_manual'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_uros'] = 'import uros';
    defineManualMicroRosPublisherHelpers();

    var topic = normalizeMicroRosTopic(Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC));
    var data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);

    return `__uros_publish_int_once(${topic}, ${data})\n`;
};

Blockly.Python['micro_ros_publish_string_manual'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['import_uros'] = 'import uros';
    defineManualMicroRosPublisherHelpers();

    var topic = normalizeMicroRosTopic(Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC));
    var data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);

    return `__uros_publish_string_once(${topic}, ${data})\n`;
};

Blockly.Python['micro_ros_subscribe_cmd_vel'] = function(block) {
    Blockly.Python.definitions_['import_uros'] = 'import uros';
    Blockly.Python.definitions_['from_time_import_sleep'] = 'from time import sleep';
    Blockly.Python.definitions_['import_thread'] = 'import _thread';

    var topic = normalizeMicroRosTopic(Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC) || '"cmd_vel"');
    Blockly.Python.cmdVelTaskContext = true;
    Blockly.Python.cmdVelTaskNeedsBasic = false;
    Blockly.Python.cmdVelTaskNeedsFull = false;
    var statements_callback = Blockly.Python.statementToCode(block, 'callback');
    var needsBasic = Blockly.Python.cmdVelTaskNeedsBasic;
    var needsFull = Blockly.Python.cmdVelTaskNeedsFull;
    Blockly.Python.cmdVelTaskContext = false;

    Blockly.Python.definitions_['pre_start_cmd_vel_subscriber'] = `uros.subscribe_cmd_vel(${topic})\n`;

    statements_callback = indentPythonCode(statements_callback, Blockly.Python.INDENT);
    if (!statements_callback) {
        statements_callback = Blockly.Python.INDENT + Blockly.Python.INDENT + 'pass\n';
    }

    var setup = '';
    if (needsBasic) {
        setup += Blockly.Python.INDENT + Blockly.Python.INDENT + `__cmd_linear_x, __cmd_angular_z = uros.read_cmd_vel()\n`;
    }
    if (needsFull) {
        setup += Blockly.Python.INDENT + Blockly.Python.INDENT + `__cmd_vel_full = uros.read_cmd_vel_full()\n`;
    }

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

    var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
    for (var i = 0; i < devVarList.length; i++) {
      globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
          Blockly.Names.DEVELOPER_VARIABLE_TYPE));
    }
  
    globals = globals.length ?
        Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

    var functionName = Blockly.Python.provideFunction_(
        'cmdVelTask',
        ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '(_=None):',
        globals,
        Blockly.Python.INDENT + `while True:\n` +
        setup +
        statements_callback +
        Blockly.Python.INDENT + Blockly.Python.INDENT + `sleep(0.02)`]);

    Blockly.Python.definitions_['cmd_vel_task'] = `_thread.start_new_thread(${functionName}, ())\n`;

    return '';
};

Blockly.Python['micro_ros_read_cmd_vel_full'] = function(block) {
    Blockly.Python.definitions_['import_uros'] = 'import uros';

    var index = block.getFieldValue('value');

    if (Blockly.Python.cmdVelTaskContext) {
        Blockly.Python.cmdVelTaskNeedsFull = true;
        return [`__cmd_vel_full[${index}]`, Blockly.Python.ORDER_NONE];
    }

    return [`uros.read_cmd_vel_full()[${index}]`, Blockly.Python.ORDER_NONE];
};

Blockly.Python['micro_ros_publish_scan'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_time_import_sleep'] = 'from time import sleep';
    Blockly.Python.definitions_['import_uros'] = 'import uros';
    Blockly.Python.definitions_['import_thread'] = 'import _thread';
    
    var tx_pin = Blockly.Python.valueToCode(block, 'tx_pin', Blockly.Python.ORDER_ATOMIC);
    var rx_pin = Blockly.Python.valueToCode(block, 'rx_pin', Blockly.Python.ORDER_ATOMIC);
    var topic = normalizeMicroRosTopic(Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC));
    var publish_rate = block.getFieldValue('publish_rate');
    
    Blockly.Python.definitions_['scan_publisher'] = `uros.publish_scan(${tx_pin}, ${rx_pin}, ${topic}, ${publish_rate})\n`;

    return '';
};

Blockly.Python['micro_ros_publish_imu'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_time_import_sleep'] = 'from time import sleep';
    Blockly.Python.definitions_['import_uros'] = 'import uros';
    Blockly.Python.definitions_['import_thread'] = 'import _thread';
    
    var qw = Blockly.Python.valueToCode(block, 'qw', Blockly.Python.ORDER_ATOMIC) || '1.0';
    var qx = Blockly.Python.valueToCode(block, 'qx', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var qy = Blockly.Python.valueToCode(block, 'qy', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var qz = Blockly.Python.valueToCode(block, 'qz', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var gx = Blockly.Python.valueToCode(block, 'gx', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var gy = Blockly.Python.valueToCode(block, 'gy', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var gz = Blockly.Python.valueToCode(block, 'gz', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var ax = Blockly.Python.valueToCode(block, 'ax', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var ay = Blockly.Python.valueToCode(block, 'ay', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var az = Blockly.Python.valueToCode(block, 'az', Blockly.Python.ORDER_ATOMIC) || '0.0';
    var topic = normalizeMicroRosTopic(Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC));
    var publish_rate = Blockly.Python.valueToCode(block, 'publish_rate', Blockly.Python.ORDER_ATOMIC) || '30';
    var sensorReads = [];
    var sensorReadLines = '';

    qw = cacheIndexedRead(qw, 'imu.read_quaternion', '__imu_quat', sensorReads);
    qx = cacheIndexedRead(qx, 'imu.read_quaternion', '__imu_quat', sensorReads);
    qy = cacheIndexedRead(qy, 'imu.read_quaternion', '__imu_quat', sensorReads);
    qz = cacheIndexedRead(qz, 'imu.read_quaternion', '__imu_quat', sensorReads);
    gx = cacheIndexedRead(gx, 'imu.read_gyro', '__imu_gyro', sensorReads);
    gy = cacheIndexedRead(gy, 'imu.read_gyro', '__imu_gyro', sensorReads);
    gz = cacheIndexedRead(gz, 'imu.read_gyro', '__imu_gyro', sensorReads);
    ax = cacheIndexedRead(ax, 'imu.read_accel', '__imu_accel', sensorReads);
    ay = cacheIndexedRead(ay, 'imu.read_accel', '__imu_accel', sensorReads);
    az = cacheIndexedRead(az, 'imu.read_accel', '__imu_accel', sensorReads);

    if (sensorReads.indexOf('__imu_quat') >= 0) {
        sensorReadLines += Blockly.Python.INDENT + Blockly.Python.INDENT + `__imu_quat = imu.read_quaternion()\n`;
    }
    if (sensorReads.indexOf('__imu_gyro') >= 0) {
        sensorReadLines += Blockly.Python.INDENT + Blockly.Python.INDENT + `__imu_gyro = imu.read_gyro()\n`;
    }
    if (sensorReads.indexOf('__imu_accel') >= 0) {
        sensorReadLines += Blockly.Python.INDENT + Blockly.Python.INDENT + `__imu_accel = imu.read_accel()\n`;
    }

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

    var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
    for (var i = 0; i < devVarList.length; i++) {
      globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
          Blockly.Names.DEVELOPER_VARIABLE_TYPE));
    }
  
    globals = globals.length ?
        Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

    var statements_callback = Blockly.Python.INDENT + `while True:\n`
    statements_callback += sensorReadLines;
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `uros.publish_imu(${qw}, ${qx}, ${qy}, ${qz}, ${gx}, ${gy}, ${gz}, ${ax}, ${ay}, ${az}, ${topic}, ${publish_rate})\n`;
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `sleep(0.02)`;

    var functionName = Blockly.Python.provideFunction_(
        'imu_publisher',
        ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '(_=None):',
        globals,
        statements_callback]);
    
    Blockly.Python.definitions_['imu_publisher'] += `\n_thread.start_new_thread(${functionName}, ())\n`;

    return '';
};

Blockly.Python['micro_ros_publish_odom'] = function(block) {
    Blockly.Python.definitions_['import_board'] = 'import board';
    Blockly.Python.definitions_['from_time_import_sleep'] = 'from time import sleep';
    Blockly.Python.definitions_['import_uros'] = 'import uros';
    Blockly.Python.definitions_['import_thread'] = 'import _thread';
    
    var left_rpm = Blockly.Python.valueToCode(block, 'left_rpm', Blockly.Python.ORDER_ATOMIC);
    var right_rpm = Blockly.Python.valueToCode(block, 'right_rpm', Blockly.Python.ORDER_ATOMIC);
    var wheel_radius = Blockly.Python.valueToCode(block, 'wheel_radius', Blockly.Python.ORDER_ATOMIC);
    var wheel_base = Blockly.Python.valueToCode(block, 'wheel_base', Blockly.Python.ORDER_ATOMIC);
    var topic = normalizeMicroRosTopic(Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC));
    var publish_rate = Blockly.Python.valueToCode(block, 'publish_rate', Blockly.Python.ORDER_ATOMIC) || '30';
    var motorReads = [];
    var motorReadLines = '';

    left_rpm = cacheDdsm210ReadVelocity(left_rpm, motorReads);
    right_rpm = cacheDdsm210ReadVelocity(right_rpm, motorReads);

    for (var readIndex = 0; readIndex < motorReads.length; readIndex++) {
        motorReadLines += Blockly.Python.INDENT + Blockly.Python.INDENT + motorReads[readIndex] + '\n';
    }

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

    var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
    for (var i = 0; i < devVarList.length; i++) {
      globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
          Blockly.Names.DEVELOPER_VARIABLE_TYPE));
    }
  
    globals = globals.length ?
        Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

    var statements_callback = Blockly.Python.INDENT + `while True:\n`
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `if ${wheel_radius} is None or ${wheel_base} is None:\n`;
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + Blockly.Python.INDENT + `sleep(0.02)\n`;
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + Blockly.Python.INDENT + `continue\n`;
    statements_callback += motorReadLines;
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `uros.publish_diff_odom_rpm(${left_rpm}, ${right_rpm}, ${wheel_radius}, ${wheel_base}, ${topic}, ${publish_rate})\n`;
    statements_callback += Blockly.Python.INDENT + Blockly.Python.INDENT + `sleep(0.02)`;

    var functionName = Blockly.Python.provideFunction_(
        'diff_odom_publisher',
        ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '(_=None):',
        globals,
        statements_callback]);
    
    Blockly.Python.definitions_['diff_odom_publisher'] += `\n_thread.start_new_thread(${functionName}, ())\n`;

    return '';
};
