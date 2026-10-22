(function () {
  const childProcess = require('child_process');
  const http = require('http');
  const https = require('https');
  const { ipcRenderer } = require('electron');
  const threeRoot = document.getElementById('three');
  const threeWrap = document.getElementById('threeWrap');
  const statusBanner = document.getElementById('statusBanner');
  const statusText = document.getElementById('statusText');
  const startBtn = document.getElementById('startBtn');
  const autoBtn = document.getElementById('autoBtn');
  const goalBtn = document.getElementById('goalBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const openRemoteDesktopBtn = document.getElementById('openRemoteDesktopBtn');
  const openSshTerminalBtn = document.getElementById('openSshTerminalBtn');
  const mapView2dBtn = document.getElementById('mapView2dBtn');
  const mapView3dBtn = document.getElementById('mapView3dBtn');
  const mapLayerBtn = document.getElementById('mapLayerBtn');
  const mapLayerMenu = document.getElementById('mapLayerMenu');
  const layerMapToggle = document.getElementById('layerMapToggle');
  const layerScanToggle = document.getElementById('layerScanToggle');
  const layerCostMapToggle = document.getElementById('layerCostMapToggle');
  const mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
  const mapLoadingText = document.getElementById('mapLoadingText');
  const terminalDropdown = document.getElementById('terminalDropdown');
  const newTerminalBtn = document.getElementById('newTerminalBtn');
  const terminalWindowList = document.getElementById('terminalWindowList');
  const terminalWindowHost = document.getElementById('terminalWindowHost');
  const robotStatusIndicator = document.getElementById('robotStatusIndicator');
  const robotStatusValue = document.getElementById('robotStatusValue');
  const lidarStatusIndicator = document.getElementById('lidarStatusIndicator');
  const lidarStatusValue = document.getElementById('lidarStatusValue');
  const imuStatusIndicator = document.getElementById('imuStatusIndicator');
  const imuStatusValue = document.getElementById('imuStatusValue');
  const telemetryXValue = document.getElementById('telemetryXValue');
  const telemetryYValue = document.getElementById('telemetryYValue');
  const telemetryYawValue = document.getElementById('telemetryYawValue');
  const telemetrySpeedValue = document.getElementById('telemetrySpeedValue');
  const topbarStopBtn = document.getElementById('topbarStopBtn');
  const cancelGoalBtn = document.getElementById('cancelGoalBtn');
  const setInitialPoseBtn = document.getElementById('setInitialPoseBtn');
  const resetRobotPoseBtn = document.getElementById('resetRobotPoseBtn');
  const stopMotionBtn = document.getElementById('stopMotionBtn');
  const resetViewPanelBtn = document.getElementById('resetViewPanelBtn');
  const clearMapBtn = document.getElementById('clearMapBtn');
  const poseTableBody = document.getElementById('poseTableBody');
  const rosConfirmModal = document.getElementById('rosConfirmModal');
  const rosConfirmMessage = document.getElementById('rosConfirmMessage');
  const rosConfirmOkBtn = document.getElementById('rosConfirmOkBtn');
  const rosConfirmCancelBtn = document.getElementById('rosConfirmCancelBtn');
  const poseInfo = document.getElementById('poseInfo');
  const testOutput = document.getElementById('testOutput');
  const sshTargetInput = document.getElementById('sshTarget');
  const connectSshBtn = document.getElementById('connectSshBtn');
  const disconnectSshBtn = document.getElementById('disconnectSshBtn');
  const clearTerminalBtn = document.getElementById('clearTerminalBtn');
  const embeddedTerminalSection = document.getElementById('embeddedTerminalSection');
  const layoutContainer = document.getElementById('layoutContainer');
  const sidePanel = document.getElementById('sidePanel');
  const panelResizeHandle = document.getElementById('panelResizeHandle');
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  const joystick = document.getElementById('joystick');
  const joystickKnob = document.getElementById('joystickKnob');
  const joystickHomeBtn = document.getElementById('joystickHomeBtn');
  const joystickPauseBtn = document.getElementById('joystickPauseBtn');
  const joystickRunToBtn = document.getElementById('joystickRunToBtn');
  const joystickEstimateBtn = document.getElementById('joystickEstimateBtn');
  const joystickMeta = document.getElementById('joystickMeta');
  const stopBtn = document.getElementById('stopBtn');
  const iconButtons = document.querySelectorAll('.icon-btn');
  const actionTooltip = document.createElement('div');
  const rosTargetHost = (localStorage.getItem('ptbot_wifi_ip') || '192.168.0.125').trim() || '192.168.0.125';
  const robotStartCommand = 'ros2 launch pt_robot_bringup slam.launch.py';
  const ROBOT_START_TERMINAL_ID_STORAGE_KEY = 'ros_robot_start_terminal_id';
  const ideTransportState = {
    connected: false,
    transportType: '',
    host: rosTargetHost,
    port: parseInt(localStorage.getItem('ptbot_wifi_port') || '8080', 10) || 8080
  };

  actionTooltip.className = 'action-tooltip';
  document.body.appendChild(actionTooltip);
  if (mapLoadingOverlay && mapLoadingOverlay.parentNode !== document.body) {
    document.body.appendChild(mapLoadingOverlay);
  }
  if (rosConfirmModal && rosConfirmModal.parentNode !== document.body) {
    document.body.appendChild(rosConfirmModal);
  }

  if (!window.THREE) {
    testOutput.textContent = 'โหลด Three.js ไม่สำเร็จ';
    if (statusText) {
      statusText.textContent = 'เกิดข้อผิดพลาด: ไม่พบไลบรารี Three.js';
    }
    return;
  }

  const THREE = window.THREE;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f7fa);
  scene.fog = new THREE.Fog(0xf5f7fa, 18, 40);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  threeRoot.appendChild(renderer.domElement);

  const orbitState = {
    target: new THREE.Vector3(0, 0.4, 0),
    radius: 4.5,
    desiredRadius: 4.5,
    theta: Math.PI / 4,
    phi: 1.0,
    isDragging: false,
    dragMode: 'orbit',
    startX: 0,
    startY: 0,
    didDrag: false,
    startTheta: 0,
    startPhi: 0,
    startTarget: new THREE.Vector3(0, 0.4, 0),
    desiredTheta: Math.PI / 4,
    desiredPhi: 1.0,
    desiredTarget: new THREE.Vector3(0, 0.4, 0),
    orbitSmoothFactor: 0.18,
    panSmoothFactor: 0.2,
    zoomSmoothFactor: 0.2
  };
  const mapViewState = {
    mode: '3d'
  };
  const layerVisibilityState = {
    map: true,
    scan: true,
    costMap: true
  };
  const LAYER_VISIBILITY_STORAGE_KEY = 'ros_layer_visibility_state';

  function clampOrbitValues() {
    orbitState.phi = Math.max(0.02, Math.min(Math.PI / 2 - 0.05, orbitState.phi));
    orbitState.radius = Math.max(1.5, Math.min(22, orbitState.radius));
    orbitState.desiredRadius = Math.max(1.5, Math.min(22, orbitState.desiredRadius));
    orbitState.desiredPhi = Math.max(0.02, Math.min(Math.PI / 2 - 0.05, orbitState.desiredPhi));
  }

  function updateCameraFromOrbit() {
    clampOrbitValues();
    const sinPhi = Math.sin(orbitState.phi);
    camera.position.set(
      orbitState.target.x + orbitState.radius * sinPhi * Math.cos(orbitState.theta),
      orbitState.target.y + orbitState.radius * Math.cos(orbitState.phi),
      orbitState.target.z + orbitState.radius * sinPhi * Math.sin(orbitState.theta)
    );
    camera.lookAt(orbitState.target);
  }

  function getCurrentRosSshTarget() {
    const host = (ideTransportState.host || rosTargetHost || '192.168.0.125').trim() || '192.168.0.125';
    return 'james@' + host;
  }

  function getCurrentRemoteDesktopHost() {
    return (ideTransportState.host || rosTargetHost || '192.168.1.106').trim() || '192.168.1.106';
  }

  function syncOrbitStateImmediately() {
    orbitState.theta = orbitState.desiredTheta;
    orbitState.phi = orbitState.desiredPhi;
    orbitState.radius = orbitState.desiredRadius;
    orbitState.target.copy(orbitState.desiredTarget);
    updateCameraFromOrbit();
  }

  function initializeIntroCameraMotion() {
    if (mapViewState.mode !== '3d') {
      syncOrbitStateImmediately();
      return;
    }
    orbitState.theta = orbitState.desiredTheta - 0.45;
    orbitState.phi = 0.72;
    orbitState.radius = 8.8;
    orbitState.target.copy(orbitState.desiredTarget).add(new THREE.Vector3(-0.25, 0.22, 0.35));
    updateCameraFromOrbit();
  }

  function updateMapViewButtons() {
    if (mapView2dBtn) {
      mapView2dBtn.classList.toggle('is-active', mapViewState.mode === '2d');
    }
    if (mapView3dBtn) {
      mapView3dBtn.classList.toggle('is-active', mapViewState.mode === '3d');
    }
  }

  function setMapViewMode(mode) {
    mapViewState.mode = mode === '3d' ? '3d' : '2d';
    orbitState.desiredTarget.set(robot.position.x, 0.4, robot.position.z);
    if (mapViewState.mode === '3d') {
      orbitState.desiredTheta = Math.PI / 4;
      orbitState.desiredPhi = 1.0;
      orbitState.desiredRadius = 4.5;
    } else {
      orbitState.desiredTheta = -Math.PI / 2;
      orbitState.desiredPhi = 0.02;
      orbitState.desiredRadius = 8.5;
    }
    updateMapViewButtons();
  }

  function syncLayerControls() {
    if (layerMapToggle) layerMapToggle.checked = !!layerVisibilityState.map;
    if (layerScanToggle) layerScanToggle.checked = !!layerVisibilityState.scan;
    if (layerCostMapToggle) layerCostMapToggle.checked = !!layerVisibilityState.costMap;
  }

  function saveLayerVisibilityState() {
    try {
      localStorage.setItem(LAYER_VISIBILITY_STORAGE_KEY, JSON.stringify({
        map: !!layerVisibilityState.map,
        scan: !!layerVisibilityState.scan,
        costMap: !!layerVisibilityState.costMap
      }));
    } catch (error) {}
  }

  function loadLayerVisibilityState() {
    try {
      const raw = localStorage.getItem(LAYER_VISIBILITY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (typeof parsed.map === 'boolean') layerVisibilityState.map = parsed.map;
      if (typeof parsed.scan === 'boolean') layerVisibilityState.scan = parsed.scan;
      if (typeof parsed.costMap === 'boolean') layerVisibilityState.costMap = parsed.costMap;
    } catch (error) {}
  }

  function applyLayerVisibility() {
    mapMesh.visible = !!(layerVisibilityState.map && hasMapData);
    costMapGroup.visible = !!layerVisibilityState.costMap;
    if (!layerVisibilityState.scan) {
      hideScanGeometry();
    }
  }

  function lockTopDownView() {
    if (mapViewState.mode !== '2d') return;
    orbitState.desiredTheta = -Math.PI / 2;
    orbitState.desiredPhi = 0.02;
  }

  function yawToDirection(yaw) {
    return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  }

  function updateGoalSelectionPreview(position, yaw, visible) {
    if (!goalPreviewGroup) return;
    goalPreviewGroup.visible = !!(visible && position);
    if (!goalPreviewGroup.visible || !position) return;
    goalPreviewGroup.position.set(position.x, 0.02, position.z);
    const caretOffset = 0.22;
    goalPreviewCaret.position.set(
      Math.sin(yaw) * caretOffset,
      0.03,
      Math.cos(yaw) * caretOffset
    );
    goalPreviewCaret.rotation.z = yaw + Math.PI;
  }

  function cancelGoalSelection() {
    autopilotState.selectingGoal = false;
    autopilotState.selectionPointerId = null;
    autopilotState.selectionStart = null;
    autopilotState.selectionYaw = null;
    autopilotState.selectionDragging = false;
    updateGoalSelectionPreview(null, 0, false);
  }

  function beginGoalSelection(event) {
    const hitPoint = getWorldPointFromPointer(event);
    if (!hitPoint) {
      setStatus('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เน€เธฅเธทเธญเธ Goal เนเธ”เน');
      cancelGoalSelection();
      return false;
    }
    autopilotState.selectionPointerId = event.pointerId;
    autopilotState.selectionStart = { x: hitPoint.x, z: hitPoint.z };
    autopilotState.selectionYaw = robot.rotation.y;
    autopilotState.selectionDragging = false;
    updateGoalSelectionPreview(autopilotState.selectionStart, autopilotState.selectionYaw, true);
    setStatus('ลากเมาส์เพื่อกำหนดทิศทาง Goal แล้วปล่อยเพื่อยืนยัน');
    return true;
  }

  function updateGoalSelectionFromPointer(event) {
    if (!autopilotState.selectingGoal || !autopilotState.selectionStart) return;
    const hitPoint = getWorldPointFromPointer(event);
    if (!hitPoint) return;
    const dx = hitPoint.x - autopilotState.selectionStart.x;
    const dz = hitPoint.z - autopilotState.selectionStart.z;
    if (Math.hypot(dx, dz) > 0.04) {
      autopilotState.selectionDragging = true;
      autopilotState.selectionYaw = Math.atan2(dx, dz);
      updateGoalSelectionPreview(
        autopilotState.selectionStart,
        autopilotState.selectionYaw,
        true
      );
    }
  }

  function finalizeGoalSelection() {
    if (!autopilotState.selectionStart) {
      cancelGoalSelection();
      return;
    }
    const selectedGoal = autopilotState.selectionStart;
    const selectedYaw = typeof autopilotState.selectionYaw === 'number'
      ? autopilotState.selectionYaw
      : robot.rotation.y;
    cancelGoalSelection();
    if (setAutopilotGoal(selectedGoal.x, selectedGoal.z, selectedYaw)) {
      autopilotState.enabled = true;
      setStatus('ตั้ง Goal และเริ่มวิ่งอัตโนมัติ');
    }
  }

  loadLayerVisibilityState();
  updateMapViewButtons();
  syncLayerControls();

  const mapTouches=new Map();let mapPinch=null;
  renderer.domElement.style.touchAction='none';
  const stopTouch=event=>{event.preventDefault();event.stopImmediatePropagation();};
  renderer.domElement.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    mapTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});renderer.domElement.setPointerCapture(event.pointerId);
    if(mapTouches.size===2){
      if(autopilotState.selectingGoal)cancelGoalSelection();
      const [a,b]=[...mapTouches.values()];mapPinch={x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),radius:orbitState.desiredRadius};
      orbitState.startTarget.copy(orbitState.desiredTarget);orbitState.isDragging=true;orbitState.didDrag=true;stopTouch(event);
    }else if(mapPinch)stopTouch(event);
  },true);
  renderer.domElement.addEventListener('pointermove',event=>{
    if(!mapTouches.has(event.pointerId))return;mapTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});if(!mapPinch)return;
    if(mapTouches.size===2){const [a,b]=[...mapTouches.values()];orbitState.desiredRadius=Math.max(1.5,Math.min(22,mapPinch.radius*mapPinch.distance/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))));applyPanDrag((a.x+b.x)/2-mapPinch.x,(a.y+b.y)/2-mapPinch.y);}
    stopTouch(event);
  },true);
  const endMapTouch=event=>{if(!mapTouches.has(event.pointerId))return;mapTouches.delete(event.pointerId);if(!mapPinch)return;stopTouch(event);if(!mapTouches.size){mapPinch=null;orbitState.isDragging=false;}};
  for(const type of ['pointerup','pointercancel'])renderer.domElement.addEventListener(type,endMapTouch,true);

  renderer.domElement.addEventListener('pointerdown', function (event) {
    if (autopilotState.selectingGoal && event.button === 0) {
      orbitState.isDragging = false;
      orbitState.didDrag = false;
      if (renderer.domElement.setPointerCapture) {
        renderer.domElement.setPointerCapture(event.pointerId);
      }
      beginGoalSelection(event);
      return;
    }
    orbitState.isDragging = true;
    orbitState.didDrag = false;
    orbitState.dragMode = (mapViewState.mode === '2d' || event.button === 2) ? 'pan' : 'orbit';
    orbitState.startX = event.clientX;
    orbitState.startY = event.clientY;
    orbitState.startTheta = orbitState.desiredTheta;
    orbitState.startPhi = orbitState.desiredPhi;
    orbitState.startTarget.copy(orbitState.desiredTarget);
    if (renderer.domElement.setPointerCapture) {
      renderer.domElement.setPointerCapture(event.pointerId);
    }
  });

  function applyOrbitDrag(dx, dy) {
    orbitState.desiredTheta = orbitState.startTheta + dx * 0.01;
    orbitState.desiredPhi = orbitState.startPhi - dy * 0.01;
  }

  function applyPanDrag(dx, dy) {
    const distance = Math.max(orbitState.radius * 0.0035, 0.01);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const flatForward = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize();

    orbitState.desiredTarget.copy(orbitState.startTarget)
      .addScaledVector(right, -dx * distance)
      .addScaledVector(flatForward, dy * distance);
  }

  renderer.domElement.addEventListener('pointermove', function (event) {
    updatePointerPoseInfo(event);
    if (autopilotState.selectingGoal && autopilotState.selectionPointerId === event.pointerId) {
      updateGoalSelectionFromPointer(event);
      return;
    }
    if (!orbitState.isDragging) return;
    const dx = event.clientX - orbitState.startX;
    const dy = event.clientY - orbitState.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) orbitState.didDrag = true;
    if (orbitState.dragMode === 'pan') {
      applyPanDrag(dx, dy);
    } else {
      applyOrbitDrag(dx, dy);
    }
  });

  function endDrag(event) {
    if (
      autopilotState.selectingGoal &&
      (!event || autopilotState.selectionPointerId === null || autopilotState.selectionPointerId === event.pointerId)
    ) {
      if (event && renderer.domElement.releasePointerCapture && renderer.domElement.hasPointerCapture && renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      finalizeGoalSelection();
      return;
    }
    orbitState.isDragging = false;
    if (event && renderer.domElement.releasePointerCapture && renderer.domElement.hasPointerCapture && renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
  }

  renderer.domElement.addEventListener('pointerup', endDrag);
  renderer.domElement.addEventListener('pointercancel', endDrag);
  renderer.domElement.addEventListener('pointerleave', function () {
    resetPointerPoseInfo();
  });
  renderer.domElement.addEventListener('wheel', function (event) {
    event.preventDefault();
    orbitState.desiredRadius = Math.max(1.5, Math.min(22, orbitState.desiredRadius + event.deltaY * 0.01));
  }, { passive: false });

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc7d0da, 1.2);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
  dirLight.position.set(8, 12, 6);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: 0xcfd8e3, roughness: 0.98, metalness: 0.01 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = 1;
  mapCanvas.height = 1;
  const mapContext = mapCanvas.getContext('2d');
  const mapTexture = new THREE.CanvasTexture(mapCanvas);
  mapTexture.minFilter = THREE.LinearFilter;
  mapTexture.magFilter = THREE.NearestFilter;
  mapTexture.generateMipmaps = false;
  const mapMaterial = new THREE.MeshBasicMaterial({
    map: mapTexture,
    transparent: true,
    opacity: 1,
    depthWrite: false
  });
  const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mapMaterial);
  mapMesh.rotation.x = -Math.PI / 2;
  mapMesh.position.y = 0.002;
  mapMesh.visible = false;
  scene.add(mapMesh);
  let hasMapData = false;
  const costMapGroup = new THREE.Group();
  scene.add(costMapGroup);

  let grid = new THREE.GridHelper(8, 16, 0x7f8f9f, 0xa9b5c1);
  grid.position.y = 0.001;
  grid.renderOrder = 10;
  function applyGridMaterialStyle(gridHelper) {
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach(function (material) {
        material.depthTest = true;
        material.transparent = true;
        material.opacity = 0.35;
      });
    } else if (gridHelper.material) {
      gridHelper.material.depthTest = true;
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.35;
    }
  }
  applyGridMaterialStyle(grid);
  scene.add(grid);

  function resizeGroundToMap(mapWidthMeters, mapHeightMeters) {
    const mapMax = Math.max(mapWidthMeters, mapHeightMeters);
    const groundSize = Math.max(8, Math.ceil(mapMax + 4));
    const gridDivisions = Math.max(16, groundSize * 2);

    floor.geometry.dispose();
    floor.geometry = new THREE.PlaneGeometry(groundSize, groundSize);

    scene.remove(grid);
    if (grid.geometry) {
      grid.geometry.dispose();
    }
    if (Array.isArray(grid.material)) {
      grid.material.forEach(function (material) { material.dispose(); });
    } else if (grid.material) {
      grid.material.dispose();
    }

    grid = new THREE.GridHelper(groundSize, gridDivisions, 0x7f8f9f, 0xa9b5c1);
    grid.position.y = 0.001;
    grid.renderOrder = 10;
    applyGridMaterialStyle(grid);
    scene.add(grid);
  }

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x69717a, roughness: 0.92, metalness: 0.04 });

  function addWall(x, z, w, h, d) {
    const depth = typeof d === 'number' ? d : 0.6;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), wallMaterial);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  const walls = [];
  const robotDimensions = {
    width: 0.15,
    length: 0.20,
    bodyHeight: 0.035,
    deckWidth: 0.095,
    deckLength: 0.12,
    deckHeight: 0.018,
    lidarRadius: 0.022,
    lidarHeight: 0.03,
    wheelRadius: 0.028,
    wheelThickness: 0.016,
    wheelOffsetX: 0.083,
    bodyCenterY: 0.058,
    deckCenterY: 0.088,
    lidarCenterY: 0.118,
    casterRadius: 0.012,
    casterOffsetZ: 0.072,
    lidarForwardOffset: 0.06
  };

  const robot = new THREE.Group();
  scene.add(robot);
  const robotVisual = new THREE.Group();
  robotVisual.rotation.y = Math.PI;
  robot.add(robotVisual);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(robotDimensions.width, robotDimensions.bodyHeight, robotDimensions.length),
    new THREE.MeshStandardMaterial({ color: 0x2d3a4a, roughness: 0.54, metalness: 0.12 })
  );
  body.position.y = robotDimensions.bodyCenterY;
  body.castShadow = true;
  body.receiveShadow = true;
  robotVisual.add(body);

  const topDeck = new THREE.Mesh(
    new THREE.BoxGeometry(robotDimensions.deckWidth, robotDimensions.deckHeight, robotDimensions.deckLength),
    new THREE.MeshStandardMaterial({ color: 0x5e748c, roughness: 0.62, metalness: 0.08 })
  );
  topDeck.position.y = robotDimensions.deckCenterY;
  topDeck.castShadow = true;
  robotVisual.add(topDeck);

  const lidar = new THREE.Mesh(
    new THREE.CylinderGeometry(robotDimensions.lidarRadius, robotDimensions.lidarRadius, robotDimensions.lidarHeight, 24),
    new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.35, metalness: 0.3 })
  );
  lidar.position.y = robotDimensions.lidarCenterY;
  lidar.castShadow = true;
  robotVisual.add(lidar);

  const wheelGeometry = new THREE.CylinderGeometry(robotDimensions.wheelRadius, robotDimensions.wheelRadius, robotDimensions.wheelThickness, 24);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1d2329, roughness: 0.8 });

  const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
  leftWheel.rotation.z = Math.PI / 2;
  leftWheel.position.set(-robotDimensions.wheelOffsetX, robotDimensions.wheelRadius, 0);
  leftWheel.castShadow = true;
  robotVisual.add(leftWheel);

  const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
  rightWheel.rotation.z = Math.PI / 2;
  rightWheel.position.set(robotDimensions.wheelOffsetX, robotDimensions.wheelRadius, 0);
  rightWheel.castShadow = true;
  robotVisual.add(rightWheel);

  const caster = new THREE.Mesh(
    new THREE.SphereGeometry(robotDimensions.casterRadius, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x7c8792 })
  );
  caster.position.set(0, robotDimensions.casterRadius, robotDimensions.casterOffsetZ);
  caster.castShadow = true;
  robotVisual.add(caster);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.018, 0.05, 16),
    new THREE.MeshStandardMaterial({ color: 0x4da3ff, emissive: 0x0d6efd, emissiveIntensity: 0.15 })
  );
  arrow.position.set(0, robotDimensions.deckCenterY + 0.005, -(robotDimensions.length / 2) - 0.02);
  arrow.rotation.x = Math.PI / 2;
  robotVisual.add(arrow);

  initializeIntroCameraMotion();

  const scanGroup = new THREE.Group();
  scene.add(scanGroup);
  const scanAreaGeometry = new THREE.BufferGeometry();
  const scanAreaMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4d4f,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const scanAreaMesh = new THREE.Mesh(scanAreaGeometry, scanAreaMaterial);
  scanAreaMesh.position.y = 0.02;
  scanAreaMesh.visible = false;
  scene.add(scanAreaMesh);
  const pathGeometry = new THREE.BufferGeometry();
  const pathMaterial = new THREE.LineBasicMaterial({ color: 0x1f7aff, transparent: true, opacity: 0.95 });
  const pathLine = new THREE.Line(pathGeometry, pathMaterial);
  pathLine.position.y = 0.035;
  scene.add(pathLine);
  const goalPreviewGroup = new THREE.Group();
  goalPreviewGroup.visible = false;
  scene.add(goalPreviewGroup);
  const goalPreviewRing = new THREE.Mesh(
    new THREE.RingGeometry(0.09, 0.125, 32),
    new THREE.MeshBasicMaterial({
      color: 0x1f7aff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  goalPreviewRing.rotation.x = -Math.PI / 2;
  goalPreviewGroup.add(goalPreviewRing);
  const goalPreviewCaretCanvas = document.createElement('canvas');
  goalPreviewCaretCanvas.width = 128;
  goalPreviewCaretCanvas.height = 128;
  const goalPreviewCaretContext = goalPreviewCaretCanvas.getContext('2d');
  goalPreviewCaretContext.clearRect(0, 0, goalPreviewCaretCanvas.width, goalPreviewCaretCanvas.height);
  goalPreviewCaretContext.font = '900 92px Arial';
  goalPreviewCaretContext.textAlign = 'center';
  goalPreviewCaretContext.textBaseline = 'middle';
  goalPreviewCaretContext.fillStyle = '#1f7aff';
  goalPreviewCaretContext.fillText('^', goalPreviewCaretCanvas.width / 2, goalPreviewCaretCanvas.height / 2 + 4);
  const goalPreviewCaretTexture = new THREE.CanvasTexture(goalPreviewCaretCanvas);
  goalPreviewCaretTexture.needsUpdate = true;
  const goalPreviewCaret = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.26),
    new THREE.MeshBasicMaterial({
      map: goalPreviewCaretTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  goalPreviewCaret.position.set(0, 0.03, 0);
  goalPreviewCaret.rotation.x = -Math.PI / 2;
  goalPreviewGroup.add(goalPreviewCaret);
  const scanMaterial = new THREE.MeshBasicMaterial({ color: 0xff4d4f });
  const scanGeometry = new THREE.SphereGeometry(0.008, 8, 8);
  const scanPoints = [];

  for (let i = 0; i < 240; i += 1) {
    const point = new THREE.Mesh(scanGeometry, scanMaterial);
    point.position.y = 0.03;
    point.visible = false;
    scanGroup.add(point);
    scanPoints.push(point);
  }

  const movementStep = 0.12;
  const joystickDeadZone = 0.12;
  const maxLinearSpeed = 0.06;
  const maxAngularSpeed = 0.04;
  const positionLerpFactor = 0.1;
  const rotationLerpFactor = 0.1;
  const robotCollisionRadius = 0.13;
  const plannerClearanceRadius = 0.18;
  const pathClearanceRadius = 0.15;
  const lidarMaxRange = 12;
  const scanYawOffset = Math.PI / 2;
  const rosbridgeConfig = {
    url: 'ws://' + rosTargetHost + ':9090',
    lidarTopic: '/scan',
    imuTopic: '/imu',
    mapTopic: '/map',
    amclPoseTopic: '/amcl_pose',
    odomTopic: '/odom',
    tfTopic: '/tf',
    reconnectMs: 3000
  };
  const plannerCellSize = 0.5;
  const plannerBounds = 4;
  const plannerCols = Math.round((plannerBounds * 2) / plannerCellSize);
  const plannerRows = plannerCols;
  const autopilotLinearSpeed = 0.045;
  const autopilotAngularSpeed = 0.05;
  const autopilotGoalTolerance = 0.22;
  const autopilotWaypointTolerance = 0.28;
  let targetRotation = 0;
  const targetPosition = new THREE.Vector3(0, 0, 0);
  const joystickState = {
    isDragging: false,
    x: 0,
    y: 0,
    radius: 54,
    lastMoveAt: 0
  };
  const rotationHoldState = {
    timer: null,
    direction: 0
  };
  const autopilotState = {
    enabled: false,
    selectingGoal: false,
    goal: null,
    path: [],
    pathIndex: 0,
    blockedFrames: 0,
    selectionPointerId: null,
    selectionStart: null,
    selectionYaw: null,
    selectionDragging: false
  };
  const initialPoseState = {
    x: 0,
    z: 0,
    yaw: 0
  };
  const poseTableState = {
    items: [],
    selectedIds: [],
    nextId: 1,
    homeId: null
  };
  const POSE_TABLE_STORAGE_KEY = 'ros_pose_table_state';
  let poseTableStorageSnapshot = null;
  let rosConfirmResolver = null;
  const rosbridgeState = {
    socket: null,
    connected: false,
    latestScan: null,
    latestScanAt: 0,
    latestImu: null,
    latestImuAt: 0,
    latestMap: null,
    latestPoseAt: 0,
    latestPoseSource: '',
    visualsEnabled: true,
    reconnectTimer: null
  };
  const terminalState = {
    process: null,
    target: '',
    buffer: '',
    term: null,
    fitAddon: null,
    initialized: false,
    isVisible: false
  };
  const floatingTerminalState = {
    windows: [],
    nextId: 1,
    zIndex: 40
  };
  const electronTerminalWindowsState = {
    windows: []
  };
  const robotTerminalRegistryState = {
    terminals: []
  };
  const ROS_TERMINAL_WINDOWS_STORAGE_KEY = 'ros_terminal_windows_state';
  let currentBridgeRunId = '';
  let robotStartTerminalId = localStorage.getItem(ROBOT_START_TERMINAL_ID_STORAGE_KEY) || '';
  let robotStartButtonLoading = false;
  const panelState = {
    width: 320,
    minWidth: 280,
    maxWidth: 520,
    collapsed: false,
    dragging: false
  };
  const panelAnimationDuration = 180;
  const panelResizable = false;
  let panelAnimationTimer = null;
  let panelAnimationFrame = null;
  let currentRobotSpeed = 0;

  function updateJoystickVisual() {
    joystickKnob.style.transform = 'translate(calc(-50% + ' + joystickState.x + 'px), calc(-50% + ' + joystickState.y + 'px))';
  }

  function setJoystickVector(nx, ny) {
    const length = Math.hypot(nx, ny);
    let clampedX = nx;
    let clampedY = ny;
    if (length > 1) {
      clampedX /= length;
      clampedY /= length;
    }
    joystickState.x = clampedX * joystickState.radius;
    joystickState.y = clampedY * joystickState.radius;
    updateJoystickVisual();

    const magnitude = Math.hypot(clampedX, clampedY);
    if (magnitude < joystickDeadZone) {
      if (joystickMeta) {
        joystickMeta.textContent = 'Y = เดินหน้า/ถอยหลัง, X = เลี้ยวซ้าย/ขวา, ปล่อยเพื่อหยุด';
      }
      return;
    }

    const linearPercent = Math.round(Math.abs(clampedY) * 100);
    const turnPercent = Math.round(Math.abs(clampedX) * 100);
    const linearText = clampedY > 0 ? 'ถอยหลัง' : 'เดินหน้า';
    const turnText = clampedX > 0 ? 'เลี้ยวขวา' : 'เลี้ยวซ้าย';
    if (joystickMeta) {
      joystickMeta.textContent = linearText + ' ' + linearPercent + '% , ' + turnText + ' ' + turnPercent + '%';
    }
  }

  function resetJoystick() {
    joystickState.isDragging = false;
    joystickKnob.classList.remove('is-dragging');
    joystickState.x = 0;
    joystickState.y = 0;
    updateJoystickVisual();
    if (joystickMeta) {
      joystickMeta.textContent = 'Y = เดินหน้า/ถอยหลัง, X = เลี้ยวซ้าย/ขวา, ปล่อยเพื่อหยุด';
    }
  }

  function pointerToJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    setJoystickVector(dx / joystickState.radius, dy / joystickState.radius);
  }

  function updatePoseText() {
    const yawDeg = THREE.MathUtils.radToDeg(robot.rotation.y);
    if (telemetryXValue) {
      telemetryXValue.textContent = robot.position.x.toFixed(2);
    }
    if (telemetryYValue) {
      telemetryYValue.textContent = robot.position.z.toFixed(2);
    }
    if (telemetryYawValue) {
      telemetryYawValue.innerHTML = yawDeg.toFixed(0) + '&deg;';
    }
    if (telemetrySpeedValue) {
      telemetrySpeedValue.textContent = currentRobotSpeed.toFixed(2) + ' m/s';
    }
  }

  function updatePointerPoseInfo(event) {
    if (!poseInfo) {
      return;
    }
    const worldPoint = getWorldPointFromPointer(event);
    if (!worldPoint) {
      poseInfo.textContent = 'Mouse -> x: -, y: -';
      return;
    }
    poseInfo.textContent = 'Mouse -> x: ' + worldPoint.x.toFixed(2) + ', y: ' + worldPoint.z.toFixed(2);
  }

  function resetPointerPoseInfo() {
    if (poseInfo) {
      poseInfo.textContent = 'Mouse -> x: -, y: -';
    }
  }

  function summarizeStatusText(text) {
    if (!text) return 'READY';
    if (/Disconnected/i.test(text)) return 'OFFLINE';
    if (/Connected/i.test(text)) return 'ONLINE';
    if (/No Data/i.test(text)) return 'NO DATA';
    if (/Goal|Home|Terminal/i.test(text)) return 'ACTIVE';
    return 'READY';
  }

  function setStatus(text) {
    if (statusText) {
      statusText.textContent = summarizeStatusText(text);
      if (statusBanner) {
        statusBanner.classList.remove('is-warning', 'is-danger');
        if (/ผิดพลาด|ไม่สำเร็จ|ไม่พบ|Disconnected|บล็อก|ห้าม|ซ้ำ/.test(text)) {
          statusBanner.classList.add('is-danger');
        } else if (/กำลัง|กรุณา|No Data|รอ|คลิก/.test(text)) {
          statusBanner.classList.add('is-warning');
        }
      }
    } else {
      appendTerminalLine('[status] ' + text);
    }
    updatePoseText();
  }

  function setIndicatorState(indicatorNode, valueNode, text, tone) {
    if (valueNode) {
      valueNode.textContent = text;
    }
    if (!indicatorNode) {
      return;
    }
    indicatorNode.classList.remove('warning', 'danger');
    if (tone === 'warning') {
      indicatorNode.classList.add('warning');
    } else if (tone === 'danger') {
      indicatorNode.classList.add('danger');
    }
  }

  function updateLiveStatusPills() {
    const robotConnected = !!rosbridgeState.connected;
    setIndicatorState(
      robotStatusIndicator,
      robotStatusValue,
      robotConnected ? 'Connected' : 'Disconnected',
      robotConnected ? 'ok' : 'danger'
    );

    const hasFreshScan =
      robotConnected &&
      !!rosbridgeState.latestScan &&
      Array.isArray(rosbridgeState.latestScan.ranges) &&
      rosbridgeState.latestScan.ranges.length > 0 &&
      rosbridgeState.latestScanAt > 0 &&
      (Date.now() - rosbridgeState.latestScanAt) < 4000;

    setIndicatorState(
      lidarStatusIndicator,
      lidarStatusValue,
      hasFreshScan ? 'Receiving' : 'No Data',
      hasFreshScan ? 'ok' : 'warning'
    );

    const hasFreshImu =
      robotConnected &&
      !!rosbridgeState.latestImu &&
      rosbridgeState.latestImuAt > 0 &&
      (Date.now() - rosbridgeState.latestImuAt) < 4000;

    setIndicatorState(
      imuStatusIndicator,
      imuStatusValue,
      hasFreshImu ? 'Receiving' : 'No Data',
      hasFreshImu ? 'ok' : 'warning'
    );
  }

  function isIdeTransportConnected() {
    return !!ideTransportState.connected;
  }

  function getRobotBridgeStatusUrl() {
    const host = (ideTransportState.host || rosTargetHost || '').trim();
    const port = Number(ideTransportState.port) || 8080;
    if (!host) return '';
    return 'http://' + host + ':' + port + '/status';
  }

  function requestRobotBridgeStatus() {
    return new Promise(function (resolve, reject) {
      const statusUrl = getRobotBridgeStatusUrl();
      if (!statusUrl) {
        reject(new Error('Robot bridge host is not set'));
        return;
      }
      const transport = statusUrl.startsWith('https:') ? https : http;
      const request = transport.get(statusUrl, function (response) {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          body += chunk;
        });
        response.on('end', function () {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error('Status request failed with code ' + response.statusCode));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      });
      request.on('error', reject);
      request.setTimeout(4000, function () {
        request.destroy(new Error('Status request timeout'));
      });
    });
  }

  function requestRobotBridgeJson(method, path, body) {
    return new Promise(function (resolve, reject) {
      const host = (ideTransportState.host || rosTargetHost || '').trim();
      const port = Number(ideTransportState.port) || 8080;
      if (!host) {
        reject(new Error('Robot bridge host is not set'));
        return;
      }
      const requestPath = path.charAt(0) === '/' ? path : ('/' + path);
      const bodyText = body == null ? '' : JSON.stringify(body);
      const request = http.request({
        hostname: host,
        port: port,
        path: requestPath,
        method: method,
        headers: Object.assign(
          { Accept: 'application/json' },
          bodyText ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyText)
          } : {}
        )
      }, function (response) {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          raw += chunk;
        });
        response.on('end', function () {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error('Request failed with code ' + response.statusCode));
            return;
          }
          if (!raw.trim()) {
            resolve({});
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      });
      request.on('error', reject);
      request.setTimeout(5000, function () {
        request.destroy(new Error('Request timeout'));
      });
      if (bodyText) {
        request.write(bodyText);
      }
      request.end();
    });
  }

  function requestRobotBridgeWs(message, expectedTypes) {
    return new Promise(function (resolve, reject) {
      const host = (ideTransportState.host || rosTargetHost || '').trim();
      const port = Number(ideTransportState.port) || 8080;
      if (!host) {
        reject(new Error('Robot bridge host is not set'));
        return;
      }
      const acceptedTypes = Array.isArray(expectedTypes) ? expectedTypes.slice() : [expectedTypes];
      const socket = new WebSocket('ws://' + host + ':' + port + '/ws');
      let settled = false;
      const timeout = setTimeout(function () {
        if (settled) return;
        settled = true;
        try { socket.close(); } catch (error) {}
        reject(new Error('WebSocket request timeout'));
      }, 5000);

      function finish(error, payload) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { socket.close(); } catch (closeError) {}
        if (error) {
          reject(error);
        } else {
          resolve(payload);
        }
      }

      socket.addEventListener('open', function () {
        try {
          socket.send(JSON.stringify(message));
        } catch (error) {
          finish(error);
        }
      });

      socket.addEventListener('message', function (event) {
        let payload = null;
        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          return;
        }
        if (!payload || typeof payload !== 'object') return;
        const type = String(payload.type || '');
        if (type === 'status' || type === 'firmware_status' || type === 'firmware_progress') {
          return;
        }
        if (type === 'error') {
          finish(new Error(payload.message || 'Robot bridge error'));
          return;
        }
        if (acceptedTypes.indexOf(type) >= 0) {
          finish(null, payload);
        }
      });

      socket.addEventListener('error', function () {
        finish(new Error('WebSocket request failed'));
      });

      socket.addEventListener('close', function () {
        if (!settled) {
          finish(new Error('WebSocket request closed'));
        }
      });
    });
  }

  function normalizeRobotTerminalId(id) {
    return String(id || '').trim();
  }

  function sanitizeRobotTerminalTitle(title, target) {
    const rawTitle = String(title || '').trim();
    const fallbackTitle = String(target || 'shell').trim() || 'shell';
    if (!rawTitle) return fallbackTitle;
    if (/^tmux\b/i.test(rawTitle)) return fallbackTitle;
    if (/^tmux\s+new-session\b/i.test(rawTitle)) return fallbackTitle;
    if (/^tmux\s+attach(?:-session)?\b/i.test(rawTitle)) return fallbackTitle;
    if (/^tmux\s+kill-session\b/i.test(rawTitle)) return fallbackTitle;
    if (/^\[terminal\]/i.test(rawTitle)) return fallbackTitle;
    return rawTitle;
  }

  function saveRobotStartTerminalId() {
    try {
      if (robotStartTerminalId) {
        localStorage.setItem(ROBOT_START_TERMINAL_ID_STORAGE_KEY, robotStartTerminalId);
      } else {
        localStorage.removeItem(ROBOT_START_TERMINAL_ID_STORAGE_KEY);
      }
    } catch (error) {}
  }

  function updateStartButtonState() {
    if (!startBtn) return;
    const startIcon = startBtn.querySelector('i');
    const startLabel = startBtn.querySelector('.icon-label');
    if (robotStartButtonLoading) {
      startBtn.classList.remove('danger', 'success');
      startBtn.setAttribute('aria-label', 'Loading');
      startBtn.disabled = true;
      if (startIcon) {
        startIcon.className = 'fas fa-spinner fa-spin';
      }
      if (startLabel) {
        startLabel.textContent = 'Loading';
      }
      return;
    }
    const isRunning = !!robotStartTerminalId;
    startBtn.disabled = false;
    startBtn.classList.toggle('danger', isRunning);
    startBtn.classList.toggle('success', !isRunning);
    startBtn.setAttribute('aria-label', isRunning ? 'Stop' : 'Start');
    if (startIcon) {
      startIcon.className = isRunning ? 'fas fa-stop' : 'fas fa-play';
    }
    if (startLabel) {
      startLabel.textContent = isRunning ? 'Stop' : 'Start';
    }
  }

  function waitMs(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function setMapLoadingOverlay(visible, text) {
    if (!mapLoadingOverlay) return;
    if (visible && (threeWrap || threeRoot)) {
      const rect = (threeWrap || threeRoot).getBoundingClientRect();
      mapLoadingOverlay.style.left = rect.left + 'px';
      mapLoadingOverlay.style.top = rect.top + 'px';
      mapLoadingOverlay.style.width = rect.width + 'px';
      mapLoadingOverlay.style.height = rect.height + 'px';
    } else {
      mapLoadingOverlay.style.left = '0px';
      mapLoadingOverlay.style.top = '0px';
      mapLoadingOverlay.style.width = '0px';
      mapLoadingOverlay.style.height = '0px';
    }
    mapLoadingOverlay.classList.toggle('is-hidden', !visible);
    mapLoadingOverlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (mapLoadingText) {
      mapLoadingText.textContent = visible && text ? text : 'Loading...';
    }
  }

  function waitForNextScan(afterTimestamp) {
    return new Promise(function (resolve) {
      function hasFreshScan() {
        return (
          !!rosbridgeState.latestScan &&
          Array.isArray(rosbridgeState.latestScan.ranges) &&
          rosbridgeState.latestScan.ranges.length > 0 &&
          rosbridgeState.latestScanAt > afterTimestamp
        );
      }
      if (hasFreshScan()) {
        resolve();
        return;
      }
      const pollTimer = window.setInterval(function () {
        if (!hasFreshScan()) return;
        window.clearInterval(pollTimer);
        resolve();
      }, 120);
    });
  }

  function clearRosVisualLayers() {
    rosbridgeState.visualsEnabled = false;
    rosbridgeState.latestScan = null;
    rosbridgeState.latestScanAt = 0;
    rosbridgeState.latestMap = null;
    hasMapData = false;
    hideScanGeometry();
    mapMesh.visible = false;
    resizeGroundToMap(0, 0);
    updateLiveStatusPills();
  }

  function enableRosVisualLayers() {
    rosbridgeState.visualsEnabled = true;
    if (rosbridgeState.latestMap) {
      updateMapFromRosbridge(rosbridgeState.latestMap);
    }
  }

  function normalizeCommandLabel(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isRobotStartTerminalEntry(terminal) {
    const title = normalizeCommandLabel(terminal && terminal.title);
    return !!title && title === normalizeCommandLabel(robotStartCommand);
  }

  function applyRobotTerminalRegistry(terminals) {
    robotTerminalRegistryState.terminals = (Array.isArray(terminals) ? terminals : [])
      .map(function (terminal) {
        const target = String((terminal && terminal.target) || '');
        return {
          id: normalizeRobotTerminalId(terminal && terminal.id),
          title: sanitizeRobotTerminalTitle(terminal && terminal.title, target),
          target: target,
          sessionName: String((terminal && (terminal.session_name || terminal.sessionName)) || ''),
          bridgeRunId: String((terminal && (terminal.bridge_run_id || terminal.bridgeRunId)) || ''),
          host: String((terminal && terminal.host) || (ideTransportState.host || rosTargetHost || '')),
          port: Number((terminal && terminal.port) || ideTransportState.port || 8080) || 8080
        };
      })
      .filter(function (terminal) {
        return !!terminal.id;
      })
      .sort(function (a, b) {
        return String(a.id).localeCompare(String(b.id));
      });
    const currentRobotStartId = normalizeRobotTerminalId(robotStartTerminalId);
    const currentRobotStartTerminal = currentRobotStartId
      ? robotTerminalRegistryState.terminals.find(function (terminal) {
          return normalizeRobotTerminalId(terminal.id) === currentRobotStartId;
        }) || null
      : null;
    const discoveredRobotStartTerminal = robotTerminalRegistryState.terminals.find(function (terminal) {
      return isRobotStartTerminalEntry(terminal);
    }) || null;
    const nextRobotStartTerminal = currentRobotStartTerminal || discoveredRobotStartTerminal || null;
    const nextRobotStartId = normalizeRobotTerminalId(nextRobotStartTerminal && nextRobotStartTerminal.id);
    if (nextRobotStartId !== currentRobotStartId) {
      robotStartTerminalId = nextRobotStartId;
      saveRobotStartTerminalId();
    }
    updateStartButtonState();
    renderTerminalDropdown();
  }

  function fetchRobotTerminalRegistry() {
    if (!isIdeTransportConnected()) {
      applyRobotTerminalRegistry([]);
      return Promise.resolve([]);
    }
    return requestRobotBridgeWs({ type: 'LIST_TERMINALS' }, 'terminal_list').then(function (payload) {
      const terminals = Array.isArray(payload && payload.terminals) ? payload.terminals : [];
      applyRobotTerminalRegistry(terminals);
      return terminals;
    }).catch(function () {
      return requestRobotBridgeJson('GET', '/terminals').then(function (payload) {
        const terminals = Array.isArray(payload && payload.terminals) ? payload.terminals : [];
        applyRobotTerminalRegistry(terminals);
        return terminals;
      });
    }).catch(function (error) {
      console.warn('[ROS terminal] Failed to read terminal registry:', error.message || error);
      return [];
    });
  }

  function createRobotTerminalSession(target) {
    return requestRobotBridgeWs({
      type: 'OPEN_TERMINAL',
      target: target
    }, 'terminal_opened').then(function (payload) {
      const terminal = (payload && (payload.terminal || payload)) || {};
      const targetText = String(terminal.target || target);
      return {
        id: normalizeRobotTerminalId(terminal.id),
        title: sanitizeRobotTerminalTitle(terminal.title, targetText),
        target: targetText,
        sessionName: String(terminal.session_name || terminal.sessionName || ''),
        bridgeRunId: String(terminal.bridge_run_id || terminal.bridgeRunId || currentBridgeRunId || ''),
        host: String(terminal.host || (ideTransportState.host || rosTargetHost || '')),
        port: Number(terminal.port || ideTransportState.port || 8080) || 8080
      };
    }).catch(function () {
      return requestRobotBridgeJson('POST', '/terminals', {
        target: target
      });
    }).then(function (payload) {
      const terminal = (payload && (payload.terminal || payload)) || {};
      const targetText = String(terminal.target || target);
      return {
        id: normalizeRobotTerminalId(terminal.id),
        title: sanitizeRobotTerminalTitle(terminal.title, targetText),
        target: targetText,
        sessionName: String(terminal.session_name || terminal.sessionName || ''),
        bridgeRunId: String(terminal.bridge_run_id || terminal.bridgeRunId || currentBridgeRunId || ''),
        host: String(terminal.host || (ideTransportState.host || rosTargetHost || '')),
        port: Number(terminal.port || ideTransportState.port || 8080) || 8080
      };
    });
  }

  function renameRobotTerminalSession(id, title) {
    const terminalId = normalizeRobotTerminalId(id);
    if (!terminalId) return Promise.resolve();
    return requestRobotBridgeWs({
      type: 'RENAME_TERMINAL',
      id: terminalId,
      title: title
    }, ['terminal_renamed', 'terminal_list']).then(function () {
      return fetchRobotTerminalRegistry();
    }).catch(function () {
      return requestRobotBridgeJson('PATCH', '/terminals/' + encodeURIComponent(terminalId), {
        title: title
      }).then(function () {
        return fetchRobotTerminalRegistry();
      });
    }).catch(function (error) {
      console.warn('[ROS terminal] Failed to rename terminal:', error.message || error);
    });
  }

  function closeRobotTerminalSession(id) {
    const terminalId = normalizeRobotTerminalId(id);
    if (!terminalId) return Promise.resolve();
    return requestRobotBridgeWs({
      type: 'CLOSE_TERMINAL',
      id: terminalId
    }, ['terminal_closed', 'terminal_list']).then(function () {
      return fetchRobotTerminalRegistry();
    }).catch(function () {
      return requestRobotBridgeJson('DELETE', '/terminals/' + encodeURIComponent(terminalId))
        .then(function () {
          return fetchRobotTerminalRegistry();
        });
    });
  }

  function openManagedRobotStartTerminal() {
    return createRobotTerminalSession(getCurrentRosSshTarget()).then(function (createdTerminal) {
      robotStartTerminalId = normalizeRobotTerminalId(createdTerminal.id);
      saveRobotStartTerminalId();
      updateStartButtonState();
      return renameRobotTerminalSession(createdTerminal.id, robotStartCommand).then(function () {
        createdTerminal.title = robotStartCommand;
        return createdTerminal;
      }).catch(function () {
        createdTerminal.title = robotStartCommand;
        return createdTerminal;
      });
    }).then(function (createdTerminal) {
      return ipcRenderer.invoke('create-ros-terminal', {
        id: createdTerminal.id,
        title: robotStartCommand,
        target: createdTerminal.target,
        host: createdTerminal.host,
        port: createdTerminal.port,
        bridgeRunId: createdTerminal.bridgeRunId,
        sessionName: createdTerminal.sessionName,
        autoCommand: robotStartCommand,
        hidden: true
      });
    }).then(function (createdWindow) {
      upsertRosTerminalWindowState({
        id: createdWindow.id,
        title: robotStartCommand,
        target: createdWindow.target,
        host: createdWindow.host,
        port: createdWindow.port,
        bridgeRunId: createdWindow.bridgeRunId,
        sessionName: createdWindow.sessionName,
        hidden: true,
        focused: false
      });
      return fetchRobotTerminalRegistry();
    });
  }

  function stopManagedRobotStartTerminal() {
    const terminalId = normalizeRobotTerminalId(robotStartTerminalId);
    if (!terminalId) return Promise.resolve();
    robotStartTerminalId = '';
    saveRobotStartTerminalId();
    updateStartButtonState();
    clearRosVisualLayers();
    return closeRobotTerminalSession(terminalId).catch(function () {}).then(function () {
      ipcRenderer.send('close-ros-terminal-window', terminalId);
      applyRosTerminalWindowsState(
        electronTerminalWindowsState.windows.filter(function (terminalWindow) {
          return normalizeRobotTerminalId(terminalWindow.id) !== terminalId;
        })
      );
    });
  }

  function syncTerminalBridgeRunId() {
    if (!isIdeTransportConnected()) {
      currentBridgeRunId = '';
      applyRobotTerminalRegistry([]);
      renderTerminalDropdown();
      return Promise.resolve('');
    }
    return requestRobotBridgeStatus().then(function (status) {
      const bridgeRunId = String((status && status.bridge_run_id) || '').trim();
      currentBridgeRunId = bridgeRunId;
      fetchRobotTerminalRegistry();
      renderTerminalDropdown();
      if (bridgeRunId) {
        ipcRenderer.send('sync-ros-terminal-bridge-run', {
          host: (ideTransportState.host || rosTargetHost || '').trim(),
          port: Number(ideTransportState.port) || 8080,
          bridgeRunId: bridgeRunId
        });
      }
      return bridgeRunId;
    }).catch(function (error) {
      console.warn('[ROS terminal] Failed to read bridge status:', error.message || error);
      currentBridgeRunId = '';
      applyRobotTerminalRegistry([]);
      renderTerminalDropdown();
      return '';
    });
  }

  function getRosbridgeUrl() {
    return 'ws://' + (ideTransportState.host || rosTargetHost) + ':9090';
  }

  function disconnectRosbridgeSocket() {
    if (rosbridgeState.reconnectTimer) {
      clearTimeout(rosbridgeState.reconnectTimer);
      rosbridgeState.reconnectTimer = null;
    }
    const socket = rosbridgeState.socket;
    rosbridgeState.connected = false;
    rosbridgeState.socket = null;
    clearRosVisualLayers();
    if (socket) {
      try {
        socket.close();
      } catch (error) {}
    }
  }

  function syncRosbridgeWithIdeTransport() {
    if (isIdeTransportConnected()) {
      connectRosbridge();
    } else {
      disconnectRosbridgeSocket();
    }
  }

  function applyIdeTransportState(payload) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    ideTransportState.connected = !!payload.connected;
    ideTransportState.transportType = payload.transportType || '';

    if (payload.host) {
      ideTransportState.host = String(payload.host).trim() || ideTransportState.host;
    }
    if (payload.port) {
      ideTransportState.port = Number(payload.port) || ideTransportState.port;
    }
    if (sshTargetInput) {
      sshTargetInput.value = getCurrentRosSshTarget();
    }

    syncTerminalBridgeRunId();
    syncRosbridgeWithIdeTransport();
    updateLiveStatusPills();
  }

  function resizeRenderer() {
    const clientWidth = threeRoot.clientWidth;
    const clientHeight = threeRoot.clientHeight;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }

  function fitTerminal() {
    if (terminalState.fitAddon) {
      try {
        terminalState.fitAddon.fit();
      } catch (error) {}
    }
  }

  function savePanelState() {
    localStorage.setItem('ros_panel_width', String(panelState.width));
    localStorage.setItem('ros_panel_collapsed', panelState.collapsed ? '1' : '0');
  }

  function applyPanelState() {
    if (!layoutContainer) return;
    layoutContainer.style.setProperty('--ros-panel-width', panelState.width + 'px');
    layoutContainer.style.setProperty('--ros-panel-visible-width', panelState.collapsed ? '0px' : panelState.width + 'px');
    layoutContainer.classList.toggle('panel-collapsed', panelState.collapsed);
    if (togglePanelBtn) {
      togglePanelBtn.setAttribute('aria-expanded', panelState.collapsed ? 'false' : 'true');
    }
    setTimeout(function () {
      resizeRenderer();
      fitTerminal();
    }, 0);
  }

  function animatePanelLayout() {
    if (panelAnimationFrame) {
      cancelAnimationFrame(panelAnimationFrame);
    }
    panelAnimationFrame = requestAnimationFrame(function () {
      panelAnimationFrame = null;
      setTimeout(function () {
        resizeRenderer();
        fitTerminal();
      }, panelAnimationDuration + 30);
    });
  }

  function setPanelCollapsed(collapsed) {
    if (!layoutContainer) return;
    if (panelAnimationTimer) {
      clearTimeout(panelAnimationTimer);
      panelAnimationTimer = null;
    }

    if (collapsed === panelState.collapsed) {
      return;
    }
    panelState.collapsed = collapsed;
    savePanelState();
    applyPanelState();
    animatePanelLayout();
  }

  function initializePanelState() {
    const storedWidth = parseInt(localStorage.getItem('ros_panel_width') || '', 10);
    if (!Number.isNaN(storedWidth)) {
      panelState.width = Math.max(panelState.minWidth, Math.min(panelState.maxWidth, storedWidth));
    }
    panelState.collapsed = false;
    applyPanelState();
  }

  function initializePanelControls() {
    initializePanelState();

    if (togglePanelBtn) {
      togglePanelBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        setPanelCollapsed(!panelState.collapsed);
      });
    }

    if (panelResizeHandle && panelResizable) {
      panelResizeHandle.addEventListener('pointerdown', function (event) {
        if (event.target === togglePanelBtn || (togglePanelBtn && togglePanelBtn.contains(event.target))) {
          return;
        }
        if (window.innerWidth <= 980) {
          return;
        }
        panelState.dragging = true;
        panelState.collapsed = false;
        if (panelResizeHandle.setPointerCapture) {
          panelResizeHandle.setPointerCapture(event.pointerId);
        }
      });

      panelResizeHandle.addEventListener('pointermove', function (event) {
        if (!panelState.dragging || !layoutContainer) return;
        const containerRect = layoutContainer.getBoundingClientRect();
        const nextWidth = containerRect.right - event.clientX;
        panelState.width = Math.max(panelState.minWidth, Math.min(panelState.maxWidth, Math.round(nextWidth)));
        applyPanelState();
      });

      function endPanelDrag(event) {
        if (!panelState.dragging) return;
        panelState.dragging = false;
        savePanelState();
        if (event && panelResizeHandle.releasePointerCapture && panelResizeHandle.hasPointerCapture && panelResizeHandle.hasPointerCapture(event.pointerId)) {
          panelResizeHandle.releasePointerCapture(event.pointerId);
        }
      }

      panelResizeHandle.addEventListener('pointerup', endPanelDrag);
      panelResizeHandle.addEventListener('pointercancel', endPanelDrag);
    }
  }

  function openExternalSshTerminal() {
    setStatus('กำลังเปิด SSH terminal');
    try {
      ipcRenderer.send('show-ros-terminal', getCurrentRosSshTarget());
    } catch (error) {
      console.error('[ROS] Failed to open SSH terminal:', error);
      setStatus('เปิด SSH terminal ไม่สำเร็จ');
    }
  }

  function normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  function move(dir) {
    if (dir === 'up') {
      targetPosition.z -= movementStep;
      targetRotation = 0;
      setStatus('คำสั่งล่าสุด: เดินหน้า');
    } else if (dir === 'down') {
      targetPosition.z += movementStep;
      targetRotation = Math.PI;
      setStatus('คำสั่งล่าสุด: ถอยหลัง');
    } else if (dir === 'left') {
      targetRotation = Math.PI / 2;
      setStatus('คำสั่งล่าสุด: หมุนซ้าย');
    } else if (dir === 'right') {
      targetRotation = -Math.PI / 2;
      setStatus('คำสั่งล่าสุด: หมุนขวา');
    }
  }

  function worldToGrid(value) {
    return Math.max(0, Math.min(plannerCols - 1, Math.floor((value + plannerBounds) / plannerCellSize)));
  }

  function gridToWorld(cellX, cellZ) {
    return {
      x: (-plannerBounds) + (cellX * plannerCellSize) + (plannerCellSize / 2),
      z: (-plannerBounds) + (cellZ * plannerCellSize) + (plannerCellSize / 2)
    };
  }

  function getCellKey(cellX, cellZ) {
    return cellX + ',' + cellZ;
  }

  function canMoveRobotTo(x, z, collisionRadius) {
    const radius = typeof collisionRadius === 'number' ? collisionRadius : robotCollisionRadius;

    for (let i = 0; i < walls.length; i += 1) {
      const wall = walls[i];
      const halfWidth = wall.geometry.parameters.width / 2;
      const halfDepth = wall.geometry.parameters.depth / 2;
      const nearestX = Math.max(wall.position.x - halfWidth, Math.min(x, wall.position.x + halfWidth));
      const nearestZ = Math.max(wall.position.z - halfDepth, Math.min(z, wall.position.z + halfDepth));
      const dx = x - nearestX;
      const dz = z - nearestZ;

      if ((dx * dx) + (dz * dz) < (radius * radius)) {
        return false;
      }
    }

    return true;
  }

  function tryMoveRobot(nextX, nextZ) {
    if (canMoveRobotTo(nextX, nextZ)) {
      robot.position.x = nextX;
      robot.position.z = nextZ;
      return true;
    }

    if (canMoveRobotTo(nextX, robot.position.z)) {
      robot.position.x = nextX;
      return true;
    }

    if (canMoveRobotTo(robot.position.x, nextZ)) {
      robot.position.z = nextZ;
      return true;
    }

    return false;
  }

  function isBlockedCell(cellX, cellZ) {
    const world = gridToWorld(cellX, cellZ);
    return !canMoveRobotTo(world.x, world.z, plannerClearanceRadius);
  }

  function heuristic(ax, az, bx, bz) {
    return Math.abs(ax - bx) + Math.abs(az - bz);
  }

  function reconstructPath(cameFrom, goalKey) {
    const path = [];
    let currentKey = goalKey;

    while (currentKey) {
      const parts = currentKey.split(',');
      path.unshift(gridToWorld(parseInt(parts[0], 10), parseInt(parts[1], 10)));
      currentKey = cameFrom[currentKey];
    }

    return path;
  }

  function hasLineOfSight(startPoint, endPoint) {
    return hasLineOfSightWithRadius(startPoint, endPoint, pathClearanceRadius);
  }

  function hasLineOfSightWithRadius(startPoint, endPoint, clearanceRadius) {
    const dx = endPoint.x - startPoint.x;
    const dz = endPoint.z - startPoint.z;
    const distance = Math.hypot(dx, dz);

    if (distance < 1e-6) {
      return true;
    }

    const steps = Math.max(2, Math.ceil(distance / (plannerCellSize * 0.5)));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const sampleX = startPoint.x + (dx * t);
      const sampleZ = startPoint.z + (dz * t);
      if (!canMoveRobotTo(sampleX, sampleZ, clearanceRadius)) {
        return false;
      }
    }

    return true;
  }

  function getAutopilotLookaheadIndex() {
    const robotPoint = { x: robot.position.x, z: robot.position.z };
    let bestIndex = autopilotState.pathIndex;

    for (let i = autopilotState.pathIndex; i < autopilotState.path.length; i += 1) {
      if (!hasLineOfSightWithRadius(robotPoint, autopilotState.path[i], robotCollisionRadius * 0.92)) {
        break;
      }
      bestIndex = i;
    }

    return bestIndex;
  }

  function getClosestPathIndex() {
    let closestIndex = autopilotState.pathIndex;
    let closestDistance = Infinity;

    for (let i = autopilotState.pathIndex; i < autopilotState.path.length; i += 1) {
      const dx = autopilotState.path[i].x - robot.position.x;
      const dz = autopilotState.path[i].z - robot.position.z;
      const distance = (dx * dx) + (dz * dz);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  function getPathTargetIndex() {
    const closestIndex = getClosestPathIndex();
    const lookaheadIndex = Math.min(autopilotState.path.length - 1, closestIndex + 2);
    return Math.max(closestIndex, lookaheadIndex);
  }

  function simplifyPath(path) {
    if (path.length <= 2) {
      return path.slice();
    }

    const simplified = [path[0]];
    let anchorIndex = 0;

    while (anchorIndex < path.length - 1) {
      let furthestIndex = anchorIndex + 1;

      for (let i = anchorIndex + 1; i < path.length; i += 1) {
        if (!hasLineOfSight(path[anchorIndex], path[i])) {
          break;
        }
        furthestIndex = i;
      }

      simplified.push(path[furthestIndex]);
      anchorIndex = furthestIndex;
    }

    return simplified;
  }

  function densifyPath(path) {
    if (path.length <= 1) {
      return path.slice();
    }

    const densePath = [path[0]];

    for (let i = 1; i < path.length; i += 1) {
      const start = path[i - 1];
      const end = path[i];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const distance = Math.hypot(dx, dz);
      const segments = Math.max(1, Math.ceil(distance / 0.18));

      for (let step = 1; step <= segments; step += 1) {
        const t = step / segments;
        densePath.push({
          x: start.x + (dx * t),
          z: start.z + (dz * t)
        });
      }
    }

    return densePath;
  }

  function buildSmoothPath(path) {
    if (path.length <= 2) {
      return densifyPath(path);
    }

    const curvePoints = [];
    for (let i = 0; i < path.length; i += 1) {
      curvePoints.push(new THREE.Vector3(path[i].x, 0, path[i].z));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal', 0.35);
    const divisions = Math.max(path.length * 10, 40);
    const sampled = [];

    for (let i = 0; i <= divisions; i += 1) {
      const point = curve.getPoint(i / divisions);
      sampled.push({ x: point.x, z: point.z });
    }

    return sampled;
  }

  function updatePathVisual(path) {
    if (!path.length) {
      pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      return;
    }

    const vertices = [];
    for (let i = 0; i < path.length; i += 1) {
      vertices.push(path[i].x, 0, path[i].z);
    }
    pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  }

  function planPath(startX, startZ, goalX, goalZ) {
    const startCellX = worldToGrid(startX);
    const startCellZ = worldToGrid(startZ);
    const goalCellX = worldToGrid(goalX);
    const goalCellZ = worldToGrid(goalZ);
    const startKey = getCellKey(startCellX, startCellZ);
    const goalKey = getCellKey(goalCellX, goalCellZ);

    if (isBlockedCell(goalCellX, goalCellZ)) {
      return [];
    }

    const open = [{ x: startCellX, z: startCellZ, f: heuristic(startCellX, startCellZ, goalCellX, goalCellZ) }];
    const openMap = {};
    const cameFrom = {};
    const gScore = {};
    openMap[startKey] = open[0];
    gScore[startKey] = 0;

    while (open.length) {
      open.sort(function (a, b) { return a.f - b.f; });
      const current = open.shift();
      const currentKey = getCellKey(current.x, current.z);
      delete openMap[currentKey];

      if (current.x === goalCellX && current.z === goalCellZ) {
        return reconstructPath(cameFrom, currentKey);
      }

      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dz === 0) continue;
          const nextX = current.x + dx;
          const nextZ = current.z + dz;

          if (nextX < 0 || nextZ < 0 || nextX >= plannerCols || nextZ >= plannerRows) continue;
          if (isBlockedCell(nextX, nextZ)) continue;

          if (dx !== 0 && dz !== 0) {
            if (isBlockedCell(current.x + dx, current.z) || isBlockedCell(current.x, current.z + dz)) {
              continue;
            }
          }

          const nextKey = getCellKey(nextX, nextZ);
          const stepCost = dx !== 0 && dz !== 0 ? 1.414 : 1;
          const tentativeG = gScore[currentKey] + stepCost;

          if (gScore[nextKey] === undefined || tentativeG < gScore[nextKey]) {
            cameFrom[nextKey] = currentKey;
            gScore[nextKey] = tentativeG;
            const fScore = tentativeG + heuristic(nextX, nextZ, goalCellX, goalCellZ);

            if (openMap[nextKey]) {
              openMap[nextKey].f = fScore;
            } else {
              const node = { x: nextX, z: nextZ, f: fScore };
              open.push(node);
              openMap[nextKey] = node;
            }
          }
        }
      }
    }

    return [];
  }

  function setAutopilotGoal(goalX, goalZ, goalYaw) {
    const plannedPath = planPath(robot.position.x, robot.position.z, goalX, goalZ);
    const simplifiedPath = simplifyPath(plannedPath);
    const smoothSource = simplifiedPath.length >= 3 ? simplifiedPath : plannedPath;
    const path = buildSmoothPath(smoothSource);

    if (!path.length) {
      autopilotState.goal = null;
      autopilotState.path = [];
      autopilotState.pathIndex = 0;
      autopilotState.enabled = false;
      updatePathVisual([]);
      setStatus('ไม่พบเส้นทางไปยังเป้าหมาย');
      return false;
    }

    autopilotState.goal = {
      x: goalX,
      z: goalZ,
      yaw: typeof goalYaw === 'number' ? normalizeAngle(goalYaw) : null
    };
    autopilotState.path = path;
    autopilotState.pathIndex = Math.min(1, path.length - 1);
    autopilotState.blockedFrames = 0;
    updatePathVisual(path);
    setStatus('คำนวณเส้นทางสำเร็จ');
    return true;
  }

  function stopAutopilot() {
    autopilotState.enabled = false;
    cancelGoalSelection();
    autopilotState.goal = null;
    autopilotState.path = [];
    autopilotState.pathIndex = 0;
    autopilotState.blockedFrames = 0;
    updatePathVisual([]);
  }

  function getWorldPointFromPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointer, camera);
    const hitPoint = new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane, hitPoint) ? hitPoint : null;
  }

  function intersectRayWithWall(originX, originZ, dirX, dirZ, wall) {
    const halfWidth = wall.geometry.parameters.width / 2;
    const halfDepth = wall.geometry.parameters.depth / 2;
    const minX = wall.position.x - halfWidth;
    const maxX = wall.position.x + halfWidth;
    const minZ = wall.position.z - halfDepth;
    const maxZ = wall.position.z + halfDepth;

    let tMin = -Infinity;
    let tMax = Infinity;

    if (Math.abs(dirX) < 1e-6) {
      if (originX < minX || originX > maxX) {
        return null;
      }
    } else {
      const tx1 = (minX - originX) / dirX;
      const tx2 = (maxX - originX) / dirX;
      tMin = Math.max(tMin, Math.min(tx1, tx2));
      tMax = Math.min(tMax, Math.max(tx1, tx2));
    }

    if (Math.abs(dirZ) < 1e-6) {
      if (originZ < minZ || originZ > maxZ) {
        return null;
      }
    } else {
      const tz1 = (minZ - originZ) / dirZ;
      const tz2 = (maxZ - originZ) / dirZ;
      tMin = Math.max(tMin, Math.min(tz1, tz2));
      tMax = Math.min(tMax, Math.max(tz1, tz2));
    }

    if (tMax < 0 || tMin > tMax) {
      return null;
    }

    const distance = tMin >= 0 ? tMin : tMax;
    if (distance < 0 || distance > lidarMaxRange) {
      return null;
    }

    return distance;
  }

  function getLidarHitDistance(originX, originZ, dirX, dirZ) {
    let nearest = lidarMaxRange;

    for (let i = 0; i < walls.length; i += 1) {
      const hitDistance = intersectRayWithWall(originX, originZ, dirX, dirZ, walls[i]);
      if (hitDistance !== null && hitDistance < nearest) {
        nearest = hitDistance;
      }
    }

    return nearest;
  }

  function scheduleRosbridgeReconnect() {
    if (!isIdeTransportConnected()) {
      return;
    }
    if (rosbridgeState.reconnectTimer) return;
    rosbridgeState.reconnectTimer = setTimeout(function () {
      rosbridgeState.reconnectTimer = null;
      connectRosbridge();
    }, rosbridgeConfig.reconnectMs);
  }

  function connectRosbridge() {
    if (!isIdeTransportConnected()) {
      disconnectRosbridgeSocket();
      return;
    }
    if (rosbridgeState.socket && (rosbridgeState.socket.readyState === WebSocket.OPEN || rosbridgeState.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const socket = new WebSocket(getRosbridgeUrl());
      rosbridgeState.socket = socket;

      socket.addEventListener('open', function () {
        rosbridgeState.connected = true;
        updateLiveStatusPills();
        setStatus('เชื่อมต่อ rosbridge แล้ว');
        socket.send(JSON.stringify({
          op: 'subscribe',
          topic: rosbridgeConfig.lidarTopic,
          type: 'sensor_msgs/LaserScan',
          throttle_rate: 0,
          queue_length: 1
        }));
        socket.send(JSON.stringify({
          op: 'subscribe',
          topic: rosbridgeConfig.imuTopic,
          type: 'sensor_msgs/Imu',
          throttle_rate: 0,
          queue_length: 1
        }));
        socket.send(JSON.stringify({
          op: 'subscribe',
          topic: rosbridgeConfig.mapTopic,
          type: 'nav_msgs/OccupancyGrid',
          throttle_rate: 0,
          queue_length: 1
        }));
        socket.send(JSON.stringify({
          op: 'subscribe',
          topic: rosbridgeConfig.amclPoseTopic,
          type: 'geometry_msgs/PoseWithCovarianceStamped',
          throttle_rate: 0,
          queue_length: 1
        }));
        socket.send(JSON.stringify({
          op: 'subscribe',
          topic: rosbridgeConfig.odomTopic,
          type: 'nav_msgs/Odometry',
          throttle_rate: 0,
          queue_length: 1
        }));
        socket.send(JSON.stringify({
          op: 'subscribe',
          topic: rosbridgeConfig.tfTopic,
          type: 'tf2_msgs/TFMessage',
          throttle_rate: 0,
          queue_length: 1
        }));
      });

      socket.addEventListener('message', function (event) {
        try {
          const payload = JSON.parse(event.data);
          if (payload.op === 'publish' && payload.topic === rosbridgeConfig.lidarTopic && payload.msg) {
            rosbridgeState.latestScan = payload.msg;
            rosbridgeState.latestScanAt = Date.now();
          } else if (payload.op === 'publish' && payload.topic === rosbridgeConfig.imuTopic && payload.msg) {
            rosbridgeState.latestImu = payload.msg;
            rosbridgeState.latestImuAt = Date.now();
          } else if (payload.op === 'publish' && payload.topic === rosbridgeConfig.mapTopic && payload.msg) {
            rosbridgeState.latestMap = payload.msg;
            if (rosbridgeState.visualsEnabled) {
              updateMapFromRosbridge(payload.msg);
            }
          } else if (payload.op === 'publish' && payload.topic === rosbridgeConfig.amclPoseTopic && payload.msg && payload.msg.pose && payload.msg.pose.pose) {
            updateRobotPoseFromRos(payload.msg.pose.pose, 'amcl');
          } else if (payload.op === 'publish' && payload.topic === rosbridgeConfig.odomTopic && payload.msg && payload.msg.pose && payload.msg.pose.pose) {
            updateRobotPoseFromRos(payload.msg.pose.pose, 'odom');
          } else if (payload.op === 'publish' && payload.topic === rosbridgeConfig.tfTopic && payload.msg) {
            updateRobotPoseFromTf(payload.msg);
          }
          updateLiveStatusPills();
        } catch (error) {
          console.error('[ROS] Invalid rosbridge message', error);
        }
      });

      function handleSocketClose() {
        rosbridgeState.connected = false;
        rosbridgeState.latestScan = null;
        rosbridgeState.latestScanAt = 0;
        rosbridgeState.latestImu = null;
        rosbridgeState.latestImuAt = 0;
        rosbridgeState.latestMap = null;
        rosbridgeState.latestPoseAt = 0;
        rosbridgeState.latestPoseSource = '';
        if (rosbridgeState.socket === socket) {
          rosbridgeState.socket = null;
        }
        updateLiveStatusPills();
        scheduleRosbridgeReconnect();
      }

      socket.addEventListener('close', handleSocketClose);
      socket.addEventListener('error', function () {
        handleSocketClose();
      });
    } catch (error) {
      console.error('[ROS] Failed to connect rosbridge', error);
      updateLiveStatusPills();
      scheduleRosbridgeReconnect();
    }
  }

  function updateScanGeometryFromHits(lidarOriginX, lidarOriginZ, hitPoints) {
    if (!layerVisibilityState.scan) {
      hideScanGeometry();
      return;
    }
    const scanAreaVertices = [];

    for (let i = 0; i < scanPoints.length; i += 1) {
      const point = hitPoints[i];
      const nextPoint = hitPoints[(i + 1) % hitPoints.length];
      const scanPoint = scanPoints[i];

      if (!point) {
        scanPoint.visible = false;
        continue;
      }

      scanPoint.visible = true;
      scanPoint.position.set(point.x, 0.08, point.z);

      if (!nextPoint) {
        continue;
      }

      scanAreaVertices.push(
        lidarOriginX, 0, lidarOriginZ,
        point.x, 0, point.z,
        nextPoint.x, 0, nextPoint.z
      );
    }

    scanAreaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(scanAreaVertices, 3));
    scanAreaMesh.visible = scanAreaVertices.length > 0;

    if (scanAreaVertices.length) {
      scanAreaGeometry.computeVertexNormals();
    }
  }

  function hideScanGeometry() {
    for (let i = 0; i < scanPoints.length; i += 1) {
      scanPoints[i].visible = false;
    }
    scanAreaGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    scanAreaMesh.visible = false;
  }

  function quaternionToYaw(quaternion) {
    if (!quaternion || typeof quaternion !== 'object') {
      return 0;
    }
    const x = Number(quaternion.x) || 0;
    const y = Number(quaternion.y) || 0;
    const z = Number(quaternion.z) || 0;
    const w = Number(quaternion.w);
    const safeW = Number.isFinite(w) ? w : 1;
    const siny = 2 * ((safeW * z) + (x * y));
    const cosy = 1 - (2 * ((y * y) + (z * z)));
    return Math.atan2(siny, cosy);
  }

  function updateRobotPoseFromRos(poseMessage, source) {
    if (!poseMessage || !poseMessage.position || !poseMessage.orientation) {
      return false;
    }

    const now = Date.now();
    if (source === 'odom' && rosbridgeState.latestPoseSource === 'amcl' && (now - rosbridgeState.latestPoseAt) < 1200) {
      return false;
    }

    const x = Number(poseMessage.position.x);
    const y = Number(poseMessage.position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }

    const rosYaw = quaternionToYaw(poseMessage.orientation);
    const sceneYaw = normalizeAngle(rosYaw + (Math.PI / 2) + Math.PI);
    robot.position.set(x, 0, -y);
    robot.rotation.y = sceneYaw;
    targetPosition.set(robot.position.x, 0, robot.position.z);
    targetRotation = robot.rotation.y;
    rosbridgeState.latestPoseAt = now;
    rosbridgeState.latestPoseSource = source || '';
    return true;
  }

  function updateRobotPoseFromTf(tfMessage) {
    if (!tfMessage || !Array.isArray(tfMessage.transforms) || !tfMessage.transforms.length) {
      return false;
    }

    const preferredFrames = ['base_link', 'base_footprint', 'base_stabilized', 'base_laser'];
    let selected = null;
    for (let i = 0; i < preferredFrames.length; i += 1) {
      const frame = preferredFrames[i];
      selected = tfMessage.transforms.find(function (item) {
        return item &&
          String(item.child_frame_id || '').replace(/^\//, '') === frame &&
          item.transform &&
          item.transform.translation &&
          item.transform.rotation;
      });
      if (selected) break;
    }

    if (!selected) {
      return false;
    }

    return updateRobotPoseFromRos({
      position: selected.transform.translation,
      orientation: selected.transform.rotation
    }, 'tf');
  }

  function updateMapFromRosbridge(mapMessage) {
    if (!mapMessage || !mapMessage.info || !Array.isArray(mapMessage.data)) {
      hasMapData = false;
      mapMesh.visible = false;
      return false;
    }

    const width = mapMessage.info.width;
    const height = mapMessage.info.height;
    const resolution = mapMessage.info.resolution;

    if (!width || !height || !resolution || !mapContext) {
      hasMapData = false;
      mapMesh.visible = false;
      return false;
    }

    if (mapCanvas.width !== width || mapCanvas.height !== height) {
      mapCanvas.width = width;
      mapCanvas.height = height;
    }

    const imageData = mapContext.createImageData(width, height);
    const pixels = imageData.data;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sourceIndex = x + (y * width);
        const destY = height - 1 - y;
        const destIndex = (x + (destY * width)) * 4;
        const value = mapMessage.data[sourceIndex];

        let shade = 255;

        if (value < 0) {
          // Unknown cells stay opaque (no transparency).
          shade = 235;
        } else {
          const clamped = Math.max(0, Math.min(100, value));
          if (clamped <= 15) {
            // Free space is solid white.
            shade = 255;
          } else {
            const normalized = (clamped - 15) / 85;
            shade = Math.round(250 - (normalized * 220));
          }
        }

        pixels[destIndex] = shade;
        pixels[destIndex + 1] = shade;
        pixels[destIndex + 2] = shade;
        pixels[destIndex + 3] = 255;
      }
    }

    mapContext.putImageData(imageData, 0, 0);
    mapTexture.needsUpdate = true;

    const mapWidthMeters = width * resolution;
    const mapHeightMeters = height * resolution;
    resizeGroundToMap(mapWidthMeters, mapHeightMeters);
    const originPose = mapMessage.info.origin || {};
    const origin = originPose.position || { x: 0, y: 0 };
    const mapYaw = quaternionToYaw(originPose.orientation);
    const halfWidth = mapWidthMeters / 2;
    const halfHeight = mapHeightMeters / 2;
    const cosYaw = Math.cos(mapYaw);
    const sinYaw = Math.sin(mapYaw);
    const centerX = origin.x + (halfWidth * cosYaw) - (halfHeight * sinYaw);
    const centerZ = -(origin.y + (halfWidth * sinYaw) + (halfHeight * cosYaw));

    mapMesh.geometry.dispose();
    mapMesh.geometry = new THREE.PlaneGeometry(mapWidthMeters, mapHeightMeters);
    mapMesh.rotation.set(-Math.PI / 2, -mapYaw, 0);
    mapMesh.position.set(
      centerX,
      0.002,
      centerZ
    );
    hasMapData = true;
    mapMesh.visible = !!layerVisibilityState.map;
    return true;
  }

  function updateScanFromRosbridge() {
    if (!rosbridgeState.visualsEnabled) {
      hideScanGeometry();
      return false;
    }
    if (!rosbridgeState.latestScan || !Array.isArray(rosbridgeState.latestScan.ranges) || !rosbridgeState.latestScan.ranges.length) {
      return false;
    }

    const scan = rosbridgeState.latestScan;
    const ranges = scan.ranges;
    const angleMin = typeof scan.angle_min === 'number' ? scan.angle_min : -Math.PI;
    const angleIncrement = typeof scan.angle_increment === 'number' ? scan.angle_increment : ((Math.PI * 2) / Math.max(1, ranges.length));
    const rangeMax = typeof scan.range_max === 'number' && Number.isFinite(scan.range_max) ? scan.range_max : lidarMaxRange;
    const robotX = robot.position.x;
    const robotZ = robot.position.z;
    const forwardYaw = robot.rotation.y;
    const lidarOriginX = robotX + (Math.sin(forwardYaw) * robotDimensions.lidarForwardOffset);
    const lidarOriginZ = robotZ + (Math.cos(forwardYaw) * robotDimensions.lidarForwardOffset);
    const hitPoints = [];

    for (let i = 0; i < scanPoints.length; i += 1) {
      const sourceIndex = Math.min(ranges.length - 1, Math.floor((i / scanPoints.length) * ranges.length));
      const rawRange = ranges[sourceIndex];
      if (!Number.isFinite(rawRange)) {
        hitPoints.push(null);
        continue;
      }

      const distance = Math.max(0, rawRange);
      const angle = angleMin + (sourceIndex * angleIncrement);
      const worldAngle = forwardYaw + angle + Math.PI + scanYawOffset;
      hitPoints.push({
        x: lidarOriginX - (Math.cos(worldAngle) * distance),
        z: lidarOriginZ + (Math.sin(worldAngle) * distance)
      });
    }

    updateScanGeometryFromHits(lidarOriginX, lidarOriginZ, hitPoints);
    return true;
  }

  function updateSimulatedScan() {
    const robotX = robot.position.x;
    const robotZ = robot.position.z;
    const lidarYaw = robot.rotation.y + Math.PI + scanYawOffset;
    const lidarOriginX = robotX + (Math.sin(lidarYaw) * robotDimensions.lidarForwardOffset);
    const lidarOriginZ = robotZ + (Math.cos(lidarYaw) * robotDimensions.lidarForwardOffset);
    const hitPoints = [];

    for (let i = 0; i < scanPoints.length; i += 1) {
      const angle = (i / scanPoints.length) * Math.PI * 2;
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);
      const radius = getLidarHitDistance(lidarOriginX, lidarOriginZ, dirX, dirZ);
      hitPoints.push({
        x: lidarOriginX - (dirX * radius),
        z: lidarOriginZ + (dirZ * radius)
      });
    }

    updateScanGeometryFromHits(lidarOriginX, lidarOriginZ, hitPoints);
  }

  function getJoystickDrive() {
    const nx = joystickState.x / joystickState.radius;
    const ny = joystickState.y / joystickState.radius;
    const magnitude = Math.hypot(nx, ny);

    if (magnitude < joystickDeadZone) {
      return { linear: 0, angular: 0, active: false };
    }

    return {
      linear: ny * maxLinearSpeed,
      angular: nx * maxAngularSpeed,
      active: true
    };
  }

  function moveByJoystick(nx, ny) {
    setJoystickVector(nx, ny);
  }

  function stopRobot() {
    targetPosition.copy(robot.position);
    targetRotation = robot.rotation.y;
    autopilotState.enabled = false;
    setStatus('หยุดฉุกเฉิน');
  }

  function clearGoalState(statusText) {
    autopilotState.enabled = false;
    cancelGoalSelection();
    autopilotState.goal = null;
    autopilotState.path = [];
    autopilotState.pathIndex = 0;
    autopilotState.blockedFrames = 0;
    updatePathVisual([]);
    if (statusText) setStatus(statusText);
  }

  function formatPoseTableNumber(value) {
    return Number(value || 0).toFixed(2);
  }

  function getNextPoseName() {
    let index = 1;
    while (poseTableState.items.some(function (item) { return item.name === ('P' + index); })) {
      index += 1;
    }
    return 'P' + index;
  }

  function isDuplicatePoseName(name, excludedId) {
    const normalized = String(name || '').trim().toLowerCase();
    if (!normalized) return false;
    return poseTableState.items.some(function (item) {
      return item.id !== excludedId && String(item.name || '').trim().toLowerCase() === normalized;
    });
  }

  function savePoseTableState() {
    try {
      localStorage.setItem(POSE_TABLE_STORAGE_KEY, JSON.stringify({
        items: poseTableState.items,
        nextId: poseTableState.nextId,
        homeId: poseTableState.homeId
      }));
    } catch (error) {}
  }

  function resetPoseTableState() {
    poseTableState.items = [];
    poseTableState.selectedIds = [];
    poseTableState.nextId = 1;
    poseTableState.homeId = null;
  }

  function loadPoseTableState() {
    try {
      const raw = localStorage.getItem(POSE_TABLE_STORAGE_KEY);
      poseTableStorageSnapshot = raw;
      if (!raw) {
        resetPoseTableState();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) {
        resetPoseTableState();
        return;
      }
      poseTableState.items = parsed.items
        .filter(function (item) {
          return item && typeof item.id === 'string';
        })
        .map(function (item) {
          return {
            id: String(item.id),
            name: String(item.name || ''),
            x: Number(item.x || 0),
            y: Number(item.y || 0),
            yaw: Number(item.yaw || 0)
          };
        });
      poseTableState.nextId = Math.max(1, parseInt(parsed.nextId, 10) || 1);
      poseTableState.homeId = parsed.homeId && poseTableState.items.some(function (item) {
        return item.id === parsed.homeId;
      }) ? parsed.homeId : (poseTableState.items.length ? poseTableState.items[0].id : null);
      poseTableState.selectedIds = poseTableState.selectedIds.filter(function (id) {
        return poseTableState.items.some(function (item) {
          return item.id === id;
        });
      });
    } catch (error) {
      poseTableStorageSnapshot = localStorage.getItem(POSE_TABLE_STORAGE_KEY);
      resetPoseTableState();
    }
  }

  function syncPoseTableStateFromStorage() {
    const nextSnapshot = localStorage.getItem(POSE_TABLE_STORAGE_KEY);
    if (nextSnapshot === poseTableStorageSnapshot) return;
    loadPoseTableState();
    renderPoseTable();
  }

  function updatePoseNameInputValidity(input, itemId) {
    if (!input) return;
    const value = String(input.value || '').trim();
    const isInvalid = !value || isDuplicatePoseName(value, itemId);
    input.classList.toggle('is-invalid', isInvalid);
  }

  function commitPoseNameEdit(itemId, nextName) {
    const normalized = String(nextName || '').trim();
    if (!normalized) {
      setStatus('ชื่อห้ามว่าง');
      renderPoseTable();
      return;
    }
    if (isDuplicatePoseName(normalized, itemId)) {
      setStatus('ชื่อซ้ำ');
      renderPoseTable();
      return;
    }
    const target = poseTableState.items.find(function (item) {
      return item.id === itemId;
    });
    if (!target) {
      renderPoseTable();
      return;
    }
    target.name = normalized;
    savePoseTableState();
    renderPoseTable();
    setStatus('แก้ชื่อแล้ว');
  }

  function commitPoseNumberEdit(itemId, fieldName, nextValue) {
    const normalized = String(nextValue || '').trim();
    const parsed = Number(normalized);
    if (!normalized || !Number.isFinite(parsed)) {
      setStatus('ค่าต้องเป็นตัวเลข');
      renderPoseTable();
      return;
    }
    const target = poseTableState.items.find(function (item) {
      return item.id === itemId;
    });
    if (!target || !Object.prototype.hasOwnProperty.call(target, fieldName)) {
      renderPoseTable();
      return;
    }
    target[fieldName] = parsed;
    savePoseTableState();
    renderPoseTable();
    setStatus('แก้ค่าตำแหน่งแล้ว');
  }

  function beginPoseCellEdit(cell, item, fieldName, initialValue, commitHandler) {
    if (cell.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.spellcheck = false;
    if (fieldName !== 'name') {
      input.inputMode = 'decimal';
    }
    input.value = initialValue;
    input.className = 'pose-name-input';
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    input.select();
    input.addEventListener('click', function (event) {
      event.stopPropagation();
    });
    input.addEventListener('dblclick', function (event) {
      event.stopPropagation();
    });
    if (fieldName === 'name') {
      updatePoseNameInputValidity(input, item.id);
      input.addEventListener('input', function () {
        updatePoseNameInputValidity(input, item.id);
      });
    }
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitHandler(item.id, input.value);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        renderPoseTable();
      }
    });
    input.addEventListener('blur', function () {
      commitHandler(item.id, input.value);
    });
  }

  function closeRosConfirmModal(result) {
    if (rosConfirmModal) {
      rosConfirmModal.classList.add('is-hidden');
      rosConfirmModal.setAttribute('aria-hidden', 'true');
      rosConfirmModal.style.display = 'none';
    }
    if (rosConfirmResolver) {
      const resolve = rosConfirmResolver;
      rosConfirmResolver = null;
      resolve(result);
    }
  }

  function showRosConfirmModal(message) {
    if (!rosConfirmModal || !rosConfirmMessage || !rosConfirmOkBtn || !rosConfirmCancelBtn) {
      return Promise.resolve(window.confirm(message));
    }
    if (rosConfirmResolver) {
      closeRosConfirmModal(false);
    }
    rosConfirmMessage.textContent = message;
    rosConfirmModal.classList.remove('is-hidden');
    rosConfirmModal.setAttribute('aria-hidden', 'false');
    rosConfirmModal.style.display = 'flex';
    rosConfirmModal.style.position = 'fixed';
    rosConfirmModal.style.left = '0';
    rosConfirmModal.style.top = '0';
    rosConfirmModal.style.right = '0';
    rosConfirmModal.style.bottom = '0';
    rosConfirmModal.style.alignItems = 'center';
    rosConfirmModal.style.justifyContent = 'center';
    rosConfirmModal.style.zIndex = '99999';
    window.setTimeout(function () {
      rosConfirmOkBtn.focus();
    }, 0);
    return new Promise(function (resolve) {
      rosConfirmResolver = resolve;
    });
  }

  function isPoseSelected(itemId) {
    return poseTableState.selectedIds.indexOf(itemId) >= 0;
  }

  function selectSinglePose(itemId) {
    poseTableState.selectedIds = [itemId];
    renderPoseTable();
  }

  function togglePoseSelection(itemId) {
    if (isPoseSelected(itemId)) {
      poseTableState.selectedIds = poseTableState.selectedIds.filter(function (id) {
        return id !== itemId;
      });
    } else {
      poseTableState.selectedIds = poseTableState.selectedIds.concat(itemId);
    }
    renderPoseTable();
  }

  function handlePoseRowSelection(event, itemId) {
    if (event) {
      event.stopPropagation();
    }
    if (event && (event.ctrlKey || event.metaKey)) {
      togglePoseSelection(itemId);
      return;
    }
    if (poseTableState.selectedIds.length !== 1 || poseTableState.selectedIds[0] !== itemId) {
      selectSinglePose(itemId);
    }
  }

  function isHomePose(itemId) {
    return poseTableState.homeId === itemId;
  }

  function renderPoseTable() {
    if (!poseTableBody) return;
    poseTableBody.innerHTML = '';

    if (!poseTableState.items.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'pose-table-empty';
      emptyRow.innerHTML = '<td colspan="4">No poses</td>';
      poseTableBody.appendChild(emptyRow);
      return;
    }

    poseTableState.items.forEach(function (item) {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const xCell = document.createElement('td');
      const yCell = document.createElement('td');
      const yawCell = document.createElement('td');
      if (isPoseSelected(item.id)) {
        row.classList.add('is-selected');
      }
      nameCell.innerHTML = (isHomePose(item.id)
        ? '<span class="pose-home-badge"><i class="fas fa-home"></i></span>'
        : '') + '<span class="pose-name-text">' + item.name + '</span>';
      nameCell.className = 'pose-name-cell';
      nameCell.addEventListener('click', function (event) {
        handlePoseRowSelection(event, item.id);
      });
      nameCell.addEventListener('dblclick', function (event) {
        event.preventDefault();
        event.stopPropagation();
        beginPoseCellEdit(nameCell, item, 'name', item.name, commitPoseNameEdit);
      });
      xCell.textContent = formatPoseTableNumber(item.x);
      xCell.addEventListener('click', function (event) {
        handlePoseRowSelection(event, item.id);
      });
      xCell.addEventListener('dblclick', function (event) {
        event.preventDefault();
        event.stopPropagation();
        beginPoseCellEdit(xCell, item, 'x', formatPoseTableNumber(item.x), function (itemId, value) {
          commitPoseNumberEdit(itemId, 'x', value);
        });
      });
      yCell.textContent = formatPoseTableNumber(item.y);
      yCell.addEventListener('click', function (event) {
        handlePoseRowSelection(event, item.id);
      });
      yCell.addEventListener('dblclick', function (event) {
        event.preventDefault();
        event.stopPropagation();
        beginPoseCellEdit(yCell, item, 'y', formatPoseTableNumber(item.y), function (itemId, value) {
          commitPoseNumberEdit(itemId, 'y', value);
        });
      });
      yawCell.textContent = formatPoseTableNumber(item.yaw);
      yawCell.addEventListener('click', function (event) {
        handlePoseRowSelection(event, item.id);
      });
      yawCell.addEventListener('dblclick', function (event) {
        event.preventDefault();
        event.stopPropagation();
        beginPoseCellEdit(yawCell, item, 'yaw', formatPoseTableNumber(item.yaw), function (itemId, value) {
          commitPoseNumberEdit(itemId, 'yaw', value);
        });
      });
      row.appendChild(nameCell);
      row.appendChild(xCell);
      row.appendChild(yCell);
      row.appendChild(yawCell);
      row.addEventListener('click', function (event) {
        handlePoseRowSelection(event, item.id);
      });
      poseTableBody.appendChild(row);
    });
  }

  function addCurrentPoseToTable() {
    const poseId = 'pose_' + poseTableState.nextId;
    const poseName = getNextPoseName();
    const yawDeg = THREE.MathUtils.radToDeg(robot.rotation.y);
    poseTableState.items.unshift({
      id: poseId,
      name: poseName,
      x: robot.position.x,
      y: robot.position.z,
      yaw: yawDeg
    });
    if (!poseTableState.homeId) {
      poseTableState.homeId = poseId;
    }
    poseTableState.selectedIds = [poseId];
    poseTableState.nextId += 1;
    savePoseTableState();
    renderPoseTable();
    setStatus('เพิ่มตำแหน่งปัจจุบันแล้ว');
  }

  async function deleteSelectedPoseFromTable() {
    if (!poseTableState.selectedIds.length) {
      setStatus('กรุณาเลือกตำแหน่งก่อนลบ');
      return;
    }
    const selectedCount = poseTableState.selectedIds.length;
    const confirmMessage = selectedCount === 1
      ? 'Delete selected pose?'
      : 'Delete ' + selectedCount + ' selected poses?';
    if (!(await showRosConfirmModal(confirmMessage))) {
      return;
    }
    const selectedLookup = {};
    poseTableState.selectedIds.forEach(function (id) {
      selectedLookup[id] = true;
    });
    poseTableState.items = poseTableState.items.filter(function (item) {
      return !selectedLookup[item.id];
    });
    if (poseTableState.homeId && selectedLookup[poseTableState.homeId]) {
      poseTableState.homeId = poseTableState.items.length ? poseTableState.items[0].id : null;
    }
    poseTableState.selectedIds = [];
    savePoseTableState();
    renderPoseTable();
    setStatus('ลบตำแหน่งที่เลือกแล้ว');
  }

  function getSingleSelectedPose() {
    if (!poseTableState.selectedIds.length) {
      setStatus('กรุณาเลือกตำแหน่งก่อน');
      return null;
    }
    if (poseTableState.selectedIds.length !== 1) {
      setStatus('กรุณาเลือกเพียง 1 ตำแหน่ง');
      return null;
    }
    return poseTableState.items.find(function (item) {
      return item.id === poseTableState.selectedIds[0];
    }) || null;
  }

  function coverSelectedPoseFromCurrent() {
    const selectedPose = getSingleSelectedPose();
    if (!selectedPose) return;
    selectedPose.x = robot.position.x;
    selectedPose.y = robot.position.z;
    selectedPose.yaw = THREE.MathUtils.radToDeg(robot.rotation.y);
    savePoseTableState();
    renderPoseTable();
    setStatus('อัปเดตตำแหน่งที่เลือกแล้ว');
  }

  function runToSelectedPose() {
    const selectedPose = getSingleSelectedPose();
    if (!selectedPose) return;
    resetJoystick();
    if (setAutopilotGoal(selectedPose.x, selectedPose.y, THREE.MathUtils.degToRad(selectedPose.yaw))) {
      autopilotState.enabled = true;
      setStatus('เริ่มวิ่งไปยังตำแหน่งที่เลือก');
    }
  }

  function setSelectedPoseAsHome() {
    const selectedPose = getSingleSelectedPose();
    if (!selectedPose) return;
    poseTableState.homeId = selectedPose.id;
    savePoseTableState();
    renderPoseTable();
    setStatus('ตั้งตำแหน่ง Home แล้ว');
  }

  function estimateRobotFromSelectedPose() {
    const selectedPose = getSingleSelectedPose();
    if (!selectedPose) return;
    clearGoalState();
    resetJoystick();
    robot.position.set(selectedPose.x, 0, selectedPose.y);
    robot.rotation.y = THREE.MathUtils.degToRad(selectedPose.yaw);
    targetPosition.set(selectedPose.x, 0, selectedPose.y);
    targetRotation = robot.rotation.y;
    currentRobotSpeed = 0;
    updatePoseText();
    setStatus('รีเซ็ตหุ่นไปยังตำแหน่งที่เลือกแล้ว');
  }

  function getHomePose() {
    if (!poseTableState.homeId) {
      setStatus('ยังไม่ได้ตั้ง Home');
      return null;
    }
    const homePose = poseTableState.items.find(function (item) {
      return item.id === poseTableState.homeId;
    }) || null;
    if (!homePose) {
      setStatus('ไม่พบตำแหน่ง Home');
      return null;
    }
    return homePose;
  }

  function runToHomePose() {
    const homePose = getHomePose();
    if (!homePose) return;
    resetJoystick();
    if (setAutopilotGoal(homePose.x, homePose.y, THREE.MathUtils.degToRad(homePose.yaw))) {
      autopilotState.enabled = true;
      setStatus('เริ่มวิ่งกลับ Home');
    }
  }

  function pauseRobotMotion() {
    clearGoalState('หยุดการเคลื่อนที่แล้ว');
    resetJoystick();
    stopRobot();
  }

  function rotateRobotByDegrees(deltaDegrees) {
    clearGoalState();
    resetJoystick();
    robot.rotation.y = normalizeAngle(robot.rotation.y + THREE.MathUtils.degToRad(deltaDegrees));
    targetRotation = robot.rotation.y;
    currentRobotSpeed = 0;
    updatePoseText();
    setStatus(deltaDegrees < 0 ? 'หมุนซ้ายแล้ว' : 'หมุนขวาแล้ว');
  }

  function stopRotationHold() {
    if (rotationHoldState.timer) {
      clearInterval(rotationHoldState.timer);
      rotationHoldState.timer = null;
    }
    rotationHoldState.direction = 0;
  }

  function startRotationHold(direction) {
    stopRotationHold();
    rotationHoldState.direction = direction < 0 ? -1 : 1;
    rotateRobotByDegrees(rotationHoldState.direction * 10);
    rotationHoldState.timer = window.setInterval(function () {
      rotateRobotByDegrees(rotationHoldState.direction * 10);
    }, 120);
  }

  function saveInitialPose() {
    initialPoseState.x = robot.position.x;
    initialPoseState.z = robot.position.z;
    initialPoseState.yaw = robot.rotation.y;
    targetPosition.set(initialPoseState.x, 0, initialPoseState.z);
    targetRotation = initialPoseState.yaw;
    setStatus('บันทึก Initial Pose แล้ว');
  }

  function resetRobotPoseToInitial() {
    clearGoalState();
    resetJoystick();
    robot.position.set(initialPoseState.x, 0, initialPoseState.z);
    robot.rotation.y = initialPoseState.yaw;
    targetPosition.set(initialPoseState.x, 0, initialPoseState.z);
    targetRotation = initialPoseState.yaw;
    currentRobotSpeed = 0;
    updatePoseText();
    setStatus('รีเซ็ตตำแหน่งหุ่นยนต์แล้ว');
  }

  function tickMovement() {
    const prevX = robot.position.x;
    const prevZ = robot.position.z;
    const drive = getJoystickDrive();

    if (drive.active) {
      autopilotState.enabled = false;
      autopilotState.blockedFrames = 0;
      robot.rotation.y = normalizeAngle(robot.rotation.y - drive.angular);
      const nextX = robot.position.x + (Math.sin(robot.rotation.y) * drive.linear);
      const nextZ = robot.position.z + (Math.cos(robot.rotation.y) * drive.linear);
      tryMoveRobot(nextX, nextZ);

      targetRotation = robot.rotation.y;
      targetPosition.copy(robot.position);
    } else if (autopilotState.enabled && autopilotState.path.length) {
      const goalDx = autopilotState.goal.x - robot.position.x;
      const goalDz = autopilotState.goal.z - robot.position.z;
      const goalDistance = Math.hypot(goalDx, goalDz);

      if (goalDistance < autopilotGoalTolerance) {
        if (autopilotState.goal && typeof autopilotState.goal.yaw === 'number') {
          const finalYawError = normalizeAngle(autopilotState.goal.yaw - robot.rotation.y);
          if (Math.abs(finalYawError) > 0.05) {
            const finalAngularStep = Math.max(-autopilotAngularSpeed, Math.min(autopilotAngularSpeed, finalYawError));
            robot.rotation.y = normalizeAngle(robot.rotation.y + finalAngularStep);
            targetRotation = robot.rotation.y;
            targetPosition.copy(robot.position);
            currentRobotSpeed = Math.hypot(robot.position.x - prevX, robot.position.z - prevZ) * 60;
            updatePoseText();
            return;
          }
          robot.rotation.y = normalizeAngle(autopilotState.goal.yaw);
          targetRotation = robot.rotation.y;
          targetPosition.copy(robot.position);
        }
        autopilotState.enabled = false;
        autopilotState.blockedFrames = 0;
        setStatus('ถึงเป้าหมายแล้ว');
      } else {
        const closestIndex = getClosestPathIndex();
        autopilotState.pathIndex = closestIndex;

        while (autopilotState.pathIndex < autopilotState.path.length - 1) {
          const currentWaypoint = autopilotState.path[autopilotState.pathIndex];
          const currentDistance = Math.hypot(currentWaypoint.x - robot.position.x, currentWaypoint.z - robot.position.z);
          if (currentDistance >= autopilotWaypointTolerance) break;
          autopilotState.pathIndex += 1;
        }

        const waypoint = autopilotState.path[getPathTargetIndex()];
        const dx = waypoint.x - robot.position.x;
        const dz = waypoint.z - robot.position.z;
        const targetYaw = Math.atan2(dx, dz);
        const yawError = normalizeAngle(targetYaw - robot.rotation.y);
        const angularStep = Math.max(-autopilotAngularSpeed, Math.min(autopilotAngularSpeed, yawError));

        robot.rotation.y = normalizeAngle(robot.rotation.y + angularStep);

        if (Math.abs(yawError) < 1.15) {
          const linearScale = Math.max(0.15, 1 - (Math.abs(yawError) / 1.15));
          const linearStep = autopilotLinearSpeed * linearScale;
          const autoNextX = robot.position.x + (Math.sin(robot.rotation.y) * linearStep);
          const autoNextZ = robot.position.z + (Math.cos(robot.rotation.y) * linearStep);

          if (tryMoveRobot(autoNextX, autoNextZ)) {
            autopilotState.blockedFrames = 0;
          } else {
            autopilotState.blockedFrames += 1;
            if (autopilotState.blockedFrames > 2) {
              if (!setAutopilotGoal(autopilotState.goal.x, autopilotState.goal.z, autopilotState.goal.yaw)) {
                autopilotState.enabled = false;
                setStatus('เส้นทางถูกบล็อก');
              }
            }
          }
        } else {
          autopilotState.blockedFrames = 0;
        }

        targetRotation = robot.rotation.y;
        targetPosition.copy(robot.position);
      }
    } else {
      robot.position.lerp(targetPosition, positionLerpFactor);
      const diff = normalizeAngle(targetRotation - robot.rotation.y);
      robot.rotation.y += diff * rotationLerpFactor;
    }
    currentRobotSpeed = Math.hypot(robot.position.x - prevX, robot.position.z - prevZ) * 60;
    updatePoseText();
  }

  function tickCameraMotion() {
    lockTopDownView();
    orbitState.theta += normalizeAngle(orbitState.desiredTheta - orbitState.theta) * orbitState.orbitSmoothFactor;
    orbitState.phi += (orbitState.desiredPhi - orbitState.phi) * orbitState.orbitSmoothFactor;
    orbitState.radius += (orbitState.desiredRadius - orbitState.radius) * orbitState.zoomSmoothFactor;
    orbitState.target.lerp(orbitState.desiredTarget, orbitState.panSmoothFactor);
    updateCameraFromOrbit();
  }

  function restoreInitialViewState() {
    orbitState.desiredTarget.set(0, 0.4, 0);
    orbitState.target.copy(orbitState.desiredTarget);
    orbitState.startTarget.copy(orbitState.desiredTarget);
    orbitState.radius = 4.5;
    orbitState.desiredRadius = 4.5;
    orbitState.theta = Math.PI / 4;
    orbitState.phi = 1.0;
    orbitState.desiredTheta = orbitState.theta;
    orbitState.desiredPhi = orbitState.phi;
    targetPosition.set(0, 0, 0);
    robot.position.set(0, 0, 0);
    targetRotation = 0;
    robot.rotation.y = 0;
    stopAutopilot();
    syncOrbitStateImmediately();
    updatePoseText();
  }

  function settleInitialViewState() {
    restoreInitialViewState();
    requestAnimationFrame(function () {
      resizeRenderer();
      restoreInitialViewState();
      setTimeout(function () {
        resizeRenderer();
        restoreInitialViewState();
      }, panelAnimationDuration + 40);
    });
  }

  function bindActionButtonLabels() {
    iconButtons.forEach(function (button) {
      function showTooltip() {
        const label = button.querySelector('.icon-label');
        const text = label ? label.textContent : '';
        const rect = button.getBoundingClientRect();
        actionTooltip.textContent = text;
        actionTooltip.style.left = (rect.left + (rect.width / 2)) + 'px';
        actionTooltip.style.top = (rect.bottom + 8) + 'px';
        actionTooltip.classList.add('is-visible');
      }

      function hideTooltip() {
        actionTooltip.classList.remove('is-visible');
      }

      button.addEventListener('mouseenter', function () {
        showTooltip();
      });
      button.addEventListener('mouseleave', function () {
        hideTooltip();
      });
      button.addEventListener('focus', function () {
        showTooltip();
      });
      button.addEventListener('blur', function () {
        hideTooltip();
      });
    });
  }

  joystick.addEventListener('pointerdown', function (event) {
    joystickState.isDragging = true;
    joystickKnob.classList.add('is-dragging');
    if (joystick.setPointerCapture) joystick.setPointerCapture(event.pointerId);
    pointerToJoystick(event);
  });

  joystick.addEventListener('pointermove', function (event) {
    if (!joystickState.isDragging) return;
    pointerToJoystick(event);
  });

  function endJoystickDrag(event) {
    if (event && joystick.releasePointerCapture && joystick.hasPointerCapture && joystick.hasPointerCapture(event.pointerId)) {
      joystick.releasePointerCapture(event.pointerId);
    }
    resetJoystick();
  }

  joystick.addEventListener('pointerup', endJoystickDrag);
  joystick.addEventListener('pointercancel', endJoystickDrag);
  joystick.addEventListener('pointerleave', function (event) {
    if (joystickState.isDragging) endJoystickDrag(event);
  });

  if (stopBtn) {
    stopBtn.addEventListener('click', function () {
      resetJoystick();
      stopRobot();
    });
  }

  startBtn.addEventListener('click', function () {
    if (autopilotState.goal && autopilotState.path.length) {
      autopilotState.enabled = true;
      setStatus('เริ่มวิ่งตามเส้นทาง');
      return;
    }
    setStatus('เริ่มระบบ');
  });
  startBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (robotStartTerminalId) {
      stopManagedRobotStartTerminal().then(function () {
        setStatus('หยุดคำสั่งเริ่มระบบแล้ว');
      });
      return;
    }
    openManagedRobotStartTerminal().then(function () {
      setStatus('เริ่มคำสั่งใน terminal แล้ว');
    }).catch(function (error) {
      robotStartTerminalId = '';
      saveRobotStartTerminalId();
      updateStartButtonState();
      setStatus('เริ่มคำสั่งไม่สำเร็จ');
      console.error('[ROS terminal] Failed to start managed terminal', error);
    });
  }, true);
  document.addEventListener('click', function (event) {
    const startButton = event.target && event.target.closest ? event.target.closest('#startBtn') : null;
    if (!startButton || startButton !== startBtn) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (robotStartButtonLoading) {
      return;
    }
    const isStopping = !!robotStartTerminalId;
    const scanWaitStartedAt = Date.now();
    robotStartButtonLoading = true;
    setMapLoadingOverlay(true, isStopping ? 'Stopping...' : 'Starting...');
    updateStartButtonState();
    const action = isStopping
      ? stopManagedRobotStartTerminal().then(function () {
          setStatus('หยุดคำสั่งเริ่มระบบแล้ว');
        })
      : openManagedRobotStartTerminal().then(function () {
          setStatus('เริ่มคำสั่งใน terminal แล้ว');
          return waitForNextScan(scanWaitStartedAt).then(function () {
            enableRosVisualLayers();
            setStatus('ได้รับข้อมูล /scan แล้ว');
          });
        }).catch(function (error) {
          robotStartTerminalId = '';
          saveRobotStartTerminalId();
          setStatus('เริ่มคำสั่งไม่สำเร็จ');
          console.error('[ROS terminal] Failed to start managed terminal', error);
        });
    Promise.all([action, isStopping ? waitMs(3000) : action]).finally(function () {
      robotStartButtonLoading = false;
      setMapLoadingOverlay(false, '');
      updateStartButtonState();
    });
  }, true);
  if (autoBtn) autoBtn.addEventListener('click', function () {
    if (!autopilotState.goal || !autopilotState.path.length) {
      setStatus('กรุณาตั้ง Goal ก่อน');
      return;
    }
    autopilotState.enabled = !autopilotState.enabled;
    setStatus(autopilotState.enabled ? 'เปลี่ยนเป็นโหมด AUTO' : 'หยุดโหมด AUTO');
  });
  goalBtn.addEventListener('click', function () {
    autopilotState.selectingGoal = true;
    setStatus('คลิกบนแผนที่เพื่อเลือก Goal');
  });
  if (resetViewBtn) resetViewBtn.addEventListener('click', function () {
    restoreInitialViewState();
    setStatus('รีเซ็ตมุมมอง');
  });

  goalBtn.addEventListener('click', function () {
    autopilotState.selectionPointerId = null;
    autopilotState.selectionStart = null;
    autopilotState.selectionYaw = null;
    autopilotState.selectionDragging = false;
    updateGoalSelectionPreview(null, 0, false);
    setStatus('คลิกแผนที่แล้วลากเพื่อกำหนดทิศทาง Goal');
  });

  renderer.domElement.addEventListener('click', function (event) {
    if (!autopilotState.selectingGoal || orbitState.didDrag || event.button !== 0) {
      return;
    }

    const hitPoint = getWorldPointFromPointer(event);
    autopilotState.selectingGoal = false;

    if (!hitPoint) {
      setStatus('ไม่สามารถเลือก Goal ได้');
      return;
    }

    if (setAutopilotGoal(hitPoint.x, hitPoint.z)) {
      autopilotState.enabled = true;
      setStatus('ตั้ง Goal และเริ่มวิ่งอัตโนมัติ');
    }
  });

  function updateScan() {
    if (!updateScanFromRosbridge()) {
      hideScanGeometry();
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    tickMovement();
    tickCameraMotion();
    lidar.rotation.y += 0.04;
    updateScan();
    renderer.render(scene, camera);
  }

  function appendTerminal(text) {
    if (typeof text !== 'string' || !text.length) return;
    terminalState.buffer = (terminalState.buffer + text).slice(-60000);
    try {
      localStorage.setItem('ros_embedded_terminal_buffer', terminalState.buffer);
    } catch (error) {}
    if (!terminalState.term) return;
    terminalState.term.write(text.replace(/\r?\n/g, '\r\n'));
  }

  function appendTerminalLine(text) {
    appendTerminal(text + '\n');
  }

  function setTerminalControls() {
    if (!connectSshBtn || !disconnectSshBtn || !sshTargetInput) {
      return;
    }
    const available = !!terminalState.process;
    connectSshBtn.disabled = !available;
    disconnectSshBtn.disabled = !available;
    sshTargetInput.disabled = false;
  }

  function setEmbeddedTerminalVisible(visible) {
    terminalState.isVisible = !!visible;
    if (embeddedTerminalSection) {
      embeddedTerminalSection.classList.toggle('is-hidden', !terminalState.isVisible);
    }
    if (openSshTerminalBtn) {
      openSshTerminalBtn.classList.toggle('primary', terminalState.isVisible);
    }
    try {
      localStorage.setItem('ros_embedded_terminal_open', terminalState.isVisible ? '1' : '0');
    } catch (error) {}
    if (terminalState.isVisible) {
      initTerminal();
      setTimeout(function () {
        fitTerminal();
        if (terminalState.term) {
          terminalState.term.focus();
        }
      }, 0);
    }
  }

  function toggleEmbeddedTerminal() {
    setEmbeddedTerminalVisible(!terminalState.isVisible);
  }

  function ensureTerminal() {
    if (terminalState.term) return;
    terminalState.term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#10161d',
        foreground: '#d7e3f1',
        cursor: '#d7e3f1',
        black: '#10161d',
        brightBlack: '#5b6672'
      }
    });
    terminalState.fitAddon = new FitAddon.FitAddon();
    terminalState.term.loadAddon(terminalState.fitAddon);
    terminalState.term.open(testOutput);
    terminalState.fitAddon.fit();
    if (terminalState.buffer) {
      terminalState.term.write(terminalState.buffer.replace(/\r?\n/g, '\r\n'));
    }
    testOutput.classList.add('is-ready');
    terminalState.term.focus();
    terminalState.term.onData(function (data) {
      if (!terminalState.process) return;
      try {
        terminalState.process.stdin.write(data);
      } catch (error) {
        appendTerminalLine('[terminal] Send failed: ' + error.message);
      }
    });
  }

  function startLocalShell() {
    if (terminalState.process) return;

    try {
      const shellProcess = childProcess.spawn('powershell.exe', ['-NoLogo'], {
        windowsHide: true
      });

      terminalState.process = shellProcess;
      setTerminalControls();

      shellProcess.stdout.on('data', function (chunk) {
        appendTerminal(chunk.toString());
      });

      shellProcess.stderr.on('data', function (chunk) {
        appendTerminal(chunk.toString());
      });

      shellProcess.on('error', function (error) {
        appendTerminalLine('[terminal] Failed: ' + error.message);
        terminalState.process = null;
        setTerminalControls();
      });

      shellProcess.on('close', function (code) {
        const wasActive = terminalState.process === shellProcess;
        if (wasActive) {
          terminalState.process = null;
        }
        appendTerminalLine('');
        appendTerminalLine('[terminal] Shell closed' + (typeof code === 'number' ? ' (code ' + code + ')' : ''));
        setTerminalControls();
      });
    } catch (error) {
      appendTerminalLine('[terminal] Failed to start PowerShell: ' + error.message);
      terminalState.process = null;
      setTerminalControls();
    }
  }

  function disconnectSsh(showMessage) {
    if (!terminalState.process) {
      if (showMessage) appendTerminalLine('[terminal] No active shell');
      setTerminalControls();
      return;
    }

    try {
      terminalState.process.stdin.write('\u0003');
    } catch (error) {}

    if (showMessage) {
      appendTerminalLine('[terminal] Sent Ctrl+C');
    }

    if (terminalState.term) {
      terminalState.term.focus();
    }
    setTerminalControls();
  }

  function shutdownTerminalProcess() {
    if (!terminalState.process) return;
    const currentProcess = terminalState.process;
    terminalState.process = null;
    try {
      currentProcess.stdin.write('exit\r');
    } catch (error) {}
    try {
      currentProcess.kill();
    } catch (error) {}
  }

  function connectSsh() {
    const target = sshTargetInput.value.trim();
    if (!target) {
      appendTerminalLine('[ssh] Please enter user@host');
      return;
    }

    if (!terminalState.process) {
      appendTerminalLine('[terminal] Shell is not ready');
      return;
    }

    terminalState.target = target;
    try {
      localStorage.setItem('ros_embedded_terminal_target', target);
    } catch (error) {}
    appendTerminalLine('> ssh ' + target);

    try {
      terminalState.process.stdin.write('ssh ' + target + '\r');
      if (terminalState.term) {
        terminalState.term.focus();
      }
    } catch (error) {
      appendTerminalLine('[ssh] Failed to send command: ' + error.message);
    }
  }

  function initTerminal() {
    if (terminalState.initialized) {
      setTerminalControls();
      return;
    }
    terminalState.buffer = localStorage.getItem('ros_embedded_terminal_buffer') || '';
    if (sshTargetInput) {
      sshTargetInput.value = localStorage.getItem('ros_embedded_terminal_target') || getCurrentRosSshTarget();
    }
    ensureTerminal();
    if (!terminalState.buffer) {
      terminalState.term.clear();
      appendTerminalLine('[ros-terminal] Starting PowerShell ...');
    }
    startLocalShell();
    if (!terminalState.buffer) {
      appendTerminalLine('[ros-terminal] Ready');
      appendTerminalLine('[ros-terminal] Use PowerShell commands directly, e.g. ping, ipconfig, ssh');
      appendTerminalLine('[ros-terminal] Connect button just sends ssh user@host into this shell');
      appendTerminalLine('');
    }
    setTerminalControls();

    connectSshBtn.addEventListener('click', function () {
      connectSsh();
    });

    disconnectSshBtn.addEventListener('click', function () {
      disconnectSsh(true);
    });

    clearTerminalBtn.addEventListener('click', function () {
      if (terminalState.term) {
        terminalState.term.clear();
      }
      terminalState.buffer = '';
      try {
        localStorage.removeItem('ros_embedded_terminal_buffer');
      } catch (error) {}
    });

    sshTargetInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        connectSsh();
      }
    });
    terminalState.initialized = true;
  }

  function saveFloatingTerminalSnapshots() {
    const snapshots = floatingTerminalState.windows.map(function (terminalWindow) {
      return {
        id: terminalWindow.id,
        title: terminalWindow.title,
        target: terminalWindow.targetInput.value.trim(),
        buffer: terminalWindow.buffer.slice(-60000),
        visible: terminalWindow.visible,
        left: terminalWindow.left,
        top: terminalWindow.top,
        width: terminalWindow.width,
        height: terminalWindow.height
      };
    });
    try {
      localStorage.setItem('ros_floating_terminals', JSON.stringify(snapshots));
    } catch (error) {}
  }

  function fitFloatingTerminal(terminalWindow) {
    if (!terminalWindow.fitAddon || !terminalWindow.visible) return;
    try {
      terminalWindow.fitAddon.fit();
    } catch (error) {}
  }

  function bringFloatingTerminalToFront(terminalWindow) {
    floatingTerminalState.zIndex += 1;
    terminalWindow.root.style.zIndex = String(floatingTerminalState.zIndex);
  }

  function appendFloatingTerminal(terminalWindow, text) {
    if (typeof text !== 'string' || !text.length) return;
    terminalWindow.buffer = (terminalWindow.buffer + text).slice(-60000);
    saveFloatingTerminalSnapshots();
    if (terminalWindow.term) {
      terminalWindow.term.write(text.replace(/\r?\n/g, '\r\n'));
    }
  }

  function appendFloatingTerminalLine(terminalWindow, text) {
    appendFloatingTerminal(terminalWindow, text + '\n');
  }

  function setFloatingTerminalControls(terminalWindow) {
    const available = !!terminalWindow.process;
    terminalWindow.connectBtn.disabled = !available;
    terminalWindow.disconnectBtn.disabled = !available;
    terminalWindow.targetInput.disabled = false;
  }

  function hideFloatingTerminalWindow(terminalWindow) {
    terminalWindow.visible = false;
    terminalWindow.root.classList.add('is-hidden');
    renderTerminalDropdown();
    saveFloatingTerminalSnapshots();
  }

  function showFloatingTerminalWindow(terminalWindow) {
    terminalWindow.visible = true;
    terminalWindow.root.classList.remove('is-hidden');
    terminalWindow.root.style.display = 'block';
    clampFloatingTerminalToViewport(terminalWindow);
    bringFloatingTerminalToFront(terminalWindow);
    fitFloatingTerminal(terminalWindow);
    if (terminalWindow.term) {
      terminalWindow.term.focus();
    }
    renderTerminalDropdown();
    saveFloatingTerminalSnapshots();
  }

  function closeFloatingTerminalWindow(terminalWindow) {
    if (terminalWindow.process) {
      try {
        terminalWindow.process.stdin.write('exit\r');
      } catch (error) {}
      try {
        terminalWindow.process.kill();
      } catch (error) {}
      terminalWindow.process = null;
    }
    try {
      terminalWindow.term && terminalWindow.term.dispose();
    } catch (error) {}
    if (terminalWindow.root && terminalWindow.root.parentNode) {
      terminalWindow.root.parentNode.removeChild(terminalWindow.root);
    }
    floatingTerminalState.windows = floatingTerminalState.windows.filter(function (item) {
      return item !== terminalWindow;
    });
    renderTerminalDropdown();
    saveFloatingTerminalSnapshots();
  }

  function connectFloatingTerminalSsh(terminalWindow) {
    const target = terminalWindow.targetInput.value.trim();
    if (!target) {
      appendFloatingTerminalLine(terminalWindow, '[ssh] Please enter user@host');
      return;
    }
    if (!terminalWindow.process) {
      appendFloatingTerminalLine(terminalWindow, '[terminal] Shell is not ready');
      return;
    }
    terminalWindow.target = target;
    appendFloatingTerminalLine(terminalWindow, '> ssh ' + target);
    try {
      terminalWindow.process.stdin.write('ssh ' + target + '\r');
      terminalWindow.term && terminalWindow.term.focus();
      saveFloatingTerminalSnapshots();
    } catch (error) {
      appendFloatingTerminalLine(terminalWindow, '[ssh] Failed to send command: ' + error.message);
    }
  }

  function interruptFloatingTerminal(terminalWindow, showMessage) {
    if (!terminalWindow.process) {
      if (showMessage) appendFloatingTerminalLine(terminalWindow, '[terminal] No active shell');
      setFloatingTerminalControls(terminalWindow);
      return;
    }
    try {
      terminalWindow.process.stdin.write('\u0003');
    } catch (error) {}
    if (showMessage) {
      appendFloatingTerminalLine(terminalWindow, '[terminal] Sent Ctrl+C');
    }
    terminalWindow.term && terminalWindow.term.focus();
    setFloatingTerminalControls(terminalWindow);
  }

  function startFloatingTerminalShell(terminalWindow) {
    if (terminalWindow.process) return;
    try {
      const shellProcess = childProcess.spawn('powershell.exe', ['-NoLogo'], {
        windowsHide: true
      });
      terminalWindow.process = shellProcess;
      setFloatingTerminalControls(terminalWindow);

      shellProcess.stdout.on('data', function (chunk) {
        appendFloatingTerminal(terminalWindow, chunk.toString());
      });

      shellProcess.stderr.on('data', function (chunk) {
        appendFloatingTerminal(terminalWindow, chunk.toString());
      });

      shellProcess.on('error', function (error) {
        appendFloatingTerminalLine(terminalWindow, '[terminal] Failed: ' + error.message);
        terminalWindow.process = null;
        setFloatingTerminalControls(terminalWindow);
      });

      shellProcess.on('close', function (code) {
        if (terminalWindow.process === shellProcess) {
          terminalWindow.process = null;
        }
        appendFloatingTerminalLine(terminalWindow, '');
        appendFloatingTerminalLine(terminalWindow, '[terminal] Shell closed' + (typeof code === 'number' ? ' (code ' + code + ')' : ''));
        setFloatingTerminalControls(terminalWindow);
      });
    } catch (error) {
      appendFloatingTerminalLine(terminalWindow, '[terminal] Failed to start PowerShell: ' + error.message);
      terminalWindow.process = null;
      setFloatingTerminalControls(terminalWindow);
    }
  }

  function shouldShowHiddenTerminalWindow(terminalWindow) {
    if (!terminalWindow) return false;
    const currentHost = (ideTransportState.host || rosTargetHost || '').trim();
    const currentPort = Number(ideTransportState.port) || 8080;
    const terminalHost = String(terminalWindow.host || '').trim();
    const terminalPort = Number(terminalWindow.port) || 8080;

    if (!terminalHost || !currentHost) {
      return true;
    }
    if (terminalHost !== currentHost || terminalPort !== currentPort) {
      return true;
    }
    if (!currentBridgeRunId) {
      return false;
    }
    return String(terminalWindow.bridgeRunId || '').trim() === currentBridgeRunId;
  }

  function renderTerminalDropdown() {
    if (!terminalWindowList) return;
    terminalWindowList.innerHTML = '';
    const openWindowIds = new Set(
      electronTerminalWindowsState.windows.map(function (terminalWindow) {
        return normalizeRobotTerminalId(terminalWindow && terminalWindow.id);
      })
    );
    const availableWindows = robotTerminalRegistryState.terminals.filter(function (terminalWindow) {
      return shouldShowHiddenTerminalWindow(terminalWindow);
    });

    if (!availableWindows.length) {
      const empty = document.createElement('div');
      empty.className = 'terminal-menu-empty';
      empty.textContent = 'No terminals';
      terminalWindowList.appendChild(empty);
      return;
    }

    availableWindows.forEach(function (terminalWindow) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'terminal-menu-item';
      const menuTitle = shortenMiddleText(terminalWindow.title, 34);
      const menuMeta = String(terminalWindow.target || 'shell');
      const isOpen = openWindowIds.has(normalizeRobotTerminalId(terminalWindow.id));
      button.innerHTML = '<i class="fas fa-window-restore"></i><span title="' + terminalWindow.title + '">' + menuTitle + '</span><span class="meta" title="' + (terminalWindow.target || 'shell') + '">' + menuMeta + '</span>';
      if (isOpen) {
        button.classList.add('is-open');
      }
      button.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        event.stopPropagation();
        ipcRenderer.send('restore-ros-terminal-window', {
          id: terminalWindow.id,
          title: terminalWindow.title,
          target: terminalWindow.target,
          host: terminalWindow.host,
          port: terminalWindow.port,
          bridgeRunId: terminalWindow.bridgeRunId,
          sessionName: terminalWindow.sessionName
        });
        setTerminalDropdownOpen(false);
      });
      terminalWindowList.appendChild(button);
    });
  }

  function clampFloatingTerminalToViewport(terminalWindow) {
    if (!terminalWindow || !terminalWindow.root) return;
    const margin = 16;
    const width = terminalWindow.root.offsetWidth || terminalWindow.width || 560;
    const height = terminalWindow.root.offsetHeight || terminalWindow.height || 340;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(52, window.innerHeight - height - margin);
    terminalWindow.left = Math.min(Math.max(margin, terminalWindow.left || margin), maxLeft);
    terminalWindow.top = Math.min(Math.max(52, terminalWindow.top || 92), maxTop);
    terminalWindow.root.style.left = terminalWindow.left + 'px';
    terminalWindow.root.style.top = terminalWindow.top + 'px';
  }

  function applyRosTerminalWindowsState(windows) {
    electronTerminalWindowsState.windows = (Array.isArray(windows) ? windows : []).map(function (terminalWindow) {
      return Object.assign({}, terminalWindow, {
        id: normalizeRobotTerminalId(terminalWindow && terminalWindow.id),
        sessionName: String((terminalWindow && (terminalWindow.sessionName || terminalWindow.session_name)) || '')
      });
    });
    renderTerminalDropdown();
  }

  function loadSavedRosTerminalWindowsState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ROS_TERMINAL_WINDOWS_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function upsertRosTerminalWindowState(entry) {
    const id = normalizeRobotTerminalId(entry && entry.id);
    if (!id) return;
    const nextEntry = Object.assign({}, entry, { id: id });
    const nextWindows = electronTerminalWindowsState.windows.slice();
    const index = nextWindows.findIndex(function (item) {
      return normalizeRobotTerminalId(item && item.id) === id;
    });
    if (index >= 0) {
      nextWindows[index] = Object.assign({}, nextWindows[index], nextEntry);
    } else {
      nextWindows.push(nextEntry);
    }
    applyRosTerminalWindowsState(nextWindows);
  }

  function markSavedRosTerminalWindowsHidden() {
    const savedWindows = electronTerminalWindowsState.windows.length
      ? electronTerminalWindowsState.windows.slice()
      : loadSavedRosTerminalWindowsState();
    if (!savedWindows.length) return;
    applyRosTerminalWindowsState(savedWindows.map(function (terminalWindow) {
      return Object.assign({}, terminalWindow, {
        hidden: true,
        focused: false
      });
    }));
  }

  function shortenMiddleText(text, maxLength) {
    const rawText = String(text || '').trim();
    if (!rawText) return '';
    if (rawText.length <= maxLength) return rawText;
    const ellipsis = '...';
    const keepTotal = Math.max(2, maxLength - ellipsis.length);
    const headLength = Math.ceil(keepTotal / 2);
    const tailLength = Math.floor(keepTotal / 2);
    return rawText.slice(0, headLength) + ellipsis + rawText.slice(-tailLength);
  }

  function setTerminalDropdownOpen(open) {
    console.log('[ROS terminal] setTerminalDropdownOpen', { open: open });
    if (!terminalDropdown) return;
    terminalDropdown.classList.toggle('is-hidden', !open);
    if (openSshTerminalBtn) {
      openSshTerminalBtn.classList.toggle('primary', open);
    }
  }

  function createFloatingTerminalWindow(snapshot) {
    console.log('[ROS terminal] createFloatingTerminalWindow:start', snapshot || null);
    const terminalId = snapshot && snapshot.id ? snapshot.id : floatingTerminalState.nextId;
    floatingTerminalState.nextId = Math.max(floatingTerminalState.nextId, terminalId + 1);

    const root = document.createElement('div');
    root.className = 'terminal-window';
    root.style.left = ((snapshot && snapshot.left) || 120) + 'px';
    root.style.top = ((snapshot && snapshot.top) || 120) + 'px';
    root.style.width = ((snapshot && snapshot.width) || 560) + 'px';
    root.style.height = ((snapshot && snapshot.height) || 340) + 'px';

    root.innerHTML =
      '<div class="terminal-window-header">' +
        '<div class="terminal-window-title"></div>' +
        '<div class="terminal-window-actions">' +
          '<button class="terminal-window-btn" data-action="hide" type="button"><i class="fas fa-minus"></i></button>' +
          '<button class="terminal-window-btn" data-action="close" type="button"><i class="fas fa-times"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="terminal-window-body">' +
        '<div class="floating-terminal-toolbar">' +
          '<input class="floating-terminal-target" type="text" spellcheck="false">' +
          '<button class="terminal-action-btn" data-action="ssh" type="button">SSH</button>' +
          '<button class="terminal-action-btn" data-action="interrupt" type="button">Ctrl+C</button>' +
          '<button class="terminal-action-btn" data-action="clear" type="button">Clear</button>' +
        '</div>' +
        '<div class="floating-terminal-shell"></div>' +
      '</div>';

    if (terminalWindowHost) {
      console.log('[ROS terminal] appending window to terminalWindowHost');
      terminalWindowHost.appendChild(root);
    } else {
      console.log('[ROS terminal] terminalWindowHost missing, appending to document.body');
      document.body.appendChild(root);
    }

    const terminalWindow = {
      id: terminalId,
      title: (snapshot && snapshot.title) || ('Terminal ' + terminalId),
      root: root,
      header: root.querySelector('.terminal-window-header'),
      titleNode: root.querySelector('.terminal-window-title'),
      shellNode: root.querySelector('.floating-terminal-shell'),
      targetInput: root.querySelector('.floating-terminal-target'),
      connectBtn: root.querySelector('[data-action="ssh"]'),
      disconnectBtn: root.querySelector('[data-action="interrupt"]'),
      clearBtn: root.querySelector('[data-action="clear"]'),
      hideBtn: root.querySelector('[data-action="hide"]'),
      closeBtn: root.querySelector('[data-action="close"]'),
      buffer: (snapshot && snapshot.buffer) || '',
      target: (snapshot && snapshot.target) || getCurrentRosSshTarget(),
      process: null,
      term: null,
      fitAddon: null,
      visible: !(snapshot && snapshot.visible === false),
      left: (snapshot && snapshot.left) || 120,
      top: (snapshot && snapshot.top) || 120,
      width: (snapshot && snapshot.width) || 560,
      height: (snapshot && snapshot.height) || 340
    };

    terminalWindow.titleNode.textContent = terminalWindow.title;
    terminalWindow.targetInput.value = terminalWindow.target;
    if (!terminalWindow.visible) {
      terminalWindow.root.classList.add('is-hidden');
    } else {
      terminalWindow.root.classList.remove('is-hidden');
      terminalWindow.root.style.display = 'block';
    }
    console.log('[ROS terminal] window root created', {
      id: terminalWindow.id,
      visible: terminalWindow.visible,
      left: terminalWindow.root.style.left,
      top: terminalWindow.root.style.top,
      width: terminalWindow.root.style.width,
      height: terminalWindow.root.style.height
    });
    clampFloatingTerminalToViewport(terminalWindow);
    try {
      console.log('[ROS terminal] initializing xterm');
      terminalWindow.term = new Terminal({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: {
          background: '#10161d',
          foreground: '#d7e3f1',
          cursor: '#d7e3f1',
          black: '#10161d',
          brightBlack: '#5b6672'
        }
      });
      terminalWindow.fitAddon = new FitAddon.FitAddon();
      terminalWindow.term.loadAddon(terminalWindow.fitAddon);
      terminalWindow.term.open(terminalWindow.shellNode);
      terminalWindow.shellNode.classList.add('is-ready');
      fitFloatingTerminal(terminalWindow);
      if (terminalWindow.buffer) {
        terminalWindow.term.write(terminalWindow.buffer.replace(/\r?\n/g, '\r\n'));
      }
      terminalWindow.term.onData(function (data) {
        if (!terminalWindow.process) return;
        try {
          terminalWindow.process.stdin.write(data);
        } catch (error) {
          appendFloatingTerminalLine(terminalWindow, '[terminal] Send failed: ' + error.message);
        }
      });

      console.log('[ROS terminal] starting shell process');
      startFloatingTerminalShell(terminalWindow);
      if (!terminalWindow.buffer) {
        appendFloatingTerminalLine(terminalWindow, '[ros-terminal] Starting PowerShell ...');
        appendFloatingTerminalLine(terminalWindow, '[ros-terminal] Ready');
        appendFloatingTerminalLine(terminalWindow, '[ros-terminal] Use PowerShell commands directly, e.g. ping, ipconfig, ssh');
        appendFloatingTerminalLine(terminalWindow, '');
      }
      console.log('[ROS terminal] xterm initialized');
    } catch (error) {
      console.error('[ROS terminal] Failed to initialize floating terminal', error);
      terminalWindow.shellNode.classList.add('is-ready');
      terminalWindow.shellNode.innerHTML =
        '<div style="color:#d7e3f1;font:12px Consolas,monospace;white-space:pre-wrap;">' +
        '[ros-terminal] Failed to initialize terminal\n' +
        String(error && error.message ? error.message : error) +
        '</div>';
    }

    terminalWindow.connectBtn.addEventListener('click', function () {
      connectFloatingTerminalSsh(terminalWindow);
    });
    terminalWindow.disconnectBtn.addEventListener('click', function () {
      interruptFloatingTerminal(terminalWindow, true);
    });
    terminalWindow.clearBtn.addEventListener('click', function () {
      terminalWindow.buffer = '';
      terminalWindow.term.clear();
      saveFloatingTerminalSnapshots();
    });
    terminalWindow.hideBtn.addEventListener('click', function () {
      hideFloatingTerminalWindow(terminalWindow);
    });
    terminalWindow.closeBtn.addEventListener('click', function () {
      closeFloatingTerminalWindow(terminalWindow);
    });
    terminalWindow.targetInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        connectFloatingTerminalSsh(terminalWindow);
      }
    });

    let dragState = null;
    terminalWindow.header.addEventListener('pointerdown', function (event) {
      if (event.target.closest('button')) return;
      dragState = {
        x: event.clientX,
        y: event.clientY,
        left: parseInt(terminalWindow.root.style.left || '0', 10),
        top: parseInt(terminalWindow.root.style.top || '0', 10)
      };
      if (terminalWindow.header.setPointerCapture) {
        terminalWindow.header.setPointerCapture(event.pointerId);
      }
      bringFloatingTerminalToFront(terminalWindow);
    });
    terminalWindow.header.addEventListener('pointermove', function (event) {
      if (!dragState) return;
      terminalWindow.left = Math.max(16, dragState.left + (event.clientX - dragState.x));
      terminalWindow.top = Math.max(52, dragState.top + (event.clientY - dragState.y));
      terminalWindow.root.style.left = terminalWindow.left + 'px';
      terminalWindow.root.style.top = terminalWindow.top + 'px';
      clampFloatingTerminalToViewport(terminalWindow);
    });
    function endDrag(event) {
      if (!dragState) return;
      dragState = null;
      saveFloatingTerminalSnapshots();
      if (event && terminalWindow.header.releasePointerCapture && terminalWindow.header.hasPointerCapture && terminalWindow.header.hasPointerCapture(event.pointerId)) {
        terminalWindow.header.releasePointerCapture(event.pointerId);
      }
    }
    terminalWindow.header.addEventListener('pointerup', endDrag);
    terminalWindow.header.addEventListener('pointercancel', endDrag);
    terminalWindow.root.addEventListener('pointerdown', function () {
      bringFloatingTerminalToFront(terminalWindow);
    });

    setFloatingTerminalControls(terminalWindow);
    bringFloatingTerminalToFront(terminalWindow);
    floatingTerminalState.windows.push(terminalWindow);
    if (terminalWindow.visible) {
      showFloatingTerminalWindow(terminalWindow);
      setTimeout(function () {
        fitFloatingTerminal(terminalWindow);
      }, 0);
    }
    console.log('[ROS terminal] createFloatingTerminalWindow:done', {
      id: terminalWindow.id,
      visible: terminalWindow.visible,
      totalWindows: floatingTerminalState.windows.length
    });
    renderTerminalDropdown();
    saveFloatingTerminalSnapshots();
    return terminalWindow;
  }

  function restoreFloatingTerminalWindows() {
    let snapshots = [];
    try {
      snapshots = JSON.parse(localStorage.getItem('ros_floating_terminals') || '[]');
      if (!Array.isArray(snapshots)) snapshots = [];
    } catch (error) {
      snapshots = [];
    }

    snapshots.forEach(function (snapshot) {
      createFloatingTerminalWindow(snapshot);
    });

    renderTerminalDropdown();
  }

  function shutdownFloatingTerminalWindows() {
    floatingTerminalState.windows.forEach(function (terminalWindow) {
      if (terminalWindow.process) {
        try {
          terminalWindow.process.stdin.write('exit\r');
        } catch (error) {}
        try {
          terminalWindow.process.kill();
        } catch (error) {}
        terminalWindow.process = null;
      }
    });
  }

  window.addEventListener('resize', function () {
    resizeRenderer();
    floatingTerminalState.windows.forEach(function (terminalWindow) {
      fitFloatingTerminal(terminalWindow);
    });
  });
  ipcRenderer.on('ptbot-transport-state', function (event, payload) {
    applyIdeTransportState(payload);
  });
  ipcRenderer.on('ros-terminal-windows-state', function (event, windows) {
    applyRosTerminalWindowsState(windows);
  });
  window.addEventListener('storage', function (event) {
    if (event.key === 'ptbot_transport_connected') {
      syncRosbridgeWithIdeTransport();
    } else if (event.key === 'ptbot_wifi_ip' || event.key === 'ptbot_wifi_port') {
      disconnectRosbridgeSocket();
      syncRosbridgeWithIdeTransport();
    } else if (event.key === POSE_TABLE_STORAGE_KEY) {
      loadPoseTableState();
      renderPoseTable();
    }
  });
  window.addEventListener('beforeunload', function () {
    shutdownTerminalProcess();
    shutdownFloatingTerminalWindows();
    if (rosbridgeState.reconnectTimer) {
      clearTimeout(rosbridgeState.reconnectTimer);
      rosbridgeState.reconnectTimer = null;
    }
    if (rosbridgeState.socket) {
      try {
        rosbridgeState.socket.close();
      } catch (error) {}
    }
  });
  bindActionButtonLabels();
  initializePanelControls();
  updateLiveStatusPills();
  updateStartButtonState();
  ipcRenderer.invoke('get-ptbot-transport-state').then(function (payload) {
    applyIdeTransportState(payload);
  }).catch(function () {
    syncRosbridgeWithIdeTransport();
  });
  ipcRenderer.invoke('get-ros-terminal-windows').then(function (windows) {
    applyRosTerminalWindowsState(windows);
  }).catch(function () {});
  window.setInterval(updateLiveStatusPills, 1000);
  window.setInterval(function () {
    syncTerminalBridgeRunId();
  }, 5000);
  window.setInterval(function () {
    syncPoseTableStateFromStorage();
  }, 500);
  if (newTerminalBtn) {
    newTerminalBtn.addEventListener('pointerdown', function (event) {
      console.log('[ROS terminal] New Terminal pointerdown');
      event.preventDefault();
      event.stopPropagation();
      createRobotTerminalSession(getCurrentRosSshTarget()).then(function (createdTerminal) {
        return ipcRenderer.invoke('create-ros-terminal', {
          id: createdTerminal.id,
          title: createdTerminal.title,
          target: createdTerminal.target,
          host: createdTerminal.host,
          port: createdTerminal.port,
          bridgeRunId: createdTerminal.bridgeRunId,
          sessionName: createdTerminal.sessionName
        });
      }).then(function (createdWindow) {
        upsertRosTerminalWindowState({
          id: createdWindow.id,
          title: createdWindow.title,
          target: createdWindow.target,
          host: createdWindow.host,
          port: createdWindow.port,
          bridgeRunId: createdWindow.bridgeRunId,
          sessionName: createdWindow.sessionName,
          hidden: false,
          focused: false
        });
        fetchRobotTerminalRegistry();
      }).catch(function (error) {
        console.error('[ROS terminal] Failed to create electron terminal window', error);
      });
      setTerminalDropdownOpen(false);
    });
  }
  if (openRemoteDesktopBtn) {
    openRemoteDesktopBtn.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      event.stopPropagation();
      try {
        ipcRenderer.send('show-ros-remote-desktop', {
          host: getCurrentRemoteDesktopHost()
        });
      } catch (error) {
        console.error('[ROS remote desktop] Failed to open Electron window', error);
      }
    });
  }
  if (openSshTerminalBtn) {
    openSshTerminalBtn.addEventListener('pointerdown', function (event) {
      console.log('[ROS terminal] Terminal button pointerdown', {
        currentlyHidden: terminalDropdown ? terminalDropdown.classList.contains('is-hidden') : null
      });
      event.preventDefault();
      event.stopPropagation();
      setTerminalDropdownOpen(terminalDropdown ? terminalDropdown.classList.contains('is-hidden') : false);
    });
  }
  if (topbarStopBtn) {
    topbarStopBtn.addEventListener('click', function () {
      resetJoystick();
      stopRobot();
    });
  }

  if (mapView2dBtn) {
    mapView2dBtn.addEventListener('click', function () {
      setMapViewMode('2d');
    });
  }

  if (mapView3dBtn) {
    mapView3dBtn.addEventListener('click', function () {
      setMapViewMode('3d');
    });
  }

  if (mapLayerBtn && mapLayerMenu) {
    mapLayerBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      const open = !mapLayerMenu.classList.contains('is-open');
      if (open) {
        mapLayerMenu.classList.remove('is-hidden');
        window.requestAnimationFrame(function () {
          mapLayerMenu.classList.add('is-open');
        });
      } else {
        mapLayerMenu.classList.remove('is-open');
        window.setTimeout(function () {
          if (!mapLayerMenu.classList.contains('is-open')) {
            mapLayerMenu.classList.add('is-hidden');
          }
        }, 180);
      }
      mapLayerBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  if (layerMapToggle) {
    layerMapToggle.addEventListener('change', function () {
      layerVisibilityState.map = !!layerMapToggle.checked;
      saveLayerVisibilityState();
      applyLayerVisibility();
    });
  }

  if (layerScanToggle) {
    layerScanToggle.addEventListener('change', function () {
      layerVisibilityState.scan = !!layerScanToggle.checked;
      saveLayerVisibilityState();
      applyLayerVisibility();
    });
  }

  if (layerCostMapToggle) {
    layerCostMapToggle.addEventListener('change', function () {
      layerVisibilityState.costMap = !!layerCostMapToggle.checked;
      saveLayerVisibilityState();
      applyLayerVisibility();
    });
  }
  if (joystickHomeBtn) {
    joystickHomeBtn.addEventListener('click', function () {
      runToHomePose();
    });
  }
  if (joystickPauseBtn) {
    joystickPauseBtn.addEventListener('click', function () {
      pauseRobotMotion();
    });
  }
  if (joystickRunToBtn) {
    joystickRunToBtn.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      startRotationHold(-1);
    });
    joystickRunToBtn.addEventListener('pointerup', stopRotationHold);
    joystickRunToBtn.addEventListener('pointerleave', stopRotationHold);
    joystickRunToBtn.addEventListener('pointercancel', stopRotationHold);
  }
  if (joystickEstimateBtn) {
    joystickEstimateBtn.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      startRotationHold(1);
    });
    joystickEstimateBtn.addEventListener('pointerup', stopRotationHold);
    joystickEstimateBtn.addEventListener('pointerleave', stopRotationHold);
    joystickEstimateBtn.addEventListener('pointercancel', stopRotationHold);
  }
  if (cancelGoalBtn) {
    cancelGoalBtn.addEventListener('click', function () {
      clearGoalState('ยกเลิก Goal แล้ว');
    });
  }
  if (setInitialPoseBtn) {
    setInitialPoseBtn.addEventListener('click', function () {
      deleteSelectedPoseFromTable();
    });
  }
  if (resetRobotPoseBtn) {
    resetRobotPoseBtn.addEventListener('click', function () {
      resetRobotPoseToInitial();
    });
  }
  if (stopMotionBtn) {
    stopMotionBtn.addEventListener('click', function () {
      resetJoystick();
      stopRobot();
    });
  }
  if (resetViewPanelBtn) {
    resetViewPanelBtn.addEventListener('click', function () {
      restoreInitialViewState();
      setStatus('รีเซ็ตมุมมอง');
    });
  }
  if (clearMapBtn) {
    clearMapBtn.addEventListener('click', function () {
      clearRosVisualLayers();
      setStatus('ล้างข้อมูลแผนที่แล้ว');
    });
  }
  if (cancelGoalBtn) {
    cancelGoalBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addCurrentPoseToTable();
    }, true);
  }
  if (setInitialPoseBtn) {
    setInitialPoseBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      deleteSelectedPoseFromTable();
    }, true);
  }
  document.addEventListener('pointerdown', function (event) {
    if (mapLayerMenu && mapLayerBtn) {
      const withinLayerMenu = mapLayerMenu.contains(event.target);
      const withinLayerButton = mapLayerBtn.contains(event.target);
      if (!withinLayerMenu && !withinLayerButton) {
        mapLayerMenu.classList.remove('is-open');
        window.setTimeout(function () {
          if (!mapLayerMenu.classList.contains('is-open')) {
            mapLayerMenu.classList.add('is-hidden');
          }
        }, 180);
        mapLayerBtn.setAttribute('aria-expanded', 'false');
      }
    }
    if (!terminalDropdown || terminalDropdown.classList.contains('is-hidden')) return;
    if ((openSshTerminalBtn && openSshTerminalBtn.contains(event.target)) || terminalDropdown.contains(event.target)) return;
    setTerminalDropdownOpen(false);
  });
  if (rosConfirmOkBtn) {
    rosConfirmOkBtn.addEventListener('click', function () {
      closeRosConfirmModal(true);
    });
  }
  if (rosConfirmCancelBtn) {
    rosConfirmCancelBtn.addEventListener('click', function () {
      closeRosConfirmModal(false);
    });
  }
  if (rosConfirmModal) {
    rosConfirmModal.addEventListener('click', function (event) {
      if (event.target && event.target.getAttribute('data-confirm-close') === 'true') {
        closeRosConfirmModal(false);
      }
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && rosConfirmModal && !rosConfirmModal.classList.contains('is-hidden')) {
      closeRosConfirmModal(false);
    }
  });
  document.addEventListener('pointerup', stopRotationHold);
  window.addEventListener('blur', stopRotationHold);
  const liveAddPoseBtn = document.getElementById('cancelGoalBtn');
  if (liveAddPoseBtn && liveAddPoseBtn.parentNode) {
    const reboundAddPoseBtn = liveAddPoseBtn.cloneNode(true);
    liveAddPoseBtn.parentNode.replaceChild(reboundAddPoseBtn, liveAddPoseBtn);
    reboundAddPoseBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      addCurrentPoseToTable();
    });
  }
  const liveDeletePoseBtn = document.getElementById('setInitialPoseBtn');
  if (liveDeletePoseBtn && liveDeletePoseBtn.parentNode) {
    const reboundDeletePoseBtn = liveDeletePoseBtn.cloneNode(true);
    liveDeletePoseBtn.parentNode.replaceChild(reboundDeletePoseBtn, liveDeletePoseBtn);
    reboundDeletePoseBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      deleteSelectedPoseFromTable();
    });
  }
  const liveCoverPoseBtn = document.getElementById('resetRobotPoseBtn');
  if (liveCoverPoseBtn && liveCoverPoseBtn.parentNode) {
    const reboundCoverPoseBtn = liveCoverPoseBtn.cloneNode(true);
    liveCoverPoseBtn.parentNode.replaceChild(reboundCoverPoseBtn, liveCoverPoseBtn);
    reboundCoverPoseBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      coverSelectedPoseFromCurrent();
    });
  }
  const liveRunToPoseBtn = document.getElementById('stopMotionBtn');
  if (liveRunToPoseBtn && liveRunToPoseBtn.parentNode) {
    const reboundRunToPoseBtn = liveRunToPoseBtn.cloneNode(true);
    liveRunToPoseBtn.parentNode.replaceChild(reboundRunToPoseBtn, liveRunToPoseBtn);
    reboundRunToPoseBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      runToSelectedPose();
    });
  }
  const liveHomePoseBtn = document.getElementById('clearMapBtn');
  if (liveHomePoseBtn && liveHomePoseBtn.parentNode) {
    const reboundHomePoseBtn = liveHomePoseBtn.cloneNode(true);
    liveHomePoseBtn.parentNode.replaceChild(reboundHomePoseBtn, liveHomePoseBtn);
    reboundHomePoseBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedPoseAsHome();
    });
  }
  const liveEstimatePoseBtn = document.getElementById('resetViewPanelBtn');
  if (liveEstimatePoseBtn && liveEstimatePoseBtn.parentNode) {
    const reboundEstimatePoseBtn = liveEstimatePoseBtn.cloneNode(true);
    liveEstimatePoseBtn.parentNode.replaceChild(reboundEstimatePoseBtn, liveEstimatePoseBtn);
    reboundEstimatePoseBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      estimateRobotFromSelectedPose();
    });
  }
  loadPoseTableState();
  renderPoseTable();
  resizeRenderer();
  settleInitialViewState();

  window.robotUiDemo = {
    THREE: THREE,
    scene: scene,
    camera: camera,
    renderer: renderer,
    robot: robot,
    leftWheel: leftWheel,
    rightWheel: rightWheel,
    move: move,
    moveByJoystick: moveByJoystick,
    stopRobot: stopRobot,
    resizeRenderer: resizeRenderer,
    updateCameraFromOrbit: updateCameraFromOrbit,
    syncOrbitStateImmediately: syncOrbitStateImmediately,
    applyOrbitDrag: applyOrbitDrag,
    applyPanDrag: applyPanDrag,
    tickMovement: tickMovement,
    tickCameraMotion: tickCameraMotion,
    setJoystickVector: setJoystickVector,
    resetJoystick: resetJoystick,
    joystickState: joystickState,
    targetPosition: targetPosition,
    getTargetRotation: function () { return targetRotation; }
  };

  animate();
})();
