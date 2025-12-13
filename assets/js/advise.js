// ========================================
// Advise Page JavaScript - Enhanced Version
// Premium UI with Advanced Search & PDF Export
// ========================================

// **IMPORTANT:** Update this to your actual Worker API domain
const API_BASE_URL = 'https://api.aftabkabir.me';

// Initialize retry handler
const courseRetryHandler = new RetryHandler();

// State Management
let allCourses = [];
let filteredCourses = [];
let selectedCourseFilter = null;
let currentSort = 'default';
let currentSearch = '';
let scrollPosition = 0;
let currentUserId = 'User';
let suggestionIndex = -1;
let searchTimeout;

// Day abbreviation mapping
const dayMapping = {
    'A': 'Sat',
    'S': 'Sun',
    'M': 'Mon',
    'T': 'Tue',
    'W': 'Wed',
    'R': 'Thu',
    'F': 'Fri'
};

// Parse day and time from TimeSlotName
function parseDayTime(timeSlotName) {
    if (!timeSlotName) return { day: '', time: '' };

    // Extract day abbreviations (capital letters at the start)
    const dayMatch = timeSlotName.match(/^[ASMTWR]+/);
    const dayAbbr = dayMatch ? dayMatch[0] : '';

    // Convert abbreviations to short day names
    const dayNames = dayAbbr.split('').map(d => dayMapping[d] || d).join(', ');

    // Extract time (everything after day abbreviations)
    const time = timeSlotName.replace(/^[ASMTWR]+\s*/, '').trim();

    return { day: dayNames, time: time };
}

// BD Time Update
function updateBDTime() {
    const now = new Date();
    const options = {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const bdTime = now.toLocaleString('en-US', options);
    document.getElementById('currentTime').textContent = bdTime;
}
setInterval(updateBDTime, 1000);
updateBDTime();

// Check authentication status on page load
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.loggedIn) {
            window.location.href = 'login.html';
            return false;
        }

        // Set user ID if available
        if (data.userId) {
            currentUserId = data.userId;
            document.getElementById('userId').textContent = data.userId;
        }

        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Handle logout
async function handleLogout(event) {
    event?.preventDefault();

    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    window.location.href = 'login.html';
}

// Course fetch attempt function (will be wrapped with retry logic)
async function attemptFetchCourses() {
    const response = await fetch(`${API_BASE_URL}/api/courses`, {
        credentials: 'include'
    });

    if (response.status === 401) {
        return {
            status: 'invalid_credentials',
            message: 'Session expired. Please login again.'
        };
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    return {
        status: 'success',
        data: data
    };
}

// Load courses via API with retry support
async function loadCourses(maintainScroll = false, useRetry = false) {
    if (maintainScroll) {
        scrollPosition = window.pageYOffset;
    }

    if (!useRetry) {
        // Normal load without retry (for initial page load)
        try {
            const result = await attemptFetchCourses();

            if (result.status === 'invalid_credentials') {
                window.location.href = 'login.html';
                return;
            }

            if (result.status === 'success') {
                allCourses = result.data;
                populateCourseFilter();
                applyFilters();

                if (maintainScroll) {
                    setTimeout(() => window.scrollTo(0, scrollPosition), 50);
                }
            }
        } catch (error) {
            console.error('Error loading courses:', error);
            showErrorMessage('Failed to load courses. Please check your connection.');
        }
    } else {
        // Use retry handler for refresh button
        await courseRetryHandler.executeWithRetry(
            () => attemptFetchCourses(),
            {
                operationName: 'Fetching Courses',
                onSuccess: (result) => {
                    allCourses = result.data;
                    populateCourseFilter();
                    applyFilters();

                    if (maintainScroll) {
                        setTimeout(() => window.scrollTo(0, scrollPosition), 50);
                    }

                    showToast('Courses refreshed successfully', 2000);
                },
                onInvalidCredentials: (result) => {
                    window.location.href = 'login.html';
                },
                onRetryAttempt: (attemptNum, elapsedTime) => {
                    console.log(`Course fetch attempt ${attemptNum} failed. Elapsed time: ${elapsedTime}s`);
                }
            }
        );
    }
}

// Show error message in table
function showErrorMessage(message) {
    document.getElementById('courseTableBody').innerHTML = `
        <tr>
            <td colspan="10">
                <div class="empty-state">
                    <div class="empty-state-icon" style="background: rgba(239, 68, 68, 0.1);">
                        <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                    </div>
                    <p class="text-red-400 font-medium">${message}</p>
                    <button onclick="loadCourses(false, true)" class="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;
    updateResultCount(0);
}

// Update result count
function updateResultCount(count) {
    const countEl = document.getElementById('resultCount');
    if (countEl) {
        countEl.textContent = `${count} course${count !== 1 ? 's' : ''}`;
    }
}

// Populate course filter dropdown
function populateCourseFilter() {
    const courseCodes = [...new Set(allCourses.map(c => c.CourseCode))].sort();
    const container = document.getElementById('courseFilterOptions');

    container.innerHTML = `
        <div class="filter-option" onclick="selectCourseFilter(null)">
            <span class="text-white">All Courses</span>
            <span class="text-gray-500 text-xs ml-2">(${allCourses.length})</span>
        </div>
    ` + courseCodes.map(code => {
        const count = allCourses.filter(c => c.CourseCode === code).length;
        return `
            <div class="filter-option" onclick="selectCourseFilter('${code}')">
                <span class="text-white">${code}</span>
                <span class="text-gray-500 text-xs ml-2">(${count})</span>
            </div>
        `;
    }).join('');
}

// Select course filter
function selectCourseFilter(course) {
    selectedCourseFilter = course;
    document.getElementById('courseFilterText').textContent = course || 'All Courses';
    document.getElementById('courseFilterDropdown').classList.add('hidden');
    applyFilters();
}

// Apply all filters and sorting
function applyFilters() {
    let courses = [...allCourses];

    // Apply search filter
    if (currentSearch) {
        const search = currentSearch.toLowerCase();
        courses = courses.filter(c =>
            c.CourseCode.toLowerCase().includes(search) ||
            c.ShortName.toLowerCase().includes(search) ||
            c.RoomName.toLowerCase().includes(search) ||
            c.TimeSlotName.toLowerCase().includes(search) ||
            c.SectionName.toLowerCase().includes(search)
        );
    }

    // Apply course filter
    if (selectedCourseFilter) {
        courses = courses.filter(c => c.CourseCode === selectedCourseFilter);
    }

    // Apply available only filter
    if (document.getElementById('availableOnly').checked) {
        courses = courses.filter(c => (c.SeatCapacity - c.SeatTaken) > 0);
    }

    // Apply sorting
    if (currentSort === 'az') {
        courses.sort((a, b) => a.ShortName.localeCompare(b.ShortName));
    } else if (currentSort === 'za') {
        courses.sort((a, b) => b.ShortName.localeCompare(a.ShortName));
    } else if (currentSort === 'seats') {
        courses.sort((a, b) => (b.SeatCapacity - b.SeatTaken) - (a.SeatCapacity - a.SeatTaken));
    }

    filteredCourses = courses;
    updateResultCount(courses.length);
    renderCourseTable();
}

// Get availability status class and color
function getAvailabilityInfo(available, capacity) {
    const percentage = (available / capacity) * 100;

    if (available <= 0) {
        return { class: 'status-full', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
    } else if (percentage < 20 || available < 5) {
        return { class: 'status-limited', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' };
    } else {
        return { class: 'status-available', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' };
    }
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Render course table with enhanced UI
function renderCourseTable() {
    const tbody = document.getElementById('courseTableBody');

    if (filteredCourses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-inbox"></i>
                        </div>
                        <p class="text-gray-400 font-medium">No courses found</p>
                        <p class="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredCourses.map((course, index) => {
        const available = course.SeatCapacity - course.SeatTaken;
        const takenPercentage = (course.SeatTaken / course.SeatCapacity) * 100;
        const availInfo = getAvailabilityInfo(available, course.SeatCapacity);
        const { day, time } = parseDayTime(course.TimeSlotName);

        return `
            <tr class="course-row" style="animation: fadeInUp 0.3s ease forwards; animation-delay: ${Math.min(index * 0.02, 0.5)}s; opacity: 0;">
                <td class="text-center">
                    <span class="text-gray-500 text-xs font-mono">${index + 1}</span>
                </td>
                <td>
                    <span class="badge-course">${course.CourseCode}</span>
                </td>
                <td>
                    <span class="badge-section">${course.SectionName}</span>
                </td>
                <td>
                    <span class="faculty-name" title="${course.ShortName}">${truncateText(course.ShortName, 18)}</span>
                </td>
                <td class="text-center">
                    <span class="text-gray-400 font-medium text-sm">${course.SeatCapacity}</span>
                </td>
                <td class="text-center">
                    <div>
                        <span class="text-amber-400 font-medium text-sm">${course.SeatTaken}</span>
                        <div class="capacity-bar mx-auto">
                            <div class="capacity-fill" style="width: ${Math.min(takenPercentage, 100)}%; background: ${availInfo.color};"></div>
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <span class="${availInfo.class} text-sm">${available}</span>
                </td>
                <td>
                    <span class="day-badge">${day || 'TBA'}</span>
                </td>
                <td>
                    <span class="time-text">${time || 'TBA'}</span>
                </td>
                <td>
                    <span class="badge-room" title="${course.RoomName}">${truncateText(course.RoomName, 12)}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// Advanced search functionality with intelligent suggestions
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const searchClear = document.getElementById('searchClear');

    if (!searchInput) return;

    // Input handler with debounce
    searchInput.addEventListener('input', function (e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        // Toggle clear button
        if (searchClear) {
            searchClear.classList.toggle('hidden', query.length === 0);
        }

        searchTimeout = setTimeout(() => {
            currentSearch = query.toLowerCase();
            applyFilters();

            // Show advanced suggestions
            if (query.length >= 1) {
                showSearchSuggestions(query);
            } else {
                searchSuggestions.classList.add('hidden');
                suggestionIndex = -1;
            }
        }, 150); // Fast debounce for responsive feel
    });

    // Keyboard navigation for suggestions
    searchInput.addEventListener('keydown', function (e) {
        const suggestions = searchSuggestions.querySelectorAll('.suggestion-item-premium');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            suggestionIndex = Math.min(suggestionIndex + 1, suggestions.length - 1);
            updateSuggestionHighlight(suggestions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            suggestionIndex = Math.max(suggestionIndex - 1, -1);
            updateSuggestionHighlight(suggestions);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
                suggestions[suggestionIndex].click();
            }
        } else if (e.key === 'Escape') {
            searchSuggestions.classList.add('hidden');
            suggestionIndex = -1;
        }
    });

    // Clear button handler
    if (searchClear) {
        searchClear.addEventListener('click', function () {
            searchInput.value = '';
            currentSearch = '';
            searchClear.classList.add('hidden');
            searchSuggestions.classList.add('hidden');
            suggestionIndex = -1;
            applyFilters();
            searchInput.focus();
        });
    }

    // Global keyboard shortcut (Ctrl+K)
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }

        // R for refresh
        if (e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement !== searchInput) {
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                document.getElementById('refreshBtn')?.click();
            }
        }
    });
}

// Update suggestion highlight
function updateSuggestionHighlight(suggestions) {
    suggestions.forEach((item, index) => {
        item.classList.toggle('active', index === suggestionIndex);
    });

    // Scroll into view
    if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
        suggestions[suggestionIndex].scrollIntoView({ block: 'nearest' });
    }
}

// Show search suggestions with intelligent matching
function showSearchSuggestions(query) {
    const searchSuggestions = document.getElementById('searchSuggestions');
    const queryLower = query.toLowerCase();

    // Intelligent matching with priority scoring
    const scoredMatches = allCourses.map(c => {
        let score = 0;
        const courseCodeLower = c.CourseCode.toLowerCase();
        const shortNameLower = c.ShortName.toLowerCase();
        const roomNameLower = c.RoomName.toLowerCase();
        const timeSlotLower = c.TimeSlotName.toLowerCase();
        const sectionLower = c.SectionName.toLowerCase();

        // Course code exact match (highest priority)
        if (courseCodeLower === queryLower) score += 100;
        else if (courseCodeLower.startsWith(queryLower)) score += 60;
        else if (courseCodeLower.includes(queryLower)) score += 30;

        // Faculty name matching
        if (shortNameLower.startsWith(queryLower)) score += 40;
        else if (shortNameLower.includes(queryLower)) score += 20;

        // Section matching
        if (sectionLower === queryLower) score += 25;
        else if (sectionLower.includes(queryLower)) score += 12;

        // Room matching
        if (roomNameLower.includes(queryLower)) score += 15;

        // Time matching
        if (timeSlotLower.includes(queryLower)) score += 8;

        return { course: c, score };
    }).filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

    if (scoredMatches.length > 0) {
        // Group by course code for better organization
        const uniqueCourses = {};
        scoredMatches.forEach(m => {
            const key = m.course.CourseCode;
            if (!uniqueCourses[key]) {
                uniqueCourses[key] = {
                    courses: [],
                    totalAvailable: 0,
                    highestScore: m.score
                };
            }
            uniqueCourses[key].courses.push(m.course);
            uniqueCourses[key].totalAvailable += (m.course.SeatCapacity - m.course.SeatTaken);
        });

        searchSuggestions.innerHTML = Object.entries(uniqueCourses).map(([code, data]) => {
            const course = data.courses[0];
            const available = data.totalAvailable;
            const availInfo = getAvailabilityInfo(available, data.courses.reduce((a, c) => a + c.SeatCapacity, 0));
            const { day, time } = parseDayTime(course.TimeSlotName);

            return `
                <div class="suggestion-item-premium" onclick="selectSearchSuggestion('${code}')">
                    <div class="flex justify-between items-start gap-3">
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-[#5a8fd8] text-sm mb-1">${code}</div>
                            <div class="text-xs text-gray-400 truncate">${truncateText(course.ShortName, 25)}</div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <span class="text-sm font-semibold" style="color: ${availInfo.color};">${available} seats</span>
                            <div class="text-xs text-gray-500 mt-0.5">${data.courses.length} section${data.courses.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div class="flex gap-4 mt-2 text-xs text-gray-500">
                        <span><i class="fas fa-door-open mr-1"></i>${truncateText(course.RoomName, 10)}</span>
                        <span><i class="fas fa-clock mr-1"></i>${time || 'TBA'}</span>
                        <span><i class="fas fa-calendar mr-1"></i>${day || 'TBA'}</span>
                    </div>
                </div>
            `;
        }).join('');

        searchSuggestions.classList.remove('hidden');
        suggestionIndex = -1;
    } else {
        searchSuggestions.innerHTML = `
            <div class="p-4 text-center text-gray-500 text-sm">
                <i class="fas fa-search mb-2 text-lg opacity-50"></i>
                <p>No matches found for "${query}"</p>
            </div>
        `;
        searchSuggestions.classList.remove('hidden');
    }
}

// Select search suggestion
function selectSearchSuggestion(courseCode) {
    document.getElementById('searchInput').value = courseCode;
    currentSearch = courseCode.toLowerCase();
    document.getElementById('searchSuggestions').classList.add('hidden');
    document.getElementById('searchClear')?.classList.remove('hidden');
    suggestionIndex = -1;
    applyFilters();
}

// Sort change handler
document.getElementById('sortSelect')?.addEventListener('change', function (e) {
    currentSort = e.target.value;
    applyFilters();
});

// Available only toggle with enhanced UI
function initializeToggle() {
    const toggle = document.getElementById('availableToggle');
    const checkbox = document.getElementById('availableOnly');

    if (toggle && checkbox) {
        toggle.addEventListener('click', function () {
            checkbox.checked = !checkbox.checked;
            toggle.classList.toggle('active', checkbox.checked);
            applyFilters();
        });

        checkbox.addEventListener('change', function () {
            toggle.classList.toggle('active', this.checked);
            applyFilters();
        });
    }
}

// Course filter dropdown toggle
document.getElementById('courseFilterBtn')?.addEventListener('click', function () {
    document.getElementById('courseFilterDropdown').classList.toggle('hidden');
});

// Course filter search
document.getElementById('courseFilterSearch')?.addEventListener('input', function (e) {
    const query = e.target.value.toLowerCase();
    const options = document.querySelectorAll('#courseFilterOptions .filter-option');

    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(query) ? '' : 'none';
    });
});

// Close dropdowns when clicking outside
document.addEventListener('click', function (e) {
    if (!e.target.closest('#courseFilterBtn') && !e.target.closest('#courseFilterDropdown')) {
        document.getElementById('courseFilterDropdown')?.classList.add('hidden');
    }
    if (!e.target.closest('#searchInput') && !e.target.closest('#searchSuggestions')) {
        document.getElementById('searchSuggestions')?.classList.add('hidden');
        suggestionIndex = -1;
    }
});

// Toast notification function
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');

        setTimeout(() => {
            toast.classList.remove('hide');
        }, 400);
    }, duration);
}

// Refresh button with AJAX, retry logic and toast notification
document.getElementById('refreshBtn')?.addEventListener('click', async function () {
    const btn = this;
    const icon = this.querySelector('.refresh-icon');

    btn.classList.add('refreshing');

    await loadCourses(true, true); // Enable retry for manual refresh

    setTimeout(() => {
        btn.classList.remove('refreshing');
    }, 600);
});

// ========================================
// ENHANCED PDF EXPORT - Professional Quality
// ========================================
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 12;

    // Colors
    const primaryColor = [90, 143, 216];
    const accentColor = [216, 108, 90];
    const darkBg = [15, 15, 20];
    const lightText = [255, 255, 255];
    const grayText = [150, 150, 160];

    // Header Background
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, pageWidth, 38, 'F');

    // Gradient line
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 38, pageWidth, 1.5, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text('EWU Course Schedule', margin, 18);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('East West University Course Dashboard', margin, 26);

    // User Info (right side)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Student ID:', pageWidth - margin - 55, 16);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text(currentUserId, pageWidth - margin - 30, 16);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Generated:', pageWidth - margin - 55, 23);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    const dateStr = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    doc.text(dateStr, pageWidth - margin - 30, 23);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Total Courses:', pageWidth - margin - 55, 30);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text(String(filteredCourses.length), pageWidth - margin - 30, 30);

    // Prepare table data with proper text truncation
    const tableData = filteredCourses.map((course, index) => {
        const available = course.SeatCapacity - course.SeatTaken;
        const { day, time } = parseDayTime(course.TimeSlotName);

        // Truncate long text to prevent overflow
        const truncatedFaculty = truncateForPDF(course.ShortName, 20);
        const truncatedRoom = truncateForPDF(course.RoomName, 12);
        const truncatedDay = truncateForPDF(day, 12);
        const truncatedTime = truncateForPDF(time, 14);

        return [
            String(index + 1),
            course.CourseCode,
            course.SectionName,
            truncatedFaculty,
            String(course.SeatCapacity),
            String(course.SeatTaken),
            String(available),
            truncatedDay || 'TBA',
            truncatedTime || 'TBA',
            truncatedRoom
        ];
    });

    // Add table with professional styling
    doc.autoTable({
        head: [['#', 'Course', 'Sec', 'Faculty', 'Cap', 'Taken', 'Avail', 'Day', 'Time', 'Room']],
        body: tableData,
        startY: 46,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: {
            fontSize: 8,
            cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
            lineColor: [30, 30, 40],
            lineWidth: 0.1,
            textColor: [60, 60, 70],
            font: 'helvetica',
            overflow: 'ellipsize', // Prevent text overflow
            cellWidth: 'wrap'
        },
        headStyles: {
            fillColor: [25, 25, 35],
            textColor: [90, 143, 216],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
            cellPadding: { top: 5, right: 3, bottom: 5, left: 3 }
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },  // #
            1: { cellWidth: 24, halign: 'left', fontStyle: 'bold', textColor: [90, 143, 216] },  // Course
            2: { cellWidth: 14, halign: 'center' },  // Section
            3: { cellWidth: 42, halign: 'left' },    // Faculty (wider)
            4: { cellWidth: 14, halign: 'center' },  // Capacity
            5: { cellWidth: 14, halign: 'center' },  // Taken
            6: { cellWidth: 14, halign: 'center' },  // Available
            7: { cellWidth: 26, halign: 'left' },    // Day
            8: { cellWidth: 32, halign: 'left' },    // Time (wider)
            9: { cellWidth: 26, halign: 'left' }     // Room
        },
        alternateRowStyles: {
            fillColor: [248, 249, 252]
        },
        bodyStyles: {
            fillColor: [255, 255, 255]
        },
        didParseCell: function (data) {
            // Color code availability column
            if (data.section === 'body' && data.column.index === 6) {
                const available = parseInt(data.cell.raw);
                if (available <= 0) {
                    data.cell.styles.textColor = [239, 68, 68]; // Red
                    data.cell.styles.fontStyle = 'bold';
                } else if (available < 5) {
                    data.cell.styles.textColor = [245, 158, 11]; // Amber
                    data.cell.styles.fontStyle = 'bold';
                } else {
                    data.cell.styles.textColor = [16, 185, 129]; // Green
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        willDrawCell: function (data) {
            // Add subtle row border
            if (data.section === 'body') {
                doc.setDrawColor(240, 240, 245);
                doc.setLineWidth(0.1);
            }
        }
    });

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer background
        doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
        doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

        // Footer line
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, pageHeight - 12, pageWidth, 0.5, 'F');

        // Footer text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(grayText[0], grayText[1], grayText[2]);
        doc.text('EWU Course Dashboard • aftabkabir.me', margin, pageHeight - 5);

        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    // Generate filename with date
    const fileName = 'EWU_Courses_' + new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(fileName);

    showToast('PDF exported successfully!', 2500);
}

// Helper function to truncate text for PDF
function truncateForPDF(text, maxLength) {
    if (!text) return '';
    text = String(text).trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 2) + '..';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize UI components
    initializeSearch();
    initializeToggle();

    // Check authentication first
    const isAuthenticated = await checkAuth();

    if (isAuthenticated) {
        // Load courses after successful auth check
        loadCourses();
    }
});
