# Quick Start Summary

This is the shortest reliable path to run GeneLab.

## Fastest path: Docker Compose

1. Install Docker Desktop.
2. From the project root, run:

```powershell
docker compose up --build
```

3. Open the API health check:

```text
http://localhost:5000/api/health
```

If this returns `OK`, the full stack is up.

## Manual path: local Node + MongoDB

1. Start MongoDB locally.
2. Install backend packages:

```powershell
cd backend
npm install
```

3. Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/genelab
JWT_SECRET=your_long_secret_key
FASTAPI_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
```

4. Start backend:

```powershell
npm run dev
```

5. Optional seed:

```powershell
node seed.js
```

## Frontend

Open files from `frontend/pages/` in a browser or static server:

- `index.html`
- `login.html`
- `doctor/*.html`
- `admin/*.html`

## Important note

The backend needs MongoDB. Redis powers the job queue. The FastAPI bio service handles DNA analysis work.
