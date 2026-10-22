with open('D:/Workspace/robot/tools/generate_ide_builder.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(1825, 1845):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}", end='')
