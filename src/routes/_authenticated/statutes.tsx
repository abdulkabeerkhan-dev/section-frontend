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
    <SearchShell title="Search Statutes" subtitle="Find laws, acts, and ordinances instantly.">
      <form onSubmit={run} className="mx-auto flex max-w-2xl gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Statutes (e.g. Penal Code, Section 19, Article 199)"
          className="h-11 rounded-sm"
        />
        <Button type="submit" className="h-11 gap-2 rounded-sm px-5" disabled={loading}>
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      <div className="mt-8 space-y-3">
        <ResultState loading={loading} error={error} empty={results?.length === 0} />
        {!loading &&
          results?.map((r) => (
            <article key={r.canonical_id || r.title} className="rounded-sm border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-serif text-lg text-foreground">{r.title}</h2>
                <span className="shrink-0 rounded-sm border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {r.in_force ? "In force" : "Repealed"}
                </span>
              </div>
              {r.snippet && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.snippet}</p>}
              <Button variant="outline" size="sm" className="mt-4 rounded-sm" onClick={() => view(r)}>
                View Full Section
              </Button>
            </article>
          ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{full?.title || open?.title}</DialogTitle>
          </DialogHeader>
          {fullLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{full?.text}</p>
          )}
        </DialogContent>
      </Dialog>
    </SearchShell>
  );
}
