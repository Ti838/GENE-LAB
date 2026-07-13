# GeneLab — Quick Start Guide

**Live (No Setup Needed):** https://gene-lab-gray.vercel.app  
**Admin Login:** (Ask Administrator for credentials)

---

## Option 1 — Use the Live Platform (Instant)

No installation required. Go to the live URL and log in.

| Role | Email | Password |
|------|-------|----------|
| Admin | (Ask Admin) | (Private) |
| Doctor | (Ask Admin) | (Private) |
| Researcher | (Ask Admin) | (Private) |

Or register a new account — email verification is automatic in the current build.

---

## Option 2 — Docker Compose (Full Local Stack)

Runs MongoDB, Redis, Express backend, FastAPI bio service, and the BullMQ worker together.

**Requirements:** Docker Desktop installed and running.

```powershell
# From the genelab/ directory:
docker compose up --build
```

Health checks:
```
http://localhost:5000/api/health   # Express API → should return {"status":"OK"}
http://localhost:8000/health/      # FastAPI bio service
```

---

## Option 3 — Manual Node.js (Backend Only)

Use this if you do not want Docker.

**Requirements:** Node.js 18+ and a MongoDB connection (local or Atlas).

### Step 1 — Install dependencies

```powershell
npm install
```

### Step 2 — Create `backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/genelab
JWT_SECRET=your_secure_random_key_min_32_chars
JWT_EXPIRY=24h
NODE_ENV=development
FASTAPI_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
DISABLE_QUEUES=true
```

> Set `DISABLE_QUEUES=true` if you do not have Redis running locally.

### Step 3 — Start the backend

```powershell
cd backend
npm run dev
```

### Step 4 — Open the frontend

Open `frontend/pages/login.html` in your browser, or use a local static server:

```powershell
npx serve frontend
```

### Step 5 — Seed the database (optional)

```powershell
node seed.js
```

This creates default admin, doctor, and researcher accounts.

---

## Vercel Re-deploy (if you change code)

```powershell
git add .
git commit -m "describe your change"
git push origin main
npx vercel --prod --yes
```

> Always use the CLI for deploys — GitHub auto-deploy is not reliable for this project.

---

## Key URLs (Local)

| Service | URL |
|---------|-----|
| Express API | http://localhost:5000/api/health |
| Admin Dashboard | http://localhost:3000/pages/ops-control/dashboard.html (or open local file) |
| Doctor Dashboard | http://localhost:3000/pages/doctor/dashboard.html (or open local file) |
| FastAPI Bio Service | http://localhost:8000/docs |

---

## What each service does

| Service | Role |
|---------|------|
| Express API | Auth, user management, DNA file metadata, notes, requests, admin |
| MongoDB | All persistent data storage |
| FastAPI | DNA sequence analysis (BLAST, nucleotide frequency, PDF reports) |
| Redis + BullMQ | Async job queue for heavy analysis work |

---

*GeneLab v2.0.0 | Updated: 2026-05-26*
