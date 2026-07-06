# GeneLab Auth + Storage Architecture Summary

This document outlines the authentication and storage design implemented for GeneLab.

## 🏗️ What was Implemented

- **Direct Google Identity Services (GIS) Sign-In**: Native implicit redirect flow in the frontend directly calling Google Auth APIs.
- **Direct JWT ID Token Verification**: The backend receives the Google ID Token and calls Google's tokeninfo API (`https://oauth2.googleapis.com/tokeninfo`) to verify signature, expiration, and audience.
- **Local Storage Volumes**: Uploaded clinical signatures, profile images, and genomic sequence files are stored in the local server `backend/uploads/` directory, which can be mounted as a persistent volume in Railway.
- **Mongoose User Model mapping**: Google profile metadata (names, emails, Google IDs) are mapped to users and authenticated using standard, lightweight backend-signed JWTs.
- **Environment Fallbacks**: The storage adapter uses local storage fallbacks if no third-party storage configuration keys are present.

## 📂 Key Files Updated

- **Google ID token verification**: [backend/routes/auth.js](backend/routes/auth.js)
- **Local file storage and prefixes**: [backend/services/firebaseStorage.js](backend/services/firebaseStorage.js) & [backend/services/supabaseStorage.js](backend/services/supabaseStorage.js)
- **User models**: [backend/models/User.js](backend/models/User.js)
- **Frontend OAuth Redirects**: [frontend/js/auth.js](frontend/js/auth.js)
- **Client Script tags**: [frontend/pages/login.html](frontend/pages/login.html)
- **Deployment Guides**: [README.md](README.md), [System_Architecture.md](System_Architecture.md), [backend/.env](backend/.env)

## ⚙️ Environment Configuration

Set these variables in your local `.env` file or Railway dashboard:

```env
# Google Client ID from Google Cloud Console Credentials page
GOOGLE_CLIENT_ID=your-google-client-id

# Public URL of your backend (for prefixing local asset urls)
BACKEND_URL=http://localhost:5000
```

## 🛠️ Validation Performed

- verified backend boots and connects to MongoDB Atlas without errors.
- Verified frontend pages load cleanly with no script compilation or console errors.
