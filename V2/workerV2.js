/**
 * ============================================
 * EWU COURSE FILTER V2 - CLOUDFLARE WORKER
 * ============================================
 * 
 * Handles authentication, session management, and proxying to EWU portal
 * All routes begin with /V2/api/*
 */

// ===== CONFIGURATION =====
const CONFIG = {
    ALLOWED_ORIGIN: 'https://aftabkabir.me',
    PORTAL_BASE_URL: 'https://portal.ewubd.edu',
    SESSION_COOKIE_NAME: 'ASP.NET_SessionId',
    COOKIE_PATH: '/V2/api/',
    MAX_RETRIES: 3,
    TIMEOUT: 60000
};

// ===== CORS HEADERS =====
function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
    };
}

// ===== MAIN WORKER HANDLER =====
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders()
        });
    }
    
    // Route handling for /V2/api/* endpoints
    if (url.pathname.startsWith('/V2/api/')) {
        return handleApiRequest(request, url);
    }
    
    // Default response for non-API routes
    return new Response('Not Found', { status: 404 });
}

// ===== API ROUTE HANDLER =====
async function handleApiRequest(request, url) {
    const path = url.pathname;
    
    try {
        // Route to appropriate handler
        if (path === '/V2/api/login' && request.method === 'POST') {
            return await handleLogin(request);
        }
        
        if (path === '/V2/api/logout' && request.method === 'POST') {
            return await handleLogout(request);
        }
        
        if (path === '/V2/api/options' && request.method === 'GET') {
            return await handleFetchOptions(request);
        }
        
        if (path === '/V2/api/courses' && request.method === 'POST') {
            return await handleFetchCourses(request);
        }
        
        // Unknown route
        return jsonResponse({ 
            status: 'error', 
            message: 'Unknown API endpoint' 
        }, 404);
        
    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ 
            status: 'error', 
            message: 'Internal server error: ' + error.message 
        }, 500);
    }
}

// ===== LOGIN HANDLER =====
async function handleLogin(request) {
    try {
        const body = await request.json();
        const { username, password } = body;
        
        // Validate input
        if (!username || !password) {
            return jsonResponse({
                status: 'failed',
                message: 'Username and password are required'
            });
        }
        
        // STEP 1: Initial GET request to retrieve hidden values and session
        const getResponse = await fetch(CONFIG.PORTAL_BASE_URL + '/', {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Pragma': 'no-cache'
            }
        });
        
        if (!getResponse.ok) {
            throw new Error('Failed to connect to portal');
        }
        
        const html = await getResponse.text();
        
        // STEP 2: Parse hidden form values (FirstNo and SecondNo)
        const num1Match = html.match(/<input type="hidden" name="FirstNo" value="([^"]+)"/);
        const num2Match = html.match(/<input type="hidden" name="SecondNo" value="([^"]+)"/);
        
        if (!num1Match || !num2Match) {
            throw new Error('Failed to parse portal form values');
        }
        
        const num1 = num1Match[1];
        const num2 = num2Match[1];
        const sum = parseInt(num1) + parseInt(num2);
        
        // STEP 3: Parse ASP.NET session cookie
        const cookies = getResponse.headers.get('set-cookie') || '';
        const sessionMatch = cookies.match(/ASP\.NET_SessionId=([^;]+)/);
        
        if (!sessionMatch) {
            throw new Error('Failed to retrieve session cookie from portal');
        }
        
        const sessionId = sessionMatch[1];
        
        // STEP 4: Prepare POST data with user credentials
        const formData = new URLSearchParams();
        formData.append('Username', username);
        formData.append('Password', password);
        formData.append('Answer', sum.toString());
        formData.append('FirstNo', num1);
        formData.append('SecondNo', num2);
        
        // STEP 5: Submit login POST request
        const loginResponse = await fetch(CONFIG.PORTAL_BASE_URL + '/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': `ASP.NET_SessionId=${sessionId}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: formData.toString()
        });
        
        if (!loginResponse.ok) {
            throw new Error('Login request failed');
        }
        
        const loginHtml = await loginResponse.text();
        
        // STEP 6: Verify login success
        if (loginHtml.includes('View Profile')) {
            // Login successful - set session cookie
            const headers = {
                ...getCorsHeaders(),
                'Content-Type': 'application/json',
                'Set-Cookie': `${CONFIG.SESSION_COOKIE_NAME}=${sessionId}; Path=${CONFIG.COOKIE_PATH}; Secure; HttpOnly; SameSite=None; Max-Age=1800`
            };
            
            return new Response(JSON.stringify({
                status: 'success',
                message: 'Login successful'
            }), { status: 200, headers });
            
        } else if (loginHtml.includes('Username or password is incorrect')) {
            return jsonResponse({
                status: 'failed',
                message: 'Username or password is incorrect'
            });
            
        } else if (loginHtml.includes('Invalid answer')) {
            return jsonResponse({
                status: 'failed',
                message: 'Portal verification failed. Please try again.'
            });
            
        } else {
            return jsonResponse({
                status: 'failed',
                message: 'Could not determine login status. Please try again.'
            });
        }
        
    } catch (error) {
        console.error('Login error:', error);
        return jsonResponse({
            status: 'failed',
            message: error.message
        });
    }
}

// ===== LOGOUT HANDLER =====
async function handleLogout(request) {
    const headers = {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
        'Set-Cookie': `${CONFIG.SESSION_COOKIE_NAME}=; Path=${CONFIG.COOKIE_PATH}; Secure; HttpOnly; SameSite=None; Max-Age=0`
    };
    
    return new Response(JSON.stringify({
        status: 'success',
        message: 'Logged out successfully'
    }), { status: 200, headers });
}

// ===== FETCH OPTIONS HANDLER (Departments & Semesters) =====
async function handleFetchOptions(request) {
    try {
        // Get session cookie from request
        const sessionId = getSessionCookie(request);
        
        if (!sessionId) {
            return jsonResponse({
                status: 'error',
                message: 'Unauthorized. Please log in first.'
            }, 401);
        }
        
        // Build cookie string for API requests
        const cookieString = `ASP.NET_SessionId=${sessionId}; perf_dv6Tr4n=1`;
        
        const headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            'referer': 'https://portal.ewubd.edu/Home/OfferedCoursesStudent',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'cookie': cookieString
        };
        
        // Fetch departments
        const deptResponse = await fetch(
            CONFIG.PORTAL_BASE_URL + '/api/utility/GetAllAcademicDepartments',
            { headers }
        );
        
        if (!deptResponse.ok) {
            throw new Error('Failed to fetch departments');
        }
        
        const departments = await deptResponse.json();
        
        // Fetch semesters
        const semResponse = await fetch(
            CONFIG.PORTAL_BASE_URL + '/api/utility/GetSemesterForDropDown',
            { headers }
        );
        
        if (!semResponse.ok) {
            throw new Error('Failed to fetch semesters');
        }
        
        const semesters = await semResponse.json();
        
        // Return formatted response
        return jsonResponse({
            status: 'success',
            message: 'Options fetched successfully',
            departments: departments.map(dept => ({
                AcademicDepartmentId: dept.AcademicDepartmentId || '',
                AcademicDepartmentName: dept.AcademicDepartmentName || 'Unknown'
            })),
            semesters: semesters.map(sem => ({
                SemesterId: sem.SemesterId || '',
                SemesterName: sem.SemesterName || 'Unknown'
            }))
        });
        
    } catch (error) {
        console.error('Fetch options error:', error);
        return jsonResponse({
            status: 'error',
            message: error.message
        });
    }
}

// ===== FETCH COURSES HANDLER =====
async function handleFetchCourses(request) {
    try {
        // Get session cookie from request
        const sessionId = getSessionCookie(request);
        
        if (!sessionId) {
            return jsonResponse({
                status: 'error',
                message: 'Unauthorized. Please log in first.'
            }, 401);
        }
        
        // Get POST data
        const body = await request.json();
        const { departmentId, semesterId } = body;
        
        // Validate input
        if (!departmentId || !semesterId) {
            return jsonResponse({
                status: 'error',
                message: 'Department ID and Semester ID are required'
            });
        }
        
        // Build API URL
        const apiUrl = `${CONFIG.PORTAL_BASE_URL}/api/utility/GetAllOfferedCourses?deptid=${encodeURIComponent(departmentId)}&semesterid=${encodeURIComponent(semesterId)}`;
        
        // Build cookie string
        const cookieString = `ASP.NET_SessionId=${sessionId}; perf_dv6Tr4n=1`;
        
        const headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            'referer': 'https://portal.ewubd.edu/Home/OfferedCoursesStudent',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'cookie': cookieString
        };
        
        // Fetch courses
        const response = await fetch(apiUrl, { headers });
        
        if (!response.ok) {
            throw new Error('Failed to fetch courses. HTTP Code: ' + response.status);
        }
        
        const courses = await response.json();
        
        // Filter and format courses
        const filteredCourses = courses.map(course => {
            const seatCapacity = course.SeatCapacity || 0;
            const seatTaken = course.SeatTaken || 0;
            const seatsLeft = Math.max(0, seatCapacity - seatTaken);
            
            return {
                CourseCode: course.CourseCode || 'N/A',
                Section: course.SectionName || 'N/A',
                ShortName: course.ShortName || 'N/A',
                SeatCapacity: seatCapacity,
                SeatTaken: seatTaken,
                SeatsLeft: seatsLeft,
                TimeSlotName: course.TimeSlotName || 'N/A',
                RoomCode: course.RoomCode || 'N/A'
            };
        });
        
        return jsonResponse({
            status: 'success',
            message: 'Courses fetched successfully',
            courses: filteredCourses,
            count: filteredCourses.length
        });
        
    } catch (error) {
        console.error('Fetch courses error:', error);
        return jsonResponse({
            status: 'error',
            message: error.message
        });
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get session cookie from request
 */
function getSessionCookie(request) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const match = cookieHeader.match(/ASP\.NET_SessionId=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json'
        }
    });
}

