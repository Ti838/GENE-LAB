# GeneLab

GeneLab is a role-based DNA workflow platform with separate doctor and admin experiences, unified design components, and profile APIs.

## Repository structure

- frontend: multi-page web UI (landing, auth, doctor and admin modules)
- backend: Express APIs, auth, DNA endpoints, profile endpoints
- PRD.md: product requirements
- SRS.md: software requirements specification
- LICENSE: proprietary licensing terms

## Tech stack

- Frontend: HTML, Tailwind CDN, shared CSS, GSAP, Chart.js
- Backend: Node.js, Express, JWT auth, MongoDB models

## Key capabilities

- Role-based login and redirects
- Doctor DNA workflow: upload, analysis, compare, reports, notes/history
- Admin control workflow: dashboard, personnel, data registry, logs, settings
- Profile management: load, update, password change, photo update

## Local run

1. Backend
	- cd backend
	- npm install
	- npm start

2. Frontend
	- open frontend/pages/index.html in browser
	- or serve frontend as static files through your local server

## API highlights

- POST /api/auth/register
- POST /api/auth/login
- GET /api/profile
- PUT /api/profile
- PUT /api/profile/password
- PUT /api/profile/photo

## Documentation

- Product requirements: PRD.md
- Software requirements: SRS.md

## Legal

This repository is proprietary and all rights are reserved.
See LICENSE for usage restrictions.

## Note

GeneLab UI supports DNA data workflows and system operations. It is not a substitute for certified medical diagnosis.
