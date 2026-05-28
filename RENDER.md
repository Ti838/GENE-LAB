# Deploy worker and bioservice to Render

This document shows how to deploy the `bioservice` (FastAPI) and the `worker` (BullMQ processors) to Render using Docker. It assumes you will host the frontend on Vercel and the backend API on Vercel serverless functions; stateful services (MongoDB, Redis) use managed providers (MongoDB Atlas, Upstash) or Render-managed databases.

1) Create a Render account and connect your GitHub repo.

2) Deploy `bioservice` (FastAPI)
- In Render, create a new **Web Service**.
- Choose **Docker** as the environment.
- Set the **Build Command**: leave empty (Dockerfile handles build).
- Set the **Dockerfile Path** to `bioservice/Dockerfile`.
- Set the **Start Command** to `uvicorn main:app --host 0.0.0.0 --port 8000` (Render may auto-detect).
- Add environment variables: `NCBI_API_KEY` (if needed), any other secrets.
- Deploy.

3) Deploy `worker` (BullMQ processors)
- In Render, create a new **Background Worker** (not a web service).
- Choose **Docker** as the environment.
- Set the **Dockerfile Path** to `backend/Dockerfile.worker`.
- Set the **Start Command** (if needed): `node worker.js` (the Dockerfile.worker CMD already does this).
- Add environment variables: `MONGO_URI` (Atlas), `REDIS_URL` (Upstash or Redis Cloud), `FASTAPI_URL` (URL of bioservice on Render), and Firebase envs if the process needs to read or generate file metadata (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`).
- Deploy.

4) Notes
- If you choose Upstash for Redis, use the provided `REDIS_REST_URL` or `REDIS_URL` and credentials — the worker expects a normal Redis connection string.
- For Firebase Storage, configure the Firebase Admin variables above in any deployment target that uploads or reads files.
- For production, ensure `MONGO_URI` points to Atlas and that Atlas allows access from Render's IP ranges or set a network peering / VPC as required.

5) Testing after deploy
- After both services deploy, set `FASTAPI_URL` in Vercel to the bioservice URL and `DISABLE_QUEUES=false` (only if Redis & worker are configured).
- Start a small test: upload a test FASTA via the app UI and confirm a job is queued and completed.
