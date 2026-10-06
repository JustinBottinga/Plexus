import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Category = Tables<"categories">;
export type Card = Tables<"cards">;
export type Box = { x: number; y: number; w: number; h: number };

export const BUCKET = "card-images";

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
    return { user: u.user, profile: data };
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*, cards(count)")
      .order("created_at");
    if (error) throw error;
    return data.map((c) => ({
      ...c,
      count: (c.cards as unknown as { count: number }[])[0]?.count ?? 0,
    }));
  },
});

export const cardsQuery = (categoryId: string) =>
  queryOptions({
    queryKey: ["cards", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("category_id", categoryId)
        .order("name_nl");
      if (error) throw error;
      return data;
    },
  });

export const cardQuery = (id: string) =>
  queryOptions({
    queryKey: ["card", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

export const signedUrlQuery = (path: string) =>
  queryOptions({
    queryKey: ["signed", path],
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({ ...signedUrlQuery(path ?? ""), enabled: !!path });
}

/** PostgREST returns at most 1000 rows per request, so page through bigger tables. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: Error | null }>) {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

/** Everything study mode needs. Key starts with "cards" so card edits invalidate it too. */
export const studyDataQuery = queryOptions({
  queryKey: ["cards", "study"],
  queryFn: async () => {
    const [cards, reviews, categories] = await Promise.all([
      fetchAll<Card>((a, b) => supabase.from("cards").select("*").order("created_at").range(a, b)),
      fetchAll<Tables<"reviews">>((a, b) => supabase.from("reviews").select("*").range(a, b)),
      supabase.from("categories").select("*").order("created_at"),
    ]);
    if (categories.error) throw categories.error;
    return { cards, reviews, categories: categories.data };
  },
});
