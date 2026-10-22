with open('D:/Workspace/robot/tools/generate_ide_builder.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect line 2653
lines = text.split('\n')
for i in range(2645, 2660):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}")
