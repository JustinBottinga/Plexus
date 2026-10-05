import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/_authenticated/study")({
  head: () => ({ meta: [{ title: "Study — Anatomie" }, { name: "description", content: "Study mode." }, { property: "og:title", content: "Study — Anatomie" }, { property: "og:description", content: "Study mode." }] }),
  component: () => <Placeholder title="Study" text="Study mode with spaced repetition arrives in the next phase." color="bg-periwinkle" />,
});
