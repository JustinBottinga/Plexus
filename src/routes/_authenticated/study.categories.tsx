import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { z } from "zod";
import { studyDataQuery } from "@/lib/data";
import { colorOf } from "@/lib/palette";
import { buildQueue } from "@/lib/queue";
import { todayLocal } from "@/lib/srs";
import { loadSettings, saveSettings, sessionSearch } from "@/lib/studySettings";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/study/categories")({
  // one: tapping a category starts at once. multi: tick several, then start.
  validateSearch: z.object({
    mode: z.enum(["one", "multi"]).catch("multi"),
    practice: z.coerce.number().int().min(0).max(1).catch(0),
  }),
  head: () => ({
    meta: [{ title: "Categorieën kiezen — Plexus" }, { name: "description", content: "Kies de categorieën om te leren." }],
  }),
  component: ChooseCategories,
});

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function ChooseCategories() {
  const { mode, practice: practiceFlag } = Route.useSearch();
  const practice = practiceFlag === 1;
  const navigate = useNavigate();
  const { data } = useQuery(studyDataQuery);
  const settings = loadSettings();
  const today = todayLocal();
  const [picked, setPicked] = useState<string[] | null>(null);
  // The bounce only plays for a tick made on this screen, not for the choice restored on arrival
  const [touched, setTouched] = useState(false);

  // Cards a session would contain per category, with the settings from the profile
  const perCategory = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    for (const c of data.categories) {
      map.set(
        c.id,
        buildQueue({
          cards: data.cards,
          reviews: data.reviews,
          categoryIds: [c.id],
          directions: settings.directions,
          newLimit: settings.newLimit,
          practice,
          today,
        }).length,
      );
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, practice]);

  const cats = data?.categories ?? [];
  // Starts from the last choice, but only with categories that still have something to do
  const selected =
    picked ?? settings.categories.filter((id) => cats.some((c) => c.id === id) && (perCategory.get(id) ?? 0) > 0);
  const total = selected.reduce((sum, id) => sum + (perCategory.get(id) ?? 0), 0);

  function start(ids: string[]) {
    saveSettings({ ...settings, categories: ids });
    navigate({ to: "/study/session", search: sessionSearch(settings, ids, practice) });
  }

  function toggle(id: string) {
    setTouched(true);
    setPicked(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="px-5 pb-6 pt-8">
      <Link to="/study" aria-label="Terug naar leren" className="flex size-12 items-center justify-center rounded-full border bg-card">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="mt-5 text-4xl font-semibold">{mode === "one" ? "Kies een categorie" : "Kies categorieën"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "one" ? "Tik op een categorie om te beginnen." : "Vink er een of meer aan en start daarna."}
        {practice && " Je oefent opnieuw, zonder je planning te veranderen."}
      </p>

      <div className="mt-6 grid gap-3">
        {!data && [0, 1, 2].map((i) => <div key={i} className="tile h-28 animate-pulse bg-muted" />)}
        {cats.map((c) => {
          const n = perCategory.get(c.id) ?? 0;
          const on = selected.includes(c.id);
          const enabled = n > 0;
          const empty = !data?.cards.some((k) => k.category_id === c.id);
          return (
            <button
              key={c.id}
              type="button"
              role={mode === "multi" ? "checkbox" : undefined}
              aria-checked={mode === "multi" ? on : undefined}
              disabled={!enabled}
              onClick={() => (mode === "one" ? start([c.id]) : toggle(c.id))}
              className={cn(
                "tile flex min-h-28 items-center gap-4 p-5 text-left text-on-pastel disabled:cursor-not-allowed disabled:opacity-60",
                colorOf(c.color).bg,
                on && cn(touched && "pop", "ring-[3px] ring-foreground ring-offset-2 ring-offset-background"),
              )}
            >
              <span className="flex-1">
                <span className="block font-display text-xl font-semibold leading-tight">{c.name}</span>
                <span
                  className={cn(
                    "mt-2 inline-block rounded-full px-3 py-1.5 text-xs font-semibold",
                    enabled ? "bg-ink text-ink-foreground" : "bg-pastel-surface/60",
                  )}
                >
                  {enabled ? count(n, "kaart", "kaarten") : empty ? "Geen kaarten" : "Helemaal bij"}
                </span>
              </span>
              {mode === "multi" && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-on-pastel/40",
                    on && "border-ink bg-ink text-ink-foreground",
                  )}
                >
                  {on && <Check className="size-4" strokeWidth={3} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {data && cats.length === 0 && (
        <EmptyState drawing="folder" color="bg-butter" title="Nog geen categorieën" text="Maak eerst een categorie met kaarten." />
      )}

      {mode === "multi" && cats.length > 0 && (
        <div className="sticky bottom-24 z-30 mt-6">
          <Button size="lg" className="w-full shadow-lg" disabled={selected.length === 0 || total === 0} onClick={() => start(selected)}>
            {selected.length === 0
              ? "Kies minstens één categorie"
              : `Start · ${count(selected.length, "categorie", "categorieën")} · ${count(total, "kaart", "kaarten")}`}
          </Button>
        </div>
      )}
    </div>
  );
}
