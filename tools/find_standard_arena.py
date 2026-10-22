with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('function loadExampleStandardArena')
if start != -1:
    print(text[start:start+1500])
