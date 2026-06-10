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

## Phase 3 (system) — shipped

- ✅ **Token unification (bridge architecture).** `rf-tokens.css` colour
  tokens are now semantic aliases of the core theme tokens instead of a
  second hardcoded palette — the mobile RF UI follows all four themes and
  the pentest track accent for the first time (it was locked to
  near-black + purple). Layout/type/motion RF tokens stay RF-specific by
  design. `tokens.css` gains the semantic layer for new code:
  `--surface-0..3`, `--ink-1..3`, `--signal-success/warn/danger`.
- ✅ **Element-level morphs.** `withViewTransition(update, { micro: true })`
  suppresses the document-level animation (`html.vt-micro` gate) so only
  named elements morph. First use: Browse row → detail pane
  (`view-transition-name: browse-detail`). Mobile question open/close also
  runs through a view transition now.
- ✅ **Intl formatting layer** (`lib/format.ts`): `formatDate`,
  `formatRelativeDays` ("Next review: in 3 days"), `formatNumber` — adopted
  in Browse, CountdownPanel, InterviewDateCard, MobileQuestionDetail.
- ✅ **Inline-style retirement, exemplar pass.** Flashcards: 12 → 1
  (the one left is the legitimately dynamic progress width). Pattern:
  utility/component classes in the aurora layer. Remaining heavy files
  (Dashboard 56, CourseDetail 44, CoursesList 31) follow the same recipe
  view-by-view.
- ✅ **Idle-scheduled persistence**: the debounced IndexedDB write now runs
  in `requestIdleCallback` (2 s timeout guard) so the DB serialize never
  competes with an interaction.

### Deliberately deferred (with reasons)

- **`data-density` modes** — tokens are ready, but no consumer demand yet;
  shipping a half-wired toggle is worse than none. Revisit with a real
  compact-layout request.
- **Full string extraction (messages module)** — premature until a second
  locale is actually wanted; the `Intl` formatter layer was the part with
  immediate user value. ~200 static strings remain in-component.
- **Web Worker persistence** — the roadmap's own condition ("if profiling
  shows jank") can't be met in a containerized session; idle scheduling
  removes the practical risk at 1/20th the complexity. Re-open if traces
  show export() blocking input.
- **OKLCH ramp regeneration** — the semantic alias layer landed; converting
  theme palettes to generated OKLCH ramps is a colour-design exercise best
  done with eyes on screen.

## Guardrails (Phase 2+)

- Lighthouse CI budgets: shell ≤ 110 KB gz, LCP < 2.5 s on Slow 4G.
- axe-core in CI: 0 critical. Playwright smoke: boot → flip → rate → persist.

## Explicit non-goals

- No neumorphism (contrast), no Tailwind migration, no state-library swap,
  no full rewrite. Evolution over revolution.
