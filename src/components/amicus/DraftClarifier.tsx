import { useState } from "react";

import { Button } from "@/components/ui/button";
import { COURTS, DRAFT_DOCUMENTS } from "@/lib/draft-intent";
import { cn } from "@/lib/utils";

interface DraftClarifierProps {
  initialDocument: string | null;
  initialCourt: string | null;
  onConfirm: (document: string, court: string) => void;
  onCancel: () => void;
}

const chip =
  "rounded-[3px] border px-3 py-1.5 font-sans text-[12px] transition-colors text-left";
const chipOn = "border-[var(--ink)] bg-[var(--ink)] text-[var(--on-ink)]";
const chipOff = "border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--ink)]";
const OTHER = "__other__";

/** Counsel asks what to draft and for which court before drafting, instead of guessing. */
export function DraftClarifier({ initialDocument, initialCourt, onConfirm, onCancel }: DraftClarifierProps) {
  const [doc, setDoc] = useState<string>(initialDocument ?? "");
  const [docOther, setDocOther] = useState("");
  const [court, setCourt] = useState<string>(initialCourt ?? "");
  const [courtOther, setCourtOther] = useState("");

  const finalDoc = doc === OTHER ? docOther.trim() : doc;
  const finalCourt = court === OTHER ? courtOther.trim() : court;

  return (
    <div
      role="dialog"
      aria-label="What should Counsel draft?"
      className="mb-3 rounded-[3px] border border-[var(--ink)] bg-[var(--surface)] p-4 shadow-[0_1px_4px_rgba(18,18,18,0.06)]"
    >
      <p className="font-serif text-[17px] font-bold text-[var(--ink)]">Before I draft</p>
      <p className="mt-1 font-sans text-[13px] text-[var(--text-muted)]">
        Tell me exactly what to draft and for which court, so the draft fits your matter.
      </p>

      <p className="mt-4 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Document
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DRAFT_DOCUMENTS.map((d) => (
          <button
            key={d.label}
            type="button"
            onClick={() => setDoc(d.label)}
            className={cn(chip, doc === d.label ? chipOn : chipOff)}
          >
            {d.label}
          </button>
        ))}
        <button type="button" onClick={() => setDoc(OTHER)} className={cn(chip, doc === OTHER ? chipOn : chipOff)}>
          Other…
        </button>
      </div>
      {doc === OTHER && (
        <input
          autoFocus
          value={docOther}
          onChange={(e) => setDocOther(e.target.value)}
          placeholder="e.g. Application under Order IX Rule 13 CPC"
          className="mt-2 w-full rounded-[3px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-sans text-[13px] outline-none focus:border-[var(--ink)]"
        />
      )}

      <p className="mt-4 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Court / forum
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {COURTS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setCourt(c.label)}
            className={cn(chip, court === c.label ? chipOn : chipOff)}
          >
            {c.label}
          </button>
        ))}
        <button type="button" onClick={() => setCourt(OTHER)} className={cn(chip, court === OTHER ? chipOn : chipOff)}>
          Other…
        </button>
      </div>
      {court === OTHER && (
        <input
          value={courtOther}
          onChange={(e) => setCourtOther(e.target.value)}
          placeholder="e.g. Court of Senior Civil Judge, Lahore"
          className="mt-2 w-full rounded-[3px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-sans text-[13px] outline-none focus:border-[var(--ink)]"
        />
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={!finalDoc || !finalCourt} onClick={() => onConfirm(finalDoc, finalCourt)}>
          Draft it
        </Button>
      </div>
    </div>
  );
}
