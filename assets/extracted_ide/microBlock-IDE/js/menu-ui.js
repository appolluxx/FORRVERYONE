// HTML menus are shared by Electron, browsers and installed PWAs.
(() => {
    const header = document.querySelector('.ide-header');
    if (!header || !window.IDEApplicationMenus) return;
    const nav = document.createElement('nav');
    nav.className = 'ide-app-menu';
    nav.setAttribute('role', 'menubar');
    nav.setAttribute('aria-label', 'Application menu');
    const popup = document.createElement('div');
    popup.id = 'ide-menu-popup';
    popup.className = 'ide-menu-popup';
    popup.setAttribute('role', 'menu');
    popup.hidden = true;
    document.body.appendChild(popup);
    const buttons = [];
    let active = -1, trail = [], previousFocus = null;
    const rows = () => [...popup.querySelectorAll('button:not(:disabled)')];

    function close(restoreFocus = false) {
        const owner = buttons[active];
        popup.hidden = true;
        buttons.forEach(button => button.setAttribute('aria-expanded', 'false'));
        active = -1;
        trail = [];
        if (restoreFocus) owner?.focus();
    }
    function position() {
        if (active < 0) return;
        const rect = buttons[active].getBoundingClientRect();
        const top = rect.bottom + 8;
        popup.style.maxHeight = Math.max(80, innerHeight - top - 12) + 'px';
        popup.style.left = Math.max(8, Math.min(rect.left, innerWidth - popup.offsetWidth - 8)) + 'px';
        popup.style.top = top + 'px';
    }
    function render(focusFirst = false) {
        popup.replaceChildren();
        const current = trail[trail.length - 1];
        popup.setAttribute('aria-label', current.label);
        if (trail.length > 1) {
            const back = document.createElement('button');
            back.type = 'button';
            back.className = 'ide-menu-back';
            back.setAttribute('role', 'menuitem');
            back.textContent = '‹  ' + current.label;
            back.addEventListener('click', () => { trail.pop(); render(true); });
            popup.appendChild(back);
        }
        current.submenu.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('hr');
                separator.setAttribute('role', 'separator');
                popup.appendChild(separator);
                return;
            }
            const row = document.createElement('button');
            row.type = 'button';
            row.tabIndex = -1;
            row.setAttribute('role', item.type === 'checkbox' ? 'menuitemcheckbox' : item.type === 'radio' ? 'menuitemradio' : 'menuitem');
            if (['checkbox', 'radio'].includes(item.type)) row.setAttribute('aria-checked', String(!!item.checked));
            if (item.submenu) row.setAttribute('aria-haspopup', 'menu');
            const mark = document.createElement('span');
            mark.className = 'ide-menu-check';
            mark.textContent = item.checked ? '✓' : '';
            mark.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span');
            label.textContent = item.label;
            const hint = document.createElement('span');
            hint.className = 'ide-menu-hint';
            hint.textContent = item.submenu ? '›' : item.accelerator || item.shortcut || '';
            hint.setAttribute('aria-hidden', 'true');
            row.append(mark, label, hint);
            row.addEventListener('click', () => {
                if (item.submenu) { trail.push(item); render(true); return; }
                close();
                if (previousFocus?.isConnected) previousFocus.focus({ preventScroll:true });
                try {
                    Promise.resolve(item.click?.({ checked:!item.checked })).catch(error => NotifyE(error.message || String(error)));
                } catch (error) { NotifyE(error.message || String(error)); }
            });
            popup.appendChild(row);
        });
        popup.hidden = false;
        position();
        if (focusFirst) rows()[0]?.focus();
    }
    function open(index, keyboard = false) {
        if (active < 0 && !nav.contains(document.activeElement)) previousFocus = document.activeElement;
        active = index;
        trail = [IDEApplicationMenus.items()[index]];
        buttons.forEach((button, i) => {
            button.setAttribute('aria-expanded', String(i === index));
            button.tabIndex = i === index ? 0 : -1;
        });
        render(keyboard);
    }
    IDEApplicationMenus.items().forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        button.setAttribute('role', 'menuitem');
        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-controls', popup.id);
        button.setAttribute('aria-expanded', 'false');
        button.tabIndex = index === 0 ? 0 : -1;
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => active === index ? close() : open(index));
        button.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse' && active >= 0 && active !== index) open(index);
        });
        button.addEventListener('keydown', event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault(); open(index, true);
                if (event.key === 'ArrowUp') rows().at(-1)?.focus();
            } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
                    (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
                buttons.forEach((entry, i) => { entry.tabIndex = i === next ? 0 : -1; });
                buttons[next].focus();
                if (active >= 0) open(next);
            } else if (event.key === 'Escape') { close(); previousFocus?.focus(); }
        });
        buttons.push(button);
        nav.appendChild(button);
    });
    nav.addEventListener('focusin', event => {
        if (event.relatedTarget && !nav.contains(event.relatedTarget) && !popup.contains(event.relatedTarget)) previousFocus = event.relatedTarget;
    });
    popup.addEventListener('keydown', event => {
        const entries = rows(), index = entries.indexOf(document.activeElement);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 :
                (index + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
            entries[next]?.focus();
        } else if (event.key === 'Escape') { event.preventDefault(); close(true); }
        else if (event.key === 'Tab') { close(true); }
        else if (event.key === 'ArrowLeft' && trail.length > 1) { event.preventDefault(); trail.pop(); render(true); }
        else if (event.key === 'ArrowRight' && document.activeElement.getAttribute('aria-haspopup') === 'menu') {
            event.preventDefault(); document.activeElement.click();
        } else if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault(); open((active + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length, true);
        }
    });
    document.addEventListener('pointerdown', event => {
        if (!nav.contains(event.target) && !popup.contains(event.target)) close();
    }, true);
    document.addEventListener('keydown', event => {
        if (event.key === 'F10' && !event.shiftKey) {
            event.preventDefault(); previousFocus = document.activeElement; buttons[0].focus();
        } else if (event.altKey && !event.ctrlKey && !event.metaKey) {
            const index = buttons.findIndex(button => button.textContent[0].toLowerCase() === event.key.toLowerCase());
            if (index >= 0) { event.preventDefault(); open(index, true); }
        }
    });
    window.addEventListener('resize', () => close());
    window.addEventListener('blur', () => close());
    header.classList.add('has-app-menu');
    header.querySelector('.header-logo').insertBefore(nav, header.querySelector('.project-name-group'));
    window.dispatchEvent(new Event('resize'));
})();

