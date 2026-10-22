/* Guided assembly display only. Source meshes and the running robot are never moved. */
(function (root) {
    'use strict';
    function create(T, options) {
        const runtime = options.runtime, scene = options.scene;
        const practiceRoot = new T.Group(), targetRoot = new T.Group();
        practiceRoot.name = 'Assembly practice';
        practiceRoot.userData.assemblyGuide = true;
        const meshes = new Map(), targets = new Map(), installed = new Set(), authoredMatrices = new Map();
        const source = runtime.physicsModel ? runtime.physicsModel().manifest : (runtime.manifest || {});
        const overlays = new T.Group(); overlays.name = 'Assembly placement hints';
        const ownedGeometry = new Set(), bounds = new T.Box3();
        let step = null, staged = '', animation = null, disposed = false;
        const ghostMaterial = new T.MeshBasicMaterial({ color: 0x329be5, transparent: true, opacity: .2, side: T.DoubleSide, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
        const faceMaterial = new T.MeshBasicMaterial({ color: 0x269eea, transparent: true, opacity: .55, side: T.DoubleSide, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
        ghostMaterial.toneMapped = faceMaterial.toneMapped = false;
        function updateMatrices() { practiceRoot.updateMatrixWorld(true); targetRoot.updateMatrixWorld(true); }
        function geometryBounds(mesh) {
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        }
        function applyMatrix(mesh, matrix) {
            mesh.matrixAutoUpdate = false; mesh.matrix.copy(matrix);
            matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
            mesh.matrixWorldNeedsUpdate = true;
        }
        runtime.root.updateMatrixWorld(true);
        runtime.meshes.forEach((original, id) => {
            if (!original.geometry) return;
            const mesh = original.clone(true);
            mesh.userData = Object.assign({}, original.userData, { assemblyGuide: true, componentId: id });
            // Component geometry can be offset far from its origin after a GLB split.
            // Keep that geometry and the complete authored world matrix unchanged.
            applyMatrix(mesh, original.matrixWorld);
            practiceRoot.add(mesh); meshes.set(id, mesh);
            const target = new T.Mesh(original.geometry, original.material);
            target.name = original.name; target.userData.componentId = id;
            applyMatrix(target, original.matrixWorld);
            targetRoot.add(target); targets.set(id, target);
            authoredMatrices.set(id, target.matrix.clone());
            bounds.union(geometryBounds(original));
            if (options.viewportStyle && options.viewportStyle.apply) mesh.traverse(object => { if (object.isMesh) options.viewportStyle.apply(object); });
        });
        if (bounds.isEmpty()) bounds.set(new T.Vector3(-.05, 0, -.05), new T.Vector3(.05, .1, .05));
        const authoredCenter = bounds.getCenter(new T.Vector3());
        practiceRoot.position.set(-authoredCenter.x, -bounds.min.y, -authoredCenter.z);
        targetRoot.position.copy(practiceRoot.position);
        practiceRoot.add(overlays); scene.add(practiceRoot); updateMatrices();
        const wholeBounds = bounds.clone().translate(practiceRoot.position), wholeRadius = Math.max(.01, wholeBounds.getSize(new T.Vector3()).length() / 2);
        let workbenchBounds = null;
        let focusPoint = wholeBounds.getCenter(new T.Vector3()), focusDirection = null, mountDirection = null;

        function setWorkbench(value) {
            targets.forEach((target, id) => applyMatrix(target, authoredMatrices.get(id)));
            for (const group of (value && value.workbenchOffsets || [])) {
                const delta = new T.Matrix4().makeTranslation(...group.offset);
                for (const id of group.componentIds) {
                    const target = targets.get(id);
                    if (target) applyMatrix(target, delta.clone().multiply(authoredMatrices.get(id)));
                }
            }
            meshes.forEach((mesh,id) => restore(id));
            updateMatrices();
            const bench = value && ((source.assemblyGuide || {}).workbenches || []).find(item => item.phase === value.phase);
            const visible = value && Array.isArray(value.workbenchComponentIds) ? new Set(value.workbenchComponentIds) : bench ? new Set(bench.componentIds) : null;
            meshes.forEach((mesh, id) => { mesh.visible = installed.has(id) && (!visible || visible.has(id)); });
            // Frame only the parts actually shown in this step. Future parts
            // and hidden subassemblies must not pull the camera off-centre.
            const box = new T.Box3();
            meshes.forEach(mesh => { if (mesh.visible) box.union(geometryBounds(mesh)); });
            if (value) [value.componentId,...(value.companionIds || [])].forEach(id => {
                const target=targets.get(id);if(target)box.union(geometryBounds(target));
            });
            workbenchBounds = box.isEmpty() ? null : box;
            focusPoint.copy((workbenchBounds || wholeBounds).getCenter(new T.Vector3()));
        }

        function clearHints() {
            mountDirection = null;
            overlays.children.slice().forEach(object => overlays.remove(object));
            ownedGeometry.forEach(geometry => geometry.dispose()); ownedGeometry.clear();
            focusPoint = wholeBounds.getCenter(new T.Vector3()); focusDirection = null;
        }
        function restore(id) {
            const mesh = meshes.get(id), target = targets.get(id);
            if (mesh && target) applyMatrix(mesh, target.matrix);
        }
        function groupIds(id) { return [id].concat(step && step.componentId === id ? step.companionIds || [] : []); }
        function moveCompanions(id) {
            const mesh = meshes.get(id), target = targets.get(id);
            if (!mesh || !target) return;
            const delta = mesh.matrix.clone().multiply(target.matrix.clone().invert());
            groupIds(id).slice(1).forEach(key => {
                const sibling = meshes.get(key), goal = targets.get(key);
                if (sibling && goal) applyMatrix(sibling, delta.clone().multiply(goal.matrix));
            });
        }
        function setInstalled(ids) {
            if (disposed) return;
            animation = null; staged = ''; installed.clear();
            (ids || []).forEach(id => { if (meshes.has(id)) installed.add(id); });
            meshes.forEach((mesh, id) => { restore(id); mesh.visible = installed.has(id); });
            clearHints(); step = null; workbenchBounds = null; updateMatrices();
        }
        function faceGeometry(mesh, face) {
            if (!face) return null;
            if (Array.isArray(face.vertices) && face.vertices.length >= 9 && face.vertices.length % 9 === 0) {
                const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(face.vertices, 3)); return geometry;
            }
            let range = Number.isInteger(face.first) && Number.isInteger(face.last) ? face : null;
            const match = /^brep-(\d+)$/.exec(face.key || '');
            if (!range && match) range = (mesh.geometry.userData.brepFaces || [])[Number(match[1])];
            const attribute = mesh.geometry.attributes.position, index = mesh.geometry.index;
            if (!range || !attribute || !Number.isInteger(range.first) || !Number.isInteger(range.last)) return null;
            const start = range.first * 3, end = (range.last + 1) * 3, count = index ? index.count : attribute.count;
            if (start < 0 || end <= start || end > count) return null;
            // Copy just the selected face. Disposing hints must not release a GPU
            // position buffer borrowed from the visible model's geometry.
            const vertices = new Float32Array((end - start) * 3);
            for (let i = start, p = 0; i < end; i++, p += 3) {
                const vertex = index ? index.getX(i) : i;
                vertices[p] = attribute.getX(vertex); vertices[p + 1] = attribute.getY(vertex); vertices[p + 2] = attribute.getZ(vertex);
            }
            const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(vertices, 3)); return geometry;
        }
        function highlight(id, face) {
            const target = targets.get(id); if (!target || !face) return;
            let geometry = faceGeometry(target, face), hint;
            if (geometry) {
                hint = new T.Mesh(geometry, faceMaterial); applyMatrix(hint, target.matrix);
                hint.userData.assemblyGuideFace = true;
            } else if (Array.isArray(face.center) && face.center.length === 3 && face.center.every(Number.isFinite)) {
                geometry = new T.SphereBufferGeometry(Math.max(.0005, Math.min(.003, wholeRadius * .015)), 12, 8);
                hint = new T.Mesh(geometry, faceMaterial);
                hint.position.fromArray(face.center).applyMatrix4(target.matrix);
                hint.userData.assemblyGuideMarker = true;
            } else return;
            ownedGeometry.add(geometry); overlays.add(hint); hint.renderOrder = 7;
            hint.userData.componentId = id;
            if (face.center && !focusDirection) {
                const point = new T.Vector3().fromArray(face.center).applyMatrix4(target.matrixWorld);
                focusPoint.copy(point);
                const direction = face.axis || face.normal;
                if (Array.isArray(direction) && direction.length === 3 && direction.every(Number.isFinite)) {
                    focusDirection = new T.Vector3().fromArray(direction).transformDirection(target.matrixWorld);
                    const outward = point.clone().sub(wholeBounds.getCenter(new T.Vector3()));
                    if (focusDirection.dot(outward) < 0) focusDirection.negate();
                    if (focusDirection.lengthSq() < 1e-8) focusDirection = null;
                }
            }
        }
        function prepareStep(value) {
            if (disposed) return;
            clearHints(); step = value || null; setWorkbench(step); if (!step) return;
            const id = step.componentId, target = targets.get(id);
            if (!target) return;
            const ghost = new T.Mesh(target.geometry, ghostMaterial);
            applyMatrix(ghost, target.matrix); ghost.userData.assemblyGuideGhost = true; ghost.userData.componentId = id;
            ghost.renderOrder = 5; overlays.add(ghost);
            groupIds(id).slice(1).forEach(key => {
                const sibling = targets.get(key); if (!sibling) return;
                const hint = new T.Mesh(sibling.geometry, ghostMaterial);
                applyMatrix(hint, sibling.matrix); hint.userData.assemblyGuideGhost = true;
                overlays.add(hint);
            });
            const mates = step.mates || (source.mates || []).filter(mate => (step.mateIds || []).includes(mate.id));
            const marked = new Set();
            mates.forEach(mate => {
                const a = typeof mate.a === 'object' ? mate.a.componentId : mate.a, b = typeof mate.b === 'object' ? mate.b.componentId : mate.b;
                [[a, mate.faceA], [b, mate.faceB]].forEach(entry => {
                    const key = entry[0] + ':' + (entry[1] && entry[1].key || JSON.stringify(entry[1]));
                    if (entry[0] !== id && installed.has(entry[0]) && !marked.has(key)) { marked.add(key); highlight(entry[0], entry[1]); }
                });
            });
            updateMatrices();
        }
        function center(id) {
            const mesh = meshes.get(id); if (!mesh) return null;
            updateMatrices(); return geometryBounds(mesh).getCenter(new T.Vector3());
        }
        function stage(id) {
            if (disposed || installed.has(id) || !meshes.has(id) || animation) return false;
            if (staged && staged !== id) cancelStage(staged);
            staged = id;
            groupIds(id).forEach(key => { restore(key); if (meshes.has(key)) meshes.get(key).visible = true; });
            updateMatrices(); return true;
        }
        function move(id, point) {
            const mesh = meshes.get(id); if (disposed || animation || staged !== id || !mesh || !point) return false;
            const position = point.isVector3 ? point : new T.Vector3().fromArray(point);
            if (![position.x, position.y, position.z].every(Number.isFinite)) return false;
            const delta = position.clone().sub(center(id));
            // practiceRoot has only the shared centring translation, so a world
            // translation preserves authored rotations, scale and split offsets.
            const matrix = mesh.matrix.clone(); matrix.elements[12] += delta.x; matrix.elements[13] += delta.y; matrix.elements[14] += delta.z;
            applyMatrix(mesh, matrix); moveCompanions(id); updateMatrices(); return true;
        }
        function cancelStage(id) {
            if (disposed || installed.has(id)) return;
            if (animation && animation.id === id) animation = null;
            const mesh = meshes.get(id); if (mesh) { restore(id); mesh.visible = false; }
            groupIds(id).slice(1).forEach(key => { restore(key); if (meshes.has(key)) meshes.get(key).visible = false; });
            if (staged === id) staged = ''; updateMatrices();
        }
        function worldPose(pose, fallback) {
            if (pose && pose.isObject3D) { pose.updateMatrixWorld(true); return pose.matrixWorld.clone(); }
            if (pose && pose.isMatrix4) return pose.clone();
            if (!pose) return fallback.matrixWorld.clone();
            const position = pose.position && pose.position.isVector3 ? pose.position.clone() : new T.Vector3().fromArray(pose.position || fallback.getWorldPosition(new T.Vector3()).toArray());
            const quaternion = pose.quaternion && pose.quaternion.isQuaternion ? pose.quaternion.clone() : new T.Quaternion().fromArray(pose.quaternion || fallback.getWorldQuaternion(new T.Quaternion()).toArray());
            const scale = pose.scale && pose.scale.isVector3 ? pose.scale.clone() : new T.Vector3().fromArray(pose.scale || fallback.getWorldScale(new T.Vector3()).toArray());
            return new T.Matrix4().compose(position, quaternion, scale);
        }
        function beginSnap(id, pose, onComplete, duration = .35) {
            const mesh = meshes.get(id); if (disposed || animation || staged !== id || !mesh) return false;
            updateMatrices();
            const end = practiceRoot.matrixWorld.clone().invert().multiply(worldPose(pose, targets.get(id)));
            const p0 = new T.Vector3(), q0 = new T.Quaternion(), s0 = new T.Vector3(), p1 = new T.Vector3(), q1 = new T.Quaternion(), s1 = new T.Vector3();
            mesh.matrix.decompose(p0, q0, s0); end.decompose(p1, q1, s1);
            animation = { id, elapsed: 0, duration: Math.max(.05, duration), end, p0, q0, s0, p1, q1, s1, onComplete }; return true;
        }
        function update(dt) {
            if (disposed || !animation) return false;
            const entry = animation, mesh = meshes.get(entry.id);
            entry.elapsed += Math.max(0, Number.isFinite(dt) ? dt : 0);
            const progress = Math.min(1, entry.elapsed / entry.duration), eased = progress * progress * (3 - 2 * progress);
            const matrix = new T.Matrix4().compose(entry.p0.clone().lerp(entry.p1, eased), entry.q0.clone().slerp(entry.q1, eased), entry.s0.clone().lerp(entry.s1, eased));
            applyMatrix(mesh, progress === 1 ? entry.end : matrix); moveCompanions(entry.id); updateMatrices();
            if (progress === 1) { animation = null; staged = ''; groupIds(entry.id).forEach(id => installed.add(id)); clearHints(); if (entry.onComplete) entry.onComplete(); }
            return true;
        }
        function clearMountView() {
            if(mountDirection)return mountDirection.clone();
            if (!step) return null;
            const direction=step.cameraDirection || step.approachDirection || (focusDirection && focusDirection.toArray());
            if(!direction)return null;
            const preferred=new T.Vector3(...direction).normalize();
            if(step.cameraMode==='fixed')return preferred;
            const axis=new T.Vector3(...(step.approachDirection || direction)).normalize();
            const target=targets.get(step.componentId); if(!target)return preferred;
            const box=geometryBounds(target), center=box.getCenter(new T.Vector3()), size=box.getSize(new T.Vector3());
            const samples=[center];
            for(let axisIndex=0;axisIndex<3;axisIndex++)for(const sign of [-1,1]){
                const p=center.clone();p.setComponent(axisIndex,p.getComponent(axisIndex)+size.getComponent(axisIndex)*.3*sign);samples.push(p);
            }
            // Camera scoring is advisory: use cached component bounds rather
            // than raycasting every CAD triangle for every candidate/sample.
            const obstacles=[...meshes.values()].filter(mesh=>mesh.visible && mesh!==meshes.get(step.componentId)).map(geometryBounds);
            const ray=new T.Ray(), hit=new T.Vector3(), candidates=[preferred,axis];
            const u=new T.Vector3(0,1,0).cross(axis);if(u.lengthSq()<.01)u.set(1,0,0);u.normalize();
            const v=axis.clone().cross(u).normalize();
            for(const tilt of [.4,.8,1.4])for(let i=0;i<8;i++)candidates.push(axis.clone().addScaledVector(u,Math.cos(i*Math.PI/4)*tilt).addScaledVector(v,Math.sin(i*Math.PI/4)*tilt).normalize());
            let best=preferred,score=-Infinity;
            for(const direction of candidates){
                if(direction.dot(axis)<.45)continue;
                let visible=0;
                for(const p of samples){
                    ray.set(p.clone().addScaledVector(direction,1),direction.clone().negate());
                    if(!obstacles.some(bounds=>ray.intersectBox(bounds,hit) && hit.distanceTo(ray.origin)<.999))visible++;
                }
                const value=visible*10+direction.dot(preferred);
                if(value>score){score=value;best=direction;}
            }
            mountDirection=best.clone();return mountDirection.clone();
        }
        function focus() {
            // Keep the kit in frame while pointing the camera toward its mounting
            // face. Small holes should not zoom the view into a single triangle.
            const box = workbenchBounds || wholeBounds;
            return { center: box.getCenter(new T.Vector3()), radius: workbenchBounds ? Math.max(.01, box.getSize(new T.Vector3()).length() / 2) : wholeRadius, direction: clearMountView(), target: focusPoint.clone() };
        }
        function dispose() {
            if (disposed) return; disposed = true; animation = null;
            clearHints(); ghostMaterial.dispose(); faceMaterial.dispose();
            if (practiceRoot.parent) practiceRoot.parent.remove(practiceRoot);
            meshes.clear(); targets.clear(); installed.clear();
            // All model geometries, materials and artwork textures are borrowed
            // from runtime. Its owner releases them after this adapter is gone.
        }
        setInstalled([]);
        return { root: practiceRoot, practiceRoot, meshes, targets, setInstalled, prepareStep, focus, stage, move, center, beginSnap, cancelStage, update, isAnimating: () => !!animation, dispose };
    }
    root.AssemblyGuideView = { create };
    if (typeof module !== 'undefined') module.exports = root.AssemblyGuideView;
})(typeof window !== 'undefined' ? window : globalThis);
