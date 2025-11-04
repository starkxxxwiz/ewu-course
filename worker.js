// ========================================
// Cloudflare Worker - BD Portal Proxy
// ========================================

// **CONFIGURATION**: Portal URL (replace if needed)
const PORTAL_URL = 'https://portal.ewubd.edu';
const PORTAL_API_URL = 'https://portal.ewubd.edu/api/Advising/GetAllRoutine';

// **CONFIGURATION**: Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://aftabkabir.me',
  'https://www.aftabkabir.me'
];

// Helper: Get CORS headers
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cookie',
      'Access-Control-Max-Age': '86400',
    };
  }
  
  return {};
}

// Helper: Create JSON response with CORS
function jsonResponse(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request)
    }
  });
}

// Helper: Extract cookie value from Cookie header
function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return null;
}

// ===== STEP 1: GET portal page to fetch hidden fields and session cookie =====
async function getPortalFormData() {
  try {
    const response = await fetch(PORTAL_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
        'Pragma': 'no-cache',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to connect to portal');
    }

    const html = await response.text();

    // ===== STEP 2: Parse hidden form values (FirstNo and SecondNo) =====
    const num1Match = html.match(/<input type="hidden" name="FirstNo" value="([^"]+)"/);
    const num2Match = html.match(/<input type="hidden" name="SecondNo" value="([^"]+)"/);

    const num1 = num1Match ? num1Match[1] : null;
    const num2 = num2Match ? num2Match[1] : null;

    if (!num1 || !num2) {
      throw new Error('Failed to parse portal form values');
    }

    // ===== STEP 3: Extract ASP.NET_SessionId from Set-Cookie header =====
    const setCookieHeader = response.headers.get('Set-Cookie');
    let sessionId = null;

    if (setCookieHeader) {
      // Parse Set-Cookie header to extract ASP.NET_SessionId
      const cookies = setCookieHeader.split(',').map(c => c.trim());
      for (const cookie of cookies) {
        if (cookie.includes('ASP.NET_SessionId')) {
          const match = cookie.match(/ASP\.NET_SessionId=([^;]+)/);
          if (match) {
            sessionId = match[1];
            break;
          }
        }
      }
    }

    if (!sessionId) {
      throw new Error('Failed to retrieve session cookie from portal');
    }

    return {
      num1,
      num2,
      sessionId
    };
  } catch (error) {
    console.error('getPortalFormData error:', error);
    throw error;
  }
}

// ===== STEP 4: Submit login POST request =====
async function performLogin(username, password, formData) {
  const { num1, num2, sessionId } = formData;
  
  // Calculate sum for Answer field
  const sum = parseInt(num1) + parseInt(num2);

  // Prepare POST data
  const postData = new URLSearchParams({
    Username: username,
    Password: password,
    Answer: sum.toString(),
    FirstNo: num1,
    SecondNo: num2
  });

  try {
    const response = await fetch(PORTAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `ASP.NET_SessionId=${sessionId}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: postData.toString()
    });

    if (!response.ok) {
      throw new Error('Login request failed');
    }

    const html = await response.text();

    // ===== STEP 5: Verify login success =====
    if (html.includes('View Profile')) {
      return {
        success: true,
        sessionId: sessionId,
        userId: username
      };
    } else if (html.includes('Username or password is incorrect')) {
      return {
        success: false,
        message: 'Username or password is incorrect'
      };
    } else if (html.includes('Invalid answer')) {
      return {
        success: false,
        message: 'Portal verification failed. Please try again.'
      };
    } else {
      return {
        success: false,
        message: 'Could not determine login status. Please try again.'
      };
    }
  } catch (error) {
    console.error('performLogin error:', error);
    throw error;
  }
}

// ===== ENDPOINT: POST /api/auth/login =====
async function handleLogin(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse({
        status: 'error',
        message: 'Username and password are required'
      }, 400, request);
    }

    // Step 1: Get form data and session
    const formData = await getPortalFormData();

    // Step 2: Perform login
    const loginResult = await performLogin(username, password, formData);

    if (loginResult.success) {
      // Set cookie on the browser with secure attributes
      // **IMPORTANT**: Cookie must be set on api.aftabkabir.me domain
      const cookieHeader = `ASP.NET_SessionId=${loginResult.sessionId}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=3600`;
      
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Login successful',
        userId: loginResult.userId
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
          ...getCorsHeaders(request)
        }
      });
    } else {
      return jsonResponse({
        status: 'error',
        message: loginResult.message
      }, 401, request);
    }
  } catch (error) {
    console.error('handleLogin error:', error);
    return jsonResponse({
      status: 'error',
      message: error.message || 'Login failed. Please try again.'
    }, 500, request);
  }
}

// ===== ENDPOINT: POST /api/auth/logout =====
function handleLogout(request) {
  // Clear the session cookie
  const cookieHeader = 'ASP.NET_SessionId=; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=0';
  
  return new Response(JSON.stringify({
    status: 'success',
    message: 'Logged out successfully'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieHeader,
      ...getCorsHeaders(request)
    }
  });
}

// ===== ENDPOINT: GET /api/auth/status =====
async function handleAuthStatus(request) {
  const cookieHeader = request.headers.get('Cookie');
  const sessionId = getCookieValue(cookieHeader, 'ASP.NET_SessionId');

  if (!sessionId) {
    return jsonResponse({
      loggedIn: false
    }, 200, request);
  }

  // Try to verify session by making a small request to portal
  // For simplicity, we assume if cookie exists, session is valid
  // In production, you might want to verify by calling a small portal endpoint
  
  return jsonResponse({
    loggedIn: true,
    userId: 'User' // Could store userId in a KV store for better UX
  }, 200, request);
}

// ===== ENDPOINT: GET /api/courses =====
async function handleGetCourses(request) {
  const cookieHeader = request.headers.get('Cookie');
  const sessionId = getCookieValue(cookieHeader, 'ASP.NET_SessionId');

  if (!sessionId) {
    return jsonResponse({
      error: 'Unauthorized'
    }, 401, request);
  }

  try {
    // Forward request to portal API with session cookie
    const response = await fetch(PORTAL_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1',
        'Referer': 'https://portal.ewubd.edu/Home/Advising',
        'Cookie': `ASP.NET_SessionId=${sessionId}; perf_dv6Tr4n=1`
      }
    });

    // Check for unauthorized response
    if (response.status === 401 || response.status === 403) {
      return jsonResponse({
        error: 'Session expired'
      }, 401, request);
    }

    if (!response.ok) {
      throw new Error('Failed to fetch courses from portal');
    }

    const data = await response.json();
    
    return jsonResponse(data, 200, request);
  } catch (error) {
    console.error('handleGetCourses error:', error);
    return jsonResponse({
      error: 'Failed to fetch courses'
    }, 500, request);
  }
}

// ===== MAIN HANDLER =====
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: getCorsHeaders(request)
      });
    }

    // Route requests
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      return handleLogin(request);
    }

    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      return handleLogout(request);
    }

    if (url.pathname === '/api/auth/status' && request.method === 'GET') {
      return handleAuthStatus(request);
    }

    if (url.pathname === '/api/courses' && request.method === 'GET') {
      return handleGetCourses(request);
    }

    // Catch-all for undefined routes
    return jsonResponse({
      error: 'Not Found'
    }, 404, request);
  }
};

