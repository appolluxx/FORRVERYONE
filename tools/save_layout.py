import json

with open(r'd:\Workspace\robot\assets\extracted_ide\microBlock-IDE\examples\atom-vx-rescue-five-points.mby', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

p1 = text.find('"fieldLayout":')
p2 = text.find('"defaultRobotPosition":')

raw = text[p1 + len('"fieldLayout":'):p2].strip().rstrip(',')
field_obj = json.loads(raw)
with open(r'd:\Workspace\robot\data\arenas\rescue_five_points_layout.json', 'w', encoding='utf-8') as out:
    json.dump(field_obj, out, indent=2)

print('Successfully saved rescue_five_points_layout.json!')
print('Cell count:', len(field_obj['cells']), 'Objects:', len(field_obj['objects']))
print('Seed:', field_obj.get('seed'))
for obj in field_obj['objects']:
    print(' - Object:', obj)
