// ========================================
// Advise Page JavaScript with Intelligent Retry
// ========================================

// **IMPORTANT:** Update this to your actual Worker API domain
const API_BASE_URL = 'https://api.aftabkabir.me';

// Initialize retry handler
const courseRetryHandler = new RetryHandler();

let allCourses = [];
let filteredCourses = [];
let selectedCourseFilter = null;
let currentSort = 'default';
let currentSearch = '';
let scrollPosition = 0;
let currentUserId = 'User';

// Day abbreviation mapping
const dayMapping = {
    'A': 'SATURDAY',
    'S': 'SUNDAY',
    'M': 'MONDAY',
    'T': 'TUESDAY',
    'W': 'WEDNESDAY',
    'R': 'THURSDAY',
    'F': 'FRIDAY'
};

// Parse day and time from TimeSlotName
function parseDayTime(timeSlotName) {
    if (!timeSlotName) return { day: '', time: '' };
    
    // Extract day abbreviations (capital letters at the start)
    const dayMatch = timeSlotName.match(/^[ASMTWR]+/);
    const dayAbbr = dayMatch ? dayMatch[0] : '';
    
    // Convert abbreviations to full day names
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
        <tr class="table-row">
            <td colspan="9" class="py-8 text-center text-red-400">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

// Populate course filter dropdown
function populateCourseFilter() {
    const courseCodes = [...new Set(allCourses.map(c => c.CourseCode))].sort();
    const container = document.getElementById('courseFilterOptions');
    
    container.innerHTML = `
        <div class="dropdown-option rounded-lg" onclick="selectCourseFilter(null)">
            <span class="text-white text-sm">All Courses</span>
        </div>
    ` + courseCodes.map(code => `
        <div class="dropdown-option rounded-lg" onclick="selectCourseFilter('${code}')">
            <span class="text-white text-sm">${code}</span>
        </div>
    `).join('');
}

// Select course filter
function selectCourseFilter(course) {
    selectedCourseFilter = course;
    document.getElementById('courseFilterText').textContent = course || 'All';
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
            c.TimeSlotName.toLowerCase().includes(search)
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
    renderCourseTable();
}

// Render course table
function renderCourseTable() {
    const tbody = document.getElementById('courseTableBody');
    
    if (filteredCourses.length === 0) {
        tbody.innerHTML = `
            <tr class="table-row">
                <td colspan="9" class="py-8 text-center text-gray-400">
                    <i class="fas fa-inbox text-3xl mb-3"></i>
                    <p>No courses found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredCourses.map(course => {
        const available = course.SeatCapacity - course.SeatTaken;
        const availabilityClass = available <= 0 ? 'text-red-400' : (available < 5 ? 'text-yellow-400' : 'text-green-400');
        const { day, time } = parseDayTime(course.TimeSlotName);
        
        return `
            <tr class="table-row">
                <td class="py-3 px-4">
                    <span class="font-semibold text-blue-400">${course.CourseCode}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="inline-block bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg text-xs font-medium">
                         ${course.SectionName}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <span class="text-white text-sm">${course.ShortName}</span>
                </td>
                <td class="py-3 px-4 text-center">
                    <span class="text-gray-300 font-medium text-sm">${course.SeatCapacity}</span>
                </td>
                <td class="py-3 px-4 text-center">
                    <span class="text-yellow-400 font-medium text-sm">${course.SeatTaken}</span>
                </td>
                <td class="py-3 px-4 text-center">
                    <span class="font-bold text-sm ${availabilityClass}">${available}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="text-purple-300 text-sm">${day}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="text-cyan-300 text-sm">${time}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="inline-block bg-green-500/20 text-green-300 px-3 py-1 rounded-lg text-xs font-medium">
                        ${course.RoomName}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Advanced search functionality with intelligent suggestions
let searchTimeout;
document.getElementById('searchInput')?.addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.toLowerCase().trim();
    
    searchTimeout = setTimeout(() => {
        currentSearch = query;
        applyFilters();

        // Show advanced suggestions
        if (query.length >= 1) {
            // Intelligent matching with priority scoring
            const scoredMatches = allCourses.map(c => {
                let score = 0;
                const courseCodeLower = c.CourseCode.toLowerCase();
                const shortNameLower = c.ShortName.toLowerCase();
                const roomNameLower = c.RoomName.toLowerCase();
                const timeSlotLower = c.TimeSlotName.toLowerCase();
                
                // Course code exact match (highest priority)
                if (courseCodeLower === query) score += 100;
                else if (courseCodeLower.startsWith(query)) score += 50;
                else if (courseCodeLower.includes(query)) score += 25;
                
                // Faculty name matching
                if (shortNameLower.startsWith(query)) score += 30;
                else if (shortNameLower.includes(query)) score += 15;
                
                // Room matching
                if (roomNameLower.includes(query)) score += 10;
                
                // Time matching
                if (timeSlotLower.includes(query)) score += 5;
                
                return { course: c, score };
            }).filter(m => m.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 8);

            if (scoredMatches.length > 0) {
                const suggestions = document.getElementById('searchSuggestions');
                
                // Group by course code for better organization
                const uniqueCourses = {};
                scoredMatches.forEach(m => {
                    const key = m.course.CourseCode;
                    if (!uniqueCourses[key]) {
                        uniqueCourses[key] = [];
                    }
                    uniqueCourses[key].push(m.course);
                });
                
                suggestions.innerHTML = Object.entries(uniqueCourses).map(([code, courses]) => {
                    const available = courses[0].SeatCapacity - courses[0].SeatTaken;
                    const availClass = available > 0 ? 'text-green-400' : 'text-red-400';
                    
                    return `
                        <div class="suggestion-item p-4 border-b border-blue-500/10 cursor-pointer hover:bg-blue-500/10" onclick="selectSearchSuggestion('${code}')">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="font-bold text-blue-300 text-base mb-1">${code}</div>
                                    <div class="text-xs text-gray-400">${courses[0].ShortName}</div>
                                </div>
                                <div class="text-right">
                                    <span class="${availClass} font-semibold text-sm">${available} seats</span>
                                    <div class="text-xs text-gray-400 mt-1">${courses.length} section${courses.length > 1 ? 's' : ''}</div>
                                </div>
                            </div>
                            <div class="flex gap-3 mt-2 text-xs text-gray-500">
                                <span><i class="fas fa-door-open mr-1"></i>${courses[0].RoomName}</span>
                                <span><i class="fas fa-clock mr-1"></i>${courses[0].TimeSlotName}</span>
                            </div>
                        </div>
                    `;
                }).join('');
                suggestions.classList.remove('hidden');
            } else {
                document.getElementById('searchSuggestions').classList.add('hidden');
            }
        } else {
            document.getElementById('searchSuggestions').classList.add('hidden');
        }
    }, 200);
});

// Select search suggestion
function selectSearchSuggestion(courseCode) {
    document.getElementById('searchInput').value = courseCode;
    currentSearch = courseCode.toLowerCase();
    document.getElementById('searchSuggestions').classList.add('hidden');
    applyFilters();
}

// Sort change handler
document.getElementById('sortSelect')?.addEventListener('change', function(e) {
    currentSort = e.target.value;
    applyFilters();
});

// Available only toggle
document.getElementById('availableOnly')?.addEventListener('change', function() {
    document.getElementById('toggleKnob1').style.transform = this.checked ? 'translateX(24px)' : 'translateX(0)';
    document.getElementById('toggleBg1').style.backgroundColor = this.checked ? '#10b981' : '#374151';
    applyFilters();
});

// Course filter dropdown toggle
document.getElementById('courseFilterBtn')?.addEventListener('click', function() {
    document.getElementById('courseFilterDropdown').classList.toggle('hidden');
});

// Course filter search
document.getElementById('courseFilterSearch')?.addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const options = document.querySelectorAll('#courseFilterOptions .dropdown-option');
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(query) ? '' : 'none';
    });
});

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('#courseFilterBtn') && !e.target.closest('#courseFilterDropdown')) {
        document.getElementById('courseFilterDropdown')?.classList.add('hidden');
    }
    if (!e.target.closest('#searchInput') && !e.target.closest('#searchSuggestions')) {
        document.getElementById('searchSuggestions')?.classList.add('hidden');
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
document.getElementById('refreshBtn')?.addEventListener('click', async function() {
    const btn = this;
    const icon = this.querySelector('.refresh-icon');
    
    btn.classList.add('refreshing');
    
    await loadCourses(true, true); // Enable retry for manual refresh
    
    setTimeout(() => {
        btn.classList.remove('refreshing');
    }, 600);
});

// PDF Export
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    // Title
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246);
    doc.text('EWU Course Schedule', doc.internal.pageSize.width / 2, 20, { align: 'center' });

    // User info
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Student ID: ' + currentUserId, 14, 30);
    doc.text('Generated: ' + document.getElementById('currentTime').textContent, 14, 37);

    // Prepare table data
    const tableData = filteredCourses.map(course => {
        const available = course.SeatCapacity - course.SeatTaken;
        const { day, time } = parseDayTime(course.TimeSlotName);
        
        return [
            course.CourseCode,
            course.SectionName,
            course.ShortName,
            course.SeatCapacity,
            course.SeatTaken,
            available,
            day,
            time,
            course.RoomName
        ];
    });

    // Add table
    doc.autoTable({
        head: [['Course Code', 'Section', 'Faculty', 'Capacity', 'Taken', 'Available', 'Day', 'Time', 'Room']],
        body: tableData,
        startY: 45,
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 18 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 35 },
            7: { cellWidth: 30 },
            8: { cellWidth: 22 }
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250]
        }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save('EWU_Courses_' + new Date().toISOString().slice(0, 10) + '.pdf');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    const isAuthenticated = await checkAuth();
    
    if (isAuthenticated) {
        // Load courses after successful auth check
        loadCourses();
    }
});

