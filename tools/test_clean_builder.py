import os
import json

ROOT_DIR = r"D:\Workspace\robot"
layout_five_points_path = os.path.join(ROOT_DIR, "data", "arenas", "rescue_five_points_layout.json")
layout_quick_box_path = os.path.join(ROOT_DIR, "data", "arenas", "quick_drop_box_4_enc_layout.json")

with open(layout_five_points_path, "r", encoding="utf-8") as f:
    layout_five_points = json.load(f)

with open(layout_quick_box_path, "r", encoding="utf-8") as f:
    layout_quick_box = json.load(f)

with open(os.path.join(ROOT_DIR, "tools", "generate_ide_builder.py"), "r", encoding="utf-8") as f:
    text = f.read()

prefix = "js_builder = f'''"
suffix = "'''\n\nbuilder_path = os.path.join(ROOT_DIR, \"build_rescue_sim_ide.js\")"

p_start = text.find(prefix) + len(prefix)
p_end = text.rfind(suffix)

raw_content = text[p_start:p_end]

# In script tag: replace const ARENA_FIVE_POINTS = layoutFivePoints with interpolation
raw_content = raw_content.replace(
    "const ARENA_FIVE_POINTS = layoutFivePoints;",
    "const ARENA_FIVE_POINTS = ${JSON.stringify(layoutFivePoints)};"
)
raw_content = raw_content.replace(
    "const ARENA_QUICK_BOX = layoutQuickBox;",
    "const ARENA_QUICK_BOX = ${JSON.stringify(layoutQuickBox)};"
)

# First, replace placeholders with temporary tokens
raw_content = raw_content.replace("{json.dumps(layout_five_points)}", "__LAYOUT_FIVE_POINTS__")
raw_content = raw_content.replace("{json.dumps(layout_quick_box)}", "__LAYOUT_QUICK_BOX__")

# Replace {{ with { and }} with }
raw_content = raw_content.replace("{{", "{").replace("}}", "}")

# Now replace tokens with actual JSON
raw_content = raw_content.replace("__LAYOUT_FIVE_POINTS__", json.dumps(layout_five_points))
raw_content = raw_content.replace("__LAYOUT_QUICK_BOX__", json.dumps(layout_quick_box))

# Fix the trailing backtick before // Write to files
raw_content = raw_content.replace("\\`;\n\n// Write to files", "`;\n\n// Write to files")

target_path = os.path.join(ROOT_DIR, "build_rescue_sim_ide_restored.js")
with open(target_path, "w", encoding="utf-8") as f:
    f.write(raw_content)

print(f"Written restored builder to {target_path} ({len(raw_content)} chars)")
