import re
import subprocess

with open(r'D:\Workspace\robot\apps\web\tactical_planner.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract script content
m = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if not m:
    print("No inline script found!")
    exit(1)

js_code = m.group(1)
print(f"Extracted script: {len(js_code)} chars, {len(js_code.splitlines())} lines")

# To test syntax with Node without window/DOM failing:
# wrap in a dummy environment:
test_js = f"""
const window = {{ addEventListener: () => {{}} }};
const document = {{
    getElementById: () => ({{
        textContent: '',
        style: {{}},
        classList: {{ add: () => {{}}, remove: () => {{}}, toggle: () => {{}} }},
        getContext: () => ({{
            clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
            fillText: () => {{}}, beginPath: () => {{}}, moveTo: () => {{}},
            lineTo: () => {{}}, stroke: () => {{}}, fill: () => {{}},
            arc: () => {{}}, save: () => {{}}, restore: () => {{}}
        }}),
        appendChild: () => {{}},
        querySelectorAll: () => []
    }}),
    querySelectorAll: () => []
}};
const navigator = {{ clipboard: {{ writeText: () => Promise.resolve() }} }};
const THREE = {{
    Scene: function() {{ this.add = () => {{}}; this.remove = () => {{}}; }},
    Color: function() {{}},
    FogExp2: function() {{}},
    PerspectiveCamera: function() {{ this.position = {{ set: () => {{}} }}; }},
    WebGLRenderer: function() {{ this.setSize = () => {{}}; this.domElement = {{}}; this.shadowMap = {{}}; this.render = () => {{}}; }},
    OrbitControls: function() {{ this.target = {{ set: () => {{}} }}; this.update = () => {{}}; }},
    AmbientLight: function() {{}},
    DirectionalLight: function() {{ this.position = {{ set: () => {{}} }}; this.shadow = {{ camera: {{}} }}; }},
    PlaneGeometry: function() {{}},
    BoxGeometry: function() {{}},
    CylinderGeometry: function() {{}},
    RingGeometry: function() {{}},
    BufferGeometry: function() {{ this.setAttribute = () => {{}}; this.setDrawRange = () => {{}}; }},
    BufferAttribute: function() {{}},
    Float32Array: Float32Array,
    MeshStandardMaterial: function() {{}},
    MeshBasicMaterial: function() {{}},
    LineBasicMaterial: function() {{}},
    Mesh: function() {{ this.position = {{ set: () => {{}} }}; this.rotation = {{ set: () => {{}} }}; }},
    Group: function() {{ this.add = () => {{}}; this.position = {{ set: () => {{}} }}; this.rotation = {{ set: () => {{}} }}; }},
    Line: function() {{ this.geometry = {{ attributes: {{ position: {{ array: new Float32Array(3600), needsUpdate: false }} }}, setDrawRange: () => {{}} }}; }},
    GridHelper: function() {{ this.position = {{ y: 0 }}; this.scale = {{ set: () => {{}} }}; }},
    GLTFLoader: function() {{ this.load = () => {{}}; }},
    MathUtils: {{
        lerp: (a, b, t) => a + (b - a) * t,
        clamp: (v, min, max) => Math.max(min, Math.min(max, v))
    }},
    DoubleSide: 2,
    PCFSoftShadowMap: 1
}};
function requestAnimationFrame() {{}}

{js_code}

console.log("JavaScript executed and validated with ZERO syntax errors!");
"""

with open(r'D:\Workspace\robot\temp_test.js', 'w', encoding='utf-8') as f:
    f.write(test_js)

res = subprocess.run(["node", r"D:\Workspace\robot\temp_test.js"], capture_output=True, text=True)
print("Node return code:", res.returncode)
print("Node stdout:", res.stdout)
print("Node stderr:", res.stderr)
