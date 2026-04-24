> **© 2026 GeneLab. All rights reserved.**
> *Confidential and Proprietary. Do not copy, distribute, or modify without express written permission.*

---

# 🛠️ GeneLab: Implementation Guide

This guide provides technical details for developers on how to maintain, extend, and integrate the GeneLab biotech platform.

## 1. Project Initialization

GeneLab is structured as a full-stack Node.js application with a decoupled frontend.

### 1.1 Backend Setup
- **Environment:** Node.js 16+ is recommended.
- **Dependencies:** Run npm install in the /backend directory.
- **Configuration:** Ensure the .env file contains valid credentials for:
    - MONGODB_URI: Connection string for MongoDB Atlas.
    - JWT_SECRET: A high-entropy string for signing authentication tokens.
- **Run:** Use npm run dev for development with hot-reloading (Nodemon).

### 1.2 Frontend Setup
- **Architecture:** Vanilla JS/HTML/CSS. No build step required.
- **Deployment:** The /frontend directory can be served via any static web server (NGINX, Apache, or VS Code Live Server).
- **Core Script:** dna-background.js must be included in every page to provide the 3D visual experience.

## 2. Core Implementation Modules

### 2.1 The Design System (theme.css)
To change global colors or glass effects:
- Modify CSS variables in the :root (Dark Mode) or body[data-theme="light"] sections.
- Blur intensity is controlled by the --blur variable applied via .glass-panel.

### 2.2 3D Visualization (dna-background.js)
The DNA helix is rendered using Three.js. Key parameters for adjustment include:
- CFG.numBasePairs: Adjusts the length of the strand.
- CFG.autoRotateY: Adjusts the spinning speed.
- targetX: Controls the horizontal centering logic based on page layout.

### 2.3 Authentication Logic (auth.js & api.js)
- auth.js handles form submission and local storage of the JWT.
- api.js serves as a wrapper for all fetch requests, automatically including the Authorization header when a token is present.

## 3. Database Schema

- **User Model:** Stores username, email, password (hashed), and role (Admin/Doctor).
- **Patient Model:** (Planned) To store genetic metadata and sequencing history.
- **Report Model:** (Planned) To link specific DNA analyses to Doctor profiles.

## 4. Best Practices for Developers

1.  **Semantic HTML:** Always use semantic tags (<header>, <main>, <aside>, <footer>) as the 3D engine uses these to calculate layout positioning.
2.  **Theme Consistency:** Never hardcode colors. Always use the provided CSS variables (e.g., var(--cyan), var(--bg-panel)).
3.  **Security:** Always use the authMiddleware on the backend to protect sensitive medical data endpoints.
