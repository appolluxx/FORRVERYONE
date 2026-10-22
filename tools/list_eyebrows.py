with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'<div class=[\'"]section-eyebrow[\'"][^>]*>([\s\S]*?)</div>', text)
for m in matches:
    print('Eyebrow:', re.sub(r'\s+', ' ', m).strip())
