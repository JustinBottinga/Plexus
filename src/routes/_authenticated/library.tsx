import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Bibliotheek — Anatomie" }, { name: "description", content: "Gedeelde bibliotheek." }, { property: "og:title", content: "Bibliotheek — Anatomie" }, { property: "og:description", content: "Gedeelde bibliotheek." }] }),
  component: () => <Placeholder title="Bibliotheek" text="Een gedeelde bibliotheek met klasgenoten komt eraan." color="bg-mint" />,
});
