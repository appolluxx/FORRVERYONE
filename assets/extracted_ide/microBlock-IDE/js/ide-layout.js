/* Keep the shared application header and resizable panels in flow. */
(function () {
    const main = document.querySelector('.page > .main');
    const page = document.querySelector('.page');
    const header = document.querySelector('.ide-header');
    if (!main || !page) return;
    if (window.tippy) window.tippy.setDefaultProps({ touch:false });
    const touchTitles = new Map();
    document.body.classList.toggle('ide-touch-input', navigator.maxTouchPoints > 0);
    const copyRegion = node => {
        const element = node?.nodeType === 1 ? node : node?.parentElement;
        return element?.closest('#terminal-serial-panel .xterm-rows, #code-editor, .monaco-editor, input, textarea:not(.xterm-helper-textarea), [contenteditable="true"]');
    };
    let touchCopyRegion = null;
    let lastTouchTime = -Infinity;
    function beginTouch(target) {
        lastTouchTime = performance.now();
        document.body.classList.add('ide-touch-input');
        touchCopyRegion?.classList.remove('touch-copy-region');
        touchCopyRegion = copyRegion(target);
        // Blank terminal rows are layout, not copyable output.
        if (touchCopyRegion?.classList.contains('xterm-rows') && !target.textContent?.trim()) touchCopyRegion = null;
        touchCopyRegion?.classList.add('touch-copy-region');
        if (!touchCopyRegion) window.getSelection()?.removeAllRanges();
    }
    document.addEventListener('touchstart', event => beginTouch(event.target), {capture:true, passive:true});
    // Safari can start a document-wide selection on double-tap-and-hold,
    // even when the body's user-select rule prevents an ordinary long press.
    document.addEventListener('selectstart', event => {
        if (document.body.classList.contains('ide-touch-input') &&
            (!touchCopyRegion || !touchCopyRegion.contains(event.target))) event.preventDefault();
    }, true);
    document.addEventListener('selectionchange', () => {
        if (!document.body.classList.contains('ide-touch-input')) return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) return;
        const region = copyRegion(selection.anchorNode);
        if (!region || region !== touchCopyRegion || !region.contains(selection.focusNode) ||
            (region.classList.contains('xterm-rows') && !selection.toString().trim()) ||
            !region.contains(selection.getRangeAt(0).commonAncestorContainer)) selection.removeAllRanges();
    });
    document.addEventListener('pointerdown', event => {
        const touch = event.pointerType === 'touch';
        if (!touch && (event.sourceCapabilities?.firesTouchEvents || performance.now()-lastTouchTime<1000)) return;
        document.body.classList.toggle('ide-touch-input', touch);
        if (touch) {
            beginTouch(event.target);
            if (window.tippy?.hideAll) window.tippy.hideAll({ duration:0 });
            for (let node=event.target; node && node !== document; node=node.parentElement) {
                if (node.hasAttribute('title')) {
                    touchTitles.set(node,node.getAttribute('title'));
                    node.removeAttribute('title');
                }
            }
        } else {
            touchTitles.forEach((title,node) => { if (!node.hasAttribute('title')) node.setAttribute('title',title); });
            touchTitles.clear();
        }
    }, true);
    document.addEventListener('pointermove', event => {
        if (event.pointerType === 'mouse' && !event.sourceCapabilities?.firesTouchEvents && performance.now()-lastTouchTime>=1000) document.body.classList.remove('ide-touch-input');
    }, {passive:true});
    const panels = ['terminal', 'simulator', 'note'];
    const visible = node => node && getComputedStyle(node).display !== 'none';
    const touchLayout = () => navigator.maxTouchPoints > 0 && page.clientWidth <= 1400;
    const stacked = () => touchLayout() && window.innerHeight > window.innerWidth;
    const defaultPanelWidth = () => touchLayout() ? Math.round(page.clientWidth * .34) : 640;
    function setPanelHeight(height, persist = false) {
        const maximum = Math.max(160, page.clientHeight * .65);
        const value = Math.max(Math.min(160, maximum), Math.min(maximum, Number(height) || page.clientHeight * .32));
        page.style.setProperty('--ide-panel-height', value + 'px');
        if (persist) localStorage.setItem('terminal_touch_height', value);
        return value;
    }
    function positionHandle() {
        window.updateTerminalToggle?.();
        const side = panels.slice(0, 2).map(id => document.getElementById(id)).find(visible);
        const handle = document.getElementById('terminal-h-resize');
        if (!side || !handle) return;
        // The divider is a body child, outside the page below the shared header.
        const sideRect = side.getBoundingClientRect();
        if (stacked()) { handle.style.right = '0px'; handle.style.top = sideRect.top + window.scrollY - 14 + 'px'; handle.style.height = '28px'; }
        else { handle.style.top = sideRect.top + window.scrollY + 'px'; handle.style.height = sideRect.height + 'px'; handle.style.right = page.getBoundingClientRect().right - sideRect.left - (touchLayout() ? 14 : 0) + 'px'; }
    }
    function clampPanelWidth(width, panel, minimum = 560) {
        panel = typeof panel === 'string' ? document.querySelector(panel) : panel;
        if (stacked()) return page.clientWidth;
        const others = panels.map(id => document.getElementById(id)).filter(node => node !== panel && visible(node))
            .reduce((sum, node) => sum + node.getBoundingClientRect().width, 0);
        if (touchLayout()) minimum = Math.min(minimum, 320);
        const editorMinimum = touchLayout() ? Math.max(360, page.clientWidth * .35) : 640;
        const maximum = Math.max(0, page.clientWidth - Math.min(editorMinimum, page.clientWidth) - others);
        return Math.max(Math.min(minimum, maximum), Math.min(maximum, Number(width) || minimum));
    }
    function updateHeader() {
        if (!header) return;
        const width = header.clientWidth;
        header.classList.toggle('header-compact', width < 1320);
        header.classList.toggle('header-small', width < 1100);
        header.classList.toggle('header-tight', width < 620);
        header.classList.remove('header-icons');
        header.classList.remove('header-crowded');
        if (!header.classList.contains('header-tight')) {
            const style = getComputedStyle(header);
            const groupWidth = selector => {
                const group = header.querySelector(selector);
                const widths = [...group.children].map(node => node.getBoundingClientRect().width).filter(width => width > 0);
                return widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * (parseFloat(getComputedStyle(group).columnGap) || 0);
            };
            const needed = () => {
                const left = groupWidth('.left'), right = groupWidth('.right');
                const balanced = header.classList.contains('has-app-menu') || !header.classList.contains('header-compact');
                return (balanced ? 2 * Math.max(left, right) : left + right) + header.querySelector('.header-center-actions').getBoundingClientRect().width +
                    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2 * (parseFloat(style.columnGap) || 0);
            };
            if (needed() > width) header.classList.add('header-icons');
            if (needed() > width) header.classList.add('header-crowded');
        } else header.classList.add('header-icons');
    }
    function constrainPanels() {
        page.classList.toggle('ide-touch', touchLayout());
        document.body.classList.toggle('ide-touch', touchLayout());
        document.documentElement.classList.toggle('ide-touch', touchLayout());
        document.body.classList.toggle('ide-stacked', stacked());
        page.classList.toggle('ide-panel-fullscreen', !visible(main));
        page.classList.toggle('ide-stacked', stacked());
        if (!visible(main)) { window.updateTerminalToggle?.(); return; } // Explicit full-screen Robot Lab.
        if (stacked()) setPanelHeight(localStorage.getItem('terminal_touch_height'));
        for (const id of panels) {
            const panel = document.getElementById(id);
            if (!visible(panel)) continue;
            const previousStacked = panel.dataset.stacked === 'true';
            panel.style.width = clampPanelWidth(previousStacked && !stacked() ? defaultPanelWidth() : panel.getBoundingClientRect().width, panel, id === 'note' ? 360 : 560) + 'px';
            panel.dataset.stacked = String(stacked());
        }
        positionHandle();
        updateHeader();
    }
    window.IDELayout = { clampPanelWidth, constrainPanels, touchLayout, stacked, defaultPanelWidth, setPanelHeight, positionHandle };
    function hasVisibleLabel(button){
        if(!button)return false;
        const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()){
            const node=walker.currentNode;if(!node.textContent.trim()||node.parentElement.closest('svg,i,.sim-tool-tip'))continue;
            const range=document.createRange();range.selectNodeContents(node);const rect=range.getBoundingClientRect();
            if(rect.width>0&&rect.height>0&&parseFloat(getComputedStyle(node.parentElement).fontSize)>0)return true;
        }return false;
    }
    window.IDELayout.hasVisibleLabel=hasVisibleLabel;
    const buttonNames = {
        'file-explorer-open-btn': 'Project files',
        'header-board-trigger': 'Select board',
        'upload-program': 'Upload program',
        'open-project': 'Open project',
        'save-project': 'Save project'
    };
    header.querySelectorAll('button').forEach(button => {
        const label = buttonNames[button.id] || button.textContent.trim() || button.getAttribute('title');
        if (!label) return;
        button.setAttribute('aria-label', label);
        if (typeof window.tippy === 'function') {
            const props={content:label,placement:'bottom',delay:[250,0],appendTo:()=>document.body,onShow:()=>!hasVisibleLabel(button)};
            if(button._tippy)button._tippy.setProps(props);else window.tippy(button,props);
            button.removeAttribute('title');
        } else button.setAttribute('title', label);
    });
    new ResizeObserver(updateHeader).observe(header);
    window.addEventListener('resize', constrainPanels);
    constrainPanels();
    // Phone browsers cannot reliably lock orientation without fullscreen permission.
    const rotate=document.createElement('dialog');rotate.id='phone-orientation';
    rotate.setAttribute('aria-labelledby','phone-orientation-title');
    rotate.setAttribute('aria-describedby','phone-orientation-description');
    rotate.innerHTML='<div class="orientation-brand"><img src="images/logo/icon-192x192.png" alt=""><span>roboBlocks IDE</span></div><div class="orientation-content"><div class="orientation-illustration" aria-hidden="true"><svg viewBox="0 0 200 180"><rect class="orientation-destination" x="33" y="50" width="134" height="80" rx="14"/><g class="orientation-device"><rect class="orientation-case" x="64" y="27" width="72" height="126" rx="14"/><rect class="orientation-screen" x="71" y="42" width="58" height="94" rx="6"/><path class="orientation-speaker" d="M92 35h16"/><rect class="orientation-block" x="79" y="58" width="34" height="12" rx="3"/><rect class="orientation-block secondary" x="85" y="75" width="34" height="12" rx="3"/><rect class="orientation-block" x="79" y="92" width="28" height="12" rx="3"/><circle class="orientation-home" cx="100" cy="145" r="2.5"/></g><path class="orientation-arrow" d="M151 31a70 70 0 0 1 28 39m-11-6 11 6 4-12"/></svg></div><div class="orientation-label">LANDSCAPE MODE</div><h2 id="phone-orientation-title">Rotate your device</h2><p id="phone-orientation-description">A little more room to build and code.<br>Turn your device sideways to continue.</p><span class="orientation-rule" aria-hidden="true"></span></div>';
    document.body.appendChild(rotate);rotate.addEventListener('cancel',e=>e.preventDefault());
    function phoneOrientation(){
        const size=window.IDEPhoneViewport?.dimensions()||{width:innerWidth,height:innerHeight};
        const phone=navigator.maxTouchPoints>0&&Math.min(size.width,size.height)<=500&&Math.max(size.width,size.height)<=1100;
        document.body.classList.toggle('ide-phone',phone);
        // Use the same layout condition as the SIM/Serial sidebar. Tablets
        // need this notice too when portrait switches the panels below Blocks.
        const needsLandscape = (phone && size.height > size.width) || stacked();
        if(needsLandscape){if(!rotate.open)rotate.showModal();}
        else if(rotate.open)rotate.close();
    }
    window.addEventListener('resize',phoneOrientation);window.visualViewport?.addEventListener('resize',phoneOrientation);phoneOrientation();
})();
