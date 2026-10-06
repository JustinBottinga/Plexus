import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CardEditor } from "@/components/CardEditor";

export const Route = createFileRoute("/_authenticated/cards/new")({
  validateSearch: z.object({ category: z.string().optional() }),
  head: () => ({ meta: [{ title: "New card — Anatomie" }, { name: "description", content: "Create a new flashcard." }, { property: "og:title", content: "New card — Anatomie" }, { property: "og:description", content: "Create a new flashcard." }] }),
  component: NewCard,
});

function NewCard() {
  const { category } = Route.useSearch();
  return <CardEditor defaultCategory={category} />;
}
