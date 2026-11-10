import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, Search } from "lucide-react";

import { SessionGuard } from "@/components/amicus/SessionGuard";
import { ResultState, SearchShell, selectCls } from "@/components/amicus/SearchShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COURTS,
  JOURNALS,
  judgmentPdfHref,
  searchJudgments,
  type JudgmentResult,
} from "@/lib/legal-search";

export const Route = createFileRoute("/_authenticated/judgments")({
  head: () => ({
    meta: [
      { title: "Judgment Search | Section" },
      { name: "description", content: "Search Pakistani superior court judgments from 1947 to 2026 by citation, keyword or legal issue." },
      { property: "og:title", content: "Judgment Search | Section" },
      { property: "og:description", content: "Explore judgments from 1947 to 2026 with PLD, SCMR, YLR and other citations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SessionGuard>
      <JudgmentsPage />
    </SessionGuard>
  ),
});

const YEARS = Array.from({ length: 2026 - 1947 + 1 }, (_, i) => String(2026 - i));
const KEYWORD_PILLS = ["dishonour of cheque 489-F", "tenant eviction bona fide need", "pre-arrest bail 498 CrPC", "injunction 12(2) CPC"];
const INTELLIGENT_PILLS = [
  "dishonestly issuing a cheque towards repayment of a loan",
  "bona fide personal requirement of landlord under rent restriction law",
  "entitlement to pre-arrest bail in offences not falling under prohibitory clause",
  "specific performance of agreement to sell immovable property and readiness and willingness",
];

function useSearch() {
  const [results, setResults] = useState<JudgmentResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function run(kind: "citation" | "keyword" | "intelligent", body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      setResults(await searchJudgments(kind, body));
    } catch (err) {
      setResults(null);
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }
  return { results, loading, error, run };
}

function Results({ s }: { s: ReturnType<typeof useSearch> }) {
  return (
    <div className="mt-8 space-y-4">
      <ResultState loading={s.loading} error={s.error} empty={s.results?.length === 0} />
      {!s.loading &&
        s.results?.map((r, i) => {
          const href = judgmentPdfHref(r.pdf_url);
          return (
            <article
              key={`${r.citation}-${i}`}
              className="rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(18,18,18,0.04)]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {r.citation}
                </span>
                {r.court && (
                  <span className="font-sans text-[11px] text-[var(--text-muted)]">
                    {r.court}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-serif text-[20px] font-bold text-[var(--text)]">{r.case_title}</h2>
              {r.holding && (
                <p className="mt-3 line-clamp-4 font-sans text-[14px] leading-relaxed text-[var(--text-muted)]">
                  {r.holding}
                </p>
              )}
              {href && (
                <Button asChild variant="outline" size="sm" className="mt-4 min-h-[38px] gap-2 rounded-[3px] border-[var(--chip-border)] bg-[var(--chip-bg)] font-sans text-[12px] font-medium text-[var(--chip-text)] hover:bg-[var(--surface-2)]">
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Download PDF for ${r.citation}`}>
                    <FileDown className="h-4 w-4" /> Download Judgment PDF
                  </a>
                </Button>
              )}
            </article>
          );
        })}
    </div>
  );
}

function Pills({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        SUGGESTED:
      </span>
      {items.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className="rounded-[3px] border border-[var(--chip-border)] bg-[var(--chip-bg)] px-3 py-1.5 font-sans text-[12px] font-medium text-[var(--chip-text)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function CitationTab() {
  const s = useSearch();
  const [year, setYear] = useState("2024");
  const [journal, setJournal] = useState("SCMR");
  const [page, setPage] = useState("");
  const [court, setCourt] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!page.trim()) return;
    s.run("citation", { year: Number(year), journal, page: Number(page), court: court || undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Year">
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls} aria-label="Select year">
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </Field>
        <Field label="Journal">
          <select value={journal} onChange={(e) => setJournal(e.target.value)} className={selectCls} aria-label="Select law journal">
            {JOURNALS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </Field>
        <Field label="Page">
          <Input
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="e.g. 1466"
            className="h-11 rounded-[3px] border-[var(--line-strong)] bg-[var(--surface)] text-[14px] text-[var(--text)]"
            aria-label="Journal page number"
          />
        </Field>
        <Field label="Court (optional)">
          <select value={court} onChange={(e) => setCourt(e.target.value)} className={selectCls} aria-label="Select court">
            <option value="">All Courts</option>
            {COURTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <Button
        type="submit"
        className="h-11 min-w-[140px] gap-2 rounded-[3px] bg-[var(--ink)] px-6 font-sans text-[13px] font-medium text-[var(--on-ink)] hover:bg-[var(--ink-2)]"
        disabled={s.loading}
        aria-label="Find judgment by citation"
      >
        <Search className="h-4 w-4" /> {s.loading ? "Searching..." : "Find Judgment"}
      </Button>

      <Results s={s} />
    </form>
  );
}

function KeywordTab() {
  const s = useSearch();
  const [query, setQuery] = useState("");
  const [court, setCourt] = useState("");
  const [dateRange, setDateRange] = useState("10 years");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    s.run("keyword", { query: q, court: court || undefined, date_range: dateRange });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Party name, keyword, section, or subject (e.g. dishonour of cheque, 489-F)"
          className="h-11 rounded-[3px] border-[var(--line-strong)] bg-[var(--surface)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--ink)]"
          aria-label="Search keywords"
        />
        <Button
          type="submit"
          className="h-11 min-w-[120px] gap-2 rounded-[3px] bg-[var(--ink)] px-5 font-sans text-[13px] font-medium text-[var(--on-ink)] hover:bg-[var(--ink-2)]"
          disabled={s.loading}
          aria-label="Search judgments by keyword"
        >
          <Search className="h-4 w-4" /> {s.loading ? "Searching..." : "Search"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Court">
          <select value={court} onChange={(e) => setCourt(e.target.value)} className={selectCls} aria-label="Filter court">
            <option value="">All Courts</option>
            {COURTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Date Range">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectCls} aria-label="Filter date range">
            <option value="5 years">Last 5 years (2021–2026)</option>
            <option value="10 years">Last 10 years (2016–2026)</option>
            <option value="20 years">Last 20 years (2006–2026)</option>
            <option value="all">All years (1947–2026)</option>
          </select>
        </Field>
      </div>

      <Pills items={KEYWORD_PILLS} onPick={(v) => setQuery(v)} />

      <Results s={s} />
    </form>
  );
}

function IntelligentTab() {
  const s = useSearch();
  const [query, setQuery] = useState("");
  const [court, setCourt] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    s.run("intelligent", { query: q, court: court || undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Field label="Legal issue, fact pattern, or dispute">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your legal issue in natural language (e.g. Can an appeal be filed after the 30-day limitation period under Financial Institutions Ordinance?)..."
          className="min-h-[120px] rounded-[3px] border-[var(--line-strong)] bg-[var(--surface)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--ink)]"
          aria-label="Describe legal issue"
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:w-64">
          <Field label="Court">
            <select value={court} onChange={(e) => setCourt(e.target.value)} className={selectCls} aria-label="Select court">
              <option value="">All Courts</option>
              {COURTS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Button
          type="submit"
          className="h-11 min-w-[160px] gap-2 self-end rounded-[3px] bg-[var(--ink)] px-6 font-sans text-[13px] font-medium text-[var(--on-ink)] hover:bg-[var(--ink-2)]"
          disabled={s.loading}
          aria-label="Run intelligent semantic search"
        >
          <Search className="h-4 w-4" /> {s.loading ? "Searching..." : "Search Precedents"}
        </Button>
      </div>

      <Pills items={INTELLIGENT_PILLS} onPick={(v) => setQuery(v)} />

      <Results s={s} />
    </form>
  );
}

function JudgmentsPage() {
  return (
    <SearchShell title="Judgment Search" subtitle="Search superior court judgments from 1947 to 2026 across SCMR, PLD, YLR, CLC, and other reporters.">
      <Tabs defaultValue="citation" className="space-y-8">
        <TabsList className="h-11 rounded-[3px] border border-[var(--line)] bg-[var(--surface-2)] p-1">
          <TabsTrigger
            value="citation"
            className="h-9 rounded-[3px] px-5 font-sans text-[13px] font-medium text-[var(--text-muted)] data-[state=active]:bg-[var(--ink)] data-[state=active]:text-[var(--on-ink)]"
          >
            Citation Lookup
          </TabsTrigger>
          <TabsTrigger
            value="keyword"
            className="h-9 rounded-[3px] px-5 font-sans text-[13px] font-medium text-[var(--text-muted)] data-[state=active]:bg-[var(--ink)] data-[state=active]:text-[var(--on-ink)]"
          >
            Keyword Search
          </TabsTrigger>
          <TabsTrigger
            value="intelligent"
            className="h-9 rounded-[3px] px-5 font-sans text-[13px] font-medium text-[var(--text-muted)] data-[state=active]:bg-[var(--ink)] data-[state=active]:text-[var(--on-ink)]"
          >
            Intelligent Search
          </TabsTrigger>
        </TabsList>
        <TabsContent value="citation">
          <CitationTab />
        </TabsContent>
        <TabsContent value="keyword">
          <KeywordTab />
        </TabsContent>
        <TabsContent value="intelligent">
          <IntelligentTab />
        </TabsContent>
      </Tabs>
    </SearchShell>
  );
}
