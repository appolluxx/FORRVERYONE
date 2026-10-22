with open('archives/legacy-ui/tactical_planner.html.backup', 'r', encoding='utf-8') as f:
    text = f.read()

hud_pos = text.find('class="telemetry-hud"')
hud_end = text.find('<main>', hud_pos)
print(text[hud_end:hud_end+1500])
