/* Parse off the UI thread. All dependencies are packaged locally. */
importScripts('vendor/occt-legacy/occt-import-js.js');
const engine = fetch('vendor/occt-legacy/occt-import-js.wasm').then(r => {
    if (!r.ok) throw new Error('Could not load the STEP engine');
    return r.arrayBuffer();
}).then(wasmBinary => occtimportjs({ wasmBinary }));
self.onmessage = async event => {
    try {
        self.postMessage({ stage: 'Preparing STEP engine…' });
        const occt = await engine;
        self.postMessage({ stage: 'Building faces and mesh…' });
        const result = occt.ReadStepFile(new Uint8Array(event.data.buffer), event.data.params || null);
        if (!result.success || !result.meshes.length) throw new Error('The file contains no readable STEP geometry');
        const transfers = [];
        const meshes = result.meshes.map(mesh => {
            const positions = Float32Array.from(mesh.attributes.position.array, value => value * .001);
            const normalSource = mesh.attributes.normal && mesh.attributes.normal.array;
            const normals = normalSource ? Float32Array.from(normalSource) : null;
            const indices = Uint32Array.from(mesh.index.array);
            transfers.push(positions.buffer, indices.buffer);
            if (normals) transfers.push(normals.buffer);
            const attributes = { position: { array: positions } };
            if (normals) attributes.normal = { array: normals };
            return { name: mesh.name, color: mesh.color, brep_faces: mesh.brep_faces || [], attributes, index: { array: indices } };
        });
        self.postMessage({ meshes }, transfers);
    } catch (error) { self.postMessage({ error: error.message || String(error) }); }
};
