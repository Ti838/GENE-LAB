# MongoDB + Backend Setup Guide (Beginner Friendly)

This guide is for Windows + PowerShell users.
Everything below is copy-paste ready.

## Option A: Full stack with Docker Compose

If you want the easiest setup, use Docker Compose.

1. Install Docker Desktop.
2. From the project root, run:

```powershell
docker compose up --build
```

3. Check the backend:

```text
http://localhost:5000/api/health
```

This path starts MongoDB, Redis, backend, and the FastAPI bio service together.

## Option B: Install MongoDB locally

Use this if you do not want Docker.

### Step 1: Install MongoDB

Install MongoDB Community Server from the official site.
During install, keep default options unless you have a special need.

### Step 2: Start MongoDB service

Usually the service starts automatically after install.
If not, start it manually from the Services app.

### Step 3: Verify MongoDB is running

```powershell
mongosh
```

If the shell opens, MongoDB is running fine.

### Step 4: Install backend packages

```powershell
cd backend
npm install
```

### Step 5: Create backend env file

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/genelab
JWT_SECRET=replace_with_strong_secret
FASTAPI_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
```

### Step 6: Run backend server

```powershell
npm run dev
```

### Step 7: Check backend from browser

```text
http://localhost:5000/api/health
```

If you get a response, setup is done.

## Common issues (quick fixes)

- "Cannot connect to MongoDB":
  - Make sure MongoDB service is actually running.
  - Recheck `MONGO_URI` in `.env`.

- "Port already in use":
  - Change `PORT` in `.env` to another port (example: 5001).

- "Module not found":
  - Run `npm install` again inside `backend/`.

- "Healthcheck fails in Docker":
  - Rebuild images after the Dockerfile and compose updates.
