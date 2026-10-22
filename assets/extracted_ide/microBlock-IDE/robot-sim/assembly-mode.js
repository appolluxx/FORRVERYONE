(function () {
    'use strict';

    const STORAGE_KEY = 'robot_assembly_v1';
    const PROJECT_FILE = '/assembly.json';
    const byId = (id) => document.getElementById(id);
    const standalone = document.body.dataset.assemblyStandalone === 'true';
    const modal = byId('assembly-mode-modal');
    const openButton = byId('open-assembly-mode');
    const closeButton = byId('close-assembly-mode');
    const canvas = byId('assembly-canvas');
    if (!modal || !closeButton || !canvas || (!standalone && !openButton)) return;

    const ui = {
        list: byId('assembly-part-list'),
        status: byId('assembly-status'),
        file: byId('assembly-step-input'),
        name: byId('assembly-part-name'),
        motor: byId('assembly-motor-name'),
        color: byId('assembly-part-color'),
        x: byId('assembly-pos-x'),
        y: byId('assembly-pos-y'),
        z: byId('assembly-pos-z'),
        rx: byId('assembly-rot-x'),
        ry: byId('assembly-rot-y'),
        rz: byId('assembly-rot-z'),
        hologram: byId('assembly-part-hologram'),
        contextHint: byId('assembly-context-hint'),
        pointerPosition: byId('assembly-pointer-position'),
        setTarget: byId('assembly-set-target'),
        mateSurface: byId('assembly-mate-surface'),
        mateShaft: byId('assembly-mate-shaft'),
        ground: byId('assembly-ground-part'),
        remove: byId('assembly-delete-part'),
        reset: byId('assembly-reset')
    };
    ui.equipmentCategory = byId('assembly-equipment-category');
    ui.equipmentList = byId('assembly-equipment-list');
    ui.rotateButtons = Array.from(modal.querySelectorAll('[data-rotate-axis]'));

    let THREE;
    let renderer, viewportStyle;
    let scene;
    let camera;
    let partRoot;
    let floorMesh;
    let gridHelper;
    let workspaceFloorY = 0;
    let selectionBox;
    let moveHandle;
    let animationFrame = 0;
    let initialized = false;
    let geometryReady = Promise.resolve();
    let selectedId = '';
    let targetId = '';
    let partSequence = 0;
    let parts = [];
    let faces = [];
    let faceOverlays = [];
    let undoMate = null;
    let mateAnimation = null;
    let importing = false;
    let importRun = 0;
    const stepMeshes = new Map();
    let publishedEquipment = [];
    let guidedMode = null;
    let guideWorkspace = null;
    let equipmentPreviewer = null;
    let equipmentObserver = null;
    let equipmentClosed = false;
    let equipmentModelReady = false;
    const equipmentCards = new Map();
    const equipmentVisible = new Set();
    const equipmentPending = new Set();
    const equipmentPreviewWaiters = [];
    let equipmentPreviewTimer = null;

    function allMates() { return parts.flatMap(p => p.mates || []); }

    function renderMates() {
        const list = byId('assembly-mate-list');
        if (!list) return;
        list.textContent = '';
        const selectedMates = allMates().filter(r => r.a === selectedId || r.b === selectedId);
        if (!selectedMates.length) {
            const empty = document.createElement('div');
            empty.className = 'assembly-mate-empty';
            empty.textContent = selectedId ? 'No mates on this part' : 'Select a part to view its mates';
            list.appendChild(empty);
            return;
        }
        selectedMates.forEach(r => {
            const row = document.createElement('div');
            row.className = 'assembly-mate-row';
            const label = document.createElement('span');
            const other = parts.find(p => p.id === (r.a === selectedId ? r.b : r.a));
            label.textContent = (r.type === 'plane' ? 'Coincident' : 'Concentric') + ' · ' + (other ? other.name : 'Unknown part');
            const remove = document.createElement('button');
            remove.type = 'button'; remove.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>'; remove.title = 'Remove this mate'; remove.setAttribute('aria-label', 'Remove ' + label.textContent);
            remove.onclick = () => {
                parts.forEach(p => { p.mates = (p.mates || []).filter(m => m.id !== r.id); });
                const remaining = allMates().filter(m => (m.a===r.a&&m.b===r.b)||(m.a===r.b&&m.b===r.a));
                if (!remaining.length) {
                    parts.forEach(p => {
                        if (p.id === r.a) { p.mateLinks = (p.mateLinks || []).filter(id => id !== r.b); if (p.mateTypes) delete p.mateTypes[r.b]; }
                        if (p.id === r.b) { p.mateLinks = (p.mateLinks || []).filter(id => id !== r.a); if (p.mateTypes) delete p.mateTypes[r.a]; }
                    });
                } else {
                    const relationshipType = remaining.some(m => m.type === 'plane' || m.lockRotation) ? 'fixed' : 'concentric';
                    parts.forEach(p => {
                        if (p.id === r.a) { p.mateTypes = p.mateTypes || {}; p.mateTypes[r.b] = relationshipType; }
                        if (p.id === r.b) { p.mateTypes = p.mateTypes || {}; p.mateTypes[r.a] = relationshipType; }
                    });
                }
                undoMate = null; clearFaces(); saveParts(); syncInputs(); updateFaceUI();
            };
            row.append(label, remove); list.appendChild(row);
        });
    }
    const equipmentImages = new Map();
    let renderWidth = 0, renderHeight = 0;

    function connectedParts(partId, rigidOnly) {
        const ids = new Set([partId]);
        let changed = true;
        while (changed) {
            changed = false;
            parts.forEach(p => (p.mateLinks || []).forEach(other => {
                if (rigidOnly && p.mateTypes && p.mateTypes[other] === 'concentric') return;
                if (!parts.some(item => item.id === other)) return;
                if (ids.has(p.id) || ids.has(other)) {
                    if (!ids.has(p.id) || !ids.has(other)) changed = true;
                    ids.add(p.id); ids.add(other);
                }
            }));
        }
        return parts.filter(p => ids.has(p.id));
    }

    function movementParts(partId, rigidOnly) {
        const ids = new Set(connectedParts(partId, rigidOnly).map(part => part.id));
        let changed = true;
        while (changed) {
            changed = false;
            const importGroups = new Set(parts.filter(part => ids.has(part.id) && part.importGroup).map(part => part.importGroup));
            parts.forEach(part => {
                if (part.importGroup && importGroups.has(part.importGroup) && !ids.has(part.id)) {
                    ids.add(part.id);
                    changed = true;
                }
                if (!ids.has(part.id)) return;
                connectedParts(part.id, rigidOnly).forEach(connected => {
                    if (!ids.has(connected.id)) { ids.add(connected.id); changed = true; }
                });
            });
        }
        return parts.filter(part => ids.has(part.id));
    }

    function groupSnapshot(partId, forMovement) {
        const group = movementParts(partId, forMovement);
        const snapshot = group.map(part => ({ part: part, mesh: meshById.get(part.id), position: meshById.get(part.id).position.clone(), quaternion: meshById.get(part.id).quaternion.clone() }));
        if (forMovement) {
            const ids = new Set(group.map(p => p.id));
            parts.forEach(p => (p.mateLinks || []).forEach(other => {
                if (ids.has(p.id) === ids.has(other) || !meshById.has(other)) return;
                if (p.mateTypes && p.mateTypes[other] === 'concentric') {
                    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(meshById.get(other).quaternion).normalize();
                    if (snapshot.axis && Math.abs(snapshot.axis.dot(axis)) < .9999) snapshot.blocked = true;
                    snapshot.axis = axis;
                }
            }));
        }
        return snapshot;
    }

    function translateGroup(snapshot, delta) {
        delta = snapshot.blocked ? new THREE.Vector3() : snapshot.axis ? snapshot.axis.clone().multiplyScalar(delta.dot(snapshot.axis)) : delta;
        snapshot.forEach(item => {
            item.mesh.position.copy(item.position).add(delta);
            item.part.position = item.mesh.position.toArray();
        });
        updateWorkspaceFloor();
    }

    function updateUnmate() {
        const button = byId('assembly-unmate');
        if (button) button.hidden = !selectedId || connectedParts(selectedId).length < 2;
    }

    function clearFaces() {
        faceOverlays.forEach(mesh => { mesh.parent.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); });
        faceOverlays = [];
        faces = [];
        updateFaceUI();
    }

    function updateFaceUI() {
        ['assembly-face-a', 'assembly-face-b'].forEach((id, i) => {
            const element = byId(id);
            if (!element) return;
            const face = faces[i];
            const part = face && parts.find(p => p.id === face.partId);
            const faceType = face && (face.kind === 'plane' ? ' · Planar face' : face.kind === 'cylinder' ? ' · Cylindrical face' : ' · Curved face');
            element.textContent = part ? part.name + faceType : (i ? 'Click the face to move' : 'Click the reference face');
            element.classList.toggle('has-face', !!part);
        });
        const mismatchedMounts = faces.length === 2 && faces.every(face => face.mountId) && faces[0].mountType !== 'fixed' && faces[0].mountType === faces[1].mountType;
        ui.mateSurface.disabled = !!mateAnimation || mismatchedMounts || faces.length !== 2 || faces[0].kind !== faces[1].kind || faces[0].kind === 'unsupported';
        if (byId('assembly-undo-mate')) byId('assembly-undo-mate').disabled = !undoMate;
        updateContextHint();
        if (mismatchedMounts && ui.contextHint) ui.contextHint.textContent = 'Choose one shaft mount and one hole mount.';
        syncFaceColorInput();
    }

    function updateContextHint() {
        if (!ui.contextHint) return;
        const part = selectedPart();
        ui.contextHint.hidden = !part;
        if (!part) { ui.contextHint.textContent = ''; return; }
        if (!faces.length) ui.contextHint.textContent = 'Select a face on ' + part.name + ' to start a Mate.';
        else if (faces.length === 1) ui.contextHint.textContent = 'Select a matching face on another part.';
        else if (faces[0].kind !== faces[1].kind || faces[0].kind === 'unsupported') ui.contextHint.textContent = 'Choose two compatible flat or cylindrical faces.';
        else ui.contextHint.textContent = 'Faces are ready. Click Mate in the top toolbar.';
    }

    function chooseFace(hit) {
        const part = parts.find(p => p.id === hit.object.userData.assemblyPartId);
        if(part&&faces.length&&faces[0].mountId){
            selectPart(part.id);
            status('Choose a Prepared mount and click Select for Mate. The reference mount is retained.');
            return;
        }
        const face = window.AssemblyFaces.fromHit(THREE, hit, part);
        if (!face) return;
        const sourceFaces = hit.object.geometry.userData.brepFaces || [];
        const sourceFace = sourceFaces.find(entry => hit.faceIndex >= entry.first && hit.faceIndex <= entry.last);
        if (sourceFace && sourceFace.componentId) face.componentId = sourceFace.componentId;
        if (faces.length === 2) clearFaces();
        if (faces.length && faces[0].partId === face.partId) {
            // Clicking another surface on the same part changes the active
            // surface, which makes painting individual CAD faces practical.
            clearFaces();
        }
        const overlay = window.AssemblyFaces.outline(THREE, face.vertices, faces.length ? 0xd88408 : 0x1674b8);
        hit.object.add(overlay);
        faceOverlays.push(overlay);
        faces.push(face);
        targetId = faces[0].partId;
        selectPart(part.id);
        updateFaceUI();
        status(face.kind === 'unsupported'
            ? 'Curved face selected. You can color it, but this face does not support Mate yet.'
            : faces.length === 2 ? 'Two faces selected. Click Mate to align the second part.' : 'Reference face selected. Click a face on the part to move.');
    }

    function mateFaces(concentric) {
        if (mateAnimation) return;
        const kind = concentric ? 'cylinder' : 'plane';
        if (faces.length !== 2 || faces.some(f => f.kind !== kind)) return;
        const moving = parts.find(p => p.id === faces[1].partId);
        const alreadyConnected = connectedParts(moving.id).some(p => p.id === faces[0].partId);
        if (alreadyConnected && parts.some(p => (p.mateLinks || []).some(other =>
            (p.id === moving.id || other === moving.id) && !allMates().some(r => (r.a===p.id&&r.b===other)||(r.a===other&&r.b===p.id))))) {
            status('This legacy mate has no face data. Remove it and create the mate again.');
            return;
        }
        const record = { id: id(), a: faces[0].partId, b: moving.id, type: concentric ? 'concentric' : 'plane', faceA: serializeMateFace(faces[0]), faceB: serializeMateFace(faces[1]) };
        if (faces.every(face => face.mountId)) record.lockRotation = true;
        if (allMates().some(r => r.type === record.type && ((r.a===record.a&&r.b===record.b&&r.faceA.key===record.faceA.key&&r.faceB.key===record.faceB.key)||(r.a===record.b&&r.b===record.a&&r.faceA.key===record.faceB.key&&r.faceB.key===record.faceA.key)))) { status('These faces are already mated.'); return; }
        const snapshot = groupSnapshot(moving.id).filter(item => !alreadyConnected || item.part.id === moving.id);
        const mesh = meshById.get(moving.id);
        const startPosition = mesh.position.clone();
        const startQuaternion = mesh.quaternion.clone();
        const previousLinks = (moving.mateLinks || []).slice();
        if (alreadyConnected) {
            if (!window.AssemblyConstraints.solve(THREE, meshById, moving.id, allMates().concat(record))) {
                mesh.position.copy(startPosition); mesh.quaternion.copy(startQuaternion); mesh.updateMatrixWorld(true);
                status('This mate conflicts with an existing mate. The part was not moved.'); return;
            }
        } else {
            const reference = meshById.get(faces[0].partId);
            window.AssemblyFaces.align(THREE, reference, mesh, faces[0], faces[1], concentric);
            if (record.lockRotation) {
                // Prepared mounts are seating points, so align their origins
                // as well as their axes; a generic concentric face keeps slide.
                mesh.position.add(reference.localToWorld(faces[0].center.clone()).sub(mesh.localToWorld(faces[1].center.clone())));
                mesh.updateMatrixWorld(true);
            }
        }
        undoMate = { parts: snapshot.map(item => ({ id: item.part.id, position: item.part.position.slice(), rotation: item.part.rotation.slice() })), movingId: moving.id, fixedId: faces[0].partId, recordId: record.id, previousLinks };
        const endPosition = mesh.position.clone();
        const deltaQ = mesh.quaternion.clone().multiply(startQuaternion.clone().inverse());
        const items = snapshot.map(item => {
            const to = item.position.clone().sub(startPosition).applyQuaternion(deltaQ).add(endPosition);
            const toQ = deltaQ.clone().multiply(item.quaternion);
            item.mesh.position.copy(to);
            item.mesh.quaternion.copy(toQ);
            item.part.position = to.toArray();
            item.part.rotation = [item.mesh.rotation.x, item.mesh.rotation.y, item.mesh.rotation.z];
            item.mesh.position.copy(item.position);
            item.mesh.quaternion.copy(item.quaternion);
            return { mesh: item.mesh, from: item.position, to: to, fromQ: item.quaternion, toQ: toQ };
        });
        moving.mateLinks = Array.from(new Set((moving.mateLinks || []).concat(faces[0].partId)));
        moving.mates = (moving.mates || []).concat(record);
        moving.mateTypes = moving.mateTypes || {};
        moving.mateTypes[faces[0].partId] = concentric && !record.lockRotation ? 'concentric' : 'fixed';
        mateAnimation = { items: items, start: performance.now(), pivot: startPosition, endPivot: endPosition, deltaQ: deltaQ };
        clearFaces();
        saveParts();
        syncInputs();
        status('Aligning parts…');
    }
    function serializeMateFace(face) {
        const value = window.AssemblyConstraints.face(face);
        if (face.componentId) value.componentId = face.componentId;
        if (face.mountId) value.mountId = face.mountId;
        const part = parts.find(item => item.id === face.partId);
        const local = window.AssemblyProductConfig.componentFace(THREE, part, stepMeshes.get(part.geometryKey), face);
        if (local) value.componentFace = local;
        return value;
    }
    const meshById = new Map();
    const raycasterState = { raycaster: null, pointer: null };
    const orbit = {
        target: null,
        desiredTarget: null,
        desiredTheta: Math.PI / 4,
        desiredPhi: 1.05,
        radius: 0.65,
        maxRadius: 3,
        theta: Math.PI / 4,
        phi: 1.05,
        dragging: false,
        moved: false,
        shift: false,
        startX: 0,
        startY: 0,
        startTheta: 0,
        startPhi: 0,
        startTarget: null
    };

    function id() {
        partSequence += 1;
        return 'part-' + Date.now().toString(36) + '-' + partSequence;
    }

    function defaultParts() { return []; }

    function makePart(name, type, color, position, size, motor, fileName) {
        return {
            id: id(), name: name, type: type, color: color,
            faceColors: {},
            motor: motor || '', fileName: fileName || '',
            position: position || [0, 0.5, 0],
            rotation: type === 'wheel' ? [0, 0, Math.PI / 2] : [0, 0, 0],
            size: size || [0.08, 0.05, 0.08]
        };
    }

    function safeNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function normalizePart(raw) {
        const type = ['box', 'wheel', 'step'].includes(raw.type) ? raw.type : 'box';
        const fallback = type === 'wheel' ? [0.034, 0.022, 0.034] : [0.08, 0.05, 0.08];
        const catalogPart = (window.ROBOT_ASSEMBLY_CATALOG || []).find(item => item.id === raw.catalogId);
        const storedSize = catalogPart && Array.isArray(catalogPart.size) ? catalogPart.size : raw.size;
        return {
            id: String(raw.id || id()),
            name: String(raw.name || 'Part'),
            type: type,
            catalogId: String(raw.catalogId || ''),
            faceColors: raw.faceColors && typeof raw.faceColors === 'object' && !Array.isArray(raw.faceColors) ? raw.faceColors : {},
            mateLinks: Array.isArray(raw.mateLinks) ? raw.mateLinks.filter(link => typeof link === 'string' && link !== raw.id) : [],
            mateTypes: raw.mateTypes && typeof raw.mateTypes === 'object' && !Array.isArray(raw.mateTypes) ? raw.mateTypes : {},
            mates: Array.isArray(raw.mates) ? raw.mates : [],
            deviceBindings: window.AssemblyProductConfig.normalizeBindings(raw.deviceBindings),
            connectorLinks: window.AssemblyProductConfig.normalizeConnectorLinks(raw.connectorLinks),
            physics: window.ImportedPartPhysics.settings(raw.physics),
            geometryKey: typeof raw.geometryKey === 'string' ? raw.geometryKey : '',
            productManifest: raw.productManifest && typeof raw.productManifest === 'object' ? JSON.parse(JSON.stringify(raw.productManifest)) : undefined,
            productBaseUrl: typeof raw.productBaseUrl === 'string' ? raw.productBaseUrl : '',
            importGroup: typeof raw.importGroup === 'string' ? raw.importGroup : '',
            systemRole: typeof raw.systemRole === 'string' ? raw.systemRole : '',
            boardId: typeof raw.boardId === 'string' ? raw.boardId : '',
            locked: !!raw.locked,
            color: /^#[0-9a-f]{6}$/i.test(raw.color || '') ? raw.color : '#4b6b7c',
            motor: /^M[1-4]$/.test(raw.motor || '') ? raw.motor : '',
            fileName: String(raw.fileName || ''),
            position: [0, 1, 2].map((index) => safeNumber(raw.position && raw.position[index], index === 1 ? 0.5 : 0)),
            rotation: [0, 1, 2].map((index) => safeNumber(raw.rotation && raw.rotation[index], type === 'wheel' && index === 2 ? Math.PI / 2 : 0)),
            size: [0, 1, 2].map((index) => Math.max(0.001, safeNumber(storedSize && storedSize[index], fallback[index])))
        };
    }

    function currentBoardId() {
        return typeof boardId !== 'undefined' && boardId ? boardId : (localStorage.getItem('ptbot_selected_board_id') || '');
    }

    function loadParts(allowLegacy = true) {
        try {
            const projectRaw = typeof fs !== 'undefined' && fs && typeof fs.read === 'function' ? fs.read(PROJECT_FILE) : null;
            const projectAssembly = projectRaw ? JSON.parse(projectRaw) : null;
            const value = projectAssembly && Array.isArray(projectAssembly.parts)
                ? projectAssembly.parts
                : ((standalone || allowLegacy) ? JSON.parse(localStorage.getItem(STORAGE_KEY)) : []);
            if (Array.isArray(value)) {
                // Remove only the untouched sample robot, preserving user assemblies.
                const samplePositions = [[0,.56,0],[-1.05,.35,-.42],[-1.05,.35,.42],[1.05,.35,-.42],[1.05,.35,.42]];
                const untouched = value.length === 5 && value.slice(1).every((p, i) => p.name === ['FL', 'BL', 'FR', 'BR'][i]) && value.every((p, i) => !p.catalogId && JSON.stringify(p.position) === JSON.stringify(samplePositions[i]));
                const seenIds=new Set();
                const loaded = window.AssemblyProductConfig.consolidateDefaultBoard(untouched ? [] : value.map(normalizePart).filter(part=>{
                    if(seenIds.has(part.id))return false;
                    seenIds.add(part.id);return true;
                }));
                return window.AtomVxModel && !window.AtomVxModel.selected()
                    ? loaded.filter(part => !window.AtomVxModel.matches(part))
                    : loaded;
            }
        } catch (_) { }
        return defaultParts();
    }

    function saveParts() {
        try {
            const projectStorage = typeof fs !== 'undefined' && fs && typeof fs.write === 'function';
            if (projectStorage) {
                fs.write(PROJECT_FILE, JSON.stringify({ schemaVersion: 1, boardId: currentBoardId(), parts }));
            }
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parts)); }
            catch (error) {
                if (!projectStorage) throw error;
                // SIM can read /assembly.json; do not leave an older local copy
                // taking precedence after the project has saved successfully.
                localStorage.removeItem(STORAGE_KEY);
            }
            try { localStorage.setItem('robot_assembly_revision', Date.now() + '-' + Math.random().toString(36).slice(2)); } catch (_) { }
            window.dispatchEvent(new Event('robot-assembly-change'));
        } catch (_) { status('Could not save the assembly. Storage may be full.'); }
    }

    async function loadProjectAssembly(allowLegacy) {
        equipmentModelReady = false;
        if (guidedMode) guidedMode.exit();
        importRun += 1;
        importing = false;
        selectedId = '';
        targetId = '';
        faces = [];
        undoMate = null;
        mateAnimation = null;
        parts = loadParts(allowLegacy);
        if (!initialized) return;
        try {
            rebuildScene(false);
            await ensureSystemBoard();
            await restoreStepGeometry();
            fitAssembly();
            syncInputs();
            if (guidedMode) guidedMode.refreshAvailability();
        } finally { equipmentModelReady = true; }
    }

    function status(text) {
        if (ui.status) ui.status.textContent = text;
    }

    function isSystemPart(part) {
        return !!(part && window.AtomVxModel && window.AtomVxModel.matches(part));
    }

    function isCompanyPart(part) {
        return !!(part && (isProtectedPart(part) || part.catalogId));
    }

    function isProtectedPart(part) {
        if (!part) return false;
        const boardId = currentBoardId();
        const candidates = parts.filter(candidate => candidate.productManifest && candidate.productManifest.id === boardId);
        if (!candidates.length) candidates.push(...parts.filter(isSystemPart));
        const primary = candidates.find(candidate => candidate.systemRole === 'controller-board') ||
            candidates.find(candidate => candidate.geometryKey === 'selected-product-' + boardId) || candidates[0];
        return part === primary;
    }

    function hasProductController() { return !!(window.ProductCatalog && parts.some(part => !isSystemPart(part) && window.ProductCatalog.hasController(part))); }

    async function ensureSystemBoard() {
        const workspace=parts;
        if (window.ProductCatalog && window.ProductCatalog.loadSelected) {
            const selectedProduct = await window.ProductCatalog.loadSelected();
            if(parts!==workspace)return;
            if (selectedProduct && !parts.some(part => part.productManifest && part.productManifest.id === selectedProduct.manifest.id)) {
                const product = await window.ProductCatalog.prepare(THREE, { productManifest: selectedProduct.manifest, productBaseUrl: selectedProduct.baseUrl });
                if(parts!==workspace||parts.some(part=>part.productManifest&&part.productManifest.id===selectedProduct.manifest.id))return;
                const prepared = product.prepared;
                const part = makePart(product.manifest.name, 'step', prepared.source.colorHex || '#718391', [0, workspaceFloorY + prepared.size[1] / 2, 0], prepared.size.slice());
                part.catalogId = 'product:' + product.manifest.id;
                part.productManifest = product.manifest; part.productBaseUrl = product.baseUrl;
                part.geometryKey = 'selected-product-' + product.manifest.id;
                part.systemRole = 'controller-board';
                part.locked = true;
                stepMeshes.set(part.geometryKey, prepared.data); parts.unshift(part); saveParts();
            }
        }
        if (!window.AtomVxModel || !window.AtomVxModel.selected()) return;
        if (hasProductController()) return;
        let board = parts.find(isSystemPart);
        if (board) {
            board.systemRole = 'controller-board';
            board.boardId = 'atom-vx';
            board.locked = true;
            // A built-in board package is the source of truth. Refresh its
            // prepared geometry so a package published by Board Editor is not
            // hidden behind an older IndexedDB copy.
            const prepared = await window.AtomVxModel.loadPrepared(THREE);
            if(parts!==workspace||!parts.includes(board))return;
            window.AtomVxModel.applyPreparedProduct(board, prepared);
            board.geometryKey = window.AtomVxModel.GEOMETRY_KEY;
            board.size = prepared.size.slice(0, 3);
            stepMeshes.set(board.geometryKey, prepared.data);
            // The published package is the source of truth; keep its prepared
            // geometry in memory instead of serializing it to IndexedDB again.
            saveParts();
            return;
        }
        status('Loading the PT Atom VX controller board…');
        const prepared = await window.AtomVxModel.loadPrepared(THREE);
        // Another load may have inserted the same default board while its model
        // was being prepared. Never append it twice or into a different project.
        if(parts!==workspace||parts.some(isSystemPart)||hasProductController())return;
        board = window.AtomVxModel.partFromPrepared(prepared, workspaceFloorY);
        parts.unshift(board);
        stepMeshes.set(board.geometryKey, prepared.data);
        saveParts();
        // The caller restores remaining parts and builds the scene once.
    }

    function fitAssembly() {
        const bounds = new THREE.Box3();
        partRoot.updateMatrixWorld(true);
        partRoot.children.filter(mesh => mesh.visible).forEach(mesh => bounds.expandByObject(mesh));
        if (bounds.isEmpty()) return;
        bounds.getCenter(orbit.target);
        orbit.desiredTarget.copy(orbit.target);
        orbit.radius = Math.max(.03, bounds.getSize(new THREE.Vector3()).length() * 1.6);
    }

    let restoringGeometryRun = null;
    async function restoreStepGeometry() {
        const restoreRun = importRun;
        restoringGeometryRun = restoreRun;
        if(window.ProductCatalog&&window.ProductCatalog.refreshConfiguration){
            const run=importRun;
            try {
                const catalog=await window.ProductCatalog.list();let changed=false;
                for(const part of parts.filter(item=>item.catalogId&&item.productManifest)){
                    const entry=catalog.find(item=>item.id===part.catalogId);
                    const snapshot=Object.assign({},part);
                    const updated=await window.ProductCatalog.refreshConfiguration(snapshot,entry);
                    if(run!==importRun)return;
                    if(updated){part.productManifest=snapshot.productManifest;changed=true;}
                }
                if(changed)saveParts();
            } catch(error){status('Could not refresh product settings: '+error.message);}
        }
        const imported = parts.filter(p => p.geometryKey);
        if (restoreRun !== importRun) return;
        if (!imported.length) { restoringGeometryRun = null; return; }
        const currentRun = importRun;
        importing = true;
        status('Loading saved geometry…');
        try {
            for (const part of imported) {
                // Catalog products can be rebuilt from their saved manifest and
                // published assets. A blocked IndexedDB cache must not prevent
                // opening them; only standalone imports depend on that store.
                let data = stepMeshes.get(part.geometryKey);
                if (!data && !part.productManifest) data = await window.AssemblyStep.get(part.geometryKey);
                if (currentRun !== importRun) return;
                if (part.productManifest && window.ProductCatalog && (!data || !data.productOrigin ||
                    (window.ProductCatalog.matchesPrepared && !window.ProductCatalog.matchesPrepared(part, data)))) {
                    const product = await window.ProductCatalog.prepare(THREE, part);
                    if (currentRun !== importRun) return;
                    data = product.prepared.data;
                    part.size = product.prepared.size.slice();
                }
                if (currentRun !== importRun) return;
                if (data) {
                    const isGlb = /^glb-/.test(part.importGroup || '') || /\.glb$/i.test(part.fileName || '');
                    const upgraded = isGlb && window.AssemblyGlb && window.AssemblyGlb.upgradeData && window.AssemblyGlb.upgradeData(data);
                    stepMeshes.set(part.geometryKey, data);
                    if (upgraded) await window.AssemblyStep.put(part.geometryKey, data);
                }
            }
            rebuildScene(false); fitAssembly();
            status(imported.some(p => !stepMeshes.has(p.geometryKey)) ? 'Some geometry is missing. Import the STEP or GLB file again.' : 'Geometry loaded.');
        } catch (error) { status('Could not load geometry: ' + error.message); }
        finally {
            if (restoringGeometryRun === restoreRun) restoringGeometryRun = null;
            if (currentRun !== importRun) return;
            importing = false;
            if (guidedMode) guidedMode.refreshAvailability();
            window.AssemblyStep.prune(parts.map(part => part.geometryKey).filter(Boolean)).catch(() => {});
        }
    }

    function initThree() {
        if (initialized) return true;
        if (!window.THREE) {
            status('Three.js was not found. The 3D workspace cannot be opened.');
            return false;
        }
        THREE = window.THREE;
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        if (renderer.outputEncoding !== undefined && THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.shadowMap.enabled = false;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f7fa);
        camera = new THREE.PerspectiveCamera(52, 1, 0.001, 1000);
        orbit.target = new THREE.Vector3(0, 0.45, 0);
        orbit.desiredTarget = orbit.target.clone();
        orbit.startTarget = orbit.target.clone();
        raycasterState.raycaster = new THREE.Raycaster();
        raycasterState.pointer = new THREE.Vector2();

        viewportStyle = window.ProductViewportStyle.create(THREE, renderer, scene);

        floorMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            viewportStyle.floorMaterial()
        );
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = -0.001;
        floorMesh.receiveShadow = true;
        scene.add(floorMesh);
        gridHelper = new THREE.GridHelper(8, 320, 0x7f8f9f, 0xa9b5c1);
        gridHelper.position.y = -0.0005;
        const gridMaterials = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
        gridMaterials.forEach(material => {
            material.depthTest = true;
            material.transparent = true;
            material.opacity = 0.18;
        });
        scene.add(gridHelper);

        partRoot = new THREE.Group();
        scene.add(partRoot);
        parts = loadParts();
        rebuildScene(false);
        geometryReady = ensureSystemBoard().then(restoreStepGeometry).catch(error => status('Could not load the PT Atom VX board: ' + error.message))
            .then(() => { equipmentModelReady = true; });
        if (window.AssemblyGuidedMode) {
            guidedMode = window.AssemblyGuidedMode.create({
                THREE, modal, canvas, camera, orbit, scene, viewportStyle,
                parts: () => parts, selectedId: () => selectedId, boardId: currentBoardId,
                busy: () => importing || !!mateAnimation, status,
                suspend() {
                    guideWorkspace = { target: orbit.target.clone(), desiredTarget: orbit.desiredTarget.clone(), radius: orbit.radius,
                        theta: orbit.theta, phi: orbit.phi, desiredTheta: orbit.desiredTheta, desiredPhi: orbit.desiredPhi,
                        floor: workspaceFloorY, floorY: floorMesh.position.y, gridY: gridHelper.position.y, visible: partRoot.visible };
                    orbit.dragging = false; clearFaces(); partRoot.visible = false;
                    if (moveHandle) moveHandle.visible = false;
                    workspaceFloorY = 0; floorMesh.position.y = -.001; gridHelper.position.y = -.0005;
                },
                resume() {
                    if (!guideWorkspace) return;
                    const saved = guideWorkspace; guideWorkspace = null;
                    partRoot.visible = saved.visible; workspaceFloorY = saved.floor;
                    floorMesh.position.y = saved.floorY; gridHelper.position.y = saved.gridY;
                    orbit.target.copy(saved.target); orbit.desiredTarget.copy(saved.desiredTarget);
                    ['radius', 'theta', 'phi', 'desiredTheta', 'desiredPhi'].forEach(key => { orbit[key] = saved[key]; });
                    orbit.dragging = false; syncInputs();
                }
            });
            geometryReady.then(() => { guidedMode.refreshAvailability(); loadPublishedEquipment(); });
            bindActionTooltips();
        }
        bindCanvasControls();
        initialized = true;
        animate();
        return true;
    }

    function makeMesh(part) {
        let geometry;
        if (part.type === 'wheel') {
            geometry = new THREE.CylinderGeometry(part.size[0], part.size[2], part.size[1], 24);
        } else if (part.type === 'step') {
            geometry = new THREE.BufferGeometry();
            const data = stepMeshes.get(part.geometryKey);
            if (data) {
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
                if (data.uvs) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
                geometry.setIndex(ArrayBuffer.isView(data.indices) ? new THREE.BufferAttribute(data.indices, 1) : data.indices);
                geometry.userData.brepFaces = data.faces;
                geometry.userData.productNodes = data.nodes;
            }
        } else {
            geometry = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
        }
        const mesh = new THREE.Mesh(geometry, buildPartMaterials(part, geometry, stepMeshes.get(part.geometryKey)));
        if (part.productManifest) {
            const baseRaycast = mesh.raycast;
            mesh.raycast = function (raycaster, hits) {
                const first = hits.length;
                baseRaycast.call(this, raycaster, hits);
                const surfaces = geometry.userData.brepFaces || [];
                for (let index = hits.length - 1; index >= first; index--) {
                    const triangle = hits[index].faceIndex;
                    let low = 0, high = surfaces.length - 1, surface;
                    while (low <= high) {
                        const middle = (low + high) >> 1, face = surfaces[middle];
                        if (triangle < face.first) high = middle - 1;
                        else if (triangle > face.last) low = middle + 1;
                        else { surface = face; break; }
                    }
                    if (surface && surface.artworkId) hits.splice(index, 1);
                }
            };
        }
        if (part.type === 'step' && !stepMeshes.has(part.geometryKey)) mesh.visible = false;
        // Keep the user's native board record, but let a complete product supply
        // its own controller. Removing that product reveals the native board.
        if (isSystemPart(part) && hasProductController()) mesh.visible = false;
        mesh.position.fromArray(part.position);
        mesh.rotation.fromArray(part.rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.assemblyPartId = part.id;
        viewportStyle.apply(mesh);
        if (!part.productManifest && window.AtomVxModel && window.AtomVxModel.matches(part)) window.AtomVxModel.attachBoardArtwork(THREE, mesh);
        return mesh;
    }

    function faceKeyForNormal(part, normal) {
        if (part.type === 'wheel' && Math.abs(normal.y) < 0.9) return 'side';
        return normal.toArray().map(value => value.toFixed(3)).join(',');
    }

    function makePartMaterial(part, color) {
        return new THREE.MeshStandardMaterial({ color: color, roughness: 0.62, metalness: part.type === 'step' ? 0.16 : 0.04 });
    }

    function buildPartMaterials(part, geometry, storedData) {
        const importedMaterials = window.AssemblyGlb && window.AssemblyGlb.createMaterials
            ? window.AssemblyGlb.createMaterials(THREE, storedData)
            : [];
        const materials = importedMaterials.length ? importedMaterials : [makePartMaterial(part, part.color)];
        const materialIndexes = {};
        // Match SIM: share materials between explicit paint overrides only.
        // An imported material with the same color can have another texture,
        // roughness or metalness and must not replace the paint material.
        const colorIndexes = {};
        const indexFor = (key, face) => {
            const color = part.faceColors && part.faceColors[key];
            if (!color) return importedMaterials.length && face && Number.isInteger(face.materialIndex) ? face.materialIndex : 0;
            if (materialIndexes[key] === undefined) {
                const sourceIndex = face && Number.isInteger(face.materialIndex) ? face.materialIndex : 0;
                const colorKey = color.toLowerCase() + (part.productManifest ? ':' + sourceIndex : '');
                if (colorIndexes[colorKey] === undefined) {
                    colorIndexes[colorKey] = materials.length;
                    if (part.productManifest && importedMaterials[sourceIndex]) {
                        const painted = importedMaterials[sourceIndex].clone(); painted.color.set(color); materials.push(painted);
                    } else materials.push(makePartMaterial(part, color));
                }
                materialIndexes[key] = colorIndexes[colorKey];
            }
            return materialIndexes[key];
        };
        if (geometry.isBufferGeometry && geometry.userData && Array.isArray(geometry.userData.brepFaces)) {
            geometry.clearGroups();
            let group = null;
            geometry.userData.brepFaces.forEach((face, faceIndex) => {
                const start = face.first * 3;
                const count = (face.last - face.first + 1) * 3;
                const materialIndex = indexFor('brep-' + faceIndex, face);
                if (group && group.materialIndex === materialIndex && group.start + group.count === start) group.count += count;
                else {
                    if (group) geometry.addGroup(group.start, group.count, group.materialIndex);
                    group = { start, count, materialIndex };
                }
            });
            if (group) geometry.addGroup(group.start, group.count, group.materialIndex);
        } else if (Array.isArray(geometry.faces)) {
            geometry.faces.forEach(face => { face.materialIndex = indexFor(faceKeyForNormal(part, face.normal)); });
            geometry.groupsNeedUpdate = true;
        }
        return materials.length === 1 ? materials[0] : materials;
    }

    function refreshPartMaterials(part) {
        const mesh = meshById.get(part.id);
        if (!mesh) return;
        const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.material = buildPartMaterials(part, mesh.geometry, stepMeshes.get(part.geometryKey));
        viewportStyle.apply(mesh);
        old.forEach(material => { if (material.map) material.map.dispose(); material.dispose(); });
    }

    function colorFaceForSelectedPart() {
        for (let index = faces.length - 1; index >= 0; index--) {
            if (faces[index].partId === selectedId) return faces[index];
        }
        return null;
    }

    function syncFaceColorInput() {
        const part = selectedPart();
        const face = colorFaceForSelectedPart();
        const label = byId('assembly-color-label');
        ui.color.disabled = !part || !face || isCompanyPart(part);
        if (label) label.firstChild.nodeValue = face ? 'Selected face color' : 'Select a face to color';
        if (part && face) {
            const sourceColor = /^#[0-9a-f]{6}$/i.test(face.color || '') ? face.color : part.color;
            ui.color.value = (part.faceColors && part.faceColors[face.key]) || sourceColor;
        }
    }

    function rebuildScene(persist = true) {
        clearFaces();
        while (partRoot.children.length) {
            const child = partRoot.children[0];
            partRoot.remove(child);
            if (child.userData.atomVxArtwork && child.userData.atomVxArtwork.dispose) child.userData.atomVxArtwork.dispose();
            if (child.geometry) child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
            else if (child.material) child.material.dispose();
        }
        meshById.clear();
        parts.forEach((part) => {
            const mesh = makeMesh(part);
            partRoot.add(mesh);
            meshById.set(part.id, mesh);
        });
        // Restoring a window is read-only: placeholder geometry must not move
        // saved parts or notify SIM twice (before and after CAD finishes).
        if (persist) { settleAllGroupsOnFloor(); saveParts(); }
        renderList();
        updateSelectionBox();
    }

    function selectedPart() { return parts.find((part) => part.id === selectedId) || null; }
    function targetPart() { return parts.find((part) => part.id === targetId) || null; }

    function selectPart(partId) {
        selectedId = parts.some((part) => part.id === partId) ? partId : '';
        renderList();
        syncInputs();
        updateSelectionBox();
        if (guidedMode) guidedMode.refreshAvailability();
    }

    function renderList() {
        if (guidedMode) guidedMode.refreshAvailability();
        if (!ui.list) return;
        ui.list.textContent = '';
        parts.forEach((part) => {
            if (isSystemPart(part) && hasProductController()) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'assembly-part-item' + (part.id === selectedId ? ' is-selected' : '') + (part.id === targetId ? ' is-target' : '');
            const dot = document.createElement('span');
            dot.className = 'assembly-part-color';
            dot.style.backgroundColor = part.color;
            const label = document.createElement('span');
            label.className = 'assembly-part-label';
            label.textContent = part.name;
            button.title = part.name;
            button.setAttribute('aria-pressed', part.id === selectedId ? 'true' : 'false');
            const motor = document.createElement('span');
            motor.className = 'assembly-part-motor';
            if (isProtectedPart(part)) {
                const lock = document.createElement('i');
                lock.className = 'fas fa-lock';
                lock.setAttribute('aria-label', 'System board');
                motor.appendChild(lock);
            } else motor.textContent = part.motor;
            button.appendChild(dot);
            button.appendChild(label);
            button.appendChild(motor);
            button.addEventListener('click', () => selectPart(part.id));
            ui.list.appendChild(button);
        });
    }

    function equipmentCatalog() {
        return publishedEquipment.filter(item => !isSelectedProductEquipment(item));
    }

    function isSelectedProductEquipment(item) {
        const boardId = currentBoardId();
        return !!(item && (item.containsController || window.ProductCatalog.hasController(item) || item.productId === boardId || item.id === 'product:' + boardId ||
            item.productManifest && item.productManifest.id === boardId));
    }

    function renderEquipmentCategories() {
        if (!ui.equipmentCategory) return;
        const previous = ui.equipmentCategory.value;
        const categories = ['All'];
        equipmentCatalog().forEach((item) => {
            if (item.category && !categories.includes(item.category)) categories.push(item.category);
        });
        ui.equipmentCategory.textContent = '';
        categories.forEach((category) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            ui.equipmentCategory.appendChild(option);
        });
        if (categories.includes(previous)) ui.equipmentCategory.value = previous;
        renderEquipment();
    }

    async function loadPublishedEquipment() {
        if (!window.ProductCatalog || !window.THREE) return;
        try {
            const latest = await window.ProductCatalog.list();
            if (equipmentClosed) return;
            if (guidedMode && guidedMode.refreshPublished) await guidedMode.refreshPublished(latest);
            const signature = items => JSON.stringify(items.map(item => [item.id, item.name, item.category, item.manifestUrl, item.thumbnailUrl, item.previewRevision]));
            if (signature(latest) === signature(publishedEquipment)) return;
            publishedEquipment.forEach(item => {
                const next = latest.find(entry => entry.id === item.id);
                if (!next || next.previewRevision !== item.previewRevision || next.thumbnailUrl !== item.thumbnailUrl) equipmentImages.delete(item.id);
            });
            publishedEquipment = latest;
            renderEquipmentCategories();
        } catch (error) { status(error.message); }
    }

    function updateEquipmentImage(item, source) {
        equipmentImages.set(item.id, source);
        item.previewError = '';
        const card = equipmentCards.get(item.id);
        if (!card) return;
        card.preview.dataset.state = 'loading';
        card.icon.alt = item.name || 'Equipment';
        card.icon.src = source;
        card.category.textContent = item.category || 'Other';
        card.button.title = item.name || 'Equipment';
    }

    function requestEquipmentPreview(item) {
        if (equipmentClosed || !equipmentVisible.has(item.id) || equipmentImages.has(item.id) || equipmentPending.has(item.id)) return;
        if (!equipmentPreviewer) {
            equipmentPreviewer = window.ProductCatalog.createPreviewer(window.THREE, {
                width: 240, height: 160,
                // Cached images bypass this gate. Only new 3D renders wait for
                // the workspace and yield while the user moves its camera.
                beforeRender: entry => equipmentClosed ? Promise.resolve(false) : new Promise(resolve => {
                    equipmentPreviewWaiters.push({ id: entry.id, resolve, queuedAt: Date.now() });
                    scheduleEquipmentPreviews();
                })
            });
        }
        equipmentPending.add(item.id);
        let cancelled = false;
        const entry = item.previewFallback ? Object.assign({}, item, { thumbnail: undefined, thumbnailUrl: undefined }) : item;
        equipmentPreviewer.get(entry, { ignorePublished: true }).then(source => {
            if (!equipmentClosed && source) updateEquipmentImage(item, source);
        }).catch(error => {
            cancelled = !!error.cancelled;
            if (equipmentClosed || cancelled) return;
            item.previewError = error.message;
            const card = equipmentCards.get(item.id);
            if (card) { card.preview.dataset.state = 'error'; card.placeholder.textContent = 'Preview unavailable'; card.button.title = 'Preview unavailable. Click to add ' + item.name + '.'; }
        }).finally(() => {
            equipmentPending.delete(item.id);
            // A card can re-enter the viewport while its previous queued job
            // is cancelling. Resume it without waiting for another scroll.
            if (cancelled && !equipmentClosed && equipmentVisible.has(item.id)) requestEquipmentPreview(item);
        });
    }

    function resumeEquipmentPreviews() {
        const interacting = !!mateAnimation || orbit.dragging || (guidedMode && (guidedMode.active || guidedMode.loading));
        const ready = equipmentModelReady && !importing && !interacting;
        for (let index = equipmentPreviewWaiters.length - 1; index >= 0; index--) {
            const wait = equipmentPreviewWaiters[index], cancelled = equipmentClosed || !equipmentVisible.has(wait.id);
            // A slow/stalled geometry restore must not keep every preview waiting.
            const waited = Date.now() - wait.queuedAt >= 2000;
            if (cancelled || ready || waited && !interacting) { equipmentPreviewWaiters.splice(index, 1); wait.resolve(!cancelled); }
        }
    }

    function scheduleEquipmentPreviews() {
        if (equipmentClosed || equipmentPreviewTimer !== null) return;
        equipmentPreviewTimer = setTimeout(() => {
            equipmentPreviewTimer = null;
            resumeEquipmentPreviews();
            if (equipmentPreviewWaiters.length) scheduleEquipmentPreviews();
        }, 120);
    }

    function syncEquipmentVisibility() {
        if (!ui.equipmentList.getBoundingClientRect) return;
        const bounds = ui.equipmentList.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        equipmentCards.forEach(card => {
            const rect = card.button.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0 && rect.bottom >= bounds.top - 48 && rect.top <= bounds.bottom + 48;
            if (visible) { equipmentVisible.add(card.item.id); requestEquipmentPreview(card.item); }
            else equipmentVisible.delete(card.item.id);
        });
    }

    function observeEquipment() {
        if (equipmentObserver) equipmentObserver.disconnect();
        equipmentVisible.clear();
        if (typeof window.IntersectionObserver === 'function') {
            if (!equipmentObserver) equipmentObserver = new window.IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const id = entry.target.dataset.equipmentId, card = equipmentCards.get(id);
                    if (!card || card.button !== entry.target) return;
                    if (entry.isIntersecting) { equipmentVisible.add(id); requestEquipmentPreview(card.item); }
                    else equipmentVisible.delete(id);
                });
            }, { root: ui.equipmentList, rootMargin: '48px 0px', threshold: 0 });
            equipmentCards.forEach(card => equipmentObserver.observe(card.button));
            // Do not depend on the first IntersectionObserver notification to
            // start visible cards in this older embedded Chromium version.
            syncEquipmentVisibility();
        } else {
            // Older embedded browsers can still show the filtered catalog.
            equipmentCards.forEach(card => { equipmentVisible.add(card.item.id); requestEquipmentPreview(card.item); });
        }
    }

    let draggedEquipment = null;

    async function addPublishedProduct(item, dropPoint, preparedProduct) {
        if (importing) return;
        if (isSelectedProductEquipment(item)) { status('The project already contains its main robot or board.'); return; }
        importing = true;
        const run = importRun;
        status('Loading ' + item.name + '…');
        try {
            const product = await (preparedProduct || window.ProductCatalog.prepare(THREE, item));
            if (run !== importRun) return;
            if (window.ProductCatalog.hasController({productManifest:product.manifest}) || product.manifest.id === currentBoardId()) { status('The project already contains its main robot or board.'); return; }
            const prepared = product.prepared;
            const part = makePart(product.manifest.name, 'step', prepared.source.colorHex || '#718391', [dropPoint ? dropPoint.x : 0, (dropPoint ? dropPoint.y : workspaceFloorY) + prepared.size[1] / 2, dropPoint ? dropPoint.z : 0], prepared.size.slice());
            part.catalogId = item.id;
            part.geometryKey = 'product-geometry-' + id();
            part.importGroup = 'product-' + part.id;
            part.productManifest = JSON.parse(JSON.stringify(product.manifest));
            part.productBaseUrl = product.baseUrl;
            stepMeshes.set(part.geometryKey, prepared.data);
            await window.AssemblyStep.put(part.geometryKey, prepared.data);
            if (run !== importRun) return;
            addPart(part); rebuildScene(); selectPart(part.id); if (!dropPoint) fitAssembly();
            status('Added ' + part.name + '. Its device and joint settings are preserved for SIM.');
        } catch (error) { status('Could not add ' + item.name + ': ' + error.message); }
        finally { importing = false; if (guidedMode) guidedMode.refreshAvailability(); }
    }

    let equipmentDragPreview = null;
    function clearEquipmentDragPreview(session) {
        if (!session) return;
        session.cancelled = true;
        if (session.mesh) {
            session.mesh.parent.remove(session.mesh);
            session.mesh.geometry.dispose();
            const materials = Array.isArray(session.mesh.material) ? session.mesh.material : [session.mesh.material];
            const textures = new Set();
            materials.forEach(material => { if (material.map) textures.add(material.map); material.dispose(); });
            textures.forEach(texture => texture.dispose());
            stepMeshes.delete(session.key);
        }
        if (equipmentDragPreview === session) equipmentDragPreview = null;
    }
    function startEquipmentDragPreview(item) {
        clearEquipmentDragPreview(equipmentDragPreview);
        const session = { point: null, inside: false, committed: false, cancelled: false };
        equipmentDragPreview = session;
        session.product = window.ProductCatalog.prepare(THREE, item);
        session.product.then(product => {
            if (session.cancelled || equipmentClosed || equipmentDragPreview !== session) return;
            const prepared = product.prepared;
            const part = makePart(product.manifest.name, 'step', prepared.source.colorHex || '#718391', [0, 0, 0], prepared.size.slice());
            session.key = part.geometryKey = 'drag-preview-' + id();
            part.productManifest = product.manifest;
            stepMeshes.set(session.key, prepared.data);
            session.height = prepared.size[1];
            session.mesh = makeMesh(part);
            session.mesh.raycast = function () {};
            session.mesh.visible = false;
            partRoot.parent.add(session.mesh);
            moveEquipmentDragPreview(session);
        }).catch(error => {
            if (!session.cancelled) status('Could not preview ' + item.name + ': ' + error.message);
        });
        return session;
    }
    function moveEquipmentDragPreview(session) {
        if (!session || !session.mesh) return;
        session.mesh.visible = session.inside && !!session.point;
        if (session.point) session.mesh.position.set(session.point.x, session.point.y + session.height / 2, session.point.z);
    }

    function bindEquipmentDrag(button, icon, item) {
        button.draggable = true;
        icon.draggable = false;
        button.title = 'Drag ' + (item.name || 'equipment') + ' into the scene';
        button.style.cursor = 'var(--cursor-grab, grab)';
        button.addEventListener('dragstart', event => {
            if (isSelectedProductEquipment(item) || importing || equipmentClosed || mateAnimation || guidedMode && guidedMode.loading) { event.preventDefault(); return; }
            draggedEquipment = item;
            startEquipmentDragPreview(item);
            const emptyImage = document.createElement('canvas');
            emptyImage.width = emptyImage.height = 1;
            event.dataTransfer.setDragImage(emptyImage, 0, 0);
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('application/x-assembly-equipment', item.id);
            button.style.cursor = 'var(--cursor-grabbing, grabbing)';
        });
        button.addEventListener('dragend', () => {
            if (equipmentDragPreview && !equipmentDragPreview.committed) clearEquipmentDragPreview(equipmentDragPreview);
            draggedEquipment = null;
            button.style.cursor = 'var(--cursor-grab, grab)';
            if (canvas) canvas.style.cursor = 'var(--cursor-grab, grab)';
        });
    }

    function bindEquipmentDrop() {
        canvas.addEventListener('dragover', event => {
            if (!draggedEquipment || importing || equipmentClosed) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            updatePointerPosition(event);
            const session = equipmentDragPreview;
            if (session) {
                session.inside = true;
                session.point = raycasterState.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -workspaceFloorY), new THREE.Vector3());
                moveEquipmentDragPreview(session);
            }
        });
        canvas.addEventListener('dragleave', () => {
            if (equipmentDragPreview) { equipmentDragPreview.inside = false; moveEquipmentDragPreview(equipmentDragPreview); }
        });
        canvas.addEventListener('drop', event => {
            if (!draggedEquipment || importing || equipmentClosed) return;
            event.preventDefault(); event.stopPropagation();
            const item = draggedEquipment;
            draggedEquipment = null;
            setPointerRay(event);
            const point = raycasterState.raycaster.ray.intersectPlane(
                new THREE.Plane(new THREE.Vector3(0, 1, 0), -workspaceFloorY), new THREE.Vector3());
            if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) {
                clearEquipmentDragPreview(equipmentDragPreview);
                status('Drop the equipment over the grid.'); return;
            }
            const session = equipmentDragPreview;
            if (session) { session.committed = true; session.inside = true; session.point = point.clone(); moveEquipmentDragPreview(session); }
            addPublishedProduct(item, point.clone(), session && session.product).finally(() => clearEquipmentDragPreview(session));
        });
    }

    function renderEquipment() {
        if (!ui.equipmentList) return;
        const selectedCategory = ui.equipmentCategory ? ui.equipmentCategory.value : 'All';
        equipmentCards.clear();
        ui.equipmentList.textContent = '';
        equipmentCatalog()
            .filter((item) => selectedCategory === 'All' || item.category === selectedCategory)
            .forEach((item) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'assembly-equipment-item';
                button.dataset.equipmentId = item.id;
                const preview = document.createElement('div');
                preview.className = 'assembly-equipment-preview';
                preview.dataset.state = item.previewError ? 'error' : 'loading';
                const placeholder = document.createElement('span');
                placeholder.className = 'assembly-equipment-placeholder';
                placeholder.textContent = item.previewError ? 'Preview unavailable' : 'Loading preview';
                const icon = document.createElement('img');
                icon.alt = item.name || 'Equipment';
                icon.decoding = 'async';
                icon.onload = () => { preview.dataset.state = 'ready'; };
                icon.onerror = () => {
                    if (equipmentClosed) return;
                    preview.dataset.state = 'loading';
                    equipmentImages.delete(item.id);
                    if (!item.previewFallback && item.thumbnailUrl) {
                        item.previewFallback = true;
                        requestEquipmentPreview(item);
                    } else { preview.dataset.state = 'error'; placeholder.textContent = 'Preview unavailable'; }
                };
                if (equipmentImages.has(item.id)) icon.src = equipmentImages.get(item.id);
                const copy = document.createElement('span');
                const name = document.createElement('strong');
                name.textContent = item.name || 'Equipment';
                const category = document.createElement('small');
                category.textContent = item.category || 'Other';
                button.title = item.name || 'Equipment';
                copy.appendChild(name);
                copy.appendChild(category);
                preview.appendChild(icon);
                preview.appendChild(placeholder);
                button.appendChild(preview);
                button.appendChild(copy);
                bindEquipmentDrag(button, icon, item);
                ui.equipmentList.appendChild(button);
                equipmentCards.set(item.id, { item, button, icon, category, preview, placeholder });
            });
        observeEquipment();
    }

    let deviceSelection = { partId: '', deviceId: '' };
    function propertyLabel(text, input) {
        const label = document.createElement('label'); label.textContent = text; label.appendChild(input); return label;
    }
    function selectOptions(input, options, value) {
        input.textContent = '';
        options.forEach(item => { const option = document.createElement('option'); option.value = item.value; option.textContent = item.label; input.appendChild(option); });
        input.value = value || '';
    }
    async function resizeSelectedScrew(part, lengthMm) {
        if (importing) return;
        importing = true;
        const run = importRun;
        try {
            const oldData = stepMeshes.get(part.geometryKey);
            const product = await window.ProductCatalog.resizeScrew(THREE, part, lengthMm);
            if (run !== importRun || !parts.includes(part)) return;
            const key = 'product-geometry-' + id();
            await window.AssemblyStep.put(key, product.prepared.data);
            if (run !== importRun || !parts.includes(part)) return;
            const delta = new THREE.Vector3().fromArray(product.prepared.data.productOrigin).sub(new THREE.Vector3().fromArray(oldData && oldData.productOrigin || [0, 0, 0]));
            delta.applyEuler(new THREE.Euler(...part.rotation));
            part.position = new THREE.Vector3().fromArray(part.position).add(delta).toArray();
            stepMeshes.delete(part.geometryKey);
            part.geometryKey = key; stepMeshes.set(key, product.prepared.data);
            part.productManifest = product.manifest; part.size = product.prepared.size.slice();
            rebuildScene(); syncInputs();
            status('Screw length set to ' + lengthMm + ' mm.');
        } catch (error) { status(error.message); }
        finally { importing = false; }
    }

    async function updateSelectedEquipment(part) {
        if (!part || !part.productManifest) return status('Select an Equipment product to update.');
        if (mateAnimation) return status('Wait for the mate movement to finish, then update.');
        if (restoringGeometryRun !== null && restoringGeometryRun === importRun) {
            ++importRun; restoringGeometryRun = null; importing = false;
        }
        if (importing) return status('Another import or update is running. Please wait.');
        importing = true;
        const run = importRun;
        status('Updating from Equipment...');
        let updateActive = true;
        const progress = text => { if (updateActive && run === importRun) status(text); };
        async function stage(label, operation) {
            progress(label);
            let timer;
            try { return await Promise.race([operation(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out. The previous model was kept; try Update again.')), 45000); })]); }
            finally { clearTimeout(timer); }
        }
        try {
            const entries = await stage('Reading Equipment catalog...', () => window.ProductCatalog.list());
            const entry = entries.find(item => item.productId === part.productManifest.id);
            if (!entry) throw new Error('This product is no longer available in Equipment.');
            // Fetch the published manifest explicitly: prepare's URL cache may
            // still contain a product loaded before the most recent publish.
            const manifest = await stage('Reading latest product definition...', async () => {
                const response = await fetch(entry.manifestUrl, { cache: 'no-cache' });
                if (!response.ok) throw new Error('Could not read the latest product.');
                return response.json();
            });
            if (manifest.id !== part.productManifest.id) throw new Error('Product ID does not match.');
            const product = await stage('Loading updated model...', () => window.ProductCatalog.prepare(THREE, { productManifest: manifest, productBaseUrl: new URL('.', entry.manifestUrl).href, forceReload: true, onProgress: progress }));
            if (run !== importRun || !parts.includes(part)) return;
            const key = 'product-geometry-' + id();
            progress('Applying updated model...');
            const changedGeometry = !window.ProductCatalog.matchesPrepared({ productManifest: product.manifest }, stepMeshes.get(part.geometryKey));
            // Keep a recoverable workspace snapshot before replacing the instance.
            const backup = JSON.stringify({ schemaVersion: 1, boardId: currentBoardId(), parts });
            if (typeof fs !== 'undefined' && fs && typeof fs.write === 'function') fs.write('/assembly-before-equipment-update.json', backup);
            else window.assemblyBeforeEquipmentUpdate = backup;
            // Remove only the obsolete backup, never unrelated user storage.
            localStorage.removeItem('robot_assembly_before_equipment_update');
            const oldData = stepMeshes.get(part.geometryKey);
            const delta = new THREE.Vector3().fromArray(product.prepared.data.productOrigin || [0,0,0]).sub(new THREE.Vector3().fromArray(oldData && oldData.productOrigin || [0,0,0]));
            delta.applyEuler(new THREE.Euler(...part.rotation));
            part.position = new THREE.Vector3().fromArray(part.position).add(delta).toArray();
            if (changedGeometry) {
                part.faceColors = {}; part.mateLinks = []; part.mateTypes = {};
                parts.forEach(item => {
                    item.mates = (item.mates || []).filter(mate => mate.a !== part.id && mate.b !== part.id);
                    item.mateLinks = (item.mateLinks || []).filter(link => link !== part.id);
                    if (item.mateTypes) delete item.mateTypes[part.id];
                });
                undoMate = null;
            }
            part.productManifest = JSON.parse(JSON.stringify(product.manifest));
            part.productBaseUrl = product.baseUrl; part.catalogId = entry.id;
            part.geometryKey = key; part.size = product.prepared.size.slice();
            stepMeshes.set(key, product.prepared.data);
            rebuildScene(); syncInputs();
            if (guidedMode) { guidedMode.exit(); guidedMode.refreshPublished(entries).catch(error => progress('Could not refresh guide: ' + error.message)); }
            status('Updated ' + product.manifest.name + ' from Equipment (' + product.manifest.components.length + ' components). Save the project to keep this version.' + (changedGeometry ? ' Surface mates must be set again.' : ''));
        } catch (error) { status('Could not update from Equipment: ' + error.message); }
        finally { updateActive = false; if (run === importRun) importing = false; if (guidedMode) guidedMode.refreshAvailability(); }
    }

    function renderProductProperties() {
        const host = byId('assembly-product-devices'), mountHost = byId('assembly-product-mounts'), part = selectedPart();
        const config = window.AssemblyProductConfig;
        const legacy = byId('assembly-legacy-motor-label');
        if (legacy) legacy.hidden = !!(part && part.productManifest);
        if (!host || !mountHost || !config) return;
        host.textContent = ''; mountHost.textContent = ''; host.hidden = true; mountHost.hidden = true;
        if (!part) return;
        if (part.productManifest) {
            host.hidden = false;
            const update = document.createElement('button');
            update.id = 'assembly-update-equipment';
            update.type = 'button'; update.textContent = 'Update from Equipment';
            update.style.width = '100%'; update.style.marginBottom = '10px';
            update.addEventListener('click', async () => { update.disabled = true; await updateSelectedEquipment(part); update.disabled = false; });
            host.appendChild(update);
        }
        const devices = config.devices(part), allBoards = config.boards(parts), boards = allBoards.filter(board => board.connected);
        const screw = part.productManifest && part.productManifest.components.find(c => c.primitive && c.primitive.type === 'screw');
        if (screw) {
            host.hidden = false;
            const length = document.createElement('input');
            length.type = 'number'; length.min = '2'; length.max = '60'; length.step = '1';
            length.value = String(Math.round(screw.primitive.size[1] * 1000 * 100) / 100);
            length.addEventListener('change', async () => {
                length.disabled = true;
                await resizeSelectedScrew(part, Number(length.value));
                length.disabled = false;
                length.value = String(part.productManifest.components.find(c => c.primitive && c.primitive.type === 'screw').primitive.size[1] * 1000);
            });
            host.appendChild(propertyLabel('Length (mm)', length));
            const note = document.createElement('small'); note.textContent = 'Measured from under the head. 2?60 mm.'; host.appendChild(note);
        }
        const endpoints = config.connectors(parts);
        endpoints.filter(endpoint => endpoint.partId === part.id).forEach(endpoint => {
            host.hidden = false;
            const group = document.createElement('details'), heading = document.createElement('summary');
            heading.textContent = endpoint.connector.name + ' / ' + endpoint.connector.interfaceId;
            group.className = 'assembly-connector-definition';
            group.appendChild(heading);
            const select = document.createElement('select'), current = config.connectorTarget(parts, endpoint);
            const candidates = config.availableConnectors(parts, endpoint);
            const matches = candidate => current && candidate.partId === current.partId && candidate.componentId === current.componentId && candidate.connectorId === current.connectorId;
            const currentIndex = candidates.findIndex(matches);
            const options = [{ value: '', label: 'Not connected' }].concat(candidates.map((candidate, index) => ({ value: String(index), label: candidate.name })));
            if (current && currentIndex < 0) options.push({ value: 'invalid', label: 'Previous connection unavailable - disconnect to replace' });
            selectOptions(select, options, current ? currentIndex < 0 ? 'invalid' : String(currentIndex) : '');
            select.addEventListener('change', () => {
                if (select.value === 'invalid') return;
                try {
                    config.connectConnectors(parts, endpoint, select.value === '' ? null : candidates[Number(select.value)]);
                    saveParts(); renderProductProperties(); status('Connector wiring saved.');
                } catch (error) { status(error.message); renderProductProperties(); }
            });
            group.appendChild(propertyLabel('Connect to', select));
            const pins = document.createElement('small');
            pins.textContent = endpoint.connector.pins.map(pin => pin.id + ': ' + pin.signal + (pin.voltage !== undefined ? ' (' + pin.voltage + ' V)' : '')).join(' / ');
            group.appendChild(pins);
            const note = document.createElement('small'); note.textContent = 'Matching signal connectors enable extension ports through the main board. Power-only links do not enable ports.';
            group.appendChild(note); host.appendChild(group);
        });
        if (devices.length) {
            host.hidden = false;
            const title = document.createElement('div'); title.className = 'assembly-section-label'; title.textContent = 'DEVICES'; host.appendChild(title);
            const deviceInput = document.createElement('select'); deviceInput.setAttribute('aria-label', 'Device');
            const chosen = deviceSelection.partId === part.id && devices.some(d => d.id === deviceSelection.deviceId) ? deviceSelection.deviceId : devices[0].id;
            selectOptions(deviceInput, devices.map(device => ({ value: device.id, label: config.binding(part, device.id).name })), chosen);
            host.appendChild(deviceInput);
            const fields = document.createElement('div'); fields.className = 'assembly-device-fields'; host.appendChild(fields);
            function renderDevice() {
                fields.textContent = '';
                const device = devices.find(d => d.id === deviceInput.value), current = config.binding(part, device.id);
                deviceSelection = { partId: part.id, deviceId: device.id };
                const name = document.createElement('input'); name.type = 'text'; name.value = current.name;
                fields.appendChild(propertyLabel('Device name', name));
                const board = document.createElement('select'), port = document.createElement('select');
                const ultrasonic = device.type === 'distance-sensor' && config.portType(device) === 'digital';
                const trigger = document.createElement('select');
                let boardIndex = boards.findIndex(b => b.partId === current.boardPartId && b.componentId === current.boardComponentId);
                // Show the available pins immediately for the usual one-board
                // assembly. This is a UI default; no wiring is saved until the
                // user chooses a port, and existing bindings are never rerouted.
                if(boardIndex<0&&!current.boardPartId&&!current.port){
                    const compatible=boards.map((item,index)=>({item,index})).filter(({item})=>
                        config.availablePorts(parts,part.id,device.id,item.partId,item.componentId).length);
                    if(compatible.length===1)boardIndex=compatible[0].index;
                }
                selectOptions(board, [{ value: '', label: 'Not connected' }].concat(boards.map((item, index) => ({ value: String(index), label: item.name }))),
                    boardIndex < 0 ? '' : String(boardIndex));
                fields.appendChild(propertyLabel('Board', board));
                if (ultrasonic) fields.appendChild(propertyLabel('Trigger pin', trigger));
                fields.appendChild(propertyLabel(ultrasonic ? 'Echo pin' : 'Connector / pin', port));
                const side = document.createElement('select'), invert = document.createElement('input'); invert.type = 'checkbox'; invert.checked = current.invert;
                const encoderEnabled=document.createElement('input'),encoderA=document.createElement('select'),encoderB=document.createElement('select'),encoderCounts=document.createElement('input'),encoderInvert=document.createElement('input');
                encoderEnabled.type=encoderInvert.type='checkbox';encoderEnabled.checked=!!current.encoder;encoderInvert.checked=!!current.encoder?.invert;
                encoderCounts.type='number';encoderCounts.min='1';encoderCounts.value=current.encoder?.countsPerRevolution||'';
                if (device.type === 'motor') {
                    selectOptions(side, [{ value: 'none', label: 'Not a drive wheel' }, { value: 'left', label: 'Left drive wheel' }, { value: 'right', label: 'Right drive wheel' }], current.driveSide);
                    fields.appendChild(propertyLabel('Drive role', side));
                    fields.appendChild(propertyLabel('Motor encoder',encoderEnabled));
                    const encoderFields=document.createElement('div');encoderFields.hidden=!encoderEnabled.checked;
                    encoderFields.append(propertyLabel('Encoder A',encoderA),propertyLabel('Encoder B',encoderB),propertyLabel('Counts / shaft revolution (4×)',encoderCounts),propertyLabel('Reverse encoder',encoderInvert));fields.appendChild(encoderFields);
                    encoderEnabled.addEventListener('change',()=>{encoderFields.hidden=!encoderEnabled.checked;if(!encoderEnabled.checked)save();});
                }
                if (device.type === 'motor' || device.type === 'servo') {
                    const reverse = document.createElement('label'); reverse.className = 'assembly-device-invert'; reverse.appendChild(invert); reverse.appendChild(document.createTextNode('Reverse direction')); fields.appendChild(reverse);
                }
                const hint = document.createElement('small'); hint.textContent = 'Only compatible, available connectors are shown.'; fields.appendChild(hint);
                if (current.port && boardIndex < 0) {
                    const disconnected = document.createElement('small');
                    disconnected.textContent = 'Saved connection: ' + current.port + '. Connect its board to one main board to enable this port.';
                    fields.appendChild(disconnected);
                }
                function refreshPorts(value, triggerValue) {
                    const selectedBoard = board.value === '' ? null : boards[Number(board.value)];
                    const ports = selectedBoard ? config.availablePorts(parts, part.id, device.id, selectedBoard.partId, selectedBoard.componentId) : [];
                    selectOptions(port, [{ value: '', label: 'Not connected' }].concat(ports.filter(item => !ultrasonic || item.id !== triggerValue).map(item => ({ value: item.id, label: item.name || item.id }))), value);
                    if (ultrasonic) selectOptions(trigger, [{ value: '', label: 'Not connected' }].concat(ports.filter(item => item.id !== value).map(item => ({ value: item.id, label: item.name || item.id }))), triggerValue);
                    port.disabled = !selectedBoard;
                    trigger.disabled = !selectedBoard;
                    const pins=selectedBoard?selectedBoard.ports.filter(p=>p.type==='digital'):[];
                    for(const [input,pin] of [[encoderA,current.encoder?.pinA],[encoderB,current.encoder?.pinB]])selectOptions(input,[{value:'',label:'Not connected'},...pins.map(p=>({value:p.id,label:p.name||p.id}))],pin||'');
                }
                function save() {
                    const selectedBoard = board.value === '' ? null : boards[Number(board.value)];
                    try {
                        config.applyBinding(parts, part.id, { deviceId: device.id, name: name.value, boardPartId: selectedBoard ? selectedBoard.partId : '',
                            boardComponentId: selectedBoard ? selectedBoard.componentId : '', port: port.value, triggerPort: ultrasonic ? trigger.value : current.triggerPort, driveSide: device.type === 'motor' ? side.value : current.driveSide, invert: invert.checked,
                            encoder:device.type==='motor'&&encoderEnabled.checked?{pinA:encoderA.value,pinB:encoderB.value,countsPerRevolution:Number(encoderCounts.value),invert:encoderInvert.checked}:null });
                        saveParts(); renderProductProperties(); status('Device connection saved.');
                    } catch (error) { status(error.message); renderProductProperties(); }
                }
                board.addEventListener('change', () => { refreshPorts('', ''); if (!board.value) save(); });
                [name, port, trigger, side, invert].forEach(input => input.addEventListener('change', save));
                [encoderA,encoderB,encoderCounts,encoderInvert].forEach(input=>input.addEventListener('change',()=>{if(encoderA.value&&encoderB.value&&Number(encoderCounts.value)>0)save();}));
                refreshPorts(current.port, current.triggerPort);
            }
            deviceInput.addEventListener('change', renderDevice); renderDevice();
        }
        const ownBoards = boards.filter(board => board.partId === part.id || board.role !== 'main' && board.controllers.some(controller => controller.partId === part.id));
        ownBoards.forEach(board => {
            host.hidden = false;
            const group = document.createElement('details'), heading = document.createElement('summary');
            heading.textContent = board.partId !== part.id ? 'Extension ports / ' + board.name : 'Board connections' + (ownBoards.length > 1 ? ' / ' + board.componentId : ''); group.appendChild(heading);
            board.ports.forEach(port => {
                const select = document.createElement('select'), candidates = [], current = { value: '' };
                parts.forEach(devicePart => config.devices(devicePart).forEach(device => {
                    const value = config.binding(devicePart, device.id);
                    const ultrasonic = device.type === 'distance-sensor' && config.portType(device) === 'digital';
                    for (const field of ultrasonic ? ['port', 'triggerPort'] : ['port']) {
                        const key = devicePart.id + '/' + device.id + '/' + field;
                        const connected = value.boardPartId === board.partId && value.boardComponentId === board.componentId && value[field] === port.id;
                        if (connected) current.value = key;
                        if (!connected && (!config.availablePorts(parts, devicePart.id, device.id, board.partId, board.componentId).some(item => item.id === port.id) ||
                            ultrasonic && value[field === 'port' ? 'triggerPort' : 'port'] === port.id)) continue;
                        candidates.push({ value: key, label: devicePart.name + ' / ' + value.name + (ultrasonic ? field === 'port' ? ' / Echo' : ' / Trigger' : ''), devicePart, device, field });
                    }
                }));
                selectOptions(select, [{ value: '', label: 'Not connected' }].concat(candidates), current.value);
                select.addEventListener('change', () => {
                    try {
                        if (current.value) { const previous = candidates.find(c => c.value === current.value); config.applyBinding(parts, previous.devicePart.id, Object.assign(config.binding(previous.devicePart, previous.device.id), { [previous.field]: '' })); }
                        const next = candidates.find(c => c.value === select.value);
                        if (next) config.applyBinding(parts, next.devicePart.id, Object.assign(config.binding(next.devicePart, next.device.id), { boardPartId: board.partId, boardComponentId: board.componentId, [next.field]: port.id }));
                        saveParts(); renderProductProperties(); status('Board connection saved.');
                    } catch (error) { status(error.message); renderProductProperties(); }
                });
                const label = propertyLabel((port.name || port.id) + ' / ' + port.type, select); label.className = 'assembly-board-connection'; group.appendChild(label);
            });
            if (!board.ports.length) { const empty = document.createElement('small'); empty.textContent = 'No connectors defined for this board.'; group.appendChild(empty); }
            host.appendChild(group);
        });
        const mounts = config.mounts(part);
        if (mounts.length) {
            mountHost.hidden = false;
            const title = document.createElement('div'); title.className = 'assembly-section-label'; title.textContent = 'MOUNTING POINTS'; mountHost.appendChild(title);
            const mount = document.createElement('select'); selectOptions(mount, mounts.map(item => ({ value: item.id, label: item.name })), mounts[0].id);
            mountHost.appendChild(propertyLabel('Prepared mount', mount));
            const use = document.createElement('button'); use.type = 'button'; use.textContent = 'Select for Mate';
            use.addEventListener('click', () => {
                const face = config.mountFace(THREE, part, stepMeshes.get(part.geometryKey), mount.value);
                if (!face) { status('Reload this product to load its mounting points.'); return; }
                if(faces.length===2&&faces[0].mountId&&faces[0].partId!==part.id&&faces[1].partId===part.id)faces.pop();
                else if (faces.length === 2 || (faces.length && (!faces[0].mountId || faces[0].partId === part.id))) clearFaces();
                faces.push(face); targetId = faces[0].partId; updateFaceUI();
                status(faces.length === 1 ? 'Mount selected. Select a matching mount on another part.' : 'Two mounts selected. Click Mate in the top toolbar.');
            });
            mountHost.appendChild(use);
        }
    }

    function syncInputs() {
        updateUnmate();
        renderMates();
        renderProductProperties();
        updateContextHint();
        const part = selectedPart();
        if (ui.hologram) {
            ui.hologram.classList.toggle('is-visible', !!part);
            ui.hologram.setAttribute('aria-hidden', part ? 'false' : 'true');
        }
        [ui.name, ui.motor, ui.x, ui.y, ui.z, ui.rx, ui.ry, ui.rz].forEach((input) => { if (input) input.disabled = !part; });
        ui.rotateButtons.forEach(button => { button.disabled = !part; });
        if (ui.remove) ui.remove.disabled = !part || isProtectedPart(part);
        if (!part) {
            ui.name.value = '';
            ui.motor.value = '';
            [ui.x, ui.y, ui.z, ui.rx, ui.ry, ui.rz].forEach(input => { input.value = ''; });
            syncFaceColorInput();
            status('Select a part from the list or the 3D view.');
            return;
        }
        syncImportedPhysics(part);
        ui.name.value = part.name;
        ui.motor.value = part.motor;
        ui.x.value = part.position[0].toFixed(2);
        ui.y.value = part.position[1].toFixed(2);
        ui.z.value = part.position[2].toFixed(2);
        ui.rx.value = (part.rotation[0] * 180 / Math.PI).toFixed(1);
        ui.ry.value = (part.rotation[1] * 180 / Math.PI).toFixed(1);
        ui.rz.value = (part.rotation[2] * 180 / Math.PI).toFixed(1);
        syncFaceColorInput();
        status(part.type === 'step' && !stepMeshes.has(part.geometryKey) ? 'This imported part has no saved geometry. Import the 3D file again.' : 'Editing ' + part.name);
    }

    function updateSelectedFromInputs() {
        const part = selectedPart();
        if (!part) return;
        part.name = ui.name.value.trim() || 'Part';
        part.motor = ui.motor.value;
        const destination = new THREE.Vector3(safeNumber(ui.x.value, part.position[0]), safeNumber(ui.y.value, part.position[1]), safeNumber(ui.z.value, part.position[2]));
        const delta = destination.sub(new THREE.Vector3().fromArray(part.position));
        if (delta.lengthSq() > 0) {
            translateGroup(groupSnapshot(part.id), delta);
            ui.x.value = part.position[0].toFixed(2);
            ui.y.value = part.position[1].toFixed(2);
            ui.z.value = part.position[2].toFixed(2);
            undoMate = null;
            updateFaceUI();
        }
        const mesh = meshById.get(part.id);
        if (mesh) {
            mesh.position.fromArray(part.position);
        }
        renderList();
        updateSelectionBox();
        saveParts();
    }

    function settleGroupOnFloor(group) {
        updateWorkspaceFloor();
    }

    function updateWorkspaceFloor() {
        const bounds = new THREE.Box3();
        meshById.forEach(mesh => {
            if (!mesh.visible) return;
            mesh.updateMatrixWorld(true);
            bounds.expandByObject(mesh);
        });
        workspaceFloorY = bounds.isEmpty() ? 0 : bounds.min.y;
        if (floorMesh) floorMesh.position.y = workspaceFloorY - 0.001;
        if (gridHelper) gridHelper.position.y = workspaceFloorY - 0.0005;
    }

    function settleAllGroupsOnFloor() {
        updateWorkspaceFloor();
    }

    function rotateSelectedFromInputs() {
        const part = selectedPart();
        if (!part || mateAnimation) return;
        const mesh = meshById.get(part.id);
        const group = groupSnapshot(part.id);
        const pivot = mesh.position.clone();
        const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            safeNumber(ui.rx.value, 0) * Math.PI / 180,
            safeNumber(ui.ry.value, 0) * Math.PI / 180,
            safeNumber(ui.rz.value, 0) * Math.PI / 180,
            'XYZ'
        ));
        const delta = target.clone().multiply(mesh.quaternion.clone().inverse());
        group.forEach(item => {
            item.mesh.position.sub(pivot).applyQuaternion(delta).add(pivot);
            item.mesh.quaternion.premultiply(delta);
            item.part.position = item.mesh.position.toArray();
            item.part.rotation = [item.mesh.rotation.x, item.mesh.rotation.y, item.mesh.rotation.z];
        });
        settleGroupOnFloor(group);
        clearFaces();
        undoMate = null;
        saveParts();
        syncInputs();
        status('Part rotated. The grid now follows the assembly\'s lowest point.');
    }

    function rotateSelectedByQuarterTurn(axis) {
        const input = axis === 'x' ? ui.rx : axis === 'y' ? ui.ry : ui.rz;
        if (!selectedPart() || !input) return;
        let degrees = safeNumber(input.value, 0) + 90;
        degrees = ((degrees + 180) % 360 + 360) % 360 - 180;
        input.value = degrees.toFixed(1);
        rotateSelectedFromInputs();
    }

    function updateSelectionBox() {
        if (!scene || !camera) return;
        if (guidedMode && guidedMode.active) { if (moveHandle) moveHandle.visible = false; return; }
        const mesh = meshById.get(selectedId);
        if (!moveHandle) {
            moveHandle = new THREE.Mesh(new THREE.CircleBufferGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0x168de2, depthTest: false, depthWrite: false }));
            moveHandle.renderOrder = 10000;
            const rim = new THREE.Mesh(new THREE.RingBufferGeometry(1, 1.25, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }));
            rim.renderOrder = 10001;
            moveHandle.add(rim);
            scene.add(moveHandle);
        }
        moveHandle.visible = !!mesh && mesh.visible && !mateAnimation && !importing;
        if (!moveHandle.visible) return;
        mesh.updateWorldMatrix(true, false);
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        mesh.geometry.boundingBox.getCenter(moveHandle.position).applyMatrix4(mesh.matrixWorld);
        moveHandle.quaternion.copy(camera.quaternion);
        // Keep the grab point about 14 CSS pixels wide at any zoom level.
        const depth = moveHandle.position.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));
        moveHandle.visible = depth > 0;
        const scale = 2 * Math.max(.0001, depth) * Math.tan(camera.fov * Math.PI / 360) * 7 / Math.max(1, canvas.clientHeight);
        moveHandle.scale.setScalar(scale);
        moveHandle.updateMatrixWorld(true);
    }

    function pickMoveHandle() {
        updateSelectionBox();
        return moveHandle && moveHandle.visible && raycasterState.raycaster.intersectObject(moveHandle, false)[0];
    }


    function addPart(part) {
        parts.push(part);
        const mesh = makeMesh(part);
        partRoot.add(mesh);
        meshById.set(part.id, mesh);
        saveParts();
        selectPart(part.id);
    }

    function getBounds(partId) {
        const mesh = meshById.get(partId);
        if (!mesh) return null;
        mesh.updateMatrixWorld(true);
        return new THREE.Box3().setFromObject(mesh);
    }

    function surfaceMate() { mateFaces(faces.length === 2 && faces[0].kind === 'cylinder'); }

    function shaftMate() { mateFaces(true); }

    function groundPart() {
        const part = selectedPart();
        if (!part) return status('Select a part before placing it on the ground.');
        const bounds = getBounds(part.id);
        part.position[1] += workspaceFloorY - bounds.min.y;
        meshById.get(part.id).position.fromArray(part.position);
        finishMate('Placed ' + part.name + ' on the grid.');
    }

    function finishMate(message) {
        if (selectedId && meshById.has(selectedId)) settleGroupOnFloor(groupSnapshot(selectedId));
        saveParts();
        syncInputs();
        updateSelectionBox();
        status(message);
        if (guidedMode) guidedMode.refreshAvailability();
    }

    function bindCanvasControls() {
        bindEquipmentDrop();
        let partDrag = null;
        let activePointer = null;
        let selectionPress = false;
        const touchPoints = new Map();
        let pinch = null;
        const consume = event => { event.preventDefault(); event.stopImmediatePropagation(); };
        const distance = points => Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
        const touchDoc=canvas.ownerDocument;
        touchDoc.addEventListener('pointerdown',event=>{
            if(event.pointerType!=='touch'||!canvas.contains(event.target)||mateAnimation||importing||guidedMode?.loading)return;
            touchPoints.set(event.pointerId,{x:event.clientX,y:event.clientY});
            if(touchPoints.size===2){
                endDrag(true,event);guidedMode?.beginCameraGesture();
                const points=[...touchPoints.values()];
                pinch={distance:Math.max(1,distance(points)),radius:orbit.radius,x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2,target:orbit.target.clone()};
                orbit.dragging=true;orbit.moved=true;
                for(const id of touchPoints.keys())try{canvas.setPointerCapture(id);}catch(_){}
                consume(event);
            }else if(pinch)consume(event);
        },true);
        touchDoc.addEventListener('pointermove',event=>{
            if(!touchPoints.has(event.pointerId))return;
            touchPoints.set(event.pointerId,{x:event.clientX,y:event.clientY});
            if(!pinch)return;
            if(touchPoints.size===2){
                const points=[...touchPoints.values()];
                orbit.radius=Math.max(.02,Math.min(orbit.maxRadius,pinch.radius*pinch.distance/Math.max(1,distance(points))));
                const dx=(points[0].x+points[1].x)/2-pinch.x,dy=(points[0].y+points[1].y)/2-pinch.y;
                orbit.desiredTarget.copy(pinch.target).addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrix,0),-dx*pinch.radius*.0018).addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrix,1),dy*pinch.radius*.0018);
            }
            consume(event);
        },{capture:true,passive:false});
        const endTouch=event=>{
            if(!touchPoints.has(event.pointerId))return;touchPoints.delete(event.pointerId);
            if(!pinch)return;
            consume(event);
            if(!touchPoints.size){pinch=null;orbit.dragging=false;activePointer=null;updateCanvasCursor();}
        };
        for(const type of ['pointerup','pointercancel'])touchDoc.addEventListener(type,endTouch,true);


        function updateCanvasCursor(event) {
            if (guidedMode && guidedMode.active) { canvas.style.cursor = guidedMode.cursor(event); return; }
            if (orbit.dragging) {
                canvas.style.cursor = partDrag ? 'move' : selectionPress || !orbit.moved ? 'default' : 'var(--cursor-grabbing, grabbing)';
                return;
            }
            if (!event || !camera || !partRoot || !raycasterState.raycaster) {
                canvas.style.cursor = 'var(--cursor-grab, grab)';
                return;
            }
            setPointerRay(event);
            if (pickMoveHandle()) { canvas.style.cursor = 'move'; return; }
            const overPart = raycasterState.raycaster.intersectObjects(partRoot.children, false).length > 0;
            canvas.style.cursor = overPart ? 'default' : 'var(--cursor-grab, grab)';
        }

        function endDrag(cancelled, event) {
            if (partDrag && orbit.moved) {
                if (cancelled) translateGroup(partDrag.group, new THREE.Vector3());
                saveParts();
                syncInputs();
                status(cancelled ? 'Part movement cancelled.' : 'Part moved.');
            }
            partDrag = null;
            selectionPress = false;
            activePointer = null;
            orbit.dragging = false;
            updateCanvasCursor(event);
        }

        canvas.addEventListener('pointerdown', (event) => {
            if (activePointer !== null || mateAnimation || importing || guidedMode && guidedMode.loading) return;
            activePointer = event.pointerId;
            orbit.dragging = true;
            orbit.moved = false;
            orbit.shift = event.shiftKey || event.button === 2;
            orbit.startX = event.clientX;
            orbit.startY = event.clientY;
            orbit.startTheta = orbit.theta;
            orbit.startPhi = orbit.phi;
            orbit.startTarget.copy(orbit.target);
            // Stop any remaining camera easing before grabbing a part.
            orbit.desiredTheta = orbit.theta;
            orbit.desiredPhi = orbit.phi;
            orbit.desiredTarget.copy(orbit.target);
            if (event.button === 0 && !orbit.shift && !(guidedMode && guidedMode.active)) {
                setPointerRay(event);
                const handleHit = pickMoveHandle();
                const hit = handleHit ? { object: meshById.get(selectedId), point: handleHit.point } : raycasterState.raycaster.intersectObjects(partRoot.children, false)[0];
                selectionPress = !!hit;
                if (handleHit && hit.object) {
                    const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).normalize(), hit.point);
                    const dragPoint = raycasterState.raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3()) || hit.point.clone();
                    partDrag = {
                        mesh: hit.object,
                        part: parts.find(p => p.id === hit.object.userData.assemblyPartId),
                        start: hit.object.position.clone(),
                        group: groupSnapshot(hit.object.userData.assemblyPartId),
                        anchor: dragPoint,
                        plane: dragPlane
                    };
                }
            }
            canvas.style.cursor = partDrag ? 'move' : 'default';
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointermove', (event) => {
            updatePointerPosition(event);
            if (!orbit.dragging || event.pointerId !== activePointer) {
                updateCanvasCursor(event);
                return;
            }
            const dx = event.clientX - orbit.startX;
            const dy = event.clientY - orbit.startY;
            if (Math.abs(dx) + Math.abs(dy) > 3) orbit.moved = true;
            if (!orbit.moved) return;
            if (partDrag) {
                if (!orbit.moved) return;
                if (!partDrag.started) {
                    partDrag.started = true;
                    canvas.style.cursor = 'move';
                    clearFaces();
                    targetId = '';
                    undoMate = null;
                    updateFaceUI();
                    selectPart(partDrag.part.id);
                }
                setPointerRay(event);
                const point = raycasterState.raycaster.ray.intersectPlane(partDrag.plane, new THREE.Vector3());
                if (point) {
                    translateGroup(partDrag.group, point.sub(partDrag.anchor));
                    ui.x.value = partDrag.part.position[0].toFixed(2);
                    ui.y.value = partDrag.part.position[1].toFixed(2);
                    ui.z.value = partDrag.part.position[2].toFixed(2);
                }
                return;
            }
            if (selectionPress) return;
            if (orbit.shift) {
                const factor = orbit.radius * 0.0018;
                const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
                const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
                orbit.desiredTarget.copy(orbit.startTarget).addScaledVector(right, -dx * factor).addScaledVector(up, dy * factor);
            } else {
                orbit.desiredTheta = orbit.startTheta - dx * 0.008;
                orbit.desiredPhi = Math.max(0.14, Math.min(Math.PI - 0.14, orbit.startPhi - dy * 0.008));
            }
        });
        canvas.addEventListener('pointerup', (event) => {
            if (event.pointerId !== activePointer) return;
            if (orbit.dragging && !partDrag && !orbit.moved && event.button === 0 && !orbit.shift && !(guidedMode && guidedMode.active)) pickPart(event);
            endDrag(false, event);
            try { canvas.releasePointerCapture(event.pointerId); } catch (_) { }
        });
        canvas.addEventListener('pointercancel', event => { if (event.pointerId === activePointer) endDrag(true, event); });
        canvas.addEventListener('lostpointercapture', event => { if (event.pointerId === activePointer) endDrag(true, event); });
        canvas.addEventListener('pointerleave', () => {
            resetPointerPosition();
            if (!orbit.dragging) canvas.style.cursor = 'var(--cursor-grab, grab)';
        });
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            if (partDrag) return;
            orbit.radius = Math.max(0.02, Math.min(orbit.maxRadius, orbit.radius * Math.exp(event.deltaY * 0.001)));
        }, { passive: false });
    }

    function setPointerRay(event) {
        const rect = canvas.getBoundingClientRect();
        raycasterState.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        raycasterState.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        camera.updateMatrixWorld(true);
        partRoot.updateMatrixWorld(true);
        raycasterState.raycaster.setFromCamera(raycasterState.pointer, camera);
    }

    function updatePointerPosition(event) {
        if (!ui.pointerPosition || !camera || !raycasterState.raycaster) return;
        setPointerRay(event);
        const point = raycasterState.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -workspaceFloorY), new THREE.Vector3());
        ui.pointerPosition.textContent = point ? 'Mouse -> x: ' + point.x.toFixed(2) + ', y: ' + point.z.toFixed(2) : 'Mouse -> x: -, y: -';
    }

    function resetPointerPosition() {
        if (ui.pointerPosition) ui.pointerPosition.textContent = 'Mouse -> x: -, y: -';
    }

    function bindActionTooltips() {
        const controls = Array.from(modal.querySelectorAll('.assembly-icon-button, .assembly-icon-group button')).filter(control => !control.dataset.tooltipBound);
        if (!controls.length) return;
        const tooltip = document.createElement('div');
        tooltip.className = 'action-tooltip';
        document.body.appendChild(tooltip);
        controls.forEach(control => {
            control.dataset.tooltipBound = 'true';
            const text = control.getAttribute('aria-label') || control.getAttribute('title') || '';
            control.removeAttribute('title');
            const show = () => {
                if(document.documentElement.dataset.touchUi==='true')return;
                const label = control.getAttribute('aria-label') || text;
                if (!label) return;
                const rect = control.getBoundingClientRect();
                tooltip.textContent = label;
                tooltip.style.left = (rect.left + rect.width / 2) + 'px';
                tooltip.style.top = (rect.bottom + 8) + 'px';
                tooltip.classList.add('is-visible');
            };
            const hide = () => tooltip.classList.remove('is-visible');
            control.addEventListener('mouseenter', show);
            control.addEventListener('mouseleave', hide);
            control.addEventListener('focus', show);
            control.addEventListener('blur', hide);
        });
    }

    function pickPart(event) {
        if (guidedMode && (guidedMode.active || guidedMode.loading)) return;
        setPointerRay(event);
        const hits = raycasterState.raycaster.intersectObjects(partRoot.children, false);
        if (mateAnimation) return;
        if (hits.length) chooseFace(hits[0]);
        else { clearFaces(); targetId = ''; selectPart(''); }
    }

    function resize() {
        if (!renderer) return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (renderWidth !== width || renderHeight !== height) {
            renderWidth = width;
            renderHeight = height;
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    }

    let previousFrameTime = 0;
    function animate() {
        animationFrame = requestAnimationFrame(animate);
        const now = performance.now();
        const frameScale = previousFrameTime ? Math.min((now - previousFrameTime) / (1000 / 60), 3) : 1;
        previousFrameTime = now;
        if (!modal.classList.contains('is-open')) return;
        if (mateAnimation) {
            const a = mateAnimation;
            const t = Math.min(1, (performance.now() - a.start) / 650);
            const ease = t * t * (3 - 2 * t);
            const rotation = new THREE.Quaternion().slerp(a.deltaQ, ease);
            const pivot = new THREE.Vector3().lerpVectors(a.pivot, a.endPivot, ease);
            a.items.forEach(item => {
                item.mesh.position.copy(item.from).sub(a.pivot).applyQuaternion(rotation).add(pivot);
                item.mesh.quaternion.copy(rotation).multiply(item.fromQ);
            });
            if (t === 1) { mateAnimation = null; updateFaceUI(); finishMate('Mate completed.'); }
        }
        resize();
        if (guidedMode) guidedMode.update(frameScale / 60);
        // Match SIM easing at 60 Hz, with the same response on faster displays.
        const smooth = 1 - Math.pow(1 - (orbit.dragging ? 0.36 : 0.18), frameScale);
        orbit.theta += (orbit.desiredTheta - orbit.theta) * smooth;
        orbit.phi += (orbit.desiredPhi - orbit.phi) * smooth;
        orbit.target.lerp(orbit.desiredTarget, 1 - Math.pow(0.8, frameScale));
        const sinPhi = Math.sin(orbit.phi);
        camera.position.set(
            orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
            orbit.target.y + orbit.radius * Math.cos(orbit.phi),
            orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta)
        );
        camera.lookAt(orbit.target);
        updateSelectionBox();
        viewportStyle.render(camera, { meshes: guidedMode && guidedMode.active ? guidedMode.meshes : meshById }, canvas.clientWidth, canvas.clientHeight);
        resumeEquipmentPreviews();
    }

    function open() {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        if (initThree()) {
            syncInputs();
            requestAnimationFrame(resize);
        }
    }

    function close() {
        if (guidedMode) guidedMode.exit();
        if (standalone) {
            if (window.__ideToolWindow) window.__ideToolWindow.close();
            else window.close();
            return;
        }
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }

    if (openButton) openButton.addEventListener('click', open);
    closeButton.addEventListener('click', close);
    const importButton = byId('assembly-import-model');
    if (importButton) importButton.addEventListener('click', () => ui.file.click());
    modal.addEventListener('mousedown', (event) => { if (event.target === modal) close(); });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            clearFaces();
            status('Face selection cleared.');
        }
    });
    ui.file.addEventListener('change', async () => {
        if (importing) return;
        const currentRun = ++importRun;
        const files = Array.from(ui.file.files || []);
        importing = true;
        let count = 0;
        let lastImportedId = '';
        const failures = [];
        const storageWarnings = [];
        const storageEntries = [];
        for (const file of files) {
            if (currentRun !== importRun) break;
            try {
                const isGlb = /\.glb$/i.test(file.name);
                let merged;
                if (isGlb) {
                    status('Reading GLB geometry: ' + file.name);
                    merged = await window.AssemblyGlb.read(THREE, file, message => status(file.name + ' - ' + message));
                } else if (/\.(step|stp)$/i.test(file.name)) {
                    status('Reading STEP geometry: ' + file.name);
                    const meshes = await window.AssemblyStep.read(file, message => status(file.name + ' - ' + message));
                    status(file.name + ' - Converting ' + meshes.length + ' CAD bodies to the fast internal mesh...');
                    merged = window.AssemblyStepGeometry.prepareAsOne(THREE, meshes);
                } else {
                    throw new Error('Only STEP, STP, and GLB files are supported');
                }
                const importGroup = (isGlb ? 'glb-' : 'step-') + id();
                for (const prepared of merged ? [merged] : []) {
                    const { source, data, center, size } = prepared;
                    center.y += workspaceFloorY;
                    const key = id();
                    storageEntries.push({ key, mesh: data });
                    stepMeshes.set(key, data);
                    const color = source.colorHex || window.AssemblyStepGeometry.colorHex(THREE, source.color) || '#9aa7b1';
                    const part = makePart(source.name || file.name.replace(/\.(step|stp|glb)$/i, ''), 'step', color, center.toArray(), size, '', file.name);
                    part.geometryKey = key;
                    part.importGroup = importGroup;
                    part.faceColors = prepared.faceColors || {};
                    parts.push(part);
                    lastImportedId = part.id;
                    count++;
                }
            } catch (error) { if (!error.cancelled) failures.push(file.name + ': ' + error.message); }
        }
        if (currentRun !== importRun) return;
        if (count) {
            status('Building the scene from ' + count + ' part' + (count === 1 ? '' : 's') + '…');
            selectedId = lastImportedId;
            rebuildScene();
            fitAssembly();
            await new Promise(resolve => requestAnimationFrame(resolve));
            status('Model displayed · Saving optimized geometry…');
            try { await window.AssemblyStep.putMany(storageEntries); }
            catch (error) { storageWarnings.push('The model is visible but its geometry could not be saved (' + error.message + ')'); }
        }
        importing = false;
        fitAssembly();
        if (guidedMode) guidedMode.refreshAvailability();
        status('Imported ' + count + ' part' + (count === 1 ? '' : 's') + (failures.length ? ' · ' + failures.join(' · ') : ' successfully') + (storageWarnings.length ? ' · ' + storageWarnings.join(' · ') : ''));
        const importMessage = byId('assembly-import-message');
        if (importMessage) {
            importMessage.hidden = !failures.length && !storageWarnings.length;
            importMessage.textContent = failures.concat(storageWarnings).join(' · ');
        }
        ui.file.value = '';
    });
    [ui.name, ui.motor, ui.x, ui.y, ui.z].forEach((input) => {
        input.addEventListener(input === ui.name ? 'input' : 'change', updateSelectedFromInputs);
    });
    [ui.rx, ui.ry, ui.rz].forEach(input => input.addEventListener('change', rotateSelectedFromInputs));
    ui.rotateButtons.forEach(button => button.addEventListener('click', () => rotateSelectedByQuarterTurn(button.dataset.rotateAxis)));
    function syncImportedPhysics(part) {
        const panel=byId('assembly-imported-physics');
        if(!panel)return;
        panel.hidden=!(part&&part.geometryKey&&!part.productManifest);
        if(panel.hidden)return;
        const p=window.ImportedPartPhysics.settings(part.physics);
        byId('assembly-physics-mass').value=Number((p.mass*1000).toFixed(3));
        byId('assembly-physics-material').value=p.soundMaterial;
        byId('assembly-physics-collider').value=p.collider;
        byId('assembly-physics-motion').value=p.static?'static':'dynamic';
    }
    ['mass','material','collider','motion'].forEach(name=>byId('assembly-physics-'+name)?.addEventListener('change',()=>{
        const part=selectedPart();if(!part||part.productManifest||!part.geometryKey)return;
        const input=byId('assembly-physics-mass');
        if(!input.checkValidity()||!input.value){syncImportedPhysics(part);return;}
        part.physics=window.ImportedPartPhysics.settings({mass:Number(input.value)/1000,
            soundMaterial:byId('assembly-physics-material').value,
            collider:byId('assembly-physics-collider').value,
            static:byId('assembly-physics-motion').value==='static'});
        saveParts();status('Physics saved. Run SIM to test the part.');
    }));
    ui.color.addEventListener('change', () => {
        const part = selectedPart();
        const face = colorFaceForSelectedPart();
        if (!part || !face || isCompanyPart(part)) return;
        part.faceColors = part.faceColors || {};
        part.faceColors[face.key] = ui.color.value;
        if (window.ProductCatalog) window.ProductCatalog.applyFaceColor(part, stepMeshes.get(part.geometryKey), face.key, ui.color.value);
        refreshPartMaterials(part);
        clearFaces();
        saveParts();
        status('Selected face color updated.');
    });
    ui.mateSurface.addEventListener('click', surfaceMate);
    ui.remove.addEventListener('click', () => {
        const part = selectedPart();
        if (!part) return status('Select a part to delete.');
        if (isProtectedPart(part)) return status('The selected board or robot cannot be deleted.');
        if (part.geometryKey) stepMeshes.delete(part.geometryKey);
        parts = parts.filter((item) => item.id !== part.id);
        window.AssemblyProductConfig.disconnectBoard(parts, part.id);
        parts.forEach(item => { item.mateLinks = (item.mateLinks || []).filter(link => link !== part.id); });
        parts.forEach(item => { item.mates = (item.mates || []).filter(r => r.a !== part.id && r.b !== part.id); });
        undoMate = null;
        if (targetId === part.id) targetId = '';
        selectedId = '';
        saveParts();
        rebuildScene();
        syncInputs();
        if (part.productManifest) ensureSystemBoard().then(() => { rebuildScene(); syncInputs(); }).catch(error => status(error.message));
        window.AssemblyStep.prune(parts.map(item => item.geometryKey).filter(Boolean)).catch(() => {});
        status('Part deleted.');
    });
    const clearAllButton = byId('assembly-clear-all');
    if (clearAllButton) clearAllButton.addEventListener('click', async () => {
        importRun++;
        window.AssemblyStep.cancelActive();
        importing = false;
        const retainedParts = parts.filter(isProtectedPart);
        const removedIds = parts.filter(part => !retainedParts.includes(part)).map(part => part.id);
        const retainedMeshes = retainedParts.map(part => [part.geometryKey, stepMeshes.get(part.geometryKey)]).filter(entry => entry[0] && entry[1]);
        parts = retainedParts;
        removedIds.forEach(removedId => window.AssemblyProductConfig.disconnectBoard(parts, removedId));
        parts.forEach(part => {
            part.mateLinks = (part.mateLinks || []).filter(id => !removedIds.includes(id));
            part.mates = (part.mates || []).filter(mate => !removedIds.includes(mate.a) && !removedIds.includes(mate.b));
            removedIds.forEach(id => { if (part.mateTypes) delete part.mateTypes[id]; });
        });
        selectedId = '';
        targetId = '';
        undoMate = null;
        mateAnimation = null;
        stepMeshes.clear();
        retainedMeshes.forEach(entry => stepMeshes.set(entry[0], entry[1]));
        clearFaces();
        saveParts();
        rebuildScene();
        syncInputs();
        ui.file.value = '';
        const importMessage = byId('assembly-import-message');
        if (importMessage) { importMessage.hidden = true; importMessage.textContent = ''; }
        try {
            await window.AssemblyStep.prune(parts.map(item => item.geometryKey).filter(Boolean));
            status('User parts cleared. PT Atom VX was retained as the selected board.');
        } catch (error) { status('Parts were cleared, but the geometry cache could not be cleared: ' + error.message); }
    });
    if (ui.equipmentCategory) ui.equipmentCategory.addEventListener('change', renderEquipment);
    if (byId('assembly-undo-mate')) byId('assembly-undo-mate').addEventListener('click', () => {
        if (!undoMate) return;
        undoMate.parts.forEach(previous => {
            const part = parts.find(p => p.id === previous.id);
            if (part) { part.position = previous.position; part.rotation = previous.rotation; }
        });
        const moving = parts.find(p => p.id === undoMate.movingId);
        if (moving) { moving.mateLinks = undoMate.previousLinks; moving.mates = (moving.mates || []).filter(r => r.id !== undoMate.recordId); }
        undoMate = null;
        rebuildScene();
        finishMate('Mate undone.');
    });
    window.addEventListener('resize', () => { resize(); syncEquipmentVisibility(); });
    if (ui.equipmentList) ui.equipmentList.addEventListener('scroll', syncEquipmentVisibility, { passive: true });
    window.addEventListener('beforeunload', () => {
        equipmentClosed = true;
        draggedEquipment = null;
        clearEquipmentDragPreview(equipmentDragPreview);
        if (equipmentPreviewTimer !== null) clearTimeout(equipmentPreviewTimer);
        if (equipmentObserver) equipmentObserver.disconnect();
        equipmentPreviewWaiters.splice(0).forEach(wait => wait.resolve(false));
        if (equipmentPreviewer) equipmentPreviewer.dispose();
    });
    window.addEventListener('storage', event => {
        if (event.key === 'ptbot_selected_board_id') window.location.reload();
        else if (event.key === 'robot_assembly_revision') loadProjectAssembly(false).catch(error => status('Could not reload project assembly: ' + error.message));
        else if (event.key === 'robot_assembly_guide_revision' && guidedMode) guidedMode.exit();
    });
    window.addEventListener('focus', () => { loadPublishedEquipment(); });
    window.addEventListener('robot-assembly-guide-change', () => { if (guidedMode) guidedMode.exit(); });
    window.addEventListener('robot-project-reset', () => {
        if (typeof fs !== 'undefined' && fs && typeof fs.remove === 'function') fs.remove(PROJECT_FILE);
        loadProjectAssembly(false).catch(error => status('Could not reset project assembly: ' + error.message));
    });
    window.addEventListener('robot-project-loaded', () => {
        loadProjectAssembly(false).catch(error => status('Could not load project assembly: ' + error.message));
    });
    if (byId('assembly-unmate')) byId('assembly-unmate').addEventListener('click', () => {
        const part = selectedPart();
        if (!part || mateAnimation) return;
        part.mateLinks = [];
        part.mateTypes = {};
        parts.forEach(item => { item.mates = (item.mates || []).filter(r => r.a !== part.id && r.b !== part.id); });
        parts.forEach(item => { item.mateLinks = (item.mateLinks || []).filter(link => link !== part.id); });
        settleGroupOnFloor(groupSnapshot(part.id));
        undoMate = null;
        clearFaces();
        saveParts();
        syncInputs();
        status('Mates removed. This part can now move separately.');
    });
    // Prevent changes to parts while the visible mate transition is running.
    ['click', 'input', 'change'].forEach(type => modal.addEventListener(type, event => {
        if ((mateAnimation || importing) && !event.target.closest('#assembly-clear-all, #assembly-update-equipment') && event.target.closest('.assembly-inspector, .assembly-mode-panel')) {
            event.preventDefault(); event.stopImmediatePropagation();
        }
    }, true));

    bindActionTooltips();
    renderEquipmentCategories();
    syncInputs();
    if (standalone) open();
    // Listing and saved thumbnails are small and can appear immediately. Cold
    // previews wait for the workspace inside the previewer's beforeRender gate.
    loadPublishedEquipment();
})();
