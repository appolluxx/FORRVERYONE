// Contextual editor: preserve math_number XML, generators and variable inputs.
(() => {
    function rangeFor(field) {
        const min = field.getMin(), max = field.getMax();
        if (Number.isFinite(min) && Number.isFinite(max) && max > min) return {min,max,step:field.getPrecision() || 'any',label:field.name || 'Value',unit:''};
        const block = field.getSourceBlock(), parent = block?.getParent();
        if (block?.type !== 'math_number' || field.name !== 'NUM' || !parent) return null;
        const input = parent.inputList.find(input => input.connection?.targetBlock() === block)?.name;
        if (parent.type === 'servo_set_degree' && input === 'degree') return {min:0,max:180,step:1,label:'Degree',unit:'\u00b0'};
        const direct = ['motor_drive_single','motor_drive_all'];
        const directional = ['motor_move','motor_turn_front','motor_turn_back','motor_spin'];
        if (/^speed\d*$/.test(input || '') && (direct.includes(parent.type) || directional.includes(parent.type))) return {min:direct.includes(parent.type)?-100:0,max:100,step:1,label:'Speed',unit:'%'};
        if (['io_analog_write','pin_pwm_write'].includes(parent.type) && input === 'value') return {min:0,max:1023,step:1,label:'PWM',unit:''};
        if (['io_digital_write','pin_digital_write'].includes(parent.type) && input === 'value') return {min:0,max:1,step:1,label:'Digital value',unit:''};
        if (parent.type === 'colour_rgb' && ['RED','GREEN','BLUE'].includes(input)) return {min:0,max:100,step:1,label:input[0]+input.slice(1).toLowerCase(),unit:'%'};
        if (parent.type === 'colour_blend' && input === 'RATIO') return {min:0,max:1,step:.01,label:'Blend ratio',unit:''};
        if (/^(motor_|line_follower_)/.test(parent.type) && /^(speed\d*|base_speed|min_speed|max_speed|start_speed)$/.test(input || '')) return {min:0,max:100,step:1,label:input.replaceAll('_',' '),unit:'%'};
        if (parent.type === 'rtc_set_time') {
            const ranges={hour:[0,23],min:[0,59],sec:[0,59],day:[1,31],month:[1,12]};
            if(ranges[input])return {min:ranges[input][0],max:ranges[input][1],step:1,label:input,unit:''};
        }
        return null;
    }
    const original = Blockly.FieldNumber.prototype.showEditor_;
    Blockly.FieldNumber.prototype.showEditor_ = function(...args) {
        const range = rangeFor(this);
        if (!range) return original.apply(this, args);
        Blockly.WidgetDiv.hide();
        Blockly.DropDownDiv.hideWithoutAnimation();
        Blockly.DropDownDiv.clearContent();
        const content = Blockly.DropDownDiv.getContentDiv();
        const panel = document.createElement('div');
        panel.className = 'servo-angle-editor';
        panel.innerHTML = '<label><span></span><input type="number"></label><input type="range"><div class="servo-angle-limits"><span></span><span></span></div>';
        const number = panel.querySelector('input[type=number]'), slider = panel.querySelector('input[type=range]');
        panel.querySelector('label span').textContent = range.label;
        panel.querySelector('.servo-angle-limits').firstChild.textContent = range.min + range.unit;
        panel.querySelector('.servo-angle-limits').lastChild.textContent = range.max + range.unit;
        for (const input of [number, slider]) {
            input.min = range.min; input.max = range.max;
            input.step = input === slider && range.step === 'any' ? (range.max-range.min)/1000 : range.step;
            input.setAttribute('aria-label',range.label);
        }
        const paint = () => slider.style.setProperty('--servo-angle-fill', ((Number(slider.value)-range.min)/(range.max-range.min)*100) + '%');
        const group = Blockly.utils.idGenerator.genUid();
        const update = raw => {
            if (raw === '' || !Number.isFinite(Number(raw))) return;
            const rounded = range.step === 'any' ? Number(raw) : Number((Math.round(Number(raw)/range.step)*range.step).toPrecision(12));
            const value = Math.max(range.min, Math.min(range.max, rounded));
            const previousGroup = Blockly.Events.getGroup();
            Blockly.Events.setGroup(group);
            try { this.setValue(value); } finally { Blockly.Events.setGroup(previousGroup); }
            number.value = slider.value = this.getValue();
            paint();
        };
        number.value = this.getValue(); slider.value = this.getValue();
        paint();
        slider.addEventListener('input', () => update(slider.value));
        number.addEventListener('change', () => update(number.value));
        panel.addEventListener('pointerdown', event => event.stopPropagation());
        panel.addEventListener('keydown', event => {
            event.stopPropagation();
            if (event.key === 'Enter' || event.key === 'Escape') {
                if (event.key === 'Enter') update(number.value);
                event.preventDefault(); Blockly.DropDownDiv.hideIfOwner(this);
            }
        });
        content.appendChild(panel);
        Blockly.DropDownDiv.setColour('#ffffff', '#d6e4ef');
        Blockly.DropDownDiv.showPositionedByField(this, () => { panel.remove(); });
        // Focus the slider so opening on a tablet does not summon the keyboard.
        slider.focus({preventScroll:true});
    };
})();
