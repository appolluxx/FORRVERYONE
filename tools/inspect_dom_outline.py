with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

body_start = text.find('<body>')
script_start = text.find('<script')
body_html = text[body_start:script_start]

# Print outline of tags with class and id
import re
tags = re.findall(r'<([a-zA-Z0-9]+)(\s+class=[\'"][^\'"]*[\'"])?(\s+id=[\'"][^\'"]*[\'"])?[^>]*>', body_html)
print(f"Total HTML elements before script: {len(tags)}")

# Print major containers
for line in body_html.splitlines():
    trimmed = line.strip()
    if any(trimmed.startswith(f'<{tag}') for tag in ['header', 'main', 'aside', 'section', 'nav', 'div class="', 'div id="']):
        if any(k in trimmed for k in ['panel', 'deck', 'theater', 'arena', 'header', 'tools', 'grid', 'kpi', 'actions', 'footer', 'modal', 'card']):
            print(trimmed[:120])
