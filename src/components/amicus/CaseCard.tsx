import { useState } from "react";
import { ChevronDown, Gavel } from "lucide-react";
import type { CaseResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { cleanCaseTitle } from "@/lib/case-title";
import { StructuredDetails } from "./CaseSections";
import { ReportIssueControl } from "./ReportIssueControl";


export function CaseCard({ data, index }: { data: CaseResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const relevance = data.relevance;
  const relevanceLabel =
    relevance === "high" ? "High relevance" : relevance === "low" ? "Low relevance" : "Medium relevance";
  const isHigh = relevance === "high";
  const court = data.court || null;
  const yearLabel = data.year > 0 ? `Date: ${data.year}` : null;
  const citationLabel = data.citation || data.case_id || null;
  const titleFallback = cleanCaseTitle(data.title) || court || "Untitled case";
  const hasPreview = Boolean(data.preview && data.preview.trim().length > 0);
  const previewText = hasPreview ? data.preview : data.summary;

  return (
    <article
      className="fade-up cursor-pointer rounded border border-border bg-card p-4 transition-colors hover:border-gold/40"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
      <h4 className="font-sans text-[17px] font-bold leading-snug text-foreground">
        {data.source_url ? (
          <a
            href={data.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-foreground underline decoration-gold/50 decoration-dotted underline-offset-4 transition-colors hover:text-gold hover:decoration-gold"
          >
            {titleFallback}
          </a>
        ) : (
          titleFallback
        )}
      </h4>

      {/* Sub-header: labeled citation + date, and a colored court pill */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {citationLabel && (
          <span className="text-[13px] text-muted-foreground">
            <span className="font-semibold text-foreground/70">Case No:</span>{" "}
            <span className="font-medium text-foreground/90">{citationLabel}</span>
          </span>
        )}
        {yearLabel && (
          <span className="text-[13px] text-muted-foreground">
            <span className="font-semibold text-foreground/70">{yearLabel.split(":")[0]}:</span>
            <span className="font-medium text-foreground/90">{yearLabel.split(":")[1]}</span>
          </span>
        )}
        {court && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-primary">
            <Gavel className="h-3 w-3" aria-hidden />
            {court}
          </span>
        )}
      </div>

      {data.summary && !expanded && (
        <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">{data.summary}</p>
      )}

      {expanded && (
        <div className="mt-4 border-t border-border pt-3">
          <h5 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Case Preview / Summary
          </h5>
          {previewText ? (
            <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground/90">
              {previewText}
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              No preview available for this case.
            </p>
          )}
          <StructuredDetails data={data} />
        </div>
      )}


      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", isHigh ? "bg-gold" : "bg-muted-foreground")} />
            <span className={cn("text-[12px]", isHigh ? "text-gold" : "text-muted-foreground")}>
              {relevanceLabel}
            </span>
          </span>
          <ReportIssueControl data={data} />
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] text-foreground/60">
          {expanded ? "Hide preview" : hasPreview ? "Tap for case preview" : "Tap for details"}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </span>
      </div>
    </article>
  );
}


