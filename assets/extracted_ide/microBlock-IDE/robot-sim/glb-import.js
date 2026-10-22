(function (root) {
    'use strict';

    function materialColor(T, material) {
        if (!material || !material.color) return null;
        // Keep the GLTFLoader color in the bundled Three.js material space,
        // matching SIM. The STEP helper converts linear RGB to sRGB; applying
        // it here made GLB colors brighter only in pages that also load STEP
        // (Assembly and Board Editor), before the renderer encoded them again.
        return '#' + material.color.getHexString();
    }

    function imagePixels(texture) {
        if (texture && texture.userData && texture.userData.productAssetFile) return { file: texture.userData.productAssetFile, flipY: !!texture.flipY, wrapS: texture.wrapS, wrapT: texture.wrapT };
        if (!texture || !texture.image) return null;
        const image = texture.image;
        const width = image.naturalWidth || image.videoWidth || image.width;
        const height = image.naturalHeight || image.videoHeight || image.height;
        if (!width || !height) return null;
        if (image.data && ArrayBuffer.isView(image.data)) {
            return { width, height, data: Uint8Array.from(image.data), flipY: !!texture.flipY, wrapS: texture.wrapS, wrapT: texture.wrapT };
        }
        if (typeof document === 'undefined') return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0, width, height);
            return { width, height, data: Uint8Array.from(context.getImageData(0, 0, width, height).data), flipY: !!texture.flipY, wrapS: texture.wrapS, wrapT: texture.wrapT };
        } catch (_) { return null; }
    }

    function createMaterials(T, data) {
        if (!data || !Array.isArray(data.materials) || !data.materials.length) return [];
        const textureCache = [];
        const textureFor = index => {
            if (!Number.isInteger(index) || !data.textures || !data.textures[index]) return null;
            if (textureCache[index]) return textureCache[index];
            const stored = data.textures[index];
            if (stored.file) {
                const texture = new T.TextureLoader().load(stored.file);
                texture.flipY = !!stored.flipY;
                texture.wrapS = stored.wrapS || T.ClampToEdgeWrapping;
                texture.wrapT = stored.wrapT || T.ClampToEdgeWrapping;
                if (T.sRGBEncoding !== undefined) texture.encoding = T.sRGBEncoding;
                textureCache[index] = texture;
                return texture;
            }
            const texture = new T.DataTexture(stored.data, stored.width, stored.height, T.RGBAFormat, T.UnsignedByteType);
            texture.flipY = !!stored.flipY;
            texture.wrapS = stored.wrapS || T.ClampToEdgeWrapping;
            texture.wrapT = stored.wrapT || T.ClampToEdgeWrapping;
            if (T.sRGBEncoding !== undefined) texture.encoding = T.sRGBEncoding;
            texture.magFilter = T.LinearFilter;
            texture.minFilter = T.LinearFilter;
            texture.needsUpdate = true;
            textureCache[index] = texture;
            return texture;
        };
        return data.materials.map(stored => {
            if (stored.unlit) return new T.MeshBasicMaterial({ color: stored.color || '#ffffff', map: textureFor(stored.map), opacity: Number.isFinite(stored.opacity) ? stored.opacity : 1, transparent: !!stored.transparent, side: stored.doubleSided ? T.DoubleSide : T.FrontSide, toneMapped: stored.toneMapped !== false });
            const material = new (Number.isFinite(stored.clearcoat) ? T.MeshPhysicalMaterial : T.MeshStandardMaterial)({
            color: stored.color || '#ffffff',
            map: textureFor(stored.map),
            // Preserve the GLB PBR values so Board Editor, Assembly and SIM
            // render the same material instead of brightening it on import.
            roughness: Number.isFinite(stored.roughness) ? Math.max(0, Math.min(1, stored.roughness)) : 0.72,
            metalness: Number.isFinite(stored.metalness) ? Math.max(0, Math.min(1, stored.metalness)) : 0.04,
            opacity: Number.isFinite(stored.opacity) ? stored.opacity : 1,
            transparent: !!stored.transparent,
            side: stored.doubleSided ? T.DoubleSide : T.FrontSide
            });
            if (material.isMeshPhysicalMaterial) {
                material.clearcoat = stored.clearcoat;
                material.clearcoatRoughness = Number.isFinite(stored.clearcoatRoughness) ? stored.clearcoatRoughness : .03;
            }
            if (stored.productFinish) material.userData.productFinish = true;
            return material;
        });
    }

    // glTF primitives are grouped by material, not by CAD surface. One dark
    // material can therefore cover the top, sides and holes of a board. Split
    // every material group at hard edges and disconnected islands, then place
    // each surface in a contiguous index range so it can be picked and painted.
    function splitSurfaces(indices, positions, groups, materialForGroup) {
        const ordered = [];
        const faces = [];
        const hardEdgeCosine = Math.cos(Math.PI / 4);

        groups.forEach(group => {
            const start = Math.max(0, Math.floor((group.start || 0) / 3) * 3);
            const available = Math.max(0, indices.length - start);
            const count = Math.floor(Math.min(Number.isFinite(group.count) ? group.count : available, available) / 3) * 3;
            const triangleCount = count / 3;
            if (!triangleCount) return;

            const parent = new Int32Array(triangleCount);
            const normals = new Float32Array(triangleCount * 3);
            const edges = new Map();
            const vertexKeys = new Map();
            const vertexKey = index => {
                if (vertexKeys.has(index)) return vertexKeys.get(index);
                const offset = index * 3;
                const key = positions[offset].toPrecision(9) + ',' + positions[offset + 1].toPrecision(9) + ',' + positions[offset + 2].toPrecision(9);
                vertexKeys.set(index, key);
                return key;
            };
            for (let triangle = 0; triangle < triangleCount; triangle++) {
                parent[triangle] = triangle;
                const offset = start + triangle * 3;
                const ia = indices[offset] * 3, ib = indices[offset + 1] * 3, ic = indices[offset + 2] * 3;
                const abx = positions[ib] - positions[ia], aby = positions[ib + 1] - positions[ia + 1], abz = positions[ib + 2] - positions[ia + 2];
                const acx = positions[ic] - positions[ia], acy = positions[ic + 1] - positions[ia + 1], acz = positions[ic + 2] - positions[ia + 2];
                let nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
                const length = Math.hypot(nx, ny, nz) || 1;
                normals[triangle * 3] = nx / length;
                normals[triangle * 3 + 1] = ny / length;
                normals[triangle * 3 + 2] = nz / length;
            }
            const rootOf = value => {
                let root = value;
                while (parent[root] !== root) root = parent[root];
                while (parent[value] !== value) { const next = parent[value]; parent[value] = root; value = next; }
                return root;
            };
            const join = (left, right) => {
                left = rootOf(left); right = rootOf(right);
                if (left !== right) parent[right] = left;
            };
            const compatible = (left, right) => {
                const lo = left * 3, ro = right * 3;
                return normals[lo] * normals[ro] + normals[lo + 1] * normals[ro + 1] + normals[lo + 2] * normals[ro + 2] >= hardEdgeCosine;
            };
            for (let triangle = 0; triangle < triangleCount; triangle++) {
                const offset = start + triangle * 3;
                const vertices = [indices[offset], indices[offset + 1], indices[offset + 2]];
                for (let edge = 0; edge < 3; edge++) {
                    const a = vertexKey(vertices[edge]), b = vertexKey(vertices[(edge + 1) % 3]);
                    const key = a < b ? a + ':' + b : b + ':' + a;
                    const adjacent = edges.get(key);
                    if (adjacent !== undefined && compatible(triangle, adjacent)) join(triangle, adjacent);
                    else if (adjacent === undefined) edges.set(key, triangle);
                }
            }

            const components = new Map();
            for (let triangle = 0; triangle < triangleCount; triangle++) {
                const root = rootOf(triangle);
                if (!components.has(root)) components.set(root, []);
                components.get(root).push(triangle);
            }
            const material = materialForGroup(group);
            components.forEach(triangles => {
                const first = ordered.length / 3;
                triangles.forEach(triangle => {
                    const offset = start + triangle * 3;
                    ordered.push(indices[offset], indices[offset + 1], indices[offset + 2]);
                });
                faces.push({ first, last: ordered.length / 3 - 1, color: material.color, materialIndex: material.index });
            });
        });
        return { indices: Uint32Array.from(ordered), faces };
    }

    function upgradeData(data) {
        if (!data || data.surfaceVersion >= 2 || !data.positions || !data.indices || !Array.isArray(data.faces) || !data.faces.length) return false;
        const groups = data.faces.map(face => ({
            start: face.first * 3,
            count: (face.last - face.first + 1) * 3,
            materialIndex: Number.isInteger(face.materialIndex) ? face.materialIndex : 0,
            color: face.color
        }));
        const split = splitSurfaces(data.indices, data.positions, groups, group => ({ color: group.color, index: group.materialIndex }));
        data.indices = split.indices;
        data.faces = split.faces;
        data.surfaceVersion = 2;
        return true;
    }

    function prepare(T, scene, name, options) {
        scene.updateMatrixWorld(true);
        const sources = [];
        const bounds = new T.Box3();
        const point = new T.Vector3();
        const normal = new T.Vector3();
        const materialLookup = new Map();
        const textureLookup = new Map();
        const materials = [];
        const textures = [];
        const nodes = [];
        const partGroups = new Map();

        function textureIndex(texture) {
            if (!texture) return -1;
            const key = texture.uuid || texture.id;
            if (textureLookup.has(key)) return textureLookup.get(key);
            const stored = imagePixels(texture);
            if (!stored) return -1;
            const index = textures.length;
            textures.push(stored);
            textureLookup.set(key, index);
            return index;
        }

        function materialIndex(material) {
            const key = material && (material.uuid || material.id);
            if (key !== undefined && materialLookup.has(key)) return materialLookup.get(key);
            const index = materials.length;
            materials.push({
                color: materialColor(T, material) || '#ffffff',
                map: textureIndex(material && material.map),
                roughness: material && material.roughness,
                metalness: material && material.metalness,
                clearcoat: material && material.clearcoat,
                clearcoatRoughness: material && material.clearcoatRoughness,
                productFinish: !!(material && material.userData && material.userData.productFinish),
                unlit: !!(material && material.isMeshBasicMaterial),
                toneMapped: material && material.toneMapped,
                opacity: material && material.opacity,
                transparent: !!(material && material.transparent),
                doubleSided: !!(material && material.side === T.DoubleSide)
            });
            if (key !== undefined) materialLookup.set(key, index);
            return index;
        }

        scene.traverse(object => {
            if (!object.isMesh || !object.geometry || !object.geometry.attributes.position) return;
            const nodeId = nodes.length;
            const owner = object.parent && object.parent.userData.gltfPrimitiveGroup && object.userData.gltfNodeIndex === undefined ? object.parent : object;
            if (!partGroups.has(owner)) partGroups.set(owner, nodeId);
            nodes.push({ id: nodeId, name: owner.name || object.name || 'Mesh ' + (nodeId + 1), group: partGroups.get(owner) });
            let geometry = object.geometry;
            let temporary = null;
            if (!geometry.attributes.normal) {
                temporary = geometry.clone();
                temporary.computeVertexNormals();
                geometry = temporary;
            }
            const positionAttribute = geometry.attributes.position;
            const normalAttribute = geometry.attributes.normal;
            const uvAttribute = geometry.attributes.uv;
            const positions = new Float32Array(positionAttribute.count * 3);
            const normals = new Float32Array(positionAttribute.count * 3);
            const uvs = new Float32Array(positionAttribute.count * 2);
            const normalMatrix = new T.Matrix3().getNormalMatrix(object.matrixWorld);
            for (let index = 0; index < positionAttribute.count; index++) {
                point.fromBufferAttribute(positionAttribute, index).applyMatrix4(object.matrixWorld);
                positions[index * 3] = point.x; positions[index * 3 + 1] = point.y; positions[index * 3 + 2] = point.z;
                bounds.expandByPoint(point);
                normal.fromBufferAttribute(normalAttribute, index).applyMatrix3(normalMatrix).normalize();
                normals[index * 3] = normal.x; normals[index * 3 + 1] = normal.y; normals[index * 3 + 2] = normal.z;
                if (uvAttribute) { uvs[index * 2] = uvAttribute.getX(index); uvs[index * 2 + 1] = uvAttribute.getY(index); }
            }
            let indices = geometry.index
                ? Uint32Array.from(geometry.index.array)
                : Uint32Array.from({ length: positionAttribute.count }, (_, index) => index);
            if (object.matrixWorld.determinant() < 0) {
                for (let index = 0; index + 2 < indices.length; index += 3) {
                    const second = indices[index + 1];
                    indices[index + 1] = indices[index + 2];
                    indices[index + 2] = second;
                }
            }
            const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
            const groups = geometry.groups && geometry.groups.length
                ? geometry.groups.slice().sort((a, b) => a.start - b.start)
                : [{ start: 0, count: indices.length, materialIndex: 0 }];
            const sourceFaces = options && options.preserveSurfaces && geometry.userData && geometry.userData.brepFaces;
            const sourceNodeMap = new Map();
            const originalNodes = sourceFaces && geometry.userData.productNodes;
            if (originalNodes && originalNodes.length) {
                nodes.pop();
                const groups = new Map();
                originalNodes.forEach(original => {
                    const id = nodes.length, group = original.group === undefined ? original.id : original.group;
                    if (!groups.has(group)) groups.set(group, id);
                    sourceNodeMap.set(original.id, id);
                    nodes.push({ id, name: original.name || object.name, group: groups.get(group) });
                });
            }
            const split = sourceFaces && sourceFaces.length ? { indices, faces: sourceFaces.map((face, index) => {
                const material = objectMaterials[face.materialIndex || 0];
                return Object.assign({}, face, { color: materialColor(T, material), materialIndex: materialIndex(material), componentId: object.userData.componentId, surfaceIndex: index });
            }) } : splitSurfaces(indices, positions, groups, group => {
                const material = objectMaterials[group.materialIndex || 0];
                return { color: materialColor(T, material), index: materialIndex(material) };
            });
            indices = split.indices;
            split.faces.forEach(face => { face.sourceNode = sourceNodeMap.has(face.sourceNode) ? sourceNodeMap.get(face.sourceNode) : nodeId; });
            if (options && options.preserveSurfaces && object.userData.productArtwork) split.faces.forEach(face => { face.artworkId = object.userData.artworkId || 'artwork'; });
            sources.push({
                positions,
                normals,
                uvs,
                indices,
                faces: split.faces
            });
            if (temporary) temporary.dispose();
        });

        if (!sources.length || bounds.isEmpty()) return null;
        const boundsCenter = bounds.getCenter(new T.Vector3());
        const sizeVector = bounds.getSize(new T.Vector3());
        const positionCount = sources.reduce((sum, source) => sum + source.positions.length, 0);
        const normalCount = sources.reduce((sum, source) => sum + source.normals.length, 0);
        const indexCount = sources.reduce((sum, source) => sum + source.indices.length, 0);
        const positions = new Float32Array(positionCount);
        const normals = new Float32Array(normalCount);
        const uvs = new Float32Array(sources.reduce((sum, source) => sum + source.uvs.length, 0));
        const indices = new Uint32Array(indexCount);
        const faces = [];
        const faceColors = {};
        let positionOffset = 0, normalOffset = 0, uvOffset = 0, indexOffset = 0, vertexOffset = 0, triangleOffset = 0;
        sources.forEach(source => {
            for (let index = 0; index < source.positions.length; index += 3) {
                positions[positionOffset + index] = source.positions[index] - boundsCenter.x;
                positions[positionOffset + index + 1] = source.positions[index + 1] - boundsCenter.y;
                positions[positionOffset + index + 2] = source.positions[index + 2] - boundsCenter.z;
            }
            normals.set(source.normals, normalOffset);
            uvs.set(source.uvs, uvOffset);
            for (let index = 0; index < source.indices.length; index++) indices[indexOffset + index] = source.indices[index] + vertexOffset;
            source.faces.forEach(face => {
                const faceIndex = faces.length;
                faces.push(Object.assign({}, face, { first: face.first + triangleOffset, last: face.last + triangleOffset }));
            });
            positionOffset += source.positions.length;
            normalOffset += source.normals.length;
            uvOffset += source.uvs.length;
            indexOffset += source.indices.length;
            vertexOffset += source.positions.length / 3;
            triangleOffset += source.indices.length / 3;
        });
        const firstColor = (materials[0] && materials[0].color) || '#9aa7b1';
        return {
            source: { name: name || '', colorHex: firstColor },
            center: new T.Vector3(0, sizeVector.y / 2, 0),
            boundsCenter: boundsCenter.toArray(),
            size: sizeVector.toArray(),
            faceColors,
            data: { positions, normals, uvs, indices, faces, materials, textures, nodes, surfaceVersion: 2 }
        };
    }

    function read(T, file, onProgress) {
        if (file.size > 500 * 1024 * 1024) return Promise.reject(new Error('GLB files are limited to 500 MB each'));
        if (typeof T.GLTFLoader !== 'function') return Promise.reject(new Error('GLB loader is unavailable'));
        if (onProgress) onProgress('Reading ' + Math.max(1, Math.round(file.size / 1024 / 1024)) + ' MB GLB file…');
        return file.arrayBuffer().then(buffer => new Promise((resolve, reject) => {
            new T.GLTFLoader().parse(buffer, '', result => {
                try {
                    const prepared = prepare(T, result.scene, file.name.replace(/\.glb$/i, ''));
                    if (!prepared) throw new Error('The GLB file contains no readable mesh');
                    resolve(prepared);
                } catch (error) { reject(error); }
            }, reject);
        }));
    }

    root.AssemblyGlb = { read, prepare, createMaterials, splitSurfaces, upgradeData };
})(typeof window !== 'undefined' ? window : globalThis);
