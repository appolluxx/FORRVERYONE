with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Let's extract all buttons and their texts
buttons = re.findall(r'<button([^>]*)>([\s\S]*?)</button>', text)
print("--- ALL BUTTONS IN HTML ---")
for attrs, content in buttons:
    text_content = re.sub(r'<[^>]+>', ' ', content).strip()
    onclick = re.search(r'onclick=[\'"]([^\'"]+)[\'"]', attrs)
    onclick_val = onclick.group(1) if onclick else 'none'
    title = re.search(r'title=[\'"]([^\'"]+)[\'"]', attrs)
    title_val = title.group(1) if title else ''
    btn_id = re.search(r'id=[\'"]([^\'"]+)[\'"]', attrs)
    id_val = btn_id.group(1) if btn_id else ''
    print(f"[{id_val}] \"{text_content}\" | onclick={onclick_val} | title={title_val}")
