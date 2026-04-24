> **© 2026 GeneLab. All rights reserved.**
> *Confidential and Proprietary. Do not copy, distribute, or modify without express written permission.*

---

# 📊 GeneLab: Database CRUD Operations (MongoDB)

This document provides a comprehensive overview of the **Create, Read, Update, and Delete (CRUD)** operations currently implemented in the GeneLab backend using MongoDB and Mongoose.

## 1. User & Authentication (User Model)

*   **CREATE:** 
    *   POST /api/auth/register: Creates a new User document (Doctor or Admin) with hashed passwords and default clinical settings.
*   **READ:**
    *   POST /api/auth/login: Authenticates the user and retrieves their document to generate a JWT.
    *   GET /api/profile: Retrieves the authenticated user's profile details.
*   **UPDATE:**
    *   PUT /api/profile: Updates user metadata (Full Name, Phone, Specialization, etc.).
    *   PUT /api/profile/security: Updates the password field (with re-hashing).
*   **DELETE:**
    *   Managed via the Admin Dashboard to remove authorized clinical personnel.

## 2. DNA Sequencing Data (DNA Model)

*   **CREATE:**
    *   POST /api/dna/upload: Stores raw file metadata and creates a DNA entry linked to the doctor's ID.
    *   POST /api/dna/paste: Creates a new sequencing record from a manually entered nucleotide string (A, C, T, G).
*   **READ:**
    *   GET /api/dna/my-files: Retrieves a list of all sequencing records owned by the logged-in doctor.
    *   GET /api/dna/:id/reverse-complement: Performs a read operation with transformation.
*   **UPDATE:**
    *   POST /api/dna/:id/analyze: Processes the raw sequence and updates the document with analyzed data (GC content, length, etc.).
    *   POST /api/dna/:id/pattern: Updates the analysis metadata with search results.
*   **DELETE:**
    *   DELETE /api/dna/:id: Permanently removes the sequencing record and associated metadata from the database.

## 3. Clinical Notes (Note Model)

*   **CREATE:**
    *   POST /api/notes: Creates a new clinical note linked to a specific patient or sequencing result.
*   **READ:**
    *   GET /api/notes: Retrieves all notes for the authenticated doctor.
    *   GET /api/notes/:id: Retrieves the full content of a specific note.
*   **UPDATE:**
    *   PUT /api/notes/:id: Modifies the content or title of an existing clinical note.
*   **DELETE:**
    *   DELETE /api/notes/:id: Removes the note from the database.

## 4. System Logs & Admin (Log Model)

*   **CREATE:**
    *   Automatically triggered on significant events (failed logins, data deletions, admin actions).
*   **READ:**
    *   GET /api/admin/logs: (Admin Only) Retrieves the system-wide audit trail.
    *   GET /api/admin/stats: Aggregates data from multiple collections to show system health.
*   **UPDATE:**
    *   PUT /api/admin/doctors/:id: Admins can update the verification status of doctor accounts.
*   **DELETE:**
    *   DELETE /api/admin/logs/clear: (Admin Only) Allows clearing of old log data.

---

**Note:** All CRUD operations are protected by JWT authentication and role-based access control (RBAC).
