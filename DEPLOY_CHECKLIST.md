# GenLab AI — Deploy Checklist (step-by-step)

Follow these steps to deploy GenLab AI to Vercel (frontend + serverless API) and Render (bioservice + worker). Many steps require you to provide secrets; use each provider's secret management UI or the provided scripts.

1) Push repo to GitHub
- Ensure repository contains the `genelab/` folder and all files. Branch = `main`.

2) Create MongoDB Atlas cluster
- Create free tier cluster, add DB user, allow IP access.
- Copy connection string → set `MONGO_URI` secret.

3) Create Upstash Redis (optional for queues)
- Create a free Redis instance → copy `REDIS_URL`.

4) Create S3 bucket (optional)
- Create bucket and credentials → set `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

5) Deploy bioservice and worker to Render
- Option A: Use Render UI and `render.yaml` (repo manifest is present).
- Option B: Manually create Web Service (bioservice) and Background Worker (worker) and set env vars.

6) Set GitHub secrets (optional, for automation)
- Use `scripts/setup_github_secrets.sh` with `gh` CLI to populate some secrets. Export the secrets as environment variables first, then run the script.

7) Add Vercel project and environment variables
- In Vercel: create project from GitHub repo, set project root to `frontend`.
- Add Production env vars:
  - `MONGO_URI`, `JWT_SECRET`, `FASTAPI_URL` (bioservice URL), `DISABLE_QUEUES=true`, `FRONTEND_URL`.

8) Trigger Render deploys
- Use `scripts/trigger_render_deploys.sh` (requires `jq`) or push to `main` to run GitHub Action.

9) Deploy frontend to Vercel
- Use `scripts/deploy_vercel.sh` (requires `vercel` CLI and `VERCEL_TOKEN` env var).

10) Smoke tests
- Run the curl tests listed in DEPLOY.md under "Test flows".

11) If anything fails
- Paste error logs here and I will patch code/config to fix them.
