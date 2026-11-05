import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";

import { SessionGuard } from "@/components/amicus/SessionGuard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listMyActivity } from "@/lib/activity.functions";
import { createSavedSearch, deleteSavedSearch, listSavedSearches } from "@/lib/library.functions";
import { normalizeResponse, type PrecedentCard } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({
    meta: [
      { title: "Research Dashboard — Section" },
      { name: "description", content: "Every query's authorities, filters, saved searches, and a jurisprudence timeline." },
      { property: "og:title", content: "Research Dashboard — Section" },
      { property: "og:description", content: "Every query's authorities, filters, saved searches, and a jurisprudence timeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SessionGuard>
      <ResearchDashboard />
    </SessionGuard>
  ),
});

interface Filters {
  text: string;
  mode: string;
  court: string;
  fromYear: string;
  toYear: string;
}
const EMPTY: Filters = { text: "", mode: "", court: "", fromYear: "", toYear: "" };

function yearOf(c: PrecedentCard): number | null {
  const m = `${c.decision_date || c.date || ""} ${c.citation || ""}`.match(/\b(18|19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function cardMatches(c: PrecedentCard, f: Filters) {
  if (f.court && !(c.court || "").toLowerCase().includes(f.court.toLowerCase())) return false;
  const y = yearOf(c);
  if (f.fromYear && (!y || y < Number(f.fromYear))) return false;
  if (f.toYear && (!y || y > Number(f.toYear))) return false;
  return true;
}

function ResearchDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState<Filters>(EMPTY);
  const [searchName, setSearchName] = useState("");

  const activity = useQuery({
    queryKey: ["myActivity"],
    enabled: isLoaded && isSignedIn,
    queryFn: () => listMyActivity(),
  });
  const searches = useQuery({
    queryKey: ["savedSearches"],
    enabled: isLoaded && isSignedIn,
    queryFn: () => listSavedSearches(),
  });
  const saveSearch = useMutation({
    mutationFn: () => createSavedSearch({ data: { name: searchName, filters: { ...f } } }),
    onSuccess: () => {
      setSearchName("");
      toast.success("Search saved");
      qc.invalidateQueries({ queryKey: ["savedSearches"] });
    },
    onError: () => toast.error("Could not save this search"),
  });
  const delSearch = useMutation({
    mutationFn: (id: string) => deleteSavedSearch({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedSearches"] }),
  });

  const queries = useMemo(
    () =>
      (activity.data ?? [])
        .map((r) => {
          let cards: PrecedentCard[] = [];
          try {
            cards = normalizeResponse(r.response).precedent_cards ?? [];
          } catch {
            cards = [];
          }
          return { ...r, cards };
        })
        .reverse(),
    [activity.data],
  );
  const modes = Array.from(new Set(queries.map((q) => q.mode))).filter(Boolean);

  const visible = queries
    .filter((q) => (f.mode ? q.mode === f.mode : true))
    .filter((q) => (f.text ? q.question.toLowerCase().includes(f.text.toLowerCase()) : true))
    .map((q) => ({ ...q, shown: q.cards.filter((c) => cardMatches(c, f)) }))
    .filter((q) => (f.court || f.fromYear || f.toYear ? q.shown.length > 0 : true));

  // Timeline: unique authorities across visible queries.
  const allCards = new Map<string, PrecedentCard>();
  visible.forEach((q) => q.shown.forEach((c) => allCards.set(c.citation || c.case_id || c.case_name, c)));
  const byYear = new Map<number, PrecedentCard[]>();
  allCards.forEach((c) => {
    const y = yearOf(c);
    if (y) byYear.set(y, [...(byYear.get(y) ?? []), c]);
  });
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);
  const maxCount = Math.max(1, ...Array.from(byYear.values()).map((v) => v.length));
  const chain = Array.from(allCards.values()).filter((c) => c.precedent_status || c.superseding_citation);

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link to="/app" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to research
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-foreground">Research Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Authorities returned by each of your queries.</p>

      <section className="mt-6 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-5">
        <Input placeholder="Question contains…" value={f.text} onChange={set("text")} className="sm:col-span-2" />
        <select value={f.mode} onChange={set("mode")} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">All modes</option>
          {modes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <Input placeholder="Court" value={f.court} onChange={set("court")} />
        <div className="flex gap-2">
          <Input placeholder="From" inputMode="numeric" value={f.fromYear} onChange={set("fromYear")} />
          <Input placeholder="To" inputMode="numeric" value={f.toYear} onChange={set("toYear")} />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-5">
          <Input placeholder="Name this search" value={searchName} onChange={(e) => setSearchName(e.target.value)} className="max-w-xs" />
          <Button size="sm" disabled={!searchName.trim() || saveSearch.isPending} onClick={() => saveSearch.mutate()}>Save search</Button>
          <Button size="sm" variant="ghost" onClick={() => setF(EMPTY)}>Clear</Button>
          {(searches.data ?? []).map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs">
              <button type="button" onClick={() => setF({ ...EMPTY, ...(s.filters as Partial<Filters>) })}>{s.name}</button>
              <button type="button" aria-label={`Delete ${s.name}`} onClick={() => delSearch.mutate(s.id)}>
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Authorities by decision year</h2>
          {years.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No dated authorities yet.</p>
          ) : (
            <div className="mt-4 flex h-44 items-end gap-1 overflow-x-auto">
              {years.map((y) => {
                const n = byYear.get(y)!.length;
                return (
                  <div key={y} className="flex min-w-[28px] flex-1 flex-col items-center gap-1" title={byYear.get(y)!.map((c) => c.citation || c.case_name).join("\n")}>
                    <span className="text-[10px] text-muted-foreground">{n}</span>
                    <div className="w-full rounded-sm bg-foreground/80" style={{ height: `${(n / maxCount) * 120}px` }} />
                    <span className="text-[10px] text-muted-foreground">{y}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Overruled &amp; superseded chain</h2>
          {chain.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No overruled or superseded authorities in these results.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {chain
                .sort((a, b) => (yearOf(a) ?? 0) - (yearOf(b) ?? 0))
                .map((c, i) => (
                  <li key={i} className="border-l-2 border-foreground/60 pl-3 text-sm">
                    <p className="font-semibold text-foreground">{c.citation || c.case_name}</p>
                    <p className="text-xs uppercase text-muted-foreground">{c.precedent_status || "superseded"}</p>
                    {c.superseding_citation && (
                      <p className="mt-1 text-xs text-foreground/80">
                        → by {c.superseding_citation}
                        {c.superseding_case_name ? ` (${c.superseding_case_name})` : ""}
                      </p>
                    )}
                  </li>
                ))}
            </ol>
          )}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Queries ({visible.length})</h2>
        {activity.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {visible.map((q) => (
          <details key={q.id} className="rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{q.question}</p>
                <span className="text-xs text-muted-foreground">
                  {q.mode} · {new Date(q.created_at).toLocaleDateString()} · {q.shown.length} authorities
                </span>
              </div>
            </summary>
            {q.shown.length > 0 && (
              <ul className="mt-3 divide-y divide-border border-t border-border">
                {q.shown.map((c, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                    <span className="font-semibold text-foreground">{c.citation || c.case_name}</span>
                    <span className={cn("text-xs text-muted-foreground")}>{[c.court, yearOf(c)].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </section>
    </main>
  );
}
