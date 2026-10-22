with open('tools/generate_clean_master.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'function drawArena2D' in l:
        print(f"drawArena2D starts at line {i+1}")
        for j in range(i, i+150):
            if lines[j].strip() == '}' and ('compileClientRouteIR' in lines[j+1] or 'const CLIENT_FIRMWARE_OPS' in lines[j+1] or '// ---' in lines[j+1] or '// ROUTE IR' in lines[j+2]):
                print(f"drawArena2D ends at line {j+1}")
                print(''.join(lines[j-20:j+5]))
                break
        break
