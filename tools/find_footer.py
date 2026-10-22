with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'sidebar-footer' in l:
        print(''.join(lines[i-2:i+15]))
        break
