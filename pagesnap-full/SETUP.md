# PageSnap — Claude Code Development Guide

## Step 1: Install Claude Code

Claude Code is a terminal-based AI coding assistant. Run this once on your machine:

### macOS / Linux / WSL
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### Windows PowerShell
```powershell
irm https://claude.ai/install.ps1 | iex
```

After install, run `claude doctor` to verify. You'll be prompted to log in with
your Claude.ai account (Pro or Max plan required).

---

## Step 2: Set up the project

```bash
# 1. Place this folder somewhere on your machine, e.g.:
mv pagesnap-full ~/projects/pagesnap
cd ~/projects/pagesnap

# 2. Start the database
docker compose up -d
# Wait ~10 seconds for MySQL to initialise

# 3. Set up backend
cd backend
cp .env.example .env
# Edit .env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to random strings
npm install
npm run install:browser     # installs Playwright Chromium (~170MB)
npm run migrate             # creates all DB tables
npm run dev                 # starts API on :3001

# 4. Set up frontend (new terminal)
cd ../frontend
npm install
npm run dev                 # starts React on :5173
```

Open http://localhost:5173 — you should see the PageSnap homepage.

---

## Step 3: Open Claude Code in your project

```bash
cd ~/projects/pagesnap
claude
```

Claude Code reads CLAUDE.md automatically and understands the full codebase.

---

## Useful Claude Code prompts to get started

Paste these directly into Claude Code's terminal interface:

### See the full picture
```
Read CLAUDE.md, then list every file in the project and give me a 
one-line description of what each one does.
```

### Run the app end-to-end
```
Check that the backend and frontend are configured correctly.
Look for any obvious bugs in the convert route, the PDF service, 
and the ConverterBox component. Fix anything you find.
```

### Add a feature
```
Add a "scheduled snapshots" feature: users on the Pro plan can 
enter a URL and a schedule (daily/weekly), and the system will 
automatically reconvert it and update the share link. Add the DB 
table, the backend route, and a UI section in the dashboard.
```

### Fix a bug
```
The rate limiter is using an in-memory map for anonymous users,
which won't work with multiple Node processes. Replace it with 
a MySQL-backed solution using the usage_logs table.
```

### Add Stripe billing
```
Integrate Stripe for the Pro ($5/mo) and Business ($29/mo) plans.
Add /api/v1/billing routes for creating checkout sessions and 
handling the webhook. Update the plan column in users table 
when subscriptions activate or cancel.
```

### Write tests
```
Write Jest unit tests for:
1. urlValidator.js — test that private IPs are blocked
2. rateLimit.js — test that the plan limits are enforced
3. auth routes — test register, login, token refresh

Set up the test runner with npm test.
```

### Production deployment
```
Create a production Dockerfile for the backend and a nginx config
that serves the React build and proxies /api to the Node process.
Also write a GitHub Actions CI/CD workflow that builds, tests, 
and deploys to a Hetzner VPS on push to main.
```

---

## Architecture quick reference

```
POST /api/v1/convert
  → urlValidator (SSRF check)
  → PDFService (Playwright render)
  → StorageService (save to local/R2)
  → MySQL: conversions + share_links tables
  → returns { shareUrl, downloadUrl }

GET /api/v1/share/:shareId         — public metadata
GET /api/v1/share/:shareId/download — serves the PDF file

POST /api/v1/auth/register|login   — returns accessToken + refreshToken
POST /api/v1/auth/refresh          — rotates refresh token
GET  /api/v1/auth/me               — current user

GET  /api/v1/convert               — history (auth required)
GET  /api/v1/user/profile          — profile + usage
GET  /api/v1/user/api-keys         — list API keys
POST /api/v1/user/api-keys         — create key (Pro+ only)
```

## DB tables
- `users`          — accounts, plan, daily counter
- `conversions`    — every PDF job + storage path
- `share_links`    — 8-char slug, expiry, download count
- `api_keys`       — hashed keys for API access
- `refresh_tokens` — rotated JWT refresh tokens

## Env vars to set before launch
- `JWT_ACCESS_SECRET`  — 32+ char random string
- `JWT_REFRESH_SECRET` — different 32+ char string
- `STORAGE_BACKEND=r2` + R2 credentials (for production)
- `STRIPE_SECRET_KEY`  — when billing is ready

## What's NOT built yet (Phase 2)
- Stripe billing integration
- Email verification  
- Scheduled snapshots (cron jobs)
- Batch URL conversion
- Google OAuth
- Admin dashboard

All of these are straightforward extensions — ask Claude Code to build them one at a time.
