# Every Code File Explanation (Human-Written + Code-Aligned)

This is the "no confusion" document.
If you are unsure which file is actually used, check here first.

## 0) Folder Purpose Map (Brief)

- backend/ -> API and server logic
- backend/middleware/ -> auth + error handling
- backend/models/ -> MongoDB schemas
- backend/routes/ -> API route handlers
- backend/services/ -> business/domain logic helpers
- backend/uploads/ -> upload file storage at runtime
- backend/utils/ -> shared small helper functions
- frontend/ -> browser-side app code
- frontend/pages/ -> HTML screens
- frontend/js/ -> page scripts and API calls
- frontend/css/ and frontend/theme.css -> styles and theme tokens
- frontend/assets/ -> images/icons/animations
- frontend/components/ -> reusable UI pieces

## 1) Backend Entry and Route Mounts

Main server:
- backend/server.js

Mounted paths from server:
- /api/auth -> backend/routes/auth.js
- /api/requests -> backend/routes/requests.js
- /api/admin -> backend/routes/admin.js
- /api/profile -> backend/routes/profile.js
- /api/announcements -> backend/routes/announcements.js
- /api/health -> defined inside server.js

Other backend root files:
- backend/package.json -> scripts and dependencies
- backend/seed.js -> sample/demo data seed

## 2) Middleware (who uses what)

- backend/middleware/auth.js
  - Used by protected routes in auth, requests, admin, profile, announcements routes

- backend/middleware/errorHandler.js
  - Registered in backend/server.js as global error middleware

## 3) Models (real usage map)

- backend/models/User.js
  - Used in auth.js, profile.js, admin.js
  - Referenced by other models for relationships

- backend/models/SequencingRequest.js
  - Used in requests.js and admin.js

- backend/models/Result.js
  - Used in requests.js

- backend/models/Announcement.js
  - Used in announcements.js and admin.js

- backend/models/AuditLog.js
  - Used in admin.js and key admin operations

## 4) Services

- backend/services/dnaAnalysis.js
  - Used where sequence analysis logic is needed

- backend/services/dna.service.js
  - Present, but not directly mounted as route group in server.js

## 5) Frontend Script Reality Check

Commonly shared scripts:
- frontend/js/api.js
- frontend/js/app.js
- frontend/js/auth.js
- frontend/js/theme.js

Page-specific scripts exist for doctor/admin modules, for example:
- upload.js, analysis.js, result.js, reports.js, admin.js, analytics.js

Important mismatch note (already observed in code scan):
- Some frontend logic calls endpoint patterns like /dna/* or /notes/*
- These route groups are not currently mounted in backend/server.js

## 6) Keep This File Accurate

Whenever you change:
- server route mounts, or
- HTML script includes,

update this document on the same day.
That one habit prevents almost all doc confusion later.
