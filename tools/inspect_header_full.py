with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

header_actions_idx = text.find('class="header-actions"')
header_end = text.find('</header>')
print(text[header_actions_idx:header_end])
