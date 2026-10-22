with open('tools/generate_clean_master.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_switch_view = False
for i, l in enumerate(lines):
    if 'function switchViewMode(mode) {' in l:
        new_lines.append(l.replace('{', '{{'))
        in_switch_view = True
    elif in_switch_view and l.strip() == '}':
        new_lines.append(l.replace('}', '}}'))
        in_switch_view = False
    elif in_switch_view:
        # replace any single braces
        new_lines.append(l.replace('{', '{{').replace('}', '}}'))
    else:
        new_lines.append(l)

with open('tools/generate_clean_master.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Escaped braces in switchViewMode!")
