import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anatomie — soft flashcards for anatomy students" },
      { name: "description", content: "Build your own anatomy flashcards with highlighted structures, organised in colourful categories." },
      { property: "og:title", content: "Anatomie — soft flashcards for anatomy students" },
      { property: "og:description", content: "Build your own anatomy flashcards with highlighted structures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <div className="grid flex-1 grid-cols-2 content-center gap-3">
        <div className="tile col-span-2 bg-butter p-7 text-on-pastel">
          <p className="text-sm font-medium opacity-70">Anatomie</p>
          <h1 className="mt-10 text-5xl font-semibold leading-[0.95]">Learn every muscle, bone & nerve.</h1>
        </div>
        <div className="tile aspect-square bg-periwinkle p-5 text-on-pastel">
          <p className="font-display text-2xl font-semibold">M. biceps brachii</p>
        </div>
        <div className="tile aspect-square bg-ink p-5 text-ink-foreground">
          <p className="font-display text-2xl font-semibold">Your cards, synced.</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <Button asChild size="lg" className="w-full">
          <Link to="/auth">Get started</Link>
        </Button>
      </div>
    </main>
  );
}
