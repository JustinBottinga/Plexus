import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { BookOpen, Home, Play, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const tabs = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/study", icon: Play, label: "Study" },
  { to: "/library", icon: BookOpen, label: "Library" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

function AppShell() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl px-4 pb-4">
        <div className="flex items-center justify-around rounded-full border bg-card/90 p-2 shadow-lg backdrop-blur">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "bg-butter text-on-pastel" }}
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
