import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState, type DrawingName } from "@/components/EmptyState";
import { RATING_META, ratingTint } from "@/components/AnswerSheet";
import { RATINGS, type Rating } from "@/lib/srs";
import type { ColorKey } from "@/lib/palette";
import { colorOf } from "@/lib/palette";
import { cn } from "@/lib/utils";

/** Full-screen soft-colored shell shared by the loading, empty and summary screens. */
function Shell({ colorKey, children }: { colorKey: string; children: ReactNode }) {
  const color = colorOf(colorKey);
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-5 py-8 text-on-pastel transition-colors duration-700", color.bg)}>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <Shell colorKey="butter">
      <p className="text-center font-display text-2xl font-semibold">Je kaarten worden opgehaald…</p>
    </Shell>
  );
}

export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <Shell colorKey="peach">
      <EmptyState
        onPastel
        drawing="cards"
        color="bg-pastel-surface/60"
        title="Kaarten laden mislukt"
        text="Controleer je verbinding en probeer het opnieuw."
        action={<Button size="lg" onClick={onRetry}>Opnieuw proberen</Button>}
      />
    </Shell>
  );
}

export function CaughtUpScreen({ onMore }: { onMore?: () => void }) {
  return (
    <Shell colorKey="mint">
      <EmptyState
        onPastel
        drawing="check"
        color="bg-pastel-surface/60"
        title="Helemaal bij"
        text="Er staat nu niets klaar. Kom later terug of voeg nieuwe kaarten toe."
        action={
          <div className="flex flex-col gap-3">
            <Button asChild size="lg">
              <Link to="/home">Terug naar start</Link>
            </Button>
            {onMore ? (
              <Button size="lg" variant="pastel" onClick={onMore}>
                Opnieuw controleren
              </Button>
            ) : (
              <Button asChild size="lg" variant="pastel">
                <Link to="/study">Sessie aanpassen</Link>
              </Button>
            )}
          </div>
        }
      />
    </Shell>
  );
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function SummaryScreen({
  colorKey,
  counts,
  elapsedMs,
  onMore,
}: {
  colorKey: ColorKey;
  counts: Record<Rating, number>;
  elapsedMs: number;
  onMore: () => void;
}) {
  const reviewed = RATINGS.reduce((n, r) => n + counts[r], 0);
  return (
    <Shell colorKey={colorKey}>
      <div className="tile animate-in fade-in zoom-in-95 bg-pastel-surface/45 px-6 py-8 text-center duration-500">
        <EmptyState onPastel drawing="star" color="bg-pastel-surface/70" title="Sessie voltooid" className="p-0" />
        <p className="mt-5 text-sm opacity-80">
          <span className="font-display text-5xl font-semibold tabular-nums">{reviewed}</span>
          <br />
          {reviewed === 1 ? "kaart herhaald" : "kaarten herhaald"} in {formatDuration(elapsedMs)}
        </p>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {RATINGS.map((r) => {
            const { label, icon: Icon } = RATING_META[r];
            return (
              <div key={r} className="flex flex-col items-center gap-1.5">
                <span
                  style={{ backgroundColor: ratingTint(colorKey, r) }}
                  className="flex size-12 items-center justify-center rounded-full"
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-display text-xl font-semibold tabular-nums">{counts[r]}</span>
                <span className="text-xs opacity-80">{label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild size="lg">
            <Link to="/home">Terug naar start</Link>
          </Button>
          <Button size="lg" variant="pastel" onClick={onMore}>
            Nog meer leren
          </Button>
        </div>
      </div>
    </Shell>
  );
}

export type { DrawingName };
