(function (root) {
    'use strict';

    // OCCT returns STEP presentation colours in linear RGB. The colour values
    // used by this Three.js version and by <input type="color"> are sRGB, so a
    // direct copy makes mid tones too dark (for example 0.6 becomes 0.3185).
    function linearToSrgb(value) {
        value = Math.max(0, Math.min(1, Number(value) || 0));
        return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    }

    function stepColorHex(T, color) {
        if (!color || color.length < 3) return null;
        return '#' + color.slice(0, 3).map(value => {
            const channel = Math.round(linearToSrgb(value) * 255);
            return channel.toString(16).padStart(2, '0');
        }).join('');
    }

    root.AssemblyStepGeometry = {
        colorHex: stepColorHex,
        prepare(T, meshes) {
            let minimumHeight = Infinity;
            const prepared = meshes.map(source => {
                const positions = source.attributes.position.array;
                let minX = Infinity, minY = Infinity, minZ = Infinity;
                let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                // Convert STEP Z-up to scene Y-up in place to avoid allocating
                // multiple large arrays for imported CAD geometry.
                for (let i = 0; i < positions.length; i += 3) {
                    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
                    positions[i] = x;
                    positions[i + 1] = z;
                    positions[i + 2] = -y;
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, z); maxY = Math.max(maxY, z);
                    minZ = Math.min(minZ, -y); maxZ = Math.max(maxZ, -y);
                    minimumHeight = Math.min(minimumHeight, z);
                }
                const center = new T.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
                const size = [maxX - minX, maxY - minY, maxZ - minZ];
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] -= center.x;
                    positions[i + 1] -= center.y;
                    positions[i + 2] -= center.z;
                }
                const originalNormals = source.attributes.normal && source.attributes.normal.array;
                let normals = originalNormals;
                if (originalNormals) {
                    for (let i = 0; i < originalNormals.length; i += 3) {
                        const y = originalNormals[i + 1];
                        originalNormals[i + 1] = originalNormals[i + 2];
                        originalNormals[i + 2] = -y;
                    }
                } else {
                    const geometry = new T.BufferGeometry();
                    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
                    geometry.setIndex(ArrayBuffer.isView(source.index.array) ? new T.BufferAttribute(source.index.array, 1) : source.index.array);
                    geometry.computeVertexNormals();
                    normals = geometry.attributes.normal.array;
                    geometry.dispose();
                }
                return { source, center, size, data: { positions, normals, indices: source.index.array, faces: source.brep_faces || [] } };
            });
            // Preserve the relative placement of all bodies while raising the whole import.
            prepared.forEach(item => { item.center.y -= minimumHeight; });
            return prepared;
        },
        prepareAsOne(T, meshes) {
            const items = this.prepare(T, meshes);
            if (!items.length) return null;
            const bounds = new T.Box3();
            items.forEach(item => {
                const half = new T.Vector3().fromArray(item.size).multiplyScalar(0.5);
                bounds.expandByPoint(item.center.clone().sub(half));
                bounds.expandByPoint(item.center.clone().add(half));
            });
            const center = bounds.getCenter(new T.Vector3());
            const size = bounds.getSize(new T.Vector3()).toArray();
            const positionCount = items.reduce((sum, item) => sum + item.data.positions.length, 0);
            const normalCount = items.reduce((sum, item) => sum + item.data.normals.length, 0);
            const indexCount = items.reduce((sum, item) => sum + item.data.indices.length, 0);
            const positions = new Float32Array(positionCount);
            const normals = new Float32Array(normalCount);
            const indices = new Uint32Array(indexCount);
            const faces = [];
            const faceColors = {};
            let positionOffset = 0, normalOffset = 0, indexOffset = 0, vertexOffset = 0, triangleOffset = 0;
            items.forEach(item => {
                const offset = item.center.clone().sub(center);
                for (let i = 0; i < item.data.positions.length; i += 3) {
                    positions[positionOffset + i] = item.data.positions[i] + offset.x;
                    positions[positionOffset + i + 1] = item.data.positions[i + 1] + offset.y;
                    positions[positionOffset + i + 2] = item.data.positions[i + 2] + offset.z;
                }
                normals.set(item.data.normals, normalOffset);
                for (let i = 0; i < item.data.indices.length; i++) indices[indexOffset + i] = item.data.indices[i] + vertexOffset;
                item.data.faces.forEach(face => {
                    const mergedFaceIndex = faces.length;
                    faces.push({ first: face.first + triangleOffset, last: face.last + triangleOffset, color: face.color || null });
                    const color = face.color || item.source.color;
                    if (color) faceColors['brep-' + mergedFaceIndex] = stepColorHex(T, color);
                });
                positionOffset += item.data.positions.length;
                normalOffset += item.data.normals.length;
                indexOffset += item.data.indices.length;
                vertexOffset += item.data.positions.length / 3;
                triangleOffset += item.data.indices.length / 3;
            });
            return {
                source: { name: '', color: items[0].source.color },
                center,
                size,
                faceColors,
                data: { positions, normals, indices, faces }
            };
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
