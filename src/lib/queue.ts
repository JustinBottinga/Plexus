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
  /** Which ways of asking are switched on. Both on: every card gets one of the two. */
  directions: Direction[];
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

/** Cards that can be studied: "location" needs a marker to check the tap against. */
export function isStudyable(card: Card, directions: Direction[]): boolean {
  return directions.includes("image") || (directions.includes("location") && !!(card.marker as Box | null));
}

/** Picks the direction each card is asked in. With both on, cards that have a marker get one at random. */
export function assignDirections(cards: Card[], directions: Direction[], random: () => number = Math.random): Map<string, Direction> {
  const map = new Map<string, Direction>();
  for (const card of cards) {
    const hasMarker = !!(card.marker as Box | null);
    const options = directions.filter((d) => d === "image" || hasMarker);
    map.set(card.id, options[Math.floor(random() * options.length)] ?? "image");
  }
  return map;
}

/** Due cards (overdue first, shuffled within the same due date) and new cards (shuffled, unlimited). */
export function splitCards({ cards, reviews, categoryIds, directions, today }: Opts, random = Math.random) {
  const wanted = categoryIds ? new Set(categoryIds) : null;
  const reviewByCard = new Map(reviews.map((r) => [r.card_id, r]));
  const pool = cards.filter((c) => (!wanted || wanted.has(c.category_id)) && isStudyable(c, directions));

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

/** Every studyable card in the selected categories, shuffled: for re-practising what is not due yet. */
export function buildPracticeQueue(
  { cards, categoryIds, directions }: Pick<Opts, "cards" | "categoryIds" | "directions">,
  random = Math.random,
): Card[] {
  const wanted = categoryIds ? new Set(categoryIds) : null;
  return shuffle(
    cards.filter((c) => (!wanted || wanted.has(c.category_id)) && isStudyable(c, directions)),
    random,
  );
}

export function buildQueue(
  opts: Opts & { newLimit: number; practice?: boolean; /** Study exactly these cards, due or not */ onlyCardIds?: string[] | null },
  random = Math.random,
): Card[] {
  if (opts.onlyCardIds?.length) {
    const wanted = new Set(opts.onlyCardIds);
    return shuffle(
      opts.cards.filter((c) => wanted.has(c.id) && isStudyable(c, opts.directions)),
      random,
    );
  }
  if (opts.practice) return buildPracticeQueue(opts, random);
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
  directions: Direction[],
  today: string,
): DueSummary {
  const { due, fresh } = splitCards({ ...data, categoryIds: null, directions, today });
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
