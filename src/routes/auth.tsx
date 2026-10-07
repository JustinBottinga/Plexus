import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureDevSession } from "@/lib/devLogin";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Inloggen — Anatomie" },
      { name: "description", content: "Log in op je anatomie-flashcards." },
      { property: "og:title", content: "Inloggen — Anatomie" },
      { property: "og:description", content: "Log in op je anatomie-flashcards." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    ensureDevSession()
      .then(() => supabase.auth.getSession())
      .then(({ data }) => {
        if (data.session) navigate({ to: "/home", replace: true });
      });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/home", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Inloggen met Google mislukt");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="tile bg-butter p-7 text-on-pastel">
        <h1 className="text-4xl font-semibold leading-tight">
          {mode === "signin" ? "Welkom terug" : "Maak je account aan"}
        </h1>
        <p className="mt-2 text-sm opacity-80">Je anatomiekaarten, op elk apparaat.</p>
      </div>

      {sent ? (
        <div className="tile mt-4 bg-card p-6">
          <p className="font-display text-xl font-semibold">Check je e-mail</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We hebben een bevestigingslink gestuurd naar {email}. Klik erop om je registratie af te ronden.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="tile mt-4 space-y-3 bg-card p-6">
          {mode === "signup" && (
            <Input className="h-12 rounded-full px-5" placeholder="Je naam" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          )}
          <Input className="h-12 rounded-full px-5" type="email" placeholder="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input className="h-12 rounded-full px-5" type="password" placeholder="Wachtwoord" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {mode === "signin" ? "Inloggen" : "Registreren"}
          </Button>
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>
            Doorgaan met Google
          </Button>
          <button
            type="button"
            className="w-full pt-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Nog geen account? Registreer" : "Al een account? Log in"}
          </button>
        </form>
      )}
    </main>
  );
}
