// ========================================
// Class Schedule Page Logic
// ========================================

(function () {
    let currentUserId = null;
    let currentSemesterId = '';
    let currentSemesterName = '';
    let semesterMeta = null;
    let rawCourses = [];
    let routineCourses = []; // sorted course columns for the generated routine

    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const DOW_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const DOW_FULL = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
    const LOGO_URL = 'assets/images/ewu.png';

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        const gate = await gateFeaturePage('schedule');
        if (!gate.allowed) return;

        const auth = await requireAuth();
        if (!auth) return;
        currentUserId = auth.userId || 'Student';
        const uidEl = document.getElementById('userId');
        if (uidEl) uidEl.textContent = currentUserId;

        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
            document.getElementById('mobileMenu')?.classList.toggle('hidden');
        });
        document.getElementById('refreshBtn')?.addEventListener('click', () => loadSchedule(true));
        document.getElementById('semesterSelect')?.addEventListener('change', onSemesterChange);
        document.getElementById('hideDropped')?.addEventListener('change', renderTable);
        document.getElementById('routineModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'routineModal') closeRoutine();
        });

        await loadSemesters();
    }

    async function loadSemesters() {
        const select = document.getElementById('semesterSelect');
        try {
            const result = await fetchJsonWithRetry(`${API_BASE_URL}/api/schedule/semesters`);
            if (result.__unauthorized) { window.location.href = 'login.html'; return; }
            const semesters = (result.data && result.data.semesters) || [];
            if (!semesters.length) {
                select.innerHTML = '<option value="">No semesters available</option>';
                renderEmpty('No semesters were returned by the portal.');
                return;
            }

            // Auto-detect current semester by date range
            const now = Date.now();
            let current = null;
            for (const s of semesters) {
                const start = s.StartingDate ? new Date(s.StartingDate).getTime() : null;
                const end = s.EndingDate ? new Date(s.EndingDate).getTime() : null;
                if (start && end && now >= start && now <= end) { current = s; break; }
            }
            if (!current) {
                // Fallback: nearest upcoming, else newest listed
                current = semesters.find(s => s.StartingDate && new Date(s.StartingDate).getTime() > now) || semesters[0];
            }

            select.innerHTML = semesters.map(s =>
                `<option value="${escapeHtml(String(s.SemesterId))}">${escapeHtml(s.SemesterName)}</option>`
            ).join('');

            currentSemesterId = String(current.SemesterId);
            semesterMeta = current;
            select.value = currentSemesterId;
            currentSemesterName = current.SemesterName;

            await loadSchedule(false);
        } catch (e) {
            select.innerHTML = '<option value="">Failed to load</option>';
            renderEmpty('Could not load semesters. Please retry.');
            showFeatureToast('Failed to load semesters', 'error');
        }
    }

    function onSemesterChange(e) {
        currentSemesterId = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        currentSemesterName = opt ? opt.textContent : '';
        semesterMeta = null;
        loadSchedule(false);
    }

    async function loadSchedule(manual) {
        const tbody = document.getElementById('scheduleBody');
        tbody.innerHTML = '<tr><td colspan="8"><div class="fp-empty"><div class="fp-spinner"></div>Loading class schedule…</div></td></tr>';

        try {
            const result = await fetchJsonWithRetry(`${API_BASE_URL}/api/schedule?semesterId=${encodeURIComponent(currentSemesterId)}`);
            if (result.__unauthorized) { window.location.href = 'login.html'; return; }
            const data = result.data || {};
            if (data.status === 'error') throw new Error(data.message || 'Failed to load schedule');

            rawCourses = data.courses || [];
            computeSummary();
            renderTable();
            if (manual) showFeatureToast('Schedule refreshed', 'success');
        } catch (e) {
            renderEmpty('Failed to load class schedule. Please try again.');
            showFeatureToast(e.message || 'Failed to load schedule', 'error');
        }
    }

    // -------- Summary (deduped course + credit) --------
    function isDropped(c) {
        const yes = v => v === 'Yes' || v === true || v === 1 || v === '1' || v === 'True';
        return yes(c.DropStatus) || yes(c.WithDrawStatus) || yes(c.IsDrop) || yes(c.IsWithdraw);
    }

    function baseCode(code) {
        return String(code || '').replace(/\s*lab\b/gi, '').trim();
    }

    function computeSummary() {
        const map = new Map();
        let slots = 0;
        for (const c of rawCourses) {
            const key = `${baseCode(c.CourseCode)}_${c.SectionName}`;
            if (!map.has(key)) {
                map.set(key, { credit: 0, dropped: false });
            }
            const entry = map.get(key);
            entry.credit = Math.max(entry.credit, Number(c.CreditHour) || 0);
            if (isDropped(c)) entry.dropped = true;
            slots++;
        }
        let registeredCourses = 0, registeredCredits = 0, droppedCount = 0;
        for (const entry of map.values()) {
            if (entry.dropped) { droppedCount++; continue; }
            registeredCourses++;
            registeredCredits += entry.credit;
        }
        document.getElementById('statCourses').textContent = registeredCourses;
        document.getElementById('statCredits').textContent = registeredCredits.toFixed(2);
        document.getElementById('statSlots').textContent = slots;
        document.getElementById('statDropped').textContent = droppedCount;
    }

    function renderEmpty(message) {
        document.getElementById('scheduleBody').innerHTML =
            `<tr><td colspan="8"><div class="fp-empty">
                <svg class="w-9 h-9 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${escapeHtml(message)}
            </div></td></tr>`;
    }

    function renderTable() {
        const hideDropped = document.getElementById('hideDropped')?.checked;
        const rows = rawCourses.filter(c => !hideDropped || !isDropped(c));

        if (!rows.length) {
            renderEmpty(hideDropped ? 'No active registered courses for this semester.' : 'No courses found for this semester.');
            return;
        }

        const tbody = document.getElementById('scheduleBody');
        tbody.innerHTML = rows.map((c, i) => {
            const { day, time } = parsePortalSlot(c.TimeSlotName);
            const dropped = isDropped(c);
            const statusBadge = dropped
                ? '<span class="fp-badge" style="background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.3);color:#fbbf24;">' +
                    (c.WithDrawStatus === 'Yes' ? 'Withdrawn' : 'Dropped') + '</span>'
                : '<span class="fp-status fp-status-emerald"><span class="dot"></span>Active</span>';
            return `
                <tr class="${dropped ? 'fp-row-muted' : ''}">
                    <td class="text-center text-gray-500 font-mono text-xs">${i + 1}</td>
                    <td><span class="fp-badge fp-badge-code">${escapeHtml(c.CourseCode)}</span></td>
                    <td class="text-center"><span class="fp-badge fp-badge-sec">${escapeHtml(String(c.SectionName))}</span></td>
                    <td><span class="faculty-name" title="${escapeHtml(c.FacultyName || c.ShortName)}">${escapeHtml(c.ShortName || c.FacultyName || 'TBA')}</span></td>
                    <td>
                        <div class="flex flex-col gap-0.5">
                            <span class="fp-badge fp-badge-day">${escapeHtml(day || 'TBA')}</span>
                            <span class="time-text" style="font-size:11px;">${escapeHtml(time || 'TBA')}</span>
                        </div>
                    </td>
                    <td><span class="fp-badge fp-badge-room">${escapeHtml(trimRoomName(c.RoomName) || 'TBA')}</span></td>
                    <td class="text-center font-mono">${(Number(c.CreditHour) || 0).toFixed(2)}</td>
                    <td class="text-center">${statusBadge}</td>
                </tr>`;
        }).join('');
    }

    // ========================================
    // Routine generation
    // ========================================
    function buildRoutineModel() {
        // Exclude dropped/withdrawn; group by base course + section
        const map = new Map();
        const order = [];
        for (const c of rawCourses) {
            if (isDropped(c)) continue;
            const code = baseCode(c.CourseCode);
            const isLab = /lab\s*$/i.test(String(c.CourseCode).trim());
            const key = `${code}|${c.SectionName}`;
            if (!map.has(key)) {
                map.set(key, { courseCode: code, section: c.SectionName, shortName: c.ShortName || '', slots: [] });
                order.push(key);
            }
            const parsed = parsePortalSlot(c.TimeSlotName);
            const startMin = timeToMinutes(parsed.time.split(' - ')[0]);
            const endMin = timeToMinutes(parsed.time.split(' - ')[1]);
            if (parsed.days.length && startMin !== null && endMin !== null) {
                map.get(key).slots.push({
                    days: parsed.days,
                    startMin,
                    endMin,
                    startLabel: prettyTime(parsed.time.split(' - ')[0]),
                    endLabel: prettyTime(parsed.time.split(' - ')[1]),
                    room: trimRoomName(c.RoomName),
                    isLab
                });
            }
        }

        const courses = order.map(k => map.get(k));
        // Sort columns by earliest weekly start time, then day index, then code
        courses.forEach(course => {
            let minTime = Infinity, minDay = Infinity;
            course.slots.forEach(s => {
                if (s.startMin < minTime) minTime = s.startMin;
                s.days.forEach(d => {
                    const idx = DOW_INDEX[d];
                    if (idx !== undefined && idx < minDay) minDay = idx;
                });
            });
            course._minTime = minTime === Infinity ? 9999 : minTime;
            course._minDay = minDay === Infinity ? 9999 : minDay;
        });
        courses.sort((a, b) => {
            if (a._minTime !== b._minTime) return a._minTime - b._minTime;
            if (a._minDay !== b._minDay) return a._minDay - b._minDay;
            const c = a.courseCode.localeCompare(b.courseCode);
            return c !== 0 ? c : (String(a.section)).localeCompare(String(b.section));
        });

        // Determine active days present
        const activeDays = new Set();
        courses.forEach(course => course.slots.forEach(s => s.days.forEach(d => activeDays.add(d))));
        const daysToShow = DOW.filter(d => activeDays.has(d));

        return { courses, daysToShow };
    }

    function findDaySlots(course, day) {
        const out = [];
        course.slots.forEach(s => {
            if (s.days.includes(day)) out.push(s);
        });
        return out.sort((a, b) => a.startMin - b.startMin);
    }

    function openRoutine() {
        const model = buildRoutineModel();
        if (!model.courses.length) {
            showFeatureToast('No registered courses to generate a routine.', 'warning');
            return;
        }
        routineCourses = model.courses;

        document.getElementById('routineTitle').textContent = 'Class Routine';
        document.getElementById('routineSubtitle').textContent =
            `${currentSemesterName || ''}${currentUserId ? ' • ' + currentUserId : ''}`;

        const preview = document.getElementById('routinePreview');
        preview.innerHTML = buildRoutineHtml(model);
        document.getElementById('routineModal').classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeRoutine() {
        document.getElementById('routineModal').classList.remove('open');
        document.body.style.overflow = '';
    }

    function buildRoutineHtml(model) {
        const { courses, daysToShow } = model;
        let h = '<div id="routineExportArea" style="background:#ffffff;border-radius:12px;padding:22px;">';
        h += `<div style="text-align:center;margin-bottom:16px;">
            <img src="${LOGO_URL}" crossorigin="anonymous" style="max-height:52px;margin:0 auto 8px;display:block;" onerror="this.style.display='none'">
            <h2 style="margin:0;font-size:17px;font-weight:800;color:#111827;letter-spacing:0.4px;">CLASS ROUTINE</h2>
            <p style="margin:4px 0 0;font-size:13px;color:#4b5563;font-weight:600;">${escapeHtml(currentSemesterName || '')}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;font-family:monospace;">${escapeHtml(currentUserId || '')}</p>
        </div>`;

        if (!daysToShow.length) {
            h += '<p style="text-align:center;color:#6b7280;">No scheduled class times available.</p></div>';
            return h;
        }

        h += '<table class="fp-timetable" style="background:#fff;">';
        h += '<thead><tr><th style="width:90px;">Day</th>';
        courses.forEach(c => {
            h += `<th>${escapeHtml(c.courseCode)}<br><span style="font-size:10px;font-weight:600;opacity:0.8;">Sec ${escapeHtml(String(c.section))}</span></th>`;
        });
        h += '</tr></thead><tbody>';

        daysToShow.forEach(day => {
            h += `<tr><td class="tt-day">${escapeHtml(DOW_FULL[day] || day)}</td>`;
            courses.forEach(course => {
                const slots = findDaySlots(course, day);
                if (!slots.length) {
                    h += '<td class="tt-cell"></td>';
                    return;
                }
                h += '<td class="tt-cell">';
                slots.forEach((s, idx) => {
                    if (idx > 0) h += '<div style="border-top:1px dashed #d1d5db;margin:5px 0;"></div>';
                    const accent = s.isLab ? '#f59e0b' : '#2563eb';
                    h += `<div style="border-left:3px solid ${accent};padding-left:6px;text-align:left;">
                        <div style="font-size:11px;font-weight:700;color:${accent};">${s.startLabel} – ${s.endLabel}</div>
                        <div style="font-size:10px;color:#4b5563;">${escapeHtml(s.room)}</div>
                    </div>`;
                });
                h += '</td>';
            });
            h += '</tr>';
        });
        h += '</tbody></table></div>';
        return h;
    }

    // ---- PNG export via canvas ----
    async function exportRoutinePng() {
        const model = buildRoutineModel();
        const { courses, daysToShow } = model;
        if (!daysToShow.length) { showFeatureToast('Nothing to export', 'warning'); return; }

        const scale = 2;
        const colCount = courses.length + 1;
        const colWidth = 128;
        const dayColWidth = 96;
        const headerH = 96;
        const theadH = 52;
        const rowH = 72;
        const pad = 18;

        const width = dayColWidth + courses.length * colWidth + pad * 2;
        const height = headerH + theadH + daysToShow.length * rowH + pad * 2;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 640) * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Header
        ctx.fillStyle = '#111827';
        ctx.font = '800 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLASS ROUTINE', width / 2, pad + 22);
        ctx.fillStyle = '#4b5563';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.fillText(currentSemesterName || '', width / 2, pad + 44);
        if (currentUserId) {
            ctx.fillStyle = '#9ca3af';
            ctx.font = '600 11px monospace';
            ctx.fillText(currentUserId, width / 2, pad + 62);
        }

        const startY = pad + headerH;
        const startX = pad;

        // Header row
        ctx.fillStyle = '#e8f0fe';
        ctx.fillRect(startX, startY, dayColWidth + courses.length * colWidth, theadH);
        ctx.strokeStyle = '#93b4e8';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, startY, dayColWidth + courses.length * colWidth, theadH);

        ctx.fillStyle = '#1a365d';
        ctx.font = '700 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Day', startX + dayColWidth / 2, startY + theadH / 2 + 5);

        courses.forEach((c, i) => {
            const x = startX + dayColWidth + i * colWidth;
            ctx.strokeRect(x, startY, colWidth, theadH);
            ctx.fillStyle = '#1a365d';
            ctx.font = '700 12px monospace';
            ctx.fillText(c.courseCode, x + colWidth / 2, startY + 22);
            ctx.font = '600 10px Inter, sans-serif';
            ctx.fillText('Sec ' + c.section, x + colWidth / 2, startY + 38);
        });

        // Body rows
        daysToShow.forEach((day, r) => {
            const y = startY + theadH + r * rowH;
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(startX, y, dayColWidth, rowH);
            ctx.strokeRect(startX, y, dayColWidth, rowH);
            ctx.fillStyle = '#334155';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(DOW_FULL[day] || day, startX + dayColWidth / 2, y + rowH / 2 + 4);

            courses.forEach((course, ci) => {
                const x = startX + dayColWidth + ci * colWidth;
                ctx.strokeStyle = '#cbd5e1';
                ctx.strokeRect(x, y, colWidth, rowH);
                const slots = findDaySlots(course, day);
                slots.forEach((s, si) => {
                    const ty = y + 20 + si * 26;
                    ctx.fillStyle = s.isLab ? '#b45309' : '#1d4ed8';
                    ctx.font = '700 11px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${s.startLabel}`, x + 8, ty);
                    ctx.fillText(`${s.endLabel}`, x + 8, ty + 12);
                    ctx.fillStyle = '#475569';
                    ctx.font = '600 10px Inter, sans-serif';
                    ctx.fillText(truncate(s.room, 16), x + colWidth - 58, ty + 12);
                });
            });
        });

        const link = document.createElement('a');
        link.download = `EWU_Routine_${(currentSemesterName || 'semester').replace(/[^a-z0-9]+/gi, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        trackEvent('export_routine_png', { count: courses.length });
        showFeatureToast('Routine image saved', 'success');
    }

    function truncate(t, n) { return t && t.length > n ? t.slice(0, n) + '…' : (t || ''); }

    // ---- PDF export ----
    function exportRoutinePdf() {
        const model = buildRoutineModel();
        const { courses, daysToShow } = model;
        if (!daysToShow.length) { showFeatureToast('Nothing to export', 'warning'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageW = doc.internal.pageSize.width;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('CLASS ROUTINE', pageW / 2, 14, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`${currentSemesterName || ''}${currentUserId ? '  •  ' + currentUserId : ''}`, pageW / 2, 20, { align: 'center' });

        const head = [['Day', ...courses.map(c => `${c.courseCode}\nSec ${c.section}`)]];
        const body = daysToShow.map(day => {
            const row = [DOW_FULL[day] || day];
            courses.forEach(course => {
                const slots = findDaySlots(course, day);
                row.push(slots.map(s => `${s.startLabel}-${s.endLabel}\n${s.room}`).join('\n'));
            });
            return row;
        });

        doc.autoTable({
            head, body, startY: 26,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle', lineColor: [176, 196, 222], lineWidth: 0.2 },
            headStyles: { fillColor: [26, 115, 232], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 26, fontStyle: 'bold' } }
        });

        doc.save(`EWU_Routine_${(currentSemesterName || 'semester').replace(/[^a-z0-9]+/gi, '_')}.pdf`);
        trackEvent('export_routine_pdf', { count: courses.length });
        showFeatureToast('Routine PDF saved', 'success');
    }

    // ---- ICS export ----
    function exportRoutineIcs() {
        const model = buildRoutineModel();
        const { courses } = model;
        if (!courses.length) { showFeatureToast('Nothing to export', 'warning'); return; }

        let startDate, endDate;
        if (semesterMeta && semesterMeta.StartingDate && semesterMeta.EndingDate) {
            startDate = new Date(semesterMeta.StartingDate);
            endDate = new Date(semesterMeta.EndingDate);
        } else {
            startDate = new Date();
            endDate = new Date(Date.now() + 16 * 7 * 24 * 3600 * 1000);
        }

        const icsDayCode = { Sun: 'SU', Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA' };
        const pad = n => String(n).padStart(2, '0');
        const fmt = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

        // Find the first matching weekday on/after startDate for each day
        function firstOccurrence(dayName, startMin) {
            const target = DOW.indexOf(dayName);
            const d = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0));
            const diff = (target - d.getUTCDay() + 7) % 7;
            d.setUTCDate(d.getUTCDate() + diff);
            d.setUTCMinutes(startMin);
            return d;
        }

        let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//EWU Course Portal//Class Routine//EN\r\nCALSCALE:GREGORIAN\r\n';
        const until = fmt(endDate);
        const stamp = fmt(new Date());

        courses.forEach((course, ci) => {
            course.slots.forEach((s, si) => {
                s.days.forEach(dayName => {
                    const occ = firstOccurrence(dayName, s.startMin);
                    const endOcc = new Date(occ.getTime() + (s.endMin - s.startMin) * 60000);
                    const uid = `ewu-${course.courseCode}-${course.section}-${ci}-${si}-${dayName.replace(/\s/g, '')}@aftabkabir.me`;
                    ics += 'BEGIN:VEVENT\r\n';
                    ics += `UID:${uid}\r\n`;
                    ics += `DTSTAMP:${stamp}\r\n`;
                    ics += `DTSTART:${fmt(occ)}\r\n`;
                    ics += `DTEND:${fmt(endOcc)}\r\n`;
                    ics += `RRULE:FREQ=WEEKLY;BYDAY=${icsDayCode[dayName] || 'MO'};UNTIL=${until}\r\n`;
                    ics += `SUMMARY:${course.courseCode} Sec ${course.section}\r\n`;
                    ics += `LOCATION:${s.room || ''}\r\n`;
                    ics += 'END:VEVENT\r\n';
                });
            });
        });
        ics += 'END:VCALENDAR\r\n';

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EWU_Routine_${(currentSemesterName || 'semester').replace(/[^a-z0-9]+/gi, '_')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        trackEvent('export_routine_ics', { count: courses.length });
        showFeatureToast('Calendar (.ics) downloaded', 'success');
    }

    window.openRoutine = openRoutine;
    window.closeRoutine = closeRoutine;
    window.exportRoutinePng = exportRoutinePng;
    window.exportRoutinePdf = exportRoutinePdf;
    window.exportRoutineIcs = exportRoutineIcs;
})();