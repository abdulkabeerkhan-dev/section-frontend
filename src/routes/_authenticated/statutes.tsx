import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";

import { SessionGuard } from "@/components/amicus/SessionGuard";
import { ResultState, SearchShell } from "@/components/amicus/SearchShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStatute, searchStatutes, type StatuteResult } from "@/lib/legal-search";

export const Route = createFileRoute("/_authenticated/statutes")({
  head: () => ({
    meta: [
      { title: "Statute Search | Section" },
      { name: "description", content: "Search Pakistani laws, acts and ordinances by name, section or article." },
      { property: "og:title", content: "Statute Search | Section" },
      { property: "og:description", content: "Find Pakistani laws, acts and ordinances instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SessionGuard>
      <StatutesPage />
    </SessionGuard>
  ),
});

function StatutesPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StatuteResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<StatuteResult | null>(null);
  const [full, setFull] = useState<{ title: string; text: string } | null>(null);
  const [fullLoading, setFullLoading] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      setResults(await searchStatutes(q));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function view(r: StatuteResult) {
    setOpen(r);
    setFull(null);
    setFullLoading(true);
    try {
      setFull(await getStatute(r.canonical_id));
    } catch (err) {
      setFull({ title: r.title, text: err instanceof Error ? err.message : "Could not load section." });
    } finally {
      setFullLoading(false);
    }
  }

  return (
    <SearchShell title="Search Statutes" subtitle="Find Pakistani laws, acts, codes, and ordinances by name, section, or article.">
      <form onSubmit={run} className="mx-auto flex max-w-2xl gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Statutes (e.g. Penal Code, Section 489-F, Article 199)"
          className="h-11 rounded-[3px] border-[var(--line-strong)] bg-[var(--surface)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--ink)]"
        />
        <Button
          type="submit"
          className="h-11 min-w-[120px] gap-2 rounded-[3px] bg-[var(--ink)] px-5 font-sans text-[13px] font-medium text-[var(--on-ink)] hover:bg-[var(--ink-2)]"
          disabled={loading}
          aria-label="Search statutes"
        >
          <Search className="h-4 w-4" /> {loading ? "Searching..." : "Search"}
        </Button>
      </form>

      <div className="mt-8 space-y-4">
        <ResultState loading={loading} error={error} empty={results?.length === 0} />
        {!loading &&
          results?.map((r) => (
            <article
              key={r.canonical_id || r.title}
              className="rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(18,18,18,0.04)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {r.canonical_id.replace(/_/g, " ")}
                  </span>
                  <h2 className="mt-1 font-serif text-[20px] font-bold text-[var(--text)]">{r.title}</h2>
                </div>
                <span
                  className={`shrink-0 rounded-[3px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                    r.in_force
                      ? "border border-[var(--ok-border)] bg-[var(--ok-bg)] text-[var(--ok-text)]"
                      : "border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
                  }`}
                >
                  {r.in_force ? "In Force" : "Repealed"}
                </span>
              </div>
              {r.snippet && (
                <p className="mt-3 line-clamp-3 font-sans text-[14px] leading-relaxed text-[var(--text-muted)]">
                  {r.snippet}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4 min-h-[38px] rounded-[3px] border-[var(--chip-border)] bg-[var(--chip-bg)] font-sans text-[12px] font-medium text-[var(--chip-text)] hover:bg-[var(--surface-2)]"
                onClick={() => view(r)}
                aria-label={`View full section for ${r.title}`}
              >
                View Full Section
              </Button>
            </article>
          ))}
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-8 text-[var(--text)]">
          <DialogHeader>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {open?.canonical_id.replace(/_/g, " ")}
            </p>
            <DialogTitle className="mt-1 font-serif text-[26px] font-bold text-[var(--ink)]">
              {full?.title || open?.title}
            </DialogTitle>
            <div className="mt-2 h-[2px] w-[48px] bg-[var(--ink)]" />
          </DialogHeader>
          <div className="mt-6 font-serif text-[16px] leading-[1.8] text-[var(--text)] whitespace-pre-wrap">
            {fullLoading ? (
              <p className="font-sans text-[14px] text-[var(--text-muted)]">Loading authoritative verbatim text...</p>
            ) : (
              full?.text || "No text available."
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SearchShell>
  );
}
