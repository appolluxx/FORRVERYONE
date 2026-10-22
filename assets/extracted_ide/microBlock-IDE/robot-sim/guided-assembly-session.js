(function (root) {
    'use strict';
    const clone = value => JSON.parse(JSON.stringify(value));
    const list = value => Array.isArray(value) ? value : [];

    // Persist only progress, never a partly dismantled version of the product.
    // Changing a target pose, model selection, mate or step invalidates old progress.
    function digest(value) {
        let hash = 2166136261, length = 0;
        function write(text) {
            length += text.length;
            for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
        }
        // Stream large inline meshes into the hash rather than allocating another
        // complete JSON string and one temporary string per geometry array.
        function visit(item) {
            if (Array.isArray(item) || typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(item)) {
                write('[');
                for (let index = 0; index < item.length; index++) { if (index) write(','); visit(item[index]); }
                write(']');
            } else if (item && typeof item === 'object') {
                write('{');
                Object.keys(item).sort().filter(key => item[key] !== undefined).forEach((key, index) => {
                    if (index) write(','); write(JSON.stringify(key)); write(':'); visit(item[key]);
                });
                write('}');
            } else write(JSON.stringify(item) || 'null');
        }
        visit(value);
        return (hash >>> 0).toString(16) + '-' + length;
    }
    function fingerprint(manifest) {
        // Workbench visibility is presentation only. Adding/changing it must
        // not discard a learner's already completed mechanical steps.
        const guide = Object.assign({}, manifest.assemblyGuide);
        delete guide.workbenches;
        if (Array.isArray(guide.steps)) guide.steps = guide.steps.map(step => {
            const mechanicalStep = Object.assign({}, step);
            delete mechanicalStep.workbenchComponentIds;
            delete mechanicalStep.workbenchLabel;
            return mechanicalStep;
        });
        return 'guide-1-' + digest({ id: manifest.id, version: manifest.version, guide: manifest.assemblyGuide ? guide : manifest.assemblyGuide,
            components: list(manifest.components).map(component => {
                const result = {};
                ['id', 'asset', 'preparedAsset', 'geometry', 'format', 'unit', 'assetTransform', 'sourceNodes', 'primitive', 'position', 'rotation', 'scale'].forEach(key => { if (component[key] !== undefined) result[key] = component[key]; });
                return result;
            }), mates: manifest.mates, joints: manifest.joints });
    }
    function updateWorld(object) {
        let top = object;
        while (top.parent) top = top.parent;
        top.updateMatrixWorld(true);
    }
    function inverse(T, matrix) {
        const result = new T.Matrix4();
        if (result.invert) return result.copy(matrix).invert();
        return result.getInverse(matrix);
    }
    function decompose(T, matrix) {
        const position = new T.Vector3(), quaternion = new T.Quaternion(), scale = new T.Vector3();
        matrix.decompose(position, quaternion, scale);
        return { position: position.toArray(), quaternion: quaternion.toArray(), scale: scale.toArray() };
    }
    // The preview and the moving part may belong to different transformed groups.
    // Return an animation endpoint in the moving part's own parent coordinates.
    function snapPose(T, dragged, target) {
        updateWorld(target); updateWorld(dragged);
        const matrix = target.matrixWorld.clone();
        if (dragged.parent) matrix.premultiply(inverse(T, dragged.parent.matrixWorld));
        return decompose(T, matrix);
    }
    function bounds(T, mesh) {
        updateWorld(mesh);
        if (mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position) {
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        }
        return new T.Box3().setFromObject(mesh);
    }
    function dropGeometry(T, dragged, target, options) {
        const targetBox = bounds(T, target), draggedBox = bounds(T, dragged), center = new T.Vector3(), draggedCenter = new T.Vector3(), size = new T.Vector3();
        targetBox.getCenter(center); draggedBox.getCenter(draggedCenter); targetBox.getSize(size);
        // Geometry centres matter: split GLB parts retain the original assembly's
        // origin, which can be far outside the visible wheel, nut or PCB.
        const distance = targetBox.isEmpty() || draggedBox.isEmpty() ? Infinity : center.distanceTo(draggedCenter);
        const configured = options && options.threshold;
        const threshold = typeof configured === 'number' && Number.isFinite(configured) && configured > 0 ? configured : Math.max(.006, Math.min(.035, size.length() * .3));
        return { distance, threshold, targetCenter: center.toArray(), pose: snapPose(T, dragged, target), worldPose: decompose(T, target.matrixWorld) };
    }
    function create(rawManifest, savedProgress) {
        const manifest = clone(rawManifest || {});
        const guideAPI = root.ProductAssemblyGuide || (typeof require === 'function' ? require('./product-assembly-guide.js') : null);
        if (!guideAPI) throw new Error('Assembly guide support is unavailable.');
        const plan = guideAPI.plan(manifest), revision = fingerprint(manifest);
        const steps = clone(list(plan.steps)), enabled = !!plan.enabled, ready = enabled && !!plan.complete;
        const errors = list(plan.errors).slice(), base = plan.baseComponentId;
        let count = 0;
        const saved = savedProgress;
        if (ready && saved && saved.schema === 1 && saved.productId === (manifest.id || '') && saved.guideRevision === revision &&
            Number.isInteger(saved.completedCount) && saved.completedCount >= 0 && saved.completedCount <= steps.length &&
            saved.lastStepId === (saved.completedCount ? steps[saved.completedCount - 1].id : null)) count = saved.completedCount;
        function currentStep() { return ready && count < steps.length ? clone(steps[count]) : null; }
        function installedIds() { return ready ? [base].concat(steps.slice(0, count).flatMap(step => [step.componentId].concat(list(step.companionIds)))) : []; }
        function status() { return { enabled, ready, errors: errors.slice(), completedCount: count, totalSteps: steps.length,
            complete: ready && count === steps.length, currentStep: currentStep(), installedIds: installedIds() }; }
        function serialize() { return { schema: 1, productId: manifest.id || '', guideRevision: revision,
            completedCount: count, lastStepId: count ? steps[count - 1].id : null }; }
        function selectionError(id) {
            if (!ready) return { accepted: false, code: 'unavailable', reason: errors[0] || 'This product has no complete assembly guide.' };
            if (count === steps.length) return { accepted: false, code: 'complete', reason: 'Assembly is complete.' };
            if (steps[count].componentId !== id) return { accepted: false, code: 'wrong-component', reason: 'Choose the component for the current step.' };
            return null;
        }
        function testDrop(T, componentId, dragged, target, options) {
            const error = selectionError(componentId);
            if (error) return error;
            if (!dragged || !target || !dragged.matrixWorld || !target.matrixWorld) return { accepted: false, code: 'missing-target', reason: 'The assembly target is unavailable.' };
            const result = dropGeometry(T, dragged, target, options);
            const valid = Number.isFinite(result.distance) && result.distance <= result.threshold;
            return Object.assign(result, { accepted: valid, code: valid ? 'ready' : 'too-far', reason: valid ? '' : 'Move the component closer to the highlighted position.' });
        }
        function completeStep(componentId) {
            const error = selectionError(componentId);
            if (error) return error;
            const step = clone(steps[count]); count++;
            return { accepted: true, step, status: status() };
        }
        function place(T, componentId, dragged, target, options) {
            const result = testDrop(T, componentId, dragged, target, options);
            if (result.accepted) Object.assign(result, completeStep(componentId));
            return result;
        }
        return { enabled, ready, errors, revision, baseComponentId: base, currentStep,
            steps: () => clone(steps), installedIds, isInstalled: id => installedIds().indexOf(id) !== -1,
            installedMateIds: () => Array.from(new Set(steps.slice(0, count).reduce((ids, step) => ids.concat(list(step.mateIds)), []))),
            canSelect: id => !selectionError(id), status, serialize, testDrop, place, completeStep,
            back() { count = Math.max(0, count - 1); return status(); },
            reset() { count = 0; return status(); }
        };
    }
    const api = { create, fingerprint, snapPose, dropGeometry };
    root.GuidedAssemblySession = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
