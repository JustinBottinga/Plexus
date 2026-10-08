import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signedUrlQuery, studyDataQuery, useSignedUrl, type Box, type Card } from "@/lib/data";
import { colorOf, type ColorKey } from "@/lib/palette";
import { assignDirections, buildQueue, isHit } from "@/lib/queue";
import { submitReview } from "@/lib/reviewWriter";
import { addDays, INITIAL_STATE, nextState, previewIntervals, RATINGS, todayLocal, type Direction, type Rating, type SrsState } from "@/lib/srs";
import { AnswerSheet } from "@/components/AnswerSheet";
import { StudyStage } from "@/components/StudyStage";
import { CaughtUpScreen, ErrorScreen, LoadingScreen, SummaryScreen } from "@/components/StudyScreens";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type Phase = "loading" | "error" | "empty" | "studying" | "done";
const NO_COUNTS: Record<Rating, number> = { again: 0, hard: 0, good: 0, easy: 0 };

export function StudySession({
  categoryIds,
  directions,
  newLimit,
  practice = false,
}: {
  categoryIds: string[] | null;
  directions: Direction[];
  newLimit: number;
  /** Re-practise everything in the selection; ratings don't touch the review schedule. */
  practice?: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [queue, setQueue] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tap, setTap] = useState<{ x: number; y: number } | null>(null);
  const [counts, setCounts] = useState(NO_COUNTS);
  const [colors, setColors] = useState<Map<string, string>>(new Map());
  const [lastColor, setLastColor] = useState<ColorKey>("butter");
  const [confirmClose, setConfirmClose] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const states = useRef(new Map<string, SrsState>());
  const userId = useRef<string | null>(null);
  const startedAt = useRef(Date.now());
  const loadId = useRef(0);
  const opts = useRef({ categoryIds, directions, newLimit, practice });
  opts.current = { categoryIds, directions, newLimit, practice };
  // Each card is asked in one direction for the whole session (also when it comes back after "Again")
  const [dirOf, setDirOf] = useState<Map<string, Direction>>(new Map());

  const load = useCallback(async () => {
    const mine = ++loadId.current;
    setPhase("loading");
    try {
      const [data, auth] = await Promise.all([qc.fetchQuery({ ...studyDataQuery, staleTime: 0 }), supabase.auth.getUser()]);
      if (mine !== loadId.current) return;
      userId.current = auth.data.user?.id ?? null;
      states.current = new Map(
        data.reviews.map((r) => [r.card_id, { ease_factor: r.ease_factor, interval_days: r.interval_days, repetitions: r.repetitions }]),
      );
      setColors(new Map(data.categories.map((c) => [c.id, c.color])));
      const q = buildQueue({ cards: data.cards, reviews: data.reviews, today: todayLocal(), ...opts.current });
      setQueue(q);
      setDirOf(assignDirections(q, opts.current.directions));
      setIdx(0);
      setRevealed(false);
      setTap(null);
      setCounts(NO_COUNTS);
      startedAt.current = Date.now();
      setPhase(q.length ? "studying" : "empty");
    } catch {
      if (mine === loadId.current) setPhase("error");
    }
  }, [qc]);

  useEffect(() => {
    void load();
    // Home and the setup screen show due counts: refresh them when the session closes.
    return () => void qc.invalidateQueries({ queryKey: ["cards"] });
  }, [load, qc]);

  const card = phase === "studying" ? queue[idx] : undefined;
  const direction: Direction = (card && dirOf.get(card.id)) || directions[0] || "image";
  const colorKey = (colors.get(card?.category_id ?? "") ?? lastColor) as ColorKey;
  const color = colorOf(colorKey);
  const { data: url } = useSignedUrl(card?.image_path);
  const marker = (card?.marker as Box | null) ?? null;
  const covers = (card?.covers as Box[] | null) ?? [];

  useEffect(() => {
    if (card) setLastColor(colorKey);
  }, [card, colorKey]);

  // Warm the next image so the next card appears instantly
  useEffect(() => {
    const path = queue[idx + 1]?.image_path;
    if (!path) return;
    void qc.prefetchQuery(signedUrlQuery(path)).then(() => {
      const next = qc.getQueryData<string>(signedUrlQuery(path).queryKey);
      if (next) new Image().src = next;
    });
  }, [qc, queue, idx]);

  // Skip cards that were deleted (on another device, say) while the session is running
  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => {
    if (phase !== "studying") return;
    const ids = [...new Set(queueRef.current.slice(idx, idx + 50).map((c) => c.id))];
    if (!ids.length) return;
    let cancelled = false;
    void supabase
      .from("cards")
      .select("id")
      .in("id", ids)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const alive = new Set(data.map((d) => d.id));
        const gone = new Set(ids.filter((id) => !alive.has(id)));
        if (!gone.size) return;
        const before = queueRef.current;
        const after = before.filter((c, i) => i < idx || !gone.has(c.id));
        setQueue(after);
        queueRef.current = after;
        if (idx >= after.length) finish();
        else if (after[idx]?.id !== before[idx]?.id) {
          setRevealed(false);
          setTap(null);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  function finish() {
    setElapsed(Date.now() - startedAt.current);
    setPhase("done");
  }

  function rate(r: Rating) {
    if (!card || !revealed) return;
    // Practice mode never touches the review schedule
    if (!practice) {
      const prev = states.current.get(card.id) ?? INITIAL_STATE;
      const next = nextState(prev, r);
      states.current.set(card.id, next);
      const now = new Date();
      if (userId.current) {
        submitReview({
          id: crypto.randomUUID(),
          user_id: userId.current,
          card_id: card.id,
          rating: r,
          direction,
          reviewed_at: now.toISOString(),
          review: {
            ...next,
            due_date: addDays(todayLocal(now), next.interval_days),
            last_reviewed: now.toISOString(),
          },
        });
      } else {
        toast.error("Je bent uitgelogd. Log opnieuw in om je voortgang op te slaan.");
      }
    }
    setCounts((c) => ({ ...c, [r]: c[r] + 1 }));

    // "Again" puts the card at the end of this session
    const nextQueue = r === "again" ? [...queue, card] : queue;
    if (r === "again") setQueue(nextQueue);
    if (idx + 1 >= nextQueue.length) {
      finish();
      return;
    }
    setIdx(idx + 1);
    setRevealed(false);
    setTap(null);
  }

  function onTap(p: { x: number; y: number }) {
    setTap(p);
    setRevealed(true);
  }

  const verdict =
    direction === "location" && revealed ? (tap && marker && isHit(tap, marker) ? "right" : "wrong") : null;
  const suggested: Rating | null = direction === "location" && revealed ? (verdict === "right" ? "good" : "again") : null;

  // Keyboard: Space reveals, 1-4 rate. Read through a ref so the listener is attached once.
  const latest = useRef({ phase, revealed, confirmClose, rate });
  latest.current = { phase, revealed, confirmClose, rate };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = latest.current;
      if (s.phase !== "studying" || s.confirmClose || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!s.revealed) setRevealed(true);
      } else if (s.revealed && e.key >= "1" && e.key <= "4") {
        s.rate(RATINGS[Number(e.key) - 1]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (phase === "loading") return <LoadingScreen />;
  if (phase === "error") return <ErrorScreen onRetry={load} />;
  if (phase === "empty") return <CaughtUpScreen onMore={load} />;
  if (phase === "done") return <SummaryScreen colorKey={lastColor} counts={counts} elapsedMs={elapsed} onMore={load} />;
  if (!card) return null;

  const hasNext = idx + 1 < queue.length;
  const state = states.current.get(card.id) ?? INITIAL_STATE;

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col overflow-hidden text-on-pastel transition-colors duration-700", color.bg)}>
      <header className="mx-auto flex w-full max-w-xl items-center gap-3 px-5 pt-4">
        <button
          type="button"
          onClick={() => setConfirmClose(true)}
          aria-label="Sessie sluiten"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pastel-surface/60 transition-transform active:scale-90"
        >
          <X className="size-5" />
        </button>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-valuenow={idx}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-pastel-surface/50"
        >
          <div className="h-full rounded-full bg-on-pastel transition-[width] duration-700 ease-out" style={{ width: `${(idx / queue.length) * 100}%` }} />
        </div>
        <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
          {idx + 1} / {queue.length}
        </span>
        {practice && (
          <span className="shrink-0 rounded-full bg-pastel-surface/60 px-3 py-1 text-xs font-semibold">Oefenen</span>
        )}
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col justify-center px-5 py-3">
        {direction === "location" && (
          <div className="mb-3 px-1">
            <h1 className="font-display text-3xl font-semibold leading-tight">{card.name_nl}</h1>
            {card.name_latin && <p className="text-lg italic text-on-pastel-muted">{card.name_latin}</p>}
          </div>
        )}
        <div className="relative">
          {hasNext && (
            <>
              <div aria-hidden className="absolute inset-x-2 inset-y-3 rotate-3 rounded-[32px] bg-pastel-surface/35" />
              <div aria-hidden className="absolute inset-x-3 inset-y-2 -rotate-3 rounded-[32px] bg-pastel-surface/25" />
            </>
          )}
          <div
            key={`${card.id}-${idx}`}
            className={cn(
              "relative animate-in fade-in duration-200",
              // A slight tilt, but not while tapping: tap coordinates need an upright image
              direction === "image" && "-rotate-1",
            )}
          >
            {url ? (
              <StudyStage
                src={url}
                marker={marker}
                covers={covers}
                showMarker={direction === "image" || revealed}
                maxHeight={revealed ? "30svh" : direction === "image" ? "46svh" : "38svh"}
                tap={direction === "location" ? tap : null}
                verdict={verdict}
                onTap={direction === "location" && !revealed ? onTap : undefined}
              />
            ) : (
              <div className={cn("flex aspect-[4/3] w-full animate-pulse items-center justify-center rounded-[32px] bg-stage/60 text-sm")}>
                {card.image_path ? "Afbeelding laden…" : "Geen afbeelding"}
              </div>
            )}
          </div>
        </div>
      </main>

      {revealed ? (
        <AnswerSheet card={card} color={colorKey} verdict={verdict} suggested={suggested} intervals={previewIntervals(state)} onRate={rate} />
      ) : (
        <footer className="mx-auto w-full max-w-xl px-5 pb-6 pt-2">
          {direction === "image" ? (
            <Button size="lg" className="w-full" aria-keyshortcuts="Space" onClick={() => setRevealed(true)}>
              Toon antwoord
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium">Tik op de plek in de afbeelding</p>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="flex h-12 items-center rounded-full bg-pastel-surface/60 px-6 text-sm font-semibold transition-transform active:scale-95"
              >
                Ik weet het niet
              </button>
            </div>
          )}
        </footer>
      )}

      <Drawer open={confirmClose} onOpenChange={setConfirmClose} shouldScaleBackground={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Sessie afsluiten?</DrawerTitle>
            <DrawerDescription>
              {practice ? "Oefenen verandert je planning niet." : "Je voortgang is al opgeslagen."}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button size="lg" onClick={() => navigate({ to: "/study" })}>
              Sessie afsluiten
            </Button>
            <Button size="lg" variant="outline" onClick={() => setConfirmClose(false)}>
              Doorgaan met leren
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
