import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Play, Plus, Search } from "lucide-react";
import { categoriesQuery, profileQuery } from "@/lib/data";
import { colorOf } from "@/lib/palette";
import { CategoryDialog } from "@/components/CategoryDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Anatomie" }, { name: "description", content: "Your anatomy flashcards." }, { property: "og:title", content: "Home — Anatomie" }, { property: "og:description", content: "Your anatomy flashcards." }] }),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useQuery(profileQuery);
  const { data: cats, isLoading } = useQuery(categoriesQuery);
  const name = me?.profile?.display_name?.split(" ")[0] ?? "";

  return (
    <div className="px-5 pt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-semibold">Hi{name ? `, ${name}` : ""}!</h1>
        <Link to="/profile" className="flex size-12 items-center justify-center rounded-full bg-peach font-display text-lg font-semibold text-on-pastel">
          {name.charAt(0).toUpperCase()}
        </Link>
      </div>

      <label className="mt-6 flex h-12 items-center gap-3 rounded-full border bg-card px-5 text-muted-foreground">
        <Search className="size-4" />
        <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Search…" disabled />
      </label>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="tile flex min-h-48 flex-col justify-between bg-ink p-5 text-ink-foreground">
          <p className="font-display text-2xl font-semibold leading-tight">Continue studying</p>
          <div className="flex items-center gap-2">
            <span className="flex size-11 items-center justify-center rounded-full bg-butter text-on-pastel"><Play className="size-4 fill-current" /></span>
            <span className="rounded-full border border-ink-foreground/30 px-3 py-1 text-xs">Soon</span>
          </div>
        </div>
        <div className="tile flex min-h-48 flex-col justify-between border bg-card p-5">
          <p className="font-display text-2xl font-semibold leading-tight">Daily streak</p>
          <div className="flex items-end gap-2">
            <Flame className="size-8 text-peach-deep" />
            <span className="font-display text-4xl font-semibold">0</span>
            <span className="pb-1 text-xs text-muted-foreground">days</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Categories</h2>
        <CategoryDialog
          trigger={<button className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> New</button>}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {isLoading && [0, 1].map((i) => <div key={i} className="tile h-36 animate-pulse bg-muted" />)}
        {cats?.map((c, i) => (
          <Link
            key={c.id}
            to="/categories/$id"
            params={{ id: c.id }}
            className={cn("tile tile-lift flex h-36 flex-col justify-between p-5 text-on-pastel", colorOf(c.color).bg, i % 3 === 0 && "col-span-2")}
          >
            <p className="font-display text-xl font-semibold leading-tight">{c.name}</p>
            <span className="self-start rounded-full bg-card/60 px-3 py-1 text-xs font-medium">
              {c.count} {c.count === 1 ? "card" : "cards"}
            </span>
          </Link>
        ))}
        {cats && cats.length === 0 && (
          <CategoryDialog
            trigger={
              <button className="tile col-span-2 flex h-36 flex-col items-center justify-center border-2 border-dashed text-muted-foreground">
                <Plus className="size-6" />
                <span className="mt-1 text-sm font-medium">Create your first category</span>
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
