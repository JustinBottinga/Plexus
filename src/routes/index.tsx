import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ensureDevSession } from "@/lib/devLogin";
import { takeRedirect } from "@/lib/invites";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anatomie — zachte flashcards voor anatomiestudenten" },
      { name: "description", content: "Maak je eigen anatomie-flashcards met gemarkeerde structuren, geordend in kleurrijke categorieën." },
      { property: "og:title", content: "Anatomie — soft flashcards for anatomy students" },
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <div className="grid flex-1 grid-cols-2 content-center gap-3">
        <div className="tile col-span-2 bg-butter p-7 text-on-pastel">
          <p className="text-sm font-medium opacity-80">Anatomie</p>
          <h1 className="mt-10 text-5xl font-semibold leading-[0.95]">Leer elke spier, elk bot & elke zenuw.</h1>
        </div>
        <div className="tile aspect-square bg-periwinkle p-5 text-on-pastel">
          <p className="font-display text-2xl font-semibold">M. biceps brachii</p>
        </div>
        <div className="tile aspect-square bg-ink p-5 text-ink-foreground">
          <p className="font-display text-2xl font-semibold">Je kaarten, overal gesynct.</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <Button asChild size="lg" className="w-full">
          <Link to="/auth">Aan de slag</Link>
        </Button>
      </div>
    </main>
  );
}
