import type { CaseResult } from "@/lib/api";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm leading-6">
      <span className="shrink-0 font-semibold text-foreground/70">{label}:</span>
      <span className="text-foreground/90">{value}</span>
    </div>
  );
}

export function StructuredDetails({ data }: { data: CaseResult }) {
  const rows: { label: string; value: string }[] = [];
  if (data.parties) rows.push({ label: "Parties", value: data.parties });
  if (data.outcome) rows.push({ label: "Outcome", value: data.outcome });
  if (data.holding) rows.push({ label: "Holding", value: data.holding });
  if (data.relied_on) rows.push({ label: "Relied on", value: data.relied_on });
  if (data.author_judges && data.author_judges.length)
    rows.push({ label: "Judges", value: data.author_judges.join(", ") });
  if (data.bench_type) rows.push({ label: "Bench", value: data.bench_type });
  if (data.statutes && data.statutes.length)
    rows.push({ label: "Statutes", value: data.statutes.join(", ") });
  if (data.sections && data.sections.length)
    rows.push({ label: "Sections", value: data.sections.join(", ") });

  if (rows.length === 0) return null;
  return (
    <div className="mt-4 space-y-1.5 rounded-md border border-border bg-muted/30 px-4 py-3">
      {rows.map((r) => (
        <MetaRow key={r.label} label={r.label} value={r.value} />
      ))}
    </div>
  );
}
