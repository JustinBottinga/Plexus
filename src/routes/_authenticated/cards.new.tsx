import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CardEditor } from "@/components/CardEditor";

export const Route = createFileRoute("/_authenticated/cards/new")({
  validateSearch: z.object({ category: z.string().optional() }),
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Nieuwe kaart — Anatomie" }, { name: "description", content: "Maak een nieuwe flashcard." }, { property: "og:title", content: "Nieuwe kaart — Anatomie" }, { property: "og:description", content: "Maak een nieuwe flashcard." }] }),
  component: NewCard,
});

function NewCard() {
  const { category } = Route.useSearch();
  return <CardEditor {...(category ? { defaultCategory: category } : {})} />;
}
