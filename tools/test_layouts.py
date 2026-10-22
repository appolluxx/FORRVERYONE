import os
import json

ROOT_DIR = r"D:\Workspace\robot"
tools_dir = os.path.join(ROOT_DIR, "tools")

five_points_path = os.path.join(ROOT_DIR, "data", "arenas", "rescue_five_points_layout.json")
with open(five_points_path, "r", encoding="utf-8") as f:
    layout_five_points = json.load(f)

quick_box_path = os.path.join(ROOT_DIR, "data", "arenas", "quick_drop_box_4_enc_layout.json")
with open(quick_box_path, "r", encoding="utf-8") as f:
    layout_quick_box = json.load(f)

print("Loaded layout_five_points:", len(layout_five_points["cells"]), "cells")
print("Loaded layout_quick_box:", len(layout_quick_box["cells"]), "cells, dropZones:", len(layout_quick_box["dropZones"]))
