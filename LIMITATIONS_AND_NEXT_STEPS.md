## GenLab AI — Limitations, What I Did, and Exact Next Steps for You

This file explains what I implemented, what I cannot run from this environment, and a precise, copy-paste checklist of commands and UI steps you must run locally or in your cloud consoles to complete the deployment.

Summary of what I implemented for you
- Express backend with serverless exports for Vercel (`api/index.js`, `api/[...path].js`).
- Optional S3 uploads (`multer-s3`) and S3-aware worker that downloads files from S3 when processing jobs.
- BullMQ queue integration and a separate worker entry (`backend/worker.js` + `backend/Dockerfile.worker`).
- Python FastAPI bioservice with BioPython engines, MyVariant.info integration, BLAST integration, and PDF generator (`bioservice/`).
- Docker Compose for local dev (mongo, redis, bioservice, backend, worker) and local E2E script (`scripts/local_e2e.sh`).
- Render manifest (`render.yaml`) and GitHub Actions to trigger Render deploys.
- Postman collection for API testing (`tools/postman_genelab_collection.json`).
- Helper scripts: `scripts/setup_github_secrets.sh`, `scripts/deploy_vercel.sh`, `scripts/trigger_render_deploys.sh`.
- Documentation: `DEPLOY.md`, `RENDER.md`, `DEPLOY_CHECKLIST.md`, `README.md`.

What I cannot do from this environment
1. I cannot run Docker or docker-compose here. The agent environment does not have Docker installed (attempting `docker` failed). You must run Docker commands locally.
2. I cannot create or manage your cloud provider resources (Vercel project, Render services, MongoDB Atlas clusters, Upstash Redis instances, or S3 buckets) because those require your accounts and secrets.
3. I will not accept or store secrets directly in this chat. Use provider secret stores (Vercel/Render/GitHub) or run the provided scripts from your own machine where your credentials are available.

Exact steps for you to finish deployment (copy-paste)

0) Prepare local CLI tools
- Install Docker Desktop and ensure `docker` and `docker compose` work.
- Install Git and push the repo to GitHub.
- Install GitHub CLI (`gh`), Vercel CLI (`npm i -g vercel`), and `jq` (optional for JSON parsing).

1) Create required cloud resources
- MongoDB Atlas: create cluster, DB user, network access; copy `MONGO_URI`.
- Upstash Redis (optional): create instance; copy `REDIS_URL`.
- S3 bucket (optional): create bucket and AWS credentials.
- NCBI API key (optional).

2) Create Render services
- Option 1 (UI): Create a Web Service for bioservice using `bioservice/Dockerfile` and a Background Worker using `backend/Dockerfile.worker`.
- Option 2 (manifest): Use `render.yaml` in repo to create services via Render UI.

3) Set secrets in GitHub (recommended) — run locally from repo root
```bash
# export env vars first (example):
export GITHUB_REPO=youruser/genelab
export RENDER_API_KEY="<your_render_api_key>"
export RENDER_BIOSERVICE_ID="<bioservice_service_id>"
export RENDER_WORKER_ID="<worker_service_id>"
export VERCEL_TOKEN="<vercel_token>"
export MONGO_URI="<your_mongo_uri>"
export REDIS_URL="<your_redis_url>"
export S3_BUCKET="<your_bucket>"
export S3_REGION="<your_region>"
export AWS_ACCESS_KEY_ID="<aws_key>"
export AWS_SECRET_ACCESS_KEY="<aws_secret>"
export JWT_SECRET="<strong_jwt_secret>"

# then run the helper that uses gh to set secrets
./genelab/scripts/setup_github_secrets.sh
```

4) Trigger Render deploys (locally)
```bash
export RENDER_API_KEY="<your_render_api_key>"
export RENDER_BIOSERVICE_ID="<bioservice_service_id>"
export RENDER_WORKER_ID="<worker_service_id>"
./genelab/scripts/trigger_render_deploys.sh
```

5) Deploy frontend & serverless to Vercel (locally)
```bash
export VERCEL_TOKEN="<your_vercel_token>"
export VERCEL_PROJECT="<your_vercel_project_name>"
# optional envs already exported will be added by script
./genelab/scripts/deploy_vercel.sh
```

6) Local Docker Compose test (optional but recommended)
```bash
cd genelab
docker compose up --build
# then run health checks
curl -f http://localhost:8000/health/
curl -f http://localhost:5000/api/health
```

7) Post-deploy smoke tests (curl)
```bash
# Replace <vercel-domain> with your Vercel domain
curl -i https://<vercel-domain>/api/health

curl -X POST https://<vercel-domain>/api/analysis/instant-analysis \
  -F "sequence=ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG" \
  -F "name=test_seq"

# If queued, poll:
curl https://<vercel-domain>/api/analysis/analysis-status/<jobId>
curl https://<vercel-domain>/api/analysis/analysis-result/<jobId>
```

If any of the above commands fail, copy the full terminal output and paste it back here. I will analyze the error and provide code or config patches immediately.

What I will do for you next (if you want)
- I will stand by and guide you interactively (step-by-step). After each command you run, paste the output and I will fix issues. This is the recommended path.
- If you prefer automation, run the helper scripts above from your machine (they use your CLI auth and will set secrets / trigger deploys). After the scripts finish, run the smoke tests and paste any failing output here.

Security reminder
- Do not paste secrets into this chat. Use provider secret stores or run helper scripts locally where your credentials are already set.

— End of file
