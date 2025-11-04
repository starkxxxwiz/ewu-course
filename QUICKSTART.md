# ⚡ Quick Start Guide - 5 Minutes to Deploy

**Goal**: Get your EWU Course Schedule live on Cloudflare in 5 steps.

---

## 🎯 Before You Start

**You Need:**
- [ ] GitHub account
- [ ] Cloudflare account (free)
- [ ] Domain `aftabkabir.me` added to Cloudflare
- [ ] Wrangler CLI installed: `npm install -g wrangler`

---

## 🚀 5-Step Deployment

### Step 1: Push to GitHub (2 minutes)

```bash
cd V2
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ewu-schedule-v2.git
git push -u origin main
```

---

### Step 2: Deploy Frontend to Pages (1 minute)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages**
2. Click **Create a project** → **Connect to Git**
3. Select your repo: `ewu-schedule-v2`
4. Build settings:
   - **Build command**: *(leave empty)*
   - **Build output**: `/`
5. Click **Save and Deploy**
6. Add custom domain: `aftabkabir.me`

**✅ Done!** Frontend is live at `https://aftabkabir.me`

---

### Step 3: Deploy Worker (30 seconds)

```bash
wrangler login
wrangler deploy
```

**✅ Done!** Worker is live at `https://api.aftabkabir.me/*`

---

### Step 4: Configure DNS (30 seconds)

1. Cloudflare dashboard → **DNS**
2. Add record:
   - **Type**: CNAME
   - **Name**: `api`
   - **Target**: `aftabkabir.me`
   - **Proxy**: ✓ (orange cloud)
3. Save

**✅ Done!** API subdomain configured.

---

### Step 5: Test (1 minute)

```bash
# Test Worker
curl https://api.aftabkabir.me/api/auth/status

# Expected: {"loggedIn":false}
```

Visit `https://aftabkabir.me` and login with EWU credentials.

**✅ Done!** Your site is live! 🎉

---

## 🧪 Quick Tests

### Test 1: Login

1. Go to `https://aftabkabir.me/login.html`
2. Enter EWU credentials
3. Should redirect to dashboard

---

### Test 2: Courses

Dashboard should show all courses in a table.

---

### Test 3: Logout

Click logout → should redirect to login page.

---

## 🐛 Troubleshooting

### "Worker not found"

**Fix**: Wait 2 minutes for DNS propagation, then try again.

---

### "CORS error"

**Fix**: Check `worker.js` line 8:
```javascript
const ALLOWED_ORIGINS = [
  'https://aftabkabir.me',  // ← Make sure this matches your domain
  'https://www.aftabkabir.me'
];
```

Redeploy: `wrangler deploy`

---

### "Login fails"

**Fix**: Check credentials are correct. Test on `https://portal.ewubd.edu` first.

---

### "Cookie not set"

**Fix**: 
1. Open DevTools → Application → Cookies
2. Check if `ASP.NET_SessionId` exists on `api.aftabkabir.me` domain
3. Ensure both frontend and API use **HTTPS** (not HTTP)

---

## 📚 Full Documentation

- **Detailed Deployment**: See `README.md`
- **Testing Checklist**: See `TESTING.md`
- **Technical Details**: See `CONVERSION_SUMMARY.md`

---

## 📞 Need Help?

**Email**: [aftabkabir7766@gmail.com](mailto:aftabkabir7766@gmail.com)

---

## 🎯 Next Steps

After successful deployment:

1. **Test thoroughly** (see `TESTING.md`)
2. **Monitor** Worker logs in Cloudflare dashboard
3. **Customize** (change colors, add features)
4. **Share** with fellow students!

---

**That's it!** Your site is live in 5 minutes. 🚀

