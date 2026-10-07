import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Flame, List, Play, Plus } from "lucide-react";
import { activityQuery, categoriesQuery, profileQuery, studyDataQuery } from "@/lib/data";
import { activeDays, currentStreak, weekStrip } from "@/lib/activity";
import { summarize } from "@/lib/queue";
import { todayLocal } from "@/lib/srs";
import { loadSettings, sessionSearch } from "@/lib/studySettings";
import { colorOf } from "@/lib/palette";
import { CategoryDialog } from "@/components/CategoryDialog";
import { EmptyState } from "@/components/EmptyState";
import { ProgressRing } from "@/components/ProgressRing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Start — Plexus" }, { name: "description", content: "Je anatomie-flashcards." }, { property: "og:title", content: "Start — Plexus" }, { property: "og:description", content: "Je anatomie-flashcards." }] }),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useQuery(profileQuery);
  const { data: cats, isLoading } = useQuery(categoriesQuery);
  const { data: study } = useQuery(studyDataQuery);
  const { data: activity } = useQuery(activityQuery);
  const name = me?.profile?.display_name?.split(" ")[0] ?? "";
  const settings = loadSettings();
  const today = todayLocal();
  const summary = study ? summarize(study, settings.direction, today) : null;
  const due = summary?.due ?? 0;
  const fresh = Math.min(summary?.fresh ?? 0, settings.newLimit);
  const canStudy = due + fresh > 0;

  // Cards rated today count towards the ring, so it fills up while you work through the stack
  const doneToday = study
    ? study.reviews.filter((r) => r.last_reviewed && todayLocal(new Date(r.last_reviewed)) === today).length
    : 0;
  const goal = doneToday + due;
  const days = activeDays(activity ?? []);
  const streak = currentStreak(days, today);
  const week = weekStrip(days, today);

  return (
    <div className="px-5 pb-4 pt-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold leading-none">Hoi{name ? `, ${name}` : ""}!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {!study ? " " : canStudy ? "Klaar voor een rondje?" : "Alles is bij. Mooi werk."}
          </p>
        </div>
        <Link to="/profile" aria-label="Profiel" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-peach font-display text-lg font-semibold text-on-pastel">
          {name.charAt(0).toUpperCase()}
        </Link>
      </div>

      <div className="tile relative mt-6 flex min-h-56 flex-col justify-between overflow-hidden bg-butter p-6 text-on-pastel">
        <Link
          to={canStudy ? "/study/session" : "/study"}
          {...(canStudy ? { search: sessionSearch(settings) } : {})}
          aria-label={canStudy ? `Verder leren, ${due} kaarten te doen` : "Leren"}
          className="absolute inset-0 rounded-[inherit]"
        />
        <div className="pointer-events-none relative">
          <p className="font-display text-3xl font-semibold leading-tight">Verder leren</p>
          <p className="mt-1 text-sm text-on-pastel-muted">
            {study ? (canStudy ? `${due} te doen${fresh > 0 ? ` · ${fresh} nieuw` : ""}` : "Helemaal bij") : " "}
          </p>
        </div>
        <div className="pointer-events-none relative flex items-end justify-between">
          <span className="flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-ink-foreground">
            <Play className="size-4 fill-current" /> {canStudy ? "Start nu" : "Kies zelf"}
          </span>
          <ProgressRing
            size={76}
            stroke={7}
            value={goal > 0 ? doneToday / goal : study ? 1 : 0}
            label={`${doneToday} van ${goal} kaarten gedaan vandaag`}
            className="text-on-pastel"
          >
            <span className="text-base">{study ? doneToday : ""}</span>
            <span className="block pt-0.5 text-[10px] font-medium text-on-pastel-muted">{study ? `van ${goal}` : ""}</span>
          </ProgressRing>
        </div>
      </div>

      <section aria-label="Deze week" className="mt-3 rounded-[32px] border bg-card p-4">
        <div className="flex items-center justify-between px-1">
          <p className="font-display text-lg font-semibold">Deze week</p>
          <span className="flex items-center gap-1.5 rounded-full bg-peach px-3 py-1.5 text-xs font-semibold text-on-pastel">
            <Flame className="size-3.5" /> {streak} {streak === 1 ? "dag" : "dagen"} reeks
          </span>
        </div>
        <ol className="mt-3 grid grid-cols-7 gap-1">
          {week.map((d) => (
            <li key={d.date} className="flex flex-col items-center gap-1.5">
              <span className={cn("text-[11px] font-medium", d.isToday ? "text-foreground" : "text-muted-foreground")}>{d.label}</span>
              <span
                role="img"
                aria-label={`${d.label}: ${d.active ? "geoefend" : d.isFuture ? "nog te komen" : "niet geoefend"}${d.isToday ? " (vandaag)" : ""}`}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full",
                  d.active && "bg-ink text-ink-foreground",
                  !d.active && d.isToday && "border-2 border-peach-deep bg-peach/40",
                  !d.active && !d.isToday && !d.isFuture && "bg-muted",
                  d.isFuture && "border border-dashed border-muted-foreground/40",
                )}
              >
                {d.active && <Check className="size-4" strokeWidth={3} />}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Categorieën</h2>
        <CategoryDialog
          trigger={<button className="tile flex h-12 items-center gap-1 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Nieuw</button>}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {isLoading && [0, 1].map((i) => <div key={i} className="tile h-40 animate-pulse bg-muted" />)}
        {cats?.map((c, i) => {
          const n = summary?.byCategory.get(c.id);
          const dueHere = n?.due ?? 0;
          const freshHere = n?.fresh ?? 0;
          const startable = dueHere + Math.min(freshHere, settings.newLimit) > 0;
          const wide = i % 3 === 0;
          // Share of the cards that are scheduled for later: 100% means nothing is waiting
          const upToDate = c.count > 0 ? Math.max(0, c.count - dueHere - freshHere) / c.count : 0;
          return (
            <div
              key={c.id}
              className={cn(
                "tile relative flex flex-col justify-between gap-4 overflow-hidden p-5 text-on-pastel",
                colorOf(c.color).bg,
                wide ? "col-span-2 min-h-44" : "min-h-48",
              )}
            >
              {/* Stretched link: the whole tile starts a session for this category */}
              <Link
                to="/study/session"
                search={sessionSearch(settings, [c.id])}
                aria-label={`Leer ${c.name}, ${dueHere} te doen`}
                className="absolute inset-0 rounded-[inherit]"
              />
              <p className="pointer-events-none relative pr-14 font-display text-xl font-semibold leading-tight">{c.name}</p>
              <div className="pointer-events-none relative flex items-end justify-between gap-3">
                <div className="flex flex-col items-start gap-2">
                  <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", startable ? "bg-ink text-ink-foreground" : "bg-pastel-surface/60")}>
                    {dueHere} te doen
                  </span>
                  <span className="rounded-full bg-pastel-surface/60 px-3 py-1.5 text-xs font-medium">
                    {c.count} {c.count === 1 ? "kaart" : "kaarten"}
                  </span>
                </div>
                {c.count > 0 && (
                  <ProgressRing size={56} stroke={5} value={upToDate} label={`${Math.round(upToDate * 100)}% bij`}>
                    <span className="text-[11px]">{Math.round(upToDate * 100)}%</span>
                  </ProgressRing>
                )}
              </div>
              <Link
                to="/categories/$id"
                params={{ id: c.id }}
                aria-label={`Open kaarten van ${c.name}`}
                className="absolute right-3 top-3 flex size-12 items-center justify-center rounded-full bg-pastel-surface/60 transition-transform active:scale-90"
              >
                <List className="size-4" />
              </Link>
            </div>
          );
        })}
      </div>
      {cats && cats.length === 0 && (
        <EmptyState
          drawing="folder"
          color="bg-butter"
          title="Nog geen categorieën"
          text="Groepeer je kaarten per regio, zoals Bovenste extremiteit of Hoofd & hals."
          action={
            <CategoryDialog
              trigger={
                <button className="tile flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
                  <Plus className="size-4" /> Maak een categorie
                </button>
              }
            />
          }
        />
      )}
    </div>
  );
}
