Blockly.Python['run_in_background_custom'] = function(block) {
  Blockly.Python.definitions_['from_time_import_sleep'] = 'from time import sleep';
  Blockly.Python.definitions_['import__thread'] = 'import _thread';

  var statements_callback = Blockly.Python.statementToCode(block, 'callback').trim();

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

  if (typeof nextRunInBackground !== "number") {
      nextRunInBackground = 1;
  }

  if (!statements_callback) {
      statements_callback = 'pass';
  }

  var functionName = Blockly.Python.provideFunction_(
      'runInBackground_' + nextRunInBackground,
      ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '():',
      globals,
      Blockly.Python.INDENT + 'sleep(0.1)\n' + Blockly.Python.INDENT + statements_callback]);

  var key = 'run_in_background_' + nextRunInBackground;
  if (!Blockly.Python.definitions_[key]) {
      Blockly.Python.definitions_[key] = '';
  }

  Blockly.Python.definitions_[key] += `_thread.start_new_thread(${functionName}, ())\n`;

  nextRunInBackground++;
  return '';
};