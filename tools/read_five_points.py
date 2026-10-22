import json

with open(r'd:\Workspace\robot\assets\extracted_ide\microBlock-IDE\examples\atom-vx-rescue-five-points.mby', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

p = text.find('{\n  "format"')
raw = text[p:].rstrip()
if not raw.endswith('}'):
    raw += '\n}'

# If still missing one }, let's try
try:
    data = json.loads(raw)
except:
    raw += '\n}'
    data = json.loads(raw)

print("Parsed successfully!")
print("Meta keys:", list(data['meta'].keys()))
for k, v in data['meta'].items():
    if k == 'assembly':
        print(f"Assembly: {len(v['parts'])} parts")
        for pt in v['parts']:
            print("  part:", pt['id'], pt['componentId'], pt['name'])
    else:
        print(f"Meta {k}:", v)
