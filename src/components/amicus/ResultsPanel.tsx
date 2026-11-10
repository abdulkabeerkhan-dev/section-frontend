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

  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

  // Unified authorities for cases
  const cases = useMemo(() => {
    return (data.cases && data.cases.length > 0) ? data.cases : precedentCards.map((c) => ({
      title: c.case_title || c.title || c.case_name || "Precedent on Record",
      citation: c.citation,
      court: c.court || "",
      year: c.year || 0,
      summary: c.holding || c.summary || c.snippet || "",
      relevance: "high" as const,
      case_id: c.case_id,
      preview: c.snippet || c.holding || "",
      verified: c.verified !== false,
      score: 1.0,
      holding: c.holding || c.ratio_decidendi || "",
      sections: c.statutes_invoked?.map((s) => s.name) || [],
      statutes: c.statutes_invoked?.map((s) => s.name) || [],
      source_url: c.source_url || '',
      outcome: c.outcome || '',
      parties: '',
      relied_on: '',
      author_judges: [],
      bench_type: '',
    }));
  }, [data.cases, precedentCards]);

  // Unified authorities for statutes
  const statutes = useMemo(() => {
    if (Array.isArray(data.statutes) && data.statutes.length > 0) {
      return data.statutes.map((s) => ({
        citation: s.citation || s.canonical_id || "Statutory Provision",
        title: s.title || s.citation,
        act_title: s.act_title || "",
        snippet: s.snippet || "",
        verified: s.verified !== false,
        in_force: s.in_force !== false,
        canonical_id: s.canonical_id || s.id || "",
      }));
    }
    // Fallback: extract from precedent cards statutes_invoked
    const fromInvoked = precedentCards.flatMap((c) => c.statutes_invoked || []).map((s) => ({
      citation: s.name,
      title: s.name,
      act_title: "",
      snippet: s.explanation || "",
      verified: true,
      in_force: true,
      canonical_id: "",
    }));
    if (fromInvoked.length > 0) return fromInvoked;

    return precedentCards
      .filter((c) => c.citation?.toLowerCase().includes("sec") || c.case_title?.toLowerCase().includes("section"))
      .map((c) => ({
        citation: c.citation,
        title: c.case_title || c.title || c.citation,
        act_title: "",
        snippet: c.holding || c.summary || "",
        verified: c.verified !== false,
        in_force: true,
        canonical_id: c.case_id || "",
      }));
  }, [data.statutes, precedentCards]);

  function handleSelectAuthority(cit: string) {
    setSelectedCitation(cit);
    const isStat = statutes.some((s) => s.citation.toLowerCase().includes(cit.toLowerCase()) || cit.toLowerCase().includes(s.citation.toLowerCase()));
    if (isStat) {
      setAuthoritiesTab("statutes");
    } else {
      setAuthoritiesTab("cases");
    }
    setTimeout(() => {
      const id = `auth-card-${cit.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

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
            citations={cases}
            jobId={data.job_id ?? null}
            footer={answerFooter}
            intake={data.mode === "intake"}
            precedentStatus={data.precedent_status}
            precedentStatusWarning={data.precedent_status_warning}
            supersedingCitation={data.superseding_citation}
            supersedingCaseName={data.superseding_case_name}
            isVerified={data.is_verified}
            onCitationClick={handleSelectAuthority}
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
                  statutes.map((s, idx) => {
                    const citId = `auth-card-${s.citation.replace(/[^a-zA-Z0-9]/g, "_")}`;
                    const isSelected = selectedCitation && s.citation.toLowerCase().includes(selectedCitation.toLowerCase());
                    return (
                      <article
                        key={idx}
                        id={citId}
                        className={`rounded-[3px] border p-4 transition-all ${
                          isSelected ? "border-[var(--ink)] ring-1 ring-[var(--ink)] bg-[var(--surface)]" : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-strong)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            {s.citation}
                          </span>
                          <span
                            className={`rounded-[3px] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ${
                              s.verified !== false
                                ? "border border-[var(--ok-border)] bg-[var(--ok-bg)] text-[var(--ok-text)]"
                                : "border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
                            }`}
                          >
                            {s.verified !== false ? "✓ Verified" : "⚠️ Unverified"}
                          </span>
                        </div>
                        <h3 className="mt-1 font-serif text-[15px] font-bold text-[var(--text)]">
                          {s.title}
                        </h3>
                        {s.act_title && (
                          <p className="mt-0.5 font-sans text-[11px] text-[var(--text-muted)]">
                            {s.act_title}
                          </p>
                        )}
                        {s.snippet && (
                          <div className="mt-2.5 rounded-[2px] bg-[var(--surface)] p-2 font-serif text-[13px] leading-relaxed text-[var(--text)] border border-[var(--line)]">
                            <span className="passage-highlight">
                              "{s.snippet.slice(0, 240)}..."
                            </span>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2 font-sans text-[11px]">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => copyCite(s.citation)}
                              className="font-medium text-[var(--ink)] hover:underline"
                            >
                              {copiedCite === s.citation ? "Copied" : "Cite as"}
                            </button>
                            {s.canonical_id ? (
                              <a
                                href={`/statutes`}
                                className="font-medium text-[var(--text-muted)] hover:text-[var(--ink)]"
                              >
                                Open full section
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })
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
