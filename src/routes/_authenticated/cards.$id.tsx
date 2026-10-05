import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cardQuery } from "@/lib/data";
import { CardEditor } from "@/components/CardEditor";

export const Route = createFileRoute("/_authenticated/cards/$id")({
  head: () => ({ meta: [{ title: "Edit card — Anatomie" }, { name: "description", content: "Edit a flashcard." }, { property: "og:title", content: "Edit card — Anatomie" }, { property: "og:description", content: "Edit a flashcard." }] }),
  component: EditCard,
});

function EditCard() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery(cardQuery(id));
  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (error || !data) return <div className="p-10 text-center">Card not found.</div>;
  return <CardEditor key={data.id} card={data} />;
}
