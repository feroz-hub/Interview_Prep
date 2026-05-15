# SRS Phase 0 — Context Load

Status: read-only audit. No code modified.
Inputs read: `package.json`, `vite.config.ts`, `tsconfig*.json`, `src/lib/db.ts`, `src/lib/sm2.ts`, `src/types.ts`, `src/App.tsx`, `src/components/Browse.tsx`, `src/components/Flashcards.tsx`, `src/components/ConfidenceDots.tsx`, `src/components/_rf/MobileBottomTabBar.tsx`.

The prompt assumes a stack we don't have in several material places. This document maps every assumption to the reality and proposes the smallest defensible deviation. Phase 1 should not start until § 0.10 is resolved.

---

## 0.1 Stack snapshot

| Layer | Reality |
|---|---|
| Build | Vite 5.4 + React 18.3 + TypeScript 5.6 strict (`noUnusedLocals: false` — minor drift from "Zero `any`") |
| Deps | `framer-motion ^11.11.0`, `recharts ^2.13`, `sql.js ^1.14`, `react`/`react-dom`. **No** `react-router-dom`, **no** `@use-gesture/react`, **no** `@tanstack/react-virtual`, **no** `vitest`, **no** test framework at all. |
| Routing | **None.** App.tsx is a `view: View` state machine (`"dashboard" \| "browse" \| "flashcards" \| "review" \| "courses" \| "course-detail" \| "accounts" \| "library"`). No URL routes. Refresh always lands on `dashboard`. |
| Data layer | sql.js compiled to WASM, persisted to IndexedDB, dev-only disk sync via `vite-plugin-db-sync`. **No backend, no API, no `user_id`.** Single-user local app. |
| Schema | See § 0.3. Current `progress` table is one-row-per-question, no `user_id` column. |
| SRS engine | `src/lib/sm2.ts` — `applyRating(prev, "again"\|"hard"\|"good"\|"easy", now)` returns a new `ProgressEntry`. Uses SM-2 quality-mapping and the canonical ease-factor delta formula. **Different** from this prompt's `schedule()` rules (§ 0.4). |
| Gesture lib | None. Framer Motion is in deps and has a `drag` API; sufficient for the swipe-to-rate flow without adding `@use-gesture/react`. |
| Virtualization | None. Browse renders all ~530 (.NET) or ~500 (Pentest) rows in a flex list. |

---

## 0.2 Routing reality

There is no router. Every navigation is `setView(...)`. The prompt's Phase 3 routes (`/library`, `/library/q/:id`, `/session`) don't exist and cannot be deep-linked, bookmarked, or back-buttoned today.

`vercel.json` is already permissive:
```
"rewrites": [{ "source": "/((?!assets/|.*\\.(?:wasm|sqlite|svg|png|jpg|jpeg|gif|ico|json|txt|webp)$).*)", "destination": "/index.html" }]
```
so adding a client-side router is a drop-in; no infra change needed.

**Recommendation**: install `react-router-dom@^6` (~13 kB gz, history-mode, supported on iOS Safari back-gesture). Decision needed before Phase 3.

---

## 0.3 Data layer reality — current `progress` table

```sql
CREATE TABLE IF NOT EXISTS progress (
  question_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT '',
  ease REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  last_reviewed TEXT,
  next_review TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

Indexes: `idx_progress_next_review`, `idx_progress_status`.

Mapping to the prompt's proposed `review_state`:

| Prompt field | Status | Reality |
|---|---|---|
| `user_id` | **Not applicable** | No multi-user. Single-user local app. |
| `question_id` | ✓ | Same name, same role. |
| `status` | ✓ | Same. |
| `ease` | ✓ | Same. |
| `interval_days` | Rename | Currently `interval` (INTEGER, days). |
| `reps` | Rename | Currently `repetitions`. |
| `lapses` | **Missing** | New column needed. |
| `due_at` | Rename | Currently `next_review` (ISO string). |
| `last_reviewed_at` | Rename | Currently `last_reviewed`. |
| `confidence` | ✓ | Same. |
| `notes_md` | Rename | Currently `notes`. |
| `updated_at` | ✓ | Same. |
| `review_count` | Extra | Denormalised counter we keep; not in prompt. |
| `correct_count` | Extra | Denormalised counter we keep; not in prompt. |

The prompt's "Extend-only API/data contracts" rule **forbids** renames. Three resolution paths:

A. **Strict extend-only**: keep column names as-is; map to the prompt's vocabulary in a thin TypeScript adapter (`getDueAt(p) = p.next_review`). New columns added only (`lapses`). No DB migration risk. **Recommended.**
B. SQLite 3.25+ `ALTER TABLE … RENAME COLUMN …` (sql.js supports it). Cleaner schema, breaks every existing read site. ~6 files affected.
C. Dual-write: add new columns alongside old, deprecate old. Doubles disk + write cost for transitional period.

Pick A unless you tell me otherwise.

`review_log` is purely additive — no contract issue.

```sql
CREATE TABLE IF NOT EXISTS review_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id  INTEGER NOT NULL,
  rated_at     TEXT NOT NULL,
  rating       TEXT NOT NULL,                   -- 'again'|'hard'|'good'|'easy'
  prev_interval INTEGER NOT NULL,
  new_interval  INTEGER NOT NULL,
  prev_ease     REAL NOT NULL,
  new_ease      REAL NOT NULL,
  response_time_ms INTEGER NOT NULL DEFAULT 0
);
```

---

## 0.4 SRS engine reality — `src/lib/sm2.ts`

Current `applyRating(prev, rating)` rules:

| Rating | quality → | interval | ease delta | repetitions | status side-effect |
|---|---|---|---|---|---|
| `again` | 1 | reset to 1d | `+(0.1 - 4·(0.08 + 4·0.02)) = -0.62` (effectively `−0.62` clamped to floor 1.3) | reset to 0 | force `review` |
| `hard`  | 3 | reps-based ramp (1/3/round(prev·ease)) | `+(0.1 - 2·(0.08 + 2·0.02)) = -0.14` | +1 | learning → … |
| `good`  | 4 | reps-based ramp | `+(0.1 - 1·(0.08 + 1·0.02)) = 0.0` | +1 | learning → … |
| `easy`  | 5 | reps-based ramp + min 4d floor | `+(0.1 - 0·…) = +0.10` | +1 | mastered if reps≥3 |

The prompt's rules are stricter and simpler:

| Rating | new interval | ease delta | reps | lapses |
|---|---|---|---|---|
| `again` | 1d | −0.20 (floor 1.3) | reset to 0 | +1 |
| `hard`  | `max(1, round(prev · 1.2))` | −0.15 | +1 | 0 |
| `good`  | `reps===0 ? 1 : reps===1 ? 6 : round(prev · ease)` | 0 | +1 | 0 |
| `easy`  | `reps===0 ? 4 : reps===1 ? 7 : round(prev · ease · 1.3)` | +0.15 | +1 | 0 |

**Behavioural delta** for existing users:
- `hard` now produces shorter intervals (×1.2 vs reps-ramp).
- `again` no longer changes status; the status derivation does (§ 0.5).
- `easy` intervals at reps=0/1 are deterministic (4d/7d) rather than the 4d floor.

**Recommendation**: write the new `src/srs/sm2.ts` as a pure function per the prompt. Leave `src/lib/sm2.ts` as the legacy adapter that the existing `useProgress.rate()` and `Flashcards` call into during transition. After Phase 7, delete `src/lib/sm2.ts`.

---

## 0.5 Status derivation rule

Prompt:
- `new` if `reps === 0 && lapses === 0`
- `learning` if `reps < 2`
- `review` if `reps >= 2 && interval_days < 21`
- `mastered` if `interval_days >= 21 && lapses === 0 over last 3 reps`

Current: status is *set* implicitly by `applyRating` with different thresholds, *and* status is **directly user-settable** via 4 buttons in `Browse.tsx` (line 131-144). The user prompt requires status to become **derived only**, with the buttons removed.

That removes a UX surface (deliberate per prompt) but does change muscle-memory for any existing user. Flag.

---

## 0.6 Current components vs. prompt's screens

| Prompt screen | Reality | Gap |
|---|---|---|
| `/library` — list, no detail pane, virtualized, topic pill rail, queue tabs (Due/New/All/Mastered/Saved), filter sheet, sticky "Start session" bottom CTA | `src/components/Browse.tsx` — master-detail (list left, detail right). Mobile collapses to stacked panes (PR-5). No pill rail. No queue tabs. No filter sheet. No "Start session" CTA. No virtualization. No "Saved" state in schema (would need a column or rely on `status='review'`). | Full rebuild. |
| `/library/q/:id` — full-screen detail with segmented status, confidence slider 0–5 with haptic detents, Practice CTA, stats row, hidden answer behind Reveal button, full-screen notes editor, history list | Browse right-pane: question + 4 status buttons + 5-dot confidence + notes textarea + collapsible `<details>` "Suggested answer". No history. No haptic detents. No fullscreen notes. | Full rebuild. |
| `/session` — fullscreen card stack with swipe, 4 rating buttons, projected interval captions, session-complete screen with breakdown | `src/components/Flashcards.tsx` — single card flip with rate row. No swipe gestures, no card peek, no projected-interval captions on buttons (we show `1d`/`3d`/etc. as separate row), no session-complete screen with breakdown, no auto-queue-construction. | Rebuild around the new `schedule()`. |
| Stats view | Not in current views. `Dashboard` is the closest. | Build. |

---

## 0.7 Bottom nav reality

Current (after PR-9, in `src/components/_rf/MobileBottomTabBar.tsx`):
```
Home  ·  Library  ·  Study  ·  Review     (4 tabs)
```

Prompt's target:
```
Home  ·  Library  ·  Session  ·  Stats    (4 tabs)
```

Mapping:
- `Study` → `Session` (rename + reroute to the new SRS engine).
- `Review` → folded into Session (Session's default queue is "due cards"; an explicit Review tab becomes redundant).
- New `Stats` tab — currently `Dashboard` covers ~50% of that content; needs its own dedicated screen with the prompt's required hero numbers + breakdown.

**Recommendation**: rename `Study` → `Session`, swap `Review` → `Stats`, and route `Stats` to a new screen that re-uses the existing `MobileDashboard` cards (mastery, streak) as a starting point. Behavioural change worth confirming.

---

## 0.8 Existing UI that conflicts with prompt language

| Prompt directive | Existing element | Resolution |
|---|---|---|
| "Replace 5-circle confidence rating everywhere" | `ConfidenceDots.tsx` (5 dots; renders in `Browse.tsx` detail and after rate in `Flashcards.tsx`) | Replace with `<ConfidenceSlider>` 0–5 with `navigator.vibrate(8)` at each detent. |
| "Replace 2×2 status grid everywhere with the segmented control" | We don't actually have a 2×2 grid — it's a single row of 4 `<button>` in `Browse.tsx` `.status-row`. Functionally close but visually inconsistent with a segmented control. | Replace with `<StatusSegmentedControl>` + downgrade to read-only display (since status becomes derived per § 0.5). |
| "No red left-border for selection" | Currently `Browse.tsx` list-item active state is via `.active` class. Verified: no red bar today. | Already compliant. |
| "Audit copy" | Many empty-state strings exist; tone is mixed (e.g., dashboard streak copy is playful, errors are flat). | Phase 8 pass. |

---

## 0.9 Critical / High / Medium deviations from prompt assumptions

**Critical — block Phase 1 until decided.**
1. **No router.** Prompt's "Phase 3 — fix routing as the first commit" assumed one existed. Decision: install `react-router-dom@^6` (≈13 kB gz) or stay with state-machine views and fake routes? → Strong recommendation: install. (§ 0.2)
2. **No `user_id` and no test framework.** `user_id` is meaningless here — drop from schema. **Add `vitest`** + `@vitest/coverage-v8` for the "100% branch coverage on `schedule()`" requirement, or relax to a single TS file that exports unit-test-equivalent assertions runnable on `npm run dev`. (§ 0.1)
3. **Extend-only conflict.** The proposed `review_state` schema is functionally a rename of the existing `progress` table. Pick path A (keep names, TS adapter) per § 0.3 unless you'd rather do a hard cutover.

**High — blockers within Phase 1 or 2.**
4. **Behavioural delta from `applyRating` → `schedule`** intervals will be tighter on `hard` and stricter on `again` (no auto-status-flip). Users with existing progress will see their next-review dates shift the next time they rate.
5. **Status becomes derived only**, removing the user's existing status-toggle buttons in Browse. Confirm. (§ 0.5)
6. **Bottom-nav semantic shuffle**: `Study`→`Session`, `Review`→`Stats`. Confirm. (§ 0.7)
7. **Phase 2 wants vitest** — adding a dep + scripts. Confirm.

**Medium — deferrable, won't block early phases.**
8. Virtualization (`@tanstack/react-virtual`). Lists are ~500 rows; perf acceptable. Add when we measure jank.
9. `@use-gesture/react` not needed — Framer Motion `drag` covers swipe-up / swipe-left / swipe-right. Keep zero new deps for gestures.
10. Long-press context menu (Star / Skip today / Reset / Share) — new mechanic, needs UX confirmation.
11. Search inline expand UX — new.
12. Saved-questions state — needs a new column (`saved INTEGER NOT NULL DEFAULT 0`) since current schema has no Star concept. Add to the same Phase 1 migration.

---

## 0.10 Decisions needed before Phase 1

Tick one per row, or override with text:

1. Router: **install `react-router-dom@^6`** ✓ / ✗ / *other*
2. Schema migration path: **A — keep names, TS adapter** ✓ / B — hard rename / C — dual-write
3. Drop `user_id` from schema (single-user local app): ✓ / ✗
4. Test framework: **install `vitest + @vitest/coverage-v8`** ✓ / ✗ (if ✗, propose alternative)
5. Replace `Study`/`Review` bottom tabs with `Session`/`Stats`: ✓ / ✗
6. Make `status` derived-only (remove manual status buttons): ✓ / ✗
7. New columns this migration: **`lapses`, `saved`** ✓ / ✗ (add others?)
8. Acceptable that `again`/`hard` intervals will tighten for existing data: ✓ / ✗
9. Gesture lib: stick with **Framer Motion `drag`** ✓ / add `@use-gesture/react`
10. Virtualization: defer until measured ✓ / add now

---

## 0.11 What was read

`package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vercel.json` (existing context), `src/lib/db.ts` (schema + migration sites + progress insert), `src/lib/sm2.ts` (full), `src/types.ts:1–60`, `src/App.tsx` (head + render branches from earlier turns), `src/components/Browse.tsx` (from earlier turns — full), `src/components/Flashcards.tsx` (from earlier turns — full), `src/components/ConfidenceDots.tsx` (from earlier turns — full), `src/components/_rf/MobileBottomTabBar.tsx` (current PR-9), `src/components/_rf/MobileDashboard.tsx`, `src/components/_rf/MobileLibrary.tsx`.

Greps: `vitest|jest|playwright`, `react-router|@tanstack/router|wouter|history`, `use-gesture|react-virtual|virtuoso`, `history.pushState|location.hash|popstate`, schema `ALTER TABLE progress`, `notes_md|p\.notes`.

## 0.12 What was skipped, and why

- `src/components/courses/*` — Phase 8 polish territory; not relevant to Library/Session/Stats redesign.
- `recharts` internals — Stats screen design will likely drop recharts entirely (or keep on Stats route only). Defer.
- Lighthouse / axe runs — no headless browser in this sandbox. Will be run on your machine when Phase 1 ships.
- Inspection of `src/lib/db.ts` migration runner past the `progress` table — covered earlier (Phase 0/PR-2 work).

— Phase 0 complete. Stopping. Awaiting answers to § 0.10 before Phase 1.
