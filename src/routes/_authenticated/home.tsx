import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, List, Play, Plus, Search } from "lucide-react";
import { categoriesQuery, profileQuery, studyDataQuery } from "@/lib/data";
import { summarize } from "@/lib/queue";
import { todayLocal } from "@/lib/srs";
import { loadSettings, sessionSearch } from "@/lib/studySettings";
import { colorOf } from "@/lib/palette";
import { CategoryDialog } from "@/components/CategoryDialog";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Start — Anatomie" }, { name: "description", content: "Je anatomie-flashcards." }, { property: "og:title", content: "Start — Anatomie" }, { property: "og:description", content: "Je anatomie-flashcards." }] }),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useQuery(profileQuery);
  const { data: cats, isLoading } = useQuery(categoriesQuery);
  const { data: study } = useQuery(studyDataQuery);
  const name = me?.profile?.display_name?.split(" ")[0] ?? "";
  const settings = loadSettings();
  const summary = study ? summarize(study, settings.direction, todayLocal()) : null;
  const due = summary?.due ?? 0;
  const fresh = Math.min(summary?.fresh ?? 0, settings.newLimit);
  const canStudy = due + fresh > 0;

  return (
    <div className="px-5 pt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-semibold">Hoi{name ? `, ${name}` : ""}!</h1>
        <Link to="/profile" className="flex size-12 items-center justify-center rounded-full bg-peach font-display text-lg font-semibold text-on-pastel">
          {name.charAt(0).toUpperCase()}
        </Link>
      </div>

      <label className="mt-6 flex h-12 items-center gap-3 rounded-full border bg-card px-5 text-muted-foreground">
        <Search className="size-4" />
        <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Zoeken…" disabled />
      </label>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          to={canStudy ? "/study/session" : "/study"}
          {...(canStudy ? { search: sessionSearch(settings) } : {})}
          aria-label={canStudy ? `Verder leren, ${due} kaarten te doen` : "Leren"}
          className="tile tile-lift flex min-h-48 flex-col justify-between bg-ink p-5 text-ink-foreground"
        >
          <div>
            <p className="font-display text-2xl font-semibold leading-tight">Verder leren</p>
            <p className="mt-1 text-sm opacity-80">
              {study ? (canStudy ? `${due} te doen${fresh > 0 ? ` · ${fresh} nieuw` : ""}` : "Helemaal bij") : " "}
            </p>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display text-5xl font-semibold tabular-nums">{study ? due : ""}</span>
            <span className="flex size-12 items-center justify-center rounded-full bg-butter text-on-pastel">
              <Play className="size-4 fill-current" />
            </span>
          </div>
        </Link>
        <div className="tile flex min-h-48 flex-col justify-between border bg-card p-5">
          <p className="font-display text-2xl font-semibold leading-tight">Dagelijkse reeks</p>
          <div className="flex items-end gap-2">
            <Flame className="size-8 text-peach-deep" />
            <span className="font-display text-4xl font-semibold">0</span>
            <span className="pb-1 text-xs text-muted-foreground">dagen</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Categorieën</h2>
        <CategoryDialog
          trigger={<button className="tile flex h-12 items-center gap-1 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Nieuw</button>}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {isLoading && [0, 1].map((i) => <div key={i} className="tile h-36 animate-pulse bg-muted" />)}
        {cats?.map((c, i) => {
          const n = summary?.byCategory.get(c.id);
          const dueHere = n?.due ?? 0;
          const startable = dueHere + Math.min(n?.fresh ?? 0, settings.newLimit) > 0;
          return (
            <div
              key={c.id}
              className={cn("tile tile-lift relative flex min-h-36 flex-col justify-between gap-3 p-5 text-on-pastel", colorOf(c.color).bg, i % 3 === 0 && "col-span-2")}
            >
              {/* Stretched link: the whole tile starts a session for this category */}
              <Link
                to="/study/session"
                search={sessionSearch(settings, [c.id])}
                aria-label={`Leer ${c.name}, ${dueHere} te doen`}
                className="absolute inset-0 rounded-[inherit]"
              />
              <p className="pointer-events-none pr-12 font-display text-xl font-semibold leading-tight">{c.name}</p>
              <div className="pointer-events-none flex flex-wrap gap-2">
                <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", startable ? "bg-ink text-ink-foreground" : "bg-white/60")}>
                  {dueHere} te doen
                </span>
                <span className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium">
                  {c.count} {c.count === 1 ? "kaart" : "kaarten"}
                </span>
              </div>
              <Link
                to="/categories/$id"
                params={{ id: c.id }}
                aria-label={`Open kaarten van ${c.name}`}
                className="absolute right-3 top-3 flex size-12 items-center justify-center rounded-full bg-white/60 transition-transform active:scale-90"
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
