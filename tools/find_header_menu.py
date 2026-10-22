with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if any(k in l for k in ['Export', 'Import', 'Save', '100-Point']):
        if i > 1650 and i < 1750:
            print(f"{i+1}: {l.strip()[:80]}")
