with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print("Select elements:", re.findall(r'<select[^>]*id=[\'"]([^\'"]+)[\'"]', text))
print("Speed Profile options:", re.findall(r'<option[^>]*value=[\'"]([^\'"]+)[\'"][^>]*>([\s\S]*?)</option>', text[:text.find('</select>')+10]))
