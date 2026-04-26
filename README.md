# 🧬 GeneLab: Advanced DNA Sequencing & Analysis System

<!-- cSpell:disable-file -->

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)

GeneLab is a high-performance, professional biotech platform designed for clinical DNA sequencing and genomic research workflows. It provides a seamless interface for **Doctors** to analyze clinical data, **Researchers** to process genetic sequences, and **Administrators** to monitor system integrity.

---

## 🚀 Tech Stack

### Frontend (High-Fidelity UI)
- **Styling:** ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
- **Animations:** ![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=flat&logo=greensock&logoColor=white) (3D DNA Visualization)
- **Data Viz:** ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white) (Clinical Analytics)
- **Logic:** ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) (ES6+ Vanilla)

### Backend (Enterprise Logic)
- **Runtime:** ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
- **Framework:** ![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
- **Database Logic:** ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat&logo=mongodb&logoColor=white)
- **Security:** ![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=json-web-tokens&logoColor=white) ![BcryptJS](https://img.shields.io/badge/BcryptJS-37474F?style=flat) ![Helmet](https://img.shields.io/badge/Helmet-000000?style=flat)

---

## ✨ Key Features

- **🧬 DNA Visualization:** Interactive 3D double-helix background powered by GSAP.
- **📊 Professional Dashboard:** Real-time clinical metrics and sequencing status tracking.
- **🔐 Clinical-Grade Security:** JWT-based role access control (Doctor, Researcher, Admin).
- **📁 Secure Uploads:** Validated sequencing file ingestion with automated cleanup.
- **📈 Analytics Engine:** Integrated Chart.js for visualizing DNA match percentages and patient statistics.

---

## 📁 Project Architecture

```text
genelab/
├── backend/            # Express API, Mongoose Models, Auth Middleware
│   ├── models/         # Database schemas (User, Result, DNAFile)
│   ├── routes/         # API endpoints
│   ├── services/       # DNA processing logic
│   └── server.js       # Entry point
├── frontend/           # Vanilla JS/CSS/HTML UI
│   ├── pages/          # HTML views (Dashboard, Login, Analytics)
│   ├── js/             # Frontend logic & API handlers
│   └── css/            # Theme & Custom Styles
├── PRD.md              # Product Requirements Document
├── SRS.md              # Software Requirements Specification
└── README.md           # Project Documentation
```

| Directory | Purpose |
| :--- | :--- |
| [`backend/`](./backend/) | Core API, Authentication, and Database Logic. |
| [`frontend/`](./frontend/) | High-fidelity UI with GSAP animations and Chart.js. |
| [Docs](./PRD.md) | Technical specifications and project guides (Root level). |

---

## 🛠️ Installation & Setup

### 1. Backend Configuration
1. **Navigate to backend:** `cd backend`
2. **Install Dependencies:** `npm install`
3. **Configure `.env`:**
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_secure_random_key
   ```
4. **Seed Initial Data (Optional):**
   ```powershell
   node seed.js
   ```

### 2. Running the Application
- **Start Backend:** `npm run dev` (Starts server on `http://localhost:5000`)
- **Launch Frontend:** Open `frontend/pages/index.html` in your browser.
  - *Recommended: Use a static server like VS Code Live Server for the best experience.*

---

## 📖 Documentation Index

| Category | Documents |
| :--- | :--- |
| **Guides** | [Quick Start](./Quick_Start_Summary.md) • [MongoDB Setup](./MONGODB_BACKEND_SETUP_GUIDE.md) • [Implementation](./Implementation_Guide.md) |
| **Code Base** | [File Explanations](./EVERY_CODE_FILE_EXPLANATION.md) • [Structure](./FULL_FILE_STRUCTURE_CODE_EXPLANATION.md) • [CRUD Patterns](./DATABASE_CRUD_OPERATIONS.md) |
| **Technical** | [PRD](./PRD.md) • [SRS](./SRS.md) • [Architecture](./System_Architecture.md) • [Technical PRD](./DNA_Sequencing_PRD_Technical_Doc.md) • [UI/UX Spec](./UI_UX_Specification.md) |

---

## 🛡️ Security Implementation

- **Stateless Authentication:** JWT with custom `auth` middleware for role-based permissions.
- **Data Integrity:** Mongoose strict schema enforcement for clinical data.
- **Protection Layer:**
  - `helmet` for HTTP header protection.
  - `express-rate-limit` for DDoS prevention.
  - `express-validator` for strict input sanitization.
  - `bcryptjs` for high-entropy password hashing.

---

© 2026 GeneLab DNA Sequencing. All rights reserved.
