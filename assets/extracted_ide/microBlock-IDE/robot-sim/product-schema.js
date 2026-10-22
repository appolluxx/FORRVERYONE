(function (root, factory) {
    'use strict';
    // Electron exposes CommonJS inside script tags, but its relative require
    // resolves from the renderer entry, not from this script's directory.
    const guide = root.ProductAssemblyGuide || (typeof window === 'undefined' && typeof module === 'object' && module.exports ? require('./product-assembly-guide') : undefined);
    const api = factory(guide);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.ProductSchema = api;
})(typeof window !== 'undefined' ? window : globalThis, function (AssemblyGuide) {
    'use strict';
    const kinds = ['board', 'component', 'robot'];
    const deviceTypes = ['motor', 'servo', 'line-sensor', 'distance-sensor', 'display', 'led'];
    const boardRoles = ['main', 'extension', 'sensor'];
    function isMainBoard(component) { return component.kind === 'board' && (!component.boardRole || component.boardRole === 'main'); }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function list(value) { return Array.isArray(value) ? value : []; }
    const pinKinds = ['power', 'ground', 'analog', 'digital', 'spi', 'i2c', 'uart', 'pwm', 'motor', 'custom'];
    const pinDirections = ['input', 'output', 'bidirectional', 'passive'];
    function validateConnector(connector) {
        const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
        if (!connector || !validId(connector.id)) throw new Error('Invalid connector ID.');
        if (typeof connector.name !== 'string' || !connector.name.trim()) throw new Error('Connector name is required.');
        if (typeof connector.interfaceId !== 'string' || !connector.interfaceId.trim()) throw new Error('Connector compatibility ID is required.');
        if (!Array.isArray(connector.pins) || !connector.pins.length) throw new Error('A connector requires at least one pin.');
        const ids = new Set();
        connector.pins.forEach(pin => {
            if (!pin || !validId(pin.id) || ids.has(pin.id)) throw new Error('Connector pin numbers must be unique IDs.');
            ids.add(pin.id);
            if (typeof pin.signal !== 'string' || !pin.signal.trim()) throw new Error('Each connector pin requires a signal name.');
            if (!pinKinds.includes(pin.kind) || !pinDirections.includes(pin.direction)) throw new Error('Invalid connector pin type or direction.');
            if (pin.voltage !== undefined && (typeof pin.voltage !== 'number' || !Number.isFinite(pin.voltage) || pin.voltage < 0)) throw new Error('Invalid connector pin voltage.');
        });
        return connector;
    }
    function connectorCompatibility(a, b) {
        try { validateConnector(a); validateConnector(b); } catch (error) { return { compatible: false, reason: error.message }; }
        if (a.interfaceId.trim() !== b.interfaceId.trim()) return { compatible: false, reason: 'Different compatibility IDs.' };
        if (a.pins.length !== b.pins.length) return { compatible: false, reason: 'Different pin counts.' };
        const mapping = [];
        for (const pin of a.pins) {
            const target = b.pins.find(item => item.id === pin.id);
            if (!target || pin.kind !== target.kind || pin.signal.trim().toLowerCase() !== target.signal.trim().toLowerCase()) return { compatible: false, reason: 'Pin ' + pin.id + ' has a different signal or type.' };
            if (pin.voltage !== target.voltage) return { compatible: false, reason: 'Pin ' + pin.id + ' has a different or unspecified voltage.' };
            const directions = [pin.direction, target.direction];
            if (directions.every(direction => direction === 'output') || directions.every(direction => direction === 'input')) return { compatible: false, reason: 'Pin ' + pin.id + ' has incompatible directions.' };
            mapping.push({ from: pin.id, to: target.id, signal: pin.signal, kind: pin.kind, voltage: pin.voltage });
        }
        return { compatible: true, mapping };
    }
    function defaults(value, fallback) { return value === undefined || value === null ? clone(fallback) : value; }
    function pose(value) {
        value.position = defaults(value.position, [0, 0, 0]);
        value.rotation = defaults(value.rotation, [0, 0, 0]);
        return value;
    }
    function legacy(raw) {
        const manifest = clone(raw);
        const model = manifest.model || {};
        const appearance = manifest.appearance || {};
        const board = clone(raw);
        manifest.kind = manifest.kind || 'board';
        manifest.components = [{
            id: 'main', name: manifest.name || 'Board', kind: 'board', asset: model.file || 'model.glb', format: 'glb',
            unit: 'meter', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
            assetTransform: { unit: model.unit || 'meter', rotation: model.rotation || [0, 0, 0], scale: model.scale || [1, 1, 1] },
            appearance: { materials: list(appearance.materials), surfaces: list(appearance.surfaces) }, boardDefinition: board
        }];
        manifest.artwork = list(appearance.artwork).map((entry, index) => Object.assign({}, entry, {
            id: entry.id || entry.side || 'artwork-' + (index + 1), name: entry.name || entry.side || 'Artwork ' + (index + 1), componentId: 'main'
        }));
        const simulation = manifest.simulation || {}, colors = simulation.motorColors || {};
        manifest.components[0].legacyDevices = true;
        manifest.devices = [];
        manifest.connections = [];
        if (simulation.display && simulation.display.enabled !== false) manifest.devices.push(Object.assign({}, simulation.display, {
            id: 'display', name: 'Display', type: 'display', componentId: 'main', legacyOverlay: 'display'
        }));
        list(simulation.motorLeds).forEach((entry, index) => {
            const motor = String(entry.motor || entry.name || 'M' + (index + 1)), id = 'led-' + motor.replace(/[^a-z0-9_-]/gi, '-');
            manifest.devices.push(Object.assign({}, entry, { id, name: motor + ' LED', type: 'led', componentId: 'main', legacyOverlay: motor,
                offColor: entry.offColor || colors.off || '#15191b', forwardColor: entry.forwardColor || colors.forward || '#00ff00', reverseColor: entry.reverseColor || colors.reverse || '#ff0000'
            }));
            manifest.connections.push({ id: 'wire-' + id, boardId: 'main', port: motor, deviceId: id });
        });
        return manifest;
    }
    function syncLegacyDefinition(component, devices) {
        const definition = clone(component.boardDefinition || {});
        if (!component.legacyDevices) return definition;
        const mapped = list(devices).filter(device => device.componentId === component.id && device.legacyOverlay);
        const simulation = definition.simulation || (definition.simulation = {});
        function overlay(device, original) {
            const entry = clone(original || {});
            ['position', 'rotation', 'size', 'resolution', 'textureScale', 'enabled', 'offColor', 'forwardColor', 'reverseColor'].forEach(key => { if (device[key] !== undefined) entry[key] = clone(device[key]); });
            return entry;
        }
        const screen = mapped.find(device => device.legacyOverlay === 'display' && device.type === 'display');
        simulation.display = screen ? Object.assign(overlay(screen, simulation.display), { enabled: screen.enabled !== false }) : Object.assign({}, simulation.display, { enabled: false });
        const previousLeds = list(simulation.motorLeds);
        simulation.motorLeds = mapped.filter(device => device.type === 'led' && device.legacyOverlay !== 'display').map(device => Object.assign(overlay(device, previousLeds.find(entry => (entry.motor || entry.name) === device.legacyOverlay)), { motor: device.legacyOverlay }));
        return definition;
    }
    function normalize(raw) {
        let value = clone(raw || {});
        if (!Array.isArray(value.components) && value.model) value = legacy(value);
        value.schemaVersion = 2;
        value.id = defaults(value.id, 'new-product');
        value.name = defaults(value.name, 'New Product');
        if (value.category !== undefined) value.category = typeof value.category === 'string' ? value.category.trim() : '';
        value.version = defaults(value.version, '1.0.0');
        value.kind = defaults(value.kind, 'component');
        // Early Smart bin examples used the Equipment UI label as a product
        // kind. Read those saved projects as ordinary component products.
        if (value.kind === 'equipment') value.kind = 'component';
        if (value.kind === 'robot') value.controllerBoardId = defaults(value.controllerBoardId, 'atom-vx');
        if (value.kind === 'board') value.controllerBoardId = defaults(value.controllerBoardId, value.id);
        value.components = list(value.components).map((component, index) => {
            const c = pose(component);
            c.id = defaults(c.id, 'part-' + (index + 1)); c.name = defaults(c.name, c.id); c.kind = defaults(c.kind, 'component');
            if (c.kind === 'board') c.boardRole = defaults(c.boardRole, 'main');
            c.format = defaults(c.format, c.primitive || c.geometry ? 'geometry' : 'glb');
            c.unit = defaults(c.unit, 'meter'); c.scale = defaults(c.scale, [1, 1, 1]);
            c.appearance = c.appearance || {};
            c.appearance.materials = list(c.appearance.materials); c.appearance.surfaces = list(c.appearance.surfaces);
            c.physics = c.physics || {}; c.physics.mass = defaults(c.physics.mass, 0.1); c.physics.friction = defaults(c.physics.friction, 0.6);
            c.connectors = list(c.connectors);
            // Missing ports retain legacy board inference; an authored empty
            // list deliberately means that this board has no connectors.
            if (c.ports !== undefined) c.ports = list(c.ports).map((port, i) => Object.assign({ id: 'port-' + (i + 1), name: port.id || 'Port ' + (i + 1), type: 'digital' }, port));
            c.mounts = list(c.mounts).map((mount, i) => Object.assign({ id: 'mount-' + (i + 1), name: 'Mount ' + (i + 1), type: 'fixed', position: [0, 0, 0], axis: [0, 1, 0] }, mount));
            return c;
        });
        value.mates = list(value.mates).map((mate, index) => Object.assign({ id: 'mate-' + (index + 1), type: 'plane' }, mate));
        value.joints = list(value.joints).map((joint, index) => Object.assign({ id: 'joint-' + (index + 1), name: 'Joint ' + (index + 1), type: 'revolute', position: [0, 0, 0], axis: [0, 1, 0], lower: -90, upper: 90, home: 0 }, joint));
        value.devices = list(value.devices).map((device, index) => pose(Object.assign({ id: 'device-' + (index + 1), name: 'Device ' + (index + 1), type: 'motor', driveSide: 'none', wheelRadius: 0.0325, maxSpeed: 360, invert: false, range: 0.5 }, device)));
        // Built-in simulation surfaces have a fixed role. Repair packages
        // saved after their Type selector accidentally changed that role.
        value.devices.forEach(device => {
            if (device.legacyOverlay === 'display') device.type = 'display';
            else if (/^M[1-4]$/.test(device.legacyOverlay || '')) device.type = 'led';
        });
        value.connections = list(value.connections).map((connection, index) => Object.assign({ id: 'connection-' + (index + 1) }, connection));
        if (value.boardLinks !== undefined) value.boardLinks = list(value.boardLinks);
        value.artwork = list(value.artwork).map((artwork, index) => pose(Object.assign({ id: 'artwork-' + (index + 1), name: 'Artwork ' + (index + 1), size: [0.05, 0.05], visible: true, opacity: 1, lockAspect: true }, artwork)));
        if (value.assemblyGuide !== undefined && AssemblyGuide) value.assemblyGuide = AssemblyGuide.normalize(value.assemblyGuide, value);
        return value;
    }
    function validate(raw) {
        const value = normalize(raw);
        function fail(message) { throw new Error(message); }
        function choice(entry, allowed, label) { if (allowed.indexOf(entry) < 0) fail('Invalid ' + label + ': ' + entry); }
        function finite(number, label, minimum) { if (typeof number !== 'number' || !Number.isFinite(number) || (minimum !== undefined && number < minimum)) fail('Invalid ' + label + '.'); }
        function overrides(entry, label, limits) {
            if (entry === undefined) return;
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('Invalid ' + label + '.');
            Object.keys(entry).forEach(key => {
                if (!Object.prototype.hasOwnProperty.call(limits, key)) fail('Unsupported ' + label + ': ' + key);
                finite(entry[key], label + ' ' + key, 0);
                if (limits[key] && entry[key] === 0) fail(label + ' ' + key + ' must be positive.');
            });
        }
        function vector(entry, length, label, positive) {
            if (!Array.isArray(entry) || entry.length !== length) fail(label + ' requires ' + length + ' numbers.');
            entry.forEach(number => { finite(number, label); if (positive && number <= 0) fail(label + ' must be positive.'); });
        }
        function idSet(entries, label) {
            const ids = new Set(); entries.forEach(entry => {
                if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(entry.id)) fail('Invalid ' + label + ' ID.');
                if (ids.has(entry.id)) fail('Duplicate ' + label + ' ID: ' + entry.id); ids.add(entry.id);
            }); return ids;
        }
        function reference(ids, id, label) { if (!ids.has(id)) fail(label + ' references a missing item: ' + id); }
        function relative(file, label) {
            if (file !== undefined && (typeof file !== 'string' || !file || /^[\\/]|^[a-zA-Z]:/.test(file) || file.indexOf('\0') >= 0 || file.split(/[\\/]/).some(part => part === '..' || part === '.'))) fail('Invalid ' + label + ' asset path.');
        }
        if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(value.id)) fail('Product ID must contain lowercase letters, numbers, hyphens or underscores.');
        if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value.version)) fail('Version must use semantic version format, for example 1.0.0.');
        choice(value.kind, kinds, 'product kind');
        if (value.boardRole !== undefined) choice(value.boardRole, boardRoles, 'product board role');
        const components = idSet(value.components, 'component'), joints = idSet(value.joints, 'joint'), devices = idSet(value.devices, 'device');
        idSet(value.mates, 'mate'); idSet(value.connections, 'connection'); idSet(value.artwork, 'artwork');
        value.components.forEach(c => {
            if (c.boardRole !== undefined) choice(c.boardRole, boardRoles, 'board role');
            if (c.sourceNodes !== undefined && (!Array.isArray(c.sourceNodes) || !c.sourceNodes.length || c.sourceNodes.some(id => !Number.isInteger(id) || id < 0) || new Set(c.sourceNodes).size !== c.sourceNodes.length)) fail('GLB source nodes must be a nonempty list of unique mesh IDs.');
            choice(c.format, ['glb', 'geometry'], 'component format'); choice(c.unit, ['meter', 'millimeter'], 'component unit');
            vector(c.position, 3, 'Component position'); vector(c.rotation, 3, 'Component rotation'); vector(c.scale, 3, 'Component scale', true);
            finite(c.physics.mass, 'component mass', 0); finite(c.physics.friction, 'component friction', 0); relative(c.asset, 'component'); relative(c.preparedAsset, 'prepared component');
            if(c.physics.lateralFriction!==undefined)finite(c.physics.lateralFriction,'component lateral friction',0);
            if(c.physics.contactStiffness!==undefined){finite(c.physics.contactStiffness,'component contact stiffness',0);if(!c.physics.contactStiffness)fail('Component contact stiffness must be positive.');}
            if(c.physicsOverrides&&c.physicsOverrides.contactStiffness!==undefined){finite(c.physicsOverrides.contactStiffness,'component contact stiffness override',0);if(!c.physicsOverrides.contactStiffness)fail('Component contact stiffness override must be positive.');}
            if (c.physics.centerOfMass !== undefined) vector(c.physics.centerOfMass, 3, 'Component center of mass');
            if (c.physics.inertia !== undefined) {
                vector(c.physics.inertia, 3, 'Component inertia', true);
                const sum = c.physics.inertia.reduce((a, b) => a + b, 0);
                if (c.physics.inertia.some(moment => moment > sum - moment + 1e-12)) fail('Inertia moments must satisfy the triangle inequality.');
            }
            if (c.physics.collider !== undefined) choice(c.physics.collider, ['auto', 'box', 'sphere', 'cylinder'], 'collision shape');
            if(c.physics.gearCollisionProxy!==undefined&&typeof c.physics.gearCollisionProxy!=='boolean')fail('Gear collision proxy must be boolean.');
            if (c.physics.colliderBoxes !== undefined) {
                if(!Array.isArray(c.physics.colliderBoxes)||!c.physics.colliderBoxes.length)fail('Collision boxes must be a nonempty array.');
                c.physics.colliderBoxes.forEach(box=>{vector(box.min,3,'Collision box minimum');vector(box.max,3,'Collision box maximum');if(box.min.some((n,i)=>n>=box.max[i]))fail('Collision box must have positive size.');});
            }
            if(c.physics.colliderHulls!==undefined){
                if(!Array.isArray(c.physics.colliderHulls)||!c.physics.colliderHulls.length)fail('Collision hulls must be a nonempty array.');
                c.physics.colliderHulls.forEach(h=>{vector(h.center,3,'Collision hull center');if(!Array.isArray(h.vertices)||h.vertices.length<4)fail('Collision hull needs vertices.');h.vertices.forEach(v=>vector(v,3,'Collision hull vertex'));if(!Array.isArray(h.faces)||h.faces.length<4)fail('Collision hull needs faces.');h.faces.forEach(f=>{if(!Array.isArray(f)||f.length<3||f.some(i=>!Number.isInteger(i)||i<0||i>=h.vertices.length))fail('Invalid collision hull face.');});});
            }
            if (c.physics.colliderAxis !== undefined) { vector(c.physics.colliderAxis, 3, 'Collision axis'); if (c.physics.colliderAxis.every(number => number === 0)) fail('Collision axis must have a direction.'); }
            if (c.physics.material !== undefined && typeof c.physics.material !== 'string') fail('Invalid physical material.');
            idSet(list(c.ports), 'board port'); idSet(c.mounts, 'mount point');
            idSet(c.connectors, 'connector'); c.connectors.forEach(validateConnector);
            list(c.ports).forEach(port => {
                choice(port.type, ['motor', 'servo', 'analog', 'digital', 'i2c'], 'board port type');
                if (port.voltage !== undefined) { finite(port.voltage, 'port voltage', 0); if (!port.voltage) fail('Port voltage must be positive.'); }
            });
            c.mounts.forEach(mount => {
                choice(mount.type, ['fixed', 'shaft', 'hole'], 'mount type');
                vector(mount.position, 3, 'Mount position'); vector(mount.axis, 3, 'Mount axis');
                if (mount.axis.every(number => number === 0)) fail('Mount axis must have a direction.');
            });
            if (c.assetTransform) { choice(c.assetTransform.unit, ['meter', 'millimeter'], 'asset unit'); vector(c.assetTransform.rotation, 3, 'Asset rotation'); vector(c.assetTransform.scale, 3, 'Asset scale', true); }
            if (!c.asset && !c.primitive && !c.geometry) fail('Component ' + c.id + ' has no model.');
            if (c.primitive && c.primitive.type === 'screw') {
                if (![.002, .0025, .003, .004].includes(c.primitive.size && c.primitive.size[0])) fail('Screw diameter must be M2, M2.5, M3 or M4.');
                if (!c.primitive.size || c.primitive.size[1] < .002 || c.primitive.size[1] > .06) fail('Screw length must be 2 to 60 mm.');
            }
            if (c.primitive) { choice(c.primitive.type, ['box', 'cylinder', 'screw'], 'primitive'); vector(c.primitive.size, 3, 'Primitive size', true); }
        });
        value.mates.forEach(mate => {
            reference(components, mate.a, 'Mate'); reference(components, mate.b, 'Mate'); if (mate.a === mate.b) fail('A mate must connect different components.');
            choice(mate.type, ['plane', 'concentric', 'parallel'], 'mate type');
            ['faceA', 'faceB'].forEach(key => { const face = mate[key]; if (!face) fail('Mate requires two surfaces.'); vector(face.center, 3, 'Mate surface center'); vector(face.normal, 3, 'Mate surface normal'); if (face.axis) vector(face.axis, 3, 'Mate surface axis'); });
        });
        const parents = new Map();
        value.joints.forEach(joint => {
            reference(components, joint.parent, 'Joint parent'); reference(components, joint.child, 'Joint child');
            if (joint.parent === joint.child) fail('A joint must connect different components.');
            if (parents.has(joint.child)) fail('A component can have only one parent joint.'); parents.set(joint.child, joint.parent);
            choice(joint.type, ['fixed', 'continuous', 'revolute'], 'joint type'); vector(joint.position, 3, 'Joint position'); vector(joint.axis, 3, 'Joint axis');
            if (joint.axis.every(n => n === 0)) fail('Joint axis must have a direction.');
            finite(joint.lower, 'joint lower limit'); finite(joint.upper, 'joint upper limit'); finite(joint.home, 'joint home');
            if (joint.maxTorque !== undefined) { finite(joint.maxTorque, 'joint torque', 0); if (!joint.maxTorque) fail('Joint torque must be positive.'); }
            if (joint.gearboxFrictionTorque !== undefined) finite(joint.gearboxFrictionTorque, 'joint gearbox friction torque', 0);
            if (joint.physicsOverrides !== undefined && joint.type === 'fixed') fail('Joint physics overrides require a movable joint.');
            overrides(joint.physicsOverrides, 'joint physics override', { maxTorque: true, gearboxFrictionTorque: false });
            if (joint.mimic) {
                reference(joints, joint.mimic.jointId, 'Coupled joint');
                if (joint.mimic.jointId === joint.id) fail('A joint cannot follow itself.');
                if (joint.type === 'fixed' || value.joints.find(j => j.id === joint.mimic.jointId).type === 'fixed') fail('Coupled joints must be movable.');
                finite(joint.mimic.multiplier, 'Coupled joint multiplier');
                if (!joint.mimic.multiplier) fail('Coupled joint multiplier must not be zero.');
                finite(joint.mimic.offset === undefined ? 0 : joint.mimic.offset, 'Coupled joint offset');
                if (joint.mimic.maxTorque !== undefined) {finite(joint.mimic.maxTorque, 'Gear coupling torque', 0);if(!joint.mimic.maxTorque)fail('Gear coupling torque must be positive.');}
            }
            if (joint.type === 'revolute' && (joint.lower > joint.upper || joint.home < joint.lower || joint.home > joint.upper)) fail('Joint home must lie within its limits.');
        });
        parents.forEach((_parent, child) => { const visited = new Set(); let current = child; while (parents.has(current)) { if (visited.has(current)) fail('Joint hierarchy contains a cycle.'); visited.add(current); current = parents.get(current); } });
        const coupled = new Map(value.joints.filter(j => j.mimic).map(j => [j.id, j.mimic.jointId]));
        coupled.forEach((_driver, id) => { const seen = new Set(); while(coupled.has(id)){if(seen.has(id))fail('Coupled joints contain a cycle.');seen.add(id);id=coupled.get(id);} });
        value.devices.forEach(device => {
            choice(device.type, deviceTypes, 'device type'); reference(components, device.componentId, 'Device');
            if (device.jointId) reference(joints, device.jointId, 'Device joint');
            choice(device.driveSide, ['none', 'left', 'right'], 'drive side'); vector(device.position, 3, 'Device position'); vector(device.rotation, 3, 'Device rotation');
            finite(device.wheelRadius, 'wheel radius', 0); finite(device.maxSpeed, 'motor speed', 0); finite(device.range, 'sensor range', 0);
            if (device.runtimeOverrides !== undefined && device.type !== 'motor') fail('Motor runtime overrides require a motor device.');
            overrides(device.runtimeOverrides, 'motor runtime override', { maxSpeed: true });
            if (device.ratedVoltage !== undefined) { finite(device.ratedVoltage, 'rated voltage', 0); if (!device.ratedVoltage) fail('Rated voltage must be positive.'); }
            if (device.portType !== undefined && device.portType !== '') choice(device.portType, ['motor', 'servo', 'analog', 'digital', 'i2c'], 'device port type');
            if (device.maxAcceleration !== undefined) finite(device.maxAcceleration, 'motor acceleration', 0);
            if (device.speedCalibration !== undefined) {
                if (device.type !== 'motor' || !device.speedCalibration) fail('Speed calibration requires a motor.');
                for (const direction of ['forward', 'reverse']) {
                    const points = device.speedCalibration[direction];
                    if (!Array.isArray(points) || points.length < 2 || points.length > 101) fail('Invalid motor speed curve.');
                    let previous = -1, previousRpm = -1;
                    points.forEach(point => {
                        if (!Array.isArray(point) || point.length !== 2) fail('Invalid motor speed curve point.');
                        finite(point[0], 'motor curve power', 0); finite(point[1], 'motor curve RPM', 0);
                        if (point[0] <= previous || point[0] > 100 || point[1] < previousRpm) fail('Motor speed curve must increase.');
                        previous = point[0]; previousRpm = point[1];
                    });
                    if (points[0][0] !== 0 || points[0][1] !== 0 || previous !== 100 || previousRpm <= 0) fail('Motor speed curve must cover 0 to 100.');
                }
            }
            if (device.sensingDiameter !== undefined) finite(device.sensingDiameter, 'sensing diameter', .0001);
            if (device.noise !== undefined) { finite(device.noise, 'sensor noise', 0); if (device.noise > .1) fail('Sensor noise must not exceed 10%.'); }
        });
        const ports = new Set(), deviceById = new Map(value.devices.map(device => [device.id, device]));
        idSet(list(value.boardLinks), 'internal board link');
        list(value.boardLinks).forEach(link => {
            const a = value.components.find(c => c.id === link.a), b = value.components.find(c => c.id === link.b);
            if (!a || !b || a === b || a.kind !== 'board' || b.kind !== 'board') fail('Internal board links require two different board components.');
        });
        value.connections.forEach(connection => {
            reference(components, connection.boardId, 'Connection board'); reference(devices, connection.deviceId, 'Connection device');
            if (!connection.port || typeof connection.port !== 'string') fail('Connection port is required.');
            // Onboard direction LEDs monitor an output; they do not occupy the
            // connector where a wheel motor is wired.
            if (deviceById.get(connection.deviceId).legacyOverlay) return;
            const board = value.components.find(component => component.id === connection.boardId);
            if (Array.isArray(board.ports)) {
                const port = board.ports.find(entry => entry.id === connection.port);
                if (!port) fail('Unknown board port: ' + connection.port);
                const device = deviceById.get(connection.deviceId), type = device.type;
                const expected = device.portType || ({motor:'motor',servo:'servo','line-sensor':'analog','distance-sensor':'analog',led:'digital',display:'i2c'})[type];
                if (port.type !== expected) fail('Port ' + connection.port + ' does not support ' + type + '.');
            }
            const key = connection.boardId + ':' + connection.port; if (ports.has(key)) fail('A board port cannot have two connections: ' + connection.port); ports.add(key);
        });
        value.artwork.forEach(art => { reference(components, art.componentId, 'Artwork'); relative(art.file, 'artwork'); vector(art.position, 3, 'Artwork position'); vector(art.rotation, 3, 'Artwork rotation'); vector(art.size, 2, 'Artwork size', true); finite(art.opacity, 'artwork opacity', 0); if (art.opacity > 1) fail('Artwork opacity cannot exceed 1.'); });
        if (value.assemblyGuide !== undefined) {
            if (!AssemblyGuide) fail('Assembly guide support is not loaded.');
            value.assemblyGuide = AssemblyGuide.validate(value);
        }
        return value;
    }
    function create(kind) { return normalize({ kind: kind || 'component', id: 'new-' + (kind || 'component'), name: 'New ' + (kind === 'robot' ? 'Robot' : kind === 'board' ? 'Board' : 'Component') }); }
    return { normalize, validate, create, clone, syncLegacyDefinition, validateConnector, connectorCompatibility, pinKinds, pinDirections, boardRoles, isMainBoard, kinds: kinds.slice(), deviceTypes: deviceTypes.slice() };
});
