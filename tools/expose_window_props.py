with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Expose window properties inside recalculateCurrentRoute
old_recalc = """        function recalculateCurrentRoute(sync3d = true) {
            if (!activeProject || !activeProject.waypoints) return;
            currentRouteIR = compileClientRouteIR(activeProject.waypoints);"""

new_recalc = """        function recalculateCurrentRoute(sync3d = true) {
            if (!activeProject || !activeProject.waypoints) return;
            currentRouteIR = compileClientRouteIR(activeProject.waypoints);
            window.activeProject = activeProject;
            window.currentRouteIR = currentRouteIR;"""

if old_recalc in text:
    text = text.replace(old_recalc, new_recalc)
    print("Added window exposure to recalculateCurrentRoute.")
else:
    print("Could not find old_recalc.")

with open('D:/Workspace/robot/build_rescue_sim_ide.js', 'w', encoding='utf-8') as f:
    f.write(text)
