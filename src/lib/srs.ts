export type Rating = "again" | "hard" | "good" | "easy";
export type Direction = "image" | "location";

export const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

export type SrsState = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

export const INITIAL_STATE: SrsState = { ease_factor: 2.5, interval_days: 0, repetitions: 0 };

const MIN_EASE = 1.3;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** SM-2 style scheduling, see the phase 2 spec. Pure: returns the new state, never mutates. */
export function nextState(s: SrsState, rating: Rating): SrsState {
  const { ease_factor: ease, interval_days: interval, repetitions: reps } = s;
  switch (rating) {
    case "again":
      return { repetitions: 0, interval_days: 1, ease_factor: round2(Math.max(MIN_EASE, ease - 0.2)) };
    case "hard":
      return {
        repetitions: reps + 1,
        interval_days: Math.max(1, Math.round(interval * 1.2)),
        ease_factor: round2(Math.max(MIN_EASE, ease - 0.15)),
      };
    case "good":
      return {
        repetitions: reps + 1,
        interval_days: reps === 0 ? 1 : reps === 1 ? 3 : Math.max(1, Math.round(interval * ease)),
        ease_factor: ease,
      };
    case "easy":
      return {
        repetitions: reps + 1,
        interval_days: reps === 0 ? 3 : Math.max(1, Math.round(interval * ease * 1.3)),
        ease_factor: round2(ease + 0.15),
      };
  }
}

/** The interval each rating would give, for the labels under the rating pills. */
export function previewIntervals(s: SrsState): Record<Rating, number> {
  return {
    again: nextState(s, "again").interval_days,
    hard: nextState(s, "hard").interval_days,
    good: nextState(s, "good").interval_days,
    easy: nextState(s, "easy").interval_days,
  };
}

export function formatInterval(days: number): string {
  if (days < 60) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mnd`;
  return `${Math.round((days / 365) * 10) / 10}j`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The user's local calendar date as YYYY-MM-DD (not UTC). */
export function todayLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Add whole days to a YYYY-MM-DD date using local calendar arithmetic (DST safe). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return todayLocal(new Date(y, m - 1, d + days));
}
