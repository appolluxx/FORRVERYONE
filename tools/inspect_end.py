with open('D:/Workspace/robot/build_rescue_sim_ide_restored.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(max(0, len(lines) - 25), len(lines)):
    print(f"{i+1}: {repr(lines[i])}")
