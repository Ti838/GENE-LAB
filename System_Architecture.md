# GeneLab — System Architecture

**Version:** 2.0.0  
**Deployment:** Vercel (Serverless) + MongoDB Atlas  
**Live URL:** https://gene-lab-gray.vercel.app

---

## Overview

GeneLab is composed of four cooperating layers:

```
Browser (User)
     │
     ▼
Frontend (HTML/JS/CSS — Vercel Static)
     │  API calls via fetch()
     ▼
Backend API (Express.js — Vercel Serverless Functions)
     │                         │
     ▼                         ▼
MongoDB Atlas             FastAPI Bio Service
(Primary Database)        (DNA Analysis Engine)
                               │
                          Redis / BullMQ
                          (Async Job Queue)
```

---

## Layer 1 — Frontend

**Location:** `frontend/`  
**Deployed as:** Vercel static files

```
frontend/
├── pages/
│   ├── login.html          # Auth page (login + register tabs)
│   ├── doctor/             # Doctor/Researcher pages
│   │   ├── dashboard.html  # Live stats + charts
│   │   ├── upload.html     # DNA file upload
│   │   ├── analysis.html   # Analysis results
│   │   ├── notes.html      # Clinical notes CRUD
│   │   ├── reports.html    # Generated reports
│   │   ├── compare.html    # Sequence comparison
│   │   └── profile.html    # User profile settings
│   └── ops-control/        # Admin pages
│       ├── login.html      # Secure admin-only login gateway
│       ├── dashboard.html  # Command console + audit logs
│       ├── doctors.html    # User management
│       ├── data.html       # DNA file registry
│       ├── logs.html       # Full audit log view
│       ├── analytics.html  # Platform analytics
│       ├── settings.html   # System settings
│       └── profile.html    # Admin profile
├── js/
│   ├── api.js              # Central fetch wrapper (auto 401 logout)
│   ├── auth.js             # Login / register / logout logic
│   ├── admin.js            # Admin dashboard logic
│   ├── doctor-dashboard.js # Doctor dashboard live data
│   ├── notes.js            # Clinical notes CRUD
│   ├── profile.js          # Profile form handling
│   ├── charts.js           # Chart.js initialisation
│   ├── app.js              # Global init (GSAP, guards)
│   ├── theme.js            # Dark/light mode toggle
│   └── dna-background.js   # Animated DNA helix canvas
└── css/
    ├── style.css           # Global styles + glassmorphism
    └── theme.css           # CSS custom properties (colors, fonts)
```

**Key design decisions:**
- All API calls go through `api.js` — single place for auth headers and error handling
- 401 responses auto-clear localStorage and redirect to login
- Route guards in `app.js` redirect unauthenticated users before page renders

---

## Layer 2 — Backend API

**Location:** `backend/`  
**Deployed as:** Vercel Serverless Functions via `api/index.js`

```
backend/
├── server.js               # Express app factory
├── routes/
│   ├── auth.js             # Register, login, verify-email, resend-verification
│   ├── admin.js            # Stats, users CRUD, DNA registry, audit logs, requests
│   ├── dna.js              # Upload, my-files, delete, analysis trigger
│   ├── analysis.js         # Analysis jobs, results, instant analysis
│   ├── notes.js            # Clinical notes CRUD
│   ├── profile.js          # Get/update user profile
│   ├── requests.js         # Sequencing requests (doctor → admin workflow)
│   ├── core.js             # General uploads
│   ├── announcements.js    # Announcements CRUD
│   └── metrics.js          # Prometheus metrics (admin-only)
├── middleware/
│   ├── auth.js             # protect, adminOnly, doctorOnly
│   └── errorHandler.js     # Global error handler
├── models/
│   ├── User.js             # Schema: name, email, role, password, lockout, verification
│   ├── DNAFile.js          # Schema: originalName, status, nucleotide data, doctor ref
│   ├── AnalysisJob.js      # Schema: job status, results, worker output
│   ├── Note.js             # Schema: title, content, dnaFile ref, author
│   ├── SequencingRequest.js # Schema: sampleType, status, priority, adminNotes
│   ├── AuditLog.js         # Schema: userId, action, resourceType, IP, timestamp
│   └── Announcement.js     # Schema: title, content, priority, author
├── services/
│   ├── queue.service.js    # BullMQ queue management
│   ├── fastapi.service.js  # HTTP calls to FastAPI bio service
│   ├── alignment.service.js # Sequence alignment helpers
│   ├── cache.service.js    # Redis cache utilities
│   └── logger.service.js   # Structured logging
└── utils/
    ├── mongo.js            # Connection pool (fast-fail, 8s timeout, retry-safe)
    └── email.js            # Resend email integration
```

**Key design decisions:**
- Serverless-safe: no `app.listen()` on Vercel, no blocking filesystem calls
- MongoDB connection is cached per serverless instance with 8-second fast-fail timeout
- `/api/health` is registered before all middleware — works even when DB is down
- Prometheus `collectDefaultMetrics()` is disabled on Vercel to prevent container freeze

---

## Layer 3 — Database (MongoDB Atlas)

All persistent state lives in MongoDB. Collections:

| Collection | Purpose |
|------------|---------|
| `users` | All registered accounts (admin, doctor, researcher, employee) |
| `dnafiles` | Uploaded DNA file metadata + nucleotide analysis results |
| `analysisjobs` | Background analysis job state and results |
| `notes` | Clinical notes written by doctors |
| `sequencingrequests` | Doctor → Admin sequencing workflow |
| `auditlogs` | Full audit trail of every critical action |
| `announcements` | Admin-posted system announcements |

**Connection:** Mongoose ODM with schema validation. All queries are type-safe.

---

## Layer 4 — Bio Service (FastAPI — Optional)

**Location:** `bioservice/`  
**Deployed as:** Render Docker container (optional — not required for core features)

Handles computationally intensive DNA analysis:
- **Instant analysis** — nucleotide frequency, codon analysis, GC content
- **Deep analysis** — NCBI BLAST alignment, MyVariant.info variant lookup
- **Report generation** — PDF clinical reports via ReportLab

```
bioservice/
├── main.py                 # FastAPI app entry point
├── engines/
│   ├── blast_engine.py     # NCBI BLAST integration
│   └── report_generator.py # PDF report builder
└── requirements.txt        # Python dependencies
```

---

## Request Flow

### Standard API Request

```
1. Browser sends fetch() to /api/<route>
2. Vercel routes request to api/index.js (Express handler)
3. protect middleware verifies JWT token
4. Route handler runs business logic
5. Mongoose query reads/writes MongoDB Atlas
6. JSON response returns to browser
```

### DNA Analysis Flow

```
1. Doctor uploads DNA file to /api/dna/upload
2. File saved to /tmp/uploads (Vercel) or uploads/ (local)
3. Backend stores file metadata in MongoDB (status: "uploaded")
4. Analysis job pushed to Redis via BullMQ (if Redis available)
5. Worker calls FastAPI bio service with sequence data
6. Bio service runs BLAST / nucleotide analysis
7. Result written back to MongoDB (status: "analyzed")
8. Doctor's dashboard shows updated stats in real-time
```

---

## Security Architecture

```
Request
  │
  ├── Helmet headers applied (XSS, Frame, HSTS, CSP)
  ├── Rate limiter checked (IP-based)
  ├── CORS origin validated
  │
  ├── /api/health ← No auth required (uptime monitoring)
  │
  └── All other routes:
        ├── JWT verified (protect middleware)
        ├── Role checked (adminOnly / doctorOnly)
        ├── Input validated (express-validator)
        ├── Business logic executes
        └── Action logged to AuditLog collection
```

---

## Environment Detection

The backend detects its runtime environment and adapts:

```js
const isVercel = process.env.VERCEL === '1';

// Filesystem: use /tmp on Vercel, local uploads/ elsewhere
const UPLOADS_DIR = isVercel ? '/tmp/uploads' : './uploads';

// Metrics: disable background polling on Vercel
if (!isVercel) promClient.collectDefaultMetrics();

// Server: never call app.listen() on Vercel
if (!isVercel) app.listen(PORT, ...);
```

---

*GeneLab v2.0.0 | Updated: 2026-05-26*
