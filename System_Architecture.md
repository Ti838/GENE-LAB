# System Architecture (Written Like a Human, Not a Diagram Bot)

## Big picture

The system has four cooperating parts:
- Frontend: what users see and click
- Backend: where API, logic, auth, and database handling happen
- Queue layer: Redis/BullMQ for async analysis jobs
- Bio service: FastAPI microservice for sequence processing

## Frontend layer

- Multi-page HTML structure under `frontend/pages/`
- Shared JS logic under `frontend/js/`
- Styling through `frontend/css/` and `frontend/theme.css`

## Backend layer

- Express app in `backend/server.js`
- Feature routes in `backend/routes/`
- Data models in `backend/models/`
- Shared middlewares in `backend/middleware/`
- Domain logic in `backend/services/`

## Service layer

- Redis runs the BullMQ queue and worker coordination
- FastAPI in `bioservice/main.py` handles instant analysis, deep analysis, and PDF report generation
- NCBI/MyVariant are external network services used by the bio service when available

## Data layer

MongoDB stores all persistent data:
- users
- sequencing requests
- results
- announcements
- audit logs
- analysis jobs
- uploaded DNA file metadata

## Request flow (simple)

1. Browser sends API request
2. Route validates auth/role
3. Queue or service handles business logic
4. MongoDB persists state when needed
5. JSON response returns to browser

## Analysis flow

1. Doctor submits a DNA file or raw sequence
2. Backend validates request and stores job metadata
3. If the work is async, BullMQ pushes it to Redis
4. Worker calls the FastAPI bio service
5. Result is written back to MongoDB and returned to the UI

## Why this architecture works

- Easy to understand for new team members
- Easy to expand feature-by-feature
- Clear separation between UI and backend logic
- Async analysis stays off the main request path
