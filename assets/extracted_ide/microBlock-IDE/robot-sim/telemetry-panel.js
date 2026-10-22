(function(root){
    'use strict';
    function create(host){
        if(!host)return null;
        const doc=host.ownerDocument;
        const add=(parent,tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;parent.appendChild(node);return node;};
        const write=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
        const number=(value,digits)=>Number.isFinite(value)?(Math.abs(value)<Math.pow(10,-digits)/2?0:value).toFixed(digits):'—';
        host.className='sim-telemetry';host.setAttribute('aria-label','Robot telemetry');
        const heading=add(host,'div','sim-telemetry-heading');
        add(heading,'span','sim-telemetry-title','IMU & Motion');
        const state=add(heading,'span','sim-telemetry-state','Waiting');
        const toggle=add(heading,'button','sim-telemetry-toggle');toggle.type='button';toggle.setAttribute('aria-label','Show telemetry details');toggle.setAttribute('aria-expanded','false');
        toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m7 14 5-5 5 5"/></svg>';
        const collapse=add(heading,'button','sim-telemetry-toggle sim-telemetry-collapse');collapse.type='button';
        const metrics=add(host,'div','sim-telemetry-metrics'),values={};
        [['roll','Roll','°'],['pitch','Pitch','°'],['yaw','Yaw','°'],['speed','Speed','cm/s']].forEach(([key,label,unit])=>{
            const metric=add(metrics,'div','sim-telemetry-metric');add(metric,'span','sim-telemetry-label',label);
            const reading=add(metric,'div','sim-telemetry-reading');values[key]=add(reading,'span','', '—');add(reading,'small','',unit);
        });
        const motorRow=add(host,'div','sim-telemetry-motors'),motorNodes=new Map();
        const noMotors=add(motorRow,'span','sim-telemetry-empty','No drive motors');
        const detail=add(host,'div','sim-telemetry-detail');detail.id='motor-sim-telemetry-detail';detail.hidden=true;toggle.setAttribute('aria-controls',detail.id);
        const vectors={};
        [['gyro','Gyroscope','°/s'],['accel','Accelerometer','m/s²'],['position','World position','m']].forEach(([key,label,unit])=>{
            const group=add(detail,'div','sim-telemetry-vector'),title=add(group,'div','sim-telemetry-vector-title',label);add(title,'small','',unit);
            const row=add(group,'div','sim-telemetry-vector-values');vectors[key]={};
            ['x','y','z'].forEach(axis=>{const cell=add(row,'span','');add(cell,'small','',axis.toUpperCase());vectors[key][axis]=add(cell,'b','', '—');});
        });
        add(detail,'p','sim-telemetry-note','IMU axes: X forward · Y left · Z up. Acceleration includes gravity. World position uses Y up.');
        const elapsed=add(detail,'span','sim-telemetry-time','Simulation time —');
        toggle.onclick=()=>{detail.hidden=!detail.hidden;toggle.setAttribute('aria-expanded',String(!detail.hidden));toggle.setAttribute('aria-label',detail.hidden?'Show telemetry details':'Hide telemetry details');};
        let collapsed=false;
        try{collapsed=root.localStorage.getItem('sim_telemetry_collapsed')==='true';}catch(error){}
        let sidebarCollapsed=collapsed;
        function setCollapsed(value){
            collapsed=value;host.className='sim-telemetry'+(collapsed?' is-collapsed':'');
            collapse.setAttribute('aria-expanded',String(!collapsed));
            const label=collapsed?'Expand IMU & Motion':'Minimize IMU & Motion';
            collapse.setAttribute('aria-label',label);collapse.title=label;
            collapse.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14'+(collapsed?'M12 5v14':'')+'"/></svg>';
        }
        collapse.onclick=()=>{
            setCollapsed(!collapsed);
            sidebarCollapsed=collapsed;
            try{root.localStorage.setItem('sim_telemetry_collapsed',String(collapsed));}catch(error){}
        };
        setCollapsed(collapsed);
        function viewportMoved(){
            const body=host.ownerDocument.body;
            const detached=!!(body&&body.classList.contains('sim-popout-window'));
            setCollapsed(detached?false:sidebarCollapsed);
            collapse.hidden=detached;
        }
        if(root.addEventListener)root.addEventListener('sim-viewport-moved',viewportMoved);
        let last=-Infinity,lastAvailable,clockBaseline=null,clockRate=null;
        state.title='SIM 100% means simulation time matches real time. Lower values mean the whole simulation is running slower.';
        function update(sample,now,running){
            const available=!!(sample&&sample.available),time=Number.isFinite(now)?now:Date.now();
            if(!running||!available||!Number.isFinite(sample.elapsed)){clockBaseline=null;clockRate=null;}
            else if(!clockBaseline||time<clockBaseline.wall||sample.elapsed<clockBaseline.sim){clockBaseline={wall:time,sim:sample.elapsed};clockRate=null;}
            else if(time-clockBaseline.wall>=500){
                clockRate=Math.max(0,(sample.elapsed-clockBaseline.sim)*1000/(time-clockBaseline.wall));
                clockBaseline={wall:time,sim:sample.elapsed};
            }
            if(time-last<100&&available===lastAvailable)return;
            last=time;lastAvailable=available;host.dataset.available=String(available);
            write(state,available?(clockRate===null?'Live':'SIM '+Math.round(clockRate*100)+'%'):'Waiting');
            const imu=available&&sample.imu;
            ['roll','pitch','yaw'].forEach(key=>write(values[key],number(imu?imu[key]:null,1)));
            write(values.speed,number(available?sample.speed*100:null,1));
            const motors=available?(sample.motors||[]).slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{numeric:true})):[],present=new Set();
            motorRow.style.setProperty('--motor-count',Math.max(1,motors.length));
            noMotors.hidden=motors.length>0;write(noMotors,available?'No drive motors':'Waiting for model');
            motors.forEach((motor,index)=>{
                const key=String(index)+':'+(motor.id||'motor');present.add(key);let nodes=motorNodes.get(key);
                if(!nodes){const cell=add(motorRow,'div','sim-telemetry-motor');nodes={cell,name:add(cell,'span','sim-telemetry-motor-name'),value:add(cell,'b',''),unit:add(cell,'small','','rpm')};motorNodes.set(key,nodes);}
                nodes.cell.style.order=String(index);
                write(nodes.name,motor.name||'Motor');write(nodes.value,number(motor.rpm,0));nodes.cell.dataset.moving=String(Number.isFinite(motor.rpm)&&Math.abs(motor.rpm)>=1);
            });
            motorNodes.forEach((nodes,key)=>{if(!present.has(key)){nodes.cell.remove();motorNodes.delete(key);}});
            const data={gyro:imu&&imu.gyro,accel:imu&&imu.accel,position:available&&sample.position};
            Object.keys(vectors).forEach(key=>['x','y','z'].forEach(axis=>write(vectors[key][axis],number(data[key]?data[key][axis]:null,key==='position'?3:2))));
            write(elapsed,'Simulation time '+(available?number(sample.elapsed,1)+' s':'—'));
        }
        update(null,0);
        return {update,getRate:()=>clockRate,reset(){last=-Infinity;update(null,0);},dispose(){if(root.removeEventListener)root.removeEventListener('sim-viewport-moved',viewportMoved);toggle.onclick=null;collapse.onclick=null;host.textContent='';}};
    }
    root.SimTelemetryPanel={create};
    if(typeof module!=='undefined')module.exports=root.SimTelemetryPanel;
})(typeof window!=='undefined'?window:globalThis);
