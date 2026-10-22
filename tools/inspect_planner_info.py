with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'id="plannerInfo"' in l:
        print(''.join(lines[i:i+30]))
        break
