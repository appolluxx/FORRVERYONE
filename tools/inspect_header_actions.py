with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

header_actions_idx = text.find('class="header-actions"')
print(text[header_actions_idx:header_actions_idx+600])
