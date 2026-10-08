import type { Direction } from "@/lib/srs";

export type StudySettings = {
  /** Last chosen categories, preselected on the "several categories" screen */
  categories: string[];
  /** At least one. Both on: every card is asked in one of the two ways. */
  directions: Direction[];
  /** New cards added to a session on top of the cards that are due */
  newLimit: number;
};

const KEY = "study-settings";
export const NEW_LIMITS = [0, 5, 10, 15, 20, 30] as const;
export const DEFAULT_SETTINGS: StudySettings = { categories: [], directions: ["image"], newLimit: 10 };

const isDirection = (d: unknown): d is Direction => d === "image" || d === "location";

export function loadSettings(): StudySettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as
      | (Partial<Omit<StudySettings, "directions">> & { directions?: unknown; direction?: unknown })
      | null;
    if (!raw) return DEFAULT_SETTINGS;
    // `direction` (a single value) is what earlier versions stored
    const stored = Array.isArray(raw.directions) ? raw.directions.filter(isDirection) : raw.direction === "location" ? ["location" as const] : [];
    const directions = (["image", "location"] as const).filter((d) => stored.includes(d));
    return {
      categories: Array.isArray(raw.categories) ? raw.categories.filter((c) => typeof c === "string") : [],
      directions: directions.length ? directions : DEFAULT_SETTINGS.directions,
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

/** The `dir` search param of /study/session: one direction, or "both". */
export type DirParam = "image" | "location" | "both";

export const toDirParam = (d: Direction[]): DirParam =>
  d.includes("image") && d.includes("location") ? "both" : d.includes("location") ? "location" : "image";

export const fromDirParam = (p: DirParam): Direction[] => (p === "both" ? ["image", "location"] : [p]);

/** Search params for /study/session. `cats` is omitted for "all categories". */
export function sessionSearch(
  s: Pick<StudySettings, "directions" | "newLimit">,
  categoryIds?: string[] | null,
  practice = false,
) {
  return {
    dir: toDirParam(s.directions),
    new: s.newLimit,
    ...(practice ? { practice: 1 } : {}),
    ...(categoryIds && categoryIds.length ? { cats: categoryIds.join(",") } : {}),
  };
}
