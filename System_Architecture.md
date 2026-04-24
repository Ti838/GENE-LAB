> **© 2026 GeneLab. All rights reserved.**
> *Confidential and Proprietary. Do not copy, distribute, or modify without express written permission.*

---

# 🏗️ GeneLab: System Architecture

GeneLab is built on a modern, decoupled client-server architecture designed for high performance, scalability, and secure data handling in a clinical environment.

## 1. High-Level Architecture

The system follows a classic decoupled Full-Stack architecture:
*   **Client (Frontend):** A rich, dynamic Single Page Application (SPA) built with Vanilla JavaScript, HTML5, and CSS3, heavily featuring WebGL/Three.js for 3D data visualization.
*   **API Layer (Backend):** A RESTful API built with Node.js and Express.js, handling all business logic, authentication, and database transactions.
*   **Data Layer:** MongoDB Atlas (Cloud NoSQL Database), managed via Mongoose ODM for flexible and scalable storage of clinical data.

## 2. Frontend Architecture (Client-Side)

The frontend prioritizes performance and visual fidelity without the overhead of complex frameworks (like React or Vue), opting for a lightweight, modular vanilla approach.

*   **Design System (theme.css):** Acts as the single source of truth for all design tokens (colors, typography, glassmorphism blur values, shadows). It drives the global Light/Dark mode toggling system.
*   **3D Engine (dna-background.js):** A custom-built Three.js script that renders a high-fidelity, real-time 3D DNA double helix. It dynamically adjusts its position and lighting based on the active route (e.g., centering on the login page, shifting right for dashboard sidebars) and deeply integrates with the active CSS theme.
*   **Routing & State (app.js & api.js):** Handles client-side navigation between administrative and doctor dashboards, manages local storage for JWT tokens, and encapsulates all fetch requests to the backend API.
*   **Authentication (auth.js):** Manages the login/registration forms, handles token storage, and intercepts unauthorized access attempts, redirecting users back to the login portal.

## 3. Backend Architecture (Server-Side)

The backend is a secure Node.js REST API structured around the MVC (Model-View-Controller) pattern.

*   **Controllers (/controllers):** Contains the core business logic. E.g., authController.js handles password hashing (bcrypt), token generation, and user validation.
*   **Models (/models):** Mongoose schemas defining the data structure for Users (Doctors/Admins), Patients, and Sequencing Results.
*   **Routes (/routes):** Express routers mapping HTTP endpoints (GET, POST, PUT, DELETE) to their respective controller functions.
*   **Middleware (/middleware):** 
    *   authMiddleware: Verifies the presence and validity of JWT tokens in the Authorization header.
    *   roleMiddleware: Ensures that endpoints restricted to Administrators cannot be accessed by standard Doctor accounts.

## 4. Security & Data Flow

1.  **Authentication Flow:** User submits credentials via the 3D-enhanced login portal. The backend verifies against MongoDB, generates a JWT, and returns it. The frontend stores this token in localStorage.
2.  **Protected Requests:** Every subsequent API request includes the JWT in the Authorization: Bearer <token> header. The backend middleware intercepts the request, verifies the token signature, and grants/denies access.
3.  **Cross-Origin Resource Sharing (CORS):** The Express backend is configured to only accept requests from the trusted frontend origin.

## 5. Deployment Strategy

*   **Frontend:** Can be deployed statically to any CDN or edge network (Vercel, Netlify, AWS S3) for maximum global delivery speed.
*   **Backend:** Can be deployed to Node.js hosting environments (Heroku, Render, AWS EC2) with environment variables securely managing the MongoDB connection string and JWT secrets.
*   **Database:** Hosted on MongoDB Atlas, ensuring automated backups, high availability, and secure peering.
