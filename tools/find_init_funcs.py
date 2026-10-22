with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    src = f.read()

import re
matches = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', src)
print("Function definitions in build_rescue_sim_ide.js:")
for name in matches:
    if 'init' in name.lower() or 'three' in name.lower() or 'sim' in name.lower() or '3d' in name.lower():
        print(" -", name)
