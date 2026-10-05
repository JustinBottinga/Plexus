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

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
