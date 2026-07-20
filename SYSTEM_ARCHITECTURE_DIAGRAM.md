# 🏛️ GeneLab — System Architecture Specification & Presentation Diagram

**System Version:** 2.8.0  
**Target Environment:** Hybrid Vercel Serverless Edge + Node.js Express API + Python FastAPI Bio-Service + MongoDB Atlas Cluster (`GeneLab_PROD`)

---

## 🧬 System Architecture Diagram (Mermaid)

```mermaid
flowchart TD
    %% Styling Definitions
    classDef client fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef frontend fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef backend fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef bio fill:#4c1d95,stroke:#a855f7,stroke-width:2px,color:#fff;
    classDef db fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef storage fill:#831843,stroke:#ec4899,stroke-width:2px,color:#fff;

    subgraph CLIENT_LAYER ["📱 Client Layer (Presentation UI)"]
        UI_DOCTOR["🩺 Doctor Portal<br/>(Clinical Diagnostics & Reports)"]:::client
        UI_RESEARCHER["🔬 Researcher Studio<br/>(Genomic Datasets & BLAST)"]:::client
        UI_ADMIN["🛡️ Ops-Control Console<br/>(System Logs & User Control)"]:::client
    end

    subgraph GATEWAY_LAYER ["🌐 Gateway & Frontend Host (Vercel Edge)"]
        STATIC_ROUTER["⚡ Vercel Edge CDN Router"]:::frontend
        AUTH_GUARD["🔐 Session & RBAC Middleware"]:::frontend
    end

    subgraph BACKEND_LAYER ["⚙️ Core API Service (Express.js Engine)"]
        EXPRESS_APP["🚀 Node.js Express REST API"]:::backend
        JWT_ENGINE["🔑 JWT Authentication System"]:::backend
        API_AUTH["GET/POST /api/auth"]:::backend
        API_DNA["GET/POST /api/dna"]:::backend
        API_PROFILE["GET/PUT /api/profile"]:::backend
        API_ADMIN["GET/PUT /api/admin"]:::backend
    end

    subgraph BIOENGINE_LAYER ["🧬 Heavy Computing Bio-Service (FastAPI)"]
        FASTAPI_APP["🐍 Python FastAPI Processing Node"]:::bio
        BIOPYTHON["🧪 BioPython Analysis Engine"]:::bio
        BLAST_RUNNER["⚡ Pairwise & Local BLAST Alignment"]:::bio
        PDF_GEN["📄 Clinical PDF Report Generator"]:::bio
    end

    subgraph DATA_PERSISTENCE ["💾 Data & Storage Layer"]
        MONGO_DB[("🍃 MongoDB Atlas<br/>(GeneLab_PROD Cluster)")]:::db
        SUPABASE_STORE["☁️ Supabase Cloud Storage<br/>(DNA Files & Signatures)"]:::storage
    end

    %% Workflow Connections
    CLIENT_LAYER -->|HTTPS Request| STATIC_ROUTER
    STATIC_ROUTER --> AUTH_GUARD
    AUTH_GUARD -->|Validated Request| EXPRESS_APP

    EXPRESS_APP --> API_AUTH
    EXPRESS_APP --> API_DNA
    EXPRESS_APP --> API_PROFILE
    EXPRESS_APP --> API_ADMIN

    API_AUTH & API_PROFILE & API_ADMIN -->|Mongoose Queries| MONGO_DB
    API_DNA -->|Mongoose Models| MONGO_DB
    API_PROFILE -->|Save Profile/Signatures| SUPABASE_STORE

    API_DNA -->|Internal Microservice Call| FASTAPI_APP
    FASTAPI_APP --> BIOPYTHON
    FASTAPI_APP --> BLAST_RUNNER
    FASTAPI_APP --> PDF_GEN
    PDF_GEN -->|Upload Generated PDFs| SUPABASE_STORE
```

---

## 📂 Organised Clean Repository Map

```
genelab/
├── api/                      # Serverless API Proxy for Vercel
├── backend/                  # REST API Server (Express.js & Node.js)
│   ├── middleware/           # RBAC security & JWT guards
│   ├── models/               # Schemas (User, DNAFile, AuditLog, Note, SystemLog)
│   ├── routes/               # Modular REST endpoints
│   ├── services/             # Storage & BioService connectors
│   ├── utils/                # DB pool & helpers
│   ├── seed.js               # Database seeder
│   └── seed_ultra_fresh.js   # 100% Real Data Seeder Engine
├── bioservice/               # Heavy Computational Microservice (FastAPI & BioPython)
│   ├── engines/              # BLAST engines & PDF report generator
│   ├── main.py               # FastAPI entry point
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Client UI (HTML5, Vanilla CSS, JS ES6+)
│   ├── css/                  # Glassmorphism design tokens
│   ├── js/                   # Central API wrapper & modules
│   └── pages/                # Isolated Role View Dashboards
│       ├── doctor/           # Doctor Clinical Workspace
│       ├── researcher/       # Researcher Metagenomics Studio
│       └── ops-control/      # Admin Security Ops-Control Dashboard
└── System_Architecture.md    # Master Architecture Technical Document
```
