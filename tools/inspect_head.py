with open('D:/Workspace/robot/build_rescue_sim_ide_restored.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(25, 45):
    print(f"{i+1}: {repr(lines[i])}")
