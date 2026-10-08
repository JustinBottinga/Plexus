import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { categoriesQuery, profileQuery, studyDataQuery } from "@/lib/data";
import { colorOf } from "@/lib/palette";
import { summarize } from "@/lib/queue";
import {
  accuracy,
  buildDays,
  fillForecast,
  HISTORY_DAYS,
  progressQuery,
  topCategory,
  type CategoryStat,
} from "@/lib/progress";
import { todayLocal } from "@/lib/srs";
import { loadSettings, sessionSearch } from "@/lib/studySettings";
import { CategoryLegend, ForecastBars, Heatmap, ReviewsChart } from "@/components/ProgressCharts";
import { EmptyState } from "@/components/EmptyState";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Voortgang — Plexus" }, { name: "description", content: "Je streak, reviews en zwakste kaarten." }] }),
  component: ProgressPage,
});

const RANGES = [7, 30, 90] as const;
const CELEBRATED_KEY = "goal-celebrated-on";

const number = new Intl.NumberFormat("nl-NL");
const plural = (n: number, one: string, many: string) => `${number.format(n)} ${n === 1 ? one : many}`;

/** The boxes you see while the numbers load, in the same rounded shapes as the tiles. */
function Skeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Voortgang wordt geladen">
      <div className="tile h-52 animate-pulse bg-muted" />
      <div className="tile h-80 animate-pulse bg-muted" />
      <div className="tile h-56 animate-pulse bg-muted" />
      <div className="tile h-48 animate-pulse bg-muted" />
    </div>
  );
}

function Tile({ title, hint, className, children }: { title: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("tile border bg-card p-5 text-card-foreground", className)} aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProgressPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery(progressQuery);
  const { data: cats } = useQuery(categoriesQuery);
  const { data: study } = useQuery(studyDataQuery);
  const { data: me } = useQuery(profileQuery);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const settings = loadSettings();
  const today = todayLocal();

  const days = useMemo(() => buildDays(data?.daily ?? [], HISTORY_DAYS, today), [data, today]);
  const categories = useMemo(() => (cats ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color })), [cats]);
  const shown = days.slice(-range);
  const top = topCategory(days.slice(-84));
  const goal = me?.profile?.daily_goal ?? 20;
  const reviewedToday = data?.streak.reviewed_today ?? 0;
  const reached = reviewedToday >= goal;
  const due = study ? summarize(study, settings.directions, today).due : 0;

  // The goal celebration plays once per day, the first time the screen shows the goal as reached
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (!data || !reached) return;
    try {
      if (localStorage.getItem(CELEBRATED_KEY) === today) return;
      localStorage.setItem(CELEBRATED_KEY, today);
    } catch {
      /* storage unavailable: the celebration just plays again next time */
    }
    setCelebrate(true);
  }, [data, reached, today]);

  const statOf = (id: string): CategoryStat | undefined => data?.categories.find((s) => s.category_id === id);
  const weak = data?.weakest ?? [];
  const noReviewsYet = !!data && data.streak.total_reviews === 0;

  return (
    <div className="px-5 pb-6 pt-8">
      <button
        type="button"
        onClick={() => history.back()}
        aria-label="Terug"
        className="flex size-12 items-center justify-center rounded-full border bg-card"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h1 className="mt-5 text-4xl font-semibold">Voortgang</h1>

      <div className="mt-6 grid gap-3">
        {isLoading && <Skeleton />}

        {isError && (
          <EmptyState
            drawing="cards"
            color="bg-peach"
            title="Voortgang laden mislukt"
            text="Controleer je verbinding en probeer het opnieuw."
            action={<Button size="lg" onClick={() => refetch()}>Opnieuw proberen</Button>}
          />
        )}

        {noReviewsYet && (
          <EmptyState
            drawing="check"
            color="bg-butter"
            title="Nog niets geoefend"
            text="Na je eerste sessie zie je hier je reeks, je reviews en welke kaarten extra aandacht nodig hebben."
            action={
              <Button asChild size="lg">
                <Link to="/study">Start je eerste sessie</Link>
              </Button>
            }
          />
        )}

        {data && !noReviewsYet && (
          <>
            <section aria-label="Vandaag" className="tile relative flex flex-col gap-5 bg-butter p-6 text-on-pastel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Vandaag</h2>
                  <p className="mt-3 font-display text-5xl font-semibold tabular-nums leading-none">{reviewedToday}</p>
                  <p className="mt-1 text-sm text-on-pastel-muted">{reviewedToday === 1 ? "kaart" : "kaarten"} gedaan · doel {goal}</p>
                </div>
                <div className={cn(celebrate && "pop")}>
                  <ProgressRing size={84} stroke={8} value={reviewedToday / goal} label={`${reviewedToday} van je doel van ${goal} gehaald`} className="text-on-pastel">
                    {reached ? <Check className="size-7" strokeWidth={3} /> : <span className="text-base">{Math.round((reviewedToday / goal) * 100)}%</span>}
                  </ProgressRing>
                </div>
              </div>
              {reached && <p className="-mt-1 text-sm font-semibold">Doel gehaald voor vandaag.</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  {study ? (due > 0 ? `${plural(due, "kaart", "kaarten")} aan de beurt` : "Helemaal bij") : " "}
                </p>
                {due > 0 && (
                  <Button size="lg" onClick={() => navigate({ to: "/study/session", search: sessionSearch(settings) })}>
                    Nu leren
                  </Button>
                )}
              </div>
              <p className="border-t border-on-pastel/15 pt-4 text-sm">
                Reeks <strong className="font-display text-base">{plural(data.streak.current_streak, "dag", "dagen")}</strong> · langste{" "}
                <strong className="font-display text-base">{plural(data.streak.longest_streak, "dag", "dagen")}</strong>
              </p>
            </section>

            <Tile title="Reviews">
              <div role="radiogroup" aria-label="Periode" className="grid grid-cols-3 gap-1 rounded-full border p-1">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={range === r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-full text-sm font-semibold",
                      range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {r} dagen
                  </button>
                ))}
              </div>
              <div className="mt-8">
                <ReviewsChart days={shown} categories={categories} showMood={range === 7} />
              </div>
              <CategoryLegend categories={categories.filter((c) => shown.some((d) => d.byCategory.has(c.id)))} indexOf={(id) => categories.findIndex((c) => c.id === id)} />
              {range === 7 && (
                <p className="mt-3 text-xs text-muted-foreground">Het gezichtje boven een balk laat zien hoeveel van die dag goed ging.</p>
              )}
            </Tile>

            <Tile title="Kalender" hint="laatste 12 weken">
              <Heatmap days={days.slice(-84)} tint={categories.find((c) => c.id === top)?.color ?? "butter"} today={today} />
            </Tile>

            <Tile title="Vooruitblik" hint="komende 7 dagen">
              <ForecastBars days={fillForecast(data.forecast, 7, today)} />
            </Tile>

            <div className="grid gap-3">
              {categories.map((c) => {
                const s = statOf(c.id);
                if (!s) return null;
                const acc = accuracy(s);
                const learnedShare = (n: number) => (s.total > 0 ? (n / s.total) * 100 : 0);
                return (
                  <section key={c.id} aria-label={c.name} className={cn("tile p-5 text-on-pastel", colorOf(c.color).bg)}>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-xl font-semibold leading-tight">{c.name}</h2>
                      <span className="shrink-0 rounded-full bg-pastel-surface/60 px-3 py-1.5 text-xs font-semibold">
                        {plural(s.total, "kaart", "kaarten")}
                      </span>
                    </div>
                    <div role="img" aria-label={`${s.new_cards} nieuw, ${s.learning} bezig, ${s.mature} gevestigd`} className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-pastel-surface/50">
                      <span className="bg-on-pastel/25" style={{ width: `${learnedShare(s.new_cards)}%` }} />
                      <span className="bg-on-pastel/55" style={{ width: `${learnedShare(s.learning)}%` }} />
                      <span className="bg-on-pastel" style={{ width: `${learnedShare(s.mature)}%` }} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="flex items-center gap-1.5 text-on-pastel-muted"><span aria-hidden="true" className="size-2.5 rounded-full bg-on-pastel/25 ring-1 ring-on-pastel/40" />Nieuw</dt>
                        <dd className="font-display text-lg font-semibold tabular-nums">{s.new_cards}</dd>
                      </div>
                      <div>
                        <dt className="flex items-center gap-1.5 text-on-pastel-muted"><span aria-hidden="true" className="size-2.5 rounded-full bg-on-pastel/55" />Bezig</dt>
                        <dd className="font-display text-lg font-semibold tabular-nums">{s.learning}</dd>
                      </div>
                      <div>
                        <dt className="flex items-center gap-1.5 text-on-pastel-muted"><span aria-hidden="true" className="size-2.5 rounded-full bg-on-pastel" />Gevestigd</dt>
                        <dd className="font-display text-lg font-semibold tabular-nums">{s.mature}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-sm">
                      {acc === null ? "Nog geen reviews in de laatste 30 dagen" : <>Goed of makkelijk: <strong className="font-display text-base">{acc}%</strong> <span className="text-on-pastel-muted">· laatste 30 dagen</span></>}
                    </p>
                  </section>
                );
              })}
            </div>

            <Tile title="Zwakste kaarten" hint="laatste 30 dagen">
              {weak.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen kaarten die vaak fout gingen. Goed bezig.</p>
              ) : (
                <>
                  <ol className="divide-y">
                    {weak.map((w) => (
                      <li key={w.card_id}>
                        <Link to="/cards/$id" params={{ id: w.card_id }} className="flex min-h-12 items-center justify-between gap-3 py-2">
                          <span className="truncate font-semibold">{w.name_nl}</span>
                          <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold tabular-nums">
                            {w.again_count}× opnieuw
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                  <Button
                    size="lg"
                    className="mt-4 w-full"
                    onClick={() => navigate({ to: "/study/session", search: { ...sessionSearch(settings), cards: weak.map((w) => w.card_id).join(",") } })}
                  >
                    Leer deze kaarten
                  </Button>
                </>
              )}
            </Tile>

            <Tile title="Totaal">
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Reviews</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums">{number.format(data.streak.total_reviews)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Kaarten</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums">{number.format(data.cardCount)}</dd>
                </div>
              </dl>
            </Tile>
          </>
        )}
      </div>
    </div>
  );
}
