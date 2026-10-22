// Executed by a Node worker in Electron, including packaged asar builds.
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const factory = require(path.join(workerData.vendor, 'occt-import-js.js'));
factory({ wasmBinary: fs.readFileSync(path.join(workerData.vendor, 'occt-import-js.wasm')) }).then(occt => {
    const result = occt.ReadStepFile(new Uint8Array(workerData.buffer), null);
    if (!result.success || !result.meshes.length) throw new Error('The file contains no readable STEP geometry');
    const transfers = [];
    const meshes = result.meshes.map(mesh => {
        // Match the browser worker's compact transferable payload.
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
    parentPort.postMessage({ meshes }, transfers);
}).catch(error => parentPort.postMessage({ error: error.message || String(error) }));
