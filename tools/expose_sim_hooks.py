with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Expose window globals after state declaration
target_decl = 'let activeProject = {'
repl_decl = '''window.activeProject = null;
        let activeProject = {'''

text = text.replace(target_decl, repl_decl, 1)

# In switchProject
target_switch = 'activeProject = {'
repl_switch = 'window.activeProject = activeProject = {'
text = text.replace(target_switch, repl_switch, 1)

# In loadRobotModel
target_loaded = 'robotMesh = gltf.scene;'
repl_loaded = 'robotMesh = gltf.scene;\n                    window.robotMesh = robotMesh;\n                    window.robotWheelMeshes = robotWheelMeshes;'
text = text.replace(target_loaded, repl_loaded, 1)

# In procedural chassis fallback
target_proc = 'robotMesh = new THREE.Group();'
repl_proc = 'robotMesh = new THREE.Group();\n            window.robotMesh = robotMesh;'
text = text.replace(target_proc, repl_proc, 1)

# In initThree
target_scene = 'scene = new THREE.Scene();'
repl_scene = 'scene = new THREE.Scene();\n            window.scene = scene;'
text = text.replace(target_scene, repl_scene, 1)

# In toggleSimPlay
target_toggle = 'isSimRunning = !isSimRunning;'
repl_toggle = 'isSimRunning = !isSimRunning;\n            window.isSimRunning = isSimRunning;'
text = text.replace(target_toggle, repl_toggle, 1)

# In resetSimulation
target_reset = 'isSimRunning = false;'
repl_reset = 'isSimRunning = false;\n            window.isSimRunning = false;'
text = text.replace(target_reset, repl_reset, 1)

# At the end of script initialization
target_init_call = 'initThree();'
repl_init_call = 'initThree();\n        window.activeProject = activeProject;\n        window.switchProject = switchProject;'
text = text.replace(target_init_call, repl_init_call, 1)

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Exposed simulator hooks in build_rescue_sim_ide.js successfully!")
