with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(max(0, 2375), min(len(lines), 2400)):
    print(f"{i+1}: {repr(lines[i])}")
