# Design System

TalentOS uses a calm, architectural editorial design system built around restrained surfaces, crisp 1px borders, tabular technical metadata, and mathematically verified contrast in both light and dark color schemes.

## Color Tokens and Contrast Verification

All foreground/background pairings were verified with the WCAG 2.x relative luminance formula:

| Token | Light Mode | Dark Mode | Verified Contrast |
|-------|------------|-----------|-------------------|
| Canvas | `#F7F8FA` | `#101412` | Base plane |
| Primary Surface | `#FFFFFF` | `#171D19` | Elevated content container |
| Secondary Surface | `#F0F2F5` | `#202722` | Subtle structural grouping |
| Primary Text | `#17211D` | `#F0F4F1` | 15.54:1 (light), 16.73:1 (dark) |
| Secondary Text | `#647067` | `#A0ADA4` | 4.87:1 on canvas, 5.18:1 on surface (light), 7.35:1 (dark) |
| Border | `#E2E7E3` | `#2D3830` | Hairline structural separation |
| Primary Accent | `#176B4D` | `#65C49A` | 6.47:1 with white ink (light), 8.77:1 with `#101412` ink (dark) |
| Soft Accent | `#E7F2EC` | `#1B2E25` | 5.64:1 with `#176B4D` text (light) |
| Error | `#B42318` | `#F97066` | 6.57:1 on white (light) |
| Warning | `#B54708` | `#FDB022` | 5.43:1 on white (light) |
| Success | `#16794D` | `#65C49A` | 5.42:1 on white (light) |

## Design Rationales (Intentionality Ledger)

- **Color choice**: Deep forest slate (`#176B4D`) paired with cool neutral canvas (`#F7F8FA`) gives TalentOS a composed, non-generic enterprise character without purple AI gradients or neon glows.
- **Typography**: Self-hosted `Geist` handles long-form candidate dossiers and tables cleanly, while `Geist Mono` with `tabular-nums` aligns stage counts, dates, file sizes, and requirement coverage ratios.
- **Border radius**: Restrained 6px to 10px radii differentiate controls, cards, and modals without pill-shaping every element.
- **Shadow & glass restraint**: Surfaces rely on crisp 1px borders; subtle shadow is reserved for elevated modals and hero specimens, and subtle backdrop blur appears solely on the scrolled public header.
- **Brand mark (`assets/branding/`)**: Three stepped interlocking bars forming an architectural "T" and ascending progress keystone; legible at 16px favicon, monochrome capable, zero sparkle/orb iconography.
- **Theme implementation**: Uses `<meta name="color-scheme" content="light dark">`, CSS `light-dark()` with `prefers-color-scheme` fallbacks, synchronous FOUC prevention, a quick 2-state chrome toggle, and a 3-state (System / Light / Dark) control in settings.

## Accessibility Standards

- Semantic landmarks (`header`, `nav`, `main`, `footer`), skip-to-content link, one `h1` per page.
- Base-layer `cursor: pointer` on all enabled controls and `cursor: not-allowed` on disabled controls.
- Native HTML `<dialog>` with `showModal()`, `overscroll-behavior: contain`, Escape dismissal, and pointer-position backdrop light-dismiss fallback.
- Container-queried responsive tables (`@container (width < 640px)`) collapsing into readable mobile cards with injected column labels.
- Keyboard and single-pointer stage selector alternatives alongside Kanban drag-and-drop.
- Global `prefers-reduced-motion: reduce` support and `MotionConfig reducedMotion="user"`.
