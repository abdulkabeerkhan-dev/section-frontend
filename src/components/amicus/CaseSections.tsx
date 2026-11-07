import { StructuredDetails } from "./StructuredDetails";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { CaseResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";
import { ReportIssueControl } from "./ReportIssueControl";

export interface CaseSection {
  /** Heading text of the `###` case header (without the hashes). */
  heading: string;
  /** Markdown body that belongs to this case. */
  body: string;
  /** Structured backend citation matched to this section, when available. */
  data?: CaseResult;
}

export interface ParsedAnalysis {
  /** Markdown before the first case heading. */
  intro: string;
  sections: CaseSection[];
}

function normalize(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Find the structured citation whose citation/case id/title appears in the heading. */
function matchCase(heading: string, cases: CaseResult[]): CaseResult | undefined {
  const h = normalize(heading);
  let best: CaseResult | undefined;
  let bestLen = 0;
  for (const c of cases) {
    for (const key of [c.citation, c.case_id, c.title]) {
      const k = key ? normalize(key) : "";
      if (k.length >= 4 && h.includes(k) && k.length > bestLen) {
        best = c;
        bestLen = k.length;
      }
    }
  }
  return best;
}

/**
 * Splits the model's markdown answer into an intro plus one block per `###`
 * case heading, so each precedent can be rendered as its own card.
 */
export function parseCaseSections(text: string, cases: CaseResult[]): ParsedAnalysis {
  const lines = text.split("\n");
  const intro: string[] = [];
  const sections: CaseSection[] = [];
  let current: CaseSection | null = null;
  const buffer: string[] = [];

  const flush = () => {
    if (current) {
      current.body = buffer.join("\n").trim();
      sections.push(current);
    }
    buffer.length = 0;
  };

  for (const line of lines) {
    const m = /^###\s+(.*)$/.exec(line.trim());
    const heading = m ? m[1].replace(/[*_`]/g, "").trim() : "";
    // Only headings that match real backend precedent data become case cards;
    // structural headings ("EXECUTIVE SUMMARY", "LEGAL ANALYSIS"…) stay prose
    // so the "Cases discussed" count reflects actual precedents only.
    const data = m ? matchCase(heading, cases) : undefined;
    if (m && data) {
      flush();
      current = { heading, body: "", data };
    } else if (current) {
      buffer.push(line);
    } else {
      intro.push(line);
    }
  }
  flush();

  return { intro: intro.join("\n").trim(), sections };
}

export { StructuredDetails } from "./StructuredDetails";

function CaseSectionCard({
  section,
  index,
  citations,
}: {
  section: CaseSection;
  index: number;
  citations?: CaseResult[];
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const data = section.data;
  const court = data?.court;
  const year = data?.year && data.year > 0 ? data.year : null;
  const citation = data?.citation || data?.case_id || null;

  return (
    <article className="overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-foreground/25">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-[11px] font-semibold text-gold">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-base font-semibold leading-snug text-foreground">
            {data?.source_url ? (
              <a
                href={data.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="underline decoration-gold/50 decoration-dotted underline-offset-4 transition-colors hover:text-gold"
              >
                {section.heading}
              </a>
            ) : (
              section.heading
            )}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {citation && (
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/70">Case No:</span>{" "}
                <span className="font-medium text-foreground/90">{citation}</span>
              </span>
            )}
            {year && (
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/70">Year:</span>{" "}
                <span className="font-medium text-foreground/90">{year}</span>
              </span>
            )}
            {court && (
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {court}
              </span>
            )}
            {data?.verified && (
              <span className="inline-flex items-center gap-1 rounded border border-gold/40 bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                Verified source
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          {section.body ? (
            <Markdown citations={citations}>{section.body}</Markdown>
          ) : (
            <p className="text-[13px] text-muted-foreground">No further detail for this case.</p>
          )}
          {data && <StructuredDetails data={data} />}
          <div className="mt-3 flex justify-end">
            <ReportIssueControl data={data} fallbackTitle={section.heading} />
          </div>
        </div>
      )}
    </article>
  );
}

/** Renders one distinct, expandable card per case found in the answer. */
export function CaseSectionList({
  sections,
  citations,
}: {
  sections: CaseSection[];
  citations?: CaseResult[];
}) {
  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <CaseSectionCard key={`${s.heading}-${i}`} section={s} index={i} citations={citations} />
      ))}
    </div>
  );
}
