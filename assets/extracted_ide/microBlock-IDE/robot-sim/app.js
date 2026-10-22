(() => {
    const grabCursor = 'var(--cursor-grab, grab)';
    const grabbingCursor = 'var(--cursor-grabbing, grabbing)';
    let imuDisplayOffsets = [0,0,0];
    const ASSEMBLY_REVISION_KEY = 'robot_assembly_revision';
    const canvas = document.getElementById('motor-sim-wheels');
    const status = document.getElementById('motor-sim-status') || document.createElement('div');
    status.id='motor-sim-status';status.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    status.style.cssText='position:absolute;top:54px;left:12px;right:12px;z-index:8;padding:10px 14px;border:1px solid #cde5fa;border-radius:10px;background:#f3faff;color:#285777;font:12px sans-serif;box-shadow:0 3px 12px #17436b14;pointer-events:none;';
    if(!status.isConnected)canvas?.parentElement?.append(status);
    const run = document.getElementById('motor-sim-run');
    const stopButton = document.getElementById('motor-sim-stop');
    const resetButton = document.getElementById('motor-sim-reset');
    const followButton = document.getElementById('motor-sim-follow');
    const fieldButton = document.getElementById('motor-sim-field');
    const controlToolbar = document.querySelector('.motor-sim-toolbar');
    const playback = new SimPlayback.Recorder();
    const playbackButton = document.getElementById('motor-sim-playback');
    // Keep the element reference when the SIM is adopted into a popup document.
    const telemetryHost = document.getElementById('motor-sim-telemetry');
    let playbackPanel=null,playbackSlider=null,playbackTime=null,playbackPlay=null,playbackDetail=null;
    let playbackTelemetryHidden=false;
    let customStep=null;
    let videoExport=null,videoMenu=null,lastPlaybackAudioTime=null;
    let recordedTone={frequency:0,duty:0};
    const boardButtons = {IO44:false, IO43:false};
    const boardButtonElements = [];
    const boardButtonHolds = {A:false,B:false,AB:false};
    let atomKnob=500,atomKnobControl=null;
    if(controlToolbar) {
        ['A','B','AB'].forEach(name=>{
            const button=document.createElement('button');button.type='button';button.textContent=name;
            button.setAttribute('aria-label','Board button '+name);button.setAttribute('aria-pressed','false');
            button.hidden=typeof boardId==='undefined'||!['buildbot','atom-vx'].includes(boardId);boardButtonElements.push(button);
            button.dataset.boardButton=name;
            const set=pressed=>{
                boardButtonHolds[name]=playback.active?false:pressed;
                boardButtons.IO44=boardButtonHolds.A||boardButtonHolds.AB;
                boardButtons.IO43=boardButtonHolds.B||boardButtonHolds.AB;
                boardButtonElements.forEach(node=>node.setAttribute('aria-pressed',String(
                    node.dataset.boardButton==='AB'?boardButtons.IO44&&boardButtons.IO43:
                    node.dataset.boardButton==='A'?boardButtons.IO44:boardButtons.IO43)));
            };
            button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();button.setPointerCapture(event.pointerId);set(true);});
            ['pointerup','pointercancel','lostpointercapture','blur'].forEach(type=>button.addEventListener(type,()=>set(false)));
            button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();set(true);}});
            button.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();set(false);}});
            window.addEventListener('blur',()=>set(false));
            controlToolbar.appendChild(button);
        });
    }
    if(controlToolbar){
        atomKnobControl=document.createElement('label');atomKnobControl.className='sim-atom-knob';
        atomKnobControl.style.cssText='align-items:center;gap:8px;font-size:11px;padding:8px 12px;border-top:1px solid #edf1f5;';
        atomKnobControl.textContent='Knob';
        const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1000';slider.value='500';slider.style.cssText='width:100%;min-width:0;accent-color:#44abff';slider.setAttribute('aria-label','ATOM VX knob');
        slider.addEventListener('input',()=>{atomKnob=Number(slider.value);});const reading=document.createElement('output');reading.textContent='500';slider.addEventListener('input',()=>reading.textContent=slider.value);atomKnobControl.append(slider,reading);
    }
    const telemetryPanel = window.SimTelemetryPanel && window.SimTelemetryPanel.create(telemetryHost);
    if(atomKnobControl&&telemetryHost)telemetryHost.insertBefore(atomKnobControl,telemetryHost.querySelector('.sim-telemetry-detail'));

    let motorTargets = [0, 0, 0, 0];
    let servoTargets = {};
    let frame = 0, last = 0, generation = 0;
    let frameWindow = window;
    let viewportSize = null;
    let frameFallback = null,frameTicket=0;
    function cancelSimFrame() {
        frameTicket++;
        if(frame)frameWindow.cancelAnimationFrame(frame);
        if(frameFallback!==null){clearTimeout(frameFallback);frameFallback=null;}
        frame=0;
    }
    function requestSimFrame() {
        frameWindow = canvas.ownerDocument.defaultView || window;
        // Chromium can stall RAF while timers and the physics Worker are
        // still running (including after moving/resetting the viewport).
        // Race a bounded fallback against RAF so that physics is not starved.
        // Cancel the loser: a late RAF must never create a second frame loop.
        const ticket=frameTicket;
        let completed=false;
        const tick=()=>{if(completed||ticket!==frameTicket)return;completed=true;cancelSimFrame();draw(performance.now());};
        const onAnimationFrame=()=>{
            if(completed||ticket!==frameTicket)return;
            // A fallback just before vsync can make the newly requested RAF
            // arrive less than1ms later. Keep its existing timer deadline and
            // defer that redundant draw, while allowing normal120Hz frames.
            if(last&&performance.now()-last<8){frame=frameWindow.requestAnimationFrame(onAnimationFrame);return;}
            tick();
        };
        const id=frameWindow.requestAnimationFrame(onAnimationFrame);
        // A fixed 40ms fallback creates visible 25FPS stretches whenever RAF
        // pauses even though physics keeps up. Target the next 60Hz frame,
        // accounting for draw time, while leaving a small window for Worker
        // replies if a frame itself ran over budget.
        const spent=last?Math.max(0,performance.now()-last):0;
        frameFallback=setTimeout(tick,Math.max(4,1000/60-spent));
        return id;
    }
    const slowdownReports=[];
    const performanceRecorder=window.SimPerformanceRecorder?new SimPerformanceRecorder():null;
    let performanceObserver=null;
    if(performanceRecorder&&typeof PerformanceObserver!=='undefined'){
        try{performanceObserver=new PerformanceObserver(list=>list.getEntries().forEach(entry=>performanceRecorder.longTask(entry.duration)));performanceObserver.observe({entryTypes:['longtask']});}catch(_){}
        window.addEventListener('pagehide',()=>{if(performanceObserver)performanceObserver.disconnect();},{once:true});
    }
    let monitorPhase='Ready',monitorStart=0,monitorElapsed=0;
    function readMonitor(){
        const time=scene3d&&scene3d.readSimulationTime();
        if(monitorPhase==='Running'&&Number.isFinite(time))monitorElapsed=Math.max(0,time-monitorStart);
        return {phase:monitorPhase,elapsed:monitorElapsed,physicsTime:time,board:typeof boardId==='undefined'?'':boardId};
    }

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    function showFollowState(enabled) {
        if (!followButton) return;
        followButton.setAttribute('aria-pressed',String(enabled));
        const tip=followButton.querySelector('.sim-tool-tip');if(tip)tip.textContent=enabled?'Follow: On':'Follow: Off';
    }
    if(controlToolbar){
        document.addEventListener('keydown',event=>{if(event.key==='Tab')controlToolbar.classList.add('is-keyboard-navigation');});
        document.addEventListener('pointerdown',()=>controlToolbar.classList.remove('is-keyboard-navigation'));
    }
    const log = message => {
        ensureTerminal();
        const lines = String(message).split(/\r\n|\r|\n/);
        term.writeln(lines.map(line => '[SIM] ' + line.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ')).join('\r\n'));
    };

    function createSimulator3D() {
        if (!window.THREE) throw new Error('Three.js is not ready');
        const THREE = window.THREE;
        const telemetrySampler = window.SimTelemetry && window.SimTelemetry.create(THREE);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f7fa);

        const perspectiveCamera = new THREE.PerspectiveCamera(52, 16 / 9, 0.001, 1000);
        const topCamera = new THREE.OrthographicCamera(-1,1,1,-1,0.001,1000);
        let camera=perspectiveCamera;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.domElement.style.cursor = grabCursor;
        const renderPixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(renderPixelRatio());
        if (renderer.outputEncoding !== undefined && THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.shadowMap.enabled = false;
        renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());

        const viewportStyle = window.ProductViewportStyle.create(THREE, renderer, scene);
        let viewportModel = null;

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            viewportStyle.floorMaterial()
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.001;
        floor.receiveShadow = true;
        scene.add(floor);

        const grid = new THREE.GridHelper(8, 320, 0x7f8f9f, 0xa9b5c1);
        grid.position.y = -0.0005;
        if (grid.material) {
            const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
            materials.forEach(material => {
                material.depthTest = true;
                material.transparent = true;
                material.opacity = 0.18;
            });
        }
        scene.add(grid);

        // The Illustrator artboard is landscape: 240 cm along X, 120 cm along Z.
        // Rendering and line sensors share the same artwork and world transform.
        const fieldOptions = { url: 'robot-sim/fields/opt-primary-2025.png', width: 2.4, length: 1.2,
            // Put the center of START at the robot's existing reset origin.
            centerX: .15, centerZ: -.45, baseY: 0, thickness: .005,
            anisotropy: renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1,
            onLoad: redraw, onError: error => log('Could not load the field: ' + error.message) };
        fieldOptions.rods=Array.from({length:7},(_,i)=>({
            x:fieldOptions.centerX+(.525+i*.0125-.5)*fieldOptions.width,
            z:fieldOptions.centerZ+(.375-.5)*fieldOptions.length,
            diameter:.005,length:.25*fieldOptions.length
        }));
        let fieldMap = null;
        let fieldLayoutRevision=null;
        if (fieldMap) { scene.add(fieldMap.mesh); fieldMap.mesh.updateMatrixWorld(true); }
        let fieldCans=null;
        if(fieldCans)scene.add(fieldCans.group);
        const sensorEnvironment = {
            floorY: fieldMap ? fieldMap.topY : 0, obstacles: fieldMap ? [floor, fieldMap.mesh] : [floor],
            lineAt(x, z) { return fieldMap ? fieldMap.lineAt(x, z) : 1; }
        };

        if(fieldCans)sensorEnvironment.obstacles.push(fieldCans.group);
        // Rendering and PWM writes do not constitute a sensor read. Sample
        // fresh optics only when firmware requests them, at the latest pose.
        const actuatorEnvironment=Object.assign({},sensorEnvironment,{sampleSensors:false});
        const analogEnvironment=Object.assign({},sensorEnvironment,{sensorKind:'analog',sensorMatrixWorld:mesh=>
            rigidRobot&&rigidRobot.sensorMatrixWorld?rigidRobot.sensorMatrixWorld(mesh):mesh.matrixWorld});
        const distanceEnvironment=Object.assign({},sensorEnvironment,{sensorKind:'distance'});
        const robot = new THREE.Group();
        scene.add(robot);
        const viewRaycaster = new THREE.Raycaster();
        const viewPointer = new THREE.Vector2();
        const placementPlane = new THREE.Plane(new THREE.Vector3(0,1,0),0);
        const placementOffset = new THREE.Vector3(), placementPoint = new THREE.Vector3();
        const turnRing=new THREE.Group();turnRing.visible=false;scene.add(turnRing);
        // A single transparent HUD texture keeps the control crisp without extra draw calls per tick.
        const hudCanvas=document.createElement('canvas');hudCanvas.width=hudCanvas.height=1024;
        const hud=hudCanvas.getContext('2d'),cx=512,cy=512,r=408;
        function arc(radius,start,end,color,width){hud.beginPath();hud.arc(cx,cy,radius,start,end);hud.strokeStyle=color;hud.lineWidth=width;hud.stroke();}
        hud.shadowColor='rgba(15,20,27,.18)';hud.shadowBlur=16;
        arc(r,0,Math.PI*2,'rgba(30,35,43,.12)',76);
        hud.shadowBlur=0;
        const ringGradient=hud.createLinearGradient(0,100,0,924);
        ringGradient.addColorStop(0,'rgba(65,72,82,.58)');ringGradient.addColorStop(.5,'rgba(28,33,41,.46)');ringGradient.addColorStop(1,'rgba(17,21,28,.56)');
        arc(r,0,Math.PI*2,ringGradient,62);
        arc(r-33,0,Math.PI*2,'rgba(10,14,20,.35)',1.5);
        arc(r+33,0,Math.PI*2,'rgba(225,232,240,.55)',2);
        // Separated luminous arcs keep the broad, translucent track airy.
        hud.lineCap='round';
        for(let i=0;i<4;i++)arc(r+33,i*Math.PI/2+.12,(i+1)*Math.PI/2-.12,'rgba(190,201,214,.7)',4);
        // Inset marks stay inside the band, with breathing room on both edges.
        hud.lineCap='round';
        for(let i=0;i<36;i++){
            const angle=i*Math.PI/18,major=i%3===0;
            const halfLength=i%9===0?18:major?11:5;
            hud.beginPath();
            hud.moveTo(cx+Math.cos(angle)*(r-halfLength),cy+Math.sin(angle)*(r-halfLength));
            hud.lineTo(cx+Math.cos(angle)*(r+halfLength),cy+Math.sin(angle)*(r+halfLength));
            hud.strokeStyle=major?'rgba(240,244,250,.85)':'rgba(197,207,219,.5)';
            hud.lineWidth=major?3:2;hud.stroke();
        }
        const ringTexture=new THREE.CanvasTexture(hudCanvas);ringTexture.encoding=THREE.sRGBEncoding;
        const ringMaterial=new THREE.MeshBasicMaterial({map:ringTexture,depthTest:false,depthWrite:false,transparent:true,toneMapped:false,side:THREE.DoubleSide});
        const ringLine=new THREE.Mesh(new THREE.PlaneBufferGeometry(.2384,.2384),ringMaterial);
        ringLine.rotation.x=-Math.PI/2;ringLine.renderOrder=1000;turnRing.add(ringLine);
        // Picking follows the circular track, not the square transparent texture.
        const ringPick=new THREE.Mesh(new THREE.TorusBufferGeometry(.095,.012,8,96),new THREE.MeshBasicMaterial({visible:false}));
        ringPick.rotation.x=-Math.PI/2;turnRing.add(ringPick);
        const angleCanvas=document.createElement('canvas');angleCanvas.width=256;angleCanvas.height=80;
        const angleTexture=new THREE.CanvasTexture(angleCanvas);angleTexture.encoding=THREE.sRGBEncoding;
        const angleMaterial=new THREE.SpriteMaterial({map:angleTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
        const angleLabel=new THREE.Sprite(angleMaterial);angleLabel.scale.set(.084,.02625,1);angleLabel.position.set(0,.008,.155);angleLabel.renderOrder=1002;turnRing.add(angleLabel);
        let lastAngleLabel='';
        function updateAngleLabel(){
            const active=orbitState.isDragging&&orbitState.dragMode==='robot-turn';
            const degrees=displayYaw();
            const text=(active?'ROTATE  ':'YAW  ')+degrees.toFixed(1)+'°';
            if(text===lastAngleLabel)return;lastAngleLabel=text;
            const c=angleCanvas.getContext('2d');c.clearRect(0,0,256,80);
            c.beginPath();c.moveTo(34,8);c.lineTo(222,8);c.arc(222,40,32,-Math.PI/2,Math.PI/2);c.lineTo(34,72);c.arc(34,40,32,Math.PI/2,Math.PI*1.5);c.closePath();
            c.fillStyle=active?'rgba(27,33,42,.94)':'rgba(37,43,52,.84)';c.fill();
            c.strokeStyle=active?'#aebdce':'rgba(159,176,196,.5)';c.lineWidth=2;c.stroke();
            c.fillStyle=active?'#f0f4fa':'#d2dce9';
            c.font='600 27px "Segoe UI",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,128,41);angleTexture.needsUpdate=true;
        }
        let turnStart=0,turnPose=null,selectedDragBody;
        function selectedPlacement(){return rigidRobot&&rigidRobot.placementState?rigidRobot.placementState(selectedDragBody):placementPose();}
        function placementPose(){return rigidRobot?rigidRobot.readState():{x:robot.position.x,y:robot.position.y,z:robot.position.z,heading:robot.rotation.y};}
        function saveDefaultPosition(){if(!viewportModel)throw Error('Wait for the robot to load.');return window.SimDefaultPosition.save(placementPose());}
        function alignHeading(heading,startTarget){
            const pose=rigidRobot?rigidRobot.placementState():placementPose();
            if(startTarget){
                const cx=startTarget.x+Math.cos(heading)*.04,cz=startTarget.z-Math.sin(heading)*.04;
                if(Math.abs(pose.x-cx)<.15&&Math.abs(pose.z-cz)<.15){pose.x=startTarget.x;pose.z=startTarget.z;}
            }
            if(rigidRobot)rigidRobot.moveToXZ(pose.x,pose.z,heading,pose.index);
            else placeRobot(pose.x,pose.z,heading);
            Object.assign(state,placementPose());
            return window.SimDefaultPosition.save({...pose,heading,reference:'body-center'});
        }
        function updateTurnRing(){
            if(!turnRing.visible)return;
            // The rigid chassis centre follows the current solver pose, never the clicked surface.
            if(rigidRobot){const p=selectedPlacement();turnRing.position.set(p.x,0,p.z);}
            else turnRing.position.copy(robot.position);
            turnRing.position.y=(fieldMap?fieldMap.topY:0)+.004;
            updateAngleLabel();turnRing.updateMatrixWorld(true);
        }
        function placeRobot(x,z,heading,y,held){
            if(rigidRobot)rigidRobot.moveToXZ(x,z,heading,selectedDragBody,y,held);
            else {robot.position.x=x;robot.position.z=z;if(Number.isFinite(heading))robot.rotation.y=heading;robot.updateMatrixWorld(true);}
            const pose=placementPose();state.x=pose.x;state.z=pose.z;state.heading=pose.heading;
            state.linearVelocity=0;state.angularVelocity=0;updateTurnRing();
        }
        function pointerRay(event) {
            const rect=renderer.domElement.getBoundingClientRect();
            viewPointer.set((event.clientX-rect.left)/Math.max(1,rect.width)*2-1,-(event.clientY-rect.top)/Math.max(1,rect.height)*2+1);
            viewRaycaster.setFromCamera(viewPointer,camera);
        }

        let highlightedProp=null,highlightMaterials=[];
        function highlightProp(mesh) {
            if(mesh===highlightedProp)return;
            highlightMaterials.forEach(([material,color])=>material.emissive.copy(color));highlightMaterials=[];highlightedProp=mesh;
            if(mesh)for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(material&&material.emissive){highlightMaterials.push([material,material.emissive.clone()]);material.emissive.setHex(0x17404f);}
            redraw();
        }
        function pickRobot(event) {
            const direct=viewRaycaster.intersectObject(robot,true)[0];
            if(direct)return direct;
            if(!rigidRobot||!rigidRobot.entries)return null;
            const rect=renderer.domElement.getBoundingClientRect(),pixels=event&&event.pointerType==='touch'?26:18;
            let nearest=null;
            for(const entry of rigidRobot.entries){
                if(!entry.freeDrag)continue;
                const mesh=entry.mesh;if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
                const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(mesh.matrixWorld);
                const depth=sphere.center.clone().applyMatrix4(camera.matrixWorldInverse).z;
                if(depth>=0)continue;
                // A screen-space picking margin makes small props easier to grab,
                // without changing their visible size or physical collision shape.
                sphere.radius+=pixels*(camera.isOrthographicCamera?camera.top-camera.bottom:2*(-depth)*Math.tan(camera.fov*Math.PI/360))/Math.max(1,rect.height);
                const point=viewRaycaster.ray.closestPointToPoint(sphere.center,new THREE.Vector3()),distance=point.distanceTo(viewRaycaster.ray.origin);
                if(point.distanceTo(sphere.center)<=sphere.radius&&(!nearest||distance<nearest.distance))nearest={object:mesh,point,distance};
            }
            return nearest;
        }
        function updateViewCursor(event) {
            if (orbitState && orbitState.isDragging) {
                renderer.domElement.style.cursor = grabbingCursor;
                return;
            }
            if (!event || !robot.children.length) {
                highlightProp(null);
                renderer.domElement.style.cursor = grabCursor;
                return;
            }
            const rect = renderer.domElement.getBoundingClientRect();
            viewPointer.set(
                ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
                -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
            );
            viewRaycaster.setFromCamera(viewPointer, camera);
            const hit=pickRobot(event),entry=hit&&rigidRobot&&rigidRobot.entries&&rigidRobot.entries.find(e=>e.freeDrag&&e.mesh===hit.object);
            highlightProp(entry?entry.mesh:null);
            renderer.domElement.style.cursor = grabCursor;
        }

        const orbitState = {
            target: new THREE.Vector3(0, 0, 0),
            desiredTarget: new THREE.Vector3(0, 0, 0),
            radius: 0.65,
            desiredRadius: 0.65,
            maxRadius: 3,
            theta: Math.PI / 4,
            desiredTheta: Math.PI / 4,
            phi: 1.05,
            desiredPhi: 1.05,
            isDragging: false,
            didDrag: false,
            dragMode: 'orbit',
            startX: 0,
            startY: 0,
            startTheta: Math.PI / 4,
            startPhi: 1.05,
            startTarget: new THREE.Vector3(0, 0, 0)
        };
        const cameraFollow=window.SimCameraFollow&&window.SimCameraFollow.create(THREE,orbitState);
        const followAnchor=new THREE.Vector3();
        function setCameraFollow(enabled){
            if(!cameraFollow)return false;
            if(playback.active)followAnchor.copy(playbackAnchor.position);
            else followAnchor.set(state.x,state.y,state.z).add(physics.viewOffset);
            cameraFollow.setEnabled(enabled,followAnchor);showFollowState(cameraFollow.enabled);redraw();
            return cameraFollow.enabled;
        }

        function viewField() {
            if (!fieldMap) return;
            camera=topCamera;
            setCameraFollow(false);
            resize();
            const phi = 0, tangent = Math.tan(perspectiveCamera.fov * Math.PI / 360);
            const distance = Math.max(fieldOptions.width / (2 * tangent * perspectiveCamera.aspect),
                fieldOptions.length * Math.cos(phi) / (2 * tangent)) * 1.3 + fieldOptions.length * Math.sin(phi) / 2;
            orbitState.maxRadius = Math.max(3, distance * 1.1);
            orbitState.desiredTarget.set(fieldOptions.centerX, fieldMap.topY, fieldOptions.centerZ);
            orbitState.desiredTheta = 0;
            orbitState.desiredPhi = phi;
            orbitState.desiredRadius = distance;
            redraw();
        }

        function clampOrbitValues() {
            orbitState.phi = clamp(orbitState.phi, 0, Math.PI - 0.14);
            orbitState.desiredPhi = clamp(orbitState.desiredPhi, 0, Math.PI - 0.14);
            orbitState.radius = clamp(orbitState.radius, 0.02, orbitState.maxRadius);
            orbitState.desiredRadius = clamp(orbitState.desiredRadius, 0.02, orbitState.maxRadius);
        }

        function updateCameraFromOrbit(frameScale = 1) {
            clampOrbitValues();
            const smooth = 1 - Math.pow(1 - (orbitState.isDragging ? 0.36 : 0.18), frameScale);
            orbitState.theta += (orbitState.desiredTheta - orbitState.theta) * smooth;
            orbitState.phi += (orbitState.desiredPhi - orbitState.phi) * smooth;
            if(Math.abs(orbitState.phi-orbitState.desiredPhi)<0.001)orbitState.phi=orbitState.desiredPhi;
            orbitState.radius = orbitState.desiredRadius;
            if(camera.isOrthographicCamera){
                const halfHeight=orbitState.radius*Math.tan(perspectiveCamera.fov*Math.PI/360),halfWidth=halfHeight*perspectiveCamera.aspect;
                if(camera.top!==halfHeight||camera.right!==halfWidth){camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();}
            }
            orbitState.target.lerp(orbitState.desiredTarget, 1 - Math.pow(0.8, frameScale));

            const sinPhi = Math.sin(orbitState.phi);
            camera.position.set(
                orbitState.target.x + orbitState.radius * sinPhi * Math.sin(orbitState.theta),
                orbitState.target.y + orbitState.radius * Math.cos(orbitState.phi),
                orbitState.target.z + orbitState.radius * sinPhi * Math.cos(orbitState.theta)
            );
            // Analytic orbit up stays perpendicular at the exact top pole.
            // World Y up would be parallel to the viewing direction there.
            camera.up.set(-Math.cos(orbitState.phi)*Math.sin(orbitState.theta),sinPhi,-Math.cos(orbitState.phi)*Math.cos(orbitState.theta));
            camera.lookAt(orbitState.target);
        }

        function isOrbitSettled() {
            return (!cameraFollow || cameraFollow.isSettled()) &&
                Math.abs(orbitState.theta - orbitState.desiredTheta) < 0.001 &&
                Math.abs(orbitState.phi - orbitState.desiredPhi) < 0.001 &&
                Math.abs(orbitState.radius - orbitState.desiredRadius) < 0.002 &&
                orbitState.target.distanceToSquared(orbitState.desiredTarget) < 0.000004;
        }

        function applyOrbitDrag(dx, dy) {
            orbitState.desiredTheta = orbitState.startTheta - dx * 0.008;
            orbitState.desiredPhi = orbitState.startPhi - dy * 0.008;
            clampOrbitValues();
        }

        function applyPanDrag(dx, dy) {
            const distance = orbitState.radius * 0.0018;
            const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
            const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
            orbitState.desiredTarget.copy(orbitState.startTarget)
                .addScaledVector(right, -dx * distance)
                .addScaledVector(up, dy * distance);
        }

        const viewTouches = new Map();
        let pinchDistance = 0, pinchRadius = 0, pinchX=0, pinchY=0, pinchPanning=false;
        const touchDistance = () => { const [a,b] = Array.from(viewTouches.values()); return a && b ? Math.hypot(a.x-b.x,a.y-b.y) : 0; };
        renderer.domElement.addEventListener('pointerdown', event => {
            if(videoExport){event.preventDefault();return;}
            if(event.pointerType==='touch') {
                event.preventDefault();
                viewTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});
                renderer.domElement.setPointerCapture(event.pointerId);
                if(viewTouches.size>=2) {
                    if(orbitState.dragMode==='object-3d'&&rigidRobot){const p=selectedPlacement();rigidRobot.moveToXZ(p.x,p.z,undefined,selectedDragBody,p.y,false);}
                    pinchDistance=Math.max(1,touchDistance());pinchRadius=orbitState.radius;
                    const [a,b]=[...viewTouches.values()];pinchX=(a.x+b.x)/2;pinchY=(a.y+b.y)/2;
                    orbitState.startTarget.copy(orbitState.target);pinchPanning=false;
                    orbitState.dragMode='pinch';orbitState.isDragging=true;orbitState.didDrag=true;
                    orbitState.desiredTheta=orbitState.theta;orbitState.desiredPhi=orbitState.phi;
                    return;
                }
            }
            pointerRay(event);
            updateTurnRing();
            const ringHit=!playback.active&&event.button===0&&!event.shiftKey&&turnRing.visible&&viewRaycaster.intersectObject(ringPick)[0];
            const hit=!playback.active&&event.button===0&&!event.shiftKey ? pickRobot(event) : null;
            orbitState.isDragging = true;
            orbitState.didDrag = false;
            orbitState.dragMode = event.button === 2 || event.shiftKey ? 'pan' : 'orbit';
            if(ringHit){
                orbitState.dragMode='robot-turn';turnPose=selectedPlacement();placementPlane.normal.set(0,1,0);
                selectedDragBody=turnPose.index;
                placementPlane.constant=-turnRing.position.y;
                if(viewRaycaster.ray.intersectPlane(placementPlane,placementPoint))turnStart=Math.atan2(placementPoint.x-turnRing.position.x,placementPoint.z-turnRing.position.z);
            }
            else if(hit && (!rigidRobot || rigidRobot.moveToXZ)) {
                orbitState.dragMode='robot';
                selectedDragBody=rigidRobot&&rigidRobot.placementForMesh?rigidRobot.placementForMesh(hit.object)?.index:undefined;
                placementPlane.normal.set(0,1,0);placementPlane.constant=-hit.point.y;
                const pose=selectedPlacement();
                placementOffset.set(pose.x,pose.y,pose.z).sub(hit.point);
                if(pose.freeDrag){
                    highlightProp(hit.object);
                    orbitState.dragMode='object-3d';placementPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);
                    rigidRobot.moveToXZ(pose.x,pose.z,undefined,selectedDragBody,pose.y,true);
                }
                turnRing.visible=!pose.freeDrag;updateTurnRing();
            }
            if(!hit&&!ringHit)turnRing.visible=false;
            if(orbitState.dragMode==='pan')setCameraFollow(false);
            orbitState.startX = event.clientX;
            orbitState.startY = event.clientY;
            orbitState.startTheta = orbitState.theta;
            orbitState.startPhi = orbitState.phi;
            orbitState.startTarget.copy(orbitState.target);
            orbitState.desiredTheta = orbitState.theta;
            orbitState.desiredPhi = orbitState.phi;
            orbitState.desiredTarget.copy(orbitState.target);
            renderer.domElement.style.cursor = grabbingCursor;
            if (renderer.domElement.setPointerCapture) renderer.domElement.setPointerCapture(event.pointerId);
            redraw();
        });

        renderer.domElement.addEventListener('pointermove', event => {
            if(viewTouches.has(event.pointerId))viewTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});
            if(orbitState.dragMode==='pinch') {
                if(viewTouches.size>=2) {
                    event.preventDefault();
                    orbitState.radius=clamp(pinchRadius*pinchDistance/Math.max(1,touchDistance()),0.02,orbitState.maxRadius);
                    orbitState.desiredRadius=orbitState.radius;
                    const [a,b]=[...viewTouches.values()];
                    const dx=(a.x+b.x)/2-pinchX,dy=(a.y+b.y)/2-pinchY;
                    // Pinching can move its midpoint (one finger may stay still).
                    // Only a predominantly parallel translation counts as a pan.
                    if(!pinchPanning&&Math.hypot(dx,dy)>10&&Math.hypot(dx,dy)>Math.abs(touchDistance()-pinchDistance)*.65){
                        pinchPanning=true;orbitState.startTarget.copy(orbitState.target);setCameraFollow(false);
                    }
                    if(pinchPanning)orbitState.desiredTarget.copy(orbitState.startTarget).addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrix,0),-dx*pinchRadius*.0018).addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrix,1),dy*pinchRadius*.0018);
                    redraw();
                }
                return;
            }
            if (!orbitState.isDragging) {
                updateViewCursor(event);
                return;
            }
            const dx = event.clientX - orbitState.startX;
            const dy = event.clientY - orbitState.startY;
            if (Math.abs(dx) + Math.abs(dy) > 3) orbitState.didDrag = true;
            if(orbitState.dragMode==='robot-turn') {
                pointerRay(event);
                if(orbitState.didDrag&&viewRaycaster.ray.intersectPlane(placementPlane,placementPoint)){
                    const angle=Math.atan2(placementPoint.x-turnRing.position.x,placementPoint.z-turnRing.position.z)-turnStart;
                    const quarterTurn=Math.PI/2;
                    const rawHeading=turnPose.heading+angle;
                    const nearestQuarter=Math.round(rawHeading/quarterTurn)*quarterTurn;
                    const heading=Math.abs(rawHeading-nearestQuarter)<=5*Math.PI/180?nearestQuarter:rawHeading;
                    placeRobot(turnPose.x,turnPose.z,heading);
                }
            }
            else if(orbitState.dragMode==='robot'||orbitState.dragMode==='object-3d') {
                if(orbitState.didDrag) {
                    pointerRay(event);
                    if(viewRaycaster.ray.intersectPlane(placementPlane,placementPoint)) {
                        placementPoint.add(placementOffset);
                        const free=orbitState.dragMode==='object-3d';
                        placeRobot(placementPoint.x,placementPoint.z,undefined,free?Math.max(.028,placementPoint.y):undefined,free?true:undefined);
                    }
                }
            }
            else if (orbitState.dragMode === 'pan') applyPanDrag(dx, dy);
            else applyOrbitDrag(dx, dy);
            redraw();
        });

        function endDrag(event) {
            if(orbitState.dragMode==='object-3d'&&rigidRobot){const p=selectedPlacement();rigidRobot.moveToXZ(p.x,p.z,undefined,selectedDragBody,p.y,false);}
            placementPlane.normal.set(0,1,0);
            if(event)viewTouches.delete(event.pointerId);
            if(!viewTouches.size&&orbitState.dragMode==='pinch')orbitState.dragMode='orbit';
            orbitState.isDragging = false;
            highlightProp(null);
            if (event && renderer.domElement.releasePointerCapture && renderer.domElement.hasPointerCapture && renderer.domElement.hasPointerCapture(event.pointerId)) {
                renderer.domElement.releasePointerCapture(event.pointerId);
            }
            updateViewCursor(event);
            redraw();
        }

        renderer.domElement.addEventListener('pointerup', endDrag);
        renderer.domElement.addEventListener('pointercancel', endDrag);
        renderer.domElement.addEventListener('lostpointercapture', endDrag);
        renderer.domElement.addEventListener('pointerleave', () => {
            if(orbitState.isDragging)return;
            highlightProp(null);
            orbitState.isDragging = false;
            renderer.domElement.style.cursor = grabCursor;
        });
        renderer.domElement.addEventListener('wheel', event => {
            event.preventDefault();
            if(videoExport)return;
            orbitState.radius = clamp(orbitState.radius * Math.exp(event.deltaY * 0.001), 0.02, orbitState.maxRadius);
            orbitState.desiredRadius = orbitState.radius;
            redraw();
        }, { passive: false });

        const physics = { bodyHeight: 0, groundClearance: fieldMap ? fieldMap.topY : 0, wheelRadius: 0.0325, trackWidth: 0.15, driveEnabled: false, viewRadius: 0.3, viewOffset: new THREE.Vector3(0, 0.05, 0) };
        const robotContactBounds = new THREE.Box3();
        const wheelVisuals = [];

        function alignObjectToGroundWithPivot(object, clearance) {
            object.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(object);
            if (!Number.isFinite(box.min.y) || !Number.isFinite(box.max.y)) return;
            let surfaceY = Infinity;
            object.traverse(mesh => {
                if (!mesh.isMesh || !mesh.geometry) return;
                const positions = mesh.geometry.attributes && mesh.geometry.attributes.position;
                const e = mesh.matrixWorld.elements;
                if (positions) {
                    for (let i = 0; i < positions.count; i++) {
                        surfaceY = Math.min(surfaceY, e[1] * positions.getX(i) + e[5] * positions.getY(i) + e[9] * positions.getZ(i) + e[13]);
                    }
                } else if (mesh.geometry.vertices) {
                    // Board displays still use Three.js Geometry, while CAD parts use BufferGeometry.
                    for (const vertex of mesh.geometry.vertices) {
                        surfaceY = Math.min(surfaceY, e[1] * vertex.x + e[5] * vertex.y + e[9] * vertex.z + e[13]);
                    }
                }
            });
            if (!Number.isFinite(surfaceY)) return;
            const height = Math.max(0.001, box.max.y - box.min.y);
            physics.bodyHeight = clamp(height * 0.48, 0.01, 0.42);
            object.position.y += (clearance || 0) - surfaceY - physics.bodyHeight;
            object.updateMatrixWorld(true);
        }

        let modelLoadGeneration = 0;
        let boardController = null;
        let productAssembly = null;
        let rigidRobot = null;
        let simulationStarted = false;
        let sceneSimulationTime = 0;
        const displayCommands = [];
        let pendingModelLoad = null;

        function startSimulation() {
            if (!productAssembly) throw new Error('Wait for the robot model to load before running.');
            if(!simulationStarted)sceneSimulationTime=0;
            simulationStarted = true;
            redraw();
        }

        // A soft projected light patch is used because the field's unlit material
        // intentionally does not respond to scene lights. It never enters physics.
        let sensorLightSpots=null,sensorLightTexture=null,sensorLightGeometry=null;
        const lightOrigin=new THREE.Vector3(),lightDirection=new THREE.Vector3();
        function clearSensorLights(){
            for(const item of sensorLightSpots||[]){scene.remove(item.spot);item.spot.material.dispose();}
            sensorLightSpots=null;
        }
        function updateSensorLights(){
            robot.updateMatrixWorld(true);
            if(!sensorLightSpots){
                sensorLightSpots=[];
                if(!sensorLightTexture){
                    const image=document.createElement('canvas');image.width=image.height=64;
                    const ctx=image.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
                    gradient.addColorStop(0,'rgba(105,190,255,1)');gradient.addColorStop(.35,'rgba(20,115,255,0.95)');gradient.addColorStop(.7,'rgba(10,85,255,0.65)');gradient.addColorStop(1,'rgba(10,75,255,0)');
                    ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
                    sensorLightTexture=new THREE.CanvasTexture(image);sensorLightGeometry=new THREE.PlaneBufferGeometry(1,1);
                }
                robot.traverse(mesh=>{if(!mesh.userData.sensorTipLight)return;
                    const material=new THREE.MeshBasicMaterial({map:sensorLightTexture,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
                    const spot=new THREE.Mesh(sensorLightGeometry,material);spot.rotation.x=-Math.PI/2;spot.renderOrder=3;spot.userData.sensorLightProjection=true;scene.add(spot);sensorLightSpots.push({mesh,spot});
                });
            }
            const floorY=fieldMap?fieldMap.topY:0;
            for(const {mesh,spot} of sensorLightSpots){
                let visible=true;for(let parent=mesh;parent;parent=parent.parent)if(!parent.visible)visible=false;
                if(!(Array.isArray(mesh.material)?mesh.material:[mesh.material]).some(m=>m.visible&&m.userData.sensorEmitter))visible=false;
                const led=mesh.userData.sensorTipLight;
                lightOrigin.fromArray(led.position).applyMatrix4(mesh.matrixWorld);
                lightDirection.fromArray(led.direction).transformDirection(mesh.matrixWorld);
                const distance=(floorY-lightOrigin.y)/lightDirection.y;
                spot.visible=visible&&lightDirection.y<-.15&&distance>=0&&distance<.06;
                if(!spot.visible)continue;
                spot.position.copy(lightOrigin).addScaledVector(lightDirection,distance);spot.position.y=floorY+.00025;
                const radius=.009+distance*.8;spot.scale.set(radius*2,radius*2,1);
                spot.material.opacity=Math.max(.3,1-distance/.12);
            }
        }
        function clearRobot() {
            clearSensorLights();
            clearPlayback();
            highlightProp(null);
            if (rigidRobot) rigidRobot.dispose(); rigidRobot = null;
            if (boardController && boardController.dispose) boardController.dispose();
            boardController = null;
            productAssembly = null;
            while (robot.children.length) robot.remove(robot.children[0]);
            // Bounding boxes for a newly loaded assembly must be measured from
            // an identity parent. Keeping the previous body's Y offset here
            // made every reload subtract that height again and sink the model.
            robot.position.set(0, 0, 0);
            robot.rotation.set(0, 0, 0);
            robot.scale.set(1, 1, 1);
            robot.updateMatrixWorld(true);
            wheelVisuals.splice(0, wheelVisuals.length);
        }

        function syncBoardField() {
            const layout=window.SimFieldLayout?SimFieldLayout.load():null,revision=JSON.stringify(layout);
            const enabled=!!layout;
            const editorButton=document.getElementById('motor-sim-edit-field');if(editorButton)editorButton.hidden=false;
            if(fieldMap&&revision!==fieldLayoutRevision){if(fieldCans)fieldCans.dispose();fieldCans=null;fieldMap.dispose();fieldMap=null;}
            fieldLayoutRevision=revision;fieldOptions.layout=layout;
            fieldOptions.bounds=layout&&window.SimFieldLayout?SimFieldLayout.occupiedBounds(layout,fieldOptions):null;
            if(layout&&window.SimFieldLayout)Object.assign(fieldOptions,SimFieldLayout.features(layout,fieldOptions));
            else Object.assign(fieldOptions,{canMarkers:[],canSlots:[],rods:[],structures:[]});
            if(enabled&&!fieldMap&&window.SimFieldMap){
                fieldMap=window.SimFieldMap.create(THREE,fieldOptions);scene.add(fieldMap.mesh);fieldMap.mesh.updateMatrixWorld(true);
                fieldCans=window.SimFieldCans?SimFieldCans.create(THREE,fieldOptions):null;
                if(fieldCans)scene.add(fieldCans.group);
            }else if(!enabled&&fieldMap){
                if(fieldCans)fieldCans.dispose();fieldCans=null;
                scene.remove(fieldMap.mesh);fieldMap.dispose();fieldMap=null;
            }
            const obstacles=fieldMap?[floor,fieldMap.mesh]:[floor];
            if(fieldCans)obstacles.push(fieldCans.group);
            if(rigidRobot&&rigidRobot.entries)obstacles.push(...rigidRobot.entries.filter(e=>e.freeDrag).map(e=>e.mesh));
            for(const environment of [sensorEnvironment,actuatorEnvironment,analogEnvironment,distanceEnvironment]){
                environment.floorY=fieldMap?fieldMap.topY:0;environment.obstacles=obstacles;
            }
            physics.groundClearance=fieldMap?fieldMap.topY:0;
        }

        function setCameraView(view) {
            if(view === 'field'){viewField();return;}
            const views = { perspective:[Math.PI/4,1.05], top:[0,0], front:[0,Math.PI/2], back:[Math.PI,Math.PI/2], left:[-Math.PI/2,Math.PI/2], right:[Math.PI/2,Math.PI/2] };
            if(!views[view])return;
            camera=view==='top'?topCamera:perspectiveCamera;
            setCameraFollow(true);
            if(playback.active)orbitState.desiredTarget.copy(playbackAnchor.position);
            else orbitState.desiredTarget.set(state.x,state.y,state.z).add(physics.viewOffset);
            orbitState.desiredTheta=views[view][0];orbitState.desiredPhi=views[view][1];
            orbitState.desiredRadius=physics.viewRadius;
            redraw();
        }

        function saveCameraView(){
            return {camera,following:cameraFollow?.enabled,theta:orbitState.desiredTheta,phi:orbitState.desiredPhi,radius:orbitState.desiredRadius,maxRadius:orbitState.maxRadius,target:orbitState.desiredTarget.clone()};
        }
        function restoreCameraView(saved){
            camera=saved.camera;orbitState.maxRadius=saved.maxRadius;
            orbitState.theta=orbitState.desiredTheta=saved.theta;orbitState.phi=orbitState.desiredPhi=saved.phi;
            orbitState.radius=orbitState.desiredRadius=saved.radius;orbitState.target.copy(saved.target);orbitState.desiredTarget.copy(saved.target);
            if(cameraFollow)cameraFollow.setEnabled(saved.following,saved.target);
            updateCameraFromOrbit();redraw();
        }
        function settleCameraView(){
            orbitState.theta=orbitState.desiredTheta;orbitState.phi=orbitState.desiredPhi;orbitState.radius=orbitState.desiredRadius;orbitState.target.copy(orbitState.desiredTarget);updateCameraFromOrbit();
        }

        function clearProjectScene() {
            ++modelLoadGeneration;
            simulationStarted=false;viewportModel=null;turnRing.visible=false;
            orbitState.isDragging=false;selectedDragBody=undefined;displayCommands.length=0;imuDisplayOffsets=[0,0,0];
            clearRobot();
            if(fieldCans)fieldCans.dispose();fieldCans=null;
            if(fieldMap){scene.remove(fieldMap.mesh);fieldMap.dispose();fieldMap=null;}
            if(telemetrySampler)telemetrySampler.reset();if(telemetryPanel)telemetryPanel.reset();
            state.x=state.y=state.z=state.heading=state.linearVelocity=state.angularVelocity=0;
            redraw();
        }
        function reloadRobotModel() {
            simulationStarted = false;
            viewportModel=null;turnRing.visible=false;clearRobot();redraw();
            syncBoardField();
            if(fieldCans)fieldCans.reset();
            pendingModelLoad = loadRobotModel();
            // Initial loading and change events have no awaiting caller.
            // Run awaits the same promise and reports any failure in Serial.
            pendingModelLoad.catch(() => {});
            return pendingModelLoad;
        }

        async function waitForModel() {
            for (;;) {
                const pending = pendingModelLoad;
                try { await pending;if(fieldMap&&!await fieldMap.ready)throw Error('Unable to load the field image.'); }
                catch (error) { if (pending === pendingModelLoad) throw error; }
                if (pending === pendingModelLoad) return;
            }
        }

        async function loadRobotModel() {
            const generation = ++modelLoadGeneration;
            let assembled = null;
            try { if (window.AssemblySimLoader) assembled = await window.AssemblySimLoader.load(THREE); }
            catch (error) { console.warn('[Robot SIM] Assembly model load failed', error); throw error; }
            if (generation !== modelLoadGeneration) { if (assembled && assembled.controller) assembled.controller.dispose(); return; }
            if (!assembled) { viewportModel = null; clearRobot(); redraw(); throw new Error('No robot model is available. Open Assembly and check the equipment.'); }
            clearRobot();
            robot.add(assembled.root);
            productAssembly = assembled;
            viewportModel = viewportStyle.modelFromRoot(assembled.root);
            boardController = assembled.controller || null;
            if (boardController) {
                displayCommands.forEach(command => boardController.applyDisplay(command));
                boardController.setMotors(motorTargets);
            }
            alignObjectToGroundWithPivot(assembled.root, physics.groundClearance);
            assembled.motors.forEach((motor, index) => { if (motor) wheelVisuals[index] = motor; });
            physics.driveEnabled = !!assembled.driveEnabled;
            physics.wheelRadius = assembled.wheelRadius;
            physics.trackWidth = assembled.trackWidth;
            const bounds = new THREE.Box3().setFromObject(assembled.root);
            const size = bounds.getSize(new THREE.Vector3());
            const radius = Math.max(.03, size.length() * .95);
            physics.viewRadius = radius * (fieldMap ? 1.5 : 1);
            reset(false);
            const physicalEnvironment = { assemblyMates: assembled.assemblyMates || [], cans: fieldCans };
            if (fieldMap) physicalEnvironment.field = Object.assign({},fieldOptions,fieldMap.bounds);
            if (window.AssemblyPhysics && assembled.physicsProducts && assembled.physicsProducts.length) rigidRobot=(window.AssemblyPhysicsClient||window.AssemblyPhysics).create(THREE,robot,assembled.physicsProducts,physicalEnvironment);
            else if (assembled.productDrive && window.RigidRobot) rigidRobot = window.RigidRobot.create(THREE,robot,assembled.productDrive,assembled.physics,assembled.physicsWheels(),physicalEnvironment);
            // Physics may attach a separate visual model after measuring its calibrated geometry.
            viewportModel = viewportStyle.modelFromRoot(assembled.root);
            if(rigidRobot&&rigidRobot.entries){const props=rigidRobot.entries.filter(e=>e.freeDrag).map(e=>e.mesh);for(const environment of [sensorEnvironment,actuatorEnvironment,analogEnvironment,distanceEnvironment])environment.obstacles=environment.obstacles.concat(props);}
            if((fieldMap&&fieldOptions.layout)||(window.SimDefaultPosition&&SimDefaultPosition.load()))reset();
            redraw();
        }

        reloadRobotModel();

        const state = {
            x: 0, z: 0, y: 0, heading: 0,
            linearVelocity: 0, angularVelocity: 0, previousLinearVelocity: 0,
            verticalVelocity: 0, pitch: 0, roll: 0, pitchVelocity: 0, rollVelocity: 0,
            wheelAngularVelocity: [0, 0, 0, 0],
            wheelAngle: [0, 0, 0, 0]
        };

        let renderWidth = 0;
        let renderHeight = 0;
        function resize() {
            const pixelRatio = videoExport?.fast ? 1 : renderPixelRatio();
            if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
            // ResizeObserver supplies layout dimensions. Reading them again
            // after telemetry writes forces a synchronous page-wide layout.
            const box = viewportSize || (viewportSize=canvas.getBoundingClientRect());
            // Match the visible canvas even below the old desktop minimums;
            // otherwise CSS squeezes an image rendered at a different aspect.
            const width = videoExport?.fast ? 1920 : Math.max(1, Math.round(box.width));
            const height = videoExport?.fast ? 1080 : Math.max(1, Math.round(box.height));
            if (renderWidth !== width || renderHeight !== height) {
                renderWidth = width;
                renderHeight = height;
                renderer.setSize(width, height, false);
                perspectiveCamera.aspect = width / height;
                perspectiveCamera.updateProjectionMatrix();
            }
        }

        let timingBaseline=null,lastSlowReport=-Infinity;
        function reset(applyDefaultPosition = true) {
            selectedDragBody=undefined;
            imuDisplayOffsets=[0,0,0];
            timingBaseline=null;lastSlowReport=-Infinity;
            if(fieldCans)fieldCans.reset();
            simulationStarted = false;
            if (telemetrySampler) telemetrySampler.reset();
            if (telemetryPanel) telemetryPanel.reset();
            if (rigidRobot) rigidRobot.reset();
            if (productAssembly && productAssembly.resetDevices) productAssembly.resetDevices();
            state.x = 0; state.z = 0; state.y = physics.bodyHeight; state.heading = 0;
            state.linearVelocity = 0; state.angularVelocity = 0; state.previousLinearVelocity = 0;
            state.verticalVelocity = 0; state.pitch = 0; state.roll = 0;
            state.pitchVelocity = 0; state.rollVelocity = 0;
            state.wheelAngularVelocity.fill(0); state.wheelAngle.fill(0);
            robot.position.set(0, physics.bodyHeight, 0);
            robot.rotation.set(0, 0, 0);
            robot.updateMatrixWorld(true);
            const savedPosition=window.SimDefaultPosition&&SimDefaultPosition.load();
            if(applyDefaultPosition && savedPosition){
                if(rigidRobot&&savedPosition.reference==='body-center')rigidRobot.moveToXZ(savedPosition.x,savedPosition.z,savedPosition.heading,rigidRobot.placementState().index);
                else placeRobot(savedPosition.x,savedPosition.z,savedPosition.heading);
            }
            else if(applyDefaultPosition && rigidRobot&&fieldMap&&fieldOptions.layout&&window.SimFieldLayout){
                const start=SimFieldLayout.startPose(fieldOptions.layout,fieldOptions);rigidRobot.moveToXZ(start.x,start.z,start.heading,rigidRobot.placementState().index);
            }
            if(rigidRobot)Object.assign(state,placementPose());
            const fittedBounds = new THREE.Box3().setFromObject(robot);
            const fittedCenter = fittedBounds.isEmpty() ? new THREE.Vector3(0, state.y, 0) : fittedBounds.getCenter(new THREE.Vector3());
            physics.viewOffset.copy(fittedCenter).sub(new THREE.Vector3(state.x, state.y, state.z));
            orbitState.desiredTarget.copy(fittedCenter);
            orbitState.target.copy(orbitState.desiredTarget);
            if(cameraFollow)cameraFollow.reset(fittedCenter);
            orbitState.desiredRadius = physics.viewRadius;
            orbitState.radius = orbitState.desiredRadius;
            updateCameraFromOrbit();
        }

        function step(dt, targets) {
            sceneSimulationTime+=Math.max(0,dt||0);
            if (productAssembly && productAssembly.update) productAssembly.update(dt, { motors: targets, servos: servoTargets }, actuatorEnvironment);
            if (rigidRobot) {
                rigidRobot.step(dt);
                state.x=robot.position.x; state.y=robot.position.y; state.z=robot.position.z;
                const angles=new THREE.Euler().setFromQuaternion(robot.quaternion,'YXZ');
                state.heading=angles.y;state.pitch=angles.x;state.roll=angles.z;
                if(rigidRobot.readVisualState)Object.assign(state,rigidRobot.readVisualState());
                else if(rigidRobot.readState)Object.assign(state,rigidRobot.readState());
                const velocity=rigidRobot.body.velocity;
                state.linearVelocity=Math.sqrt(velocity.x*velocity.x+velocity.z*velocity.z)/(rigidRobot.unitScale||1);
                state.angularVelocity=rigidRobot.body.angularVelocity.y;state.verticalVelocity=velocity.y/(rigidRobot.unitScale||1);
                return;
            }
            const wheelRadius = physics.wheelRadius;
            const trackWidth = physics.trackWidth;
            const maxWheelRps = 4.6;
            const motorResponse = 7.5;
            const rollingFriction = 1.9;
            const yawFriction = 2.2;

            const previousLinearVelocity = state.linearVelocity;
            const driven = targets.map(speed => clamp(speed, -100, 100) / 100 * maxWheelRps * Math.PI * 2);
            for (let i = 0; i < 4; i++) {
                const delta = driven[i] - state.wheelAngularVelocity[i];
                state.wheelAngularVelocity[i] += delta * (1 - Math.exp(-motorResponse * dt));
                if (Math.abs(targets[i]) < 1) state.wheelAngularVelocity[i] *= Math.exp(-rollingFriction * dt);
                state.wheelAngle[i] += state.wheelAngularVelocity[i] * dt;
                if (wheelVisuals[i] && wheelVisuals[i].baseQuaternion && wheelVisuals[i].axis) {
                    const spin = new THREE.Quaternion().setFromAxisAngle(wheelVisuals[i].axis, state.wheelAngle[i]);
                    wheelVisuals[i].wheel.quaternion.copy(wheelVisuals[i].baseQuaternion).multiply(spin);
                } else if (wheelVisuals[i]) {
                    wheelVisuals[i].wheel.rotation.x = state.wheelAngle[i];
                }
            }

            // A controller board can expose live motor outputs without being a
            // mobile robot. Keep its pose and orbit pivot completely fixed
            // until the assembly contains drive wheels on both sides.
            if (!physics.driveEnabled) {
                state.linearVelocity = 0;
                state.angularVelocity = 0;
                state.previousLinearVelocity = 0;
                state.verticalVelocity = 0;
                state.pitch = 0;
                state.roll = 0;
                state.pitchVelocity = 0;
                state.rollVelocity = 0;
                robot.position.set(state.x, physics.bodyHeight, state.z);
                robot.rotation.set(0, state.heading, 0);
                return;
            }

            const productDrive = productAssembly && productAssembly.productDrive;
            const leftWheel = productDrive ? productDrive.left : (state.wheelAngularVelocity[0] + state.wheelAngularVelocity[1]) * 0.5 * wheelRadius;
            const rightWheel = productDrive ? productDrive.right : (state.wheelAngularVelocity[2] + state.wheelAngularVelocity[3]) * 0.5 * wheelRadius;
            const targetLinear = physics.driveEnabled ? (leftWheel + rightWheel) * 0.5 : 0;
            const targetAngular = physics.driveEnabled ? (rightWheel - leftWheel) / Math.max(.02, trackWidth) : 0;

            if (productDrive && window.ProductDrive) window.ProductDrive.advance(state, productDrive, productAssembly.physics, dt);
            else {
                state.linearVelocity += (targetLinear - state.linearVelocity) * (1 - Math.exp(-5.6 * dt));
                state.angularVelocity += (targetAngular - state.angularVelocity) * (1 - Math.exp(-6.2 * dt));
                state.linearVelocity *= Math.exp(-0.18 * dt);
                state.angularVelocity *= Math.exp(-yawFriction * 0.08 * dt);
            }

            state.heading += state.angularVelocity * dt;
            const travelHeading = state.heading + (productDrive ? productDrive.forwardAngle || 0 : 0);
            state.x += Math.sin(travelHeading) * state.linearVelocity * dt;
            state.z += Math.cos(travelHeading) * state.linearVelocity * dt;

            const limit = 1.8;
            if (Math.abs(state.x) > limit) { state.x = clamp(state.x, -limit, limit); state.linearVelocity *= -0.28; }
            if (Math.abs(state.z) > limit) { state.z = clamp(state.z, -limit, limit); state.linearVelocity *= -0.28; }

            if (productDrive) {
                // Product joints use a planar, kinematic drive model. A rotated
                // wheel's transformed bounding box is not its contact surface:
                // its corners oscillate below the floor and falsely lift the
                // whole robot. Keep the authored ground height on this flat map.
                state.y = physics.bodyHeight;
                state.verticalVelocity = 0;
                state.pitch = state.roll = state.pitchVelocity = state.rollVelocity = 0;
                robot.position.set(state.x, state.y, state.z);
                robot.rotation.set(0, state.heading, 0, 'YXZ');
                robot.updateMatrixWorld(true);
                return;
            }

            const linearAcceleration = dt > 0 ? (state.linearVelocity - previousLinearVelocity) / dt : 0;
            const lateralAcceleration = state.linearVelocity * state.angularVelocity;
            const targetPitch = clamp(-linearAcceleration * 0.006, -0.035, 0.035);
            const targetRoll = clamp(lateralAcceleration * 0.035, -0.08, 0.08);
            const suspensionSpring = 10;
            const suspensionDamping = 12;
            state.pitchVelocity += (targetPitch - state.pitch) * suspensionSpring * dt;
            state.rollVelocity += (targetRoll - state.roll) * suspensionSpring * dt;
            state.pitchVelocity *= Math.exp(-suspensionDamping * dt);
            state.rollVelocity *= Math.exp(-suspensionDamping * dt);
            state.pitch += state.pitchVelocity * dt;
            state.roll += state.rollVelocity * dt;

            state.verticalVelocity -= 9.81 * dt;
            state.y += state.verticalVelocity * dt;
            if (state.y < physics.bodyHeight) {
                state.y = physics.bodyHeight;
                if (state.verticalVelocity < 0) state.verticalVelocity *= -0.12;
                if (Math.abs(state.verticalVelocity) < 0.03) state.verticalVelocity = 0;
            }

            robot.position.set(state.x, state.y, state.z);
            robot.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
            robot.updateMatrixWorld(true);
            robotContactBounds.setFromObject(robot);
            if (Number.isFinite(robotContactBounds.min.y) && robotContactBounds.min.y < physics.groundClearance) {
                const correction = physics.groundClearance - robotContactBounds.min.y;
                state.y += correction;
                robot.position.y = state.y;
                robot.updateMatrixWorld(true);
                if (state.verticalVelocity < 0) state.verticalVelocity *= -0.12;
                if (Math.abs(state.verticalVelocity) < 0.03) state.verticalVelocity = 0;
            }
        }

        function render(dt, targets, frameScale) {
            if(atomKnobControl)atomKnobControl.style.display=typeof boardId!=='undefined'&&boardId==='atom-vx'?'':'none';
            boardButtonElements.forEach(button=>{const hidden=typeof boardId==='undefined'||!['buildbot','atom-vx'].includes(boardId);if(button.hidden!==hidden)button.hidden=hidden;});
            resize();
            if(playback.active){
                const wasPlaying=playback.playing,previousAudioTime=lastPlaybackAudioTime;
                const trace=playback.advance(dt);
                applyPlaybackDisplay(trace?.display);
                if(!videoExport?.fast){
                const audio=trace?.audio;
                window.SimMechanicalAudio?.update(audio,wasPlaying);
                firmwareTone(wasPlaying?(audio?.tone?.frequency||0):0,wasPlaying?(audio?.tone?.duty||0):0);
                if(wasPlaying&&previousAudioTime!==null&&playback.time>=previousAudioTime&&playback.time-previousAudioTime<=dt*playback.speed+.02){
                    const events=[];
                    for(let i=playback.cache?.index??-1;i>=0&&playback.frames[i].t>previousAudioTime;i--)events.unshift(...(playback.frames[i].trace.audio?.impacts||[]));
                    window.SimMechanicalAudio?.impacts(events);
                }
                lastPlaybackAudioTime=playback.time;
                if(trace?.motion&&telemetryPanel){
                    const motion=trace.motion;
                    telemetryPanel.update({available:true,imu:motion,position:motion.position,speed:motion.speed,elapsed:motion.elapsed,motors:[]},performance.now(),false);
                }
                if(trace)traceSimBlock(trace.id,trace.calls,trace.step);
                }
                turnRing.visible=false;
                if(cameraFollow)cameraFollow.update(playbackAnchor.position,dt);
                updateCameraFromOrbit(frameScale);
                updateSensorLights();
                viewportStyle.render(camera, viewportModel, renderWidth, renderHeight);
                if(!videoExport?.fast)updatePlaybackUI();
                return;
            }
            // Inspect the authored pose until Run. Camera interaction and
            // device rendering must not advance the solver or joint motion.
            const placing=orbitState.isDragging&&(orbitState.dragMode==='robot'||orbitState.dragMode==='robot-turn');
            if (simulationStarted) step(dt, targets);
            else if (productAssembly && productAssembly.update) productAssembly.update(0, { motors: targets, servos: servoTargets }, actuatorEnvironment);
            const wall=performance.now(),simTime=rigidRobot&&rigidRobot.world.time;
            if(!simulationStarted||!Number.isFinite(simTime))timingBaseline=null;
            else if(!timingBaseline||simTime<timingBaseline.sim)timingBaseline={wall,sim:simTime};
            else if(wall-timingBaseline.wall>=1000){
                const ratio=(simTime-timingBaseline.sim)*1000/(wall-timingBaseline.wall);
                timingBaseline={wall,sim:simTime};
                if(performanceRecorder)performanceRecorder.sample({wallMs:wall,run:generation,phase:monitorPhase,ratio,simTime,
                    physics:rigidRobot.workerPerformance?rigidRobot.workerPerformance():null,
                    python:pythonRuntime.readPerformance(),
                    heapBytes:performance.memory?performance.memory.usedJSHeapSize:null,
                    viewport:{width:canvas.width,height:canvas.height},visibility:document.visibilityState});
                if(ratio<.75&&wall-lastSlowReport>=5000&&rigidRobot.workerPerformance){
                    const timing=rigidRobot.workerPerformance();
                    if(timing){
                        lastSlowReport=wall;
                        slowdownReports.push({generation,ratio,simTime,...timing});if(slowdownReports.length>20)slowdownReports.shift();
                    }
                }
            }
            if(cameraFollow&&!placing&&(rigidRobot||productAssembly))cameraFollow.update(followAnchor.set(state.x,state.y,state.z).add(physics.viewOffset),dt);
            if (telemetryPanel && telemetrySampler) {
                const sample=telemetrySampler.update(rigidRobot,simulationStarted?dt:0,productAssembly&&productAssembly.productDrive?productAssembly.productDrive.forwardAngle||0:0);
                window.SimMechanicalAudio?.update(sample, simulationStarted && !['Stopped','Ready','Error'].includes(monitorPhase));
                if(rigidRobot?.drainImpacts){const impacts=rigidRobot.drainImpacts();window.SimMechanicalAudio?.impacts(impacts);if(playback.recording)pendingPlaybackImpacts.push(...impacts);}
                recordedAudio={available:!!sample.available,motors:(sample.motors||[]).map(m=>({rpm:m.rpm})),servos:(sample.servos||[]).map(m=>({rpm:m.rpm}))};
                sample.imu.yaw=displayYaw();
                telemetryPanel.update(sample,performance.now(),simulationStarted);
                recordedMotion=sample.available?{roll:sample.imu.roll,pitch:sample.imu.pitch,yaw:sample.imu.yaw,gyro:sample.imu.gyro?{...sample.imu.gyro}:null,accel:sample.imu.accel?{...sample.imu.accel}:null,position:sample.position?{...sample.position}:null,speed:sample.speed,elapsed:sample.elapsed,rate:telemetryPanel.getRate()}:null;
            }
            if (boardController) boardController.setMotors(targets);
            updateTurnRing();
            updateCameraFromOrbit(frameScale);
            // Paint every frame; simulation load must not impose a 30 FPS cap.
            capturePlayback();
            updateSensorLights();
                viewportStyle.render(camera, viewportModel, renderWidth, renderHeight);
        }

        function applyDisplay(command) {
            displayCommands.push(command);
            if (boardController) boardController.applyDisplay(command);
        }

        function clearDisplay() {
            displayCommands.length = 0;
            if (boardController) boardController.applyDisplay({ type: 'fill', color: '#000000' });
        }

        function dispose() {
            ringLine.geometry.dispose();ringTexture.dispose();ringMaterial.dispose();ringPick.geometry.dispose();ringPick.material.dispose();angleTexture.dispose();angleMaterial.dispose();
            clearRobot();
            if (fieldMap) fieldMap.dispose();
            if (fieldCans) fieldCans.dispose();
            sensorLightTexture?.dispose();sensorLightGeometry?.dispose();
            viewportStyle.dispose();
            renderer.dispose();
        }

        resize();
        updateCameraFromOrbit();
        renderer.render(scene, camera);
        function readSensor(port, kind, pulse) {
            if(rigidRobot&&rigidRobot.syncLatestPhysicsState)rigidRobot.syncLatestPhysicsState();
            if(kind==='encoder'&&rigidRobot?.readJointAngle)pulse={...pulse,encoderAngle:(runtime,id)=>rigidRobot.readJointAngle(runtime,id)};
            if(boardId==='buildbot' && kind==='digital' && Object.prototype.hasOwnProperty.call(boardButtons,port))return !boardButtons[port];
            if(boardId==='atom-vx'&&port==='ATOM_KNOB'&&kind==='analog')return atomKnob;
            if(boardId==='atom-vx' && kind==='digital'){
                if(port==='ATOM_BUTTON_A')return !boardButtons.IO44;
                if(port==='IO0')return !boardButtons.IO43;
            }
            if (!productAssembly || !productAssembly.readSensor) throw new Error('Add a product with a connected sensor to Assembly.');
            const sample=()=>{
                productAssembly.sampleSensors(kind==='analog'?analogEnvironment:kind==='distance'?distanceEnvironment:sensorEnvironment);
                return productAssembly.readSensor(port, kind, pulse);
            };
            if(kind==='analog'&&rigidRobot&&rigidRobot.sensorMatrixWorld)return sample();
            return rigidRobot && rigidRobot.withLatestPhysicsPose ? rigidRobot.withLatestPhysicsPose(sample) : sample();
        }
        function readSensorRow(allChannels=false) {
            if(rigidRobot&&rigidRobot.syncLatestPhysicsState)rigidRobot.syncLatestPhysicsState();
            if (!productAssembly || !productAssembly.readSensor) throw new Error('Add a product with a connected sensor to Assembly.');
            // Sample the latest physical transforms without moving/restoring
            // the entire render hierarchy for each firmware ADC scan.
            const sample=()=>{
                productAssembly.sampleSensors(analogEnvironment);
                return Array.from({length:allChannels?10:8}, (_, i) => {
                    try{return productAssembly.readSensor('ADC' + i, 'analog');}
                    catch(error){if(i<8)throw error;return {error:error.message};}
                });
            };
            if(rigidRobot&&rigidRobot.sensorMatrixWorld)return sample();
            return rigidRobot && rigidRobot.withLatestPhysicsPose ? rigidRobot.withLatestPhysicsPose(sample) : sample();
        }
        function readDistanceSensors() {
            if(rigidRobot&&rigidRobot.syncLatestPhysicsState)rigidRobot.syncLatestPhysicsState();
            if(!productAssembly||!productAssembly.readDistanceSensors)return [];
            const sample=()=>{
                productAssembly.sampleSensors(distanceEnvironment);
                return productAssembly.readDistanceSensors();
            };
            return rigidRobot&&rigidRobot.withLatestPhysicsPose?rigidRobot.withLatestPhysicsPose(sample):sample();
        }
        function readSensorPreview() {
            if(!productAssembly||!productAssembly.sampleSensors)return {analog:[],distances:[]};
            // The HUD describes the displayed robot pose. It must not swap the
            // entire scene to a solver pose and back on every visual refresh.
            // Firmware reads above still sample the latest physical pose.
            productAssembly.sampleSensors(sensorEnvironment);
            const analog=Array.from({length:10},(_,i)=>{
                try{return productAssembly.readSensor('ADC'+i,'analog');}catch(error){return null;}
            });
            return {analog,distances:productAssembly.readDistanceSensors()};
        }
        function displayYaw() {
            const raw=((readImu('yaw')%360)+360)%360;
            let adjusted=raw-imuDisplayOffsets[2];
            if(adjusted>360)adjusted-=360;else if(adjusted<0)adjusted+=360;
            return adjusted;
        }
        function readImu(axis) {
            if(rigidRobot&&rigidRobot.syncLatestPhysicsState)rigidRobot.syncLatestPhysicsState();
            // Control loops need the current physical orientation, not the
            // delayed pose used to interpolate smooth viewport animation.
            const pose = simulationStarted && rigidRobot && rigidRobot.readState ? rigidRobot.readState() : state;
            const angle = pose[axis === 'yaw' ? 'heading' : axis] * 180 / Math.PI;
            // Build BOT firmware uses clockwise-positive yaw. Three.js uses
            // the opposite sign around its upward Y axis.
            return axis === 'yaw' ? -angle : angle;
        }
        function refreshActuators() {
            // Deliver PWM/servo changes to the next physical substep instead
            // of holding the previous command until the next display frame.
            if (productAssembly && productAssembly.update) productAssembly.update(0, { motors: motorTargets, servos: servoTargets }, actuatorEnvironment);
            if (simulationStarted && rigidRobot && rigidRobot.refreshCommands) rigidRobot.refreshCommands();
        }
        function driveTargets(left, right) { return productAssembly && productAssembly.driveTargets ? productAssembly.driveTargets(left, right) : null; }
        function openControlChannel(reply,initialMotors,onMotors){
            if(!simulationStarted||!rigidRobot||!rigidRobot.openControlChannel||!productAssembly||!productAssembly.controlBindings)return null;
            if(rigidRobot.syncLatestPhysicsState)rigidRobot.syncLatestPhysicsState();
            const config=rigidRobot.controlDescriptor(productAssembly.controlBindings(),distanceEnvironment.obstacles);
            config.field=fieldMap?fieldMap.controlSnapshot():{floorY:0,rods:[]};
            try{const left=productAssembly.driveTargets(1,0),right=productAssembly.driveTargets(0,1);if(left&&right)config.drive={left,right};}catch(error){config.driveError=error.message;}
            return rigidRobot.openControlChannel(config,reply,initialMotors,onMotors);
        }
        function readSimulationTime() {
            if(rigidRobot&&rigidRobot.syncLatestPhysicsState)rigidRobot.syncLatestPhysicsState();
            if(!simulationStarted)return undefined;
            // Use completed integration, including local physics fallback.
            // Non-assembly scenes advance only when their scene is stepped.
            return rigidRobot && typeof rigidRobot.workerState === 'function' ? rigidRobot.world.time : sceneSimulationTime;
        }
        let displaySnapshot=null,displayVersion='',displayTextures=[],lastPlaybackDisplay=null,savedLiveDisplay=null;
        function displayCanvas(){return boardController?.getDisplayCanvas?.();}
        function findDisplayTextures(){
            const canvas=displayCanvas(),textures=new Set();
            robot.traverse(node=>{for(const material of Array.isArray(node.material)?node.material:[node.material]){
                if(!material)continue;for(const value of Object.values(material))if(value?.isTexture&&value.image===canvas)textures.add(value);
            }});
            displayTextures=[...textures];
        }
        function captureDisplay(){
            const canvas=displayCanvas();if(!canvas)return null;
            const version=displayTextures.map(t=>t.version).join(',');
            if(!displaySnapshot||version!==displayVersion){
                const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
                if(!displaySnapshot||displaySnapshot.data.length!==pixels.data.length||pixels.data.some((v,i)=>v!==displaySnapshot.data[i]))displaySnapshot=pixels;
                displayVersion=version;
            }
            return displaySnapshot;
        }
        function applyPlaybackDisplay(snapshot){
            const canvas=displayCanvas();if(!canvas||!snapshot||lastPlaybackDisplay===snapshot)return;
            const context=canvas.getContext('2d');
            if(!savedLiveDisplay)savedLiveDisplay=context.getImageData(0,0,canvas.width,canvas.height);
            context.putImageData(snapshot,0,0);displayTextures.forEach(t=>t.needsUpdate=true);lastPlaybackDisplay=snapshot;
        }
        function restorePlaybackDisplay(){
            const canvas=displayCanvas();if(savedLiveDisplay&&canvas){canvas.getContext('2d').putImageData(savedLiveDisplay,0,0);displayTextures.forEach(t=>t.needsUpdate=true);}
            savedLiveDisplay=null;lastPlaybackDisplay=null;
        }
        const playbackAnchor=new THREE.Object3D();
        let recordedMotion=null,recordedAudio=null,pendingPlaybackImpacts=[];
        function capturePlayback(force=false){
            if(!playback.recording)return;
            playbackAnchor.position.set(state.x,state.y,state.z).add(physics.viewOffset);
            if(playback.capture(rigidRobot?rigidRobot.world.time:sceneSimulationTime,{id:pendingHighlight,calls:pendingCalls,motion:recordedMotion,step:customStep,display:captureDisplay(),audio:{...recordedAudio,tone:{...recordedTone},impacts:pendingPlaybackImpacts.slice(0,64)}},force))pendingPlaybackImpacts=[];
            if(playbackButton)playbackButton.disabled=!!videoExport||!playback.frames.length;
        }
        function startPlaybackRecording(){
            displaySnapshot=null;displayVersion='';savedLiveDisplay=null;lastPlaybackDisplay=null;findDisplayTextures();
            recordedAudio=null;pendingPlaybackImpacts=[];lastPlaybackAudioTime=null;
            const nodes=[playbackAnchor];robot.traverse(n=>nodes.push(n));if(fieldCans)fieldCans.group.traverse(n=>nodes.push(n));
            playback.start(nodes,rigidRobot?rigidRobot.world.time:sceneSimulationTime,rigidRobot?.playbackParents?.()||[]);
            capturePlayback(true);
        }
        return { restorePlaybackDisplay, saveCameraView, restoreCameraView, settleCameraView, cameraInfo:()=>({projection:camera.type,direction:camera.getWorldDirection(new THREE.Vector3()).toArray()}), capturePlayback, startPlaybackRecording, getDisplayCanvas:()=>boardController&&boardController.getDisplayCanvas?boardController.getDisplayCanvas():null, openControlChannel, saveDefaultPosition, alignHeading, readPerformance:()=>rigidRobot&&rigidRobot.workerPerformance?rigidRobot.workerPerformance():null, render, reset, startSimulation, dispose, clearProjectScene, state, orbitState, isOrbitSettled, reloadRobotModel, waitForModel, applyDisplay, clearDisplay, readSensor, readSensorRow, readDistanceSensors, readSensorPreview, readImu, readSimulationTime, refreshActuators, driveTargets, setCameraFollow, setCameraView, viewField, hasField:()=>!!fieldMap, isCameraFollowing:()=>!!cameraFollow&&cameraFollow.enabled, isPhysicsActive:()=>simulationStarted && !!rigidRobot && rigidRobot.isActive() };
    }

    let scene3d;
    try {
        scene3d = createSimulator3D();
    } catch (error) {
        status.textContent = 'Could not start Three.js: ' + error.message;
    }

    window.addEventListener('storage', event => {
        if (scene3d && (event.key === ASSEMBLY_REVISION_KEY || event.key === 'ptbot_selected_board_id')) { stop(); scene3d.reloadRobotModel(); }
    });
    window.addEventListener('robot-project-reset', () => { if(scene3d){stop();scene3d.clearProjectScene();} });
    window.addEventListener('robot-assembly-change', () => { if (scene3d) { stop(); scene3d.reloadRobotModel(); } });
    window.addEventListener('atom-vx-display-update', redraw);
    window.addEventListener('atom-vx-artwork-update', redraw);

    function setCanvasLabel() {
        const speedText = motorTargets.map((speed, i) => `M${i + 1}: ${Math.round(speed)}%`).join(', ');
        const state = scene3d ? `, x:${scene3d.state.x.toFixed(2)}, z:${scene3d.state.z.toFixed(2)}, heading:${Math.round(scene3d.state.heading * 180 / Math.PI)}deg, view:${Math.round(scene3d.orbitState.theta * 180 / Math.PI)}deg, zoom:${scene3d.orbitState.radius.toFixed(2)}` : '';
        const label=speedText+state;
        if(canvas.getAttribute('aria-label')!==label)canvas.setAttribute('aria-label',label);
    }

    function draw(now) {
        const renderStarted=performance.now();
        frame = 0;
        const elapsed = last ? now - last : 1000 / 60;
        const dt = last ? Math.min(elapsed / 1000, 0.05) : 0;
        last = now;
        const frameScale = Math.min(elapsed / (1000 / 60), 3);
        if(videoExport?.fast)return;
        if (scene3d) scene3d.render(dt, motorTargets, frameScale);
        const running=String(run.disabled||motorTargets.some(Boolean));
        if(controlToolbar&&controlToolbar.dataset.running!==running)controlToolbar.dataset.running=running;
        setCanvasLabel();
        if(performanceRecorder)performanceRecorder.frame(elapsed,performance.now()-renderStarted);
        if (playback.playing || playback.recording || motorTargets.some(Boolean) || (!playback.active && (scene3d && (scene3d.isPhysicsActive() || scene3d.orbitState.isDragging || !scene3d.isOrbitSettled() || Math.abs(scene3d.state.linearVelocity) > 0.002 || Math.abs(scene3d.state.angularVelocity) > 0.002))) || (playback.active && scene3d && (scene3d.orbitState.isDragging || !scene3d.isOrbitSettled()))) {
            frame = requestSimFrame();
        }
    }

    function redraw() {
        if (!frame) {
            last = 0;
            frame = requestSimFrame();
        }
    }

    let highlightFrame=null,pendingHighlight=null,pendingCalls=[],highlightedBlockRoots=new Set(),followFrame=null;
    let blockFollowEnabled=window.localStorage?.getItem('sim-follow-running-block')!=='0';
    let highlightWorkspace=null,followViewport=null,followingScroll=false;
    const highlightVisibilityChanged=event=>{
        if(!pendingHighlight)return;
        if(event.type==='change'&&event.element==='collapsed')highlightSimBlock(pendingHighlight,pendingCalls);
        if(event.type!=='viewport_change'||!blockFollowEnabled||followingScroll||!highlightWorkspace||highlightWorkspace.isDragging())return;
        const workspace=highlightWorkspace;
        // Blockly dispatches scroll events asynchronously too. Ignore our own
        // viewport, but retarget after user scrolling or any zoom change.
        if(followViewport&&followViewport.x===workspace.scrollX&&followViewport.y===workspace.scrollY&&followViewport.scale===workspace.scale)return;
        highlightSimBlock(pendingHighlight,pendingCalls);
    };
    function visibleSimBlock(block){
        if(!block||/^procedures_def/.test(block.type)||!block.getSvgRoot||!block.getSvgRoot())return false;
        for(let parent=block.getSurroundParent&&block.getSurroundParent();parent;parent=parent.getSurroundParent())if(parent.isCollapsed&&parent.isCollapsed())return false;
        for(let node=block.getSvgRoot();node;node=node.parentNode)if(node.style&&node.style.display==='none'||node.getAttribute&&node.getAttribute('display')==='none')return false;
        return true;
    }
    function followSimBlock(workspace,block){
        if(!blockFollowEnabled||!block||!workspace.isMovable()||workspace.isDragging())return;
        const metrics=workspace.getMetrics(),position=block.getRelativeToSurfaceXY(),scale=workspace.scale;
        if(!metrics||metrics.viewWidth<80||metrics.viewHeight<80)return;
        const x=position.x*scale-(workspace.RTL?block.width*scale:0),y=position.y*scale;
        const width=block.width*scale,height=block.height*scale;
        if(followFrame!==null)cancelAnimationFrame(followFrame);
        const startX=workspace.scrollX,startY=workspace.scrollY,targetX=-(x+width/2-metrics.viewWidth/2),targetY=-(y+height/2-metrics.viewHeight/2),started=performance.now();
        if(Math.abs(targetX-startX)<1&&Math.abs(targetY-startY)<1){
            followFrame=null;
            followViewport={x:workspace.scrollX,y:workspace.scrollY,scale:workspace.scale};
            return;
        }
        const step=()=>{
            followFrame=null;if(!blockFollowEnabled||!pendingHighlight||workspace.isDragging()||!workspace.getBlockById(block.id))return;
            const t=Math.min(1,(performance.now()-started)/220),ease=1-Math.pow(1-t,3);
            followingScroll=true;
            try{
                workspace.scroll(startX+(targetX-startX)*ease,startY+(targetY-startY)*ease);
                followViewport={x:workspace.scrollX,y:workspace.scrollY,scale:workspace.scale};
            }finally{followingScroll=false;}
            if(t<1)followFrame=requestAnimationFrame(step);
        };
        followFrame=requestAnimationFrame(step);
    }
    function highlightSimBlock(id,calls=[]){
        if(followFrame!==null){cancelAnimationFrame(followFrame);followFrame=null;}
        pendingHighlight=id;pendingCalls=id?calls.slice():[];
        const nextWorkspace=id?window.blocklyWorkspace:null;
        if(nextWorkspace!==highlightWorkspace){
            if(highlightWorkspace&&highlightWorkspace.removeChangeListener)highlightWorkspace.removeChangeListener(highlightVisibilityChanged);
            highlightWorkspace=nextWorkspace;
            followViewport=null;
            if(highlightWorkspace&&highlightWorkspace.addChangeListener)highlightWorkspace.addChangeListener(highlightVisibilityChanged);
        }
        const paint=()=>{
            highlightFrame=null;
            const workspace=window.blocklyWorkspace;
            const active=workspace&&pendingHighlight?[...pendingCalls,pendingHighlight].map(key=>workspace.getBlockById(key)).filter(visibleSimBlock):[];
            // Retain all visible call-site outlines. Follow the deepest visible
            // command, falling back outward when its definition is collapsed.
            const block=active.length?active[active.length-1]:null;
            const nextRoots=new Set();
            const add=b=>{if(b&&b.getSvgRoot&&b.getSvgRoot())nextRoots.add(b.getSvgRoot());};
            active.forEach(add);
            for(const root of highlightedBlockRoots)if(!nextRoots.has(root))root.classList.remove('sim-executing-block');
            for(const root of nextRoots)if(!highlightedBlockRoots.has(root))root.classList.add('sim-executing-block');
            highlightedBlockRoots=nextRoots;
            if(workspace&&block)followSimBlock(workspace,block);
        };
        if(!id){if(highlightFrame!==null)cancelAnimationFrame(highlightFrame);if(followFrame!==null)cancelAnimationFrame(followFrame);followFrame=null;paint();}
        else if(highlightFrame===null)highlightFrame=requestAnimationFrame(paint);
    }
    window.addEventListener('sim-block-follow-change',event=>{
        blockFollowEnabled=!!event.detail.enabled;
        if(followFrame!==null){cancelAnimationFrame(followFrame);followFrame=null;}
        if(blockFollowEnabled&&pendingHighlight)highlightSimBlock(pendingHighlight,pendingCalls);
    });
    const runtime = new MotorSim.MotorRuntime(values => {
        motorTargets = values.slice(0, 4);
        if (scene3d) scene3d.refreshActuators();
        redraw();
    }, log, command => {
        if (scene3d) scene3d.applyDisplay(command);
        redraw();
    }, {
        onHighlight:traceSimBlock,
        onServo(port, degrees) { servoTargets[port] = degrees; if (scene3d) scene3d.refreshActuators(); redraw(); },
        onSensor(port, kind) { if (!scene3d) throw new Error('Robot SIM is not ready.'); return scene3d.readSensor(port, kind); },
        driveTargets(left, right) { return scene3d && scene3d.driveTargets(left, right); },
        simulationTime: () => scene3d ? scene3d.readSimulationTime() : undefined
    });

    let firmwareAudio = null, firmwareOscillator = null, firmwareGain = null, firmwareToneMinEnd=0;
    function firmwareTone(frequency, duty, duration=0) {
        if(!playback.active)recordedTone={frequency,duty};
        if (!duty) {
            if (firmwareOscillator) {
                // Keep the graph connected until the audio thread has rendered
                // the requested short pulse, even if SIM catches up in a burst.
                const oscillator=firmwareOscillator,gain=firmwareGain;
                oscillator.onended=()=>{oscillator.disconnect();gain?.disconnect();};
                oscillator.stop(Math.max(firmwareAudio.currentTime,firmwareToneMinEnd));
                firmwareOscillator=null;firmwareGain=null;firmwareToneMinEnd=0;
            }
            return;
        }
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        const shared=window.SimMechanicalAudio?.getOutput();
        if (!firmwareAudio) firmwareAudio = shared?.context||new Audio();
        if(firmwareAudio.state==='suspended')firmwareAudio.resume().catch(()=>{});
        if (!firmwareOscillator) {
            firmwareOscillator = firmwareAudio.createOscillator(); firmwareOscillator.type = 'square';
            firmwareGain = firmwareAudio.createGain(); firmwareGain.gain.value = 0.025;
            firmwareOscillator.connect(firmwareGain); firmwareGain.connect(shared?.context===firmwareAudio?shared.node:firmwareAudio.destination); firmwareOscillator.start();
        }
        const now=firmwareAudio.currentTime,pulseSeconds=Math.max(0,Number(duration)||0);
        firmwareToneMinEnd=now+pulseSeconds;
        // The audio thread ends finite pulses even if the renderer is busy
        // drawing LCD updates or waiting for the next firmware message.
        firmwareGain.gain.cancelScheduledValues(now);
        firmwareGain.gain.setValueAtTime(0.025,now);
        if(pulseSeconds>0)firmwareGain.gain.setValueAtTime(0,firmwareToneMinEnd);
        firmwareOscillator.frequency.value = frequency;
    }
    const pythonRuntime = new SimPythonRuntime.Runtime({
        highlight:traceSimBlock,
        openControlChannel: (reply,values,onMotors) => scene3d && scene3d.openControlChannel(reply,values,onMotors),
        getMotors: () => runtime.speeds,
        simulationTime: () => scene3d ? scene3d.readSimulationTime() : undefined,
        motors: values => runtime.setSpeeds(values),
        driveTargets: (left, right) => scene3d && scene3d.driveTargets(left, right),
        servo(port, degrees) { servoTargets[port] = degrees; if (scene3d) scene3d.refreshActuators(); redraw(); },
        sensor(port, kind, pulse) { if (!scene3d) throw new Error('Robot SIM is not ready.'); return scene3d.readSensor(port, kind, pulse); },
        sensorRow() { if (!scene3d) throw new Error('Robot SIM is not ready.'); return scene3d.readSensorRow(); },
        sensorScan() { if (!scene3d) throw new Error('Robot SIM is not ready.'); return scene3d.readSensorRow(true); },
        display(command) { if (scene3d) scene3d.applyDisplay(command); redraw(); },
        imuDisplayOffsets(values) { if(Array.isArray(values)&&values.length===3&&values.every(Number.isFinite)){imuDisplayOffsets=values.slice();redraw();} },
        imu(axis) { if (!scene3d) throw new Error('Robot SIM is not ready.'); return scene3d.readImu(axis); },
        tone: firmwareTone,
        progress(text) { status.textContent = text; },
        preferences(request){return SimPreferences.request(localStorage,boardId,request);},
        getNvm() {
            const source = typeof vFSTree !== 'undefined' && vFSTree['sim-'+boardId+'-nvm.json'];
            const size=boardId==='atom-vx'?4096:512;
            if (!source) return Array(size).fill(0);
            const data = JSON.parse(source);
            if (!Array.isArray(data) || data.length !== size || data.some(v => !Number.isInteger(v) || v < 0 || v > 255)) throw new Error('Invalid saved board calibration memory.');
            return data;
        },
        setNvm(data) {
            if (typeof vFSTree === 'undefined') throw new Error('Project files are not ready for calibration.');
            vFSTree['sim-'+boardId+'-nvm.json'] = JSON.stringify(data);
        },
        print: log
    });

    function cancelVideoExport(restore=true){
        if(!videoExport)return;
        const job=videoExport;job.cancelled=true;videoMenu.querySelector('[data-export-status]').textContent='Export cancelled';job.recorder?.stop(true);job.finish(restore);
    }
    async function downloadPlaybackVideo(){
        if(videoExport||!playback.active||playback.duration<=0)return;
        const saved={time:playback.time,speed:playback.speed,playing:playback.playing,view:scene3d.saveCameraView()};
        const job={cancelled:false,cleaned:false};videoExport=job;
        const label=videoMenu.querySelector('[data-export-status]'),progress=videoMenu.querySelector('progress');
        const controls=[...controlToolbar.querySelectorAll('button'),...playbackPanel.querySelectorAll('button,input,select')].filter(n=>!n.matches('[data-cancel]'));
        const disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
        videoMenu.querySelector('[data-cancel]').textContent='Cancel';progress.hidden=false;progress.value=0;
        job.finish=restore=>{
            if(job.cleaned)return;job.cleaned=true;clearInterval(job.timer);
            if(videoExport===job)videoExport=null;
            job.audio?.release();window.SimMechanicalAudio?.silence();window.SimMechanicalAudio?.stopImpacts();firmwareTone(0,0);lastPlaybackAudioTime=null;
            controls.forEach((n,i)=>n.disabled=disabled[i]);
            videoMenu.querySelector('[data-cancel]').textContent='Close';progress.hidden=true;
            if(restore&&playback.active){playback.seek(saved.time);playback.speed=saved.speed;playback.playing=saved.playing;scene3d.restoreCameraView(saved.view);}
            updatePlaybackUI();redraw();
        };
        try{
            job.fast=true;label.textContent='Preparing video...';playback.playing=false;playback.speed=1;playback.seek(0);
            const view=videoMenu.querySelector('[data-view]').value;
            if(view!=='current')scene3d.setCameraView(view);
            scene3d.settleCameraView();scene3d.render(0,motorTargets,1);
            job.fast=true;window.SimMechanicalAudio?.silence();window.SimMechanicalAudio?.stopImpacts();
            const result=await SimPlaybackVideo.fast({canvas,duration:playback.duration,frames:playback.frames,
                cancelled:()=>job.cancelled,
                render:(time,dt)=>{playback.seek(time);scene3d.render(dt,motorTargets,1);},
                onProgress:(value,stage)=>{if(job.cancelled)return;progress.value=value;label.textContent=stage+' '+Math.round(value*100)+'%';}
            });
            if(result&&!job.cancelled){
                const url=URL.createObjectURL(result.blob),link=canvas.ownerDocument.createElement('a');
                link.href=url;link.download='roboBlocks-playback-'+view+'-'+Date.now()+'.'+result.extension;
                link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
                label.textContent='Video downloaded';
            }else label.textContent='Export cancelled';
        }catch(error){if(!job.cancelled)label.textContent=error.message;}
        finally{job.finish(true);}
    }
    function traceSimBlock(id,calls=[],step=null){
        customStep=id?step:null;

        if(id!==pendingHighlight||JSON.stringify(calls)!==JSON.stringify(pendingCalls))highlightSimBlock(id,calls);
    }
    function updatePlaybackUI(){
        if(!playbackPanel)return;
        playbackPanel.hidden=!playback.active;
        playbackPanel.parentElement.classList.toggle('has-sim-playback',playback.active);
        playbackButton.disabled=!!videoExport||!playback.frames.length;
        playbackButton.setAttribute('aria-pressed',String(playback.active));
        if(!playback.active)return;
        playbackSlider.max=String(playback.duration);playbackSlider.value=String(playback.time);
        const format=t=>Math.floor(t/60)+':'+(t%60).toFixed(1).padStart(4,'0');
        playbackTime.textContent=format(playback.time)+' / '+format(playback.duration);
        playbackPlay.setAttribute('aria-label',playback.playing?'Pause playback':'Play playback');
        playbackPlay.setAttribute('data-playing',String(playback.playing));
        playbackSlider.style.setProperty('--playback-progress',(playback.duration?playback.time/playback.duration*100:0)+'%');
        const block=window.blocklyWorkspace?.getBlockById(pendingHighlight);
            playbackDetail.textContent=(customStep?customStep.function+' :'+customStep.line+'  '+customStep.command:block?block.toString(90,'').replace(/\bundefined\b/g,'').trim():'Recorded SIM')+(playback.limited?' · Showing latest recorded segment':'');
        playbackDetail.title=playbackDetail.textContent;
    }
    function closePlayback(){
        if(!playback.active)return;
        cancelVideoExport(false);
        if(videoMenu)videoMenu.hidden=true;
        window.SimMechanicalAudio?.silence();window.SimMechanicalAudio?.stopImpacts();firmwareTone(0,0);lastPlaybackAudioTime=null;
        playback.close();scene3d?.restorePlaybackDisplay();traceSimBlock(null);
        const telemetry=telemetryHost;if(telemetry)telemetry.hidden=playbackTelemetryHidden;
        updatePlaybackUI();redraw();
    }
    function clearPlayback(){
        closePlayback();playback.clear();
        if(playbackButton)playbackButton.disabled=true;
        if(playbackPanel)playbackPanel.hidden=true;
    }
    if(playbackButton){
        playbackPanel=document.createElement('section');playbackPanel.className='sim-playback-panel';playbackPanel.hidden=true;
        playbackPanel.setAttribute('aria-label','Simulation playback');
        playbackPanel.innerHTML='<div class="sim-playback-controls"><button type="button" data-play aria-label="Play playback"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="play-symbol" d="m8 5 11 7-11 7Z"/><path class="pause-symbol" d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg></button><input type="range" min="0" max="0" step="0.01" value="0" aria-label="Playback time"><output></output><select aria-label="Playback speed"><option value="0.25">0.25&times;</option><option value="0.5">0.5&times;</option><option value="1" selected>1&times;</option><option value="2">2&times;</option><option value="4">4&times;</option></select><button type="button" data-download aria-label="Download playback video" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg></button><button type="button" data-close aria-label="Close playback"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button></div><div class="sim-playback-caption"><span data-detail></span></div>';
        canvas.parentNode.appendChild(playbackPanel);
        playbackSlider=playbackPanel.querySelector('input');playbackTime=playbackPanel.querySelector('output');playbackPlay=playbackPanel.querySelector('[data-play]');playbackDetail=playbackPanel.querySelector('[data-detail]');
        videoMenu=document.createElement('div');videoMenu.className='sim-video-menu';videoMenu.hidden=true;
        videoMenu.innerHTML='<strong>Download video</strong><label>Camera view<select data-view><option value="current">Current view</option><option value="perspective">Perspective</option><option value="top">Top</option><option value="front">Front</option><option value="back">Back</option><option value="left">Left</option><option value="right">Right</option><option value="field">Full field</option></select></label><small>1080p / 60 FPS with SIM audio. Accelerated export.</small><progress value="0" max="1" hidden></progress><span data-export-status></span><div><button type="button" data-export>Download</button><button type="button" data-cancel>Close</button></div>';
        playbackPanel.appendChild(videoMenu);
        playbackPanel.querySelector('[data-download]').onclick=()=>{videoMenu.hidden=!videoMenu.hidden;playbackPanel.querySelector('[data-download]').setAttribute('aria-expanded',String(!videoMenu.hidden));};
        videoMenu.querySelector('[data-cancel]').onclick=()=>{if(videoExport)cancelVideoExport();else{videoMenu.hidden=true;playbackPanel.querySelector('[data-download]').setAttribute('aria-expanded','false');}};
        videoMenu.querySelector('[data-export]').onclick=downloadPlaybackVideo;
        playbackPanel.querySelector('[data-close]').onclick=closePlayback;
        playbackPanel.querySelector('select').onchange=event=>{playback.speed=Number(event.target.value);};
        playbackSlider.oninput=()=>{playback.playing=false;playback.seek(Number(playbackSlider.value));redraw();};
        playbackPlay.onclick=()=>{window.SimMechanicalAudio?.unlock();if(playback.time>=playback.duration)playback.seek(0);playback.playing=!playback.playing;updatePlaybackUI();redraw();};
        playbackButton.onclick=()=>{
            if(playback.active){closePlayback();return;}
            stop();
            if(!playback.open())return;
            playback.speed=Number(playbackPanel.querySelector('select').value);
            const telemetry=telemetryHost;if(telemetry){playbackTelemetryHidden=telemetry.hidden;telemetry.hidden=true;}
            updatePlaybackUI();redraw();
        };
    }
    function stop(resetPose = false) {
        const savedView=resetPose&&scene3d?scene3d.saveCameraView():null;
        cancelVideoExport(false);
        if(playback.active)closePlayback();
        if(scene3d)scene3d.capturePlayback(true);
        playback.finish();
        window.SimMechanicalAudio?.silence();
        readMonitor();monitorPhase=resetPose?'Ready':'Stopped';if(resetPose)monitorElapsed=0;
        generation++;status.hidden=true;
        pythonRuntime.stop();
        firmwareTone(0, 0);
        runtime.stop();
        motorTargets = [0, 0, 0, 0];
        run.disabled = false;
        status.textContent = 'Motors stopped.';
        if (scene3d) scene3d.clearDisplay();
        if (resetPose) { servoTargets = {}; if (scene3d) scene3d.reset(); }
        if(savedView)scene3d.restoreCameraView(savedView);
        redraw();
    }

    window.motorSimulation = { stop, reset: () => stop(true), reloadBoard: () => { stop(); return scene3d && scene3d.reloadRobotModel(); },
        captureExampleImage:()=>{
            if(!scene3d||videoExport)throw Error('Wait for the SIM scene to be ready.');
            scene3d.render(0,motorTargets,1);
            const image=document.createElement('canvas');image.width=640;image.height=360;
            const context=image.getContext('2d');context.fillStyle='#f5f7fa';context.fillRect(0,0,640,360);
            const scale=Math.min(640/canvas.width,360/canvas.height),w=canvas.width*scale,h=canvas.height*scale;
            context.drawImage(canvas,(640-w)/2,(360-h)/2,w,h);return image.toDataURL('image/png');
        },
        playbackReport:()=>({frames:playback.frames.length,nodes:playback.nodes.length,bytes:playback.bytes,duration:playback.duration,time:playback.time,recording:playback.recording,active:playback.active,playing:playback.playing,limited:playback.limited,motion:playback.frames[playback.cache?.index]?.trace.motion||null,block:pendingHighlight,step:customStep}),
        async setFieldLayout(layout){
            const checked=SimFieldLayout.validateConnected(layout);if(!checked.ok)throw Error(checked.message);
            stop();const previous=localStorage.getItem(SimFieldLayout.KEY),previousPose=SimDefaultPosition.load();
            try{
                if(layout.cells.some(c=>c.type==='start'||c.type==='original'&&c.source===27||SimFieldLayout.ports(c).length)){
                    const start=SimFieldLayout.startPose(layout,{width:2.4,length:1.2,centerX:.15,centerZ:-.45});
                    SimDefaultPosition.save({...start,reference:'body-center'});
                }
                SimFieldLayout.save(layout);
                if(scene3d){await scene3d.reloadRobotModel();await scene3d.waitForModel();scene3d.viewField();}
                if(typeof saveCodeToLocal==='function')saveCodeToLocal();
            }
            catch(error){if(previous===null)localStorage.removeItem(SimFieldLayout.KEY);else localStorage.setItem(SimFieldLayout.KEY,previous);if(previousPose)SimDefaultPosition.save(previousPose);else SimDefaultPosition.clear();if(scene3d)await scene3d.reloadRobotModel();throw error;}
        },
        async alignToPlan(plan){
            if(!scene3d)throw Error('Robot SIM is not ready.');
            const pose=SimDeliveryBlocks.startPose(plan);
            stop();await scene3d.waitForModel();scene3d.alignHeading(pose.heading,pose);
            if(typeof saveCodeToLocal==='function')saveCodeToLocal();redraw();
        }, readMonitor, _debugScene: scene3d, timingReports:()=>slowdownReports.map(r=>({...r})),
        performanceReport:()=>performanceRecorder&&performanceRecorder.report({userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency,pixelRatio:window.devicePixelRatio}),
        exportPerformanceReport(){
            const report=this.performanceReport();if(!report)return;
            const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
            const link=document.createElement('a');link.href=url;link.download='roboblocks-sim-performance-'+Date.now()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
        }
    };
    if(controlToolbar){
        const home=document.createElement('button');home.type='button';home.id='motor-sim-set-default';home.setAttribute('aria-label','Set default position');home.setAttribute('aria-describedby','sim-tip-set-default');
        home.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/></svg><span class="sim-tool-tip" id="sim-tip-set-default" role="tooltip">Set default position</span>';
        home.onclick=()=>{try{if(!scene3d)throw Error('Robot SIM is not ready.');scene3d.saveDefaultPosition();if(typeof saveCodeToLocal==='function')saveCodeToLocal();(home.querySelector('.sim-tool-tip')||home).textContent='Default position saved';setTimeout(()=>(home.querySelector('.sim-tool-tip')||home).textContent='Set default position',1800);}catch(error){log(error.message);}};
        controlToolbar.insertBefore(home,resetButton?resetButton.nextSibling:null);
    }
    stopButton.onclick = () => stop();
    if(resetButton)resetButton.onclick=()=>stop(true);
    if(followButton)followButton.onclick=()=>{if(scene3d)scene3d.setCameraFollow(!scene3d.isCameraFollowing());};
    if(fieldButton)fieldButton.onclick=()=>{if(scene3d)scene3d.viewField();};

    run.onclick = async () => {
        stop();
        // Do not expose the previous run while asynchronous preparation is pending.
        clearPlayback();
        const current = generation;
        try {
            if (!scene3d) throw new Error('Three.js is not ready for Robot SIM.');
            run.disabled = true;
            if(window.IDEArduino?.active){const audio=window.SimMechanicalAudio?.getOutput()?.context;if(audio?.state==='suspended')audio.resume().catch(()=>{});}
            status.textContent = 'Preparing latest assembly...';
            monitorPhase='Preparing';monitorElapsed=0;
            await scene3d.waitForModel();
            if (current !== generation) return;
            let program, pythonCode, cppProgram;
            if (window.IDEArduino?.active) {
                let compilePhase='Preparing code';
                const compileStarted=performance.now();
                const showCompileProgress=()=>{if(current===generation)status.textContent=compilePhase+' - '+Math.floor((performance.now()-compileStarted)/1000)+'s';};
                status.hidden=false;showCompileProgress();
                const compileTimer=setInterval(showCompileProgress,250);
                let lastCompileMessage='';
                try{cppProgram=await window.IDEArduino.compileForSim(phase=>{compilePhase=phase;if(current===generation&&phase!==lastCompileMessage){lastCompileMessage=phase;log(phase);}showCompileProgress();});}
                finally{clearInterval(compileTimer);if(current===generation)status.hidden=true;}
                if (current !== generation) return;
            } else if (typeof useMode !== 'undefined' && useMode !== 'block') {
                if (typeof boards !== 'undefined' && boards.some(b => b.id === boardId && b.isArduinoPlatform)) throw new Error('Python SIM requires a Python board.');
                if (typeof editor === 'undefined' || !editor) throw new Error('The Python editor is not ready.');
                pythonCode = editor.getValue();
            } else {
                if (!window.blocklyWorkspace) throw new Error('The block workspace is not ready.');
                try {
                    if (['buildbot','atom-vx'].includes(boardId)) pythonCode = SimPythonSource.generate(Blockly, blocklyWorkspace, {firmware:boardId,trace:true});
                    else program = MotorSim.snapshot(blocklyWorkspace);
                }
                catch (error) {
                    if (!/^SIM does not support this block yet:/.test(error.message)) throw error;
                    pythonCode = SimPythonSource.generate(Blockly, blocklyWorkspace);
                }
            }
            let files;
            if (pythonCode !== undefined) {
                if (!pythonCode.trim()) throw new Error('Add Python code before running the simulation.');
                const directory = typeof sharedObj !== 'undefined' && sharedObj.extensionDir;
                files = Object.assign(await SimPythonSource.collectInstalled(directory), SimPythonSource.collect(typeof vFSTree !== 'undefined' ? vFSTree : {}));
                if (current !== generation) return;
            } else if (!cppProgram && !program.length) throw new Error('Add blocks before running the simulation.');
            // Wall-clock startup window, after compilation/model loading, before any user code.
            // Keep held board inputs intact so setup() can detect a boot-time button press.
            if ((cppProgram?.board || boardId) === 'atom-vx') {
                monitorPhase='Starting';
                const bootDeadline=performance.now()+2000;
                status.hidden=false;
                while(performance.now()<bootDeadline){
                    if(current!==generation)return;
                    status.textContent='Starting ATOM in '+Math.ceil((bootDeadline-performance.now())/1000)+'s ? hold A, B or AB now.';
                    await new Promise(resolve=>setTimeout(resolve,50));
                }
                if(current!==generation)return;
                status.hidden=true;
            }
            scene3d.startSimulation();
            scene3d.startPlaybackRecording();
            monitorStart=scene3d.readSimulationTime()||0;monitorPhase='Running';
            run.disabled = true;
            status.textContent = cppProgram ? 'Running Arduino C++ in Robot 3D SIM.' : pythonCode === undefined ? 'Running blocks in Robot 3D SIM.' : 'Running Python in Robot 3D SIM.';
            log(status.textContent);
            const done = cppProgram ? await pythonRuntime.run('',{}, {firmware:cppProgram.board,cppWasm:cppProgram.wasm}) : pythonCode === undefined ? await runtime.run(program) : await pythonRuntime.run(pythonCode, files, {firmware: ['buildbot','atom-vx'].includes(boardId) ? boardId : null,traceBlocks:typeof useMode==='undefined'||useMode==='block'?window.blocklyWorkspace&&blocklyWorkspace.getAllBlocks(false).map(b=>b.id):null});
            if (current === generation && done) {
                if(!motorTargets.some(Boolean)){scene3d.capturePlayback(true);playback.finish();}
                readMonitor();monitorPhase='Complete';
                status.textContent = motorTargets.some(Boolean) ? 'Program complete. The robot will keep moving until Stop is pressed.' : 'Program complete. Motors stopped.';
                log(status.textContent);
            }
        } catch (error) {
            if (current === generation) {
                scene3d.capturePlayback(true);playback.finish();
                readMonitor();monitorPhase='Error';
                runtime.stop();
                pythonRuntime.stop();
                firmwareTone(0, 0);
                motorTargets = [0, 0, 0, 0];
                status.textContent = error.message;
                log(error.message);
                redraw();
            }
        } finally {
            if (current === generation) run.disabled = false;
        }
    };

    // The same button can be adopted into the SIM popout document.
    // Update the element itself rather than depending on parent-body CSS.
    const updateRunLanguage = () => { run.style.display = ''; };
    window.addEventListener('ide-program-language-changed', updateRunLanguage);
    updateRunLanguage();
    window.addEventListener('sim-viewport-moved', () => {
        viewportSize=null;observeViewport();cancelSimFrame();last=0;redraw();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !(window.SimPopout && SimPopout.isOpen())) stop(); });
    let viewportObserver=null;
    function observeViewport(){
        if(viewportObserver)viewportObserver.disconnect();
        // Electron9 does not reliably deliver a main-window observer after
        // adoption into the popup. Bind it to the canvas's current document.
        const owner=canvas.ownerDocument.defaultView||window;
        viewportObserver=new owner.ResizeObserver(entries=>{for(const entry of entries)if(entry.target===canvas)viewportSize=entry.contentRect;redraw();});
        viewportObserver.observe(canvas);
    }
    observeViewport();
    window.addEventListener('beforeunload', () => { viewportObserver.disconnect();cancelSimFrame();pythonRuntime.stop(); firmwareTone(0, 0); if (firmwareAudio) firmwareAudio.close(); if (scene3d) scene3d.dispose(); });
    redraw();
})();










