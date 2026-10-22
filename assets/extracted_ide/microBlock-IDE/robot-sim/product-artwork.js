(function (root) {
    'use strict';

    // Artwork is authored in the component's local coordinates. Keeping the
    // overlay under that mesh makes assembly moves and joint motion automatic.
    const minimumSize = 1e-7;
    const radians = Math.PI / 180;

    function finite(value, fallback) {
        const result = Number(value);
        return Number.isFinite(result) ? result : fallback;
    }

    function frame(T, entry) {
        const rotation = entry.rotation || [];
        const position = entry.position || [];
        const quaternion = new T.Quaternion().setFromEuler(new T.Euler(
            finite(rotation[0], 0) * radians, finite(rotation[1], 0) * radians, finite(rotation[2], 0) * radians, 'XYZ'));
        return { position: new T.Vector3(finite(position[0], 0), finite(position[1], 0), finite(position[2], 0)), quaternion };
    }

    function triangle(T, geometry, offset) {
        const attribute = geometry.attributes.position;
        const indices = geometry.index;
        return [0, 1, 2].map(index => new T.Vector3().fromBufferAttribute(attribute, indices ? indices.getX(offset + index) : offset + index));
    }

    function surfaceTriangles(T, mesh, key, anchor) {
        const geometry = mesh && mesh.geometry;
        if (!geometry || !geometry.attributes || !geometry.attributes.position) return [];
        const count = geometry.index ? geometry.index.count : geometry.attributes.position.count;
        const match = /^brep-(\d+)$/.exec(String(key));
        const output = [];
        if (match) {
            const faces = geometry.userData && geometry.userData.brepFaces;
            const face = faces && faces[Number(match[1])];
            if (!face || !Number.isInteger(face.first) || !Number.isInteger(face.last)) return output;
            for (let offset = Math.max(0, face.first * 3); offset + 2 < Math.min(count, (face.last + 1) * 3); offset += 3) {
                output.push(triangle(T, geometry, offset));
            }
            return output;
        }
        // Primitive faces use the same normal-based keys as AssemblyFaces.
        const vector = String(key).split(',').map(Number);
        if (key !== 'side' && (vector.length !== 3 || !vector.every(Number.isFinite))) return output;
        const target = key === 'side' ? null : new T.Vector3().fromArray(vector).normalize();
        const candidates = [];
        let closest = Infinity;
        for (let offset = 0; offset + 2 < count; offset += 3) {
            const vertices = triangle(T, geometry, offset);
            const normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
            if (key === 'side' ? Math.abs(normal.y) < 0.9 : normal.dot(target) > 0.999) {
                const distance = anchor && target ? Math.abs(vertices[0].clone().sub(anchor).dot(target)) : 0;
                closest = Math.min(closest, distance);
                candidates.push({ vertices, distance });
            }
        }
        candidates.forEach(candidate => {
            if (!anchor || candidate.distance <= closest + 0.0001) output.push(candidate.vertices);
        });
        return output;
    }

    function fitToFace(T, mesh, surfaceKey, entry) {
        const next = Object.assign({}, entry || {}, { surfaceKey });
        const anchor = entry && Array.isArray(entry.position) ? new T.Vector3().fromArray(entry.position) : null;
        const triangles = surfaceTriangles(T, mesh, surfaceKey, anchor);
        if (!triangles.length) return null;
        const normal = new T.Vector3();
        let largestArea = 0, largestNormal = new T.Vector3(0, 0, 1);
        triangles.forEach(vertices => {
            const cross = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
            normal.add(cross);
            if (cross.lengthSq() > largestArea) { largestArea = cross.lengthSq(); largestNormal.copy(cross); }
        });
        if (normal.lengthSq() < largestArea * 1e-12) normal.copy(largestNormal);
        if (!normal.lengthSq()) return null;
        normal.normalize();
        const quaternion = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
        const inverse = quaternion.clone().conjugate();
        const projected = [];
        triangles.forEach(vertices => vertices.forEach(vertex => projected.push(vertex.clone().applyQuaternion(inverse))));
        const bounds = new T.Box3().setFromPoints(projected);
        const size = bounds.getSize(new T.Vector3());
        let width = Math.max(minimumSize, size.x), height = Math.max(minimumSize, size.y);
        if (next.lockAspect && next.size && next.size[0] > 0 && next.size[1] > 0) {
            const ratio = next.size[0] / next.size[1];
            if (width / height > ratio) width = height * ratio;
            else height = width / ratio;
        }
        const euler = new T.Euler().setFromQuaternion(quaternion, 'XYZ');
        next.position = bounds.getCenter(new T.Vector3()).applyQuaternion(quaternion).toArray();
        next.rotation = [euler.x / radians, euler.y / radians, euler.z / radians];
        next.size = [width, height];
        return next;
    }

    // Sutherland-Hodgman clipping in projector XY preserves holes and the
    // actual face boundary because each original surface triangle is clipped.
    function clip(polygon, axis, limit, direction) {
        if (!polygon.length) return polygon;
        const result = [];
        let previous = polygon[polygon.length - 1];
        let previousDistance = (previous.projected[axis] - limit) * direction;
        polygon.forEach(current => {
            const distance = (current.projected[axis] - limit) * direction;
            if ((distance >= 0) !== (previousDistance >= 0)) {
                const fraction = previousDistance / (previousDistance - distance);
                result.push({ position: previous.position.clone().lerp(current.position, fraction), projected: previous.projected.clone().lerp(current.projected, fraction) });
            }
            if (distance >= 0) result.push(current);
            previous = current;
            previousDistance = distance;
        });
        return result;
    }

    function create(T, mesh, entry, texture) {
        if (!entry) return null;
        const width = Math.max(minimumSize, Math.abs(finite(entry.size && entry.size[0], 0.02)));
        const height = Math.max(minimumSize, Math.abs(finite(entry.size && entry.size[1], 0.02)));
        const transform = frame(T, entry);
        let geometry;
        if (entry.surfaceKey) {
            const triangles = surfaceTriangles(T, mesh, entry.surfaceKey, transform.position);
            if (!triangles.length) return null;
            const inverse = transform.quaternion.clone().conjugate();
            const positions = [], uvs = [];
            triangles.forEach(vertices => {
                let polygon = vertices.map(position => ({ position, projected: position.clone().sub(transform.position).applyQuaternion(inverse) }));
                polygon = clip(polygon, 'x', -width / 2, 1);
                polygon = clip(polygon, 'x', width / 2, -1);
                polygon = clip(polygon, 'y', -height / 2, 1);
                polygon = clip(polygon, 'y', height / 2, -1);
                for (let index = 1; index + 1 < polygon.length; index++) {
                    [polygon[0], polygon[index], polygon[index + 1]].forEach(vertex => {
                        positions.push(vertex.position.x, vertex.position.y, vertex.position.z);
                        uvs.push(Math.max(0, Math.min(1, vertex.projected.x / width + 0.5)), Math.max(0, Math.min(1, vertex.projected.y / height + 0.5)));
                    });
                }
            });
            geometry = new T.BufferGeometry();
            geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
            geometry.computeVertexNormals();
        } else geometry = new T.PlaneBufferGeometry(width, height);
        const material = new T.MeshBasicMaterial({
            color: 0xffffff, map: texture || null, transparent: true,
            opacity: Math.max(0, Math.min(1, finite(entry.opacity, 1))),
            side: T.DoubleSide, depthTest: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2
        });
        const overlay = new T.Mesh(geometry, material);
        if (!entry.surfaceKey) { overlay.position.copy(transform.position); overlay.quaternion.copy(transform.quaternion); }
        overlay.name = entry.name || 'Surface artwork';
        overlay.visible = entry.visible !== false;
        overlay.renderOrder = 3;
        overlay.userData.productArtwork = true;
        overlay.userData.artworkId = entry.id;
        // Selection should reach the underlying CAD face, not its decoration.
        overlay.raycast = function () {};
        return overlay;
    }

    const api = { create, fitToFace };
    root.ProductArtwork = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
