(function () {
    'use strict';
    let database;
    let fallbackEngine;
    let activeCancel = null;
    const MAX_STEP_FILE_SIZE = 500 * 1024 * 1024;

    function previewParams(fileSize) {
        if (fileSize < 8 * 1024 * 1024) return null;
        return {
            linearDeflectionType: 'bounding_box_ratio',
            linearDeflection: fileSize >= 40 * 1024 * 1024 ? 0.02 : 0.006,
            angularDeflection: fileSize >= 40 * 1024 * 1024 ? 1.0 : 0.6
        };
    }

    function compactMeshes(meshes) {
        return meshes.map(mesh => {
            const positions = Float32Array.from(mesh.attributes.position.array, value => value * .001);
            const normalSource = mesh.attributes.normal && mesh.attributes.normal.array;
            const normals = normalSource ? Float32Array.from(normalSource) : null;
            const indices = Uint32Array.from(mesh.index.array);
            const attributes = { position: { array: positions } };
            if (normals) attributes.normal = { array: normals };
            return { name: mesh.name, color: mesh.color, brep_faces: mesh.brep_faces || [], attributes, index: { array: indices } };
        });
    }

    function fastHelperPath() {
        if (typeof require !== 'function' || !window.process || !process.versions || !process.versions.electron) return '';
        try {
            const path = require('path');
            const app = require('@electron/remote').app;
            if (!app) return '';
            if (app.isPackaged) return path.join(process.resourcesPath, 'app.asar.unpacked', 'microBlock-IDE', 'robot-sim', 'step-fast-import.js');
            return path.join(app.getAppPath(), 'microBlock-IDE', 'robot-sim', 'step-fast-import.js');
        } catch (_) { return ''; }
    }

    function readWithFastNode(file, params, onProgress) {
        return new Promise((resolve, reject) => {
            const helper = fastHelperPath();
            const filePath = file.path || (typeof require === 'function' && require('electron').webUtils.getPathForFile(file));
            if (!helper || !filePath) {
                const error = new Error('Fast STEP engine is unavailable');
                error.fastUnavailable = true;
                reject(error);
                return;
            }
            const childProcess = require('child_process');
            const started = Date.now();
            const chunks = [];
            const errors = [];
            let settled = false;
            let child;
            let cancel;
            function done(error, meshes) {
                if (settled) return;
                settled = true;
                if (activeCancel === cancel) activeCancel = null;
                clearInterval(heartbeat);
                clearTimeout(timeout);
                error ? reject(error) : resolve(meshes);
            }
            try {
                child = childProcess.spawn('node', ['--max-old-space-size=4096', helper, filePath, JSON.stringify(params)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
            } catch (error) {
                error.fastUnavailable = true;
                reject(error);
                return;
            }
            const heartbeat = setInterval(() => {
                if (onProgress) onProgress('Converting with Fast STEP engine · ' + Math.round((Date.now() - started) / 1000) + ' seconds');
            }, 1000);
            const fileMegabytes = Math.max(1, file.size / 1024 / 1024);
            const timeoutMs = Math.max(600000, Math.min(1800000, fileMegabytes * 4000));
            const timeout = setTimeout(() => {
                child.kill();
                done(new Error('Fast STEP engine exceeded the ' + Math.round(timeoutMs / 60000) + ' minute limit'));
            }, timeoutMs);
            cancel = () => {
                child.kill();
                const error = new Error('STEP import cancelled');
                error.cancelled = true;
                done(error);
            };
            activeCancel = cancel;
            child.stdout.on('data', chunk => chunks.push(chunk));
            child.stderr.on('data', chunk => errors.push(chunk));
            child.on('error', error => { error.fastUnavailable = true; done(error); });
            child.on('close', code => {
                if (code !== 0) {
                    const error = new Error(Buffer.concat(errors).toString('utf8').trim() || 'Fast STEP engine failed');
                    if (Date.now() - started < 15000) error.fastUnavailable = true;
                    done(error);
                    return;
                }
                try {
                    const output = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                    done(null, compactMeshes(output.meshes || []));
                } catch (error) { done(error); }
            });
        });
    }

    function loadScript(source) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = source;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Could not load the STEP engine'));
            document.head.appendChild(script);
        });
    }

    async function readOnMainThread(buffer, params) {
        if (!fallbackEngine) fallbackEngine = (async () => {
            if (typeof window.occtimportjs !== 'function') {
                await loadScript('vendor/occt-legacy/occt-import-js.js');
            }
            const response = await fetch('vendor/occt-legacy/occt-import-js.wasm');
            if (!response.ok) throw new Error('Could not load the STEP engine');
            return window.occtimportjs({ wasmBinary: await response.arrayBuffer() });
        })();
        const occt = await fallbackEngine;
        // Let the status message render before the synchronous CAD conversion.
        await new Promise(resolve => setTimeout(resolve, 20));
        const result = occt.ReadStepFile(new Uint8Array(buffer), params);
        if (!result.success || !result.meshes.length) throw new Error('The file contains no readable STEP geometry');
        return compactMeshes(result.meshes);
    }

    function readInWebWorker(buffer, params, fileSize, onProgress) {
        return new Promise((resolve, reject) => {
            let worker;
            let cancel;
            try {
                worker = new window.Worker(new URL('step-worker.js', window.location.href).href);
            } catch (error) {
                error.workerUnavailable = true;
                reject(error);
                return;
            }
            const started = Date.now();
            const megabytes = Math.max(1, Math.round(fileSize / 1024 / 1024));
            const timeoutMs = Math.max(180000, Math.min(900000, megabytes * 15000));
            let settled = false;
            const heartbeat = setInterval(() => {
                if (onProgress) onProgress('Converting STEP ' + megabytes + ' MB · ' + Math.round((Date.now() - started) / 1000) + ' seconds');
            }, 1000);
            const timer = setTimeout(() => done(new Error('The STEP file exceeded the ' + Math.round(timeoutMs / 60000) + ' minute processing limit')), timeoutMs);
            function done(error, result) {
                if (settled) return;
                settled = true;
                if (activeCancel === cancel) activeCancel = null;
                clearTimeout(timer);
                clearInterval(heartbeat);
                worker.terminate();
                error ? reject(error) : resolve(result);
            }
            cancel = () => {
                const error = new Error('STEP import cancelled');
                error.cancelled = true;
                done(error);
            };
            activeCancel = cancel;
            worker.onmessage = event => {
                if (event.data && event.data.stage) {
                    if (onProgress) onProgress(event.data.stage);
                    return;
                }
                done(event.data.error ? new Error(event.data.error) : null, event.data.meshes);
            };
            worker.onerror = event => done(new Error(event.message || 'STEP worker failed'));
            try {
                // Transfer ownership instead of copying large STEP buffers.
                worker.postMessage({ buffer, params }, [buffer]);
            } catch (error) {
                done(error);
            }
        });
    }
    function db() {
        if (!database) database = new Promise((resolve, reject) => {
            const request = indexedDB.open('robot-assembly-geometry', 1);
            const timer = setTimeout(() => reject(new Error('Could not open geometry storage')), 8000);
            request.onupgradeneeded = () => request.result.createObjectStore('meshes');
            request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
            request.onerror = () => { clearTimeout(timer); reject(request.error); };
            request.onblocked = () => { clearTimeout(timer); reject(new Error('Geometry storage is in use by another window')); };
        });
        return database;
    }
    window.AssemblyStep = {
        cancelActive() {
            if (activeCancel) activeCancel();
        },
        async read(file, onProgress) {
            if (file.size > MAX_STEP_FILE_SIZE) throw new Error('STEP files are limited to 500 MB each');
            if (onProgress) onProgress('Reading ' + Math.max(1, Math.round(file.size / 1024 / 1024)) + ' MB file…');
            const params = previewParams(file.size);
            if (file.size >= 8 * 1024 * 1024) {
                try { return await readWithFastNode(file, params, onProgress); }
                catch (error) {
                    if (!error.fastUnavailable) throw error;
                    if (onProgress) onProgress('Fast STEP engine unavailable · Using standard mode…');
                }
            }
            const buffer = await file.arrayBuffer();
            try {
                return await readInWebWorker(buffer, params, file.size, onProgress);
            } catch (error) {
                // Only use the blocking compatibility path when Worker creation
                // itself is unavailable. Parsing failures must not run twice.
                if (!error.workerUnavailable) throw error;
                if (onProgress) onProgress('Using STEP compatibility mode…');
                return readOnMainThread(buffer, params);
            }
        },
        async put(key, mesh) {
            const database = await db();
            return new Promise((resolve, reject) => {
                const tx = database.transaction('meshes', 'readwrite');
                tx.objectStore('meshes').put(mesh, key);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error('Could not save geometry'));
            });
        },
        async putMany(entries) {
            if (!entries.length) return;
            const database = await db();
            return new Promise((resolve, reject) => {
                const tx = database.transaction('meshes', 'readwrite');
                const store = tx.objectStore('meshes');
                entries.forEach(entry => store.put(entry.mesh, entry.key));
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error('Could not save geometry'));
            });
        },
        async clear() {
            const database = await db();
            return new Promise((resolve, reject) => {
                const tx = database.transaction('meshes', 'readwrite');
                tx.objectStore('meshes').clear();
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error('Could not clear STEP files'));
            });
        },
        async prune(validKeys) {
            const keep = new Set(validKeys || []);
            const database = await db();
            return new Promise((resolve, reject) => {
                const tx = database.transaction('meshes', 'readwrite');
                const request = tx.objectStore('meshes').openCursor();
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (!cursor) return;
                    if (!keep.has(cursor.key)) cursor.delete();
                    cursor.continue();
                };
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error('Could not clean unused STEP files'));
            });
        },
        async get(key) {
            const project=window.ProjectGeometry||window.parent?.ProjectGeometry||window.opener?.ProjectGeometry;
            if(project)await project.ready;
            const database = await db();
            return new Promise((resolve, reject) => {
                const request = database.transaction('meshes').objectStore('meshes').get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
    };
    window.addEventListener('beforeunload', () => {
        if (activeCancel) activeCancel();
    });
})();
