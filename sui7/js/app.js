// ES Module App Initialization
const API_URL = 'https://api.aftabkabir.me/api';
let trafficChartInstance = null;
let currentSettings = { animations: true };
let currentDataCache = null; // Store fetched data

// ================= ROUTING & STATE =================
async function loadView(path) {
    const appEl = document.getElementById('app');
    const token = localStorage.getItem('adminToken');
    
    if(!token && path !== 'login') {
        window.location.hash = '#/login';
        return;
    }

    if (path === 'login') {
        const layoutMode = document.querySelector('#routerView') !== null;
        if(layoutMode) {
            // Full reset
            window.location.reload();
            return;
        }
        const html = await fetch('views/login.html').then(r => r.text());
        appEl.innerHTML = html;
        bindLoginEvents();
        return;
    }

    // Authenticated State - Ensure layout exists
    let routerView = document.getElementById('routerView');
    if (!routerView) {
        const layoutHtml = await fetch('views/layout.html').then(r => r.text());
        appEl.innerHTML = layoutHtml;
        routerView = document.getElementById('routerView');
        bindLayoutEvents();
        updateNavActive(path);
        
        // Fetch core data once on initial load
        await refreshDashboardData();
    } else {
        updateNavActive(path);
    }

    // Load specific sub-view
    const viewPath = path === 'dashboard' ? 'overview' : path;
    const cleanPath = viewPath.replace('/', '');
    
    try {
        const html = await fetch(`views/${cleanPath}.html`).then(r => {
            if(!r.ok) throw new Error('View not found');
            return r.text();
        });
        routerView.innerHTML = html;
        updatePageHeaders(cleanPath);
        
        // Hydrate the view with cached data
        if(currentDataCache) {
            hydrateView(cleanPath, currentDataCache);
        }
    } catch(e) {
        routerView.innerHTML = `<div class="p-8 text-red-400">Error loading view: ${e.message}</div>`;
    }
}

// ================= AUTHENTICATION =================
function bindLoginEvents() {
    const form = document.getElementById('loginForm');
    if(!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        const errorDiv = document.getElementById('loginError');
        const errorMsg = document.getElementById('loginErrorMsg');
        
        errorDiv.classList.add('hidden');
        btn.innerHTML = '<div class="spinner border-white"></div>';
        btn.disabled = true;
        btn.classList.add('opacity-80', 'cursor-not-allowed');

        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                window.location.hash = '#/overview';
            } else {
                errorMsg.textContent = data.message || 'Invalid credentials.';
                errorDiv.classList.remove('hidden');
            }
        } catch(err) {
            errorMsg.textContent = 'Connection error establishing contact with gateway.';
            errorDiv.classList.remove('hidden');
        } finally {
            if(btn) {
                btn.innerHTML = '<span>Authenticating</span><i class="ph ph-arrow-right font-bold transition-transform group-hover:translate-x-1"></i>';
                btn.disabled = false;
                btn.classList.remove('opacity-80', 'cursor-not-allowed');
            }
        }
    });
}

function handleLogout(sessionExpired = false) {
    localStorage.removeItem('adminToken');
    window.location.hash = '#/login';
    setTimeout(() => {
        if(sessionExpired) {
            const errDiv = document.getElementById('loginError');
            if(errDiv) {
                document.getElementById('loginErrorMsg').textContent = 'Session expired. Please log in again.';
                errDiv.classList.remove('hidden');
            }
        }
    }, 100);
}

// ================= DATA FETCHING =================
async function refreshDashboardData() {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const rfBtn = document.getElementById('refreshBtn');
    if(rfBtn) rfBtn.classList.add('animate-spin', 'pointer-events-none');

    try {
        const res = await fetch(`${API_URL}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401 || res.status === 403) {
            handleLogout(true);
            return;
        }
        
        if(!res.ok) throw new Error('Failed to fetch telemetry');
        const data = await res.json();
        currentDataCache = data;
        
        // Re-hydrate the current active view
        const currentHash = window.location.hash.replace('#/', '') || 'overview';
        hydrateView(currentHash, data);

    } catch(e) {
        console.error("Gateway fetch failed:", e);
    } finally {
        if(rfBtn) {
            setTimeout(() => rfBtn.classList.remove('animate-spin', 'pointer-events-none'), 500);
        }
    }
}

// ================= HYDRATION & DOM =================
function hydrateView(viewName, data) {
    if(!data) return;

    if (viewName === 'overview') {
        const dates = Object.keys(data.analytics).sort();
        let uVisits = 0, tActions = 0;
        dates.forEach(d => {
            uVisits += (data.analytics[d].unique_ips ? data.analytics[d].unique_ips.length : (data.analytics[d].visits || 0));
            tActions += data.analytics[d].actions || 0;
        });
        
        const elV = document.getElementById('ovUniqueVisits');
        const elA = document.getElementById('ovActions');
        const elB = document.getElementById('ovBlocks');
        if(elV) elV.textContent = uVisits.toLocaleString();
        if(elA) elA.textContent = tActions.toLocaleString();
        if(elB) elB.textContent = (data.blockedIPs || []).length;
        
        renderMiniLogs(data.recentLogs || []);
    }
    
    if (viewName === 'site-analytics') {
        const dates = Object.keys(data.analytics).sort();
        renderChart(dates, data.analytics);
        
        // Fill Engagement Bar
        let uVisits = 0, tActions = 0;
        dates.forEach(d => {
            uVisits += (data.analytics[d].unique_ips ? data.analytics[d].unique_ips.length : (data.analytics[d].visits || 0));
            tActions += data.analytics[d].actions || 0;
        });
        const total = uVisits + tActions;
        const eBar = document.getElementById('engagementBar');
        const eTxt = document.getElementById('engagementText');
        if(eBar && total > 0) {
            const perc = Math.round((tActions / total) * 100);
            requestAnimationFrame(() => {
                eBar.style.width = perc + '%';
                eTxt.textContent = `${perc}% Action Density`;
            });
        }
    }

    if (viewName === 'user-analytics') {
        renderUserSessions(data.recentLogs || []);
    }

    if (viewName === 'control') {
        const toggle = document.getElementById('ctrlClosureToggle');
        if(toggle) {
            toggle.checked = data.siteClosureMode;
            updateClosureUI(data.siteClosureMode);
            
            toggle.onchange = async (e) => {
                const active = e.target.checked;
                updateClosureUI(active);
                try {
                    const token = localStorage.getItem('adminToken');
                    await fetch(`${API_URL}/admin/config`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ siteClosureMode: active })
                    });
                    currentDataCache.siteClosureMode = active;
                } catch(err) {
                    alert('Edge synchronization failed.');
                    toggle.checked = !active;
                    updateClosureUI(!active);
                }
            };
        }

        // Custom Notice Bindings
        const notice = data.customNotice || { wpb: {}, unb: {} };
        const el = id => document.getElementById(id);
        
        if (el('wpbToggle')) {
            el('wpbToggle').checked = notice.wpb?.enabled || false;
            el('wpbContent').value = notice.wpb?.content || '';
            el('wpbFontSize').value = notice.wpb?.fontSize || 'text-base';
            el('wpbFontWeight').value = notice.wpb?.fontWeight || 'font-normal';
            el('wpbIcon').value = notice.wpb?.icon || '';
            el('wpbAlign').value = notice.wpb?.align || 'text-center';

            el('wpbSaveBtn').onclick = () => saveNoticeConfig(data);
        }

        if (el('unbToggle')) {
            el('unbToggle').checked = notice.unb?.enabled || false;
            el('unbContent').value = notice.unb?.content || '';
            el('unbFontSize').value = notice.unb?.fontSize || 'text-sm';
            el('unbPosition').value = notice.unb?.position || 'fixed';
            el('unbPages').value = notice.unb?.pages || '*';
            el('unbMarquee').checked = notice.unb?.marquee || false;
            el('unbGlow').checked = notice.unb?.glow || false;

            el('unbSaveBtn').onclick = () => saveNoticeConfig(data);
        }
    }

    if (viewName === 'security') {
        renderBlocklistFull(data.blockedIPs || []);
        renderLogsFull(data.recentLogs || []);
        
        const sForm = document.getElementById('blockForm');
        if(sForm) {
            sForm.onsubmit = async (e) => {
                e.preventDefault();
                const ipInput = document.getElementById('secIpInput');
                await modifyBlocklistCall('block', ipInput.value.trim());
                ipInput.value = '';
            };
        }
    }

    if (viewName === 'settings') {
        const sAnim = document.getElementById('setAnimations');
        if(sAnim) {
            sAnim.checked = currentSettings.animations;
            sAnim.onchange = (e) => {
                currentSettings.animations = e.target.checked;
            }
        }
    }
}

// ================= RENDER COMPONENTS =================

function renderMiniLogs(logs) {
    const list = document.getElementById('ovLogs');
    if(!list) return;
    list.innerHTML = '';
    const slice = logs.slice(0, 5);
    if(slice.length === 0) {
        list.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No activity recorded yet.</div>';
    }
    slice.forEach(log => {
        const timeStr = new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        list.innerHTML += `
            <div class="flex items-center justify-between p-3 border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors rounded">
                <div class="flex items-center gap-3">
                    <span class="text-xs font-mono text-brand-400">${timeStr}</span>
                    <span class="text-sm text-gray-300 truncate max-w-[150px]">${log.path}</span>
                </div>
                <span class="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">${log.type}</span>
            </div>
        `;
    });
}

async function saveNoticeConfig(data) {
    const el = id => document.getElementById(id);
    const notice = {
        wpb: {
            enabled: el('wpbToggle').checked,
            content: el('wpbContent').value,
            fontSize: el('wpbFontSize').value,
            fontWeight: el('wpbFontWeight').value,
            icon: el('wpbIcon').value,
            align: el('wpbAlign').value
        },
        unb: {
            enabled: el('unbToggle').checked,
            content: el('unbContent').value,
            fontSize: el('unbFontSize').value,
            position: el('unbPosition').value,
            pages: el('unbPages').value,
            marquee: el('unbMarquee').checked,
            glow: el('unbGlow').checked
        }
    };
    
    try {
        const token = localStorage.getItem('adminToken');
        await fetch(`${API_URL}/admin/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ customNotice: notice })
        });
        data.customNotice = notice;
        currentDataCache.customNotice = notice;
        alert('Notice Configuration updated successfully across all edge nodes.');
    } catch(err) {
        alert('Edge synchronization failed for Custom Notice.');
    }
}

function renderLogsFull(logs) {
    const tbody = document.getElementById('secLogsTable');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-5 py-8 text-center text-gray-500">No activity recorded.</td></tr>';
        return;
    }
    
    // Aggregate by IP
    const ipMap = {};
    logs.forEach(l => {
        if(!ipMap[l.ip]) ipMap[l.ip] = { ip: l.ip, userAgent: l.userAgent || 'Unknown', count: 0, lastTime: l.time };
        ipMap[l.ip].count++;
        if(new Date(l.time) > new Date(ipMap[l.ip].lastTime)) ipMap[l.ip].lastTime = l.time;
    });

    const sortedIps = Object.values(ipMap).sort((a,b) => b.count - a.count);

    window.copyText = (text) => { navigator.clipboard.writeText(text); };

    sortedIps.forEach(obj => {
        tbody.innerHTML += `
            <tr class="hover:bg-white/[0.02] transition-colors group">
                <td class="px-5 py-3">
                    <div class="flex items-center gap-3">
                        <span class="font-mono text-sm text-purple-300 font-semibold">${obj.ip}</span>
                        <button onclick="copyText('${obj.ip}')" class="text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 w-6 h-6 rounded flex items-center justify-center transition-colors" title="Copy IP">
                            <i class="ph ph-copy"></i>
                        </button>
                    </div>
                </td>
                <td class="px-5 py-3">
                    <div class="text-xs text-gray-400 truncate max-w-[250px]" title="${obj.userAgent}">${obj.userAgent}</div>
                </td>
                <td class="px-5 py-3 text-right">
                    <span class="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-bold">${obj.count} requests</span>
                </td>
            </tr>
        `;
    });
}

function renderUserSessions(logs) {
    const tbody = document.getElementById('userSessionsTable');
    const uList = document.getElementById('userOriginList');
    if(!tbody || !uList) return;
    
    // Process unique IPs
    const ipMap = {};
    logs.forEach(l => {
        if(!ipMap[l.ip]) ipMap[l.ip] = { lastPath: l.path, time: l.time, type: l.type, count: 0 };
        ipMap[l.ip].count++;
    });
    
    const uniqueIps = Object.keys(ipMap).sort((a,b) => new Date(ipMap[b].time) - new Date(ipMap[a].time));
    
    tbody.innerHTML = '';
    uniqueIps.forEach(ip => {
        const obj = ipMap[ip];
        const timeStr = new Date(obj.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        tbody.innerHTML += `
            <tr class="hover:bg-white/[0.02] transition-colors">
                <td class="px-4 py-3 font-mono text-xs text-brand-300">${ip}</td>
                <td class="px-4 py-3 text-sm text-gray-300 truncate max-w-[150px]"><span class="text-gray-500 text-xs mr-2">${timeStr}</span> ${obj.lastPath}</td>
                <td class="px-4 py-3 text-right">
                    <span class="px-2 py-1 rounded bg-gray-800 text-gray-400 text-xs">${obj.count} events</span>
                </td>
            </tr>
        `;
    });
    
    if(uniqueIps.length === 0) tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-500">No session data.</td></tr>';

    // Origins
    uList.innerHTML = `
        <div class="flex justify-between items-center p-3 rounded-lg bg-gray-800/30 border border-gray-800">
            <span class="text-gray-400">Total Tracked IPs</span>
            <span class="text-xl font-bold text-white">${uniqueIps.length}</span>
        </div>
        <div class="text-xs text-gray-500 mt-4 leading-relaxed">
            Note: Advanced analytics maps individual packets to session origins. Telemetry resets functionally based on KV expiration policies.
        </div>
    `;
}

function renderBlocklistFull(ips) {
    const container = document.getElementById('secBlockedList');
    if(!container) return;
    container.innerHTML = '';
    if(ips.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm bg-gray-900/20 rounded-lg border border-dashed border-gray-700">No IPs currently blocked. System perimeter is secure.</div>';
        return;
    }
    ips.forEach(ip => {
        container.innerHTML += `
            <div class="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all group shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500"><i class="ph ph-shield-slash"></i></div>
                    <span class="font-mono text-sm text-red-200">${ip}</span>
                </div>
                <button data-ip="${ip}" class="btn-unblock text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded flex items-center justify-center transition-colors" title="Remove Blockline">
                    <i class="ph ph-x"></i>
                </button>
            </div>
        `;
    });

    document.querySelectorAll('.btn-unblock').forEach(btn => {
        btn.onclick = () => modifyBlocklistCall('unblock', btn.getAttribute('data-ip'));
    });
}

async function modifyBlocklistCall(action, ip) {
    if(!ip) return;
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_URL}/admin/ip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ip, action })
        });
        if(res.status === 401 || res.status === 403) { handleLogout(true); return; }
        const data = await res.json();
        
        if(data.success) {
            currentDataCache.blockedIPs = data.blockedIPs;
            renderBlocklistFull(data.blockedIPs);
        } else {
            alert(data.error || 'Operation denied by gateway.');
        }
    } catch(e) {
        alert('Transmission error.');
    }
}

function updateClosureUI(active) {
    const badge = document.getElementById('controlStatusBadge');
    const panel = document.getElementById('controlPanelWrapper');
    if(!badge || !panel) return;
    
    if(active) {
        badge.className = 'text-xs py-1.5 px-3 rounded-md bg-red-500/10 text-red-400 font-medium inline-flex items-center gap-1.5 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> SYSTEM LOCKED';
        panel.className = 'p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 bg-red-500/5 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.05)]';
    } else {
        badge.className = 'text-xs py-1.5 px-3 rounded-md bg-green-500/10 text-green-400 font-medium inline-flex items-center gap-1.5 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> Site is ONLINE';
        panel.className = 'p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 shadow-lg border-gray-800 bg-gray-900/30';
    }
}

function renderChart(dates, analyticsObj) {
    const canvas = document.getElementById('trafficChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    const labels = dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const visitsData = dates.map(d => analyticsObj[d].unique_ips ? analyticsObj[d].unique_ips.length : (analyticsObj[d].visits || 0));
    const actionsData = dates.map(d => analyticsObj[d].actions || 0);

    if (trafficChartInstance) trafficChartInstance.destroy();

    const gradientVisits = ctx.createLinearGradient(0, 0, 0, 400);
    gradientVisits.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradientVisits.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    trafficChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Unique Endpoints',
                    data: visitsData,
                    borderColor: '#3b82f6',
                    backgroundColor: gradientVisits,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#0b0f19',
                    pointBorderColor: '#3b82f6',
                    pointHoverBackgroundColor: '#3b82f6'
                },
                {
                    label: 'System Actions',
                    data: actionsData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointBackgroundColor: '#0b0f19',
                    pointBorderColor: '#8b5cf6',
                    pointHoverBackgroundColor: '#8b5cf6'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: currentSettings.animations ? undefined : false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#9ca3af', usePointStyle: true, boxWidth: 6 } },
                tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.95)', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10 }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#6b7280' } },
                y: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#6b7280', precision: 0 }, beginAtZero: true }
            }
        }
    });
}

// ================= UTILS & BINDINGS =================

function bindLayoutEvents() {
    document.getElementById('logoutBtn').addEventListener('click', () => handleLogout(false));
    document.getElementById('refreshBtn').addEventListener('click', refreshDashboardData);
}

function updateNavActive(path) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'border-brand-500/20', 'bg-brand-500/10', 'text-brand-500');
        link.classList.add('text-gray-400', 'border-transparent');
        if(link.getAttribute('href') === `#/${path}` || (path==='overview' && link.getAttribute('href')==='#/overview')) {
            link.classList.add('active', 'border-brand-500/20', 'bg-brand-500/10', 'text-brand-500');
            link.classList.remove('text-gray-400', 'border-transparent');
        }
    });
}

function updatePageHeaders(path) {
    const t = document.getElementById('pageTitle');
    const s = document.getElementById('pageSubtitle');
    if(!t || !s) return;
    
    switch(path) {
        case 'overview': t.textContent = 'Command Overview'; s.textContent = 'High-level surface telemetry.'; break;
        case 'user-analytics': t.textContent = 'User Analytics'; s.textContent = 'Deep dive into origin footprints.'; break;
        case 'site-analytics': t.textContent = 'Site Analytics'; s.textContent = 'Performance and density ratios.'; break;
        case 'control': t.textContent = 'Command & Control'; s.textContent = 'Global emergency switches.'; break;
        case 'security': t.textContent = 'Access Management'; s.textContent = 'Packet firewalls and event inspection.'; break;
        case 'settings': t.textContent = 'Dashboard Settings'; s.textContent = 'Local console interface preferences.'; break;
    }
}

// ================= BOOT =================
function router() {
    const hash = window.location.hash || '#/overview';
    const path = hash.replace('#/', '');
    loadView(path);
}

window.addEventListener('hashchange', router);
document.addEventListener('DOMContentLoaded', router);
