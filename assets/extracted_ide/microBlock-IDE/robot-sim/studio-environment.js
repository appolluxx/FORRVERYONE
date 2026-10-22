(function (root) {
    'use strict';
    // A small neutral studio supplies broad reflections without external HDR files.
    // It is baked once; these cards never appear in the visible viewport.
    function create(T, renderer, reflections) {
        // The finish environment has a neutral fill on every wall, including
        // floor and ceiling, so metals do not reflect a nearly black room.
        const background = reflections ? .42 : .08, fill = reflections ? .42 : .12;
        const studio = new T.Scene(); studio.background = new T.Color(background, background, background);
        const room = new T.Mesh(new T.BoxBufferGeometry(12, 10, 12), new T.MeshBasicMaterial({ color: new T.Color(fill, fill, fill), side: T.BackSide, toneMapped: false }));
        studio.add(room);
        function panel(width, height, position, intensity) {
            const mesh = new T.Mesh(new T.PlaneBufferGeometry(width, height), new T.MeshBasicMaterial({ color: new T.Color(intensity, intensity, intensity), side: T.DoubleSide, toneMapped: false }));
            mesh.position.fromArray(position); mesh.lookAt(0, 0, 0); studio.add(mesh);
        }
        panel(3, 5, [-4, 2, 2], reflections ? .81 : .32);
        panel(2, 4, [4, 1, -2], reflections ? .65 : .20);
        panel(4, 3, [0, 4, 0], reflections ? .75 : .26);
        const generator = new T.PMREMGenerator(renderer);
        try { return generator.fromScene(studio, reflections ? 0 : .12, .1, 30); }
        finally {
            generator.dispose();
            studio.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); });
        }
    }
    root.ProductStudioEnvironment = { create };
    if (typeof module !== 'undefined' && module.exports) module.exports = { create };
})(typeof window !== 'undefined' ? window : globalThis);
