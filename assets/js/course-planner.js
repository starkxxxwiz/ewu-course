// ========================================
// Course Planner Page Logic
// Ports the documented EWU Planner rules:
// - Theory/Lab aggregation into one card per course+section
// - Duplicate course check, 15-credit limit, interval-overlap conflict
// - Daily theory limit (max 3/day)
// - Multiple combinations
// - Canvas image export (single + all)
// ========================================

(function () {
    const MAX_CREDITS = 15.0;
    const MAX_DAILY_THEORY = 3;
    const LOGO_URL = 'assets/images/ewu.png';

    let currentUserId = null;
    let catalog = [];        // merged course cards: { key, courseCode, section, shortName, faculty, theorySlots[], labSlots[], creditHour, seatsLeft }
    let filtered = [];
    let combinations = [];   // [{ id, name, selected: Map(key => card) }]
    let activeComboId = null;

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        const gate = await gateFeaturePage('planner');
        if (!gate.allowed) return;
        const auth = await requireAuth();
        if (!auth) return;
        currentUserId = auth.userId || 'Student';
        const uidEl = document.getElementById('userId');
        if (uidEl) uidEl.textContent = currentUserId;

        combinations = [];
        createCombination(true);

        document.getElementById('catalogSearch')?.addEventListener('input', onSearch);
        document.getElementById('refreshBtn')?.addEventListener('click', () => loadCatalog(true));
        document.getElementById('previewModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') closePreview();
        });

        await loadCatalog(false);
    }

    function activeCombo() {
        return combinations.find(c => c.id === activeComboId);
    }

    // -----------------------------------------
    // Catalog loading & aggregation
    // -----------------------------------------
    async function loadCatalog(manual) {
        const list = document.getElementById('catalogList');
        list.innerHTML = '<div class="fp-empty"><div class="fp-spinner"></div>Loading course routine…</div>';
        try {
            const result = await fetchJsonWithRetry(`${API_BASE_URL}/api/routine`);
            if (result.__unauthorized) { window.location.href = 'login.html'; return; }
            const data = result.data || {};
            if (data.status === 'error') throw new Error(data.message || 'Failed to load routine');
            catalog = buildCatalog(data.courses || []);
            onSearch();
            if (manual) showFeatureToast(`Loaded ${catalog.length} course sections`, 'success');
        } catch (e) {
            list.innerHTML = `<div class="fp-empty">Failed to load courses. ${escapeHtml(e.message || '')}<br><button class="fp-btn fp-btn-ghost" style="margin-top:14px;" onclick="location.reload()">Retry</button></div>`;
            showFeatureToast(e.message || 'Failed to load routine', 'error');
        }
    }

    // Merge raw routine rows (theory + Lab) into unified cards
    function buildCatalog(raw) {
        const map = new Map();
        const order = [];
        for (const c of raw) {
            const rawCode = String(c.CourseCode || '').trim();
            if (!rawCode) continue;
            const isLab = /\s*lab\b/i.test(rawCode);
            const baseCode = rawCode.replace(/\s*lab\b/gi, '').trim();
            const sec = c.SectionName;
            const key = `${baseCode}|${sec}`;

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    courseCode: baseCode,
                    section: sec,
                    shortName: c.ShortName || '',
                    faculty: c.FacultyName || c.ShortName || '',
                    creditHour: Number(c.CreditHour) || 0,
                    seatsCapacity: Number(c.SeatCapacity) || 0,
                    seatsTaken: Number(c.SeatTaken) || 0,
                    theorySlots: [],
                    labSlots: []
                });
                order.push(key);
            }
            const card = map.get(key);
            card.creditHour = Math.max(card.creditHour, Number(c.CreditHour) || 0);
            card.shortName = card.shortName || c.ShortName || '';

            const parsed = parsePortalSlot(c.TimeSlotName);
            if (parsed.days.length) {
                const startMin = timeToMinutes(parsed.time.split(' - ')[0]);
                const endMin = timeToMinutes(parsed.time.split(' - ')[1]);
                const slot = {
                    days: parsed.days,
                    startMin: startMin === null ? 0 : startMin,
                    endMin: endMin === null ? 0 : endMin,
                    startLabel: prettyTime(parsed.time.split(' - ')[0]),
                    endLabel: prettyTime(parsed.time.split(' - ')[1]),
                    room: trimRoomName(c.RoomName)
                };
                if (isLab) card.labSlots.push(slot); else card.theorySlots.push(slot);
            }
        }
        const cards = order.map(k => map.get(k));
        // Merge theory slots sharing identical time ranges across days (e.g. M + W)
        cards.forEach(card => {
            card.theorySlots = mergeSlots(card.theorySlots);
            card.labSlots = mergeSlots(card.labSlots);
        });
        return cards;
    }

    function mergeSlots(slots) {
        const out = [];
        slots.forEach(s => {
            const existing = out.find(o => o.startMin === s.startMin && o.endMin === s.endMin);
            if (existing) {
                s.days.forEach(d => { if (!existing.days.includes(d)) existing.days.push(d); });
                if (!existing.room && s.room) existing.room = s.room;
            } else {
                out.push({ ...s, days: [...s.days] });
            }
        });
        out.forEach(o => o.days.sort((a, b) => DOW.indexOf(a) - DOW.indexOf(b)));
        return out;
    }

    const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // -----------------------------------------
    // Catalog rendering & search
    // -----------------------------------------
    function onSearch() {
        const q = (document.getElementById('catalogSearch')?.value || '').toLowerCase().replace(/[\s\-_]/g, '');
        filtered = !q ? catalog : catalog.filter(c => {
            const hay = `${c.courseCode} ${c.shortName} ${c.faculty} ${c.section}`.toLowerCase().replace(/[\s\-_]/g, '');
            return hay.includes(q);
        });
        renderCatalog();
    }

    function renderCatalog() {
        const list = document.getElementById('catalogList');
        const countEl = document.getElementById('catalogCount');
        if (countEl) countEl.textContent = `${filtered.length} section${filtered.length !== 1 ? 's' : ''} shown`;

        if (!filtered.length) {
            list.innerHTML = '<div class="fp-empty" style="padding:40px 16px;">No matching course sections.</div>';
            return;
        }

        const selected = activeCombo().selected;
        list.innerHTML = filtered.slice(0, 400).map(card => {
            const added = selected.has(card.key);
            return cardHtml(card, added ? 'added' : '', added
                ? '<button class="fp-btn" disabled style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);padding:7px 14px;">Added</button>'
                : `<button class="fp-btn fp-btn-primary" style="padding:7px 14px;" onclick="addCourse('${card.key.replace(/'/g, "\\'")}')">Add</button>`);
        }).join('');
    }

    function cardHtml(card, extraClass, actionHtml) {
        const theory = card.theorySlots.map(slotRow).join('');
        const lab = card.labSlots.map(labRow).join('');
        return `
            <div class="fp-catalog-card ${extraClass}">
                <div class="flex items-start justify-between gap-3 mb-2.5">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="fp-badge fp-badge-code">${escapeHtml(card.courseCode)}</span>
                        <span class="fp-badge fp-badge-sec">Sec ${escapeHtml(String(card.section))}</span>
                        ${card.shortName ? `<span class="fp-badge" style="background:rgba(168,85,247,0.12);border-color:rgba(168,85,247,0.25);color:#c084fc;">${escapeHtml(card.shortName)}</span>` : ''}
                    </div>
                    <div class="text-right flex-shrink-0">
                        <div class="text-xs font-mono text-[#7fb0ea]">${card.creditHour.toFixed(2)} cr</div>
                    </div>
                </div>
                ${theory}
                ${lab}
                ${!theory && !lab ? '<div class="sched-row"><span style="color:#9ca3af;">Schedule TBA / Unavailable</span></div>' : ''}
                <div class="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span class="text-[10.5px] text-gray-500 font-mono">${card.seatsCapacity ? `${Math.max(0, card.seatsCapacity - card.seatsTaken)} / ${card.seatsCapacity} seats` : ''}</span>
                    ${actionHtml}
                </div>
            </div>`;
    }

    function slotRow(s) {
        const days = s.days.map(d => d.slice(0, 3)).join(',');
        return `<div class="sched-row">
            <svg class="sched-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#7fb0ea;"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            <span>${escapeHtml(days)} • ${escapeHtml(s.startLabel)} – ${escapeHtml(s.endLabel)}</span>
            ${s.room ? `<span class="text-gray-500">• ${escapeHtml(s.room)}</span>` : ''}
        </div>`;
    }

    function labRow(s) {
        const days = s.days.map(d => d.slice(0, 3)).join(',');
        return `<div class="sched-row">
            <svg class="sched-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#fbbf24;"><path d="M10 2v7.31L3.39 17c-.77.87-.29 2.23.87 2.23h15.48c1.15 0 1.63-1.36.87-2.23L14 9.31V2"></path><line x1="8.5" y1="2" x2="15.5" y2="2"></line><line x1="6.5" y1="13.5" x2="17.5" y2="13.5"></line></svg>
            <span>${escapeHtml(days)} • ${escapeHtml(s.startLabel)} – ${escapeHtml(s.endLabel)}</span>
            ${s.room ? `<span class="text-gray-500">• ${escapeHtml(s.room)}</span>` : ''}
        </div>`;
    }

    // -----------------------------------------
    // Combinations
    // -----------------------------------------
    function createCombination(activate) {
        const id = 'combo_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        combinations.push({ id, name: `Combination ${combinations.length + 1}`, selected: new Map() });
        if (activate !== false) activeComboId = id;
        renderComboTabs();
    }

    function addCombination() {
        createCombination(true);
        renderCatalog();
        renderPlan();
        showFeatureToast('New combination created', 'info');
    }

    function deleteCombination() {
        if (combinations.length <= 1) {
            showFeatureToast('At least one combination is required', 'warning');
            return;
        }
        combinations = combinations.filter(c => c.id !== activeComboId);
        activeComboId = combinations[combinations.length - 1].id;
        renderComboTabs(); renderCatalog(); renderPlan();
        showFeatureToast('Combination deleted', 'info');
    }

    function switchCombination(id) {
        activeComboId = id;
        renderComboTabs(); renderCatalog(); renderPlan();
    }

    function clearCombination() {
        activeCombo().selected.clear();
        renderCatalog(); renderPlan();
        showFeatureToast('Combination cleared', 'info');
    }

    function renderComboTabs() {
        const tabs = document.getElementById('comboTabs');
        tabs.innerHTML = combinations.map(c =>
            `<div class="combo-tab ${c.id === activeComboId ? 'active' : ''}" onclick="switchCombination('${c.id}')">${escapeHtml(c.name)} <span style="opacity:.7;">(${c.selected.size})</span></div>`
        ).join('');
        document.getElementById('deleteComboBtn').disabled = combinations.length <= 1;
        document.getElementById('planTitle').textContent = activeCombo().name;
    }

    // -----------------------------------------
    // Selection & validation
    // -----------------------------------------
    function addCourse(key) {
        const card = catalog.find(c => c.key === key);
        if (!card) return;
        const combo = activeCombo();

        // Duplicate course check
        for (const existing of combo.selected.values()) {
            if (existing.courseCode === card.courseCode) {
                showFeatureToast(`"${card.courseCode}" is already in the plan. Only one section per course is allowed.`, 'error');
                return;
            }
        }

        // Credit limit
        const currentCredits = sumCredits(combo);
        if (currentCredits + card.creditHour > MAX_CREDITS + 1e-9) {
            showFeatureToast(`Credit limit exceeded: ${(currentCredits + card.creditHour).toFixed(2)} / ${MAX_CREDITS.toFixed(1)} credits.`, 'error');
            return;
        }

        // Schedule conflict
        const conflict = detectConflict(card, combo);
        if (conflict) {
            showFeatureToast(`Schedule conflict with ${conflict.courseCode} on ${conflict.day} (${conflict.range}).`, 'error');
            return;
        }

        // Daily theory limit
        const daily = checkDailyTheoryLimit(card, combo);
        if (daily) {
            showFeatureToast(`Adding this exceeds ${MAX_DAILY_THEORY} theory classes on ${daily}.`, 'warning');
            return;
        }

        combo.selected.set(card.key, card);
        renderCatalog(); renderPlan();
        showFeatureToast(`${card.courseCode} Sec ${card.section} added`, 'success');
    }

    function removeCourse(key) {
        const combo = activeCombo();
        const card = combo.selected.get(key);
        combo.selected.delete(key);
        renderCatalog(); renderPlan();
        if (card) showFeatureToast(`${card.courseCode} Sec ${card.section} removed`, 'info');
    }

    function sumCredits(combo) {
        let sum = 0;
        combo.selected.forEach(c => sum += c.creditHour);
        return sum;
    }

    function cardSlots(card) {
        return [...card.theorySlots.map(s => ({ ...s, type: 'theory' })), ...card.labSlots.map(s => ({ ...s, type: 'lab' }))];
    }

    function detectConflict(newCard, combo) {
        const newSlots = cardSlots(newCard);
        for (const existing of combo.selected.values()) {
            for (const e of cardSlots(existing)) {
                for (const n of newSlots) {
                    const shared = n.days.filter(d => e.days.includes(d));
                    if (shared.length && n.startMin < e.endMin && n.endMin > e.startMin) {
                        return {
                            courseCode: existing.courseCode + ' Sec ' + existing.section,
                            day: shared.map(d => d.slice(0, 3)).join(','),
                            range: `${e.startLabel}-${e.endLabel}`
                        };
                    }
                }
            }
        }
        return null;
    }

    function checkDailyTheoryLimit(newCard, combo) {
        const dayCount = {};
        const add = (card, isNew) => {
            card.theorySlots.forEach(s => s.days.forEach(d => { dayCount[d] = (dayCount[d] || 0) + 1; }));
        };
        combo.selected.forEach(c => add(c, false));
        const before = { ...dayCount };
        add(newCard, true);
        for (const d of Object.keys(dayCount)) {
            if ((before[d] || 0) < MAX_DAILY_THEORY && dayCount[d] > MAX_DAILY_THEORY) return d;
        }
        return null;
    }

    // -----------------------------------------
    // Plan rendering
    // -----------------------------------------
    function renderPlan() {
        const combo = activeCombo();
        const planList = document.getElementById('planList');
        const cards = [...combo.selected.values()];

        // Metrics
        let theory = 0, labs = 0, credits = 0;
        cards.forEach(c => {
            theory += c.theorySlots.length;
            labs += c.labSlots.length;
            credits += c.creditHour;
        });
        document.getElementById('metricCourses').textContent = cards.length;
        document.getElementById('metricTheory').textContent = theory;
        document.getElementById('metricLabs').textContent = labs;
        document.getElementById('metricCredits').textContent = credits.toFixed(1);

        renderComboTabs();

        if (!cards.length) {
            planList.innerHTML = '<div class="fp-empty" style="padding:34px 16px;">Your plan is empty. Add sections from the catalog.</div>';
            return;
        }

        planList.innerHTML = cards.map(card => {
            const theory = card.theorySlots.map(slotRow).join('');
            const lab = card.labSlots.map(labRow).join('');
            return `
                <div class="fp-catalog-card added">
                    <div class="flex items-start justify-between gap-3 mb-2">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="fp-badge fp-badge-code">${escapeHtml(card.courseCode)}</span>
                            <span class="fp-badge fp-badge-sec">Sec ${escapeHtml(String(card.section))}</span>
                        </div>
                        <span class="text-xs font-mono text-[#7fb0ea]">${card.creditHour.toFixed(2)} cr</span>
                    </div>
                    ${theory}${lab}
                    <div class="mt-2.5 flex justify-end">
                        <button class="fp-btn fp-btn-danger" style="padding:6px 14px;" onclick="removeCourse('${card.key.replace(/'/g, "\\'")}')">Remove</button>
                    </div>
                </div>`;
        }).join('');
    }

    // -----------------------------------------
    // Routine preview
    // -----------------------------------------
    function buildTimetableModel(cards) {
        const activeDays = new Set();
        cards.forEach(card => cardSlots(card).forEach(s => s.days.forEach(d => activeDays.add(d))));
        const daysToShow = DOW.filter(d => activeDays.has(d));
        return { daysToShow };
    }

    function openPreview() {
        const combo = activeCombo();
        const cards = [...combo.selected.values()];
        if (!cards.length) { showFeatureToast('Add courses to preview a routine', 'warning'); return; }

        const { daysToShow } = buildTimetableModel(cards);
        if (!daysToShow.length) { showFeatureToast('No scheduled times available', 'warning'); return; }

        // Build grid: rows = days, cols = courses
        let html = '<div style="background:#fff;border-radius:12px;padding:18px;overflow:auto;">';
        html += '<table class="fp-timetable"><thead><tr><th style="width:86px;">Day</th>';
        cards.forEach(card => {
            html += `<th>${escapeHtml(card.courseCode)}<br><span style="font-size:10px;">Sec ${escapeHtml(String(card.section))}</span></th>`;
        });
        html += '</tr></thead><tbody>';

        daysToShow.forEach(day => {
            html += `<tr><td class="tt-day">${escapeHtml(day)}</td>`;
            cards.forEach(card => {
                const slots = cardSlots(card).filter(s => s.days.includes(day)).sort((a, b) => a.startMin - b.startMin);
                if (!slots.length) { html += '<td class="tt-cell"></td>'; return; }
                html += '<td class="tt-cell">';
                slots.forEach((s, i) => {
                    if (i > 0) html += '<div style="border-top:1px dashed #d1d5db;margin:4px 0;"></div>';
                    const accent = s.type === 'lab' ? '#b45309' : '#1d4ed8';
                    html += `<div style="border-left:3px solid ${accent};padding-left:6px;text-align:left;">
                        <div style="font-size:11px;font-weight:700;color:${accent};">${escapeHtml(s.startLabel)} – ${escapeHtml(s.endLabel)}</div>
                        <div style="font-size:10px;color:#4b5563;">${escapeHtml(s.room)}${s.type === 'lab' ? ' (Lab)' : ''}</div>
                    </div>`;
                });
                html += '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';

        document.getElementById('previewTitle').textContent = `${combo.name} — Routine Preview`;
        document.getElementById('previewBody').innerHTML = html;
        document.getElementById('previewModal').classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closePreview() {
        document.getElementById('previewModal').classList.remove('open');
        document.body.style.overflow = '';
    }

    // -----------------------------------------
    // Canvas image exports
    // -----------------------------------------
    function drawCombinationCanvas(ctx, combo, startY, width) {
        const cards = [...combo.selected.values()];
        let y = startY;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 16px Inter, sans-serif';
        ctx.fillText(combo.name, 24, y + 22);
        y += 40;

        if (!cards.length) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '500 13px Inter, sans-serif';
            ctx.fillText('No courses selected.', 24, y + 10);
            return y + 30;
        }

        cards.forEach(card => {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(24, y, width - 48, 60);
            ctx.strokeStyle = '#e2e8f0';
            ctx.strokeRect(24, y, width - 48, 60);

            ctx.fillStyle = '#1d4ed8';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.fillText(`${card.courseCode}  Sec ${card.section}`, 36, y + 24);

            const slots = cardSlots(card);
            ctx.font = '500 11px monospace';
            ctx.fillStyle = '#475569';
            const text = slots.map(s => {
                const days = s.days.map(d => d.slice(0, 3)).join(',');
                return `${days} ${s.startLabel}-${s.endLabel}`;
            }).join('   ');
            ctx.fillText(truncate(text, 88), 36, y + 44);

            ctx.fillStyle = '#334155';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${card.creditHour.toFixed(2)} cr`, width - 36, y + 24);
            ctx.textAlign = 'left';

            y += 68;
        });

        // Stats footer
        let theory = 0, labs = 0, credits = 0;
        cards.forEach(c => { theory += c.theorySlots.length; labs += c.labSlots.length; credits += c.creditHour; });
        ctx.fillStyle = '#eef2ff';
        ctx.fillRect(24, y, width - 48, 34);
        ctx.fillStyle = '#1e293b';
        ctx.font = '700 12px Inter, sans-serif';
        ctx.fillText(`${cards.length} Courses   •   ${theory} Theory   •   ${labs} Labs   •   ${credits.toFixed(1)} Credits`, 36, y + 22);
        return y + 46;
    }

    function saveCombinationImage() {
        const combo = activeCombo();
        if (!combo.selected.size) { showFeatureToast('Add courses before saving', 'warning'); return; }

        const name = prompt('Name this combination:', combo.name) || combo.name;
        combo.name = name;
        renderComboTabs();

        const width = 620;
        const scale = 2;
        // Estimate height
        const estHeight = 70 + combo.selected.size * 68 + 60;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = estHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, estHeight);
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EWU COURSE PLAN', width / 2, 30);
        ctx.font = '600 11px monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(currentUserId || '', width / 2, 48);
        ctx.textAlign = 'left';

        drawCombinationCanvas(ctx, combo, 62, width);

        const link = document.createElement('a');
        link.download = `EWU_Plan_${name.replace(/[^a-z0-9]+/gi, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        trackEvent('export_planner_png', { count: combo.selected.size });
        showFeatureToast('Combination saved as image', 'success');
    }

    function saveAllCombinationsImage() {
        const active = combinations.filter(c => c.selected.size > 0);
        if (!active.length) { showFeatureToast('No combinations with courses to save', 'warning'); return; }

        const width = 620;
        const scale = 2;
        let estHeight = 60;
        active.forEach(c => { estHeight += 40 + (c.selected.size ? c.selected.size * 68 + 16 : 44); });
        estHeight += 30;

        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = estHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, estHeight);
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EWU COURSE PLANS — ALL COMBINATIONS', width / 2, 30);
        ctx.textAlign = 'left';

        let y = 50;
        active.forEach(combo => { y = drawCombinationCanvas(ctx, combo, y, width) + 10; });

        const link = document.createElement('a');
        link.download = 'EWU_All_Combinations.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        trackEvent('export_planner_all_png', { count: active.length });
        showFeatureToast('All combinations saved as image', 'success');
    }

    function truncate(t, n) { return t && t.length > n ? t.slice(0, n) + '…' : (t || ''); }

    window.addCourse = addCourse;
    window.removeCourse = removeCourse;
    window.addCombination = addCombination;
    window.deleteCombination = deleteCombination;
    window.switchCombination = switchCombination;
    window.clearCombination = clearCombination;
    window.openPreview = openPreview;
    window.closePreview = closePreview;
    window.saveCombinationImage = saveCombinationImage;
    window.saveAllCombinationsImage = saveAllCombinationsImage;
})();