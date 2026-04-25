# GeneLab DNA Sequencing System

If you are opening this project for the first time, do not worry.
This README is written like a teammate explaining things to you step by step.

## What this project does

GeneLab is a web system where:
- Patients or doctors can submit sequencing requests
- Doctors can analyze DNA data and write notes/reports
- Admin can manage users, logs, announcements, and system data

Tech stack in plain words:
- Backend: Node.js + Express + MongoDB (Mongoose)
- Frontend: HTML + CSS + Vanilla JavaScript

## Project folders (quick idea)

- `backend/` -> API server and database logic
- `frontend/` -> Website UI pages and browser scripts
- Root markdown files -> all project docs (setup, architecture, PRD, SRS, etc.)

## README map (which README is for what)

These are folder-level operational notes. Read the one for the folder you are editing.

- [`backend/uploads/README.md`](./backend/uploads/README.md)
  - Runtime upload lifecycle and cleanup rules.

- [`backend/utils/README.md`](./backend/utils/README.md)
  - What should and should not go into shared helpers.

- [`frontend/assets/animations/README.md`](./frontend/assets/animations/README.md)
  - Motion asset formats, naming, and performance notes.

- [`frontend/assets/images/README.md`](./frontend/assets/images/README.md)
  - Static image organization and optimization guidance.

- [`frontend/assets/icons/README.md`](./frontend/assets/icons/README.md)
  - Icon system naming and consistency rules.

- [`frontend/components/README.md`](./frontend/components/README.md)
  - Reusable component workflow for this frontend structure.

## Quick start (copy-paste)

1. Clone and open the project.
2. Install backend packages:

```powershell
cd backend
npm install
```

3. Create `.env` in `backend/` and set values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/genelab
JWT_SECRET=change_this_to_a_long_random_secret
```

4. Run backend:

```powershell
npm run dev
```

5. Open frontend page files from `frontend/pages/` in browser.

## Important docs to read next

- [`Quick_Start_Summary.md`](./Quick_Start_Summary.md) -> fastest runbook
- [`MONGODB_BACKEND_SETUP_GUIDE.md`](./MONGODB_BACKEND_SETUP_GUIDE.md) -> MongoDB install/connect/check
- [`FULL_FILE_STRUCTURE_CODE_EXPLANATION.md`](./FULL_FILE_STRUCTURE_CODE_EXPLANATION.md) -> folder structure and why folders exist
- [`EVERY_CODE_FILE_EXPLANATION.md`](./EVERY_CODE_FILE_EXPLANATION.md) -> exact file usage map (source of truth)

## Truth source note

If any two docs feel different, trust [`EVERY_CODE_FILE_EXPLANATION.md`](./EVERY_CODE_FILE_EXPLANATION.md).
That file was aligned directly with current code includes and route mounts.
