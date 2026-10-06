import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Direction, Rating } from "@/lib/srs";

export type PendingReview = {
  /** Client-generated so a retried insert into review_log can never create a duplicate. */
  id: string;
  user_id: string;
  card_id: string;
  rating: Rating;
  direction: Direction;
  reviewed_at: string;
  review: {
    ease_factor: number;
    interval_days: number;
    repetitions: number;
    due_date: string;
    last_reviewed: string;
  };
};

const KEY = "pending-reviews";
const TOAST_ID = "review-sync";
// Postgres foreign key violation: the card was deleted meanwhile, so there is nothing to save.
const FK_VIOLATION = "23503";

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 4000;

function load(): PendingReview[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list: PendingReview[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: pending writes then only live as long as this page */
  }
}

// Fallback when localStorage is unavailable, so a failed write is still retried within the session.
let memory: PendingReview[] = [];

const read = () => {
  const stored = load();
  return stored.length ? stored : memory;
};
const write = (list: PendingReview[]) => {
  memory = list;
  save(list);
};

async function send(p: PendingReview) {
  const { error: e1 } = await supabase
    .from("reviews")
    .upsert({ card_id: p.card_id, user_id: p.user_id, ...p.review }, { onConflict: "card_id,user_id" });
  if (e1) return e1;
  const { error: e2 } = await supabase.from("review_log").upsert(
    { id: p.id, user_id: p.user_id, card_id: p.card_id, rating: p.rating, direction: p.direction, reviewed_at: p.reviewed_at },
    { onConflict: "id" },
  );
  return e2;
}

/** Saves pending ratings in order. Never throws; on a network error it keeps them and retries later. */
export async function flushPending() {
  if (flushing) return;
  flushing = true;
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    // Entries of another account stay queued until that account is signed in again.
    for (let list = read(); list.some((p) => p.user_id === uid); list = read()) {
      const next = list.find((p) => p.user_id === uid)!;
      const error = await send(next);
      if (error && (error as { code?: string }).code !== FK_VIOLATION) {
        toast.warning("Voortgang opslaan mislukt. We proberen het opnieuw…", { id: TOAST_ID, duration: 8000 });
        clearTimeout(retryTimer);
        retryTimer = setTimeout(flushPending, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
        return;
      }
      // Re-read: new ratings may have been queued while this request was in flight.
      write(read().filter((p) => p.id !== next.id));
      retryDelay = 4000;
      toast.dismiss(TOAST_ID);
    }
  } catch {
    // e.g. fetch rejected while offline
    toast.warning("Voortgang opslaan mislukt. We proberen het opnieuw…", { id: TOAST_ID, duration: 8000 });
    clearTimeout(retryTimer);
    retryTimer = setTimeout(flushPending, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 30000);
  } finally {
    flushing = false;
  }
}

/** Queue a rating and write it straight away; the user never waits for the network. */
export function submitReview(p: PendingReview) {
  write([...read(), p]);
  void flushPending();
}

export function hasPendingReviews() {
  return read().length > 0;
}
