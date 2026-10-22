/* Conservative Python-to-Blockly prototype. Never evaluates Python source. */
(function (root) {
    'use strict';

    const FULL_SOURCE = 'roboblocks-code2block:full-source';
    const NAMESPACE = 'https://developers.google.com/blockly/xml';

    function raw(code, neutral) {
        return { type: 'text_code', fields: { code }, raw: true, neutral: !!neutral };
    }

    function block(type, fields, values, statements) {
        return { type, fields: fields || {}, values: values || {}, statements: statements || {} };
    }

    // Multiline strings, line joining, and tab indentation use whole-source fallback.
    function lex(line) {
        const tokens = [];
        let depth = 0;
        for (let i = 0; i < line.length;) {
            const c = line[i];
            if (/\s/.test(c)) { i++; continue; }
            if (c === '#') { tokens.push({ kind: 'comment', value: line.slice(i) }); break; }
            if (c === '"' || c === "'") {
                if (line.slice(i, i + 3) === c.repeat(3)) throw Error('Multiline string');
                const start = i++;
                let value = '', simple = true, closed = false;
                while (i < line.length) {
                    const next = line[i++];
                    if (next === c) { closed = true; break; }
                    if (next === '\\') {
                        if (i === line.length) throw Error('Continued string');
                        const escape = line[i++];
                        if (escape !== '\\' && escape !== "'" && escape !== '"') simple = false;
                        value += escape;
                    } else value += next;
                }
                if (!closed) throw Error('Unclosed string');
                tokens.push({ kind: 'string', value, simple, original: line.slice(start, i) });
                continue;
            }
            const number = line.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
            if (number) { tokens.push({ kind: 'number', value: number[0] }); i += number[0].length; continue; }
            const name = line.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/);
            if (name) { tokens.push({ kind: 'name', value: name[0] }); i += name[0].length; continue; }
            if (c === '\\') throw Error('Explicit line continuation');
            const operator = line.slice(i).match(/^(?:\*\*|\/\/|==|!=|<=|>=|:=|<<|>>|->|\+=|-=|\*=|\/=)/);
            const value = operator ? operator[0] : c;
            tokens.push({ kind: 'symbol', value });
            if ('([{'.includes(c)) depth++;
            if (')]}'.includes(c)) depth--;
            if (depth < 0) throw Error('Unbalanced delimiter');
            i += value.length;
        }
        if (depth !== 0) throw Error('Multiline expression');
        return tokens;
    }

    function sourceLines(source) {
        return (source.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) || [])
            .filter(line => line.length)
            .map(original => {
                const text = original.replace(/[\r\n]+$/, '');
                const prefix = text.match(/^[ \t]*/)[0];
                if (prefix.includes('\t')) throw Error('Tab indentation');
                const tokens = lex(text.slice(prefix.length));
                return { original, text: text.slice(prefix.length), indent: prefix.length, tokens,
                    quiet: !tokens.length || tokens[0].kind === 'comment' };
            });
    }

    function units(lines, indent) {
        const result = [];
        for (let i = 0; i < lines.length;) {
            if (lines[i].quiet) { result.push([lines[i++]]); continue; }
            if (lines[i].indent !== indent) throw Error('Unexpected indentation');
            const start = i++;
            let decorated = lines[start].text.startsWith('@');
            for (; i < lines.length; i++) {
                const line = lines[i];
                if (line.quiet || line.indent > indent) continue;
                if (line.indent < indent) throw Error('Unexpected dedent');
                if (/^(elif\b|else\s*:|except\b|except\s*\*|finally\s*:)/.test(line.text)) continue;
                if (decorated && (/^@/.test(line.text) || /^(?:async\s+)?(?:def|class)\b/.test(line.text))) {
                    if (!line.text.startsWith('@')) decorated = false;
                    continue;
                }
                break;
            }
            result.push(lines.slice(start, i));
        }
        return result;
    }

    function unparen(tokens) {
        while (tokens.length > 2 && tokens[0].kind === 'symbol' && tokens[0].value === '(' && tokens[tokens.length - 1].kind === 'symbol' && tokens[tokens.length - 1].value === ')') {
            let depth = 0, encloses = true;
            for (let i = 0; i < tokens.length - 1; i++) {
                if (tokens[i].kind === 'symbol' && tokens[i].value === '(') depth++;
                if (tokens[i].kind === 'symbol' && tokens[i].value === ')') depth--;
                if (depth === 0) { encloses = false; break; }
            }
            if (!encloses) break;
            tokens = tokens.slice(1, -1);
        }
        return tokens;
    }

    function expression(input) {
        const tokens = unparen(input);
        if (tokens.map(t => t.value).join('') === 'ticks_ms()') return {node:block('controls_millis'),kind:'Number'};
        if (tokens.length === 1 && tokens[0].kind === 'string' && tokens[0].simple) {
            return { node: block('text', { TEXT: tokens[0].value }), kind: 'String' };
        }
        if (tokens.length === 1 && /^(True|False)$/.test(tokens[0].value)) {
            return { node: block('logic_boolean', { BOOL: tokens[0].value.toUpperCase() }), kind: 'Boolean' };
        }
        const numberTokens = tokens.length === 2 && /^[+-]$/.test(tokens[0].value) ? tokens.slice(1) : tokens;
        if (numberTokens.length === 1 && numberTokens[0].kind === 'number') {
            const spelling = tokens.map(token => token.value).join('');
            const value = Number(spelling);
            // FieldNumber cannot preserve Python's large integers or integral floats.
            if (/^[+-]?0+[1-9]\d*$/.test(spelling) || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER ||
                (/[.eE]/.test(spelling) && Number.isInteger(value))) return null;
            return { node: block('math_number', { NUM: String(value) }), kind: 'Number' };
        }
        let depth = 0;
        const comparisons = { '==': 'EQ', '!=': 'NEQ', '<': 'LT', '<=': 'LTE', '>': 'GT', '>=': 'GTE' };
        const positions = [];
        tokens.forEach((token, index) => {
            if (token.kind !== 'symbol') return;
            if ('([{'.includes(token.value)) depth++;
            else if (')]}'.includes(token.value)) depth--;
            else if (!depth && comparisons[token.value]) positions.push(index);
        });
        if (positions.length === 1) {
            const index = positions[0], left = expression(tokens.slice(0, index)), right = expression(tokens.slice(index + 1));
            if (left && right) return { node: block('logic_compare', { OP: comparisons[tokens[index].value] }, { A: left.node, B: right.node }), kind: 'Boolean' };
        }
        return null;
    }

    function argumentsOf(tokens) {
        const result = [];
        let start = 0, depth = 0;
        tokens.forEach((token, index) => {
            if (token.kind !== 'symbol') return;
            if ('([{'.includes(token.value)) depth++;
            else if (')]}'.includes(token.value)) depth--;
            else if (token.value === ',' && !depth) { result.push(tokens.slice(start, index)); start = index + 1; }
        });
        if (start < tokens.length) result.push(tokens.slice(start));
        else if (tokens.length) return null;
        return result;
    }

    function simpleStatement(line) {
        const tokens = line.tokens;
        if (!tokens.length || tokens[0].kind === 'comment' || (tokens.length === 1 && tokens[0].value === 'pass')) {
            return raw(line.original.slice(line.indent), true);
        }
        if (tokens.some(token => token.kind === 'comment')) return null;
        const open = tokens.findIndex(token => token.value === '(');
        if (open < 1 || tokens[tokens.length - 1].value !== ')') return null;
        const name = tokens.slice(0, open).map(token => token.value).join('');
        const args = argumentsOf(tokens.slice(open + 1, -1));
        if (!args) return null;
        const values = (type, names, fields) => {
            if (args.length !== names.length) return null;
            const inputs = {};
            for (let i = 0; i < names.length; i++) {
                const value = expression(args[i]);
                if (!value || (name !== 'print' && value.kind !== 'Number')) return null;
                inputs[names[i]] = value.node;
            }
            return block(type, fields, inputs);
        };
        const waits = { sleep: 'controls_wait', sleep_ms: 'controls_wait_ms', sleep_us: 'controls_wait_us' };
        if (waits[name]) return values(waits[name], ['time']);
        if (name === 'print') return values('text_print', ['TEXT']);
        if (name === 'robot.motor_drive_all') return values('motor_drive_all', ['speed1', 'speed2']);
        if (name === 'motor.drive_all') return values('motor_drive_all', ['speed1', 'speed2', 'speed3', 'speed4']);
        if (/^(robot\.motor_stop_all|motor\.stop)$/.test(name)) return values('motor_stop', []);
        if (name === 'robot.set_ramp') return values('motor_set_ramp', ['ramp_up', 'ramp_down']);
        if (/^(robot\.motor_drive|motor\.drive_single|robot\.servo_set_degree|servo\.set_degree)$/.test(name) && args.length === 2) {
            const servo = name.includes('servo'), index = args[0].map(token => token.value).join('');
            const value = expression(args[1]);
            if (!/^\d$/.test(index) || !value || value.kind !== 'Number') return null;
            return block(servo ? 'servo_set_degree' : 'motor_drive_single', { [servo ? 'servo' : 'motor']: index }, { [servo ? 'degree' : 'speed']: value.node });
        }
        const direction = name.match(/^(robot|motor)\.(move|spin|turn_front|turn_back)$/);
        if (direction && args.length === 2) {
            const constant = args[0].map(token => token.value).join('');
            const value = expression(args[1]);
            const choices = direction[2] === 'move' ? ['forward', 'backward'] : ['left', 'right'];
            const selected = choices.find(choice => constant === direction[1] + '.' + choice);
            if (!selected || !value || value.kind !== 'Number') return null;
            const field = direction[2].startsWith('turn') ? 'turn' : direction[2];
            return block('motor_' + direction[2], { [field]: selected }, { speed: value.node });
        }
        return null;
    }

    function convertUnit(lines) {
        const first = lines[0];
        const substantive = lines.filter(line => !line.quiet);
        if (substantive.length <= 1 && !/^(if|while)\b/.test(first.text)) {
            const converted = simpleStatement(first);
            if (!converted) return null;
            return [converted].concat(lines.slice(1).map(line => raw(line.original.slice(Math.min(line.indent, first.indent)), true)));
        }
        const clauses = [];
        lines.forEach((line, index) => { if (!line.quiet && line.indent === first.indent) clauses.push(index); });
        if (!clauses.length) return null;
        const isWhile = /^while\b/.test(first.text);
        if (!isWhile && !/^if\b/.test(first.text)) return null;
        if (isWhile && clauses.length !== 1) return null;
        const conditions = [], bodies = [];
        let hasElse = false;
        for (let c = 0; c < clauses.length; c++) {
            const header = lines[clauses[c]], tokens = header.tokens;
            if (tokens[tokens.length - 1].value !== ':' || tokens.some(token => token.kind === 'comment')) return null;
            const keyword = tokens[0].value;
            if (c > 0 && keyword !== 'elif' && keyword !== 'else') return null;
            if (keyword === 'else') {
                if (tokens.length !== 2 || c !== clauses.length - 1) return null;
                hasElse = true;
            } else {
                const value = expression(tokens.slice(1, -1));
                if (!value || (!isWhile && value.kind !== 'Boolean') || value.kind === 'String') return null;
                conditions.push(value.node);
            }
            const bodyLines = lines.slice(clauses[c] + 1, c + 1 < clauses.length ? clauses[c + 1] : lines.length);
            const firstBody = bodyLines.find(line => !line.quiet);
            if (!firstBody || firstBody.indent <= first.indent) return null;
            const body = [];
            for (const unit of units(bodyLines, firstBody.indent)) {
                const converted = convertUnit(unit);
                if (!converted) return null;
                body.push(...converted);
            }
            bodies.push(body);
        }
        if (isWhile) return [block('while_loop', {}, { condition: conditions[0] }, { DO: bodies[0] })];
        const values = {}, statements = {};
        conditions.forEach((condition, index) => { values['IF' + index] = condition; statements['DO' + index] = bodies[index]; });
        if (hasElse) statements.ELSE = bodies[bodies.length - 1];
        const result = block('controls_if', {}, values, statements);
        result.mutation = { elseif: String(conditions.length - 1), else: hasElse ? '1' : '0' };
        return [result];
    }

    function makeDom(nodes, fullSource) {
        const doc = root.document.implementation.createDocument(NAMESPACE, 'xml', null);
        const element = (name, attributes, content) => {
            const el = doc.createElementNS(NAMESPACE, name);
            Object.entries(attributes || {}).forEach(([key, value]) => el.setAttribute(key, String(value)));
            if (content !== undefined) el.textContent = String(content);
            return el;
        };
        function chain(items) {
            let first = null, previous = null;
            items.forEach(item => {
                const el = element('block', { type: item.type });
                if (item.mutation) el.appendChild(element('mutation', item.mutation));
                Object.entries(item.fields || {}).forEach(([name, value]) => el.appendChild(element('field', { name }, value)));
                Object.entries(item.values || {}).forEach(([name, value]) => {
                    const input = element('value', { name }); input.appendChild(chain([value])); el.appendChild(input);
                });
                Object.entries(item.statements || {}).forEach(([name, body]) => {
                    if (!body.length) return;
                    const input = element('statement', { name }); input.appendChild(chain(body)); el.appendChild(input);
                });
                if (fullSource && item.type === 'text_code') el.appendChild(element('data', {}, FULL_SOURCE));
                if (previous) { const next = element('next'); next.appendChild(el); previous.appendChild(next); }
                else first = el;
                previous = el;
            });
            return first;
        }
        doc.documentElement.appendChild(chain([block('controls_on_start', {}, {}, { block: nodes })]));
        return doc.documentElement;
    }

    function count(nodes) {
        let convertedCount = 0, rawCount = 0;
        nodes.forEach(node => {
            if (node.raw) { if (node.fields.code.trim()) rawCount++; }
            else convertedCount++;
            Object.values(node.statements || {}).forEach(body => {
                const child = count(body); convertedCount += child.convertedCount; rawCount += child.rawCount;
            });
        });
        return { convertedCount, rawCount };
    }

    function plan(lines) {
        const result = [];
        for (const unit of units(lines, 0)) {
            const kept = unit.filter(line => !line.omit);
            if (!kept.length) continue;
            const converted = convertUnit(kept);
            result.push(...(converted || [raw(kept.map(line => line.original).join(''))]));
        }
        return result.reduce((joined, node) => {
            const last = joined[joined.length - 1];
            if (last && last.raw && node.raw) last.fields.code += node.fields.code;
            else joined.push(node);
            return joined;
        }, []);
    }

    function generate(dom, Blockly, existingWorkspace) {
        const workspace = existingWorkspace || new Blockly.Workspace();
        const generator = Blockly.Python;
        const properties = ['definitions_', 'functionNames_', 'nameDB_', 'variableDB_', 'isInitialized', 'IN_ASYNC', 'uploadModuleList'];
        const saved = properties.map(name => [name, Object.getOwnPropertyDescriptor(generator, name)]);
        const finish = generator.finish;
        let imports = [];
        Blockly.Events.disable();
        try {
            generator.nameDB_ = undefined;
            generator.IN_ASYNC = false;
            generator.finish = function (code) {
                imports = Object.values(this.definitions_ || {}).filter(value => /^(?:from\s+\S+\s+)?import\s+/.test(value));
                return finish.call(this, code);
            };
            if (!existingWorkspace) Blockly.Xml.domToWorkspace(dom.cloneNode(true), workspace);
            return { code: generator.workspaceToCode(workspace), imports };
        } finally {
            if (!existingWorkspace) workspace.dispose();
            generator.finish = finish;
            saved.forEach(([name, descriptor]) => {
                if (descriptor) Object.defineProperty(generator, name, descriptor);
                else delete generator[name];
            });
            Blockly.Events.enable();
        }
    }

    // Compare logical lines, indentation structure, literal values and comments.
    function fingerprint(code) {
        const stack = [0], result = [];
        for (const line of sourceLines(code)) {
            if (!line.tokens.length) continue;
            if (!line.quiet) {
                while (line.indent < stack[stack.length - 1]) stack.pop();
                if (line.indent > stack[stack.length - 1]) stack.push(line.indent);
            }
            let tokens = line.tokens.map(token => {
                if (token.kind === 'string') return 'string:' + JSON.stringify(token.simple ? token.value : token.original);
                if (token.kind === 'number') return 'number:' + (/[.eE]/.test(token.value) ? 'float:' : 'int:') + Number(token.value);
                return token.kind + ':' + token.value.trimEnd();
            });
            let before;
            do {
                before = tokens.length;
                for (let i = 0; i + 2 < tokens.length; i++) {
                    if (tokens[i] === 'symbol:(' && /^symbol:[+-]$/.test(tokens[i + 1]) &&
                        /^number:/.test(tokens[i + 2]) && tokens[i + 3] === 'symbol:)' &&
                        !(i > 0 && /^(name:|symbol:\))/.test(tokens[i - 1]))) {
                        tokens.splice(i, 4, tokens[i + 1], tokens[i + 2]);
                        continue;
                    }
                    if (tokens[i] === 'symbol:(' && /^(number:|string:|name:(?:True|False)$)/.test(tokens[i + 1]) && tokens[i + 2] === 'symbol:)') {
                        if (i > 0 && /^(name:|symbol:\))/.test(tokens[i - 1])) continue;
                        tokens.splice(i, 3, tokens[i + 1]);
                    }
                }
            } while (tokens.length < before);
            result.push([line.quiet ? 'comment' : stack.length - 1, tokens]);
        }
        return JSON.stringify(result);
    }

    function convert(code, options) {
        options = options || {};
        code = String(code == null ? '' : code);
        const fallback = reason => ({ dom: makeDom([raw(code)], true), convertedCount: 0,
            rawCount: code ? 1 : 0, fullSource: true, warnings: reason ? [reason] : [] });
        const Blockly = options.Blockly || root.Blockly;
        try {
            const lines = sourceLines(code);
            let nodes = plan(lines);
            if (!count(nodes).convertedCount) return fallback();
            if (!Blockly || !Blockly.Workspace || !Blockly.Python) return fallback('Blockly Python generator is unavailable.');
            const first = generate(makeDom(nodes, false), Blockly);
            const generatedImports = new Set(first.imports.flatMap(value => value.split(/\r?\n/)));
            let atImports = true;
            lines.forEach(line => {
                if (!atImports || line.quiet) return;
                if (line.indent !== 0 || !/^(?:import\s|from\s)/.test(line.text)) { atImports = false; return; }
                if (generatedImports.has(line.text.trim())) line.omit = true;
            });
            nodes = plan(lines);
            const dom = makeDom(nodes, false), generated = generate(dom, Blockly);
            if (fingerprint(code) !== fingerprint(generated.code)) {
                return fallback('Kept the original Python because the active board generator would change it.');
            }
            return Object.assign({ dom, fullSource: false, warnings: [] }, count(nodes));
        } catch (error) {
            return fallback('Kept the original Python: ' + error.message);
        }
    }

    // Keep the original extension blocks, IDs and layout when only wait values
    // were edited. Verify every candidate with the active board's generator;
    // matching a call's text alone cannot identify repeated/nested waits safely.
    function updateWaits(code, snapshot, options) {
        const Blockly = options?.Blockly || root.Blockly;
        if (!snapshot?.xml || typeof snapshot.code !== 'string') return null;
        const normalize = value => value.replace(/\r\n/g, '\n');
        const before = normalize(snapshot.code).split('\n'), after = normalize(code).split('\n');
        if (before.length !== after.length) return null;
        const wait = /^(\s*(?:await\s+)?(?:asyncio\.|time\.)?sleep(?:_ms|_us)?\(\s*)((?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(\s*\)\s*(?:#.*)?)$/;
        // Blockly serializes 1.0 as 1 and .5 as 0.5; these waits are equivalent.
        const comparable = source => normalize(source).split('\n').map(line =>
            line.replace(wait, (_, prefix, value, suffix) => prefix + Number(value) + suffix)).join('\n');
        const changes = [];
        for (let i = 0; i < before.length; i++) {
            if (before[i] === after[i]) continue;
            const a = before[i].match(wait), b = after[i].match(wait);
            if (!a || !b || a[1] !== b[1] || a[3] !== b[3] || !Number.isFinite(Number(b[2]))) return null;
            changes.push({ line:i, old:a[2], value:b[2] });
        }
        if (!changes.length) return null;
        try {
            let dom = Blockly.utils.xml.textToDom(snapshot.xml);
            if (normalize(generate(dom, Blockly).code) !== before.join('\n')) return null;
            const waitFields = () => [...dom.querySelectorAll('block, shadow')]
                .filter(node => /^controls_wait(?:_ms|_us|_asyncio)?$/.test(node.getAttribute('type')))
                .flatMap(node => [...node.children].filter(child => child.tagName.toLowerCase() === 'value' && child.getAttribute('name') === 'time'))
                .flatMap(value => [...value.children].filter(child => child.getAttribute('type') === 'math_number'))
                .flatMap(number => [...number.children].filter(field => field.tagName.toLowerCase() === 'field' && field.getAttribute('name') === 'NUM'));
            for (const change of changes) {
                before[change.line] = after[change.line];
                let matched = false;
                for (const field of waitFields()) {
                    if (Number(field.textContent) !== Number(change.old)) continue;
                    const previous = field.textContent;
                    field.textContent = change.value;
                    if (comparable(generate(dom, Blockly).code) === comparable(before.join('\n'))) { matched = true; break; }
                    field.textContent = previous;
                }
                if (!matched) {
                    const switches = [...dom.querySelectorAll('block[type="switch_on_pressed"]')];
                    for (let index = 0; index < switches.length; index++) {
                        const trial = dom.cloneNode(true);
                        const candidate = trial.querySelectorAll('block[type="switch_on_pressed"]')[index];
                        let mutation = [...candidate.children].find(node => node.tagName.toLowerCase() === 'mutation');
                        if (!mutation) { mutation = Blockly.utils.xml.createElement('mutation'); candidate.insertBefore(mutation, candidate.firstChild); }
                        mutation.setAttribute('poll_interval', 'true');
                        let field = [...candidate.children].find(node => node.tagName.toLowerCase() === 'field' && node.getAttribute('name') === 'POLL_INTERVAL');
                        if (!field) { field = Blockly.utils.xml.createElement('field'); field.setAttribute('name', 'POLL_INTERVAL'); candidate.appendChild(field); }
                        field.textContent = change.value;
                        if (comparable(generate(trial, Blockly).code) === comparable(before.join('\n'))) {
                            dom = trial; matched = true; break;
                        }
                    }
                }
                if (!matched) return { unmappedWait:true };
            }
            return { dom, updated:true, rawCount:0, fullSource:false };
        } catch (_) { return null; }
    }

    // Invert editable fields using the extension's own generator, without a
    // function-name registry. Accept a candidate only if it fixes requested
    // tokens and changes nothing else in the complete generated program.
    function updateParameters(code, snapshot, options) {
        const Blockly = options?.Blockly || root.Blockly;
        if (!snapshot?.xml || typeof snapshot.code !== 'string') return null;
        let workspace;
        const tokens = source => sourceLines(source).flatMap(line => [
            {kind:'indent', value:line.indent}, ...line.tokens,
            {kind:'newline', value:''}
        ]);
        const key = token => token.kind + ':' + (token.kind === 'number' ? Number(token.value)
            : token.kind === 'string' ? (token.simple ? token.value : token.original) : token.value);
        try {
            const wanted = tokens(code), initial = tokens(snapshot.code);
            if (wanted.length !== initial.length) return null;
            workspace = new Blockly.Workspace();
            Blockly.Events.disable();
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(snapshot.xml), workspace);
            const read = () => tokens(generate(null, Blockly, workspace).code);
            const emitted = new Map(), originals = new Map();
            for (const block of workspace.getAllBlocks(false)) {
                if (originals.has(block.type) || typeof Blockly.Python[block.type] !== 'function') continue;
                const fn = Blockly.Python[block.type]; originals.set(block.type, fn);
                Blockly.Python[block.type] = function(b) {
                    const result = fn.apply(this, arguments);
                    emitted.set(b.id, Array.isArray(result) ? result[0] : result);
                    return result;
                };
            }
            let current;
            try { current = read(); }
            finally { originals.forEach((fn,type)=>{Blockly.Python[type]=fn;}); }
            if (current.length !== initial.length || current.some((t,i)=>key(t)!==key(initial[i]))) return null;
            let differences = current.map((t,i)=>key(t)!==key(wanted[i]) ? i : -1).filter(i=>i>=0);
            if (!differences.length) return null;
            const oldLines = snapshot.code.split(/\r?\n/), newLines = code.split(/\r?\n/);
            const changedLines = oldLines.filter((line,i)=>line!==newLines[i]).map(line=>line.trim());
            const fields = workspace.getAllBlocks(false).flatMap(block => block.inputList.flatMap(input => input.fieldRow))
                .filter(field => field.name && (field instanceof Blockly.FieldNumber || field instanceof Blockly.FieldDropdown ||
                    field instanceof Blockly.FieldTextInput) && !(field instanceof Blockly.FieldVariable))
                .filter(field => {
                    let owner = field.getSourceBlock();
                    while (owner?.outputConnection && owner.getParent()) owner = owner.getParent();
                    const snippet = emitted.get(owner?.id) || '';
                    return changedLines.some(line=>snippet.includes(line));
                })
                .sort((a,b)=>Number(b instanceof Blockly.FieldNumber)-Number(a instanceof Blockly.FieldNumber));
            while (differences.length) {
                let improved = false;
                for (const field of fields) {
                    const previous = field.getValue();
                    let choices;
                    if (field instanceof Blockly.FieldDropdown) choices = field.getOptions(false).map(option=>option[1]);
                    else if (field instanceof Blockly.FieldNumber) choices = differences
                        .filter(i=>current[i].kind==='number' && wanted[i].kind==='number' && Number(current[i].value)===Number(previous))
                        .map(i=>wanted[i].value);
                    else choices = differences
                        .filter(i=>current[i].kind==='string' && wanted[i].kind==='string' && current[i].simple && wanted[i].simple && current[i].value===previous)
                        .map(i=>wanted[i].value);
                    for (const choice of new Set(choices)) {
                        if (String(choice)===String(previous)) continue;
                        let accepted = false;
                        try {
                            field.setValue(choice);
                            if (String(field.getValue())===String(previous)) continue;
                            const candidate = read();
                            if (candidate.length!==wanted.length) continue;
                            const remaining = candidate.map((t,i)=>key(t)!==key(wanted[i]) ? i : -1).filter(i=>i>=0);
                            if (remaining.length >= differences.length || candidate.some((t,i)=>key(t)!==key(current[i]) && key(t)!==key(wanted[i]))) continue;
                            current = candidate; differences = remaining; accepted = improved = true;
                        } finally { if (!accepted) field.setValue(previous); }
                        if (accepted) break;
                    }
                    if (improved) break;
                }
                if (!improved) return null;
            }
            return {dom:Blockly.Xml.workspaceToDom(workspace), updated:true, rawCount:0, fullSource:false};
        } catch (_) { return null; }
        finally { if (workspace) { workspace.dispose(); Blockly.Events.enable(); } }
    }

    root.CodeToBlocks = { convert, updateWaits, updateParameters, FULL_SOURCE };
})(typeof window !== 'undefined' ? window : globalThis);

function pythonCodeToBlock(code, options) {
    return CodeToBlocks.convert(code, options).dom;
}

function codeFromMonacoToBlock() {
    return window.switchIDEEditorMode(1);
}
