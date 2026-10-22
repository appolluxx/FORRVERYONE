with open('D:/Workspace/robot/src/infrastructure/server/ide_server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if '/api/generate-code' in l:
        for j in range(i, min(len(lines), i + 35)):
            print(f"{j+1}: {lines[j]}", end='')
