# Phase 1 — Mobile-first Strategy

Scope: decisions only. No code in this phase.
Inputs: `00-current-state.md`. Reader is expected to have it open.

---

## 1.0 Decisions on the three open questions

You said "Start Phase 1" without resolving them, so I'm making the calls and recording the reasoning. Override before Phase 2 if any of these are wrong.

| # | Question | Decision | Why |
|---|---|---|---|
| Q1 | Adopt Tailwind? | **No.** | Adoption now means rewriting 1,994 CSS lines + every `style={{}}` site (236) for zero mobile-first leverage Tailwind provides that hand-written CSS doesn't. Token + utility layer in PR-2 covers the same surface area. Revisit only if the team's longer-term standard mandates it. |
| Q2 | Adopt Framer Motion + spring physics? | **No, defer.** | Not installed. No current animation needs spring physics — every existing animation is decorative (mesh-bg float, button press, card flip via CSS `transform: rotateY`). Framer Motion adds ~25 KB gz on the critical path and forces every motion site to be re-authored. Defer to a separate proposal when we have a gesture-driven feature (drag, swipe, layout transitions). Honor `prefers-reduced-motion` via CSS today. **This is a deviation from the prompt's "Framer Motion only" standard. Override if not acceptable.** |
| Q3 | Rename `--*` tokens to `rf-*`? | **No, freeze the existing namespace; namespace new tokens with `--ui-*` if you want a clean break.** | Renaming 1,994 lines + 236 inline sites is pure churn. Existing tokens (`--accent`, `--bg-0..3`, `--text/--text-2/--text-3`, `--border/--border-hi`, `--green/--yellow/--red`, `--mesh-1..4`) already form a coherent token layer with theme variants. New mobile-first tokens introduced in PR-2 (breakpoints, fluid type, safe-area, control sizing) can adopt a prefix on day 1 — see § 1.5. **Deviation from "`rf-*` only" standard. Override if you want me to do the rename.** |

If any of Q1/Q2/Q3 flips, the corresponding section below changes scope. The rest of the strategy is invariant.

---

## 1.1 Breakpoint system

**Decision: mobile-first `min-width` cascade with four named tiers, all in `em` (so user font scaling stops layout from snapping):**

| Token | Value | Min device |
|---|---|---|
| `--bp-sm` | `40em` (640 px @16) | Large phone landscape, small tablet portrait |
| `--bp-md` | `48em` (768 px) | iPad Mini portrait |
| `--bp-lg` | `64em` (1024 px) | iPad landscape, small laptop |
| `--bp-xl` | `80em` (1280 px) | Laptop / desktop |

Base styles target **360 px portrait first**. Every layer-up uses `@media (min-width: var(--bp-X))` — implemented with a tiny PostCSS-style mixin pattern (literal `@media (min-width: 40em)` since CSS doesn't allow `var()` in media queries pre-2024 browser baseline). Document the constants in `tokens.css`; reference values everywhere.

**Migration plan for the 8 existing `max-width` queries (Phase 0 § 0.4):**

| Existing | Replacement | Effect |
|---|---|---|
| `max-width: 700px → repeat(2,1fr)` (stat-strip × 2) | base `repeat(2,1fr)`; `min-width: 48em → repeat(4,1fr)` | base mobile gets 2 columns, tablet+ gets 4 |
| `max-width: 1000px → 1fr; height: auto` (.browse) | base `1fr` stacked; `min-width: 64em → 380px 1fr` two-pane | base is mobile list → tap-into detail; tablet+ is the split-pane today |
| `max-width: 1100px → 1fr` (× 5 grids) | base `1fr`; `min-width: 64em → original split` | all heroes / details default to single-column |

No `max-width` queries in the new code. Only `min-width`. Mobile is the base case, not the override.

**Container queries:** opt-in for two cards only: BadgesShelf, KPI strips. CSS support is universal in 2025 Safari/Chrome/Firefox; this lets cards reflow based on their slot, not the viewport. Documented in PR-3.

---

## 1.2 Layout primitives

Four primitives, all React components, all typed, no `any`. Token-driven.

| Primitive | Purpose | Props (sketch) |
|---|---|---|
| `<Container size?>` | Centers content. `size` = `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` → `max-width` tier. Inline padding uses safe-area utility (`px-safe`). | `size`, `as`, `className`, `children` |
| `<Stack gap? as?>` | Vertical rhythm. `gap` is a token key (`'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'`). Maps to `--space-*`. Sets `display: flex; flex-direction: column; gap: var(--space-N)` and `min-width: 0` on children. | `gap`, `as`, `align`, `className`, `children` |
| `<Cluster gap? align? justify? wrap?>` | Horizontal flex with wrap. Default wraps. Used for header action clusters, filter rows, button rows. | `gap`, `align`, `justify`, `wrap`, `as`, `className`, `children` |
| `<Grid cols? min? gap?>` | CSS-grid wrapper. `min` is the auto-fit min track (`'14rem'` → `repeat(auto-fit, minmax(14rem, 1fr))`). `cols` is an explicit override per breakpoint. | `cols`, `min`, `gap`, `className`, `children` |

These four cover every layout need surveyed in Phase 0. Where today's code uses `style={{ display: 'flex', gap: 8, alignItems: 'center' }}` (× many), the equivalent is `<Cluster gap="sm" align="center">`.

**Not primitives, but adjacent:** `pt-safe`, `pb-safe`, `px-safe` utility classes that map to `padding-{block,inline}: env(safe-area-inset-*, 0)`. Plain CSS; no React wrapper needed.

**Storybook is not in the project.** Test harness for primitives in PR-3 will be a single `src/components/_primitives/__playground.tsx` route only in `import.meta.env.DEV` — no extra dep.

---

## 1.3 Navigation pattern

The current single-flex top bar (Phase 0 § 0.7-#1) doesn't survive at 360 px. Three-part decision:

### A. Primary navigation (between views)

**Decision: bottom tab bar on `< md` (768 px), top tabs on `>= md`.**

Justification: 5 views (Dashboard / Browse / Flashcards / Review / Courses) is at iOS HIG's tab-bar limit. Bottom tab bar wins on:
- thumb-reach
- always-visible affordance
- no hamburger latency

Accounts becomes a profile-menu item inside a drawer (not a tab). Course-detail is a child of Courses (already is in state) — no separate tab.

Safe-area: bottom tab is `position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom, 0)`. Body gets matching `padding-bottom` so content isn't occluded.

### B. Secondary actions cluster (Pomodoro, Theme, Export/Import/Reset, Accounts shortcut, Search, XP)

**Decision: drawer ("More" menu) on `< md`; current inline cluster on `>= md`.**

The drawer slides from the right (or sheet from the bottom — pick on UX preference; my default is bottom sheet because it reuses the same fixed-bottom safe-area pattern as the tab bar).

What goes in the drawer on mobile:
- Pomodoro
- Theme switcher
- Export `.sqlite` / Import / Reset DB
- Accounts (full management view link)
- Settings link (future)

What stays in the always-visible mobile header:
- Brand
- TrackSwitcher (segmented control, two pills — fits 320 px)
- Search trigger (⌘K) — collapses to an icon button on `< sm`
- XP-bar collapses to a level pill + flame on `< md`; full bar on `>= md`

### C. Modals & sheets

CommandPalette and CoursesModal become:
- `< md`: full-height bottom sheet, dragger handle at top, `pb-safe`.
- `>= md`: centered modal as today.

`useMediaQuery('(min-width: 48em)')` is the only behavioral-switch use of JS media-query I'm sanctioning (rule from the prompt: CSS first, JS only when behavior differs). One hook, used twice.

### Reachability matrix (mobile)

| User goal | Hops |
|---|---|
| Switch view | 1 tap (bottom tab) |
| Switch track | 1 tap (header segmented control) |
| Search question | 1 tap (search icon) → palette bottom-sheet |
| Start Pomodoro | 2 taps (More → Pomodoro) |
| Change theme | 2 taps (More → Theme) |
| Export DB | 2 taps (More → Export) |
| Set interview date | 2 taps (Dashboard → CountdownPanel) |
| Rate flashcard | 1 tap of 4 large rate buttons (44 px min) |

---

## 1.4 Typography scale

**Decision: fluid `clamp()` scale in `rem`, baseline 16 px (`html { font-size: 100%; }`), six steps.**

The current `body { font-size: 14px }` (an absolute pixel size) is dropped. `body` becomes `1rem` (16 px) so user font-scaling works.

| Token | clamp() | At 360 px | At 1440 px |
|---|---|---|---|
| `--font-xs` | `clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem)` | 12 px | 13 px |
| `--font-sm` | `clamp(0.8125rem, 0.78rem + 0.3vw, 0.9375rem)` | 13 px | 15 px |
| `--font-base` | `clamp(0.9375rem, 0.9rem + 0.4vw, 1.0625rem)` | 15 px | 17 px |
| `--font-md` | `clamp(1rem, 0.94rem + 0.6vw, 1.25rem)` | 16 px | 20 px |
| `--font-lg` | `clamp(1.125rem, 1rem + 1vw, 1.5rem)` | 18 px | 24 px |
| `--font-xl` | `clamp(1.375rem, 1.2rem + 1.5vw, 2rem)` | 22 px | 32 px |
| `--font-2xl` | `clamp(1.75rem, 1.4rem + 2.5vw, 3rem)` | 28 px | 48 px |

Line-height tokens: `--lh-tight: 1.2`, `--lh-snug: 1.35`, `--lh-base: 1.5`, `--lh-relaxed: 1.65`.

`body` → `--font-base` / `--lh-base`. Headings: `h1: --font-xl`, `h2: --font-lg`, `h3: --font-md`. KPI big-numbers (Dashboard) → `--font-2xl`. Brand H1 in topbar moves from a fixed 15 px to `--font-md` so it stops being smaller than the supporting `.sub`.

---

## 1.5 Touch & input

### Control sizing

Three control heights (token-driven). Phase 0 § 0.7-#5 documented every offender; this section ends them.

| Token | Min height | Use |
|---|---|---|
| `--control-h-sm` | `2.5rem` (40 px) | Inline / dense — only allowed on `>= md` |
| `--control-h` | `2.75rem` (44 px) | Default. Every interactive control on mobile. Meets WCAG 2.5.5. |
| `--control-h-lg` | `3.25rem` (52 px) | Primary CTAs (Reveal answer, Lock-in interview date) |

Default `button { min-height: var(--control-h); min-width: var(--control-h); padding-inline: var(--space-md); }`.

Special cases that must be re-sized:
- TrackSwitcher pills: `--control-h` (currently 32 px).
- ThemeSwitcher swatches: 22 × 22 today. Become 44 × 44 with the swatch as an inner 22 × 22 visual; outer is a tappable button.
- ConfidenceDots: 22 × 22 today. Become 44 × 44 with inner 22 × 22 visual.
- Pomodoro pill buttons (3 × 8 padding, 11.5 px font): scale to `--control-h`.
- Rate row buttons (Again/Hard/Good/Easy): already large; verify wrap behavior at 360 px (see § 1.1 grid plan).

### Inputs

Every `<input type="text">` and `<input type="search">` gains:

| Attribute | Value |
|---|---|
| `inputmode` | `"search"` for searches, `"numeric"` for numeric, `"none"` for read-only-looking |
| `enterkeyhint` | `"search"` / `"done"` / `"next"` as fits |
| `autocomplete` | `"off"` for ephemeral search; `"email"`, `"name"`, etc. where applicable |
| `autocapitalize` | `"off"` for codes and identifiers |
| `spellcheck` | `"false"` for code, query, identifier fields |

Browse search, CommandPalette input, CoursesList filter, AccountsView email input — all hit.

### Labels & ARIA

- Every `<select>` and `<input>` gets either `<label for>` or `aria-label`. The three Browse filter selects (topic / status / confidence) are the biggest gap today.
- Form errors: `aria-describedby` + `aria-invalid` (none in app yet; introduce when needed).
- Async state: `aria-live="polite"` on the toast region and the DB loading subtitle; `aria-live="assertive"` only for errors.

### No hover-only affordances

Every `:hover` rule in `styles.css` (19 occurrences) must have a matching `:focus-visible` rule with the same visual change, or the change is removed and replaced with always-visible affordance. Audit list goes in PR-3 / PR-4 review.

---

## 1.6 Performance plan

### Code splitting (view-level)

Today all views are eagerly imported in `App.tsx`. Recharts (~80 KB gz) and the full Dashboard ride along whether or not the user opens Dashboard.

PR target (Phase 3, view-by-view): wrap each view in `React.lazy`:

```ts
const Dashboard       = lazy(() => import('./components/Dashboard'));
const Browse          = lazy(() => import('./components/Browse'));
const Flashcards      = lazy(() => import('./components/Flashcards'));
const CoursesList     = lazy(() => import('./components/courses/CoursesList'));
const CourseDetail    = lazy(() => import('./components/courses/CourseDetail'));
const AccountsView    = lazy(() => import('./components/courses/AccountsView'));
const CommandPalette  = lazy(() => import('./components/CommandPalette'));
```

`<Suspense fallback={<RouteSkeleton />}>` around the switch. Skeleton is a fixed-dimension placeholder (CLS = 0).

Expected bundle delta (estimated from `node_modules/.../*.min.js` reading + manifest math, not from a build): initial chunk drops ~80–100 KB gz; Dashboard chunk gets recharts; other chunks remain small.

### Recharts mitigation

Recharts is the single largest dep. Two options for Phase 3:
1. Keep recharts; load only on Dashboard view (lazy).
2. Replace bar chart + heatmap with hand-rolled SVG (the heatmap is already div-based; the 14-day bar is the only recharts surface).

Option 2 is feasible in ~120 LOC and would remove the dep entirely. Decide in Phase 3 Dashboard step.

### sql.js WASM

Already lazy via Vite `?url`. Confirm no preload hint is added so it doesn't compete with LCP.

### Initial DB seed

`public/initial-db.sqlite` is 400 KB. Already served from `/initial-db.sqlite` with `cache-control: max-age=300` (per `vercel.json`). Acceptable for first-paint LCP (it's fetched after WASM init, off the critical path).

### Image strategy

There are no images (Phase 0 § 0.5). Strategy is "don't add any without a hash + width/height + lazy attribute". Logo / OG preview are the only candidates; add an SVG OG image in PR-1.

### Font strategy

Currently using system stack (`-apple-system, ..., sans-serif`). Keep. No web font, no FOIT/FOUT, no font subsetting needed.

### Third-party

Zero third-party scripts in the bundle. Vercel injects its own feedback widget on previews; we don't control it. Acceptable.

### Budgets (mobile, Slow 4G + 4× CPU)

Locked numbers from the prompt:

| Metric | Budget | Today (estimated, no measurement yet) |
|---|---|---|
| FCP | < 1.5 s | Likely 1.0–1.4 s (small bundle, no font, no above-fold images) |
| LCP | < 2.5 s | Risk: the mesh-bg gradient may be the LCP element. To verify in Phase 4. |
| INP | < 200 ms | Risk: backdrop-filter chains + recharts hover on Dashboard |
| CLS | < 0.1 | Risk: Loading→App handoff (Phase 0 § 0.7-#13) and `100vh` URL-bar jump |

Measurement plan: Lighthouse run after PR-1 (baseline), after PR-4 (foundation), and per view in Phase 3.

---

## 1.7 Motion policy

Given Q2 deferral (no Framer Motion):

| Rule | Implementation |
|---|---|
| Max duration on `< md` | 180 ms |
| Max duration on `>= md` | 240 ms |
| Easings | Keep existing `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard); add `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` for sheet/drawer reveals |
| Animatable properties | `transform`, `opacity` only. No `width`/`height` animations. No `top`/`left` animations. |
| `prefers-reduced-motion: reduce` | `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition-duration: 0.01ms !important; transition-delay: 0s !important; } }` — single global rule in PR-2. Plus suspend mesh-bg `float` animation. |
| Confetti | Skipped entirely when reduced-motion is set. |
| Card flip (Flashcards) | Keep CSS `transform: rotateY(180deg)`. Verify it respects reduced-motion (instant flip is acceptable). |
| Toast enter/exit | CSS transition on transform + opacity. No JS. |
| Bottom-sheet drag | CSS `transition` on transform; no momentum / no spring physics (Q2 deferral). If you later want momentum, that's the Framer Motion re-open. |

When Q2 is revisited and Framer Motion is approved, this section gets a follow-up doc; the API surface (single `<Sheet>` and `<Drawer>` primitive) stays compatible.

---

## 1.8 Testing matrix

| Device | Width × Height | Why |
|---|---|---|
| Galaxy Fold (closed) | 320 × 653 | Hard floor. If it survives here, it survives everywhere. |
| iPhone SE 3 | 375 × 667 | Smallest current iOS device users hold. |
| iPhone 15 Pro | 393 × 852 | Dynamic Island safe-area test. |
| Pixel 7 | 412 × 915 | Android baseline, gesture bar. |
| iPad Mini portrait | 768 × 1024 | `md` breakpoint validator. |
| iPad Pro landscape | 1366 × 1024 | Tablet-as-laptop fallback. |
| Desktop | 1440 × 900 | Regression target. |

DevTools throttling: Slow 4G + 4× CPU. Run on every Phase 3 view delivery. Numbers go in `docs/mobile-first/02-routes.md` per view.

Tooling (none yet installed; ask before adding):
- Lighthouse: `npx lighthouse` (no install).
- Axe: `@axe-core/cli` — needs install. Recommend.
- Visual regression: not in budget for this initiative. Manual screenshots committed under `docs/mobile-first/screens/{view}/{device}.png`.

---

## 1.9 Standards adherence map

| Prompt standard | How this strategy honors it | Deviation noted? |
|---|---|---|
| Strict TS, zero `any` | Primitives in PR-3 fully typed; lazy-loaded views keep typing through default-export contracts. | None. Recommend also flipping `noUnusedLocals: true` in PR-2. |
| SOLID / DRY / KISS / YAGNI | Four primitives total. No Storybook. No Tailwind. One `useMediaQuery` hook. CSS-first cascade. | None. |
| WCAG 2.2 AA, 44 × 44 targets | § 1.5 fixes every offender from Phase 0 § 0.7-#5. § 1.7 honors reduced-motion. | None. |
| CWV mobile budgets | § 1.6 plan + measurement gates. | None set yet; track per view. |
| Framer Motion + spring physics | Deferred. CSS motion policy with reduced-motion. | **Q2 deviation.** |
| `rf-*` tokens only, no hardcoded styles | Keep `--*` namespace; introduce token names under `--space-*`, `--font-*`, `--bp-*`, `--control-h*`, `--ease-*`, `--lh-*`. Replace inline `style={{...}}` (236 sites) with primitives + utility classes. | **Q3 deviation** (no `rf-` prefix rename). |
| Extend-only API | No prop / route / response changes proposed. New props (`size` on Container, `gap` on Stack/Cluster) are additive on net-new components. | None. |
| Read-before-write | Phase 0 inventory § 0.8/0.9 already lists what was read. Phase 3 will read each view at entry. | None. |

---

## 1.10 Phase 2 PR plan (preview, not commitment)

Order locked. Each PR is atomic. STOP after each.

| PR | Files | Approx. churn | Reviewable in |
|---|---|---|---|
| PR-1 | `index.html` | 1 file | 5 min |
| PR-2 | `src/styles.css` reorganized into `src/styles/{tokens,reset,utilities,components}.css`; `vite.config.ts` may need PostCSS for `light-dark()` polyfill (only if we adopt it; not a hard requirement) | ~+200, -50 net | 30 min |
| PR-3 | `src/components/_primitives/{Container,Stack,Cluster,Grid}.tsx`, `src/components/_primitives/__playground.tsx`, types in `src/types.ts` (additive) | ~+300 | 30 min |
| PR-4 | `src/App.tsx` (header refactor, bottom-tab, sheet/drawer wiring), `src/components/{TopBar,BottomTabBar,MoreSheet}.tsx`, `src/hooks/useMediaQuery.ts` | ~+400, -100 net in App.tsx | 45 min |

After PR-4: `tsc --noEmit`, `eslint` if wired (not currently), Lighthouse mobile baseline numbers reported back to you in the PR-4 message.

---

## 1.11 What's blocked / needs you

Two explicit asks before Phase 2 kicks off:

1. **Confirm Q1/Q2/Q3 decisions in § 1.0**, or override.
2. **Route-priority order for Phase 3.** Phase 3 says: "in order of business priority (which I will provide — do not invent the order)". My recommendation is `flashcards → review → dashboard → browse → courses → course-detail → accounts` (study loop first, admin views last), but I'll wait for yours.

— Phase 1 complete. Stopping. Awaiting approval to begin Phase 2.
