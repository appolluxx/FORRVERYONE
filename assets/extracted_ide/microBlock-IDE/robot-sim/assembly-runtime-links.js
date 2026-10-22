(function(root){
    'use strict';
    const Config=root.AssemblyProductConfig||(typeof require==='function'?require('./assembly-product-config.js'):null);
    const list=value=>Array.isArray(value)?value:[];
    const key=value=>String(value===undefined?'':value).replace(/\s+/g,'').toLowerCase();
    const clone=value=>JSON.parse(JSON.stringify(value));
    const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
    function prepareManifest(part){
        const manifest=clone(part.productManifest);
        for(const device of list(manifest.devices)){
            const binding=Config.binding(part,device.id);if(!binding)continue;
            if(binding.name)device.name=binding.name;
            device.driveSide=binding.driveSide;device.invert=binding.invert;
            if(device.type==='motor')device.encoder=binding.encoder;
            if(device.type==='distance-sensor')device.triggerPort=binding.triggerPort;
        }
        return manifest;
    }
    function create(T,entries,parts,options){
        options=options||{};
        const byPart=new Map(entries.map(entry=>[entry.part.id,entry]));
        const boards=Config.boards(parts);
        const controllers=boards.filter(board=>board.role==='main');
        const activeBoard=controllers.find(board=>board.partId===options.activeBoardPartId&&(!options.activeBoardComponentId||board.componentId===options.activeBoardComponentId))||
            controllers.find(board=>parts.some(part=>part.id===board.partId&&part.systemRole==='controller-board'))||controllers[0];
        const links=[];
        for(const entry of entries){
            const manifest=entry.runtime.physicsModel().manifest;
            for(const device of list(manifest.devices)){
                const binding=Config.binding(entry.part,device.id);if(!binding)continue;
                const board=boards.find(item=>item.partId===binding.boardPartId&&item.componentId===binding.boardComponentId);
                const port=board&&board.ports.find(item=>item.id===binding.port&&item.type===Config.portType(device));
                const reachable = board && board.connected && activeBoard && (board===activeBoard || board.role!=='main' &&
                    board.controllers.some(controller=>controller.partId===activeBoard.partId&&controller.componentId===activeBoard.componentId));
                links.push({entry,device,binding,board,valid:!!port,active:!!port&&!!reachable});
            }
        }
        const portLinks=new Map();
        for(const link of links.filter(link=>link.active)){
            const id=key(link.binding.port);if(!portLinks.has(id))portLinks.set(id,[]);portLinks.get(id).push(link);
            if(link.device.type==='distance-sensor'&&Config.portType(link.device)==='digital'&&link.binding.triggerPort){
                const trigger=key(link.binding.triggerPort);if(!portLinks.has(trigger))portLinks.set(trigger,[]);portLinks.get(trigger).push(link);
            }
        }
        const unique=link=>link.active&&portLinks.get(key(link.binding.port)).length===1;
        const driveLinks=links.filter(link=>unique(link)&&link.device.type==='motor'&&link.device.jointId&&['left','right'].includes(link.device.driveSide));
        const leftLinks=driveLinks.filter(link=>link.device.driveSide==='left'),rightLinks=driveLinks.filter(link=>link.device.driveSide==='right');
        function axle(link){
            const data=link.entry.runtime.physicsModel(),joint=list(data.manifest.joints).find(item=>item.id===link.device.jointId),mesh=joint&&data.meshes.get(joint.parent);
            if(!mesh)return null;
            mesh.updateWorldMatrix(true,false);
            return {position:mesh.localToWorld(new T.Vector3().fromArray(joint.position||[0,0,0])),axis:new T.Vector3().fromArray(joint.axis||[1,0,0]).transformDirection(mesh.matrixWorld)};
        }
        const mean=values=>values.reduce((sum,link)=>{const frame=axle(link);return frame?sum.add(frame.position):sum;},new T.Vector3()).divideScalar(values.length||1);
        const across=mean(rightLinks).sub(mean(leftLinks));across.y=0;
        const trackWidth=Math.max(.02,across.length());if(across.lengthSq()<1e-12)across.set(1,0,0);else across.normalize();
        // Across points from the robot's left wheel to its right wheel.
        // Forward is up × across; rolling forward needs the opposite axle spin.
        const forward=new T.Vector3(0,1,0).cross(across);
        for(const link of driveLinks){const frame=axle(link);link.rollingSign=frame&&frame.axis.dot(across)<0?1:-1;}
        const drive={enabled:!!(leftLinks.length&&rightLinks.length),left:0,right:0,trackWidth,wheelRadius:driveLinks.length?driveLinks.reduce((sum,link)=>sum+finite(link.device.wheelRadius,.0325),0)/driveLinks.length:.0325,forwardAngle:Math.atan2(forward.x,forward.z)};
        let motors=[0,0,0,0];
        function outputValue(link,outputs){
            if(!unique(link))return undefined;
            const values=link.device.type==='servo'?outputs.servos||{}:link.device.type==='led'?outputs.leds||{}:outputs.motors||motors;
            if(Array.isArray(values)){const match=/^M([1-4])$/i.exec(link.binding.port);return match?finite(values[Number(match[1])-1],0):undefined;}
            return values[link.binding.port]===undefined?undefined:finite(values[link.binding.port],0);
        }
        function setMotors(values){
            motors=[0,0,0,0].map((_,index)=>finite(Array.isArray(values)?values[index]:values&&values['M'+(index+1)],0));
            entries.forEach(entry=>entry.runtime.setMotors(activeBoard&&activeBoard.partId===entry.part.id?motors:[0,0,0,0]));
        }
        function update(dt,outputs,environment){
            outputs=Array.isArray(outputs)?{motors:outputs}:outputs||{};
            if(outputs.motors)motors=[0,0,0,0].map((_,index)=>finite(Array.isArray(outputs.motors)?outputs.motors[index]:outputs.motors['M'+(index+1)],0));
            for(const entry of entries){
                const routed={devices:{},motors:activeBoard&&activeBoard.partId===entry.part.id?motors:[0,0,0,0]};
                for(const link of links.filter(link=>link.entry===entry)){
                    const value=outputValue(link,outputs);if(value!==undefined)routed.devices[link.device.id]=value;
                    // Output LEDs referring to a source actuator can follow
                    // its routed value without occupying a second connector.
                }
                entry.runtime.update(dt,routed,environment);
                if(activeBoard&&activeBoard.partId===entry.part.id)entry.runtime.setMotors(motors);
            }
            const average=values=>values.length?values.reduce((sum,link)=>sum+finite(outputValue(link,outputs),0)/100*finite(link.device.maxSpeed,360)*Math.PI/180*finite(link.device.wheelRadius,.0325)*(link.device.invert?-1:1)*link.rollingSign,0)/values.length:0;
            drive.left=average(leftLinks);drive.right=average(rightLinks);
        }
        function readSensor(port,kind,pulse){
            if(kind==='encoder'){
                const matches=links.filter(link=>link.active&&link.device.type==='motor'&&link.device.encoder&&
                    ((key(link.device.encoder.pinA)===key(port)&&key(link.device.encoder.pinB)===key(pulse&&pulse.pinB))||
                    (key(link.device.encoder.pinB)===key(port)&&key(link.device.encoder.pinA)===key(pulse&&pulse.pinB))));
                if(matches.length>1)throw Error('More than one encoder is connected to '+port+'.');
                if(!matches.length)return 0; // No pulse source wired to these pins.
                const link=matches[0],config=link.device.encoder;
                const physical=pulse&&pulse.encoderAngle?pulse.encoderAngle(link.entry.runtime,link.device.jointId):null;
                const angle=physical===null||physical===undefined?(link.entry.runtime.jointStates.get(link.device.jointId)||0):physical;
                return Math.trunc(angle/360*finite(config.countsPerRevolution,1)*(config.invert?-1:1)*(key(config.pinA)===key(port)?1:-1));
            }
            const normalized=key(port),onPort=portLinks.get(normalized)||[];
            const sensors=links.filter(link=>link.active&&['line-sensor','distance-sensor'].includes(link.device.type));
            const matches=onPort.length?onPort.filter(link=>sensors.includes(link)&&key(link.binding.port)===normalized):sensors.filter(link=>[link.binding.name,link.device.name,link.device.id,link.entry.part.id+'/'+link.device.id].some(value=>key(value)===normalized));
            if(matches.length!==1||!unique(matches[0])){
                if(matches.length>1||onPort.length>1)throw new Error('More than one simulated sensor matches '+port+'. Choose a unique connector or device name.');
                throw new Error('No simulated sensor is connected to '+port+'.');
            }
            if(kind==='distance'&&matches[0].device.type!=='distance-sensor')throw new Error('The sensor connected to '+port+' is not a distance sensor.');
            if(kind==='distance'&&Config.portType(matches[0].device)==='digital'){
                const link=matches[0],trigger=link.binding.triggerPort;
                if(!trigger||trigger===link.binding.port||!link.board.ports.some(p=>p.id===trigger&&p.type==='digital')||
                    (portLinks.get(key(trigger))||[]).length!==1)throw new Error('Connect Ultrasonic Trigger and Echo to two available digital pins in Assembly.');
                if(pulse&&key(pulse.triggerPort)!==key(trigger))throw new Error('Ultrasonic Trigger does not match Assembly: expected '+trigger+', received '+(pulse.triggerPort||'no trigger pulse')+'.');
            }
            return matches[0].entry.runtime.readSensor(matches[0].device.id,kind);
        }
        function sampleSensors(environment){
            entries.forEach(entry=>{
                if(entry.runtime.sampleSensors)entry.runtime.sampleSensors(environment);
                else entry.runtime.update(0,{},environment);
            });
        }
        function driveTargets(left,right){
            if(!drive.enabled){
                // Do not fall back to identical raw M1/M2 signs for an authored
                // robot: opposite-facing shafts may then fight each other.
                if(links.some(link=>link.device.type==='motor'&&link.device.jointId))throw new Error('Drive setup is incomplete. Connect both motors and assign Left drive wheel / Right drive wheel in Assembly.');
                return null;
            }
            const values=[0,0,0,0];
            for(const link of driveLinks){const match=/^M([1-4])$/i.exec(link.binding.port);if(match)values[Number(match[1])-1]=(link.device.driveSide==='left'?left:right)*(link.device.invert?-1:1)*link.rollingSign;}
            return values;
        }
        function readDistanceSensors(){
            return links.filter(link=>unique(link)&&link.device.type==='distance-sensor').map(link=>({
                name:link.device.name||'Ultrasonic',port:link.binding.port,
                metres:link.entry.runtime.readSensor(link.device.id,'distance')
            }));
        }
        function physicsWheels(){
            return driveLinks.map(link=>{const frame=axle(link);return frame&&{side:link.device.driveSide,radius:finite(link.device.wheelRadius,.0325),position:frame.position.toArray()};}).filter(Boolean);
        }
        function applyDisplay(command){
            if(activeBoard&&byPart.has(activeBoard.partId)){
                const entry=byPart.get(activeBoard.partId),manifest=entry.part.productManifest;
                entry.runtime.applyDisplay(command,{componentId:activeBoard.componentId});
                const boardComponent=list(manifest.components).find(component=>component.id===activeBoard.componentId);
                // Older robot packages (including Build BOT) authored their
                // onboard screen as a regular display without connector data.
                // Keep that onboard behavior until the author defines ports or
                // the user explicitly wires/disconnects that screen instance.
                if(boardComponent&&boardComponent.ports===undefined&&!boardComponent.boardDefinition){
                    for(const device of list(manifest.devices)){
                        if(device.type!=='display'||device.legacyOverlay||device.componentId!==activeBoard.componentId)continue;
                        if(list(manifest.connections).some(connection=>connection.deviceId===device.id))continue;
                        if(list(entry.part.deviceBindings).some(binding=>binding.deviceId===device.id&&Object.prototype.hasOwnProperty.call(binding,'port')))continue;
                        entry.runtime.applyDisplay(command,device.id);
                    }
                }
            }
            for(const link of links){
                if(link.device.type!=='display'||!unique(link))continue;
                const component=link.entry.runtime.physicsModel().manifest.components.find(item=>item.id===link.device.componentId);
                // This controller has already received the native board draw.
                if(activeBoard&&link.entry.part.id===activeBoard.partId&&link.device.componentId===activeBoard.componentId&&component&&component.boardDefinition&&component.boardDefinition.simulation&&component.boardDefinition.simulation.display)continue;
                link.entry.runtime.applyDisplay(command,link.device.id);
            }
        }
        function resolveMates(records,prepared){
            const result=[],seen=new Set();
            function endpoint(partId,face){
                const entry=byPart.get(partId);if(!entry||!face)return null;
                const data=entry.runtime.physicsModel(),stored=prepared&&prepared.get(partId);
                let componentId=face.componentId;
                if(!componentId&&stored){const match=/^brep-(\d+)$/.exec(face.key||'');if(match)componentId=(stored.faces||[])[Number(match[1])]&&stored.faces[Number(match[1])].componentId;}
                if(!componentId&&data.meshes.size===1)componentId=data.meshes.keys().next().value;
                const mesh=data.meshes.get(componentId);if(!mesh)return null;
                if(face.componentFace)return {binding:{runtime:entry.runtime,componentId},face:clone(face.componentFace)};
                if(face.mountId){
                    const component=data.manifest.components.find(item=>item.id===componentId),mount=list(component&&component.mounts).find(item=>item.id===face.mountId);
                    if(mount)return {binding:{runtime:entry.runtime,componentId},face:{center:mount.position.slice(),normal:mount.axis.slice(),axis:mount.type==='fixed'?undefined:mount.axis.slice()}};
                }
                if(!Array.isArray(face.center)||!Array.isArray(face.normal))return null;
                entry.placement.updateWorldMatrix(true,true);
                const center=mesh.worldToLocal(entry.placement.localToWorld(new T.Vector3().fromArray(face.center)));
                const normal=new T.Vector3().fromArray(face.normal).applyNormalMatrix(new T.Matrix3().getNormalMatrix(entry.placement.matrixWorld)).applyNormalMatrix(new T.Matrix3().getNormalMatrix(mesh.matrixWorld.clone().invert())).normalize();
                const axis=face.axis&&new T.Vector3().fromArray(face.axis).transformDirection(entry.placement.matrixWorld).transformDirection(mesh.matrixWorld.clone().invert());
                return {binding:{runtime:entry.runtime,componentId},face:{center:center.toArray(),normal:normal.toArray(),axis:axis?axis.toArray():undefined}};
            }
            for(const record of records){
                if(record.id&&seen.has(record.id))continue;if(record.id)seen.add(record.id);
                const a=endpoint(record.a,record.faceA),b=endpoint(record.b,record.faceB);
                if(a&&b)result.push({a:a.binding,b:b.binding,type:record.type,lockRotation:!!record.lockRotation,faceA:a.face,faceB:b.face});
            }
            return result;
        }
        function controlBindings(){
            return links.filter(link=>unique(link)).map(link=>{
                const trigger=link.binding.triggerPort,digitalDistance=link.device.type==='distance-sensor'&&Config.portType(link.device)==='digital';
                const invalid=digitalDistance&&(!trigger||trigger===link.binding.port||!link.board.ports.some(p=>p.id===trigger&&p.type==='digital')||(portLinks.get(key(trigger))||[]).length!==1);
                return {port:link.binding.port,device:link.device,runtime:link.entry.runtime,triggerPort:digitalDistance?trigger:null,triggerError:invalid?'Connect Ultrasonic Trigger and Echo to two available digital pins in Assembly.':null};
            });
        }
        function getDisplayCanvas(){
            const entry=activeBoard&&byPart.get(activeBoard.partId);
            return entry&&entry.runtime.getDisplayCanvas?entry.runtime.getDisplayCanvas({componentId:activeBoard.componentId}):null;
        }
        return {getDisplayCanvas,controlBindings,activeBoard,drive,update,sampleSensors,setMotors,applyDisplay,readSensor,readDistanceSensors,driveTargets,physicsWheels,resolveMates,hasLineSensors:links.some(link=>unique(link)&&link.device.type==='line-sensor')};
    }
    root.AssemblyRuntimeLinks={prepareManifest,create};
    if(typeof module!=='undefined')module.exports=root.AssemblyRuntimeLinks;
})(typeof window!=='undefined'?window:globalThis);
