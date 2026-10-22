/* Shared product renderer and device model. Distances are metres; angles are degrees. */
(function (root) {
    'use strict';
    const radians = Math.PI / 180;
    const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    const inverse = matrix => matrix.clone().invert();
    // Curves are measured net output-shaft RPM with wheels lifted. Scaling the
    // authored maximum still allows deliberate per-project motor overrides.
    function motorVelocity(device, value) {
        const power = clamp(finite(value, 0), -100, 100);
        const maximum = Math.max(0, finite(device.maxSpeed, 360));
        const curve = device.speedCalibration;
        let speed = power / 100 * maximum;
        if (curve && power && Array.isArray(curve.forward) && Array.isArray(curve.reverse)) {
            const points = power < 0 ? curve.reverse : curve.forward;
            const fullRpm = Math.max(curve.forward[curve.forward.length - 1][1], curve.reverse[curve.reverse.length - 1][1]);
            const magnitude = Math.abs(power);
            for (let i = 1; i < points.length; i++) {
                if (magnitude > points[i][0]) continue;
                const [x0, y0] = points[i - 1], [x1, y1] = points[i];
                const rpm = y0 + (y1 - y0) * (magnitude - x0) / (x1 - x0);
                speed = Math.sign(power) * rpm / fullRpm * maximum;
                break;
            }
        }
        return speed * (device.invert ? -1 : 1);
    }
    // Sample a small circular sensing area, weighted toward its centre.
    // Evenly paired samples give a half-scale reading centred on a line edge.
    const reflectanceSamples = [];
    let reflectanceWeight = 0;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        const u = (x + .5) / 6 - 1, v = (y + .5) / 6 - 1, squared = u * u + v * v;
        if (squared > 1) continue;
        const weight = Math.exp(-2 * squared);
        reflectanceSamples.push({ u, v, weight }); reflectanceWeight += weight;
    }
    function lineReflectance(environment, hit, device, distance, direction) {
        if (!environment.lineAt) return 1;
        // Authored diameter is the optical footprint at 10 mm. Approximate
        // beam spread with distance and project its cross-section onto the
        // floor; a tilted sensor sees an ellipse, not a fixed world-space disk.
        const radius = clamp(finite(device.sensingDiameter, .004), .0001, .1) / 2
            * Math.max(.1, distance / .01);
        const horizontal = Math.hypot(direction.x, direction.z);
        const axisX = horizontal > 1e-8 ? direction.x / horizontal : 1;
        const axisZ = horizontal > 1e-8 ? direction.z / horizontal : 0;
        const stretch = 1 / Math.max(.1, Math.abs(direction.y));
        let total = 0;
        reflectanceSamples.forEach(sample => {
            const along = sample.u * radius * stretch, across = sample.v * radius;
            const value = clamp(finite(environment.lineAt(hit.x + along * axisX - across * axisZ,
                hit.z + along * axisZ + across * axisX), 1), 0, 1);
            total += value * sample.weight;
        });
        const reflectance = clamp(total / reflectanceWeight, 0, 1);
        // Optional measured optical response, shared by renderer and worker.
        // Products without measurements retain the original full-scale model.
        const response = device.sensorResponse;
        if (!response) return reflectance;
        const low = finite(response.blackReflectance, 0), high = finite(response.whiteReflectance, 1);
        const fraction = clamp((reflectance - low) / Math.max(.0001, high - low), 0, 1);
        return clamp(finite(response.black, 0) + fraction *
            (finite(response.white, 1) - finite(response.black, 0)), 0, 1);
    }

    function geometry(T, data) {
        const shape = new T.BufferGeometry();
        shape.setAttribute('position', new T.Float32BufferAttribute(data.positions, 3));
        if (data.normals) shape.setAttribute('normal', new T.Float32BufferAttribute(data.normals, 3));
        if (data.uvs) shape.setAttribute('uv', new T.Float32BufferAttribute(data.uvs, 2));
        if (data.indices) shape.setIndex(new T.BufferAttribute(new Uint32Array(data.indices), 1));
        if (!data.normals) shape.computeVertexNormals();
        shape.userData.brepFaces = (data.faces || []).map(face => Object.assign({}, face));
        return shape;
    }

    const connectedCache = new WeakMap();
    function connectedData(data) {
        if (connectedCache.has(data)) return connectedCache.get(data);
        const count = (data.indices ? data.indices.length : data.positions.length / 3) / 3;
        const parent = new Int32Array(count); for (let i=0;i<count;i++) parent[i]=i;
        const find = i => { while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i; };
        // Work inside each mesh primitive: welding separate primitives at
        // touching boundaries would glue the output shaft back to its bearing.
        const groups = new Map();
        (data.faces || []).forEach(face=>{const group=face.sourceNode;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(face);});
        for (const faces of groups.values()) {
            const vertices = new Map(), edges = new Map(), ids = new Map();
            const vertex = index => {
                if(ids.has(index))return ids.get(index);
                const key=[0,1,2].map(axis=>Math.round(data.positions[index*3+axis]*1e7)).join(',');
                if(!vertices.has(key))vertices.set(key,vertices.size);
                const id=vertices.get(key);ids.set(index,id);return id;
            };
            faces.forEach(face=>{for(let triangle=face.first;triangle<=face.last;triangle++){
                const v=[0,1,2].map(axis=>vertex(data.indices?data.indices[triangle*3+axis]:triangle*3+axis));
                for(let axis=0;axis<3;axis++){
                    const a=v[axis],b=v[(axis+1)%3];if(a===b)continue;
                    const key=Math.min(a,b)+':'+Math.max(a,b);
                    if(edges.has(key))parent[find(triangle)]=find(edges.get(key));else edges.set(key,triangle);
                }
            }});
        }
        const islands=new Map(),faces=[],nodes=[];
        (data.faces || []).forEach((face,sourceFaceIndex)=>{
            let run;
            for(let triangle=face.first;triangle<=face.last;triangle++){
                const key=find(triangle);
                if(!islands.has(key)){const id=nodes.length;islands.set(key,id);nodes.push({id,group:id,name:'Solid '+(id+1)});}
                const sourceNode=islands.get(key);
                if(run&&run.sourceNode===sourceNode)run.last=triangle;
                else{run=Object.assign({},face,{first:triangle,last:triangle,sourceNode,sourceFaceIndex});faces.push(run);}
            }
        });
        const result=Object.assign({},data,{faces,nodes});connectedCache.set(data,result);return result;
    }
    function subsetData(data, nodeIds) {
        const wanted = new Set(nodeIds), vertices = new Map(), positions = [], normals = [], uvs = [], indices = [], faces = [], sourceFaces = [];
        (data.faces || []).forEach((face, faceIndex) => {
            if (!wanted.has(face.sourceNode)) return;
            const first = indices.length / 3;
            for (let i = face.first * 3; i < (face.last + 1) * 3; i++) {
                const old = data.indices ? data.indices[i] : i;
                if (!vertices.has(old)) {
                    vertices.set(old, vertices.size);
                    for (let axis = 0; axis < 3; axis++) { positions.push(data.positions[old * 3 + axis]); if (data.normals) normals.push(data.normals[old * 3 + axis]); }
                    if (data.uvs) uvs.push(data.uvs[old * 2], data.uvs[old * 2 + 1]);
                }
                indices.push(vertices.get(old));
            }
            const copied=Object.assign({}, face, { first, last: indices.length / 3 - 1 });delete copied.sourceFaceIndex;
            faces.push(copied); sourceFaces.push(face.sourceFaceIndex === undefined ? faceIndex : face.sourceFaceIndex);
        });
        if (!indices.length) throw new Error('The selected GLB nodes have no geometry.');
        return Object.assign({}, data, { positions: new Float32Array(positions), normals: data.normals ? new Float32Array(normals) : undefined, uvs: data.uvs ? new Float32Array(uvs) : undefined, indices: new Uint32Array(indices), faces, sourceFaces, nodes: (data.nodes || []).filter(node => wanted.has(node.id)) });
    }

    function finishMaterial(T, material, entry) {
        if(entry.unlit){
            const light=new T.MeshBasicMaterial({color:entry.color||'#003cff',side:material.side,toneMapped:false});
            light.userData.sensorEmitter=true;
            material.dispose();return light;
        }
        const hasFinish = !!entry.emissive || ['roughness', 'metalness', 'clearcoat', 'clearcoatRoughness'].some(key => Number.isFinite(entry[key]));
        if ((!material.isMeshStandardMaterial && hasFinish) || ((Number.isFinite(entry.clearcoat) || Number.isFinite(entry.clearcoatRoughness)) && !material.isMeshPhysicalMaterial)) {
            const physical = new T.MeshPhysicalMaterial();
            if (material.isMeshStandardMaterial) T.MeshStandardMaterial.prototype.copy.call(physical, material);
            else {
                T.Material.prototype.copy.call(physical, material);
                physical.color.copy(material.color); physical.map = material.map;
            }
            physical.defines = { STANDARD: '', PHYSICAL: '' };
            material.dispose(); material = physical;
        }
        if (entry.color) material.color.set(entry.color);
        if(entry.emissive&&material.emissive){material.emissive.set(entry.emissive);material.emissiveIntensity=finite(entry.emissiveIntensity,1);}
        ['roughness', 'metalness', 'clearcoat', 'clearcoatRoughness'].forEach(key => {
            if (Number.isFinite(entry[key])) {
                material[key] = Math.max(0, Math.min(1, entry[key]));
                material.userData.productFinish = true;
            }
        });
        return material;
    }
    function materials(T, shape, data, component) {
        const result = root.AssemblyGlb ? root.AssemblyGlb.createMaterials(T, data) : [];
        if (!result.length) result.push(new T.MeshStandardMaterial({ color: component.color || (component.primitive && component.primitive.color) || '#718391', roughness: .72, metalness: .04 }));
        const appearance = component.appearance || {};
        (appearance.materials || []).forEach(entry => {
            let material = result[entry.index];
            if (!material) return;
            material = result[entry.index] = finishMaterial(T, material, entry);
            if (Number.isFinite(entry.opacity)) material.opacity = entry.opacity;
            material.transparent = material.opacity < 1;
        });
        const surfaceOverrides = new Map((appearance.surfaces || []).map(entry => [Number(entry.index), entry]));
        const surfaceMaterials = new Map();
        shape.clearGroups();
        let previous;
        (shape.userData.brepFaces || []).forEach((face, index) => {
            let materialIndex = Number.isInteger(face.materialIndex) && result[face.materialIndex] ? face.materialIndex : 0;
            const entry = surfaceOverrides.get(index);
            if (entry) {
                const key = JSON.stringify([materialIndex, entry.color, entry.roughness, entry.metalness, entry.clearcoat, entry.clearcoatRoughness, entry.emissive, entry.emissiveIntensity, entry.unlit]);
                if (!surfaceMaterials.has(key)) {
                    surfaceMaterials.set(key, result.length);
                    result.push(finishMaterial(T, result[materialIndex].clone(), entry));
                }
                materialIndex = surfaceMaterials.get(key);
            }
            face.materialIndex = materialIndex;
            face.color = '#' + result[materialIndex].color.getHexString();
            const start = face.first * 3, count = (face.last - face.first + 1) * 3;
            if (previous && previous.materialIndex === materialIndex && previous.start + previous.count === start) previous.count += count;
            else { shape.addGroup(start, count, materialIndex); previous = shape.groups[shape.groups.length - 1]; }
        });
        if (!shape.groups.length) shape.addGroup(0, shape.index ? shape.index.count : shape.attributes.position.count, 0);
        return result;
    }

    function applyAppearance(T, mesh, prepared, component) {
        const previous = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.geometry.userData.brepFaces = (prepared.data.faces || []).map(face => Object.assign({}, face));
        mesh.material = materials(T, mesh.geometry, prepared.data, component);
        const textures = new Set();
        previous.filter(Boolean).forEach(material => { if (material.map) textures.add(material.map); material.dispose(); });
        textures.forEach(texture => texture.dispose());
        return mesh.material;
    }

    function screw(T, component) {
        const config = component.primitive, diameter = config.size[0], length = config.size[1];
        const radius = diameter * .98, headHeight = diameter * .55;
        const arm = diameter * .5, halfWidth = diameter * .13, rimHeight = diameter * .18, socketFloor = diameter * .16;
        const angles = Array.from({length: 64}, (_, i) => i * Math.PI * 2 / 64);
        // Include all cross corners exactly, so its arms do not become rounded holes.
        [[-halfWidth,arm],[halfWidth,arm],[halfWidth,halfWidth],[arm,halfWidth],
            [arm,-halfWidth],[halfWidth,-halfWidth],[halfWidth,-arm],[-halfWidth,-arm],
            [-halfWidth,-halfWidth],[-arm,-halfWidth],[-arm,halfWidth],[-halfWidth,halfWidth]]
            .forEach(([x,z]) => angles.push((Math.atan2(z,x) + Math.PI * 2) % (Math.PI * 2)));
        angles.sort((a,b) => a-b);
        const theta = angles.filter((angle,i) => !i || angle-angles[i-1] > 1e-8);
        const hp = [], hn = [], hu = [];
        const top = (r, angle) => {
            const c = Math.cos(angle), s = Math.sin(angle), t = Math.sqrt(Math.max(0, 1-r*r/(radius*radius)));
            const p = new T.Vector3(r*c, rimHeight+(headHeight-rimHeight)*t, r*s);
            const n = new T.Vector3((headHeight-rimHeight)*r*c/(radius*radius),t,(headHeight-rimHeight)*r*s/(radius*radius)).normalize();
            return {p,n};
        };
        const vertex = (r,y,angle,n) => ({p:new T.Vector3(r*Math.cos(angle),y,r*Math.sin(angle)),n});
        function triangle(a,b,c) {
            const cross = b.p.clone().sub(a.p).cross(c.p.clone().sub(a.p));
            const normal = a.n || cross.clone().normalize();
            if (cross.dot(normal) < 0) { const swap=b;b=c;c=swap; }
            [a,b,c].forEach(v => { hp.push(...v.p.toArray());hn.push(...(v.n || normal).toArray());hu.push(v.p.x/(2*radius)+.5,v.p.z/(2*radius)+.5); });
        }
        const hole = angle => {
            const x=Math.max(1e-12,Math.abs(Math.cos(angle))),z=Math.max(1e-12,Math.abs(Math.sin(angle)));
            return Math.max(Math.min(halfWidth/x,arm/z),Math.min(arm/x,halfWidth/z));
        };
        for(let i=0;i<theta.length;i++) {
            const a=theta[i],b=theta[(i+1)%theta.length],ra=hole(a),rb=hole(b);
            for(let ring=0;ring<8;ring++) {
                const u=ring/8,v=(ring+1)/8;
                const p=top(ra+(radius-ra)*u,a),q=top(rb+(radius-rb)*u,b),r=top(rb+(radius-rb)*v,b),s=top(ra+(radius-ra)*v,a);
                triangle(p,q,r);triangle(p,r,s);
            }
            const na=new T.Vector3(Math.cos(a),0,Math.sin(a)),nb=new T.Vector3(Math.cos(b),0,Math.sin(b));
            const p=vertex(radius,0,a,na),q=vertex(radius,0,b,nb),r=vertex(radius,rimHeight,b,nb),s=vertex(radius,rimHeight,a,na);
            triangle(p,q,r);triangle(p,r,s);
            const down=new T.Vector3(0,-1,0),up=new T.Vector3(0,1,0);
            // Quarter-round underside blends the bearing face into the shank.
            const fillet = diameter * .14, shankRadius = diameter / 2, bearingRadius = shankRadius + fillet;
            const ia=vertex(bearingRadius,0,a,down),ib=vertex(bearingRadius,0,b,down);
            triangle(ia,vertex(radius,0,a,down),vertex(radius,0,b,down));
            triangle(ia,vertex(radius,0,b,down),ib);
            const neck = (angle,t) => {
                const r=shankRadius+fillet*(1-Math.cos(t)),y=-fillet+fillet*Math.sin(t);
                return vertex(r,y,angle,new T.Vector3(Math.cos(t)*Math.cos(angle),-Math.sin(t),Math.cos(t)*Math.sin(angle)));
            };
            for(let segment=0;segment<6;segment++) {
                const t=segment*Math.PI/12,u=(segment+1)*Math.PI/12;
                const p=neck(a,t),q=neck(b,t),r=neck(b,u),s=neck(a,u);
                triangle(p,q,r);triangle(p,r,s);
            }
            const wa=top(ra,a),wb=top(rb,b);wa.n=na.clone().negate();wb.n=nb.clone().negate();
            const fa=vertex(ra*.75,socketFloor,a,wa.n),fb=vertex(rb*.75,socketFloor,b,wb.n);
            triangle(wa,fa,fb);triangle(wa,fb,wb);
            triangle(vertex(0,socketFloor,0,up),vertex(ra*.75,socketFloor,a,up),vertex(rb*.75,socketFloor,b,up));
        }
        const head = new T.BufferGeometry();
        head.setAttribute('position',new T.Float32BufferAttribute(hp,3));
        head.setAttribute('normal',new T.Float32BufferAttribute(hn,3));
        head.setAttribute('uv',new T.Float32BufferAttribute(hu,2));
        head.addGroup(0,hp.length/3,0);
        const shaft = new T.CylinderBufferGeometry(diameter / 2, diameter / 2, length, 32);
        shaft.translate(0, -length / 2, 0);
        const positions = [], normals = [], uvs = [], indices = [], faces = [];
        [shaft, head].forEach(shape => {
            const offset = positions.length / 3, first = indices.length / 3;
            positions.push(...shape.attributes.position.array); normals.push(...shape.attributes.normal.array); uvs.push(...shape.attributes.uv.array);
            if (shape.index) for (const index of shape.index.array) indices.push(index + offset);
            else for (let i = 0; i < shape.attributes.position.count; i++) indices.push(i + offset);
            shape.groups.forEach(group => faces.push({ first: first + group.start / 3, last: first + (group.start + group.count) / 3 - 1, materialIndex: 0, sourceNode: 0 }));
            shape.dispose();
        });
        return { source: { name: component.name }, size: [radius * 2, length + headHeight, radius * 2], data: {
            positions: new Float32Array(positions), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: new Uint32Array(indices), faces,
            nodes: [{ id: 0, name: component.name, group: 0 }], materials: [{ color: config.color || '#aab0b7', roughness: .3, metalness: .8 }]
        } };
    }

    function primitive(T, component) {
        const config = component.primitive || {}, size = config.size || [.06, .03, .06];
        if (config.type === 'screw') return screw(T, component);
        const shape = config.type === 'cylinder'
            ? new T.CylinderBufferGeometry(size[0] / 2, size[2] / 2, size[1], 32)
            : new T.BoxBufferGeometry(size[0], size[1], size[2]);
        const data = {
            positions: shape.attributes.position.array.slice(), normals: shape.attributes.normal.array.slice(),
            uvs: shape.attributes.uv.array.slice(), indices: shape.index.array.slice(),
            faces: shape.groups.map(group => ({ first: group.start / 3, last: (group.start + group.count) / 3 - 1, materialIndex: 0 })),
            materials: [{ color: config.color || '#718391', roughness: .72, metalness: .04 }]
        };
        shape.dispose();
        return { source: { name: component.name }, size: size.slice(), data };
    }

    // Content-addressed compiled assets are immutable and reusable across model reloads.
    const compiledAssets = new Map();
    async function readCompiled(url, cache = compiledAssets) {
        const immutable = /[a-f0-9]{64}\.ptmesh(?:[?#]|$)/i.test(url);
        if (immutable && cache.has(url)) return cache.get(url);
        const pending = (async () => {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            let timer;
            try {
                return await Promise.race([(async () => {
                    const response = await fetch(url, { cache: immutable ? 'force-cache' : 'no-cache', ...(controller ? { signal: controller.signal } : {}) });
                    if (!response.ok) throw new Error('Prepared model is unavailable');
                    return root.PreparedModel.decode(await response.arrayBuffer());
                })(), new Promise((_, reject) => { timer = setTimeout(() => { if (controller) controller.abort(); reject(new Error('Prepared model read timed out')); }, 15000); })]);
            } finally { clearTimeout(timer); }
        })();
        if (immutable) {
            cache.set(url, pending);
            // Bound retained source models; renderer geometry remains independently owned.
            if (cache === compiledAssets) while (cache.size > 3) cache.delete(cache.keys().next().value);
        }
        try { return await pending; } catch (error) { if (cache.get(url) === pending) cache.delete(url); throw error; }
    }
    async function load(T, manifest, options) {
        options = options || {};
        const product = new T.Group();
        product.name = manifest.name || 'Product';
        const meshes = new Map(), prepared = new Map(), baseline = new Map(), links = new Map();
        const jointStates = new Map(), sensors = new Map(), controllers = [], displayControllers = new Map(), boardDisplays = new Map(), ledOutputs = [], ownedTextures = new Set();
        const joints = manifest.joints || [], devices = manifest.devices || [], connections = manifest.connections || [];
        const jointById = new Map(joints.map(joint => [joint.id, joint]));
        let disposed = false, motorValues = [0, 0, 0, 0];
        const resolveAsset = options.resolveAsset || (file => new URL(file, options.baseUrl || document.baseURI).href);
        const assetLoads = new Map();
        async function readAsset(component) {
            if (component.primitive) return primitive(T, component);
            if (component.preparedAsset && root.PreparedModel) {
                try {
                    return await readCompiled(resolveAsset(component.preparedAsset), options.compiledAssetCache);
                } catch (_) { /* A missing/old cache can always fall back to the source. */ }
            }
            const response = await fetch(resolveAsset(component.asset), { cache: 'no-cache' });
            if (!response.ok) throw new Error('Could not load product component: ' + component.name);
            if (component.format === 'geometry') {
                const value = await response.json();
                return value.data ? value : { source: { name: component.name }, data: value };
            }
            const buffer = await response.arrayBuffer();
            return root.AssemblyGlb.read(T, { name: component.name + '.glb', size: buffer.byteLength, arrayBuffer: async () => buffer });
        }
        async function defaultAsset(component) {
            const key = resolveAsset(component.asset) + '|' + (component.preparedAsset || '');
            if (!assetLoads.has(key)) assetLoads.set(key, readAsset(component));
            try { return await assetLoads.get(key); } catch (error) { assetLoads.delete(key); throw error; }
        }
        function dispose() {
            if (disposed) return;
            disposed = true;
            controllers.forEach(controller => controller.dispose());
            const geometries = new Set(), materialSet = new Set();
            product.traverse(object => {
                if (object.geometry) geometries.add(object.geometry);
                (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean).forEach(material => {
                    materialSet.add(material);
                    if (material.map && !material.userData.borrowedTexture) ownedTextures.add(material.map);
                });
            });
            geometries.forEach(item => item.dispose());
            materialSet.forEach(item => item.dispose());
            ownedTextures.forEach(item => item.dispose());
            if (product.parent) product.parent.remove(product);
        }
        try {
            // Sequential component creation limits peak memory for large CAD models.
            for (const component of manifest.components || []) {
                if (options.onProgress) { options.onProgress('Reading model: ' + component.name); await new Promise(resolve => setTimeout(resolve, 0)); }
                let value = component.primitive ? primitive(T, component) : await (options.loadAsset || defaultAsset)(component);
                if (!value || !value.data || !value.data.positions) throw new Error('Component has no readable geometry: ' + component.name);
                // Without a centring transform, extract small wheels/arms before
                // allocating geometry for the entire original assembly.
                const extracted = component.sourceNodes && !component.assetTransform;
                if (extracted) value = Object.assign({}, value, { data: subsetData(value.data, component.sourceNodes) });
                let shape = geometry(T, value.data);
                // Imported assets are centred once by their importer. Units belong to
                // geometry; authored coordinates and artwork remain in metres.
                const assetTransform = component.assetTransform;
                if (assetTransform) {
                    const rotation = assetTransform.rotation || [0, 0, 0], scale = assetTransform.scale || [1, 1, 1];
                    const unitScale = assetTransform.unit === 'millimeter' ? .001 : 1;
                    shape.applyMatrix4(new T.Matrix4().compose(new T.Vector3(), new T.Quaternion().setFromEuler(new T.Euler(...rotation.map(value => value * radians))), new T.Vector3(...scale.map(value => value * unitScale))));
                    shape.center();
                }
                const units = component.unit === 'millimeter' ? .001 : 1;
                if (units !== 1) shape.scale(units, units, units);
                if (component.sourceNodes && !extracted) {
                    // Transform in the original GLB frame before extracting.
                    // Each group keeps its authored location, rather than
                    // centring every wheel/arm independently after splitting.
                    const data = subsetData(Object.assign({}, value.data, { positions: shape.attributes.position.array, normals: shape.attributes.normal.array }), component.sourceNodes);
                    shape.dispose(); shape = geometry(T, data); value = Object.assign({}, value, { data });
                }
                prepared.set(component.id, value);
                // This sensor's outer, clear emitter is CAD node 8 (faces 45-48).
                // Keep the inner receiver and all sensing/physics data unchanged.
                let visualComponent=component;
                if(manifest.id==='analog_sensor_1_ch_buildbot'||/(?:^|\/)8b4b9662cae11fcef7cb6a91236d22d93d355e04564245156abbd67d01888009\.ptmesh$/.test(component.preparedAsset||'')){
                    const appearance=component.appearance||{},overrides=new Map((appearance.surfaces||[]).map(s=>[s.index,s]));
                    value.data.faces.forEach((face,index)=>{
                        if(face.sourceNode===8)overrides.set(index,{...overrides.get(index),index,color:'#003cff',unlit:true,roughness:.5,metalness:0,clearcoat:0});
                    });
                    visualComponent={...component,appearance:{...appearance,surfaces:[...overrides.values()]}};
                }
                const mesh = new T.Mesh(shape, materials(T, shape, value.data, visualComponent));
                shape.userData.productNodes = value.data.nodes;
                if(visualComponent!==component)mesh.userData.sensorTipLight={position:[.0000265,-.00649,-.0087925],direction:[0,-1,0]};
                mesh.name = component.name || component.id;
                mesh.userData.componentId = component.id;
                mesh.position.fromArray(component.position || [0, 0, 0]);
                const rotation = component.rotation || [0, 0, 0];
                mesh.rotation.set(rotation[0] * radians, rotation[1] * radians, rotation[2] * radians);
                mesh.scale.fromArray(component.scale || [1, 1, 1]);
                mesh.castShadow = true; mesh.receiveShadow = true;
                mesh.updateMatrix(); baseline.set(component.id, mesh.matrix.clone());
                product.add(mesh); meshes.set(component.id, mesh);
                if (!options.authoring && component.boardDefinition && root.AtomVxModel && typeof document !== 'undefined') {
                    const definition = root.ProductSchema && root.ProductSchema.syncLegacyDefinition ? root.ProductSchema.syncLegacyDefinition(component, devices) : component.boardDefinition;
                    const controller = root.AtomVxModel.attachSimulation(T, mesh, { definition, skipArtwork: true });
                    controllers.push(controller); boardDisplays.set(component.id, controller);
                    devices.filter(device => device.type === 'display' && device.componentId === component.id).forEach(device => displayControllers.set(device.id, controller));
                }
            }
            if (!options.authoring) devices.forEach(device => {
                const mesh = meshes.get(device.componentId);
                if (!mesh) return;
                if (device.legacyOverlay) return;
                if (device.type === 'display' && root.AtomVxModel && typeof document !== 'undefined') {
                    const component = manifest.components.find(item => item.id === device.componentId);
                    if (component.boardDefinition && component.boardDefinition.simulation && component.boardDefinition.simulation.display) return;
                    const controller = root.AtomVxModel.attachSimulation(T, mesh, { skipArtwork: true, definition: { simulation: { display: Object.assign({ size: [.04, .032], resolution: [160, 128] }, device), motorLeds: [] } } });
                    controllers.push(controller); displayControllers.set(device.id, controller);
                } else if (device.type === 'led') {
                    const size = device.size || [.0015, .0015];
                    const material = new T.MeshBasicMaterial({ color: device.offColor || '#15191b', side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
                    material.toneMapped = false;
                    const light = new T.Mesh(new T.PlaneBufferGeometry(size[0], size[1]), material);
                    light.position.fromArray(device.position || [0, 0, 0]);
                    light.rotation.set(...(device.rotation || [0, 0, 0]).map(value => value * radians));
                    light.userData.productDeviceId = device.id;
                    mesh.add(light); ledOutputs.push({ device, material });
                }
            });
            const wouldCycle = (child, parent) => {
                const seen = new Set([child]);
                while (parent) { if (seen.has(parent)) return true; seen.add(parent); parent = links.has(parent) ? links.get(parent).parent : null; }
                return false;
            };
            joints.forEach(joint => {
                jointStates.set(joint.id, finite(joint.home, 0));
                if (!meshes.has(joint.parent) || !meshes.has(joint.child)) throw new Error('Joint references a missing component: ' + joint.name);
                if (links.has(joint.child) || wouldCycle(joint.child, joint.parent)) throw new Error('Joint hierarchy contains a cycle or multiple parents: ' + joint.name);
                links.set(joint.child, { parent: joint.parent, joint });
            });
            // Static mate neighbours follow a moving component, even when they do
            // not have their own actuator. A motion joint takes precedence.
            const adjacency = new Map();
            (manifest.mates || []).forEach(mate => {
                const a = typeof mate.a === 'object' ? mate.a.componentId : mate.a;
                const b = typeof mate.b === 'object' ? mate.b.componentId : mate.b;
                if (!meshes.has(a) || !meshes.has(b) || joints.some(joint => joint.parent === a && joint.child === b || joint.parent === b && joint.child === a)) return;
                if (!adjacency.has(a)) adjacency.set(a, []);
                if (!adjacency.has(b)) adjacency.set(b, []);
                adjacency.get(a).push(b); adjacency.get(b).push(a);
            });
            const visited = new Set();
            [...joints.map(joint => joint.child), ...meshes.keys()].forEach(start => {
                const queue = [start];
                while (queue.length) {
                    const parent = queue.shift();
                    if (visited.has(parent)) continue;
                    visited.add(parent);
                    (adjacency.get(parent) || []).forEach(child => {
                        if (visited.has(child) || links.has(child) || wouldCycle(child, parent)) return;
                        links.set(child, { parent, joint: null }); queue.push(child);
                    });
                }
            });
            if (options.onGeometryReady) options.onGeometryReady({ root: product, meshes, prepared });
            for (const entry of manifest.artwork || []) {
                const mesh = meshes.get(entry.componentId);
                if (!mesh || entry.visible === false || !entry.file) continue;
                if (options.onProgress) options.onProgress('Reading texture: ' + (entry.name || entry.file));
                let texture;
                if (options.loadTexture) texture = await options.loadTexture(entry);
                else {
                    const textureUrl=root.IDEOfflineData?await root.IDEOfflineData.imageURL(resolveAsset(entry.file)):resolveAsset(entry.file);
                    try { texture = await new Promise((resolve,reject)=>{
                        let done=false;
                        const timer=setTimeout(()=>{done=true;reject(new Error('Texture read timed out: '+entry.file));},15000);
                        new T.TextureLoader().load(textureUrl,value=>{if(done){value.dispose();return;}done=true;clearTimeout(timer);resolve(value);},undefined,error=>{if(done)return;done=true;clearTimeout(timer);reject(error);});
                    }); } finally { if(textureUrl.startsWith('blob:'))URL.revokeObjectURL(textureUrl); }
                }
                if (!texture) continue;
                if (!options.loadTexture) ownedTextures.add(texture);
                if (T.sRGBEncoding !== undefined) texture.encoding = T.sRGBEncoding;
                texture.needsUpdate = true;
                const overlay = root.ProductArtwork && root.ProductArtwork.create(T, mesh, entry, texture);
                if (overlay) { overlay.material.userData.borrowedTexture = !!options.loadTexture; mesh.add(overlay); }
            }
        } catch (error) { dispose(); throw error; }

        let physicsDriven = false;
        const physicsCommands = new Map();
        function servoCommand(device) {
            return {type:'servo',angle:finite(jointStates.get(device.jointId),finite(jointById.get(device.jointId).home,0))*radians,
                maxSpeed:Math.max(1,finite(device.maxSpeed,360))*radians,
                maxAcceleration:Math.max(1,finite(device.maxAcceleration,360))*radians};
        }
        function holdServos() {
            devices.forEach(device => {
                if(device.type==='servo' && jointById.has(device.jointId)) physicsCommands.set(device.jointId,servoCommand(device));
            });
        }
        holdServos();
        function applyPose() {
            if (physicsDriven) return;
            const solved = new Map();
            function solve(id) {
                if (solved.has(id)) return solved.get(id);
                const link = links.get(id);
                const matrix = baseline.get(id).clone();
                if (link) {
                    const relative = inverse(baseline.get(link.parent)).multiply(matrix);
                    const joint = link.joint;
                    const motion = new T.Matrix4();
                    if (joint && joint.type !== 'fixed') {
                        const point = new T.Vector3().fromArray(joint.position || [0, 0, 0]);
                        const axis = new T.Vector3().fromArray(joint.axis || [0, 1, 0]).normalize();
                        const angle = (jointStates.get(joint.id) - finite(joint.home, 0)) * radians;
                        motion.makeTranslation(point.x, point.y, point.z);
                        motion.multiply(new T.Matrix4().makeRotationAxis(axis, angle));
                        motion.multiply(new T.Matrix4().makeTranslation(-point.x, -point.y, -point.z));
                    }
                    matrix.copy(solve(link.parent)).multiply(motion).multiply(relative);
                }
                solved.set(id, matrix);
                return matrix;
            }
            meshes.forEach((mesh, id) => solve(id).decompose(mesh.position, mesh.quaternion, mesh.scale));
            product.updateMatrixWorld(true);
        }
        function setJoint(id, angle, defer) {
            const joint = jointById.get(id);
            if (!joint || joint.type === 'fixed') return false;
            angle = finite(angle, finite(joint.home, 0));
            if (joint.type === 'revolute') angle = clamp(angle, finite(joint.lower, -180), finite(joint.upper, 180));
            jointStates.set(id, angle);
            joints.filter(follower => follower.mimic && follower.mimic.jointId === id).forEach(follower =>
                setJoint(follower.id, angle * follower.mimic.multiplier + (follower.mimic.offset || 0), true));
            if (!defer) applyPose();
            return angle;
        }
        const ports = new Map(connections.map(connection => [connection.deviceId, connection.port]));
        function outputFor(device, outputs) {
            const direct = outputs.devices || {};
            if (direct[device.id] !== undefined) return finite(direct[device.id], 0);
            if (options.deviceOutputsOnly && !device.legacyOverlay) return undefined;
            const values = device.type === 'servo' ? outputs.servos || {} : device.type === 'led' ? outputs.leds || {} : outputs.motors || motorValues;
            const port = ports.get(device.id) || device.name;
            if (Array.isArray(values)) {
                const match = /^M(\d+)$/i.exec(port);
                return match ? finite(values[Number(match[1]) - 1], 0) : 0;
            }
            return values[port] !== undefined ? finite(values[port], 0) : undefined;
        }
        const drive = { enabled: false, left: 0, right: 0, trackWidth: .15, wheelRadius: .0325, forwardAngle: 0 };
        const rollingSigns = new Map();
        function physicsWheels() {
            product.updateMatrixWorld(true);
            return driveDevices.map(device => {
                const joint = joints.find(item => item.id === device.jointId), parent = joint && meshes.get(joint.parent);
                if (!parent) return null;
                const center=parent.localToWorld(new T.Vector3().fromArray(joint.position));
                const axis=new T.Vector3().fromArray(joint.axis).transformDirection(parent.matrixWorld);
                const wheel=meshes.get(joint.child), positions=wheel && wheel.geometry && wheel.geometry.attributes.position;
                let radius=0;
                if (positions) {
                    const point=new T.Vector3();
                    for(let i=0;i<positions.count;i++) {
                        point.fromBufferAttribute(positions,i).applyMatrix4(wheel.matrixWorld).sub(center);
                        point.addScaledVector(axis,-point.dot(axis)); radius=Math.max(radius,point.length());
                    }
                }
                return {side:device.driveSide,radius:radius>1e-6?radius:finite(device.wheelRadius,.0325),position:center.toArray()};
            }).filter(Boolean);
        }
        const driveDevices = devices.filter(device => device.type === 'motor' && device.jointId && ['left', 'right'].includes(device.driveSide));
        const leftDevices = driveDevices.filter(device => device.driveSide === 'left'), rightDevices = driveDevices.filter(device => device.driveSide === 'right');
        drive.enabled = !!(leftDevices.length && rightDevices.length);
        if (drive.enabled) {
            const axlePosition = device => {
                const joint = joints.find(item => item.id === device.jointId), parent = joint && meshes.get(joint.parent);
                if (parent) { parent.updateMatrix(); return new T.Vector3().fromArray(joint.position).applyMatrix4(parent.matrix); }
                return meshes.get(device.componentId).position.clone();
            };
            const mean = list => list.reduce((sum, device) => sum.add(axlePosition(device)),new T.Vector3()).divideScalar(list.length);
            const across = mean(rightDevices).sub(mean(leftDevices)); across.y = 0;
            drive.trackWidth = Math.max(.02, across.length());
            if (across.lengthSq() < 1e-12) across.set(1,0,0); else across.normalize();
            // Use the robot's left/right roles, not the viewer's screen axes.
            const forward = new T.Vector3(0,1,0).cross(across);
            drive.forwardAngle = Math.atan2(forward.x,forward.z);
            driveDevices.forEach(device => {
                const joint = joints.find(item => item.id === device.jointId), parent = joint && meshes.get(joint.parent);
                const axis = parent ? new T.Vector3().fromArray(joint.axis).transformDirection(parent.matrix) : across;
                rollingSigns.set(device.id, axis.dot(across) < 0 ? 1 : -1);
            });
            drive.wheelRadius = driveDevices.reduce((sum, device) => sum + finite(device.wheelRadius, .0325), 0) / driveDevices.length;
        }
        function sampleSensors(environment) {
            environment = environment || {};
            if(disposed)return sensors;
            devices.forEach(device => {
                const mesh = meshes.get(device.componentId);
                if (!mesh || !['line-sensor', 'distance-sensor'].includes(device.type)) return;
                if(environment.sampleSensors===false)return;
                if(environment.sensorKind&&environment.sensorKind!==(device.type==='line-sensor'?'analog':'distance'))return;
                const matrix=environment.sensorMatrixWorld&&device.type==='line-sensor'?environment.sensorMatrixWorld(mesh):mesh.matrixWorld;
                if(!matrix)throw new Error('No physics pose is available for sensor '+(device.name||device.id)+'.');
                const position = new T.Vector3().fromArray(device.position || [0, 0, 0]).applyMatrix4(matrix);
                const rotation = device.rotation || [0, 0, 0];
                const direction = new T.Vector3(0, 0, -1).applyEuler(new T.Euler(...rotation.map(value => value * radians))).transformDirection(matrix);
                const range = Math.max(.001, finite(device.range, device.type === 'line-sensor' ? .1 : 2));
                let sample;
                if (device.type === 'line-sensor') {
                    const distance = Math.abs(direction.y) > 1e-8 ? (finite(environment.floorY, 0) - position.y) / direction.y : -1;
                    const hit = position.clone().addScaledVector(direction, Math.max(0, distance));
                    sample = distance >= 0 && distance <= range ? lineReflectance(environment, hit, device, distance, direction) : 1;
                    // Fade contrast near the maximum range rather than
                    // switching from black straight to white at the boundary.
                    if (distance >= 0 && distance <= range) {
                        const fade = clamp((distance / range - .8) / .2, 0, 1);
                        sample += (1 - sample) * fade * fade * (3 - 2 * fade);
                    }
                    if (distance >= 0 && distance <= range) {
                        const amplitude = clamp(finite(device.noise, .003), 0, .1);
                        const random = options.random || Math.random;
                        // Bounded, zero-centred triangular noise: usually near
                        // zero, at most 0.3% full scale with the default setting.
                        if (amplitude) sample = clamp(sample + (random() + random() - 1) * amplitude, 0, 1);
                    }
                } else {
                    const ray = new T.Raycaster(position, direction, .00001, range);
                    const hits = ray.intersectObjects(environment.obstacles || [], true).filter(hit => !product.getObjectById(hit.object.id));
                    sample = hits.length ? hits[0].distance : range;
                }
                sensors.set(device.id, sample);
            });
            return sensors;
        }
        function update(dt, outputs, environment) {
            if (disposed) return sensors;
            outputs = Array.isArray(outputs) ? { motors: outputs } : outputs || {};
            environment = environment || {};
            dt = clamp(finite(dt, 0), 0, .1);
            const speeds = new Map();
            devices.forEach(device => {
                const value = outputFor(device, outputs);
                if (device.type === 'motor') {
                    const speed = motorVelocity(device, value);
                    if (device.jointId) physicsCommands.set(device.jointId,{type:'motor',velocity:speed*radians,
                        maxSpeed:Math.max(0,finite(device.maxSpeed,360))*radians,
                        calibratedNoLoad:!!device.speedCalibration,
                        // Unless explicitly authored, let torque and inertia
                        // set acceleration instead of a slow software ramp.
                        maxAcceleration:Math.max(0,finite(device.maxAcceleration,0))*radians});
                    if (device.jointId) setJoint(device.jointId, finite(jointStates.get(device.jointId), 0) + speed * dt, true);
                    speeds.set(device.id, speed * radians * finite(device.wheelRadius, .0325) * (rollingSigns.get(device.id) || 1));
                } else if (device.type === 'servo' && jointById.has(device.jointId)) {
                    if(value!==undefined)setJoint(device.jointId, device.invert ? -value : value, true);
                    physicsCommands.set(device.jointId,servoCommand(device));
                }
            });
            applyPose();
            const averageSpeed = list => list.length ? list.reduce((sum, device) => sum + (speeds.get(device.id) || 0), 0) / list.length : 0;
            drive.left = averageSpeed(leftDevices); drive.right = averageSpeed(rightDevices);
            ledOutputs.forEach(({ device, material }) => {
                const source = device.sourceDeviceId && devices.find(item => item.id === device.sourceDeviceId);
                const value = finite(outputFor(source || device, outputs), 0);
                material.color.set(value ? value > 0 ? device.forwardColor || device.color || '#00ff00' : device.reverseColor || '#ff0000' : device.offColor || '#15191b');
                if (value) material.color.multiplyScalar(.18 + clamp(Math.abs(value), 0, 100) / 100 * .82);
            });
            sampleSensors(environment);
            if (outputs.motors || outputs.devices) {
                const commanded = [0, 0, 0, 0];
                if (outputs.motors) commanded.forEach((_, index) => { commanded[index] = finite(Array.isArray(outputs.motors) ? outputs.motors[index] : outputs.motors['M' + (index + 1)], 0); });
                devices.filter(device => device.type === 'motor').forEach(device => {
                    const match = /^M([1-4])$/i.exec(ports.get(device.id) || device.name);
                    if (match) commanded[Number(match[1]) - 1] = finite(outputFor(device, outputs), 0);
                });
                setMotors(commanded);
            }
            return sensors;
        }
        function readSensor(port, kind) {
            const normalized = String(port).replace(/\s+/g, '').toLowerCase();
            const device = devices.find(entry => sensors.has(entry.id) && [entry.id, entry.name, ports.get(entry.id)].some(value => String(value || '').replace(/\s+/g, '').toLowerCase() === normalized));
            if (!device) return undefined;
            const value = sensors.get(device.id);
            return kind === 'analog' ? Math.round(value * 4095) : kind === 'digital' ? Number(value >= .5) : value;
        }
        function driveTargets(left, right) {
            if (!drive.enabled) return null;
            const targets = [0, 0, 0, 0];
            driveDevices.forEach(device => {
                const match = /^M([1-4])$/i.exec(ports.get(device.id) || device.name);
                if (match) targets[Number(match[1]) - 1] = (device.driveSide === 'left' ? left : right) * (device.invert ? -1 : 1) * (rollingSigns.get(device.id) || 1);
            });
            return targets;
        }
        function setMotors(values) {
            motorValues = [0, 0, 0, 0].map((_, index) => finite(Array.isArray(values) ? values[index] : values && values['M' + (index + 1)], 0));
            controllers.forEach(controller => controller.setMotors(motorValues));
        }
        function applyDisplay(command, target) {
            // Preview/reset keep the original broadcast API. IDE routing can
            // address one authored screen or only a legacy board's own screen.
            if (target === undefined) { controllers.forEach(controller => controller.applyDisplay(command)); return; }
            const controller = target && typeof target === 'object' ? boardDisplays.get(target.componentId) : displayControllers.get(target);
            if (controller) controller.applyDisplay(command);
        }
        function getDisplayCanvas(target) {
            if(target&&target.componentId){
                const controller=boardDisplays.get(target.componentId)||devices.filter(device=>device.type==='display'&&device.componentId===target.componentId).map(device=>displayControllers.get(device.id)).find(Boolean);
                return controller&&controller.canvas||null;
            }
            const controller=controllers.find(controller=>controller.canvas);
            return controller&&controller.canvas||null;
        }
        function reset() {
            joints.forEach(joint => jointStates.set(joint.id, finite(joint.home, 0)));
            physicsCommands.clear();holdServos();
            setMotors([0, 0, 0, 0]); drive.left = 0; drive.right = 0;
            ledOutputs.forEach(led => led.material.color.set(led.device.offColor || '#15191b'));
            applyPose(); applyDisplay({ type: 'fill', color: '#000000' });
        }
        const componentPhysics = (manifest.components || []).map(component => ({ mass: Math.max(0, finite(component.physics && component.physics.mass, .1)), friction: Math.max(0, finite(component.physics && component.physics.friction, .6)) }));
        const mass = componentPhysics.reduce((sum, entry) => sum + entry.mass, 0);
        const physics = { mass, friction: mass ? componentPhysics.reduce((sum, entry) => sum + entry.mass * entry.friction, 0) / mass : .6 };
        return { root: product, meshes, prepared, jointStates, sensors, drive, physics, physicsWheels, getDisplayCanvas, physicsModel:()=>({manifest,meshes,root:product,commands:physicsCommands}), setPhysicsDriven(value){physicsDriven=!!value;}, hasLineSensors: devices.some(device => device.type === 'line-sensor'), setJoint, update, sampleSensors, reset, readSensor, driveTargets, setMotors, applyDisplay, dispose };
    }
    root.ProductRuntime = { load, primitive, applyAppearance, subsetData, connectedData, lineReflectance, motorVelocity };
    if (typeof module !== 'undefined') module.exports = root.ProductRuntime;
})(typeof window !== 'undefined' ? window : globalThis);
