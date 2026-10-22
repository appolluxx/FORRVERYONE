with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

p_lang = text.find("function switchCodeLang(lang) {")
p_init = text.find("function initArena2dCanvas() {")

print("Between switchCodeLang and initArena2dCanvas:")
print(text[p_lang:p_init])
