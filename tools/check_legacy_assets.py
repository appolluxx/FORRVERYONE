with open('archives/legacy-ui/web.html.bak', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print("Script sources:")
print(re.findall(r'<script[^>]*src=[\'"]([^\'"]+)[\'"]', text))
print("Link hrefs:")
print(re.findall(r'<link[^>]*href=[\'"]([^\'"]+)[\'"]', text))
