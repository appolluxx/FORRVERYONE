(function (root) {
    'use strict';
    const script = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
    const registryUrl = script ? new URL('../products/index.json', script).href : 'products/index.json';
    const cache = new Map();
    const selectedCache = new Map();
    // Cache pixels, not a second flattened copy of every CAD model in Equipment.
    const previewVersion = 'studio-panhead-neck-20260915-v8';
    const previewLimit = 48;
    const previewPixels = new Map();
    let previewDatabase;
    function hashPreview(value) {
        let first = 2166136261, second = 5381;
        for (let i = 0; i < value.length; i++) { const code = value.charCodeAt(i); first = Math.imul(first ^ code, 16777619); second = Math.imul(second, 33) ^ code; }
        return (first >>> 0).toString(16) + '-' + (second >>> 0).toString(16) + '-' + value.length;
    }
    function rememberPreview(key, image) {
        previewPixels.delete(key); previewPixels.set(key, image);
        while (previewPixels.size > previewLimit) previewPixels.delete(previewPixels.keys().next().value);
    }
    function openPreviewDatabase() {
        if (!root.indexedDB) return Promise.resolve(null);
        if (!previewDatabase) previewDatabase = new Promise(resolve => {
            let request, settled = false;
            const finish = value => { if (!settled) { settled = true; clearTimeout(timeout); resolve(value); } else if (value) value.close(); };
            // A blocked browser database must never block a product preview.
            const timeout = setTimeout(() => finish(null), 1200);
            try { request = root.indexedDB.open('ptbot-equipment-previews', 1); }
            catch (_) { finish(null); return; }
            request.onupgradeneeded = () => { const database = request.result; if (!database.objectStoreNames.contains('images')) database.createObjectStore('images', { keyPath: 'key' }).createIndex('used', 'used'); };
            request.onsuccess = () => { const database = request.result; database.onversionchange = () => { database.close(); previewDatabase = undefined; }; finish(database); };
            request.onerror = request.onblocked = () => finish(null);
        });
        return previewDatabase;
    }
    async function storedPreview(key) {
        if (previewPixels.has(key)) { const value = previewPixels.get(key); rememberPreview(key, value); return value; }
        const database = await openPreviewDatabase();
        if (!database) return null;
        return new Promise(resolve => {
            let settled = false;
            const finish = value => { if (settled) return; settled = true; clearTimeout(timeout); if (value) rememberPreview(key, value); resolve(value); };
            const timeout = setTimeout(() => finish(null), 1200);
            try {
                const request = database.transaction('images', 'readonly').objectStore('images').get(key);
                request.onsuccess = () => finish(request.result && request.result.image);
                request.onerror = () => finish(null);
            } catch (_) { finish(null); }
        });
    }
    async function savePreview(key, image) {
        rememberPreview(key, image);
        const database = await openPreviewDatabase();
        if (!database) return;
        try {
            const transaction = database.transaction('images', 'readwrite'), images = transaction.objectStore('images');
            images.put({ key, image, used: Date.now() });
            const count = images.count();
            count.onsuccess = () => {
                let excess = count.result - previewLimit;
                if (excess <= 0) return;
                const oldest = images.index('used').openCursor();
                oldest.onsuccess = () => { const cursor = oldest.result; if (cursor && excess-- > 0) { cursor.delete(); cursor.continue(); } };
            };
            transaction.onerror = () => {}; // Storage quota never breaks Equipment.
        } catch (_) { /* Private browsing and storage quota use the bounded memory cache. */ }
    }
    async function localAssetRevision(assetUrl, baseUrl) {
        try {
            const url = new URL(assetUrl);
            if (typeof require !== 'function' || (url.protocol !== 'microblock:' && url.protocol !== 'file:')) return null;
            const fs = require('fs'), path = require('path');
            let directory, file;
            if (url.protocol === 'microblock:') {
                const remote = require('@electron/remote');
                if (!remote) return null;
                const shared = remote.getGlobal && remote.getGlobal('sharedObj');
                directory = shared && shared.rootPath || path.join(remote.app.getAppPath(), 'microBlock-IDE');
                const host = url.hostname && url.hostname !== '.' ? url.hostname : '';
                file = path.resolve(directory, path.posix.join(host, decodeURIComponent(url.pathname)).replace(/^\/+/, ''));
            } else {
                const fileURLToPath = require('url').fileURLToPath;
                directory = fileURLToPath(new URL('.', baseUrl)); file = fileURLToPath(url);
            }
            const relative = path.relative(path.resolve(directory), path.resolve(file));
            if (path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep)) return null;
            const stat = await fs.promises.stat(file);
            return stat.isFile() ? 'stat:' + stat.mtimeMs + ':' + stat.ctimeMs + ':' + stat.size : null;
        } catch (_) { return null; }
    }
    async function previewAssetRevision(manifest, baseUrl, revision) {
        if (revision) return String(revision);
        const files = new Set();
        (manifest.components || []).forEach(component => { if (component.preparedAsset || component.asset) files.add(component.preparedAsset || component.asset); });
        (manifest.artwork || []).forEach(artwork => { if (artwork.file) files.add(artwork.file); });
        // Content-addressed publication assets need no additional I/O. Legacy
        // mutable texture names are revalidated without downloading their bytes.
        const mutable = Array.from(files).filter(file => !/(?:^|\/)[a-f0-9]{64}\.[^/]+$/i.test(file));
        const values = await Promise.all(mutable.map(async file => {
            try {
                const url = new URL(file, baseUrl).href, local = await localAssetRevision(url, baseUrl);
                if (local) return file + '|' + local;
                const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
                if (!response.ok || !response.headers) return null;
                const etag = response.headers.get('etag'), modified = response.headers.get('last-modified'), length = response.headers.get('content-length');
                return etag || modified ? file + '|' + etag + '|' + modified + '|' + length : null;
            } catch (_) { return null; }
        }));
        return values.some(value => value === null) ? null : values.join('|');
    }
    async function loadSelected() {
        const active = (typeof boardId !== 'undefined' && boardId) || root.boardId || (root.localStorage && (root.localStorage.getItem('ptbot_selected_board_id') || root.localStorage.getItem('ptbot_last_board_id')));
        if (!active || active === 'atom-vx') return null;
        if (!selectedCache.has(active)) selectedCache.set(active, (async () => {
            const entry = (await list()).find(item => item.productId === active);
            if (!entry) return null;
            const response = await fetch(entry.manifestUrl, { cache: 'no-cache' });
            if (!response.ok) throw new Error('Could not load selected product: ' + active);
            return { manifest: root.ProductSchema.validate(await response.json()), baseUrl: new URL('.', entry.manifestUrl).href };
        })());
        try {
            const value = await selectedCache.get(active);
            return value ? { manifest: JSON.parse(JSON.stringify(value.manifest)), baseUrl: value.baseUrl } : null;
        } catch (error) { selectedCache.delete(active); throw error; }
    }
    async function list(url) {
        const indexUrl = url || registryUrl;
        const response = await fetch(indexUrl, { cache: 'no-cache' });
        if (response.status === 404) return [];
        if (!response.ok) throw new Error('Could not load published products (' + response.status + ').');
        const value = await response.json();
        const entries = Array.isArray(value) ? value : value.products;
        if (!Array.isArray(entries)) throw new Error('The published product catalog is invalid.');
        return entries.map(entry => ({
            id: 'product:' + entry.id, name: entry.name || entry.id, category: (typeof entry.category === 'string' && entry.category.trim()) || (entry.kind === 'robot' ? 'Robots' : entry.kind === 'board' ? 'Boards' : 'Company Components'),
            containsController: entry.containsController === true || ((entry.kind === 'board' || entry.kind === 'robot') && !!entry.controllerBoardId),
            type: 'product', productId: entry.id, manifestUrl: new URL(entry.manifest || entry.id + '/product.json', indexUrl).href,
            thumbnailUrl: entry.thumbnail ? new URL(entry.thumbnail, indexUrl).href : '', previewRevision: entry.previewRevision || ''
        }));
    }
    async function prepare(T, entry) {
        const key = entry.manifestUrl || JSON.stringify(entry.productManifest) + '|' + entry.productBaseUrl;
        if (!entry.forceReload && cache.has(key)) return cache.get(key);
        const pending = (async () => {
            let manifest = entry.productManifest;
            let baseUrl = entry.productBaseUrl;
            if (!manifest) {
                const response = await fetch(entry.manifestUrl, { cache: 'no-cache' });
                if (!response.ok) throw new Error('Could not load ' + entry.name + ' (' + response.status + ').');
                manifest = await response.json();
                baseUrl = new URL('.', entry.manifestUrl).href;
            }
            manifest = root.ProductSchema.validate(manifest);
            if (manifest.assemblyPrepared && manifest.assemblyPrepared.key === geometryKey(manifest) && root.PreparedModel) {
                let timer;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                try {
                    if (entry.onProgress) entry.onProgress('Loading prepared Assembly...');
                    const bytes = await Promise.race([
                        (async () => {
                            const response = await fetch(new URL(manifest.assemblyPrepared.file, baseUrl).href, { cache: 'force-cache', signal: controller ? controller.signal : undefined });
                            if (!response.ok) throw new Error('Prepared Assembly is unavailable');
                            return response.arrayBuffer();
                        })(),
                        new Promise((_, reject) => { timer = setTimeout(() => { if (controller) controller.abort(); reject(new Error('Prepared Assembly timed out')); }, 15000); })
                    ]);
                    const prepared = root.PreparedModel.decode(bytes);
                    if (prepared.data.productGeometryKey !== geometryKey(manifest)) throw new Error('Prepared Assembly is outdated');
                    (prepared.data.textures || []).forEach(texture => { if (texture.file) texture.file = new URL(texture.file, baseUrl).href; });
                    return { prepared, manifest, baseUrl };
                } catch (_) { /* Editable/older products still use the normal loader. */ }
                finally { clearTimeout(timer); }
            }
            const model = await root.ProductRuntime.load(T, manifest, { authoring: true, baseUrl, onProgress: entry.onProgress });
            try {
                if (entry.onProgress) { entry.onProgress('Preparing surfaces...'); await new Promise(resolve => setTimeout(resolve, 0)); }
                const prepared = root.AssemblyGlb.prepare(T, model.root, manifest.name, { preserveSurfaces: true });
                if (!prepared) throw new Error(manifest.name + ' has no visible components.');
                prepared.data.productOrigin = prepared.boundsCenter.slice();
                prepared.data.productGeometryKey = geometryKey(manifest);
                return { prepared, manifest, baseUrl };
            } finally { model.dispose(); }
        })();
        if (!entry.forceReload) cache.set(key, pending);
        try { return await pending; } catch (error) { cache.delete(key); throw error; }
    }
    async function resizeScrew(T, part, lengthMm) {
        if (!Number.isFinite(lengthMm) || lengthMm < 2 || lengthMm > 60) throw new Error('Length must be 2 to 60 mm.');
        const manifest = JSON.parse(JSON.stringify(part.productManifest));
        const screw = manifest.components.find(c => c.primitive && c.primitive.type === 'screw');
        if (!screw || manifest.components.length !== 1) throw new Error('Select a configurable screw.');
        const diameter = screw.primitive.size[0], length = lengthMm / 1000;
        screw.primitive.size[1] = length;
        screw.physics.mass = Math.PI * (diameter * diameter / 4 * length + (diameter * .98) ** 2 * diameter * .55) * 7850;
        return prepare(T, { productManifest: manifest, productBaseUrl: part.productBaseUrl });
    }

    function applyInstanceOverrides(next, current) {
        if (!next || !current || (next.id && current.id && next.id !== current.id)) return next;
        // Calibration belongs to one saved instance. Catalog and selected-board
        // refreshes share this whitelist and cannot carry calibration onto a
        // replaced device/joint or mutate the published defaults.
        function retain(key, field, references, limits, accepts, nested) {
            (next[key] || []).forEach(target => {
                const previous = (current[key] || []).find(item => item.id === target.id && (key === 'components' || item.type === target.type) &&
                    references.every(reference => item[reference] === target[reference]));
                if (!previous || !accepts(target)) return;
                const source = previous[field];
                if (!source || typeof source !== 'object' || Array.isArray(source)) return;
                const retained = {};
                Object.keys(limits).forEach(name => {
                    const value = source[name];
                    if (Number.isFinite(value) && (limits[name] ? value > 0 : value >= 0)) retained[name] = value;
                });
                if (!Object.keys(retained).length) return;
                target[field] = retained;
                const settings = nested ? (target[nested] || (target[nested] = {})) : target;
                Object.keys(retained).forEach(name => { settings[name] = retained[name]; });
            });
        }
        retain('components', 'physicsOverrides', [], { mass: false, friction: false, lateralFriction: false, contactStiffness: true }, () => true, 'physics');
        retain('devices', 'runtimeOverrides', ['componentId', 'jointId'], { maxSpeed: true }, device => device.type === 'motor');
        retain('joints', 'physicsOverrides', ['parent', 'child'], { maxTorque: true, gearboxFrictionTorque: false }, joint => joint.type !== 'fixed');
        return next;
    }

    async function refreshConfiguration(part, entry, refreshes) {
        if (!part.productManifest || !entry || entry.productId !== part.productManifest.id) return false;
        const read = async () => {
            const response = await fetch(entry.manifestUrl, { cache: 'no-cache' });
            if (!response.ok) throw new Error('Could not refresh ' + entry.name + ' (' + response.status + ').');
            return root.ProductSchema.validate(await response.json());
        };
        if (refreshes && !refreshes.has(entry.manifestUrl)) refreshes.set(entry.manifestUrl, read());
        const latest = await (refreshes ? refreshes.get(entry.manifestUrl) : read()), current = part.productManifest;
        // Preserve instance geometry and poses; changing the component layout
        // requires an explicit replacement, not a configuration refresh.
        if (JSON.stringify(current.components.map(c => c.id).sort()) !== JSON.stringify(latest.components.map(c => c.id).sort())) return false;
        const next = JSON.parse(JSON.stringify(current)); next.kind = latest.kind;
        next.components.forEach(component => {
            const source = latest.components.find(item => item.id === component.id);
            ['kind', 'boardRole', 'ports', 'connectors', 'mounts', 'physics'].forEach(key => {
                if (key === 'physics' && component.primitive && component.primitive.type === 'screw') return;
                if (source[key] === undefined) delete component[key];
                else component[key] = JSON.parse(JSON.stringify(source[key]));
            });
        });
        ['devices', 'joints', 'connections'].forEach(key => { next[key] = JSON.parse(JSON.stringify(latest[key] || [])); });
        applyInstanceOverrides(next, current);
        if (latest.boardLinks) next.boardLinks = JSON.parse(JSON.stringify(latest.boardLinks));
        else delete next.boardLinks;
        if (latest.assemblyPrepared) next.assemblyPrepared = JSON.parse(JSON.stringify(latest.assemblyPrepared));
        else delete next.assemblyPrepared;
        if (JSON.stringify(next) === JSON.stringify(current)) return false;
        part.productManifest = next; return true;
    }
    function geometryKey(manifest) {
        // A selected-product cache name is reused across projects and publishes.
        // It is not proof that its baked component transforms are still current.
        const version = (manifest.components || []).some(c => c.primitive && c.primitive.type === 'screw') ? 'assembled-screw-panhead-v4-' : 'assembled-product-v1-';
        const normalized = root.ProductSchema.normalize(manifest);
        delete normalized.assemblyPrepared;
        return version + hashPreview(JSON.stringify(normalized));
    }
    function matchesPrepared(part, data) {
        return !!(part && part.productManifest && data && Array.isArray(data.productOrigin) && data.productOrigin.length === 3 &&
            data.productOrigin.every(Number.isFinite) && data.productGeometryKey === geometryKey(part.productManifest));
    }
    function hasController(part) {
        return !!(part && part.productManifest && Array.isArray(part.productManifest.components) && part.productManifest.components.some(component => component.kind === 'board' && (!component.boardRole || component.boardRole === 'main')));
    }
    function applyFaceColor(part, preparedData, key, color) {
        const match = /^brep-(\d+)$/.exec(key);
        const face = match && preparedData && preparedData.faces && preparedData.faces[Number(match[1])];
        if (!face || !face.componentId || !part.productManifest) return false;
        const component = part.productManifest.components.find(item => item.id === face.componentId);
        if (!component) return false;
        component.appearance = component.appearance || {};
        component.appearance.surfaces = (component.appearance.surfaces || []).filter(entry => entry.index !== face.surfaceIndex);
        component.appearance.surfaces.push({ index: face.surfaceIndex, color });
        return true;
    }
    function thumbnail(T, prepared, renderer) {
        const data = prepared.data, geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(data.positions, 3));
        geometry.setAttribute('normal', new T.Float32BufferAttribute(data.normals, 3));
        if (data.uvs) geometry.setAttribute('uv', new T.Float32BufferAttribute(data.uvs, 2));
        geometry.setIndex(new T.BufferAttribute(new Uint32Array(data.indices), 1));
        let previous;
        data.faces.forEach(face => {
            const start = face.first * 3, count = (face.last - face.first + 1) * 3, materialIndex = face.materialIndex || 0;
            if (previous && previous.materialIndex === materialIndex && previous.start + previous.count === start) previous.count += count;
            else { geometry.addGroup(start, count, materialIndex); previous = geometry.groups[geometry.groups.length - 1]; }
        });
        const materials = root.AssemblyGlb.createMaterials(T, data);
        const mesh = new T.Mesh(geometry, materials);
        const scene = new T.Scene();
        scene.add(mesh);
        const viewport = root.ProductViewportStyle.create(T, renderer, scene); viewport.apply(mesh);
        const camera = new T.PerspectiveCamera(36, 1.5, .001, 100);
        const radius = Math.max(...prepared.size) * 2.6;
        camera.position.set(radius, radius * .7, radius); camera.lookAt(0, 0, 0);
        try { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); }
        finally {
            viewport.dispose();
            geometry.dispose();
            const textures = new Set(); materials.forEach(material => { if (material.map) textures.add(material.map); material.dispose(); }); textures.forEach(texture => texture.dispose());
        }
    }
    function createPreviewer(T, options) {
        options = options || {};
        const width = options.width || 180, height = options.height || 120;
        let renderer, scene, viewport, camera, disposed = false, tail = Promise.resolve();
        const pending = new Map();
        function ensureStudio() {
            if (disposed) throw new Error('Equipment preview closed.');
            if (renderer) return;
            renderer = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
            renderer.setPixelRatio(1); renderer.setSize(width, height, false);
            scene = new T.Scene(); viewport = root.ProductViewportStyle.create(T, renderer, scene, { edgeStrength: .28 });
            camera = new T.PerspectiveCamera(36, width / height, .001, 100);
        }
        function draw(group) {
            ensureStudio();
            scene.add(group); group.updateMatrixWorld(true);
            try {
                const box = new T.Box3().setFromObject(group);
                if (box.isEmpty()) throw new Error('Product has no visible geometry.');
                const center = box.getCenter(new T.Vector3()), sphere = box.getBoundingSphere(new T.Sphere());
                const direction = new T.Vector3(1, .7, 1).normalize(), right = new T.Vector3(direction.z, 0, -direction.x).normalize(), up = new T.Vector3().crossVectors(direction, right);
                const tangent = Math.tan(camera.fov * Math.PI / 360), radius = Math.max(sphere.radius, .0001);
                let distance = radius;
                // Fit projected corners, including perspective depth. A sphere
                // fit wastes most of the card around flat boards and long parts.
                for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) {
                    const corner = new T.Vector3(x ? box.max.x : box.min.x, y ? box.max.y : box.min.y, z ? box.max.z : box.min.z).sub(center), depth = corner.dot(direction);
                    distance = Math.max(distance, depth + Math.abs(corner.dot(right)) * 1.12 / (tangent * camera.aspect), depth + Math.abs(corner.dot(up)) * 1.12 / tangent);
                }
                camera.near = Math.max(radius / 1000, .000001); camera.far = Math.max(distance + radius * 4, 1); camera.updateProjectionMatrix();
                camera.position.copy(center).add(direction.multiplyScalar(distance)); camera.lookAt(center);
                group.traverse(mesh => { if (mesh.isMesh) viewport.apply(mesh); });
                // Render small part boundaries once, then cache the finished image.
                viewport.render(camera, viewport.modelFromRoot(group), width, height);
                return renderer.domElement.toDataURL('image/png');
            } finally { scene.remove(group); if (renderer.renderLists) renderer.renderLists.dispose(); }
        }
        function renderRoot(source) {
            if (!source) throw new Error('Product has no preview model.');
            const group = source.clone(true), materials = new Set(), geometries = new Set();
            // The editor owns its GPU resources. Only private material clones
            // receive this studio's environment maps and are disposed afterwards.
            function clean(object) {
                object.children.slice().forEach(child => {
                    const data = child.userData || {};
                    if (!child.visible || child.isLine || child.isPoints || data.sharedSelectionGeometry || data.componentMoveHandle || data.editorHelper || data.guideGhost || data.guideHighlight) object.remove(child);
                    else clean(child);
                });
                if (object.geometry && object.geometry.isGeometry) { object.geometry = new T.BufferGeometry().fromGeometry(object.geometry); geometries.add(object.geometry); }
                if (object.material) {
                    const copy = material => { const value = material.clone(); if ('envMap' in value) value.envMap = null; materials.add(value); return value; };
                    object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
                }
            }
            clean(group);
            try { return draw(group); }
            finally { materials.forEach(material => material.dispose()); geometries.forEach(geometry => geometry.dispose()); }
        }
        function get(entry, settings) {
            settings = settings || {};
            if (disposed) return Promise.reject(new Error('Equipment preview closed.'));
            if (entry.thumbnailUrl && !settings.ignorePublished) {
                const url = new URL(entry.thumbnailUrl);
                if (entry.previewRevision) url.searchParams.set('v', entry.previewRevision);
                return Promise.resolve(url.href);
            }
            const requestKey = (entry.manifestUrl || JSON.stringify(entry.productManifest) + '|' + entry.productBaseUrl) + '|' + (entry.previewRevision || '');
            // The registry revision covers the published manifest and assets.
            // Reopening Equipment can retrieve pixels before reading any model data.
            const publishedKey = entry.manifestUrl && !entry.productManifest && entry.previewRevision
                ? hashPreview(previewVersion + '|' + width + 'x' + height + '|published|' + requestKey) : null;
            if (pending.has(requestKey)) return pending.get(requestKey);
            const task = (async () => {
                if (disposed) throw new Error('Equipment preview closed.');
                if (publishedKey) { const image = await storedPreview(publishedKey); if (image) return image; }
                let manifest = entry.productManifest, baseUrl = entry.productBaseUrl;
                if (!manifest) {
                    const response = await fetch(entry.manifestUrl, { cache: 'no-cache' });
                    if (!response.ok) throw new Error('Could not load ' + entry.name + ' (' + response.status + ').');
                    manifest = await response.json(); baseUrl = new URL('.', entry.manifestUrl).href;
                }
                const validated = root.ProductSchema.validate(manifest);
                const revision = await previewAssetRevision(validated, baseUrl, entry.previewRevision);
                const key = hashPreview(previewVersion + '|' + width + 'x' + height + '|' + baseUrl + '|' + JSON.stringify(manifest) + '|' + revision);
                if (revision !== null) {
                    const cached = await storedPreview(key);
                    if (cached) { if (publishedKey) await savePreview(publishedKey, cached); return cached; }
                }
                const render = tail.catch(() => {}).then(async () => {
                    if (disposed) { const error = new Error('Equipment preview closed.'); error.cancelled = true; throw error; }
                    const allowed = !options.beforeRender || await options.beforeRender(entry);
                    if (disposed || allowed === false) { const error = new Error('Equipment preview closed.'); error.cancelled = true; throw error; }
                    const model = await root.ProductRuntime.load(T, validated, { authoring: true, baseUrl });
                    try {
                        if (disposed) { const error = new Error('Equipment preview closed.'); error.cancelled = true; throw error; }
                        const image = draw(model.root);
                        if (revision !== null) await savePreview(publishedKey || key, image);
                        return image;
                    } finally { model.dispose(); }
                });
                tail = render.catch(() => {});
                return render;
            })();
            pending.set(requestKey, task);
            task.then(() => pending.delete(requestKey), () => pending.delete(requestKey));
            return task;
        }
        function dispose() {
            disposed = true; pending.clear();
            if (viewport) viewport.dispose();
            if (renderer) { if (renderer.renderLists) renderer.renderLists.dispose(); renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); }
            viewport = renderer = scene = camera = null;
        }
        return { get, renderRoot, dispose };
    }
    function thumbnailFromRoot(T, group, options) {
        const previewer = createPreviewer(T, options);
        try { return previewer.renderRoot(group); } finally { previewer.dispose(); }
    }
    root.ProductCatalog = { list, loadSelected, prepare, geometryKey, refreshConfiguration, applyInstanceOverrides, matchesPrepared, hasController, applyFaceColor, resizeScrew, thumbnail, createPreviewer, thumbnailFromRoot };
    if (typeof module !== 'undefined') module.exports = root.ProductCatalog;
})(typeof window !== 'undefined' ? window : globalThis);
