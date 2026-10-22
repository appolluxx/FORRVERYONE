/* One shared, retryable load for both code editors. */
(function () {
    'use strict';
    let pending;
    const loaded = new Set();
    function asset(url, css) {
        if (loaded.has(url)) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const node = document.createElement(css ? 'link' : 'script');
            if (css) { node.rel = 'stylesheet'; node.href = url; }
            else { node.src = url; node.async = false; }
            node.onload = () => { loaded.add(url); resolve(); };
            node.onerror = () => { node.remove(); reject(new Error('Could not load code editor: ' + url)); };
            document.head.appendChild(node);
        });
    }
    window.IDEMonaco = { load() {
        if (pending) return pending;
        pending = (async () => {
            await asset('monaco-editor/min/vs/editor/editor.main.css', true);
            if (!window.monaco?.editor) {
                await asset('monaco-editor/min/vs/loader.js');
                await asset('monaco-editor/min/vs/editor/editor.main.nls.js');
                await asset('monaco-editor/min/vs/editor/editor.main.js');
            }
            if (!window.monaco?.editor) throw new Error('Code editor initialization failed');
            return window.monaco;
        })().catch(error => { pending = null; throw error; });
        return pending;
    }};
})();
