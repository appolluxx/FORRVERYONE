with open(r'd:\Workspace\robot\assets\extracted_ide\microBlock-IDE\examples\atom-vx-rescue-five-points.mby', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

p_field = text.find('"field":')
p_end = text.find('"defaultRobotPosition":')
print(text[p_field:p_end+250])
