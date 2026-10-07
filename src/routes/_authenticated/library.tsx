import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Bibliotheek — Plexus" }, { name: "description", content: "Gedeelde bibliotheek." }, { property: "og:title", content: "Bibliotheek — Plexus" }, { property: "og:description", content: "Gedeelde bibliotheek." }] }),
  component: () => <Placeholder title="Bibliotheek" text="Een gedeelde bibliotheek met klasgenoten komt eraan." color="bg-mint" />,
});
