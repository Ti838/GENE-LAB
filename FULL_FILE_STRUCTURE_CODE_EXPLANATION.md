# Full File Structure Explanation (Simple and Honest)

People often ask: "Why are so many folders empty?"
Short answer: those folders are intentional placeholders for clean growth.

## Root level

- `backend/` -> API, DB, auth, business logic
- `frontend/` -> pages, scripts, styles, static assets
- Docs (`*.md`) -> guides, specs, and architecture notes

## Backend folder purpose

- `middleware/` -> shared request logic (auth, error handling)
- `models/` -> MongoDB schema files
- `routes/` -> endpoint handlers grouped by feature
- `services/` -> reusable domain logic (analysis/helper functions)
- `uploads/` -> uploaded files (runtime)
- `utils/` -> small helper utilities

## Frontend folder purpose

- `pages/` -> HTML page files
- `js/` -> browser scripts used by those pages
- `css/` + `theme.css` -> styling and theme tokens
- `assets/images` -> static images
- `assets/icons` -> icon files
- `assets/animations` -> animation assets
- `components/` -> reusable UI parts

## Why keep some folders even if empty

Because real projects evolve.
If folder structure is ready now, future features can be added without chaos.

## Exact file usage source

For "which file is used where", read:
- `EVERY_CODE_FILE_EXPLANATION.md`

That file is the most code-aligned one.
