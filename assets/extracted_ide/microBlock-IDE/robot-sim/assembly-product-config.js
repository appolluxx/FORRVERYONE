(function (root) {
    'use strict';
    const list = value => Array.isArray(value) ? value : [];
    const schema = root.ProductSchema || (typeof require === 'function' ? require('./product-schema.js') : null);
    function consolidateDefaultBoard(parts) {
        const duplicate=list(parts).find(part=>part.id==='system-board-atom-vx'&&part.productManifest&&part.productManifest.id==='atom-vx');
        const retained=duplicate&&parts.find(part=>part!==duplicate&&part.catalogId==='product:atom-vx'&&part.productManifest&&part.productManifest.id==='atom-vx');
        if(!retained)return parts;
        // The automatic fallback is redundant when the project's catalog board
        // already exists. Preserve that instance and redirect its old references.
        const oldId=duplicate.id,newId=retained.id;
        ['deviceBindings','connectorLinks','mates'].forEach(key=>{
            const identity=item=>key==='deviceBindings'?item.deviceId:key==='connectorLinks'?item.componentId+'/'+item.connectorId:item.id;
            const existing=list(retained[key]),seen=new Set(existing.map(identity));
            retained[key]=existing.concat(list(duplicate[key]).filter(item=>!seen.has(identity(item))));
        });
        retained.mateLinks=Array.from(new Set(list(retained.mateLinks).concat(list(duplicate.mateLinks))));
        retained.mateTypes=Object.assign({},duplicate.mateTypes,retained.mateTypes);
        const result=parts.filter(part=>part!==duplicate);
        result.forEach(part=>{
            list(part.deviceBindings).forEach(binding=>{if(binding.boardPartId===oldId)binding.boardPartId=newId;});
            list(part.connectorLinks).forEach(link=>{if(link.targetPartId===oldId)link.targetPartId=newId;});
            part.mateLinks=Array.from(new Set(list(part.mateLinks).map(id=>id===oldId?newId:id))).filter(id=>id!==part.id);
            if(part.mateTypes&&part.mateTypes[oldId]){part.mateTypes[newId]=part.mateTypes[oldId];delete part.mateTypes[oldId];}
            if(part.mateTypes)delete part.mateTypes[part.id];
            part.mates=list(part.mates).filter(mate=>{
                if(mate.a===oldId)mate.a=newId;if(mate.b===oldId)mate.b=newId;
                return mate.a!==mate.b;
            });
        });
        return result;
    }
    function normalizeConnectorLinks(raw) {
        const seen = new Set();
        return list(raw).filter(link => link && ['componentId', 'connectorId', 'targetPartId', 'targetComponentId', 'targetConnectorId'].every(key => typeof link[key] === 'string' && link[key]) &&
            !seen.has(link.componentId + '/' + link.connectorId) && seen.add(link.componentId + '/' + link.connectorId)).map(link => ({
                componentId: link.componentId, connectorId: link.connectorId, targetPartId: link.targetPartId,
                targetComponentId: link.targetComponentId, targetConnectorId: link.targetConnectorId
            }));
    }
    function connectors(parts) {
        return list(parts).reduce((all, part) => all.concat(list(part.productManifest && part.productManifest.components).reduce((items, component) =>
            items.concat(list(component.connectors).map(connector => ({ partId: part.id, componentId: component.id, connectorId: connector.id,
                name: part.name + ' / ' + (component.name || component.id) + ' / ' + connector.name, connector }))), [])), []);
    }
    const sameConnector = (a, b) => a && b && a.partId === b.partId && a.componentId === b.componentId && a.connectorId === b.connectorId;
    function connectorTarget(parts, endpoint) {
        const part = list(parts).find(item => item.id === endpoint.partId);
        const link = normalizeConnectorLinks(part && part.connectorLinks).find(item => item.componentId === endpoint.componentId && item.connectorId === endpoint.connectorId);
        return link ? { partId: link.targetPartId, componentId: link.targetComponentId, connectorId: link.targetConnectorId } : null;
    }
    function disconnectConnector(parts, endpoint) {
        list(parts).forEach(part => { part.connectorLinks = normalizeConnectorLinks(part.connectorLinks).filter(link =>
            !(part.id === endpoint.partId && link.componentId === endpoint.componentId && link.connectorId === endpoint.connectorId) &&
            !(link.targetPartId === endpoint.partId && link.targetComponentId === endpoint.componentId && link.targetConnectorId === endpoint.connectorId)); });
    }
    function availableConnectors(parts, source) {
        const all = connectors(parts), endpoint = all.find(item => sameConnector(item, source));
        if (!endpoint) return [];
        return all.filter(target => !sameConnector(target, source) && !(target.partId === source.partId && target.componentId === source.componentId) &&
            (!connectorTarget(parts, target) || sameConnector(connectorTarget(parts, target), source)) &&
            schema.connectorCompatibility(endpoint.connector, target.connector).compatible);
    }
    function connectConnectors(parts, source, target) {
        if (!target) { disconnectConnector(parts, source); return; }
        if (!availableConnectors(parts, source).some(item => sameConnector(item, target))) throw new Error('Choose an available connector with matching interface, pins, signals and voltages.');
        disconnectConnector(parts, source);
        [[source, target], [target, source]].forEach(([from, to]) => {
            const part = parts.find(item => item.id === from.partId);
            part.connectorLinks = normalizeConnectorLinks(part.connectorLinks).concat({ componentId: from.componentId, connectorId: from.connectorId,
                targetPartId: to.partId, targetComponentId: to.componentId, targetConnectorId: to.connectorId });
        });
    }
    function normalizeBindings(raw) {
        const seen = new Set();
        return list(raw).filter(value => value && typeof value.deviceId === 'string' && !seen.has(value.deviceId) && seen.add(value.deviceId)).map(value => {
            const normalized = { deviceId: value.deviceId, name: String(value.name || '').trim(),
                boardPartId: String(value.boardPartId || ''), boardComponentId: String(value.boardComponentId || ''), port: String(value.port || '') };
            // Older assemblies only override a device's name and connection.
            // An omitted motion setting inherits its authored product default.
            if (value.driveSide !== undefined) normalized.driveSide = ['left', 'right'].includes(value.driveSide) ? value.driveSide : 'none';
            if (value.invert !== undefined) normalized.invert = !!value.invert;
            if (value.triggerPort !== undefined) normalized.triggerPort = String(value.triggerPort || '');
            if(value.encoder!==undefined)normalized.encoder=value.encoder?{pinA:String(value.encoder.pinA||''),pinB:String(value.encoder.pinB||''),countsPerRevolution:Number(value.encoder.countsPerRevolution),invert:!!value.encoder.invert}:null;
            return normalized;
        });
    }
    function devices(part) { return list(part && part.productManifest && part.productManifest.devices).filter(device => !device.legacyOverlay); }
    function portType(device) {
        if (device.portType) return device.portType;
        return ({ motor: 'motor', servo: 'servo', 'line-sensor': 'analog', 'distance-sensor': 'analog', led: 'digital', display: 'i2c' })[device.type] || '';
    }
    function binding(part, deviceId) {
        const device = devices(part).find(item => item.id === deviceId);
        if (!device) return null;
        const saved = normalizeBindings(part.deviceBindings).find(item => item.deviceId === deviceId);
        const connection = list(part.productManifest.connections).find(item => item.deviceId === deviceId);
        return Object.assign({ deviceId, name: device.name || device.id, boardPartId: connection ? part.id : '', boardComponentId: connection ? connection.boardId : '',
            port: connection ? connection.port : '', triggerPort: device.triggerPort || '', driveSide: device.driveSide || 'none', invert: !!device.invert,encoder:device.encoder||null }, saved);
    }
    function boards(parts) {
        const hasProductBoard = list(parts).some(part => part.productManifest && list(part.productManifest.components).some(schema.isMainBoard));
        const result = [], seenBoards = new Set();
        list(parts).forEach(part => {
            const manifest = part.productManifest;
            let components = list(manifest && manifest.components);
            if (!manifest && part.systemRole === 'controller-board' && !hasProductBoard) components = [{ id: 'main', kind: 'board', name: part.name }];
            components.filter(c => c.kind === 'board').forEach(component => {
                const identity=JSON.stringify([part.id,component.id]);
                if(seenBoards.has(identity))return;
                seenBoards.add(identity);
                // An explicit empty list means this board has no connectors.
                const role = component.boardRole || 'main';
                const ports = Array.isArray(component.ports) ? component.ports.map(port => Object.assign({}, port)) : [];
                // Keep legacy connectors addressable without inventing ports
                // when a package already defines its connectors explicitly.
                if (!Array.isArray(component.ports)) list(manifest && manifest.connections).filter(c => c.boardId === component.id).forEach(connection => {
                    if (ports.some(p => p.id === connection.port)) return;
                    const device = list(manifest.devices).find(d => d.id === connection.deviceId);
                    if (device && !device.legacyOverlay) ports.push({ id: connection.port, name: connection.port, type: portType(device) });
                });
                result.push({ partId: part.id, componentId: component.id, role, name: part.name + (components.length > 1 ? ' / ' + (component.name || component.id) : ''), ports });
            });
        });
        const boardKey = board => JSON.stringify([board.partId, board.componentId]);
        const byKey = new Map(result.map(board => [boardKey(board), board]));
        const adjacency = new Map(result.map(board => [boardKey(board), new Set()]));
        // Explicit internal wiring of a complete product is independent of
        // connector links between user-added Equipment instances.
        list(parts).forEach(part => list(part.productManifest && part.productManifest.boardLinks).forEach(link => {
            const a = JSON.stringify([part.id, link.a]), b = JSON.stringify([part.id, link.b]);
            if (a === b || !byKey.has(a) || !byKey.has(b)) return;
            adjacency.get(a).add(b); adjacency.get(b).add(a);
        }));
        const endpoints = connectors(parts);
        endpoints.forEach(endpoint => {
            const target = connectorTarget(parts, endpoint), peer = target && endpoints.find(item => sameConnector(item, target));
            if (!peer || !sameConnector(connectorTarget(parts, peer), endpoint)) return;
            const match = schema.connectorCompatibility(endpoint.connector, peer.connector);
            if (!match.compatible || !match.mapping.some(pin => pin.kind !== 'power' && pin.kind !== 'ground')) return;
            const a = boardKey(endpoint), b = boardKey(peer);
            if (!byKey.has(a) || !byKey.has(b)) return;
            adjacency.get(a).add(b); adjacency.get(b).add(a);
        });
        result.forEach(board => {
            const visited = new Set(), queue = [boardKey(board)], controllers = [];
            while (queue.length) {
                const current = queue.shift(); if (visited.has(current)) continue; visited.add(current);
                const node = byKey.get(current);
                if (node.role === 'main') { controllers.push({partId:node.partId,componentId:node.componentId}); if (current !== boardKey(board)) continue; }
                adjacency.get(current).forEach(next => { if (!visited.has(next)) queue.push(next); });
            }
            board.controllers = controllers;
            board.connected = board.role === 'main' || controllers.length === 1;
        });
        return result;
    }
    function occupied(parts, boardPartId, boardComponentId, port, exceptPartId, exceptDeviceId) {
        return list(parts).some(part => devices(part).some(device => {
            if (part.id === exceptPartId && device.id === exceptDeviceId) return false;
            const value = binding(part, device.id);
            return value.boardPartId === boardPartId && value.boardComponentId === boardComponentId &&
                (value.port === port || device.type === 'motor'&&value.encoder&&[value.encoder.pinA,value.encoder.pinB].includes(port) || device.type === 'distance-sensor' && portType(device) === 'digital' && value.triggerPort === port);
        }));
    }
    function pinOptions(fallback, types, current) {
        // Programming menus describe the selected board's firmware pins.
        // Assembly wiring controls simulation routing, not what can be uploaded.
        return fallback.map(option => option.slice());
    }
    function availablePorts(parts, partId, deviceId, boardPartId, boardComponentId) {
        const part = list(parts).find(p => p.id === partId), device = devices(part).find(d => d.id === deviceId);
        const board = boards(parts).find(b => b.partId === boardPartId && b.componentId === boardComponentId);
        if (!device || !board || !board.connected) return [];
        return board.ports.filter(port => port.type === portType(device) && !occupied(parts, boardPartId, boardComponentId, port.id, partId, deviceId));
    }
    function applyBinding(parts, partId, raw) {
        const part = list(parts).find(p => p.id === partId), device = devices(part).find(d => d.id === raw.deviceId);
        if (!device) throw new Error('This device is no longer in the assembly.');
        const value = normalizeBindings([raw])[0];
        if(value.encoder===undefined)value.encoder=binding(part,device.id).encoder;
        if(!value.port)value.encoder=null;
        if(value.encoder){
            const e=value.encoder,board=boards(parts).find(b=>b.partId===value.boardPartId&&b.componentId===value.boardComponentId);
            if(device.type!=='motor'||!value.port||!board||!Number.isFinite(e.countsPerRevolution)||e.countsPerRevolution<=0||e.pinA===e.pinB||
                [e.pinA,e.pinB].some(pin=>!board.ports.some(p=>p.id===pin&&p.type==='digital')||occupied(parts,value.boardPartId,value.boardComponentId,pin,partId,device.id)))throw Error('Encoder needs two available digital pins and a positive count per revolution.');
        }
        const ultrasonic = device.type === 'distance-sensor' && portType(device) === 'digital';
        if (ultrasonic && value.triggerPort === undefined) value.triggerPort = binding(part, device.id).triggerPort;
        value.name = value.name || device.name || device.id;
        if (value.port && !availablePorts(parts, partId, device.id, value.boardPartId, value.boardComponentId).some(p => p.id === value.port))
            throw new Error('Choose an available connector compatible with this device.');
        if (ultrasonic && value.boardPartId && value.triggerPort) {
            if (value.triggerPort === value.port) throw new Error('Trigger and Echo must use different pins.');
            if (!availablePorts(parts, partId, device.id, value.boardPartId, value.boardComponentId).some(p => p.id === value.triggerPort))
                throw new Error('Choose an available digital pin for Trigger.');
        }
        if (!value.port && !(ultrasonic && value.triggerPort && value.boardPartId)) { value.boardPartId = ''; value.boardComponentId = ''; }
        part.deviceBindings = normalizeBindings(part.deviceBindings).filter(item => item.deviceId !== device.id).concat(value);
        return value;
    }
    function disconnectBoard(parts, boardPartId) {
        let count = 0;
        list(parts).forEach(part => { part.connectorLinks = normalizeConnectorLinks(part.connectorLinks).filter(link => part.id !== boardPartId && link.targetPartId !== boardPartId); });
        list(parts).forEach(part => devices(part).forEach(device => {
            const value = binding(part, device.id);
            if (value.boardPartId !== boardPartId) return;
            applyBinding(parts, part.id, Object.assign(value, { port: '', triggerPort: '' })); count++;
        }));
        return count;
    }
    function mounts(part) {
        return list(part && part.productManifest && part.productManifest.components).reduce((all, component) => all.concat(list(component.mounts).map(mount => ({
            id: component.id + '/' + mount.id, componentId: component.id, mountId: mount.id, name: (component.name || component.id) + ' / ' + mount.name,
            type: mount.type, position: mount.position, axis: mount.axis
        }))), []);
    }
    function mountFace(T, part, preparedData, mountId) {
        const mount = mounts(part).find(item => item.id === mountId);
        if (!mount || !preparedData || !Array.isArray(preparedData.productOrigin)) return null;
        const component = part.productManifest.components.find(c => c.id === mount.componentId);
        const q = new T.Quaternion().setFromEuler(new T.Euler(...(component.rotation || [0, 0, 0]).map(value => value * Math.PI / 180)));
        const scale = new T.Vector3().fromArray(component.scale || [1, 1, 1]);
        const center = new T.Vector3().fromArray(mount.position).multiply(scale).applyQuaternion(q).add(new T.Vector3().fromArray(component.position)).sub(new T.Vector3().fromArray(preparedData.productOrigin));
        const direction = new T.Vector3().fromArray(mount.axis);
        if (mount.type === 'fixed') direction.divide(scale); else direction.multiply(scale);
        direction.applyQuaternion(q).normalize();
        return { partId: part.id, key: 'mount:' + mount.id, kind: mount.type === 'fixed' ? 'plane' : 'cylinder', center,
            normal: direction.clone(), axis: mount.type === 'fixed' ? undefined : direction.clone(), componentId: mount.componentId, mountId: mount.mountId, mountType: mount.type, vertices: [] };
    }
    function componentFace(T, part, preparedData, face) {
        if (!face.componentId || !preparedData || !preparedData.productOrigin) return null;
        const component = list(part.productManifest && part.productManifest.components).find(c => c.id === face.componentId);
        if (!component) return null;
        const inverse = new T.Quaternion().setFromEuler(new T.Euler(...(component.rotation || [0, 0, 0]).map(value => value * Math.PI / 180))).invert();
        const scale = new T.Vector3().fromArray(component.scale || [1, 1, 1]);
        const center = face.center.clone().add(new T.Vector3().fromArray(preparedData.productOrigin)).sub(new T.Vector3().fromArray(component.position)).applyQuaternion(inverse).divide(scale);
        const normal = face.normal.clone().applyQuaternion(inverse).multiply(scale).normalize();
        const axis = face.axis && face.axis.clone().applyQuaternion(inverse).divide(scale).normalize();
        return { center: center.toArray(), normal: normal.toArray(), axis: axis ? axis.toArray() : undefined };
    }
    root.AssemblyProductConfig = { consolidateDefaultBoard, normalizeBindings, devices, binding, portType, boards, pinOptions, availablePorts, applyBinding, disconnectBoard, mounts, mountFace, componentFace,
        normalizeConnectorLinks, connectors, connectorTarget, availableConnectors, connectConnectors, disconnectConnector };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.AssemblyProductConfig;
})(typeof window !== 'undefined' ? window : globalThis);
