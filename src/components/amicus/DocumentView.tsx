import { useState } from "react";
import {
  FileDown,
  Copy,
  Check,
  BookOpen,
  X,
  Type,
  Bold,
  Italic,
  ListOrdered,
  FileSignature,
  FileText,
} from "lucide-react";

import { Markdown } from "./Markdown";
import { downloadDocxFromText } from "@/lib/docx";
import { downloadPdfFromText } from "@/lib/pdf";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface DocumentViewProps {
  text: string;
  docId: string | null;
  fileName: string;
}

export function DocumentView({ text, docId, fileName }: DocumentViewProps) {
  const [downloading, setDownloading] = useState<null | "docx" | "pdf">(null);
  const [copied, setCopied] = useState(false);
  const [trackChanges, setTrackChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<"draft" | "review">("draft");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"clauses" | "sources" | "comments">("sources");

  const isPartialRecord = Boolean(
    text && (
      text.includes("PARTIAL RESULT") ||
      text.includes("PARTIAL LEGAL RESEARCH RECORD") ||
      text.includes("PARTIAL RESEARCH RECORD") ||
      text.includes("issues unresolved") ||
      text.includes("UNVERIFIED NOTICE") ||
      text.includes("Verification Notice") ||
      text.includes("⚠️")
    )
  );

  async function handleDownload(format: "docx" | "pdf") {
    if (!text.trim()) return;
    if (isPartialRecord) {
      toast.error("Export blocked: document contains unverified authorities.");
      return;
    }
    setDownloading(format);
    try {
      if (format === "docx") await downloadDocxFromText(text, fileName);
      else await downloadPdfFromText(text, fileName);
      toast.success(`Exported ${format.toUpperCase()} document.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export document.");
    } finally {
      setDownloading(null);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Court document copied to clipboard.");
    } catch {
      toast.error("Could not copy document.");
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[840px] pb-16">
      {/* Top sticky editor toolbar: --surface-2, 1px --line bottom */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-2.5 shadow-sm rounded-t-[3px]">
        {/* Left: Mode toggle Draft/Review + Track Changes */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-[3px] bg-[var(--chip-bg)] p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("draft")}
              className={`rounded-[3px] px-3 py-1 font-sans text-[12px] font-semibold transition-all ${
                activeTab === "draft"
                  ? "bg-[var(--ink)] text-[var(--on-ink)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("review")}
              className={`rounded-[3px] px-3 py-1 font-sans text-[12px] font-semibold transition-all ${
                activeTab === "review"
                  ? "bg-[var(--ink)] text-[var(--on-ink)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Review
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--line-strong)] mx-1" />

          {/* Track Changes toggle */}
          <button
            type="button"
            onClick={() => setTrackChanges(!trackChanges)}
            className={`flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1 font-sans text-[11px] font-semibold transition-colors ${
              trackChanges
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--on-ink)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
            aria-label="Toggle tracked changes"
          >
            <span>Track Changes</span>
            {trackChanges && <span className="h-1.5 w-1.5 rounded-full bg-[var(--on-ink)]" />}
          </button>
        </div>

        {/* Right: Sources drawer trigger & Export actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="h-8 gap-1.5 rounded-[3px] border-[var(--line)] bg-[var(--surface)] font-sans text-[12px] font-medium text-[var(--text)] hover:bg-[var(--chip-bg)]"
            aria-label="Toggle sources drawer"
          >
            <BookOpen className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span>Sources</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 gap-1.5 rounded-[3px] border-[var(--line)] bg-[var(--surface)] font-sans text-[12px] font-medium text-[var(--text)] hover:bg-[var(--chip-bg)]"
            aria-label="Copy court document text"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>

          {isPartialRecord && (
            <span className="font-sans text-[11px] text-[var(--warn-text)]">
              Export blocked: partial record
            </span>
          )}
          <Button
            size="sm"
            onClick={() => handleDownload("docx")}
            disabled={downloading !== null || isPartialRecord}
            className="h-8 gap-1.5 rounded-[3px] bg-[var(--ink)] px-3 font-sans text-[12px] font-medium text-[var(--on-ink)] hover:bg-[var(--ink-2)] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Export document to Word"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>{downloading === "docx" ? "Preparing..." : "Export .docx"}</span>
          </Button>
        </div>
      </div>

      {/* Main Court Paper Document: 760px wide, --surface on --page */}
      <div className="mt-4 court-paper">
        {/* Court Heading Block */}
        <div className="court-heading">
          IN THE COURT OF THE LEARNED SENIOR CIVIL JUDGE / SESSIONS JUDGE
          <br />
          AT LAHORE / KARACHI / ISLAMABAD, PAKISTAN
        </div>

        {/* Parties Block */}
        <div className="mb-6 flex justify-between font-sans text-[13px] text-[var(--text)]">
          <div>
            <p className="font-semibold uppercase tracking-wide">Petitioner / Plaintiff</p>
            <p className="text-[var(--text-muted)] mt-0.5">[Party Name]</p>
          </div>
          <div className="text-center font-bold italic font-serif">Versus</div>
          <div className="text-right">
            <p className="font-semibold uppercase tracking-wide">Respondent / Defendant</p>
            <p className="text-[var(--text-muted)] mt-0.5">[State / Opposite Party]</p>
          </div>
        </div>

        {/* Document Title with double underline */}
        <div className="court-title">
          {fileName.replace(/[-_]/g, " ").toUpperCase() || "PETITION / WRITTEN PLEADING"}
        </div>

        {/* Body content rendered as numbered legal paragraphs */}
        <article className="font-serif text-[16px] leading-[1.8] text-[var(--text)]">
          <Markdown memorandum>{text}</Markdown>
        </article>

        {/* Formal Signature Block */}
        <div className="mt-14 border-t border-[var(--line)] pt-8">
          <div className="flex justify-between font-sans text-[13px] text-[var(--text)]">
            <div>
              <p className="font-semibold uppercase tracking-wider text-[var(--text-muted)] text-[11px]">DATED</p>
              <p className="mt-1 font-medium">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold uppercase tracking-wider text-[var(--text)]">ADVOCATE HIGH COURT</p>
              <p className="text-[var(--text-muted)] mt-0.5">Counsel for the Petitioner</p>
              <p className="text-[var(--text-muted)] text-[12px] mt-1">High Court Bar Association</p>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Sources Drawer on right side */}
      {drawerOpen && (
        <aside
          className="fixed right-0 top-0 z-50 flex h-full w-[360px] flex-col border-l border-[var(--line)] bg-[var(--surface)] p-6 shadow-xl"
          aria-label="Document sources and clauses drawer"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                DRAFTING ASSISTANT
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-[3px] p-1 text-[var(--text-muted)] hover:text-[var(--ink)]"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Tabs: Clauses · Sources · Comments */}
          <div className="mt-4 flex border-b border-[var(--line)]">
            <button
              type="button"
              onClick={() => setDrawerTab("sources")}
              className={`flex-1 border-b-2 py-2 font-sans text-[12px] font-semibold transition-colors ${
                drawerTab === "sources"
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Sources
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab("clauses")}
              className={`flex-1 border-b-2 py-2 font-sans text-[12px] font-semibold transition-colors ${
                drawerTab === "clauses"
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Clauses
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab("comments")}
              className={`flex-1 border-b-2 py-2 font-sans text-[12px] font-semibold transition-colors ${
                drawerTab === "comments"
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Comments
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            {drawerTab === "sources" && (
              <div className="space-y-4">
                <p className="font-sans text-[12px] text-[var(--text-muted)]">
                  Primary statutory provisions and judicial ratios relied upon in this pleading:
                </p>
                <div className="rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[13px]">
                  <p className="font-semibold text-[var(--ink)]">Pakistan Penal Code, 1860</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1">Section 489-F — Dishonestly issuing a cheque towards repayment of loan.</p>
                </div>
                <div className="rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[13px]">
                  <p className="font-semibold text-[var(--ink)]">Code of Criminal Procedure, 1898</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1">Section 498 — Pre-arrest bail power of High Court and Court of Session.</p>
                </div>
              </div>
            )}
            {drawerTab === "clauses" && (
              <div className="space-y-3">
                <p className="font-sans text-[12px] text-[var(--text-muted)]">Quick standard court clauses:</p>
                <div className="rounded-[3px] border border-[var(--line)] p-3 text-[12px] hover:border-[var(--ink)] cursor-pointer">
                  <p className="font-semibold text-[var(--ink)]">Jurisdiction Clause</p>
                  <p className="text-[var(--text-muted)] mt-1">"That the cause of action arose within the territorial jurisdiction of this Honorable Court..."</p>
                </div>
                <div className="rounded-[3px] border border-[var(--line)] p-3 text-[12px] hover:border-[var(--ink)] cursor-pointer">
                  <p className="font-semibold text-[var(--ink)]">Prayer Clause</p>
                  <p className="text-[var(--text-muted)] mt-1">"It is therefore most respectfully prayed that this Honorable Court may graciously be pleased to..."</p>
                </div>
              </div>
            )}
            {drawerTab === "comments" && (
              <div className="py-8 text-center font-sans text-[13px] text-[var(--text-muted)]">
                No advocate review comments added yet.
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
