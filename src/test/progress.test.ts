import { describe, expect, it } from "vitest";
import { accuracy, buildDays, fillForecast, heatLevel, heatmapWeeks, moodFor, topCategory, type DayRow } from "@/lib/progress";

const today = "2026-10-08"; // a Thursday
const rows: DayRow[] = [
  { day: "2026-10-08", category_id: "a", reviews: 6, good: 5 },
  { day: "2026-10-08", category_id: "b", reviews: 4, good: 1 },
  { day: "2026-10-06", category_id: "a", reviews: 3, good: 3 },
  { day: "2020-01-01", category_id: "a", reviews: 99, good: 99 }, // outside the range
];

describe("buildDays", () => {
  it("returns every day of the range, oldest first, with empty days", () => {
    const days = buildDays(rows, 7, today);
    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe("2026-10-02");
    expect(days[6]?.date).toBe("2026-10-08");
    expect(days[5]).toMatchObject({ date: "2026-10-07", total: 0, good: 0 });
  });

  it("sums per day and per category and ignores rows outside the range", () => {
    const days = buildDays(rows, 7, today);
    expect(days[6]).toMatchObject({ total: 10, good: 6 });
    expect(days[6]?.byCategory.get("a")).toBe(6);
    expect(days[6]?.byCategory.get("b")).toBe(4);
    expect(days.reduce((s, d) => s + d.total, 0)).toBe(13);
  });
});

describe("moodFor", () => {
  it("gives no face to a day without reviews", () => {
    expect(moodFor(0, 0)).toBeNull();
  });

  it("goes from frown to smile with the share of Good and Easy", () => {
    expect(moodFor(10, 2)).toBe("low");
    expect(moodFor(10, 5)).toBe("mid");
    expect(moodFor(10, 8)).toBe("high");
    expect(moodFor(4, 3)).toBe("high");
  });
});

describe("heatmap", () => {
  it("scales the level to the busiest day", () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(1, 10)).toBe(1);
    expect(heatLevel(5, 10)).toBe(2);
    expect(heatLevel(7, 10)).toBe(3);
    expect(heatLevel(10, 10)).toBe(4);
    expect(heatLevel(3, 0)).toBe(0);
  });

  it("lays out whole weeks, Monday first, ending in the current week", () => {
    const weeks = heatmapWeeks(buildDays(rows, 90, today), 12, today);
    expect(weeks).toHaveLength(12);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const last = weeks[11]!;
    expect(last[0]?.date).toBe("2026-10-05"); // Monday of this week
    expect(last[3]).toMatchObject({ date: "2026-10-08", count: 10, level: 4, future: false });
    expect(last[4]?.future).toBe(true); // Friday has not happened yet
  });

  it("tints with the category that was studied most", () => {
    expect(topCategory(buildDays(rows, 7, today))).toBe("a");
    expect(topCategory(buildDays([], 7, today))).toBeNull();
  });
});

describe("forecast and accuracy", () => {
  it("fills days without due cards with zero", () => {
    const f = fillForecast([{ day: "2026-10-08", due: 4 }, { day: "2026-10-10", due: 2 }], 7, today);
    expect(f.map((d) => d.due)).toEqual([4, 0, 2, 0, 0, 0, 0]);
    expect(f[0]?.date).toBe("2026-10-08");
  });

  it("is the share of Good and Easy, or null without reviews", () => {
    expect(accuracy({ reviews_30: 8, good_30: 6 })).toBe(75);
    expect(accuracy({ reviews_30: 0, good_30: 0 })).toBeNull();
  });
});
