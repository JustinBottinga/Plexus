import { useRef, useState, type CSSProperties } from "react";
import { Frown, Meh, Smile } from "lucide-react";
import { colorOf } from "@/lib/palette";
import { heatmapWeeks, moodFor, type DaySummary, type Mood } from "@/lib/progress";
import { cn } from "@/lib/utils";

export type CategoryInfo = { id: string; name: string; color: string };

/** A second cue next to the color, so the chart also reads without telling the colors apart. */
const PATTERNS: { image: string; size?: string }[] = [
  { image: "none" },
  { image: "repeating-linear-gradient(45deg, rgb(0 0 0 / 0.32) 0 2px, transparent 2px 6px)" },
  { image: "radial-gradient(circle, rgb(0 0 0 / 0.4) 1.3px, transparent 1.7px)", size: "6px 6px" },
  { image: "repeating-linear-gradient(0deg, rgb(0 0 0 / 0.32) 0 2px, transparent 2px 6px)" },
  { image: "repeating-linear-gradient(-45deg, rgb(0 0 0 / 0.32) 0 2px, transparent 2px 6px)" },
  { image: "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.32) 0 2px, transparent 2px 6px)" },
];

export function categoryFill(cat: CategoryInfo | undefined, index: number): CSSProperties {
  const key = colorOf(cat?.color).key;
  const pattern = PATTERNS[index % PATTERNS.length]!;
  return {
    backgroundColor: `var(--${key}-deep)`,
    backgroundImage: pattern.image,
    ...(pattern.size ? { backgroundSize: pattern.size } : {}),
  };
}

const dateFormat = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const parse = (date: string) => {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
export const longDate = (date: string) => dateFormat.format(parse(date));
const shortDay = (date: string) => parse(date).toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", "");

const MOODS: Record<Mood, { icon: typeof Smile; label: string }> = {
  low: { icon: Frown, label: "Veel fout" },
  mid: { icon: Meh, label: "Wisselend" },
  high: { icon: Smile, label: "Goed gegaan" },
};

export function CategoryLegend({ categories, indexOf }: { categories: CategoryInfo[]; indexOf: (id: string) => number }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {categories.map((c) => (
        <li key={c.id} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[5px] border border-foreground/20" style={categoryFill(c, indexOf(c.id))} />
          {c.name}
        </li>
      ))}
    </ul>
  );
}

/** Stacked bars per day, one segment per category. Tap or drag across the chart to read a day. */
export function ReviewsChart({ days, categories, showMood }: { days: DaySummary[]; categories: CategoryInfo[]; showMood: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...days.map((d) => d.total));
  const dense = days.length > 40;

  function pick(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const i = Math.floor(((clientX - r.left) / r.width) * days.length);
    setPicked(Math.min(days.length - 1, Math.max(0, i)));
  }

  const sel = picked !== null && picked < days.length ? days[picked]! : null;
  const labelEvery = days.length <= 7 ? 1 : days.length <= 30 ? 7 : 15;

  return (
    <div>
      <div className="relative">
        {sel && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-44 rounded-2xl bg-ink px-3 py-2 text-xs text-ink-foreground shadow-lg"
            style={{ left: `clamp(5.5rem, ${((picked! + 0.5) / days.length) * 100}%, calc(100% - 5.5rem))`, top: -4, transform: "translate(-50%, -100%)" }}
          >
            <p className="font-semibold">{longDate(sel.date)}</p>
            {sel.total === 0 ? (
              <p className="opacity-80">Niet geoefend</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {categories
                  .filter((c) => sel.byCategory.get(c.id))
                  .map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span className="truncate">{c.name}</span>
                      <span className="tabular-nums">{sel.byCategory.get(c.id)}</span>
                    </li>
                  ))}
                <li className="flex justify-between gap-2 border-t border-ink-foreground/20 pt-0.5 font-semibold">
                  <span>Totaal</span>
                  <span className="tabular-nums">{sel.total}</span>
                </li>
              </ul>
            )}
          </div>
        )}
        <div
          ref={ref}
          role="img"
          aria-label={`Reviews per dag over de laatste ${days.length} dagen, ${days.reduce((s, d) => s + d.total, 0)} in totaal`}
          className="flex h-52 touch-pan-y select-none items-end gap-px"
          onPointerDown={(e) => pick(e.clientX)}
          onPointerMove={(e) => e.buttons === 1 && pick(e.clientX)}
          onPointerLeave={() => setPicked(null)}
        >
          {days.map((d, i) => {
            const mood = showMood ? moodFor(d.total, d.good) : null;
            const Face = mood ? MOODS[mood].icon : null;
            return (
              <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5">
                {showMood && (
                  <span className="flex h-6 justify-center" aria-hidden={!mood}>
                    {Face && mood && <Face className="size-5 text-muted-foreground" aria-label={MOODS[mood].label} />}
                  </span>
                )}
                <div
                  className={cn("flex flex-col-reverse overflow-hidden", dense ? "rounded-[2px]" : "rounded-t-xl", picked === i && "outline outline-2 outline-offset-1 outline-foreground")}
                  style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total > 0 ? 4 : 0 }}
                >
                  {categories.map((c, ci) => {
                    const n = d.byCategory.get(c.id) ?? 0;
                    return n > 0 ? <div key={c.id} style={{ ...categoryFill(c, ci), flexGrow: n, flexBasis: 0 }} /> : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex gap-px text-[11px] text-muted-foreground" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.date} className="min-w-0 flex-1 text-center">
            {(days.length - 1 - i) % labelEvery === 0 ? (days.length <= 7 ? shortDay(d.date) : parse(d.date).getDate()) : ""}
          </span>
        ))}
      </div>
      <details className="sr-only">
        <summary>Tabel met reviews per dag</summary>
        <table>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td>{longDate(d.date)}</td>
                <td>{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

const HEAT_STRENGTH = [0, 28, 50, 75, 100];

/** The last weeks as a calendar: one square per day, darker means more reviews. */
export function Heatmap({ days, tint, today }: { days: DaySummary[]; tint: string; today: string }) {
  const weeks = heatmapWeeks(days, 12, today);
  const [picked, setPicked] = useState<string | null>(null);
  const cell = weeks.flat().find((c) => c.date === picked);
  const key = colorOf(tint).key;

  return (
    <div>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-1 pt-0 text-[10px] text-muted-foreground" aria-hidden="true">
          {["Ma", "", "Wo", "", "Vr", "", "Zo"].map((l, i) => (
            <span key={i} className="flex items-center">{l}</span>
          ))}
        </div>
        <div role="img" aria-label="Kalender van de laatste 12 weken" className="grid flex-1 grid-flow-col grid-rows-7 gap-1">
          {weeks.flat().map((c) => (
            <button
              key={c.date}
              type="button"
              disabled={c.future}
              onClick={() => setPicked(picked === c.date ? null : c.date)}
              aria-label={`${longDate(c.date)}: ${c.count} reviews`}
              className={cn(
                "aspect-square w-full rounded-[6px] transition-none",
                c.future ? "border border-dashed border-muted-foreground/25" : c.level === 0 ? "bg-muted" : "",
                picked === c.date && "outline outline-2 outline-offset-1 outline-foreground",
              )}
              style={
                c.level > 0 ? { backgroundColor: `color-mix(in oklab, var(--${key}-deep) ${HEAT_STRENGTH[c.level]}%, var(--card))` } : undefined
              }
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{cell ? `${longDate(cell.date)}: ${cell.count} ${cell.count === 1 ? "review" : "reviews"}` : "Tik op een dag voor het aantal"}</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          minder
          {HEAT_STRENGTH.map((s, i) => (
            <span
              key={i}
              className={cn("size-3 rounded-[4px]", i === 0 && "bg-muted")}
              style={i > 0 ? { backgroundColor: `color-mix(in oklab, var(--${key}-deep) ${s}%, var(--card))` } : undefined}
            />
          ))}
          meer
        </span>
      </div>
    </div>
  );
}

/** Cards that come due over the next days, with the count written above each bar. */
export function ForecastBars({ days }: { days: { date: string; due: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.due));
  return (
    <ol className="flex h-36 items-end gap-2" aria-label="Kaarten die aan de beurt komen">
      {days.map((d, i) => (
        <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold tabular-nums">{d.due}</span>
          <span
            className="w-full rounded-t-xl bg-foreground/80"
            style={{ height: `${(d.due / max) * 100}%`, minHeight: d.due > 0 ? 6 : 2, opacity: d.due > 0 ? 1 : 0.25 }}
          />
          <span className="text-[11px] text-muted-foreground">{i === 0 ? "Nu" : shortDay(d.date)}</span>
        </li>
      ))}
    </ol>
  );
}
