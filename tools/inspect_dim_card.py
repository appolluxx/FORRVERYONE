with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'<div class=[\'"]arena-dim-card[\'"][\s\S]*?</div>\s*</div>', text)
print(matches[0] if matches else 'None')
