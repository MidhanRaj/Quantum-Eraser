// ─── State ────────────────────────────────────────────────────────────────────
let selectedPaths = [];
let lastScanResults = null; // cached scan results map: path → {risk, reason}
let currentPath = "";
let currentRoot = "";
let navigationStack = [];

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('pywebviewready', () => {
    // Check if wallet is already connected (e.g. backend persist)
    // Removed old unlockApp logic, will be handled by checkAuthStatus

    refreshDrives();
    refreshQRNGStatus();
    checkAuthStatus();

    // Listen for drive selection changes
    document.getElementById('drive-select').addEventListener('change', (e) => {
        if (e.target.value) {
            navigateTo(e.target.value);
        }
    });
});


// ─── Wallet & Blockchain ───────────────────────────────────────────────────────
function connectNewWallet() {
    window.pywebview.api.connect_wallet().then(res => {
        if (res.status === 'success') {
            onWalletConnected(res.address);
        }
    });
}

function connectActualMetaMask() {
    setStatus("🚀 Opening MetaMask bridge in your system browser...");
    window.pywebview.api.connect_metamask().then(res => {
        // Backend will call onWalletConnected once browser callback arrives
    });
}

function connectExistingWallet() {
    const key = document.getElementById('wallet-key').value;
    if (!key) return alert("Please enter a private key.");

    window.pywebview.api.connect_wallet(key).then(res => {
        if (res.status === 'success') {
            onWalletConnected(res.address);
        } else {
            alert("Error: " + res.message);
        }
    });
}

function checkAuthStatus(retries = 0) {
    if (!window.pywebview || !window.pywebview.api) {
        if (retries < 10) {
            console.log("API not ready, retrying auth check...");
            setTimeout(() => checkAuthStatus(retries + 1), 200);
        }
        return;
    }

    window.pywebview.api.get_auth_status().then(status => {
        if (status.is_logged_in) {
            unlockApp(status.auth_mode);
        } else {
            window.pywebview.api.check_first_run().then(isFirstRun => {
                // Determine which panel to show FIRST
                if (isFirstRun) {
                    document.getElementById('auth-state-first-run').style.display = 'block';
                    document.getElementById('auth-state-login').style.display = 'none';
                } else {
                    document.getElementById('auth-state-first-run').style.display = 'none';
                    document.getElementById('auth-state-login').style.display = 'block';
                }
                // Then show the overlay
                document.getElementById('auth-overlay').style.display = 'flex';
            });
        }
    }).catch(e => {
        console.error("Auth status error:", e);
        if (retries < 5) setTimeout(() => checkAuthStatus(retries + 1), 500);
    });
}

function createAccount() {
    const p1 = document.getElementById('create-password').value;
    const p2 = document.getElementById('confirm-password').value;
    if (!p1) return alert("Please enter a password.");
    if (p1 !== p2) return alert("Passwords do not match.");

    window.pywebview.api.create_account(p1).then(res => {
        if (res.status === 'success') {
            unlockApp('password');
            setStatus("✅ Account Created. Local logging enabled.");
        }
    });
}

function loginWithPassword() {
    const pass = document.getElementById('login-password').value;
    if (!pass) return alert("Please enter your password.");

    window.pywebview.api.login(pass).then(res => {
        if (res.status === 'success') {
            unlockApp('password');
            setStatus("✅ Logged in with password.");
        } else {
            alert(res.message);
        }
    });
}

function onWalletConnected(address) {
    unlockApp('wallet');
    const badge = document.getElementById('wallet-badge');
    badge.classList.add('connected');
    document.getElementById('wallet-addr').textContent = address.substring(0, 10) + "...";
    setStatus("✅ Wallet Connected: " + address);
}

function unlockApp(mode) {
    document.getElementById('auth-overlay').style.display = 'none';
    const logToggle = document.getElementById('local-log-toggle');
    if (mode === 'password') {
        logToggle.style.display = 'flex';
        toggleLocalLogging(); // Ensure backend is in sync with initial checkbox state
    } else {
        logToggle.style.display = 'none';
    }
}

function toggleLocalLogging() {
    const enabled = document.getElementById('store-locally').checked;
    window.pywebview.api.set_local_logging(enabled).then(() => {
        setStatus(enabled ? "📝 Local logging enabled." : "🚫 Local logging disabled.");
    });
}

function showBlockchainLedger() {
    // Phase 9 Requirement: Open the browser-based PQC audit bridge
    // The user will pay 0 Sepolia ETH via their extension to view logs
    setStatus("🚀 Opening Immutable Audit Ledger in your system browser...");
    window.pywebview.api.open_audit_page().catch(e => {
        setStatus('Access Error: ' + e, "error");
    });
}

function fetchBlockchainLogs() {
    const tbody = document.getElementById('blockchain-tbody');
    window.pywebview.api.get_blockchain_logs().then(logs => {
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No records found on-chain.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${escapeHtml(log.file)}</td>
                <td>${new Date(log.time).toLocaleString()}</td>
                <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--primary);">${escapeHtml(log.algo)}</td>
            </tr>
        `).join('');
    });
}

function pollBlockchainLogs() {
    // Simple poll mechanism for the bridge flow
    setTimeout(() => fetchBlockchainLogs(), 3000);
}

function showLocalLogs() {
    const modal = document.getElementById('blockchain-modal'); // Re-use modal structure
    modal.style.display = 'flex';
    const title = modal.querySelector('h2');
    title.innerText = "📜 PQC Encrypted Audit Logs (Local)";

    const tbody = document.getElementById('blockchain-tbody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Decrypting quantum-secure vault...</td></tr>';

    window.pywebview.api.retrieve_local_logs().then(logs => {
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No local records found or vault locked.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${escapeHtml(log.path)}</td>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--scan);">${escapeHtml(log.status)} (${log.algorithm})</td>
            </tr>
        `).join('');
    });
}

function closeBlockchainModal() {
    document.getElementById('blockchain-modal').style.display = 'none';
}

// ─── QRNG Status Badge ────────────────────────────────────────────────────────
function refreshQRNGStatus() {
    window.pywebview.api.get_qrng_status().then(source => {
        updateQRNGBadge(source);
    }).catch(() => updateQRNGBadge('os.urandom'));
}

function updateQRNGBadge(source) {
    const dot = document.getElementById('qbadge-dot');
    const label = document.getElementById('qbadge-label');
    if (source === 'ibm_quantum') {
        dot.className = 'qbadge-dot connected';
        label.textContent = '⚛ IBM Quantum Connected';
    } else {
        dot.className = 'qbadge-dot fallback';
        label.textContent = '🔁 Fallback: os.urandom';
    }
}

// ─── Drive + File Loading ─────────────────────────────────────────────────────
function refreshDrives() {
    const select = document.getElementById('drive-select');
    select.innerHTML = '<option>Loading...</option>';
    window.pywebview.api.list_drives().then(drives => {
        select.innerHTML = '';
        if (drives.length === 0) {
            select.innerHTML = '<option value="">No drives found</option>';
            return;
        }
        drives.forEach(drive => {
            const opt = document.createElement('option');
            opt.value = drive;
            opt.text = drive;
            select.appendChild(opt);
        });
        currentRoot = drives[0];
        // Only navigate if we're not already at a path
        if (!currentPath) {
            navigateTo(currentRoot);
        }
    });
}

function loadFiles() {
    const drive = document.getElementById('drive-select').value;
    if (drive) {
        navigateTo(drive);
    }
}

function selectAll() {
    const master = document.getElementById('select-all-cb');
    master.checked = !master.checked; // Toggle state for the "All" button
    toggleSelectAll();
}

function navigateTo(path) {
    currentPath = path;
    window.pywebview.api.list_files(path).then(files => {
        updateBreadcrumb(path);
        renderFileTable(files);
    });
}

function updateBreadcrumb(path) {
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    let html = `<span class="crumb" onclick="navigateTo('${currentRoot}')">🖥 Root</span>`;
    let built = '';
    parts.forEach((part, i) => {
        built += (i === 0 ? part + ':/' : '/' + part);
        const p = built;
        html += ` <span class="crumb-sep">›</span> <span class="crumb" onclick="navigateTo('${p}')">${part}</span>`;
    });
    document.getElementById('breadcrumb').innerHTML = html;
}

function renderFileTable(files) {
    const tbody = document.getElementById('file-tbody');
    if (!files || files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Empty folder</td></tr>';
        return;
    }

    // Sort: folders first, then files
    files.sort((a, b) => b.is_dir - a.is_dir || a.name.localeCompare(b.name));

    tbody.innerHTML = files.map(file => {
        const icon = file.is_dir ? '📁' : getFileIcon(file.name);
        const type = file.is_dir ? 'Folder' : getExtension(file.name);
        const size = file.is_dir ? '—' : formatSize(file.size || 0);
        const risk = file.risk || 'safe';
        const riskBadge = risk !== 'safe'
            ? `<span class="risk-pill ${risk}">${risk === 'high' ? '🔴 HIGH' : '🟡 MED'}</span>`
            : '<span class="risk-pill safe">✅ Safe</span>';
        const rowClick = file.is_dir
            ? `ondblclick="navigateTo('${file.path.replace(/\\/g, '\\\\')}')\" style="cursor:pointer;"`
            : '';

        return `<tr class="file-row ${risk !== 'safe' ? 'risk-row-' + risk : ''}" ${rowClick}>
            <td><input type="checkbox" value="${file.path}" class="file-cb"></td>
            <td class="name-cell" onclick="${!file.is_dir ? `openHexModal('${file.path.replace(/\\/g, '\\\\')}')` : ''}">
                ${icon} ${escapeHtml(file.name)}
                ${file.is_dir ? '<span class="hint">(double-click to open)</span>' : '<span class="hint">(click to inspect)</span>'}
            </td>
            <td>${type}</td>
            <td>${size}</td>
            <td>${riskBadge}</td>
        </tr>`;
    }).join('');
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = {
        pdf: '📕', xlsx: '📗', xls: '📗', doc: '📘', docx: '📘',
        zip: '🗜', rar: '🗜', '7z': '🗜', exe: '⚙️',
        db: '🗄', sqlite: '🗄', sql: '🗄',
        jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼',
        mp4: '🎬', mp3: '🎵', txt: '📝', log: '📋',
        py: '🐍', js: '📜', html: '🌐', css: '🎨',
        key: '🔑', pem: '🔑', ppk: '🔑',
    };
    return map[ext] || '📄';
}

function getExtension(name) {
    const parts = name.split('.');
    return parts.length > 1 ? '.' + parts.pop().toUpperCase() : 'File';
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function toggleSelectAll() {
    const master = document.getElementById('select-all-cb');
    document.querySelectorAll('.file-cb').forEach(cb => cb.checked = master.checked);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ⭐ UX ADDITION: Lock UI during critical operations (visual only)
function lockUI(state) {
    const card = document.querySelector('.card');
    if (!card) return;

    if (state) {
        card.classList.add('app-lock');
    } else {
        card.classList.remove('app-lock');
    }
}

// ─── Phase 4: Sensitive File Scanner ─────────────────────────────────────────
function scanSensitive() {
    const path = currentPath;
    if (!path) {
        alert('Please select a path first.');
        return;
    }

    setStatus('🔬 Scanning for sensitive files...', 'info');

    window.pywebview.api.scan_path(path).then(results => {
        renderFileTable(results);
        setStatus(`🔬 Scan Complete: ${results.length} items scanned.`, 'info');
    }).catch(e => {
        setStatus('Scan error: ' + e, 'error');
    });
}

// ─── Wipe ─────────────────────────────────────────────────────────────────────
let _wipePollInterval = null;

function _startWipePolling(total, algo) {
    if (_wipePollInterval) clearInterval(_wipePollInterval);

    _wipePollInterval = setInterval(() => {
        window.pywebview.api.get_wipe_progress().then(state => {
            if (state.running) {
                const cur = state.current_item || 0;
                const tot = state.total_items || total || 0;
                updateWipeProgress(state.percent, state.filename, cur, tot);
            } else if (state.result) {
                clearInterval(_wipePollInterval);
                _wipePollInterval = null;
                hideProgress();
                lockUI(false);
                finalizeWipe(state.result, algo);
            }
        }).catch(err => {
            console.error("Poll error:", err);
            clearInterval(_wipePollInterval);
        });
    }, 250);
}

function startWipe() {
    selectedPaths = [];
    document.querySelectorAll('.file-cb:checked').forEach(cb => {
        selectedPaths.push(cb.value);
    });
    if (selectedPaths.length === 0) {
        alert('Please select at least one file/folder.');
        return;
    }

    const algo = document.getElementById('algo').value;
    const verify = document.getElementById('verify').checked;

    if (!confirm(`⚠ WARNING: You are about to wipe ${selectedPaths.length} item(s).\n\nThis action is permanent and cannot be undone.\n\nProceed?`)) {
        return;
    }

    lockUI(true);
    showProgress(selectedPaths.length);
    setStatus(
        `🛡  Removing VSS Shadow Copies...\n` +
        `⚛  Running quantum-sourced wipe with [${algo}] on ${selectedPaths.length} item(s)...\n` +
        `Please wait...`
    );

    window.pywebview.api.wipe(selectedPaths, algo, verify).then(response => {
        if (!response) return;

        if (response.warning) {
            hideProgress();
            lockUI(false);
            const fileList = response.files.map(f => `• ${f.path}\n  ⚠ ${f.reason}`).join('\n');
            const proceed = confirm(`${response.message}\n\n${fileList}\n\nDo you still want to wipe?`);
            if (proceed) {
                setStatus('🔄 User confirmed risky files. Overriding AI Guard...');
                lockUI(true);
                showProgress(selectedPaths.length);
                window.pywebview.api.bypass_ai_and_wipe(selectedPaths, algo, verify).then(r => {
                    if (r && r.status === 'pending') {
                        _startWipePolling(selectedPaths.length, algo);
                    } else if (r) {
                        hideProgress(); lockUI(false); finalizeWipe(r, algo);
                    }
                });
            } else {
                setStatus('✅ Wipe cancelled by user after AI warning.');
            }
            return;
        }

        if (response.status === 'pending') {
            _startWipePolling(selectedPaths.length, algo);
        } else {
            hideProgress();
            lockUI(false);
            finalizeWipe(response, algo);
        }
    }).catch(e => { hideProgress(); setStatus('Wipe error: ' + e); lockUI(false); });
}

function finalizeWipe(response, algo) {
    if (typeof response === 'string') {
        setStatus(response);
        return;
    }
    if (response.error) {
        setStatus("❌ " + response.message);
        return;
    }

    let statusMsg = (response.message || "") + (response.vss ? ("\n" + response.vss) : "");
    if (response.drive_type === "SSD" || response.drive_type === "NVMe") {
        const se = response.ssd_erase;
        if (se && se.success) {
            const method = se.opal_supported ? "TCG Opal Cryptographic Erase ✅" :
                response.drive_type === "NVMe" ? "NVMe Secure Erase ✅" : "ATA Secure Erase ✅";
            statusMsg += `\n⚡ ${response.drive_type} detected — ${method} (bypasses wear leveling)`;
        } else if (se && !se.success) {
            statusMsg += `\n⚠ ${response.drive_type} detected — hardware erase unavailable (needs Admin). File-level overwrite + TRIM applied.`;
        } else {
            statusMsg += `\n🔁 ${response.drive_type} detected — TRIM pipeline applied.`;
        }
    }

    setStatus(statusMsg);
    refreshQRNGStatus();
    navigateTo(currentPath);

    if (response.blockchain_items && response.blockchain_items.length > 0) {
        statusMsg += `\n⛓ ${response.blockchain_items.length} unapproved blockchain transaction(s) pending.`;
    }

    if (response.report_path) {
        setStatus(statusMsg + "\n📄 Certificate Generated: " + response.report_path);
    }
}

// ─── MetaMask Blockchain Signing ───────────────────────────────────────────────
async function signBlockchainTransactions(txList, algo) {
    setStatus(`✍ Sending ${txList.length} wipe event(s) to MetaMask for blockchain audit...
Your browser will open — please approve each transaction.`);
    let signed = 0, failed = 0;
    for (let i = 0; i < txList.length; i++) {
        const tx = txList[i];
        try {
            setStatus(`✍ Signing transaction ${i + 1} of ${txList.length}...
Check your browser for the MetaMask popup.`);
            const result = await window.pywebview.api.sign_transaction(tx);
            if (result && result.status === 'pending') {
                await new Promise(resolve => setTimeout(resolve, 4000));
                signed++;
            } else { failed++; }
        } catch (err) {
            console.error(`TX ${i + 1} signing error:`, err);
            failed++;
        }
    }
    if (failed === 0) {
        setStatus(`✅ All ${signed} transaction(s) sent to blockchain.
🔗 Check the Blockchain Ledger to verify your audit trail.`);
    } else {
        setStatus(`⚠ Blockchain signing: ${signed} succeeded, ${failed} failed.`);
    }
}

function wipeSelectedDrive() {
    const drive = document.getElementById('drive-select').value;
    if (!drive) { alert('No drive selected.'); return; }

    if (drive.toLowerCase().includes('c:')) {
        if (!confirm(`⚠ CRITICAL: You are selecting the SYSTEM DRIVE (${drive})!\n\nWiping will crash/corrupt the OS.\n\nAre you absolutely sure?`)) return;
    }

    const userConf = prompt(`⚠ CRITICAL: You are about to wipe the ENTIRE DRIVE [${drive}].\n\nALL DATA WILL BE PERMANENTLY DESTROYED.\n\nType "CONFIRM" to proceed:`);
    if (userConf !== 'CONFIRM') {
        alert("Wipe cancelled. 'CONFIRM' was not typed correctly.");
        return;
    }

    const algo = document.getElementById('algo').value;
    const verify = document.getElementById('verify').checked;

    lockUI(true);
    showProgress(1);
    setStatus(`🛡  Purging VSS shadows...\n⚛  Starting quantum wipe of drive ${drive}...\nPlease wait...`);
    window.pywebview.api.wipe([drive], algo, verify).then(response => {
        if (response && response.status === 'pending') {
            _startWipePolling(1, algo);
        }
    }).catch(e => { hideProgress(); setStatus('Wipe error: ' + e); lockUI(false); });
}

// ─── Progress Bar Helpers ──────────────────────────────────────────────────────
function showProgress(total) {
    const container = document.getElementById('wipe-progress-container');
    container.style.display = 'block';
    document.getElementById('wipe-progress-bar').style.width = '0%';
    document.getElementById('progress-label').textContent = 'Initialising...';
    document.getElementById('progress-meta').textContent = `0% — 0 / ${total} files`;
}

function hideProgress() {
    // Brief flash at 100% before hiding
    document.getElementById('wipe-progress-bar').style.width = '100%';
    setTimeout(() => {
        document.getElementById('wipe-progress-container').style.display = 'none';
    }, 1200);
}

// Called by Python backend via evaluate_js
window.updateWipeProgress = function (percent, filename, currentItem, totalItems) {
    document.getElementById('wipe-progress-bar').style.width = percent.toFixed(1) + '%';
    document.getElementById('progress-label').textContent =
        `Wiping (${currentItem}/${totalItems}): ${filename}`;
    document.getElementById('progress-meta').textContent =
        `${percent.toFixed(0)}% — ${currentItem} / ${totalItems} files`;
};


// ─── Phase 3: Audit Log Info ──────────────────────────────────────────────────
function showAuditLogInfo() {
    window.pywebview.api.get_audit_log_path().then(info => {
        const cipher = info.cipher === 'kyber512'
            ? '🔐 CRYSTALS-Kyber512 (PQC)'
            : info.cipher === 'aes256gcm'
                ? '🔒 AES-256-GCM (fallback)'
                : '⚠ Plaintext (no crypto lib)';

        setStatus(
            `📋 PQC Audit Log\n` +
            `Path:   ${info.path}\n` +
            `Exists: ${info.exists ? 'Yes' : 'No (no wipes yet)'}\n` +
            `Size:   ${info.size} bytes\n` +
            `Cipher: ${cipher}`
        );
    }).catch(e => setStatus('Audit log error: ' + e));
}

function setStatus(msg) {
    document.getElementById('status').innerText = msg;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Phase 6: Hex/Data Inspector ──────────────────────────────────────────────
function openHexModal(path) {
    const modal = document.getElementById('hex-modal');
    const content = document.getElementById('hex-content');
    content.innerHTML = '<div class="loading-msg">Reading file data...</div>';
    modal.style.display = 'flex';

    window.pywebview.api.inspect_file(path).then(res => {
        if (!res.exists) {
            content.innerHTML = `<div style="color:var(--danger); padding:20px;">Error: ${res.error}</div>`;
            return;
        }

        content.innerHTML = `
            <div style="margin-bottom:15px; font-family:var(--font-mono); font-size:0.9rem; color:var(--text-muted);">
                Path: ${res.path}<br>
                Size: ${formatSize(res.size)} | Showing first ${res.preview_len} bytes
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div>
                    <div style="color:var(--primary); margin-bottom:8px; font-size:0.8rem; text-transform:uppercase;">Hex Dump</div>
                    <div style="font-family:var(--font-mono); background:#050510; padding:10px; border-radius:6px; font-size:0.85rem; line-height:1.6; word-break:break-all;">
                        ${res.hex}
                    </div>
                </div>
                <div>
                    <div style="color:var(--scan); margin-bottom:8px; font-size:0.8rem; text-transform:uppercase;">ASCII Preview</div>
                    <div style="font-family:var(--font-mono); background:#050510; padding:10px; border-radius:6px; font-size:0.85rem; line-height:1.6; white-space:pre-wrap; word-break:break-all;">
                        ${res.ascii}
                    </div>
                </div>
            </div>
        `;
    }).catch(e => {
        content.innerHTML = `<div style="color:var(--danger); padding:20px;">Inspector Error: ${e}</div>`;
    });
}

function closeHexModal() {
    document.getElementById('hex-modal').style.display = 'none';
}

// ⭐ UX ADDITION: Highlight selected rows (visual only)
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('file-cb')) {
        const row = e.target.closest('.file-row');
        if (row) {
            row.classList.toggle('selected', e.target.checked);
        }
    }
});
