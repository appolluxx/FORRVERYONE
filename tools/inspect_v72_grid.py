with open('archives/legacy-ui/web.html.v7.2.bak', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print("How is arena drawn? SVG or DOM grid?")
print("Has svg?", "<svg" in text)
print("Grid element:", re.findall(r'id=[\'"][a-zA-Z0-9_\-]*grid[a-zA-Z0-9_\-]*[\'"]', text, re.IGNORECASE))
print("Arena element:", re.findall(r'id=[\'"][a-zA-Z0-9_\-]*arena[a-zA-Z0-9_\-]*[\'"]', text, re.IGNORECASE))
