with open('archives/legacy-ui/web.html.v7.2.bak', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'<div[^>]*id=[\'"]([^\'"]+)[\'"]', text)
print("Key IDs in v7.2:", [m for m in matches if any(k in m.lower() for k in ['grid', 'path', 'code', 'sim', 'arena', 'robot', 'deck', 'sidebar'])])
