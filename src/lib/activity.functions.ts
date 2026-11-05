import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireClerkAuth } from "@/integrations/clerk/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

// Activity is read/written server-side with the service-role client and keyed
// by the Clerk user id provided by requireClerkAuth.
async function getAdminClient(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export interface ActivityRecord {
  id: string;
  thread_id: string;
  mode: string;
  question: string;
  response: Json;
  created_at: string;
  category: string;
}

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { threadId: string; mode: string; question: string; response: unknown; category?: string }) =>
    z
      .object({
        threadId: z.string().uuid(),
        mode: z.string().max(40),
        question: z.string().max(20000),
        response: z.unknown(),
        category: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminClient();
    const { data: row, error } = await sb
      .from("activity_log")
      .insert({
        user_id: context.userId,
        thread_id: data.threadId,
        mode: data.mode,
        question: data.question,
        response: (data.response ?? null) as never,
        category: data.category ?? "general",
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string; created_at: string };
  });

export const listMyActivity = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }): Promise<ActivityRecord[]> => {
    const sb = await getAdminClient();
    const { data } = await sb
      .from("activity_log")
      .select("id, thread_id, mode, question, response, created_at, category")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(300);
    return (data ?? []) as ActivityRecord[];
  });
