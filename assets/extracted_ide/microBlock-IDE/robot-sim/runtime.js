/* Interpret a validated snapshot of supported Blockly blocks; never execute generated code. */
(function (root) {
    const expressions = new Set(['controls_millis', 'math_number', 'math_arithmetic', 'math_single', 'variables_get', 'logic_boolean', 'logic_compare', 'logic_operation', 'logic_negate', 'text', 'colour_picker', 'colour_rgb', 'colour_random']);
    const statements = new Set(['motor_drive_single', 'motor_drive_all', 'motor_move', 'motor_spin', 'motor_turn_front', 'motor_turn_back', 'motor_stop', 'motor_set', 'display_draw_text', 'display_draw_line', 'display_draw_rect', 'display_draw_circle', 'display_fill', 'display_draw_image', 'controls_wait', 'controls_wait_ms', 'controls_wait_us', 'controls_repeat_ext', 'controls_forever', 'controls_forever_no_connect', 'controls_on_start', 'controls_whileUntil', 'controls_if', 'variables_set', 'math_change', 'text_print']);
    ['controls_wait_asyncio', 'controls_forever_asyncio_no_connect', 'print'].forEach(type => statements.add(type));
    statements.add('servo_set_degree');
    ['io_analog_read', 'io_digital_read', 'line_follower_read_sensor'].forEach(type => expressions.add(type));
    function snapshot(workspace) {
        function copy(block, value) {
            if (!block) return null;
            if (block.isEnabled && !block.isEnabled()) return value ? null : copy(block.getNextBlock(), false);
            if (!(value ? expressions : statements).has(block.type)) throw new Error('SIM does not support this block yet: ' + block.type);
            const node = { type: block.type, id: block.id, fields: {}, inputs: {}, next: null };
            block.inputList.forEach(input => {
                input.fieldRow.forEach(field => { if (field.name) node.fields[field.name] = field.getValue(); });
                if (input.connection) {
                    node.inputs[input.name] = copy(input.connection.targetBlock(), input.type === 1);
                    if (input.type === 1 && !node.inputs[input.name]) throw new Error('Enter a value in this block: ' + block.type + ' / ' + input.name);
                }
            });
            if (!value) node.next = copy(block.getNextBlock(), false);
            return node;
        }
        return workspace.getTopBlocks(true).filter(b => !b.outputConnection).map(b => copy(b, false)).filter(Boolean);
    }
    class MotorRuntime {
        constructor(onMotors, onPrint, onDisplay, devices) {
            this.onMotors = onMotors; this.onPrint = onPrint || (() => {}); this.onDisplay = onDisplay || (() => {});
            devices = devices || {};
            this.onHighlight=devices.onHighlight||(()=>{});
            this.onServo = devices.onServo || (() => { throw new Error('No servo is configured for this simulation.'); });
            this.onSensor = devices.onSensor || (() => { throw new Error('No sensor is configured for this simulation.'); });
            this.driveTargets = devices.driveTargets || (() => null);
            this.simulationTime = devices.simulationTime;
            this.speeds = [0, 0, 0, 0]; this.token = 0; this.waiters = new Set();
        }
        setSpeeds(speeds) {
            this.speeds = speeds.map(v => {
                if (!Number.isFinite(v)) throw new Error('Motor speed must be a number.');
                return Math.max(-100, Math.min(100, v));
            });
            this.onMotors(this.speeds.slice());
        }
        stop() {
            this.onHighlight(null);
            this.token++;
            if(this.clock){this.clock.close();this.clock=null;}
            for (const wake of this.waiters) wake();
            this.waiters.clear(); this.setSpeeds([0, 0, 0, 0]);
        }
        async run(program) {
            this.stop();
            const clocks=root.SimPythonRuntime||(typeof require==='function'?require('./python-runtime'):null);
            const clock=clocks&&clocks.createSimulationClock(this.simulationTime);
            this.clock=clock;
            const token = this.token, vars = Object.create(null), startedAt = performance.now();
            let fourWheel = false;
            const check = () => { if (token !== this.token) throw new Error('SIM_CANCELLED'); };
            const wait = async ms => {
                check();
                if (!Number.isFinite(ms) || ms < 0 || ms > 2147483647) throw new Error('Wait time must be between 0 and 2147483647 ms.');
                if(clock&&ms>0)await clock.sleep(ms/1000);
                else await new Promise(resolve => {
                    const wake = () => { clearTimeout(timer); this.waiters.delete(wake); resolve(); };
                    const timer = setTimeout(wake, ms); this.waiters.add(wake);
                });
                check();
            };
            const number = v => { const n = Number(v); if (!Number.isFinite(n)) throw new Error('SIM requires a valid number.'); return n; };
            const value = n => {
                if (!n) throw new Error('Complete all required block inputs.');
                const f = n.fields, v = name => value(n.inputs[name]);
                switch (n.type) {
                    case 'io_analog_read': return this.onSensor(/^\d+$/.test(f.pin) ? 'ADC' + f.pin : f.pin, 'analog');
                    case 'line_follower_read_sensor': return this.onSensor(/^\d+$/.test(f.position) ? 'ADC' + f.position : f.position, 'analog');
                    case 'io_digital_read': return this.onSensor(/^\d+$/.test(f.pin) ? 'IO' + f.pin : f.pin, 'digital');
                    case 'controls_millis': return Math.floor(clock ? clock.now()*1000 : performance.now()-startedAt);
                    case 'math_number': return number(f.NUM);
                    case 'text': return f.TEXT;
                    case 'colour_picker': return f.COLOUR;
                    case 'colour_rgb': {
                        const channel = name => Math.round(Math.max(0, Math.min(100, number(v(name)))) * 2.55).toString(16).padStart(2, '0');
                        return '#' + channel('RED') + channel('GREEN') + channel('BLUE');
                    }
                    case 'colour_random': return '#' + Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0');
                    case 'variables_get': return vars[f.VAR] === undefined ? 0 : vars[f.VAR];
                    case 'logic_boolean': return f.BOOL === 'TRUE';
                    case 'logic_negate': return !v('BOOL');
                    case 'logic_operation': return f.OP === 'AND' ? v('A') && v('B') : v('A') || v('B');
                    case 'logic_compare': {
                        const a = v('A'), b = v('B');
                        return { EQ: a === b, NEQ: a !== b, LT: a < b, LTE: a <= b, GT: a > b, GTE: a >= b }[f.OP];
                    }
                    case 'math_arithmetic': {
                        const a = number(v('A')), b = number(v('B'));
                        return number({ ADD: () => a + b, MINUS: () => a - b, MULTIPLY: () => a * b, DIVIDE: () => a / b, POWER: () => Math.pow(a, b) }[f.OP]());
                    }
                    case 'math_single': {
                        const a = number(v('NUM'));
                        const operations = { NEG: () => -a, ABS: () => Math.abs(a), ROOT: () => Math.sqrt(a), LN: () => Math.log(a), LOG10: () => Math.log10(a), EXP: () => Math.exp(a), POW10: () => Math.pow(10, a) };
                        if (!operations[f.OP]) throw new Error('SIM does not support this operation yet: ' + f.OP);
                        return number(operations[f.OP]());
                    }
                    default: throw new Error('SIM does not support this value yet: ' + n.type);
                }
            };
            const pair = (left, right) => this.setSpeeds(this.driveTargets(left, right) || (fourWheel ? [left, left, right, right] : [left, right, 0, 0]));
            const chain = async node => {
                for (let n = node; n; n = n.next) {
                    check();
                    this.onHighlight(n.id);
                    const f = n.fields, v = name => value(n.inputs[name]), num = name => number(v(name));
                    switch (n.type) {
                        case 'motor_drive_single': {
                            const port = number(f.motor) - 1;
                            if (!Number.isInteger(port) || port < 0 || port > 3) throw new Error('SIM supports motors M1 through M4.');
                            const speeds = this.speeds.slice(); speeds[port] = num('speed'); this.setSpeeds(speeds); break;
                        }
                        case 'motor_drive_all': this.setSpeeds([num('speed1'), num('speed2'), n.inputs.speed3 ? num('speed3') : 0, n.inputs.speed4 ? num('speed4') : 0]); break;
                        case 'motor_set': fourWheel = f.motor === 'WD4'; break;
                        case 'motor_stop': this.setSpeeds([0, 0, 0, 0]); break;
                        case 'servo_set_degree': this.onServo('S' + f.servo, num('degree')); break;
                        case 'display_fill': this.onDisplay({ type: 'fill', color: v('color') }); break;
                        case 'display_draw_text': this.onDisplay({ type: 'text', text: v('text'), x: num('x'), y: num('y'), color: v('color'), font: f.font }); break;
                        case 'display_draw_line': this.onDisplay({ type: 'line', x: num('x1'), y: num('y1'), x2: num('x2'), y2: num('y2'), color: v('color') }); break;
                        case 'display_draw_rect': this.onDisplay({ type: 'rect', x: num('x'), y: num('y'), width: num('width'), height: num('height'), color: v('color'), fill: f.fill === '1' }); break;
                        case 'display_draw_circle': this.onDisplay({ type: 'circle', x: num('x'), y: num('y'), radius: num('r'), color: v('color'), fill: f.fill === '1' }); break;
                        case 'display_draw_image': this.onDisplay({ type: 'image', image: f.image, x: num('x'), y: num('y') }); break;
                        case 'motor_move': { const s = num('speed') * (f.move === 'backward' ? -1 : 1); pair(s, s); break; }
                        case 'motor_spin': { const s = num('speed') * (f.spin === 'left' ? -1 : 1); pair(s, -s); break; }
                        case 'motor_turn_front': { const s = num('speed'); pair(f.turn === 'left' ? 0 : s, f.turn === 'left' ? s : 0); break; }
                        case 'motor_turn_back': { const s = -num('speed'); pair(f.turn === 'left' ? s : 0, f.turn === 'left' ? 0 : s); break; }
                        case 'controls_wait': case 'controls_wait_asyncio': await wait(num('time') * 1000); break;
                        case 'controls_wait_ms': await wait(num('time')); break;
                        case 'controls_wait_us': await wait(num('time') / 1000); break;
                        case 'variables_set': vars[f.VAR] = v('VALUE'); break;
                        case 'math_change': vars[f.VAR] = number(vars[f.VAR] || 0) + num('DELTA'); break;
                        case 'text_print': this.onPrint(String(v('TEXT'))); break;
                        case 'print': this.onPrint(String(v('value'))); break;
                        case 'controls_on_start': await chain(n.inputs.block); break;
                        case 'controls_repeat_ext': {
                            const count = Math.max(0, Math.floor(num('TIMES')));
                            for (let i = 0; i < count; i++) { await chain(n.inputs.DO); await wait(0); } break;
                        }
                        case 'controls_forever': case 'controls_forever_no_connect': case 'controls_forever_asyncio_no_connect':
                            while (true) { await chain(n.inputs.block); await wait(0); }
                        case 'controls_whileUntil':
                            while (Boolean(v('BOOL')) === (f.MODE !== 'UNTIL')) { await chain(n.inputs.DO); await wait(0); } break;
                        case 'controls_if': {
                            let matched = false;
                            for (let i = 0; Object.prototype.hasOwnProperty.call(n.inputs, 'IF' + i); i++) {
                                if (v('IF' + i)) { await chain(n.inputs['DO' + i]); matched = true; break; }
                            }
                            if (!matched) await chain(n.inputs.ELSE); break;
                        }
                        default: throw new Error('SIM does not support this block yet: ' + n.type);
                    }
                    // Yield even for long sequences, so Stop and editor interactions remain responsive.
                    await wait(0);
                }
            };
            try { for (const stack of program) await chain(stack); return true; }
            catch (error) { if (token !== this.token) return false; this.stop(); throw error; }
            finally {if(token===this.token)this.onHighlight(null);if(clock)clock.close();if(this.clock===clock)this.clock=null;}
        }
    }
    root.MotorSim = { snapshot, MotorRuntime };
    if (typeof module !== 'undefined') module.exports = root.MotorSim;
})(typeof window !== 'undefined' ? window : globalThis);
