with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('let window.activeProject = activeProject = {', 'let activeProject = {\n        };\n        window.activeProject = activeProject;\n        activeProject = {')

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed declaration syntax!")
