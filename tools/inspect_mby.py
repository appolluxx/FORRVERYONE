import json

with open(r'D:\Workspace\robot\assets\extracted_ide\microBlock-IDE\examples\atom-vx-rescue-five-points.mby', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

p = text.find('{\n  "format"')
raw = text[p:].rstrip()
if not raw.endswith('}'):
    raw += '\n}'
try:
    data = json.loads(raw)
except Exception:
    data = json.loads(raw + '\n}')

print("Field layout objects:")
print(json.dumps(data['meta']['fieldLayout'].get('objects'), indent=2))
print("Default robot pos:")
print(json.dumps(data['meta'].get('defaultRobotPosition'), indent=2))
