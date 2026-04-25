# Implementation Guide (Practical Step-by-Step)

Think of this as the build diary for developers.
Not fancy theory, just what to implement and in what order.

## Phase 1: Environment setup

1. Install Node.js LTS
2. Install MongoDB Community
3. Run `npm install` in `backend/`
4. Configure `.env`
5. Start server and verify `/api/health`

## Phase 2: Core backend

1. Define models (`User`, `SequencingRequest`, `Result`, `Announcement`, `AuditLog`)
2. Build auth flow (register/login/JWT)
3. Build request endpoints
4. Add admin endpoints and audit logs
5. Add profile and announcement endpoints

## Phase 3: Frontend pages

1. Setup login and landing pages
2. Build doctor dashboard pages
3. Build admin dashboard pages
4. Connect pages to backend APIs with `frontend/js/api.js`

## Phase 4: QA and hardening

1. Error handling checks
2. Role-based access checks
3. API validation checks
4. Basic manual test cases

## Phase 5: Deployment readiness

1. Move secrets to secure env management
2. Enable CORS rules for deployment domains
3. Add logging and monitoring plan
4. Prepare backup strategy for database
