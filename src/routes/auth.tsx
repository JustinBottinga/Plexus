import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureDevSession } from "@/lib/devLogin";
import { rememberRedirect, safeRedirect, takeRedirect } from "@/lib/invites";

export const Route = createFileRoute("/auth")({
  // Where to go after logging in, e.g. back to an invite link
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Inloggen — Plexus" },
      { name: "description", content: "Log in op je anatomie-flashcards." },
      { property: "og:title", content: "Inloggen — Plexus" },
      { property: "og:description", content: "Log in op je anatomie-flashcards." },
    ],
  }),
  component: AuthPage,
});

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="!size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 11l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const redirect = safeRedirect(Route.useSearch().redirect);
  const ids = useId();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kept in sessionStorage so it survives the Google redirect, which leaves this page
  useEffect(() => rememberRedirect(redirect), [redirect]);

  useEffect(() => {
    const done = () => {
      const target = takeRedirect();
      if (target) router.history.replace(target);
      else navigate({ to: "/home", replace: true });
    };
    ensureDevSession()
      .then(() => supabase.auth.getSession())
      .then(({ data }) => {
        if (data.session) done();
      });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) done();
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
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
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setError(r.error.message ?? "Inloggen met Google mislukt");
  }

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  }

  const signup = mode === "signup";
  const field = "h-12 rounded-full bg-card px-5";

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col px-6 pb-8 pt-6">
      <div aria-hidden="true" className="plus-grid pointer-events-none fixed inset-0 -z-10" />

      <header>
        <Link
          to="/"
          aria-label="Terug naar het beginscherm"
          className="flex size-12 items-center justify-center rounded-full border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-5" />
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-end pt-10">
        {sent ? (
          <section aria-live="polite">
            <span className="flex size-16 items-center justify-center rounded-full bg-butter text-on-pastel">
              <Mail className="size-7" />
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02]">Check je e-mail</h1>
            <p className="mt-4 text-base text-muted-foreground">
              We hebben een bevestigingslink gestuurd naar <strong className="font-semibold text-foreground">{email}</strong>. Klik erop om je
              registratie af te ronden.
            </p>
            <Button type="button" variant="outline" size="lg" className="mt-8 w-full" onClick={() => setSent(false)}>
              Ander e-mailadres gebruiken
            </Button>
          </section>
        ) : (
          <>
            <h1 className="text-5xl font-semibold leading-[1.02]">{signup ? "Maak je account aan" : "Welkom terug"}</h1>
            <p className="mt-4 text-base text-muted-foreground">Je anatomiekaarten, op elk apparaat.</p>

            <Button type="button" variant="outline" size="lg" className="mt-8 w-full" onClick={google}>
              <GoogleMark /> Doorgaan met Google
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              of met e-mail
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {signup && (
                <div>
                  <label htmlFor={`${ids}-name`} className="sr-only">
                    Je naam
                  </label>
                  <Input id={`${ids}-name`} className={field} placeholder="Je naam" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
                </div>
              )}
              <div>
                <label htmlFor={`${ids}-email`} className="sr-only">
                  E-mailadres
                </label>
                <Input id={`${ids}-email`} className={field} type="email" placeholder="E-mailadres" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="relative">
                <label htmlFor={`${ids}-password`} className="sr-only">
                  Wachtwoord
                </label>
                <Input
                  id={`${ids}-password`}
                  className={`${field} pr-14`}
                  type={showPassword ? "text" : "password"}
                  placeholder="Wachtwoord"
                  autoComplete={signup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  aria-describedby={signup ? `${ids}-hint` : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
                  aria-pressed={showPassword}
                  className="absolute right-0 top-0 flex size-12 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {signup && (
                <p id={`${ids}-hint`} className="px-2 text-xs text-muted-foreground">
                  Minstens 6 tekens.
                </p>
              )}

              {error && (
                <p role="alert" className="px-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? "Even geduld…" : signup ? "Registreren" : "Inloggen"}
              </Button>
            </form>

            <button
              type="button"
              className="mt-2 flex min-h-12 w-full items-center justify-center rounded-full text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={switchMode}
            >
              {signup ? "Al een account? " : "Nog geen account? "}
              <span className="ml-1 font-semibold text-foreground underline underline-offset-4">{signup ? "Log in" : "Registreer"}</span>
            </button>
          </>
        )}
      </div>
    </main>
  );
}
