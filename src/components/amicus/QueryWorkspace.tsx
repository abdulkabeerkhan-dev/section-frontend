import { useAssistant } from "@/lib/assistant";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileSearch, FileText, FolderClosed, Menu, Paperclip, Plus, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { format } from "date-fns";

import {
  ERA_LABELS,
  generate,
  getUserQuota,
  isApiConfigured,
  QuotaExceededError,
  QueryAbortedError,
  type GenerateRequest,
  type ChatMessage,
  type GenerateResponse,
  type JurisprudenceEra,
} from "@/lib/api";
import { listMyActivity, logActivity, type ActivityRecord } from "@/lib/activity.functions";
import { learnFromExchange } from "@/lib/memory.functions";
import { summarizeResponse } from "@/lib/personalize";
import { useLogout, useMe } from "@/lib/useMe";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Wordmark } from "./Wordmark";
import { HeroVideo } from "./HeroVideo";
import { Sidebar, type SidebarThread } from "./Sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";

/** Update as statute coverage changes. */
export const STATUTE_COVERAGE = {
  label: "Statute coverage: limited. Provisions shown are unreviewed.",
  detail:
    "Only some Acts are loaded, and loaded text has not been reviewed by a lawyer. Provisions not loaded are marked 'not in verified store'.",
};
const TRY_ASKING = [
  "What does section 22 of the FIO 2001 say about appeals from a Banking Court?",
  "Find precedents on quashment of an FIR under section 561-A CrPC in cheque cases",
  "What remedies does a buyer have if the seller refuses to execute a sale deed?",
];
import { Composer, type ComposerAttachment, type BackendModeChoice } from "./Composer";
import { LoadingState } from "./LoadingState";
import { CaseListSkeleton } from "./CaseCardSkeleton";
import { ResultsPanel } from "./ResultsPanel";
import { ContinueAnswerControl } from "./ContinueAnswerControl";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";

import { QueryTextProvider } from "./ReportIssueControl";
import { FeedbackPanel } from "./FeedbackPanel";
import { NameOnboarding } from "./NameOnboarding";

import { QuotaLimitDialog } from "./QuotaLimitDialog";
import { DOC_TYPES } from "./InputPanel";
import type { Mode, QueryDocument, QueryImage } from "@/lib/api";

// Prompt limits mirrored from Composer as a server-side guard.
const MAX_PROMPT_CHARS = 120_000;
const MAX_PROMPT_WORDS = 30_000;

function countWords(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

const EXAMPLE_PROMPTS = [
  "Draft a pre-arrest bail application",
  "Check if this FIR is compoundable",
  "Explain Section 420 PPC",
];

type Status = "idle" | "loading";

const DRAFT_VERBS = [
  "draft",
  "prepare",
  "write me",
  "write a",
  "write up",
  "generate a",
  "create a",
  "make a",
  "compose",
  "file a",
];

function inferIntent(question: string): { mode: Mode; docType?: string } {
  const q = question.toLowerCase();
  const docType = DOC_TYPES.find((t) => q.includes(t.toLowerCase()));
  const wantsDraft = docType !== undefined || DRAFT_VERBS.some((v) => q.includes(v));
  return { mode: wantsDraft ? "draft" : "research", docType };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join("-")
    .slice(0, 60);
}

function fileNameFor(mode: Mode, question: string, docType?: string): string {
  const fromQuestion = slugify(question);
  if (fromQuestion) return fromQuestion;
  const base = mode === "draft" ? docType || "document" : "research";
  return base.toLowerCase().replace(/\s+/g, "-");
}

const GREETINGS_WITH_NAME = [
  (n: string) => `Hi, ${n}`,
  (n: string) => `Hello, ${n}`,
  (n: string) => `Welcome back, ${n}`,
  (n: string) => `Good to see you, ${n}`,
  (n: string) => `Hey ${n}`,
  (n: string) => `Greetings, ${n}`,
  (n: string) => `Salaam, ${n}`,
  (n: string) => `At your service, ${n}`,
  (n: string) => {
    const hour = new Date().getHours();
    const s = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return `${s}, ${n}`;
  },
];

const GREETINGS_NO_NAME = [
  "Where would you like to begin?",
  "What are we working on today?",
  "Ready when you are.",
  "How can I help?",
  "Let's get started.",
  "What's on the docket?",
];

function timeGreeting(name: string): string {
  const pool = name ? GREETINGS_WITH_NAME : GREETINGS_NO_NAME;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return typeof pick === "function" ? pick(name) : pick;
}

interface Turn {
  id: string;
  question: string;
  mode: Mode;
  response: GenerateResponse;
  docType?: string;
  attachments?: ComposerAttachment[];
}

/** Render a user's attached images and files inside their chat bubble. */
function AttachmentPreview({ attachments }: { attachments: ComposerAttachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {attachments.map((att, i) =>
        att.image_base64 && att.image_mime_type ? (
          <img
            key={`${att.name}-${i}`}
            src={`data:${att.image_mime_type};base64,${att.image_base64}`}
            alt={att.name}
            className="h-24 w-24 rounded-lg border border-border object-cover"
          />
        ) : (
          <span
            key={`${att.name}-${i}`}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground/90"
          >
            <Paperclip className="h-3.5 w-3.5 text-gold" />
            <span className="max-w-[160px] truncate">{att.name}</span>
          </span>
        ),
      )}
    </div>
  );
}

function recordToTurn(r: ActivityRecord): Turn {
  const mode: Mode = r.mode === "draft" ? "draft" : "research";
  const { docType } = inferIntent(r.question);
  return {
    id: r.id,
    question: r.question,
    mode,
    response: r.response as unknown as GenerateResponse,
    docType,
  };
}

export function QueryWorkspace() {
  const assistant = useAssistant();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { data: me } = useMe();
  const logout = useLogout();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draftTurns, setDraftTurns] = useState<Turn[]>([]); // optimistic turns for the active thread
  // Continuations applied to a specific answer via the "Continue answer" control.
  const [continuations, setContinuations] = useState<
    Record<string, { text: string; truncated: boolean }>
  >({});

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pending, setPending] = useState<{
    question: string;
    mode: Mode;
    attachments: ComposerAttachment[];
  } | null>(null);
  const [modeChoice, setModeChoice] = useState<BackendModeChoice>("auto");
  const [era, setEra] = useState<JurisprudenceEra>("all");
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [quotaResetIso, setQuotaResetIso] = useState<string | null>(null);
  const [seed, setSeed] = useState<{ text: string; nonce: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopGenerate = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };
  const scrollRef = useRef<HTMLDivElement>(null);

  function seedComposer(text: string) {
    setSeed({ text, nonce: Date.now() });
  }

  const { data: quota } = useQuery({
    queryKey: ["userQuota"],
    enabled: isLoaded && isSignedIn && isApiConfigured(),
    queryFn: async () => {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("No session");
      return getUserQuota(token);
    },
    staleTime: 30_000,
    retry: false,
  });

  const greetingName = me?.firstName?.trim() || "";

  const { data: records } = useQuery({
    queryKey: ["myActivity"],
    enabled: isLoaded && isSignedIn,
    queryFn: () => listMyActivity(),
    retry: 1,
  });

  // Group activity rows into threads (oldest -> newest within a thread).
  const threads = useMemo(() => {
    const map = new Map<string, ActivityRecord[]>();
    for (const r of records ?? []) {
      if (!r || !r.thread_id) continue;
      const arr = map.get(r.thread_id) ?? [];
      arr.push(r);
      map.set(r.thread_id, arr);
    }
    const list: SidebarThread[] = [];
    for (const [id, rows] of map) {
      if (!rows || rows.length === 0) continue;
      const sorted = [...rows].sort((a, b) => (a?.created_at || "").localeCompare(b?.created_at || ""));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      list.push({
        id,
        title: first?.question || "Untitled matter",
        mode: last?.mode === "draft" ? "draft" : "research",
        updatedAt: last?.created_at || new Date().toISOString(),
      });
    }
    list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return list;
  }, [records]);

  const activeTurns = useMemo(() => {
    if (!activeThreadId) return [];
    const rows = (records ?? [])
      .filter((r) => r && r.thread_id === activeThreadId)
      .sort((a, b) => (a?.created_at || "").localeCompare(b?.created_at || ""));
    const persisted = rows.map(recordToTurn);
    // append any optimistic turns not yet present in the records
    const knownQuestions = new Set(persisted.map((t) => (t.question || "").trim()));
    const extra = draftTurns.filter((t) => !knownQuestions.has((t.question || "").trim()));
    return [...persisted, ...extra];
  }, [records, activeThreadId, draftTurns]);

  const activeTurn = activeTurns[activeTurns.length - 1];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activeTurns.length, status]);

  function startNewMatter() {
    setActiveThreadId(null);
    setDraftTurns([]);
    setStatus("idle");
    setError("");
    setMobileNavOpen(false);
  }

  function selectThread(id: string) {
    setActiveThreadId(id);
    setDraftTurns([]);
    setStatus("idle");
    setError("");
    setMobileNavOpen(false);
  }

  async function send(question: string, attachments: ComposerAttachment[]) {
    if (!isLoaded) return;

    const q = question.trim();
    if (!q || status === "loading") return;

    if (!isSignedIn) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    if (!isApiConfigured()) {
      setError(
        "The backend is not connected yet. Set VITE_API_BASE_URL (and VITE_API_KEY) to start generating results.",
      );
      return;
    }

    if (q.length > MAX_PROMPT_CHARS || countWords(q) > MAX_PROMPT_WORDS) {
      setError(
        `Prompt exceeds the limit of ${MAX_PROMPT_WORDS.toLocaleString()} words or ${MAX_PROMPT_CHARS.toLocaleString()} characters.`,
      );
      return;
    }

    const threadId = activeThreadId ?? crypto.randomUUID();
    if (!activeThreadId) setActiveThreadId(threadId);

    const { mode, docType } = inferIntent(q);

    const images: QueryImage[] = attachments
      .filter((a) => a.image_base64 && a.image_mime_type)
      .map((a) => ({ image_base64: a.image_base64!, image_mime_type: a.image_mime_type! }));

    // Non-image documents are already fully converted to base64 by the composer
    // before they land here, so the request never ships an empty payload.
    const documents: QueryDocument[] = attachments
      .filter((a) => Boolean(a.file_base64))
      .map((a) => ({
        name: a.name,
        mime_type: a.file_mime_type ?? "application/octet-stream",
        fileData: a.file_base64!,
        base64: a.file_base64!,
      }));

    // Block locally when the relevant quota is already exhausted.
    if (quota) {
      const outOfText = quota.text_queries_remaining <= 0;
      const outOfVision = images.length > 0 && quota.vision_queries_remaining <= 0;
      if (outOfText || outOfVision) {
        setQuotaResetIso(quota.reset_time_iso);
        setQuotaDialogOpen(true);
        return;
      }
    }

    const request: GenerateRequest = {
      // Send the clean query text only — no client-side formatting wrappers.
      question: q,
      mode,
      max_cases: 15,
      category: "general",
    };
    if (assistant) request.assistant = (assistant === "counsel" ? "mike" : assistant === "jurist" ? "ark" : assistant);
    if (modeChoice !== "auto") request.backend_mode = modeChoice;
    if (era !== "all") request.era = era;
    if (mode === "draft") request.doc_type = docType ?? "Civil Suit";
    if (attachments.length > 0) {
      const names = attachments.map((a) => a.name);
      request.has_attachment = true;
      request.attachment_name = names[0];
      request.attachment_names = names;
    }
    if (images.length > 0) request.images = images;
    if (documents.length > 0) request.documents = documents;
    // Send prior conversation turns so intake follow-ups keep their context.
    const history = activeTurns.flatMap((t) => {
      const answer = (t.response.document_text ?? "").trim();
      const msgs: ChatMessage[] = [{ role: "user", content: t.question }];
      if (answer) msgs.push({ role: "assistant", content: answer });
      return msgs;
    });
    if (history.length > 0) request.messages = history;

    setStatus("loading");
    setError("");

    // Optimistic user turn placeholder shown immediately via pending question.
    setPending({ question: q, mode, attachments });

    try {
      const token = await getToken({ skipCache: true });
      if (!token) {
        console.error("No active session found in React context");
        setPending(null);
        setStatus("idle");
        setError("Your session has expired. Please sign in again.");
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await generate(request, token, controller.signal);
      if (abortRef.current === controller) abortRef.current = null;
      const optimistic: Turn = {
        id: `tmp-${crypto.randomUUID()}`,
        question: q,
        mode,
        response,
        docType,
        attachments,
      };
      setDraftTurns((prev) => [...prev, optimistic]);
      setPending(null);
      setStatus("idle");

      // Refresh quota after a successful query.
      queryClient.invalidateQueries({ queryKey: ["userQuota"] });

      try {
        await logActivity({
          data: {
            threadId,
            mode,
            question: q,
            response: response as unknown as Record<string, unknown>,
            category: "general",
          },
        });
        queryClient.invalidateQueries({ queryKey: ["myActivity"] });
      } catch {
        // logging failure should not break the result view
      }

      // Learn quietly in the background.
      learnFromExchange({
        data: { question: q, answerSummary: summarizeResponse(response) },
      })
        .then((r) => {
          if (r?.added) queryClient.invalidateQueries({ queryKey: ["myMemory"] });
        })
        .catch(() => {});
    } catch (err) {
      abortRef.current = null;
      setPending(null);
      setStatus("idle");
      if (err instanceof QueryAbortedError) {
        // User pressed Stop — silently drop the in-flight query.
        return;
      }
      if (err instanceof QuotaExceededError) {
        setQuotaResetIso(err.resetTimeIso ?? quota?.reset_time_iso ?? null);
        setQuotaDialogOpen(true);
        queryClient.invalidateQueries({ queryKey: ["userQuota"] });
        return;
      }
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  const sidebarProps = {
    threads,
    activeId: activeThreadId,
    userName: me?.fullName || me?.email || "",
    isAdmin: Boolean(me?.isAdmin),
    quota,
    onLogout: logout,
    onSelect: selectThread,
    onNewMatter: startNewMatter,
  };

  if (me?.needsName) {
    return <NameOnboarding />;
  }

  const showHero = activeTurns.length === 0 && !pending && status === "idle";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar {...sidebarProps} className="hidden lg:flex" />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[260px] border-sidebar-border bg-sidebar p-0">
          <Sidebar {...sidebarProps} className="flex h-full w-full border-r-0" />
        </SheetContent>
      </Sheet>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-foreground transition-colors hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={startNewMatter}
            className="cursor-pointer appearance-none bg-transparent p-0 border-0"
            aria-label="Start new chat"
          >
            <Wordmark className="[&_*]:text-[20px]" />
          </button>
        </header>

        {showHero ? (
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[var(--page)]">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-start px-6 pt-10 pb-16 sm:px-10">
              {/* Date label in section-label style */}
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {format(new Date(), "EEEE, d MMMM yyyy").toUpperCase()}
              </p>

              {/* Greeting in Source Serif 44px + 3px x 64px --ink rule */}
              <h1 className="mt-2 font-serif text-[44px] font-bold leading-tight text-[var(--ink)]">
                {timeGreeting(greetingName)}
              </h1>
              <div className="my-3 h-[3px] w-[64px] rounded-[1px] bg-[var(--ink)]" />
              <p className="font-sans text-[15px] leading-relaxed text-[var(--text-muted)]">
                Research Pakistani case law, verify statutes, or draft court-ready pleadings across superior jurisdictions.
              </p>

              {/* Ask Box */}
              <div className="mt-8">
                <Composer
                  onSend={send}
                  loading={false}
                  error={error}
                  autoFocus
                  seed={seed}
                  modeChoice={modeChoice}
                  onModeChoiceChange={setModeChoice}
                  era={era}
                  onEraChange={setEra}
                />
              </div>

              {/* Start here section: 3 cards (STATUTE / CASE LAW / REMEDIES) */}
              <section className="mt-10">
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">
                  START HERE
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <article
                    onClick={() => seedComposer("What is the limitation period to file an appeal against a Banking Court decree under Section 22 of the Financial Institutions Ordinance, 2001?")}
                    className="cursor-pointer rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(18,18,18,0.04)] transition-all hover:border-[var(--line-strong)]"
                  >
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      STATUTE
                    </span>
                    <h2 className="mt-2 font-serif text-[16px] font-bold leading-snug text-[var(--text)]">
                      Appeal from a Banking Court: procedure and limitation
                    </h2>
                    <p className="mt-2 font-sans text-[12px] text-[var(--text-muted)]">
                      Examines Section 22 FIO, Section 5 Limitation Act exclusion, and leave to defend appealability.
                    </p>
                  </article>

                  <article
                    onClick={() => seedComposer("What are the mandatory legal ingredients to constitute an offence under Section 489-F PPC for dishonoured cheques?")}
                    className="cursor-pointer rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(18,18,18,0.04)] transition-all hover:border-[var(--line-strong)]"
                  >
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      CASE LAW
                    </span>
                    <h2 className="mt-2 font-serif text-[16px] font-bold leading-snug text-[var(--text)]">
                      Dishonour of cheque under Section 489-F PPC
                    </h2>
                    <p className="mt-2 font-sans text-[12px] text-[var(--text-muted)]">
                      Supreme Court benchmarks on dishonest issuance, repayment of loan vs security cheques.
                    </p>
                  </article>

                  <article
                    onClick={() => seedComposer("Under what legal grounds can an accused obtain pre-arrest bail under Section 498 CrPC in offences not falling under the prohibitory clause?")}
                    className="cursor-pointer rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(18,18,18,0.04)] transition-all hover:border-[var(--line-strong)]"
                  >
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      REMEDIES
                    </span>
                    <h2 className="mt-2 font-serif text-[16px] font-bold leading-snug text-[var(--text)]">
                      Pre-arrest bail standards under Section 498 CrPC
                    </h2>
                    <p className="mt-2 font-sans text-[12px] text-[var(--text-muted)]">
                      Establishing mala fides, ulterior motives, and rule of bail in non-prohibitory matters.
                    </p>
                  </article>
                </div>

                {/* Pill shortcuts */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    SHORTCUTS:
                  </span>
                  <button
                    type="button"
                    onClick={() => seedComposer("Draft a statutory legal notice under Section 80 CPC for damages against an executive department.")}
                    className="rounded-[3px] border border-[var(--chip-border)] bg-[var(--chip-bg)] px-3 py-1.5 font-sans text-[12px] font-medium text-[var(--chip-text)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  >
                    Draft a legal notice
                  </button>
                  <button
                    type="button"
                    onClick={() => seedComposer("Summarize the landmark ratio in 2024 SCMR 1 regarding scope of judicial review.")}
                    className="rounded-[3px] border border-[var(--chip-border)] bg-[var(--chip-bg)] px-3 py-1.5 font-sans text-[12px] font-medium text-[var(--chip-text)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  >
                    Summarize a judgment
                  </button>
                  <button
                    type="button"
                    onClick={() => seedComposer("Check limitation period to file a suit for specific performance under Article 113 of the Limitation Act, 1908.")}
                    className="rounded-[3px] border border-[var(--chip-border)] bg-[var(--chip-bg)] px-3 py-1.5 font-sans text-[12px] font-medium text-[var(--chip-text)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  >
                    Check a limitation period
                  </button>
                </div>
              </section>

              {/* Two cards: Recent matters and Upcoming deadlines */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(18,18,18,0.04)]">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    RECENT MATTERS
                  </p>
                  {threads.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {[...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3).map((t, i) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => sidebarProps.onSelect(t.id)}
                          className="flex w-full items-center justify-between rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left hover:border-[var(--line-strong)]"
                        >
                          <span className="truncate font-sans text-[13px] text-[var(--text)]">{t.title}</span>
                          <span className="ml-2 shrink-0 font-sans text-[11px] text-[var(--text-muted)]">Matter {threads.length - i}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 font-sans text-[13px] leading-relaxed text-[var(--text-muted)]">
                      No recent matters recorded yet. Begin by asking a legal question or drafting a pleading above.
                    </p>
                  )}
                </div>

                <div className="rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(18,18,18,0.04)]">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    UPCOMING DEADLINES
                  </p>
                  <p className="mt-3 font-sans text-[13px] leading-relaxed text-[var(--text-muted)]">
                    No deadlines tracked. Statutory limitation periods, hearing notices, and filing deadlines will appear here.
                  </p>
                </div>
              </div>

              {/* Quiet Footer */}
              <div className="mt-12 border-t border-[var(--line)] pt-6 text-center">
                <p className="font-sans text-[12px] text-[var(--text-muted)]">
                  Review all generated work before filing or relying on it.
                </p>
              </div>
            </div>
          </div>) : (
          <>
            {/* Top bar on result pages: breadcrumb (Matters / matter name / page), a status pill, and actions */}
            <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-6 py-3 shadow-xs">
              <div className="flex items-center gap-2 font-sans text-[12px]">
                <span className="text-[var(--text-muted)]">Matters</span>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="font-medium text-[var(--text)] truncate max-w-[200px] sm:max-w-md">
                  {activeTurn?.question || (threads.find((t) => t.id === activeThreadId)?.title) || "Active Matter"}
                </span>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="font-semibold text-[var(--ink)]">
                  {assistant === "mike" || activeTurns[activeTurns.length - 1]?.mode === "draft" ? "Draft" : "Research"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {activeTurn?.response?.is_verified &&
                !activeTurn?.response?.document_text?.includes("PARTIAL") &&
                !activeTurn?.response?.document_text?.includes("UNVERIFIED") ? (
                  <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--ok-border)] bg-[var(--ok-bg)] px-2.5 py-0.5 font-sans text-[11px] font-semibold text-[var(--ok-text)]">
                    ✓ Verified Record
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2.5 py-0.5 font-sans text-[11px] font-semibold text-[var(--warn-text)]">
                    Partial record • Authorities unverified
                  </span>
                )}
              </div>
            </header>
            <Conversation className="flex-1">
              <ConversationContent className="mx-auto w-full max-w-4xl gap-10 px-4 py-8 sm:px-8 sm:py-12">
                {era !== "all" && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Retrieval bounded to
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      {ERA_LABELS[era]}
                      <button
                        type="button"
                        onClick={() => setEra("all")}
                        aria-label="Clear jurisprudence era filter"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}
                {activeTurns.map((turn) => {
                  const cont = continuations[turn.id];
                  const response = cont
                    ? {
                        ...turn.response,
                        document_text: cont.text,
                        truncated: cont.truncated,
                      }
                    : turn.response;
                  const jobId = response.job_id;
                  return (
                    <div key={turn.id} className="space-y-5">
                      <Message from="user" className="max-w-[85%] gap-2 sm:max-w-[78%]">
                        {turn.attachments && turn.attachments.length > 0 && (
                          <AttachmentPreview attachments={turn.attachments} />
                        )}
                        <MessageContent className="rounded-sm border border-border bg-muted px-4 py-3 text-[14px] leading-relaxed text-foreground">
                          {turn.question}
                        </MessageContent>
                      </Message>
                      <Message from="assistant" className="max-w-full gap-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <span
                            className="flex h-6 w-6 items-center justify-center border border-primary bg-primary font-serif text-sm text-primary-foreground"
                            aria-hidden
                          >
                            §
                          </span>
                          Section
                        </div>
                        <MessageContent className="w-full max-w-full text-[15px] leading-7">
                          <QueryTextProvider value={turn.question}>
                            <ResultsPanel
                              data={response}
                              mode={turn.mode}
                              fileName={fileNameFor(turn.mode, turn.question, turn.docType)}
                              attachmentName={null}
                              onCitationClick={(citation) => void send(citation, [])}
                              answerFooter={
                                response.truncated && jobId ? (
                                  <ContinueAnswerControl
                                    jobId={jobId}
                                    onContinued={(answer, truncated) =>
                                      setContinuations((prev) => ({
                                        ...prev,
                                        [turn.id]: { text: answer, truncated },
                                      }))
                                    }
                                  />
                                ) : undefined
                              }
                            />
                          </QueryTextProvider>
                          <FeedbackPanel
                            queryId={response.doc_id}
                            originalAnswer={response.document_text}
                          />
                        </MessageContent>
                      </Message>
                    </div>
                  );
                })}

                {pending && (
                  <div className="space-y-5">
                    <Message from="user" className="max-w-[85%] gap-2 sm:max-w-[78%]">
                      {pending.attachments.length > 0 && (
                        <AttachmentPreview attachments={pending.attachments} />
                      )}
                       <MessageContent className="rounded-sm border border-border bg-muted px-4 py-3 text-[14px] leading-relaxed text-foreground">
                        {pending.question}
                      </MessageContent>
                    </Message>
                    <Message from="assistant" className="max-w-full gap-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <span
                            className="flex h-6 w-6 items-center justify-center border border-primary bg-primary font-serif text-sm text-primary-foreground"
                          aria-hidden
                        >
                          §
                        </span>
                        Section
                      </div>
                      <MessageContent className="w-full max-w-full">
                        <LoadingState
                          hasImages={pending.attachments.some((a) => Boolean(a.image_base64))}
                        />
                        <div className="mt-3 max-w-2xl">
                          <CaseListSkeleton count={2} />
                        </div>
                      </MessageContent>
                    </Message>
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton className="bottom-3" />
            </Conversation>

            <div className="border-t border-border bg-background px-3 py-4 sm:px-8">
              <div className="mx-auto max-w-4xl">
                <Composer
                  onSend={send}
                  loading={status === "loading"}
                  error={error}
                  autoFocus
                  compact
                  seed={seed}
                  onStop={stopGenerate}
                  modeChoice={modeChoice}
                  onModeChoiceChange={setModeChoice}
                  era={era}
                  onEraChange={setEra}
                />
              </div>
            </div>
          </>
        )}

        {/* Mobile bottom navigation — quick reach for the core actions. */}
        <nav className="flex shrink-0 items-stretch border-t border-sidebar-border bg-sidebar lg:hidden">
          <button
            type="button"
            onClick={startNewMatter}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            New Matter
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <FolderClosed className="h-5 w-5" />
            Matters
          </button>
          <Link
            to="/settings"
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>
      </main>

      <QuotaLimitDialog
        open={quotaDialogOpen}
        onOpenChange={setQuotaDialogOpen}
        resetTimeIso={quotaResetIso}
      />
    </div>
  );
}
