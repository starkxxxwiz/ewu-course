// ========================================
// Student Dashboard Logic
// Handles session verification, dynamic feature rendering (driven by
// admin-controlled feature statuses), student ID display, and navigation.
// Depends on assets/js/features.js (FEATURES registry + API_BASE_URL).
// ========================================

// Retrieve student ID from local/session storage
function getStoredStudentId() {
    try {
        const id = localStorage.getItem('studentId')
            || localStorage.getItem('ewu_student_id')
            || sessionStorage.getItem('studentId')
            || localStorage.getItem('userId');
        if (id && id !== 'User' && id !== 'Student') {
            return id;
        }
    } catch (e) {
        console.warn('Storage read error:', e);
    }
    return null;
}

// Update student ID in UI badges
function updateStudentIdDisplay(id) {
    const studentId = id || getStoredStudentId() || 'Student ID';
    const userBadge = document.getElementById('userId');
    const userBadgeMobile = document.getElementById('userIdMobile');

    if (userBadge) userBadge.textContent = studentId;
    if (userBadgeMobile) userBadgeMobile.textContent = studentId;
}

// Check authentication state on page load
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' });
        const data = await response.json();
        if (!data || !data.loggedIn) {
            window.location.href = 'login.html';
            return false;
        }
        if (data.userId && data.userId !== 'User' && data.userId !== 'Student') {
            try { localStorage.setItem('studentId', data.userId); } catch (e) {}
            updateStudentIdDisplay(data.userId);
        } else {
            updateStudentIdDisplay(getStoredStudentId() || 'Student ID');
        }
        return true;
    } catch (error) {
        console.warn('Auth status check failed, redirecting to login:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Handle user logout
async function handleLogout(event) {
    if (event) event.preventDefault();
    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    try {
        localStorage.removeItem('studentId');
        localStorage.removeItem('ewu_student_id');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('studentId');
    } catch (e) {}
    window.location.href = 'login.html';
}
window.handleLogout = handleLogout;

// ========================================
// Dynamic feature rendering
// ========================================
const CARD_THEME = {
    coral:   { accent: '#D86C5A', bg: 'linear-gradient(135deg, rgba(216,108,90,0.2) 0%, rgba(216,108,90,0.05) 100%)', border: 'rgba(216,108,90,0.35)', btn: 'linear-gradient(135deg,#D86C5A,#c5584a)', glow: 'rgba(216,108,90,0.35)' },
    blue:    { accent: '#5a8fd8', bg: 'linear-gradient(135deg, rgba(90,143,216,0.2) 0%, rgba(90,143,216,0.05) 100%)', border: 'rgba(90,143,216,0.35)', btn: 'linear-gradient(135deg,#5a8fd8,#4075c0)', glow: 'rgba(90,143,216,0.35)' },
    cyan:    { accent: '#06b6d4', bg: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0.05) 100%)', border: 'rgba(6,182,212,0.35)', btn: 'linear-gradient(135deg,#06b6d4,#0891b2)', glow: 'rgba(6,182,212,0.35)' },
    violet:  { accent: '#8b5cf6', bg: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.05) 100%)', border: 'rgba(139,92,246,0.35)', btn: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', glow: 'rgba(139,92,246,0.35)' },
    emerald: { accent: '#10b981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)', border: 'rgba(16,185,129,0.35)', btn: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.35)' },
    amber:   { accent: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)', border: 'rgba(245,158,11,0.35)', btn: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.35)' },
    rose:    { accent: '#f43f5e', bg: 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(244,63,94,0.05) 100%)', border: 'rgba(244,63,94,0.35)', btn: 'linear-gradient(135deg,#f43f5e,#e11d48)', glow: 'rgba(244,63,94,0.35)' }
};

const STATUS_PILL = {
    active:      { label: 'Active',      cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', dot: 'bg-emerald-400' },
    beta:        { label: 'Beta',        cls: 'bg-sky-500/15 border-sky-500/30 text-sky-300', dot: 'bg-sky-400' },
    maintenance: { label: 'Maintenance', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
    under_work:  { label: 'Under Work',  cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
    coming_soon: { label: 'Coming Soon', cls: 'bg-violet-500/15 border-violet-500/30 text-violet-300', dot: 'bg-violet-400' },
    off:         { label: 'Disabled',    cls: 'bg-gray-500/15 border-gray-500/30 text-gray-300', dot: 'bg-gray-400' }
};

// Feature display order + lightweight dashboard copy
const DASHBOARD_FEATURES = [
    'recommended', 'department', 'schedule', 'planner', 'ledger', 'grades', 'cgpa'
];

function renderFeatureCards(statuses) {
    const activeGrid = document.getElementById('activeGrid');
    const comingGrid = document.getElementById('comingGrid');
    const activeSection = document.getElementById('activeSection');
    const comingSection = document.getElementById('comingSection');
    if (!activeGrid || !comingGrid) return;

    const activeKeys = [];
    const unavailableKeys = [];

    DASHBOARD_FEATURES.forEach(key => {
        const status = statuses[key] || 'active';
        const meta = FEATURE_STATUS_META[status] || FEATURE_STATUS_META.active;
        if (meta.usable) activeKeys.push({ key, status });
        else unavailableKeys.push({ key, status });
    });

    // Active / usable features
    activeGrid.innerHTML = activeKeys.map(({ key, status }) => activeCardHtml(key, status)).join('') ||
        '<div class="glass-card p-8 text-center text-gray-400 text-sm" style="grid-column:1/-1;">No features are currently available. Please check back later.</div>';

    const activeCount = document.getElementById('activeCount');
    if (activeCount) activeCount.textContent = `${activeKeys.length} Available`;

    // Unavailable features
    if (unavailableKeys.length) {
        comingSection.classList.remove('hidden');
        comingGrid.innerHTML = unavailableKeys.map(({ key, status }) => lockedCardHtml(key, status)).join('');
        const comingCount = document.getElementById('comingCount');
        if (comingCount) comingCount.textContent = `${unavailableKeys.length} Unavailable`;
    } else {
        comingSection.classList.add('hidden');
    }
}

function activeCardHtml(key, status) {
    const f = FEATURES[key];
    const theme = CARD_THEME[f.color] || CARD_THEME.coral;
    const pill = STATUS_PILL[status] || STATUS_PILL.active;
    const isBeta = status === 'beta';

    return `
        <div class="fade-in" style="position:relative;background:linear-gradient(145deg, rgba(22,22,32,0.75) 0%, rgba(14,14,20,0.85) 100%);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid ${theme.border};border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.4);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${theme.btn};"></div>
            <div class="p-6 sm:p-7">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div style="width:52px;height:52px;border-radius:14px;background:${theme.bg};border:1px solid ${theme.border};display:flex;align-items:center;justify-content:center;color:${theme.accent};">
                        ${f.icon}
                    </div>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${pill.cls}">
                        <span class="w-1.5 h-1.5 rounded-full ${pill.dot}"></span>
                        ${pill.label}
                    </span>
                </div>
                <h3 class="text-lg sm:text-xl font-bold text-white mb-2">${escapeHtml(f.name)}</h3>
                <p class="text-gray-300 text-xs sm:text-sm leading-relaxed mb-6">${escapeHtml(f.description)}</p>
            </div>
            <div class="px-6 sm:px-7 pb-6 sm:pb-7 pt-0">
                <a href="${f.page}" class="no-underline" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px 20px;font-size:0.925rem;font-weight:600;border-radius:12px;background:${theme.btn};color:#fff;box-shadow:0 4px 18px ${theme.glow};">
                    <span>${isBeta ? 'Open (Beta)' : 'Open'}</span>
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </a>
            </div>
        </div>`;
}

function lockedCardHtml(key, status) {
    const f = FEATURES[key];
    const pill = STATUS_PILL[status] || STATUS_PILL.coming_soon;
    return `
        <div style="position:relative;background:linear-gradient(145deg, rgba(16,16,24,0.5) 0%, rgba(10,10,16,0.65) 100%);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:18px;display:flex;flex-direction:column;justify-content:space-between;min-height:190px;overflow:hidden;">
            <div class="p-5 sm:p-6">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div style="width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.45);">
                        ${f.icon}
                    </div>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${pill.cls}">
                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        ${pill.label}
                    </span>
                </div>
                <h3 class="text-base font-bold text-gray-200 mb-1.5">${escapeHtml(f.name)}</h3>
                <p class="text-gray-400 text-xs leading-relaxed">${escapeHtml(f.description)}</p>
            </div>
            <div class="mt-2 px-5 sm:px-6 pb-5 sm:pb-6 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full ${pill.dot}"></span>
                    ${pill.label}
                </span>
            </div>
        </div>`;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    const yearEl = document.getElementById('dynamicYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    updateStudentIdDisplay();

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    }

    // Verify authentication first
    const authed = await checkAuth();
    if (!authed) return;

    // Render features based on admin-controlled statuses
    try {
        const statuses = await fetchFeatureStatuses();
        renderFeatureCards(statuses);
    } catch (e) {
        renderFeatureCards({});
    }
});