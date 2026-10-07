import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cardsQuery, categoriesQuery, useSignedUrl, type Card } from "@/lib/data";
import { colorOf } from "@/lib/palette";
import { CategoryDialog } from "@/components/CategoryDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/categories/$id")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Categorie — Anatomie" }, { name: "description", content: "Kaarten in deze categorie." }, { property: "og:title", content: "Categorie — Anatomie" }, { property: "og:description", content: "Kaarten in deze categorie." }] }),
  component: CategoryPage,
});

function CategoryPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cats } = useQuery(categoriesQuery);
  const { data: cards, isLoading } = useQuery(cardsQuery(id));
  const cat = cats?.find((c) => c.id === id);
  const color = colorOf(cat?.color);

  async function remove() {
    const paths = (cards ?? []).map((c) => c.image_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("card-images").remove(paths);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["cards"] });
    navigate({ to: "/home" });
  }

  return (
    <div>
      <div className={`rounded-b-[36px] px-5 pb-8 pt-8 text-on-pastel ${color.bg}`}>
        <div className="flex items-center justify-between">
          <Link to="/home" className="flex size-12 items-center justify-center rounded-full bg-pastel-surface/60"><ArrowLeft className="size-5" /></Link>
          <div className="flex gap-2">
            {cat && (
              <CategoryDialog initial={cat} trigger={<button aria-label="Bewerken" className="flex size-12 items-center justify-center rounded-full bg-pastel-surface/60"><Pencil className="size-4" /></button>} />
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button aria-label="Verwijderen" className="flex size-12 items-center justify-center rounded-full bg-pastel-surface/60"><Trash2 className="size-4" /></button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[30px]">
                <AlertDialogHeader>
                  <AlertDialogTitle>“{cat?.name}” verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>Alle {cards?.length ?? 0} kaarten in deze categorie worden ook verwijderd.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Annuleren</AlertDialogCancel>
                  <AlertDialogAction className="rounded-full" onClick={remove}>Verwijderen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <h1 className="mt-8 text-4xl font-semibold">{cat?.name ?? "…"}</h1>
        <p className="mt-1 text-sm opacity-80">{cards?.length ?? 0} kaarten</p>
      </div>

      <div className="px-5 pt-6">
        <Button asChild size="lg" className="w-full">
          <Link to="/cards/new" search={{ category: id }}><Plus /> Nieuwe kaart</Link>
        </Button>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {isLoading && [0, 1, 2].map((i) => <div key={i} className="tile aspect-[4/5] animate-pulse bg-muted" />)}
          {cards?.map((c) => <CardTile key={c.id} card={c} />)}
        </div>
        {cards?.length === 0 && (
          <EmptyState drawing="cards" color={color.bg} title="Nog geen kaarten" text="Voeg je eerste structuur toe met een afbeelding en een markering." />
        )}
      </div>
    </div>
  );
}

function CardTile({ card }: { card: Card }) {
  const { data: url } = useSignedUrl(card.image_path);
  return (
    <Link to="/cards/$id" params={{ id: card.id }} className="tile tile-lift overflow-hidden border bg-card">
      <div className="aspect-square bg-muted">
        {url && <img src={url} alt={card.name_nl} className="size-full object-cover" loading="lazy" />}
      </div>
      <div className="p-4">
        <p className="truncate font-semibold">{card.name_nl}</p>
        {card.name_latin && <p className="truncate text-xs italic text-muted-foreground">{card.name_latin}</p>}
      </div>
    </Link>
  );
}
