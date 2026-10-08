import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { activeDays, currentStreak } from "@/lib/activity";
import { addDays, todayLocal } from "@/lib/srs";

export type DayRow = { day: string; category_id: string; reviews: number; good: number };
export type StreakStats = { current_streak: number; longest_streak: number; reviewed_today: number; total_reviews: number };
export type ForecastRow = { day: string; due: number };
export type CategoryStat = {
  category_id: string;
  total: number;
  new_cards: number;
  learning: number;
  mature: number;
  reviews_30: number;
  good_30: number;
};
export type WeakCard = { card_id: string; name_nl: string; category_id: string; again_count: number };

/** How many days the charts ask the database for: the longest chart range. */
export const HISTORY_DAYS = 90;
/** Interval (in days) from which a card counts as mature. */
export const MATURE_FROM_DAYS = 21;

/** The user's own time zone: the database uses it for every day boundary. */
export function userTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export type DaySummary = { date: string; total: number; good: number; byCategory: Map<string, number> };

/** One entry per day, oldest first, with empty days included. */
export function buildDays(rows: DayRow[], days: number, today: string): DaySummary[] {
  const byDate = new Map<string, DaySummary>();
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    byDate.set(date, { date, total: 0, good: 0, byCategory: new Map() });
  }
  for (const r of rows) {
    const d = byDate.get(r.day);
    if (!d) continue;
    d.total += r.reviews;
    d.good += r.good;
    d.byCategory.set(r.category_id, (d.byCategory.get(r.category_id) ?? 0) + r.reviews);
  }
  return [...byDate.values()];
}

export type Mood = "low" | "mid" | "high";

/** A face for a day from the share of Good/Easy ratings. Days without reviews get none. */
export function moodFor(total: number, good: number): Mood | null {
  if (total <= 0) return null;
  const share = good / total;
  return share >= 0.75 ? "high" : share >= 0.45 ? "mid" : "low";
}

/** 0 = nothing, 1–4 = how busy the day was compared to the busiest day. */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  const share = count / max;
  return share > 0.75 ? 4 : share > 0.5 ? 3 : share > 0.25 ? 2 : 1;
}

export type HeatCell = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

/** The last `weeks` weeks as columns of 7 days, Monday first, the current week last. */
export function heatmapWeeks(days: DaySummary[], weeks: number, today: string): HeatCell[][] {
  const counts = new Map(days.map((d) => [d.date, d.total]));
  const max = Math.max(0, ...days.map((d) => d.total));
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const sinceMonday = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const firstMonday = addDays(today, -sinceMonday - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(firstMonday, w * 7 + i);
      const count = counts.get(date) ?? 0;
      return { date, count, level: heatLevel(count, max), future: date > today };
    }),
  );
}

/** The category with the most reviews, to tint the heatmap with. */
export function topCategory(days: DaySummary[]): string | null {
  const totals = new Map<string, number>();
  for (const d of days) for (const [id, n] of d.byCategory) totals.set(id, (totals.get(id) ?? 0) + n);
  let best: string | null = null;
  let most = 0;
  for (const [id, n] of totals) {
    if (n > most) {
      best = id;
      most = n;
    }
  }
  return best;
}

/** Cards that come due, one entry per day for the next `days` days. */
export function fillForecast(rows: ForecastRow[], days: number, today: string): { date: string; due: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.due]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i);
    return { date, due: byDay.get(date) ?? 0 };
  });
}

/** Percentage of ratings that were Good or Easy; null when there were none. */
export function accuracy(stat: Pick<CategoryStat, "reviews_30" | "good_30">): number | null {
  return stat.reviews_30 > 0 ? Math.round((stat.good_30 / stat.reviews_30) * 100) : null;
}

const must = <T>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
};

/** Everything the progress screen shows. The database does the counting. */
export const progressQuery = queryOptions({
  // Starts with "cards" so a finished study session refreshes it
  queryKey: ["cards", "progress"],
  staleTime: 60_000,
  retry: 1,
  queryFn: async () => {
    const p_tz = userTimeZone();
    const [daily, streak, forecast, categories, weakest, cardCount] = await Promise.all([
      supabase.rpc("daily_review_counts", { p_days: HISTORY_DAYS, p_tz }),
      supabase.rpc("streak_stats", { p_tz }),
      supabase.rpc("due_forecast", { p_days: 7, p_tz }),
      supabase.rpc("category_stats", { p_tz }),
      supabase.rpc("weakest_cards", { p_tz, p_limit: 10 }),
      supabase.from("cards").select("id", { count: "exact", head: true }),
    ]);
    if (cardCount.error) throw new Error(cardCount.error.message);
    return {
      daily: must(daily) as DayRow[],
      streak: (must(streak)[0] ?? { current_streak: 0, longest_streak: 0, reviewed_today: 0, total_reviews: 0 }) as StreakStats,
      forecast: must(forecast) as ForecastRow[],
      categories: must(categories) as CategoryStat[],
      weakest: must(weakest) as WeakCard[],
      cardCount: cardCount.count ?? 0,
    };
  },
});

/**
 * The streak and the last 7 days for the home tile. Uses the database functions; if those are not there
 * yet it falls back to counting the last 60 days in the client, so the home screen keeps working.
 */
export const homeStreakQuery = queryOptions({
  queryKey: ["cards", "home-streak"],
  staleTime: 60_000,
  queryFn: async () => {
    const p_tz = userTimeZone();
    const [streak, daily] = await Promise.all([
      supabase.rpc("streak_stats", { p_tz }),
      supabase.rpc("daily_review_counts", { p_days: 7, p_tz }),
    ]);
    if (!streak.error && !daily.error) {
      return {
        streak: streak.data[0]?.current_streak ?? 0,
        days: new Set(daily.data.map((r) => r.day)),
        reviewedToday: streak.data[0]?.reviewed_today ?? 0,
      };
    }
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase.from("review_log").select("reviewed_at").gte("reviewed_at", since).limit(1000);
    if (error) throw new Error(error.message);
    const days = activeDays(data.map((r) => r.reviewed_at));
    const today = todayLocal();
    return { streak: currentStreak(days, today), days, reviewedToday: days.has(today) ? 1 : 0 };
  },
});
