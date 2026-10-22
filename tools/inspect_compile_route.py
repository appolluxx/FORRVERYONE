with open('D:/Workspace/robot/src/infrastructure/server/ide_server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(230, 260):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}", end='')
