import { backendFetch } from "./backend";

export const BACKEND_BASE = (
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://lawyer-backend-9e7q.onrender.com"
).replace(/\/$/, "");

export const JOURNALS = ["SCMR", "PLD", "YLR", "CLC", "PCrLJ", "MLD", "CLD", "PTD", "PLC"];
export const COURTS = [
  "Supreme Court of Pakistan",
  "Federal Shariat Court",
  "Lahore High Court",
  "Sindh High Court",
  "Peshawar High Court",
  "Balochistan High Court",
  "Islamabad High Court",
];

export interface JudgmentResult {
  case_title: string;
  citation: string;
  court: string;
  holding: string;
  pdf_url?: string;
}

export interface StatuteResult {
  canonical_id: string;
  title: string;
  in_force: boolean;
  snippet: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function list(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  const o = (raw ?? {}) as Record<string, unknown>;
  for (const k of ["results", "items", "data", "judgments", "statutes"]) {
    if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
  }
  return [];
}

export function judgmentPdfHref(pdf?: string): string | undefined {
  if (!pdf) return undefined;
  return /^https?:\/\//.test(pdf) ? pdf : `${BACKEND_BASE}${pdf.startsWith("/") ? "" : "/"}${pdf}`;
}

function toJudgment(r: Record<string, unknown>): JudgmentResult {
  return {
    case_title: str(r.case_title ?? r.case_name ?? r.title),
    citation: str(r.citation),
    court: str(r.court),
    holding: str(r.holding ?? r.summary ?? r.ratio_decidendi),
    pdf_url: str(r.pdf_url) || undefined,
  };
}

export async function searchJudgments(
  kind: "citation" | "keyword" | "intelligent",
  body: Record<string, unknown>,
): Promise<JudgmentResult[]> {
  const raw = await backendFetch<unknown>(`/api/search/judgments/${kind}`, { json: body });
  return list(raw).map(toJudgment);
}

export async function searchStatutes(query: string): Promise<StatuteResult[]> {
  const raw = await backendFetch<unknown>(`/api/search/statutes?query=${encodeURIComponent(query)}`);
  return list(raw).map((r) => ({
    canonical_id: str(r.canonical_id ?? r.id),
    title: str(r.title ?? r.provision_title ?? r.heading),
    in_force: r.in_force !== false,
    snippet: str(r.snippet ?? r.excerpt ?? r.text),
  }));
}

export async function getStatute(id: string): Promise<{ title: string; text: string }> {
  const r = await backendFetch<Record<string, unknown>>(`/api/statutes/${encodeURIComponent(id)}`);
  return {
    title: str(r.title ?? r.provision_title ?? r.heading),
    text: str(r.text ?? r.full_text ?? r.content ?? r.body),
  };
}
