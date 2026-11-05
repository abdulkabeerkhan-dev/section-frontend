import type { GenerateResponse } from "@/lib/api";

/** Short, human summary of an assistant answer — used for thread continuity and learning. */
export function summarizeResponse(res: GenerateResponse | null): string {
  if (!res) return "";
  const parts: string[] = [];
  if (res.issues?.length) parts.push(`Issues: ${res.issues.slice(0, 4).join("; ")}`);
  if (res.cases?.length) {
    const names = res.cases.slice(0, 4).map((c) => `${c.title} (${c.citation})`);
    parts.push(`Precedents: ${names.join("; ")}`);
  }
  if (res.document_text) parts.push("A court-ready document was drafted.");
  return parts.join(". ").slice(0, 1200);
}

export interface PriorTurn {
  question: string;
  answerSummary: string;
}

/**
 * Builds the text sent to the external backend. The API contract is unchanged —
 * we only enrich the `question` string with what Section knows about the lawyer
 * and the earlier turns of the current conversation, so answers stay personal
 * and the chat feels continuous.
 */
const STYLE_GUIDE = `[Answer style: write for a practising lawyer. Match the length to the question — a narrow or factual question gets a short, direct answer of a few sentences, with no template sections ("What This Means", "Next Steps", "Legal Landscape") unless they genuinely add something. Only broad or multi-part questions get headings, and then use them to organise the answer rather than to pad it. Never output a heading with nothing under it, and never output an empty "Sources" block. State any caveat or disclaimer at most once. Use plain, precise language — no filler, no repetition of the question back to the user. Discuss each case under its own "### <case name>" heading so the cases stay separate. Finish every sentence and section; if you must stop early, say so explicitly on the last line.]`;

export function enrichQuestion(opts: {
  question: string;
  memories: string[];
  priorTurns: PriorTurn[];
}): string {
  const blocks: string[] = [];

  if (opts.memories.length) {
    blocks.push(
      `[What you know about this lawyer: ${opts.memories.slice(0, 20).join("; ")}.]`,
    );
  }

  if (opts.priorTurns.length) {
    const convo = opts.priorTurns
      .slice(-4)
      .map((t) => `Q: ${t.question}\nA: ${t.answerSummary || "(answered)"}`)
      .join("\n\n");
    blocks.push(`[Earlier in this conversation:\n${convo}]`);
  }

  blocks.push(STYLE_GUIDE);
  blocks.push(opts.question.trim());
  return blocks.join("\n\n");
}

