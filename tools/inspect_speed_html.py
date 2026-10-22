with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'id="speedProfileSelect"' in l:
        print(''.join(lines[max(0, i-2):i+10]))
        break
