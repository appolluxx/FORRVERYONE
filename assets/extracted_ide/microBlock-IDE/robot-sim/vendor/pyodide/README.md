# Offline CPython runtime

Unmodified Pyodide 0.24.1 runtime artifacts from
https://cdn.jsdelivr.net/pyodide/v0.24.1/full/:
pyodide.js, pyodide.asm.js, pyodide.asm.wasm, python_stdlib.zip,
pyodide-lock.json and Pillow-10.0.0-cp311-cp311-emscripten_3_1_45_wasm32.whl.
Pillow's hash is recorded in the upstream lock file; its wheel contains its
license. CPython 3.11.3's license is in CPYTHON-LICENSE, copied from its
upstream v3.11.3 tag.
Pyodide's LICENSE accompanies these files.

Pinned for the existing Electron/Chromium application, not a claim of
compatibility with every browser. Electron 9/Chromium 83 requires the
Wasm BigInt flag set by main.js before startup; the worker checks support
before loading. See https://v8.dev/features/wasm-bigint and
https://pyodide.org/en/0.24.0/usage/index.html .

Everything loads locally, including the Pillow wheel. No CDN request is
needed at Run time. A hidden Electron test blocks HTTP(S) requests and runs
the actual firmware through the IDE's microblock protocol.
