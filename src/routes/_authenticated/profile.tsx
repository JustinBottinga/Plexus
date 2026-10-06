import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Anatomie" }, { name: "description", content: "Your profile." }, { property: "og:title", content: "Profile — Anatomie" }, { property: "og:description", content: "Your profile." }] }),
  component: Profile,
});

function Profile() {
  const { data } = useQuery(profileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const name = data?.profile?.display_name ?? "";

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
        <p className="text-xs opacity-70">Stats</p>
        <p className="mt-1 font-semibold">Your study dashboard arrives in a later phase.</p>
      </div>
      <Button variant="outline" size="lg" className="mt-6 w-full" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
