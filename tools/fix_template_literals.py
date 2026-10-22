import re

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

# We want only the layout variables to be unescaped build-time interpolation:
# ${JSON.stringify(layoutFivePoints)}
# ${JSON.stringify(layoutQuickBox)}
# All other ${ must be \${

def replace_fn(match):
    full = match.group(0)
    if 'JSON.stringify(layoutFivePoints)' in full or 'JSON.stringify(layoutQuickBox)' in full:
        return full
    return '\\' + full

# Find unescaped ${...}
pattern = r'(?<!\\)\$\{([^}]+)\}'
new_text = re.sub(pattern, replace_fn, text)

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Fixed build_rescue_sim_ide.js template literals!")
