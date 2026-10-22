with open('tools/generate_clean_master.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_nav_css = False
for i, l in enumerate(lines):
    if '/* HEADER VIEW NAV (IMPECCABLE PRECISION) */' in l:
        in_nav_css = True
        new_lines.append(l)
    elif in_nav_css and '</style>' in l:
        in_nav_css = False
        new_lines.append(l)
    elif in_nav_css:
        # escape braces
        new_lines.append(l.replace('{', '{{').replace('}', '}}'))
    else:
        new_lines.append(l)

with open('tools/generate_clean_master.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Escaped braces in added CSS!")
