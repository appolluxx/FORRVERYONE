(function () {
  const { ipcRenderer } = require('electron');
  const { Client } = require('ssh2');
  const http = require('http');
  const terminalShell = document.getElementById('terminalShell');
  const terminalTargetLabel = document.getElementById('terminalTargetLabel');
  const hideTerminalBtn = document.getElementById('hideTerminalBtn');
  const closeTerminalBtn = document.getElementById('closeTerminalBtn');
  const query = new URLSearchParams(window.location.search);
  const terminalId = String(query.get('id') || '').trim() || '0';
  const defaultRosHost = (localStorage.getItem('ptbot_wifi_ip') || '192.168.0.125').trim() || '192.168.0.125';
  const sshTarget = query.get('target') || ('james@' + defaultRosHost);
  const initialTitle = String(query.get('title') || '').trim();
  const autoRunCommand = String(query.get('run') || '').trim();
  const bridgeHost = String(query.get('host') || defaultRosHost).trim() || defaultRosHost;
  const bridgePort = parseInt(query.get('port') || '8080', 10) || 8080;
  const defaultPassword = '310767';
  const targetMatch = /^([^@]+)@(.+)$/.exec(sshTarget);
  const sshUsername = targetMatch ? targetMatch[1] : 'james';
  const sshHost = targetMatch ? targetMatch[2] : sshTarget;
  const rawSessionName = String(query.get('session') || '').trim();
  const tmuxSessionName = (rawSessionName
    || (/^ptbot_/i.test(terminalId) ? terminalId : ('ptbot_t' + terminalId + '_' + sshUsername + '_' + sshHost)))
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 48);

  let sshClient = null;
  let sshStream = null;
  let currentInput = '';
  let inputEscapeState = 0;
  let isClosingTerminal = false;
  let lastUserFacingTitle = initialTitle || ('ssh ' + sshTarget);
  let pendingTypedTitle = '';
  let hasManualInputSincePrompt = false;
  let autoRunTimer = null;
  let autoRunSent = false;

  const term = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: {
      background: '#0f141b',
      foreground: '#d7e3f1',
      cursor: '#d7e3f1'
    }
  });

  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalShell);
  term.focus();
  term.attachCustomKeyEventHandler(function (event) {
    if (!event || event.type !== 'keydown') return true;
    const key = String(event.key || '');
    if (!key) return true;
    if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
      return true;
    }
    hasManualInputSincePrompt = true;
    return true;
  });
  term.onKey(function (event) {
    const key = event && event.key ? event.key : '';
    const domEvent = event && event.domEvent ? event.domEvent : null;
    if (!domEvent) return;

    if (domEvent.key === 'Enter') {
      const typedCommand = currentInput.trim();
      if (typedCommand) {
        setTerminalTitle(typedCommand);
      } else if (hasManualInputSincePrompt) {
        const command = extractCommandFromVisibleLine();
        if (isLikelyShellCommand(command)) {
          setTerminalTitle(command);
        }
      }
      currentInput = '';
      pendingTypedTitle = '';
      hasManualInputSincePrompt = false;
      return;
    }

    if (domEvent.key === 'Backspace') {
      currentInput = currentInput.slice(0, -1);
      if (hasManualInputSincePrompt) {
        updatePendingTypedTitle();
      }
      return;
    }

    if (domEvent.key === 'c' && domEvent.ctrlKey) {
      currentInput = '';
      pendingTypedTitle = '';
      hasManualInputSincePrompt = false;
      setTerminalTitle('Ctrl+C');
      return;
    }

    if (domEvent.key === 'ArrowUp' || domEvent.key === 'ArrowDown' || domEvent.key === 'ArrowLeft' || domEvent.key === 'ArrowRight') {
      hasManualInputSincePrompt = true;
      return;
    }

    if (key && key.length === 1 && !domEvent.ctrlKey && !domEvent.metaKey && !domEvent.altKey) {
      currentInput += key;
      if (hasManualInputSincePrompt) {
        updatePendingTypedTitle();
      }
    }
  });
  let fitTimer = null;
  let fitFollowupTimer = null;

  function applyTerminalFit() {
    try {
      fitAddon.fit();
    } catch (error) {}
    terminalShell.classList.add('is-ready');
    if (sshStream && typeof sshStream.setWindow === 'function') {
      try {
        sshStream.setWindow(term.rows, term.cols, 0, 0);
      } catch (error) {}
    }
    scrollTerminalToLatest();
  }

  function scheduleFit() {
    if (fitTimer) {
      clearTimeout(fitTimer);
    }
    if (fitFollowupTimer) {
      clearTimeout(fitFollowupTimer);
    }
    fitTimer = setTimeout(function () {
      fitTimer = null;
      applyTerminalFit();
      fitFollowupTimer = setTimeout(function () {
        fitFollowupTimer = null;
        applyTerminalFit();
      }, 80);
    }, 30);
  } 

  terminalTargetLabel.textContent = 'Auto connect target: ' + sshTarget;

  function scrollTerminalToLatest() {
    try {
      term.scrollToBottom();
    } catch (error) {}
  }

  function writeOutput(text) {
    term.write(text.replace(/\r?\n/g, '\r\n'));
    scrollTerminalToLatest();
    scheduleFit();
  }

  function writeLine(text) {
    writeOutput(text + '\r\n');
  }

  function scheduleAutoRun(stream) {
    if (!autoRunCommand || autoRunSent) return;
    if (autoRunTimer) {
      clearTimeout(autoRunTimer);
    }
    autoRunTimer = setTimeout(function () {
      autoRunTimer = null;
      if (sshStream !== stream || autoRunSent) return;
      autoRunSent = true;
      try {
        stream.write(autoRunCommand + '\r');
      } catch (error) {}
    }, 400);
  }

  function setTerminalTitle(title) {
    const normalizedTitle = normalizeUserFacingTitle(title);
    if (!normalizedTitle) return;
    const nextTitle = formatTerminalTitle(normalizedTitle);
    lastUserFacingTitle = nextTitle;
    ipcRenderer.send('set-ros-terminal-title', {
      id: terminalId,
      title: nextTitle
    });
    renameRemoteTerminal(nextTitle);
  }

  function normalizeUserFacingTitle(title) {
    const rawTitle = String(title || '').trim();
    if (!rawTitle) return '';
    if (/^tmux\b/i.test(rawTitle)) return '';
    if (/^tmux\s+new-session\b/i.test(rawTitle)) return '';
    if (/^tmux\s+attach(?:-session)?\b/i.test(rawTitle)) return '';
    if (/^tmux\s+kill-session\b/i.test(rawTitle)) return '';
    if (/^\[terminal\]/i.test(rawTitle)) return '';
    if (/^\??\d+(?:;\d+)*[A-Za-z](?:\d+(?:;\d+)*[A-Za-z])*$/i.test(rawTitle)) return '';
    return rawTitle;
  }

  function updatePendingTypedTitle() {
    const typedCommand = currentInput.trim();
    if (!typedCommand) {
      pendingTypedTitle = '';
      return;
    }
    const normalizedTitle = normalizeUserFacingTitle(typedCommand);
    if (!normalizedTitle) return;
    const nextTitle = formatTerminalTitle(normalizedTitle);
    if (nextTitle === pendingTypedTitle || nextTitle === lastUserFacingTitle) {
      return;
    }
    pendingTypedTitle = nextTitle;
    ipcRenderer.send('set-ros-terminal-title', {
      id: terminalId,
      title: nextTitle
    });
    renameRemoteTerminal(nextTitle);
  }

  function isLikelyShellCommand(text) {
    const rawText = String(text || '').trim();
    if (!rawText) return false;
    if (!normalizeUserFacingTitle(rawText)) return false;
    if (/^[A-Za-z0-9._/-]+$/.test(rawText)) return true;
    if (/[ =/:\\'"`|-]/.test(rawText)) return true;
    return false;
  }

  function requestBridgeJson(method, path, body) {
    return new Promise(function (resolve, reject) {
      const requestPath = path.charAt(0) === '/' ? path : ('/' + path);
      const bodyText = body == null ? '' : JSON.stringify(body);
      const request = http.request({
        hostname: bridgeHost,
        port: bridgePort,
        path: requestPath,
        method: method,
        headers: Object.assign(
          { Accept: 'application/json' },
          bodyText ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyText)
          } : {}
        )
      }, function (response) {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          raw += chunk;
        });
        response.on('end', function () {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error('Request failed with code ' + response.statusCode));
            return;
          }
          if (!raw.trim()) {
            resolve({});
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      });
      request.on('error', reject);
      request.setTimeout(5000, function () {
        request.destroy(new Error('Request timeout'));
      });
      if (bodyText) {
        request.write(bodyText);
      }
      request.end();
    });
  }

  function requestBridgeWs(message, expectedTypes) {
    return new Promise(function (resolve, reject) {
      const acceptedTypes = Array.isArray(expectedTypes) ? expectedTypes.slice() : [expectedTypes];
      const socket = new WebSocket('ws://' + bridgeHost + ':' + bridgePort + '/ws');
      let settled = false;
      const timeout = setTimeout(function () {
        if (settled) return;
        settled = true;
        try { socket.close(); } catch (error) {}
        reject(new Error('WebSocket request timeout'));
      }, 5000);

      function finish(error, payload) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { socket.close(); } catch (closeError) {}
        if (error) {
          reject(error);
        } else {
          resolve(payload);
        }
      }

      socket.addEventListener('open', function () {
        try {
          socket.send(JSON.stringify(message));
        } catch (error) {
          finish(error);
        }
      });

      socket.addEventListener('message', function (event) {
        let payload = null;
        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          return;
        }
        if (!payload || typeof payload !== 'object') return;
        const type = String(payload.type || '');
        if (type === 'status' || type === 'firmware_status' || type === 'firmware_progress') {
          return;
        }
        if (type === 'error') {
          finish(new Error(payload.message || 'Robot bridge error'));
          return;
        }
        if (acceptedTypes.indexOf(type) >= 0) {
          finish(null, payload);
        }
      });

      socket.addEventListener('error', function () {
        finish(new Error('WebSocket request failed'));
      });

      socket.addEventListener('close', function () {
        if (!settled) {
          finish(new Error('WebSocket request closed'));
        }
      });
    });
  }

  function renameRemoteTerminal(title) {
    if (!terminalId || terminalId === '0') return;
    requestBridgeWs({
      type: 'RENAME_TERMINAL',
      id: terminalId,
      title: title
    }, ['terminal_renamed', 'terminal_list']).catch(function () {
      return requestBridgeJson('PATCH', '/terminals/' + encodeURIComponent(terminalId), {
        title: title
      });
    }).catch(function () {});
  }

  function formatTerminalTitle(title) {
    const maxTitleLength = 56;
    const rawTitle = String(title || '').trim() || ('Terminal ' + terminalId);
    if (rawTitle.length <= maxTitleLength) return rawTitle;
    const ellipsis = '...';
    const keepTotal = maxTitleLength - ellipsis.length;
    const headLength = Math.ceil(keepTotal / 2);
    const tailLength = Math.floor(keepTotal / 2);
    return rawTitle.slice(0, headLength) + ellipsis + rawTitle.slice(-tailLength);
  }

  function extractCommandFromVisibleLine() {
    try {
      const buffer = term && term.buffer && term.buffer.active;
      if (!buffer) return '';
      const lineIndex = buffer.baseY + buffer.cursorY;
      const line = buffer.getLine(lineIndex);
      if (!line || typeof line.translateToString !== 'function') return '';
      const rawText = line.translateToString(true).trim();
      if (!rawText) return '';
      const promptMatch = rawText.match(/(?:\$ |# |> )(.*)$/);
      if (promptMatch && promptMatch[1]) {
        return promptMatch[1].trim();
      }
      return rawText;
    } catch (error) {
      return '';
    }
  }

  function closeSshSession() {
    if (sshStream) {
      try {
        sshStream.end();
      } catch (error) {}
      sshStream = null;
    }

    if (sshClient) {
      try {
        sshClient.end();
      } catch (error) {}
      sshClient = null;
    }
  }

  function requestWindowClose() {
    ipcRenderer.send('close-ros-terminal-window', terminalId);
  }

  function closeTerminalAndStopSession() {
    if (isClosingTerminal) return;
    isClosingTerminal = true;
    writeLine('[terminal] Closing terminal session: ' + tmuxSessionName);
    closeRobotTerminalSession().then(function () {
      requestWindowClose();
    }).catch(function (error) {
      writeLine('[terminal] Failed to close session: ' + error.message);
      requestWindowClose();
    });
  }

  function closeRobotTerminalSession() {
    if (!terminalId || terminalId === '0') {
      return Promise.resolve();
    }
    return requestBridgeWs({
      type: 'CLOSE_TERMINAL',
      id: terminalId
    }, ['terminal_closed', 'terminal_list']).catch(function () {
      return requestBridgeJson('DELETE', '/terminals/' + encodeURIComponent(terminalId));
    });
  }

  term.onData(function (data) {
    if (!sshStream) return;
    try {
      sshStream.write(data);
    } catch (error) {
      writeLine('[terminal] Send failed: ' + error.message);
    }
  });

  term.onResize(function (size) {
    if (!sshStream || typeof sshStream.setWindow !== 'function') return;
    try {
      sshStream.setWindow(size.rows, size.cols, 0, 0);
    } catch (error) {}
  });

  function attachShell() {
    if (sshClient) return;

    sshClient = new Client();

    sshClient.on('ready', function () {
      writeLine('[terminal] SSH connected');
      sshClient.exec(
        'tmux set-option -t ' + tmuxSessionName + ' status off \\; attach-session -t ' + tmuxSessionName,
        {
          pty: {
            term: 'xterm-256color',
            cols: term.cols,
            rows: term.rows
          }
        },
        function (error, stream) {
          if (error) {
            writeLine('[terminal] Tmux attach failed: ' + error.message);
            writeLine('[terminal] Existing session was not found. No new session was created.');
            closeSshSession();
            return;
          }

          sshStream = stream;

          stream.on('data', function (chunk) {
            writeOutput(chunk.toString());
          });

          if (stream.stderr) {
            stream.stderr.on('data', function (chunk) {
              writeOutput(chunk.toString());
            });
          }

          stream.on('close', function () {
            writeLine('');
            writeLine('[terminal] SSH shell closed');
            closeSshSession();
          });

          writeLine('[terminal] Attached tmux session: ' + tmuxSessionName);
          scheduleAutoRun(stream);
        }
      );
    });

    sshClient.on('error', function (error) {
      writeLine('[terminal] SSH failed: ' + error.message);
      closeSshSession();
    });

    sshClient.on('close', function () {
      if (sshClient || sshStream) {
        writeLine('[terminal] Connection closed');
      }
      closeSshSession();
    });

    writeLine('[terminal] Connecting to ' + sshTarget);
    sshClient.connect({
      host: sshHost,
      port: 22,
      username: sshUsername,
      password: defaultPassword,
      tryKeyboard: false,
      readyTimeout: 15000
    });
  }

  window.addEventListener('resize', function () {
    scheduleFit();
  });

  if (hideTerminalBtn) {
    hideTerminalBtn.addEventListener('mousedown', function (event) {
      event.preventDefault();
    });
    hideTerminalBtn.addEventListener('click', function () {
      try { hideTerminalBtn.blur(); } catch (error) {}
      ipcRenderer.send('hide-ros-terminal-window', terminalId);
    });
  }

  if (closeTerminalBtn) {
    closeTerminalBtn.addEventListener('mousedown', function (event) {
      event.preventDefault();
    });
    closeTerminalBtn.addEventListener('click', function () {
      try { closeTerminalBtn.blur(); } catch (error) {}
      closeTerminalAndStopSession();
    });
  }

  window.addEventListener('beforeunload', function () {
    if (fitTimer) {
      clearTimeout(fitTimer);
    }
    if (fitFollowupTimer) {
      clearTimeout(fitFollowupTimer);
    }
    if (autoRunTimer) {
      clearTimeout(autoRunTimer);
      autoRunTimer = null;
    }
    closeSshSession();
  });

  setTerminalTitle(lastUserFacingTitle);
  scheduleFit();
  attachShell();
})();
