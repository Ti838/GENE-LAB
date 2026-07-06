# 🏛️ GeneLab — System Architecture & Design Specification

**Version:** 2.0.0  
**Deployment Scheme:** Hybrid Vercel Serverless + MongoDB Atlas  

---

## 1. Directory Structure

```
genelab/
├── backend/                  # REST API Server (Express.js)
│   ├── middleware/           # Auth guard, error handlers, rate-limiters
│   ├── models/               # Mongoose Schemas (User, DNAFile, AuditLog)
│   ├── routes/               # API endpoints (auth, dna, admin, profile)
│   ├── services/             # Integrations (Supabase Storage, BioService)
│   ├── utils/                # Database pool connection, logger, emails
│   ├── server.js             # Express app setup
│   └── seed.js               # Database hydration scripts
├── bioservice/               # Heavy Computing (FastAPI)
│   ├── engines/              # BLAST engines, alignment and PDF generators
│   ├── main.py               # FastAPI entry point
│   └── requirements.txt      # Python libraries (Biopython, reportlab)
├── frontend/                 # Client UI (HTML, CSS, JS)
│   ├── css/                  # Glassmorphism design tokens
│   ├── js/                   # central api.js wrapper, auth.js, result.js
│   ├── pages/                # Isolated pages per role
│   │   ├── doctor/           # Doctor Result, Profile, and Reports
│   │   ├── researcher/       # Dataset Exploration dashboards
│   │   ├── ops-control/      # Admin control center (desktop guarded)
│   │   └── login.html        # Portal entry page
│   └── theme.css             # Unified visual tokens
```

---

## 2. MongoDB Schema Specifications

All documents are stored within MongoDB Atlas. Below are the core Mongoose schemas:

### 2.1 User Collection (`users`)
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['doctor', 'researcher', 'admin', 'user'], default: 'user' },
  organization: { type: String },
  specialization: { type: String },
  licenseNumber: { type: String },
  signatureUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date }
}, { timestamps: true });
```

### 2.2 DNA Sequence Collection (`dnafiles`)
```javascript
const dnaFileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  sequence: { type: String },
  sequenceLength: { type: Number },
  gcContent: { type: Number },
  status: { type: String, enum: ['uploaded', 'analyzing', 'analyzed', 'failed'], default: 'uploaded' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientId: { type: String },
  patientAge: { type: Number },
  biologicalSex: { type: String },
  clinicalIndication: { type: String },
  clinicalStatus: { type: String, enum: ['Pending Approval', 'Approved', 'Needs Review'], default: 'Pending Approval' },
  notes: { type: String, default: '' }
}, { timestamps: true });
```

### 2.3 Audit Logs Collection (`auditlogs`)
```javascript
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });
```

---

## 3. Role Permission Matrix

We enforce strict Role-Based Access Control (RBAC) across all API routes:

| Role | Sequence Upload | Review / Comment | Dataset Upload | Admin Console | DB Cache Control |
|---|---|---|---|---|---|
| **Admin** | ❌ No | ❌ No | ❌ No |  Yes |  Yes |
| **Doctor** |  Yes |  Yes | ❌ No | ❌ No | ❌ No |
| **Researcher**| ❌ No | ❌ No |  Yes | ❌ No | ❌ No |
| **User** |  Yes | ❌ No | ❌ No | ❌ No | ❌ No |

---

## 4. REST API Specification

All paths are prefixed by `/api`. Every call must supply a JWT bearer header (`Authorization: Bearer <token>`).

### 4.1 Authentication Service (`/auth`)
*   `POST /auth/register` - Create user. Request body: `{ name, email, password, role }`.
*   `POST /auth/login` - Authenticate user. Returns JWT token and User model metadata.
*   `POST /auth/verify-email` - Validate token. Body: `{ token }`.
*   `GET /auth/me` - Fetch profile metadata for logged-in user.

### 4.2 DNA Management Service (`/dna`)
*   `POST /dna/upload` - Upload FASTA/TXT sequence. Form-data containing key `dnaFile`.
*   `POST /dna/paste` - Post manual sequence. Body: `{ sequence, name, patientId, patientAge, biologicalSex, clinicalIndication }`.
*   `GET /dna/my-files` - List sequences belonging to the logged-in doctor/user.
*   `PUT /dna/file/:id/review` - Save clinical review details. Body: `{ clinicalStatus, notes }`.
*   `DELETE /dna/file/:id` - Remove a sequence from the database.

### 4.3 Profile Service (`/profile`)
*   `PUT /profile` - Update personal details (name, phone, organization, licenseNumber).
*   `PUT /profile/password` - Change security credentials. Body: `{ currentPassword, newPassword }`.
*   `PUT /profile/signature` - Upload clinical signature file. Key: `signature`.

### 4.4 Admin Service (`/admin`)
*   `GET /admin/stats` - Total users, sequences, and pending reviews.
*   `GET /admin/users` - List all users with filtering.
*   `PUT /admin/user/:id` - Update user active/suspended state.
*   `GET /admin/audit-logs` - Chronological log audit list.

---

## 5. Authentication & JWT Token Flow

GeneLab handles user authentication using signature-validated JWT tokens:

```
[ Browser ]                                       [ Express Backend API ]
     │                                                      │
     │ ── 1. POST /auth/login (Credentials) ──────────────> │
     │                                                      │ ── 2. Validate password
     │ <── 3. Return Token (expires 1 hour) ─────────────── │
     │                                                      │
     │ ── 4. GET /api/dna/my-files (Header: Bearer JWT) ──> │
     │                                                      │ ── 5. Decode & Check Role
     │ <── 6. Return JSON payload ───────────────────────── │
```

*   **Expiration Policy**: JWT tokens are signed using a 256-bit secret key with an expiration window of 1 hour.
*   **Authorization Guard**: Accessing route directories (e.g., `/api/admin/*`) triggers an `adminOnly` checking middleware, blocking unauthorized clients with a `403 Forbidden` response.
*   **Dynamic Logout**: If the frontend receives a `401 Unauthorized` response from any request, it automatically purges all active credentials and redirects the client back to `login.html`.

---

## 6. Deployment Architecture

GeneLab utilizes a serverless-friendly hybrid deployment paradigm to ensure rapid response capabilities:
*   **Client Assets & Serverless Handlers**: Deployed globally on Vercel. Static frontend builds are served via edge routers. Backend API requests are executed as Serverless Functions (`api/index.js`).
*   **Bioinformatics Microservice**: Deployed in a standalone container instance (e.g., Render, AWS App Runner). This keeps heavy memory footprints (like Clustal Omega and BLAST datasets) off Vercel's CPU/RAM execution ceilings.
*   **Database Host**: MongoDB Atlas cluster with auto-scaling storage rules and automated replicas.
