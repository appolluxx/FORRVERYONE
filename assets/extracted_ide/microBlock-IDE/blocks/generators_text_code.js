let pythonSourceFragments = null;
let pythonSourceSequence = 0;
function fragmentsToken() {
  return Date.now().toString(36) + '_' + (++pythonSourceSequence).toString(36);
}
function indentPythonSourceFragment(source, indent) {
  if (!indent) return source;
  let output = '', quote = '', triple = false, escaped = false;
  let comment = false, lineStart = true;
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (lineStart && character !== '\n' && character !== '\r') {
      // Indentation within a continued string is part of its value, even when
      // that line begins with the closing quotes. Only indent Python syntax.
      if (!quote) output += indent;
      lineStart = false;
    }
    output += character;
    if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') output += source[++index];
      if (quote && !triple && !escaped) quote = '';
      escaped = false;
      comment = false;
      lineStart = true;
      continue;
    }
    if (comment) continue;
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === quote) {
        if (!triple) quote = '';
        else if (source.slice(index, index + 3) === quote.repeat(3)) {
          output += source.slice(index + 1, index + 3);
          index += 2;
          quote = '';
          triple = false;
        }
      }
    } else if (character === '#') comment = true;
    else if (character === '"' || character === "'") {
      quote = character;
      triple = source.slice(index, index + 3) === character.repeat(3);
      if (triple) { output += source.slice(index + 1, index + 3); index += 2; }
    }
  }
  return output;
}
Blockly.Python['text_code'] = function(block) {
  const code = block.getFieldValue('code') || '';
  if (pythonSourceFragments) {
    // Expand after Blockly's finish/whitespace cleanup. This also protects raw
    // Python strings when the user connects another block after this one.
    const token = '__roboblocks_source_' + fragmentsToken() + '__';
    pythonSourceFragments.push({token, code});
    return token + '\n';
  }
  return code && !code.endsWith('\n') ? code + '\n' : code;
};

// Normal Blockly generation trims whitespace, including whitespace inside a
// multiline Python string. Preserve a complete raw-source fallback verbatim.
const generatePythonWorkspace = Blockly.Python.workspaceToCode;
Blockly.Python.workspaceToCode = function(workspace) {
  const tops = workspace.getTopBlocks(true).filter(block => block.isEnabled());
  if (tops.length === 1) {
    const top = tops[0];
    const raw = top.type === 'controls_on_start' && !top.getNextBlock()
      ? top.getInputTargetBlock('block') : top;
    if (raw && raw.type === 'text_code' && raw.isEnabled() && !raw.getNextBlock() &&
        raw.data === 'roboblocks-code2block:full-source') return raw.getFieldValue('code') || '';
  }
  const previousFragments = pythonSourceFragments;
  const fragments = [];
  pythonSourceFragments = fragments;
  try {
    let generated = generatePythonWorkspace.call(this, workspace);
    for (const {token, code} of fragments) {
      generated = generated.replace(new RegExp('^([ \\t]*)' + token + '(?:\\r?\\n|$)', 'm'), (_, indent) => {
        const source = code && !code.endsWith('\n') ? code + '\n' : code;
        return indentPythonSourceFragment(source, indent);
      });
    }
    return generated;
  } finally {
    pythonSourceFragments = previousFragments;
  }
};
