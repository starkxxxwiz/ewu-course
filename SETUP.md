# SUI7 Setup & Deployment Guide

This document outlines how to configure, securely deploy, and manage the administrative layer of the EWU Course tool using strict JavaScript/Serverless environments—ensuring no PHP, conventional servers, or complex DevOps are required. It relies on GitHub Pages for static frontend hosting, and **Cloudflare Workers + Cloudflare KV** for backend dynamics.

## 1. Understanding the Infrastructure (Database Strategy)
**Recommended Database:** **Cloudflare KV** over MongoDB Atlas.
*Why?* Cloudflare KV is natively integrated into Cloudflare Workers. It enables edge caching, instant localized data retrieval (lowering latency compared to HTTP calls to a distant MongoDB cluster), and is completely free/included in Cloudflare. You don't need complicated Mongoose schemas.
*IP Storage:* The Cloudflare layer automatically exposes `request.headers.get('CF-Connecting-IP')`. This allows the Worker to securely log IP addresses during analytics actions or dynamically filter and drop traffic from specific blocklisted IPs directly at the edge layer, completely offloading your logic from the client.

## 2. Step-by-Step Backend Configuration

### A. Environment Variables & Admin Credentials
To secure your admin panel, you need an Admin Username and a SHA-256 hashed password.
1. Pick a strong password (e.g., `MySuperSecretPass`).
2. Generate its SHA-256 hash using an online generator or Node.js (`crypto.createHash('sha256').update('MySuperSecretPass').digest('hex')`).
3. Set these inside your Cloudflare Worker as Secrets/Environment variables:
   - `ADMIN_USERNAME`: Your set username
   - `ADMIN_PASSWORD_HASH`: The generated SHA-256 hash

### B. Deploying with Cloudflare Workers
**Is Wrangler necessary?**  
Wrangler is **optional but highly recommended**. While it is entirely possible to paste the `worker.js` script directly into the Cloudflare Web Dashboard, a Cloudflare KV namespace must be bound manually in the UI if you avoid Wrangler.

#### Option 1: Browser Deploy (No Wrangler)
1. Log into your Cloudflare Dashboard -> **Workers & Pages**.
2. Click **Create Application** -> **Create Worker**, and name it `ewu-portal-worker`.
3. Hit Deploy. Then click **Edit code**. Paste the full contents of `worker.js` into it.
4. Go back to the Worker's Settings -> **Variables**:
   - Add your `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` variables.
5. In your main Cloudflare Account, go to Workers Services -> **KV**. Create a KV namespace strictly defined as `ADMIN_KV`.
6. Return to your Worker settings -> **Variables** -> **KV Namespace Bindings**. Bind the variable name `ADMIN_KV` to the namespace you just created.

#### Option 2: Wrangler Deploy (Recommended)
1. Open your terminal in the local project root.
2. Ensure you are logged in via `npx wrangler login`.
3. Create your KV: `npx wrangler kv:namespace create "ADMIN_KV"`.
4. Copy the output ID into your `wrangler.toml` file block:
   ```toml
   [[kv_namespaces]]
   binding = "ADMIN_KV"
   id = "YOUR_ID_HERE"
   ```
5. Deploy: `npx wrangler deploy`.
6. Set secrets: `echo "your-hash" | npx wrangler secret put ADMIN_PASSWORD_HASH`.

## 3. Managing the Application

### Accessing the Admin Panel
1. The admin panel lives universally at `/sui7/index.html`.
2. Login securely using the username and raw password matching the hash you compiled earlier.

### Tracking Analytics & IPs
- Once logged in, your Activity logs populate gracefully.
- Cloudflare strictly captures and supplies the visitor's connecting IP, sorting them chronologically for monitoring abuse globally across the V2 and Main dashboard.

### Blocking an IP
1. Copy an offending IP address from the Logs interface.
2. Enter it into the `IP Blocklist` array manager input on the dashboard and click **Block**. 
3. The serverless worker immediately flags any new ping fetching from that IP with an override, shutting down their UI completely across the entire app.

### Utilizing Site Closure Mode
1. In the event of a critical update/server crash, toggle the **Site Closure Mode** pill on your SUI7 Dashboard over to ON.
2. A KV record propagates within milliseconds. The frontend utility script (`system-metrics.js`), executing on every page load globally, will intersect the HTML tree and drop a monolithic Maintenance cover, locking all interactions effortlessly.
