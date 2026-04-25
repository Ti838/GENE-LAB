# SRS (Software Requirements Specification)

## 1. Scope

GeneLab manages DNA sequencing requests from submission to report access.

## 2. Functional requirements

- FR1: User authentication (login/register as needed)
- FR2: Role-based authorization (doctor/admin)
- FR3: Sequencing request create/read/update flows
- FR4: Result and analysis data handling
- FR5: Profile management
- FR6: Announcement management
- FR7: Admin audit visibility

## 3. Non-functional requirements

- NFR1: Reasonable response time for normal workloads
- NFR2: Input validation and safe error handling
- NFR3: Maintainable module separation
- NFR4: Consistent API response format

## 4. Constraints

- Backend stack fixed to Node.js + Express + MongoDB
- Frontend remains multi-page vanilla setup

## 5. Assumptions

- MongoDB service is available
- Environment variables are configured correctly
- Users access with modern browser
