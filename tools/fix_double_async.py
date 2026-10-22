with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("async async function handleConnectSerial() {", "async function handleConnectSerial() {")

with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed async async.")
