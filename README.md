# 🧬 GeneLab: Next-Gen Bioinformatics Platform

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Stack: Node.js](https://img.shields.io/badge/Stack-Node.js-green.svg)](https://nodejs.org/)
[![Database: MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen.svg)](https://www.mongodb.com/)
[![UI: Three.js](https://img.shields.io/badge/UI-Three.js-blue.svg)](https://threejs.org/)

GeneLab is a high-fidelity, professional biotech SaaS platform designed for clinical geneticists and laboratory administrators. It features an immersive **3D DNA visualization engine** and a robust, secure clinical management system.

---

## 📖 Table of Contents
*   [Key Features](#-key-features)
*   [Documentation Center](#-documentation-center)
*   [Technology Stack](#-technology-stack)
*   [Project Structure](#-project-structure)
*   [Quick Start](#-quick-start)
*   [Security & Compliance](#-security--compliance)

---

## 🚀 Key Features

*   **Interactive 3D UI:** Premium glassmorphism interface with a real-time, responsive 3D DNA double-helix background powered by **Three.js** and **GSAP**.
*   **Dual-Theme System:** Intelligent Light and Dark modes with real-time 3D lighting adjustments.
*   **DNA Analysis Suite:** High-performance nucleotide sequence viewer, mutation analysis, and pattern matching.
*   **Role-Based Dashboards:** Distinct, secure interfaces for **Doctors** (clinical data) and **Admins** (system oversight).
*   **Secure Authentication:** JWT-based auth with clinical-grade password hashing and encrypted PHI data.

---

## 📚 Documentation Center

Explore our detailed technical and product documentation:

| Document | Description |
| :--- | :--- |
| 🏗️ **[System Architecture](./System_Architecture.md)** | Deep dive into the full-stack engine and data flow. |
| 💾 **[Database CRUD Operations](./DATABASE_CRUD_OPERATIONS.md)** | Full guide to all MongoDB actions (Create, Read, Update, Delete). |
| 🎨 **[UI/UX Specification](./UI_UX_Specification.md)** | Our "Frosted Glass" design system and 3D visualization logic. |
| ⚡ **[Quick Start Summary](./Quick_Start_Summary.md)** | The fastest way to get the project running locally. |
| 🛠️ **[Implementation Guide](./Implementation_Guide.md)** | Developer-focused integration and extension manual. |
| 🧬 **[DNA PRD & Technical Doc](./DNA_Sequencing_PRD_Technical_Doc.md)** | Product requirements for the sequencing portal. |

---

## 💻 Technology Stack

- **Frontend:** HTML5, Vanilla JavaScript (ES6+), TailwindCSS, Three.js, GSAP.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB Atlas (Mongoose ODM).
- **Security:** JWT, bcrypt.js, Helmet, CORS.

---

## 📁 Project Structure

`ash
genelab/
├── backend/            # Express API, Controllers, Models, Routes
├── frontend/           # Client-side (HTML, CSS, JS)
│   ├── css/            # Global styles
│   ├── js/             # Core logic & 3D engine
│   └── pages/          # Secure UI modules (Admin/Doctor)
├── System_Architecture.md
├── DATABASE_CRUD_OPERATIONS.md
└── README.md           # You are here
`

---

## ⚙️ Quick Start

### 1. Backend Setup
`ash
cd backend
npm install
npm run dev
`
*Note: Ensure your .env file is configured with MONGODB_URI and JWT_SECRET.*

### 2. Frontend Setup
Simply serve the rontend/ directory using a local web server (e.g., Live Server).

---

## 🛡️ Security & Compliance

> **Important:** All clinical data is treated as Protected Health Information (PHI). GeneLab implements industry-standard encryption and security protocols to ensure patient confidentiality.

---

## ⚖️ License
© 2026 GeneLab. All rights reserved. Unauthorized copying of this project, via any medium, is strictly prohibited. Proprietary and confidential.
