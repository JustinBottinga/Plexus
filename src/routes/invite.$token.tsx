import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { colorOf } from "@/lib/palette";
import { ensureDevSession } from "@/lib/devLogin";
import { copyImagesToOwnFolder } from "@/lib/invites";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  // Needs an account: after logging in, /auth sends the person back here
  beforeLoad: async ({ params }) => {
    let { data } = await supabase.auth.getUser();
    if (!data.user && (await ensureDevSession())) ({ data } = await supabase.auth.getUser());
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: `/invite/${params.token}` } });
    return { user: data.user };
  },
  head: () => ({
    meta: [
      { title: "Uitnodiging — Anatomie" },
      { name: "description", content: "Je bent uitgenodigd voor een categorie." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

type Stage = "idle" | "copying" | "images";

function InvitePage() {
  const { token } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>("idle");

  const { data: preview, isLoading, isError, refetch } = useQuery({
    queryKey: ["invite", token],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("invite_preview", { p_token: token });
      if (error) throw error;
      return data[0] ?? null;
    },
  });

  async function accept() {
    setStage("copying");
    try {
      const { data: categoryId, error } = await supabase.rpc("accept_invite", { p_token: token });
      if (error) throw error;
      setStage("images");
      const failed = await copyImagesToOwnFolder(categoryId, user.id);
      await Promise.all([qc.invalidateQueries({ queryKey: ["categories"] }), qc.invalidateQueries({ queryKey: ["cards"] })]);
      if (failed > 0) toast.warning(`${failed} afbeelding${failed === 1 ? "" : "en"} kon${failed === 1 ? "" : "den"} niet worden gekopieerd. Ze blijven wel zichtbaar zolang de afzender ze bewaart.`);
      else toast.success("Categorie toegevoegd");
      navigate({ to: "/categories/$id", params: { id: categoryId }, replace: true });
    } catch (e) {
      setStage("idle");
      toast.error((e as Error).message || "Toevoegen mislukt");
    }
  }

  const color = colorOf(preview?.category_color);
  const busy = stage !== "idle";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      {isLoading && <div className="tile h-64 animate-pulse bg-muted" />}

      {isError && (
        <EmptyState
          drawing="cards"
          color="bg-peach"
          title="Uitnodiging laden mislukt"
          text="Controleer je verbinding en probeer het opnieuw."
          action={<Button size="lg" onClick={() => refetch()}>Opnieuw proberen</Button>}
        />
      )}

      {!isLoading && !isError && !preview && (
        <EmptyState
          drawing="folder"
          color="bg-lilac"
          title="Uitnodiging werkt niet meer"
          text="De link is verlopen of ingetrokken. Vraag de afzender om een nieuwe link."
          action={<Button asChild size="lg"><Link to="/home">Naar start</Link></Button>}
        />
      )}

      {preview && (
        <>
          <div className={`tile p-7 text-on-pastel ${color.bg}`}>
            <p className="text-sm font-medium opacity-80">
              {preview.owner_name ? `${preview.owner_name} nodigt je uit` : "Je bent uitgenodigd"}
            </p>
            <h1 className="mt-10 text-4xl font-semibold leading-tight">{preview.category_name}</h1>
            <p className="mt-2 text-sm opacity-80">
              {preview.card_count} {preview.card_count === 1 ? "kaart" : "kaarten"}
            </p>
          </div>

          <div className="tile mt-4 space-y-3 bg-card p-6">
            {preview.is_owner ? (
              <>
                <p className="text-sm text-muted-foreground">Dit is je eigen uitnodiging. Stuur de link naar iemand anders.</p>
                <Button asChild size="lg" className="w-full"><Link to="/home">Naar start</Link></Button>
              </>
            ) : preview.copied_category_id ? (
              <>
                <p className="text-sm text-muted-foreground">Je hebt deze categorie al in je bibliotheek.</p>
                <Button asChild size="lg" className="w-full">
                  <Link to="/categories/$id" params={{ id: preview.copied_category_id }}>Openen</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Je krijgt een eigen kopie met alle kaarten. Je leervoortgang is van jou, en wat de afzender daarna
                  wijzigt, komt niet in jouw kopie.
                </p>
                <Button size="lg" className="w-full" disabled={busy} onClick={accept}>
                  {stage === "copying" && "Kaarten toevoegen…"}
                  {stage === "images" && "Afbeeldingen kopiëren…"}
                  {stage === "idle" && "Toevoegen aan mijn bibliotheek"}
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full">
                  <Link to="/home">Nee, bedankt</Link>
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}
