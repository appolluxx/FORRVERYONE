with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('hudYaw')
if start != -1:
    print(text[start-300:start+1500])
