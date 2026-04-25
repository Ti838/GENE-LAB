# frontend/components

This folder is reserved for reusable UI blocks shared by multiple pages.

## Examples of components to keep here

- Shared sidebar/header blocks
- Reusable cards and table shells
- Common status badges and alert blocks

## Component design rules

- Build components to be reusable with small config inputs.
- Keep page-specific API calls outside component files.
- Reuse theme tokens from `theme.css` instead of hardcoded colors.

## Suggested naming

- `doctor-summary-card.*`
- `admin-activity-table.*`
- `status-pill.*`

If a block is used only once, keep it inside that page until reuse is confirmed.
