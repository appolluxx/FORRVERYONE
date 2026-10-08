/**
 * =============================================================================
 * PT-BOT TACTICAL IDE · LOCAL BACKEND SERVER & HARDWARE ENGINE
 * Ultra-fast native communication bridge, zero-dependency Node.js architecture
 * =============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec, spawn } = require('child_process');

const PORT = 4848;
const ROOT_DIR = path.resolve(__dirname);
const ARDUINO_CLI_PATH = 'C:\\Users\\john\\AppData\\Local\\Programs\\Arduino IDE\\resources\\app\\lib\\backend\\resources\\arduino-cli.exe';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.ino': 'text/plain; charset=utf-8'
};

// Auto-detect connected Serial COM ports on Windows
function getComPorts() {
    return new Promise((resolve) => {
        const psCmd = `powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::getportnames() -join ','"`;
        exec(psCmd, (err, stdout) => {
            if (err || !stdout) {
                return resolve([]);
            }
            const ports = stdout.trim().split(',').filter(p => p.trim().length > 0);
            const portList = ports.map(p => ({
                port: p.trim(),
                label: `${p.trim()} (USB Serial Device)`
            }));
            resolve(portList);
        });
    });
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1:4848'}`);
    const pathname = parsedUrl.pathname;

    // Enable CORS for local app
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // -------------------------------------------------------------------------
    // API ENDPOINTS
    // -------------------------------------------------------------------------

    // GET /api/status
    if (pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            app: 'PT-BOT Tactical IDE',
            version: '8.0.0',
            hasArduinoCli: fs.existsSync(ARDUINO_CLI_PATH),
            rootDir: ROOT_DIR
        }));
        return;
    }

    // GET /api/ports
    if (pathname === '/api/ports') {
        const ports = await getComPorts();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ports }));
        return;
    }

    // GET /api/missions
    if (pathname === '/api/missions') {
        const dataDir = path.join(ROOT_DIR, 'data');
        try {
            const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ files }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // POST /api/save-mission
    if (pathname === '/api/save-mission' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                const filename = parsed.filename || 'official_field_mission.json';
                const safeName = path.basename(filename);
                const targetPath = path.join(ROOT_DIR, 'data', safeName);
                fs.writeFileSync(targetPath, JSON.stringify(parsed.data, null, 2), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, path: targetPath }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // POST /api/flash-firmware (Native 1-Click high-speed compile & upload via arduino-cli)
    if (pathname === '/api/flash-firmware' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { port, sketchFolder, baud } = JSON.parse(body || '{}');
                const targetPort = port || 'COM3';
                const uploadBaud = baud || '921600';
                const sketchDir = sketchFolder
                    ? path.join(ROOT_DIR, 'firmware', sketchFolder)
                    : path.join(ROOT_DIR, 'firmware', 'PT_BOT_Middle_3Drop_ATOM_VX');

                if (!fs.existsSync(ARDUINO_CLI_PATH)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `arduino-cli not found at: ${ARDUINO_CLI_PATH}` }));
                    return;
                }

                // Streaming SSE (Server-Sent Events) for real-time build logs
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });

                const sendEvent = (type, data) => {
                    res.write(`data: ${JSON.stringify({ type, message: data })}\n\n`);
                };

                sendEvent('info', `Starting high-speed compilation & flash...`);
                sendEvent('info', `Sketch: ${path.basename(sketchDir)} | Port: ${targetPort} | Baud: ${uploadBaud}`);

                // arduino-cli compile --fqbn esp32:esp32:esp32 --upload -p <port> --upload-field upload.speed=<baud>
                const args = [
                    'compile',
                    '--fqbn', 'esp32:esp32:esp32',
                    '--upload',
                    '-p', targetPort,
                    '--upload-field', `upload.speed=${uploadBaud}`,
                    sketchDir
                ];

                const child = spawn(ARDUINO_CLI_PATH, args);

                child.stdout.on('data', (data) => {
                    sendEvent('stdout', data.toString());
                });

                child.stderr.on('data', (data) => {
                    sendEvent('stderr', data.toString());
                });

                child.on('close', (code) => {
                    if (code === 0) {
                        sendEvent('complete', `Flash successful! (Exit code 0)`);
                    } else {
                        sendEvent('error', `Flashing failed with exit code ${code}`);
                    }
                    res.end();
                });

            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // -------------------------------------------------------------------------
    // STATIC FILE SERVING
    // -------------------------------------------------------------------------
    let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

    // Security check: ensure path stays inside ROOT_DIR
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`File not found: ${pathname}`);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`==================================================================`);
    console.log(`PT-BOT TACTICAL IDE · NATIVE BACKEND ONLINE`);
    console.log(`URL: http://127.0.0.1:${PORT}`);
    console.log(`Mode: High-Speed Embedded Mission Control (Zero-Compilation Engine)`);
    console.log(`==================================================================`);
});
