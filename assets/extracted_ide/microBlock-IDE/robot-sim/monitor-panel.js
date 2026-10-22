(function(){
    const panel=document.getElementById('terminal-robot-panel');if(!panel)return;
    const add=(parent,tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;parent.appendChild(node);return node;};
    const telemetry=document.getElementById('motor-sim-telemetry');
    const display=add(telemetry||panel,'details','sim-monitor-display');display.open=false;display.hidden=true;
    const displayHeading=add(display,'summary','','Board display');displayHeading.title='Expand or minimize board display';
    const displayBody=add(display,'div','sim-monitor-display-body');
    function updateDisplay(runtime){
        const scene=runtime._debugScene,canvas=scene&&scene.getDisplayCanvas?scene.getDisplayCanvas():null;
        display.hidden=!canvas;
        if(displayBody.firstChild===canvas)return;
        while(displayBody.firstChild)displayBody.removeChild(displayBody.firstChild);
        // The existing LCD canvas is also the robot's texture source. Showing
        // it here needs no second renderer, image decoding or polling copy.
        if(canvas){canvas.setAttribute('aria-label','Live board display');displayBody.appendChild(canvas);}
    }
    const status=add(telemetry||panel,'div','sim-monitor-status');status.setAttribute('aria-label','Simulation status');
    const heading=telemetry&&telemetry.querySelector('.sim-telemetry-heading');
    if(heading)telemetry.insertBefore(status,heading.nextSibling);
    const phase=add(status,'strong','sim-monitor-phase','Ready');
    const elapsed=add(status,'span','sim-monitor-elapsed','0.0 s');
    elapsed.setAttribute('aria-label','Simulation elapsed time');
    const rate=add(status,'span','','SIM —');
    rate.title='Simulation time compared with real time';
    const sensors=add(panel,'div','sim-monitor-sensors');
    const sensorTitle=add(sensors,'div','sim-monitor-title','LINE SENSORS');
    const sensorRange=add(sensors,'span','sim-monitor-range','ADC0-7: 0-1023 | ADC8-9: 0-4095');
    const row=add(sensors,'div','sim-monitor-adcs');
    const cells=Array.from({length:10},(_,i)=>{
        const cell=add(row,'div','sim-monitor-adc');
        add(cell,'span','','ADC'+i);
        const track=add(cell,'div','sim-monitor-track'),bar=add(track,'div','sim-monitor-bar');
        const value=add(cell,'b','','—');return {cell,bar,value};
    });
    const ultrasonic=add(sensors,'div','sim-monitor-ultrasonic');
    add(ultrasonic,'span','','Ultrasonic');
    const distance=add(ultrasonic,'strong','','—');
    const write=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
    let timer=null,baseline=null;
    function update(){
        if(panel.ownerDocument.hidden)return;
        const runtime=window.motorSimulation;if(!runtime||!runtime.readMonitor)return;
        const expanded=!!(window.SimPopout&&window.SimPopout.isOpen());
        if(expanded)updateDisplay(runtime);
        const data=runtime.readMonitor(),now=performance.now();
        write(phase,data.phase);if(status.dataset.phase!==data.phase)status.dataset.phase=data.phase;
        const replay=runtime.playbackReport&&runtime.playbackReport();
        write(elapsed,((replay?.active?replay.time:data.elapsed)||0).toFixed(1)+' s');
        if(data.phase!=='Running'||!Number.isFinite(data.physicsTime)){baseline=null;rate.textContent='SIM —';}
        else if(!baseline||data.physicsTime<baseline.sim){baseline={wall:now,sim:data.physicsTime};rate.textContent='SIM —';}
        else if(now-baseline.wall>=500){rate.textContent='SIM '+Math.round(Math.max(0,(data.physicsTime-baseline.sim)*1000/(now-baseline.wall))*100)+'%';baseline={wall:now,sim:data.physicsTime};}
        sensors.hidden=!['buildbot','atom-vx'].includes(data.board);
        const atom=data.board==='atom-vx';
        write(sensorTitle,atom?'SENSORS':'LINE SENSORS');
        write(sensorRange,atom?'ADC0-7: 0-1023':'ADC0-7: 0-1023 | ADC8-9: 0-4095');
        row.style.setProperty('--sensor-count',atom?'8':'10');
        cells.forEach((cell,i)=>{cell.cell.hidden=atom&&i>=8;});
        if(replay&&replay.active){
            baseline=null;
            write(phase,'Playback');status.dataset.phase='Playback';
            write(elapsed,replay.time.toFixed(1)+' s');
            write(rate,Number.isFinite(replay.motion?.rate)?'SIM '+Math.round(replay.motion.rate*100)+'%':'SIM --');
            rate.title='Recorded simulation speed at the selected time';
        }else rate.title='Simulation time compared with real time';
        if(!expanded||sensors.hidden)return;
        let preview={analog:[],distances:[]};try{preview=runtime._debugScene.readSensorPreview();}catch(error){}
        const values=preview.analog;
        cells.forEach((cell,i)=>{
            const value=values[i],valid=Number.isFinite(value);
            const maximum=i<8?1023:4095;
            const reading=valid?Math.round(Math.max(0,Math.min(4095,value))*maximum/4095):0;
            write(cell.value,valid?String(reading):'—');
            cell.bar.style.height=(valid?reading/maximum*100:0)+'%';
        });
        const distances=preview.distances;
        write(distance,distances.length?distances.map(sensor=>Number.isFinite(sensor.metres)&&sensor.metres>=0?(sensor.metres*100).toFixed(2)+' cm':'—').join(' / '):'Not connected');
        distance.title=distances.map(sensor=>sensor.name+(sensor.port?' · '+sensor.port:'')).join(', ');
    }
    function moved(){
        if(timer){clearInterval(timer);timer=null;}
        baseline=null;
        update();timer=setInterval(update,window.SimPopout&&window.SimPopout.isOpen()?33:100);
    }
    window.addEventListener('sim-viewport-moved',moved);
    moved();
    window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);});
})();
