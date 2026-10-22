'use strict';
const fs = require('fs');
const path = require('path');

(async function () {
    const filePath = process.argv[2];
    const params = process.argv[3] ? JSON.parse(process.argv[3]) : null;
    if (!filePath) throw new Error('No STEP file was provided');
    const vendor = path.join(__dirname, 'vendor', 'occt');
    const factory = require(path.join(vendor, 'occt-import-js.js'));
    const occt = await factory({ wasmBinary: fs.readFileSync(path.join(vendor, 'occt-import-js.wasm')) });
    const result = occt.ReadStepFile(fs.readFileSync(filePath), params);
    if (!result.success || !result.meshes.length) throw new Error('The file contains no readable STEP geometry');
    process.stdout.write(JSON.stringify({ meshes: result.meshes }));
})().catch(error => {
    process.stderr.write(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
});
