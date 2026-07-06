# Every Code File Explanation (Exact Usage Map)

This document is fully aligned with the current codebase.
It explains what each code file does and where it is used.

---

## 0) Folder Purpose Map (Brief)

Use this section first if you are new.

- backend/
  - API server code lives here.

- bioservice/
  - FastAPI DNA analysis microservice.

- backend/middleware/
  - Shared request guards and error handling.

- backend/models/
  - MongoDB data schemas.

- backend/routes/
  - API endpoint handlers.

- backend/services/
  - Business logic and processing helpers.

- backend/uploads/
  - Runtime uploaded files storage.

- backend/utils/
  - Reusable helper functions (shared utilities).

- frontend/
  - All browser-side UI code.

- docker-compose.yml
  - Local multi-service runtime for MongoDB, Redis, backend, and bioservice.

- frontend/pages/
  - HTML pages for public/admin/doctor screens.

- frontend/js/
  - Frontend behavior scripts (API calls, UI logic).

- frontend/css/ and frontend/theme.css
  - Styling and theme token system.

- frontend/assets/
  - Static files (images/icons/animations).

- frontend/components/
  - Reusable UI component files.

---

## 1) Backend Entry and Mount Map

- backend/server.js
  - Backend entry point.
  - Loads middleware and mounts routes.
  - Exact route mounts:
    - /api/auth -> backend/routes/auth.js
    - /api/requests -> backend/routes/requests.js
    - /api/admin -> backend/routes/admin.js
    - /api/profile -> backend/routes/profile.js
    - /api/announcements -> backend/routes/announcements.js
    - /api/dna -> backend/routes/dna.js
    - /api/analysis -> backend/routes/analysis.js
    - /api/health -> in-file health handler

- backend/package.json
  - Backend dependency and script config.

- backend/package-lock.json
  - Exact dependency version lock.

- backend/seed.js
  - Seeds demo users, requests, results, announcements, and audit logs.

- backend/routes/dna.js
  - DNA utility and sequence-related endpoints.

- backend/routes/analysis.js
  - Async analysis endpoints and job orchestration.

---

## 2) Backend Middleware Files

- backend/middleware/auth.js
  - JWT protection and role guards.
  - Used by:
    - backend/routes/auth.js (protect for /me)
    - backend/routes/requests.js
    - backend/routes/admin.js
    - backend/routes/profile.js
    - backend/routes/announcements.js

- backend/middleware/errorHandler.js
  - Central API error formatter.
  - Used by backend/server.js.

---

## 3) Backend Model Files and Real Usage

- backend/models/User.js
  - User schema + password hash/check methods.
  - Used by:
    - backend/routes/auth.js
    - backend/routes/profile.js
    - backend/routes/admin.js
    - backend/models/Announcement.js (author reference)
    - backend/models/SequencingRequest.js (user reference)
    - backend/models/Result.js (user reference)
    - backend/models/AuditLog.js (user reference)

- backend/models/SequencingRequest.js
  - DNA sequencing request schema.
  - Used by:
    - backend/routes/requests.js
    - backend/routes/admin.js
    - backend/models/Result.js (request reference)

- backend/models/Result.js
  - Sequencing result schema.
  - Used by:
    - backend/routes/requests.js

- backend/models/Announcement.js
  - Announcement schema.
  - Used by:
    - backend/routes/announcements.js

- backend/models/AuditLog.js
  - Audit/action log schema.
  - Used by:
    - backend/routes/auth.js
    - backend/routes/requests.js
    - backend/routes/admin.js

---

## 4) Backend Route Files and Real Dependencies

- backend/routes/auth.js
  - Endpoints: register, login, me.
  - Uses: User, AuditLog, auth middleware.

- backend/routes/requests.js
  - Endpoints: list/create/get-by-id/get-result/delete.
  - Uses: SequencingRequest, Result, AuditLog, dnaAnalysis service, protect middleware.

- backend/routes/admin.js
  - Endpoints: stats, users CRUD-like ops, request approve/reject, audit logs.
  - Uses: User, SequencingRequest, AuditLog, protect/adminOnly middleware.

- backend/routes/profile.js
  - Endpoints: get/update profile, change password, update photo.
  - Uses: User, protect middleware.

- backend/routes/announcements.js
  - Endpoints: list/create/delete announcements.
  - Uses: Announcement, protect middleware.

---

## 5) Backend Service Files

- backend/services/dnaAnalysis.js
  - Placeholder analysis output provider.
  - Used by backend/routes/requests.js.

- backend/services/dna.service.js
  - Pure utility functions for sequence parsing and comparison.
  - Current direct usage in routes: not wired directly yet.

- backend/services/fastapi.service.js
  - Axios-based client for the FastAPI bio service.

- backend/services/queue.service.js
  - Redis/BullMQ queue setup, workers, and job persistence.

---

## 6) Frontend Shared Style Files

- frontend/theme.css
  - Global theme token system.
  - Loaded by all active pages.

- frontend/css/style.css
  - Shared component-level styles.
  - Loaded by page templates.

---

## 7) Frontend JS Files: Exact Page Usage

### Common Core JS (loaded by many pages)

- frontend/js/theme.js
  - Loaded by: index, login, all admin pages, all doctor pages.

- frontend/js/api.js
  - Loaded by: index, login, all admin pages, all doctor pages.

- frontend/js/auth.js
  - Loaded by: index, login, all admin pages, all doctor pages.

- frontend/js/app.js
  - Loaded by: index, login, all admin pages, all doctor pages.

- frontend/js/dna-background.js
  - Loaded by: index, login, all admin pages, all doctor pages.

### Admin JS

- frontend/js/admin.js
  - Loaded by:
    - frontend/pages/ops-control/dashboard.html
    - frontend/pages/ops-control/data.html
    - frontend/pages/ops-control/doctors.html
    - frontend/pages/ops-control/logs.html

### Doctor Feature JS

- frontend/js/doctor-dashboard.js
  - Loaded by frontend/pages/doctor/dashboard.html

- frontend/js/upload.js
  - Loaded by frontend/pages/doctor/upload.html

- frontend/js/analysis.js
  - Loaded by frontend/pages/doctor/analysis.html

- frontend/js/compare.js
  - Loaded by frontend/pages/doctor/compare.html

- frontend/js/reports.js
  - Loaded by frontend/pages/doctor/reports.html

- frontend/js/result.js
  - Loaded by frontend/pages/doctor/result.html

- frontend/js/notes.js
  - Loaded by frontend/pages/doctor/notes.html

- frontend/js/profile.js
  - Loaded by:
    - frontend/pages/ops-control/profile.html
    - frontend/pages/doctor/profile.html

### Chart / Analytics JS

- frontend/js/charts.js
  - Loaded by:
    - frontend/pages/ops-control/dashboard.html
    - frontend/pages/ops-control/analytics.html
    - frontend/pages/doctor/dashboard.html
    - frontend/pages/doctor/analytics.html
    - frontend/pages/doctor/result.html

- frontend/js/analytics.js
  - Current include status: no HTML page includes this file.
  - Current implementation status: stub placeholder.

---

## 8) Frontend HTML Pages and Their Feature Scripts

- frontend/pages/index.html
  - Uses common core JS only.

- frontend/pages/login.html
  - Uses common core JS (login/register handled by auth.js).

- frontend/pages/ops-control/login.html
  - Uses common core JS (login handled by auth.js).

- frontend/pages/ops-control/dashboard.html
  - Uses admin.js + charts.js + common core JS.

- frontend/pages/ops-control/analytics.html
  - Uses charts.js + common core JS.

- frontend/pages/ops-control/data.html
  - Uses admin.js + common core JS.

- frontend/pages/ops-control/doctors.html
  - Uses admin.js + common core JS.

- frontend/pages/ops-control/logs.html
  - Uses admin.js + common core JS.

- frontend/pages/ops-control/profile.html
  - Uses profile.js + common core JS.

- frontend/pages/ops-control/settings.html
  - Uses common core JS only.

- frontend/pages/doctor/dashboard.html
  - Uses doctor-dashboard.js + charts.js + common core JS.

- frontend/pages/doctor/upload.html
  - Uses upload.js + common core JS.

- frontend/pages/doctor/analysis.html
  - Uses analysis.js + common core JS.

- frontend/pages/doctor/compare.html
  - Uses compare.js + common core JS.

- frontend/pages/doctor/reports.html
  - Uses reports.js + common core JS.

- frontend/pages/doctor/result.html
  - Uses result.js + charts.js + common core JS.

- frontend/pages/doctor/notes.html
  - Uses notes.js + common core JS.

- frontend/pages/doctor/profile.html
  - Uses profile.js + common core JS.

- frontend/pages/doctor/analytics.html
  - Uses charts.js + common core JS.

---

## 9) Real Mismatch Notes (Codebase Truth)

1. Backend has mounted all routes (including /api/dna and /api/notes) referenced by frontend scripts.
2. frontend/js/analytics.js exists but is currently not included by any page (inline scripting is used instead).
3. backend/services/dna.service.js exists but is not directly wired into active route handlers.
4. The async analysis path depends on Redis, the queue service, and the FastAPI microservice.

