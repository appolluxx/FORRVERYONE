occt-import-js 0.0.18 — unmodified JS/WASM distribution for Electron 9.

Source and build instructions: https://github.com/kovacsv/occt-import-js
Release: https://www.npmjs.com/package/occt-import-js/v/0.0.18
Downloaded from: https://cdn.jsdelivr.net/npm/occt-import-js@0.0.18/dist/
License: LGPL-2.1; see ../occt/LICENSE.md.

This release supports the application's Chromium 83 / Node 12 runtime without
WebAssembly exception handling. It exports millimetres; the worker converts
positions to metres. The JS and WASM may be replaced together with a compatible
build from source. No CAD engine runs on the UI thread.
