(function (root) {
    'use strict';
    function create(T, renderer, scene, options) {
        renderer.outputEncoding = T.sRGBEncoding;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        if (renderer.shadowMap) renderer.shadowMap.enabled = false;
        scene.background = new T.Color(0xf5f7fa);
        const studio = root.ProductStudioEnvironment.create(T, renderer);
        scene.environment = studio.texture;
        let finish = null;
        const fill = new T.HemisphereLight(0xffffff, 0x555555, .35);
        fill.position.set(-3, 5, 4); scene.add(fill);
        const occlusion = root.ProductSurfaceOcclusion.create(T, renderer, options);
        function apply(mesh) {
            if (mesh.geometry && mesh.geometry.isGeometry) {
                const old = mesh.geometry; mesh.geometry = new T.BufferGeometry().fromGeometry(old); old.dispose();
            }
            (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => {
                if (!material || !material.isMeshStandardMaterial) return;
                if (material.userData.productFinish) {
                    if (!finish) finish = root.ProductStudioEnvironment.create(T, renderer, true);
                    if (material.envMap !== finish.texture) { material.envMap = finish.texture; material.needsUpdate = true; }
                    material.envMapIntensity = .8;
                } else material.envMapIntensity = .35;
            });
        }
        function modelFromRoot(group) {
            const meshes = new Map();
            if (group) group.traverse(mesh => {
                if (!mesh.isMesh || mesh.userData.productArtwork || mesh.userData.editorArtworkId) return;
                if (mesh.userData.componentId || mesh.userData.assemblyPartId) { apply(mesh); meshes.set(mesh.uuid, mesh); }
            });
            return { meshes };
        }
        return { apply, modelFromRoot,
            floorMaterial: () => new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
            render(camera, model, width, height) {
                occlusion.render(scene, camera, model, width, height);
            },
            dispose() { occlusion.dispose(); studio.dispose(); if (finish) finish.dispose(); scene.remove(fill); }
        };
    }
    root.ProductViewportStyle = { create };
    if (typeof module !== 'undefined') module.exports = root.ProductViewportStyle;
})(typeof window !== 'undefined' ? window : globalThis);
