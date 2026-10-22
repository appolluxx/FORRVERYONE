import re

for path in [r'D:\Workspace\robot\assets\lib\three.min.js', r'D:\Workspace\robot\assets\extracted_ide\microBlock-IDE\dashboard\js\three.min.js']:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        t = f.read()
        m = re.search(r'REVISION\s*[:=]\s*[\'"](\d+)[\'"]', t)
        print(path, 'Revision:', m.group(1) if m else 'none')
        # Check how Loader is defined
        print('Has class Loader or class ol:', 'class ol' in t or 'class Loader' in t)
