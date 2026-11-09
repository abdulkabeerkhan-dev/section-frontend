import { useState } from "react";
import { Scale } from "lucide-react";

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
  const pins = usePins();
  const pinIndex = pins.findIndex((p) => p.id === pinId(card));
  const citation = card.citation || extractCitation(card.case_name);
  const decisionDate = card.decision_date || card.date || "";
  const decisionYear =
    card.year ? String(card.year) : getDecisionYear(decisionDate || citation);
  const displayTitle = card.case_name || cleanTitle(card.case_title || card.title || "Title unavailable");
  // Deterministic identifier for judgment text / PDF — never the case title.
  const judgmentId = card.judgment_id || card.case_id || "";

  return (
    <article className="fade-up border-b border-border/70 py-5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-serif text-[16px] font-semibold text-foreground">
          {card.source_url ? (
            <a
              href={card.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground"
            >
              {citation || displayTitle}
            </a>
          ) : (
            citation || displayTitle
          )}
        </h3>
        {card.court && (
          <span className="text-[13px] text-muted-foreground">{card.court}</span>
        )}
        {decisionYear && (
          <span className="text-[13px] text-muted-foreground">({decisionYear})</span>
        )}
      </div>

      {citation && displayTitle !== citation && (
        <p className="mt-1 text-[13.5px] text-muted-foreground">{displayTitle}</p>
      )}

      <PrecedentWarning
        status={card.precedent_status}
        warningText={card.precedent_status_warning}
        supersedingCitation={card.superseding_citation}
        supersedingName={card.superseding_case_name}
        onCitationClick={onCitationClick}
      />

      {card.ratio_decidendi && (
        <p className="mt-2.5 text-[14.5px] leading-6 text-foreground/85">{card.ratio_decidendi}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
        {(judgmentId || card.raw_judgment_text || card.holding) && (
          <button
            type="button"
            onClick={() => setReaderOpen(true)}
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Scale className="h-3.5 w-3.5" aria-hidden />
            View Full Opinion
          </button>
        )}
        {card.pdf_url && (
          <a
            href={card.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Download / View PDF
          </a>
        )}
        <SavePrecedentControl card={card} />
        {card.verified_source && card.verification_status !== "HEADNOTE_ONLY - not verified" && (
          <button
            type="button"
            onClick={() => {
              const r = togglePin(card);
              if (r === "full") toastFull();
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {pinIndex >= 0 ? `Pinned ${pinIndex + 1}/${MAX_PINS}` : "Pin to Pleading"}
          </button>
        )}
      </div>

      <JudgmentReaderDrawer card={card} open={readerOpen} onOpenChange={setReaderOpen} />
    </article>
  );
}

function toastFull() {
  import("sonner").then(({ toast }) => toast.error(`You can pin up to ${MAX_PINS} authorities.`));
}

export function PrecedentCardList({
  cards,
  onCitationClick,
}: {
  cards: PrecedentCard[];
  onCitationClick?: (citation: string) => void;
}) {
  return (
    <div>
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
