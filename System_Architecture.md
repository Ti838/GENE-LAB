# System Architecture (Written Like a Human, Not a Diagram Bot)

## Big picture

The system has two main sides:
- Frontend: what users see and click
- Backend: where API, logic, auth, and database handling happen

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

## Data layer

MongoDB stores all persistent data:
- users
- sequencing requests
- results
- announcements
- audit logs

## Request flow (simple)

1. Browser sends API request
2. Route validates auth/role
3. Service/model handles business + DB
4. JSON response returns to browser

## Why this architecture works

- Easy to understand for new team members
- Easy to expand feature-by-feature
- Clear separation between UI and backend logic
