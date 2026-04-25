# Database CRUD Operations (Plain and Useful)

This file explains how CRUD is used in this project.
CRUD means Create, Read, Update, Delete.

## Collections used

- `users`
- `sequencingrequests`
- `results`
- `announcements`
- `auditlogs`

## Create examples

- User registration creates a `User` document
- New sample upload creates a `SequencingRequest`
- Admin announcement creates an `Announcement`

## Read examples

- Login reads user by email
- Doctor dashboard reads assigned requests/results
- Admin panel reads users/logs/announcements

## Update examples

- Request status changes across workflow steps
- Profile edits update user fields
- Analysis result updates existing result data

## Delete examples

- Admin deletes invalid records (if permitted by route)
- Cleanup flow can remove stale or test data

## Good practice reminders

- Validate input before DB write
- Keep role checks on sensitive operations
- Log important admin operations in `AuditLog`
