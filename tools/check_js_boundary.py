with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = "function initArena2dCanvas() {"
end_marker = "function initThreeJsSimulator() {"

p1 = text.find(start_marker)
p2 = text.find(end_marker)

print("p1 (initArena2dCanvas):", p1)
print("p2 (initThreeJsSimulator):", p2)
print("Length to replace:", p2 - p1)
