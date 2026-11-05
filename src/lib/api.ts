import { toast } from "sonner";
import { extractCitation } from "@/lib/case-title";

export type Mode = "research" | "draft";
export type Relevance = "high" | "medium" | "low";

export type BackendMode =
  | "simple_query"
  | "caselaw_search"
  | "judgment_lookup"
  | "drafting"
  | "document_analysis"
  | "intake";

export interface CaseResult {
  title: string;
  citation: string;
  court: string;
  year: number;
  summary: string;
  relevance: Relevance;
  source_url: string;
  case_id: string;
  score: number;
  preview: string;
  /** Optional structured judgment metadata returned by the backend. */
  outcome: string;
  parties: string;
  holding: string;
  relied_on: string;
  author_judges: string[];
  bench_type: string;
  statutes: string[];
  sections: string[];
  verified: boolean;
  /** URL to the official judgment PDF, if available. */
  pdf_url?: string;
}

/** A statute referenced by a precedent card. */
export interface StatuteRef {
  name: string;
  explanation: string;
}

/** Party roles for a structured precedent card. */
export interface CaseParties {
  initiator: string;
  initiator_role: string;
  defender: string;
  defender_role: string;
}

/** Structured precedent card returned by the backend (`result.precedent_cards`). */
export interface PrecedentCard {
  case_name: string;
  /** Cleaner official case title, if provided separately from case_name. */
  case_title?: string;
  /** Raw title payload from the backend, used as a fallback cleaner source. */
  title?: string;
  citation: string;
  /** Date the judgment was decided (ISO or readable string). */
  date: string;
  /** Court docket / diary number, if available. */
  docket_number?: string;
  /** ISO/readable decision date supplied by the backend; falls back to `date`. */
  decision_date?: string;
  outcome: string;
  verified_source: boolean;
  issue: string;
  holding: string;
  why_relevant: string;
  ratio_decidendi?: string;
  year?: number;
  statutes_invoked: StatuteRef[];
  raw_judgment_text: string;
  source_url: string;
  /** Backend case identifier used to fetch the full judgment text. */
  case_id: string;
  /** Stable judgment identifier used for GET /judgment/{id}. */
  judgment_id?: string;
  /** Deciding court, if the backend supplies it. */
  court?: string;
  /** URL to the official judgment PDF, if available. */
  pdf_url?: string;
  /** Moving and opposing parties. */
  parties?: CaseParties;
  /** Highlighted final order / disposition text. */
  operative_result?: string;
  /** Alias for the final order / disposition text. */
  final_result?: string;
  /** Current treatment of this authority, such as overruled or distinguished. */
  precedent_status?: string;
  /** Human-readable explanation of the authority's negative treatment. */
  precedent_status_warning?: string;
  /** Citation of the later controlling authority. */
  superseding_citation?: string;
  /** Case name of the later controlling authority. */
  superseding_case_name?: string;
  /** e.g. "Binding Supreme Court Precedent (Article 189)". */
  authority_strength?: string;
  /** Retrieval source: Supabase, Pinecone, BM25. */
  source_type?: string;
  /** Key paragraphs of the judgment highlighted by the backend. */
  important_paragraphs?: string[];
}

export interface GenerateResponse {
  issues: string[];
  cases: CaseResult[];
  /** Structured precedent cards; preferred over `cases` when present. */
  precedent_cards: PrecedentCard[];
  document_text: string | null;
  doc_id: string | null;
  mode: BackendMode | null;
  /** Job id of the async query, used to continue a truncated answer. */
  job_id: string | null;
  /** Backend flag: the answer was cut short by the output token limit. */
  truncated: boolean;
  /** Response-level treatment warning for the legal opinion. */
  precedent_status?: string;
  precedent_status_warning?: string;
  superseding_citation?: string;
  superseding_case_name?: string;
}


export interface QueryImage {
  image_base64: string;
  image_mime_type: string;
}

/** A non-image document (PDF/DOCX) sent to the backend as base64. */
export interface QueryDocument {
  name: string;
  mime_type: string;
  /** Raw base64 payload (no data: prefix). */
  fileData: string;
  base64: string;
}

export interface UserQuotaResponse {
  text_queries_used: number;
  text_queries_limit: number;
  text_queries_remaining: number;
  vision_queries_used: number;
  vision_queries_limit: number;
  vision_queries_remaining: number;
  reset_time_iso: string | null;
}

/** Thrown when the backend returns 429 (daily usage limit reached). */
export class QuotaExceededError extends Error {
  resetTimeIso: string | null;
  constructor(message: string, resetTimeIso: string | null = null) {
    super(message);
    this.name = "QuotaExceededError";
    this.resetTimeIso = resetTimeIso;
  }
}

/** One prior conversation turn sent to the backend for context. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Jurisprudence era filter chosen by the lawyer. */
export type JurisprudenceEra = "all" | "modern" | "apex";

/** Cut-off year used for the "Modern Jurisprudence" era filter. */
export const MODERN_MIN_YEAR = 2018;

/** Court used for the "Apex Precedents Only" era filter. */
export const APEX_COURT = "Supreme Court of Pakistan";

/** Human labels for each jurisprudence era option. */
export const ERA_LABELS: Record<JurisprudenceEra, string> = {
  all: "All Authorities",
  modern: "Modern Jurisprudence (2018–Present)",
  apex: "Apex Precedents Only (Supreme Court)",
};

export interface GenerateRequest {
  question: string;
  mode: Mode;
  doc_type?: string;
  court?: string;
  year_from?: number;
  year_to?: number;
  max_cases: number;
  has_attachment?: boolean;
  attachment_name?: string;
  attachment_names?: string[];
  category?: string;
  images?: QueryImage[];
  /** Non-image documents (PDF/DOCX) sent as base64. */
  documents?: QueryDocument[];
  /** Optional explicit backend mode override selected by the user. */
  backend_mode?: BackendMode;
  /** Prior conversation turns, so follow-ups keep intake context. */
  messages?: ChatMessage[];
  /** Restrict retrieval to a jurisprudence era (recency / landmark authority). */
  era?: JurisprudenceEra;
  /** Active assistant persona (Ark = research, Mike = drafting). */
  assistant?: "ark" | "mike";
}

/** Build the era-specific filter payload sent to the backend. */
function eraPayload(era: JurisprudenceEra | undefined): Record<string, unknown> {
  if (era === "modern") {
    return {
      era: "modern",
      min_year: MODERN_MIN_YEAR,
      year_from: MODERN_MIN_YEAR,
      filters: { decision_date: { gte: `${MODERN_MIN_YEAR}-01-01` } },
      metadata_filter: { decision_date: { $gte: `${MODERN_MIN_YEAR}-01-01` } },
    };
  }
  if (era === "apex") {
    return {
      era: "apex",
      court_filter: APEX_COURT,
      court: APEX_COURT,
      filters: { court: APEX_COURT },
      metadata_filter: { court: { $eq: APEX_COURT } },
    };
  }
  return {};
}

// Strictly use the live backend URL. No local simulation fallback.
const BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://lawyer-backend-production-3b52.up.railway.app";
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

function base(): string | undefined {
  return BASE_URL ? BASE_URL.replace(/\/$/, "") : undefined;
}

/** Obsolete backend hosts whose PDF links no longer work. */
const STALE_PDF_HOST = /\.up\.railway\.app/i;

/** Public PDF stream endpoint on the active backend (no auth required). */
export function judgmentPdfUrl(judgmentId: string | undefined | null): string | undefined {
  const b = base();
  if (!b || !judgmentId) return undefined;
  return `${b}/api/judgments/${encodeURIComponent(judgmentId)}/pdf`;
}

/**
 * Use the backend-provided pdf_url as-is. If it points at an obsolete
 * deployment, rebuild it from the active backend; otherwise fall back to the
 * public /api/judgments/{id}/pdf endpoint.
 */
export function resolvePdfUrl(
  pdfUrl: string | undefined | null,
  judgmentId: string | undefined | null,
): string | undefined {
  if (pdfUrl && !STALE_PDF_HOST.test(pdfUrl)) return pdfUrl;
  return judgmentPdfUrl(judgmentId);
}

export function isApiConfigured(): boolean {
  return Boolean(BASE_URL);
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true", ...extra };
  if (API_KEY) headers["x-api-key"] = API_KEY;
  return headers;
}

export async function checkHealth(): Promise<boolean> {
  const b = base();
  if (!b) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${b}/health`, {
      method: "GET",
      headers: authHeaders(),
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && typeof data === "object" && (data as { status?: string }).status === "ok");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Error thrown when the user (or caller) aborts an in-flight query. */
export class QueryAbortedError extends Error {
  constructor() {
    super("Query was cancelled.");
    this.name = "QueryAbortedError";
  }
}

const POLL_INTERVAL_MS = 2000;

function handleErrorBody(parsed: unknown, status: number): never {
  let message = `Request failed (${status}).`;
  let resetTimeIso: string | null = null;
  if (parsed && typeof parsed === "object") {
    const data = parsed as Record<string, unknown>;
    if ("error" in data && data.error) message = String(data.error);
    else if ("message" in data && data.message) message = String(data.message);
    if (typeof data.reset_time_iso === "string") resetTimeIso = data.reset_time_iso;
  }
  if (status === 429) {
    throw new QuotaExceededError(
      message === `Request failed (429).` ? "Daily usage limit reached." : message,
      resetTimeIso,
    );
  }
  throw new Error(message);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new QueryAbortedError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new QueryAbortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Read the SSE stream for a job. Resolves with the final result record, or
 * null when streaming is unavailable / incomplete (caller should poll).
 */
async function readQueryStream(
  b: string,
  jobId: string,
  token: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const encodedId = encodeURIComponent(jobId);
  let res: Response;
  try {
    // Production backend exposes GET /query/stream/{job_id}; older builds
    // exposed GET /query/{job_id}/stream. Try the current route first.
    res = await fetch(`${b}/query/stream/${encodedId}`, {
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      signal,
    });
    if (res.status === 404) {
      res = await fetch(`${b}/query/${encodedId}/stream`, {
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        signal,
      });
    }
  } catch (err) {
    if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
      throw new QueryAbortedError();
    }
    return null;
  }

  if (!res.ok || !res.body) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let final: Record<string, unknown> | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payloadStr = trimmed.replace(/^data:\s*/, "");
        if (payloadStr === "[DONE]") {
          return final;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(payloadStr);
        } catch {
          continue; // partial or non-JSON chunk
        }
        if (!parsed || typeof parsed !== "object") continue;

        const data = parsed as Record<string, unknown>;
        const status = asString(data.status)?.toLowerCase();

        if (status === "error" || status === "failed") {
          throw new Error(
            asString(data.error) ?? asString(data.message) ?? "The query failed. Please try again.",
          );
        }

        if (
          (status === "done" ||
            status === "completed" ||
            status === "complete" ||
            status === "success" ||
            status === "succeeded" ||
            status === "finished") &&
          data.result &&
          typeof data.result === "object"
        ) {
          final = {
            ...(data.result as Record<string, unknown>),
            truncated:
              (data.result as Record<string, unknown>).truncated === true ||
              data.truncated === true,
          };
        }
      }
    }
  } catch (err) {
    if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
      throw new QueryAbortedError();
    }
    if (err instanceof Error && final === null) {
      // Surface real backend errors; otherwise fall back to polling.
      if (!(err instanceof TypeError)) throw err;
    }
    return final;
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }

  return final;
}


export async function generate(
  body: GenerateRequest,
  token: string,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  const b = base();
  if (!b) {
    throw new Error(
      "API is not configured. Set VITE_BACKEND_URL to connect the backend.",
    );
  }

  if (!token) {
    const msg = "Authentication token is missing.";
    toast.error(msg);
    throw new Error(msg);
  }

  // 1. Kick off the job. Backend returns { job_id } immediately.
  let postRes: Response;
  try {
    postRes = await fetch(`${b}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        query_text: body.question,
        mode: body.mode,
        doc_type: body.doc_type,
        court: body.court,
        year_from: body.year_from,
        year_to: body.year_to,
        max_cases: body.max_cases,
        has_attachment: body.has_attachment,
        attachment_name: body.attachment_name,
        category: body.assistant === "mike" ? "drafting" : body.category || "civil",
        ...(body.assistant ? { assistant: body.assistant } : {}),
        images: body.images ?? [],
        documents: body.documents ?? [],
        messages: body.messages ?? [],
        ...(body.backend_mode ? { backend_mode: body.backend_mode } : {}),
        ...eraPayload(body.era),
      }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
      throw new QueryAbortedError();
    }
    const msg = "Could not reach the server. Check your connection and try again.";
    toast.error(msg);
    throw new Error(msg);
  }

  if (!postRes.ok) {
    let parsed: unknown = null;
    try { parsed = await postRes.json(); } catch { /* ignore */ }
    handleErrorBody(parsed, postRes.status);
  }

  let postJson: unknown;
  try {
    postJson = await postRes.json();
  } catch {
    const msg = "The server returned an unreadable response. Please try again.";
    toast.error(msg);
    throw new Error(msg);
  }


  const jobId =
    postJson && typeof postJson === "object"
      ? asString((postJson as Record<string, unknown>).job_id)
      : null;

  // If the backend still returns the final answer inline (legacy), use it.
  if (!jobId) {
    return sanitizeResponse(normalizeResponse(postJson));
  }

  // Poll the backend status endpoint every two seconds; do not wait for SSE.
  // The production backend exposes GET /query/status/{job_id}; older builds
  // exposed GET /query/{job_id}. Try the status route first and fall back.
  const encodedId = encodeURIComponent(jobId);
  let useLegacyPollPath = false;
  const pollStarted = Date.now();
  const MAX_POLL_MS = 4 * 60 * 1000;
  let missCount = 0;
  while (true) {

    if (signal?.aborted) throw new QueryAbortedError();
    if (Date.now() - pollStarted > MAX_POLL_MS || missCount > 30) {
      const msg = "The answer is taking longer than expected. Please try again.";
      toast.error(msg);
      throw new Error(msg);
    }
    await sleep(POLL_INTERVAL_MS, signal);
    // Clerk tokens expire after ~60s; refresh before each poll.
    try {
      const fresh = await (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } })
        .Clerk?.session?.getToken();
      if (fresh) token = fresh;
    } catch { /* keep previous token */ }

    let pollRes: Response;
    try {
      pollRes = await fetch(
        `${b}${useLegacyPollPath ? `/query/${encodedId}` : `/query/status/${encodedId}`}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          signal,
        },
      );
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        throw new QueryAbortedError();
      }
      // Transient network blip — keep polling.
      continue;
    }

    // The status route may not exist on older backends — fall back once to
    // the legacy /query/{job_id} path and keep using it thereafter.
    if (pollRes.status === 404 && !useLegacyPollPath) {
      useLegacyPollPath = true;
      continue;
    }
    // Job not registered yet (race right after POST) — keep polling.
    if (pollRes.status === 404) { missCount++; continue; }

    if (!pollRes.ok) {
      let parsed: unknown = null;
      try { parsed = await pollRes.json(); } catch { /* ignore */ }
      handleErrorBody(parsed, pollRes.status);
    }

    let pollJson: unknown;
    try {
      pollJson = await pollRes.json();
    } catch {
      continue;
    }

    const data = (pollJson && typeof pollJson === "object" ? pollJson : {}) as Record<string, unknown>;
    const status = asString(data.status)?.toLowerCase();

    // Some backends return the finished result without a status field.
    const hasResultPayload =
      (data.result && typeof data.result === "object") ||
      typeof data.answer === "string";

    if (
      status === "done" ||
      status === "completed" ||
      status === "complete" ||
      status === "success" ||
      status === "succeeded" ||
      status === "finished" ||
      (!status && hasResultPayload)
    ) {
      const result = (data.result && typeof data.result === "object" ? data.result : data) as Record<string, unknown>;
      const merged = {
        ...result,
        job_id: asString(result.job_id) ?? jobId,
        truncated: result.truncated === true || data.truncated === true,
      };
      return sanitizeResponse(normalizeResponse(merged));
    }

    if (status === "error" || status === "failed" || status === "failure") {
      const msg = asString(data.error) ?? asString(data.message) ?? "The query failed. Please try again.";
      throw new Error(msg);
    }
    if (
      status !== "pending" &&
      status !== "processing" &&
      status !== "queued" &&
      status !== "running" &&
      status !== "in_progress" &&
      status !== "started"
    ) {
      throw new Error("The server returned an unrecognized query status. Please try again.");
    }
  }
}

/** Backend may return either the legacy shape or { answer, citations, query_id }. */
interface BackendPayload {
  issues?: unknown;
  cases?: unknown;
  citations?: unknown;
  document_text?: unknown;
  answer?: unknown;
  doc_id?: unknown;
  query_id?: unknown;
}

/**
 * Coerce a backend value to a clean string, treating database null
 * placeholders ("nan", "null", "none", "n/a") as missing.
 */
function asString(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (["nan", "null", "none", "n/a", "undefined"].includes(trimmed.toLowerCase())) return null;
  return trimmed;
}

/** Coerce a backend value to a clean list of strings. */
function asStringList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => asString(x)).filter((x): x is string => Boolean(x));
  }
  const s = asString(v);
  if (!s) return [];
  return s
    .split(/[;,]|\s\/\s/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Coerce any backend payload into a complete, render-safe GenerateResponse. */
export function normalizeResponse(raw: unknown): GenerateResponse {
  const envelope = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const payload = envelope.result && typeof envelope.result === "object"
    ? { ...envelope, ...(envelope.result as Record<string, unknown>) }
    : envelope;
  const p = payload as BackendPayload;

  const issues = Array.isArray(p.issues) ? (p.issues as string[]) : [];
  const caseSource = Array.isArray(p.cases)
    ? (p.cases as unknown[])
    : Array.isArray(p.citations)
      ? (p.citations as unknown[])
      : [];

  const cases: CaseResult[] = caseSource.map((c) => {
    const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
    const year = typeof o.year === "number" ? o.year : Number(asString(o.year) ?? "");
    const rawScore =
      typeof o.score === "number" ? o.score : Number(asString(o.score) ?? "");
    const score = Number.isFinite(rawScore) ? (rawScore as number) : 0;
    // Lowered thresholds — match backend's new scoring distribution.
    let relevance: Relevance;
    if (score > 0) {
      relevance = score >= 0.7 ? "high" : score >= 0.55 ? "medium" : "low";
    } else {
      // Legacy payloads without a score: fall back to the string field.
      relevance =
        o.relevance === "high" ? "high" : o.relevance === "low" ? "low" : "medium";
    }
    return {
      title:
        asString(o.title) ??
        asString(o.name) ??
        asString(o.case_id) ??
        asString(o.court) ??
        "",
      citation: asString(o.citation) ?? asString(o.case_id) ?? "",
      court: asString(o.court) ?? "",
      year: Number.isFinite(year) ? (year as number) : 0,
      summary: asString(o.summary) ?? asString(o.snippet) ?? "",
      relevance,
      source_url: asString(o.source_url) ?? asString(o.url) ?? "",
      case_id: asString(o.case_id) ?? "",
      score,
      preview: asString(o.preview) ?? asString(o.chunk_preview) ?? asString(o.snippet) ?? "",
      outcome: asString(o.outcome) ?? asString(o.result) ?? "",
      parties: asString(o.parties) ?? "",
      holding: asString(o.holding) ?? asString(o.ratio) ?? "",
      relied_on: asString(o.relied_on) ?? asString(o.reliedOn) ?? "",
      author_judges: asStringList(o.author_judges ?? o.judges ?? o.author_judge),
      bench_type: asString(o.bench_type) ?? "",
      statutes: asStringList(o.statutes ?? o.statute),
      sections: asStringList(o.sections ?? o.section),
      verified:
        o.verified === true ||
        o.is_verified === true ||
        asString(o.verified)?.toLowerCase() === "true" ||
        Boolean(asString(o.source_url) ?? asString(o.url)),
      pdf_url: resolvePdfUrl(
        asString(o.pdf_url),
        asString(o.judgment_id) ?? asString(o.case_id),
      ),
    };
  });


  const modeRaw = asString((p as Record<string, unknown>).mode)?.toLowerCase() ?? null;
  // Normalize backend aliases → canonical BackendMode values.
  const modeAliases: Record<string, BackendMode> = {
    simple: "simple_query",
    simple_query: "simple_query",
    case_law_search: "caselaw_search",
    caselaw_search: "caselaw_search",
    judgment_lookup: "judgment_lookup",
    drafting: "drafting",
    draft: "drafting",
    document_analysis: "document_analysis",
    intake: "intake",
    client_intake: "intake",
  };
  const mode: BackendMode | null = modeRaw && modeRaw in modeAliases ? modeAliases[modeRaw] : null;

  const rec = payload;

  const cardSource = Array.isArray(rec.precedent_cards) ? (rec.precedent_cards as unknown[]) : [];
  const precedent_cards: PrecedentCard[] = cardSource.map((c) => {
    const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
    const statutesRaw = Array.isArray(o.statutes_invoked) ? (o.statutes_invoked as unknown[]) : [];
    const statutes_invoked: StatuteRef[] = statutesRaw
      .map((s) => {
        if (typeof s === "string") return { name: asString(s) ?? "", explanation: "" };
        const so = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
        return {
          name: asString(so.name) ?? asString(so.statute) ?? "",
          explanation: asString(so.explanation) ?? asString(so.description) ?? "",
        };
      })
      .filter((s) => s.name);
    const caseId = asString(o.case_id) ?? asString(o.id);
    const judgmentId = asString(o.judgment_id) ?? caseId;
    const rawName =
      asString(o.case_name) ?? asString(o.case_title) ?? asString(o.title) ?? "Untitled case";
    const decisionDate = asString(o.decision_date);
    return {
      case_name: rawName,
      case_title: asString(o.case_title) ?? undefined,
      title: asString(o.title) ?? undefined,
      citation: asString(o.citation) ?? extractCitation(rawName),
      court: asString(o.court) ?? undefined,
      year: Number(asString(o.year)) || undefined,
      ratio_decidendi: asString(o.ratio_decidendi) ?? asString(o.holding) ?? undefined,
      docket_number: asString(o.docket_number) ?? undefined,
      decision_date: decisionDate ?? undefined,
      judgment_id: judgmentId ?? undefined,
      date:
        asString(o.date) ??
        asString(o.year) ??
        (typeof o.year === "number" ? String(o.year) : undefined) ??
        decisionDate ??
        "",
      outcome: asString(o.outcome) ?? "",
      verified_source: o.verified_source === true,
      issue: asString(o.issue) ?? asString(o.legal_issue) ?? "",
      holding: asString(o.ratio_decidendi) ?? asString(o.holding) ?? "",
      why_relevant: asString(o.why_relevant) ?? asString(o.relevance_reason) ?? "",
      authority_strength: asString(o.authority_strength) ?? undefined,
      source_type: asString(o.source_type) ?? undefined,
      important_paragraphs: Array.isArray(o.important_paragraphs)
        ? (o.important_paragraphs as unknown[])
            .map((p) => asString(p))
            .filter((p): p is string => Boolean(p))
        : undefined,
      statutes_invoked,
      raw_judgment_text: asString(o.raw_judgment_text) ?? "",
      case_id: caseId ?? "",
      source_url: asString(o.source_url) ?? asString(o.url) ?? "",
      parties:
        o.parties && typeof o.parties === "object"
          ? ({
              initiator: asString((o.parties as Record<string, unknown>).initiator) ?? "",
              initiator_role: asString((o.parties as Record<string, unknown>).initiator_role) ?? "",
              defender: asString((o.parties as Record<string, unknown>).defender) ?? "",
              defender_role: asString((o.parties as Record<string, unknown>).defender_role) ?? "",
            } as CaseParties)
          : undefined,
      operative_result: asString(o.operative_result) ?? asString(o.final_result) ?? undefined,
      precedent_status: asString(o.precedent_status) ?? undefined,
      precedent_status_warning: asString(o.precedent_status_warning) ?? undefined,
      superseding_citation: asString(o.superseding_citation) ?? undefined,
      superseding_case_name: asString(o.superseding_case_name) ?? undefined,
       pdf_url: asString(o.pdf_url) ?? resolvePdfUrl(undefined, judgmentId),
    };
  });

  return {
    issues,
    cases,
    precedent_cards,
    document_text: asString(p.answer) ?? asString(p.document_text),
    doc_id: asString(p.doc_id) ?? asString(p.query_id),
    mode,
    job_id: asString(rec.job_id),
    truncated: rec.truncated === true || asString(rec.truncated)?.toLowerCase() === "true",
    precedent_status: asString(rec.precedent_status) ?? undefined,
    precedent_status_warning: asString(rec.precedent_status_warning) ?? undefined,
    superseding_citation: asString(rec.superseding_citation) ?? undefined,
    superseding_case_name: asString(rec.superseding_case_name) ?? undefined,
  };
}

/** Fetch the complete judgment text for a case from the backend. */
export async function getJudgmentText(caseId: string, token: string): Promise<string> {
  const b = base();
  if (!b) throw new Error("API is not configured. Set VITE_BACKEND_URL.");
  if (!token) throw new Error("Authentication token is missing.");

  const res = await fetch(`${b}/judgment/${encodeURIComponent(caseId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!res.ok) throw new Error(`Could not load the full judgment text (${res.status}).`);

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) return (await res.text()).trim();

  const json: unknown = await res.json().catch(() => null);
  if (typeof json === "string") return json.trim();
  const d = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const nested = (d.judgment && typeof d.judgment === "object" ? d.judgment : {}) as Record<string, unknown>;
  const text =
    asString(d.full_text) ??
    asString(d.judgment_text) ??
    asString(d.raw_judgment_text) ??
    asString(d.text) ??
    asString(d.content) ??
    asString(nested.full_text) ??
    asString(nested.text) ??
    "";
  if (!text) throw new Error("The full judgment text is not available for this case.");
  return text;
}

/** Response from POST /query/{job_id}/continue. */
export interface ContinueAnswerResponse {
  answer: string;
  added_text: string;
  truncated: boolean;
  output_tokens_added: number;
}

/**
 * Ask the backend to continue a truncated answer.
 * Note: this endpoint may not exist yet in production (404) — callers should
 * surface a small inline error rather than crash.
 */
export async function continueAnswer(
  jobId: string,
  token: string,
): Promise<ContinueAnswerResponse> {
  const b = base();
  if (!b) throw new Error("API is not configured. Set VITE_BACKEND_URL to connect the backend.");
  if (!token) throw new Error("Authentication token is missing.");

  let res: Response;
  try {
    res = await fetch(`${b}/query/${encodeURIComponent(jobId)}/continue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
  } catch {
    throw new Error("Could not continue this answer right now.");
  }

  if (!res.ok) throw new Error("Could not continue this answer right now.");

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Could not continue this answer right now.");
  }
  const d = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const answer = asString(d.answer);
  if (!answer) throw new Error("Could not continue this answer right now.");
  return {
    answer: stripLongDashes(answer),
    added_text: asString(d.added_text) ?? "",
    truncated: d.truncated === true,
    output_tokens_added:
      typeof d.output_tokens_added === "number" ? d.output_tokens_added : 0,
  };
}


/** Fetch the signed-in user's daily quota usage from the backend. */
export async function getUserQuota(token: string): Promise<UserQuotaResponse> {
  const b = base();
  if (!b) throw new Error("API is not configured. Set VITE_BACKEND_URL to connect the backend.");
  if (!token) throw new Error("Authentication token is missing.");

  const res = await fetch(`${b}/users/quota`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!res.ok) {
    throw new Error(`Could not load usage quota (${res.status}).`);
  }

  const raw = (await res.json()) as Partial<UserQuotaResponse> | null;
  const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    text_queries_used: n(raw?.text_queries_used),
    text_queries_limit: n(raw?.text_queries_limit),
    text_queries_remaining: n(raw?.text_queries_remaining),
    vision_queries_used: n(raw?.vision_queries_used),
    vision_queries_limit: n(raw?.vision_queries_limit),
    vision_queries_remaining: n(raw?.vision_queries_remaining),
    reset_time_iso: typeof raw?.reset_time_iso === "string" ? raw.reset_time_iso : null,
  };
}

export interface FeedbackPayload {
  query_id: string;
  original_answer: string;
  correct_answer: string;
}

/** Submit a senior-lawyer correction to the backend training dataset. */
export async function submitFeedback(payload: FeedbackPayload, token: string): Promise<void> {
  const b = base();
  if (!b) {
    const msg = "The backend is not connected. Set VITE_BACKEND_URL.";
    toast.error(msg);
    throw new Error(msg);
  }
  if (!token) {
    const msg = "Authentication token is missing.";
    toast.error(msg);
    throw new Error(msg);
  }

  let res: Response;
  try {
    res = await fetch(`${b}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query_id: payload.query_id,
        original_answer: payload.original_answer,
        correct_answer: payload.correct_answer,
      }),
    });
  } catch {
    const msg = "Could not reach the server. Check your connection and try again.";
    toast.error(msg);
    throw new Error(msg);
  }

  if (!res.ok) {
    const msg = `Could not save your correction (${res.status}). Please try again.`;
    toast.error(msg);
    throw new Error(msg);
  }
}

export interface RequestAccessPayload {
  full_name: string;
  firm_name: string;
  email: string;
}

/** Submit an access request directly to the live backend. */
export async function requestAccess(payload: RequestAccessPayload): Promise<void> {
  const b = base();
  if (!b) {
    const msg = "The service is not available right now. Please try again later.";
    toast.error(msg);
    throw new Error(msg);
  }

  let res: Response;
  try {
    res = await fetch(`${b}/request-access`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        full_name: payload.full_name,
        firm_name: payload.firm_name,
        email: payload.email,
      }),
    });
  } catch {
    const msg = "Could not reach the server. Check your connection and try again.";
    toast.error(msg);
    throw new Error(msg);
  }

  if (!res.ok) {
    const msg = `Could not submit your request (${res.status}). Please try again.`;
    toast.error(msg);
    throw new Error(msg);
  }
}

export interface CourtPleadingExport {
  /** The clean memorandum text to convert into a court-ready pleading. */
  answer: string;
  /** Original user question, when available. */
  query?: string;
  /** Job id of the query that produced the answer, when available. */
  job_id?: string | null;
  /** Suggested file name (without extension). */
  title?: string;
}

/**
 * Ask the backend to build a court-ready .docx pleading and download it.
 * Falls back to an explanatory error when the endpoint is unavailable.
 */
export async function exportCourtPleading(
  payload: CourtPleadingExport,
  token: string,
): Promise<Blob> {
  const b = base();
  if (!b) throw new Error("API is not configured. Set VITE_BACKEND_URL.");
  if (!token) throw new Error("Authentication token is missing.");

  // Send the memorandum under every field name the backend has used, so a
  // stricter schema on either side still validates.
  const body: Record<string, unknown> = {
    answer: payload.answer,
    memorandum: payload.answer,
    text: payload.answer,
    content: payload.answer,
    memorandum_text: payload.answer,
    query: payload.query ?? "",
    question: payload.query ?? "",
    job_id: payload.job_id ?? undefined,
    title: payload.title ?? payload.query ?? "Court Pleading",
  };

  const res = await fetch(`${b}/export/court-pleading`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(body),
  });

  if (res.status === 404) {
    throw new Error("Court pleading export is not available yet.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      const d = (data as { detail?: unknown })?.detail;
      if (typeof d === "string") detail = d;
      else if (Array.isArray(d)) {
        detail = d
          .map((e) => {
            const loc = Array.isArray((e as { loc?: unknown[] }).loc)
              ? (e as { loc: unknown[] }).loc.filter((p) => p !== "body").join(".")
              : "";
            const msg = (e as { msg?: string }).msg ?? "invalid";
            return loc ? `${loc}: ${msg}` : msg;
          })
          .join("; ");
      }
    } catch {
      /* body was not JSON */
    }
    console.error("[export/court-pleading] failed", res.status, detail);
    throw new Error(
      detail
        ? `Could not export the pleading (${res.status}): ${detail}`
        : `Could not export the pleading (${res.status}).`,
    );
  }
  return await res.blob();
}



/** Replace long dashes (em/en) with conventional punctuation. */
function stripLongDashes(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ") // spaced long dash → comma
    .replace(/[—–]/g, "-"); // any remaining long dash → hyphen
}

function sanitizeResponse(res: GenerateResponse): GenerateResponse {
  return {
    ...res,
    issues: Array.isArray(res.issues) ? res.issues.map(stripLongDashes) : res.issues,
    cases: Array.isArray(res.cases)
      ? res.cases.map((c) => ({
          ...c,
          title: typeof c.title === "string" ? stripLongDashes(c.title) : c.title,
          summary: typeof c.summary === "string" ? stripLongDashes(c.summary) : c.summary,
        }))
      : res.cases,
    document_text: res.document_text,
  };
}

