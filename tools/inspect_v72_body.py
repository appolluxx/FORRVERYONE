with open('archives/legacy-ui/web.html.v7.2.bak', 'r', encoding='utf-8') as f:
    text = f.read()

header_end = text.find('</header>')
print(text[header_end+9:header_end+800])
