import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { StudySession } from "@/components/StudySession";

export const Route = createFileRoute("/_authenticated/study/session")({
  // `cats` is a comma separated list of category ids; absent means all categories
  validateSearch: z.object({
    cats: z.string().optional(),
    dir: z.enum(["image", "location"]).catch("image"),
    new: z.coerce.number().int().min(0).max(30).catch(10),
  }),
  head: () => ({ meta: [{ title: "Leren — Anatomie" }, { name: "description", content: "Leersessie." }, { property: "og:title", content: "Leren — Anatomie" }, { property: "og:description", content: "Leersessie." }] }),
  component: SessionPage,
});

function SessionPage() {
  const { cats, dir, new: newLimit } = Route.useSearch();
  const categoryIds = useMemo(() => (cats ? cats.split(",").filter(Boolean) : null), [cats]);
  // Remount when the settings change (e.g. browser back/forward) so a fresh queue is built
  return <StudySession key={`${cats ?? ""}|${dir}|${newLimit}`} categoryIds={categoryIds} direction={dir} newLimit={newLimit} />;
}
