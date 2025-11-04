# 🚀 EWU Course Schedule V2 - Cloudflare Deployment Guide

> Static Frontend (Cloudflare Pages) + Cloudflare Worker Backend

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Step 1: GitHub Repository Setup](#step-1-github-repository-setup)
5. [Step 2: Cloudflare Pages Deployment](#step-2-cloudflare-pages-deployment)
6. [Step 3: Cloudflare Worker Deployment](#step-3-cloudflare-worker-deployment)
7. [Step 4: DNS Configuration](#step-4-dns-configuration)
8. [Step 5: Update API URLs](#step-5-update-api-urls)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🌟 Overview

This V2 architecture deploys your EWU Course Schedule application as:

- **Frontend**: Static HTML/CSS/JS hosted on **Cloudflare Pages** at `https://aftabkabir.me`
- **Backend**: **Cloudflare Worker** at `https://api.aftabkabir.me` that proxies requests to the Bangladesh-only portal

### Key Benefits

✅ **Global CDN**: Fast loading worldwide via Cloudflare's edge network  
✅ **BD Portal Access**: Worker runs from Cloudflare edges, bypassing geo-restrictions  
✅ **Secure**: Cookies with HttpOnly, Secure, SameSite=None  
✅ **Scalable**: Handles high traffic without server management  

---

## 🏗️ Architecture

```
User Browser (https://aftabkabir.me)
    ↓ [fetch with credentials: 'include']
Cloudflare Worker (https://api.aftabkabir.me)
    ↓ [proxies requests]
BD Portal (https://portal.ewubd.edu)
```

**Flow:**
1. User visits `https://aftabkabir.me` (Pages)
2. Login form submits to `https://api.aftabkabir.me/api/auth/login` (Worker)
3. Worker performs 2-step login to BD portal
4. Worker sets `ASP.NET_SessionId` cookie on `api.aftabkabir.me` domain
5. Subsequent API calls include cookie automatically

---

## 📦 Prerequisites

Before starting, ensure you have:

- ✅ A **GitHub account**
- ✅ A **Cloudflare account** (free tier works)
- ✅ Your domain **aftabkabir.me** (or update to your domain)
- ✅ **Node.js** installed (v16+) for local testing (optional)
- ✅ **Wrangler CLI** installed: `npm install -g wrangler`

---

## 📝 Step 1: GitHub Repository Setup

### 1.1 Initialize Git Repository

Open terminal in the `V2` directory:

```bash
# Initialize Git repository
git init

# Create .gitignore
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: V2 static frontend + Worker"
```

### 1.2 Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `ewu-course-schedule-v2`
3. Set to **Public** or **Private** (your choice)
4. **DO NOT** initialize with README (we already have one)
5. Click **Create repository**

### 1.3 Push to GitHub

Replace `YOUR_USERNAME` with your GitHub username:

```bash
# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/ewu-course-schedule-v2.git

# Push to main branch
git branch -M main
git push -u origin main
```

✅ **Checkpoint**: Visit your repository on GitHub to verify all files are uploaded.

---

## 🌐 Step 2: Cloudflare Pages Deployment

### 2.1 Add Domain to Cloudflare

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Add a Site**
3. Enter your domain: `aftabkabir.me`
4. Select **Free** plan
5. Cloudflare will scan your DNS records
6. Click **Continue**
7. **Important**: Note the nameservers shown (e.g., `amber.ns.cloudflare.com`)

### 2.2 Update Domain Nameservers

Go to your domain registrar (where you bought the domain) and update nameservers to Cloudflare's:

- **Nameserver 1**: `amber.ns.cloudflare.com` (example - use your assigned ones)
- **Nameserver 2**: `omar.ns.cloudflare.com` (example - use your assigned ones)

⏱️ **Wait time**: 5 minutes to 24 hours for DNS propagation.

### 2.3 Create Pages Project

1. In Cloudflare dashboard, go to **Pages**
2. Click **Create a project**
3. Select **Connect to Git**
4. Authorize Cloudflare to access your GitHub
5. Select repository: `ewu-course-schedule-v2`
6. Click **Begin setup**

### 2.4 Configure Build Settings

- **Project name**: `ewu-course-schedule`
- **Production branch**: `main`
- **Build command**: *(leave empty - static files)*
- **Build output directory**: `/` *(root directory)*
- Click **Save and Deploy**

### 2.5 Add Custom Domain

1. After deployment completes, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `aftabkabir.me`
4. Click **Continue**
5. Cloudflare will automatically add DNS records
6. Wait 1-2 minutes for SSL certificate provisioning

### 2.6 (Optional) Add www Subdomain

Repeat step 2.5 with `www.aftabkabir.me` to support both URLs.

✅ **Checkpoint**: Visit `https://aftabkabir.me` - you should see the homepage (login won't work yet).

---

## ⚙️ Step 3: Cloudflare Worker Deployment

### 3.1 Install Wrangler CLI

```bash
npm install -g wrangler
```

### 3.2 Login to Cloudflare

```bash
wrangler login
```

This opens a browser to authenticate.

### 3.3 Create wrangler.toml

In the `V2` directory, create `wrangler.toml`:

```toml
name = "ewu-portal-worker"
main = "worker.js"
compatibility_date = "2024-01-01"

# Routes configuration
routes = [
  { pattern = "api.aftabkabir.me/*", zone_name = "aftabkabir.me" }
]

# Worker settings
workers_dev = false
```

**Important**: Replace `aftabkabir.me` with your actual domain if different.

### 3.4 Deploy Worker

```bash
wrangler deploy
```

Expected output:
```
✨ Built successfully, built worker size is X KiB / Y KiB
✨ Uploaded ewu-portal-worker
✨ Deployed ewu-portal-worker
  https://api.aftabkabir.me/*
```

✅ **Checkpoint**: Worker is deployed and linked to `api.aftabkabir.me/*`

---

## 🌍 Step 4: DNS Configuration

### 4.1 Add API Subdomain DNS Record

1. In Cloudflare dashboard, go to **DNS** → **Records**
2. Click **Add record**
3. Configure:
   - **Type**: `CNAME`
   - **Name**: `api`
   - **Target**: `aftabkabir.me` (or your domain)
   - **Proxy status**: **Proxied** (orange cloud)
   - **TTL**: Auto
4. Click **Save**

### 4.2 Verify DNS Records

You should have these records:

| Type  | Name         | Content              | Proxy Status |
|-------|--------------|----------------------|--------------|
| CNAME | aftabkabir.me| pages.cloudflare.com | Proxied      |
| CNAME | www          | aftabkabir.me        | Proxied      |
| CNAME | api          | aftabkabir.me        | Proxied      |

✅ **Checkpoint**: Wait 1-2 minutes, then test:

```bash
curl https://api.aftabkabir.me/api/auth/status
```

Expected response:
```json
{"loggedIn":false}
```

---

## 🔧 Step 5: Update API URLs

### 5.1 Update JavaScript Files

In both `assets/js/auth.js` and `assets/js/advise.js`, verify:

```javascript
const API_BASE_URL = 'https://api.aftabkabir.me';
```

If you used a different domain, update it here.

### 5.2 Update Worker Allowed Origins

In `worker.js`, verify:

```javascript
const ALLOWED_ORIGINS = [
  'https://aftabkabir.me',
  'https://www.aftabkabir.me'
];
```

### 5.3 Redeploy (if changes made)

If you changed any files:

```bash
# Frontend (commit to GitHub - Pages auto-deploys)
git add .
git commit -m "Update API URLs"
git push

# Worker (redeploy)
wrangler deploy
```

✅ **Checkpoint**: All URLs are correctly configured.

---

## 🧪 Testing

See `TESTING.md` for detailed testing checklist.

### Quick Test

1. Visit `https://aftabkabir.me`
2. Click **Login**
3. Enter EWU credentials
4. Should redirect to dashboard with courses

### Test with curl

```bash
# Test login (replace with real credentials)
curl -X POST https://api.aftabkabir.me/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://aftabkabir.me" \
  -d '{"username":"YOUR_ID","password":"YOUR_PASSWORD"}' \
  -c cookies.txt -v

# Test courses (using saved cookie)
curl https://api.aftabkabir.me/api/courses \
  -H "Origin: https://aftabkabir.me" \
  -b cookies.txt -v
```

---

## 🛠️ Troubleshooting

### Issue: CORS Error in Browser

**Symptom**: 
```
Access to fetch at 'https://api.aftabkabir.me/api/auth/login' from origin 'https://aftabkabir.me' has been blocked by CORS policy
```

**Solution**:
1. Check `worker.js` → `ALLOWED_ORIGINS` includes your frontend domain
2. Verify frontend calls use `credentials: 'include'`
3. Redeploy Worker: `wrangler deploy`

---

### Issue: Login Returns "Session expired"

**Symptom**: Can login but immediately shows "Session expired" when loading courses.

**Solution**:
1. Check if `ASP.NET_SessionId` cookie is set in browser DevTools → Application → Cookies
2. Verify cookie has:
   - **Domain**: `api.aftabkabir.me`
   - **Secure**: ✓
   - **HttpOnly**: ✓
   - **SameSite**: None
3. Ensure Worker uses `credentials: 'include'` when calling portal

---

### Issue: Worker Not Found (404)

**Symptom**: `https://api.aftabkabir.me/api/auth/status` returns 404.

**Solution**:
1. Verify Worker is deployed: `wrangler deployments list`
2. Check DNS record for `api` subdomain exists and is **Proxied**
3. Verify `wrangler.toml` has correct route
4. Wait 2-3 minutes for DNS propagation

---

### Issue: Portal Login Fails (Portal-side)

**Symptom**: Worker returns "Username or password is incorrect" but credentials are correct.

**Solution**:
1. Test credentials directly on `https://portal.ewubd.edu` in browser
2. Check if portal changed their login form (inspect HTML for hidden field names)
3. Update regex patterns in `worker.js` if portal HTML changed

---

### Issue: Pages Not Updating After Git Push

**Symptom**: Made changes, pushed to GitHub, but site still shows old content.

**Solution**:
1. Go to Cloudflare Pages → **Deployments**
2. Check if deployment succeeded or failed
3. If failed, check build logs for errors
4. Manually trigger: **Retry deployment**
5. Clear browser cache: `Ctrl+Shift+R` (hard refresh)

---

### Issue: Cookie Not Being Sent to Worker

**Symptom**: `/api/courses` returns 401 even after successful login.

**Solution**:
1. Verify frontend JS uses `credentials: 'include'`:
   ```javascript
   fetch(url, { credentials: 'include' })
   ```
2. Check Worker sets cookie with `SameSite=None; Secure`:
   ```javascript
   'Set-Cookie': 'ASP.NET_SessionId=...; Secure; HttpOnly; SameSite=None'
   ```
3. Ensure both frontend and API use HTTPS (not HTTP)

---

## 📚 Additional Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Cookie Attributes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)

---

## 🔄 Local Development (Optional)

### Run Worker Locally

```bash
wrangler dev worker.js
```

Access at `http://localhost:8787`

### Serve Static Files Locally

```bash
# Python
python -m http.server 8000

# Node.js (install http-server first)
npx http-server -p 8000
```

Access at `http://localhost:8000`

**Note**: CORS will prevent API calls in local mode. Use production URLs for full testing.

---

## 📄 File Structure

```
V2/
├── index.html              # Homepage
├── login.html              # Login page
├── advise.html             # Dashboard (courses)
├── documentation.html      # Documentation
├── learn-more.html         # About page
├── assets/
│   ├── css/
│   │   └── styles.css      # Main stylesheet
│   └── js/
│       ├── main.js         # Common functions
│       ├── auth.js         # Login logic
│       └── advise.js       # Dashboard logic
├── worker.js               # Cloudflare Worker
├── wrangler.toml           # Worker configuration
├── README.md               # This file
└── TESTING.md              # Testing checklist
```

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Test all functionality (see `TESTING.md`)
2. ✅ Monitor Worker logs in Cloudflare dashboard
3. ✅ Set up custom error pages (optional)
4. ✅ Enable Cloudflare Analytics (optional)
5. ✅ Consider adding rate limiting to Worker (optional)

---

## 📞 Support

**Issues?** 
- Check `TESTING.md` for validation steps
- Review Worker logs: Cloudflare Dashboard → Workers → Logs
- Check Pages deployment logs: Cloudflare Dashboard → Pages → Deployments

**Contact**: [aftabkabir7766@gmail.com](mailto:aftabkabir7766@gmail.com)

---

## 📜 License

Educational use only. Not affiliated with East West University.

© 2025 Aftab Kabir

---

**Last Updated**: November 2025  
**Version**: 2.0

