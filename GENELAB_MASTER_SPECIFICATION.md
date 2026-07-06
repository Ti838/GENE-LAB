# 🧬 GeneLab — Complete Platform Development Master Specification

**Version:** 2.0.0  
**Scope:** Consolidated Technical Architecture, UI/UX, Bioinformatics Processing, and DevOps Strategy  

---

## Table of Contents
1. [Product Requirements Document (PRD)](#1-prd)
2. [UI/UX Information Architecture](#2-uiux-architecture)
3. [Frontend Page Flow](#3-frontend-page-flow)
4. [Backend Folder Structure](#4-backend-folder-structure)
5. [MongoDB Schema Reference](#5-mongodb-schema)
6. [REST API Design](#6-rest-api-design)
7. [Authentication Flow](#7-authentication-flow)
8. [Role Permissions (RBAC)](#8-role-permissions)
9. [API Integration Layer](#9-api-integration-layer)
10. [Bioinformatics Processing Layer](#10-bioinformatics-processing-layer)
11. [PDF Report Engine](#11-pdf-report-engine)
12. [Dashboard Analytics](#12-dashboard-analytics)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Docker Configuration](#14-docker-configuration)
15. [CI/CD Pipeline](#15-cicd-pipeline)
16. [Testing Strategy](#16-testing-strategy)
17. [Complete System Operations Documentation](#17-system-documentation)

---

## 1. PRD (Product Requirements Document)
GeneLab is an educational and clinical research coordination platform. It must **not** diagnose diseases or provide medical treatment recommendations. Instead, it aggregates scientifically sourced raw analysis details from public databases.

### Key Portals
*   **Public Website**: Core product tour, disease glossary, documentation guides.
*   **User Portal**: DNA sequence submission (FASTA/TXT), local genomic calculations, personal reports history.
*   **Doctor Portal**: Patients registry, clinical review panel (status dropdowns, comments, signature stamps).
*   **Researcher Portal**: Batch dataset upload (FASTQ/VCF), DNA/Gene/Protein/Mutation explorers, alignment comparisons.
*   **Admin Portal (Desktop-Only)**: System dashboard, user management, audit logging, system backups.

---

## 2. UI/UX Information Architecture
The layout uses a fixed left sidebar for portals, high-gloss transparent glass cards overlaying moving canvas elements, and HSL-based semantic color indicators:
*   `--cyan` (GC Content/Bio Markers)
*   `--teal` (Approved/Success)
*   `--violet` (Research/Alignments)
*   `--coral` (Pathogenic/Delete)

---

## 3. Frontend Page Flow
```
                 [Guest User Homepage]
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
      [Registration]                 [Login]
            │                           │
    (Verify Email Link)                 ▼
            └──────────────────> [Access Portal Router]
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
       [User Portal]             [Doctor Portal]           [Researcher Portal]
       - Ingestion               - Patient Registry        - Batch Dataset Ingestion
       - Local Analysis          - Clinical Assessment     - Gen/Prot Explorers
       - History Logs            - Signature Uploads       - Alignment Tables
```

---

## 4. Backend Folder Structure
```
backend/
├── middleware/         # Authentication guards, error handlers, rate limiters
├── models/             # Mongoose Schemas (User, DNAFile, AuditLog)
├── routes/             # REST controllers (auth, admin, dna, profile)
├── services/           # Integrations (Firebase Admin, FastAPI Client)
└── utils/              # MongoDB pools, email templates, logger
```

---

## 5. MongoDB Schema
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['doctor', 'researcher', 'admin', 'user'], default: 'user' },
  signatureUrl: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false }
}, { timestamps: true });

const dnaFileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  sequence: { type: String },
  sequenceLength: { type: Number },
  gcContent: { type: Number },
  status: { type: String, enum: ['uploaded', 'analyzing', 'analyzed', 'failed'], default: 'uploaded' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clinicalStatus: { type: String, enum: ['Pending Approval', 'Approved', 'Needs Review'], default: 'Pending Approval' },
  notes: { type: String, default: '' }
}, { timestamps: true });
```

---

## 6. REST API Design
All endpoints are secured via JWT bearer authentication headers.
*   `POST /api/auth/register` - Create user metadata.
*   `POST /api/auth/login` - Verify password and return authorization token.
*   `POST /api/dna/paste` - Submit raw nucleotide sequence and patient details.
*   `PUT /api/dna/file/:id/review` - Save clinical review decisions and comment strings.
*   `PUT /api/profile/signature` - Upload signature image files to Firebase storage.

---

## 7. Authentication Flow
*   Users sign up and receive a verification email containing a secure token.
*   Once verified, login requests yield signed JWT tokens expiring in 1 hour.
*   Route middlewares automatically check token claims to prevent privilege escalation.

---

## 8. Role Permissions
*   **Admins**: Full user controls, audit logs tracking, databases cache flush. Cannot upload DNA sequences.
*   **Doctors**: Sequence upload/paste, clinical assessments review, signature attachment. Cannot edit raw sequence bases.
*   **Researchers**: Ingest batch cohort files (FASTQ/VCF), run MSAs, view explorers. Cannot edit clinical reports.

---

## 9. API Integration Layer
Queries to public database layers for annotations:
1.  **NCBI E-Utilities**: Nucleotide query and PubMed link indexing.
2.  **Ensembl REST API**: Gene transcription boundaries and HGVS coordinates.
3.  **UniProt REST API**: Protein active domain mapping.
4.  **MyGene.info & MyVariant.info**: Gene summaries and variant rsid checks.

---

## 10. Bioinformatics Processing Layer
*   **GC Content**: Guanine/Cytosine ratio calculation.
*   **Translation**: Multi-frame codon translation (ATG start, Stop codons).
*   **ORF Searching**: Search frames for matching sequences with a minimum length of 30 codons.
*   **Pairwise Alignment**: Needleman-Wunsch algorithm execution.

---

## 11. PDF Report Engine
*   Generates a non-modifiable document via **ReportLab** in Python.
*   Stamps patient demographics, sequence metrics, mutation annotations, PubMed references, and the approving doctor's signature image on the canvas.

---

## 12. Dashboard Analytics
Tracks serverless system parameters:
*   Total registered users, sequences processed, and queue states.
*   Prometheus tracking metrics (`genelab_sequence_upload_total`).

---

## 13. Deployment Architecture
*   **Static Assets & Serverless Routes**: Hosted on Vercel.
*   **Genomic Analysis Service**: Run as a containerized FastAPI engine (e.g. Render/AWS App Runner) to handle heavy memory operations.
*   **Data Tier**: Dedicated MongoDB Atlas cluster with automated backups.

---

## 14. Docker Configuration
Local setups utilize Docker Compose to launch MongoDB, Redis, Express Backend, and the Python BioService container.

---

## 15. CI/CD Pipeline
Enforced using GitHub Actions, validating formatting (ESLint), executing Jest integration endpoints, running pytest scripts on sequence translations, and initiating builds.

---

## 16. Testing Strategy
*   **Backend tests (Jest)**: Authentications, role boundaries, and review validations.
*   **FastAPI tests (pytest)**: GC Content algorithms, translation codon tables, and alignment comparisons.

---

## 17. System Documentation
Complete guides on how to boot local Docker environments, hydrations of mock databases (`node seed.js`), and instructions for clinical signature setup are placed in the repository root [README.md](file:///c:/Users/TIMON/Desktop/GENE/genelab/README.md).
