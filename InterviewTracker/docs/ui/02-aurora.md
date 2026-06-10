# Aurora — UI v2

One additive CSS layer (`src/styles/aurora.css`, loaded last) plus three small
TS modules. No new dependencies; the "advanced" feel comes from modern
platform features with graceful degradation everywhere.

## Signature interactions

| Feature | Mechanism | Fallback |
|---|---|---|
| View morphing between tabs | View Transitions API (`lib/viewTransition.ts`, `flushSync` inside `startViewTransition`) | instant switch |
| Morphing nav pill (desktop nav + mobile tab bar) | shared `view-transition-name: nav-pill` element | static pill |
| Living aurora background | `@property --aur-rot` conic gradients + SVG grain, transform-only animation | static gradient |
| Pointer spotlight on cards | one passive rAF-throttled listener (`lib/pointerGlow.ts`) writes `--spot-x/y/o` on the hovered surface | none (touch devices never attach) |
| Entry reveals on scroll | CSS scroll-driven animations (`animation-timeline: view()`) | visible immediately |
| Card dealing in Flashcards | keyed remount + `card-deal` keyframes, depth stage behind | instant card |
| Suspense skeletons | `ViewSkeleton` + shimmer, fixed intrinsic sizes (CLS-safe) | n/a |

`prefers-reduced-motion: reduce` hard-stops every animation (§16 of aurora.css)
and skips View Transitions entirely.

## Performance changes

- **Route-level code splitting** — every view (`Dashboard`, `Browse`,
  `Flashcards`, `CoursesList`, `CourseDetail`, `AccountsView`, all `_rf`
  mobile views) plus the CommandPalette is `React.lazy`. The palette chunk
  loads on first ⌘K and stays mounted afterwards.
- **Vendor chunks** (`vite.config.ts` manualChunks): `vendor-react`,
  `vendor-recharts`, `vendor-motion`. Recharts loads only when the desktop
  Dashboard renders; framer-motion only with views that animate.
- **content-visibility: auto** on Browse rows (530 items) and course cards —
  off-screen rows skip layout/paint.
- Compositor-only animation policy: `transform`/`translate`/`opacity` only.

### Bundle (gzip), before → after

| Path | Before | After |
|---|---|---|
| App shell JS (always) | 276.9 KB | 99.8 KB (`index` 50.8 + `vendor-react` 49.0) |
| Desktop landing on Dashboard | 276.9 KB | 215.8 KB (+`Dashboard` 7.6 + `recharts` 108.4) |
| Mobile landing on Dashboard | 276.9 KB | 101.2 KB (recharts never loads) |
| Any non-chart view | 276.9 KB | ~102–108 KB |

## Files

- `src/styles/aurora.css` — the layer (tokens §1 … reduced-motion §16)
- `src/lib/viewTransition.ts` — `withViewTransition(update)`
- `src/lib/pointerGlow.ts` — `initPointerGlow(): cleanup`
- `src/components/ViewSkeleton.tsx` — Suspense fallback
- `src/App.tsx` — lazy routes, `goView` navigation, pill rendering
- Legacy `src/styles.css` deleted (was unreferenced since the styles/ split).
