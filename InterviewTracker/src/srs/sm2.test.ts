import { describe, it, expect } from "vitest";
import { schedule, projectInterval, type SrsState } from "./sm2";
import { deriveStatus } from "./status";

const NOW = new Date("2026-05-15T00:00:00Z");

const FRESH: SrsState = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };
const LEARNED_1: SrsState = { ease: 2.5, intervalDays: 1, reps: 1, lapses: 0 };
const LEARNED_2: SrsState = { ease: 2.5, intervalDays: 6, reps: 2, lapses: 0 };
const MATURE:    SrsState = { ease: 2.5, intervalDays: 30, reps: 6, lapses: 0 };

describe("schedule()", () => {
  // ---- Again from every starting state ----
  describe("again", () => {
    it("resets reps, sets 1d, drops ease by 0.20, bumps lapses (from fresh)", () => {
      const r = schedule(FRESH, "again", NOW);
      expect(r.reps).toBe(0);
      expect(r.intervalDays).toBe(1);
      expect(r.ease).toBeCloseTo(2.30, 5);
      expect(r.lapses).toBe(1);
    });
    it("respects ease floor 1.3", () => {
      const r = schedule({ ease: 1.4, intervalDays: 10, reps: 3, lapses: 2 }, "again", NOW);
      expect(r.ease).toBe(1.3);
      expect(r.lapses).toBe(3);
    });
    it("resets a mature card to 1d", () => {
      const r = schedule(MATURE, "again", NOW);
      expect(r.intervalDays).toBe(1);
      expect(r.reps).toBe(0);
    });
  });

  // ---- Hard from every starting state ----
  describe("hard", () => {
    it("from fresh: interval becomes 1 (max(1, round(0*1.2))) ", () => {
      const r = schedule(FRESH, "hard", NOW);
      expect(r.intervalDays).toBe(1);
      expect(r.reps).toBe(1);
      expect(r.ease).toBeCloseTo(2.35, 5);
    });
    it("from learned_1: round(1*1.2)=1", () => {
      expect(schedule(LEARNED_1, "hard", NOW).intervalDays).toBe(1);
    });
    it("from learned_2: round(6*1.2)=7", () => {
      expect(schedule(LEARNED_2, "hard", NOW).intervalDays).toBe(7);
    });
    it("from mature: round(30*1.2)=36, ease drops", () => {
      const r = schedule(MATURE, "hard", NOW);
      expect(r.intervalDays).toBe(36);
      expect(r.ease).toBeCloseTo(2.35, 5);
    });
  });

  // ---- Good from every starting state ----
  describe("good", () => {
    it("from fresh: 1d", () => {
      const r = schedule(FRESH, "good", NOW);
      expect(r.intervalDays).toBe(1);
      expect(r.reps).toBe(1);
      expect(r.ease).toBe(2.5); // unchanged
    });
    it("from reps=1: 6d", () => {
      expect(schedule(LEARNED_1, "good", NOW).intervalDays).toBe(6);
    });
    it("from reps=2: round(prev*ease)=15 from {6,2.5}", () => {
      expect(schedule(LEARNED_2, "good", NOW).intervalDays).toBe(15);
    });
    it("from mature: round(30*2.5)=75", () => {
      expect(schedule(MATURE, "good", NOW).intervalDays).toBe(75);
    });
  });

  // ---- Easy from every starting state ----
  describe("easy", () => {
    it("from fresh: 4d, ease+0.15", () => {
      const r = schedule(FRESH, "easy", NOW);
      expect(r.intervalDays).toBe(4);
      expect(r.ease).toBeCloseTo(2.65, 5);
    });
    it("from reps=1: 7d", () => {
      expect(schedule(LEARNED_1, "easy", NOW).intervalDays).toBe(7);
    });
    it("from reps=2: round(6*2.5*1.3)=20", () => {
      expect(schedule(LEARNED_2, "easy", NOW).intervalDays).toBe(20);
    });
    it("from mature: round(30*2.5*1.3)=98", () => {
      expect(schedule(MATURE, "easy", NOW).intervalDays).toBe(98);
    });
  });

  // ---- due_at is now + intervalDays, normalised to midnight ----
  describe("dueAt", () => {
    it("equals now + intervalDays @ midnight", () => {
      const r = schedule(LEARNED_2, "good", NOW);
      const expected = new Date(NOW);
      expected.setDate(expected.getDate() + r.intervalDays);
      expected.setHours(0, 0, 0, 0);
      expect(r.dueAt.getTime()).toBe(expected.getTime());
    });
  });
});

describe("projectInterval()", () => {
  it("returns the interval that schedule would set, without mutating state", () => {
    const before = { ...LEARNED_2 };
    const p = projectInterval(LEARNED_2, "easy");
    expect(p).toBe(20);
    expect(LEARNED_2).toEqual(before);
  });
});

describe("deriveStatus()", () => {
  it("new when reps=0 && lapses=0", () => {
    expect(deriveStatus({ reps: 0, lapses: 0, intervalDays: 0, recentRatings: [] })).toBe("new");
  });
  it("learning when reps < 2", () => {
    expect(deriveStatus({ reps: 1, lapses: 0, intervalDays: 1, recentRatings: ["good"] })).toBe("learning");
  });
  it("review when reps>=2 and intervalDays<21", () => {
    expect(deriveStatus({ reps: 2, lapses: 0, intervalDays: 6, recentRatings: ["good","good"] })).toBe("review");
  });
  it("mastered when intervalDays>=21 and no recent again", () => {
    expect(deriveStatus({ reps: 5, lapses: 0, intervalDays: 30, recentRatings: ["good","easy","good"] })).toBe("mastered");
  });
  it("back to review if a lapse appears in the last 3 reviews", () => {
    expect(deriveStatus({ reps: 5, lapses: 1, intervalDays: 30, recentRatings: ["again","good","good"] })).toBe("review");
  });
});
