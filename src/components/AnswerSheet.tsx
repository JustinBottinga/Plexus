import { Frown, Laugh, Meh, Smile } from "lucide-react";
import { formatInterval, RATINGS, type Rating } from "@/lib/srs";
import type { Card } from "@/lib/data";
import type { ColorKey } from "@/lib/palette";
import { cn } from "@/lib/utils";

export const RATING_META: Record<Rating, { label: string; icon: typeof Frown; deepShare: number }> = {
  again: { label: "Opnieuw", icon: Frown, deepShare: 100 },
  hard: { label: "Moeilijk", icon: Meh, deepShare: 70 },
  good: { label: "Goed", icon: Smile, deepShare: 40 },
  easy: { label: "Makkelijk", icon: Laugh, deepShare: 15 },
};

/** A tint of the category color: Again is the deepest, Easy the lightest. */
export const ratingTint = (color: ColorKey, rating: Rating) =>
  `color-mix(in oklab, var(--${color}-deep) ${RATING_META[rating].deepShare}%, var(--${color}))`;

const NOTES = [
  ["origin", "Origo"],
  ["insertion", "Insertie"],
  ["innervation", "Innervatie"],
  ["function", "Functie"],
] as const;

export function AnswerSheet({
  card,
  color,
  verdict,
  suggested,
  intervals,
  onRate,
}: {
  card: Card;
  color: ColorKey;
  verdict: "right" | "wrong" | null;
  suggested: Rating | null;
  intervals: Record<Rating, number>;
  onRate: (r: Rating) => void;
}) {
  const attribution = [card.image_source, card.image_author, card.image_license].filter(Boolean);
  const notes = NOTES.filter(([k]) => card[k]);

  return (
    <section
      aria-live="polite"
      className="mx-auto w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 rounded-t-[32px] bg-card px-5 pb-6 pt-3 text-card-foreground shadow-[0_-14px_40px_-22px_rgba(0,0,0,0.45)] duration-300"
    >
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
      <div className="max-h-[26svh] overflow-y-auto pr-1">
        {verdict && (
          <p className={cn("mb-1 text-sm font-semibold", verdict === "right" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
            {verdict === "right" ? "Je had het gevonden!" : "Net niet. Kijk naar de markering."}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold leading-tight">{card.name_nl}</h2>
        {card.name_latin && <p className="italic text-muted-foreground">{card.name_latin}</p>}
        {notes.length > 0 && (
          <dl className="mt-3 space-y-1.5 text-sm">
            {notes.map(([k, label]) => (
              <div key={k}>
                <dt className="inline font-semibold">{label}: </dt>
                <dd className="inline whitespace-pre-line">{card[k]}</dd>
              </div>
            ))}
          </dl>
        )}
        {attribution.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Afbeelding: {attribution.join(" · ")}</p>}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {RATINGS.map((r, i) => {
          const { label, icon: Icon } = RATING_META[r];
          return (
            <div key={r}>
              <button
                type="button"
                onClick={() => onRate(r)}
                aria-keyshortcuts={String(i + 1)}
                style={{ backgroundColor: ratingTint(color, r) }}
                className={cn(
                  "flex h-12 w-full items-center justify-center gap-1 rounded-full px-1 text-xs font-semibold sm:gap-1.5 sm:text-sm text-on-pastel transition-transform active:scale-95",
                  suggested === r && "pop ring-2 ring-foreground ring-offset-2 ring-offset-card",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
              <p className="mt-1.5 text-center text-xs tabular-nums text-muted-foreground">{formatInterval(intervals[r])}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
