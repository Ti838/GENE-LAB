# frontend/assets/icons

All UI icon files should be managed here.

## Primary rule

Use SVG by default for sharp and scalable icons.
Use PNG only when SVG is not possible.

## Naming by usage area

- Navigation icons: `nav-*` (example: `nav-home.svg`)
- Status icons: `status-*` (example: `status-warning.svg`)
- Action icons: `action-*` (example: `action-download.svg`)

## Consistency checks

- Keep stroke width/style consistent inside a set.
- Keep color strategy token-friendly (currentColor or theme-compatible values).
- Remove duplicates before adding new icons.

Do not place banners/photos here.
