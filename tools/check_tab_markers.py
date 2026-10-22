with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
m = re.search(r'<!-- TAB 1: 2D ROUTE PLANNER -->[\s\S]*?<!-- Bottom Console / Serial Log -->', text)
if m:
    print("Found match! Length:", len(m.group(0)))
else:
    print("Not found! Looking for markers...")
    print("TAB 1:", '<!-- TAB 1: 2D ROUTE PLANNER -->' in text)
    print("Bottom Console:", '<!-- Bottom Console / Serial Log -->' in text)
