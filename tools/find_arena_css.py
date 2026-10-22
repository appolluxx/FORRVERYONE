with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if any(k in l for k in ['mission-theater', 'theater-viewport', 'arena-frame', 'fieldGrid']):
        if i < 1200:
            print(f"{i+1}: {l.strip()[:80]}")
