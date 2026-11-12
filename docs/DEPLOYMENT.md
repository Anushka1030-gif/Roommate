# RoomieMatch — Deployment Guide

This guide describes how to deploy RoomieMatch into a production environment. As recommended in the PRD, the standard deployment topology is:
- **Frontend**: [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
- **Backend & MySQL Database**: [Railway](https://railway.app)

---

## 🏗️ Production Architecture Overview

```
                      ┌───────────────────────────────┐
                      │    Client Browser / Mobile     │
                      └──────────────┬────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │ HTTPS (SameSite cookies / secure)                 │
           ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│       Frontend (SPA)          │               │         Backend API           │
│   Vercel / Netlify (CDN)      │               │     Railway Web Service       │
│  https://roomiematch.edu      │               │  https://api.roomiematch.edu  │
└───────────────────────────────┘               └──────────────┬────────────────┘
                                                               │ Internal Private Network
                                                               ▼
                                                ┌───────────────────────────────┐
                                                │        MySQL Database         │
                                                │     Railway MySQL Service     │
                                                └───────────────────────────────┘
```

---

## 🗄️ Step 1: Database Setup on Railway

1. **Create a Railway Project**:
   - Log in to your [Railway Dashboard](https://railway.app).
   - Click **+ New** > **Database** > **Add MySQL**.
2. **Retrieve Connection Credentials**:
   - In the MySQL service tab, navigate to **Variables** or **Connect**.
   - Note the connection variables:
     - `MYSQLHOST` / `DB_HOST`
     - `MYSQLPORT` / `DB_PORT` (default: `3306`)
     - `MYSQLUSER` / `DB_USER`
     - `MYSQLPASSWORD` / `DB_PASSWORD`
     - `MYSQLDATABASE` / `DB_NAME`

---

## ⚙️ Step 2: Backend Deployment on Railway

1. **Deploy Repository**:
   - In the same Railway project, click **+ New** > **GitHub Repo** > Select your repository.
   - Set the root directory / subpath to `server`.
2. **Build & Start Commands**:
   - **Build Command**: `npm install`
   - **Pre-deploy / Release Command** (runs migrations automatically on every deploy):
     ```bash
     npm run migrate
     ```
   - **Start Command**:
     ```bash
     node src/server.js
     ```
3. **Configure Environment Variables**:
   Under the service **Variables** tab, configure the following:

   | Variable | Value / Description | Example |
   |---|---|---|
   | `PORT` | Service listening port (injected by Railway) | `${{PORT}}` or `5000` |
   | `NODE_ENV` | `production` | `production` |
   | `CLIENT_URL` | Exact URL of your deployed frontend (no trailing slash) | `https://roomiematch.edu` |
   | `DB_HOST` | Railway MySQL internal host | `${{MySQL.MYSQLHOST}}` |
   | `DB_PORT` | Railway MySQL internal port | `${{MySQL.MYSQLPORT}}` |
   | `DB_USER` | Railway MySQL username | `${{MySQL.MYSQLUSER}}` |
   | `DB_PASSWORD` | Railway MySQL password | `${{MySQL.MYSQLPASSWORD}}` |
   | `DB_NAME` | Railway MySQL database name | `${{MySQL.MYSQLDATABASE}}` |
   | `JWT_SECRET` | High-entropy random secret (>= 32 chars) | `prod_jwt_super_secret_64_bytes_hex...` |
   | `JWT_EXPIRES_IN`| Token lifespan | `7d` |
   | `SMTP_HOST` | Production SMTP provider (e.g. SendGrid, Mailgun, Amazon SES) | `smtp.sendgrid.net` |
   | `SMTP_PORT` | SMTP port | `587` |
   | `SMTP_USER` | SMTP username / API key identifier | `apikey` |
   | `SMTP_PASS` | SMTP secret / password | `SG.xxxxxxxx...` |
   | `MAIL_FROM` | Verified sender address matching your domain | `noreply@roomiematch.edu` |
   | `LLM_PROVIDER` | LLM vendor interface | `anthropic` |
   | `LLM_API_KEY` | Anthropic Claude API key | `sk-ant-api03-...` |
   | `LLM_MODEL` | Production Claude model name | `claude-3-5-sonnet-20241022` |
   | `LLM_ENABLED` | Enable LLM matchmaking enhancement | `true` |
   | `ADMIN_EMAIL` | Default administrator account email | `admin@roomiematch.edu` |
   | `ADMIN_PASSWORD`| Initial secure administrator password | `ComplexAdminPass2026!` |

4. **Run Admin Seed (First Time Deployment)**:
   In Railway CLI or via the service terminal:
   ```bash
   npx knex seed:run --specific=01_admin_user.js --knexfile knexfile.js
   ```

---

## 🌐 Step 3: Frontend Deployment on Vercel or Netlify

### Option A: Vercel

1. **Import Project**:
   - Go to [Vercel Dashboard](https://vercel.com) > **Add New Project** > Import repository.
   - Set **Root Directory** to `client`.
   - **Framework Preset**: `Vite`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
2. **Environment Variables**:
   Add in Project Settings:
   - `VITE_API_URL`: Your Railway backend URL (e.g., `https://api-production.up.railway.app`) or leave as `/api` if using reverse-proxy rewrites.
3. **Single-Page Application (SPA) Routing & Proxying (`vercel.json`)**:
   If routing API requests or serving client routes:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://api-production.up.railway.app/api/$1" },
       { "source": "/socket.io/(.*)", "destination": "https://api-production.up.railway.app/socket.io/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

### Option B: Netlify

1. **Import Repository**:
   - Go to [Netlify Dashboard](https://app.netlify.com) > **Add new site** > Import from Git.
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`
2. **SPA Redirects (`_redirects` file or `netlify.toml`)**:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://api-production.up.railway.app/api/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

---

## 🔒 Step 4: Security, Cookies & CORS Lock

1. **Cross-Origin Resource Sharing (CORS)**:
   - The backend restricts origins strictly to `process.env.CLIENT_URL` (configured in `server/src/app.js`).
   - `credentials: true` is enabled to allow httpOnly authentication cookies.
   - Ensure `CLIENT_URL` matches the exact frontend origin (including protocol `https://` and without trailing slash).

2. **Production Cookie Security**:
   - In production (`NODE_ENV === 'production'`), authentication cookies automatically enable:
     - `httpOnly: true` (prevents XSS access to tokens).
     - `secure: true` (ensures cookies are transmitted exclusively over HTTPS).
     - `sameSite: 'lax'` (or `'none'` if frontend and backend sit on different second-level domains without a proxy rewrite).
   > **Note on Custom Domains**: If your frontend is `roomiematch.edu` and backend is `api.roomiematch.edu`, cookies can share domain `.roomiematch.edu` or use `sameSite: 'lax'`. If frontend is on `.vercel.app` and backend is on `.railway.app`, either use rewrite proxying (recommended) or set `sameSite: 'none'` with `secure: true`.

3. **HTTP Strict Security Headers (Helmet)**:
   - Helmet is pre-configured on all backend routes to prevent clickjacking, MIME-sniffing, and cross-site framing.

---

## 🔄 Step 5: Automated Database Migrations & Rollbacks

When deploying new code changes:
- Railway executes `npm run migrate` before starting the web process.
- To roll back a migration in production:
  ```bash
  # Via Railway CLI or container terminal
  cd server
  npm run migrate:rollback
  ```

---

## 🩺 Step 6: Post-Deployment Verification Checklist

- [ ] Health Check: `curl https://api.yourdomain.com/api/health` returns `{"status":"ok"}`.
- [ ] HTTPS: SSL certificate is valid on both frontend and backend.
- [ ] Admin Login: Successfully log in at `/login` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- [ ] Real-time WebSocket: Confirm chat message exchanges connect via WSS (`wss://api.yourdomain.com/socket.io/`).
- [ ] Email Service: Verify student email registration OTP delivery through production SMTP.
