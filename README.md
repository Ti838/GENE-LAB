# 🧬 GeneLab: Advanced DNA Sequencing & Analysis System

<!-- cSpell:disable-file -->

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

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
- **Middleware:** ![CORS](https://img.shields.io/badge/CORS-FF6F61?style=flat) ![Morgan](https://img.shields.io/badge/Morgan-000000?style=flat)
- **Dev Tools:** ![Nodemon](https://img.shields.io/badge/Nodemon-76D04B?style=flat&logo=nodemon&logoColor=white)
- **Security:** ![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=json-web-tokens&logoColor=white) ![BcryptJS](https://img.shields.io/badge/BcryptJS-37474F?style=flat) ![Helmet](https://img.shields.io/badge/Helmet-000000?style=flat)

### Database & Storage

- **Database:** ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white) (Atlas Cluster)
- **Uploads:** Multer (Streaming File Support)

---

## ✨ Key Features

- **🧬 DNA Visualization:** Interactive 3D double-helix background powered by GSAP.
- **📊 Professional Dashboard:** Real-time clinical metrics and sequencing status tracking.
- **🔐 Clinical-Grade Security:** JWT-based role access control (Doctor, Researcher, Admin).
- **📁 Secure Uploads:** Validated sequencing file ingestion with automated cleanup.
- **📈 Analytics Engine:** Integrated Chart.js for visualizing DNA match percentages and patient statistics.

---

## 📁 Professional Project Architecture

| Directory | Purpose |
| :--- | :--- |
| [`backend/`](./backend/) | Core API, Auth Middleware, and Mongoose Models. |
| [`frontend/`](./frontend/) | High-fidelity UI with GSAP integration. |
| [`docs/`](#important-documentation) | Root-level technical specification documents. |

---

## 📖 Important Documentation

These documents provide the technical foundation and operational guidance for the GeneLab platform.

### 🛠️ Setup & Operations

- [**Quick Start Summary**](./Quick_Start_Summary.md) — Fast-track local environment setup.
- [**MongoDB Backend Setup Guide**](./MONGODB_BACKEND_SETUP_GUIDE.md) — Connection strings and collection verification.
- [**Implementation Guide**](./Implementation_Guide.md) — Detailed deployment walkthrough.

### 🧠 System Intelligence

- [**Every Code File Explanation**](./EVERY_CODE_FILE_EXPLANATION.md) — **Primary Truth Source** for all file roles.
- [**Full File Structure Explanation**](./FULL_FILE_STRUCTURE_CODE_EXPLANATION.md) — Deep dive into directory hierarchy.
- [**Database CRUD Operations**](./DATABASE_CRUD_OPERATIONS.md) — Documentation for core data interaction patterns.

### 📋 Technical Specifications

- [**PRD (Product Requirements Document)**](./PRD.md)
- [**SRS (Software Requirements Specification)**](./SRS.md)
- [**System Architecture**](./System_Architecture.md)
- [**UI/UX Specification**](./UI_UX_Specification.md)

---

## 🛠️ Installation & Development

1. **Clone the Repository**
2. **Install Backend Dependencies**

   ```powershell
   cd backend
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the `backend` directory:

   ```env
   PORT=5000
   MONGO_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_secure_random_key
   ```

4. **Launch Application (Development Mode)**

   ```powershell
   npm run dev
   ```

   *Note: Uses Nodemon for automatic server restarts.*

---

## 🛡️ Security Implementation

- **Stateless Authentication:** JWT with custom `auth` middleware for role-based permissions.
- **Data Integrity:** Mongoose strict schema enforcement for clinical data.
- **Protection:**
  - `helmet` for HTTP header protection.
  - `express-rate-limit` to prevent brute-force attacks.
  - `express-validator` for strict input sanitization.
  - `bcryptjs` for high-entropy password hashing.

---

© 2026 GeneLab DNA Sequencing. All rights reserved.
