# Design System

TalentOS uses an operating-system-inspired Liquid Glass design language built around four deliberate surface levels, a neutral Apple-inspired palette with a restrained emerald accent, self-hosted Geist typography, and mathematically verified contrast in both light and dark modes.

## Four-Level Liquid Glass Material System

Glass is applied purposefully to establish spatial hierarchy and navigation clarity, never randomly across dense data tables or form controls.

1. **Canvas (`.surface-canvas`)**: Soft neutral application background (`#F2F4F6` light, `#111416` dark) with subtle top ambient light and zero distracting blobs or animated gradients.
2. **Glass Navigation (`.surface-glass-nav`)**: Floating workspace sidebar, unified compact workspace toolbar, public navigation bar, candidate header, and contextual callouts. Uses controlled translucency (`rgba(255, 255, 255, 0.72)` light, `rgba(27, 32, 35, 0.74)` dark), `backdrop-filter: blur(16px) saturate(140%)`, thin hairline specular edges, subtle top inset highlights, and solid-surface fallbacks when `backdrop-filter` is unsupported.
3. **Glass Overlay (`.surface-glass-overlay`)**: Spotlight command window, native HTML `<dialog>` modals, notification center popover, organization switcher dropdown, and mobile navigation drawers. Elevated with `blur(20px) saturate(150%)`, dimmed backdrop scrim, and soft depth shadow.
4. **Solid Content (`.surface-solid`)**: Opaque surfaces (`#FFFFFF` light, `#1B2023` dark) for candidate directories, job tables, digital dossiers, resume evidence reviews, dense forms, analytical charts, and interview calendars to preserve crisp readability and scrolling performance.

## Color Tokens and Verified Contrast

All foreground and background pairings were verified against WCAG 2.x AA relative luminance ratios (`>= 4.5:1` for normal text):

| Token | Light Mode | Dark Mode | Verified Contrast |
|-------|------------|-----------|-------------------|
| Canvas | `#F2F4F6` | `#111416` | Base application plane |
| Content Surface | `#FFFFFF` | `#1B2023` | Solid content container |
| Primary Text | `#18201E` | `#F2F5F4` | 15.07:1 on canvas, 16.61:1 on surface (light); 16.86:1 on canvas, 14.98:1 on surface (dark) |
| Secondary Text | `#626D68` | `#A5AFAB` | 4.88:1 on canvas, 5.38:1 on surface (light); 8.21:1 on canvas, 7.30:1 on surface (dark) |
| Accent | `#247A60` | `#70C9A6` | 5.21:1 with white ink (light); 9.33:1 with `#111416` ink (dark) |
| Soft Accent | `#E7F4EE` | `#182E26` | 6.05:1 with `#1D6650` ink (light); 8.67:1 with `#86D9B9` ink (dark) |
| Error | `#B42318` | `#F97066` | 6.57:1 on white (light); 5.90:1 on surface (dark) |
| Warning | `#9A3C07` | `#FDB022` | 6.53:1 on `#FEF7EC` (light); 8.93:1 on surface (dark) |
| Borders | `rgba(24, 32, 30, 0.08)` | `rgba(242, 245, 244, 0.09)` | Subtle neutral hairline separation |

## Typography and Layout Hierarchy

- **Primary font**: Self-hosted `Geist` (`geist/font/sans`) with sentence-case headings, balanced weights, tight display tracking (`-0.03em` to `-0.04em`), and `tabular-nums` for counts, salaries, dates, and funnel rates.
- **Monospace discipline**: `Geist Mono` is reserved strictly for technical identifiers (application reference codes, password reset tokens, and keyboard shortcut keycaps), never as decorative eyebrows or marketing labels.
- **Natural interface copy**: Decorative forward slashes, artificial section numbering, uppercase micro-labels, and em dashes are avoided across user-facing screens.

## Motion and Performance Principles

- Subtle operating-system-inspired `transform` and `opacity` transitions powered by the existing `motion` package (active sidebar and segmented-control indicators, Spotlight and dialog entrances, drag-and-drop elevation, and restrained public scroll reveals).
- Zero continuous animation loops, zero animated background shaders or WebGL layers, and zero nested `backdrop-filter` stacks so Intel macOS and mobile devices maintain responsive scrolling.
- Global `prefers-reduced-motion: reduce` CSS rules paired with `<MotionConfig reducedMotion="user">`.

## Accessibility Standards

- Semantic landmarks (`header`, `nav`, `main`, `footer`), skip-to-content link, one `h1` per page.
- Base-layer `cursor: pointer` on enabled controls and `cursor: not-allowed` on disabled controls.
- Native HTML `<dialog>` modals and mobile drawers using `showModal()`, `overscroll-behavior: contain`, Escape dismissal, and backdrop light-dismiss fallback.
- Container-queried responsive tables (`@container (width < 660px)`) collapsing into labeled cards on mobile viewports.
- Full keyboard navigation in Spotlight (`ArrowUp`, `ArrowDown`, `Enter`, `Esc`) and single-pointer stage selectors alongside Kanban drag-and-drop.
- Theme switcher built on `<meta name="color-scheme" content="light dark">`, CSS `light-dark()` with `prefers-color-scheme` fallbacks, synchronous FOUC prevention, quick chrome toggle, and 3-state (System, Light, Dark) settings control.
