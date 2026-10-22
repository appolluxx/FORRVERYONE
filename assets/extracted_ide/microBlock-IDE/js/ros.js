let rosWin = null;

$("#open-ros").click(() => {
    if (isElectron) {
        ipcRenderer.send("show-ros");
    } else {
        rosWin = window.open(`${rootPath}/ros/index.html`, "_blank", "width=1280px, height=800px", true);
    }
});
