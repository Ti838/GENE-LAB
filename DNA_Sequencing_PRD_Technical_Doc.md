# DNA Sequencing PRD Technical Document

## Purpose

Define the technical plan for handling DNA sequencing workflow inside GeneLab.

## Workflow summary

1. Request is created
2. Sample data gets uploaded/linked
3. Analysis step is performed
4. Result is reviewed and finalized
5. Report becomes available in doctor flow

## Technical components involved

- Routes: request/admin/profile related APIs
- Models: `SequencingRequest`, `Result`, `User`
- Services: DNA analysis helper modules
- Frontend pages: upload, analysis, result, reports

## Reliability checks

- Validate request payloads
- Keep status transitions explicit
- Log admin-sensitive changes where needed

## Future-ready notes

- Add dedicated `/dna/*` backend route group if frontend relies on it
- Standardize notes/report endpoints across frontend and backend
- Add stronger test coverage around analysis transitions
