Blockly.Blocks['run_in_background_custom'] = {
  init: function() {
    this.appendDummyInput()
      .appendField("run in background");
      
    this.appendStatementInput("callback");

    this.setPreviousStatement(false);
    this.setNextStatement(false);
    this.setColour("#8E44AD");
    this.setTooltip("");
    this.setHelpUrl("");
  }
};