import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { cardQuery, categoriesQuery, useSignedUrl, type Box } from "@/lib/data";
import { colorOf } from "@/lib/palette";
import { BoxPreview } from "@/components/BoxEditor";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/cards/$id/")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Kaart — Anatomie" }, { name: "description", content: "Bekijk een flashcard." }, { property: "og:title", content: "Kaart — Anatomie" }, { property: "og:description", content: "Bekijk een flashcard." }] }),
  component: CardView,
});

const NOTES = [
  ["origin", "Origo"],
  ["insertion", "Insertie"],
  ["innervation", "Innervatie"],
  ["function", "Functie"],
] as const;

function CardView() {
  const { id } = Route.useParams();
  const { data: card, isLoading, error } = useQuery(cardQuery(id));
  const { data: cats } = useQuery(categoriesQuery);
  const { data: url } = useSignedUrl(card?.image_path);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Laden…</div>;
  if (error || !card) return <div className="p-10 text-center">Kaart niet gevonden.</div>;

  const color = colorOf(cats?.find((c) => c.id === card.category_id)?.color);
  const attribution = [card.image_source, card.image_author, card.image_license].filter(Boolean);

  return (
    <div className={cn("min-h-screen px-5 pb-10 pt-8 text-on-pastel", color.bg)}>
      <div className="flex items-center justify-between">
        <Link to="/categories/$id" params={{ id: card.category_id }} className="flex size-12 items-center justify-center rounded-full bg-pastel-surface/60" aria-label="Terug">
          <ArrowLeft className="size-5" />
        </Link>
        <Link to="/cards/$id/edit" params={{ id: card.id }} className="flex size-12 items-center justify-center rounded-full bg-pastel-surface/60" aria-label="Kaart bewerken">
          <Pencil className="size-4" />
        </Link>
      </div>

      <h1 className="mt-6 text-4xl font-semibold leading-[1.05]">{card.name_nl}</h1>
      {card.name_latin && <p className="mt-1 text-lg italic text-on-pastel-muted">{card.name_latin}</p>}

      <div className="mt-6">
        {url ? (
          <BoxPreview src={url} marker={card.marker as Box | null} covers={(card.covers as Box[] | null) ?? []} coverClass={color.deep} />
        ) : (
          <div className="tile aspect-[4/3] animate-pulse bg-pastel-surface/40" />
        )}
        {attribution.length > 0 && (
          <p className="mt-2 px-1 text-xs text-on-pastel-muted">{attribution.join(" · ")}</p>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {NOTES.filter(([k]) => card[k]).map(([k, label]) => (
          <div key={k} className="rounded-[28px] bg-pastel-surface/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-pastel-muted">{label}</p>
            <p className="mt-1 whitespace-pre-line text-sm">{card[k]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
