// ─── State ────────────────────────────────────────────────────────────────────
let selectedPaths = [];
let lastScanResults = null; // cached scan results map: path → {risk, reason}
let currentPath = "";
let currentRoot = "";
let navigationStack = [];

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('pywebviewready', () => {
    refreshDrives();
    refreshQRNGStatus();
    checkAdminStatus();

    // Listen for drive selection changes
    document.getElementById('drive-select').addEventListener('change', (e) => {
        if (e.target.value) {
            navigateTo(e.target.value);
        }
    });
});

// ─── Admin Status ─────────────────────────────────────────────────────────────
function checkAdminStatus() {
    window.pywebview.api.check_admin().then(isAdmin => {
        const banner = document.getElementById('admin-warning');
        if (!isAdmin) {
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }
    }).catch(e => console.error("Admin check failed", e));
}

function relaunchAsAdmin() {
    window.pywebview.api.relaunch_as_admin();
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
        `🛡  Removing VSS Shadow Copies... (requires Admin)\n` +
        `⚛  Running quantum-sourced wipe with [${algo}] on ${selectedPaths.length} item(s)...\n` +
        `Please wait...`
    );

    window.pywebview.api.wipe(selectedPaths, algo, verify).then(response => {
        hideProgress();
        lockUI(false);

        // Handle AI warning response (object instead of string)
        if (response && typeof response === 'object' && response.warning) {
            const fileList = response.files.map(f => `• ${f.path}\n  ⚠ ${f.reason}`).join('\n');
            const proceed = confirm(
                `${response.message}\n\n${fileList}\n\nDo you still want to wipe these files?`
            );
            if (proceed) {
                // Force wipe by re-calling with only the risky files confirmed
                setStatus('🔄 Re-running wipe (user confirmed risky files)...');
                // We need a bypass mechanism. For now, just notify.
                setStatus(
                    `⚠ AI Guard blocked wipe of ${response.files.length} file(s).\n\n` +
                    `Files flagged:\n${fileList}\n\n` +
                    `To override, deselect those files and re-run.`
                );
            } else {
                setStatus('✅ Wipe cancelled by user after AI warning.');
            }
            return;
        }

        setStatus(response);
        refreshQRNGStatus();
        navigateTo(currentPath);
    }).catch(e => { hideProgress(); setStatus('Wipe error: ' + e); lockUI(false); });
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
        hideProgress();
        setStatus(response);
        refreshQRNGStatus();
        navigateTo(currentPath);
        lockUI(false);
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
