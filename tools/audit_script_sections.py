import re

with open(r'D:\Workspace\robot\apps\web\tactical_planner.html', 'r', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if not m:
    print("No script found!")
    exit(1)

js = m.group(1)
lines = js.splitlines()
print(f"Total script lines: {len(lines)}")

# Search for key sections
keywords = [
    'ARENA_FIVE_POINTS', 'ARENA_QUICK_BOX', 'FIVE_POINT_PATH', 'QUICK_BOX_PATH',
    'headingSimState', 'loadExampleFivePointRoute', 'loadExampleQuickDropBox4Enc',
    'build3DArenaObstacles', 'loadRobotModel', 'animateSimulation', 'updateTelemetryHUD'
]

for kw in keywords:
    matches = [i+1 for i, l in enumerate(lines) if kw in l]
    print(f"{kw}: lines {matches[:4]}")
