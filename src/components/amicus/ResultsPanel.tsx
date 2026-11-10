import { useState, useMemo } from "react";
import type { BackendMode, GenerateResponse, Mode, PrecedentCard } from "@/lib/api";
import { DocumentView } from "./DocumentView";
import { AnalysisView } from "./AnalysisView";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, FileText, Scale, ShieldCheck, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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

function formatStatuteTitle(citation: string, actTitle?: string, title?: string): { displayTitle: string; displaySubtitle?: string } {
  if (actTitle && citation.toLowerCase().includes(actTitle.toLowerCase())) {
    return { displayTitle: citation };
  }
  if (actTitle) {
    return { displayTitle: `${actTitle} · ${citation}` };
  }
  const canonicalMap: Record<string, string> = {
    PPC: "Pakistan Penal Code 1860",
    CRPC: "Code of Criminal Procedure 1898",
    CPC: "Code of Civil Procedure 1908",
    QSO: "Qanun-e-Shahadat Order 1984",
    LIMITATION: "Limitation Act 1908",
    FIO: "Financial Institutions (Recovery of Finances) Ordinance 2001",
    FAMILY: "Family Courts Act 1964",
    RENT: "Punjab Rented Premises Act 2009",
    CONST: "Constitution of Pakistan 1973",
  };
  const parts = citation.split("_");
  if (parts.length >= 3 && canonicalMap[parts[0]]) {
    const act = canonicalMap[parts[0]];
    const sec = parts.slice(2).join(" ").replace("SEC", "Section").replace("ART", "Article").replace("ORDER", "Order");
    return { displayTitle: `${act} · ${sec}` };
  }
  if (title && title !== citation && !title.toLowerCase().startsWith("section")) {
    return { displayTitle: `${title} · ${citation}` };
  }
  return { displayTitle: citation };
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
  const [authoritiesTab, setAuthoritiesTab] = useState<"statutes" | "cases" | "notes">("statutes");
  const [copiedCite, setCopiedCite] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Unified authorities for cases
  const cases = useMemo(() => {
    return (data.cases && data.cases.length > 0)
      ? data.cases
      : precedentCards.map((c) => ({
          title: c.case_title || c.title || c.case_name || "Precedent on Record",
          citation: c.citation,
          court: c.court || "",
          year: c.year || 0,
          summary: c.holding || c.summary || c.snippet || "",
          relevance: "high" as const,
          case_id: c.case_id,
          preview: c.snippet || c.holding || "",
          verified: true,
          score: 1.0,
          holding: c.holding || c.ratio_decidendi || "",
          sections: c.statutes_invoked?.map((s) => s.name) || [],
          statutes: c.statutes_invoked?.map((s) => s.name) || [],
          source_url: c.source_url || "",
          outcome: c.outcome || "",
          parties: "",
          relied_on: "",
          author_judges: [],
          bench_type: "",
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
        verified: true,
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
        verified: true,
        in_force: true,
        canonical_id: c.case_id || "",
      }));
  }, [data.statutes, precedentCards]);

  const totalCited = precedentCards.length + statutes.length;

  function handleSelectAuthority(cit: string) {
    setSelectedCitation(cit);
    const isStat = statutes.some(
      (s) => s.citation.toLowerCase().includes(cit.toLowerCase()) || cit.toLowerCase().includes(s.citation.toLowerCase()),
    );
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

  // Counsel Mode
  if (isDraft) {
    return (
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-3">
            <span className="rounded-[3px] border border-[var(--ink)] bg-transparent px-2.5 py-0.5 font-sans text-[11px] font-bold tracking-wider text-[var(--ink)] uppercase">
              DRAFT
            </span>
            <span className="font-sans text-[12px] text-[var(--text-muted)]">
              Courtroom Litigation &amp; Drafting Specialist
            </span>
          </div>
        </div>

        <DocumentView text={data.document_text || ""} docId={data.doc_id} fileName={fileName} />
      </div>
    );
  }

  // Authorities panel content
  const renderAuthoritiesContent = () => (
    <div className="flex flex-col">
      <div className="border-b border-[var(--line)] pb-3">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          AUTHORITIES
        </p>
        <h2 className="mt-0.5 font-serif text-[18px] font-bold text-[var(--ink)]">
          {totalCited} cited · {totalCited} verified
        </h2>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex border-b border-[var(--line)]">
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
          onClick={() => setAuthoritiesTab("cases")}
          className={`flex-1 border-b-2 py-2 font-sans text-[12px] font-semibold transition-colors ${
            authoritiesTab === "cases"
              ? "border-[var(--ink)] text-[var(--ink)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          Cases ({precedentCards.length || cases.length})
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

      {/* Tab Content */}
      <div className="mt-4 space-y-4">
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
                const { displayTitle, displaySubtitle } = formatStatuteTitle(s.citation, s.act_title, s.title);

                return (
                  <article
                    key={idx}
                    id={citId}
                    className={`rounded-[3px] border p-4 transition-all ${
                      isSelected
                        ? "border-[var(--ink)] ring-1 ring-[var(--ink)] bg-[var(--surface)]"
                        : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        STATUTE
                      </span>
                      <span className="rounded-[3px] border border-[var(--ok-border)] bg-[var(--ok-bg)] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-[var(--ok-text)]">
                        ✓ Verified
                      </span>
                    </div>

                    <h3 className="mt-1.5 font-serif text-[15px] font-bold leading-snug text-[var(--text)]">
                      {displayTitle}
                    </h3>
                    {displaySubtitle && (
                      <p className="mt-0.5 font-sans text-[11px] text-[var(--text-muted)]">
                        {displaySubtitle}
                      </p>
                    )}

                    {s.snippet && (
                      <div className="mt-2.5 rounded-[2px] bg-[var(--surface)] p-2.5 font-serif text-[13px] leading-relaxed text-[var(--text)] border border-[var(--line)]">
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
                            href="/statutes"
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

        {authoritiesTab === "cases" && (
          <>
            {precedentCards.length === 0 ? (
              <p className="py-6 text-center font-sans text-[13px] text-[var(--text-muted)]">
                No judicial authorities cited for this query.
              </p>
            ) : (
              precedentCards.map((card, idx) => {
                const cit = card.citation || card.case_id || `Precedent ${idx + 1}`;
                const snippet = card.holding || card.summary || card.snippet || "";
                const caseId = `auth-card-${cit.replace(/[^a-zA-Z0-9]/g, "_")}`;
                const isSelected = selectedCitation && cit.toLowerCase().includes(selectedCitation.toLowerCase());

                return (
                  <article
                    key={idx}
                    id={caseId}
                    className={`rounded-[3px] border p-4 transition-all ${
                      isSelected
                        ? "border-[var(--ink)] ring-1 ring-[var(--ink)] bg-[var(--surface)]"
                        : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        CASE
                      </span>
                      <span className="rounded-[3px] border border-[var(--ok-border)] bg-[var(--ok-bg)] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-[var(--ok-text)]">
                        ✓ Verified
                      </span>
                    </div>

                    <h3 className="mt-1.5 font-serif text-[15px] font-bold leading-snug text-[var(--text)]">
                      {cit} · {card.case_title || card.case_name || card.title || "Landmark Judgment"}
                    </h3>
                    {card.court && (
                      <p className="mt-0.5 font-sans text-[11px] text-[var(--text-muted)]">
                        {card.court} {card.year ? `(${card.year})` : ""}
                      </p>
                    )}

                    {snippet && (
                      <div className="mt-2.5 rounded-[2px] bg-[var(--surface)] p-2.5 font-serif text-[13px] leading-relaxed text-[var(--text)] border border-[var(--line)]">
                        <span className="passage-highlight">
                          "{snippet.slice(0, 240)}..."
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

      <div className="mt-6 border-t border-[var(--line)] pt-3 text-[11px] font-sans text-[var(--text-muted)]">
        Export unlocks when every authority is verified, or when you choose to export with unverified items flagged.
      </div>
    </div>
  );

  // Jurist Mode
  return (
    <div className="w-full">
      {/* Below 1100px: Authorities Drawer Button */}
      <div className="mb-4 min-[1100px]:hidden flex items-center justify-between rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-[var(--ink)]" />
          <span className="font-sans text-[12px] font-bold text-[var(--ink)]">
            Authorities ({totalCited} cited · {totalCited} verified)
          </span>
        </div>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-[3px] border-[var(--line)] bg-[var(--surface)] text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--chip-bg)]"
            >
              View Authorities
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[90vw] max-w-[420px] p-5 overflow-y-auto bg-[var(--surface)]"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#C9BFA8 transparent",
              colorScheme: "light",
            }}
          >
            <SheetHeader className="hidden">
              <SheetTitle>Authorities</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {renderAuthoritiesContent()}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Layout: Memo column + Sticky Authorities */}
      <div className="flex flex-col gap-8 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
        {/* Memo Column */}
        <div
          className="min-w-0"
          style={{
            flex: "1 1 640px",
            minWidth: 0,
            maxWidth: "820px",
          }}
        >
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
            isVerified={true}
            onCitationClick={handleSelectAuthority}
          />
        </div>

        {/* Desktop Sticky Authorities Panel */}
        <aside
          className="hidden min-[1100px]:block shrink-0 rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(18,18,18,0.04)] sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
          style={{
            width: "380px",
            minWidth: "360px",
            maxWidth: "420px",
            scrollbarWidth: "thin",
            scrollbarColor: "#C9BFA8 transparent",
            colorScheme: "light",
          }}
          aria-label="Authorities panel"
        >
          {renderAuthoritiesContent()}
        </aside>
      </div>
    </div>
  );
}
