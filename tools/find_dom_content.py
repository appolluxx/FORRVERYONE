with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    src = f.read()

import re
matches = [m.start() for m in re.finditer(r'DOMContentLoaded', src)]
for idx in matches:
    print("Match at:", idx)
    print(src[max(0, idx - 100):min(len(src), idx + 300)])
