import type { BackendMode, GenerateResponse, Mode } from "@/lib/api";
import { PrecedentCardList } from "./PrecedentCards";
import { DocumentView } from "./DocumentView";
import { AnalysisView } from "./AnalysisView";

interface ResultsPanelProps {
  data: GenerateResponse;
  mode: Mode;
  fileName: string;
  attachmentName: string | null;
  /** Rendered under the analysis (e.g. the "Continue answer" control). */
  answerFooter?: React.ReactNode;
  onCitationClick?: (citation: string) => void;
}

const MODE_LABELS: Record<BackendMode, string> = {
  simple_query: "Simple Query",
  caselaw_search: "Case Law Search",
  judgment_lookup: "Judgment Lookup",
  drafting: "Drafting",
  document_analysis: "Document Analysis",
  intake: "Intake",
};

function precedentKey(card: GenerateResponse["precedent_cards"][number]): string {
  const stableId = card.judgment_id || card.case_id;
  if (stableId) return `id:${stableId.trim().toLowerCase()}`;
  if (card.citation) return `citation:${card.citation.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
  return `case:${[card.case_title || card.case_name, card.court, card.decision_date || card.date]
    .filter(Boolean)
    .join("|")
    .trim()
    .toLowerCase()}`;
}

function uniquePrecedents(cards: GenerateResponse["precedent_cards"]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = precedentKey(card);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ModeBadge({ mode }: { mode: BackendMode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <span className="h-px w-5 bg-authority" aria-hidden />
      <span>{MODE_LABELS[mode]}</span>
    </span>
  );
}

export function ResultsPanel({
  data,
  mode,
  fileName,
  attachmentName,
  answerFooter,
  onCitationClick,
}: ResultsPanelProps) {
  const isDraft = mode === "draft" && Boolean(data.document_text);
  // Always reset to the latest response's structured precedent cards so stale
  // cards from a previous turn are never shown.
  const precedentCards = uniquePrecedents(data.precedent_cards ?? []);
  const hasStructuredCards = precedentCards.length > 0;
  const isIntake = data.mode === "intake";
  // Only show the precedents section for non-intake responses that actually
  // returned structured precedent cards. Empty arrays or legacy `cases` data
  // should not trigger the section.
  const showPrecedentList = !isIntake && hasStructuredCards;
  const count = precedentCards.length;

  return (
    <div className="space-y-7">
      {(data.mode || attachmentName) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {data.mode && !isIntake ? <ModeBadge mode={data.mode} /> : <span />}
          {attachmentName && (
             <div className="border-l-2 border-primary px-3 py-1">
              <p className="text-sm text-foreground/90">
                Editing: <span className="font-medium">{attachmentName}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-10">
        <section>
          {mode === "draft" && data.document_text ? (
            <DocumentView text={data.document_text} docId={data.doc_id} fileName={fileName} />
          ) : (
            <AnalysisView
              issues={data.issues}
              text={data.document_text}
              citations={data.cases}
              jobId={data.job_id ?? null}
              footer={answerFooter}
              intake={isIntake}
              precedentStatus={data.precedent_status}
              precedentStatusWarning={data.precedent_status_warning}
              supersedingCitation={data.superseding_citation}
              supersedingCaseName={data.superseding_case_name}
              onCitationClick={onCitationClick}
            />
          )}
        </section>

        {showPrecedentList && (
          <section>
            <h3 className="border-b border-border pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-authority">
              Authorities <span className="text-muted-foreground">({count})</span>
            </h3>
            <PrecedentCardList cards={precedentCards} onCitationClick={onCitationClick} />
          </section>
        )}
      </div>
    </div>
  );
}
