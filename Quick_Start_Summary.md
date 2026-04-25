# Quick Start Summary (No Confusion Version)

This is the shortest path to run the system.
If you only want the app running quickly, follow this.

## 1) Install backend dependencies

```powershell
cd backend
npm install
```

## 2) Make `.env`

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/genelab
JWT_SECRET=your_long_secret_key
```

## 3) Start backend

```powershell
npm run dev
```

You should see a success log in terminal.

## 4) Health check

Open:

```text
http://localhost:5000/api/health
```

If API is okay, you get a healthy response.

## 5) Open frontend

Open files from `frontend/pages/`:
- `index.html`
- `login.html`
- `doctor/*.html`
- `admin/*.html`

## 6) Optional: seed test data

```powershell
node seed.js
```

Run this from `backend/` folder.
