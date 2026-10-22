with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    src = f.read()

# Replace the three .join('\n') patterns with String.fromCharCode(10) which is completely unambiguous in all contexts
src = src.replace("lines.join('\\n')", "lines.join(String.fromCharCode(10))")
src = src.replace("}).join('\\n\\n')", "}).join(String.fromCharCode(10) + String.fromCharCode(10))")

with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("build_rescue_sim_ide.js updated.")
