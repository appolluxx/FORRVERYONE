with open('tools/generate_clean_master.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's inspect animateSimulation in generate_clean_master.py
idx = code.find('function animateSimulation()')
print(code[idx:idx+1200])
