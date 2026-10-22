with open('apps/web/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

old_wrappers = """function loadSampleOfficialField(s) { uiController.loadSampleOfficialField(s); }"""
new_wrappers = """function loadSampleOfficialField(s) { uiController.loadSampleOfficialField(s); }
function loadPresetNormalField() { uiController.loadPresetNormalField(); }
function loadPresetJaajajField() { uiController.loadPresetJaajajField(); }"""

if old_wrappers in text:
    text = text.replace(old_wrappers, new_wrappers)
    with open('apps/web/index.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Wrappers added successfully!")
else:
    print("old_wrappers not found!")
