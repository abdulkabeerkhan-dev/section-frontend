import type { ReactNode } from "react";
import { Gavel, FileText } from "lucide-react";
import { resolvePdfUrl, type CaseResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { cleanCaseTitle } from "@/lib/case-title";
import { StructuredDetails } from "./StructuredDetails";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CaseDetailDialogProps {
  data: CaseResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * Shared modal that displays the full preview / summary for a CaseResult.
 * Used by both CaseCard (precedent list) and CitationLink (inline citations).
 */
export function CaseDetailDialog({ data, open, onOpenChange }: CaseDetailDialogProps) {
  const court = data.court || null;
  const citation = data.citation || data.case_id || null;
  const hasPreview = Boolean(data.preview && data.preview.trim().length > 0);
  const isHigh = data.relevance === "high";
  const relevanceLabel =
    data.relevance === "high"
      ? "High relevance"
      : data.relevance === "low"
        ? "Low relevance"
        : "Medium relevance";
  const pdfUrl = resolvePdfUrl(data.pdf_url, data.case_id) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px] leading-snug">
            {data.source_url ? (
              <a
                href={data.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-gold/50 decoration-dotted underline-offset-4 transition-colors hover:text-gold hover:decoration-gold"
              >
                {cleanCaseTitle(data.title) || court || "Untitled case"}
              </a>
            ) : (
              cleanCaseTitle(data.title) || court || "Untitled case"
            )}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              {citation && (
                <span className="text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground/70">Case No:</span>{" "}
                  <span className="font-medium text-foreground/90">{citation}</span>
                </span>
              )}
              {data.year > 0 && (
                <span className="text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground/70">Date:</span>{" "}
                  <span className="font-medium text-foreground/90">{data.year}</span>
                </span>
              )}
              {court && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-primary">
                  <Gavel className="h-3 w-3" aria-hidden />
                  {court}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <h5 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Case Preview / Summary
            </h5>
            {hasPreview ? (
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
                {data.preview}
              </p>
            ) : data.summary ? (
              <p className="mt-2 text-[14px] leading-relaxed text-foreground/90">{data.summary}</p>
            ) : (
              <p className="mt-2 text-[13px] text-muted-foreground">
                No preview available for this case.
              </p>
            )}
            <StructuredDetails data={data} />
          </div>


          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isHigh ? "bg-gold" : "bg-muted-foreground",
                )}
              />
              <span className={cn("text-[12px]", isHigh ? "text-gold" : "text-muted-foreground")}>
                {relevanceLabel}
              </span>
            </span>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-[12px] font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                View PDF
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
