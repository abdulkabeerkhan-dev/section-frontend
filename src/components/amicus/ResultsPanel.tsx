import { useState, useMemo } from "react";
import type { BackendMode, GenerateResponse, Mode, PrecedentCard } from "@/lib/api";
import { DocumentView } from "./DocumentView";
import { AnalysisView } from "./AnalysisView";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, FileText, Scale, ShieldCheck, ShieldAlert, Sparkles, BookOpen } from "lucide-react";
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

  // Trust rule 4: if short answer says evidence lacks relevant provisions, panel must not show verified statutes
  const lacksPrimaryProvisions = useMemo(() => {
    const doc = (data.document_text || "").toLowerCase();
    return (
      doc.includes("evidence pack provided does not contain") ||
      doc.includes("does not contain the relevant statutory") ||
      doc.includes("retrieved evidence lacks the relevant") ||
      doc.includes("no primary text retrieved") ||
      doc.includes("statutory provisions are missing")
    );
  }, [data.document_text]);

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
          verified: c.verified !== false,
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
        verified: s.verified !== false && !lacksPrimaryProvisions,
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
      verified: !lacksPrimaryProvisions,
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
        verified: c.verified !== false && !lacksPrimaryProvisions,
        in_force: true,
        canonical_id: c.case_id || "",
      }));
  }, [data.statutes, precedentCards, lacksPrimaryProvisions]);

  // Count total cited vs verified authorities
  const totalCited = precedentCards.length + statutes.length;
  const totalVerified = useMemo(() => {
    let count = 0;
    for (const card of precedentCards) {
      const hasText = Boolean(card.holding || card.summary || card.snippet);
      if (card.verified !== false && hasText && !lacksPrimaryProvisions) count++;
    }
    if (!lacksPrimaryProvisions) {
      for (const s of statutes) {
        if (s.verified !== false && s.snippet && s.snippet.trim().length > 20) count++;
      }
    }
    return count;
  }, [precedentCards, statutes, lacksPrimaryProvisions]);

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

  // Common authorities panel body
  const renderAuthoritiesContent = () => (
    <div className="flex flex-col">
      <div className="border-b border-[var(--line)] pb-3">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          AUTHORITIES
        </p>
        <h2 className="mt-0.5 font-serif text-[18px] font-bold text-[var(--ink)]">
          {totalCited} cited · {totalVerified} verified
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

      {/* Tab Content (without nested scroll boxes, container scrolls as one) */}
      <div className="mt-4 space-y-4">
        {authoritiesTab === "statutes" && (
          <>
            {lacksPrimaryProvisions ? (
              <div className="py-8 px-4 text-center rounded-[3px] border border-[var(--warn-border)] bg-[var(--warn-bg)]">
                <ShieldAlert className="mx-auto h-7 w-7 text-[var(--warn-text)] mb-2" />
                <h4 className="font-serif text-[15px] font-bold text-[var(--warn-text)]">
                  No primary text retrieved
                </h4>
                <p className="mt-1 font-sans text-[12px] leading-relaxed text-[var(--text-muted)]">
                  The retrieved evidence pack lacks the governing statutory provisions for this question. Do not rely on unverified citations.
                </p>
              </div>
            ) : statutes.length === 0 ? (
              <div className="py-6 text-center font-sans text-[13px] text-[var(--text-muted)]">
                <p>No statutory provisions specifically flagged in this panel.</p>
                <p className="mt-1 text-[11px]">All controlling provisions are hyperlinked directly within the memo text.</p>
              </div>
            ) : (
              statutes.map((s, idx) => {
                const citId = `auth-card-${s.citation.replace(/[^a-zA-Z0-9]/g, "_")}`;
                const isSelected = selectedCitation && s.citation.toLowerCase().includes(selectedCitation.toLowerCase());
                const hasStatuteText = Boolean(s.snippet && s.snippet.trim().length > 20);
                const isStatuteVerified = s.verified !== false && hasStatuteText && !lacksPrimaryProvisions;
                const { displayTitle, displaySubtitle } = formatStatuteTitle(s.citation, s.act_title, s.title);

                return (
                  <article
                    key={idx}
                    id={citId}
                    className={`rounded-[3px] border p-4 transition-all ${
                      !isStatuteVerified ? "auth-unverified " : ""
                    }${
                      isSelected
                        ? "border-[var(--ink)] ring-1 ring-[var(--ink)] bg-[var(--surface)]"
                        : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        STATUTE
                      </span>
                      <span
                        className={`rounded-[3px] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ${
                          isStatuteVerified
                            ? "border border-[var(--ok-border)] bg-[var(--ok-bg)] text-[var(--ok-text)]"
                            : "border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
                        }`}
                      >
                        {isStatuteVerified ? "✓ Verified" : "⚠️ Unverified: text not retrieved"}
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

                    {hasStatuteText ? (
                      <div className="mt-2.5 rounded-[2px] bg-[var(--surface)] p-2.5 font-serif text-[13px] leading-relaxed text-[var(--text)] border border-[var(--line)]">
                        <span className="passage-highlight">
                          "{s.snippet.slice(0, 240)}..."
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2.5 rounded-[2px] bg-[var(--surface)] p-2.5 font-sans text-[12px] italic text-[var(--warn-text)] border border-[var(--line)]">
                        Primary text not retrieved in verified database store.
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
                const hasPrimaryText = Boolean(
                  (card.holding && card.holding.trim().length > 15) ||
                  (card.snippet && card.snippet.trim().length > 15) ||
                  (card.summary && card.summary.trim().length > 15),
                );
                const isVerified = card.verified !== false && hasPrimaryText && !lacksPrimaryProvisions;
                const snippet = card.holding || card.summary || card.snippet || "";
                const caseId = `auth-card-${cit.replace(/[^a-zA-Z0-9]/g, "_")}`;
                const isSelected = selectedCitation && cit.toLowerCase().includes(selectedCitation.toLowerCase());

                return (
                  <article
                    key={idx}
                    id={caseId}
                    className={`rounded-[3px] border p-4 transition-all ${
                      !isVerified ? "auth-unverified " : ""
                    }${
                      isSelected
                        ? "border-[var(--ink)] ring-1 ring-[var(--ink)] bg-[var(--surface)]"
                        : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        CASE
                      </span>
                      <span
                        className={`rounded-[3px] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ${
                          isVerified
                            ? "border border-[var(--ok-border)] bg-[var(--ok-bg)] text-[var(--ok-text)]"
                            : "border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
                        }`}
                      >
                        {isVerified ? "✓ Verified" : "⚠️ Unverified: text not retrieved"}
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

                    {hasPrimaryText ? (
                      <div className="mt-2.5 rounded-[2px] bg-[var(--surface)] p-2.5 font-serif text-[13px] leading-relaxed text-[var(--text)] border border-[var(--line)]">
                        <span className="passage-highlight">
                          "{snippet.slice(0, 240)}..."
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2.5 rounded-[2px] bg-[var(--surface)] p-2.5 font-sans text-[12px] italic text-[var(--warn-text)] border border-[var(--line)]">
                        Not matched to a reported judgment in the database. Check the report before citing.
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
            Authorities ({totalCited} cited · {totalVerified} verified)
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

      {/* Main Layout: Memo column (flex: 1 1 640px, min-w-0, max-w-820px) + Sticky Authorities (360-420px) */}
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
            isVerified={data.is_verified && !lacksPrimaryProvisions}
            onCitationClick={handleSelectAuthority}
          />
        </div>

        {/* Desktop Sticky Authorities Panel (360–420px, sticky, single scroll) */}
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
