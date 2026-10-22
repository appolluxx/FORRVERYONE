with open('D:/Workspace/robot/tools/generate_ide_builder.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix line 1835: replace ${r.obstacle...} with ${{r.obstacle...}}
old_str = "\\${r.obstacle.startsWith('Drop') ? \\`<span class=\"tag-drop\"><i class=\"fas fa-box-open\"></i> \\${r.obstacle}</span>\\` : (r.obstacle !== 'Normal' ? \\`<span class=\"tag-obstacle\"><i class=\"fas fa-exclamation-triangle\"></i> \\${r.obstacle}</span>\\` : '')}"
new_str = "\\${{r.obstacle.startsWith('Drop') ? \\`<span class=\"tag-drop\"><i class=\"fas fa-box-open\"></i> \\${{r.obstacle}}</span>\\` : (r.obstacle !== 'Normal' ? \\`<span class=\"tag-obstacle\"><i class=\"fas fa-exclamation-triangle\"></i> \\${{r.obstacle}}</span>\\` : '')}}"

if old_str in text:
    text = text.replace(old_str, new_str)
    print("Fixed line 1835!")
else:
    print("Could not find exact old_str, searching...")
    idx = text.find("r.obstacle.startsWith")
    print(text[idx-20:idx+250])

with open('D:/Workspace/robot/tools/generate_ide_builder.py', 'w', encoding='utf-8') as f:
    f.write(text)
