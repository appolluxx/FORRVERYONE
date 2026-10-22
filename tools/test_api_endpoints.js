const http = require('http');

function postJson(path, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = http.request({
            hostname: '127.0.0.1',
            port: 4848,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    console.log("Testing Backend Endpoints with waypoints...");
    
    // 1. /api/plan-path
    const planRes = await postJson('/api/plan-path', {
        projectId: 'atom-vx-rescue-five-points',
        startPose: { x: 0.3, y: 0.3, heading: 0 },
        destPose: { x: 1.5, y: 0.3 },
        speed: 70
    });
    console.log("Plan Status:", planRes.status, "Waypoints count:", planRes.body?.waypoints?.length);
    console.log("Planned Waypoints:", planRes.body?.waypoints);

    const wps = planRes.body?.waypoints;

    // 2. /api/compile-route
    const compileRes = await postJson('/api/compile-route', { waypoints: wps });
    console.log("Compile Status:", compileRes.status);
    console.log("Primitives count:", compileRes.body?.primitives?.length);
    console.log("Primitives:", compileRes.body?.primitives);

    // 3. /api/generate-code (cpp, serial, py)
    const genCpp = await postJson('/api/generate-code', { waypoints: wps, language: 'cpp' });
    console.log("\n--- Generated C++ ---");
    console.log(genCpp.body?.code?.split('\n').filter(l => l.includes('FF(') || l.includes('spinDegree(') || l.includes('motorStop()')).join('\n'));

    const genSerial = await postJson('/api/generate-code', { waypoints: wps, language: 'serial' });
    console.log("\n--- Generated Serial Protocol ---");
    console.log(genSerial.body?.code);

    const genPy = await postJson('/api/generate-code', { waypoints: wps, language: 'py' });
    console.log("\n--- Generated MicroPython ---");
    console.log(genPy.body?.code?.split('\n').filter(l => l.includes('motor.') || l.includes('imu.')).join('\n'));

    // 4. /api/validate-code
    const valRes = await postJson('/api/validate-code', { code: genCpp.body?.code, language: 'cpp' });
    console.log("\n--- Validation ---");
    console.log("Valid:", valRes.body?.valid, "Found Symbols:", valRes.body?.foundSymbols, "Errors:", valRes.body?.errors);
}

run().catch(console.error);
