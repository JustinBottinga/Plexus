import { describe, expect, it } from "vitest";
import { INITIAL_STATE, addDays, formatInterval, nextState, previewIntervals, todayLocal } from "@/lib/srs";

describe("nextState (SM-2)", () => {
  it("again: resets repetitions, interval 1, ease -0.2 (floor 1.3)", () => {
    expect(nextState({ ease_factor: 2.5, interval_days: 10, repetitions: 4 }, "again")).toEqual({
      repetitions: 0,
      interval_days: 1,
      ease_factor: 2.3,
    });
    expect(nextState({ ease_factor: 1.35, interval_days: 3, repetitions: 2 }, "again").ease_factor).toBe(1.3);
  });

  it("hard: interval*1.2 (min 1), ease -0.15 (floor 1.3), repetitions +1", () => {
    expect(nextState({ ease_factor: 2.5, interval_days: 10, repetitions: 3 }, "hard")).toEqual({
      repetitions: 4,
      interval_days: 12,
      ease_factor: 2.35,
    });
    expect(nextState(INITIAL_STATE, "hard").interval_days).toBe(1);
    expect(nextState({ ease_factor: 1.4, interval_days: 5, repetitions: 1 }, "hard").ease_factor).toBe(1.3);
  });

  it("good: 1 day, then 3 days, then interval*ease", () => {
    const first = nextState(INITIAL_STATE, "good");
    expect(first).toEqual({ repetitions: 1, interval_days: 1, ease_factor: 2.5 });
    const second = nextState(first, "good");
    expect(second.interval_days).toBe(3);
    const third = nextState(second, "good");
    expect(third.interval_days).toBe(8); // round(3 * 2.5)
    expect(third.repetitions).toBe(3);
  });

  it("easy: 3 days first, then interval*ease*1.3, ease +0.15", () => {
    const first = nextState(INITIAL_STATE, "easy");
    expect(first).toEqual({ repetitions: 1, interval_days: 3, ease_factor: 2.65 });
    expect(nextState({ ease_factor: 2.5, interval_days: 8, repetitions: 3 }, "easy").interval_days).toBe(26); // round(8*2.5*1.3)
  });

  it("does not mutate its input", () => {
    const s = { ease_factor: 2.5, interval_days: 3, repetitions: 2 };
    nextState(s, "easy");
    expect(s).toEqual({ ease_factor: 2.5, interval_days: 3, repetitions: 2 });
  });

  it("previews the interval of every rating", () => {
    expect(previewIntervals(INITIAL_STATE)).toEqual({ again: 1, hard: 1, good: 1, easy: 3 });
  });
});

describe("dates", () => {
  it("formats intervals", () => {
    expect(formatInterval(1)).toBe("1d");
    expect(formatInterval(59)).toBe("59d");
    expect(formatInterval(90)).toBe("3mnd");
    expect(formatInterval(730)).toBe("2j");
  });

  it("uses the local calendar date, not UTC", () => {
    expect(todayLocal(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayLocal(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // EU DST change on 29 March
    expect(addDays("2026-10-05", 0)).toBe("2026-10-05");
  });
});
