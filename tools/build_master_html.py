import os
import json

ROOT_DIR = r"D:\Workspace\robot"

# 1. Load Arena JSON presets
with open(os.path.join(ROOT_DIR, "data", "arenas", "rescue_five_points_layout.json"), "r", encoding="utf-8") as f:
    layout_five_points = json.load(f)

with open(os.path.join(ROOT_DIR, "data", "arenas", "quick_drop_box_4_enc_layout.json"), "r", encoding="utf-8") as f:
    layout_quick_box = json.load(f)

with open(os.path.join(ROOT_DIR, "data", "arenas", "official_field_mission.json"), "r", encoding="utf-8") as f:
    layout_official_100 = json.load(f)

with open(os.path.join(ROOT_DIR, "data", "arenas", "normal.json"), "r", encoding="utf-8") as f:
    layout_normal = json.load(f)

with open(os.path.join(ROOT_DIR, "data", "arenas", "jaajaj.json"), "r", encoding="utf-8") as f:
    layout_jaajaj = json.load(f)

print("Presets loaded successfully.")
