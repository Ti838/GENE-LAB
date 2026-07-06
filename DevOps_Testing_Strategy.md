# 🛠️ GeneLab — DevOps, Deployment & Testing Strategy

**Version:** 2.0.0  
**Scope:** Docker Setup, CI/CD Pipelines, and System Testing  

---

## 1. Docker Orchestration

GeneLab can be run locally using Docker Compose, orchestrating all four layers (MongoDB, Redis, Express Backend, FastAPI BioService).

```
                     ┌──────────────────────────────────┐
                     │          docker-compose          │
                     └────────────────┬─────────────────┘
                                      │
         ┌───────────────┬────────────┴───┬───────────────┐
         ▼               ▼                ▼               ▼
   ┌───────────┐   ┌───────────┐    ┌───────────┐   ┌───────────┐
   │  MongoDB  │   │   Redis   │    │  Backend  │   │Bio Service│
   │  (Port    │   │  (Port    │    │  (Port    │   │   (Port   │
   │  27017)   │   │   6379)   │    │   5000)   │   │   8000)   │
   └───────────┘   └───────────┘    └───────────┘   └───────────┘
```

### 1.1 Local `docker-compose.yml` Configuration
*   **Database Container**: Inits a persistent MongoDB instance using volumes.
*   **Queue Container**: Spins up a lightweight Redis instance for asynchronous BullMQ jobs.
*   **API Container**: Mounts the `./backend` source directory, injecting `.env` file variables.
*   **BioService Container**: Builds the Python environment from `./bioservice/Dockerfile` and exposes port `8000`.

---

## 2. CI/CD Deployment Pipeline

We use GitHub Actions to automate linting, unit testing, and deployment:

```yaml
name: GeneLab CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      # Backend Node.js Environment
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: 'npm'
      - name: Install Node Dependencies
        run: npm ci
      - name: Run ESLint
        run: npm run lint
      - name: Run Backend Tests
        run: npm run test

      # FastAPI Python Environment
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
          cache: 'pip'
      - name: Install Python Dependencies
        run: pip install -r bioservice/requirements.txt
      - name: Run Pytest
        run: pytest bioservice/

  deploy-production:
    needs: validate-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Frontend & Serverless Backend to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 3. Testing Strategy

We employ a pyramid testing strategy spanning unit, integration, and end-to-end flows.

### 3.1 Backend Integration Tests (Jest)
Tests are located in `backend/tests/` and evaluate endpoint routing and DB behavior:
*   **Authentication**: Verifies JWT sign-in, account lockout after 5 incorrect password attempts, and email verification blockades.
*   **DNA Routes**: Asserts that `PUT /api/dna/file/:id/review` returns `401 Unauthorized` for researchers and `403 Forbidden` if a patient attempts report modification.

### 3.2 BioService Unit Tests (pytest)
Tests are situated in `bioservice/tests/` and evaluate sequence operations:
*   **Translation Assertions**: Confirms `ATG` initiates translation and stop codons terminate amino acid chains properly.
*   **Regex Assertions**: Verifies that input sequences containing illegal characters (like `X` or `Z` in DNA) fail verification checks immediately.

### 3.3 End-to-End System Tests
*   Automated test suites (e.g., using `Playwright` or `Selenium`) simulate user login, sequence submission, review approvals, and PDF generations.

---

## 4. Dashboard Analytics & Monitoring

To monitor deployment performance in production, GeneLab utilizes:
*   **Uptime Monitoring**: Integrations tracking endpoint status updates at `/api/health`.
*   **Prometheus Metrics**: Ingests traffic rates, error frequency, and response delays:
    *   `genelab_sequence_upload_total`: Tracks the aggregate volume of sequence uploads.
    *   `genelab_analysis_processing_seconds`: Measures the computational duration of alignment jobs.
*   **Grafana Dashboards**: Renders traffic charts, database connectivity status, and serverless response latency trends.
