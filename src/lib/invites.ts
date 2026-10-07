import { supabase } from "@/integrations/supabase/client";
import { BUCKET } from "@/lib/data";

export type Invite = { id: string; token: string; expires_at: string };

export function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}

/** The newest invite for this category that still works, or a fresh one. */
export async function getOrCreateInvite(categoryId: string): Promise<Invite> {
  const { data: existing, error } = await supabase
    .from("category_invites")
    .select("id, token, expires_at")
    .eq("category_id", categoryId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const { data, error: insertError } = await supabase
    .from("category_invites")
    .insert({ category_id: categoryId })
    .select("id, token, expires_at")
    .single();
  if (insertError) throw insertError;
  return data;
}

/** Stops the link from working. People who already added the category keep their copy. */
export async function revokeInvites(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from("category_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("category_id", categoryId)
    .is("revoked_at", null);
  if (error) throw error;
}

/**
 * Accepting an invite copies the cards, but they still point at the sender's images. Copy those into
 * the recipient's own folder so the cards keep working when the sender deletes theirs.
 * Best effort: a card whose image can't be copied keeps pointing at the original.
 * Returns how many images could not be copied.
 */
export async function copyImagesToOwnFolder(categoryId: string, userId: string): Promise<number> {
  const { data: cards, error } = await supabase
    .from("cards")
    .select("id, image_path")
    .eq("category_id", categoryId)
    .not("image_path", "is", null);
  if (error) throw error;

  let failed = 0;
  for (const card of cards) {
    const from = card.image_path;
    if (!from || from.startsWith(`${userId}/`)) continue;
    try {
      const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(from);
      if (downloadError) throw downloadError;
      const ext = from.split(".").pop()?.toLowerCase() || "jpg";
      const to = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(to, blob, blob.type ? { contentType: blob.type } : {});
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from("cards").update({ image_path: to }).eq("id", card.id);
      if (updateError) {
        await supabase.storage.from(BUCKET).remove([to]);
        throw updateError;
      }
    } catch {
      failed++;
    }
  }
  return failed;
}

const REDIRECT_KEY = "post-auth-redirect";

/** Only same-site paths: never follow a redirect to another host. */
export function safeRedirect(target: unknown): string | null {
  return typeof target === "string" && /^\/(?![/\\])/.test(target) ? target : null;
}

/** Remember where to go after logging in (also across the Google redirect, which leaves the page). */
export function rememberRedirect(target: string | null) {
  try {
    if (target) sessionStorage.setItem(REDIRECT_KEY, target);
    else sessionStorage.removeItem(REDIRECT_KEY); // don't act on an invite abandoned earlier
  } catch {
    /* storage unavailable: the user just lands on the home screen */
  }
}

export function takeRedirect(): string | null {
  try {
    const target = safeRedirect(sessionStorage.getItem(REDIRECT_KEY));
    sessionStorage.removeItem(REDIRECT_KEY);
    return target;
  } catch {
    return null;
  }
}
