import { describe, expect, it } from "vitest";
import { buildQueue, isHit, splitCards, summarize, type ReviewRow } from "@/lib/queue";
import type { Card } from "@/lib/data";

const marker = { x: 40, y: 40, w: 20, h: 20 };
const card = (id: string, category_id: string, withMarker = true): Card =>
  ({ id, category_id, name_nl: id, marker: withMarker ? marker : null }) as unknown as Card;
const review = (card_id: string, due_date: string): ReviewRow => ({
  card_id,
  due_date,
  ease_factor: 2.5,
  interval_days: 1,
  repetitions: 1,
});

const today = "2026-10-05";
const cards = [card("a", "c1"), card("b", "c1"), card("c", "c2"), card("d", "c2", false), card("e", "c1"), card("f", "c1")];
const reviews = [review("a", "2026-10-05"), review("b", "2026-10-01"), review("c", "2026-10-06"), review("d", "2026-10-02")];
const base = { cards, reviews, categoryIds: null, directions: ["image" as const], today };

describe("session queue", () => {
  it("puts due cards first, most overdue first, then new cards", () => {
    const q = buildQueue({ ...base, newLimit: 10 }).map((c) => c.id);
    expect(q.slice(0, 3)).toEqual(["b", "d", "a"]); // 10-01, 10-02, 10-05
    expect(q.slice(3).sort()).toEqual(["e", "f"]);
    expect(q).not.toContain("c"); // due tomorrow
  });

  it("limits new cards but never due cards", () => {
    expect(buildQueue({ ...base, newLimit: 1 })).toHaveLength(4);
    expect(buildQueue({ ...base, newLimit: 0 }).map((c) => c.id)).toEqual(["b", "d", "a"]);
  });

  it("filters by category", () => {
    const q = buildQueue({ ...base, categoryIds: ["c2"], newLimit: 10 }).map((c) => c.id);
    expect(q).toEqual(["d"]);
  });

  it("skips cards without a marker in the location direction", () => {
    const q = buildQueue({ ...base, directions: ["location"], newLimit: 10 }).map((c) => c.id);
    expect(q).not.toContain("d");
  });

  it("practice mode includes cards that are not due, ignoring the new-card limit", () => {
    const q = buildQueue({ ...base, newLimit: 0, practice: true }).map((c) => c.id);
    expect(q.sort()).toEqual(["a", "b", "c", "d", "e", "f"]); // "c" is due tomorrow, e/f are new
  });

  it("practice mode still respects the category and direction", () => {
    expect(buildQueue({ ...base, categoryIds: ["c2"], newLimit: 10, practice: true }).map((c) => c.id).sort()).toEqual(["c", "d"]);
    expect(
      buildQueue({ ...base, categoryIds: ["c2"], directions: ["location"], newLimit: 10, practice: true }).map((c) => c.id),
    ).toEqual(["c"]);
  });

  it("shuffles within a group", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(splitCards(base).fresh.map((c) => c.id).join(""));
    expect(seen.size).toBe(2);
  });

  it("summarizes counts per category", () => {
    const s = summarize({ cards, reviews }, ["image"], today);
    expect(s.due).toBe(3);
    expect(s.fresh).toBe(2);
    expect(s.byCategory.get("c1")).toEqual({ due: 2, fresh: 2 });
    expect(s.byCategory.get("c2")).toEqual({ due: 1, fresh: 0 });
  });
});

describe("tap hit test", () => {
  it("accepts taps inside and within 10% of the marker", () => {
    expect(isHit({ x: 50, y: 50 }, marker)).toBe(true);
    expect(isHit({ x: 61.5, y: 50 }, marker)).toBe(true); // within 10% (2 points) of the right edge
    expect(isHit({ x: 70, y: 50 }, marker)).toBe(false);
    expect(isHit({ x: 5, y: 5 }, marker)).toBe(false);
  });

  it("stays fair for tiny markers", () => {
    expect(isHit({ x: 52, y: 50 }, { x: 50, y: 50, w: 1, h: 1 })).toBe(true);
    expect(isHit({ x: 55, y: 50 }, { x: 50, y: 50, w: 1, h: 1 })).toBe(false);
  });
});
