(function (root) {
    'use strict';

    const builtIns = new Map();
    const cache = new Map();
    const scriptUrl = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';

    function register(boardId, manifestUrl) {
        if (!boardId || !manifestUrl) throw new Error('Board package requires an id and manifest URL.');
        builtIns.set(String(boardId), String(manifestUrl));
    }

    async function load(boardId) {
        const id = String(boardId || '');
        if (cache.has(id)) return cache.get(id);
        const manifestUrl = builtIns.get(id);
        if (!manifestUrl) return null;
        const pending = fetch(manifestUrl, { cache: 'force-cache' }).then(response => {
            if (!response.ok) throw new Error('Could not load board package: ' + id);
            return response.json();
        }).then(manifest => {
            if (!manifest || manifest.schemaVersion !== 1 || manifest.id !== id || !manifest.model || !manifest.model.file) {
                throw new Error('Invalid board package manifest: ' + id);
            }
            const baseUrl = new URL('.', new URL(manifestUrl, document.baseURI));
            Object.defineProperty(manifest, '__baseUrl', { value: baseUrl, enumerable: false });
            return manifest;
        });
        cache.set(id, pending);
        try { return await pending; }
        catch (error) { cache.delete(id); throw error; }
    }

    function asset(manifest, path) {
        return new URL(String(path || ''), manifest.__baseUrl || document.baseURI).href;
    }

    register('atom-vx', scriptUrl ? new URL('../boards/atom-vx/package/board.json', scriptUrl).href : 'boards/atom-vx/package/board.json');
    root.BoardPackage = { register, load, asset };
})(typeof window !== 'undefined' ? window : globalThis);
