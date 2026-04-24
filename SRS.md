# GeneLab Software Requirements Specification (SRS)

## 1. Introduction
This SRS defines functional and non-functional requirements for GeneLab.

## 2. System Scope
GeneLab supports DNA workflow operations for doctor users and governance operations for admin users through a web interface and API backend.

## 3. Definitions
- Doctor: operational clinical/research user.
- Admin: system governance user.
- Profile API: endpoints for profile read/update/password/photo.

## 4. Overall Description
## 4.1 Product Perspective
- Frontend: multi-page HTML, shared CSS, JS modules.
- Backend: Express APIs with JWT-based protection.

## 4.2 User Classes
- Doctor users with workflow-focused permissions.
- Admin users with system-wide management permissions.

## 5. Functional Requirements
## 5.1 Account and Session
- FR-01: User shall login with email and password.
- FR-02: System shall persist session token in storage.
- FR-03: System shall redirect by role after authentication.

## 5.2 Profile Management
- FR-10: System shall retrieve current profile through profile API.
- FR-11: System shall update profile fields through profile API.
- FR-12: System shall update password through profile password API.
- FR-13: System shall update profile photo through profile photo API.
- FR-14: On API failure, frontend shall keep local fallback state without hard crash.

## 5.3 Role Isolation
- FR-20: Doctor pages shall not expose admin controls.
- FR-21: Admin pages shall provide user/data/log/settings controls.

## 5.4 UI Consistency
- FR-30: Admin pages shall use shared shell pattern (sidebar, header, content cards).
- FR-31: Doctor pages shall use shared shell pattern in doctor module.

## 6. Non-Functional Requirements
## 6.1 Security
- NFR-01: Protected routes must require valid bearer token.
- NFR-02: Password change must validate current password.

## 6.2 Performance
- NFR-10: Main pages should be interactive within acceptable browser load time under normal local conditions.

## 6.3 Usability
- NFR-20: Layout must remain usable on desktop and tablet/mobile breakpoints.

## 6.4 Maintainability
- NFR-30: Shared style and shared JS modules should drive cross-page behavior to reduce duplication.

## 7. External Interface Requirements
- Frontend calls backend REST APIs under /api.
- Profile APIs:
  - GET /api/profile
  - PUT /api/profile
  - PUT /api/profile/password
  - PUT /api/profile/photo

## 8. Constraints
- Static multi-page architecture (non-SPA).
- Browser environment for frontend runtime.

## 9. Verification
- Diagnostics checks on edited files must report no syntax errors.
- Functional smoke checks: profile load, save, photo update, password update prompt.
