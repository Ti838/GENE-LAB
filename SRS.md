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
- FR8: Async DNA analysis job tracking
- FR9: Bio service communication for instant and deep analysis

## 3. Non-functional requirements

- NFR1: Reasonable response time for normal workloads
- NFR2: Input validation and safe error handling
- NFR3: Maintainable module separation
- NFR4: Consistent API response format

## 4. Constraints

- Backend stack fixed to Node.js + Express + MongoDB
- Redis is used for queueing and job coordination
- FastAPI bio service is part of the system architecture
- Frontend remains multi-page vanilla setup

## 5. Assumptions

- MongoDB is available either locally or through Docker Compose
- Redis is available when async analysis is enabled
- Environment variables are configured correctly
- External APIs may be unavailable temporarily, so analysis paths need graceful failure handling
- Users access with modern browser
