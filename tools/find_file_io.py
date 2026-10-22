with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if any(k in l for k in ['loadSample', '100-Point', 'exportMissionJSON', 'importMissionJSON']):
        print(f"{i+1}: {l.strip()[:80]}")
