# UI v3 — "Precision Instrument" Vision & Roadmap

Direction approved 2026-06-10. Aurora (v2, `02-aurora.md`) gave us living
surfaces, view morphing, and route-level code splitting. v3 is about
coherence and responsiveness to attention — not more effects.

## Pillars

1. **Calm surface, kinetic feedback** — motion answers the user, never performs.
2. **One language everywhere** — merge the desktop (glass) and mobile (RF)
   dialects into one system with density modes.
3. **The next action is one gesture away** — the app knows what to study next
   and says so.
4. **Zero-wait** — perceived-instant nav, true offline, repeat visits from cache.

## Phase 1 (this PR)

| Item | Where | Win |
|---|---|---|
| recharts → hand-rolled div/CSS + conic charts | `components/charts.tsx`, Dashboard | −108 KB gz off the Dashboard route |
| Fix `dbStats()` full-DB export per render | `lib/db.ts` (PRAGMA page_count × page_size) | removes ~1–2 MB serialize per Dashboard render |
| Self-hosted Inter Variable, drop Google Fonts | `index.html`, `main.tsx`, token CSS | kills render-blocking third-party request |
| Stroke icon set (lucide-react), emoji kept only for expressive moments | App chrome, Dashboard KPIs, mobile tabs | consistent cross-platform rendering |
| "Review N due · ~M min" CTA | Dashboard hero | one-tap path into the right queue |
| Session summary (rating breakdown, accuracy, restart) | `Flashcards.tsx` | closes the study loop |
| Label Browse filter selects + search input | `Browse.tsx` | a11y debt from Phase-0 audit |

## Phase 2 (flows) — shipped

- ✅ Unified nav vocabulary: desktop **Home / Library / Courses / Study**
  (Review folded into Study as the default "Due" queue with a
  Due/Shuffle-all switch); mobile tabs renamed **Study / Progress**.
  URLs: `/study` + `/progress` canonical, `/session` + `/review` aliased.
- ✅ Command-bar verbs in ⌘K (`PaletteAction`): start review, log 25 min to
  the last course, switch track, 4 themes, set interview date (+1w/+2w/+1m),
  Pomodoro, export/import DB, shortcuts. Boosted in ranking, ⚡-prefixed.
- ✅ Intent preloading: nav hover/focus fires the view chunk's `import()`.
- ✅ `?` shortcut overlay (`ShortcutsOverlay`); also fixed a latent bug where
  digits 1–4 rated a flipped card *and* navigated views simultaneously —
  digit nav is now suspended inside Study.
- ✅ Interview countdown chip in the topbar at ≤ 14 days (pulses at ≤ 3),
  reactive via an `interview-date-changed` window event from `lib/db`.
- ✅ First-run guided card on Home for fresh DBs (< 3 touched questions),
  dismissal persisted in `meta`.
- ✅ Hand-rolled service worker (`public/sw.js`): cache-first for hashed
  assets/wasm/fonts, network-first shell with offline fallback; registered
  in production only. Fixed `vercel.json` rewrites that were swallowing
  `/manifest.webmanifest` (live bug) and would have swallowed `/sw.js`.

## Phase 3 (system)

- Merge `--*` and `--rf-*` token namespaces into one semantic layer
  (OKLCH ramps, `--surface-*` / `--ink-*` / `--signal-*`), `data-density`.
- Adopt `_primitives` (Stack/Cluster/Grid/Container) view-by-view to retire
  the ~236 inline `style={{}}` sites.
- Element-level view-transition morphs (Browse row → detail).
- i18n extraction (typed messages module, `Intl.*` formatting).
- Move debounced `persistNow()` export to a Web Worker if profiling shows jank.

## Guardrails (Phase 2+)

- Lighthouse CI budgets: shell ≤ 110 KB gz, LCP < 2.5 s on Slow 4G.
- axe-core in CI: 0 critical. Playwright smoke: boot → flip → rate → persist.

## Explicit non-goals

- No neumorphism (contrast), no Tailwind migration, no state-library swap,
  no full rewrite. Evolution over revolution.
