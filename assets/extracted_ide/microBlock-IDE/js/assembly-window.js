let assemblyModeWin = null;

$("#open-assembly-mode").click(() => {
    if (assemblyModeWin && !assemblyModeWin.closed) {
        assemblyModeWin.focus();
        return;
    }
    assemblyModeWin = window.IDEToolWindows.open({
        id:'assembly',title:'Assembly',width:1280,height:800,
        url:new URL('robot-sim/assembly.html',document.baseURI).href,
        onLoad(host){
            host.window.__ideToolWindow=host;
            const closeButton=host.document.getElementById('close-assembly-mode');
            if(closeButton)closeButton.hidden=true;
        }
    });
});

window.addEventListener('robot-project-reset',()=>assemblyModeWin?.close());
