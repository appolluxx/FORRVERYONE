(function (root) {
    'use strict';

    const STORAGE_KEY = 'robot_assembly_v1';
    const RuntimeLinks=root.AssemblyRuntimeLinks||(typeof require==='function'?require('./assembly-runtime-links.js'):null);
    const isMainBoard=component=>component.kind==='board'&&(!component.boardRole||component.boardRole==='main');
    let buildbotWebBaseline;
    function applyAppearanceMass(T, physical, appearance) {
        const Physics=root.ProductPhysics||(typeof require==='function'?require('./product-physics.js'):null);
        if(!Physics)throw new Error('Mass properties module is unavailable.');
        const target=physical.physicsModel(),source=appearance.physicsModel();
        const parents=new Map((source.manifest.joints||[]).filter(j=>j.type==='fixed').map(j=>[j.child,j.parent]));
        const groups=new Map();
        for(const part of source.manifest.components){
            let id=part.id;const visited=new Set();
            while(!target.meshes.has(id)&&parents.has(id)&&!visited.has(id)){visited.add(id);id=parents.get(id);}
            const anchor=target.meshes.get(id),mesh=source.meshes.get(part.id);
            if(!anchor||!mesh)throw new Error('No mass anchor for '+part.id);
            anchor.updateMatrix();mesh.updateMatrix();
            const offset=anchor.matrix.clone().invert().multiply(mesh.matrix);
            const p=Physics.estimate(T,mesh,part.physics),center=new T.Vector3().fromArray(p.centerOfMass).applyMatrix4(offset);
            const position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();offset.decompose(position,rotation,scale);
            const inertia=Physics.scaledInertia(p.inertia,scale),r=new T.Matrix4().makeRotationFromQuaternion(rotation).elements;
            const diagonal=[0,1,2].map(i=>r[i]*r[i]*inertia[0]+r[i+4]*r[i+4]*inertia[1]+r[i+8]*r[i+8]*inertia[2]);
            if(!groups.has(id))groups.set(id,[]);
            groups.get(id).push({id:part.id,mass:p.mass,center,inertia:diagonal});
        }
        let total=0;
        for(const part of target.manifest.components){
            const items=groups.get(part.id);if(!items)throw new Error('Missing measured mass for '+part.id);
            const mass=items.reduce((sum,p)=>sum+p.mass,0),center=new T.Vector3();
            for(const item of items)center.addScaledVector(item.center,item.mass);
            if(mass)center.divideScalar(mass);
            const inertia=[0,0,0];
            for(const item of items){const d=item.center.clone().sub(center);const shifts=[d.y*d.y+d.z*d.z,d.x*d.x+d.z*d.z,d.x*d.x+d.y*d.y];for(let i=0;i<3;i++)inertia[i]+=item.inertia[i]+item.mass*shifts[i];}
            // Fixed fasteners contribute at their authored positions without
            // adding duplicate collision bodies. Retain the existing collider,
            // motor and sensor geometry; inertia remains a geometry estimate.
            part.physics=Object.assign({},part.physics,{mass,centerOfMass:center.toArray(),inertia:inertia.map(v=>Math.max(1e-12,v))});
            total+=mass;
        }
        physical.simulationMass={source:'current-product-components',components:source.manifest.components.length,kilograms:total};
    }
    // The renderer follows calibrated physical components. It never contributes
    // mass, colliders, inertia, sensor frames or motor calibration to the solver.
    function attachSimulationAppearance(T, physical, appearance) {
        const physicalMeshes = physical.physicsModel().meshes;
        const manifest = appearance.physicsModel().manifest;
        const parents = new Map((manifest.joints || []).filter(j => j.type === 'fixed').map(j => [j.child, j.parent]));
        const records = [];
        for (const [id, mesh] of appearance.meshes) {
            let anchorId = id;
            const visited = new Set();
            while (!physicalMeshes.has(anchorId) && parents.has(anchorId) && !visited.has(anchorId)) {
                visited.add(anchorId); anchorId = parents.get(anchorId);
            }
            const anchor = physicalMeshes.get(anchorId);
            if (!anchor) throw new Error('No calibrated physical anchor for ' + id);
            anchor.updateMatrix(); mesh.updateMatrix();
            records.push({ mesh, anchor, offset: anchor.matrix.clone().invert().multiply(mesh.matrix) });
        }
        let installed = false, disposed = false;
        const hiddenChildren = [], materials = new Map();
        appearance.setPhysicsDriven(true);
        function detach() {
            if (!installed) return;
            records.forEach(({mesh}) => appearance.root.add(mesh));
            hiddenChildren.forEach(([child, visible]) => { child.visible = visible; });
            materials.forEach((visible, material) => { material.visible = visible; });
            hiddenChildren.length = 0; materials.clear(); installed = false;
        }
        const setPhysicsDriven = physical.setPhysicsDriven.bind(physical);
        physical.setPhysicsDriven = value => {
            setPhysicsDriven(value);
            if (!value) { detach(); return; }
            if (installed) return;
            // Activate only AFTER physics has measured the original geometry.
            // Keeping it absent earlier also preserves initial ground alignment.
            for (const mesh of physicalMeshes.values()) {
                for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean)) {
                    if (!materials.has(material)) materials.set(material, material.visible);
                    material.visible = false;
                }
                for (const child of mesh.children) { hiddenChildren.push([child, child.visible]); child.visible = false; }
            }
            for (const {mesh, anchor, offset} of records) {
                anchor.add(mesh); offset.decompose(mesh.position, mesh.quaternion, mesh.scale); mesh.updateMatrix();
            }
            installed = true;
        };
        for (const method of ['applyDisplay', 'setMotors', 'reset']) {
            const original = physical[method].bind(physical);
            physical[method] = (...args) => { const result = original(...args); appearance[method](...args); return result; };
        }
        physical.getDisplayCanvas = appearance.getDisplayCanvas.bind(appearance);
        const dispose = physical.dispose.bind(physical);
        physical.dispose = () => {
            if (disposed) return;
            disposed = true; detach(); appearance.dispose(); dispose();
        };
        physical.simulationAppearance = { components: records.length, physicsComponents: physicalMeshes.size };
        return physical;
    }
    async function restoreWebSimulation(parts, selectedProduct) {
        if (selectedProduct?.manifest.id !== 'buildbot') return;
        const builtins = parts.filter(part => part.catalogId === 'product:buildbot' && part.productManifest?.id === 'buildbot');
        if (!builtins.length) return;
        if (!buildbotWebBaseline) {
            buildbotWebBaseline = fetch(new URL('sim-web-baseline.json', selectedProduct.baseUrl).href)
                .then(async response => {
                    if (!response.ok) throw new Error('Could not load the Build BOT web simulation baseline.');
                    return root.ProductSchema.validate(await response.json());
                }).catch(error => { buildbotWebBaseline = null; throw error; });
        }
        const baseline = await buildbotWebBaseline;
        for (const part of builtins) {
            // SIM-only, after catalog calibration refresh. Never write this
            // snapshot back to Assembly, project files, placements or bindings.
            part.productManifest = JSON.parse(JSON.stringify(baseline));
            part.productBaseUrl = selectedProduct.baseUrl;
        }
    }

    function parts() {
        try {
            const projectValue = typeof fs !== 'undefined' && fs && typeof fs.read === 'function' ? fs.read('/assembly.json') : null;
            const projectAssembly = projectValue ? JSON.parse(projectValue) : null;
            const localParts = JSON.parse(localStorage.getItem(STORAGE_KEY));
            const value = Array.isArray(localParts)
                ? localParts
                : (projectAssembly && Array.isArray(projectAssembly.parts) ? projectAssembly.parts : []);
            if (!Array.isArray(value)) return [];
            const embeddedController = value.some(part => !(root.AtomVxModel && root.AtomVxModel.matches(part)) && part.productManifest && Array.isArray(part.productManifest.components) && part.productManifest.components.some(isMainBoard));
            return root.AtomVxModel && (!root.AtomVxModel.selected() || embeddedController)
                ? value.filter(part => !root.AtomVxModel.matches(part))
                : value;
        } catch (_) { return []; }
    }

    async function geometry(key) {
        if(root.ProjectGeometry)await root.ProjectGeometry.ready;
        if (!key || !root.indexedDB) return Promise.resolve(null);
        return new Promise(resolve => {
            const request = indexedDB.open('robot-assembly-geometry', 1);
            request.onerror = () => resolve(null);
            request.onupgradeneeded = () => request.result.createObjectStore('meshes');
            request.onsuccess = () => {
                const database = request.result;
                const tx = database.transaction('meshes', 'readonly');
                const get = tx.objectStore('meshes').get(key);
                get.onsuccess = () => resolve(get.result || null);
                get.onerror = () => resolve(null);
                tx.oncomplete = () => database.close();
            };
        });
    }

    function material(T, part, color) {
        return new T.MeshStandardMaterial({ color: color || part.color || '#718391', roughness: .62, metalness: part.type === 'step' ? .16 : .04 });
    }

    function stepMaterials(T, shape, part, stored) {
        const imported = root.AssemblyGlb && root.AssemblyGlb.createMaterials
            ? root.AssemblyGlb.createMaterials(T, stored)
            : [];
        const materials = imported.length ? imported : [material(T, part, part.color)];
        const indexes = {};
        let group = null;
        (shape.userData.brepFaces || []).forEach((face, faceIndex) => {
            const color = part.faceColors && part.faceColors['brep-' + faceIndex];
            let index = imported.length && Number.isInteger(face.materialIndex) ? face.materialIndex : 0;
            if (color) {
                const key = color.toLowerCase();
                if (indexes[key] === undefined) { indexes[key] = materials.length; materials.push(material(T, part, color)); }
                index = indexes[key];
            }
            const start = face.first * 3;
            const count = (face.last - face.first + 1) * 3;
            if (group && group.index === index && group.start + group.count === start) group.count += count;
            else {
                if (group) shape.addGroup(group.start, group.count, group.index);
                group = { start, count, index };
            }
        });
        if (group) shape.addGroup(group.start, group.count, group.index);
        return materials.length === 1 ? materials[0] : materials;
    }

    async function load(T) {
        if (root.AtomVxModel && root.AtomVxModel.selected() && root.AtomVxModel.loadDefinition) await root.AtomVxModel.loadDefinition();
        const saved = root.AssemblyProductConfig && root.AssemblyProductConfig.consolidateDefaultBoard
            ? root.AssemblyProductConfig.consolidateDefaultBoard(parts()) : parts();
        const instanceManifests = new Map(saved.filter(part => part.productManifest)
            .map(part => [part.id, JSON.parse(JSON.stringify(part.productManifest))]));
        if(root.ProductCatalog&&root.ProductCatalog.refreshConfiguration){
            const catalog=await root.ProductCatalog.list();
            const refreshes = new Map();
            await Promise.all(saved.filter(part=>part.catalogId&&part.productManifest).map(part=>
                root.ProductCatalog.refreshConfiguration(part,catalog.find(item=>item.id===part.catalogId),refreshes)));
        }
        const selectedProduct = root.ProductCatalog && root.ProductCatalog.loadSelected ? await root.ProductCatalog.loadSelected() : null;
        if (selectedProduct && !saved.some(part => part.productManifest && part.productManifest.id === selectedProduct.manifest.id)) {
            saved.unshift({ id: 'selected-product-' + selectedProduct.manifest.id, catalogId: 'product:' + selectedProduct.manifest.id, name: selectedProduct.manifest.name, type: 'step', position: [0, 0, 0], rotation: [0, 0, 0], productManifest: selectedProduct.manifest, productBaseUrl: selectedProduct.baseUrl });
        }
        if (selectedProduct) {
            const publishedPhysics=new Map(selectedProduct.manifest.components.map(component=>[component.id,component.physics]));
            const publishedActuators=new Map((selectedProduct.manifest.devices||[]).filter(d=>d.type==='servo'||d.type==='motor').map(d=>[d.id,d]));
            const publishedJoints=new Map((selectedProduct.manifest.joints||[]).map(j=>[j.id,j]));
            saved.filter(part=>part.catalogId==='product:'+selectedProduct.manifest.id&&part.productManifest).forEach(part=>{
                // Catalog collider/material/mass corrections must reach assemblies saved before
                // publication, without replacing their placements or mates.
                part.productManifest.components.forEach(component=>{const settings=publishedPhysics.get(component.id);if(settings)component.physics=Object.assign({},component.physics,JSON.parse(JSON.stringify(settings)));});
                // Refresh catalog actuator calibration as well, preserving
                // IDE device names, port assignments and joint geometry.
                (part.productManifest.devices||[]).forEach(device=>{
                    const settings=publishedActuators.get(device.id);if(!settings||device.type!==settings.type)return;
                    ['model','maxSpeed','maxAcceleration'].forEach(key=>{if(settings[key]!==undefined)device[key]=settings[key];});
                    const source=publishedJoints.get(settings.jointId),joint=(part.productManifest.joints||[]).find(j=>j.id===device.jointId);
                    if(source&&joint&&Number.isFinite(source.maxTorque))joint.maxTorque=source.maxTorque;
                    if(source&&joint){
                        if(source.gearboxFrictionTorque===undefined)delete joint.gearboxFrictionTorque;
                        else if(Number.isFinite(source.gearboxFrictionTorque)&&source.gearboxFrictionTorque>=0)joint.gearboxFrictionTorque=source.gearboxFrictionTorque;
                    }
                });
            });
        }
        await restoreWebSimulation(saved, selectedProduct);
        const builtInData = new Map();
        const boardProduct = root.AtomVxModel && root.AtomVxModel.selected() && root.AtomVxModel.loadProduct ? await root.AtomVxModel.loadProduct() : null;
        if (root.AtomVxModel && root.AtomVxModel.selected() && !saved.some(part => root.AtomVxModel.matches(part) || part.productManifest && part.productManifest.components.some(isMainBoard))) {
            if (boardProduct) {
                saved.unshift({ id: root.AtomVxModel.PART_ID, systemRole: 'controller-board', name: boardProduct.manifest.name, type: 'step', position: [0, 0, 0], rotation: [0, 0, 0], productManifest: boardProduct.manifest, productBaseUrl: boardProduct.baseUrl });
            } else {
            const prepared = await root.AtomVxModel.loadPrepared(T);
            const board = root.AtomVxModel.partFromPrepared(prepared, 0);
            saved.unshift(board);
            builtInData.set(board.id, prepared.data);
            }
        }
        if (!saved.length) return null;
        // Refresh selected-board products through the same package used by
        // Assembly, including authored transforms and clipped artwork.
        if (root.AtomVxModel) for (const part of saved.filter(root.AtomVxModel.matches)) {
            // Assembly validated external bindings against these connectors.
            // A cached built-in model must not replace them with older ports.
            const configuredBoards = new Map((part.productManifest && part.productManifest.components || [])
                .filter(component => component.kind === 'board')
                .map(component => [component.id, component]));
            const retainConnectors = () => {
                (part.productManifest && part.productManifest.components || []).forEach(component => {
                    const configured = configuredBoards.get(component.id);
                    if (!configured || component.kind !== 'board') return;
                    ['ports', 'connectors'].forEach(key => { if (Array.isArray(configured[key])) component[key] = JSON.parse(JSON.stringify(configured[key])); });
                    if (configured.boardRole) component.boardRole = configured.boardRole;
                });
            };
            if (boardProduct && !Object.keys(part.faceColors || {}).length) {
                part.productManifest = JSON.parse(JSON.stringify(boardProduct.manifest));
                part.productBaseUrl = boardProduct.baseUrl;
                retainConnectors();
                continue;
            }
            const prepared = await root.AtomVxModel.loadPrepared(T);
            root.AtomVxModel.applyPreparedProduct(part, prepared);
            retainConnectors();
            builtInData.set(part.id, prepared.data);
        }
        // Selected-product and built-in board replacement run after the normal
        // catalog refresh. Reapply the same instance calibration after all of
        // them so a published board mass cannot silently replace project mass.
        if (root.ProductCatalog && root.ProductCatalog.applyInstanceOverrides) saved.forEach(part => {
            root.ProductCatalog.applyInstanceOverrides(part.productManifest, instanceManifests.get(part.id));
        });
        const data = await Promise.all(saved.map(async part => {
            if (part.productManifest) return null;
            if (builtInData.has(part.id)) return builtInData.get(part.id);
            if (root.AtomVxModel && root.AtomVxModel.matches(part)) {
                const prepared = await root.AtomVxModel.loadPrepared(T);
                part.size = prepared.size.slice(0, 3);
                return prepared.data;
            }
            return part.geometryKey ? geometry(part.geometryKey) : null;
        }));
        for (let index = 0; index < saved.length; index++) {
            if (!data[index] && !saved[index].productManifest && root.AtomVxModel && root.AtomVxModel.matches(saved[index])) {
                const prepared = await root.AtomVxModel.loadPrepared(T);
                data[index] = prepared.data;
            }
        }
        data.forEach((stored, index) => {
            const part = saved[index];
            const isGlb = part && (/^glb-/.test(part.importGroup || '') || /\.glb$/i.test(part.fileName || ''));
            if (stored && isGlb && root.AssemblyGlb && root.AssemblyGlb.upgradeData) root.AssemblyGlb.upgradeData(stored);
        });
        const assembly = new T.Group();
        const motors = new Array(4);
        const productRuntimes = [];
        const productEntries = [];
        const boardControllers = [];
        // Repeated wheels, fasteners and sensors share decoded source assets for
        // this load. Runtime meshes/materials remain independent per instance.
        const compiledAssetCache = new Map();
        for (const part of saved.filter(part => part.productManifest)) {
            if (!root.ProductRuntime) throw new Error('Product simulation module is unavailable.');
            const product = await root.ProductRuntime.load(T, RuntimeLinks.prepareManifest(part), { baseUrl: part.productBaseUrl, deviceOutputsOnly: true, compiledAssetCache });
            if (part.catalogId === 'product:buildbot' && selectedProduct?.manifest.id === 'buildbot') {
                let appearance;
                try {
                    const appearanceManifest = JSON.parse(JSON.stringify(selectedProduct.manifest));
                    if (root.ProductCatalog.applyInstanceOverrides) root.ProductCatalog.applyInstanceOverrides(appearanceManifest, instanceManifests.get(part.id));
                    const appearancePart = Object.assign({}, part, {productManifest: appearanceManifest});
                    appearance = await root.ProductRuntime.load(T, RuntimeLinks.prepareManifest(appearancePart), {baseUrl: selectedProduct.baseUrl, deviceOutputsOnly: true, compiledAssetCache});
                    applyAppearanceMass(T, product, appearance);
                    attachSimulationAppearance(T, product, appearance);
                } catch (error) { if (appearance) appearance.dispose(); product.dispose(); throw error; }
            }
            // The Assembly catalog represents each product around its bounds
            // centre; preserve the authored component coordinate system inside.
            product.root.updateMatrixWorld(true);
            const bounds = new T.Box3().setFromObject(product.root);
            const centre = bounds.getCenter(new T.Vector3());
            product.root.position.sub(centre);
            const placement = new T.Group();
            placement.add(product.root);
            placement.position.fromArray(part.position || [0, 0, 0]);
            placement.rotation.fromArray(part.rotation || [0, 0, 0]);
            assembly.add(placement);
            productRuntimes.push(product);
            productEntries.push({part,runtime:product,placement});
        }
        compiledAssetCache.clear();
        saved.forEach((part, partIndex) => {
            if (part.productManifest) return;
            const size = Array.isArray(part.size) ? part.size : [.08, .05, .08];
            let shape;
            if (part.type === 'step') {
                const stored = data[partIndex];
                if (!stored) return;
                shape = new T.BufferGeometry();
                shape.setAttribute('position', new T.Float32BufferAttribute(stored.positions, 3));
                if (stored.normals) shape.setAttribute('normal', new T.Float32BufferAttribute(stored.normals, 3));
                else shape.computeVertexNormals();
                if (stored.uvs) shape.setAttribute('uv', new T.Float32BufferAttribute(stored.uvs, 2));
                shape.setIndex(ArrayBuffer.isView(stored.indices) ? new T.BufferAttribute(stored.indices, 1) : stored.indices);
                shape.userData.brepFaces = stored.faces || [];
                shape.userData.productNodes = stored.nodes;
            } else if (part.type === 'wheel') shape = new T.CylinderGeometry(size[0], size[2], size[1], 32);
            else shape = new T.BoxGeometry(size[0], size[1], size[2]);
            const mesh = new T.Mesh(shape, part.type === 'step' ? stepMaterials(T, shape, part, data[partIndex]) : material(T, part, part.color));
            mesh.userData.assemblyPartId = part.id;
            mesh.position.fromArray(part.position || [0, 0, 0]);
            mesh.rotation.fromArray(part.rotation || [0, 0, 0]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            assembly.add(mesh);
            if (part.geometryKey && part.type === 'step') {
                const Imported=root.ImportedPartPhysics||(typeof require==='function'?require('./imported-part-physics.js'):null);
                if(!Imported)throw new Error('Imported part physics module is unavailable.');
                const runtime=Imported.create(part,mesh);
                productRuntimes.push(runtime);
                productEntries.push({part,runtime,placement:mesh});
            }
            if (root.AtomVxModel && root.AtomVxModel.matches(part)) boardControllers.push(root.AtomVxModel.attachSimulation(T, mesh));
            const motorIndex = /^M[1-4]$/.test(part.motor || '') ? Number(part.motor.slice(1)) - 1 : -1;
            if (motorIndex >= 0) motors[motorIndex] = { wheel: mesh, axis: new T.Vector3(0, 1, 0), baseQuaternion: mesh.quaternion.clone(), part, size };
        });
        if (!assembly.children.length) return null;
        const radii = motors.filter(Boolean).map(item => Math.max(item.size[0] || 0, item.size[2] || 0));
        const left = motors.slice(0, 2).filter(Boolean).map(item => item.part.position[0]);
        const right = motors.slice(2, 4).filter(Boolean).map(item => item.part.position[0]);
        const controllers = boardControllers.concat(productRuntimes);
        const selectedPart=selectedProduct&&saved.find(part=>part.productManifest&&part.productManifest.id===selectedProduct.manifest.id);
        const routing=RuntimeLinks.create(T,productEntries,saved,{activeBoardPartId:selectedPart&&selectedPart.id});
        const productDrive=routing.drive.enabled?routing.drive:null;
        const mates=saved.reduce((all,part)=>all.concat(part.mates||[]),[]),preparedMates=new Map();
        // New mates carry component-local endpoints and need no merged mesh
        // cache. Read legacy face metadata only for affected old assemblies.
        const legacyPartIds=new Set();
        mates.forEach(mate=>[['a','faceA'],['b','faceB']].forEach(([side,faceKey])=>{
            const face=mate[faceKey],part=saved.find(item=>item.id===mate[side]);
            if(face&&!face.componentId&&part&&part.geometryKey&&part.productManifest&&part.productManifest.components.length>1)legacyPartIds.add(part.id);
        }));
        await Promise.all(Array.from(legacyPartIds).map(async id=>{const part=saved.find(item=>item.id===id);preparedMates.set(id,await geometry(part.geometryKey));}));
        const assemblyMates=routing.resolveMates(mates,preparedMates);
        const productMass = productRuntimes.reduce((sum, product) => sum + product.physics.mass, 0);
        return {
            root: assembly,
            hasLineSensors: routing.hasLineSensors,
            physics: { mass: productMass, friction: productMass ? productRuntimes.reduce((sum, product) => sum + product.physics.mass * product.physics.friction, 0) / productMass : .6 },
            controller: controllers.length ? {
                getDisplayCanvas() { return routing.getDisplayCanvas() || (boardControllers.find(controller=>controller.canvas)||{}).canvas || null; },
                setMotors(values) { routing.setMotors(values); boardControllers.forEach(controller => controller.setMotors(values)); },
                applyDisplay(command) { routing.applyDisplay(command); boardControllers.forEach(controller => controller.applyDisplay(command)); },
                dispose() { controllers.forEach(controller => controller.dispose()); }
            } : null,
            update(dt, outputs, environment) { routing.update(dt, outputs, environment); },
            resetDevices() { productRuntimes.forEach(product => product.reset()); },
            readSensor(port, kind, pulse) {
                return routing.readSensor(port,kind,pulse);
            },
            readDistanceSensors: routing.readDistanceSensors,
            controlBindings: routing.controlBindings,
            sampleSensors: routing.sampleSensors,
            productDrive,
            physicsWheels: routing.physicsWheels,
            physicsProducts: productRuntimes,
            assemblyMates,
            driveTargets: routing.driveTargets,
            motors,
            driveEnabled: !!productDrive || motors.slice(0, 2).some(Boolean) && motors.slice(2, 4).some(Boolean),
            wheelRadius: productDrive ? productDrive.wheelRadius : radii.length ? radii.reduce((sum, value) => sum + value, 0) / radii.length : .0325,
            trackWidth: productDrive ? productDrive.trackWidth : left.length && right.length ? Math.max(.02, Math.abs(left.reduce((a, b) => a + b, 0) / left.length - right.reduce((a, b) => a + b, 0) / right.length)) : .15
        };
    }

    root.AssemblySimLoader = { load, hasAssembly: () => parts().length > 0 || !!(root.AtomVxModel && root.AtomVxModel.selected()) };
})(typeof window !== 'undefined' ? window : globalThis);
