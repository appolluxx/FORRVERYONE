with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('FIVE_POINT_PATH')
if start != -1:
    print(text[start-50:start+2500])
