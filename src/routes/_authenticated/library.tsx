import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { SessionGuard } from "@/components/amicus/SessionGuard";
import { PrecedentCardItem } from "@/components/amicus/PrecedentCards";
import { Input } from "@/components/ui/input";
import type { PrecedentCard } from "@/lib/api";
import { useLibrary } from "@/lib/useLibrary";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Citation Library — Section" },
      { name: "description", content: "Your saved and tagged precedents, organised by matter." },
      { property: "og:title", content: "Citation Library — Section" },
      { property: "og:description", content: "Your saved and tagged precedents, organised by matter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SessionGuard>
      <LibraryPage />
    </SessionGuard>
  ),
});

function asCard(raw: unknown): PrecedentCard {
  const c = (raw ?? {}) as Partial<PrecedentCard>;
  return {
    case_name: "",
    citation: "",
    date: "",
    outcome: "",
    verified_source: false,
    issue: "",
    holding: "",
    why_relevant: "",
    raw_judgment_text: "",
    source_url: "",
    case_id: "",
    ...c,
    statutes_invoked: Array.isArray(c.statutes_invoked) ? c.statutes_invoked : [],
  } as PrecedentCard;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded border px-2.5 py-1 text-xs transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function LibraryPage() {
  const { rows, isLoading, isError, refetch } = useLibrary();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [matter, setMatter] = useState<string | null>(null);

  const tags = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.tags))).sort(), [rows]);
  const matters = useMemo(() => Array.from(new Set(rows.map((r) => r.matter).filter(Boolean))).sort(), [rows]);
  const filtered = rows.filter((r) => {
    if (tag && !r.tags.includes(tag)) return false;
    if (matter && r.matter !== matter) return false;
    const s = q.trim().toLowerCase();
    if (s && !`${r.citation} ${r.case_title} ${r.note} ${r.tags.join(" ")} ${r.matter}`.toLowerCase().includes(s)) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link to="/app" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to research
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-foreground">Citation Library</h1>
      <p className="mt-1 text-sm text-muted-foreground">Precedents you have saved, tagged, and filed by matter.</p>

      <div className="mt-6 space-y-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search citation, title, note…" />
        {matters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Matter</span>
            <Chip active={!matter} onClick={() => setMatter(null)}>All</Chip>
            {matters.map((m) => (
              <Chip key={m} active={matter === m} onClick={() => setMatter(m)}>{m}</Chip>
            ))}
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Tags</span>
            <Chip active={!tag} onClick={() => setTag(null)}>All</Chip>
            {tags.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(t)}>#{t}</Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading your library…</p>}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not load your library.{" "}
            <button className="underline" onClick={() => refetch()}>Try again</button>
          </p>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {rows.length === 0
              ? "No saved precedents yet. Use “Save to Library” on any authority card."
              : "No precedents match these filters."}
          </p>
        )}
        {filtered.map((r, i) => (
          <div key={r.id}>
            {(r.matter || r.tags.length > 0 || r.note) && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {r.matter && <span className="font-semibold text-foreground">{r.matter}</span>}
                {r.tags.map((t) => <span key={t}>#{t}</span>)}
                {r.note && <span className="italic">— {r.note}</span>}
              </div>
            )}
            <PrecedentCardItem card={asCard(r.card)} index={i} />
          </div>
        ))}
      </div>
    </main>
  );
}
