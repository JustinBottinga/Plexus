import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Folder, FolderPlus, Layers } from "lucide-react";
import { studyDataQuery } from "@/lib/data";
import { colorOf } from "@/lib/palette";
import { buildQueue, summarize } from "@/lib/queue";
import { todayLocal } from "@/lib/srs";
import {
  loadSettings,
  saveSettings,
  sessionSearch,
  type StudyMode,
  type StudySettings,
} from "@/lib/studySettings";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/study/")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Leren — Plexus" },
      { name: "description", content: "Start een leersessie." },
      { property: "og:title", content: "Leren — Plexus" },
      { property: "og:description", content: "Start een leersessie." },
    ],
  }),
  component: StudySetup,
});

const MODES: { key: StudyMode; title: string; text: string; icon: typeof Layers; bg: string }[] = [
  { key: "all", title: "Alles leren", text: "Alles wat aan de beurt is", icon: Layers, bg: "bg-butter" },
  {
    key: "one",
    title: "Eén categorie",
    text: "Focus op één regio",
    icon: Folder,
    bg: "bg-periwinkle",
  },
  {
    key: "multi",
    title: "Meerdere categorieën",
    text: "Meng er een paar door elkaar",
    icon: FolderPlus,
    bg: "bg-mint",
  },
];

function StudySetup() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(studyDataQuery);
  const [s, setS] = useState<StudySettings>(loadSettings);
  // The bounce only plays for a choice made on this screen, not for what was already selected on arrival
  const [touched, setTouched] = useState(false);
  const change = (next: StudySettings) => {
    setTouched(true);
    setS(next);
  };
  useEffect(() => saveSettings(s), [s]);
  // Deliberately not remembered: tomorrow the setup starts on the normal schedule again
  const [practice, setPractice] = useState(false);

  const cats = data?.categories ?? [];
  const today = todayLocal();
  const summary = data ? summarize(data, s.direction, today) : null;
  const selected =
    s.mode === "all" ? null : s.categories.filter((id) => cats.some((c) => c.id === id));
  const ready =
    data && (selected === null || selected.length > 0)
      ? buildQueue({
          cards: data.cards,
          reviews: data.reviews,
          categoryIds: selected,
          direction: s.direction,
          newLimit: s.newLimit,
          practice,
          today,
        }).length
      : 0;

  function setMode(mode: StudyMode) {
    const keep = s.categories.filter((id) => cats.some((c) => c.id === id));
    const firstWithDue = cats.find((c) => (summary?.byCategory.get(c.id)?.due ?? 0) > 0) ?? cats[0];
    const categories =
      mode === "one" ? (keep[0] ? [keep[0]] : firstWithDue ? [firstWithDue.id] : []) : keep;
    change({ ...s, mode, categories });
  }

  function toggle(id: string) {
    if (s.mode === "one") return change({ ...s, categories: [id] });
    change({
      ...s,
      categories: s.categories.includes(id)
        ? s.categories.filter((c) => c !== id)
        : [...s.categories, id],
    });
  }

  const noCards = !!data && data.cards.length === 0;

  return (
    <div className="px-5 pb-6 pt-10">
      <h1 className="text-4xl font-semibold">Leren</h1>
      <p className="mt-1 text-sm text-muted-foreground">Kies wat je vandaag wilt oefenen.</p>

      <div role="radiogroup" aria-label="Wat wil je leren" className="mt-6 grid gap-3">
        {MODES.map(({ key, title, text, icon: Icon, bg }) => {
          const on = s.mode === key;
          return (
            <button
              key={key}
              role="radio"
              aria-checked={on}
              onClick={() => setMode(key)}
              className={cn(
                "tile relative flex min-h-24 items-center gap-4 overflow-hidden p-5 text-left text-on-pastel",
                bg,
                on
                  ? cn(touched && "pop", "ring-[3px] ring-foreground ring-offset-2 ring-offset-background")
                  : "opacity-90",
              )}
            >
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-pastel-surface/60">
                <Icon className="size-5" />
              </span>
              <span className="relative flex-1">
                <span className="block font-display text-xl font-semibold leading-tight">
                  {title}
                </span>
                <span className="block text-sm text-on-pastel-muted">{text}</span>
              </span>
              {on && <Check className="relative size-5 shrink-0" />}
            </button>
          );
        })}
      </div>

      {s.mode !== "all" && (
        <section className="mt-6" aria-label="Categorieën">
          <p className="text-sm font-semibold">
            {s.mode === "one" ? "Kies een categorie" : "Kies categorieën"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isLoading &&
              [0, 1, 2].map((i) => (
                <div key={i} className="h-12 w-28 animate-pulse rounded-full bg-muted" />
              ))}
            {cats.map((c) => {
              const on = s.categories.includes(c.id);
              const n = summary?.byCategory.get(c.id);
              return (
                <button
                  key={c.id}
                  aria-pressed={on}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "flex h-12 items-center gap-2 rounded-full border-2 pl-5 pr-2 text-sm font-semibold text-on-pastel transition-transform active:scale-95",
                    colorOf(c.color).bg,
                    on ? cn(touched && "pop", "border-foreground") : "border-transparent",
                  )}
                >
                  {c.name}
                  <span
                    className="rounded-full bg-pastel-surface/65 px-2.5 py-1 text-xs tabular-nums"
                    aria-label={`${n?.due ?? 0} te doen`}
                  >
                    {n?.due ?? 0}
                  </span>
                </button>
              );
            })}
            {data && cats.length === 0 && (
              <p className="text-sm text-muted-foreground">Nog geen categorieën.</p>
            )}
          </div>
        </section>
      )}

      <section className="mt-6" aria-label="Richting">
        <p className="text-sm font-semibold">Richting</p>
        <div
          role="radiogroup"
          className="mt-3 grid grid-cols-2 gap-1 rounded-full border bg-card p-1"
        >
          {(
            [
              ["image", "Naam bij afbeelding"],
              ["location", "Plek bij naam"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="radio"
              aria-checked={s.direction === key}
              onClick={() => change({ ...s, direction: key })}
              className={cn(
                "flex h-12 items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors",
                s.direction === key
                  ? cn(touched && "pop", "bg-primary text-primary-foreground")
                  : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {s.direction === "location" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Kaarten zonder markering worden in deze richting overgeslagen.
          </p>
        )}
      </section>

      <section className="mt-6" aria-label="Opnieuw oefenen">
        <div className="flex min-h-14 items-center justify-between gap-4 rounded-[28px] border bg-card px-5 py-3 text-card-foreground">
          <label htmlFor="practice" className="flex-1 cursor-pointer">
            <span className="block text-sm font-semibold">Opnieuw oefenen</span>
            <span className="block text-xs text-muted-foreground">
              Alle kaarten in je keuze, ook wat al goed ging. Je planning verandert niet.
            </span>
          </label>
          <Switch id="practice" checked={practice} onCheckedChange={setPractice} />
        </div>
      </section>

      {!practice && (
        <section className="mt-6" aria-label="Nieuwe kaarten per sessie">
          <div className="flex items-center justify-between">
            <label htmlFor="new-limit" className="text-sm font-semibold">
              Nieuwe kaarten per sessie
            </label>
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold tabular-nums">
              {s.newLimit}
            </span>
          </div>
          <input
            id="new-limit"
            type="range"
            min={0}
            max={30}
            step={1}
            value={s.newLimit}
            onChange={(e) => change({ ...s, newLimit: Number(e.target.value) })}
            className="mt-1 h-12 w-full cursor-pointer accent-[var(--foreground)]"
          />
        </section>
      )}

      {noCards ? (
        <EmptyState
          drawing="cards"
          color="bg-butter"
          title="Nog geen kaarten"
          className="mt-6"
          text="Maak eerst een paar kaarten en kom dan terug om ze te leren."
          action={
            <Button asChild size="lg">
              <Link to="/home">Naar start</Link>
            </Button>
          }
        />
      ) : (
        <>
          {data && ready === 0 && (
            <EmptyState
              drawing="check"
              color="bg-mint"
              title={
                s.mode !== "all" && selected?.length === 0 ? "Kies een categorie" : "Helemaal bij"
              }
              text={
                s.mode !== "all" && selected?.length === 0
                  ? "Kies minstens één categorie om te beginnen."
                  : "Er staat niets klaar. Kom later terug, verhoog het aantal nieuwe kaarten of zet “Opnieuw oefenen” aan."
              }
              className="pt-2"
            />
          )}
          {/* Stays visible above the tab bar while the settings scroll */}
          <div className="sticky bottom-24 z-30 -mx-2 mt-6 rounded-[32px] bg-background/90 p-2 backdrop-blur">
            {ready > 0 && (
              <p className="mb-2 text-center text-sm text-muted-foreground">
                {ready} {ready === 1 ? "kaart" : "kaarten"} in deze sessie
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={ready === 0}
              onClick={() =>
                navigate({ to: "/study/session", search: sessionSearch(s, selected, practice) })
              }
            >
              {practice ? "Start oefensessie" : "Start sessie"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
