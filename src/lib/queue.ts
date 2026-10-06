import type { Card, Box } from "@/lib/data";
import type { Direction } from "@/lib/srs";

export type ReviewRow = {
  card_id: string;
  due_date: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

type Opts = {
  cards: Card[];
  reviews: ReviewRow[];
  /** null = all categories */
  categoryIds: string[] | null;
  direction: Direction;
  today: string;
};

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Cards that can be studied in this direction: "location" needs a marker to check the tap against. */
export function isStudyable(card: Card, direction: Direction): boolean {
  return direction === "image" || !!(card.marker as Box | null);
}

/** Due cards (overdue first, shuffled within the same due date) and new cards (shuffled, unlimited). */
export function splitCards({ cards, reviews, categoryIds, direction, today }: Opts, random = Math.random) {
  const wanted = categoryIds ? new Set(categoryIds) : null;
  const reviewByCard = new Map(reviews.map((r) => [r.card_id, r]));
  const pool = cards.filter((c) => (!wanted || wanted.has(c.category_id)) && isStudyable(c, direction));

  const due: { card: Card; due_date: string }[] = [];
  const fresh: Card[] = [];
  for (const card of pool) {
    const r = reviewByCard.get(card.id);
    if (!r) fresh.push(card);
    else if (r.due_date <= today) due.push({ card, due_date: r.due_date });
  }

  // Shuffle first, then a stable sort by date: most overdue first, random order within a day.
  const dueSorted = shuffle(due, random).sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));
  return { due: dueSorted.map((d) => d.card), fresh: shuffle(fresh, random) };
}

export function buildQueue(opts: Opts & { newLimit: number }, random = Math.random): Card[] {
  const { due, fresh } = splitCards(opts, random);
  return [...due, ...fresh.slice(0, Math.max(0, opts.newLimit))];
}

export type DueSummary = {
  due: number;
  fresh: number;
  byCategory: Map<string, { due: number; fresh: number }>;
};

/** Counts for the home tiles and setup chips. */
export function summarize(
  data: { cards: Card[]; reviews: ReviewRow[] },
  direction: Direction,
  today: string,
): DueSummary {
  const { due, fresh } = splitCards({ ...data, categoryIds: null, direction, today });
  const byCategory = new Map<string, { due: number; fresh: number }>();
  const bump = (id: string, key: "due" | "fresh") => {
    const e = byCategory.get(id) ?? { due: 0, fresh: 0 };
    e[key]++;
    byCategory.set(id, e);
  };
  due.forEach((c) => bump(c.category_id, "due"));
  fresh.forEach((c) => bump(c.category_id, "fresh"));
  return { due: due.length, fresh: fresh.length, byCategory };
}

/** Is the tap inside the marker, with each side widened by 10% of the marker size (at least 2% of the image)? */
export function isHit(tap: { x: number; y: number }, m: Box): boolean {
  const tx = Math.max(2, m.w * 0.1);
  const ty = Math.max(2, m.h * 0.1);
  return tap.x >= m.x - tx && tap.x <= m.x + m.w + tx && tap.y >= m.y - ty && tap.y <= m.y + m.h + ty;
}
