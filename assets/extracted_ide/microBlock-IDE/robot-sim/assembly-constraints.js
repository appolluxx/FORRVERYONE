(function (root) {
    'use strict';
    function vector(T, value) { return new T.Vector3().fromArray(value); }
    function world(T, mesh, face) {
        mesh.updateMatrixWorld(true);
        return { center: mesh.localToWorld(vector(T, face.center)), normal: vector(T, face.axis || face.normal).applyQuaternion(mesh.quaternion).normalize() };
    }
    function seated(record) { return !!(record.lockRotation && record.faceA.mountId && record.faceB.mountId); }
    function errors(T, a, b, type, alignment, seat) {
        const offset = b.center.clone().sub(a.center);
        if(seat)return [1-Math.abs(a.normal.dot(b.normal)),offset.length()];
        if (type === 'parallel') return [1 - Math.abs(a.normal.dot(b.normal)), 0];
        return type === 'concentric' ? [1 - Math.abs(a.normal.dot(b.normal)), offset.addScaledVector(a.normal, -offset.dot(a.normal)).length()] : [1 - (alignment === 'aligned' ? 1 : -1) * a.normal.dot(b.normal), Math.abs(offset.dot(a.normal))];
    }
    root.AssemblyConstraints = {
        translation(T, meshes, components, mates, joints, id) {
            const fixed = new Set(components.filter(part => part.fixed).map(part => part.id));
            const ids = new Set(), queue = [id];
            const links = mates.map(m => [m.a, m.b]).concat(joints.map(j => [j.parent, j.child]));
            while (queue.length) {
                const next = queue.shift(); if (fixed.has(next) || ids.has(next) || !meshes.has(next)) continue;
                ids.add(next); links.forEach(([a,b]) => { if (a === next) queue.push(b); if (b === next) queue.push(a); });
            }
            const blocked = [];
            function block(normal) {
                const n = normal.clone(); blocked.forEach(b => n.addScaledVector(b, -n.dot(b)));
                if (n.lengthSq() > 1e-12) blocked.push(n.normalize());
            }
            mates.forEach(mate => {
                if (ids.has(mate.a) === ids.has(mate.b)) return;
                const fixedId = ids.has(mate.a) ? mate.b : mate.a, face = ids.has(mate.a) ? mate.faceB : mate.faceA;
                const mesh = meshes.get(fixedId); if (!mesh) return;
                if(seated(mate)){
                    block(new T.Vector3(1,0,0));block(new T.Vector3(0,1,0));block(new T.Vector3(0,0,1));return;
                }
                const n = vector(T, mate.type === 'concentric' ? face.axis || face.normal : face.normal);
                if (mate.type === 'concentric') n.multiply(mesh.scale); else n.divide(mesh.scale);
                n.applyQuaternion(mesh.quaternion).normalize();
                if (mate.type === 'plane') block(n);
                else if (mate.type === 'concentric') {
                    const side = new T.Vector3(Math.abs(n.x) < .8 ? 1 : 0, Math.abs(n.x) < .8 ? 0 : 1, 0).cross(n).normalize();
                    block(side); block(n.clone().cross(side));
                }
            });
            if (joints.some(j => ids.has(j.parent) !== ids.has(j.child))) {
                block(new T.Vector3(1,0,0)); block(new T.Vector3(0,1,0)); block(new T.Vector3(0,0,1));
            }
            return { ids, project(delta) { const value = delta.clone(); if (!ids.size) return value.set(0,0,0); blocked.forEach(n => value.addScaledVector(n, -value.dot(n))); return value; } };
        },
        face(face) {
            return { key: face.key, kind: face.kind, center: face.center.toArray(), normal: face.normal.toArray(), axis: face.axis ? face.axis.toArray() : undefined };
        },
        satisfied(T, meshes, records, tolerance) {
            return records.every(record => {
                const a = meshes.get(record.a), b = meshes.get(record.b);
                if (!a || !b) return false;
                const e = errors(T, world(T, a, record.faceA), world(T, b, record.faceB), record.type, record.alignment, seated(record));
                return e[0] < 1e-6 && e[1] < (tolerance || 1e-5);
            });
        },
        // Alternating projection preserves plane tangential motion and axial freedom.
        // Caller restores the original pose if constraints do not converge.
        solve(T, meshes, movingId, records) {
            const moving = meshes.get(movingId);
            const related = records.filter(r => r.a === movingId || r.b === movingId);
            for (let pass = 0; pass < 160; pass++) {
                for (const r of related) {
                    const isA = r.a === movingId;
                    const fixed = meshes.get(isA ? r.b : r.a);
                    if (!fixed) return false;
                    const fixedFace = isA ? r.faceB : r.faceA, movingFace = isA ? r.faceA : r.faceB;
                    const a = world(T, fixed, fixedFace), b = world(T, moving, movingFace);
                    const desired = a.normal.clone();
                    if ((r.type === 'plane' && r.alignment !== 'aligned') || ((r.type === 'concentric' || r.type === 'parallel') && desired.dot(b.normal) < 0)) desired.negate();
                    // Tessellated GLB caps and shafts can differ slightly in
                    // direction. Do not keep rotating an already satisfied
                    // orientation: that undoes the preceding mate's translation.
                    if (1 - b.normal.dot(desired) >= 1e-6) {
                        moving.quaternion.premultiply(new T.Quaternion().setFromUnitVectors(b.normal, desired));
                    }
                    if (r.type === 'parallel') continue;
                    const point = world(T, moving, movingFace).center;
                    const shift = a.center.clone().sub(point);
                    if (!seated(r)) {
                        if (r.type === 'plane') shift.copy(a.normal).multiplyScalar(a.center.clone().sub(point).dot(a.normal));
                        else shift.addScaledVector(a.normal, -shift.dot(a.normal));
                    }
                    moving.position.add(shift);
                }
                if (this.satisfied(T, meshes, related)) return true;
            }
            return false;
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
