# Phase 0 — Current-State Audit

Status: read-only audit. No code modified.
Project root: `InterviewTracker/` (sibling docs/, src/, public/ inside `Interview_Prep/`).
Audit covers everything under `src/` and project-root configs. `node_modules/` ignored.

---

## 0.0 Prompt vs. reality — deviations the team must accept or override before Phase 1

The prompt assumes a stack we do not have. Flagging now so we don't silently retrofit.

| Prompt assumption | Reality in repo | Implication |
|---|---|---|
| Tailwind config (`tailwind.config.*`) | Absent. Vanilla CSS in `src/styles.css` (1,994 lines). | "Mobile-first cascade with `sm:`/`md:`/`lg:`" doesn't map. Need either a Tailwind adoption decision or an equivalent token-driven utility layer. |
| PostCSS config | Absent. | No autoprefixer / no nested CSS plugin. We'll need at least PostCSS + autoprefixer to ship `:has`, container queries, fluid `clamp()` cleanly. |
| `rf-*` design tokens | Tokens exist but are named `--accent`, `--accent-2`, `--accent-glow`, `--bg-0..3`, `--text/--text-2/--text-3`, `--green/--yellow/--red`, `--mesh-1..4`, `--border/--border-hi`. No `rf-` prefix anywhere. | Either rename to `rf-*` (touches 1,994 CSS lines + ~236 inline `style={{...}}` sites — pure churn) or keep current tokens and document the deviation. Recommend the latter; surface for approval. |
| Framer Motion only, spring physics | Not installed. Zero `framer-motion`/`motion.`/`useReducedMotion` references. Animation today = CSS `@keyframes` + `transition` only. | Adopting Framer Motion is a dep addition, a bundle hit, and a refactor of every animated surface. Need explicit go-ahead before Phase 2. |
| `src/router*` / `src/routes/` | Absent. App.tsx owns a `view: View` union-state machine that switches in JSX. No react-router. | Phase 3 "route-by-route" reads as "view-by-view". Tree we'll iterate over below. |

Recommend: **keep the existing CSS-variable tokens (rename optional, address in Phase 2 PR-2), defer Framer Motion adoption to a separate explicit decision**, and re-scope "route-by-route" as "view-by-view". Awaiting confirmation.

---

## 0.1 Stack & configs

| File | Notes |
|---|---|
| `package.json` | Vite 5.4, React 18.3, recharts 2.13, sql.js 1.14. Scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `snapshot`. Engines `node >=18`. No `framer-motion`, no Tailwind, no Storybook, no Vitest, no Playwright, no `@axe-core/*`. |
| `vite.config.ts` | React + custom dev-only `dbSyncPlugin`. Server port 5173, `open: true`. No build chunking config; no PWA plugin. |
| `tsconfig.app.json` | `strict: true` ✓. `noUnusedLocals: false`, `noUnusedParameters: false` ✗ — relaxes the "Zero `any`" standard's spirit. Recommend tightening in Phase 2. |
| `tsconfig.node.json` | Strict for Vite config only. |
| `vercel.json` | SPA rewrites, cache headers, sqlite content-type. Fine. |
| `index.html` | See § 0.6. Multiple mobile gaps. |
| `tailwind.config.*` / `postcss.config.*` | **Not present.** |

---

## 0.2 Routing tree (view state-machine, not URL routes)

Declared in `src/types.ts:35–42`:

```
View =
  | "dashboard"
  | "browse"
  | "flashcards"
  | "review"
  | "courses"
  | "course-detail"
  | "accounts"
```

Switched in `src/App.tsx:255–345`. URL never changes; refresh always lands on Dashboard.
Side effect for mobile: history-back never navigates between views — every back press exits the app. Phase 1 strategy must decide whether to keep this or introduce URL-state (hash routing minimum).

---

## 0.3 Layout-bearing components

| Component | File | Role | Mobile risk |
|---|---|---|---|
| App shell + topbar | `src/App.tsx:227–352` | Header (brand + TrackSwitcher + nav + actions cluster), main view container | **Critical** — see § 0.7-#1 |
| LoadingScreen | `src/components/LoadingScreen.tsx` | Full-viewport overlay | Low |
| Dashboard | `src/components/Dashboard.tsx` (28 KB, 729 LOC est.) | KPI hero, rings, charts, heatmap, topics, courses panel | High — many fixed-px grids |
| Browse | `src/components/Browse.tsx` | Two-pane split: list + detail | **Critical** — 380 px list pane on 360 px viewports |
| Flashcards | `src/components/Flashcards.tsx` | Centered 3D flip card + rate row | High — rate row is `grid-template-columns: repeat(4, 1fr)`; previewInterval column squashes |
| CommandPalette | `src/components/CommandPalette.tsx` | Modal overlay | High — input + keyboard; no safe-area |
| Constellation | `src/components/Constellation.tsx` | SVG topic map | Medium — fixed `viewBox 0 0 600 460`, OK but text labels assume desktop |
| BadgesShelf | `src/components/BadgesShelf.tsx` | `auto-fit, minmax(220px, 1fr)` grid | OK structurally; badge tile internals untested |
| CountdownPanel | `src/components/CountdownPanel.tsx` | Flex row + 7-day plan grid | Medium — wraps but stats lose hierarchy |
| TrackSwitcher / XPBar / ConfidenceDots / ThemeSwitcher / Pomodoro | various | Header-cluster microcomponents | Critical-in-aggregate (header overflow) |
| ToastHost | `src/components/ToastHost.tsx` | Stacked fixed-position toasts | Medium — no safe-area |
| courses/Modal | `src/components/courses/Modal.tsx` | Dialog primitive | **Critical** — `width: 560px` fixed (styles.css:1337) |
| courses/CoursesList | ditto | Filter toolbar + grid (`auto-fill, minmax(280px, 1fr)`) | Medium |
| courses/CourseDetail | ditto | `1fr 360px` split → 1fr at <1100px | High — long rows below |
| courses/AccountsView | ditto | Avatar grid + dialogs | Medium |
| courses/StreamHeatmap | ditto | Grid `repeat(15, 1fr)` heatmap | Medium — overflow risk |

---

## 0.4 Breakpoint usage table

Source: `grep '@media' src/`.

| Line | Selector | Rule | Direction |
|---|---|---|---|
| `styles.css:382` | `.dash-hero` | max-width: 1100px → `grid-template-columns: 1fr` | desktop-down |
| `styles.css:474` | `.stat-strip` | max-width: 700px → `repeat(2, 1fr)` | desktop-down |
| `styles.css:509` | `.dash-grid` | max-width: 1100px → `1fr` | desktop-down |
| `styles.css:631` | `.browse` | max-width: 1000px → `1fr; height: auto` | desktop-down |
| `styles.css:1013` | `.courses-kpi-strip` | max-width: 1100px → `repeat(3,1fr)` | desktop-down |
| `styles.css:1014` | `.courses-kpi-strip` | max-width: 700px → `repeat(2,1fr)` | desktop-down |
| `styles.css:1197` | `.course-detail` | max-width: 1100px → `1fr` | desktop-down |
| `styles.css:1368` | `.courses-dash` | max-width: 1100px → `1fr` | desktop-down |

**Findings**

- Every existing media query is `max-width` (desktop-down cascade). Zero `min-width` queries. **No rules below 700 px.** Phones at 360/375/393/412 px get no targeted treatment.
- Zero `prefers-reduced-motion` rules. Mesh-bg animation (22 s float + blur) runs unconditionally.
- Zero container queries.
- `window.innerWidth` used only in `src/lib/confetti.ts` (canvas sizing — acceptable). No `matchMedia` / `useMediaQuery` / `useResize` anywhere.

---

## 0.5 Static-asset / image inventory

| Source | Count | Notes |
|---|---|---|
| `<img>` tags in src/ | 0 (zero) | App uses emoji + SVG; no raster images. |
| `background-image`/`url()` | 0 | None. |
| `public/` | 1 file: `initial-db.sqlite` (400 KB) | No manifest.json, no favicon.png/.ico, no apple-touch-icon, no robots.txt. |
| Favicon | Inline SVG data URI in `index.html:5` (emoji 🎯) | Low quality on mobile home-screen install. |
| SVG components | `Constellation.tsx`, `ActivityRing.tsx`, `LoadingScreen.tsx` | Hand-coded SVG. No `aria-hidden` audit done yet (Phase 3). |

`<picture>`/`srcset`/AVIF strategy is **not applicable** today — there are no raster images. Phase 1 strategy doc can scope this out unless we plan to add OG/preview imagery for the deploy.

---

## 0.6 `index.html` audit

Current content (`index.html`, full file):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:image/svg+xml,…🎯…" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Interview Tracker — .NET & Pentest</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

| Required | Present? | Action (Phase 2 PR-1) |
|---|---|---|
| `viewport-fit=cover` in viewport meta | ❌ | Add. Required for `env(safe-area-inset-*)`. |
| `theme-color` | ❌ | Add for both light + dark `prefers-color-scheme`. |
| `apple-mobile-web-app-*` (capable, status-bar-style) | ❌ | Add. |
| `apple-touch-icon` | ❌ | Add 180×180 png. |
| `manifest.json` + `<link rel="manifest">` | ❌ | Add manifest for installability. |
| `<meta name="description">` | ❌ | Add. |
| OG / Twitter meta | ❌ | Add minimal set. |
| Preload of critical font / wasm hint | ❌ | Defer until Phase 1 strategy validates font choice. |

---

## 0.7 Ranked mobile offenders

### CRITICAL — breaks usability on a 360–390 px viewport

1. **Top-bar overflow.** `App.tsx:228–321` renders, in one horizontal flex row: brand (icon + h1 + sub) + TrackSwitcher (2 pills + counts) + 5-item nav + 6-button actions cluster including an XP bar with `min-width: 220px` (`styles.css:1712`). No mobile drawer/hamburger. At 360 px the bar overflows horizontally; combined with `body { overflow: hidden }` (`styles.css:107`), the overflowing content is unreachable.
2. **`body { overflow: hidden }`** (`styles.css:107`) + **`.app { height: 100vh }`** (`styles.css:202`) + **`.view { overflow-y: auto }`** (`styles.css:332`). Desktop-only pattern. On iOS Safari, `100vh` includes the URL bar at first paint then jumps when it hides → CLS spike. Should be `100dvh`. Combined with overflow:hidden on body, any tall content below `.view`'s scrollable area is lost.
3. **Browse view list pane: fixed 380 px column** (`styles.css:627`) collapses only below 1000 px (`styles.css:631`) to `1fr`. Between 600–999 px (mid-tablet) the 380 px sidebar still wins. List items inside use `grid-template-columns: 240px 1fr 70px` (`styles.css:582`) — three fixed columns on a viewport that may itself be 360 px.
4. **Courses Modal: `width: 560px`** (`styles.css:1337`). On 360 px viewport this overflows. No `max-width: 100%`, no `width: min(560px, 100% - 32px)`.
5. **Touch targets below 44 px.** Default `button { padding: 7px 14px }` (`styles.css:155`) at 14 px font ≈ 32 px tall. `theme-switcher button` is 22×22 (`styles.css:310`). `confidence-dot` is 22×22 (`styles.css:1872 area`). `pomo button` has 11.5 px font with 3 px vertical padding ≈ 22 px tall. Every one of these fails WCAG 2.5.5 on touch.
6. **No safe-area insets anywhere.** Six `position: fixed` selectors in `styles.css` (lines 112, 713, 836, 912, 968, 1321) — mesh-bg, command palette, accounts dropdown, modal, toast host, course-modal — and none reference `env(safe-area-inset-*)`. Toasts + modals will sit under the iOS Dynamic Island / home indicator.

### HIGH — degrades usability or hits perf budgets

7. **Inline-style explosion.** 236 `style={{...}}` sites across 19 files (App.tsx 9, Dashboard 58, CourseDetail 47, CoursesList 31, AccountsView 19, CourseImport 14). Hardcoded pixel values, font sizes, gaps. Token compliance is currently impossible to enforce. Phase 2 PR-3 (primitives) is the leverage point.
7b. **`tsconfig.app.json` has `noUnusedLocals: false`** — drift surface for the strict-TS standard.
8. **`.rate-row { grid-template-columns: repeat(4, 1fr) }`** (`styles.css:809`) for the SM-2 buttons (Again/Hard/Good/Easy). Each button contains stacked label + interval preview. At 360 px the 4-column grid leaves ~80 px per button — the "interval" text wraps awkwardly.
9. **`grid-template-columns: repeat(15, 1fr)`** for StreamHeatmap (`styles.css:562`) and `repeat(6, 1fr)` for courses KPI strip — these will produce 15 sub-24-px cells on mobile.
10. **No `inputmode`, `enterkeyhint`, `autocomplete` anywhere** (grep clean). Search inputs (Browse, CommandPalette, CoursesList) all default to text keyboard with no smart hints.
11. **No `<label for="…">` association on filter selects** in `Browse.tsx:107–119` (topic / status / confidence selects). Screen readers get unlabeled selects.
12. **Backdrop-filter chains.** `styles.css:159, 214, 345` use `backdrop-filter: blur(20–28px) saturate(180%)`. Combined with the 22-s mesh-bg animation, mobile GPUs will sustain high paint cost during interaction. Likely INP and CLS impact below.
13. **CLS risk from Loading→App handoff.** `LoadingScreen.tsx` mounts then unmounts; `App` mounts entirely different layout with no skeleton in between. No reserved space. CLS will spike.

### MEDIUM — quality/standards regressions, not necessarily user-facing critical

14. **No `useReducedMotion`** in any hook or component. `prefers-reduced-motion` is not honored by mesh-bg or any transition. Required by Phase 1 motion policy.
15. **No `aria-live` regions for async state** (DB init, flashcard ratings, toast announcements). ToastHost has 2 `aria-*` hits — likely insufficient for SR.
16. **Heatmap accessibility.** Dashboard 90-day heatmap is `div`-based with `title` only; no `role="img"` / `aria-label` for the SR summary.
17. **No focus trap in modals** (CommandPalette, courses/Modal). Tab can escape into background.
18. **No skip-link to main content.**
19. **Default `body { font-size: 14px }`** (`styles.css:104`). Lighthouse mobile flags <16 px as "small touch text" / readability. Many inline styles drop to 11–12 px (kbd, sub-labels, plan cells).
20. **`html { overflow: hidden }` indirectly via body**, plus heavy use of `flex` without `min-width: 0` on children — known horizontal-overflow trap.

### LOW — polish

21. Brand "h1 font-size: 15px" (`styles.css:227`) — visual H1 is smaller than supporting text on most cards. Hierarchy inversion.
22. No `prefers-color-scheme` honored; theme is purely user-chosen.
23. No print stylesheet (acceptable for this product).
24. No `loading="lazy"` strategy needed (no images), but no `fetchpriority="high"` on the SQLite-WASM either — could shave LCP.

---

## 0.8 What was read

`package.json`, `vite.config.ts`, `vercel.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/App.tsx`, `src/types.ts`, `src/components/{Browse,Flashcards,Dashboard,LoadingScreen,Constellation,CommandPalette}.tsx` (Dashboard partially — head + JSX root), `src/hooks/useProgress.ts`, `src/lib/db.ts`, `src/styles.css` (1,994 lines — sampled in 3 windows: 90–229, 230–349, 380–700 incl. media-query block).

Greps performed: `@media|matchMedia|useMediaQuery|window.innerWidth`, `(sm|md|lg|xl|2xl):` (Tailwind-classname probe), `position: fixed`, `env(safe-area-inset`, `(min-width|max-width|width):\s*\d+(px|rem)`, `grid-template-columns`, `overflow-x|overflow:\s*auto|overflow:\s*scroll`, `<img\s`, `background-image:|background:\s*url`, `framer-motion|motion\.|useReducedMotion`, `rf-` (false-positive on a badge id only), `100vh|100dvh`, `:hover` count, `aria-` count (59 occurrences, 14 files), `inputmode|enterkeyhint|autocomplete`, `style=\{\{` count (236 occurrences, 19 files), `tabIndex|onKeyDown` count.

## 0.9 What was skipped, and why

- `node_modules/` — out of scope.
- `src/data/{questions,pentestQuestions,courses}.ts` — pure seed data, no JSX, no layout. Verified by inspection that the only `style={{` / `rf-` hits there were content strings, not layout.
- `src/components/Dashboard.tsx` body past JSX root — too large for a single read window; the head + visible markup is sufficient for Phase 0 risk ranking. Will be opened in full during Phase 3.
- `src/components/courses/{CoursesList,CourseDetail,AccountsView,AddCourseDialog,CourseImport,BulkAssignAccount,Modal,StreamHeatmap,AccountChip}.tsx` — present in inventory; bodies not yet read. Phase 3 will open each before refactor. Their CSS class targets in `styles.css` were sampled.
- Lighthouse / axe / device matrix screenshots — Phase 4 territory and we have no headless browser in this environment. Will need to be run on the dev machine.

## 0.10 Recommendation before Phase 1

Three open questions block strategy:

1. **Tailwind adoption?** y/n. If no, Phase 2 PR-2 becomes a hand-written token + utility CSS layer rather than a Tailwind theme.
2. **Framer Motion adoption?** y/n. If no, keep CSS keyframes and add a `useReducedMotion` shim.
3. **`rf-*` token rename?** y/n. The current names (`--accent`, `--bg-1`, ...) work; renaming is 1,994 + ~236 mechanical edits.

Phase 1 strategy doc will branch on the answers. No code will change until 1, 2, 3 are decided.

— Phase 0 complete. Stopping. Awaiting approval to begin Phase 1.
