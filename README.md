> **© 2026 GeneLab. All rights reserved.**
> *Confidential and Proprietary. Do not copy, distribute, or modify without express written permission.*

---

# 🧬 GeneLab: Next-Generation Biotech SaaS Platform

GeneLab is a state-of-the-art bioinformatics platform designed for clinical geneticists and administrators to seamlessly manage, analyze, and track DNA sequencing data. Built with modern web technologies, GeneLab delivers an immersive, high-fidelity user experience powered by real-time 3D rendering and a robust backend.

## 🚀 Key Features

*   **Interactive 3D UI:** A fully responsive, premium "frosted glass" (glassmorphism) interface overlaid on a dynamic, interactive 3D DNA double-helix background powered by Three.js.
*   **Dual-Theme System:** Flawless Light and Dark modes seamlessly integrated into the 3D rendering engine and CSS variables (theme.css).
*   **Role-Based Dashboards:**
    *   **Doctors:** Secure access to clinical profiles, patient analytics, sequencing results, genetic comparisons, clinical notes, and detailed lab reports.
    *   **Admins:** Comprehensive system oversight including high-level analytics, doctor management, system data controls, server logs, and security settings.
*   **Secure Authentication:** JWT-based user authentication, ensuring clinical data privacy and robust access control between Admin and Doctor roles.

## 💻 Technology Stack

**Frontend:**
*   **Core:** HTML5, Vanilla JavaScript, CSS3
*   **Styling:** Custom CSS Custom Properties (theme.css) and TailwindCSS (via CDN) for utility classes.
*   **3D Graphics:** Three.js (r134) & GSAP (for animations).

**Backend:**
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MongoDB Atlas (Mongoose ODM)
*   **Security:** JSON Web Tokens (JWT), bcrypt.js, cors, helmet.

## 📁 Project Structure

`
genelab/
|
+-- frontend/                 # Client-side application
|   +-- css/                  # Layout and component styles (style.css)
|   +-- js/                   # Core logic (app.js, api.js, auth.js, dna-background.js)
|   +-- pages/                # Protected routes
|   |   +-- admin/            # Admin dashboard modules
|   |   +-- doctor/           # Doctor dashboard modules
|   +-- index.html            # Public landing page
|   +-- login.html            # Centralized authentication portal
|   +-- theme.css             # Global design tokens (colors, glass effects, typography)
|
+-- backend/                  # Server-side API and database logic
    +-- controllers/          # Business logic for auth and user management
    +-- models/               # MongoDB schemas
    +-- routes/               # API endpoints
    +-- middleware/           # JWT verification and role authorization
    +-- server.js             # Express application entry point
`

## ⚙️ Quick Start Guide

### 1. Backend Setup
1. Navigate to the backend directory:
   `ash
   cd backend
   `
2. Install dependencies:
   `ash
   npm install
   `
3. Configure Environment Variables:
   Create a .env file in the backend directory:
   `env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secure_secret_key
   NODE_ENV=development
   `
4. Start the server:
   `ash
   npm run dev
   `

### 2. Frontend Setup
1. The frontend relies on vanilla web technologies and does not require a build step.
2. Serve the frontend directory using any local web server (e.g., Live Server extension in VSCode).
3. Open login.html to access the platform.

## 🛡️ License
Copyright (c) 2026 GeneLab. All rights reserved. Unauthorized copying of this file, via any medium, is strictly prohibited. Proprietary and confidential.
