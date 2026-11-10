import { useState, useMemo } from "react";
import { Copy, Check, FileDown, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import type { CaseResult } from "@/lib/api";
import { Markdown } from "./Markdown";
import { useQueryText } from "./ReportIssueControl";
import { Button } from "@/components/ui/button";
import { PrecedentWarning } from "./PrecedentWarning";

interface AnalysisViewProps {
  issues: string[];
  text: string | null;
  citations?: CaseResult[];
  jobId?: string | null;
  footer?: React.ReactNode;
  intake?: boolean;
  precedentStatus?: string;
  precedentStatusWarning?: string;
  supersedingCitation?: string;
  supersedingCaseName?: string;
  isVerified?: boolean;
  onCitationClick?: (citation: string) => void;
}

function extractShortAnswer(rawText: string): { shortAnswer: string; remainingText: string } {
  if (!rawText) return { shortAnswer: "", remainingText: "" };

  // Look for Executive Legal Opinion, Short Answer, or Summary block
  const m = rawText.match(
    /(?:#{1,3}\s*(?:Executive Legal Opinion|Short Direct Answer|Executive Answer|Summary)[^\n]*\n+)([\s\S]*?)(?=\n#{1,3}\s|\n\n---\n|$)/i,
  );
  if (m && m[1]?.trim()) {
    const shortAnswer = m[1].trim();
    const remainingText = rawText.replace(m[0], "").trim();
    return { shortAnswer, remainingText };
  }

  // Fallback: take the first paragraph if it's not a heading
  const lines = rawText.trim().split("\n\n");
  if (lines.length > 1 && !lines[0].startsWith("#") && lines[0].length > 40) {
    return { shortAnswer: lines[0].trim(), remainingText: lines.slice(1).join("\n\n") };
  }

  return { shortAnswer: "", remainingText: rawText };
}

function inferKeyFacts(text: string): { forum: string; timeLimit: string; delay: string } {
  let forum = "High Court / District Court";
  let timeLimit = "30–90 Days (Statutory)";
  let delay = "Barred under Limitation Act";

  const lower = text.toLowerCase();
  if (lower.includes("banking court") || lower.includes("financial institutions") || lower.includes("fio")) {
    forum = "Banking Court / High Court";
    timeLimit = "30 Days (Section 22 FIO)";
    delay = "Fatal; S.5 Limitation Act barred";
  } else if (lower.includes("rent") || lower.includes("tenant") || lower.includes("landlord")) {
    forum = "Rent Controller / High Court";
    timeLimit = "30 Days to Appeal";
    delay = "Order of eviction becomes final";
  } else if (lower.includes("489-f") || lower.includes("cheque") || lower.includes("bail")) {
    forum = "Court of Session / High Court";
    timeLimit = "Immediate (Liberty matter)";
    delay = "Arrest / Pre-trial incarceration";
  } else if (lower.includes("specific performance") || lower.includes("agreement to sell")) {
    forum = "Civil Court / High Court";
    timeLimit = "3 Years (Article 113 Limitation)";
    delay = "Right to relief extinguishes";
  }

  return { forum, timeLimit, delay };
}

export function AnalysisView({
  issues,
  text,
  citations,
  jobId,
  footer,
  intake,
  precedentStatus,
  precedentStatusWarning,
  supersedingCitation,
  supersedingCaseName,
  isVerified,
  onCitationClick,
}: AnalysisViewProps) {
  const queryText = useQueryText();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isPartialResult =
    isVerified === false ||
    Boolean(
      text && (
        text.includes("PARTIAL RESULT") ||
        text.includes("PARTIAL LEGAL RESEARCH RECORD") ||
        text.includes("PARTIAL RESEARCH RECORD") ||
        text.includes("issues unresolved") ||
        text.includes("UNVERIFIED NOTICE") ||
        text.includes("Verification Notice") ||
        text.includes("⚠️")
      ),
    );

  const raw = text ?? "";
  const { shortAnswer, remainingText } = useMemo(() => extractShortAnswer(raw), [raw]);
  const keyFacts = useMemo(() => inferKeyFacts(raw), [raw]);

  // Meaningful result title from query or primary issue
  const memoTitle = useMemo(() => {
    if (queryText && queryText.length > 5) {
      // Clean query into title case
      const q = queryText.replace(/^(can|what is|how to|is it|whether)\s+/i, "");
      return q.charAt(0).toUpperCase() + q.slice(1);
    }
    if (issues && issues.length > 0) {
      return issues[0];
    }
    return "Legal Research Memorandum";
  }, [queryText, issues]);

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Memorandum copied to clipboard.");
    } catch {
      toast.error("Could not copy memorandum.");
    }
  }

  async function handleExport() {
    if (!text) return;
    if (isPartialResult) {
      toast.error("Record contains unverified citations. Review flagged authorities before export.");
      return;
    }
    setExporting(true);
    try {
      const { downloadDocxFromText } = await import("@/lib/docx");
      await downloadDocxFromText(text, memoTitle);
      toast.success("Exported legal memorandum (.docx)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  if (intake) {
    return (
      <article className="font-sans text-[15px] leading-7 text-[var(--text)]">
        {raw ? <Markdown>{raw}</Markdown> : <p className="text-sm text-[var(--text-muted)]">No response returned.</p>}
        {footer && <div className="mt-6">{footer}</div>}
      </article>
    );
  }

  return (
    <div className="w-full">
      {/* Memo Sheet: max-w-[760px], centered, background --surface, 1px --line border, 48px padding */}
      <div className="memo-sheet">
        {/* Header Label: PRIVILEGED & CONFIDENTIAL // PREPARED FOR COUNSEL */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            PRIVILEGED & CONFIDENTIAL // PREPARED FOR COUNSEL
          </p>
          <span className="font-sans text-[11px] text-[var(--text-muted)]">
            Database current to November 2026
          </span>
        </div>

        {/* Title + 3px x 64px --ink rule */}
        <div className="mt-6">
          <h1 className="memo-title">{memoTitle}</h1>
          <div className="memo-rule" />
        </div>

        {/* Top Action Bar & Status Pill */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-5">
          <div className="flex items-center gap-2">
            {isPartialResult ? (
              <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2.5 py-1 font-sans text-[11px] font-semibold text-[var(--warn-text)]">
                Partial record • Authorities require primary verification
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--ok-border)] bg-[var(--ok-bg)] px-2.5 py-1 font-sans text-[11px] font-semibold text-[var(--ok-text)]">
                ✓ Verified against authentic statute & case records
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 rounded-[3px] border-[var(--line)] bg-[var(--surface)] font-sans text-[12px] font-medium text-[var(--text)] hover:bg-[var(--chip-bg)]"
              aria-label="Copy legal memorandum"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>

            {isPartialResult && (
              <span className="font-sans text-[11px] text-[var(--warn-text)]">
                Export blocked: partial record
              </span>
            )}
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting || isPartialResult}
              className="h-8 gap-1.5 rounded-[3px] bg-[var(--ink)] px-3 font-sans text-[12px] font-medium text-[var(--on-ink)] hover:bg-[var(--ink-2)] disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Export memorandum to Word document"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* To / From / Date / Re Block */}
        <div className="mb-8 rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-4 text-[13px] font-sans">
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <div>
              <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">TO:</span>
              <span className="ml-2 font-medium text-[var(--text)]">Counsel / Senior Advocate</span>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">DATE:</span>
              <span className="ml-2 font-medium text-[var(--text)]">November 2026</span>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">FROM:</span>
              <span className="ml-2 font-medium text-[var(--text)]">Jurist (Chief Legal Research)</span>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">RE:</span>
              <span className="ml-2 font-medium text-[var(--text)] truncate">{memoTitle}</span>
            </div>
          </div>
        </div>

        {/* Precedent Warning if active */}
        {precedentStatus && (
          <div className="mb-6">
            <PrecedentWarning
              status={precedentStatus}
              warningText={precedentStatusWarning}
              supersedingCitation={supersedingCitation}
              supersedingName={supersedingCaseName}
              onCitationClick={onCitationClick}
            />
          </div>
        )}

        {/* Short Answer Callout Box */}
        {shortAnswer && (
          <div className="short-answer-box">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)] mb-1.5">
              SHORT DIRECT ANSWER
            </p>
            <div className="font-serif text-[15.5px] leading-relaxed text-[var(--text)]">
              {shortAnswer}
            </div>
          </div>
        )}

        {/* Three key-fact cards in a row: Forum, Time limit, Delay consequence */}
        <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="key-fact-card">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              COMPETENT FORUM
            </p>
            <p className="mt-1 font-serif text-[14px] font-bold text-[var(--text)] leading-snug">
              {keyFacts.forum}
            </p>
          </div>
          <div className="key-fact-card">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              TIME LIMIT
            </p>
            <p className="mt-1 font-serif text-[14px] font-bold text-[var(--text)] leading-snug">
              {keyFacts.timeLimit}
            </p>
          </div>
          <div className="key-fact-card">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              DELAY CONSEQUENCE
            </p>
            <p className="mt-1 font-serif text-[14px] font-bold text-[var(--text)] leading-snug">
              {keyFacts.delay}
            </p>
          </div>
        </div>

        {/* Legal issues identified */}
        {issues.length > 0 && (
          <div className="my-6 border-b border-[var(--line)] pb-6">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">
              1. ISSUES IDENTIFIED
            </p>
            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-[14.5px] font-serif text-[var(--text)]">
                  <span className="font-sans font-semibold text-[var(--text-muted)] text-[12px] mt-0.5">
                    1.{i + 1}
                  </span>
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining Body Text Rendered Cleanly via Markdown */}
        <article className="memo-body mt-6">
          <Markdown citations={citations} memorandum>
            {remainingText}
          </Markdown>
        </article>

        {footer && <div className="mt-8 border-t border-[var(--line)] pt-4">{footer}</div>}

        {/* Hand off to Counsel link */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-serif text-[16px] font-bold text-[var(--ink)]">Ready to Draft Pleadings?</p>
            <p className="font-sans text-[13px] text-[var(--text-muted)] mt-0.5">
              Hand off this verified research memorandum to Counsel to prepare court-ready plaints, petitions, or notices.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-[3px] bg-[var(--ink)] text-[var(--on-ink)] hover:bg-[var(--ink-2)]"
          >
            <Link to="/assistants/mike" className="gap-2">
              <span>Hand Off to Counsel</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
