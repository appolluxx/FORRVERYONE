with open('D:/Workspace/robot/apps/web/tactical_planner.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
ids = re.findall(r'id=["\']([^"\']+)["\']', html)
print(f"Total IDs in tactical_planner.html: {len(ids)}")
for target in ['btnAutoPath', 'btnAddWp', 'btnClearWp', 'btnClearRoute', 'btnResetWp', 'btnResetDefault', 'wpEditorCard', 'autoPathCanvas', 'arena2dCanvas', 'tabActions', 'tab-actionsheet', 'tabCode', 'tab-code', 'codeDisplayArea', 'codeValBadge']:
    print(f" - {target}: {target in ids}")
