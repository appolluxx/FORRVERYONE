// Shared colour popup; retain each field's palette, validator and stored value.
(() => {
    Blockly.FieldColour.prototype.showEditor_ = function() {
        Blockly.WidgetDiv.hide(); Blockly.DropDownDiv.hideWithoutAnimation(); Blockly.DropDownDiv.clearContent();
        const panel = document.createElement('div'); panel.className='ide-colour-picker';
        panel.innerHTML='<div class="ide-colour-heading"><strong>Colour</strong><span class="ide-colour-preview"></span></div><div class="ide-colour-grid" role="group" aria-label="Colour palette"></div><form class="ide-colour-custom"><label>HEX<input aria-label="Hex colour" spellcheck="false" maxlength="7" placeholder="#RRGGBB"></label><button type="submit">Apply</button></form><div class="ide-colour-error" role="status"></div>';
        const grid=panel.querySelector('.ide-colour-grid'),input=panel.querySelector('input'),preview=panel.querySelector('.ide-colour-preview'),error=panel.querySelector('.ide-colour-error');
        const colours=this.colours || Blockly.FieldColour.COLOURS, titles=this.titles || Blockly.FieldColour.TITLES;
        const columns=Math.min(8,Math.max(1,this.columns || 7));grid.style.gridTemplateColumns='repeat('+columns+',minmax(0,1fr))';
        const current=this.getValue().toLowerCase();input.value=current.toUpperCase();preview.style.background=current;
        const wheelArea=document.createElement('div');wheelArea.className='ide-colour-wheel-area';
        wheelArea.innerHTML='<div class="ide-colour-wheel"><canvas width="200" height="200" aria-label="Colour saturation and brightness"></canvas><span class="ide-colour-wheel-marker"></span></div><label class="ide-colour-brightness">Hue<input type="range" min="0" max="359" value="0" aria-label="Colour hue"></label>';
        panel.insertBefore(wheelArea,grid);
        const canvas=wheelArea.querySelector('canvas'),marker=wheelArea.querySelector('.ide-colour-wheel-marker'),brightness=wheelArea.querySelector('input');
        const rgb=[1,3,5].map(i=>parseInt(current.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
        let hue=delta===0?0:max===rgb[0]?((rgb[1]-rgb[2])/delta+6)%6:max===rgb[1]?(rgb[2]-rgb[0])/delta+2:(rgb[0]-rgb[1])/delta+4;
        hue*=60;let saturation=max===0?0:delta/max,value=max;
        brightness.value=Math.round(hue);
        const hsv=(h,s,v)=>{
            const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
            const triple=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
            return triple.map(n=>Math.round((n+m)*255));
        };
        const context=canvas.getContext('2d');
        const drawSquare=()=>{
            context.fillStyle='rgb('+hsv(hue,1,1).join(',')+')';context.fillRect(0,0,200,200);
            const white=context.createLinearGradient(0,0,200,0);white.addColorStop(0,'#fff');white.addColorStop(1,'rgba(255,255,255,0)');context.fillStyle=white;context.fillRect(0,0,200,200);
            const black=context.createLinearGradient(0,0,0,200);black.addColorStop(0,'rgba(0,0,0,0)');black.addColorStop(1,'#000');context.fillStyle=black;context.fillRect(0,0,200,200);
        };
        const syncWheel=(write)=>{
            marker.style.left=(saturation*100)+'%';marker.style.top=((1-value)*100)+'%';
            const colour='#'+hsv(hue,saturation,value).map(n=>n.toString(16).padStart(2,'0')).join('');
            if(write){input.value=colour.toUpperCase();preview.style.background=colour;error.textContent='';input.removeAttribute('aria-invalid');}
        };
        drawSquare();
        let pointer=null;
        const point=event=>{const rect=canvas.getBoundingClientRect();saturation=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));value=1-Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));syncWheel(true);};
        canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();pointer=event.pointerId;canvas.setPointerCapture(pointer);point(event);});
        canvas.addEventListener('pointermove',event=>{if(event.pointerId===pointer)point(event);});
        const release=event=>{if(event.pointerId===pointer){if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}};
        canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',()=>pointer=null);
        brightness.addEventListener('input',()=>{hue=Number(brightness.value);drawSquare();syncWheel(true);});syncWheel(false);
        const paletteDetails=document.createElement('details');paletteDetails.className='ide-colour-presets';
        const summary=document.createElement('summary');summary.textContent='Palette';paletteDetails.appendChild(summary);grid.replaceWith(paletteDetails);paletteDetails.appendChild(grid);
        const choose=colour=>{this.setValue(colour);Blockly.DropDownDiv.hideIfOwner(this);};
        const buttons=colours.map((colour,index)=>{
            const button=document.createElement('button');button.type='button';button.style.background=colour;button.dataset.colour=colour;
            button.setAttribute('aria-label',titles?.[index] || colour);button.setAttribute('aria-pressed',String(colour.toLowerCase()===current));
            button.tabIndex=-1;button.addEventListener('click',()=>choose(colour));grid.appendChild(button);return button;
        });
        let selected=Math.max(0,colours.findIndex(colour=>colour.toLowerCase()===current));buttons[selected].tabIndex=0;
        grid.addEventListener('keydown',event=>{
            const index=buttons.indexOf(document.activeElement);let next=index;
            if(event.key==='ArrowRight')next=index+1;else if(event.key==='ArrowLeft')next=index-1;
            else if(event.key==='ArrowDown')next=index+columns;else if(event.key==='ArrowUp')next=index-columns;
            else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;
            event.preventDefault();next=Math.max(0,Math.min(buttons.length-1,next));buttons.forEach((b,i)=>b.tabIndex=i===next?0:-1);buttons[next].focus();
        });
        panel.querySelector('form').addEventListener('submit',event=>{
            event.preventDefault();let value=input.value.trim();if(!value.startsWith('#'))value='#'+value;
            if(!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)){error.textContent='Enter a valid HEX colour.';input.setAttribute('aria-invalid','true');return;}
            if(value.length===4)value='#'+[...value.slice(1)].map(c=>c+c).join('');choose(value.toLowerCase());
        });
        input.addEventListener('input',()=>{error.textContent='';input.removeAttribute('aria-invalid');});
        panel.addEventListener('pointerdown',event=>event.stopPropagation());
        panel.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();Blockly.DropDownDiv.hideIfOwner(this);}});
        Blockly.DropDownDiv.getContentDiv().appendChild(panel);Blockly.DropDownDiv.setColour('#fff','#d6e4ef');
        Blockly.DropDownDiv.showPositionedByField(this,()=>panel.remove());brightness.focus({preventScroll:true});
    };
})();
