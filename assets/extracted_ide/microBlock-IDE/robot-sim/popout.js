(function () {
    'use strict';
    const panel = document.getElementById('terminal-robot-panel');
    const terminal = document.getElementById('terminal');
    const toolbar = panel && panel.querySelector('.motor-sim-toolbar');
    if (!toolbar || !terminal) return;
    const marker = document.createComment('Robot Lab viewport home');
    terminal.insertBefore(marker, panel);
    const button = document.createElement('button');
    button.id = 'motor-sim-popout';button.type = 'button';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7m0-7L11 13M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg><span class="sim-tool-tip" role="tooltip"></span>';
    toolbar.appendChild(button);
    let popup = null, closing = false;
    const isOpen = () => !!popup && !popup.closed;
    function label(detached) {
        button.hidden = detached;
        const text = detached ? 'Dock SIM' : 'Expand SIM';
        button.setAttribute('aria-label', text);
        button.querySelector('.sim-tool-tip').textContent = text;
    }
    function releaseButtons() {
        panel.querySelectorAll('button[aria-pressed]').forEach(node => node.dispatchEvent(new Event('blur')));
    }
    function notify() {
        window.dispatchEvent(new Event('sim-viewport-moved'));
        if (typeof restoreTerminalSerialHeight === 'function') restoreTerminalSerialHeight();
        if (typeof fitTerminalSoon === 'function') fitTerminalSoon();
    }
    function restore() {
        if (!popup) return;
        releaseButtons();
        terminal.insertBefore(panel, marker.nextSibling);
        terminal.classList.remove('sim-detached');
        popup = null;label(false);
        if (!closing) notify();
    }
    async function open() {
        if (isOpen()) { popup.focus();return; }
        const child = window.IDEToolWindows.open({id:'sim',title:'Robot Lab',width:1280,height:820,
            onResize:()=>window.dispatchEvent(new Event('sim-viewport-moved'))});
        if (!child) return;
        popup = child;
        child.addEventListener('beforeunload', restore);
        child.addEventListener('blur', releaseButtons);
        try {
            // Move the existing canvas, controls and listeners. Do not start a
            // second renderer, physics world or Python interpreter.
            const doc = child.document;
            doc.title = 'Robot Lab';
            doc.body.classList.add('sim-popout-window');
            window.installTouchSelectionGuard?.(child);
            const base = doc.createElement('base');base.href = document.baseURI;doc.head.appendChild(base);
            // Keep the live SIM docked until the new document is styled.
            // Register load listeners before attaching the link (including cache hits).
            const css = doc.createElement('link');css.rel = 'stylesheet';css.href = new URL('css/style.css', document.baseURI).href;
            const styled = new Promise((resolve, reject) => {
                css.onload = () => resolve(true);
                css.onerror = () => reject(new Error('SIM stylesheet could not be loaded'));
                child.addEventListener('beforeunload', () => resolve(false));
            });
            const style = doc.createElement('style');
            style.textContent = 'html,body{width:100%;height:100%;margin:0;overflow:hidden}body.sim-popout-window #terminal{display:flex;width:100%;height:100%;min-width:0}#terminal-robot-panel{min-height:0!important;flex:1 1 0}';
            doc.head.appendChild(style);
            const loading = doc.createElement('div');
            loading.textContent = 'Loading SIM?';loading.setAttribute('role', 'status');
            loading.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:#f5f8fc;color:#60748a;font:13px "Segoe UI",Arial,sans-serif';
            doc.body.appendChild(loading);
            doc.head.appendChild(css);
            if (!await styled || child.closed || popup !== child) return;
            if (doc.fonts?.ready) await doc.fonts.ready;
            if (child.closed || popup !== child) return;
            const host = doc.createElement('article');host.id = 'terminal';doc.body.appendChild(host);
            loading.remove();
            host.appendChild(panel);terminal.classList.add('sim-detached');label(true);
            doc.addEventListener('keydown', event => {if(event.key === 'Tab') toolbar.classList.add('is-keyboard-navigation');});
            doc.addEventListener('pointerdown', () => toolbar.classList.remove('is-keyboard-navigation'));
            notify();child.focus();
        } catch (error) {
            if (child.closed || popup !== child) return;
            restore();child.close();
            console.error('Could not detach Robot Lab.', error);
            window.alert('Could not open the SIM window. Please reopen Robot Lab.');
        }
    }
    button.onclick = () => {if(isOpen()) popup.close();else open();};
    window.SimPopout = { open, isOpen, close() {if(isOpen()) popup.close();} };
    window.addEventListener('beforeunload', () => {closing = true;if(isOpen()) popup.close();});
    label(false);
})();
