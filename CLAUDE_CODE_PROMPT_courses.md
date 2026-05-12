# Claude Code Prompt — Add "Courses" tracking module to InterviewTracker

Paste the block below verbatim into Claude Code from the repo root
`/Users/ferozebasha/Interview_Prep/InterviewTracker`. It first asks Claude to
audit the existing app, then integrate a new **Courses** module with
section-/topic-level tracking and **multi-Udemy-account ownership**
(courses spread across 5 Gmail accounts).

---

## PROMPT

You are working in `/Users/ferozebasha/Interview_Prep/InterviewTracker`. This is a
React 18 + Vite + TypeScript SPA that persists state to a sql.js (WASM SQLite)
database backed by IndexedDB, with optional dev-only disk sync via
`vite-plugin-db-sync.ts`. Existing views are Dashboard, Browse, Flashcards,
Review. State flows through `useProgress`, schema lives in `src/lib/db.ts`,
question seed data in `src/data/questions.ts`, type contracts in `src/types.ts`.

### Step 1 — Audit before you change anything

Before writing any code, read and summarize back to me:

1. `src/App.tsx` — view routing, header, keyboard shortcuts.
2. `src/types.ts` — the `View`, `Status`, `ProgressEntry`, `AppState` shapes.
3. `src/lib/db.ts` — schema, migrations, persistence pattern, helpers
   (`run`, `tx`, `query`, `upsertProgress`, `bumpActivity`, `dbStats`).
4. `src/hooks/useProgress.ts` — how state is loaded, mutated, persisted.
5. `src/components/Dashboard.tsx` and `src/styles.css` — the visual language
   (cards, mesh-bg, topic chips, ActivityRing, Constellation).
6. `vite-plugin-db-sync.ts` and `vite.config.ts` — the dev disk-sync mechanism.

Output a short audit (≤ 200 words) covering: persistence flow, how a new view
is registered, where I must hook new DB tables in, and which existing patterns
I should reuse (don't invent new ones).

### Step 2 — Add a "Courses" feature

Add a new top-level view `courses` alongside `dashboard | browse | flashcards
| review`. Hotkey **5** opens it. The feature must reuse the existing SQLite +
IndexedDB persistence (no localStorage, no new storage layer) and follow the
same `run` / `tx` / `query` helper pattern from `src/lib/db.ts`.

#### Data model (extend the SQLite schema in `db.ts`, bump `SCHEMA_VERSION` to 2)

```sql
CREATE TABLE IF NOT EXISTS udemy_accounts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT,                          -- short label, e.g. "Personal", "Learning"
  color        TEXT NOT NULL DEFAULT '#7c8cff', -- hex; used for chips/badges
  is_primary   INTEGER NOT NULL DEFAULT 0,
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  stream          TEXT NOT NULL,             -- e.g. "Dotnet", "Machine Learning"
  platform        TEXT NOT NULL DEFAULT 'Udemy',
  account_email   TEXT,                       -- FK-by-value to udemy_accounts.email
  url             TEXT,
  total_sections  INTEGER NOT NULL DEFAULT 0,
  total_lectures  INTEGER NOT NULL DEFAULT 0,
  total_minutes   INTEGER NOT NULL DEFAULT 0,
  progress_pct    REAL NOT NULL DEFAULT 0,    -- 0..100, derived but cached
  status          TEXT NOT NULL DEFAULT 'not_started',
                                              -- not_started|in_progress|paused|completed|dropped
  priority        INTEGER NOT NULL DEFAULT 3, -- 1=High .. 5=Low
  target_date     TEXT,                       -- ISO date
  started_at      TEXT,
  completed_at    TEXT,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS course_sections (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id       INTEGER NOT NULL,
  order_index     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  total_lectures  INTEGER NOT NULL DEFAULT 0,
  total_minutes   INTEGER NOT NULL DEFAULT 0,
  progress_pct    REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'not_started',
  notes           TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_topics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id      INTEGER NOT NULL,
  order_index     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  duration_min    INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'not_started',
                                              -- not_started|in_progress|completed|skipped
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  rating          INTEGER,                     -- 1..5 self-rated mastery
  notes           TEXT NOT NULL DEFAULT '',
  completed_at    TEXT,
  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id       INTEGER NOT NULL,
  topic_id        INTEGER,
  date            TEXT NOT NULL,               -- YYYY-MM-DD
  minutes         INTEGER NOT NULL,
  notes           TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_courses_stream    ON courses(stream);
CREATE INDEX IF NOT EXISTS idx_courses_status    ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_account   ON courses(account_email);
CREATE INDEX IF NOT EXISTS idx_sections_course   ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_topics_section    ON course_topics(section_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course   ON course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date     ON course_sessions(date);
```

#### Seed the 5 known Udemy accounts

In the v2 migration, INSERT OR IGNORE the following accounts so the dropdowns
and filters are pre-populated from first launch:

| email | display_name | color | is_primary |
|---|---|---|---|
| bashaferoz66@gmail.com         | Primary       | #7c8cff | 1 |
| bashaferoz027@gmail.com        | Secondary     | #34d399 | 0 |
| ferozebasha2001@gmail.com      | Personal      | #f59e0b | 0 |
| info.firoseenterprises@gmail.com | Enterprises | #ef4444 | 0 |
| feroze.learning@gmail.com      | Learning      | #a855f7 | 0 |

These match the 5 Gmail columns in the source spreadsheet. The user may rename
`display_name` or recolor them later through Settings (see UI section below);
do not hardcode them anywhere else.

Write a `migrateToV2()` that runs only when `meta.schema_version < 2`, and
update `createSchema` / persistence accordingly. Don't break existing DB files
on import — re-run migration on imported files too.

#### Seed data (from `My Courses.xlsx - Sheet1.pdf`)

Create `src/data/courses.ts` exporting a typed `SEED_COURSES` array with these
40 rows (title, stream, progress_pct). Seed idempotently (INSERT OR IGNORE on a
natural-key `(title)` unique index — add that index).

| Title | Stream | % |
|---|---|---|
| Complete Data Science,Machine Learning,DL,NLP Bootcamp | Machine Learning | 0 |
| Data Structures and Algorithms: In Depth DSA using C# | C# | 0 |
| Clean Architecture in .NET Core MVC[.NET 8] - Complete Guide | Dotnet | 0 |
| C# 12 - Ultimate Guide - Beginner to Advanced \| Master class | C# | 27 |
| The Complete Python Developer | Python | 7 |
| Getting started with Clean Architecture using .Net Core | Dotnet | 8 |
| Complete Math, Statistics & Probability for Machine Learning | Machine Learning | 6 |
| Mathematical Foundations of Machine Learning | Machine Learning | 1 |
| Master statistics & machine learning: intuition, math, code | Machine Learning | 1 |
| Machine Learning Essentials - Master core ML concepts | Machine Learning | 0 |
| [NEW] AI Mastery Bootcamp: Complete Guide with 1000 Projects | Machine Learning | 0 |
| Machine Learning A-Z: AI, Python & R + ChatGPT Prize [2025] | Machine Learning | 2 |
| Swift 5 Programming Bootcamp For Beginners | IOS | 0 |
| iOS Development Crash Course - Learn How to Create iOS Apps | IOS | 0 |
| Introduction to R Programming | R | 0 |
| Ethical Hacking and Penetration Testing with Kali Linux | Pentest | 1 |
| Azure DevOps for .NET Developer (CI/CD, Boards, Repo & Wiki) | Devops | 83 |
| .NET Core Microservices - The Complete Guide (.NET 8 MVC) | Dotnet | 60 |
| Asp.Net Core 9 (.NET 9) \| True Ultimate Guide | Dotnet | 19 |
| ASP.NET Core Identity - Authentication & Authorization [MVC] | Dotnet | 13 |
| .NET Microservices with Azure DevOps & AKS \| Basic to Master | Dotnet | 0 |
| .NET 8 Backend Bootcamp: Modulith, VSA, DDD, CQRS and Outbox | Dotnet | 15 |
| DevOps Beginners to Advanced with Projects | Devops | 3 |
| The Windows Presentation Foundation WPF Guide for beginners | WPF | 10 |
| Full Stack React Bootcamp with .NET API [10 Projects] | Dotnet | 7 |
| Getting Started .NET Core Microservices RabbitMQ | Dotnet | 90 |
| AWS for DotNet (.Net) Core Developers | Dotnet | 3 |
| SignalR - The Complete Guide (with real world examples) | Dotnet | 23 |
| Xamarin Android: Learn to Build Native Android Apps With C# | Dotnet | 15 |
| Creating .Net Core Microservices using Clean Architecture | Dotnet | 4 |
| .NET 8 Microservices: DDD, CQRS, Vertical/Clean Architecture | Dotnet | 94 |
| NumPy, Pandas and Matplotlib A-Z™ for Machine Learning | Machine Learning | 0 |
| .NET/C# Interview Masterclass- Top 500 Questions (PDF)(2025) \| Udemy | C# | 0 |
| Azure Data Engineering End-to-end Course (English) | Data Engineering | 0 |
| Data Engineering for Beginners: Learn SQL, Python & Spark | Data Engineering | 0 |
| React - The Complete Guide 2025 (incl. Next.js, Redux) | React | 0 |
| The Ultimate React Course 2025: React, Next.js, Redux & More | React | 0 |
| Complete guide to building an app with .Net Core and React | Dotnet | 0 |
| Playwright Python and Pytest for Web Automation Testing | Automation Testing | 0 |
| Playwright PYTHON Automation Testing - From Zero to Expert | Automation Testing | 0 |

Map the % to `progress_pct` and set `status = 'in_progress'` if `0 < pct < 100`,
else `not_started`. Default `priority` = 3, `platform` = 'Udemy'.

**Account assignment for seed rows:** the source spreadsheet has 5 email
columns but they are empty in the extracted text, so leave `account_email`
NULL on seed. After seeding, the Courses list view must show an
"Unassigned" group at the top with a prominent banner: *"40 courses don't
have a Udemy account assigned yet — Bulk assign"*. Clicking opens the bulk
assignment modal (see UI below). The user can also paste a CSV with
`title,account_email` columns to assign in one shot.

#### New types (`src/types.ts`)

Add `UdemyAccount`, `Course`, `CourseSection`, `CourseTopic`, `CourseSession`,
`CourseStatus`, `TopicStatus`. Extend `View` with `"courses"`,
`"course-detail"`, and `"accounts"`.

```ts
export interface UdemyAccount {
  id: number;
  email: string;
  displayName: string | null;
  color: string;
  isPrimary: boolean;
  notes: string;
}
export interface Course {
  // ...existing fields...
  accountEmail: string | null;   // null => unassigned
}
```

#### New hooks

**`src/hooks/useCourses.ts`** — mirror `useProgress`'s shape. Expose:
`courses`, `getCourseById(id)`, `getSections(courseId)`, `getTopics(sectionId)`,
`createCourse`, `updateCourse`, `deleteCourse`, `addSection`, `addTopic`,
`setTopicStatus(topicId, status)`, `logSession(courseId, topicId?, minutes,
notes?)`, `recomputeProgress(courseId)`, `assignAccount(courseId, email|null)`,
`bulkAssignAccount(courseIds[], email|null)`, `importJson(blob)`,
`exportJson()`. Every mutation must use `tx()` and update `updated_at`.
Status rollup: `course.progress_pct` =
`sum(topic.duration_min where status=completed) / sum(topic.duration_min)` when
topics exist, otherwise the manually-set `progress_pct`. Same for sections.

**`src/hooks/useAccounts.ts`** — `accounts`, `addAccount({email, displayName,
color})`, `updateAccount`, `deleteAccount` (blocked if any course still
references it; offer reassign-or-clear), `setPrimary(id)`, `getAccountByEmail(email)`.
Deleting an account must NOT cascade — it should null-out
`courses.account_email` only after the user confirms.

#### New components under `src/components/courses/`

1. **`CoursesList.tsx`** — main view. Filter bar: **account (multi-select
   colored chips, with an "Unassigned" chip)**, stream (multi-select pill
   filters with counts), status (not_started/in_progress/paused/completed/
   dropped), priority, search by title. Persist active filters in the `meta`
   table so they survive reload. Sort: progress asc/desc, recently updated,
   title, target date. Card grid showing: title, stream tag, **account
   badge (colored chip with email — clickable to filter)**, progress bar
   with %, priority dot, last session date, "Continue" / "Start" CTA.
   Top of view: KPI strip — total courses, completed, in-progress, avg
   progress, total minutes logged this week, current streak. Also a small
   **per-account summary row** (mini cards, one per Udemy account: count of
   courses, avg progress, hours-this-week).

   **Group-by toggle**: list can be flat (default) or grouped by account or
   stream. When grouped, each group header is collapsible and shows its own
   mini-stats.

2. **`CourseDetail.tsx`** — opened by clicking a card. Shows:
   - Header with title, stream, platform, URL, target date, priority,
     **account picker (colored chip dropdown showing all `udemy_accounts`
     + "Unassigned")**, notes (editable in place).
   - Below the URL, a "Open on Udemy" button that respects the
     account (`https://www.udemy.com/course/...` — Claude should warn the
     user if multiple accounts are signed-in in the browser).
   - Section accordion. Each section shows progress bar, lecture count,
     status, and expand to reveal topics.
   - Topic rows: order #, title, duration, status pill (cycle by click:
     not_started → in_progress → completed → skipped), rating (1–5 stars),
     "Log session" inline form (minutes + optional note), notes textarea.
   - "+ Add section" and "+ Add topic" forms.
   - Right-side panel: per-course chart (Recharts) — minutes logged per day,
     last 30 days; pie of topic statuses; mastery histogram of ratings.
   - "Bulk add topics" textarea: paste lines like `01:23 Title here` and parse
     into topics (duration in minutes, fallback to 0 if unparseable).

3. **`StreamHeatmap.tsx`** — for the CoursesList view. Stream × week grid; cell
   color intensity = minutes studied that week for that stream. Click a cell
   to filter the list.

4. **`CourseImport.tsx`** — modal accepting CSV/JSON paste OR file upload to
   add many courses at once. CSV columns:
   `title,stream,account_email,platform,url,total_sections,total_lectures,total_minutes,progress_pct,priority,target_date`.
   The `account_email` column may be blank; if it is a non-empty value not
   in `udemy_accounts`, the importer offers a single click "Add this email
   as a new account" before commit. Validate, preview (diff: rows that will
   insert vs update vs error), then commit in a single `tx()`.

5. **`AddCourseDialog.tsx`** — minimal form to add one course manually. Includes
   an account picker (colored chip dropdown). Defaults to the account marked
   `is_primary = 1`.

6. **`BulkAssignAccount.tsx`** — modal triggered from the "Unassigned" banner
   or by multi-selecting course cards (checkbox on each card; "Select all
   filtered" button). Lets the user reassign N courses to one account in a
   single `tx()`. Shows a preview count per stream so the user can verify
   they're not bulk-assigning the wrong rows.

7. **`AccountsView.tsx`** (new `View = "accounts"`) — manage the 5 (or more)
   Udemy accounts: edit display name + color, mark primary, add new account,
   delete (with reassignment flow). For each account, show: course count,
   stream breakdown (mini stacked bar), total hours logged, avg progress,
   and a "View these courses" button that deep-links to CoursesList with the
   account filter pre-applied.

#### Dashboard integration

Extend `Dashboard.tsx` with a new "Courses" panel:
- Donut: % of courses by status.
- Stacked bar by stream: completed vs in-progress vs not-started.
- **Stacked bar by Udemy account**: courses per account split by status. Each
  bar uses the account's color from `udemy_accounts.color`.
- **Per-account leaderboard**: one row per account with avatar circle in
  account color, total courses, avg progress %, and hours-this-week.
- "Continue learning" list: top 5 in-progress courses by recently logged
  session, with one-click jump into `course-detail`. Each row shows the
  account chip so the user knows which login to use.
- "At risk" list: courses with `target_date < today + 14 days` and
  `progress_pct < 50`.
- A new KPI tile: total study minutes (all-time) and minutes-this-week trend
  sparkline.

Wire `onJumpToCourse(courseId)` analogous to `onJumpToTopic`.

#### App shell wiring (`src/App.tsx`)

- Add nav button "Courses" between "Browse" and "Flashcards".
- Add nav button "Accounts" (the `accounts` view) inside the secondary header
  actions row, with a small avatar stack showing the colors of all configured
  accounts.
- Hotkey `5` → courses, `6` → accounts, `Shift+5` → course-detail of the last
  opened course (persist `last_open_course_id` in the `meta` table).
- Command palette (`CommandPalette.tsx`): also index courses, topics, AND
  accounts (`account:bashaferoz66@gmail.com → filter to that account`).
  Account filter actions are prefixed with `📧`.

#### Pomodoro integration

When a Pomodoro focus session completes AND there's a `last_open_course_id`,
ask once (toast with action button "Log 25m to <course>") to insert a
`course_sessions` row. Don't auto-log without consent.

#### Achievements (`src/lib/achievements.ts`)

Add:
- `first_course_started`
- `first_course_completed`
- `stream_explorer` (started ≥ 3 streams)
- `polyglot` (in-progress in ≥ 5 streams)
- `marathoner` (≥ 10 hours logged in one week)
- `consistent_learner` (logged a session 7 days in a row)
- `dotnet_master` (all Dotnet-stream courses ≥ 50%)
- `account_consolidator` (every course has an `account_email` assigned —
  i.e. 0 unassigned)
- `multi_account_juggler` (logged a session for ≥ 3 different accounts in one
  week)

#### Styles (`src/styles.css`)

Reuse the existing token system (`--text-*`, `--bg-*`, mesh-bg, card,
.badge, .ghost). Add only:
- `.course-card`, `.course-card .progress`, `.course-card .progress > i`
- `.stream-tag` (pill, color-coded — Dotnet, C#, Machine Learning, Python,
  IOS, R, Pentest, Devops, WPF, Data Engineering, React, Automation Testing)
- `.account-chip` (colored chip; background uses `udemy_accounts.color` at
  alpha=0.18, border at alpha=0.4, text uses the color at full opacity) and
  `.account-chip.unassigned` (dashed grey)
- `.account-avatar` (small colored circle, used in dashboard leaderboard +
  header avatar stack)
- `.topic-row`, `.topic-status` (cycling pill)
- `.kpi-tile`, `.heatmap-cell`

No new CSS frameworks. Match the current glassy/mesh aesthetic.

#### Tests / verification

After implementation:

1. Run `npm install` if needed, then `npm run build` — must pass with zero TS
   errors.
2. Run `npm run dev` and verify by:
   - Open `/`, navigate to Courses tab. Confirm 40 seeded courses appear,
     all initially under the "Unassigned" group, and the banner offers
     "Bulk assign".
   - Open Accounts tab. Confirm all 5 Udemy emails are pre-seeded with the
     correct colors; rename one display_name and confirm it propagates to
     the chips on the CoursesList.
   - Bulk-assign 10 courses to `bashaferoz66@gmail.com`. Confirm filter
     chips at top now show counts (`bashaferoz66 · 10`, `Unassigned · 30`).
   - Open one course, change its account via the picker, add a section, add
     a topic, mark it completed — section and course progress_pct should
     recompute correctly.
   - Log a 25-minute session — Dashboard "minutes this week" and the
     account leaderboard for that account should both increment.
   - Try to delete an account that has assigned courses — must prompt for
     reassignment-or-clear, not silently cascade.
   - Export the .sqlite file via the existing toolbar button. Re-import it
     in a fresh browser profile / private window — courses + sections +
     topics + sessions + udemy_accounts must round-trip with colors intact.
   - Reset DB — schema should re-seed cleanly to v2 from scratch, including
     the 5 Udemy accounts.

3. Take a screenshot of: CoursesList with filters applied (including the
   account chips), CourseDetail with sections expanded and the account picker
   open, AccountsView, and Dashboard showing the new Courses panel + per-
   account leaderboard. Save them under `docs/screenshots/courses-*.png`.

Report back with: the audit summary (Step 1), a diff summary of files changed/
added, the build output, and the verification checklist with pass/fail per
item.

### Constraints

- **Do not** replace the existing question-tracking feature. Add alongside.
- **Do not** introduce new state libraries (no Zustand, Redux, Jotai). Use
  React state + the existing custom-hook pattern.
- **Do not** use localStorage for anything new. SQLite only.
- Keep all writes inside `tx()` when touching multiple tables.
- Bump `SCHEMA_VERSION` and write a forward migration; the migration must be
  idempotent so re-imports of v1 .sqlite files upgrade cleanly.
- TypeScript: strict, no `any` in new code (use `unknown` + narrowing where
  needed). Re-export new types from `src/types.ts`.
- Accessibility: status pills must be `<button>` with `aria-label`, progress
  bars must have `role="progressbar"` + `aria-valuenow`, modals must trap
  focus and close on Esc.
- Performance: list 1000+ courses without lag — virtualize the topics list if
  > 200 rows (lightweight: windowed render, no extra library; or use
  `react-window` if you must — but justify in the audit).

When done, end with a short "How to use" section in the chat showing the
3 main flows (add course → add topics → log session) with the keyboard
shortcuts.
