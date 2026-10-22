let uf2MountPath = "";
let firmwareUpdateMode = false;
let windowFirewareUpdate = null;
let autoConnectPauseBeforeFirmwareUpdate = false;

function beginFirmwareUpdate() {
    if (!firmwareUpdateMode) {
        autoConnectPauseBeforeFirmwareUpdate = !!window.autoConnectPause;
    }
    firmwareUpdateMode = true;
    window.firmwareUpdateMode = true;
    window.autoConnectPause = true;
}

function endFirmwareUpdate() {
    firmwareUpdateMode = false;
    window.firmwareUpdateMode = false;
    window.autoConnectPause = autoConnectPauseBeforeFirmwareUpdate;
}

async function closeSerialPortForFirmwareUpdate() {
    const portToClose = serialPort;
    if (!portToClose || !portToClose.isOpen) {
        return;
    }

    await new Promise((resolve, reject) => {
        portToClose.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function extractProgressFromText(text) {
    const match = /(\d+(?:\.\d+)?)\s*%/.exec(String(text || ""));
    return match ? +match[1] : null;
}

function formatFirmwareProgressCaption(caption, percentage = null) {
    const text = String(caption || "").replace(/\s+/g, " ").trim();
    const progressValue = (percentage != null && Number.isFinite(+percentage))
        ? +percentage
        : extractProgressFromText(text);

    const bytesMatch = /(\d+)\s*\/\s*(\d+)\s*bytes?/i.exec(text);
    if (progressValue != null && bytesMatch) {
        return `${progressValue.toFixed(1)}% (${bytesMatch[1]} / ${bytesMatch[2]} bytes)`;
    }

    if (progressValue != null) {
        return `${progressValue.toFixed(1)}%`;
    }

    if (/compressed /i.test(text)) return "Compressing firmware...";
    if (/erasing flash/i.test(text)) return "Erasing flash...";
    if (/configuring flash size/i.test(text)) return "Configuring flash size...";
    if (/hash of data verified/i.test(text)) return "Verifying flashed data...";
    if (/hard resetting via rts pin/i.test(text)) return "Resetting device...";
    if (/flash complete/i.test(text)) return "Firmware flash complete...";
    if (/preparing firmware flash/i.test(text)) return "Preparing firmware flash...";

    return text || "Working...";
}

function setFirmwareProgress(caption, percentage = null) {
    const progressBox = $("#firmware-upgrade-dialog .progress-box");
    const backDrop = $("#firmware-upgrade-dialog .progress-box > .back-drop");
    const displayCaption = formatFirmwareProgressCaption(caption, percentage);

    $("#firmware-upgrade-dialog .progress-box > .caption").text(displayCaption);

    const parsedPercentage = (percentage != null && Number.isFinite(+percentage))
        ? +percentage
        : extractProgressFromText(caption);

    if (parsedPercentage != null && Number.isFinite(parsedPercentage)) {
        progressBox.removeClass("indeterminate");
        const normalized = Math.max(0, Math.min(100, parsedPercentage));
        backDrop.width(`${normalized}%`);
    } else {
        progressBox.addClass("indeterminate");
        backDrop.width("35%");
    }
}

function finishFirmwareDialog(success, text) {
    $("#firmware-upgrade-dialog .progress-box").removeClass("indeterminate");
    $("#firmware-upgrade-dialog article.done .icon").hide();
    if (success) {
        $("#firmware-upgrade-dialog article.done .icon.success").show();
        $("#firmware-upgrade-status").text(text || "Firmware Upgrade Successful");
        $("#firmware-upgrade-dialog .upload-btn").show();
    } else {
        $("#firmware-upgrade-dialog article.done .icon.fail").show();
        $("#firmware-upgrade-status").text(text || "Firmware Upgrade Fail");
        $("#firmware-upgrade-dialog .upload-btn").hide();
    }

    $("#firmware-upgrade-dialog article.doing").hide();
    $("#firmware-upgrade-dialog article.done").show();
    $("#firmware-upgrade-dialog .close-btn").show();
}

async function readFirmwareBinary(fwPath) {
    if (!isElectron) {
        return new Uint8Array(await (await fetch(fwPath)).arrayBuffer());
    }
    return new Uint8Array(await readFileAsync(fwPath));
}

function toBase64(bytes) {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

async function flashFirmwareViaBridge(chipId, fwPath, originalFirmwarePath) {
    const ws = currentTransport?._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("Robot bridge is not connected");
    }

    const firmwareData = await readFirmwareBinary(fwPath);
    const flashOffset = chipId.toLowerCase().includes("s3") ? "0x0000" : "0x1000";
    const firmwareBridgeTimeoutMs = 180000;
    const firmwareBridgeFinalizingTimeoutMs = 20000;

    return new Promise((resolve, reject) => {
        let settled = false;
        let watchdog = null;
        let finalizingWatchdog = null;
        const firmwareName = (originalFirmwarePath || fwPath).split(/[\\/]/).pop();

        const resetWatchdog = () => {
            try { clearTimeout(watchdog); } catch { }
            watchdog = setTimeout(() => {
                console.warn("[firmware bridge] watchdog timeout waiting for firmware_result");
                try { statusLog?.("[firmware bridge] timeout waiting for firmware_result"); } catch { }
                fail(new Error("Robot bridge did not finish firmware flash. It likely did not send firmware_result."));
            }, firmwareBridgeTimeoutMs);
        };

        const startFinalizingWatchdog = () => {
            if (finalizingWatchdog) return;
            console.log("[firmware bridge] entering finalizing watchdog");
            try { statusLog?.("[firmware bridge] waiting for final firmware_result"); } catch { }
            finalizingWatchdog = setTimeout(() => {
                console.warn("[firmware bridge] finalizing timeout waiting for firmware_result");
                fail(new Error("Firmware write reached the final stage but robot bridge did not send firmware_result."));
            }, firmwareBridgeFinalizingTimeoutMs);
        };

        const cleanup = () => {
            try { clearTimeout(watchdog); } catch { }
            try { clearTimeout(finalizingWatchdog); } catch { }
            window.removeEventListener("robot-bridge-message", onBridgeMessage);
        };

        const fail = (error) => {
            if (settled) return;
            settled = true;
            cleanup();
            console.warn("[firmware bridge] fail", error);
            try { statusLog?.(`[firmware bridge] fail: ${error}`); } catch { }
            reject(error instanceof Error ? error : new Error(String(error)));
        };

        const done = () => {
            if (settled) return;
            settled = true;
            cleanup();
            console.log("[firmware bridge] success");
            try { statusLog?.("[firmware bridge] success"); } catch { }
            resolve();
        };

        const onBridgeMessage = (event) => {
            const payload = event.detail || {};
            console.log("[firmware bridge] received", payload);

            if (payload.type === "firmware_status") {
                const parsedFromStatus = extractProgressFromText(payload.message || payload.stage || "");
                console.log("[firmware bridge] firmware_status percentage", parsedFromStatus);
                try { statusLog?.(`[firmware bridge] firmware_status %=${parsedFromStatus == null ? "none" : parsedFromStatus}`); } catch { }
                resetWatchdog();
                setFirmwareProgress(payload.message || payload.stage || "Working...");
                const msg = String(payload.message || payload.stage || "").toLowerCase();
                if (msg.includes("hash of data verified") || msg.includes("hard resetting via rts pin") || msg.includes("flash complete")) {
                    startFinalizingWatchdog();
                }
                return;
            }

            if (payload.type === "firmware_progress") {
                console.log("[firmware bridge] firmware_progress percentage", payload.percentage);
                try { statusLog?.(`[firmware bridge] firmware_progress %=${payload.percentage}`); } catch { }
                resetWatchdog();
                setFirmwareProgress(payload.message || "Flashing firmware...", payload.percentage);
                if (+payload.percentage >= 100) {
                    startFinalizingWatchdog();
                }
                return;
            }

            if (payload.type === "firmware_result") {
                if (payload.ok) {
                    done();
                } else {
                    fail(payload.message || "Firmware flash failed");
                }
            }
        };

        window.addEventListener("robot-bridge-message", onBridgeMessage);

        try {
            resetWatchdog();
            console.log("[firmware bridge] sending FLASH_FIRMWARE", {
                chip: chipId,
                filename: firmwareName,
                flash_offset: flashOffset,
                size: firmwareData.length,
            });
            try {
                statusLog?.(`[firmware bridge] send FLASH_FIRMWARE ${firmwareName} (${firmwareData.length} bytes)`);
            } catch { }
            ws.send(JSON.stringify({
                type: "FLASH_FIRMWARE",
                chip: chipId,
                filename: firmwareName,
                flash_offset: flashOffset,
                content_b64: toBase64(firmwareData)
            }));
            setFirmwareProgress("Sending firmware to robot bridge...", 2);
        } catch (error) {
            fail(error);
        }
    });
}

let firewareUpgradeFlow = async () => {
    let board = boards.find(board => board.id === boardId);
    
    $("#firmware-version-select").html(board.firmware.map((a, index) => `<option value="${index}">${a.name}</option>`));

    if (!isElectron && /^ESP32/i.test(board?.chip || "")) { // Web: ESP32 / ESP32Sx use WebSerial flasher
        const w = 600, h = 460;
        const y = (window.top.outerHeight / 2) + window.top.screenY - (h / 2);
        const x = (window.top.outerWidth / 2) + window.top.screenX - (w / 2);
        windowFirewareUpdate = window.open(
            "/firmware.html?board=" + encodeURI(boardId) + "&firmware=" + encodeURI(JSON.stringify(board.firmware)),
            "Firmware Update",
            `width=600,height=500,top=${y},left=${x}`
        );
        return;
    } else {
        if (board?.chip.indexOf("RP2") >= 0) {
            $("#install-firmware-button").prop("disabled", true);
            $("#firmware-upgrade-dialog .note-for-rp2").show();

            const checkRP2DriveAvailable = async () => {
                const platform = os.platform();
                if (platform === "win32") {
                    const drives = await nodeDiskInfo.getDiskInfo();
                    const RP2DriveInfo = drives.find(a => a.filesystem === "Removable Disk" && a.blocks === 134066176);
                    if (RP2DriveInfo) {
                        const mount = RP2DriveInfo.mounted;
                        if (nodeFS.existsSync(path.join(mount, "/INFO_UF2.TXT"))) {
                            console.log("RP2 Drive info", RP2DriveInfo);
                            uf2MountPath = mount;
                            $("#firmware-upgrade-dialog .note-for-rp2").hide();
                            $("#install-firmware-button").prop("disabled", false);
                            return;
                        }
                    }
                } else if ((platform === "linux") || (platform === "darwin")) {
                    const drives = await (new Promise((resolve, reject) => {
                        let stdout = "";

                        const df_h = spawn("df -a", [], {shell: true});

                        df_h.stdout.on("data", (data) => {
                            // console.log("stdout:", data.toString());
                            stdout = data.toString();
                        });
                        
                        df_h.stderr.on("data", (data) => {
                            // console.log("stderr:", data.toString());
                        });
                        
                        df_h.on("exit", (code) => {
                            // console.warn("esptool error code", code);
                            const info = stdout.split("\n")
                                                .filter(a => a.startsWith("/dev"))
                                                .map(a => a.split(" ").filter(a => a.length !== 0))
                                                .map(a => ({ 
                                                    filesystem: a[0],
                                                    blocks: +a[1] * (os.platform() === "darwin" ? 512 : 1024),
                                                    mounted: os.platform() === "darwin" ? a[8] : a[5],
                                                }));
                            resolve(info);
                        });
                    }));
                    console.log("Drive", drives);
                    const RP2DriveInfo = drives.find(a => a.blocks === 134066176);
                    if (RP2DriveInfo) {
                        console.log("found", RP2DriveInfo);
                        const mount = RP2DriveInfo.mounted;
                        if (nodeFS.existsSync(path.join(mount, "/INFO_UF2.TXT"))) {
                            console.log("RP2 Drive info", RP2DriveInfo);
                            uf2MountPath = mount;
                            $("#firmware-upgrade-dialog .note-for-rp2").hide();
                            $("#install-firmware-button").prop("disabled", false);
                            return;
                        }
                    }
                }

                setTimeout(checkRP2DriveAvailable, 100);
            };

            checkRP2DriveAvailable();
        } else {
            $("#install-firmware-button").prop("disabled", false);
            $("#firmware-upgrade-dialog .note-for-rp2").hide();
        }
    }

    $("#firmware-upgrade-dialog article").hide();
    $("#firmware-upgrade-dialog article.todo").show();
    $("#firmware-upgrade-dialog").show();
};

$("#install-firmware-button").click(async () => {
    $("#firmware-upgrade-dialog article.todo").hide();
    $("#firmware-upgrade-dialog  .progress-box > .back-drop").width(0);
    $("#firmware-upgrade-dialog article.doing").show();

    $("#firmware-upgrade-dialog .close-btn").hide();

    let board = boards.find(board => board.id === boardId);
    const chipId = board?.chip || "ESP32";

    let fwIndex = +$("#firmware-version-select").val();
    let fwPath = board.firmware[fwIndex].path;
    if (!isElectron) {
        fwPath = fwPath.startsWith("/") ? fwPath : `/boards/${boardId}/${fwPath}`;
    } else {
        const firmwareRootPath = sharedObj.unpackedRootPath
            ? path.join(sharedObj.unpackedRootPath, "microBlock-IDE")
            : sharedObj.rootPath;
        fwPath = fwPath.startsWith("/") ? firmwareRootPath + fwPath : `${firmwareRootPath}/boards/${boardId}/${fwPath}`;
        fwPath = path.normalize(fwPath);
    }
    
    if (/^ESP32/i.test(chipId)) { // ESP32 / ESP32Sx family
        if (currentTransport?.type === "wifi") {
            try {
                beginFirmwareUpdate();
                setFirmwareProgress("Preparing firmware bridge...", 0);
                await flashFirmwareViaBridge(chipId, fwPath, board.firmware[fwIndex].path);
                finishFirmwareDialog(true, "Firmware Upgrade Successful");
            } catch (error) {
                finishFirmwareDialog(false, "Firmware Upgrade Fail : " + error.toString());
            } finally {
                endFirmwareUpdate();
            }
            return;
        }

        if (!isElectron) {
            let data = null;
            if (!isElectron) {
                data = await (await fetch(fwPath)).arrayBuffer();
            } else {
                data = await readFileAsync(fwPath);
            }
            console.log(typeof data, data);
            
            if (!serialPort) {
                if (!await serialConnect()) {
                    return;
                }
                await sleep(300);
            }

            const debugMsg = (...args) => {
                function getStackTrace() {
                    let stack = new Error().stack;
                    stack = stack.split("\n").map(v => v.trim());
                    for (let i = 0; i < 3; i++) {
                        stack.shift();
                    }
            
                    let trace = [];
                    for (let line of stack) {
                        line = line.replace("at ", "");
                        trace.push({
                            "func": line.substr(0, line.indexOf("(") - 1),
                            "pos": line.substring(line.indexOf(".js:") + 4, line.lastIndexOf(":"))
                        });
                    }
            
                    return trace;
                }
            
                let stack = getStackTrace();
                stack.shift();
                let top = stack.shift();
                let prefix = '[' + top.func + ":" + top.pos + '] ';
                for (let arg of args) {
                    if (typeof arg == "string") {
                        console.log(prefix + arg);
                    } else if (typeof arg == "number") {
                        console.log(prefix + arg);
                    } else if (typeof arg == "boolean") {
                        console.log(prefix + arg ? "true" : "false");
                    } else if (Array.isArray(arg)) {
                        console.log(prefix + "[" + arg.map(value => espTool.toHex(value)).join(", ") + "]");
                    } else if (typeof arg == "object" && (arg instanceof Uint8Array)) {
                        console.log(prefix + "[" + Array.from(arg).map(value => espTool.toHex(value)).join(", ") + "]");
                    } else {
                        console.log(prefix + "Unhandled type of argument:" + typeof arg);
                        console.log(arg);
                    }
                    prefix = "";  // Only show for first argument
                }
            }

            firmwareUpdateMode = true;
            window.firmwareUpdateMode = true;

            const logMsg = a => {
                console.log(a);
                $("#firmware-upgrade-dialog .progress-box > .caption").text(a);
            };

            const espTool = new EspLoader({
                updateProgress: (part, percentage) => {
                    $("#firmware-upgrade-dialog  .progress-box > .back-drop").width(`${+percentage}%`);
                },
                logMsg,
                debugMsg,
                debug: true
            });

            if (writer) {
                writer.releaseLock();
                writer = null;
            }
            
            let synced = false;
            for (let i=0;i<20;i++) {
                logMsg("Enter to Bootloader...");
                if (!await espTool.connect()) { // Reset & Enter to boot mode
                    continue;
                }

                await sleep(500); // Wait ESP32 work

                try {
                    logMsg("Sync...");
                    await espTool.sync(); // Sync bootloader
                } catch(e) {
                    continue;
                }

                synced = true;
                break;
            }

            if (!synced) {
                throw "Connect fail";
            }

            console.log("Connected to", await espTool.chipName());
            console.log("MAC Address:", espTool.macAddr());

            const espToolStub = await espTool.runStub(); // Upload and run Stub

            // await espToolStub.setBaudrate(921600);
            
            console.log("eraseFlash");
            logMsg("Erase Flash...");
            await espToolStub.eraseFlash();

            const file = board.firmware[fwIndex].path;
            console.log("flashData", file);
            
            await espToolStub.flashData(data, 0x1000, file);

            console.log("disconnect");
            await espTool.disconnect(); // Reset & exit boot mode

            espTool.setPortBaudRate(115200);

            writer = serialPort.writable.getWriter();
            firmwareUpdateMode = false;
            window.firmwareUpdateMode = false;

            const code = 0;

            $("#firmware-upgrade-dialog article.done .icon").hide();
            if (code === 0) {
                $("#firmware-upgrade-dialog article.done .icon.success").show();
                $("#firmware-upgrade-status").text("Firmware Upgrade Successful");
                $("#firmware-upgrade-dialog .upload-btn").show();
            } else {
                $("#firmware-upgrade-dialog article.done .icon.fail").show();
                $("#firmware-upgrade-status").text("Firmware Upgrade Fail with code " + code);
                $("#firmware-upgrade-dialog .upload-btn").hide();
            }

            $("#firmware-upgrade-dialog article.doing").hide();
            $("#firmware-upgrade-dialog article.done").show();

            $("#firmware-upgrade-dialog .close-btn").show();
        } else {
            let comPort;
            beginFirmwareUpdate();
            try {
                if (serialPort) {
                    comPort = serialPort.path;
                    await closeSerialPortForFirmwareUpdate();
                } else {
                    console.log("Show");
                    comPort = await showPortSelect();
                    console.log(comPort);
                }

                let esptoolName = {
                    darwin: "esptool",
                    linux: "esptool-ubuntu-x64",
                    win32: "esptool.exe"
                };
                const esptoolDirectory = sharedObj.esptoolDir || path.join(sharedObj.rootPath, "..", "bin", "esptool");
                let esptoolPath = path.normalize(path.join(esptoolDirectory, esptoolName[os.platform()]));
                const flashOffset = chipId.toLowerCase().includes("s3") ? "0x0000" : "0x1000"; // S3 images are combined, ESP32 app offset starts at 0x1000
                let arg = [
                    // "--chip",        "esp32s3",
                    "--port",        comPort,
                    "--baud",        "115200",
                    "write_flash",
                    "--compress",
                    "--erase-all",
                    "--flash_mode",  "dio",
                    "--flash_freq",  "40m",
                    "--flash_size",  "detect",
                    flashOffset, fwPath
                ];
                // console.log(arg);

                if (!nodeFS.existsSync(esptoolPath)) {
                    throw new Error(`Firmware tool not found: ${esptoolPath}`);
                }
                if (!nodeFS.existsSync(fwPath)) {
                    throw new Error(`Firmware file not found: ${fwPath}`);
                }
                
                let esptool = spawn(esptoolPath, arg);

                esptool.stdout.on("data", (data) => {
                    const lines = data.toString().split(/\r?\n/);
                    lines.forEach(raw => {
                        const line = raw.trim();
                        if (!line) return;

                        console.log("stdout:", line);

                        if (/Connecting\.{3}/.test(line)) {
                            $("#firmware-upgrade-dialog .progress-box > .caption").text("Connecting...");
                            return;
                        }
                        
                        const percent = /(\d+)\s*%/.exec(line);
                        if (percent) {
                            $("#firmware-upgrade-dialog .progress-box > .caption").text(line);
                            $("#firmware-upgrade-dialog  .progress-box > .back-drop").width(`${+percent[1]}%`);
                        }
                    });
                });
                
                esptool.stderr.on("data", (data) => {
                    console.log("stderr:", data.toString());
                });

                let firmwareProcessFinished = false;
                const finishFirmwareProcess = async (code, processError = null) => {
                    if (firmwareProcessFinished) return;
                    firmwareProcessFinished = true;

                    console.warn("esptool error code", code);

                    const success = !processError && code === 0;
                    const failureText = processError
                        ? `Firmware Upgrade Fail : ${processError.message || processError}`
                        : `Firmware Upgrade Fail with code ${code}`;
                    finishFirmwareDialog(success, success ? "Firmware Upgrade Successful" : failureText);

                    if (success) {
                        await serialConnectElectron(comPort);
                    }
                    endFirmwareUpdate();
                };

                esptool.once("error", (error) => {
                    finishFirmwareProcess(null, error);
                });
                esptool.once("close", (code) => {
                    finishFirmwareProcess(code);
                });
            } catch (error) {
                endFirmwareUpdate();
                if (error) {
                    finishFirmwareDialog(false, "Firmware Upgrade Fail : " + error.toString());
                }
                return;
            }
        }
    } else if (chipId.indexOf("RP2") >= 0) {
        if (!isElectron || os.platform() === "win32") {
            ((uri, name) => {
                var link = document.createElement("a");
                // If you don't know the name or want to use
                // the webserver default set name = ''
                link.setAttribute('download', name);
                link.href = uri;
                document.body.appendChild(link);
                link.click();
                link.remove();
            })(fwPath, "firmware.uf2");

            $("#firmware-upgrade-dialog article.done .icon").hide();
            $("#firmware-upgrade-dialog article.done .icon.success").show();
            $("#firmware-upgrade-status").text("Firmware Upgrade Successful");
            $("#firmware-upgrade-dialog .upload-btn").show();

            $("#firmware-upgrade-dialog article.doing").hide();
            $("#firmware-upgrade-dialog article.done").show();

            $("#firmware-upgrade-dialog .close-btn").show();
        } else {
            const sourceFile = fwPath;
            const destFile = path.join(uf2MountPath, "/firmware.uf2");

            nodeFS.stat(sourceFile, function(err, stat){
                const filesize = stat.size
                let bytesCopied = 0
            
                const readStream = nodeFS.createReadStream(sourceFile)
            
                readStream.on('data', function(buffer){
                bytesCopied += buffer.length;
                const porcentage = ((bytesCopied/filesize)*100).toFixed(2);

                $("#firmware-upgrade-dialog .progress-box > .caption").text(`${porcentage}% (${bytesCopied} / ${filesize})`);
                $("#firmware-upgrade-dialog  .progress-box > .back-drop").width(`${porcentage}%`);
                });

                readStream.on('end', function(){
                    $("#firmware-upgrade-dialog article.done .icon").hide();
                    $("#firmware-upgrade-dialog article.done .icon.success").show();
                    $("#firmware-upgrade-status").text("Firmware Upgrade Successful");
                    $("#firmware-upgrade-dialog .upload-btn").show();

                    $("#firmware-upgrade-dialog article.doing").hide();
                    $("#firmware-upgrade-dialog article.done").show();

                    $("#firmware-upgrade-dialog .close-btn").show();
                });

                readStream.pipe(nodeFS.createWriteStream(destFile));
            });
        }
    }
});

$("#firmware-upgrade-dialog .upload-btn").click(() => {
    $("#upload-program").click();
    $("#firmware-upgrade-dialog .close-btn").click();
});

$("#firmware-upgrade-dialog .close-btn").click(() => $("#firmware-upgrade-dialog").hide());

let skipFirmwareUpgrade = false;
$("#continue-upload").click(() => {
    skipFirmwareUpgrade = true;
    $("#firmware-upgrade-dialog .close-btn").click();
    $("#upload-program").click();
});

// setTimeout(() => firewareUpgradeFlow(), 500);
