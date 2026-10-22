with open('archives/legacy-ui/web.html.v7.2.bak', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print("Tools in v7.2:")
tools = re.findall(r'data-tool=[\'"]([^\'"]+)[\'"]', text)
print(list(set(tools)))

print("Presets in v7.2:")
presets = re.findall(r'load\w+Field\(\)', text)
print(list(set(presets)))
