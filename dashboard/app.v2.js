const API_BASE_URL = '/api';

// DOM Elements - Common
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// DOM Elements - Login
const loginScreen = document.getElementById('login-screen');
const dashboardMain = document.getElementById('dashboard-main');
const loginForm = document.getElementById('login-form');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');

// DOM Elements - Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// DOM Elements - Console
const terminalOutput = document.getElementById('terminal-output');
const commandForm = document.getElementById('command-form');
const commandInput = document.getElementById('command-input');

// DOM Elements - Mods
const dropzone = document.getElementById('mod-dropzone');
const fileInput = document.getElementById('mod-file-input');
const modsList = document.getElementById('mods-list');
const btnRefreshMods = document.getElementById('btn-refresh-mods');

// DOM Elements - Config
const configForm = document.getElementById('config-form');
const btnRefreshConfig = document.getElementById('btn-refresh-config');
const configStatus = document.getElementById('config-status');

// --- COMMON LOGIC ---

function showLoginScreen() {
    if(loginScreen) loginScreen.style.display = 'flex';
    if(dashboardMain) dashboardMain.style.display = 'none';
    sessionStorage.removeItem('admin_token');
}

function showDashboard() {
    if(loginScreen) loginScreen.style.display = 'none';
    if(dashboardMain) dashboardMain.style.display = 'flex';
}

if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const password = loginPassword.value;
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.success && data.token) {
                sessionStorage.setItem('admin_token', data.token);
                showDashboard();
                loginPassword.value = '';
                checkStatus();
            } else {
                loginError.textContent = data.error || 'Login failed';
            }
        } catch (err) {
            loginError.textContent = 'Connection error';
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch(e) {}
        showLoginScreen();
    });
}



async function apiFetch(endpoint, options = {}) {
    try {
        const fetchOptions = {
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const token = sessionStorage.getItem('admin_token');
        if (token) {
            fetchOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        if (!options.isFormData && !fetchOptions.headers['Content-Type']) {
            fetchOptions.headers['Content-Type'] = 'application/json';
        }
        
        if (options.body) {
            fetchOptions.body = options.isFormData ? options.body : JSON.stringify(options.body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
        const data = await response.json();
        
        if (response.status === 401) {
            showLoginScreen();
            throw new Error('Unauthorized');
        }
        
        if (!response.ok || (data.success !== undefined && !data.success)) {
            throw new Error(data.error || 'Unknown error occurred');
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

function updateStatus(status) {
    statusDot.className = 'dot';
    statusDot.classList.add(status);
    switch (status) {
        case 'online': statusText.textContent = 'Status: Online'; break;
        case 'offline': statusText.textContent = 'Status: Offline'; break;
        case 'checking': statusText.textContent = 'Status: Checking...'; break;
        default: statusText.textContent = 'Status: Unknown';
    }
}

async function checkStatus() {
    updateStatus('checking');
    try {
        await apiFetch('/server/command', { method: 'POST', body: { command: 'list' } });
        updateStatus('online');
    } catch (e) {
        updateStatus('offline');
    }
}

// --- TABS LOGIC ---

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`tab-${targetTab}`).classList.add('active');

        // Lazy load tab data
        if (targetTab === 'mods') fetchMods();
        if (targetTab === 'config') fetchConfig();
    });
});

// --- CONSOLE LOGIC ---

function appendLog(message, type = 'normal') {
    const logLine = document.createElement('div');
    logLine.className = `log-line ${type}`;
    logLine.textContent = message;
    terminalOutput.appendChild(logLine);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

document.getElementById('btn-start').addEventListener('click', async () => {
    appendLog('System: Issuing Start Server command...', 'system');
    updateStatus('checking');
    try {
        const res = await apiFetch('/server/start', { method: 'POST' });
        appendLog(`Success: ${res.message}`, 'system');
        setTimeout(() => updateStatus('online'), 2000);
    } catch (error) {
        appendLog(`Error: ${error.message}`, 'error');
        updateStatus('offline');
    }
});

document.getElementById('btn-stop').addEventListener('click', async () => {
    appendLog('System: Issuing Stop Server command...', 'system');
    try {
        const res = await apiFetch('/server/stop', { method: 'POST' });
        appendLog(`Success: ${res.message}`, 'system');
        if (res.response) appendLog(`Response: ${res.response}`);
        updateStatus('offline');
    } catch (error) {
        appendLog(`Error: ${error.message}`, 'error');
    }
});

document.getElementById('btn-restart').addEventListener('click', async () => {
    appendLog('System: Issuing Restart sequence...', 'system');
    updateStatus('checking');
    try {
        appendLog('System: Stopping server...', 'system');
        await apiFetch('/server/stop', { method: 'POST' });
        updateStatus('offline');
        
        appendLog('System: Waiting before start...', 'system');
        setTimeout(async () => {
            try {
                const res = await apiFetch('/server/start', { method: 'POST' });
                appendLog(`Success: ${res.message}`, 'system');
                updateStatus('online');
            } catch (startErr) {
                appendLog(`Error starting: ${startErr.message}`, 'error');
            }
        }, 3000);
    } catch (error) {
        appendLog(`Error during restart: ${error.message}`, 'error');
        updateStatus('offline');
    }
});

commandForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const command = commandInput.value.trim();
    if (!command) return;
    
    appendLog(`> ${command}`);
    commandInput.value = '';
    
    try {
        const res = await apiFetch('/server/command', { method: 'POST', body: { command } });
        if (res.response) {
            appendLog(res.response);
        } else if (res.message) {
            appendLog(res.message, 'system');
        }
    } catch (error) {
        appendLog(`Error: ${error.message}`, 'error');
    }
});

// --- MODS LOGIC ---

async function fetchMods() {
    modsList.innerHTML = '<div class="loading-text">Loading mods...</div>';
    try {
        // Fallback for mocked UI if backend isn't ready
        let mods = [];
        try {
            const res = await apiFetch('/mods');
            mods = res.mods || [];
        } catch(e) {
            console.warn("Backend /mods not ready, mocking for UI preview", e);
            mods = ['jei-1.20.1.jar', 'journeymap-1.20.1.jar'];
        }

        if (mods.length === 0) {
            modsList.innerHTML = '<div class="loading-text">No mods installed.</div>';
            return;
        }

        modsList.innerHTML = '';
        mods.forEach(mod => {
            const div = document.createElement('div');
            div.className = 'mod-item';
            div.innerHTML = `
                <span class="mod-name">${mod}</span>
                <button class="btn btn-sm btn-delete" data-mod="${mod}">Delete</button>
            `;
            modsList.appendChild(div);
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const modName = e.target.getAttribute('data-mod');
                if (confirm(`Are you sure you want to delete ${modName}?`)) {
                    await deleteMod(modName);
                }
            });
        });
    } catch (error) {
        modsList.innerHTML = `<div class="loading-text" style="color: var(--danger)">Error: ${error.message}</div>`;
    }
}

async function deleteMod(modName) {
    try {
        await apiFetch(`/mods/${encodeURIComponent(modName)}`, { method: 'DELETE' });
        fetchMods(); // refresh list
    } catch(error) {
        alert(`Failed to delete ${modName}: ${error.message}`);
        fetchMods(); // refresh list to simulate UI preview if backend isn't ready
    }
}

btnRefreshMods.addEventListener('click', fetchMods);

// Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults (e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
});

dropzone.addEventListener('drop', handleDrop, false);
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', function() { handleFiles(this.files); });

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    handleFiles(files);
}

async function handleFiles(files) {
    if (files.length === 0) return;
    
    // Process only jar files
    const validFiles = Array.from(files).filter(file => file.name.endsWith('.jar'));
    
    if (validFiles.length === 0) {
        alert("Only .jar files are allowed!");
        return;
    }

    const formData = new FormData();
    validFiles.forEach(file => {
        formData.append('mod', file);
    });

    dropzone.querySelector('.dropzone-text').textContent = "Uploading...";
    
    try {
        await apiFetch('/mods', { 
            method: 'POST', 
            body: formData,
            isFormData: true 
        });
        dropzone.querySelector('.dropzone-text').textContent = "Upload successful!";
        setTimeout(() => {
            dropzone.querySelector('.dropzone-text').textContent = "Drag & Drop .jar files here to upload";
        }, 3000);
        fetchMods();
    } catch(error) {
        alert(`Upload failed: ${error.message}`);
        dropzone.querySelector('.dropzone-text').textContent = "Drag & Drop .jar files here to upload";
    }
}

// --- CONFIG LOGIC ---

function showConfigStatus(message, isError = false) {
    configStatus.textContent = message;
    configStatus.className = `config-status ${isError ? 'error' : 'success'}`;
    setTimeout(() => { configStatus.textContent = ''; }, 4000);
}

async function fetchConfig() {
    try {
        let config = {};
        try {
            const res = await apiFetch('/config');
            config = res.properties || {};
        } catch(e) {
            console.warn("Backend /properties not ready, mocking for UI preview", e);
            config = { motd: "A Minecraft Server", difficulty: "normal", "max-players": 20, gamemode: "survival", "view-distance": 10, pvp: true, "white-list": false };
        }

        if (config.motd !== undefined) document.getElementById('prop-motd').value = config.motd;
        if (config.difficulty !== undefined) document.getElementById('prop-difficulty').value = config.difficulty;
        if (config["max-players"] !== undefined) document.getElementById('prop-max-players').value = config["max-players"];
        if (config.gamemode !== undefined) document.getElementById('prop-gamemode').value = config.gamemode;
        if (config["view-distance"] !== undefined) document.getElementById('prop-view-distance').value = config["view-distance"];
        
        // Handle booleans for checkboxes
        if (config.pvp !== undefined) document.getElementById('prop-pvp').checked = String(config.pvp) === 'true' || config.pvp === true;
        if (config["white-list"] !== undefined) document.getElementById('prop-whitelist').checked = String(config["white-list"]) === 'true' || config["white-list"] === true;
    } catch (error) {
        showConfigStatus(`Error loading config: ${error.message}`, true);
    }
}

btnRefreshConfig.addEventListener('click', fetchConfig);

configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const configData = {
        motd: document.getElementById('prop-motd').value,
        difficulty: document.getElementById('prop-difficulty').value,
        "max-players": document.getElementById('prop-max-players').value,
        gamemode: document.getElementById('prop-gamemode').value,
        "view-distance": document.getElementById('prop-view-distance').value,
        pvp: document.getElementById('prop-pvp').checked,
        "white-list": document.getElementById('prop-whitelist').checked
    };

    try {
        await apiFetch('/config', {
            method: 'POST', // Or PUT, based on your API design
            body: configData
        });
        showConfigStatus('Settings saved successfully!');
    } catch(error) {
        showConfigStatus(`Failed to save: ${error.message}`, true);
    }
});

// --- WHITELIST LOGIC ---
const whitelistUsername = document.getElementById('whitelist-username');
const btnWhitelistAdd = document.getElementById('btn-whitelist-add');
const btnWhitelistRemove = document.getElementById('btn-whitelist-remove');

async function handleWhitelistAction(action) {
    const username = whitelistUsername.value.trim();
    if (!username) {
        showConfigStatus('Please enter a username.', true);
        return;
    }
    
    try {
        const res = await apiFetch('/server/whitelist', {
            method: 'POST',
            body: { action, username }
        });
        showConfigStatus(`Successfully ${action === 'add' ? 'added' : 'removed'} ${username}.`);
        whitelistUsername.value = ''; // clear input
        if (res.message) appendLog(`System: ${res.message}`, 'system');
    } catch (error) {
        showConfigStatus(`Failed to ${action}: ${error.message}`, true);
    }
}

if (btnWhitelistAdd) btnWhitelistAdd.addEventListener('click', () => handleWhitelistAction('add'));
if (btnWhitelistRemove) btnWhitelistRemove.addEventListener('click', () => handleWhitelistAction('remove'));

// --- WORLD RESTART LOGIC ---
const btnRestartWorld = document.getElementById('btn-restart-world');
const modalConfirmWorldRestart = document.getElementById('modal-confirm-world-restart');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');

if (btnRestartWorld) {
    btnRestartWorld.addEventListener('click', () => {
        modalConfirmWorldRestart.classList.remove('hidden');
    });
}

if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
        modalConfirmWorldRestart.classList.add('hidden');
    });
}

if (modalConfirmBtn) {
    modalConfirmBtn.addEventListener('click', async () => {
        modalConfirmWorldRestart.classList.add('hidden');
        showConfigStatus('Wiping world and resetting server... Please wait.', false);
        btnRestartWorld.disabled = true;
        btnRestartWorld.textContent = 'Wiping World...';

        try {
            const res = await apiFetch('/server/world-restart', { method: 'POST' });
            showConfigStatus(res.message || 'World has been successfully wiped!');
            updateStatus('offline');
            appendLog(`System: ${res.message || 'World wiped successfully.'}`, 'system');
        } catch (error) {
            showConfigStatus(`World restart failed: ${error.message}`, true);
            appendLog(`Error: Failed to wipe world - ${error.message}`, 'error');
        } finally {
            btnRestartWorld.disabled = false;
            btnRestartWorld.textContent = 'Restart World';
        }
    });
}

// Init
async function init() {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
        try {
            await apiFetch('/auth/verify', { method: 'POST' });
            showDashboard();
            checkStatus();
            setInterval(checkStatus, 30000);
            return;
        } catch(e) {
            // will auto-trigger showLoginScreen inside apiFetch if 401
        }
    }
    showLoginScreen();
}
init();
