/**
 * ============================================
 * EWU COURSE FILTER V2 - MAIN JAVASCRIPT
 * ============================================
 * 
 * Updated to use Worker API endpoints under /V2/api/*
 * All requests use credentials: 'include' for cookie-based authentication
 */

// ===== CONFIGURATION =====
const API_BASE_URL = 'https://api.aftabkabir.me/V2/api';

// ===== GLOBAL ERROR HANDLER =====

/**
 * Global error handler - redirects to error page
 */
function handleGlobalError(errorCode, details = '', fromPage = '') {
    console.error('Global error:', errorCode, details, fromPage);
    alert('An error occurred: ' + details);
}

/**
 * Check if user is trying to access restricted pages
 */
function checkPageAccess() {
    const restrictedPaths = ['/api/', '/logs/', '/worker/'];
    const currentPath = window.location.pathname;

    for (const path of restrictedPaths) {
        if (currentPath.includes(path)) {
            handleGlobalError('403', 'This page is restricted', currentPath);
            return false;
        }
    }
    return true;
}

// Run access check on page load
window.addEventListener('DOMContentLoaded', checkPageAccess);

// ===== UTILITY FUNCTIONS =====

/**
 * Display error message to user
 */
function showError(message, elementId = 'error-message') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

/**
 * Display success message to user
 */
function showSuccess(message, elementId = 'success-message') {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.remove('hidden');
    }
}

/**
 * Hide message elements
 */
function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

/**
 * Show loading spinner
 */
function showSpinner(elementId = 'loading-spinner') {
    const spinner = document.getElementById(elementId);
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

/**
 * Hide loading spinner
 */
function hideSpinner(elementId = 'loading-spinner') {
    const spinner = document.getElementById(elementId);
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

// ===== LOGIN PAGE FUNCTIONS =====

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();

    const userId = document.getElementById('user-id').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    const spinner = document.getElementById('login-spinner');

    // Clear previous messages
    hideMessage('error-message');
    hideMessage('success-message');

    // Validate inputs
    if (!userId || !password) {
        showError('Please enter both User ID and Password', 'error-message');
        return;
    }

    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.classList.add('loading-state');
    if (spinner) {
        spinner.classList.remove('hidden');
    }

    try {
        // Send POST request to login API with retry logic
        const result = await fetchWithRetry(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({
                username: userId,
                password: password
            })
        }, 'Logging in to EWU Portal');

        const data = result.data;

        // Hide spinner
        if (spinner) {
            spinner.classList.add('hidden');
        }

        // Check response status
        if (data.status === 'success') {
            // Show success message
            showSuccess('Login successful! Redirecting...', 'success-message');

            // Redirect to courses page after brief delay
            setTimeout(() => {
                window.location.href = 'courses.html';
            }, 1000);
        } else {
            // Show error message
            showError(data.message || 'Login failed. Please try again.', 'error-message');

            // Re-enable button
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading-state');
        }

    } catch (error) {
        // Hide spinner
        if (spinner) {
            spinner.classList.add('hidden');
        }

        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading-state');

        const errorMsg = error.message || '';

        // Check if cancelled by user
        if (errorMsg === 'Cancelled by user') {
            showError('Login cancelled', 'error-message');
        } else {
            // Show error message
            showError(errorMsg || 'Connection error. Please try again.', 'error-message');
            console.error('Login error:', error);
        }
    }
}

// ===== LOGOUT FUNCTION =====

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Redirect anyway
        window.location.href = 'login.html';
    }
}

// Make logout available globally
window.handleLogout = handleLogout;

// ===== DASHBOARD PAGE FUNCTIONS =====

/**
 * Load department and semester options from API
 */
async function loadDashboardOptions() {
    console.log('Loading dashboard options...');

    const spinner = document.getElementById('options-loading-spinner');
    const deptSelect = document.getElementById('department-select');
    const semSelect = document.getElementById('semester-select');
    const fetchBtn = document.getElementById('fetch-courses-btn');

    // Show loading spinner
    if (spinner) {
        spinner.classList.remove('hidden');
    }

    try {
        // Call fetchOptions API with retry logic
        const result = await fetchWithRetry(`${API_BASE_URL}/options`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        }, 'Fetching Department & Semester Options');

        const data = result.data;

        // Hide spinner
        if (spinner) {
            spinner.classList.add('hidden');
        }

        // Check response status
        if (data.status === 'success') {
            // Populate dropdowns
            populateDepartments(data.departments);
            populateSemesters(data.semesters);

            // Enable dropdowns and button
            if (deptSelect) deptSelect.disabled = false;
            if (semSelect) semSelect.disabled = false;
            if (fetchBtn) fetchBtn.disabled = false;

            console.log('Options loaded successfully');
        } else {
            // Show error message
            showError(data.message || 'Failed to load options. Please try logging in again.', 'error-message');

            // Update dropdown placeholders
            if (deptSelect) {
                deptSelect.innerHTML = '<option value="">Failed to load</option>';
            }
            if (semSelect) {
                semSelect.innerHTML = '<option value="">Failed to load</option>';
            }
        }

    } catch (error) {
        // Hide spinner
        if (spinner) {
            spinner.classList.add('hidden');
        }

        // Check if cancelled by user
        if (error.message === 'Cancelled by user') {
            console.log('Options fetch cancelled by user');
        } else {
            // Show connection error
            showError('Connection error. Please check your internet or log in again.', 'error-message');
            console.error('Dashboard options error:', error);
        }

        // Update dropdown placeholders
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">Error loading</option>';
        }
        if (semSelect) {
            semSelect.innerHTML = '<option value="">Error loading</option>';
        }
    }
}

/**
 * Trim "Department of " prefix from department name
 */
function trimDepartmentPrefix(deptName) {
    if (!deptName) return deptName;
    return deptName.replace(/^Department of /i, '').trim();
}

/**
 * Populate department dropdown with fetched data
 */
function populateDepartments(departments) {
    const select = document.getElementById('department-select');
    if (!select) return;

    // Clear existing options
    select.innerHTML = '<option value="">-- Select Department --</option>';

    // Add departments from API
    if (departments && departments.length > 0) {
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.AcademicDepartmentId;
            option.textContent = trimDepartmentPrefix(dept.AcademicDepartmentName);
            select.appendChild(option);
        });

        console.log(`Loaded ${departments.length} departments`);
    } else {
        select.innerHTML = '<option value="">No departments available</option>';
    }
}

/**
 * Populate semester dropdown with fetched data
 */
function populateSemesters(semesters) {
    const select = document.getElementById('semester-select');
    if (!select) return;

    // Clear existing options
    select.innerHTML = '<option value="">-- Select Semester --</option>';

    // Add semesters from API
    if (semesters && semesters.length > 0) {
        semesters.forEach(sem => {
            const option = document.createElement('option');
            option.value = sem.SemesterId;
            option.textContent = sem.SemesterName;
            select.appendChild(option);
        });

        console.log(`Loaded ${semesters.length} semesters`);
    } else {
        select.innerHTML = '<option value="">No semesters available</option>';
    }
}

/**
 * Handle fetch courses button click
 */
function handleFetchCourses() {
    const deptSelect = document.getElementById('department-select');
    const semSelect = document.getElementById('semester-select');

    const departmentId = deptSelect ? deptSelect.value : '';
    const semesterId = semSelect ? semSelect.value : '';

    // Get selected text (names) for display
    const departmentName = deptSelect ? deptSelect.options[deptSelect.selectedIndex].text : '';
    const semesterName = semSelect ? semSelect.options[semSelect.selectedIndex].text : '';

    // Clear previous messages
    hideMessage('error-message');

    // Validate selections
    if (!departmentId || !semesterId) {
        showError('Please select both department and semester', 'error-message');
        return;
    }

    // Store selections in sessionStorage
    sessionStorage.setItem('selectedDepartmentId', departmentId);
    sessionStorage.setItem('selectedDepartmentName', departmentName);
    sessionStorage.setItem('selectedSemesterId', semesterId);
    sessionStorage.setItem('selectedSemesterName', semesterName);

    console.log('Selections stored:', { departmentId, semesterId });

    // Show success message
    showSuccess('Loading courses...', 'success-message');

    // Hide initial section and show courses section
    const initialSection = document.getElementById('initial-selection');
    const coursesSection = document.getElementById('courses-section');

    if (initialSection) {
        initialSection.classList.add('hidden');
    }
    if (coursesSection) {
        coursesSection.classList.remove('hidden');
    }

    // Load filter dropdowns and courses
    loadCoursesFilters().then(() => {
        loadCourses();
    });
}

// ===== COURSES PAGE FUNCTIONS =====

// Global variables for courses page
let allCourses = [];
let searchTags = [];
let availableDepartments = [];
let availableSemesters = [];

// Day code mapping
const DAY_CODES = {
    'A': 'SATURDAY',
    'S': 'SUNDAY',
    'M': 'MONDAY',
    'T': 'TUESDAY',
    'W': 'WEDNESDAY',
    'R': 'THURSDAY',
    'F': 'FRIDAY'
};

/**
 * Parse schedule string into days and time
 */
function parseSchedule(schedule) {
    if (!schedule || schedule === 'N/A') {
        return { days: 'TBA', time: 'TBA' };
    }

    const parts = schedule.trim().split(' ');

    if (parts.length === 0) {
        return { days: 'TBA', time: 'TBA' };
    }

    // First part is day codes
    const dayCodesStr = parts[0];
    const dayCodeChars = dayCodesStr.split('');

    // Convert day codes to full names
    const dayNames = dayCodeChars
        .map(code => DAY_CODES[code] || code)
        .filter(day => day.length > 1);

    const days = dayNames.length > 0 ? dayNames.join(', ') : 'TBA';

    // Remaining parts form the time
    const time = parts.slice(1).join(' ') || 'TBA';

    return { days, time };
}

/**
 * Load departments and semesters for filter dropdowns
 */
async function loadCoursesFilters() {
    try {
        const result = await fetchWithRetry(`${API_BASE_URL}/options`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        }, 'Loading Filter Options');
        const data = result.data;

        if (data.status === 'success') {
            availableDepartments = data.departments || [];
            availableSemesters = data.semesters || [];

            populateFilterDropdowns();
        }
    } catch (error) {
        if (error.message === 'Cancelled by user') {
            console.log('Filter options fetch cancelled by user');
        } else {
            console.error('Failed to load filter options:', error);
        }
    }

    return Promise.resolve();
}

/**
 * Populate department and semester filter dropdowns
 */
function populateFilterDropdowns() {
    const deptFilter = document.getElementById('dept-filter');
    const semFilter = document.getElementById('sem-filter');

    // Populate department filter
    if (deptFilter) {
        deptFilter.innerHTML = availableDepartments.map(dept =>
            `<option value="${dept.AcademicDepartmentId}">${trimDepartmentPrefix(dept.AcademicDepartmentName)}</option>`
        ).join('');

        // Set current selection
        const currentDeptId = sessionStorage.getItem('selectedDepartmentId');
        if (currentDeptId) {
            deptFilter.value = currentDeptId;
        }
    }

    // Populate semester filter
    if (semFilter) {
        semFilter.innerHTML = availableSemesters.map(sem =>
            `<option value="${sem.SemesterId}">${sem.SemesterName}</option>`
        ).join('');

        // Set current selection
        const currentSemId = sessionStorage.getItem('selectedSemesterId');
        if (currentSemId) {
            semFilter.value = currentSemId;
        }
    }
}

/**
 * Load and display courses from API
 */
async function loadCourses() {
    console.log('Loading courses...');

    // Get selected IDs from filters or sessionStorage
    const deptFilter = document.getElementById('dept-filter');
    const semFilter = document.getElementById('sem-filter');

    let departmentId = deptFilter ? deptFilter.value : sessionStorage.getItem('selectedDepartmentId');
    let semesterId = semFilter ? semFilter.value : sessionStorage.getItem('selectedSemesterId');

    // Validate selections exist
    if (!departmentId || !semesterId) {
        const tbody = document.getElementById('courses-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        Please select department and semester from the dropdowns above
                    </td>
                </tr>
            `;
        }
        return;
    }

    // Clear any previous error messages
    hideMessage('error-message');

    // Show loading spinner
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.remove('hidden');
    }

    try {
        // Call fetchCourses API with retry logic
        const result = await fetchWithRetry(`${API_BASE_URL}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({
                departmentId: departmentId,
                semesterId: semesterId
            })
        }, 'Fetching Courses from EWU Portal');

        const data = result.data;

        // Hide spinner
        if (spinner) {
            spinner.classList.add('hidden');
        }

        // Check response status
        if (data.status === 'success') {
            // Store courses globally and parse schedule for each
            allCourses = (data.courses || []).map(course => {
                const { days, time } = parseSchedule(course.TimeSlotName);
                return {
                    ...course,
                    Days: days,
                    Time: time
                };
            });

            // Apply all filters and display
            applyFiltersAndDisplay();

            console.log(`Loaded ${allCourses.length} courses successfully`);
        } else {
            // Show error message
            showError(data.message || 'Failed to load courses. Please try again.', 'error-message');

            const tbody = document.getElementById('courses-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 3rem; color: var(--error-color);">
                            ${data.message || 'Failed to load courses'}
                        </td>
                    </tr>
                `;
            }
        }

    } catch (error) {
        // Hide spinner
        if (spinner) {
            spinner.classList.add('hidden');
        }

        // Check if cancelled by user
        if (error.message === 'Cancelled by user') {
            console.log('Course fetch cancelled by user');
            const tbody = document.getElementById('courses-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                            Course fetch cancelled. Click "Fetch Courses" to try again.
                        </td>
                    </tr>
                `;
            }
        } else {
            // Show connection error
            showError('Connection error. Please check your internet or log in again.', 'error-message');
            console.error('Courses fetch error:', error);

            const tbody = document.getElementById('courses-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 3rem; color: var(--error-color);">
                            Connection error. Please try again.
                        </td>
                    </tr>
                `;
            }
        }
    }
}

/**
 * Apply all active filters and display results
 */
function applyFiltersAndDisplay() {
    let filteredCourses = [...allCourses];

    // Filter 1: Available seats only
    const availableOnlyToggle = document.getElementById('available-only-toggle');
    if (availableOnlyToggle && availableOnlyToggle.checked) {
        filteredCourses = filteredCourses.filter(course => course.SeatsLeft > 0);
    }

    // Filter 2: Multi-tag search
    if (searchTags.length > 0) {
        filteredCourses = filteredCourses.filter(course => {
            const searchString = [
                course.CourseCode,
                course.Section,
                course.ShortName,
                course.Days,
                course.Time,
                course.RoomCode
            ].join(' ').toLowerCase();

            return searchTags.some(tag =>
                searchString.includes(tag.toLowerCase())
            );
        });
    }

    // Sort courses
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        const sortBy = sortFilter.value;
        filteredCourses = sortCourses(filteredCourses, sortBy);
    }

    // Display filtered and sorted courses
    displayCourses(filteredCourses);

    // Update stats
    updateStats(filteredCourses.length, allCourses.length);
}

/**
 * Sort courses by specified criterion
 */
function sortCourses(courses, sortBy) {
    const sorted = [...courses];

    switch (sortBy) {
        case 'code':
            sorted.sort((a, b) => a.CourseCode.localeCompare(b.CourseCode));
            break;
        case 'seats-left':
            sorted.sort((a, b) => b.SeatsLeft - a.SeatsLeft);
            break;
        case 'name':
            sorted.sort((a, b) => a.ShortName.localeCompare(b.ShortName));
            break;
        case 'time':
            sorted.sort((a, b) => a.Time.localeCompare(b.Time));
            break;
    }

    return sorted;
}

/**
 * Display courses in table
 */
function displayCourses(courses) {
    const tbody = document.getElementById('courses-table-body');
    if (!tbody) return;

    // Clear table
    tbody.innerHTML = '';

    // Check if courses array is empty
    if (!courses || courses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    No courses found matching your filters.
                </td>
            </tr>
        `;
        return;
    }

    // Add each course as a table row
    courses.forEach(course => {
        const row = document.createElement('tr');

        // Calculate seats display
        const seatsDisplay = `${course.SeatTaken}/${course.SeatCapacity}`;
        const seatsLeft = course.SeatsLeft;

        // Color code seats left
        let seatsColor = 'var(--success-color)';
        if (seatsLeft === 0) {
            seatsColor = 'var(--error-color)';
        } else if (seatsLeft < 5) {
            seatsColor = '#f59e0b';
        }

        // Clean course code for display
        const cleanCode = cleanCourseCode(course.CourseCode);

        row.innerHTML = `
            <td><strong>${cleanCode}</strong></td>
            <td>${course.Section}</td>
            <td>${course.ShortName}</td>
            <td>${seatsDisplay}</td>
            <td style="color: ${seatsColor}; font-weight: 600;">${seatsLeft}</td>
            <td>${course.Days}</td>
            <td>${course.Time}</td>
            <td>${course.RoomCode}</td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Update visible and total course counts
 */
function updateStats(visibleCount, totalCount) {
    const visibleEl = document.getElementById('visible-count');
    const totalEl = document.getElementById('total-count');

    if (visibleEl) visibleEl.textContent = visibleCount;
    if (totalEl) totalEl.textContent = totalCount;
}

/**
 * Clean course code by removing faculty initials
 */
function cleanCourseCode(courseCode) {
    if (!courseCode) return courseCode;
    return courseCode.split('-')[0].trim();
}

/**
 * Multi-tag search - Show suggestions as user types
 */
function showSearchSuggestions() {
    const searchInput = document.getElementById('search-input');
    const suggestionsEl = document.getElementById('search-suggestions');

    if (!searchInput || !suggestionsEl) return;

    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        suggestionsEl.classList.add('hidden');
        return;
    }

    // Find matching courses and collect unique course codes
    const uniqueCourses = new Map();

    allCourses.forEach(course => {
        const cleanCode = cleanCourseCode(course.CourseCode);
        const searchString = [
            cleanCode,
            course.ShortName
        ].join(' ').toLowerCase();

        if (searchString.includes(query)) {
            if (!uniqueCourses.has(cleanCode)) {
                uniqueCourses.set(cleanCode, {
                    code: cleanCode,
                    name: course.ShortName
                });
            }
        }
    });

    // Convert to array and limit to 5
    const matches = Array.from(uniqueCourses.values()).slice(0, 5);

    // Display suggestions
    if (matches.length > 0) {
        suggestionsEl.innerHTML = matches
            .map(course => {
                return `
                    <div class="suggestion-item" data-tag="${course.code}">
                        <strong>${course.code}</strong> - ${course.name}
                    </div>
                `;
            })
            .join('');
        suggestionsEl.classList.remove('hidden');
    } else {
        suggestionsEl.classList.add('hidden');
    }
}

/**
 * Add a search tag
 */
function addSearchTag(tagText) {
    if (!tagText || searchTags.includes(tagText)) return;

    searchTags.push(tagText);
    renderSearchTags();
    applyFiltersAndDisplay();

    // Clear input and hide suggestions
    const searchInput = document.getElementById('search-input');
    const suggestionsEl = document.getElementById('search-suggestions');
    if (searchInput) searchInput.value = '';
    if (suggestionsEl) suggestionsEl.classList.add('hidden');
}

/**
 * Remove a search tag
 */
function removeSearchTag(tagText) {
    searchTags = searchTags.filter(tag => tag !== tagText);
    renderSearchTags();
    applyFiltersAndDisplay();
}

// Make removeSearchTag available globally
window.removeSearchTag = removeSearchTag;

/**
 * Render search tags UI
 */
function renderSearchTags() {
    const tagsContainer = document.getElementById('search-tags');
    if (!tagsContainer) return;

    tagsContainer.innerHTML = searchTags
        .map(tag => `
            <div class="search-tag">
                <span>${tag}</span>
                <span class="search-tag-remove" onclick="removeSearchTag('${tag}')">×</span>
            </div>
        `)
        .join('');
}

/**
 * Refresh courses table
 */
function refreshCourses() {
    console.log('Refreshing courses...');

    const refreshBtn = document.getElementById('refresh-btn');

    // Add rotating animation
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
    }

    // Show success message
    showSuccess('Refreshing courses...', 'success-message');

    // Hide message after brief delay
    setTimeout(() => {
        hideMessage('success-message');
    }, 1000);

    // Reload courses
    loadCourses();

    // Remove animation after load completes
    setTimeout(() => {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
        }
    }, 2500);
}

/**
 * Export currently visible courses to PDF
 */
function exportToPDF() {
    console.log('Exporting to PDF...');

    try {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            alert('PDF library not loaded. Please refresh the page and try again.');
            return;
        }

        // Get currently visible courses
        let coursesToExport = [...allCourses];

        // Apply same filters as display
        const availableOnlyToggle = document.getElementById('available-only-toggle');
        if (availableOnlyToggle && availableOnlyToggle.checked) {
            coursesToExport = coursesToExport.filter(course => course.SeatsLeft > 0);
        }

        if (searchTags.length > 0) {
            coursesToExport = coursesToExport.filter(course => {
                const searchString = [
                    course.CourseCode,
                    course.Section,
                    course.ShortName,
                    course.Days,
                    course.Time,
                    course.RoomCode
                ].join(' ').toLowerCase();
                return searchTags.some(tag => searchString.includes(tag.toLowerCase()));
            });
        }

        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            coursesToExport = sortCourses(coursesToExport, sortFilter.value);
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

        // Get filter info
        const deptFilter = document.getElementById('dept-filter');
        const semFilter = document.getElementById('sem-filter');
        let deptName = deptFilter ? deptFilter.options[deptFilter.selectedIndex].text : 'Unknown';
        const semName = semFilter ? semFilter.options[semFilter.selectedIndex].text : 'Unknown';

        deptName = trimDepartmentPrefix(deptName);

        // Add title
        doc.setFontSize(18);
        doc.text('EWU Course Listings V2', 14, 15);

        // Add filter info
        doc.setFontSize(11);
        doc.text(`Department: ${deptName}`, 14, 22);
        doc.text(`Semester: ${semName}`, 14, 28);
        doc.text(`Showing: ${coursesToExport.length} of ${allCourses.length} courses`, 14, 34);

        // Add active filters
        let yPos = 40;
        if (availableOnlyToggle && availableOnlyToggle.checked) {
            doc.text('Filter: Available Seats Only', 14, yPos);
            yPos += 6;
        }
        if (searchTags.length > 0) {
            doc.text(`Search Tags: ${searchTags.join(', ')}`, 14, yPos);
            yPos += 6;
        }

        // Add generation date
        const date = new Date().toLocaleString();
        doc.setFontSize(9);
        doc.text(`Generated: ${date}`, 14, yPos);

        // Prepare table data
        const tableData = coursesToExport.map(course => {
            const cleanCode = cleanCourseCode(course.CourseCode);
            return [
                cleanCode,
                course.Section,
                course.ShortName,
                `${course.SeatTaken}/${course.SeatCapacity}`,
                course.SeatsLeft,
                course.Days,
                course.Time,
                course.RoomCode
            ];
        });

        // Generate table
        doc.autoTable({
            startY: yPos + 5,
            head: [['Code', 'Sec', 'Course Name', 'Seats(T/C)', 'Left', 'Days', 'Time', 'Room']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [108, 99, 255],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 8
            },
            alternateRowStyles: {
                fillColor: [240, 240, 245]
            },
            columnStyles: {
                2: { cellWidth: 'auto' },
                5: { cellWidth: 'auto' },
                6: { cellWidth: 'auto' }
            }
        });

        // Generate filename
        const fileName = `EWU_Courses_V2_${deptName.replace(/\s+/g, '_')}_${semName.replace(/\s+/g, '_')}.pdf`;

        // Save PDF
        doc.save(fileName);

        // Show success message
        showSuccess('PDF exported successfully!', 'success-message');
        setTimeout(() => {
            hideMessage('success-message');
        }, 2000);

        console.log('PDF exported:', fileName);

    } catch (error) {
        console.error('PDF export error:', error);
        showError('Failed to export PDF. Please try again.', 'error-message');
    }
}

/**
 * Handle the merged courses page flow
 */
function handleMergedCoursesPage() {
    const initialSection = document.getElementById('initial-selection');
    const coursesSection = document.getElementById('courses-section');
    const fetchBtn = document.getElementById('fetch-courses-btn');

    // Load initial options
    loadDashboardOptions();

    // Handle fetch button click
    if (fetchBtn) {
        fetchBtn.addEventListener('click', handleFetchCourses);
    }
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', function () {
    // Password toggle functionality
    const passwordToggle = document.getElementById('password-toggle');
    const passwordInput = document.getElementById('password');

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const eyeIcon = passwordToggle.querySelector('.eye-icon');
            const eyeOffIcon = passwordToggle.querySelector('.eye-off-icon');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.classList.add('hidden');
                eyeOffIcon.classList.remove('hidden');
            } else {
                passwordInput.type = 'password';
                eyeIcon.classList.remove('hidden');
                eyeOffIcon.classList.add('hidden');
            }
        });
    }

    // Student ID Auto-Formatting (YYYY-S-XX-XXX)
    const userIdInput = document.getElementById('user-id');

    if (userIdInput) {
        userIdInput.addEventListener('input', function (e) {
            let value = e.target.value;

            // Remove all non-digit characters
            let digits = value.replace(/\D/g, '');

            // Limit to 10 digits max
            if (digits.length > 10) {
                digits = digits.substring(0, 10);
            }

            // Format: YYYY-S-XX-XXX
            let formatted = '';

            if (digits.length > 0) {
                formatted = digits.substring(0, 4); // YYYY
            }
            if (digits.length >= 5) {
                formatted += '-' + digits.substring(4, 5); // -S
            }
            if (digits.length >= 6) {
                formatted += '-' + digits.substring(5, 7); // -XX
            }
            if (digits.length >= 8) {
                formatted += '-' + digits.substring(7, 10); // -XXX
            }

            // Update the input value
            e.target.value = formatted;
        });

        // Handle paste events
        userIdInput.addEventListener('paste', function (e) {
            setTimeout(function () {
                userIdInput.dispatchEvent(new Event('input'));
            }, 10);
        });
    }

    // Hamburger menu toggle
    const checkbox = document.getElementById('checkbox');
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerLabel = document.getElementById('hamburger-label');

    if (checkbox && mobileMenu) {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                mobileMenu.classList.remove('hidden');
            } else {
                mobileMenu.classList.add('hidden');
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (hamburgerLabel && !hamburgerLabel.contains(e.target) && !mobileMenu.contains(e.target) && !checkbox.contains(e.target)) {
                checkbox.checked = false;
                mobileMenu.classList.add('hidden');
            }
        });

        // Close menu when clicking a link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                checkbox.checked = false;
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // Floating action buttons
    const floatingRefresh = document.getElementById('floating-refresh');
    const scrollToTop = document.getElementById('scroll-to-top');

    // Floating refresh button
    if (floatingRefresh) {
        floatingRefresh.addEventListener('click', () => {
            floatingRefresh.classList.add('refreshing');
            refreshCourses();
            setTimeout(() => {
                floatingRefresh.classList.remove('refreshing');
            }, 2500);
        });
    }

    // Scroll to top functionality
    if (scrollToTop) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollToTop.classList.add('visible');
                scrollToTop.classList.remove('hidden');
            } else {
                scrollToTop.classList.remove('visible');
                setTimeout(() => {
                    if (!scrollToTop.classList.contains('visible')) {
                        scrollToTop.classList.add('hidden');
                    }
                }, 300);
            }
        });

        scrollToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Check which page we're on and initialize accordingly
    const currentPage = window.location.pathname.split('/').pop();

    // Login page
    if (currentPage.includes('login')) {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }

    // Courses page
    if (currentPage.includes('courses')) {
        handleMergedCoursesPage();

        // Department filter change
        const deptFilter = document.getElementById('dept-filter');
        if (deptFilter) {
            deptFilter.addEventListener('change', () => {
                loadCourses();
            });
        }

        // Semester filter change
        const semFilter = document.getElementById('sem-filter');
        if (semFilter) {
            semFilter.addEventListener('change', () => {
                loadCourses();
            });
        }

        // Sort filter change
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', applyFiltersAndDisplay);
        }

        // Available only toggle
        const availableToggle = document.getElementById('available-only-toggle');
        if (availableToggle) {
            availableToggle.addEventListener('change', applyFiltersAndDisplay);
        }

        // Multi-tag search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', showSearchSuggestions);

            // Add tag on Enter key
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = searchInput.value.trim();
                    if (query) {
                        addSearchTag(query);
                    }
                }
            });
        }

        // Click on suggestion to add as tag
        document.addEventListener('click', (e) => {
            if (e.target.closest('.suggestion-item')) {
                const tag = e.target.closest('.suggestion-item').dataset.tag;
                addSearchTag(tag);
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.search-container');
            const suggestionsEl = document.getElementById('search-suggestions');
            if (searchContainer && !searchContainer.contains(e.target)) {
                if (suggestionsEl) {
                    suggestionsEl.classList.add('hidden');
                }
            }
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshCourses);
        }

        // Export PDF button
        const exportBtn = document.getElementById('export-pdf-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportToPDF);
        }
    }
});

