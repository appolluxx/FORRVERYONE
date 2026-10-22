import re

with open(r'D:\Workspace\robot\apps\web\tactical_planner.html', 'r', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
js = m.group(1)
lines = js.splitlines()

for i in range(970, min(len(lines), 1165)):
    print(f"{i+1}: {lines[i]}")
