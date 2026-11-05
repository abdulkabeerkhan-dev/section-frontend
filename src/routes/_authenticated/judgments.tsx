import { createFileRoute, Link } from "@tanstack/react-router";
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
const KEYWORD_PILLS = ["constitutional petition", "tenant eviction", "negligence damages", "bail after arrest"];
const INTELLIGENT_PILLS = [
  "tenant eviction",
  "right of pre-emption",
  "labour dispute reinstatement",
  "service matters termination",
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
    <div className="mt-8 space-y-3">
      <ResultState loading={s.loading} error={s.error} empty={s.results?.length === 0} />
      {!s.loading &&
        s.results?.map((r, i) => {
          const href = judgmentPdfHref(r.pdf_url);
          return (
            <article key={`${r.citation}-${i}`} className="rounded-sm border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{r.citation}</p>
              <h2 className="mt-1 font-serif text-lg text-foreground">{r.case_title}</h2>
              {r.court && <p className="text-xs text-muted-foreground">{r.court}</p>}
              {r.holding && <p className="mt-3 line-clamp-4 text-sm text-muted-foreground">{r.holding}</p>}
              {href && (
                <Button asChild variant="outline" size="sm" className="mt-4 gap-2 rounded-sm">
                  <a href={href} target="_blank" rel="noopener noreferrer">
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
      <span className="text-xs text-muted-foreground">Popular:</span>
      {items.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className="rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
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
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CitationTab() {
  const s = useSearch();
  const [year, setYear] = useState("");
  const [journal, setJournal] = useState("PLD");
  const [page, setPage] = useState("");
  const [court, setCourt] = useState("");
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          s.run("citation", { year: year || null, journal, page, court: court || null });
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Year">
          <select className={selectCls} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Journal">
          <select className={selectCls} value={journal} onChange={(e) => setJournal(e.target.value)}>
            {JOURNALS.map((j) => <option key={j}>{j}</option>)}
          </select>
        </Field>
        <Field label="Page">
          <Input value={page} onChange={(e) => setPage(e.target.value)} placeholder="e.g. 91" className="h-10 rounded-sm" />
        </Field>
        <Field label="Court (Optional)">
          <select className={selectCls} value={court} onChange={(e) => setCourt(e.target.value)}>
            <option value="">All Courts</option>
            {COURTS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Jurisdiction">
          <select className={selectCls} defaultValue="Pakistan">
            <option>Pakistan</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" className="h-10 w-full gap-2 rounded-sm" disabled={s.loading}>
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </form>
      <Results s={s} />
    </>
  );
}

function KeywordTab() {
  const s = useSearch();
  const [query, setQuery] = useState("");
  const [court, setCourt] = useState("");
  const [range, setRange] = useState("all");
  const [journal, setJournal] = useState("");
  const go = (q: string) => {
    if (!q.trim()) return;
    s.run("keyword", { query: q.trim(), court: court || null, date_range: range, journal: journal || null });
  };
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); go(query); }} className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword, party name, or legal issue..."
            className="h-11 rounded-sm"
          />
          <Button type="submit" className="h-11 gap-2 rounded-sm px-5" disabled={s.loading}>
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <select className={selectCls} value={court} onChange={(e) => setCourt(e.target.value)}>
            <option value="">All Courts</option>
            {COURTS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className={selectCls} value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="all">All years</option>
            <option value="last_1_year">Last year</option>
            <option value="last_5_years">Last 5 years</option>
            <option value="last_10_years">Last 10 years</option>
          </select>
          <select className={selectCls} value={journal} onChange={(e) => setJournal(e.target.value)}>
            <option value="">All Journals</option>
            {JOURNALS.map((j) => <option key={j}>{j}</option>)}
          </select>
        </div>
      </form>
      <Pills items={KEYWORD_PILLS} onPick={(p) => { setQuery(p); go(p); }} />
      <Results s={s} />
    </>
  );
}

function IntelligentTab() {
  const s = useSearch();
  const [query, setQuery] = useState("");
  const go = (q: string) => q.trim() && s.run("intelligent", { query: q.trim() });
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); go(query); }} className="space-y-3">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe the legal dispute in your own words..."
          className="min-h-28 rounded-sm"
        />
        <div className="flex justify-end">
          <Button type="submit" className="gap-2 rounded-sm px-5" disabled={s.loading}>
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </form>
      <Pills items={INTELLIGENT_PILLS} onPick={(p) => { setQuery(p); go(p); }} />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card p-4">
        <div>
          <p className="font-serif text-base text-foreground">Ask Ark AI instead</p>
          <p className="text-sm text-muted-foreground">Describe your legal issue and get cited answers in seconds.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-sm">
          <Link to="/assistants/ark">Try Ark AI</Link>
        </Button>
      </div>
      <Results s={s} />
    </>
  );
}

function JudgmentsPage() {
  return (
    <SearchShell
      title="Explore Judgments from 1947 to 2026"
      subtitle="Free. Searchable. Downloadable. With Citations (PLD, SCMR, YLR, CLC, PCrLJ, MLD, CLD, PTD, PLC)"
    >
      <Tabs defaultValue="citation">
        <TabsList className="grid w-full grid-cols-3 rounded-sm">
          <TabsTrigger value="citation">Citation Search</TabsTrigger>
          <TabsTrigger value="keyword">Keyword Search</TabsTrigger>
          <TabsTrigger value="intelligent">Intelligent Search</TabsTrigger>
        </TabsList>
        <TabsContent value="citation" className="mt-6"><CitationTab /></TabsContent>
        <TabsContent value="keyword" className="mt-6"><KeywordTab /></TabsContent>
        <TabsContent value="intelligent" className="mt-6"><IntelligentTab /></TabsContent>
      </Tabs>
    </SearchShell>
  );
}
