with open('tools/generate_clean_master.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Update renderActionSheet to populate both actionSheetRows and actionSheetRowsFullscreen
old_sheet = """            tbody.innerHTML = html;
        }"""

new_sheet = """            tbody.innerHTML = html;
            const tbodyFs = document.getElementById('actionSheetRowsFullscreen');
            if (tbodyFs) tbodyFs.innerHTML = html;
        }"""

# Update renderGeneratedCode to populate both codeDisplayArea and codeDisplayAreaFullscreen
old_code = """            pre.textContent = code;
        }"""

new_code = """            pre.textContent = code;
            const preFs = document.getElementById('codeDisplayAreaFullscreen');
            if (preFs) preFs.textContent = code;
        }"""

assert old_sheet in code, 'old_sheet not found'
code = code.replace(old_sheet, new_sheet, 1)

assert old_code in code, 'old_code not found'
code = code.replace(old_code, new_code, 1)

with open('tools/generate_clean_master.py', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated sync for ActionSheet and Code View!')
