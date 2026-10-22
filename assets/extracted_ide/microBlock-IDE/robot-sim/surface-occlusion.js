(function (root) {
    'use strict';
    // Screen-space outlines only; ambient occlusion is disabled. The beauty pass still
    // renders directly to the antialiased canvas; grid, labels and images stay sharp.
    function create(T, renderer, options) {
        options = options || {};
        // r123 uses DEPTH_COMPONENT16 without stencil. Packed depth/stencil
        // keeps small, overlapping CAD surfaces correctly ordered for AO.
        const target = new T.WebGLRenderTarget(1, 1, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, stencilBuffer: true });
        const depthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, blending: T.NoBlending, side: T.DoubleSide });
        const partsTarget = new T.WebGLRenderTarget(1, 1, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, stencilBuffer: true });
        const partsMaterial = new T.ShaderMaterial({
            vertexShader: 'attribute float editorPartId; varying float vPartId; void main(){vPartId=editorPartId;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
            fragmentShader: 'varying float vPartId; void main(){float id=floor(vPartId+0.5);gl_FragColor=vec4(mod(id,256.0),mod(floor(id/256.0),256.0),floor(id/65536.0),255.0)/255.0;}',
            side: T.DoubleSide, blending: T.NoBlending, toneMapped: false
        });
        let nextPartId = 1;
        const preparedGeometry = new WeakSet();
        function prepareParts(mesh, model) {
            const geometry = mesh.geometry;
            if (preparedGeometry.has(geometry)) return;
            const values = new Float32Array(geometry.attributes.position.count);
            const fallback = nextPartId++; values.fill(fallback);
            const prepared = model.prepared && model.prepared.get(mesh.userData.componentId);
            const nodes = new Map(((prepared && prepared.data.nodes) || geometry.userData.productNodes || []).map(node => [node.id, node.group === undefined ? node.id : node.group]));
            const ids = new Map(), indices = geometry.index && geometry.index.array;
            // Linear ID assignment only: no edge welding or adjacency search.
            // Material primitives belonging to one original GLB part share an ID.
            (geometry.userData.brepFaces || []).forEach(face => {
                if (face.sourceNode === undefined) return;
                const group = nodes.has(face.sourceNode) ? nodes.get(face.sourceNode) : face.sourceNode;
                if (!ids.has(group)) ids.set(group, nextPartId++);
                const id = ids.get(group);
                for (let i = face.first * 3, end = (face.last + 1) * 3; i < end; i++) values[indices ? indices[i] : i] = id;
            });
            geometry.setAttribute('editorPartId', new T.BufferAttribute(values, 1));
            preparedGeometry.add(geometry);
        }
        const material = new T.ShaderMaterial({
            uniforms: { depthMap: { value: target.texture }, partsMap: { value: partsTarget.texture }, edgeStrength: { value: Number.isFinite(options.edgeStrength) ? Math.max(0, Math.min(1, options.edgeStrength)) : .06 }, inverseProjection: { value: new T.Matrix4() }, pixel: { value: new T.Vector2(1, 1) } },
            vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
            fragmentShader: [
                '#include <packing>',
                'uniform sampler2D depthMap,partsMap; uniform float edgeStrength; uniform mat4 inverseProjection;',
                'uniform vec2 pixel; varying vec2 vUv;',
                'float depthAt(vec2 uv){return unpackRGBAToDepth(texture2D(depthMap,uv));}',
                'vec3 positionAt(vec2 uv,float depth){vec4 p=inverseProjection*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);return p.xyz/p.w;}',
                'float partEdge(vec3 id,vec2 uv){return step(0.001,length(id-texture2D(partsMap,clamp(uv,vec2(0.0),vec2(1.0))).rgb));}',
                'vec3 safeNormal(vec3 a,vec3 b){vec3 n=cross(a,b);return n/max(length(n),0.000000000001);}',
                'void main(){',
                'float depth=depthAt(vUv); if(depth>=0.999999){gl_FragColor=vec4(1.0);return;}',
                'vec3 p=positionAt(vUv,depth);',
                'vec2 dx=vec2(pixel.x,0.0),dy=vec2(0.0,pixel.y);',
                'vec3 l=positionAt(vUv-dx,depthAt(vUv-dx)),r=positionAt(vUv+dx,depthAt(vUv+dx));',
                'vec3 b=positionAt(vUv-dy,depthAt(vUv-dy)),t=positionAt(vUv+dy,depthAt(vUv+dy));',
                'vec3 vx=abs(r.z-p.z)<abs(p.z-l.z)?r-p:p-l;',
                'vec3 vy=abs(t.z-p.z)<abs(p.z-b.z)?t-p:p-b;',
                'vec3 id=texture2D(partsMap,vUv).rgb;',
                'float edge=max(max(partEdge(id,vUv-dx*0.5),partEdge(id,vUv+dx*0.5)),max(partEdge(id,vUv-dy*0.5),partEdge(id,vUv+dy*0.5)));',
                // Compare slopes rather than raw depth so tilted flat faces have no false outlines.
                'float bendX=1.0-dot(safeNormal(p-l,vy),safeNormal(r-p,vy));',
                'float bendY=1.0-dot(safeNormal(vx,p-b),safeNormal(vx,t-p));',
                'edge=max(edge,smoothstep(0.15,0.4,max(bendX,bendY)));',

                'gl_FragColor=vec4(vec3(1.0-edgeStrength*edge),1.0);',
                '}'
            ].join('\n'),
            depthTest: false, depthWrite: false, transparent: true, toneMapped: false,
            blending: T.CustomBlending, blendSrc: T.ZeroFactor, blendDst: T.SrcColorFactor,
            blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor
        });
        const overlay = new T.Scene(), overlayCamera = new T.Camera(), quad = new T.Mesh(new T.PlaneBufferGeometry(2, 2), material);
        quad.frustumCulled = false; overlay.add(quad);
        let width = 0, height = 0;
        let auxiliaryReady = false;
        const lastCamera = new T.Matrix4(), lastProjection = new T.Matrix4(), snapshots = new WeakMap();
        let lastMeshCount = -1;
        function render(scene, camera, model, viewWidth, viewHeight) {
            if (!model || !viewWidth || !viewHeight) { renderer.render(scene, camera); return; }
            const nextWidth = Math.max(1, Math.floor(viewWidth)), nextHeight = Math.max(1, Math.floor(viewHeight));
            if (width !== nextWidth || height !== nextHeight) {
                auxiliaryReady = false;
                width = nextWidth; height = nextHeight; target.setSize(width, height); partsTarget.setSize(width, height); material.uniforms.pixel.value.set(1 / width, 1 / height);
            }
            material.uniforms.inverseProjection.value.copy(camera.projectionMatrix).invert();
            scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
            let changed = !auxiliaryReady || !lastCamera.equals(camera.matrixWorld) || !lastProjection.equals(camera.projectionMatrix) || lastMeshCount !== model.meshes.size;
            model.meshes.forEach(mesh => {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                const mask = materials.map(value => value.userData.viewOpacity < 1 || value.isMeshBasicMaterial ? '0' : '1').join('');
                const prior = snapshots.get(mesh);
                if (!prior || prior.geometry !== mesh.geometry || prior.groups !== mesh.geometry.groups || prior.visible !== mesh.visible || prior.opacity !== mesh.userData.viewOpacity || prior.mask !== mask || !prior.matrix.equals(mesh.matrixWorld)) changed = true;
                snapshots.set(mesh, { geometry: mesh.geometry, groups: mesh.geometry.groups, visible: mesh.visible, opacity: mesh.userData.viewOpacity, mask, matrix: prior ? prior.matrix.copy(mesh.matrixWorld) : mesh.matrixWorld.clone() });
            });
            if (changed) {
            auxiliaryReady = false;
            const saved = { target: renderer.getRenderTarget(), clear: renderer.getClearColor(new T.Color()), alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear, background: scene.background, override: scene.overrideMaterial };
            const hidden = [], meshes = new Set(model.meshes.values()), depthMeshes = [];
            // Exclude artwork and helper geometry without modifying source materials.
            scene.traverse(object => {
                if (object.visible && (object.isMesh || object.isLine || object.isPoints || object.isSprite) && (!meshes.has(object) || object.userData.viewOpacity < 1)) { hidden.push(object); object.visible = false; }
            });
            try {
                scene.background = null; scene.overrideMaterial = null;
                meshes.forEach(mesh => {
                    if (!mesh.visible) return;
                    const original = mesh.material, groups = mesh.geometry.groups;
                    // Invisible physical anchors can contain visible appearance meshes.
                    // Leave their materials hidden without hiding their children.
                    if ((Array.isArray(original) ? original : [original]).every(material => material.visible === false)) return;
                    depthMeshes.push({ mesh, material: original, groups });
                    const materials = Array.isArray(original) ? original : [original];
                    if (materials.some(material => material.userData.viewOpacity < 1 || material.isMeshBasicMaterial)) {
                        mesh.material = [depthMaterial]; mesh.geometry.groups = [];
                        const ranges = groups.length ? groups : [{ start: 0, count: mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count, materialIndex: 0 }];
                        ranges.forEach(group => {
                            if (materials[group.materialIndex].userData.viewOpacity < 1 || materials[group.materialIndex].isMeshBasicMaterial) return;
                            const last = mesh.geometry.groups[mesh.geometry.groups.length-1];
                            if (last && last.start+last.count === group.start) last.count += group.count;
                            else mesh.geometry.addGroup(group.start, group.count, 0);
                        });
                    } else mesh.material = depthMaterial;
                });
                renderer.setClearColor(0xffffff, 1); renderer.autoClear = true;
                renderer.setRenderTarget(target); renderer.render(scene, camera);
                depthMeshes.forEach(entry => {
                    prepareParts(entry.mesh, model);
                    entry.mesh.material = Array.isArray(entry.mesh.material) ? [partsMaterial] : partsMaterial;
                });
                renderer.setClearColor(0x000000, 1);
                renderer.setRenderTarget(partsTarget); renderer.render(scene, camera);
            } finally {
                depthMeshes.forEach(entry => { entry.mesh.material = entry.material; entry.mesh.geometry.groups = entry.groups; });
                hidden.forEach(object => { object.visible = true; });
                scene.background = saved.background; scene.overrideMaterial = saved.override;
                renderer.setClearColor(saved.clear, saved.alpha); renderer.setRenderTarget(saved.target); renderer.autoClear = saved.autoClear;
            }
            lastCamera.copy(camera.matrixWorld); lastProjection.copy(camera.projectionMatrix); lastMeshCount = model.meshes.size;
            auxiliaryReady = true;
            }
            renderer.render(scene, camera);
            const autoClear = renderer.autoClear;
            try { renderer.autoClear = false; renderer.render(overlay, overlayCamera); }
            finally { renderer.autoClear = autoClear; }
        }
        return { render, dispose() { target.dispose(); partsTarget.dispose(); depthMaterial.dispose(); partsMaterial.dispose(); material.dispose(); quad.geometry.dispose(); } };
    }
    root.ProductSurfaceOcclusion = { create };
    if (typeof module !== 'undefined' && module.exports) module.exports = { create };
})(typeof window !== 'undefined' ? window : globalThis);
