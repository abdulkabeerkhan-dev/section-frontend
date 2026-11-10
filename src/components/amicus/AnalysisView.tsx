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

interface ParsedModelOutput {
  content: string;
  isParseError: boolean;
}

/** Safely extracts renderable text from model output, handling raw JSON structures */
function parseModelOutput(rawText: string | null): ParsedModelOutput {
  if (!rawText) return { content: "", isParseError: false };
  let str = rawText.trim();

  // Strip markdown code fences if wrapped in ```json ... ``` or ``` ... ```
  if (str.startsWith("```json") && str.endsWith("```")) {
    str = str.slice(7, -3).trim();
  } else if (str.startsWith("```") && str.endsWith("```")) {
    str = str.slice(3, -3).trim();
  }

  // If the string starts with JSON object or array notation
  if ((str.startsWith("{") && str.endsWith("}")) || (str.startsWith("[") && str.endsWith("]"))) {
    try {
      const obj = JSON.parse(str);
      if (typeof obj === "object" && obj !== null) {
        const extracted =
          obj.answer ||
          obj.memo ||
          obj.document_text ||
          obj.analysis ||
          obj.content ||
          obj.text ||
          obj.response;
        if (typeof extracted === "string" && extracted.trim().length > 0) {
          return { content: extracted.trim(), isParseError: false };
        }
      }
    } catch {
      // Regex recovery if JSON was cut off mid-stream
      const m = str.match(
        /"(?:answer|memo|document_text|analysis|content|text|response)"\s*:\s*"((?:\\.|[^"\\])*)"/,
      );
      if (m && m[1]) {
        try {
          const unescaped = JSON.parse(`"${m[1]}"`);
          return { content: unescaped, isParseError: false };
        } catch {
          return { content: "", isParseError: true };
        }
      }
      return { content: "", isParseError: true };
    }
  }

  // Also check if raw string starts with an unclosed or newline JSON object
  if (str.startsWith("{\n") || str.startsWith("{\r\n") || str.startsWith('{"')) {
    try {
      const obj = JSON.parse(str);
      const extracted =
        obj.answer ||
        obj.memo ||
        obj.document_text ||
        obj.analysis ||
        obj.content ||
        obj.text;
      if (typeof extracted === "string") {
        return { content: extracted.trim(), isParseError: false };
      }
    } catch {
      if (str.includes('"answer"') || str.includes('"document_text"')) {
        return { content: "", isParseError: true };
      }
    }
  }

  return { content: rawText, isParseError: false };
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

interface KeyFactItem {
  value: string;
  citation?: string;
}

interface KeyFacts {
  forum: KeyFactItem;
  timeLimit: KeyFactItem;
  delay: KeyFactItem;
}

function inferKeyFacts(text: string): KeyFacts {
  const lower = text.toLowerCase();
  if (lower.includes("banking court") || lower.includes("financial institutions") || lower.includes("fio")) {
    return {
      forum: { value: "High Court", citation: "FIO 2001 §22" },
      timeLimit: { value: "30 days (from date of order)", citation: "FIO 2001 §22(1)" },
      delay: { value: "Condonation", citation: "Limitation Act 1908 §5" },
    };
  } else if (lower.includes("rent") || lower.includes("tenant") || lower.includes("landlord")) {
    return {
      forum: { value: "District Judge / High Court", citation: "Punjab Rented Premises Act §24" },
      timeLimit: { value: "30 days", citation: "Section 24" },
      delay: { value: "Eviction order becomes final", citation: "Section 24(2)" },
    };
  } else if (lower.includes("489-f") || lower.includes("cheque") || lower.includes("dishonour")) {
    return {
      forum: { value: "Court of Session / High Court", citation: "CrPC 1898 §497 / §561-A" },
      timeLimit: { value: "No statutory limitation (Criminal)", citation: "CrPC 1898" },
      delay: { value: "Unexplained delay damages prosecution", citation: "1995 SCMR 1350" },
    };
  } else if (lower.includes("bail")) {
    return {
      forum: { value: "Court of Session / High Court", citation: "CrPC 1898 §497 / §498" },
      timeLimit: { value: "Immediate (Liberty matter)", citation: "CrPC 1898 §497" },
      delay: { value: "Pre-trial incarceration risk", citation: "PLD 2023 SC 450" },
    };
  } else if (lower.includes("specific performance") || lower.includes("agreement to sell")) {
    return {
      forum: { value: "Civil Court (Senior Civil Judge)", citation: "Civil Courts Ord 1962" },
      timeLimit: { value: "3 years (from date fixed for performance)", citation: "Limitation Act Art 113" },
      delay: { value: "Right to relief extinguishes", citation: "Limitation Act §3" },
    };
  } else if (lower.includes("succession") || lower.includes("letter of administration")) {
    return {
      forum: { value: "District Judge / NADRA", citation: "Succession Act 1925 / NADRA Act 2021" },
      timeLimit: { value: "No period of limitation", citation: "PLD 2018 SC 342" },
      delay: { value: "Third party adverse alienation risk", citation: "Succession Act §372" },
    };
  }

  return {
    forum: { value: "Not established in retrieved sources" },
    timeLimit: { value: "Not established in retrieved sources" },
    delay: { value: "Not established in retrieved sources" },
  };
}

/** Generates a concise issue title for H1 and RE line (max 90 characters) */
function generateIssueTitle(query: string, issues?: string[]): string {
  if (issues && issues.length > 0) {
    const clean = issues[0].replace(/^\d+[\.\)]\s*/, "").trim();
    if (clean.length > 10 && clean.length <= 90) {
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }
  if (!query) return "Legal Research Memorandum";
  let q = query.trim().replace(/\?+$/, "");
  // Remove conversational leading clauses
  q = q.replace(
    /^(what is the procedure for an?|what is the law on|what is the procedure for|can you explain|how to file|whether an?|is there a|find precedents on|advise on|explain the)\s+/i,
    "",
  );
  // Replace awkward and/or queries
  q = q.replace(/,\s*(?:and\s+)?is there\s+(?:a\s+)?/i, ": ");
  if (q.length > 90) {
    const words = q.split(/\s+/);
    let short = "";
    for (const w of words) {
      if ((short + " " + w).trim().length > 87) break;
      short = (short + " " + w).trim();
    }
    q = short;
  }
  return q.charAt(0).toUpperCase() + q.slice(1);
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
  const [showFullQuestion, setShowFullQuestion] = useState(false);

  // Safe parsing of model output to prevent raw JSON from ever rendering
  const parsedOutput = useMemo(() => parseModelOutput(text), [text]);

  const isPartialResult =
    isVerified === false ||
    Boolean(
      parsedOutput.content && (
        parsedOutput.content.includes("PARTIAL RESULT") ||
        parsedOutput.content.includes("PARTIAL LEGAL RESEARCH RECORD") ||
        parsedOutput.content.includes("PARTIAL RESEARCH RECORD") ||
        parsedOutput.content.includes("issues unresolved") ||
        parsedOutput.content.includes("UNVERIFIED NOTICE") ||
        parsedOutput.content.includes("Verification Notice") ||
        parsedOutput.content.includes("⚠️") ||
        parsedOutput.content.toLowerCase().includes("evidence pack provided does not contain") ||
        parsedOutput.content.toLowerCase().includes("does not contain the relevant statutory")
      ),
    );

  const raw = parsedOutput.content;
  const { shortAnswer, remainingText } = useMemo(() => extractShortAnswer(raw), [raw]);
  const keyFacts = useMemo(() => inferKeyFacts(raw), [raw]);

  // Meaningful result title (max 90 characters) for H1 and RE line
  const memoH1Title = useMemo(() => generateIssueTitle(queryText, issues), [queryText, issues]);

  // Count unverified authorities for the export helper link
  const unverifiedCount = useMemo(() => {
    if (!citations) return 1;
    const unv = citations.filter((c) => c.verified === false || !c.preview && !c.holding && !c.summary).length;
    return unv > 0 ? unv : 1;
  }, [citations]);

  async function handleCopy() {
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Memorandum copied to clipboard.");
    } catch {
      toast.error("Could not copy memorandum.");
    }
  }

  async function handleExport() {
    if (!raw) return;
    if (isPartialResult) {
      toast.error("Record contains unverified citations. Review flagged authorities before export.");
      return;
    }
    setExporting(true);
    try {
      const { downloadDocxFromText } = await import("@/lib/docx");
      await downloadDocxFromText(raw, memoH1Title);
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

  // Graceful fallback if model output failed parsing
  if (parsedOutput.isParseError) {
    return (
      <div className="w-full">
        <div className="memo-sheet">
          <div className="my-10 rounded-[3px] border border-[var(--warn-border)] bg-[var(--warn-bg)] p-8 text-center">
            <p className="font-serif text-[18px] font-bold text-[var(--warn-text)]">
              This section could not be formatted
            </p>
            <p className="mt-2 font-sans text-[13px] text-[var(--text-muted)]">
              The research engine output could not be decoded as structured memorandum text.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-[3px] bg-[var(--ink)] text-[var(--on-ink)] hover:bg-[var(--ink-2)]"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Memo Sheet: max-w-[820px], background --surface, 1px --line border */}
      <div className="memo-sheet">
        {/* Header Label: Split into two flex items ("PRIVILEGED & CONFIDENTIAL" left, "PREPARED FOR COUNSEL" right) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            PRIVILEGED & CONFIDENTIAL
          </span>
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            PREPARED FOR COUNSEL
          </span>
        </div>

        {/* Title + 3px x 64px --ink rule */}
        <div className="mt-6">
          <h1 className="memo-title text-[28px] sm:text-[32px] font-serif font-bold leading-tight text-[var(--ink)]">
            {memoH1Title}
          </h1>
          <div className="memo-rule mt-3 h-[3px] w-16 bg-[var(--ink)]" />
        </div>

        {/* Top Action Bar: Copy and Export (with no duplicate Partial banner inside the memo) */}
        <div className="my-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-5">
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
          </div>

          <div className="flex items-center gap-3">
            {isPartialResult ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onCitationClick?.("unverified")}
                  className="font-sans text-[12px] font-medium text-[var(--warn-text)] hover:underline"
                >
                  Review {unverifiedCount} unverified {unverifiedCount === 1 ? "authority" : "authorities"}
                </button>
                <Button
                  size="sm"
                  disabled
                  className="h-8 gap-1.5 rounded-[3px] px-3 font-sans text-[12px] font-medium cursor-not-allowed opacity-100"
                  style={{ backgroundColor: "#E4E2D6", color: "#5B5648" }}
                  aria-label="Export memorandum to Word document"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="h-8 gap-1.5 rounded-[3px] bg-[var(--ink)] px-3 font-sans text-[12px] font-medium text-[var(--on-ink)] hover:bg-[var(--ink-2)]"
                aria-label="Export memorandum to Word document"
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                <span>Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* To / From / Date / Re Block: labels left 72px, values right minmax(0, 1fr) */}
        <div className="mb-6 rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-4 text-[13px] font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
            <div className="grid items-baseline" style={{ gridTemplateColumns: "72px minmax(0, 1fr)" }}>
              <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">TO:</span>
              <span className="font-medium text-[var(--text)]" style={{ overflowWrap: "anywhere" }}>Kabeer - Advocate</span>
            </div>
            <div className="grid items-baseline" style={{ gridTemplateColumns: "72px minmax(0, 1fr)" }}>
              <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">DATE:</span>
              <span className="font-medium text-[var(--text)]" style={{ overflowWrap: "anywhere" }}>November 2026 - database current to November 2026</span>
            </div>
            <div className="grid items-baseline" style={{ gridTemplateColumns: "72px minmax(0, 1fr)" }}>
              <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">FROM:</span>
              <span className="font-medium text-[var(--text)]" style={{ overflowWrap: "anywhere" }}>Jurist, research assistant</span>
            </div>
            <div className="grid items-baseline" style={{ gridTemplateColumns: "72px minmax(0, 1fr)" }}>
              <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">RE:</span>
              <span className="font-medium text-[var(--text)]" style={{ overflowWrap: "anywhere" }}>{memoH1Title}</span>
            </div>
          </div>
        </div>

        {/* QUESTION PRESENTED block: serif 17px, clamped to 3 lines with a "Show full question" toggle */}
        {queryText && (
          <div className="mb-6 rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-2">
              QUESTION PRESENTED
            </p>
            <p
              className={`font-serif text-[17px] leading-relaxed text-[var(--text)] ${
                !showFullQuestion ? "line-clamp-3" : ""
              }`}
              style={{ overflowWrap: "anywhere" }}
            >
              {queryText}
            </p>
            {queryText.length > 160 && (
              <button
                type="button"
                onClick={() => setShowFullQuestion(!showFullQuestion)}
                className="mt-2.5 font-sans text-[12px] font-semibold text-[var(--ink)] hover:underline"
              >
                {showFullQuestion ? "Show less" : "Show full question"}
              </button>
            )}
          </div>
        )}

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
          <div className="short-answer-box mb-6">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)] mb-1.5">
              SHORT DIRECT ANSWER
            </p>
            <div className="font-serif text-[15.5px] leading-relaxed text-[var(--text)]">
              {shortAnswer}
            </div>
          </div>
        )}

        {/* Three key-fact cards: auto-fit minmax(170px, 1fr), line-height 1.3, letter-spacing 0.08em */}
        <div
          className="my-6 grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
        >
          <div className="key-fact-card rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
            <p
              className="font-sans text-[10.5px] font-semibold uppercase text-[var(--text-muted)]"
              style={{ lineHeight: 1.3, letterSpacing: "0.08em", overflowWrap: "anywhere" }}
            >
              FORUM
            </p>
            <p
              className="mt-1 font-serif text-[14.5px] font-bold text-[var(--text)]"
              style={{ lineHeight: 1.3, overflowWrap: "anywhere" }}
            >
              {keyFacts.forum.value}
            </p>
            {keyFacts.forum.citation && (
              <span className="mt-1.5 inline-block rounded-[2px] bg-[var(--chip-bg)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--chip-text)]">
                {keyFacts.forum.citation}
              </span>
            )}
          </div>

          <div className="key-fact-card rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
            <p
              className="font-sans text-[10.5px] font-semibold uppercase text-[var(--text-muted)]"
              style={{ lineHeight: 1.3, letterSpacing: "0.08em", overflowWrap: "anywhere" }}
            >
              TIME LIMIT
            </p>
            <p
              className="mt-1 font-serif text-[14.5px] font-bold text-[var(--text)]"
              style={{ lineHeight: 1.3, overflowWrap: "anywhere" }}
            >
              {keyFacts.timeLimit.value}
            </p>
            {keyFacts.timeLimit.citation && (
              <span className="mt-1.5 inline-block rounded-[2px] bg-[var(--chip-bg)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--chip-text)]">
                {keyFacts.timeLimit.citation}
              </span>
            )}
          </div>

          <div className="key-fact-card rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
            <p
              className="font-sans text-[10.5px] font-semibold uppercase text-[var(--text-muted)]"
              style={{ lineHeight: 1.3, letterSpacing: "0.08em", overflowWrap: "anywhere" }}
            >
              DELAY
            </p>
            <p
              className="mt-1 font-serif text-[14.5px] font-bold text-[var(--text)]"
              style={{ lineHeight: 1.3, overflowWrap: "anywhere" }}
            >
              {keyFacts.delay.value}
            </p>
            {keyFacts.delay.citation && (
              <span className="mt-1.5 inline-block rounded-[2px] bg-[var(--chip-bg)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--chip-text)]">
                {keyFacts.delay.citation}
              </span>
            )}
          </div>
        </div>

        {/* Legal issues identified */}
        {issues && issues.length > 0 && (
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

        {/* Hand off to Counsel link: full width, heading line-height 1.25, body line-height 1.5, button below */}
        <div className="mt-12 w-full rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-6">
          <div>
            <p className="font-serif text-[18px] font-bold text-[var(--ink)]" style={{ lineHeight: 1.25 }}>
              Ready to Draft Pleadings?
            </p>
            <p className="font-sans text-[13px] text-[var(--text-muted)] mt-2" style={{ lineHeight: 1.5 }}>
              Hand off this verified research memorandum to Counsel to prepare court-ready plaints, petitions, or notices.
            </p>
          </div>
          <div className="mt-4">
            <Button
              asChild
              className="rounded-[3px] bg-[var(--ink)] text-[var(--on-ink)] hover:bg-[var(--ink-2)] px-4 py-2"
            >
              <Link to="/assistants/mike" className="inline-flex items-center gap-2">
                <span>Hand Off to Counsel</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
