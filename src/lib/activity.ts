import { addDays, todayLocal } from "@/lib/srs";

/** Local calendar dates (YYYY-MM-DD) on which at least one card was rated. */
export function activeDays(timestamps: string[]): Set<string> {
  return new Set(timestamps.map((t) => todayLocal(new Date(t))));
}

/** Consecutive days with practice, counting back from today. A streak is still alive if you practised yesterday. */
export function currentStreak(days: Set<string>, today: string): number {
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export type WeekDay = { date: string; label: string; active: boolean; isToday: boolean; isFuture: boolean };

const LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

/** The current week, Monday first. */
export function weekStrip(days: Set<string>, today: string): WeekDay[] {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);
  return LABELS.map((label, i) => {
    const date = addDays(monday, i);
    return { date, label, active: days.has(date), isToday: date === today, isFuture: date > today };
  });
}
