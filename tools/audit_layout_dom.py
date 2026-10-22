with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
from collections import Counter

body_start = text.find('<body>')
body_end = text.find('</body>')
body = text[body_start:body_end]

ids = re.findall(r'id=[\'"]([^\'"]+)[\'"]', body)
counts = Counter(ids)
duplicates = {k: v for k, v in counts.items() if v > 1}
print("Duplicate IDs:", duplicates)

# Check DOM elements cached by UIController
script_start = text.find('<script')
script = text[script_start:]
cached_ids = re.findall(r'getElementById\([\'"]([^\'"]+)[\'"]\)', script)
missing_in_body = [cid for cid in cached_ids if cid not in ids]
print("Cached IDs missing in HTML body:", set(missing_in_body))

# Check for button labels or sections that are duplicated
buttons = re.findall(r'<button[^>]*>([\s\S]*?)</button>', body)
cleaned_btns = [re.sub(r'<[^>]+>', '', b).strip() for b in buttons if len(b) < 100]
btn_counts = Counter(cleaned_btns)
dup_btns = {k: v for k, v in btn_counts.items() if v > 1 and k}
print("Duplicate Button Labels:", dup_btns)
