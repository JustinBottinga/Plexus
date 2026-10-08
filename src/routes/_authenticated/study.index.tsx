import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Folder, FolderPlus, Layers } from "lucide-react";
import { studyDataQuery } from "@/lib/data";
import { buildQueue } from "@/lib/queue";
import { todayLocal } from "@/lib/srs";
import { loadSettings, sessionSearch } from "@/lib/studySettings";
import { EmptyState } from "@/components/EmptyState";
import { InfoHint } from "@/components/InfoHint";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/study/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Leren — Plexus" },
      { name: "description", content: "Start een leersessie." },
      { property: "og:title", content: "Leren — Plexus" },
      { property: "og:description", content: "Start een leersessie." },
    ],
  }),
  component: StudySetup,
});

function StudySetup() {
  const navigate = useNavigate();
  const { data } = useQuery(studyDataQuery);
  // Direction and the number of new cards are set once in the profile; this screen only chooses what to study
  const settings = loadSettings();
  // Not remembered: tomorrow the screen starts on the normal schedule again
  const [practice, setPractice] = useState(false);

  const today = todayLocal();
  const all = data
    ? buildQueue({
        cards: data.cards,
        reviews: data.reviews,
        categoryIds: null,
        directions: settings.directions,
        newLimit: settings.newLimit,
        practice,
        today,
      }).length
    : 0;
  const noCards = !!data && data.cards.length === 0;
  const count = (n: number) => `${n} ${n === 1 ? "kaart" : "kaarten"}`;

  const choices = [
    {
      key: "all",
      title: "Alles leren",
      text: !data ? " " : all > 0 ? `${count(all)} ${practice ? "om te oefenen" : "klaar"}` : "Helemaal bij",
      icon: Layers,
      bg: "bg-butter",
      disabled: !data || all === 0,
      go: () => navigate({ to: "/study/session", search: sessionSearch(settings, null, practice) }),
    },
    {
      key: "one",
      title: "Eén categorie",
      text: "Focus op één regio",
      icon: Folder,
      bg: "bg-periwinkle",
      disabled: noCards,
      go: () => navigate({ to: "/study/categories", search: { mode: "one", practice: practice ? 1 : 0 } }),
    },
    {
      key: "multi",
      title: "Meerdere categorieën",
      text: "Meng er een paar door elkaar",
      icon: FolderPlus,
      bg: "bg-mint",
      disabled: noCards,
      go: () => navigate({ to: "/study/categories", search: { mode: "multi", practice: practice ? 1 : 0 } }),
    },
  ];

  const directionLabel =
    settings.directions.length === 2
      ? "Beide richtingen"
      : settings.directions[0] === "location"
        ? "Plek bij naam"
        : "Naam bij afbeelding";

  return (
    <div className="px-5 pb-6 pt-10">
      <h1 className="text-4xl font-semibold">Leren</h1>
      <p className="mt-1 text-sm text-muted-foreground">Kies wat je vandaag wilt oefenen.</p>

      <div className="mt-6 flex items-center gap-3 rounded-full border bg-card py-1 pl-5 pr-4">
        <label htmlFor="practice" className="flex-1 cursor-pointer text-sm font-semibold">
          Opnieuw oefenen
        </label>
        <InfoHint label="Meer over opnieuw oefenen">
          Alle kaarten in je keuze, ook wat al goed ging. Je planning verandert niet.
        </InfoHint>
        <Switch id="practice" checked={practice} onCheckedChange={setPractice} />
      </div>

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
        <div className="mt-4 grid gap-3">
          {choices.map(({ key, title, text, icon: Icon, bg, disabled, go }) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={go}
              className={cn(
                "tile flex min-h-24 items-center gap-4 p-5 text-left text-on-pastel disabled:cursor-not-allowed disabled:opacity-60",
                bg,
              )}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pastel-surface/60">
                <Icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block font-display text-xl font-semibold leading-tight">{title}</span>
                <span className="block text-sm text-on-pastel-muted">{text}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {directionLabel}
        {" · "}
        {settings.newLimit === 0 ? "geen nieuwe kaarten" : `${settings.newLimit} nieuwe kaarten per sessie`}
        {" · "}
        <Link to="/profile" className="font-semibold text-foreground underline underline-offset-4">
          Aanpassen
        </Link>
      </p>
    </div>
  );
}
