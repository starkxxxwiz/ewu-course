<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_logged_in']) || $_SESSION['user_logged_in'] !== true) {
    header('Location: login.php');
    exit;
}

$user_id = $_SESSION['user_id'] ?? 'User';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EWU Course Schedule</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/styles.css">
    
    <script>
    tailwind.config = {
        darkMode: 'class',
        theme: {
            extend: {
                colors: {
                    dark: {
                        950: '#0a0a0f',
                        900: '#0f0f1a',
                        800: '#1a1a2e',
                        700: '#16213e',
                        600: '#0f3460',
                    }
                },
                fontFamily: {
                    'inter': ['Inter', 'sans-serif'],
                }
            }
        }
    }
    </script>
</head>

<body class="text-white min-h-screen">
    <!-- Navigation -->
    <nav class="glass-card sticky top-0 z-50 mb-8">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-xl">
                        <i class="fas fa-graduation-cap text-cyan-400 text-xl"></i>
                    </div>
                    <span class="text-xl font-bold">EWU Courses</span>
                </div>
                <!-- Desktop Navigation -->
                <div class="hidden md:flex gap-4">
                    <a href="index.php" class="text-gray-300 hover:text-white transition-colors">Home</a>
                    <a href="documentation.php" class="text-gray-300 hover:text-white transition-colors">Documentation</a>
                    <a href="learn-more.php" class="text-gray-300 hover:text-white transition-colors">Learn More</a>
                    <a href="advise.php" class="text-cyan-400 font-medium">Dashboard</a>
                    <a href="logout.php" class="text-red-400 hover:text-red-300 transition-colors">
                        <i class="fas fa-sign-out-alt mr-1"></i>Logout
                    </a>
                </div>
                <!-- Mobile Menu Button -->
                <button id="mobileMenuBtn" class="md:hidden text-white text-2xl focus:outline-none">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
            <!-- Mobile Menu -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 pb-4 space-y-3">
                <a href="index.php" class="block text-gray-300 hover:text-white transition-colors py-2">Home</a>
                <a href="documentation.php" class="block text-gray-300 hover:text-white transition-colors py-2">Documentation</a>
                <a href="learn-more.php" class="block text-gray-300 hover:text-white transition-colors py-2">Learn More</a>
                <a href="advise.php" class="block text-cyan-400 font-medium hover:text-cyan-300 transition-colors py-2">Dashboard</a>
                <a href="logout.php" class="block text-red-400 hover:text-red-300 transition-colors py-2">
                    <i class="fas fa-sign-out-alt mr-1"></i>Logout
                </a>
            </div>
        </div>
    </nav>

    <div class="container mx-auto px-4 py-8 max-w-[1600px]">
        
        <!-- Header -->
        <div class="glass-card rounded-2xl p-6 mb-8 fade-in">
            <div class="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div class="text-center lg:text-left">
                    <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                        EWU Course Schedule
                    </h1>
                    <p class="text-gray-400 text-sm">
                        <i class="fas fa-user mr-2"></i>Welcome, <span class="text-blue-400 font-semibold"><?php echo htmlspecialchars($user_id); ?></span>
                        <span class="mx-3">•</span>
                        <i class="fas fa-clock mr-2"></i><span id="currentTime">Loading...</span>
                    </p>
                </div>
                <div class="flex flex-wrap gap-3 justify-center">
                    <button onclick="exportToPDF()" class="btn-primary px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 text-sm">
                        <i class="fas fa-file-pdf"></i>
                        Export PDF
                    </button>
                    <button onclick="window.location.href='logout.php'" class="btn-secondary px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 text-sm">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </div>
            </div>
        </div>

        <!-- Filters Section -->
        <div class="glass-card rounded-2xl p-6 mb-8 fade-in filters-section">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Enhanced Search -->
                <div class="lg:col-span-2 relative">
                    <label class="block text-sm font-medium text-blue-300 mb-3">
                        <i class="fas fa-search mr-2"></i>Search Courses
                    </label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="searchInput" 
                            placeholder="Search by course code, faculty, room, or time..." 
                            class="glass-input w-full px-5 py-3.5 rounded-xl text-white placeholder-gray-500 outline-none text-base"
                            autocomplete="off"
                        >
                        <div id="searchSuggestions" class="absolute w-full mt-2 glass-card rounded-xl shadow-2xl hidden search-suggestions" style="z-index: 100;">
                        </div>
                    </div>
                </div>

                <!-- Course Filter & Sort -->
                <div class="grid grid-cols-2 gap-4">
                    <!-- Course Filter -->
                <div>
                        <label class="block text-sm font-medium text-blue-300 mb-3">
                            <i class="fas fa-filter mr-2"></i>Course
                    </label>
                        <div class="relative">
                            <button type="button" id="courseFilterBtn" class="glass-input w-full px-4 py-3.5 rounded-xl text-white outline-none text-sm flex items-center justify-between">
                                <span id="courseFilterText">All</span>
                                <i class="fas fa-chevron-down text-xs"></i>
                            </button>
                            <div id="courseFilterDropdown" class="absolute w-full mt-2 glass-card rounded-xl shadow-2xl hidden" style="min-width: 250px; z-index: 95;">
                                <div class="p-3 border-b border-blue-500/20">
                                    <input type="text" id="courseFilterSearch" placeholder="Search..." 
                                        class="glass-input w-full px-3 py-2 rounded-lg text-white text-sm outline-none">
                            </div>
                                <div id="courseFilterOptions" class="max-h-64 overflow-y-auto p-2">
                                    <!-- Will be populated dynamically -->
                        </div>
                </div>
            </div>
        </div>

                    <!-- Sort By -->
                    <div>
                        <label class="block text-sm font-medium text-blue-300 mb-3">
                            <i class="fas fa-sort mr-2"></i>Sort By
                        </label>
                        <select id="sortSelect" class="glass-input w-full px-4 py-3.5 rounded-xl text-white outline-none text-sm cursor-pointer">
                            <option value="default">Default</option>
                            <option value="az">A → Z (Faculty)</option>
                            <option value="za">Z → A (Faculty)</option>
                            <option value="seats">Seat Availability (High → Low)</option>
                        </select>
            </div>
                </div>
            </div>

            <!-- Toggle Options -->
            <div class="flex flex-wrap gap-6 mt-6 pt-6 border-t border-blue-500/20">
                <label class="flex items-center gap-3 cursor-pointer group">
                    <div class="relative">
                        <input type="checkbox" id="availableOnly" class="sr-only">
                        <div class="w-12 h-6 bg-gray-700 rounded-full transition-all duration-300" id="toggleBg1"></div>
                        <div class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300" id="toggleKnob1"></div>
                </div>
                    <span class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        <i class="fas fa-check-circle mr-2 text-green-400"></i>Show Available Only
                    </span>
                </label>
            </div>
        </div>

        <!-- Course Table -->
        <div class="glass-card rounded-2xl p-6 fade-in table-section">
            <div class="overflow-x-auto table-container">
                <table class="w-full" id="courseTable">
                    <thead>
                        <tr class="border-b border-blue-500/20">
                            <th class="py-4 px-4 text-left font-semibold text-blue-300 text-sm">Course Code</th>
                            <th class="py-4 px-4 text-left font-semibold text-blue-300 text-sm">Section</th>
                            <th class="py-4 px-4 text-left font-semibold text-blue-300 text-sm">Faculty</th>
                            <th class="py-4 px-4 text-center font-semibold text-blue-300 text-sm">Capacity</th>
                            <th class="py-4 px-4 text-center font-semibold text-blue-300 text-sm">Taken</th>
                            <th class="py-4 px-4 text-center font-semibold text-blue-300 text-sm">Available</th>
                            <th class="py-4 px-4 text-left font-semibold text-blue-300 text-sm">Day</th>
                            <th class="py-4 px-4 text-left font-semibold text-blue-300 text-sm">Time</th>
                            <th class="py-4 px-4 text-left font-semibold text-blue-300 text-sm">Room</th>
                        </tr>
                    </thead>
                    <tbody id="courseTableBody">
                        <!-- Loading skeleton -->
                        <tr class="table-row">
                            <td colspan="9" class="py-8 text-center">
                                <i class="fas fa-spinner fa-spin text-3xl text-blue-400"></i>
                                <p class="text-gray-400 mt-3">Loading courses...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Fixed Refresh Button -->
    <div class="refresh-btn" id="refreshBtn" title="Refresh courses">
        <i class="fas fa-sync-alt text-white text-xl refresh-icon"></i>
    </div>

    <!-- Toast Notification -->
    <div class="toast-notification" id="toastNotification">
        <i class="fas fa-check-circle toast-icon"></i>
        <span class="toast-message" id="toastMessage">Refreshed Successfully</span>
    </div>

    <script>
        let allCourses = [];
        let filteredCourses = [];
        let selectedCourseFilter = null;
        let currentSort = 'default';
        let currentSearch = '';
        let scrollPosition = 0;

        // Day abbreviation mapping
        const dayMapping = {
            'A': 'SATURDAY',
            'S': 'SUNDAY',
            'M': 'MONDAY',
            'T': 'TUESDAY',
            'W': 'WEDNESDAY',
            'R': 'THURSDAY'
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

        // Load courses via AJAX
        async function loadCourses(maintainScroll = false) {
            if (maintainScroll) {
                scrollPosition = window.pageYOffset;
            }

            try {
                const response = await fetch('api_courses.php');
                
                if (response.status === 401) {
                    window.location.href = 'login.php';
                    return;
                }

                const data = await response.json();
                
                if (data.error) {
                    console.error('Error loading courses:', data.error);
                    return;
                }

                allCourses = data;
                populateCourseFilter();
                applyFilters();

                if (maintainScroll) {
                    setTimeout(() => window.scrollTo(0, scrollPosition), 50);
                }
            } catch (error) {
                console.error('Error loading courses:', error);
                document.getElementById('courseTableBody').innerHTML = `
                    <tr class="table-row">
                        <td colspan="9" class="py-8 text-center text-red-400">
                            <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                            <p>Failed to load courses. Please try again.</p>
                        </td>
                    </tr>
                `;
            }
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
        document.getElementById('searchInput').addEventListener('input', function(e) {
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
        document.getElementById('sortSelect').addEventListener('change', function(e) {
            currentSort = e.target.value;
            applyFilters();
        });

        // Available only toggle
        document.getElementById('availableOnly').addEventListener('change', function() {
            document.getElementById('toggleKnob1').style.transform = this.checked ? 'translateX(24px)' : 'translateX(0)';
            document.getElementById('toggleBg1').style.backgroundColor = this.checked ? '#10b981' : '#374151';
            applyFilters();
        });

        // Course filter dropdown toggle
        document.getElementById('courseFilterBtn').addEventListener('click', function() {
            document.getElementById('courseFilterDropdown').classList.toggle('hidden');
        });

        // Course filter search
        document.getElementById('courseFilterSearch').addEventListener('input', function(e) {
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
                document.getElementById('courseFilterDropdown').classList.add('hidden');
            }
            if (!e.target.closest('#searchInput') && !e.target.closest('#searchSuggestions')) {
                document.getElementById('searchSuggestions').classList.add('hidden');
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

        // Refresh button with AJAX and toast notification
        document.getElementById('refreshBtn').addEventListener('click', async function() {
            const btn = this;
            const icon = this.querySelector('.refresh-icon');
            
            btn.classList.add('refreshing');
            
            await loadCourses(true);
            
            setTimeout(() => {
                btn.classList.remove('refreshing');
                showToast('Refreshed Successfully', 3000);
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
            doc.text('Student ID: <?php echo htmlspecialchars($user_id); ?>', 14, 30);
            doc.text('Generated: ' + document.getElementById('currentTime').textContent, 14, 37);

            // Prepare table data
            const tableData = filteredCourses.map(course => {
                const available = course.SeatCapacity - course.SeatTaken;
                const { day, time } = parseDayTime(course.TimeSlotName);
                
                return [
                    course.CourseCode,
                    course.SectionName, // Only section number, no "Sec" prefix
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

        // Initialize
        loadCourses();

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            });
        }
    </script>
</body>
</html>
