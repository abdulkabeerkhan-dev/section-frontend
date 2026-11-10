import { useState } from "react";
import { Scale, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import type { PrecedentCard } from "@/lib/api";
import { pinId, togglePin, usePins, MAX_PINS } from "@/lib/pleading-pins";
import { cleanTitle, extractCitation } from "@/lib/case-title";
import { JudgmentReaderDrawer } from "./JudgmentReaderDrawer";
import { PrecedentWarning } from "./PrecedentWarning";
import { SavePrecedentControl } from "./SavePrecedentControl";

function getDecisionYear(value: string): string {
  return value.match(/\b(?:18|19|20)\d{2}\b/)?.[0] ?? "";
}

export function PrecedentCardItem({
  card,
  onCitationClick,
}: {
  card: PrecedentCard;
  index?: number;
  onCitationClick?: (citation: string) => void;
}) {
  const [readerOpen, setReaderOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pins = usePins();
  const pinIndex = pins.findIndex((p) => p.id === pinId(card));
  const citation = card.citation || extractCitation(card.case_name);
  const decisionDate = card.decision_date || card.date || "";
  const decisionYear =
    card.year ? String(card.year) : getDecisionYear(decisionDate || citation);
  const displayTitle = card.case_name || cleanTitle(card.case_title || card.title || "Title unavailable");
  const judgmentId = card.judgment_id || card.case_id || "";

  const isVerified = card.verified !== false && card.verification_status !== "HEADNOTE_ONLY - not verified";

  function handleCopyCite() {
    const cit = citation || displayTitle;
    navigator.clipboard.writeText(cit);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success(`Copied citation: ${cit}`);
  }

  return (
    <article className="border-b border-[var(--line)] py-5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-serif text-[16px] font-bold text-[var(--text)]">
            {citation || displayTitle}
          </h3>
          {card.court && (
            <span className="font-sans text-[12px] text-[var(--text-muted)]">{card.court}</span>
          )}
          {decisionYear && (
            <span className="font-sans text-[12px] text-[var(--text-muted)]">({decisionYear})</span>
          )}
        </div>

        {/* Verified or Unverified badge */}
        <span
          className={`rounded-[3px] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ${
            isVerified
              ? "border border-[var(--ok-border)] bg-[var(--ok-bg)] text-[var(--ok-text)]"
              : "border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
          }`}
        >
          {isVerified ? "✓ Verified" : "⚠️ Unverified"}
        </span>
      </div>

      {citation && displayTitle !== citation && (
        <p className="mt-1 font-sans text-[13px] text-[var(--text-muted)]">{displayTitle}</p>
      )}

      <PrecedentWarning
        status={card.precedent_status}
        warningText={card.precedent_status_warning}
        supersedingCitation={card.superseding_citation}
        supersedingName={card.superseding_case_name}
        onCitationClick={onCitationClick}
      />

      {card.ratio_decidendi && (
        <div className="mt-2.5 rounded-[2px] bg-[var(--surface-2)] p-3 font-serif text-[14px] leading-relaxed text-[var(--text)] border border-[var(--line)]">
          <span className="passage-highlight">
            "{card.ratio_decidendi}"
          </span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[12px]">
        {(judgmentId || card.raw_judgment_text || card.holding) && (
          <button
            type="button"
            onClick={() => setReaderOpen(true)}
            className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)] hover:underline"
            aria-label={`Open full section for ${citation || displayTitle}`}
          >
            <Scale className="h-3.5 w-3.5" aria-hidden />
            Open full section
          </button>
        )}
        <button
          type="button"
          onClick={handleCopyCite}
          className="font-medium text-[var(--text-muted)] hover:text-[var(--ink)]"
          aria-label="Copy citation"
        >
          {copied ? "Copied" : "Cite as"}
        </button>
        <SavePrecedentControl card={card} />
        {!isVerified && (
          <button
            type="button"
            onClick={() => onCitationClick?.(citation || judgmentId)}
            className="rounded-[2px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warn-text)] hover:opacity-90"
            aria-label="Verify against primary source"
          >
            Verify against source
          </button>
        )}
      </div>

      <JudgmentReaderDrawer card={card} open={readerOpen} onOpenChange={setReaderOpen} />
    </article>
  );
}

export function PrecedentCardList({
  cards,
  onCitationClick,
}: {
  cards: PrecedentCard[];
  onCitationClick?: (citation: string) => void;
}) {
  return (
    <div className="space-y-1">
      {cards.map((card, i) => (
        <PrecedentCardItem
          key={`${card.citation || card.case_title || card.case_name}-${i}`}
          card={card}
          index={i}
          onCitationClick={onCitationClick}
        />
      ))}
    </div>
  );
}
