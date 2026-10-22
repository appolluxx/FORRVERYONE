const fs = require('fs');
const vm = require('vm');

// Mock browser environment
const domListeners = {};
const elements = {};

function createElement(tag) {
    const el = {
        tagName: tag.toUpperCase(),
        style: {},
        classList: {
            add: () => {},
            remove: () => {}
        },
        click: () => {},
        appendChild: () => {},
        removeChild: () => {},
        getContext: () => ({
            clearRect: () => {},
            fillRect: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            arc: () => {},
            fill: () => {},
            fillText: () => {},
            setLineDash: () => {},
            strokeRect: () => {}
        }),
        value: '',
        textContent: '',
        innerHTML: '',
        width: 430,
        height: 215
    };
    return el;
}

const document = {
    getElementById: (id) => {
        if (!elements[id]) elements[id] = createElement('div');
        return elements[id];
    },
    createElement: createElement,
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

const window = {
    addEventListener: (evt, fn) => {
        domListeners[evt] = fn;
    },
    removeEventListener: () => {}
};

// Mock THREE
function mockMesh() {
    return {
        position: { set: () => {} },
        rotation: { x: 0, y: 0, z: 0 },
        castShadow: false,
        receiveShadow: false
    };
}

const THREE = {
    Scene: function() { this.add = () => {}; this.remove = () => {}; },
    Mesh: function() { return mockMesh(); },
    BoxGeometry: function() {},
    CylinderGeometry: function() {},
    RingGeometry: function() {},
    MeshStandardMaterial: function() {},
    MeshBasicMaterial: function() {},
    DoubleSide: 2
};

const context = {
    document,
    window,
    THREE,
    console,
    FileReader: function() {
        this.readAsText = function(f) {};
    },
    Blob: function(arr, opts) { this.data = arr; },
    URL: {
        createObjectURL: () => 'blob:mock',
        revokeObjectURL: () => {}
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    requestAnimationFrame: (fn) => {}
};

vm.createContext(context);

const html = fs.readFileSync('apps/web/index.html', 'utf8');
const scriptMatches = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
const scriptCode = scriptMatches[0].replace(/<script[^>]*>|<\/script>/gi, '');

// Execute in sandbox
vm.runInContext(scriptCode, context);

console.log("=== VERIFYING ARENA UPLOAD & PRESET CONTROLLERS ===");

// 1. Check function existence
const requiredFns = [
    'triggerUploadArena',
    'handleArenaFileUpload',
    'loadArenaFromJSON',
    'exportArenaJSON',
    'loadExampleOfficial100Pts',
    'loadExampleNormalField',
    'loadExampleJaajajField',
    'loadExampleFivePointRoute',
    'loadExampleQuickDropBox4Enc',
    'build3DArenaObstacles',
    'drawArena2D'
];

requiredFns.forEach(fn => {
    if (typeof context[fn] === 'function') {
        console.log(`PASS: ${fn} is defined`);
    } else {
        console.error(`FAIL: ${fn} is missing`);
        process.exit(1);
    }
});

// 2. Test loading Official 100-Point Field
context.loadExampleOfficial100Pts();
const p1 = vm.runInContext("activeProject", context);
console.log(`PASS: Loaded Official 100-Point Field -> activeProject: "${p1.name}", waypoints: ${p1.waypoints.length}`);
if (p1.waypoints.length < 5) {
    console.error("FAIL: Expected waypoints in Official 100-Point Field");
    process.exit(1);
}

// 3. Test loading Normal Field
context.loadExampleNormalField();
const p2 = vm.runInContext("activeProject", context);
console.log(`PASS: Loaded Normal Field -> activeProject: "${p2.name}", waypoints: ${p2.waypoints.length}`);

// 4. Test loading Jaajaj Field
context.loadExampleJaajajField();
const p3 = vm.runInContext("activeProject", context);
console.log(`PASS: Loaded Jaajaj Field -> activeProject: "${p3.name}", waypoints: ${p3.waypoints.length}`);

// 5. Test loading Custom JSON string
const customJson = JSON.stringify({
    COLS: 8,
    ROWS: 4,
    gridData: [
        { index: 0, type: "start" },
        { index: 1, type: "bridge" },
        { index: 2, type: "bumps" },
        { index: 3, type: "seesaw" },
        { index: 4, type: "tunnel" },
        { index: 5, type: "pit" },
        { index: 6, type: "bomb" },
        { index: 7, type: "drop_e" }
    ],
    pathNodes: [
        { cellIdx: 0, fn: "START", speed: 0, timer: 0 },
        { cellIdx: 1, fn: "FF", speed: 70, timer: 800 },
        { cellIdx: 7, fn: "FF", speed: 60, timer: 600 }
    ]
});

context.loadArenaFromJSON(customJson, "MyCustomField.json");
const p4 = vm.runInContext("activeProject", context);
console.log(`PASS: Loaded custom JSON -> activeProject: "${p4.name}", waypoints: ${p4.waypoints.length}`);
if (p4.waypoints.length !== 3) {
    console.error("FAIL: Expected 3 waypoints for custom JSON");
    process.exit(1);
}

// 6. Test Export
context.exportArenaJSON();
console.log("PASS: exportArenaJSON executed cleanly without errors");

console.log("\nALL ARENA UPLOAD ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!");
