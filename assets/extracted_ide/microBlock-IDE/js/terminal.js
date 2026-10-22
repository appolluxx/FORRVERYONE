let term = null, fitAddon = null;
let terminalShowFlag = false;
let beforeWidthTerminalSize = IDELayout.defaultPanelWidth();
const terminalSizeKey = IDELayout.touchLayout() ? "terminal_touch_size" : "terminal_size";
const terminalSerialKey = IDELayout.touchLayout() ? "terminal_touch_serial_height" : "terminal_serial_height";

const MINIMUM_TERMINAL_WIDTH = 560;
const DEFAULT_TERMINAL_SERIAL_HEIGHT = 160;
const MINIMUM_TERMINAL_SERIAL_HEIGHT = 90;

function fitTerminalSoon() {
    if (!fitAddon) return;
    setTimeout(() => {
        try {
            fitAddon.fit();
            fitAddon.fit();
        } catch (error) {}
    }, 10);
}

function getMaximumTerminalSerialHeight() {
    const terminalHeight = $("#terminal").height() || 0;
    const headerHeight = $("#terminal > header:visible").outerHeight() || 0;
    const labelHeight = $("#terminal .terminal-serial-label").outerHeight() || 0;
    const resizeHeight = $("#terminal-serial-resize").outerHeight(true) || 0;
    const availableHeight = Math.max(0, terminalHeight - headerHeight - labelHeight - resizeHeight);
    // Reserve a 16:9 viewport, capped only when the window cannot fit both
    // it and the minimum Serial area (for example in full-screen Lab).
    const minimumViewportHeight = Math.min(
        IDELayout.stacked() ? 120 : Math.ceil(($("#terminal").width() || 560) * 9 / 16),
        Math.max(0, availableHeight - MINIMUM_TERMINAL_SERIAL_HEIGHT)
    );
    $("#terminal-robot-panel").css("min-height", `${minimumViewportHeight}px`);
    return Math.max(
        MINIMUM_TERMINAL_SERIAL_HEIGHT,
        availableHeight - minimumViewportHeight
    );
}

function setTerminalSerialHeight(height, persist = true) {
    const maxHeight = getMaximumTerminalSerialHeight();
    const nextHeight = Math.max(MINIMUM_TERMINAL_SERIAL_HEIGHT, Math.min(maxHeight, height || DEFAULT_TERMINAL_SERIAL_HEIGHT));
    $("#terminal-serial-panel").css("flex-basis", `${nextHeight}px`);
    if (persist) localStorage.setItem(terminalSerialKey, nextHeight);
    fitTerminalSoon();
}

function restoreTerminalSerialHeight() {
    const stored = parseInt(localStorage.getItem(terminalSerialKey), 10);
    // A fresh install starts with a 16:9 viewport. Once the user drags the
    // divider, restore their own Serial height instead of enforcing a ratio.
    setTerminalSerialHeight(Number.isFinite(stored) ? stored : IDELayout.stacked() ? 90 : getMaximumTerminalSerialHeight(), false);
}

const terminalSizeObserver = new ResizeObserver(() => {
    if ($("#terminal").is(":visible")) {
        restoreTerminalSerialHeight();
    }
});
terminalSizeObserver.observe(document.getElementById("terminal"));

function pauseTerminalRobot() {
    if (window.motorSimulation) window.motorSimulation.stop();
}

let terminalSlide = null;
let terminalToggleSlide = null;
let terminalSlideFrame = 0;
let terminalSlideClosing = false;
function cancelTerminalSlide() {
    cancelAnimationFrame(terminalSlideFrame); terminalSlideFrame = 0;
    if (terminalToggleSlide) { terminalToggleSlide.cancel(); terminalToggleSlide = null; }
    if (terminalSlide) { terminalSlide.onfinish = null; terminalSlide.cancel(); terminalSlide = null; }
    terminalSlideClosing = false;
}
function slideTerminal(opening, done) {
    const panel = document.getElementById('terminal');
    cancelTerminalSlide();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !panel.animate || terminalFullSizeFlag) { done?.(); return; }
    terminalSlideClosing = !opening;
    const stacked = IDELayout.stacked();
    const margin = stacked ? 'marginBottom' : 'marginRight';
    const panelDistance = stacked ? panel.offsetHeight : panel.offsetWidth;
    const button = document.getElementById('toggle-terminal');
    const distance = stacked ? Math.max(0, panel.offsetHeight - 32) : panel.offsetWidth;
    const buttonOffscreen = stacked ? 'translateY(' + distance + 'px)' : 'translateX(' + distance + 'px)';
    if (button) terminalToggleSlide = button.animate([{transform:opening ? buttonOffscreen : 'translate(0)'}, {transform:opening ? 'translate(0)' : buttonOffscreen}], {duration:190, easing:'cubic-bezier(.22,.7,.25,1)', fill:'forwards'});
    // Negative margin releases the panel's space as it slides, so the editor
    // fills that space instead of exposing a blank reserved column first.
    terminalSlide = panel.animate([{[margin]:opening ? -panelDistance + 'px' : '0px'}, {[margin]:opening ? '0px' : -panelDistance + 'px'}], {duration:190, easing:'cubic-bezier(.22,.7,.25,1)', fill:'forwards'});
    const resizeEditor = () => {
        Blockly.triggleResize();
        if (editor) editor.layout();
        if (terminalSlide) terminalSlideFrame = requestAnimationFrame(resizeEditor);
    };
    terminalSlideFrame = requestAnimationFrame(resizeEditor);
    terminalSlide.onfinish = () => {
        done?.(); cancelTerminalSlide(); updateTerminalToggle();
        IDELayout.positionHandle(); Blockly.triggleResize();
        if (editor) editor.layout();
    };
}
function hideTerminalPanel(stopRobot = true, immediate = false) {
    if (!immediate && $('#terminal').is(':visible')) {
        if (stopRobot) pauseTerminalRobot();
        slideTerminal(false, () => hideTerminalPanel(false, true));
        return;
    }
    cancelTerminalSlide();
    if (stopRobot) pauseTerminalRobot();
    if (!terminalFullSizeFlag && !IDELayout.stacked()) beforeWidthTerminalSize = $("#terminal").width() || beforeWidthTerminalSize;
    $("#terminal").css("display", "none");
    if (terminalFullSizeFlag) {
        $(".page > .main").css("display", "flex");
    }
    terminalFullSizeFlag = false;
    Blockly.triggleResize();
    if (editor) editor.layout();
    terminalShowFlag = false;
    $("#terminal-h-resize").css("display", "none");
    IDELayout.constrainPanels();
    updateTerminalToggle();
}
$("#close-terminal").click(() => hideTerminalPanel());

function updateTerminalToggle() {
    const button = document.getElementById('toggle-terminal');
    if (!button) return;
    if (terminalSlide) return;
    button.hidden = isEmbed;
    const panel = document.getElementById('terminal');
    const shown = getComputedStyle(panel).display !== 'none';
    const page = document.querySelector('.page').getBoundingClientRect();
    const rect = panel.getBoundingClientRect();
    const stacked = IDELayout.stacked();
    button.classList.toggle('is-open', shown);
    button.classList.toggle('is-stacked', stacked);
    button.setAttribute('aria-expanded', String(shown));
    button.setAttribute('aria-label', shown ? 'Hide SIM and Serial' : 'Show SIM and Serial');
    button.style.right = shown && !stacked ? Math.max(0, page.right - rect.left - (terminalFullSizeFlag ? 30 : 0)) + 'px' : '0px';
    button.style.top = stacked ? (shown ? Math.max(0, rect.top-page.top-20) : Math.max(0, page.height-52)) + 'px' : '12px';
}
window.updateTerminalToggle = updateTerminalToggle;
function toggleTerminalPanel() {
    if (terminalSlideClosing) { slideTerminal(true); return; }
    if ($('#terminal').is(':visible')) hideTerminalPanel(false);
    else $('#open-terminal').click();
}
let terminalToggleTouch = null, terminalToggleSuppressClickUntil = 0;
$('#toggle-terminal').on('pointerdown', event => {
    const pointer = event.originalEvent;
    if (pointer.pointerType !== 'mouse' && pointer.isPrimary) terminalToggleTouch = {id:pointer.pointerId,x:pointer.clientX,y:pointer.clientY};
}).on('pointercancel', () => { terminalToggleTouch = null; }).on('pointerup', event => {
    const pointer = event.originalEvent, start = terminalToggleTouch;
    terminalToggleTouch = null;
    if (!start || start.id !== pointer.pointerId || Math.hypot(pointer.clientX-start.x,pointer.clientY-start.y)>8) return;
    event.preventDefault();
    terminalToggleSuppressClickUntil = performance.now()+600;
    toggleTerminalPanel();
}).on('click', event => {
    if (event.originalEvent?.detail && performance.now()<terminalToggleSuppressClickUntil) return;
    toggleTerminalPanel();
});

let terminalFullSizeFlag = false;
$("#resize-terminal").click(() => {
    terminalFullSizeFlag = !terminalFullSizeFlag;
    if (terminalFullSizeFlag) beforeWidthTerminalSize = $("#terminal").width();
    $("#terminal").width(terminalFullSizeFlag ? "100%" : IDELayout.clampPanelWidth(beforeWidthTerminalSize, '#terminal'));
    if (terminalFullSizeFlag) {
        $(".page > .main").css("display", "none");
    } else {
        $(".page > .main").css("display", "flex");
    }
    $("#terminal-h-resize").toggle(!terminalFullSizeFlag).css('right', $("#terminal").width());
    Blockly.triggleResize();
    if (editor) editor.layout();
    if (fitAddon) fitAddon.fit();
    IDELayout.constrainPanels();
    restoreTerminalSerialHeight();
    updateTerminalToggle();
    localStorage.setItem(terminalSizeKey, $("#terminal").width());
});

$("#clear-terminal").click(() => { if (term) term.clear(); });

$("#open-terminal").click(() => {
    const animateOpening = !$("#terminal").is(":visible") || terminalSlideClosing;
    cancelTerminalSlide();
    terminalShowFlag = true;
    $("#terminal").css("display", "flex");
    ensureTerminal();
    if (terminalFullSizeFlag) {
        $(".page > .main").css("display", "none");
    } else {
        $("#terminal").width(IDELayout.clampPanelWidth(beforeWidthTerminalSize, '#terminal'));
        Blockly.triggleResize();
    }
    if (editor) editor.layout();
    if (fitAddon) {
        fitTerminalSoon();
    }
    restoreTerminalSerialHeight();
    $("#terminal-h-resize").toggle(!terminalFullSizeFlag);
    $("#terminal-h-resize").css("right", $("#terminal").width());
    IDELayout.constrainPanels();
    localStorage.setItem(terminalSizeKey, $("#terminal").width());
    if (animateOpening) slideTerminal(true);
});

// Pointer capture supports mouse, pen and touch, including leaving the divider.
function bindTerminalDivider(id, begin, move, finish) {
    const handle = document.getElementById(id); let drag = null;
    handle.addEventListener('pointerdown', event => {
        if (event.button !== 0 || drag) return;
        const state = begin(event); if (!state) return;
        event.preventDefault(); drag = { ...state, pointerId: event.pointerId };
        handle.setPointerCapture(event.pointerId); handle.classList.add('active');
    });
    handle.addEventListener('pointermove', event => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault(); move(event, drag);
    });
    const end = event => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const state = drag; drag = null; handle.classList.remove('active');
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        finish(state);
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => handle.addEventListener(type, end));
}
bindTerminalDivider('terminal-h-resize', event => {
    if (terminalFullSizeFlag) return null;
    const panel = deviceMode === MODE_REAL_DEVICE ? '#terminal' : '#simulator';
    return { panel, stacked: IDELayout.stacked(), x: event.clientX, y: event.clientY, width: $(panel).width(), height: $(panel).height() };
}, (event, drag) => {
    if (drag.stacked) IDELayout.setPanelHeight(drag.height + drag.y - event.clientY);
    else $(drag.panel).width(IDELayout.clampPanelWidth(drag.width + drag.x - event.clientX, drag.panel));
    IDELayout.positionHandle(); Blockly.triggleResize();
    if (editor) editor.layout();
}, drag => {
    if (drag.stacked) IDELayout.setPanelHeight($(drag.panel).height(), true);
    else if (drag.panel === '#terminal') { beforeWidthTerminalSize = $(drag.panel).width(); localStorage.setItem(terminalSizeKey, beforeWidthTerminalSize); }
    else localStorage.setItem('simulator_width_size', $(drag.panel).width());
    IDELayout.constrainPanels(); fitTerminalSoon();
});
bindTerminalDivider('terminal-serial-resize', event => ({ y: event.clientY, height: $('#terminal-serial-panel').outerHeight() }),
    (event, drag) => setTerminalSerialHeight(drag.height + drag.y - event.clientY, false),
    () => setTerminalSerialHeight($('#terminal-serial-panel').outerHeight(), true));

if (!isEmbed && deviceMode === MODE_REAL_DEVICE) {
    terminal_size = localStorage.getItem(terminalSizeKey);
    if (terminal_size) {
        terminal_size = +terminal_size;
        beforeWidthTerminalSize = IDELayout.clampPanelWidth(terminal_size, "#terminal");
    }
    $(() => $("#open-terminal").click());
}
