(() => {
    if (!isElectron || !window.nodeRequire) {
        return;
    }

    const updaterIPC = window.nodeRequire("electron").ipcRenderer;
    const dialogElement = $("#app-update-dialog");
    const actionButton = $("#app-update-action");
    const statusElement = $("#app-update-status");
    const progressElement = $("#app-update-progress");
    const progressBar = $("#app-update-progress-bar");
    const progressCaption = $("#app-update-progress-caption");
    const latestWrap = $("#app-update-latest-wrap");
    const latestVersion = $("#app-update-latest-version");
    const updateIcon = $(".app-update-icon");
    let currentPhase = "idle";

    dialogElement.appendTo(document.body);

    function formatBytes(bytes) {
        const value = Number(bytes) || 0;
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    function renderUpdateState(state = {}) {
        const phase = state.phase || "idle";
        const percent = Math.max(0, Math.min(100, Number(state.percent) || 0));
        const showAction = phase === "available";
        currentPhase = phase;

        $("#app-update-current-version").text(state.currentVersion || pjson?.version || "-");
        statusElement.text(state.message || "Checking for updates...");
        actionButton.toggle(showAction).prop("disabled", false).text("Update Now");
        dialogElement.find('.app-update-actions').css('display',showAction?'flex':'none');
        updateIcon.removeClass("idle checking available downloading downloaded installing not-available error development").addClass(phase);

        if (state.latestVersion) {
            latestVersion.text(state.latestVersion);
            latestWrap.css('display','flex');
        } else {
            latestWrap.hide();
        }

        const showProgress = phase === "downloading" || phase === "downloaded" || phase === "installing";
        progressElement.toggle(showProgress);
        progressBar.width(`${phase === "downloaded" ? 100 : percent}%`);

        if (phase === "downloading" && state.total) {
            const speed = state.bytesPerSecond ? ` • ${formatBytes(state.bytesPerSecond)}/s` : "";
            progressCaption.text(`${percent.toFixed(1)}% • ${formatBytes(state.transferred)} / ${formatBytes(state.total)}${speed}`);
        } else {
            progressCaption.text(`${phase === "downloaded" ? 100 : percent.toFixed(1)}%`);
        }
    }

    async function openUpdateDialog() {
        dialogElement.addClass("show");
        renderUpdateState(await updaterIPC.invoke("app-update-get-state"));
    }

    window.openSoftwareUpdateDialog = openUpdateDialog;
    $("#app-update-dialog .close-btn").on("click", () => dialogElement.removeClass("show"));
    actionButton.on("click", async () => {
        actionButton.prop("disabled", true);
        if (currentPhase === "available") {
            await updaterIPC.invoke("app-update-download");
        }
    });

    updaterIPC.on("app-update-open", openUpdateDialog);
    updaterIPC.on("app-update-state", (event, state) => renderUpdateState(state));
    updaterIPC.invoke("app-update-get-state").then(renderUpdateState).catch(() => {});
})();
