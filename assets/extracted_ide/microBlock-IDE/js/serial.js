/**************************************************************
 * PT Robotics โ€” Unified USB & Wi-Fi REPL Transport + Terminal
 * - USB (Web Serial / Electron serialport)
 * - Wi-Fi (WebSocket ws(s)://<ip>:<port>/ws)
 * - Terminal เนเธชเธ”เธเธเธฅเน€เธซเธกเธทเธญเธเธ•เนเธญ USB
 * - Upload เนเธเธฅเนเธเนเธฒเธ Raw REPL/MSC/OnBoot เนเธเน API เน€เธ”เธดเธกเนเธ”เน
 **************************************************************/

/* ===== Globals / States ===== */
let serialPort = null;
let writer = null, reader = null;
let serialLastData = "";
let silentReconnect = false;
let isConnecting = false;
let RawREPLMode = false;
let disable_terminal = false;
let isSerialConnecting = false;
let currentTransport = null;
let serialTextDecoder = null;

function resetSerialTextDecoder() {
    serialTextDecoder = (typeof TextDecoder !== "undefined") ? new TextDecoder("utf-8") : null;
}

function decodeSerialChunk(chunk) {
    if (typeof chunk === "string") return chunk;
    if (serialTextDecoder && (chunk instanceof Uint8Array || chunk instanceof ArrayBuffer)) {
        const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        return serialTextDecoder.decode(bytes, { stream: true });
    }
    if (chunk && typeof chunk.toString === "function") return chunk.toString("utf8");
    return String(chunk || "");
}

function appendSerialText(text) {
    if (!text) return;
    if (!disable_terminal) term?.write(text);
    serialLastData += text;
    if (serialLastData.length > 300) serialLastData = serialLastData.slice(-300);
}
const robotDiscoveryDefaults = {
    port: 9999,
    message: "DISCOVER_ROBOT",
    timeoutMs: 1200
};
const dgramAPI = (typeof window !== "undefined" && typeof window.nodeRequire === "function" && typeof isElectron !== "undefined" && isElectron)
    ? window.nodeRequire("dgram")
    : null;
const nodeOsAPI = (typeof window !== "undefined" && typeof window.nodeRequire === "function" && typeof isElectron !== "undefined" && isElectron)
    ? window.nodeRequire("os")
    : null;
let wifiSilentClose = false; // ๐”น เธเธดเธ” WSS เนเธเธเน€เธเธตเธขเธ เน

const electronAPI = (typeof window !== "undefined" && typeof window.nodeRequire === "function" && typeof isElectron !== "undefined" && isElectron)
    ? window.nodeRequire("electron")
    : null;
const ipcRenderer = electronAPI ? electronAPI.ipcRenderer : null;
const ptbotAppStartedAt = String(
    (typeof sharedObj !== "undefined" && sharedObj?.appSessionId)
        ? sharedObj.appSessionId
        : Date.now()
);
try {
    localStorage.setItem("ptbot_app_started_at", ptbotAppStartedAt);
    localStorage.setItem("ptbot_transport_connected", "0");
    localStorage.removeItem("ptbot_active_transport");
    localStorage.setItem("ptbot_transport_updated_at", ptbotAppStartedAt);
} catch { }

function rememberLastConnection(details = {}) {
    try {
        if (typeof boardId !== "undefined" && boardId) {
            localStorage.setItem("ptbot_last_board_id", boardId);
        }
        if (details.transport) localStorage.setItem("ptbot_last_transport", details.transport);
        if (details.portName) localStorage.setItem("ptbot_last_serial_port", details.portName);
        if (details.host) localStorage.setItem("ptbot_wifi_ip", details.host);
        if (details.port) localStorage.setItem("ptbot_wifi_port", String(details.port));
        localStorage.setItem("ptbot_last_connection_session", ptbotAppStartedAt);
    } catch { }
}

function clearRememberedConnection() {
    try {
        localStorage.removeItem("ptbot_last_board_id");
        localStorage.removeItem("ptbot_last_transport");
        localStorage.removeItem("ptbot_last_serial_port");
        localStorage.removeItem("ptbot_last_connection_session");
    } catch { }
}

function clearRememberedWiFiTarget() {
    try {
        localStorage.removeItem("ptbot_wifi_ip");
        localStorage.removeItem("ptbot_wifi_port");
        if (localStorage.getItem("ptbot_last_transport") === "wifi") {
            localStorage.removeItem("ptbot_last_transport");
            localStorage.removeItem("ptbot_last_board_id");
        }
    } catch { }
}

function getRememberedWiFiHost() {
    try {
        const host = (localStorage.getItem("ptbot_wifi_ip") || "").trim();
        return host || null;
    } catch {
        return null;
    }
}

let bypassEchoUntil = 0;

function stripEchoFrom(s) {
    if (Date.now() < bypassEchoUntil) return s;
    if (!pendingEcho) return s;
    let i = 0;
    while (i < s.length && pendingEcho.length) {
        if (s[i] === pendingEcho[0]) {
            i++;
            pendingEcho = pendingEcho.slice(1);
        } else {
            pendingEcho = "";
            break;
        }
    }
    return s.slice(i);
}

/* ===== Utilities & UI helpers ===== */
let transportNameForUI = () => currentTransport ? currentTransport.type.toUpperCase() : "DISCONNECT";

function disconnectDeviceLikeButton() {
    if (!currentTransport) return;
    window.autoConnectFlag = false;
    clearRememberedConnection();
    console.log("Disconnecting device...");
    setTransport(null);

    try { NotifyW?.("Serial port disconnected"); } catch { }
    try { statusLog?.("Serial port disconnected"); } catch { }

    try { term?.dispose(); } catch { }
    term = null;

    if (window.dashboardIsReady) {
        try { dashboardWin.serialStatusUpdate("disconnect"); } catch { }
    }
    console.log("Device fully disconnected.");
}

function emitPtbotTransportState() {
    if (!ipcRenderer) return;

    const isConnected = !!currentTransport;
    const isWifiTransport = currentTransport?.type === "wifi";
    const host = isWifiTransport
        ? (currentTransport.host || "")
        : (localStorage.getItem("ptbot_wifi_ip") || "");
    const port = isWifiTransport
        ? (currentTransport.port || 8080)
        : (+localStorage.getItem("ptbot_wifi_port") || 8080);

    try {
        ipcRenderer.send("ptbot-transport-state", {
            connected: isConnected,
            transportType: currentTransport?.type || "",
            host,
            port,
        });
    } catch { }
}

function updateHeaderBoardConnectionIndicator(isConnected) {
    try {
        $(".header-device-actions").attr("data-connected", String(!!isConnected));
        const footer = document.getElementById('port-name')?.textContent || '';
        const port = /^CONNECTED\s*\((.+)\)/i.exec(footer)?.[1];
        const detail = isConnected ? (port || (currentTransport?.type === 'wifi' ? 'Wi-Fi' : currentTransport?.type === 'serial' ? 'USB' : '')) : '';
        const status = document.getElementById('header-board-connection-status');
        if (status) {
            const text = isConnected ? 'Connected' + (detail ? ' \u00b7 ' + detail : '') : 'Not connected';
            if (status.textContent !== text) {
                status.textContent = text;
                window.IDELayout?.constrainPanels();
            }
            status.title = text;
        }
    } catch { }
}

function setTransport(t) {
    try { currentTransport?.close?.(); } catch { }
    currentTransport = t || null;

    if (currentTransport) {
        try {
            localStorage.setItem("ptbot_transport_connected", "1");
            localStorage.setItem("ptbot_active_transport", currentTransport.type || "");
            localStorage.setItem("ptbot_transport_updated_at", String(Date.now()));
        } catch { }
        $("#port-name").text(`CONNECTED (${transportNameForUI()})`);
        $("#disconnect-device").show();
        $("#connect-device").hide();
        updateHeaderBoardConnectionIndicator(true);
        try { (window.dashboardIsReady ? dashboardWin : sharedObj?.dashboardWin)?.serialStatusUpdate?.("connected"); } catch { }
    } else {
        try {
            localStorage.setItem("ptbot_transport_connected", "0");
            localStorage.removeItem("ptbot_active_transport");
            localStorage.setItem("ptbot_transport_updated_at", String(Date.now()));
        } catch { }
        $("#port-name").text("DISCONNECT");
        $("#disconnect-device").hide();
        $("#connect-device").show();
        updateHeaderBoardConnectionIndicator(false);
        try { (window.dashboardIsReady ? dashboardWin : sharedObj?.dashboardWin)?.serialStatusUpdate?.("disconnect"); } catch { }
    }

    emitPtbotTransportState();
}

let microPythonIsReadyNextCommand = () => {
    return serialLastData.endsWith((!RawREPLMode) ? ">>> " : ">");
};

let sleep = (ms) => new Promise(r => setTimeout(r, ms));
const nodeHttpAPI = (typeof window !== "undefined" && typeof window.nodeRequire === "function" && typeof isElectron !== "undefined" && isElectron)
    ? window.nodeRequire("http")
    : null;
const nodeHttpsAPI = (typeof window !== "undefined" && typeof window.nodeRequire === "function" && typeof isElectron !== "undefined" && isElectron)
    ? window.nodeRequire("https")
    : null;

$(() => {
    updateHeaderBoardConnectionIndicator(!!currentTransport);
    const portLabel = document.getElementById('port-name');
    if (portLabel) new MutationObserver(() => updateHeaderBoardConnectionIndicator(!!currentTransport)).observe(portLabel, {childList:true, characterData:true, subtree:true});
});

/* ===== Fetch helpers (Wi-Fi probe) ===== */
function fetchWithTimeout(url, ms = 500) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    return fetch(url, { cache: "no-store", signal: ac.signal })
        .finally(() => clearTimeout(t));
}

function isLocalRobotHost(host) {
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || /\.local$/i.test(host) || /^localhost$/i.test(host);
}

function getRobotSocketUrl(host, port) {
    const scheme = isLocalRobotHost(host) ? "ws" : "wss";
    return `${scheme}://${host}:${port}/ws`;
}

function getRobotHttpBase(host, port) {
    const scheme = isLocalRobotHost(host) ? "http" : "https";
    return `${scheme}://${host}:${port}`;
}

function formatBridgeFirmwareLog(payload) {
    const text = String(payload?.message || payload?.stage || "").replace(/\s+/g, " ").trim();
    const progressValue = Number.isFinite(+payload?.percentage)
        ? +payload.percentage
        : ((/(\d+(?:\.\d+)?)\s*%/.exec(text) || [])[1] ? +(/(\d+(?:\.\d+)?)\s*%/.exec(text) || [])[1] : null);
    const bytesMatch = /(\d+)\s*\/\s*(\d+)\s*bytes?/i.exec(text);

    if (payload?.type === "firmware_result") {
        return payload.ok ? "Firmware flash complete" : (payload.message || "Firmware flash failed");
    }
    if (progressValue != null && bytesMatch) {
        return `${progressValue.toFixed(1)}% (${bytesMatch[1]} / ${bytesMatch[2]} bytes)`;
    }
    if (progressValue != null) {
        return `${progressValue.toFixed(1)}%`;
    }
    if (/compressed /i.test(text)) return "Compressing firmware...";
    if (/erasing flash/i.test(text)) return "Erasing flash...";
    if (/configuring flash size/i.test(text)) return "Configuring flash size...";
    if (/hash of data verified/i.test(text)) return "Verifying flashed data...";
    if (/hard resetting via rts pin/i.test(text)) return "Resetting device...";
    if (/preparing firmware flash/i.test(text)) return "Preparing firmware flash...";
    return text || payload?.type || "firmware";
}

async function robotHttpRequest(url, options = {}) {
    if (!(typeof isElectron !== "undefined" && isElectron && typeof window !== "undefined" && typeof window.nodeRequire === "function" && (nodeHttpAPI || nodeHttpsAPI))) {
        return fetch(url, options);
    }

    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === "https:";
        const transport = isHttps ? nodeHttpsAPI : nodeHttpAPI;
        const headers = { ...(options.headers || {}) };
        let body = options.body;

        if (body instanceof Uint8Array) {
            body = Buffer.from(body);
        } else if (body != null && typeof body !== "string" && !Buffer.isBuffer(body)) {
            body = Buffer.from(body);
        }

        if (body != null && !headers["Content-Length"] && !headers["content-length"]) {
            headers["Content-Length"] = Buffer.byteLength(body);
        }

        const req = transport.request({
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: `${parsedUrl.pathname}${parsedUrl.search}`,
            method: options.method || "GET",
            headers
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            res.on("end", () => {
                const responseBuffer = Buffer.concat(chunks);
                const responseText = responseBuffer.toString("utf8");
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode || 0,
                    text: async () => responseText
                });
            });
        });

        req.on("error", reject);
        if (body != null) req.write(body);
        req.end();
    });
}

async function scanESP32Quick(host, time_out = 500) {
    if (!host) return null;
    const port = +localStorage.getItem("ptbot_wifi_port") || 8080;
    const t0 = performance.now();

    return new Promise((resolve) => {
        let done = false;
        let ws = null;

        function finish(result) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try { ws && ws.close(); } catch { }
            resolve(result);
        }

        let timer = setTimeout(() => {
            finish(null);
        }, time_out);

        try {
            ws = new WebSocket(getRobotSocketUrl(host, port));
        } catch (e) {
            finish(null);
            return;
        }

        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
            if (done) {
                try { ws.close(); } catch { }
                return;
            }
            try {
                ws.send("GET_STATUS");
            } catch {
                finish(null);
            }
        };

        ws.onmessage = (ev) => {
            if (done) return;

            let data;
            if (typeof ev.data === "string") {
                try { data = JSON.parse(ev.data); }
                catch { data = { raw: ev.data }; }
            } else {
                data = { raw: ev.data };
            }

            const latencyMs = Math.max(1, Math.round(performance.now() - t0));

            localStorage.setItem("ptbot_wifi_port", String(port));

            finish({
                reachable: true,
                host,
                port,
                latencyMs,
                name: data?.name || "ESP32 (Wi-Fi)",
                manufacturer: data?.manufacturer || "PT Robotics",
                ip: host,
                raw: data,
            });
        };

        ws.onerror = () => {
            finish(null);
        };

        ws.onclose = () => {
            finish(null);
        };
    });
}

async function scanRobotDiscoveryElectron(timeoutMs = robotDiscoveryDefaults.timeoutMs) {
    if (!dgramAPI) return [];

    return new Promise((resolve) => {
        const socket = dgramAPI.createSocket("udp4");
        const foundMap = new Map();
        let finished = false;

        const finish = () => {
            if (finished) return;
            finished = true;
            try { socket.close(); } catch { }
            resolve(Array.from(foundMap.values()));
        };

        socket.on("message", (msg) => {
            try {
                const data = JSON.parse(msg.toString("utf8"));
                if (!data || !data.ip) return;
                const ip = String(data.ip);
                const port = Number(data.port) || 8080;
                const key = `${ip}:${port}`;
                foundMap.set(key, {
                    reachable: true,
                    host: ip,
                    ip,
                    port,
                    name: data.name || "PT Robot",
                    manufacturer: "PT Robotics",
                    robotId: data.id || ""
                });
            } catch {
                // Ignore invalid UDP payloads
            }
        });

        socket.on("error", () => finish());

        function ipv4ToInt(ip) {
            return ip.split(".").reduce((acc, part) => ((acc << 8) | (parseInt(part, 10) & 255)) >>> 0, 0) >>> 0;
        }

        function intToIpv4(num) {
            return [
                (num >>> 24) & 255,
                (num >>> 16) & 255,
                (num >>> 8) & 255,
                num & 255
            ].join(".");
        }

        function getBroadcastTargets() {
            const targets = new Set(["255.255.255.255"]);
            try {
                const interfaces = nodeOsAPI?.networkInterfaces?.() || {};
                for (const entries of Object.values(interfaces)) {
                    for (const info of (entries || [])) {
                        if (!info || info.family !== "IPv4" || info.internal || !info.address || !info.netmask) continue;
                        const ipInt = ipv4ToInt(info.address);
                        const maskInt = ipv4ToInt(info.netmask);
                        const broadcastInt = (ipInt | (~maskInt >>> 0)) >>> 0;
                        targets.add(intToIpv4(broadcastInt));
                    }
                }
            } catch { }
            return Array.from(targets);
        }

        socket.bind(0, () => {
            try { socket.setBroadcast(true); } catch { }
            const payload = Buffer.from(robotDiscoveryDefaults.message, "utf8");
            for (const target of getBroadcastTargets()) {
                try { socket.send(payload, robotDiscoveryDefaults.port, target); } catch { }
            }
            setTimeout(finish, timeoutMs);
        });
    });
}

/* ===== Terminal setup helper ===== */
function ensureTerminal() {
    if (!term) {
        // Touch browsers need real text for native copy selection.
        term = new Terminal(navigator.maxTouchPoints > 0 ? { rendererType: 'dom' } : {});
        if (!fitAddon) fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
        term.open($("#terminal > section")[0]);
        try { fitAddon.fit(); } catch { }
    }
}

/* ===== Transport-agnostic Writers ===== */
async function writeSerial(text) {
    if (currentTransport && currentTransport.type === "wifi") {
        return currentTransport.write(text);
    }
    if (!isElectron) {
        if (!writer) return;
        const data = new TextEncoder().encode(text);
        await writer.write(data);
    } else {
        if (!serialPort || !serialPort.isOpen) return;
        const buff = Buffer.from(text, "utf8");
        await new Promise((resolve, reject) => {
            serialPort.write(buff, (err) => err ? reject(err) : resolve());
        });
    }
}

async function writeSerialByte(data) {
    if (currentTransport && currentTransport.type === "wifi") {
        return currentTransport.writeByte(data);
    }
    if (!isElectron) {
        if (!writer) return;
        await writer.write(new Uint8Array([data]));
    } else {
        if (!serialPort || !serialPort.isOpen) return;
        const b = Buffer.from([data]);
        await new Promise((resolve, reject) => {
            serialPort.write(b, (err) => err ? reject(err) : resolve());
        });
    }
}

async function writeSerialBytes(arr) {
    if (currentTransport && currentTransport.type === "wifi") {
        return currentTransport.writeBytes(arr);
    }
    if (!isElectron) {
        if (!writer) return;
        await writer.write(new Uint8Array(arr));
    } else {
        if (!serialPort || !serialPort.isOpen) return;
        const b = Buffer.from(arr);
        let writeSize = 0;
        while (writeSize < b.length) {
            const len = Math.min(1024, b.length - writeSize);
            const block = b.slice(writeSize, writeSize + len);
            await new Promise((resolve, reject) => {
                serialPort.write(block, (err) => err ? reject(err) : resolve());
            });
            writeSize += len;
        }
    }
}

/* ===== WebSocket (Wi-Fi) Transport ===== */
let pendingEcho = "";
async function connectWiFiREPL(ip = "esp.pt-robotics.com", port = 8080) {
    return new Promise((resolve, reject) => {
        const url = getRobotSocketUrl(ip, port);
        const ws = new WebSocket(url);
        ws.binaryType = "arraybuffer";

        function feed(text) {
            if (term != null) term.write(text.replace(/\n/g, "\r\n"));
            serialLastData += text;
            if (serialLastData.length > 300) serialLastData = serialLastData.slice(-300);
            try { window.dashboardIsReady && dashboardWin.streamDataIn?.(new TextEncoder().encode(text)); } catch { }
        }

        function handleBridgeMessage(rawText) {
            if (typeof rawText !== "string") return false;

            let payload = null;
            try {
                payload = JSON.parse(rawText);
            } catch {
                return false;
            }

            if (!payload || typeof payload !== "object" || !payload.type) {
                return false;
            }

            try {
                window.dispatchEvent(new CustomEvent("robot-bridge-message", { detail: payload }));
            } catch { }

            if (payload.type === "firmware_status" ||
                payload.type === "firmware_progress" ||
                payload.type === "firmware_result") {
                console.log("[bridge firmware event]", payload);
                try { statusLog?.(`[bridge firmware] ${formatBridgeFirmwareLog(payload)}`); } catch { }
            }

            if (payload.type === "upload_status") {
                try { statusLog?.(`[bridge upload] ${payload.message || ""}`.trim()); } catch { }
                return true;
            }

            if (payload.type === "upload_progress") {
                try {
                    const file = payload.file || "";
                    const written = Number(payload.written) || 0;
                    const total = Number(payload.total) || 0;
                    statusLog?.(`[bridge upload] ${file} ${written}/${total}`);
                } catch { }
                return true;
            }

            if (payload.type === "upload_result") {
                try {
                    statusLog?.(
                        payload.ok
                            ? "[bridge upload] complete"
                            : `[bridge upload] fail: ${payload.message || "unknown error"}`
                    );
                } catch { }
                return true;
            }

            if (payload.type === "status") {
                if (payload.ip) {
                    localStorage.setItem("ptbot_wifi_ip", payload.ip);
                }
                if (payload.bridge_port || payload.port) {
                    localStorage.setItem("ptbot_wifi_port", String(payload.bridge_port || payload.port));
                }
                statusLog?.(
                    `Bridge ready (${payload.ip || ip}:${payload.bridge_port || payload.port || port})` +
                    (payload.serial_connected ? `, serial ${payload.serial_port || ""} connected` : "")
                );
                return true;
            }

            if (payload.type === "error") {
                const message = payload.message || "Bridge error";
                try { term?.writeln(`\r\n[bridge] ${message}\r\n`); } catch { }
                statusLog?.(`[bridge] ${message}`);
                return true;
            }

            if (payload.type === "firmware_status" ||
                payload.type === "firmware_progress" ||
                payload.type === "firmware_result" ||
                payload.type === "upload_status" ||
                payload.type === "upload_progress" ||
                payload.type === "upload_result") {
                return true;
            }

            return false;
        }

        ws.onopen = () => {
            console.log("WS open:", url);
            localStorage.setItem("ptbot_wifi_ip", ip);
            localStorage.setItem("ptbot_wifi_port", String(port));
            rememberLastConnection({ transport: "wifi", host: ip, port });

            const token = Symbol("wifi-transport");

            const transport = {
                type: "wifi",
                _ws: ws,
                _token: token,
                host: ip,
                port,
                get httpBase() { return getRobotHttpBase(this.host, this.port); },
                isOpen() { return ws.readyState === WebSocket.OPEN; },
                async write(text) { if (ws.readyState === WebSocket.OPEN) ws.send(String(text)); },
                async writeByte(b) { if (ws.readyState === WebSocket.OPEN) ws.send(Uint8Array.from([b])); },
                async writeBytes(arr) { if (ws.readyState === WebSocket.OPEN) ws.send(Uint8Array.from(arr)); },
                async close() {
                    try {
                        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                            const done = new Promise(res => ws.addEventListener("close", res, { once: true }));
                            try { ws.close(1000, "User Disconnect"); } catch { }
                            await Promise.race([done, (async () => { await new Promise(r => setTimeout(r, 500)); })()]);
                        }
                    } finally {
                        try { window._termKeyHandler?.dispose?.(); } catch { }
                        window._termKeyHandler = null;
                    }
                }
            };

            setTransport(transport);
            ensureTerminal();

            if (window._termKeyHandler) {
                try { window._termKeyHandler.dispose(); } catch { }
            }

            let buf = [];
            let pos = 0;

            function insertChar(ch) {
                const suffix = buf.slice(pos).join("");
                buf.splice(pos, 0, ch);
                pos += 1;
                term.write(ch + suffix);
                if (suffix.length) term.write(`\x1b[${suffix.length}D`);
            }

            function backspace() {
                if (pos === 0) return;
                const suffix = buf.slice(pos).join("");
                buf.splice(pos - 1, 1);
                pos -= 1;
                term.write("\x1b[D");
                term.write(suffix + " ");
                term.write(`\x1b[${suffix.length + 1}D`);
            }

            function delAtCursor() {
                if (pos >= buf.length) return;
                const suffix = buf.slice(pos + 1).join("");
                buf.splice(pos, 1);
                term.write(suffix + " ");
                term.write(`\x1b[${suffix.length + 1}D`);
            }

            function moveLeft(n = 1) { if (pos === 0) return; const step = Math.min(n, pos); pos -= step; term.write(`\x1b[${step}D`); }
            function moveRight(n = 1) { if (pos >= buf.length) return; const step = Math.min(n, buf.length - pos); pos += step; term.write(`\x1b[${step}C`); }
            function moveHome() { if (pos > 0) { term.write(`\x1b[${pos}D`); pos = 0; } }
            function moveEnd() { const step = buf.length - pos; if (step > 0) { term.write(`\x1b[${step}C`); pos = buf.length; } }

            function submitLine() {
                const line = buf.join("");
                term.write("\r\n");
                transport.write(line + "\r");
                pendingEcho += line + "\r";
                buf = [];
                pos = 0;
            }

            function handleEscape(seq) {
                switch (seq) {
                    case "\x1b[D": moveLeft(); break;
                    case "\x1b[C": moveRight(); break;
                    case "\x1b[A": break;
                    case "\x1b[B": break;
                    case "\x1b[3~": delAtCursor(); break;
                    case "\x1b[H":
                    case "\x1b[1~":
                    case "\x1bOH": moveHome(); break;
                    case "\x1b[F":
                    case "\x1b[4~":
                    case "\x1bOF": moveEnd(); break;
                    default: break;
                }
            }

            let escBuf = "";
            window._termKeyHandler = term.onData((data) => {
                for (let i = 0; i < data.length; i++) {
                    let ch = data[i];

                    if (escBuf || ch === "\x1b") {
                        escBuf += ch;
                        if (/^\x1b\[[ABCD]$/.test(escBuf) || /^\x1b\[(?:1~|3~|4~)$/.test(escBuf) || /^\x1bO[HF]$/.test(escBuf)) {
                            handleEscape(escBuf);
                            escBuf = "";
                            continue;
                        }
                        if (escBuf.length > 6) escBuf = "";
                        continue;
                    }

                    if (ch === "\r") ch = "\n";
                    if (ch === "\x03") { buf = []; pos = 0; transport.write("\x03"); continue; }
                    if (ch === "\x04") { transport.write("\x04"); continue; }
                    if (ch === "\x7F") { backspace(); continue; }
                    if (ch === "\n") { submitLine(); continue; }
                    if (ch >= " " && ch !== "\x7f") { insertChar(ch); continue; }
                }
            });

            try { NotifyS?.("Wi-Fi REPL connected"); } catch { }
            statusLog?.(`Wi-Fi REPL connected (${ip}:${port})`);
            try { transport.write("\r"); } catch { }

            ws.onmessage = (ev) => {
                if (typeof ev.data === "string") {
                    if (handleBridgeMessage(ev.data)) return;
                    let s = stripEchoFrom(ev.data);
                    if (s) feed(s);
                } else if (ev.data instanceof ArrayBuffer) {
                    const view = new Uint8Array(ev.data);
                    let s = "";
                    for (let i = 0; i < view.length; i++) s += String.fromCharCode(view[i]);
                    s = stripEchoFrom(s);
                    if (s) feed(s);
                }
            };

            ws.onerror = (e) => { console.warn("WS error:", e); };

            ws.onclose = () => {
                console.log("WS closed");

                const silent = wifiSilentClose;

                if (currentTransport && currentTransport.type === "wifi" &&
                    (currentTransport._ws === ws || currentTransport._token === token)) {

                    try { window._termKeyHandler?.dispose?.(); } catch { }
                    window._termKeyHandler = null;

                    if (!silent) {
                        disconnectDeviceLikeButton();
                    } else {
                        // ๐” เธเธดเธ”เนเธเธเน€เธเธตเธขเธ: เนเธกเนเนเธ•เธฐ UI / เนเธกเน setTransport(null)
                        // เนเธเน mark เธงเนเธฒ socket เธเธตเนเนเธเนเนเธกเนเนเธ”เนเนเธฅเนเธง
                        if (currentTransport && currentTransport._ws === ws) {
                            currentTransport._ws = null;
                        }
                    }
                } else {
                    console.log("Ignore close from non-active WS");
                }

                if (silent) wifiSilentClose = false;
            };

            resolve(transport);
        };

        ws.onerror = (e) => {
            console.warn("WS error before open:", e);
            clearRememberedWiFiTarget();
            reject(e);
        };

        ws.onclose = () => {
            console.log("WS closed (before open)");
            clearRememberedWiFiTarget();
            reject(new Error("ws closed before open"));
        };
    });
}

function buildWebSerialFiltersFromBoards(boards = []) {
    const filters = [];
    for (const b of boards) {
        for (const u of (b.usb || [])) {
            const vid = parseInt(String(u.vendorId || '').replace(/^0x/i, ''), 16);
            const pidRaw = (u.productId != null) ? String(u.productId).replace(/^0x/i, '') : null;
            const pid = pidRaw ? parseInt(pidRaw, 16) : undefined;

            if (!Number.isFinite(vid)) continue;
            const f = { usbVendorId: vid };
            if (Number.isFinite(pid)) f.usbProductId = pid;
            filters.push(f);
        }
    }
    const key = f => `${f.usbVendorId}:${f.usbProductId ?? ''}`;
    return Array.from(new Map(filters.map(f => [key(f), f])).values());
}

/* ===== Device Picker (Wi-Fi + USB) ===== */
let showPortSelect = (opts = {}) => {
    const { preWiFi = null, providedPorts = [], forceWifiOnly = false, usbOnly = false } = opts;

    return new Promise(async (resolve, reject) => {
        const previousAutoConnectPause = !!window.autoConnectPause;
        window.autoConnectPause = true;
        $("#port-list").html("");
        let userPicked = false;
        let stopScan = false;
        let seenWifiKeys = new Set();
        let lastSerialPaths = [];
        let hadRenderedAnything = false;

        const hasWebSerial =
            !forceWifiOnly && !(usbOnly && isElectron) &&
            typeof navigator !== "undefined" &&
            navigator.serial &&
            typeof navigator.serial.getPorts === "function";

        const cleanup = () => {
            stopScan = true;
            window.autoConnectPause = previousAutoConnectPause;
            $("#port-list").off("click", "li");
            $("#port-select-button").off("click");
            $("#port-select-dialog .close-btn").off("click");
            $("#request-usb-btn").off("click");
        };

        const ensureScanningRow = () => {
            if (!$("#port-list li.scanning-row").length) {
                $("#port-list").append(`
      <li class="device-item scanning-row" data-transport="scanning">
        <i class="fas fa-spinner fa-spin usb-icon"></i>
        <span class="device-name">Scanning devices...</span>
      </li>
    `);
            }
        };

        const keepScanRowBottom = () => {
            const $scan = $("#port-list li.scanning-row");
            $("#port-list .device-item").each(function(){this.title=this.textContent.replace(/\s+/g,' ').trim();});
            if ($scan.length) $scan.appendTo("#port-list");
        };

        const renderWifiRow = (info) => {
            const key = `${info.ip}:${info.port}`;
            const existed = $(`#port-list li[data-transport="wifi"][data-key="${key}"]`).length > 0;
            if (!existed) {
                $("#port-list").prepend(`
      <li class="device-item" data-transport="wifi" data-key="${key}" data-path="WIFI:${info.ip}:${info.port}">
        <i class="fas fa-wifi usb-icon"></i>
        <span class="device-name">${info.name || "PT Robot"}</span>
        <span class="device-detail">&bull; ${info.ip}</span>
        <span class="device-meta">&bull; ${info.manufacturer || "PT Robotics"}</span>
      </li>
    `);
                hadRenderedAnything = true;
            } else {
                const $li = $(`#port-list li[data-transport="wifi"][data-key="${key}"]`);
                $li.find(".device-name").text(info.name || "ESP32 (Wi-Fi)");
                $li.find(".device-detail").text(`\u2022 ${info.ip}`);
                $li.find(".device-meta").text(`\u2022 ${info.manufacturer || "PT Robotics"}`);
            }
            seenWifiKeys.add(key);
            keepScanRowBottom();
        };

        const renderSerialList = (items) => {
            const activePath = $("#port-list > li.active").attr("data-path");
            $(`#port-list li[data-transport="serial"]`).remove();

            if (!items.length) {
                keepScanRowBottom();
                return;
            }
            for (const d of items) {
                $("#port-list").append(`
      <li class="device-item" data-transport="serial" data-path="${d.path}">
        <i class="fab fa-usb usb-icon"></i>
        <span class="device-name">${d.name || "Serial Device"}</span>
        <span class="device-detail">&bull; ${d.path}</span>
        <span class="device-meta">&bull; ${d.manufacturer || ""}</span>
      </li>
    `);
            }
            hadRenderedAnything = true;
            if (activePath) $(`#port-list > li[data-path="${activePath}"]`).addClass("active");
            keepScanRowBottom();
        };

        $("#port-list").off("click", "li").on("click", "li", function () {
            $("#port-list > li").removeClass("active");
            $(this).addClass("active");
        });

        $("#port-select-button").off("click").on("click", () => {
            userPicked = true;
            cleanup();
            $("#port-select-dialog").hide();
            const selectPath = $("#port-list > li.active").attr("data-path");
            return selectPath ? resolve(selectPath) : reject("not_select");
        });

        $("#port-select-dialog .close-btn").off("click").on("click", () => {
            userPicked = true;
            cleanup();
            $("#port-select-dialog").hide();
            reject("cancel");
        });

        $("#port-select-dialog").show();
        ensureScanningRow();
        keepScanRowBottom();

        const ensureRequestUsbButton = () => {
            const $ctr = $('#port-select-dialog .control-button');
            if ($ctr.length && !$('#request-usb-btn').length && hasWebSerial && !isElectron) {
                $('<button id="request-usb-btn" class="btn" style="display:none;margin-right:8px">Request USB</button>')
                    .insertBefore('#port-select-dialog .control-button #port-select-button');
            }
        };
        ensureRequestUsbButton();

        $('#request-usb-btn').off("click").on("click", async () => {
            try {
                const filters = buildWebSerialFiltersFromBoards(boards);
                await navigator.serial.requestPort(filters ? { filters } : undefined);

                const ports = await navigator.serial.getPorts();
                const detected = [];
                for (const port of ports) {
                    const info = port.getInfo?.() || {};
                    const vid = info.usbVendorId?.toString(16)?.toUpperCase();
                    const pid = info.usbProductId?.toString(16)?.toUpperCase();
                    const found = boards.find(b => b.usb?.some(u =>
                        u.vendorId?.toUpperCase() === vid &&
                        (!u.productId || u.productId?.toUpperCase() === pid)
                    ));
                    detected.push({
                        path: `VID:${vid || "????"}${pid ? (":PID:" + pid) : ""}`,
                        name: found ? found.name : "Unknown device",
                        manufacturer: found?.tags?.[0] || ""
                    });
                }
                renderSerialList(detected);
                lastSerialPaths = detected.map(d => d.path);
                $('#request-usb-btn').hide();
            } catch (e) {
                console.warn('requestPort canceled/failed:', e);
            }
        });

        if (!usbOnly && preWiFi?.reachable) {
            renderWifiRow(preWiFi);
            $('#request-usb-btn').hide();
        }

        if (providedPorts.length && hasWebSerial) {
            const detected = providedPorts.map(p => {
                const info = p.getInfo?.() || {};
                const vid = info.usbVendorId?.toString(16)?.toUpperCase();
                const pid = info.usbProductId?.toString(16)?.toUpperCase();
                const found = boards.find(b => b.usb?.some(u =>
                    u.vendorId?.toUpperCase() === vid &&
                    (!u.productId || u.productId?.toUpperCase() === pid)
                ));
                return {
                    path: `VID:${vid || "????"}${pid ? (":PID:" + pid) : ""}`,
                    name: found ? found.name : "Unknown device",
                    manufacturer: found?.tags?.[0] || ""
                };
            });
            renderSerialList(detected);
            lastSerialPaths = detected.map(d => d.path);
        }

        (async () => {
            while (!stopScan && !userPicked) {
                let wifiInfo = null;
                try {
                    wifiInfo = usbOnly ? null : await scanESP32Quick(getRememberedWiFiHost(), 800);
                    if (wifiInfo) renderWifiRow(wifiInfo);
                } catch { }

                if (isElectron && !usbOnly) {
                    try {
                        const robotList = await scanRobotDiscoveryElectron();
                        for (const robotInfo of robotList) {
                            renderWifiRow(robotInfo);
                        }
                    } catch { }
                }

                let authorizedPorts = [];
                if (hasWebSerial) {
                    try {
                        const ports = await navigator.serial.getPorts();
                        authorizedPorts = ports || [];
                        const detected = [];
                        for (const port of authorizedPorts) {
                            const info = port.getInfo?.() || {};
                            const vid = info.usbVendorId?.toString(16)?.toUpperCase();
                            const pid = info.usbProductId?.toString(16)?.toUpperCase();
                            const found = boards.find(b => b.usb?.some(u =>
                                u.vendorId?.toUpperCase() === vid &&
                                (!u.productId || u.productId?.toUpperCase() === pid)
                            ));
                            detected.push({
                                path: `VID:${vid || "????"}${pid ? (":PID:" + pid) : ""}`,
                                name: found ? found.name : "Unknown device",
                                manufacturer: found?.tags?.[0] || ""
                            });
                        }
                        const newPaths = detected.map(d => d.path).join(",");
                        const oldPaths = lastSerialPaths.join(",");
                        if (newPaths !== oldPaths) {
                            renderSerialList(detected);
                            lastSerialPaths = detected.map(d => d.path);
                        }
                    } catch { }
                } else if (isElectron) {
                    try {
                        const ports = await serialAPI.SerialPort.list();
                        const detected = (ports || []).map(p => ({
                            path: p.path,
                            name: p.friendlyName || 'Serial',
                            manufacturer: p.manufacturer || ''
                        }));
                        const newPaths = detected.map(d => d.path).join(",");
                        const oldPaths = lastSerialPaths.join(",");
                        if (newPaths !== oldPaths) {
                            renderSerialList(detected);
                            lastSerialPaths = detected.map(d => d.path);
                        }
                        authorizedPorts = detected;
                    } catch { }
                }

                const shouldShowRequestBtn =
                    hasWebSerial && !isElectron &&
                    wifiInfo == null &&
                    (!authorizedPorts || authorizedPorts.length === 0);

                if (shouldShowRequestBtn) {
                    $('#request-usb-btn').show();
                } else {
                    $('#request-usb-btn').hide();
                }

                for (let i = 0; i < 10 && !stopScan && !userPicked; i++) {
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        })();
    });
};

/* ===== Web Serial connect ===== */
let serialConnectWeb = async (auto = false) => {
    if (auto && window.autoConnectPause) return { ok: false };
    if (isSerialConnecting || currentTransport) return { ok: false };
    isSerialConnecting = true;

    try {
        const hasWebSerial =
            typeof navigator !== "undefined" &&
            navigator.serial &&
            typeof navigator.serial.getPorts === "function";

        let ports = [];
        let preWiFi = null;

        if (hasWebSerial) {
            try { ports = await navigator.serial.getPorts(); } catch { }
            if (!ports.length) {
                if (!auto) {
                    try {
                        const filters = buildWebSerialFiltersFromBoards(boards);
                        console.log("Requesting new port permission...");
                        await navigator.serial.requestPort(filters ? { filters } : undefined);
                        ports = await navigator.serial.getPorts();
                    } catch (e) {
                        console.warn("requestPort canceled/failed:", e);
                    }
                }
            }
        }

        try { preWiFi = await scanESP32Quick(getRememberedWiFiHost()); } catch { }

        const picked = await showPortSelect({
            preWiFi,
            providedPorts: ports,
            forceWifiOnly: !hasWebSerial
        });

        if (picked && picked.startsWith("WIFI:")) {
            const [_, ip, portStr] = picked.split(/[:]/);
            ensureTerminal();
            await connectWiFiREPL(ip, +portStr || 8080);
            return { used: "wifi", ok: true };
        }

        if (!hasWebSerial) {
            NotifyE?.("This browser doesn't support Web Serial. Please pick Wi-Fi.");
            return { ok: false };
        }

        serialPort = ports[0] || null;
        if (!serialPort) throw new Error("No serial port selected/authorized.");

        const info = serialPort.getInfo?.() || {};
        const productId = info.usbProductId?.toString(16).toUpperCase();
        const vendorId = info.usbVendorId?.toString(16).toUpperCase();
        const foundBoard = boards?.find(b =>
            b.usb?.some(u => u.vendorId?.toUpperCase() === vendorId && u.productId?.toUpperCase() === productId)
        );
        if (foundBoard) console.log(`Detected board: ${foundBoard.name}`);
        else console.warn("Unknown device", { vendorId, productId });

        if (!serialPort.readable) {
            await serialPort.open({ baudRate: 115200 });
            console.log("Serial port opened!");
        }

        try { NotifyS?.("Serial port connected"); } catch { }
        statusLog?.("Serial port connected");
        rememberLastConnection({ transport: "usb" });
        $("#port-name").text("CONNECTED");
        $("#disconnect-device").show();
        $("#connect-device").hide();
        try { window.dashboardIsReady && dashboardWin.serialStatusUpdate("connected"); } catch { }

        writer = serialPort.writable.getWriter();

        ensureTerminal();
        resetSerialTextDecoder();

        serialPort.readable.pipeTo(new WritableStream({
            write(chunk) {
                if (!window.firmwareUpdateMode) {
                    appendSerialText(decodeSerialChunk(chunk));
                    try { window.dashboardIsReady && dashboardWin.streamDataIn?.(chunk); } catch { }
                } else {
                    window.inputBuffer = (window.inputBuffer || []).concat(Array.from(chunk));
                }
            }
        }));

        term.onData((data) => { writeSerial(data); });

        setTransport({
            type: "usb",
            isOpen() { return !!serialPort && (!!serialPort.readable); },
            async write(text) { await writeSerial(text); },
            async writeByte(b) { await writeSerialByte(b); },
            async writeBytes(arr) { await writeSerialBytes(arr); },
            async close() {
                try {
                    if (writer) { try { await writer.close(); } catch { } writer = null; }
                    try { await serialPort?.readable?.cancel?.(); } catch { }
                    await serialPort?.close?.();
                } finally {
                    serialPort = null;
                }
            }
        });

        return { used: "serial", ok: true };
    } finally {
        isSerialConnecting = false;
    }
};

/* ===== Electron Serial connect ===== */
function arduinoOwnsSerialPort() {
    return !!window.arduinoSerialOwnership || !!window.IDEArduino?.active;
}
let serialConnectElectron = async (portName = "", autoConnect = false) => {
    if (arduinoOwnsSerialPort()) return false;
    if (window.legacySerialConnecting) return window.legacySerialConnecting;
    const pending = connectLegacySerialElectron(portName, autoConnect);
    window.legacySerialConnecting = pending;
    try { return await pending; }
    finally { if (window.legacySerialConnecting === pending) window.legacySerialConnecting = null; }
};
async function connectLegacySerialElectron(portName = "", autoConnect = false) {
    if (autoConnect && window.autoConnectPause) return false;
    if (!portName) {
        try {
            portName = await showPortSelect();
            if (typeof portName === "string" && portName.startsWith("WIFI:")) {
                const [_, ip, portStr] = portName.split(/[:]/);
                ensureTerminal();
                await connectWiFiREPL(ip, +portStr || 8080);
                return true;
            }
        } catch (e) {
            NotifyE?.("You not select port");
            console.log(e);
            return false;
        }
    }

    // Port selection may have awaited while the project switched to Arduino.
    if (arduinoOwnsSerialPort()) return false;
    try {
        await (new Promise((resolve, reject) => {
            serialPort = new serialAPI.SerialPort({ path: portName, baudRate: 115200 }, (err) => {
                if (err) reject(err); else resolve();
            });
        }));
    } catch (e) {
        if (!autoConnect) NotifyE?.("Can't open serial port, some program use this port ?");
        console.log(e);
        serialPort = null;
        return false;
    }

    NotifyS?.("Serial port connected");
    statusLog?.("Serial port connected");
    rememberLastConnection({ transport: "usb", portName });
    $("#port-name").text(`CONNECTED (${portName})`);
    try { sharedObj?.dashboardWin?.webContents?.send("serial-status", "connected"); } catch { }

    try { serialPort.set({ dtr: true, rts: true }); } catch { }

    serialPort.on("close", () => {
        if (silentReconnect) {
            console.log("Port closed silently (reset in progress)");
            return;
        }

        NotifyW?.("Serial port disconnect");
        $("#port-name").text(`DISCONNECT`);
        $("#disconnect-device").hide();
        $("#connect-device").show();
        try { sharedObj?.dashboardWin?.webContents?.send("serial-status", "disconnect"); } catch { }

        serialPort = null;
        try { term?.dispose(); } catch { }
        term = null;
        setTransport(null);
    });

    ensureTerminal();
    resetSerialTextDecoder();

    serialPort.on("data", (chunk) => {
        if (!window.firmwareUpdateMode) {
            appendSerialText(decodeSerialChunk(chunk));
            try { sharedObj?.dashboardWin?.webContents?.send("serial-data-in", chunk); } catch { }
        } else {
            window.inputBuffer = (window.inputBuffer || []).concat(Array.from(chunk));
        }
    });

    term.onData((data) => { writeSerial(data); });

    $("#disconnect-device").show();
    $("#connect-device").hide();

    setTransport({
        type: "usb",
        isOpen() { return !!serialPort && serialPort.isOpen; },
        async write(text) { await writeSerial(text); },
        async writeByte(b) { await writeSerialByte(b); },
        async writeBytes(arr) { await writeSerialBytes(arr); },
        async close() {
            try { await serialPort?.close?.(); } catch { }
            serialPort = null;
        }
    });

    return true;
};

async function initSerialPortElectron(portName, retryDelay = 100) {
    if (arduinoOwnsSerialPort()) return;
    if (serialPort && serialPort.isOpen) {
        console.log("Port already open:", portName);
        return;
    }
    if (isConnecting) {
        console.log("Already connecting...");
        return;
    }
    isConnecting = true;

    return new Promise((resolve) => {
        function tryConnect() {
            serialPort = new serialAPI.SerialPort({ path: portName, baudRate: 115200 }, (err) => {
                if (err) {
                    console.error("Reconnect error:", err.message);
                    serialPort = null;
                    setTimeout(tryConnect, retryDelay);
                    return;
                }

                console.log("Reconnected to", portName);
                isConnecting = false;

                try { serialPort.set({ dtr: true, rts: true }); } catch { }

                serialPort.on("data", (chunk) => {
                    if (!window.firmwareUpdateMode) {
                        appendSerialText(decodeSerialChunk(chunk));
                        try { sharedObj?.dashboardWin?.webContents?.send("serial-data-in", chunk); } catch { }
                    } else {
                        window.inputBuffer = (window.inputBuffer || []).concat(Array.from(chunk));
                    }
                });

                serialPort.on("close", () => {
                    if (silentReconnect) {
                        console.log("Port closed silently (reset in progress)");
                        return;
                    }
                    NotifyW?.("Serial port disconnect");
                    $("#port-name").text(`DISCONNECT`);
                    $("#disconnect-device").hide();
                    $("#connect-device").show();
                    try { sharedObj?.dashboardWin?.webContents?.send("serial-status", "disconnect"); } catch { }
                    serialPort = null;
                    try { term?.dispose(); } catch { }
                    term = null;
                    setTransport(null);
                });

                if (!term) ensureTerminal();
                resetSerialTextDecoder();
                term.onData((data) => { writeSerial(data); });

                $("#port-name").text(`CONNECTED (${portName})`);
                $("#disconnect-device").show();
                $("#connect-device").hide();
                rememberLastConnection({ transport: "usb", portName });
                try { sharedObj?.dashboardWin?.webContents?.send("serial-status", "connected"); } catch { }

                setTransport({
                    type: "usb",
                    isOpen() { return !!serialPort && serialPort.isOpen; },
                    async write(text) { await writeSerial(text); },
                    async writeByte(b) { await writeSerialByte(b); },
                    async writeBytes(arr) { await writeSerialBytes(arr); },
                    async close() { try { await serialPort?.close?.(); } catch { } serialPort = null; }
                });

                resolve();
            });
        }
        tryConnect();
    });
}

/* ===== Unified connect() selector ===== */
let serialConnect = () => {
    uploadFileLog = {};
    return (!isElectron) ? serialConnectWeb(false) : serialConnectElectron();
};

/* ===== Reset (USB only) ===== */
let boardReset = (enterToBootMode) => {
    if (typeof enterToBootMode === "undefined") enterToBootMode = false;

    if (currentTransport?.type === "wifi") {
        return new Promise(async (resolve, reject) => {
            const ws = currentTransport?._ws;
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                reject(new Error("Wi-Fi bridge is not connected"));
                return;
            }

            let settled = false;
            const timeoutId = setTimeout(() => {
                if (settled) return;
                settled = true;
                window.removeEventListener("robot-bridge-message", onBridgeMessage);
                resolve();
            }, enterToBootMode ? 1200 : 800);

            function finishWithError(error) {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                window.removeEventListener("robot-bridge-message", onBridgeMessage);
                reject(error);
            }

            function finishOk() {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                window.removeEventListener("robot-bridge-message", onBridgeMessage);
                resolve();
            }

            function onBridgeMessage(event) {
                const payload = event?.detail;
                if (!payload || typeof payload !== "object") return;
                if (payload.type === "error") {
                    finishWithError(new Error(payload.message || "Bridge reset failed"));
                    return;
                }
                if (payload.type === "board_reset_result" || payload.type === "BOARD_RESET_RESULT") {
                    if (payload.ok === false) finishWithError(new Error(payload.message || "Bridge reset failed"));
                    else finishOk();
                    return;
                }
                if (payload.type === "status" || payload.type === "board_reset_done") {
                    finishOk();
                }
            }

            window.addEventListener("robot-bridge-message", onBridgeMessage);

            try {
                ws.send(JSON.stringify({
                    type: "BOARD_RESET",
                    enter_boot_mode: !!enterToBootMode,
                }));
            } catch (error) {
                finishWithError(error);
            }
        });
    }

    return new Promise(async resolve => {
        if (!isElectron) {
            if (!serialPort) return resolve();

            if (!enterToBootMode) {
                await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
                await serialPort.setSignals({ dataTerminalReady: false, requestToSend: true });
                await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
                resolve();
            } else {
                await serialPort.setSignals({ dataTerminalReady: 0, requestToSend: 1 });
                await sleep(50);
                await serialPort.setSignals({ dataTerminalReady: 1, requestToSend: 0 });
                await sleep(500);
                await serialPort.setSignals({ dataTerminalReady: 0, requestToSend: 0 });
                await sleep(100);
                resolve();
            }
        } else {
            if (!serialPort) return resolve();
            if (!enterToBootMode) {
                serialPort.set({ dtr: true, rts: true }, () =>
                    serialPort.set({ dtr: false, rts: true }, async () => {
                        await sleep(50);
                        serialPort.set({ dtr: true, rts: true }, resolve);
                    })
                );
            } else {
                console.log("Try to BOOT mode");
                serialPort.set({ dtr: 0, rts: 1 }, async () => {
                    await sleep(300);
                    serialPort.set({ dtr: 1, rts: 0 }, async () => {
                        serialPort.set({ dtr: 0, rts: 0 }, resolve);
                    });
                });
            }
        }
    });
};

/* ===== Upload flows (REPL / MSC / OnBoot) ===== */
class UploadOnBoot {
    constructor() { }
    async start() {
        serialLastData = "";
        await boardReset();
        if (!await this.checkEndWith("wait upload\r\n", 50, 50)) throw "wait upload keyword timeout, only can use old method ?";

        serialLastData = "";
        await writeSerialBytes([0x1F, 0xF1, 0xFF]);
        if (!await this.checkEndWith("upload mode\r\n", 100, 30)) throw "Send sync bytes fail";
    }
    async getFirmwareInfo() {
        serialLastData = "";
        await this.sendCmd(0x01);
        if (!await this.checkEndWith("\r\n", 50, 30)) throw "Device not respond";
        let m = /MicroPython\s+([^\s]+)\s+on\s+([0-9\-]+);\s?(.+)\s+with\s+([^\s]+)$/m.exec(serialLastData);
        if (!m) throw "Check version fail";
        return { version: m[1], date: m[2], board: m[3], cpu: m[4] };
    }
    async upload(fileName, content) {
        if (!content || content.length === 0) content = "#No Code";
        serialLastData = "";
        await this.sendCmd(0x10, fileName);
        if (!await this.checkEndWith(`set path to ${fileName}\r\n`, 50, 20)) throw "Set path fail !";

        for (const chunkContent of content.match(/.{1,10000}/gs)) {
            serialLastData = "";
            await this.sendCmd(0x11, chunkContent);
            if (!await this.checkEndWith("write end\r\n", 50, 100)) throw "Error, write file fail !";
        }
    }
    async end() {
        serialLastData = "";
        await this.sendCmd(0xFF);
        if (!await this.checkIndexOf("exit upload mode\r\n", 50, 50)) throw "exit upload mode fail";
    }
    async sendCmd(cmd, data) {
        let encodeData = new TextEncoder("utf-8").encode(data || "");
        let content = [];
        content.push(cmd);
        if (typeof data !== "undefined") {
            content.push((encodeData.length >> 8) & 0xFF);
            content.push(encodeData.length & 0xFF);
            content = content.concat(Array.from(encodeData));
            let dataSum = 0;
            for (let i = 0; i < encodeData.length; i++) { dataSum = (dataSum + encodeData[i]) & 0xFF; }
            content.push(dataSum);
        }
        await writeSerialBytes(content);
    }
    async checkEndWith(str, delay = 100, max_try = 10) {
        for (let i = 0; i < max_try; i++) { await sleep(delay); if (serialLastData.endsWith(str)) return true; }
        return false;
    }
    async checkIndexOf(str, stop = 100, max_try = 10) {
        for (let i = 0; i < max_try; i++) { await sleep(stop); if (serialLastData.indexOf(str) >= 0) return true; }
        return false;
    }
}

class UploadViaREPL {
    constructor() {
        RawREPLMode = false;
        this.firmwareInfo = null;
    }
    async start() {
        term?.clear();

        pendingEcho = "";
        serialLastData = "";

        if (!serialLastData.endsWith(">>>") && serialLastData.endsWith(">")) {
            serialLastData = "";
            RawREPLMode = true;
            await this.sendByteLoopWaitNextCommand(2, 100, 5);
        }

        RawREPLMode = false;
        disable_terminal = true;

        serialLastData = "";
        if (!await this.sendByteLoopWaitNextCommand(3, 100, 100)) {
            throw "Exit main program error";
        }

        disable_terminal = false;
        try {
            const idx = serialLastData.indexOf("Adafruit");
            if (idx >= 0) term?.write(serialLastData.slice(idx));
        } catch { }

        let m = /Python\s+([^\s]+)\s+on\s+([0-9\-]+);\s?(.+)\s+with\s+([^\s]+)$/m.exec(serialLastData);
        if (m) this.firmwareInfo = { version: m[1], date: m[2], board: m[3], cpu: m[4] };

        RawREPLMode = true;
        serialLastData = "";
        pendingEcho = "";
        if (!await this.sendByteLoopWaitNextCommand(1, 40, 80)) {
            throw "Enter to Raw REPL fail";
        }
    }
    async getFirmwareInfo() { return this.firmwareInfo; }
    _toPyStrLiteral(str) {
        return JSON.stringify(str).replace(/[\u007F-\uFFFF]/g, c => "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4));
    }
    async upload(fileName, content) {
        if (!content || content.length === 0) content = "#No Code";

        pendingEcho = "";
        serialLastData = "";

        const restoreTerm = (disable_terminal === false);
        try {
            const board = boards.find(board => board.id === boardId);
            const chipId = board?.chip || "ESP32";
            const isWifi = (currentTransport?.type === "wifi");
            const BIG_CHUNK =
                (chipId.includes("RP2")) ? 2048 :
                    (isWifi ? 300 : 1024);

            serialLastData = "";
            if (!await this.sendLineLoopWaitMatch(
                `f = open("${fileName}", "w"); w = f.write; p = print`,
                />\s*$/m, 30, 12
            )) {
                serialLastData = "";
                if (!await this.sendLineLoopWaitMatch(`p("OK")`, />\s*$/m, 30, 8)) {
                    throw `open file ${fileName} fail !`;
                }
            }

            const parts = content.match(new RegExp(`.{1,${BIG_CHUNK}}`, "gs")) || [content];
            for (const part of parts) {
                const payload = this._toPyStrLiteral(part);

                serialLastData = "";
                if (!await this.sendLineLoopWaitMatch(
                    `p(w(${payload}))`,
                    />\s*$/m, 40, 20
                )) {
                    throw `write ${part.length} fail !`;
                }

                const wrote = (serialLastData.match(/\b(\d+)\b/g) || []).map(n => +n).pop();
                if (typeof wrote === "number" && wrote !== part.length) {
                    if (!(wrote > 0)) throw `write size mismatch (${wrote} != ${part.length})`;
                }
            }

            serialLastData = "";
            if (!await this.sendLineLoopWaitMatch(`f.close()`, />\s*$/m, 50, 10)) {
                await this.sendLineLoopWaitMatch(`p("OK")`, />\s*$/m, 40, 8)
                    .catch(() => { throw `close file ${fileName} fail !`; });
            }
        } finally {
            if (restoreTerm) disable_terminal = false;
        }
    }
    async end() {
        await writeSerialByte(2);
        RawREPLMode = false;
        try { await this.writeSerialNewLine(`exec(open("main.py", "r").read(),globals())`); } catch { }
    }
    async sendByteLoopWaitNextCommand(data, delay = 100, max_try = 5) {
        for (let i = 0; i < max_try; i++) {
            await writeSerialByte(data);
            await sleep(delay);
            if (microPythonIsReadyNextCommand()) return true;
        }
        return false;
    }
    async sendLineLoopWaitMatch(line, regex, delay = 100, max_try = 5) {
        await this.writeSerialNewLine(line);
        for (let i = 0; i < max_try; i++) {
            await sleep(delay);
            if (serialLastData.match(regex)) return true;
        }
        return false;
    }
    writeSerialNewLine(text) {
        writeSerial(text + ((!RawREPLMode) ? "\r\n" : "\x04"));
    }
}

// PowerShell disk listing for Windows (avoids deprecated wmic)
async function listWindowsDisks() {
    const cmd = 'powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,Size,VolumeName | ConvertTo-Json"';
    const stdout = await new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, out) => {
            if (err) return reject(err);
            if (!out || !String(out).trim()) return reject(new Error("No disk info"));
            resolve(out);
        });
    });

    let parsed;
    try {
        parsed = JSON.parse(stdout);
    } catch (e) {
        throw new Error("Parse disk info failed");
    }

    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
        .filter(r => r && r.Size)
        .map(r => ({
            mounted: `${String(r.DeviceID || "").replace(/\\+$/, "")}\\`,
            blocks: Number(r.Size),
            description: r.VolumeName || ""
        }));
}

class UploadViaMSC {
    constructor() { RawREPLMode = false; this.mount = null; }
    async start() {
        term?.clear();

        if (!serialLastData.endsWith(">>>") && serialLastData.endsWith(">")) {
            serialLastData = "";
            RawREPLMode = true;
            await this.sendByteLoopWaitNextCommand(2, 100, 5);
        }

        RawREPLMode = false;
        disable_terminal = true;

        serialLastData = "";
        if (!await this.sendByteLoopWaitNextCommand(3, 100, 100)) {
            throw "Exit main program error";
        }

        disable_terminal = false;
        try {
            const idx = serialLastData.indexOf("Adafruit");
            if (idx >= 0) term?.write(serialLastData.slice(idx));
        } catch { }

        let m = /Python\s+([^\s]+)\s+on\s+([0-9\-]+);\s?(.+)\s+with\s+([^\s]+)$/m.exec(serialLastData);
        if (m) this.firmwareInfo = { version: m[1], date: m[2], board: m[3], cpu: m[4] };

        const platform = os.platform();
        let drives = [];
        if (platform === "win32") {
            try {
                drives = await listWindowsDisks();
            } catch (err) {
                console.warn("PowerShell disk listing failed, fallback to node-disk-info:", err);
                drives = await nodeDiskInfo.getDiskInfo();
            }
        } else if (platform === "linux" || platform === "darwin") {
            throw `MSC not support in linux and darwin !`;
        }
        const board = boards.find(board => board.id === boardId);
        const RP2DriveInfo = drives.find(a => a.blocks === board.mscSize);
        if (!RP2DriveInfo) throw `MSC drive not found !`;
        this.mount = RP2DriveInfo.mounted;
    }
    async getFirmwareInfo() { return this.firmwareInfo; }
    async upload(fileName, content) {
        if (!content || content.length === 0) content = "#No Code";
        await writeFileAsync(path.join(this.mount, "/", fileName), content);
    }
    async end() {
        if (os.platform() === "linux") await sleep(2000);
        await writeSerialByte(4);
        await sleep(300);
    }
    async sendByteLoopWaitNextCommand(data, delay = 100, max_try = 5) {
        for (let i = 0; i < max_try; i++) {
            await writeSerialByte(data);
            await sleep(delay);
            if (microPythonIsReadyNextCommand()) return true;
        }
        return false;
    }
    async sendLineLoopWaitMatch(line, regex, delay = 100, max_try = 5) {
        await this.writeSerialNewLine(line);
        for (let i = 0; i < max_try; i++) {
            await sleep(delay);
            if (serialLastData.match(regex)) return true;
        }
        return false;
    }
    writeSerialNewLine(text) {
        writeSerial(text + ((!RawREPLMode) ? "\r\n" : "\x04"));
    }
}

async function httpPutFs(base, path, data, contentType = "application/octet-stream") {
    const url = `${base}/fs/${encodeURI(path).replace(/^\/+/, "")}`;

    try {
        const res = await robotHttpRequest(url, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: (typeof data === "string") ? data : new Uint8Array(data),
        });

        if (!res.ok) {
            let txt = "";
            try { txt = await res.text(); } catch { }
            console.warn(`PUT ${path} failed: ${res.status} ${txt}`);
            return null;
        }

        try {
            return await res.text();
        } catch {
            return "uploaded";
        }
    } catch (e) {
        console.warn(`httpPutFs(${path}) fetch error:`, e);
        return null;
    }
}

async function httpGetFs(base, path) {
    const url = `${base}/fs/${encodeURI(path).replace(/^\/+/, "")}`;
    const res = await robotHttpRequest(url, { method: "GET" });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return await res.text();
}

async function httpDeleteFs(base, path) {
    const url = `${base}/fs/${encodeURI(path).replace(/^\/+/, "")}`;
    const res = await robotHttpRequest(url, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
    return await res.text();
}

async function httpMkcolFs(base, dirPath) {
    const url = `${base}/fs/${encodeURI(dirPath).replace(/^\/+/, "")}`;
    const res = await robotHttpRequest(url, { method: "MKCOL" });
    if (!res.ok && res.status !== 201 && res.status !== 204) {
        throw new Error(`MKCOL ${dirPath} failed: ${res.status}`);
    }
    return true;
}

class UploadViaHTTP {
    constructor() {
        this.base =
            currentTransport?.httpBase ||
            getRobotHttpBase(
                localStorage.getItem("ptbot_wifi_ip") || "esp.pt-robotics.com",
                localStorage.getItem("ptbot_wifi_port") || 8080
            );
    }

    async _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    async _sendCtrlC(times = 1, gapMs = 60) {
        term?.clear();
        for (let i = 0; i < times; i++) {
            try {
                if (typeof writeSerialByte === "function") await writeSerialByte(3);
                else await currentTransport?.write?.("\x03");
            } catch { }
            await this._sleep(gapMs);
        }
    }

    async _sendCtrlB(times = 3, gapMs = 80) {
        for (let i = 0; i < times; i++) {
            try {
                if (typeof writeSerialByte === "function") await writeSerialByte(2);
                else await currentTransport?.write?.("\x02");
            } catch { }
            await this._sleep(gapMs);
        }
    }

    async _poke() {
        try { await currentTransport?.write?.("\r\n"); } catch { }
        await this._sleep(50);
    }

    async _waitPrompt(timeoutMs = 1500, pollMs = 50) {
        const t0 = Date.now();
        while (Date.now() - t0 < timeoutMs) {
            if (microPythonIsReadyNextCommand?.()) return true;
            await this._sleep(pollMs);
        }
        return false;
    }

    async _sendCtrlD() {
        try {
            if (typeof writeSerialByte === "function") await writeSerialByte(4);
            else await currentTransport?.write?.("\x04");
        } catch { }
    }

    _looksLikeRawRepl() {
        const s = serialLastData || "";
        return /\braw REPL; CTRL-B to exit\b/.test(s) ||
            (!s.endsWith(">>> ") && s.endsWith(">"));
    }

    async start() {
        try { pendingEcho = ""; } catch { }
        try { serialLastData = ""; } catch { }

        await this._sendCtrlC(3, 100);
        await this._poke();

        if (this._looksLikeRawRepl()) {
            await this._sendCtrlB(3, 90);
            await this._poke();
            let ok = await this._waitPrompt(1600, 60);
            if (!ok) {
                await this._sendCtrlB(2, 120);
                await this._poke();
                ok = await this._waitPrompt(1800, 60);
            }
            if (!ok) {
                console.warn("[UploadViaHTTP] Could not confirm >>> after ^B (continuing)");
            } else {
                RawREPLMode = false;
            }
        } else {
            RawREPLMode = false;
        }
    }

    async getFirmwareInfo() { return null; }

    async upload(fileName, content) {
        await this._sleep(100);
        const m = /^(.*)\/[^/]+$/.exec(fileName);
        if (m && m[1] && m[1] !== "/") {
            const parts = m[1].replace(/^\/+|\/+$/g, "").split("/");
            let acc = "";
            for (const p of parts) {
                acc += ("/" + p);
                try { await httpMkcolFs(this.base, acc); } catch (_) { }
            }
        }

        const ct = /\.py$/i.test(fileName)
            ? "text/plain; charset=utf-8"
            : "application/octet-stream";
        await httpPutFs(this.base, fileName, content ?? "", ct);
    }

    async end() {
        await this._sleep(150);
        try { serialLastData = ""; } catch { }
        try { pendingEcho = ""; } catch { }
    }
}

class UploadViaBridge {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.files = [];
        this.ws = currentTransport?._ws || null;
    }

    async start() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("Wi-Fi bridge is not connected");
        }
        this.files = [];
        try { pendingEcho = ""; } catch { }
        try { serialLastData = ""; } catch { }
        try { RawREPLMode = false; } catch { }
        try { disable_terminal = false; } catch { }
        statusLog?.(`[bridge upload] ready ${this.host}:${this.port}`);
    }

    async getFirmwareInfo() { return null; }

    async upload(fileName, content) {
        const text = (content == null || content === "") ? "#No Code" : String(content);
        const bytes = new TextEncoder().encode(text);
        const base64 = Buffer.from(bytes).toString("base64");
        this.files.push({
            path: fileName,
            content_b64: base64,
        });
        statusLog?.(`[bridge upload] queue ${fileName} (${bytes.length} bytes)`);
    }

    async end() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("Wi-Fi bridge is not connected");
        }

        const files = this.files.slice();
        if (!files.length) {
            return;
        }

        await new Promise((resolve, reject) => {
            let settled = false;
            const timeoutId = setTimeout(() => {
                finishError(new Error("Timed out waiting for upload_result from robot bridge"));
            }, 120000);

            const finishOk = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                window.removeEventListener("robot-bridge-message", onBridgeMessage);
                try { pendingEcho = ""; } catch { }
                try { serialLastData = ""; } catch { }
                try { RawREPLMode = false; } catch { }
                try { disable_terminal = false; } catch { }
                try { bypassEchoUntil = Date.now() + 2500; } catch { }
                try { ensureTerminal?.(); } catch { }
                resolve();
            };

            const finishError = (error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                window.removeEventListener("robot-bridge-message", onBridgeMessage);
                reject(error);
            };

            const onBridgeMessage = (event) => {
                const payload = event?.detail;
                if (!payload || typeof payload !== "object") return;

                if (payload.type === "upload_status") {
                    statusLog?.(`[bridge upload] ${payload.message || ""}`.trim());
                    return;
                }

                if (payload.type === "upload_progress") {
                    const file = payload.file || "";
                    const written = Number(payload.written) || 0;
                    const total = Number(payload.total) || 0;
                    statusLog?.(`[bridge upload] ${file} ${written}/${total}`);
                    return;
                }

                if (payload.type === "upload_result") {
                    if (payload.ok) {
                        statusLog?.("[bridge upload] complete");
                        finishOk();
                    } else {
                        finishError(new Error(payload.message || "Upload failed"));
                    }
                }
            };

            window.addEventListener("robot-bridge-message", onBridgeMessage);

            try {
                statusLog?.(`[bridge upload] sending UPLOAD_FILES (${files.length} files)`);
                this.ws.send(JSON.stringify({
                    type: "UPLOAD_FILES",
                    files,
                }));
            } catch (error) {
                finishError(error);
            }
        });

        this.files = [];
        try { pendingEcho = ""; } catch { }
        try { RawREPLMode = false; } catch { }
        try { disable_terminal = false; } catch { }
    }
}

/* ===== WSS Upload Transport (/upload) ===== */
// ... (เธชเนเธงเธ UploadViaWSS เน€เธซเธกเธทเธญเธเน€เธ”เธดเธกเนเธเนเธเนเธ”เธฅเนเธฒเธชเธธเธ”เธเธญเธเธเธธเธ“ โ€” เนเธกเนเนเธ•เธฐ)

// (เน€เธเธทเนเธญเธเธงเธฒเธกเธชเธฑเนเธ เธ–เนเธฒเธ•เนเธญเธเธเธฒเธฃเธ—เธฑเนเธ UploadViaWSS เน€เธ•เนเธก เน เน€เธซเธกเธทเธญเธเน€เธ”เธดเธก เนเธซเนเธเธฑเธ”เธเธฒเธเนเธเธฅเนเธเธฑเธเธเธธเธเธฑเธเธกเธฒเธงเธฒเธเนเธ”เนเน€เธฅเธข)

/* ===== Code generator helper (unchanged) ===== */
const xmlToCode = xml_text => {
    const work_div = document.createElement("div");
    document.querySelector("body").appendChild(work_div);
    const tmp_workspace = Blockly.inject(work_div, {});
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml_text), tmp_workspace);
    const { isArduinoPlatform } = boards.find(board => board.id === boardId);
    const code = (!isArduinoPlatform) ? Blockly.Python.workspaceToCode(tmp_workspace) : Blockly.JavaScript.workspaceToCode(tmp_workspace);
    work_div.remove();
    return code;
};

/* ===== Upload dispatcher ===== */
let extra_files = [];
let uploadFileLog = {};

let realDeviceUploadFlow = async (code) => {
    if (!currentTransport) {
        const r = await serialConnect();
        if (!r || r.ok === false) {
            $("#upload-program").removeClass("loading");
            return;
        }
        await sleep(300);
    }

    let filesUpload = [];
    let uploadModuleList = findIncludeModuleNameInCode(code);
    
    if (uploadModuleList.length > 0) {
        for (const extensionId of fs.ls("/extension")) {
            for (const filePath of fs.walk(`/extension/${extensionId}/modules`)) {
                let fileName = filePath.replace(/^\//gm, "");
                if (fileName.endsWith(".py") || fileName.endsWith(".mpy")) {
                    if (uploadModuleList.indexOf(fileName.replace(/\..+$/, "")) >= 0) {
                        filesUpload.push({
                            file: filePath.replace(/^.*[\\\/]/, ''),
                            content: fs.read(`/extension/${extensionId}/modules/${fileName}`)
                        });
                    }
                }
            }
        }

        if (isElectron) {
            let extensionDir = sharedObj.extensionDir;
            for (const extensionId of nodeFS.ls(extensionDir)) {
                for (const filePath of (await nodeFS.walk(`${extensionDir}/${extensionId}/modules`))) {
                    let fileName = path.basename(filePath);
                    if (fileName.endsWith(".py") || fileName.endsWith(".mpy")) {
                        if (uploadModuleList.indexOf(fileName.replace(/\..+$/, "")) >= 0) {
                            filesUpload.push({
                                file: filePath.replace(/^.*[\\\/]/, ''),
                                content: (await readFileAsync(filePath)).toString()
                            });
                        }
                    }
                }
            }
        }

        for (const fileName of fs.ls("/")) {
            if ((fileName === "main.py") || (fileName === "main.xml")) { // Skip main file
                continue;
            }

            if (uploadModuleList.indexOf(fileName.replace(/\..+$/, "")) >= 0) {
                if (fileName.endsWith(".py") || fileName.endsWith(".mpy")) {
                    filesUpload.push({
                        file: fileName.replace(/^.*[\\\/]/, ''),
                        content: fs.read(`/${fileName}`)
                    });
                } else if (fileName.endsWith(".xml")) {
                    const code = xmlToCode(fs.read(`/${fileName}`));

                    filesUpload.push({
                        file: fileName.replace(/^.*[\\\/]/, '').replace(".xml", ".py"),
                        content: code
                    });
                }
            }
        }
    }
    
    filesUpload = filesUpload.concat(extra_files);
    filesUpload.push({
        file: "main.py",
        content: code
    });

    // console.log(filesUpload);

    try {
        let method;
        let wifiReconnectInfo = null;

        const enterToREPL = async () => {
            method = new UploadViaREPL();
            try { await method.start(); }
            catch (e) { firewareUpgradeFlow?.(); throw e; }
        };

        if (currentTransport?.type === "wifi") {
            const host =
                currentTransport.host ||
                localStorage.getItem("ptbot_wifi_ip") ||
                "esp.pt-robotics.com";
            const port =
                currentTransport.port ||
                (+localStorage.getItem("ptbot_wifi_port") || 8080);

            statusLog?.(`Uploading via WiFi bridge: ${host}:${port}`);

            method = new UploadViaBridge(host, port);
            await method.start();
        } else {
            const board = boards.find(b => b.id === boardId);
            const FORCE_REPL_ON_WEB_IF_MSC = !isElectron && (board?.uploadMode === "MSC");

            if (board?.uploadMode === "REPL" || FORCE_REPL_ON_WEB_IF_MSC) {
                if (FORCE_REPL_ON_WEB_IF_MSC) console.log("MSC disabled using REPL instead.");
                await enterToREPL();
            } else if (board?.uploadMode === "MSC") {
                method = new UploadViaMSC();
                try { await method.start(); }
                catch (e) { console.warn(e); NotifyW?.("Switching to Raw REPL"); await enterToREPL(); }
            } else {
                method = new UploadOnBoot();
                try { await method.start(); }
                catch (e) { console.warn(e); NotifyW?.("Switching to Raw REPL"); await enterToREPL(); }
            }
        }

        for (let a of filesUpload) {
            statusLog?.(`Uploading ${a.file}`);
            await method.upload(a.file, a.content);
        }
        await method.end();
        delete method;
        window.autoConnectPause = false;

        if (wifiReconnectInfo) {
            statusLog?.("Upload done, reconnect Wi-Fi REPL and send Ctrl-D...");

            setTimeout(() => {
                (async () => {
                    try {
                        const host = wifiReconnectInfo.host;
                        const port = wifiReconnectInfo.port || 8080;

                        await connectWiFiREPL(host, port);

                        try {
                            if (typeof writeSerialByte === "function") {
                                await writeSerialByte(3);
                                await writeSerialByte(4);
                            } else if (currentTransport?.writeByte) {
                                await currentTransport.writeByte(4);
                            } else {
                                await currentTransport?.write?.("\x04");
                            }
                        } catch (err) {
                            console.warn("Send Ctrl-D after reconnect failed:", err);
                        }
                    } catch (err) {
                        console.warn("Wi-Fi REPL reconnect failed:", err);
                    }
                })();
            }, 500);
        }
    } catch (e) {
        throw e;
    }
};

/* ===== Module include finder ===== */
let moduleBuiltIn = [
    "framebuf", "ucryptolib", "urandom",
    "_boot", "gc", "uctypes", "ure",
    "_onewire", "inisetup", "uerrno",
    "_thread", "machine", "uhashlib", "uselect",
    "_webrepl", "math", "uhashlib", "usocket",
    "apa106", "micropython", "uheapq", "ussl",
    "btree", "uio", "ustruct",
    "builtins", "network", "ujson", "utime",
    "cmath", "ntptime", "umqtt/robust", "utimeq",
    "dht", "onewire", "umqtt/simple", "uwebsocket",
    "ds18x20", "sys", "uos", "uzlib",
    "esp", "uarray", "upip", "webrepl",
    "esp32", "ubinascii", "upip_utarfile", "webrepl_setup",
    "flashbdev", "ucollections", "upysh", "websocket_helper",
    "time",
];

let findIncludeModuleNameInCode = (code) => {
    const regex = /^\s*?(?:import|from)\s+([^\s]+)/mg;
    let moduleList = [];
    let m;
    while ((m = regex.exec(code)) !== null) {
        if (m.index === regex.lastIndex) regex.lastIndex++;
        let moduleName = m[1];
        if (!moduleList.includes(moduleName)) moduleList.push(moduleName);
    }
    moduleList = moduleList.filter((moduleName) => moduleBuiltIn.indexOf(moduleName) < 0);
    return moduleList;
};

/* ===== UI: Connect / Disconnect / Upload ===== */
$("#connect-device").click(async () => {
    if (!currentTransport) {
        window.autoConnectFlag = true;
        const r = await serialConnect();
    }
});

$("#disconnect-device").off("click").on("click", async () => {
    if (!currentTransport) return;
    window.autoConnectFlag = false;
    clearRememberedConnection();
    console.log("๐” Disconnecting device...");
    setTransport(null);

    try { NotifyW?.("Serial port disconnected"); } catch { }
    try { statusLog?.("Serial port disconnected"); } catch { }

    try { term?.dispose(); } catch { }
    term = null;

    if (window.dashboardIsReady) {
        try { dashboardWin.serialStatusUpdate("disconnect"); } catch { }
    }
    console.log("๐งน Device fully disconnected.");
});

// Keep one shared disconnect behavior for manual click and unexpected Wi-Fi close.
$("#disconnect-device").off("click").on("click", async () => {
    disconnectDeviceLikeButton();
});

function lockButton(btn) {
    const $b = $(btn);
    $b.data("busy", true)
        .prop("disabled", true)
        .addClass("loading");

    return function unlock() {
        $b.data("busy", false)
            .prop("disabled", false)
            .removeClass("loading");
    };
}

$("#upload-program").click(async function () {
    if(window.IDEArduino?.active){window.IDEArduino.command('upload');return;}
    statusLog?.("Start Upload");
    if ($(this).data("busy")) return;

    const unlock = lockButton(this);
    let t0 = Date.now();

    $("#upload-program").addClass("loading");

    let code;
    extra_files = [];
    const file_list = fs.ls("/");
    if (file_list.indexOf("main.xml") >= 0) {
        code = xmlToCode(fs.read(`/main.xml`));
    } else if (file_list.indexOf("main.py") >= 0) {
        code = fs.read(`/main.py`);
    }

    const { isArduinoPlatform } = boards.find(board => board.id === boardId);
    if (isArduinoPlatform) {
        if (+localStorage.getItem("show-console-upload") !== -1) {
            $("#arduino-console-dialog .title").text("Uploading...");
            ShowDialog?.($("#arduino-console-dialog"));
        }
        arduinoConsoleTerm?.clear?.();
    }

    try {
        if (!isArduinoPlatform) {
            if (deviceMode === MODE_REAL_DEVICE) {
                await realDeviceUploadFlow(code);
            } else if (deviceMode === MODE_SIMULATOR) {
                let simSystem = domSimulatorIframe.contentWindow.simSystem;
                if (simSystem) simSystem.runCode(code); else console.warn("Connect to domSimulatorIframe error");
            }
        } else {
            await arduino_upload(code);
        }

        const timeDiff = Date.now() - t0;
        console.log("Time:", timeDiff, "ms");
        NotifyS?.("Upload Successful");
        statusLog?.(`Upload successful with ${timeDiff} ms`);
        if (isArduinoPlatform) $("#arduino-console-dialog .title").text("Upload Successful");
    } catch (e) {
        $("#upload-log-dialog .title").text("Upload Fail");
        NotifyE?.("Upload Fail !");
        statusLog?.(`Upload fail because ${e}`);
        console.warn(e);
        if (isArduinoPlatform) {
            ShowDialog?.($("#arduino-console-dialog"));
            $("#arduino-console-dialog .title").text("Upload Fail");
        }
    } finally {
        unlock();
    }

    $("#upload-program").removeClass("loading");
});

