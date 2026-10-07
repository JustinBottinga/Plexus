import { describe, expect, it } from "vitest";
import { activeDays, currentStreak, weekStrip } from "@/lib/activity";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    const days = activeDays([at(2026, 10, 8), at(2026, 10, 7), at(2026, 10, 6), at(2026, 10, 3)]);
    expect(currentStreak(days, "2026-10-08")).toBe(3);
  });

  it("stays alive when you have not practised yet today", () => {
    const days = activeDays([at(2026, 10, 7), at(2026, 10, 6)]);
    expect(currentStreak(days, "2026-10-08")).toBe(2);
  });

  it("is 0 after a missed day", () => {
    expect(currentStreak(activeDays([at(2026, 10, 5)]), "2026-10-08")).toBe(0);
    expect(currentStreak(new Set(), "2026-10-08")).toBe(0);
  });

  it("counts several ratings on one day once", () => {
    expect(currentStreak(activeDays([at(2026, 10, 8, 9), at(2026, 10, 8, 21)]), "2026-10-08")).toBe(1);
  });
});

describe("weekStrip", () => {
  it("starts on Monday and marks today, practice and future days", () => {
    const week = weekStrip(activeDays([at(2026, 10, 5), at(2026, 10, 7)]), "2026-10-07"); // a Wednesday
    expect(week.map((d) => d.label)).toEqual(["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]);
    expect(week[0]).toMatchObject({ date: "2026-10-05", active: true, isToday: false });
    expect(week[2]).toMatchObject({ date: "2026-10-07", active: true, isToday: true });
    expect(week[3]).toMatchObject({ isFuture: true, active: false });
  });

  it("puts Sunday at the end of the week", () => {
    const week = weekStrip(new Set(), "2026-10-11"); // a Sunday
    expect(week[0]?.date).toBe("2026-10-05");
    expect(week[6]).toMatchObject({ date: "2026-10-11", isToday: true });
  });
});
