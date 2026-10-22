with open('archives/legacy-ui/web.html.v7.2.bak', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print("Title:", re.search(r'<title>(.*?)</title>', text).group(1))

# Check main layout
print("Has 2D canvas?", "id=\"arenaCanvas\"" in text or "id=\"canvas\"" in text or "<canvas" in text)
canvases = re.findall(r'<canvas[^>]*id=[\'"]([^\'"]+)[\'"]', text)
print("Canvases:", canvases)

# Check mode 1 & 2
print("Mode buttons:", re.findall(r'id=[\'"]mode\d+Btn[\'"]', text))
