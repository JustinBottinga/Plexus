import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cardQuery } from "@/lib/data";
import { CardEditor } from "@/components/CardEditor";

export const Route = createFileRoute("/_authenticated/cards/$id/edit")({
  head: () => ({ meta: [{ title: "Kaart bewerken — Anatomie" }, { name: "description", content: "Bewerk een flashcard." }, { property: "og:title", content: "Kaart bewerken — Anatomie" }, { property: "og:description", content: "Bewerk een flashcard." }] }),
  component: EditCard,
});

function EditCard() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery(cardQuery(id));
  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Laden…</div>;
  if (error || !data) return <div className="p-10 text-center">Kaart niet gevonden.</div>;
  return <CardEditor key={data.id} card={data} />;
}
