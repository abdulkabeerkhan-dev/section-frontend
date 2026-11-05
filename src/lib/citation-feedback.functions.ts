import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireClerkAuth } from "@/integrations/clerk/auth-middleware";

export const ISSUE_TYPES = [
  { value: "broken", label: "Broken" },
  { value: "thin", label: "Thin or missing text" },
  { value: "wrong_court", label: "Wrong court or category" },
  { value: "wrong_citation", label: "Wrong citation" },
  { value: "other", label: "Other" },
] as const;

export const reportCitationIssue = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        caseId: z.string().max(200).nullish(),
        citation: z.string().max(500).nullish(),
        court: z.string().max(200).nullish(),
        caseTitle: z.string().max(500).nullish(),
        queryText: z.string().max(20000).nullish(),
        issueType: z.enum(["broken", "thin", "wrong_court", "wrong_citation", "other"]),
        note: z.string().max(2000).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as unknown as SupabaseClient;
    const { error } = await sb.from("citation_feedback").insert({
      user_id: context.userId,
      case_id: data.caseId ?? null,
      citation: data.citation ?? null,
      court: data.court ?? null,
      case_title: data.caseTitle ?? null,
      query_text: data.queryText ?? null,
      issue_type: data.issueType,
      note: data.note?.trim() ? data.note.trim() : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
