import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";

const THEMES: { key: ThemePref; label: string; icon: typeof Sun }[] = [
  { key: "system", label: "Systeem", icon: Monitor },
  { key: "light", label: "Licht", icon: Sun },
  { key: "dark", label: "Donker", icon: Moon },
];

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Profiel — Anatomie" }, { name: "description", content: "Je profiel." }, { property: "og:title", content: "Profiel — Anatomie" }, { property: "og:description", content: "Je profiel." }] }),
  component: Profile,
});

function Profile() {
  const { data } = useQuery(profileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const name = data?.profile?.display_name ?? "";
  const { pref, set } = useTheme();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="px-5 pt-10">
      <div className="flex flex-col items-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-peach font-display text-4xl font-semibold text-on-pastel">
          {name.charAt(0).toUpperCase() || "?"}
        </div>
        <h1 className="mt-4 text-3xl font-semibold">{name}</h1>
        <p className="text-sm text-muted-foreground">{data?.user.email}</p>
      </div>
      <div className="tile mt-8 bg-butter p-6 text-on-pastel">
        <p className="text-xs opacity-80">Statistieken</p>
        <p className="mt-1 font-semibold">Je leerdashboard komt in een latere fase.</p>
      </div>
      <section className="mt-6 rounded-[30px] border bg-card p-5">
        <p className="font-display text-xl font-semibold">Weergave</p>
        <div role="radiogroup" aria-label="Thema" className="mt-3 grid grid-cols-3 gap-2">
          {THEMES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="radio"
              aria-checked={pref === key}
              onClick={() => set(key)}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-transform active:scale-95",
                pref === key ? "pop bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </section>
      <Button variant="outline" size="lg" className="mt-6 w-full" onClick={signOut}>
        Uitloggen
      </Button>
    </div>
  );
}
