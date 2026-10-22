with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.finditer(r'<button [^>]*class=[\'"][^\'"]*btn-ui[^\'"]*[\'"][^>]*>([\s\S]*?)</button>', text)
for m in matches:
    clean = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    tag = m.group(0)
    onclick = re.search(r'onclick=[\'"]([^\'"]+)[\'"]', tag)
    print(f"btn-ui: \"{clean}\" -> onclick={onclick.group(1) if onclick else 'none'}")
