import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ensureDevSession } from "@/lib/devLogin";
import { takeRedirect } from "@/lib/invites";
import { ColorPlusField } from "@/components/ColorPlusField";

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
  const headerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const avoid = useRef([headerRef, contentRef, buttonRef]).current;
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

  // select-none: nothing on this screen is meant to be selected. It does not hide anything from screen readers or the keyboard.
  return (
    <main className="pointer-events-none relative z-10 mx-auto flex min-h-svh max-w-md select-none flex-col px-6 pb-8 pt-6">
      <div aria-hidden="true" className="plus-grid pointer-events-none fixed inset-0 -z-10" />

      <ColorPlusField avoid={avoid} />

      <header ref={headerRef} className="flex items-center justify-between">
        {/* The logo is drawn for a light page, so it gets a light tile: it stays visible in dark mode too */}
        <img src="/logo.svg" alt="Plexus" width={88} height={88} className="size-[88px] rounded-2xl bg-[#faf8f3]" />
        <Link to="/auth" className="pointer-events-auto flex h-12 items-center rounded-full px-4 text-sm font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Inloggen
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-end pb-10">
        <div ref={contentRef} className="w-fit max-w-full">
          <h1 className="text-5xl font-semibold leading-[1.02] sm:text-6xl">
            <span className="sr-only">Leer elke spier, elk bot & elke zenuw.</span>
            {/* A dotless i with a drawn dot, so the dot can change color on its own */}
            <span aria-hidden="true">
              Leer elke sp<span className="i-dot">ı</span>er, elk bot & elke zenuw.
            </span>
          </h1>
          <p className="mt-4 max-w-xs text-base text-muted-foreground">Flashcards voor anatomie, met je eigen markeringen en een slim leerschema.</p>
        </div>
      </div>

      <div ref={buttonRef} className="pointer-events-auto">
        <Button asChild size="lg" className="w-full">
          <Link to="/auth">Aan de slag</Link>
        </Button>
      </div>
    </main>
  );
}
