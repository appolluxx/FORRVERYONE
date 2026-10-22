with open('archives/legacy-ui/tactical_planner.html.backup', 'r', encoding='utf-8') as f:
    text = f.read()

center_pos = text.find('id="fieldGrid"')
print(text[center_pos-200:center_pos+600])
