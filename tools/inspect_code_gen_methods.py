with open('D:/Workspace/robot/src/core/application/code_generator.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'static' in l or 'module.exports' in l or 'function' in l:
        print(f"{i+1}: {l.strip()}")
