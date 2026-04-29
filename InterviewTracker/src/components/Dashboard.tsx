import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import type { AppState } from "../types";
import { QUESTIONS } from "../data/questions";
import ActivityRing from "./ActivityRing";
import Constellation from "./Constellation";

interface Props {
  state: AppState;
  onJumpToTopic?: (topic: string) => void;
  dbStats?: () => { sizeBytes: number; tables: { name: string; rows: number }[] };
}

function formatBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

export default function Dashboard({ state, onJumpToTopic, dbStats }: Props) {
  const stats = useMemo(() => {
    const total = QUESTIONS.length;
    const counts = { new: 0, learning: 0, review: 0, mastered: 0 };
    const byTopic: Record<string, { total: number; done: number; mastered: number }> = {};
    let totalReviews = 0;
    let totalCorrect = 0;

    for (const q of QUESTIONS) {
      const p = state.progress[q.id];
      const status = p?.status ?? "new";
      counts[status as keyof typeof counts] += 1;
      totalReviews += p?.reviewCount ?? 0;
      totalCorrect += p?.correctCount ?? 0;
      if (!byTopic[q.topic]) byTopic[q.topic] = { total: 0, done: 0, mastered: 0 };
      byTopic[q.topic].total += 1;
      if (status === "mastered") { byTopic[q.topic].done += 1; byTopic[q.topic].mastered += 1; }
      else if (status === "learning") byTopic[q.topic].done += 1;
    }

    const completed = counts.mastered;
    const inProgress = counts.learning + counts.review;
    const started = counts.learning + counts.review + counts.mastered;
    const pct = Math.round((completed / total) * 100);
    const startedPct = Math.round((started / total) * 100);

    // Streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (state.activity[key] && state.activity[key].reviews > 0) streak += 1;
      else if (i > 0) break;
    }

    // Last 14 days
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const a = state.activity[key];
      last14.push({ day: key.slice(5), reviews: a?.reviews ?? 0, marked: a?.marked ?? 0 });
    }

    // 90-day heatmap
    const heatmap: { date: string; reviews: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      heatmap.push({ date: key, reviews: state.activity[key]?.reviews ?? 0 });
    }

    const topicRows = Object.entries(byTopic)
      .map(([name, v]) => ({
        name, total: v.total, done: v.done, mastered: v.mastered,
        pct: Math.round((v.mastered / v.total) * 100),
      }))
      .sort((a, b) => b.pct - a.pct || b.total - a.total);

    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    return {
      total, counts, completed, inProgress, started, pct, startedPct,
      streak, last14, heatmap, topicRows, totalReviews, accuracy,
    };
  }, [state]);

  const heatLevel = (n: number): number => {
    if (n === 0) return 0;
    if (n < 5) return 1;
    if (n < 15) return 2;
    if (n < 30) return 3;
    return 4;
  };

  return (
    <>
      <div className="dash-hero">
        <div className="hero-rings glass">
          <ActivityRing
            size={220}
            stroke={16}
            centerPct={stats.pct}
            rings={[
              { color: "#5ef0a3", pct: stats.pct,        label: "Mastered" },
              { color: "#ffd166", pct: stats.startedPct, label: "Started" },
              { color: "#6ea8ff", pct: Math.min(100, stats.totalReviews / 5),  label: "Activity" },
            ]}
          />
          <div className="stats">
            <div>
              <div className="big-number">{stats.completed}<span style={{ fontSize: 22, color: "var(--text-3)", fontWeight: 400 }}> / {stats.total}</span></div>
              <div className="label-big">Questions Mastered</div>
            </div>
            <div className="stat-line">
              <span className="swatch" style={{ background: "#5ef0a3" }} />
              <span style={{ color: "var(--text-2)" }}>Mastered</span>
              <strong style={{ marginLeft: "auto" }}>{stats.completed}</strong>
            </div>
            <div className="stat-line">
              <span className="swatch" style={{ background: "#ffd166" }} />
              <span style={{ color: "var(--text-2)" }}>Started</span>
              <strong style={{ marginLeft: "auto" }}>{stats.started}</strong>
            </div>
            <div className="stat-line">
              <span className="swatch" style={{ background: "#6ea8ff" }} />
              <span style={{ color: "var(--text-2)" }}>Total reviews</span>
              <strong style={{ marginLeft: "auto" }}>{stats.totalReviews}</strong>
            </div>
          </div>
        </div>

        <div className="streak glass">
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            <span className="flame">🔥</span>
            <div>
              <div className="num">{stats.streak}</div>
              <div className="label">Day{stats.streak === 1 ? "" : "s"} streak</div>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            {stats.streak === 0 && "Do one review today to start a streak."}
            {stats.streak > 0 && stats.streak < 3 && "Nice — three in a row unlocks a badge."}
            {stats.streak >= 3 && stats.streak < 7 && "Habit forming — keep it going."}
            {stats.streak >= 7 && stats.streak < 14 && "A week strong. You've got rhythm."}
            {stats.streak >= 14 && "🏆 Two weeks straight. Elite consistency."}
          </div>
          <div className="row" style={{ gap: 14, marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Accuracy</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.accuracy}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Need review</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--red)" }}>{stats.counts.review}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Untouched</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-3)" }}>{stats.counts.new}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-strip">
        <div className="mini-stat glass">
          <span className="icon">📚</span>
          <div className="label">Total Questions</div>
          <div className="value">{stats.total}</div>
          <div className="sub">Across {Object.keys(stats.topicRows).length || stats.topicRows.length} topics</div>
        </div>
        <div className="mini-stat glass">
          <span className="icon">⭐</span>
          <div className="label">Mastered</div>
          <div className="value" style={{ color: "var(--green)" }}>{stats.completed}</div>
          <div className="sub">{stats.pct}% of all</div>
        </div>
        <div className="mini-stat glass">
          <span className="icon">📖</span>
          <div className="label">Learning</div>
          <div className="value" style={{ color: "var(--yellow)" }}>{stats.counts.learning}</div>
          <div className="sub">In active rotation</div>
        </div>
        <div className="mini-stat glass">
          <span className="icon">🎯</span>
          <div className="label">Accuracy</div>
          <div className="value" style={{ color: "var(--accent)" }}>{stats.accuracy}%</div>
          <div className="sub">{stats.totalReviews} reviews</div>
        </div>
      </div>

      <div className="dash-grid">
        <div>
          <div className="section-title">Topic Constellation</div>
          <Constellation state={state} onTopicClick={onJumpToTopic} />
        </div>
        <div>
          <div className="section-title">Reviews · Last 14 days</div>
          <div className="glass" style={{ padding: 16, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.last14}>
                <defs>
                  <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="var(--accent-2)" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                <YAxis stroke="var(--text-3)" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--bg-3)" }}
                  contentStyle={{
                    background: "var(--bg-1)",
                    border: "1px solid var(--border-hi)",
                    borderRadius: 10,
                    fontSize: 12,
                    backdropFilter: "blur(20px)",
                  }}
                />
                <Bar dataKey="reviews" fill="url(#bar-grad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>Activity · Last 90 days</div>
          <div className="heatmap-card glass">
            <div className="heatmap">
              {stats.heatmap.map(d => (
                <div
                  key={d.date}
                  className={`cell l${heatLevel(d.reviews)}`}
                  title={`${d.date}: ${d.reviews} review${d.reviews === 1 ? "" : "s"}`}
                />
              ))}
            </div>
            <div className="row" style={{ marginTop: 14, justifyContent: "space-between", fontSize: 11, color: "var(--text-3)" }}>
              <span>90 days ago</span>
              <span className="row" style={{ gap: 6 }}>
                Less
                <span className="cell" style={{ width: 12, height: 12, borderRadius: 3, background: "var(--bg-3)" }} />
                <span className="cell l1" style={{ width: 12, height: 12, borderRadius: 3 }} />
                <span className="cell l2" style={{ width: 12, height: 12, borderRadius: 3 }} />
                <span className="cell l3" style={{ width: 12, height: 12, borderRadius: 3 }} />
                <span className="cell l4" style={{ width: 12, height: 12, borderRadius: 3 }} />
                More
              </span>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>

      <div className="topic-list glass">
        <div className="section-title" style={{ marginBottom: 8 }}>Progress by topic</div>
        {stats.topicRows.map(t => (
          <div key={t.name} className="topic-row">
            <span className="topic-name" title={t.name} onClick={() => onJumpToTopic?.(t.name)} style={{ cursor: "pointer" }}>
              {t.name}
            </span>
            <div className="bar">
              <div className="fill" style={{ width: `${t.pct}%` }} />
            </div>
            <span className="pct">{t.mastered}/{t.total}</span>
          </div>
        ))}
      </div>

      {dbStats && (() => {
        const s = dbStats();
        return (
          <div className="glass" style={{ padding: 18, marginTop: 16 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>
              <span>SQLite database</span>
            </div>
            <div className="row" style={{ gap: 28, flexWrap: "wrap", fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>File size</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatBytes(s.sizeBytes)}</div>
              </div>
              {s.tables.map(t => (
                <div key={t.name}>
                  <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t.rows} <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 400 }}>rows</span></div>
                </div>
              ))}
              <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)", maxWidth: 360 }}>
                Stored in IndexedDB as a real SQLite file. Click <span className="kbd">⬇ .sqlite</span> in the top bar to download and inspect with any SQLite tool.
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
