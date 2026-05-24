# PRD (Product Requirements Document)

## Product goal

Build a secure and usable DNA sequencing workflow platform for doctors and admins.

## Primary users

- Doctor
- Admin

## Core outcomes

- Fast sequencing request handling
- Reliable result management
- Transparent admin controls and logs
- Async analysis support through Redis and the FastAPI bio service

## Key features

- Auth and role-based access
- Request submission and tracking
- DNA analysis support workflow
- Report and notes support in doctor side
- Announcement management
- Admin analytics and audit visibility
- Docker Compose local stack for MongoDB, Redis, backend, and bio service

## Non-functional expectations

- Secure authentication and protected routes
- Stable API behavior
- Clear, maintainable folder structure
- Beginner-friendly documentation
- Clear failure handling when external bio APIs are unavailable

## Success signal

A new developer can run and understand the project quickly,
and doctors/admin can complete daily tasks without confusion.
