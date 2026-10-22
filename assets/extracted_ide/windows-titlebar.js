'use strict';
let api;
function nativeAPI() {
    if (api) return api;
    const koffi = require('koffi');
    const dwm = koffi.load('dwmapi.dll');
    const user = koffi.load('user32.dll');
    api = {
        set: dwm.func('int __stdcall DwmSetWindowAttribute(uintptr_t hwnd, uint32_t attribute, const void *value, uint32_t size)'),
        frame: user.func('int __stdcall SetWindowPos(uintptr_t hwnd, uintptr_t after, int x, int y, int cx, int cy, uint32_t flags)'),
        redraw: user.func('int __stdcall RedrawWindow(uintptr_t hwnd, const void *rect, uintptr_t region, uint32_t flags)')
    };
    return api;
}
// Use direct native calls instead of launching PowerShell for every window.
module.exports = function whiteTitlebar(window) {
    if (process.platform !== 'win32' || window.isDestroyed()) return null;
    const api = nativeAPI();
    const handle = window.getNativeWindowHandle();
    const hwnd = handle.length === 8 ? handle.readBigUInt64LE() : handle.readUInt32LE();
    const set = (attribute, value) => {
        const data = Buffer.alloc(4);
        data.writeUInt32LE(value);
        return api.set(hwnd, attribute, data, data.length);
    };
    let lightResult = set(20, 0);
    if (lightResult !== 0) lightResult = set(19, 0);
    const result = {lightResult, borderResult:set(34,0xffffff), captionResult:set(35,0xffffff), textResult:set(36,0)};
    // Refresh the native frame without moving, resizing or activating it.
    result.frameResult = api.frame(hwnd, 0, 0, 0, 0, 0, 0x0037);
    // RDW_FRAME also invalidates non-client edges below the caption. Include
    // child surfaces; let Windows paint on the next message-loop iteration.
    result.redrawResult = api.redraw(hwnd, null, 0, 0x0485);
    return result;
};
