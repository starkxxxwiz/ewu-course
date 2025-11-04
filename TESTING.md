# 🧪 Testing Checklist - EWU Course Schedule V2

> Comprehensive testing guide for validating the static frontend + Worker deployment

---

## 📋 Table of Contents

1. [Pre-Deployment Tests](#pre-deployment-tests)
2. [DNS & Infrastructure Tests](#dns--infrastructure-tests)
3. [Worker Endpoint Tests](#worker-endpoint-tests)
4. [Frontend Integration Tests](#frontend-integration-tests)
5. [Browser Testing](#browser-testing)
6. [Security & Cookie Tests](#security--cookie-tests)
7. [Performance Tests](#performance-tests)
8. [Common Issues](#common-issues)

---

## ✅ Pre-Deployment Tests

### 1. Verify File Structure

Ensure all files are in place:

```bash
V2/
├── index.html              ✓
├── login.html              ✓
├── advise.html             ✓
├── documentation.html      ✓
├── learn-more.html         ✓
├── assets/
│   ├── css/styles.css      ✓
│   └── js/
│       ├── main.js         ✓
│       ├── auth.js         ✓
│       └── advise.js       ✓
├── worker.js               ✓
├── wrangler.toml           ✓
└── README.md               ✓
```

### 2. Verify Configuration

**In `worker.js`:**
- [ ] `PORTAL_URL` is correct: `https://portal.ewubd.edu`
- [ ] `ALLOWED_ORIGINS` includes your frontend domain(s)

**In `assets/js/auth.js` and `assets/js/advise.js`:**
- [ ] `API_BASE_URL` is set to: `https://api.aftabkabir.me`

**In `wrangler.toml`:**
- [ ] `routes` includes your API subdomain pattern
- [ ] `zone_name` matches your domain

---

## 🌐 DNS & Infrastructure Tests

### Test 1: DNS Resolution

```bash
# Test main domain
nslookup aftabkabir.me

# Test API subdomain
nslookup api.aftabkabir.me
```

**Expected**: Both resolve to Cloudflare IPs.

---

### Test 2: SSL Certificate

```bash
# Test frontend SSL
curl -I https://aftabkabir.me

# Test API SSL
curl -I https://api.aftabkabir.me/api/auth/status
```

**Expected**: 
- Status: `200 OK` or similar
- No SSL errors
- Certificate valid

---

### Test 3: Pages Deployment

Visit: `https://aftabkabir.me`

**Expected**:
- [ ] Homepage loads successfully
- [ ] No 404 errors
- [ ] CSS styles are applied
- [ ] Navigation works
- [ ] No console errors (check DevTools)

---

### Test 4: Worker Deployment

```bash
curl https://api.aftabkabir.me/api/auth/status
```

**Expected Response**:
```json
{"loggedIn":false}
```

**Status Code**: `200`

---

## 🔌 Worker Endpoint Tests

### Test 1: CORS Preflight (OPTIONS)

```bash
curl -X OPTIONS https://api.aftabkabir.me/api/auth/status \
  -H "Origin: https://aftabkabir.me" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

**Expected Headers**:
```
Access-Control-Allow-Origin: https://aftabkabir.me
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

**Status Code**: `200`

---

### Test 2: GET /api/auth/status (Unauthorized)

```bash
curl https://api.aftabkabir.me/api/auth/status \
  -H "Origin: https://aftabkabir.me" \
  -v
```

**Expected Response**:
```json
{"loggedIn":false}
```

**Expected Headers**:
- `Access-Control-Allow-Origin: https://aftabkabir.me`
- `Access-Control-Allow-Credentials: true`

---

### Test 3: POST /api/auth/login (Invalid Credentials)

```bash
curl -X POST https://api.aftabkabir.me/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://aftabkabir.me" \
  -d '{"username":"invalid","password":"invalid"}' \
  -c cookies.txt \
  -v
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "Username or password is incorrect"
}
```

**Status Code**: `401`

---

### Test 4: POST /api/auth/login (Valid Credentials)

**⚠️ IMPORTANT**: Replace with your actual EWU credentials.

```bash
curl -X POST https://api.aftabkabir.me/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://aftabkabir.me" \
  -d '{"username":"YOUR_STUDENT_ID","password":"YOUR_PASSWORD"}' \
  -c cookies.txt \
  -v
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Login successful",
  "userId": "YOUR_STUDENT_ID"
}
```

**Expected Headers**:
- `Set-Cookie: ASP.NET_SessionId=...; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=3600`

**Status Code**: `200`

**Verify**:
- [ ] Cookie saved to `cookies.txt`
- [ ] Cookie has `Secure`, `HttpOnly`, `SameSite=None` attributes

---

### Test 5: GET /api/courses (Authenticated)

**Prerequisite**: Must have valid cookie from Test 4.

```bash
curl https://api.aftabkabir.me/api/courses \
  -H "Origin: https://aftabkabir.me" \
  -b cookies.txt \
  -v
```

**Expected Response**:
```json
[
  {
    "CourseCode": "CSE425",
    "SectionName": "1",
    "ShortName": "Faculty Name",
    "SeatCapacity": 40,
    "SeatTaken": 28,
    "TimeSlotName": "ST 10:00-11:30 AM",
    "RoomName": "AB4-501"
  },
  ...
]
```

**Status Code**: `200`

**Verify**:
- [ ] Returns array of course objects
- [ ] Each object has required fields
- [ ] No `error` field in response

---

### Test 6: GET /api/courses (Unauthenticated)

```bash
curl https://api.aftabkabir.me/api/courses \
  -H "Origin: https://aftabkabir.me" \
  -v
```

**Expected Response**:
```json
{"error":"Unauthorized"}
```

**Status Code**: `401`

---

### Test 7: POST /api/auth/logout

```bash
curl -X POST https://api.aftabkabir.me/api/auth/logout \
  -H "Origin: https://aftabkabir.me" \
  -b cookies.txt \
  -c cookies_after_logout.txt \
  -v
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

**Expected Headers**:
- `Set-Cookie: ASP.NET_SessionId=; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=0`

**Verify**:
- [ ] Cookie in `cookies_after_logout.txt` has `Max-Age=0`
- [ ] Subsequent `/api/courses` call returns 401

---

### Test 8: Invalid Endpoint

```bash
curl https://api.aftabkabir.me/api/invalid \
  -H "Origin: https://aftabkabir.me" \
  -v
```

**Expected Response**:
```json
{"error":"Not Found"}
```

**Status Code**: `404`

---

## 🖥️ Frontend Integration Tests

### Test 1: Homepage Navigation

1. Visit `https://aftabkabir.me`
2. Click **Get Started** button
3. **Expected**: Redirects to `login.html`

---

### Test 2: Login Form Submission

1. Visit `https://aftabkabir.me/login.html`
2. Enter valid credentials
3. Click **Sign In**

**Expected**:
- [ ] Button shows loading state: "Signing in..."
- [ ] Success message appears: "Login successful! Redirecting..."
- [ ] Redirects to `advise.html` after 1 second

**DevTools Check** (Application → Cookies):
- [ ] Cookie `ASP.NET_SessionId` is set on `api.aftabkabir.me` domain
- [ ] Cookie has `Secure`, `HttpOnly`, `SameSite=None` attributes

---

### Test 3: Dashboard Load

**Prerequisite**: Must be logged in.

1. Visit `https://aftabkabir.me/advise.html` (or wait for redirect after login)

**Expected**:
- [ ] Shows loading spinner initially
- [ ] Loads course table with data
- [ ] User ID displayed in header: "Welcome, YOUR_ID"
- [ ] Current time (Bangladesh time) updates every second
- [ ] No console errors

---

### Test 4: Course Filtering

On dashboard (`advise.html`):

1. **Search Test**:
   - Type "CSE" in search box
   - **Expected**: Table filters to show only CSE courses
   - **Expected**: Search suggestions appear

2. **Course Filter Test**:
   - Click "Course" dropdown
   - Select a specific course (e.g., "CSE425")
   - **Expected**: Table shows only that course

3. **Available Only Toggle**:
   - Toggle "Show Available Only"
   - **Expected**: Table shows only courses with available seats (Available > 0)

4. **Sort Test**:
   - Change "Sort By" to "Seat Availability (High → Low)"
   - **Expected**: Courses sorted by available seats, highest first

---

### Test 5: PDF Export

On dashboard:

1. Click **Export PDF** button

**Expected**:
- [ ] PDF downloads automatically
- [ ] Filename: `EWU_Courses_YYYY-MM-DD.pdf`
- [ ] PDF contains:
  - Title: "EWU Course Schedule"
  - Student ID
  - Generated timestamp
  - All filtered courses in table format

---

### Test 6: Refresh Courses

On dashboard:

1. Click green **Refresh** button (bottom-right)

**Expected**:
- [ ] Button animates (spinning)
- [ ] Toast notification appears: "Refreshed Successfully"
- [ ] Course table updates with latest data
- [ ] Page scroll position maintained

---

### Test 7: Logout

On dashboard:

1. Click **Logout** button (top-right or header)

**Expected**:
- [ ] Redirects to `login.html`
- [ ] Cookie `ASP.NET_SessionId` removed (check DevTools)
- [ ] Visiting `advise.html` directly redirects to `login.html`

---

### Test 8: Protected Route Access

**Prerequisite**: Must be logged out.

1. Try to visit `https://aftabkabir.me/advise.html` directly

**Expected**:
- [ ] Immediately redirects to `login.html`
- [ ] Cannot access dashboard without login

---

## 🌍 Browser Testing

Test on multiple browsers:

### Chrome/Edge
- [ ] All features work
- [ ] Cookies set correctly
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Cookies set correctly
- [ ] No console errors

### Safari (macOS/iOS)
- [ ] All features work
- [ ] Cookies set correctly with `SameSite=None; Secure`
- [ ] No console errors

### Mobile Chrome (Android)
- [ ] Responsive design works
- [ ] Mobile menu works
- [ ] Touch interactions work
- [ ] Cookies set correctly

### Mobile Safari (iOS)
- [ ] Responsive design works
- [ ] Mobile menu works
- [ ] Touch interactions work
- [ ] Cookies work with `SameSite=None; Secure`

---

## 🔒 Security & Cookie Tests

### Test 1: Cookie Attributes

**DevTools → Application → Cookies → api.aftabkabir.me**

After login, verify cookie has:
- [ ] **Name**: `ASP.NET_SessionId`
- [ ] **Value**: (random string)
- [ ] **Domain**: `api.aftabkabir.me`
- [ ] **Path**: `/`
- [ ] **Expires**: (1 hour from login)
- [ ] **HttpOnly**: ✓ (checked)
- [ ] **Secure**: ✓ (checked)
- [ ] **SameSite**: `None`

---

### Test 2: CORS Credentials

**DevTools → Network → Filter: XHR/Fetch**

Check a request to `/api/courses`:

**Request Headers**:
- [ ] `Cookie: ASP.NET_SessionId=...` is sent
- [ ] `Origin: https://aftabkabir.me` is sent

**Response Headers**:
- [ ] `Access-Control-Allow-Origin: https://aftabkabir.me`
- [ ] `Access-Control-Allow-Credentials: true`

---

### Test 3: Cross-Origin Cookie Sending

In browser console (on `https://aftabkabir.me/advise.html`):

```javascript
// Should succeed (credentials: 'include')
fetch('https://api.aftabkabir.me/api/courses', {
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

**Expected**: Returns course data (if logged in).

---

### Test 4: Unauthorized Access

In browser console (logged out):

```javascript
fetch('https://api.aftabkabir.me/api/courses', {
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

**Expected**: 
```json
{"error":"Unauthorized"}
```

---

## ⚡ Performance Tests

### Test 1: Page Load Speed

Use [PageSpeed Insights](https://pagespeed.web.dev/):

1. Enter: `https://aftabkabir.me`
2. Run test

**Expected**:
- [ ] Performance score: > 90
- [ ] First Contentful Paint: < 1.5s
- [ ] Time to Interactive: < 3s

---

### Test 2: Worker Response Time

```bash
time curl -X POST https://api.aftabkabir.me/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://aftabkabir.me" \
  -d '{"username":"YOUR_ID","password":"YOUR_PASS"}' \
  -o /dev/null -s
```

**Expected**: < 2 seconds (includes BD portal latency)

---

### Test 3: Concurrent Requests

Simulate multiple users:

```bash
# Install hey: https://github.com/rakyll/hey
hey -n 100 -c 10 -H "Origin: https://aftabkabir.me" https://api.aftabkabir.me/api/auth/status
```

**Expected**:
- [ ] All requests succeed (Status 200)
- [ ] No rate limiting errors
- [ ] Average response time < 500ms

---

## 🐛 Common Issues

### Issue 1: Login succeeds but courses return 401

**Cause**: Cookie not being sent to Worker.

**Debug**:
1. Check DevTools → Application → Cookies
2. Verify cookie is set on `api.aftabkabir.me` (not `aftabkabir.me`)
3. Check Network tab → `/api/courses` request → Request Headers
4. Ensure `Cookie: ASP.NET_SessionId=...` is present

**Fix**: Ensure frontend uses `credentials: 'include'`.

---

### Issue 2: CORS Error

**Symptom**: 
```
Access to fetch blocked by CORS policy
```

**Debug**:
1. Check Worker `ALLOWED_ORIGINS` includes frontend URL
2. Verify Worker returns `Access-Control-Allow-Origin` header
3. Check `Access-Control-Allow-Credentials: true` is set

**Fix**: Update `worker.js` and redeploy.

---

### Issue 3: Cookie Not Set (Safari/iOS)

**Symptom**: Login works on Chrome, fails on Safari.

**Cause**: Safari blocks third-party cookies without `SameSite=None; Secure`.

**Debug**:
1. Check Worker sets: `SameSite=None; Secure`
2. Verify both frontend and API use HTTPS (not HTTP)

**Fix**: Ensure Worker cookie has `SameSite=None; Secure` and both URLs are HTTPS.

---

### Issue 4: Portal Login Fails

**Symptom**: Worker returns "Username or password is incorrect" but credentials are correct.

**Debug**:
1. Test credentials directly on `https://portal.ewubd.edu`
2. Check Worker logs in Cloudflare dashboard
3. Inspect portal HTML for changes to hidden field names

**Fix**: Update regex patterns in `worker.js` if portal changed.

---

## ✅ Final Checklist

Before going live:

- [ ] All DNS records configured
- [ ] SSL certificates active (green padlock)
- [ ] Worker deployed and accessible
- [ ] Frontend deployed to Pages
- [ ] Login flow works end-to-end
- [ ] Courses load successfully
- [ ] Logout clears session
- [ ] Protected routes redirect to login
- [ ] PDF export works
- [ ] Mobile responsive
- [ ] CORS headers correct
- [ ] Cookies secure and HttpOnly
- [ ] No console errors in browser
- [ ] Tested on multiple browsers
- [ ] Performance acceptable

---

## 📊 Monitoring

After deployment, monitor:

1. **Cloudflare Analytics**:
   - Pages: Dashboard → Pages → Analytics
   - Worker: Dashboard → Workers → Analytics

2. **Worker Logs**:
   - Dashboard → Workers → Logs (Logpush or Tail Workers)

3. **Error Tracking**:
   - Check for 4xx/5xx errors
   - Monitor failed login attempts

---

## 📞 Support

**Issues?**
1. Review this checklist step-by-step
2. Check Worker logs for errors
3. Test with `curl` commands to isolate frontend vs backend issues
4. Contact: [aftabkabir7766@gmail.com](mailto:aftabkabir7766@gmail.com)

---

**Last Updated**: November 2025  
**Version**: 2.0

