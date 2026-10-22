// Blockly's standard multiline field uses literal "&#10;" as its XML newline
// escape. Python strings may contain that text, so serialize this field as JSON.
class PythonSourceField extends Blockly.FieldMultilineInput {
  toXml(element) {
    element.setAttribute('source-json', JSON.stringify(this.getValue()));
    element.textContent = this.getValue();
    return element;
  }
  fromXml(element) {
    const saved = element.getAttribute('source-json');
    this.setValue(saved === null ? element.textContent : JSON.parse(saved));
  }
  static fromJson(options) {
    const field = new PythonSourceField(options.text || '');
    field.setMaxLines(8);
    return field;
  }
}
Blockly.fieldRegistry.register('field_python_source', PythonSourceField);
Blockly.defineBlocksWithJsonArray([
{
  "type": "text_code",
  "message0": "Python code %1",
  "args0": [
    {
      "type": "field_python_source",
      "name": "code",
      "text": ""
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230,
  "tooltip": "Python source preserved from the Code tab. Edit here or return to Code.",
  "helpUrl": ""
}
]);
