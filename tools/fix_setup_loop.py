with open('D:/Workspace/robot/tools/generate_ide_builder.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace setup() { and loop() {
text = text.replace('void setup() {\n', 'void setup() {{\n')
text = text.replace('beep(100);\n}\n', 'beep(100);\n}}\n')
text = text.replace('void loop() {\n', 'void loop() {{\n')
text = text.replace('STOP();\n}\\`', 'STOP();\n}}\\`')

with open('D:/Workspace/robot/tools/generate_ide_builder.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Replaced single braces in setup/loop.")
