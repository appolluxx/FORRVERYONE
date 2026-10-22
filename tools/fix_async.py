with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    src = f.read()

src = src.replace("function handleConnectSerial() {", "async function handleConnectSerial() {")

with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("Updated handleConnectSerial to async in build_rescue_sim_ide.js")
