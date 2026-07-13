# GeneLab AI — Genomics Analysis Platform

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat&logo=vercel&logoColor=white)

GeneLab is a production-grade, cloud-deployed SaaS platform for clinical DNA sequencing and genomic research. It provides a secure interface for **Doctors** to analyze clinical data, **Researchers** to process genetic sequences, and **Administrators** to monitor system integrity.

**Live URL:** https://gene-lab-gray.vercel.app

---

## System Stack

### Frontend
- **Structure:** Multi-page HTML under `frontend/pages/`
- **Styling:** Tailwind CSS via CDN, custom CSS variables
- **Animations:** GSAP (3D DNA helix visualization)
- **Charts:** Chart.js (clinical analytics dashboards)
- **Logic:** Vanilla JavaScript ES6+

### Backend
- **Runtime:** Node.js + Express.js
- **Database:** MongoDB Atlas (via Mongoose ODM)
- **Auth:** JWT + bcryptjs (salt rounds: 12) + Supabase Google sign-in
- **Storage:** Supabase Storage for profile images and DNA/report uploads
- **Security:** Helmet, express-rate-limit, express-validator
- **Queue:** Redis + BullMQ (async DNA analysis jobs)
- **Bio Service:** FastAPI microservice (BioPython + MyVariant + NCBI BLAST)
- **Deployment:** Vercel Serverless Functions

---

## Key Features

- **DNA Upload & Analysis** — Upload FASTA/sequence files, trigger instant or deep BLAST analysis
- **Google Login** — Supabase-backed Google sign-in with JWT session handoff
- **Password Recovery** — Forgot/reset password flow for email/password accounts
- **Clinical Dashboard** — Real-time metrics: stored sequences, analysis count, anomalies detected
- **Clinical Notes** — Create, edit, and delete clinical observations linked to DNA files
- **Admin Command Console** — Full user management, DNA registry, audit logs, announcements
- **Role-Based Access Control** — Doctor, Researcher, Admin, Employee roles
- **Email Verification** — Mandatory for all new accounts
- **Audit Logging** — Every critical action persisted to MongoDB

---

## Project Layout

```text
genelab/
├── api/                    # Vercel serverless entry points
│   ├── index.js            # Main Express handler
│   └── [...path].js        # Catch-all route handler
├── backend/                # Express API, Mongoose models, queue integration
│   ├── middleware/         # auth.js, errorHandler.js
│   ├── models/             # User, DNAFile, AnalysisJob, Note, AuditLog, etc.
│   ├── routes/             # auth, admin, dna, analysis, notes, profile, requests...
│   ├── services/           # queue, cache, fastapi, alignment, logger services
│   └── utils/              # mongo.js (connection), email.js
├── bioservice/             # FastAPI DNA analysis microservice (Python)
│   ├── engines/            # blast_engine.py, report_generator.py
│   └── main.py             # FastAPI app entry
├── frontend/               # Static UI
│   ├── pages/
│   │   ├── doctor/         # dashboard, upload, analysis, notes, profile, reports
│   │   └── ops-control/    # dashboard, doctors, data, logs, analytics, settings
│   ├── js/                 # api.js, auth.js, admin.js, notes.js, profile.js, charts.js...
│   └── css/                # style.css, theme.css
├── vercel.json             # Vercel routing + security headers
├── docker-compose.yml      # Local full-stack runtime
├── package.json            # Root dependency manifest
└── README.md               # This file
```

---

## Local Development

### Option A: Docker Compose (recommended)

```powershell
docker compose up --build
```

Health checks:
```
http://localhost:5000/api/health   # Express API
http://localhost:8000/health/      # FastAPI bio service
```

### Option B: Manual Node + MongoDB

1. Install Node.js and MongoDB Community Server.
2. Install dependencies from the repo root:

```powershell
npm install
```

3. Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/genelab
JWT_SECRET=your_secure_random_key
JWT_EXPIRY=24h
FASTAPI_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://finxktktqzuvrvwqkixj.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_STORAGE_BUCKET=genelab-bucket
NODE_ENV=development
```

4. Start the backend:

```powershell
cd backend
npm run dev
```

5. Open `frontend/pages/login.html` in your browser.

---

## Production Deployment

The platform is fully deployed on Vercel.

| Component | Platform | Status |
|-----------|----------|--------|
| Frontend (HTML/JS/CSS) | Vercel Static | ✅ Live |
| Backend API (Express) | Vercel Serverless | ✅ Live |
| Database | MongoDB Atlas | ✅ Connected |
| Bio Service (FastAPI) | Render / Railway | Optional |
| Job Queue (Redis/BullMQ) | Upstash / Redis Cloud | Optional |

### Required Vercel Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRY` | Token expiry (e.g. `24h`) |
| `FASTAPI_URL` | URL of the FastAPI bio service |
| `FRONTEND_URL` | Allowed CORS origin |
| `NODE_ENV` | Set to `production` |

### Optional Variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Email verification via Resend |
| `REDIS_URL` | BullMQ job queue |
| `SUPABASE_URL` | Supabase API connection URL |
| `SUPABASE_ANON_KEY` | Public Anon API key for client-side load |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret Service Role key for secure backend uploads |
| `SUPABASE_JWT_SECRET` | Secret token signing key used for JWT verification |
| `SUPABASE_STORAGE_BUCKET` | Destination bucket name (e.g. `genelab-bucket`) |
| `SENTRY_DSN` | Error monitoring |
| `NCBI_API_KEY` | Higher BLAST rate limits |

---

## Documentation Index

| Category | Document |
|----------|---------|
| Setup | [Quick Start](./Quick_Start_Summary.md) · [MongoDB Guide](./MONGODB_BACKEND_SETUP_GUIDE.md) |
| Deployment | [Deploy Guide](./DEPLOY.md) · [Deploy Checklist](./DEPLOY_CHECKLIST.md) · [Render Guide](./RENDER.md) |
| Technical | [System Architecture](./System_Architecture.md) · [PRD](./PRD.md) · [SRS](./SRS.md) |
| Reference | [Implementation Guide](./Implementation_Guide.md) · [CRUD Patterns](./DATABASE_CRUD_OPERATIONS.md) |
| Code Docs | [File Explanations](./EVERY_CODE_FILE_EXPLANATION.md) · [Structure](./FULL_FILE_STRUCTURE_CODE_EXPLANATION.md) |
| Security | [Security Audit Report](./SECURITY_AUDIT_REPORT.md) |

---

## Security

- JWT-based stateless authentication with role enforcement
- bcryptjs password hashing (saltRounds: 12)
- Account lockout after 5 failed login attempts (30-minute lock)
- Mandatory email verification for all new accounts
- Helmet.js HTTP security headers (HSTS, X-Frame-Options, CSP)
- express-rate-limit for DDoS protection
- ReDoS-safe regex sanitization on all search inputs
- Full audit log of every critical user and admin action
- No hardcoded secrets — all credentials in environment variables

See [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) for the full audit findings and fixes.

---

## Important URLs

- **Live Platform:** [https://gene-lab-gray.vercel.app](https://gene-lab-gray.vercel.app)
- **Admin Portal:** [https://gene-lab-gray.vercel.app/pages/ops-control/dashboard.html](https://gene-lab-gray.vercel.app/pages/ops-control/dashboard.html)
- **Doctor Portal:** [https://gene-lab-gray.vercel.app/pages/doctor/dashboard.html](https://gene-lab-gray.vercel.app/pages/doctor/dashboard.html)
- **Login Page:** [https://gene-lab-gray.vercel.app/pages/login.html](https://gene-lab-gray.vercel.app/pages/login.html)

## Production Access

| Role | Email | Password |
|------|-------|----------|
| Admin | (Ask Administrator) | (Private) |
| Doctor | (Ask Administrator) | (Private) |
| Researcher | (Ask Administrator) | (Private) |

> Credentials have been removed for security reasons.

---

**Status:** Production Deployed  
**Owner:** Timon Biswas  
**Live URL:** https://gene-lab-gray.vercel.app  
**GitHub:** https://github.com/Ti838/GENE-LAB  

© 2026 Timon Biswas. All rights reserved.
