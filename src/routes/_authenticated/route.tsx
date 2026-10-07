import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, Home, Play, User } from "lucide-react";
import { flushPending } from "@/lib/reviewWriter";
import { ensureDevSession } from "@/lib/devLogin";
import { useDueNotifications } from "@/lib/dueNotification";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let { data, error } = await supabase.auth.getUser();
    // On localhost, sign in automatically with the account from .env.local
    if ((error || !data.user) && (await ensureDevSession())) ({ data, error } = await supabase.auth.getUser());
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const tabs = [
  { to: "/home", icon: Home, label: "Start" },
  { to: "/study", icon: Play, label: "Leren" },
  { to: "/library", icon: BookOpen, label: "Bibliotheek" },
  { to: "/profile", icon: User, label: "Profiel" },
] as const;

function AppShell() {
  useDueNotifications();
  // Ratings that could not be saved earlier (offline, closed tab) are retried when the app opens or reconnects
  useEffect(() => {
    void flushPending();
    window.addEventListener("online", flushPending);
    return () => window.removeEventListener("online", flushPending);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <div aria-hidden="true" className="page-wash pointer-events-none fixed inset-0 -z-10" />
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl px-4 pb-4">
        <div className="flex items-center justify-around rounded-full border bg-card/90 p-2 shadow-lg backdrop-blur">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              aria-label={t.label}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "pop bg-butter text-on-pastel" }}
            >
              <t.icon className="size-5" />
              <span className="hidden sm:inline">{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
