with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

# The file starts with:
# const htmlContent = `<!DOCTYPE html>
# and ends with:
# `;
# // Write to files

start_marker = "const htmlContent = `"
end_marker = "`;\n\n// Write to files"

start_idx = text.find(start_marker) + len(start_marker)
end_idx = text.rfind(end_marker)

header = text[:start_idx]
body = text[start_idx:end_idx]
footer = text[end_idx:]

print("Body length:", len(body))

# In body, any unescaped backtick ` must be replaced with \`
# But if it is already \`, don't replace
import re
new_body = re.sub(r'(?<!\\)`', r'\`', body)

new_text = header + new_body + footer

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Escaped internal backticks successfully!")
