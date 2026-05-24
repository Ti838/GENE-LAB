# GenLab AI — Genomics Analysis Platform

This repository contains the GenLab AI project: a genomics analysis frontend (static) and a backend composed of an Express API and a Python FastAPI microservice that performs BioPython, MyVariant.info, and NCBI BLAST analyses.

This README focuses on getting the complete analysis backend running locally and preparing for production deployment (Vercel for frontend, Render/Railway for services, MongoDB Atlas, Upstash Redis).

## Components
- `frontend/` — static UI (HTML/CSS/JS)
- `backend/` — Express API, job queue glue, MongoDB models
- `bioservice/` — FastAPI microservice (BioPython + MyVariant + BLAST)
- `docker-compose.yml` — local orchestration: mongo, redis, bioservice, backend, worker

## Quick start (local, recommended)

1. Install Docker Desktop (Windows) and ensure `docker` and `docker compose` are available.
2. From repo root run:

```bash
docker compose up --build
```

3. Health checks:

```bash
curl http://localhost:8000/health/   # FastAPI
curl http://localhost:5000/api/health   # Express
```

4. Quick test (instant analysis):

```bash
curl -X POST http://localhost:5000/api/analysis/instant-analysis \
  -F "sequence=ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG" \
  -F "name=test_seq"
```

## Environment variables
See `backend/.env.example` for backend envs and `bioservice/requirements.txt` for Python deps.

Important variables:
- `MONGO_URI` — MongoDB connection string (use Atlas in production)
- `FASTAPI_URL` — URL of the bioservice (e.g., `http://bioservice:8000` in Docker Compose)
- `DISABLE_QUEUES` — set to `true` in Vercel to avoid starting workers
- `S3_BUCKET`, `S3_REGION` and AWS credentials — for production uploads
- `REDIS_URL` — Upstash or RedisCloud connection string for queues
- `NCBI_API_KEY` — optional key for NCBI BLAST

## Deploy guide (summary)
- Frontend: deploy to Vercel (static site). Use `vercel.json` in repo root.
- Backend API: deploy to Vercel serverless functions (place `api/` exports). Set `DISABLE_QUEUES=true` on Vercel and set `MONGO_URI`, `JWT_SECRET`, `FASTAPI_URL`.
- Bioservice & Worker: deploy to Render (Docker) or Railway. Worker requires `MONGO_URI`, `REDIS_URL`, `FASTAPI_URL`.
- MongoDB: host on MongoDB Atlas (free tier).
- Redis: use Upstash or Redis Cloud.

## CI / Tests
- A GitHub Action `e2e-compose.yml` is included to validate `docker compose config` and run a basic health check in CI.

## Files added/modified for final delivery
- `backend/` — S3 support, worker entry, queue handling
- `bioservice/` — BioPython engines, MyVariant integration, BLAST integration, PDF report generator
- `docker-compose.yml` — local orchestration including `worker`
- `DEPLOY.md`, `RENDER.md` — deployment docs

## Next recommended steps
1. Create MongoDB Atlas cluster and set `MONGO_URI` in your deployment environment.
2. (Optional) Create Upstash Redis and set `REDIS_URL` if you want queued processing; otherwise use `DISABLE_QUEUES=true` until workers are deployed.
3. Deploy `bioservice` and `worker` to Render (see `RENDER.md`).
4. Deploy frontend + serverless API to Vercel and set environment variables.

If you want, I can perform one of the next steps for you: run local compose validation (if Docker is available), scaffold `render.yaml` for Render, or create a Postman collection of API tests. Tell me which and I will proceed.
# 🧬 GeneLab: Advanced DNA Sequencing & Analysis System

<!-- cSpell:disable-file -->

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)

GeneLab is a high-performance, professional biotech platform designed for clinical DNA sequencing and genomic research workflows. It provides a seamless interface for **Doctors** to analyze clinical data, **Researchers** to process genetic sequences, and **Administrators** to monitor system integrity.

---

## 🚀 System Stack

### Frontend

- **Styling:** ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
- **Animations:** ![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=flat&logo=greensock&logoColor=white) (3D DNA Visualization)
- **Data Viz:** ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white) (Clinical Analytics)
- **Logic:** ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) (ES6+ Vanilla)

### Backend + Services

- **Runtime:** ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
- **Framework:** ![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
- **Database Logic:** ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat&logo=mongodb&logoColor=white)
- **Queue:** ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white) + BullMQ for async analysis jobs
- **Bio Service:** ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white) for instant and deep DNA analysis
- **Security:** ![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=json-web-tokens&logoColor=white) ![BcryptJS](https://img.shields.io/badge/BcryptJS-37474F?style=flat) ![Helmet](https://img.shields.io/badge/Helmet-000000?style=flat)

---

## ✨ Key Features

- **🧬 DNA Visualization:** Interactive 3D double-helix background powered by GSAP.
- **📊 Professional Dashboard:** Real-time clinical metrics and sequencing status tracking.
- **🔐 Clinical-Grade Security:** JWT-based role access control (Doctor, Researcher, Admin).
- **📁 Secure Uploads:** Validated sequencing file ingestion with automated cleanup.
- **📈 Analytics Engine:** Integrated Chart.js for visualizing DNA match percentages and patient statistics.
- **🧪 Analysis Pipeline:** Redis-backed async jobs plus FastAPI analysis and PDF report generation.

---

## 🧱 Runtime Architecture

GeneLab runs as four cooperating parts:

- **Frontend:** multi-page HTML, CSS, and vanilla JS under `frontend/`
- **API backend:** Express server in `backend/server.js`
- **Queue layer:** Redis + BullMQ for async analysis jobs
- **Bio service:** FastAPI microservice for sequence processing and reports

MongoDB stores users, sequencing requests, results, announcements, audit logs, and analysis jobs.

---

## 📁 Project Layout

```text
genelab/
├── backend/            # Express API, Mongoose models, queue integration
├── bioservice/         # FastAPI DNA analysis microservice
├── frontend/           # Vanilla JS/CSS/HTML UI
├── PRD.md              # Product Requirements Document
├── SRS.md              # Software Requirements Specification
├── docker-compose.yml  # Local full-stack runtime definition
└── README.md           # Project Documentation
```

| Directory | Purpose |
| :--- | :--- |
| [`backend/`](./backend/) | Core API, authentication, database access, and queue orchestration. |
| [`bioservice/`](./bioservice/) | FastAPI analysis engine for instant and deep sequence processing. |
| [`frontend/`](./frontend/) | Multi-page UI with GSAP animations and Chart.js dashboards. |
| [`docker-compose.yml`](./docker-compose.yml) | Local full-stack runtime with MongoDB, Redis, backend, and bio service. |

---

## 🛠️ Installation & Setup

### Option A: Full local stack with Docker Compose

1. Install Docker Desktop.
2. Create a project-root `.env` file if you want to override secrets:

  ```env
  JWT_SECRET=your_secure_random_key
  NCBI_API_KEY=optional_if_you_have_one
  ```

3. Start everything:

  ```powershell
  docker compose up --build
  ```

4. Open the API health check:

  ```text
  http://localhost:5000/api/health
  ```

### Option B: Manual backend + local MongoDB

1. Install Node.js and MongoDB Community Server.
2. Start MongoDB locally on `mongodb://127.0.0.1:27017`.
3. Install backend dependencies:

  ```powershell
  cd backend
  npm install
  ```

4. Create `backend/.env`:

  ```env
  PORT=5000
  MONGO_URI=mongodb://127.0.0.1:27017/genelab
  JWT_SECRET=your_secure_random_key
  JWT_EXPIRY=24h
  FASTAPI_URL=http://localhost:8000
  REDIS_URL=redis://localhost:6379
  ```

5. Start backend:

  ```powershell
  npm run dev
  ```

6. Seed data if needed:

  ```powershell
  node seed.js
  ```

7. Open the frontend pages from `frontend/pages/` in a browser or through a static server.

---

## 📖 Documentation Index

| Category | Documents |
| :--- | :--- |
| **Guides** | [Quick Start](./Quick_Start_Summary.md) • [MongoDB Setup](./MONGODB_BACKEND_SETUP_GUIDE.md) • [Implementation](./Implementation_Guide.md) |
| **Code Base** | [File Explanations](./EVERY_CODE_FILE_EXPLANATION.md) • [Structure](./FULL_FILE_STRUCTURE_CODE_EXPLANATION.md) • [CRUD Patterns](./DATABASE_CRUD_OPERATIONS.md) |
| **Technical** | [PRD](./PRD.md) • [SRS](./SRS.md) • [Architecture](./System_Architecture.md) • [Technical PRD](./DNA_Sequencing_PRD_Technical_Doc.md) • [UI/UX Spec](./UI_UX_Specification.md) |

---

## 🛡️ Security Implementation

- **Stateless Authentication:** JWT with custom `auth` middleware for role-based permissions.
- **Data Integrity:** Mongoose strict schema enforcement for clinical data.
- **Async Processing:** Redis/BullMQ keeps analysis work out of the main request path.
- **Protection Layer:**
  - `helmet` for HTTP header protection.
  - `express-rate-limit` for DDoS prevention.
  - `express-validator` for strict input sanitization.
  - `bcryptjs` for high-entropy password hashing.

---

---

**Status:** Unpublished Personal Project
**Owner:** Timon Biswas

© 2026 Timon Biswas. All rights reserved.
