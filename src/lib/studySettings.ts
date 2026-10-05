import type { Direction } from "@/lib/srs";

export type StudyMode = "all" | "one" | "multi";
export type StudySettings = {
  mode: StudyMode;
  categories: string[];
  direction: Direction;
  newLimit: number;
};

const KEY = "study-settings";
export const DEFAULT_SETTINGS: StudySettings = { mode: "all", categories: [], direction: "image", newLimit: 10 };

export function loadSettings(): StudySettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<StudySettings> | null;
    if (!raw) return DEFAULT_SETTINGS;
    return {
      mode: raw.mode === "one" || raw.mode === "multi" ? raw.mode : "all",
      categories: Array.isArray(raw.categories) ? raw.categories.filter((c) => typeof c === "string") : [],
      direction: raw.direction === "location" ? "location" : "image",
      newLimit:
        typeof raw.newLimit === "number" && raw.newLimit >= 0 && raw.newLimit <= 30
          ? Math.round(raw.newLimit)
          : DEFAULT_SETTINGS.newLimit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: StudySettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: settings just won't be remembered */
  }
}

/** Search params for /study/session. `cats` is omitted for "all categories". */
export function sessionSearch(s: Pick<StudySettings, "direction" | "newLimit">, categoryIds?: string[] | null) {
  return {
    dir: s.direction,
    new: s.newLimit,
    ...(categoryIds && categoryIds.length ? { cats: categoryIds.join(",") } : {}),
  };
}
