// ========================================
// Grade Report Page Logic
// Parses the portal grade-sheet HTML into a
// structured transcript with computed GPA/CGPA.
// ========================================

(function () {
    // EWU grade -> grade point mapping (official policy)
    const GRADE_POINTS = {
        'A+': 4.00, 'A': 3.75, 'A-': 3.50,
        'B+': 3.25, 'B': 3.00, 'B-': 2.75,
        'C+': 2.50, 'C': 2.25, 'D': 2.00, 'F': 0.00
    };
    const NON_GPA_GRADES = ['W', 'I', 'P', 'S', 'R', 'U', 'F*'];
    const COURSE_CODE_RE = /^[A-Z]{2,6}[\s-]?\d{3,4}[A-Z]?$/i;
    const GRADE_RE = /^(A\+|A-|A|B\+|B-|B|C\+|C|D|F\*?|W|I|P|S|R|U)$/i;

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        const gate = await gateFeaturePage('grades');
        if (!gate.allowed) return;
        const auth = await requireAuth();
        if (!auth) return;
        const uidEl = document.getElementById('userId');
        if (uidEl) uidEl.textContent = auth.userId || 'Student ID';

        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
            document.getElementById('mobileMenu')?.classList.toggle('hidden');
        });
        document.getElementById('refreshBtn')?.addEventListener('click', () => load( true));

        await load(false);
    }

    async function load(manual) {
        const content = document.getElementById('gradeContent');
        content.innerHTML = '<div class="fp-empty"><div class="fp-spinner"></div>Loading grade report…</div>';
        try {
            const result = await fetchJsonWithRetry(`${API_BASE_URL}/api/grades`);
            if (result.__unauthorized) { window.location.href = 'login.html'; return; }
            const data = result.data || {};
            if (data.status === 'error') throw new Error(data.message || 'Failed to load grade report');

            const parsed = parseGradeHtml(data.html || '');
            render(parsed, data.html || '');
            if (manual) showFeatureToast('Grade report refreshed', 'success');
        } catch (e) {
            content.innerHTML = `<div class="fp-empty">Failed to load grade report.<br><span class="text-gray-500">${escapeHtml(e.message || '')}</span></div>`;
            showFeatureToast(e.message || 'Failed to load grade report', 'error');
        }
    }

    // -----------------------------------------
    // HTML parsing
    // -----------------------------------------
    function parseGradeHtml(html) {
        const semesters = [];
        if (!html) return { semesters, raw: html };

        let doc;
        try {
            doc = new DOMParser().parseFromString(html, 'text/html');
        } catch (e) {
            return { semesters, raw: html };
        }

        const tables = doc.querySelectorAll('table');
        let currentSemester = null;

        tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = [...row.querySelectorAll('td, th')].map(c => clean(c.textContent));
                if (!cells.length) return;

                const joined = cells.join(' ');

                // Detect semester header rows (e.g. "Fall 2024" / "Semester: Spring-2025")
                const semMatch = joined.match(/(Spring|Summer|Fall|Winter)[\s-]*(\d{4})/i);
                const codeIdx = cells.findIndex(c => COURSE_CODE_RE.test(c.replace(/\s+/g, '')));

                if (semMatch && (codeIdx === -1 || cells.length <= 2)) {
                    currentSemester = { name: `${capitalize(semMatch[1])}-${semMatch[2]}`, courses: [], gpa: null, credits: 0 };
                    semesters.push(currentSemester);
                    return;
                }

                if (codeIdx === -1) return;

                const code = cells[codeIdx].replace(/\s+/g, '').toUpperCase();
                const title = cells[codeIdx + 1] && !isNumber(cells[codeIdx + 1]) && !GRADE_RE.test(cells[codeIdx + 1]) ? cells[codeIdx + 1] : '';

                // Find grade cell (exact grade token)
                let grade = '';
                let gradeIdx = -1;
                for (let i = codeIdx + 1; i < cells.length; i++) {
                    if (GRADE_RE.test(cells[i])) { grade = cells[i].toUpperCase(); gradeIdx = i; break; }
                }
                if (!grade) return;

                // Credit normally appears before the grade
                let credit = null;
                for (let i = codeIdx + 1; i < (gradeIdx === -1 ? cells.length : gradeIdx); i++) {
                    const n = parseFloat(cells[i]);
                    if (!isNaN(n) && n >= 0 && n <= 12 && !isNumberYear(cells[i])) { credit = n; break; }
                }

                if (!currentSemester) {
                    currentSemester = { name: 'Grade History', courses: [], gpa: null, credits: 0 };
                    semesters.push(currentSemester);
                }

                currentSemester.courses.push({
                    code, title, credit: credit != null ? credit : null, grade,
                    point: GRADE_POINTS[grade] !== undefined ? GRADE_POINTS[grade] : null
                });
            });
        });

        // Compute per-semester GPA and cumulative CGPA
        let totalPoints = 0, totalCredits = 0, totalCourses = 0;
        semesters.forEach(sem => {
            let pts = 0, credits = 0;
            sem.courses.forEach(c => {
                const isGpaGrade = GRADE_POINTS[c.grade] !== undefined;
                if (isGpaGrade && c.credit != null) {
                    pts += GRADE_POINTS[c.grade] * c.credit;
                    credits += c.credit;
                }
            });
            sem.gpa = credits > 0 ? pts / credits : null;
            sem.credits = credits;
            totalPoints += pts;
            totalCredits += credits;
            totalCourses += sem.courses.length;
        });

        return {
            semesters: semesters.filter(s => s.courses.length),
            cgpa: totalCredits > 0 ? totalPoints / totalCredits : null,
            totalCredits,
            totalCourses,
            raw: html
        };
    }

    function render(parsed, rawHtml) {
        const content = document.getElementById('gradeContent');

        document.getElementById('sumCgpa').textContent = parsed.cgpa != null ? parsed.cgpa.toFixed(2) : '—';
        document.getElementById('sumCredits').textContent = parsed.totalCredits ? parsed.totalCredits.toFixed(1) : '—';
        document.getElementById('sumCourses').textContent = parsed.totalCourses || '—';
        document.getElementById('sumSemesters').textContent = parsed.semesters.length || '0';

        if (!parsed.semesters.length) {
            content.innerHTML = `
                <div class="fp-empty" style="padding:40px 20px;">
                    <svg class="w-10 h-10 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <p class="text-gray-300 font-medium mb-1">Grade data could not be extracted</p>
                    <p class="text-gray-500 text-xs max-w-md mx-auto">The portal renders the grade sheet through an interactive report viewer that loads asynchronously. If your grades are not shown, open the original report below.</p>
                    <button onclick="openRawReport()" class="fp-btn fp-btn-ghost" style="margin-top:16px;">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        Open Original Report
                    </button>
                </div>`;
            window.__rawGradeHtml = rawHtml;
            return;
        }

        let html = '';
        // Cumulative banner
        if (parsed.cgpa != null) {
            html += `<div class="flex flex-wrap items-center gap-4 p-4 rounded-xl mb-5" style="background:rgba(90,143,216,0.08);border:1px solid rgba(90,143,216,0.2);">
                <div><div class="fp-stat-label">Computed CGPA</div><div style="font-size:28px;font-weight:800;color:#7fb0ea;">${parsed.cgpa.toFixed(2)}</div></div>
                <div style="border-left:1px solid rgba(255,255,255,0.1);padding-left:18px;">
                    <div class="fp-stat-label">Total Credits Attempted (GPA courses)</div>
                    <div class="text-white font-bold text-lg">${parsed.totalCredits.toFixed(1)}</div>
                </div>
            </div>`;
        }

        parsed.semesters.forEach(sem => {
            html += `<div class="mb-5">
                <div class="flex items-center justify-between mb-2">
                    <div class="fp-section-title"><svg class="w-4 h-4 text-[#D86C5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${escapeHtml(sem.name)}</div>
                    <div class="flex items-center gap-3 text-xs">
                        <span class="text-gray-400">Credits: <strong class="text-white">${sem.credits.toFixed(1)}</strong></span>
                        <span class="fp-status fp-status-sky">GPA: ${sem.gpa != null ? sem.gpa.toFixed(2) : '—'}</span>
                    </div>
                </div>
                <div class="fp-table-wrap fp-scroll" style="max-height:none;">
                    <table class="fp-table fp-transcript">
                        <thead><tr><th>Course</th><th>Title</th><th style="width:80px;text-align:center;">Credit</th><th style="width:90px;text-align:center;">Grade</th><th style="width:90px;text-align:center;">Point</th></tr></thead>
                        <tbody>
                            ${sem.courses.map(c => `
                                <tr>
                                    <td><span class="fp-badge fp-badge-code">${escapeHtml(c.code)}</span></td>
                                    <td class="text-gray-300">${escapeHtml(c.title || '—')}</td>
                                    <td class="text-center font-mono">${c.credit != null ? c.credit.toFixed(2) : '—'}</td>
                                    <td class="text-center"><span style="${gradeStyle(c.grade)}" class="fp-badge">${escapeHtml(c.grade)}</span></td>
                                    <td class="text-center font-mono">${c.point != null ? c.point.toFixed(2) : '—'}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        });

        html += `<div class="mt-3 flex justify-end">
            <button onclick="openRawReport()" class="fp-btn fp-btn-ghost" style="font-size:12px;">View Original Portal Report</button>
        </div>`;

        content.innerHTML = html;
        window.__rawGradeHtml = rawHtml;
    }

    function openRawReport() {
        const html = window.__rawGradeHtml;
        if (!html) { showFeatureToast('No raw report available', 'warning'); return; }
        const w = window.open('', '_blank');
        if (w) { w.document.open(); w.document.write(html); w.document.close(); }
    }

    function gradeStyle(grade) {
        const g = String(grade).toUpperCase();
        if (g === 'A+' || g === 'A' || g === 'A-') return 'background:rgba(16,185,129,0.12);border-color:rgba(16,185,129,0.3);color:#34d399;';
        if (g.startsWith('B')) return 'background:rgba(90,143,216,0.14);border-color:rgba(90,143,216,0.3);color:#7fb0ea;';
        if (g.startsWith('C')) return 'background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.3);color:#fbbf24;';
        if (g === 'D') return 'background:rgba(251,146,60,0.12);border-color:rgba(251,146,60,0.3);color:#fb923c;';
        if (g.startsWith('F')) return 'background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.3);color:#f87171;';
        return 'background:rgba(156,163,175,0.1);border-color:rgba(156,163,175,0.25);color:#9ca3af;';
    }

    // Helpers
    function clean(t) { return String(t || '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim(); }
    function isNumber(s) { return /^-?\d+(\.\d+)?$/.test(String(s).trim()); }
    function isNumberYear(s) { const n = String(s).trim(); return /^(19|20)\d{2}$/.test(n); }
    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

    window.openRawReport = openRawReport;
})();