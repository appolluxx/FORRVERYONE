with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        for k in ['main-container', 'right-panel', 'left-panel', 'theater', 'sim-viewport', 'three', 'webgl-container', 'canvas3d']:
            if k in line:
                print(f"{i+1}: {line.strip()[:100]}")
                break
