// ========================================
// Shared Feature Registry, Gate & Common Utilities
// EWU Course Portal - Main Website
// Wrapped in an IIFE and exposed on window so it can co-exist with the
// legacy page scripts (advise.js / department-courses.js) without clashing
// on top-level const declarations.
// ========================================

(function () {
    // Shared API base; legacy pages keep their own identical declaration.
    const API_BASE_URL = 'https://api.aftabkabir.me';

    /**
     * Feature metadata registry. The `key` must match the Worker's FEATURE_DEFAULTS keys.
     * `page` is the HTML file for the feature. `color` selects the card accent theme.
     */
    const FEATURES = {
        recommended: {
            key: 'recommended',
            name: 'Recommended Courses',
            page: 'advise.html',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><line x1="12" y1="6" x2="16" y2="6"></line><line x1="12" y1="10" x2="16" y2="10"></line></svg>',
            color: 'coral',
            active: true,
            description: 'Personalized course offerings from your advising routine with live seat availability.'
        },
        department: {
            key: 'department',
            name: 'Department-Wise Courses',
            page: 'department-courses.html',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
            color: 'blue',
            active: true,
            description: 'Search and filter course offerings across all academic departments and semesters.'
        },
        schedule: {
            key: 'schedule',
            name: 'Class Schedule',
            page: 'class-schedule.html',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
            color: 'cyan',
            active: true,
            description: 'Personalized weekly timetable grid with total registered credits.'
        },
        planner: {
            key: 'planner',
            name: 'Course Planner',
            page: 'course-planner.html',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
            color: 'violet',
            active: true,
            description: 'Build, compare and validate multiple course combinations before advising.'
        },
        ledger: {
            key: 'ledger',
            name: 'Account Ledger',
            page: 'account-ledger.html',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>',
            color: 'emerald',
            active: true,
            description: 'Track semester tuition balances, payments and scholarship adjustments.'
        },
        grades: {
            key: 'grades',
            name: 'Grade Report',
            page: 'grade-report.html',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
            color: 'amber',
            active: true,
            description: 'Comprehensive academic transcript with term-by-term GPA history.'
        },
        cgpa: {
            key: 'cgpa',
            name: 'CGPA Planner',
            page: 'cgpa-planner.html',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>',
            color: 'rose',
            active: true,
            description: 'Project target GPA and forecast required grades for graduation goals.'
        }
    };

    // Human-readable labels / styling for each feature status value
    const FEATURE_STATUS_META = {
        active:       { label: 'Active',       tone: 'emerald', usable: true  },
        beta:         { label: 'Beta',         tone: 'sky',     usable: true  },
        maintenance:  { label: 'Maintenance',  tone: 'amber',   usable: false },
        under_work:   { label: 'Under Work',   tone: 'amber',   usable: false },
        coming_soon:  { label: 'Coming Soon',  tone: 'violet',  usable: false },
        off:          { label: 'Disabled',     tone: 'gray',    usable: false }
    };

    const FEATURE_STATUS_CACHE_KEY = '_ewu_feature_status';
    const FEATURE_STATUS_TTL_MS = 45000;

    /**
     * Fetch feature statuses from the Worker with local caching + graceful fallback.
     * Always resolves to a status map keyed by feature key.
     */
    async function fetchFeatureStatuses(force = false) {
        const fallback = {};
        Object.keys(FEATURES).forEach(k => { fallback[k] = 'active'; });

        try {
            const cachedRaw = sessionStorage.getItem(FEATURE_STATUS_CACHE_KEY);
            const cachedTime = parseInt(sessionStorage.getItem(FEATURE_STATUS_CACHE_KEY + '_ts') || '0', 10);
            if (!force && cachedRaw && (Date.now() - cachedTime < FEATURE_STATUS_TTL_MS)) {
                return JSON.parse(cachedRaw);
            }
        } catch (e) {}

        let statuses = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/status`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.features && typeof data.features === 'object') {
                        statuses = { ...fallback, ...data.features };
                    }
                    break;
                }
            } catch (e) {
                if (attempt === 0) await new Promise(r => setTimeout(r, 500));
            }
        }

        if (!statuses) statuses = fallback;

        try {
            sessionStorage.setItem(FEATURE_STATUS_CACHE_KEY, JSON.stringify(statuses));
            sessionStorage.setItem(FEATURE_STATUS_CACHE_KEY + '_ts', Date.now().toString());
        } catch (e) {}

        return statuses;
    }

    /**
     * Gate the current page. Call on DOMContentLoaded of any gated feature page.
     * Renders a notice overlay if the feature is not usable.
     */
    async function gateFeaturePage(featureKey) {
        const statuses = await fetchFeatureStatuses(true);
        const status = statuses[featureKey] || 'active';
        const meta = FEATURE_STATUS_META[status] || FEATURE_STATUS_META.active;

        if (meta.usable) return { allowed: true, status };

        injectFeatureUnavailable(featureKey, status, meta);
        return { allowed: false, status };
    }

    function injectFeatureUnavailable(featureKey, status, meta) {
        const feature = FEATURES[featureKey] || { name: 'This feature' };
        const messages = {
            maintenance: 'This feature is temporarily under maintenance. Please check back shortly.',
            under_work: 'This feature is currently being developed and will be available soon.',
            coming_soon: 'This feature is coming soon. Stay tuned for updates.',
            off: 'This feature has been temporarily disabled by the administrator.'
        };

        const overlay = document.createElement('div');
        overlay.id = 'featureGateOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:#060609;padding:24px;';
        overlay.innerHTML = `
            <div class="glass-card" style="max-width:460px;width:100%;padding:36px 30px;text-align:center;">
                <div style="width:64px;height:64px;margin:0 auto 18px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:rgba(216,108,90,0.12);border:1px solid rgba(216,108,90,0.3);color:#D86C5A;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:3px 12px;border-radius:20px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#9ca3af;margin-bottom:14px;">${meta.label}</div>
                <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 10px;">${feature.name}</h2>
                <p style="font-size:14px;line-height:1.7;color:#9ca3af;margin:0 0 22px;">${messages[status] || messages.under_work}</p>
                <a href="dashboard.html" class="btn-card-action" style="display:inline-flex;width:auto;padding:12px 26px;text-decoration:none;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    <span>Back to Dashboard</span>
                </a>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    // ========================================
    // Common shared helpers
    // ========================================

    const DAY_ABBR_MAP = { 'A': 'Sat', 'S': 'Sun', 'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'R': 'Thu', 'F': 'Fri' };

    // Parse a raw portal time slot string into days + time range.
    function parsePortalSlot(timeSlotName) {
        if (!timeSlotName) return { day: '', time: '', days: [] };
        const raw = String(timeSlotName).trim();

        const timeMatch = raw.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*(?:-|to)\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
        let days = [];
        let time = '';

        if (timeMatch) {
            time = `${timeMatch[1].trim()} - ${timeMatch[2].trim()}`;
            const dayPart = raw.replace(timeMatch[0], '').replace(/[()]/g, '').trim();
            days = extractDays(dayPart);
        } else {
            const dayPart = raw.replace(/\d.*$/, '').trim();
            days = extractDays(dayPart);
            time = '';
        }

        const dayNames = days.map(d => DAY_ABBR_MAP[d] || d);
        return { day: dayNames.join(', '), time, days: dayNames };
    }

    function extractDays(dayPart) {
        const days = [];
        const tokens = String(dayPart || '').split(/[\s,+/&]+/).filter(Boolean);
        const wordMap = { SUN: 'S', SUNDAY: 'S', MON: 'M', MONDAY: 'M', TUE: 'T', TUESDAY: 'T', WED: 'W', WEDNESDAY: 'W', THU: 'R', THURSDAY: 'R', FRI: 'F', FRIDAY: 'F', SAT: 'A', SATURDAY: 'A' };
        for (const tok of tokens) {
            const up = tok.toUpperCase();
            if (wordMap[up]) {
                if (!days.includes(wordMap[up])) days.push(wordMap[up]);
            } else {
                for (const ch of up) {
                    if (DAY_ABBR_MAP[ch] && !days.includes(ch)) days.push(ch);
                }
            }
        }
        return days;
    }

    // Convert a 12h time string like "8:30AM" or "11:50 AM" to minutes from midnight.
    function timeToMinutes(t) {
        if (!t) return null;
        const clean = String(t).replace(/\s+/g, '').toUpperCase();
        const m = clean.match(/(\d{1,2}):(\d{2})(AM|PM)?/);
        if (!m) return null;
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        const mer = m[3];
        if (mer === 'PM' && h !== 12) h += 12;
        if (mer === 'AM' && h === 12) h = 0;
        return h * 60 + min;
    }

    // Pretty time from "8:30AM" -> "8:30 AM"
    function prettyTime(t) {
        if (!t) return '';
        const clean = String(t).replace(/\s+/g, '');
        const m = clean.match(/(\d{1,2}:\d{2})(AM|PM)?/i);
        if (!m) return String(t).toUpperCase();
        return m[2] ? `${m[1]} ${m[2].toUpperCase()}` : m[1];
    }

    // Trim redundant bracketed descriptions from a room name.
    function trimRoomName(room) {
        if (!room) return '';
        return String(room).replace(/\s*\([^)]*\)/g, '').trim() || 'TBA';
    }

    // Escape HTML to prevent injection when rendering portal data.
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Format numbers as BDT currency.
    function formatBDT(value) {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Small self-contained toast used across feature pages.
    function showFeatureToast(message, type = 'info') {
        let container = document.getElementById('ewuFeatureToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'ewuFeatureToastContainer';
            container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:100000;display:flex;flex-direction:column;gap:10px;max-width:340px;';
            document.body.appendChild(container);
        }
        const colors = {
            success: { b: 'rgba(16,185,129,0.4)', i: '#34d399' },
            error: { b: 'rgba(239,68,68,0.4)', i: '#f87171' },
            warning: { b: 'rgba(245,158,11,0.4)', i: '#fbbf24' },
            info: { b: 'rgba(90,143,216,0.4)', i: '#5a8fd8' }
        };
        const c = colors[type] || colors.info;
        const toast = document.createElement('div');
        toast.style.cssText = `background:rgba(15,15,22,0.95);backdrop-filter:blur(18px);border:1px solid ${c.b};border-left:3px solid ${c.i};border-radius:12px;padding:13px 16px;color:#f3f4f6;font-size:13px;box-shadow:0 12px 36px rgba(0,0,0,0.5);opacity:0;transform:translateX(40px);transition:all .3s cubic-bezier(0.4,0,0.2,1);`;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            setTimeout(() => toast.remove(), 320);
        }, 3200);
    }

    // Standard auth guard used on every feature page.
    async function requireAuth() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' });
            const data = await res.json();
            if (!data || !data.loggedIn) {
                window.location.href = 'login.html';
                return null;
            }
            const id = (data.userId && data.userId !== 'User') ? data.userId : (localStorage.getItem('studentId') || localStorage.getItem('ewu_student_id') || null);
            return { userId: id };
        } catch (e) {
            window.location.href = 'login.html';
            return null;
        }
    }

    async function performLogout(event) {
        if (event) event.preventDefault();
        try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) {}
        try {
            localStorage.removeItem('studentId');
            localStorage.removeItem('ewu_student_id');
            localStorage.removeItem('userId');
        } catch (e) {}
        window.location.href = 'login.html';
    }

    // Simple retrying JSON fetch for feature pages (auto retry on transient failures).
    async function fetchJsonWithRetry(url, options = {}, retries = 2) {
        let lastErr;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const res = await fetch(url, { credentials: 'include', ...options });
                if (res.status === 401) {
                    return { __unauthorized: true, response: res };
                }
                if (res.status >= 500 && attempt < retries) {
                    await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
                    continue;
                }
                if (!res.ok) throw new Error(`Request failed (${res.status})`);
                return { data: await res.json(), response: res };
            } catch (e) {
                lastErr = e;
                if (attempt < retries) await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
            }
        }
        throw lastErr;
    }

    // Emit an analytics event (fire-and-forget).
    function trackEvent(type, extra = {}) {
        try {
            fetch(`${API_BASE_URL}/api/analytics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, path: window.location.pathname, ...extra })
            }).catch(() => {});
        } catch (e) {}
    }

    // Expose everything on window for cross-script access
    window.API_BASE_URL = API_BASE_URL;
    window.FEATURES = FEATURES;
    window.FEATURE_STATUS_META = FEATURE_STATUS_META;
    window.fetchFeatureStatuses = fetchFeatureStatuses;
    window.gateFeaturePage = gateFeaturePage;
    window.parsePortalSlot = parsePortalSlot;
    window.timeToMinutes = timeToMinutes;
    window.prettyTime = prettyTime;
    window.trimRoomName = trimRoomName;
    window.escapeHtml = escapeHtml;
    window.formatBDT = formatBDT;
    window.showFeatureToast = showFeatureToast;
    window.requireAuth = requireAuth;
    window.performLogout = performLogout;
    window.fetchJsonWithRetry = fetchJsonWithRetry;
    window.trackEvent = trackEvent;
    window.handleLogout = performLogout;
})();