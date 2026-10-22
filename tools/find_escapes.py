with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    src = f.read()

import re

for m in re.finditer(r"\.join\(['\"]\\[nrt]", src):
    start = max(0, m.start() - 50)
    end = min(len(src), m.end() + 50)
    print("Match at", m.start(), ":", repr(src[start:end]))
