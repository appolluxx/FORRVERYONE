with open('D:/Workspace/robot/tools/generate_ide_builder.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's see lines 30 to 40
lines = text.split('\n')
for i in range(25, 45):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}")
