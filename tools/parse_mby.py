import json

with open(r'd:\Workspace\robot\assets\extracted_ide\microBlock-IDE\examples\atom-vx-rescue-five-points.mby', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

p = text.find('{\n  "format"')
raw = text[p:].rstrip()
if not raw.endswith('}'):
    raw += '\n}'

try:
    data = json.loads(raw)
except:
    data = json.loads(raw + '\n}')

print("Successfully parsed .mby!")
assembly = data['meta']['assembly']
print("Total parts:", len(assembly['parts']))
for i, pt in enumerate(assembly['parts']):
    print(f"{i}: id={pt.get('id')}, name={pt.get('name')}, role={pt.get('systemRole')}, fileName={pt.get('fileName')}, color={pt.get('color')}, pos={pt.get('position')}")

print("\nDefault robot pos:", data['meta']['defaultRobotPosition'])
print("Field layout objects:", len(data['meta']['fieldLayout']['objects']))
for obj in data['meta']['fieldLayout']['objects']:
    print(" - Object:", obj)
