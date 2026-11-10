import { useState, useMemo } from "react";
import type { BackendMode, GenerateResponse, Mode, PrecedentCard } from "@/lib/api";
import { DocumentView } from "./DocumentView";
import { AnalysisView } from "./AnalysisView";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, FileText, Scale, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ResultsPanelProps {
  data: GenerateResponse;
  mode: Mode;
  fileName: string;
  attachmentName: string | null;
  answerFooter?: React.ReactNode;
  onCitationClick?: (citation: string) => void;
}

function precedentKey(card: PrecedentCard): string {
  const stableId = card.judgment_id || card.case_id;
  if (stableId) return `id:${stableId.trim().toLowerCase()}`;
  if (card.citation) return `citation:${card.citation.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
  return `case:${[card.case_title || card.case_name, card.court, card.decision_date || card.date]
    .filter(Boolean)
    .join("|")
    .trim()
    .toLowerCase()}`;
}

function uniquePrecedents(cards: PrecedentCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = precedentKey(card);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const precedentCards = useMemo(() => uniquePrecedents(data.precedent_cards ?? []), [data.precedent_cards]);
  const [authoritiesTab, setAuthoritiesTab] = useState<"statutes" | "cases" | "notes">("cases");
  const [copiedCite, setCopiedCite] = useState<string | null>(null);

  // Split authorities into cases and statutes
  const cases = useMemo(
    () => precedentCards.filter((c) => !c.citation?.toLowerCase().includes("sec") && !c.case_title?.toLowerCase().includes("section")),
    [precedentCards],
  );
  const statutes = useMemo(
    () => precedentCards.filter((c) => c.citation?.toLowerCase().includes("sec") || c.case_title?.toLowerCase().includes("section")),
    [precedentCards],
  );

  function copyCite(cit: string) {
    navigator.clipboard.writeText(cit);
    setCopiedCite(cit);
    setTimeout(() => setCopiedCite(null), 1800);
    toast.success(`Copied citation: ${cit}`);
  }

  // Counsel Mode (2-column layout: document editor + collapsible flyout)
  if (isDraft) {
    return (
      <div className="w-full">
        {/* Counsel Top Bar Mode Chip: OUTLINED */}
        <div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-3">
            <span className="rounded-[3px] border border-[var(--ink)] bg-transparent px-2.5 py-0.5 font-sans text-[11px] font-bold tracking-wider text-[var(--ink)] uppercase">
              DRAFT
            </span>
            <span className="font-sans text-[12px] text-[var(--text-muted)]">
              Courtroom Litigation & Drafting Specialist
            </span>
          </div>
        </div>

        <DocumentView text={data.document_text || ""} docId={data.doc_id} fileName={fileName} />
      </div>
    );
  }

  // Jurist Mode (3-column layout: center memo sheet + right authorities panel)
  return (
    <div className="w-full">
      {/* Top Bar Header Mode Chip: SOLID */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-3">
          <span className="rounded-[3px] bg-[var(--ink)] px-2.5 py-0.5 font-sans text-[11px] font-bold tracking-wider text-[var(--on-ink)] uppercase">
            RESEARCH
          </span>
          <span className="font-sans text-[12px] text-[var(--text-muted)]">
            Chief Legal Research Specialist
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
        {/* Center Memo Sheet (max-w 760px) */}
        <div className="min-w-0 flex-1">
          <AnalysisView
            issues={data.issues}
            text={data.document_text}
            citations={data.cases}
            jobId={data.job_id ?? null}
            footer={answerFooter}
            intake={data.mode === "intake"}
            precedentStatus={data.precedent_status}
            precedentStatusWarning={data.precedent_status_warning}
            supersedingCitation={data.superseding_citation}
            supersedingCaseName={data.superseding_case_name}
            isVerified={data.is_verified}
            onCitationClick={onCitationClick}
          />
        </div>

        {/* Right Authorities Panel (340–400px wide, --surface background, 1px left border --line) */}
        <aside
          className="w-full shrink-0 rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(18,18,18,0.04)] xl:w-[360px]"
          aria-label="Authorities panel"
        >
          <div className="border-b border-[var(--line)] pb-3">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              AUTHORITIES PANEL
            </p>
            <h2 className="mt-1 font-serif text-[18px] font-bold text-[var(--ink)]">
              Primary Sources & Precedents
            </h2>
          </div>

          {/* Authorities Panel Tabs: Statutes (count) / Cases (count) / Notes */}
          <div className="mt-3 flex border-b border-[var(--line)]">
            <button
              type="button"
              onClick={() => setAuthoritiesTab("cases")}
              className={`flex-1 border-b-2 py-2 font-sans text-[12px] font-semibold transition-colors ${
                authoritiesTab === "cases"
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Cases ({cases.length || precedentCards.length})
            </button>
            <button
              type="button"
              onClick={() => setAuthoritiesTab("statutes")}
              className={`flex-1 border-b-2 py-2 font-sans text-[12px] font-semibold transition-colors ${
                authoritiesTab === "statutes"
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Statutes ({statutes.length})
            </button>
            <button
              type="button"
              onClick={() => setAuthoritiesTab("notes")}
              className={`flex-1 border-b-2 py-2 font-sans text-[12px] font-semibold transition-colors ${
                authoritiesTab === "notes"
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Notes
            </button>
          </div>

          {/* Authorities Tab Content */}
          <div className="mt-4 space-y-4 max-h-[700px] overflow-y-auto pr-1">
            {authoritiesTab === "cases" && (
              <>
                {precedentCards.length === 0 ? (
                  <p className="py-6 text-center font-sans text-[13px] text-[var(--text-muted)]">
                    No judicial authorities cited for this query.
                  </p>
                ) : (
                  precedentCards.map((card, idx) => {
                    const cit = card.citation || card.case_id || `Precedent ${idx + 1}`;
                    const isVerified = card.verified !== false;
                    const snippet = card.holding || card.summary || card.snippet || "";
                    return (
                      <article
                        key={idx}
                        className="rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-4 transition-all hover:border-[var(--line-strong)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            {cit}
                          </span>
                          <span
                            className={`rounded-[3px] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ${
                              isVerified
                                ? "border border-[var(--ok-border)] bg-[var(--ok-bg)] text-[var(--ok-text)]"
                                : "border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
                            }`}
                          >
                            {isVerified ? "✓ Verified" : "⚠️ Unverified"}
                          </span>
                        </div>

                        <h3 className="mt-1 font-serif text-[15px] font-bold leading-snug text-[var(--text)]">
                          {card.case_title || card.case_name || card.title || "Landmark Judgment"}
                        </h3>
                        {card.court && (
                          <p className="mt-0.5 font-sans text-[11px] text-[var(--text-muted)]">
                            {card.court} {card.year ? `(${card.year})` : ""}
                          </p>
                        )}

                        {snippet && (
                          <div className="mt-2.5 rounded-[2px] bg-[var(--surface)] p-2 font-serif text-[13px] leading-relaxed text-[var(--text)] border border-[var(--line)]">
                            <span className="passage-highlight">
                              "{snippet.slice(0, 220)}..."
                            </span>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2 font-sans text-[11px]">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => copyCite(cit)}
                              className="font-medium text-[var(--ink)] hover:underline"
                            >
                              {copiedCite === cit ? "Copied" : "Cite as"}
                            </button>
                            <button
                              type="button"
                              onClick={() => onCitationClick?.(cit)}
                              className="font-medium text-[var(--text-muted)] hover:text-[var(--ink)]"
                            >
                              Open record
                            </button>
                          </div>
                          {!isVerified && (
                            <button
                              type="button"
                              onClick={() => onCitationClick?.(cit)}
                              className="rounded-[2px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warn-text)] hover:opacity-90"
                            >
                              Verify against source
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </>
            )}

            {authoritiesTab === "statutes" && (
              <>
                {statutes.length === 0 ? (
                  <div className="py-6 text-center font-sans text-[13px] text-[var(--text-muted)]">
                    <p>No statutory provisions specifically flagged in this panel.</p>
                    <p className="mt-1 text-[11px]">All controlling provisions are hyperlinked directly within the memo text.</p>
                  </div>
                ) : (
                  statutes.map((s, idx) => (
                    <article key={idx} className="rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-4">
                      <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {s.citation}
                      </p>
                      <h3 className="mt-1 font-serif text-[15px] font-bold text-[var(--text)]">
                        {s.case_title || s.title}
                      </h3>
                      <p className="mt-2 font-sans text-[12px] text-[var(--text-muted)]">
                        {s.snippet || s.summary}
                      </p>
                    </article>
                  ))
                )}
              </>
            )}

            {authoritiesTab === "notes" && (
              <div className="py-6 text-center font-sans text-[13px] text-[var(--text-muted)]">
                <p>Advocate notes and bookmarks for this matter appear here.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
