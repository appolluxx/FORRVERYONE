with open('D:/Workspace/robot/temp_test.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(max(0, 1340), min(len(lines), 1370)):
    print(f"{i+1}: {lines[i]}", end='')
