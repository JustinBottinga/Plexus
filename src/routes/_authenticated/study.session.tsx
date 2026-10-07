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
    // 1 = practise every card in the selection again, whether or not it is due
    practice: z.coerce.number().int().min(0).max(1).catch(0),
  }),
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Leersessie — Anatomie" }, { name: "description", content: "Leersessie." }, { property: "og:title", content: "Leersessie — Anatomie" }, { property: "og:description", content: "Leersessie." }] }),
  component: SessionPage,
});

function SessionPage() {
  const { cats, dir, new: newLimit, practice } = Route.useSearch();
  const categoryIds = useMemo(() => (cats ? cats.split(",").filter(Boolean) : null), [cats]);
  // Remount when the settings change (e.g. browser back/forward) so a fresh queue is built
  return <StudySession key={`${cats ?? ""}|${dir}|${newLimit}|${practice}`} categoryIds={categoryIds} direction={dir} newLimit={newLimit} practice={practice === 1} />;
}
