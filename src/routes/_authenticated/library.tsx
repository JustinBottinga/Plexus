import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library — Anatomie" }, { name: "description", content: "Shared library." }, { property: "og:title", content: "Library — Anatomie" }, { property: "og:description", content: "Shared library." }] }),
  component: () => <Placeholder title="Library" text="A shared library with classmates is on its way." color="bg-mint" />,
});
