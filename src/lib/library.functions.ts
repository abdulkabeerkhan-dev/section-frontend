import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Json } from "@/integrations/supabase/types";
import { requireClerkAuth } from "@/integrations/clerk/auth-middleware";

async function db(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export interface SavedPrecedent {
  id: string;
  card_key: string;
  citation: string;
  case_title: string;
  card: Json;
  tags: string[];
  matter: string;
  note: string;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: Json;
  created_at: string;
}

const tagList = z.array(z.string().trim().min(1).max(40)).max(20);

export const listSavedPrecedents = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }): Promise<SavedPrecedent[]> => {
    try {
      const { data, error } = await (await db())
        .from("saved_precedents")
        .select("id, card_key, citation, case_title, card, tags, matter, note, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return [];
      return (data ?? []) as SavedPrecedent[];
    } catch (err) {
      console.warn("[library] listSavedPrecedents fallback:", err);
      return [];
    }
  });

export const savePrecedent = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cardKey: z.string().min(1).max(300),
        citation: z.string().max(300),
        caseTitle: z.string().max(1000),
        card: z.record(z.string(), z.unknown()),
        tags: tagList,
        matter: z.string().max(200),
        note: z.string().max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (await db()).from("saved_precedents").upsert(
      {
        user_id: context.userId,
        card_key: data.cardKey,
        citation: data.citation,
        case_title: data.caseTitle,
        card: data.card,
        tags: data.tags,
        matter: data.matter,
        note: data.note,
      },
      { onConflict: "user_id,card_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeSavedPrecedent = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) => z.object({ cardKey: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (await db())
      .from("saved_precedents")
      .delete()
      .eq("user_id", context.userId)
      .eq("card_key", data.cardKey);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSavedSearches = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }): Promise<SavedSearch[]> => {
    try {
      const { data, error } = await (await db())
        .from("saved_searches")
        .select("id, name, filters, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as SavedSearch[];
    } catch (err) {
      console.warn("[library] listSavedSearches fallback:", err);
      return [];
    }
  });

export const createSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().min(1).max(80), filters: z.record(z.string(), z.unknown()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (await db())
      .from("saved_searches")
      .insert({ user_id: context.userId, name: data.name, filters: data.filters });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (await db())
      .from("saved_searches")
      .delete()
      .eq("user_id", context.userId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
