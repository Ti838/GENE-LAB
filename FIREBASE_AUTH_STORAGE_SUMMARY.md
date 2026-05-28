# Firebase Auth + Storage Summary

This document explains what was changed in the codebase and what still must be configured so the authentication and file-upload flow works in production.

## What was implemented

- Real Google sign-in through Firebase Authentication.
- Email/password login and registration with JWT session handoff.
- Forgot-password and reset-password flow.
- JWT middleware that accepts either local JWTs or Firebase ID tokens.
- Firebase Storage uploads for:
  - profile photos
  - DNA report files
  - medical/report attachments
- Profile photo persistence instead of preview-only behavior.
- DNA upload and analysis flow updated to keep sequence parsing working while using Firebase-backed storage.
- Documentation updated to remove stale S3-based upload guidance.

## Files changed

- Backend auth flow: [backend/routes/auth.js](backend/routes/auth.js)
- JWT and role middleware: [backend/middleware/auth.js](backend/middleware/auth.js)
- User model: [backend/models/User.js](backend/models/User.js)
- Profile uploads: [backend/routes/profile.js](backend/routes/profile.js)
- DNA uploads: [backend/routes/dna.js](backend/routes/dna.js)
- Firebase Admin helper: [backend/services/firebaseAdmin.js](backend/services/firebaseAdmin.js)
- Firebase Storage helper: [backend/services/firebaseStorage.js](backend/services/firebaseStorage.js)
- Frontend auth page logic: [frontend/js/auth.js](frontend/js/auth.js)
- Frontend profile upload logic: [frontend/js/profile.js](frontend/js/profile.js)
- Docs: [README.md](README.md), [DEPLOY.md](DEPLOY.md), [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md), [RENDER.md](RENDER.md)

## Required environment variables

Set these in every deployment target that runs auth or uploads:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket.appspot.com
```

Optional alternative:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={...full service account json...}
```

## What you must do for it to work

1. Create a Firebase project.
2. Enable Google sign-in in Firebase Authentication.
3. Create a Firebase service account for the backend.
4. Set the Firebase environment variables in Vercel and local `.env` files.
5. Make sure the Firebase Storage bucket exists and is writable.
6. Keep `MONGO_URI`, `JWT_SECRET`, `RESEND_API_KEY`, and `FASTAPI_URL` configured as before.
7. Restart or redeploy the backend and frontend after setting the variables.

## Validation already performed

- Node syntax checks passed on the edited backend and frontend files.
- Package installs were refreshed in the root and backend packages.
- Code error scan returned no errors for the touched files.

## Important notes

- The app still uses MongoDB and JWT as the system of record for sessions.
- Firebase is used as an integration layer for Google login and file storage.
- If Firebase variables are missing, uploads and Google sign-in will not work.
- The auth page keeps body scrolling enabled for smaller screens, so the form does not clip on mobile.
