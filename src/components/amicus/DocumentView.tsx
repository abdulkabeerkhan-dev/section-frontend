import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Markdown } from "./Markdown";
import { downloadDocxFromText } from "@/lib/docx";
import { downloadPdfFromText } from "@/lib/pdf";
import { toast } from "sonner";

interface DocumentViewProps {
  text: string;
  docId: string | null;
  fileName: string;
}

export function DocumentView({ text, docId, fileName }: DocumentViewProps) {
  const [downloading, setDownloading] = useState<null | "docx" | "pdf">(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPartialRecord = Boolean(
    text && (
      text.includes("PARTIAL RESULT") ||
      text.includes("PARTIAL LEGAL RESEARCH RECORD") ||
      text.includes("UNVERIFIED NOTICE") ||
      text.includes("Verification Notice") ||
      text.includes("⚠️")
    )
  );

  async function handleDownload(format: "docx" | "pdf") {
    if (!text.trim()) return;
    if (isPartialRecord) {
      toast.error("Export is gated on partial or unverified research records. Verify all primary records to unlock export.");
      return;
    }
    setMenuOpen(false);
    setDownloading(format);
    try {
      if (format === "docx") await downloadDocxFromText(text, fileName);
      else await downloadPdfFromText(text, fileName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate document.");
    } finally {
      setDownloading(null);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy text.");
    }
  }

  return (
    <div className="rounded border border-border bg-card">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          {text.trim() && (
            isPartialRecord ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  title="Export is gated on partial or unverified research records. Verify all primary records to unlock export."
                  className="cursor-not-allowed rounded bg-muted px-3.5 py-1.5 text-[13px] font-semibold text-muted-foreground border border-border opacity-70"
                >
                  Download .docx (Gated)
                </button>
                <span className="hidden sm:inline-block rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500 border border-amber-500/20">
                  Export Gated (Partial Record)
                </span>
              </div>
            ) : (
            <div className="relative flex items-stretch">
              <button
                type="button"
                onClick={() => handleDownload("docx")}
                disabled={downloading !== null}
                className="rounded-l bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {downloading === "docx"
                  ? "Preparing…"
                  : downloading === "pdf"
                    ? "Preparing PDF…"
                    : "Download .docx"}
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                disabled={downloading !== null}
                aria-label="More download formats"
                className="flex items-center rounded-r border-l border-primary-foreground/20 bg-primary px-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div
                  className="absolute left-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-md border border-border bg-popover shadow-lg"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => handleDownload("docx")}
                    className="block w-full px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
                  >
                    Download as .docx
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload("pdf")}
                    className="block w-full px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
                  >
                    Download as .pdf
                  </button>
                </div>
              )}
            </div>
            )
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded border border-border px-3.5 py-1.5 text-[13px] text-foreground/90 transition-colors hover:border-gold/40"
          >
            {copied ? "Copied" : "Copy text"}
          </button>
        </div>
        <span className="text-[11.5px] text-muted-foreground">
          Database current as of November 2026
        </span>
      </div>

      <div className="px-3 py-5 sm:px-6 sm:py-7">
        <div className="relative mx-auto max-w-[74ch] overflow-hidden rounded-sm border border-border bg-card px-7 py-9 text-foreground shadow-sm sm:px-12">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] whitespace-nowrap text-[64px] font-semibold uppercase tracking-widest text-black/[0.04]"
          >
            DRAFT | Section
          </span>
          <article
            className="relative mx-auto max-w-[68ch] [&_.amicus-markdown]:text-foreground"
          >
            <Markdown memorandum>{text}</Markdown>
          </article>
        </div>
      </div>
    </div>
  );
}
