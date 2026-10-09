import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ensureDevSession } from "@/lib/devLogin";
import { takeRedirect } from "@/lib/invites";
import { PALETTE } from "@/lib/palette";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plexus — flashcards voor anatomie" },
      { name: "description", content: "Maak je eigen anatomie-flashcards met gemarkeerde structuren, geordend in kleurrijke categorieën." },
      { property: "og:title", content: "Plexus — flashcards voor anatomie" },
      { property: "og:description", content: "Maak je eigen anatomie-flashcards met gemarkeerde structuren." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const router = useRouter();
  useEffect(() => {
    ensureDevSession()
      .then(() => supabase.auth.getSession())
      .then(({ data }) => {
        if (!data.session) return;
        // Back to an invite link after the Google login, which returns here
        const target = takeRedirect();
        if (target) router.history.replace(target);
        else navigate({ to: "/home", replace: true });
      });
  }, [navigate, router]);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col px-6 pb-8 pt-6">
      <div aria-hidden="true" className="plus-grid pointer-events-none fixed inset-0 -z-10" />

      <header className="flex items-center justify-between">
        <p className="font-display text-2xl font-semibold">Plexus</p>
        <Link to="/auth" className="flex h-12 items-center rounded-full px-4 text-sm font-semibold text-muted-foreground">
          Inloggen
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-end pb-10">
        <ul aria-hidden="true" className="mb-6 flex gap-2">
          {PALETTE.map((c) => (
            <li key={c.key} className={`size-3.5 rounded-full ${c.bg}`} />
          ))}
        </ul>
        <h1 className="text-5xl font-semibold leading-[1.02] sm:text-6xl">Leer elke spier, elk bot & elke zenuw.</h1>
        <p className="mt-4 max-w-xs text-base text-muted-foreground">Flashcards voor anatomie, met je eigen markeringen en een slim leerschema.</p>
      </div>

      <Button asChild size="lg" className="w-full">
        <Link to="/auth">Aan de slag</Link>
      </Button>
    </main>
  );
}
