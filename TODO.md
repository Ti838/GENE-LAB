# GENELAB Production Audit — TODO

## Phase 1 (Non-production removal)
- [x] Step A: Replace analytics stub logic
  - File: `genelab/frontend/js/analytics.js`


- [x] Step B: Remove hardcoded chart datasets
  - File: `genelab/frontend/js/charts.js`

- [x] Step C: Remove admin simulated completion (setTimeout)
  - File: `genelab/backend/routes/admin.js`


- [x] Step D: Remove fabricated system logs modal content
  - File: `genelab/frontend/js/doctor-dashboard.js`

- [x] Step E: Remove hardcoded sidebar identity defaults


  - File: `genelab/frontend/pages/doctor/dashboard.html`

## Phase 2 (Data correctness + placeholders)
- [x] Verify dashboards/charts use backend values only (`/dna/my-files`, requests, etc.)


- [x] Remove any visible placeholders that appear without real backend data.

- [x] Fix malformed/duplicated HTML head/link tags.


## Phase 3 (Duplicates + cleanup + audit)
- [ ] Repo-wide scan for demo/mock/test stubs and remove them.
- [ ] Remove dead code, unused assets, duplicate routes/pages/components.
- [ ] Remove debug/console logs (except structured logging).

## Acceptance checks
- [ ] No demo/mock success messages.
- [ ] No client-side fabricated analytics/reports/charts.
- [ ] Admin actions modify real DB.
- [ ] Authentication fully functional and protected routes work.

