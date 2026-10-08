import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { InfoHint } from "@/components/InfoHint";
import { notificationsSupported, useDueNotificationPref } from "@/lib/dueNotification";
import { NEW_LIMITS, loadSettings, saveSettings, type StudySettings } from "@/lib/studySettings";
import type { Direction } from "@/lib/srs";
import { useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";

const THEMES: { key: ThemePref; label: string; icon: typeof Sun }[] = [
  { key: "system", label: "Systeem", icon: Monitor },
  { key: "light", label: "Licht", icon: Sun },
  { key: "dark", label: "Donker", icon: Moon },
];

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Profiel — Plexus" }, { name: "description", content: "Je profiel." }, { property: "og:title", content: "Profiel — Plexus" }, { property: "og:description", content: "Je profiel." }] }),
  component: Profile,
});

function Profile() {
  const { data } = useQuery(profileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const name = data?.profile?.display_name ?? "";
  const { pref, set } = useTheme();
  // The bounce only plays for a click on this screen, not for the theme that was already active
  const [touched, setTouched] = useState(false);
  const notify = useDueNotificationPref();
  const [study, setStudy] = useState<StudySettings>(loadSettings);

  function updateStudy(next: StudySettings) {
    setTouched(true);
    setStudy(next);
    saveSettings(next);
  }

  // At least one direction stays on: unticking the last one does nothing
  function toggleDirection(d: Direction, on: boolean) {
    const next = (["image", "location"] as const).filter((x) => (x === d ? on : study.directions.includes(x)));
    if (next.length > 0) updateStudy({ ...study, directions: next });
  }

  // A value from an older slider (say 7) stays visible as its own choice until another one is picked
  const limits = [...new Set([...NEW_LIMITS, study.newLimit])].sort((a, b) => a - b);

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
        <p className="text-xs opacity-80">Statistieken</p>
        <p className="mt-1 font-semibold">Je leerdashboard komt in een latere fase.</p>
      </div>
      <section className="mt-6 rounded-[30px] border bg-card p-5">
        <p className="font-display text-xl font-semibold">Weergave</p>
        <div role="radiogroup" aria-label="Thema" className="mt-3 grid grid-cols-3 gap-2">
          {THEMES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="radio"
              aria-checked={pref === key}
              onClick={() => {
                setTouched(true);
                set(key);
              }}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-transform active:scale-95",
                pref === key ? cn(touched && "pop", "bg-primary text-primary-foreground") : "bg-secondary text-secondary-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-[30px] border bg-card p-5">
        <p className="font-display text-xl font-semibold">Leren</p>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-semibold">Richting</p>
          <InfoHint label="Meer over richting" className="-my-3">
            Naam bij afbeelding: je ziet de afbeelding en noemt de naam. Plek bij naam: je ziet de naam en tikt de plek aan (alleen kaarten met een markering). Staan ze allebei aan, dan krijgt elke kaart willekeurig een van de twee.
          </InfoHint>
        </div>
        <div className="mt-2 grid gap-2">
          {(
            [
              ["image", "Naam bij afbeelding"],
              ["location", "Plek bij naam"],
            ] as const
          ).map(([key, label]) => {
            const on = study.directions.includes(key);
            const last = on && study.directions.length === 1;
            return (
              <label
                key={key}
                htmlFor={`dir-${key}`}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-full border px-4 text-sm font-semibold",
                  on ? "border-foreground" : "border-border text-muted-foreground",
                  last && "cursor-default",
                )}
              >
                <Checkbox
                  id={`dir-${key}`}
                  checked={on}
                  disabled={last}
                  onCheckedChange={(v) => toggleDirection(key, v === true)}
                  className="size-6 rounded-full"
                />
                {label}
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm font-semibold">Nieuwe kaarten per sessie</p>
          <InfoHint label="Meer over nieuwe kaarten" className="-my-3">
            Hoeveel kaarten die je nog niet eerder zag erbij komen, bovenop de kaarten die aan de beurt zijn. Kies 0 als je alleen wilt herhalen.
          </InfoHint>
        </div>
        <div role="radiogroup" aria-label="Nieuwe kaarten per sessie" className="mt-2 grid grid-cols-3 gap-2">
          {limits.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={study.newLimit === n}
              onClick={() => updateStudy({ ...study, newLimit: n })}
              className={cn(
                "flex h-12 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-transform active:scale-95",
                study.newLimit === n ? cn(touched && "pop", "bg-primary text-primary-foreground") : "bg-secondary text-secondary-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-[30px] border bg-card p-5">
        <div className="flex items-center gap-3">
          <label htmlFor="due-notifications" className="flex-1 cursor-pointer font-display text-xl font-semibold">
            Notificaties
          </label>
          {/* 48px tap target, pulled in so the row is as tall as its text and the card padding matches the others */}
          <InfoHint label="Meer over notificaties" className="-my-3">
            Eén melding per dag als er kaarten aan de beurt zijn en je nog niet hebt geoefend. Alleen als Plexus open
            staat op de achtergrond.
          </InfoHint>
          <Switch
            id="due-notifications"
            checked={notify.enabled && notify.permission === "granted"}
            disabled={!notificationsSupported()}
            onCheckedChange={(on) => void notify.setEnabled(on)}
          />
        </div>
        {!notificationsSupported() && (
          <p className="mt-3 text-sm text-muted-foreground">Deze browser ondersteunt geen meldingen.</p>
        )}
        {notify.permission === "denied" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Meldingen zijn geblokkeerd voor deze site. Sta ze toe in de instellingen van je browser en zet de schakelaar
            daarna weer aan.
          </p>
        )}
      </section>
      <Button variant="outline" size="lg" className="mt-6 w-full" onClick={signOut}>
        Uitloggen
      </Button>
    </div>
  );
}
