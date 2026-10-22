with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

bad_snippet = '''let activeProject = {
        };
        window.activeProject = activeProject;
        activeProject = {
            id: "atom-vx-rescue-five-points",
            name: "Five-Point Route",
            loaded: true,
            waypoints: []
        };'''

good_snippet = '''let activeProject = {
            id: "atom-vx-rescue-five-points",
            name: "Five-Point Route",
            loaded: true,
            waypoints: []
        };
        window.activeProject = activeProject;'''

text = text.replace(bad_snippet, good_snippet)

# In switchProject
target_switch = 'activeProject = {\n                id: "atom-vx-quick-drop-box-4-enc"'
repl_switch = 'activeProject = {\n                id: "atom-vx-quick-drop-box-4-enc"'
# Let's ensure window.activeProject is updated inside switchProject
old_switch_end = "build3DArenaObstacles();\n            resetSimulation();"
new_switch_end = "build3DArenaObstacles();\n            window.activeProject = activeProject;\n            resetSimulation();"
text = text.replace(old_switch_end, new_switch_end, 1)

with open(r'D:\Workspace\robot\build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated activeProject synchronization in build_rescue_sim_ide.js")
