/* Authored assembly instructions. Component poses remain the completed product. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.ProductAssemblyGuide = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const list = value => Array.isArray(value) ? value : [];
    const clone = value => JSON.parse(JSON.stringify(value));
    const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
    function base(manifest) {
        const components = list(manifest.components), ids = new Set(components.map(part => part.id));
        const fixed = components.find(part => part.fixed), firstMate = list(manifest.mates).find(mate => ids.has(mate.a));
        return fixed ? fixed.id : firstMate ? firstMate.a : components.length ? components[0].id : '';
    }
    function normalize(raw, manifest) {
        if (raw === undefined || raw === null) return undefined;
        if (typeof raw !== 'object' || Array.isArray(raw)) return raw;
        const guide = clone(raw), components = new Map(list(manifest && manifest.components).map(part => [part.id, part]));
        if (guide.enabled === undefined) guide.enabled = true;
        if (guide.baseComponentId === undefined) guide.baseComponentId = base(manifest || {});
        if (guide.steps === undefined) guide.steps = [];
        if (Array.isArray(guide.steps)) guide.steps = guide.steps.map((rawStep, index) => {
            if (!rawStep || typeof rawStep !== 'object' || Array.isArray(rawStep)) return rawStep;
            const step = Object.assign({ id: 'step-' + (index + 1), instruction: '', mateIds: [] }, rawStep);
            if (step.title === undefined) step.title = 'Install ' + ((components.get(step.componentId) || {}).name || step.componentId || 'component');
            return step;
        });
        return guide;
    }
    function inspect(manifest, guide) {
        const errors = [], fail = text => errors.push(text);
        if (!guide || typeof guide !== 'object' || Array.isArray(guide)) { fail('Invalid assembly guide.'); return errors; }
        if (typeof guide.enabled !== 'boolean') fail('Assembly guide enabled must be a boolean.');
        const components = new Set(list(manifest.components).map(part => part.id));
        if (!components.has(guide.baseComponentId)) fail('Select an existing component as the assembly guide base.');
        if (!Array.isArray(guide.steps)) { fail('Assembly guide steps must be a list.'); return errors; }
        const mates = new Map(list(manifest.mates).map(mate => [mate.id, mate])), installed = new Set([guide.baseComponentId]), stepIds = new Set(), usedMates = new Set();
        guide.steps.forEach((step, index) => {
            const label = 'Assembly step ' + (index + 1);
            if (!step || typeof step !== 'object' || Array.isArray(step)) { fail(label + ' is invalid.'); return; }
            if (!validId(step.id) || stepIds.has(step.id)) fail(label + ' requires a unique ID.');
            stepIds.add(step.id);
            if (!components.has(step.componentId)) fail(label + ' references a missing component.');
            if (installed.has(step.componentId)) fail(label + ' repeats an installed component.');
            if (step.companionIds !== undefined && !Array.isArray(step.companionIds)) fail(label + ' companions must be a list.');
            const group = new Set([step.componentId]);
            list(step.companionIds).forEach(id => {
                if (!components.has(id) || installed.has(id) || group.has(id)) fail(label + ' has an invalid or repeated companion.');
                group.add(id);
            });
            if (typeof step.title !== 'string' || !step.title.trim()) fail(label + ' requires a title.');
            if (typeof step.instruction !== 'string') fail(label + ' instructions must be text.');
            if (step.approachDirection !== undefined && (!Array.isArray(step.approachDirection) || step.approachDirection.length!==3 || !step.approachDirection.every(Number.isFinite) || step.approachDirection.every(v=>v===0))) fail(label+' insertion direction is invalid.');
            if (step.cameraMode !== undefined && !['auto','fixed'].includes(step.cameraMode)) fail(label+' camera mode is invalid.');
            if (step.workbenchComponentIds !== undefined && (!Array.isArray(step.workbenchComponentIds) || !step.workbenchComponentIds.includes(step.componentId) || step.workbenchComponentIds.some(id=>!components.has(id)))) fail(label+' workbench must include the current part and existing components only.');
            if (step.cameraDirection !== undefined && (!Array.isArray(step.cameraDirection) || step.cameraDirection.length !== 3 || !step.cameraDirection.every(Number.isFinite) || step.cameraDirection.every(value => value === 0))) fail(label + ' camera direction must contain three finite numbers and a direction.');
            const jointIds = list(step.jointIds);
            if (!Array.isArray(step.mateIds) || (!step.mateIds.length && !jointIds.length && step.placementOnly !== true)) fail(label + ' requires at least one mate to an earlier component.');
            if (step.jointIds !== undefined && !Array.isArray(step.jointIds)) fail(label + ' joint references must be a list.');
            if (step.placementOnly !== undefined && typeof step.placementOnly !== 'boolean') fail(label + ' placement only must be a boolean.');
            jointIds.forEach(id => {
                const joint = list(manifest.joints).find(item => item.id === id);
                if (!joint) fail(label + ' references a missing joint: ' + id);
                else if (joint.child !== step.componentId) fail(label + ' joint does not attach its component.');
                else if (!installed.has(joint.parent)) fail(label + ' must follow the component it attaches to: ' + joint.parent);
            });
            list(step.mateIds).forEach(id => {
                const mate = mates.get(id);
                if (!mate) { fail(label + ' references a missing mate: ' + id); return; }
                if (usedMates.has(id)) fail('Assembly mate ' + id + ' appears in more than one step.');
                usedMates.add(id);
                const other = mate.a === step.componentId ? mate.b : mate.b === step.componentId ? mate.a : null;
                if (!other) fail(label + ' mate does not belong to its component.');
                else if (!installed.has(other)) fail(label + ' must follow the component it attaches to: ' + other);
            });
            installed.add(step.componentId);
            list(step.companionIds).forEach(id => installed.add(id));
        });
        return errors;
    }
    function validate(manifest) {
        const guide = normalize(manifest.assemblyGuide, manifest);
        if (guide === undefined) return undefined;
        // A disabled draft may retain references while the product is being split.
        if (guide && guide.enabled === false) return guide;
        const errors = inspect(manifest, guide);
        if (errors.length) throw new Error(errors[0]);
        return guide;
    }
    function infer(manifest, options) {
        options = options || {};
        const previous = normalize(options.previous === undefined ? manifest.assemblyGuide : options.previous, manifest) || {};
        const components = list(manifest.components), ids = new Set(components.map(part => part.id));
        const baseId = options.baseComponentId || (ids.has(previous.baseComponentId) && previous.baseComponentId) || base(manifest);
        const mates = list(manifest.mates).filter(mate => ids.has(mate.a) && ids.has(mate.b) && mate.a !== mate.b);
        const prior = new Map(list(previous.steps).filter(Boolean).map(step => [step.componentId, step]));
        const order = new Map(list(previous.steps).filter(Boolean).map((step, index) => [step.componentId, index]));
        const installed = new Set([baseId]), steps = [], usedIds = new Set();
        while (installed.size < components.length) {
            const candidates = components.filter(part => !installed.has(part.id)).map(part => {
                const first = mates.findIndex(mate => mate.a === part.id && installed.has(mate.b) || mate.b === part.id && installed.has(mate.a));
                  const authored = prior.get(part.id);
                  const jointReady = list(authored && authored.jointIds).some(id => list(manifest.joints).some(joint => joint.id === id && joint.child === part.id && installed.has(joint.parent)));
                  return { part, first, allowed: first >= 0 || jointReady || !!(authored && authored.placementOnly === true), priority: order.has(part.id) ? order.get(part.id) : Number.MAX_SAFE_INTEGER };
              }).filter(item => item.allowed).sort((a, b) => a.priority - b.priority || a.first - b.first);
            if (!candidates.length) break;
            const part = candidates[0].part, old = prior.get(part.id), step = old ? clone(old) : { id: 'install-' + part.id, componentId: part.id, title: 'Install ' + (part.name || part.id), instruction: '' };
            let id = validId(step.id) ? step.id : 'install-' + part.id, suffix = 2;
            while (usedIds.has(id)) id = 'install-' + part.id + '-' + suffix++;
            step.id = id; usedIds.add(id);
            step.mateIds = mates.filter(mate => mate.a === part.id && installed.has(mate.b) || mate.b === part.id && installed.has(mate.a)).map(mate => mate.id);
            steps.push(step); installed.add(part.id);list(step.companionIds).forEach(id=>installed.add(id));
        }
        return Object.assign({},previous,{ enabled: options.enabled === undefined ? previous.enabled !== false : !!options.enabled, baseComponentId: baseId, steps });
    }
    function plan(manifest) {
        const guide = normalize(manifest.assemblyGuide, manifest);
        if (!guide || guide.enabled === false) return { enabled: false, baseComponentId: '', steps: [], errors: [], complete: false };
        const errors = inspect(manifest, guide), components = list(manifest.components), byId = new Map(components.map(part => [part.id, part]));
        const steps = list(guide.steps).filter(step => step && byId.has(step.componentId)).map(step => {
            const part = byId.get(step.componentId);
            return Object.assign({}, clone(step), { targetPose: { position: clone(part.position || [0, 0, 0]), rotation: clone(part.rotation || [0, 0, 0]), scale: clone(part.scale || [1, 1, 1]) } });
        });
        const installed = new Set([guide.baseComponentId].concat(steps.flatMap(step => [step.componentId].concat(list(step.companionIds)))));
        if (components.length < 2) errors.push('Split the model or add separate components before creating assembly steps.');
        components.forEach(part => { if (!installed.has(part.id)) errors.push('Add a mate and assembly step for ' + (part.name || part.id) + '.'); });
        const used = new Set(steps.reduce((all, step) => all.concat(list(step.mateIds)), []));
        list(manifest.mates).forEach(mate => { if (!used.has(mate.id)) errors.push('Include mate ' + mate.id + ' in the later component\'s assembly step.'); });
        return { enabled: true, baseComponentId: guide.baseComponentId, steps, errors, complete: !errors.length && steps.length > 0 };
    }
    return { normalize, infer, plan, validate };
});
