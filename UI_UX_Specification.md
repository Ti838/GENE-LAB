> **© 2026 GeneLab. All rights reserved.**
> *Confidential and Proprietary. Do not copy, distribute, or modify without express written permission.*

---

# 🎨 GeneLab: UI/UX Specification

GeneLab employs a premium, high-fidelity visual design language. The goal is to provide a clinical, futuristic, yet highly usable interface that handles complex genetic data without overwhelming the user.

## 1. Core Design Philosophy: "Glassmorphism"

The entire UI is built around a modern "frosted glass" aesthetic.
*   **Containers:** Panels, cards, and sidebars use semi-transparent backgrounds with strong backdrop-filter: blur() effects.
*   **Borders:** Subtle, semi-transparent borders give the glass panels defined edges and depth.
*   **Shadows:** Soft, colorful drop-shadows (cyan, teal, violet) are used to indicate elevation and active states.

## 2. Dynamic Theme Engine

The platform features a fully integrated Light and Dark mode toggle.
*   **Dark Mode (Default):** Utilizes deep navy and ink blacks (#050d1a). Glass panels have a dark tint (rgba(8, 22, 40, 0.72)). Text is bright white or cyan for high contrast. This mode highlights the neon glow of the 3D DNA.
*   **Light Mode:** Utilizes clean, clinical whites and soft blues (#edf4fb). Glass panels are heavily frosted white (rgba(255, 255, 255, 0.75)). Text is dark navy. The 3D DNA lighting automatically boosts intensity to maintain visibility against the bright background.

## 3. Real-Time 3D Background

A core component of the UX is the interactive Three.js DNA double helix running constantly in the background.
*   **Immersive but Unobtrusive:** The canvas sits at z-index: 0. It spins continuously and adjusts its lighting dynamically based on the current CSS theme.
*   **Smart Positioning:** The 3D engine scans the DOM. On the login page, the helix is perfectly centered. On dashboard pages with a sidebar, the helix automatically shifts to the right (x = 3.0) to center itself within the remaining available content area.

## 4. Typography

*   **Primary Font:** Inter or Manrope for all body text, ensuring maximum legibility of clinical data at small sizes.
*   **Monospace Font:** JetBrains Mono or similar used exclusively for DNA sequencing arrays (A, C, T, G) to ensure perfect alignment and readability.

## 5. Color Palette

*   **Primary Accents:** Cyan (#00d4ff) and Teal (#06ffa0). Used for primary buttons, active states, and success metrics.
*   **Secondary Accents:** Violet (#a78bfa) and Coral (#ff6b6b). Used for secondary actions, warnings, or distinct data series in charts.
*   **Text Hierarchy:** 
    *   --text: Main readable text.
    *   --text-muted: Secondary descriptions and labels.
    *   --text-faint: Placeholder text and subtle icons.

## 6. Interaction & Animation

*   **Micro-interactions:** Buttons and cards feature smooth 0.3s cubic-bezier transitions, slightly floating upwards (translateY(-2px)) and glowing when hovered.
*   **Page Transitions:** The login portal features a fluid sliding overlay that smoothly masks the underlying forms when toggling between "Sign In" and "Register".
