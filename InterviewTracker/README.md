# .NET Interview Tracker

An interactive Vite + React + TypeScript app that loads all **530 questions** from your `Top-500-DotNet-Interview-Questions.xlsm` and helps you study them with spaced repetition, notes, and progress tracking — all backed by a real **SQLite database** running in your browser via WebAssembly.

## UI v2 — "Aurora"

The interface runs on an additive design layer (`src/styles/aurora.css`) built
entirely from modern platform features — **zero new dependencies**:

- **View Transitions API** — views cross-fade and the active nav pill *morphs*
  between tabs (desktop nav and the mobile tab bar share the mechanism).
- **Living aurora background** — `@property`-animated conic gradients with an
  SVG grain pass, compositor-only.
- **Pointer spotlight** — cards catch the light under the cursor (one passive,
  rAF-throttled listener for the whole document; never attaches on touch).
- **Scroll-driven reveals** — `animation-timeline: view()`, pure CSS.
- Every effect respects `prefers-reduced-motion` and degrades gracefully.

Performance went with it: all views are **code-split** (`React.lazy` +
CLS-safe skeletons), vendors are chunked for caching, and the 530-row Browse
list uses `content-visibility`. The always-loaded app shell dropped from
**277 KB → 100 KB gzip**; a mobile session that never opens charts loads
**~101 KB** instead of 277 KB (recharts ships only with the desktop
Dashboard). Details in `docs/ui/02-aurora.md`.

## Quick start

```bash
cd InterviewTracker
npm install
npm run dev
```

Opens http://localhost:5173 automatically.

## Data architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser tab                                                │
│                                                             │
│   React UI ──────────► useProgress hook ──────► db.ts       │
│       ▲                       │                  │          │
│       └─── re-render          │                  │ runs     │
│           on state change     ▼                  ▼          │
│                         AppState (in mem)  ┌──────────┐     │
│                                            │ sql.js   │     │
│                                            │ (WASM)   │     │
│                                            │ + DB obj │     │
│                                            └────┬─────┘     │
│                                                 │           │
│                                                 │ debounced │
│                                                 │ export()  │
│                                                 ▼           │
│                                            ┌──────────┐     │
│                                            │IndexedDB │     │
│                                            │.sqlite   │     │
│                                            │ binary   │     │
│                                            └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

- **In-memory SQLite** (sql.js — official SQLite compiled to WASM)
- **Persistent storage**: the full database file is serialized after every write (debounced 350 ms) and saved into IndexedDB as a `Uint8Array`
- **Survives reloads**, fully offline, no server
- **Export anywhere**: download the actual `.sqlite` file from the top bar and open it in DB Browser for SQLite, DBeaver, TablePlus, the SQLite CLI, etc.

### Schema

```sql
CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  exp INTEGER NOT NULL,
  part INTEGER NOT NULL
);

CREATE TABLE progress (
  question_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new',         -- new | learning | review | mastered
  notes TEXT NOT NULL DEFAULT '',
  ease REAL NOT NULL DEFAULT 2.5,             -- SM-2 ease factor
  interval INTEGER NOT NULL DEFAULT 0,        -- days until next review
  repetitions INTEGER NOT NULL DEFAULT 0,
  last_reviewed TEXT,
  next_review TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE activity (
  date TEXT PRIMARY KEY,                      -- YYYY-MM-DD
  reviews INTEGER NOT NULL DEFAULT 0,
  marked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_progress_next_review ON progress(next_review);
CREATE INDEX idx_progress_status      ON progress(status);
CREATE INDEX idx_questions_topic      ON questions(topic);
```

### Migration from the prior localStorage version

On first run, the data layer automatically reads the legacy keys
`interview-tracker:v1` and `interview-tracker:achievements` from
localStorage and inserts them into the new SQLite tables. The
localStorage entries are kept as a backup; you can remove them manually
from DevTools → Application if you want.

## Features

### Dashboard
- Apple-Watch–style activity rings (Mastered / Started / Activity)
- Animated streak flame, accuracy %, due-count, untouched count
- Topic Constellation — interactive radial mind-map of all 32 topics
- Reviews bar chart (last 14 days)
- 90-day GitHub-style activity heatmap
- Per-topic progress bars (32 topics)
- **SQLite database panel** showing live file size + row counts per table

### Browse
- Search 530 questions, filter by topic + status
- Add personal notes / answers per question (saved to SQL)
- Mark each question's status with one click

### Flashcards (study mode)
- 3D flip card with CSS perspective
- Press `Space` to flip; rate `1-4` (Again/Hard/Good/Easy)
- Focus / Zen mode (`⌘F`) for distraction-free study

### Review (spaced repetition)
- Shows only cards with `next_review <= now` (uses the indexed column)
- SM-2 inspired: streak grows the interval; "Again" resets

### Power features
- **⌘K Command Palette** — fuzzy-search every question and topic
- **Pomodoro timer** (25/5) with auto break + toast on completion
- **4 themes** — Midnight, Aurora, Sunset, Mint
- **Achievement toasts** — 12 unlockables, persisted in SQL
- **Confetti** when you master a question

### Data management
- **⬇ .sqlite** in top bar → downloads the actual SQLite database file
- **⬆** → import a `.sqlite` file (replaces current state, with auto-migration)
- **⟲** → resets the database (deletes from IndexedDB and re-seeds)

## Project structure

```
InterviewTracker/
├── package.json                  (sql.js, recharts, react)
├── vite.config.ts
├── tsconfig.*.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx                   (shell + routing)
    ├── styles.css                (4 themes + glassmorphism + animations)
    ├── vite-env.d.ts             (?url import types)
    ├── types.ts
    ├── data/
    │   └── questions.ts          (530 questions, used to seed SQLite)
    ├── lib/
    │   ├── db.ts                 (★ SQLite + IndexedDB persistence)
    │   ├── sm2.ts                (spaced-repetition logic)
    │   ├── achievements.ts       (achievement detection, SQL-backed)
    │   └── confetti.ts
    ├── hooks/
    │   ├── useProgress.ts        (SQL ↔ React state)
    │   ├── useTheme.ts
    │   ├── usePomodoro.ts
    │   └── useToasts.ts
    └── components/
        ├── Dashboard.tsx
        ├── Browse.tsx
        ├── Flashcards.tsx
        ├── ActivityRing.tsx
        ├── Constellation.tsx
        ├── CommandPalette.tsx
        ├── ToastHost.tsx
        ├── ThemeSwitcher.tsx
        ├── Pomodoro.tsx
        └── LoadingScreen.tsx
```

## Inspecting the database

Click the `⬇ .sqlite` button in the top bar — it downloads
`interview-tracker-<date>.sqlite`. Open it with:

- **DB Browser for SQLite** (free, GUI) — https://sqlitebrowser.org
- **SQLite CLI**:  `sqlite3 interview-tracker-2026-04-29.sqlite`
- **DBeaver**, **TablePlus**, etc.

Sample queries:

```sql
-- topics by mastery rate
SELECT q.topic,
       COUNT(*) AS total,
       SUM(CASE WHEN p.status='mastered' THEN 1 ELSE 0 END) AS mastered
FROM questions q
LEFT JOIN progress p ON p.question_id = q.id
GROUP BY q.topic
ORDER BY mastered * 1.0 / total DESC;

-- questions due today
SELECT q.id, q.topic, q.question
FROM progress p JOIN questions q ON q.id = p.question_id
WHERE p.next_review <= datetime('now')
ORDER BY p.next_review;

-- streak data
SELECT date, reviews, marked FROM activity ORDER BY date DESC LIMIT 30;
```

## Build for production

```bash
npm run build       # output in dist/
npm run preview     # serve the production build
```

Bundle: ~190 KB gzipped JS + ~5 KB gzipped CSS + ~660 KB WASM (cached after first load).
