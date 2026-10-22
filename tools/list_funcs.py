with open('D:/Workspace/robot/tools/generate_ide_builder.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
funcs = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', text)
print(f"Total functions in generate_ide_builder.py: {len(funcs)}")
for f in funcs:
    print(" -", f)
