# GeneLab Product Requirements Document (PRD)

## 1. Product Summary
GeneLab is a role-based DNA workflow platform for two personas:
- Doctor: upload DNA data, run analysis, compare, report, and clinical notes/history.
- Admin: manage users and platform operations, monitor activity, and enforce governance.

## 2. Goals
- Deliver a secure and usable doctor workflow for DNA operations.
- Provide strong admin oversight with audit visibility.
- Maintain clear role boundaries between doctor and admin capabilities.
- Ensure responsive, consistent UI across all pages.

## 3. Non-Goals
- No claim of direct medical diagnosis from UI alone.
- No direct modification of core analysis logic from admin UI.

## 4. User Roles
## 4.1 Doctor
- Access own profile and own workflow data.
- Upload DNA files and run analysis.
- Compare sequences and generate reports.
- Save notes and view history.

## 4.2 Admin
- Manage doctor accounts and statuses.
- View global data and analytics.
- Access activity logs and policy controls.
- Update platform settings.

## 5. Functional Requirements
## 5.1 Authentication
- Email/password login.
- Session token support.
- Remember-me support.
- Role-aware redirect after login.

## 5.2 Doctor Profile
- Fields: full name, email, phone, specialization, hospital/organization, license number, profile photo.
- Actions: view, update, change photo, change password, logout.
- Restrictions: cannot access admin views or system-wide admin controls.

## 5.3 Admin Profile
- Fields: full name, email, phone, role, status, created date, profile photo.
- Actions: update personal info, change photo, change password, logout.
- Restrictions: cannot access platform without authentication; cannot modify core analysis logic directly from UI.

## 5.4 Doctor Workflow
- DNA upload page.
- Analysis page.
- Comparison page.
- Reports page.
- Notes/history page.

## 5.5 Admin Workflow
- Dashboard metrics.
- Doctor management.
- Data registry view.
- Activity logs.
- Platform settings.

## 6. UX and Design Requirements
- Shared visual system across all pages.
- Consistent sidebar/header/card composition in each role module.
- Mobile and desktop responsive layout.
- Accessible contrast and typography.

## 7. Security and Compliance Requirements
- Protected API routes for profile and admin operations.
- Password change endpoint with current-password verification.
- Audit visibility in admin logs.
- Proprietary licensing and legal notice in repository.

## 8. Acceptance Criteria
- Role-based profile pages are distinct and aligned with requirements.
- Profile save/load works through API with safe fallback.
- Profile photo upload and preview works.
- Admin pages use one unified design shell.
- No page-level syntax or diagnostics errors.
