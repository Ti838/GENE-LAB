# Deploying Genelab (Frontend + Backend) on Vercel — Free-tier friendly

This guide explains how to deploy the frontend static site and Express serverless API to Vercel, and how to host stateful services (MongoDB, Redis, FastAPI). It focuses on a free-tier-friendly setup that makes the frontend and backend API work together.

1) High-level design
- Frontend: deployed as a static site on Vercel (set project root to `frontend`).
- Backend API: Express app exported in `api/` (serverless functions on Vercel).
- Stateful services: MongoDB (Atlas free tier), Redis (Upstash free tier) or set `DISABLE_QUEUES=true` to avoid Redis for initial deploy, FastAPI (`bioservice`) deployed separately (Render/Railway/Heroku).

2) Required environment variables (set these in Vercel project settings → Environment Variables)
- `MONGO_URI` — MongoDB connection string (MongoDB Atlas). Example: `mongodb+srv://USER:PASS@cluster0.mongodb.net/genelab?retryWrites=true&w=majority`
- `JWT_SECRET` — your JWT signing secret
- `FASTAPI_URL` — URL of deployed `bioservice` (e.g. `https://my-bioservice.onrender.com`)
- `DISABLE_QUEUES` — set to `true` on Vercel to disable BullMQ workers and use synchronous fallback (recommended for first deploy)
- Optional: `REDIS_URL`, `REDIS_PASSWORD` if you use Upstash/Redis Cloud and want queues enabled

3) Steps — quick
1. Create a MongoDB Atlas free cluster and database user. Copy the connection string and set `MONGO_URI` in Vercel.
2. (Optional) Create an Upstash Redis database if you want queues; otherwise set `DISABLE_QUEUES=true` in Vercel.
3. Deploy or host `bioservice` (FastAPI) on Render/Railway/Heroku and set `FASTAPI_URL` in Vercel.
4. Push this repo to GitHub and create a new Vercel project. When creating the project:
   - Select your GitHub repo
   - Set framework to "Other"
   - For the build output or root, set `frontend` so Vercel serves the static pages from `frontend`.
   - Ensure the `api/` folder at repo root is included so Vercel deploys serverless functions.
5. Add the environment variables in Vercel (see list above).
6. Deploy. The frontend will be served by Vercel; serverless endpoints will respond under `/api/*`.

Important: Vercel serverless caveats
- Always set `DISABLE_QUEUES=true` in your Vercel Production environment to avoid starting Redis/BullMQ in serverless functions.
- File uploads: Serverless functions have no persistent disk. Configure S3 (set `S3_BUCKET`, `S3_REGION`, and AWS credentials) and use the built-in S3-backed upload support. If `S3_BUCKET` is not set, the API will reject file uploads on Vercel—use text sequence input instead.
- Do not enable `DISABLE_QUEUES=false` on Vercel unless you have a hosted Redis and external worker processes running (on Render or another host).

4) Local testing before deploy
- Build and run locally with Docker Compose (recommended):
```bash
docker compose up --build
```
- Or run backend locally:
```bash
cd backend
npm install
npm run dev
```

5) Notes & caveats
- File uploads currently use local disk. For production (serverless) switch to S3-compatible object storage. See `Switch uploads to S3` section below.
- Long-running workers must run on a host separate from Vercel (Render/Heroku/Railway). For initial free deploy, set `DISABLE_QUEUES=true` to use synchronous analysis calls.
- If you enable queues, provide `REDIS_URL` and run worker processes (e.g., on Render or a small VPS) that call `node backend/services/worker.js` (or the entrypoint that starts queues).

6) Switch uploads to S3 (recommended)
To make uploads serverless-safe replace `multer` disk storage with streaming to S3. High-level steps:
1. Create an S3 bucket (AWS S3, DigitalOcean Spaces, or Wasabi)
2. Install `@aws-sdk/client-s3` and `multer-s3` in `backend`.
3. Replace multer storage config with `multer-s3` and stream uploads directly to the bucket.

Example (backend change summary):
```js
const { S3Client } = require('@aws-sdk/client-s3')
const multerS3 = require('multer-s3')
const s3 = new S3Client({ region: process.env.S3_REGION, credentials: {...} })
const upload = multer({ storage: multerS3({ s3, bucket: process.env.S3_BUCKET, ... }) })
```

7) Troubleshooting
- If you see connection errors, check `MONGO_URI` and network access in Atlas (allow Vercel IP ranges or set IP access to 0.0.0.0/0 for testing).
- For CORS or same-origin issues, ensure frontend calls `/api/*` (same origin) in production; `frontend/js/api.js` defaults to that.

If you want, I can implement the S3 upload code changes and create a small worker Dockerfile to run BullMQ workers on Render. Tell me which provider you prefer (Render, Railway, or a VPS) and I'll scaffold the required files.
