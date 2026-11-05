import { useState } from "react";
import { Check, Copy, FileDown, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";

import { exportCourtPleading, type CaseResult } from "@/lib/api";
import { Markdown } from "./Markdown";
import { useQueryText } from "./ReportIssueControl";
import { Button } from "@/components/ui/button";
import { PrecedentWarning } from "./PrecedentWarning";
import { useAssistant } from "@/lib/assistant";

interface AnalysisViewProps {
  issues: string[];
  text: string | null;
  citations?: CaseResult[];
  /** Job id of the query that produced this answer (used for exports). */
  jobId?: string | null;
  /** Rendered at the bottom of the answer (e.g. the "Continue answer" control). */
  footer?: React.ReactNode;
  /** Conversational intake replies render as plain chat text. */
  intake?: boolean;
  precedentStatus?: string;
  precedentStatusWarning?: string;
  supersedingCitation?: string;
  supersedingCaseName?: string;
  onCitationClick?: (citation: string) => void;
}

function removeEmbeddedPrecedentWarning(text: string, warningText?: string): string {
  let cleaned = text;
  if (warningText?.trim()) cleaned = cleaned.replace(warningText.trim(), "");
  return cleaned
    .replace(/^>\s*(?:[*_]{1,2})?⚠️?\s*Precedent Status Warning(?:[*_]{1,2})?:?[^\n]*(?:\n>[^\n]*)*/gim, "")
    .replace(/^\s*(?:[*_]{1,2})?⚠️?\s*Precedent Status Warning(?:[*_]{1,2})?:?[^\n]*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const isMike = useAssistant() === "mike";
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          toast.error("Could not copy memorandum.");
        }
      }}
      aria-label="Copy legal memorandum to clipboard"
      className="gap-2 rounded-sm border-border bg-card text-foreground shadow-none hover:border-primary/40 hover:bg-accent"
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      {copied ? "Copied" : isMike ? "Copy Pleading" : "Copy Legal Memorandum"}
    </Button>
  );
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "court-pleading"
  );
}

function ExportPleadingButton({ text, jobId }: { text: string; jobId?: string | null }) {
  const { getToken } = useAuth();
  const query = useQueryText();
  const [busy, setBusy] = useState(false);
  const isMike = useAssistant() === "mike";

  return (
    <Button
      variant="default"
      size="sm"
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const name = slugify(query || "court-pleading");
        try {
          const token = (await getToken()) ?? "";
          const blob = await exportCourtPleading(
            { answer: text, query: query || undefined, job_id: jobId ?? undefined, title: query },
            token,
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${name}.docx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error(err);
          // Fall back to generating the document in the browser so the user
          // still gets a usable pleading.
          try {
            const { downloadDocxFromText } = await import("@/lib/docx");
            await downloadDocxFromText(text, name);
            toast.success("Exported a local copy of the pleading.");
          } catch {
            toast.error(err instanceof Error ? err.message : "Could not export the pleading.");
          }
        } finally {
          setBusy(false);
        }
      }}
      aria-label="Export a court-ready pleading document"
      className="gap-2 rounded-sm bg-primary text-primary-foreground shadow-none hover:bg-authority"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <FileDown className="h-4 w-4" aria-hidden />
      )}
      {isMike ? "Export to Word (.docx)" : "Export Court Pleading"}
    </Button>
  );
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
  onCitationClick,
}: AnalysisViewProps) {
  if (intake) {
    const body = text?.trim() ?? "";
    return (
      <article className="font-sans text-[15px] leading-7 text-foreground">
        {body ? (
          <Markdown>{body}</Markdown>
        ) : (
          <p className="text-sm text-muted-foreground">No response was returned.</p>
        )}
        {footer && <div className="mt-6">{footer}</div>}
      </article>
    );
  }

  const assistant = useAssistant();
  const isDrafting = assistant === "mike" || assistant === "counsel";
  const withoutEmbeddedWarning = removeEmbeddedPrecedentWarning(text ?? "", precedentStatusWarning);
  const answer = withoutEmbeddedWarning;
  const hasBody = Boolean(answer.trim());
  const hasAnything = issues.length > 0 || hasBody;

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card shadow-none">
      <article className="font-sans text-[15px] leading-7">
        <header className="flex flex-col gap-5 border-b border-border bg-card px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-authority">Research memorandum</p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">Legal opinion</h2>
          </div>
          {hasBody && (
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={answer} />
              <ExportPleadingButton text={answer} jobId={jobId} />
              {!isDrafting && (
                <Link
                  to="/assistants/mike"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-authority/40 bg-authority/10 px-3 py-1.5 text-xs font-semibold text-authority transition-colors hover:bg-authority/20"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Hand Off to Counsel
                </Link>
              )}
            </div>
          )}
        </header>

        {precedentStatus && (
          <div className="px-5 pt-6 sm:px-10">
            <PrecedentWarning
              status={precedentStatus}
              warningText={precedentStatusWarning}
              supersedingCitation={supersedingCitation}
              supersedingName={supersedingCaseName}
              onCitationClick={onCitationClick}
            />
          </div>
        )}

        <div className="px-5 py-8 sm:px-10 sm:py-11">
        {issues.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground">Legal issues identified</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {issues.map((issue, i) => (
                 <span
                  key={`${issue}-${i}`}
                   className="border-l border-primary bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {issue}
                </span>
              ))}
            </div>
          </section>
        )}

        {hasBody && (
          <section className={issues.length > 0 ? "mt-8" : ""}>
            <Markdown citations={citations} memorandum>{answer}</Markdown>
          </section>
        )}

        {!hasAnything && (
          <p className="text-[14px] text-muted-foreground">
            No analysis was returned for this matter.
          </p>
        )}
        {hasBody && !isDrafting && (
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-sm border border-border bg-muted/30 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-serif text-base font-semibold text-foreground">Courtroom Drafting Handoff</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Transfer this verified opinion to Counsel to draft high court petitions with Article 189 bindings.</p>
            </div>
            <Link
              to="/assistants/mike"
              className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-none hover:bg-authority"
            >
              <PenLine className="h-4 w-4" />
              Hand Off to Counsel for Drafting
            </Link>
          </div>
        )}
        {footer && <div className="mt-6">{footer}</div>}
        </div>
      </article>
    </div>
  );
}
