with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    src = f.read()

import re
matches = [m.start() for m in re.finditer(r'THREE\.', src)]
print(f"Found {len(matches)} occurrences of THREE.")
for idx in matches[:10]:
    print(src[max(0, idx - 50):min(len(src), idx + 80)].replace('\n', ' '))
