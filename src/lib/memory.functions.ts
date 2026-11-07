import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import process from "node:process";
import { z } from "zod";

import { requireClerkAuth } from "@/integrations/clerk/auth-middleware";

// Memory is read/written server-side with the service-role client (RLS bypassed)
// and keyed by the Clerk user id provided by requireClerkAuth.
async function getAdminClient(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export const MEMORY_CATEGORIES = [
  "practice_area",
  "court",
  "drafting_style",
  "personal",
  "other",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface MemoryRecord {
  id: string;
  category: MemoryCategory;
  content: string;
  source: "learned" | "manual";
  created_at: string;
  updated_at: string;
}

function normalizeCategory(value: string): MemoryCategory {
  return (MEMORY_CATEGORIES as readonly string[]).includes(value)
    ? (value as MemoryCategory)
    : "other";
}

export const listMyMemory = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }): Promise<MemoryRecord[]> => {
    try {
      const sb = await getAdminClient();
      const { data } = await sb
        .from("user_memory")
        .select("id, category, content, source, created_at, updated_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true });
      return ((data ?? []) as MemoryRecord[]).map((r) => ({
        ...r,
        category: normalizeCategory(r.category),
      }));
    } catch (err) {
      console.warn("[memory] listMyMemory fallback:", err);
      return [];
    }
  });

export const addMemory = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { category: string; content: string }) =>
    z
      .object({
        category: z.enum(MEMORY_CATEGORIES),
        content: z.string().trim().min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminClient();
    const { data: row, error } = await sb
      .from("user_memory")
      .insert({
        user_id: context.userId,
        category: data.category,
        content: data.content,
        source: "manual",
      })
      .select("id, category, content, source, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row as MemoryRecord;
  });

export const updateMemory = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string; category?: string; content?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        category: z.enum(MEMORY_CATEGORIES).optional(),
        content: z.string().trim().min(1).max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminClient();
    const patch: Record<string, string> = {};
    if (data.category) patch.category = data.category;
    if (data.content) patch.content = data.content;
    const { error } = await sb
      .from("user_memory")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await getAdminClient();
    const { error } = await sb
      .from("user_memory")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

interface ExtractedFact {
  category: MemoryCategory;
  content: string;
}

async function extractFacts(
  question: string,
  answerSummary: string,
  existing: string[],
): Promise<ExtractedFact[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return [];

  const system = [
    "You analyse a Pakistani lawyer's chat with a legal assistant and extract DURABLE facts worth remembering long-term.",
    "Only capture stable preferences and personal/professional facts, never one-off case details.",
    "Categories: practice_area (areas of law they work in), court (courts/jurisdictions they appear in), drafting_style (tone/format preferences for drafts), personal (firm name, seniority, role, recurring clients, anything personal they share), other.",
    "Return concise facts phrased about the user, e.g. 'Practises family law' or 'Prefers concise, citation-heavy drafts'.",
    "Do NOT repeat anything already known. Return an empty list if nothing new and durable is present.",
  ].join(" ");

  const userMsg = [
    existing.length ? `Already known about the user:\n- ${existing.join("\n- ")}` : "Nothing known yet.",
    `\nLawyer's message:\n${question}`,
    `\nAssistant answer (summary):\n${answerSummary}`,
    "\nExtract new durable facts as JSON.",
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_facts",
              description: "Save new durable facts about the user.",
              parameters: {
                type: "object",
                properties: {
                  facts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: MEMORY_CATEGORIES },
                        content: { type: "string" },
                      },
                      required: ["category", "content"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["facts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_facts" } },
      }),
    });

    if (!res.ok) return [];
    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{ function?: { arguments?: string } }>;
        };
      }>;
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return [];
    const parsed = JSON.parse(args) as { facts?: ExtractedFact[] };
    return (parsed.facts ?? [])
      .filter((f) => f && typeof f.content === "string" && f.content.trim().length > 0)
      .map((f) => ({
        category: normalizeCategory(f.category),
        content: f.content.trim().slice(0, 500),
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

export const learnFromExchange = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { question: string; answerSummary: string }) =>
    z
      .object({
        question: z.string().trim().min(1).max(8000),
        answerSummary: z.string().trim().max(8000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await getAdminClient();

    const { data: existingRows } = await sb
      .from("user_memory")
      .select("content")
      .eq("user_id", context.userId);
    const existing = ((existingRows ?? []) as { content: string }[]).map((r) => r.content);
    const existingLower = new Set(existing.map((c) => c.toLowerCase().trim()));

    const facts = await extractFacts(data.question, data.answerSummary, existing);
    const fresh = facts.filter((f) => !existingLower.has(f.content.toLowerCase().trim()));
    if (fresh.length === 0) return { added: 0 };

    const { error } = await sb.from("user_memory").insert(
      fresh.map((f) => ({
        user_id: context.userId,
        category: f.category,
        content: f.content,
        source: "learned",
      })),
    );
    if (error) return { added: 0 };
    return { added: fresh.length };
  });
