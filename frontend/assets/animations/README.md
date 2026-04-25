# frontend/assets/animations

This folder is only for motion assets used by the UI.

## Recommended formats

- Lottie JSON for UI loaders and small motion
- Animated SVG for lightweight vector effects

## Performance checklist

- Keep file size low (prefer smaller exports).
- Avoid autoplay-heavy animations on every page.
- Reuse one animation file across multiple pages when possible.

## Naming convention

Use `<page>-<purpose>` style, for example:
- `login-loader.json`
- `dashboard-pulse.svg`
- `dna-helix-loop.json`

Keep static images out of this folder.
