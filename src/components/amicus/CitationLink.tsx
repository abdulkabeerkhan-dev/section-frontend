import { useState } from "react";
import type { CaseResult } from "@/lib/api";
import { CaseDetailDialog } from "./CaseDetailDialog";

interface CitationLinkProps {
  text: string;
  data?: CaseResult;
  unverified?: boolean;
  onClick?: () => void;
}

/** Inline clickable citation rendered inside markdown body text as an authoritative chip. */
export function CitationLink({ text, data, unverified = false, onClick }: CitationLinkProps) {
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (data) {
      setOpen(true);
    }
  };

  const isWarn = unverified || (data && data.is_verified === false);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          isWarn
            ? "inline-flex items-center gap-1 rounded-[3px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2 py-0.5 font-sans text-[11px] font-semibold text-[var(--warn-text)] transition-colors hover:opacity-90 cursor-pointer align-baseline select-none"
            : "inline-flex items-center gap-1 rounded-[3px] border border-[var(--chip-border)] bg-[var(--chip-bg)] px-2 py-0.5 font-sans text-[11px] font-semibold text-[var(--chip-text)] transition-colors hover:bg-[var(--surface-2)] hover:border-[var(--line-strong)] cursor-pointer align-baseline select-none"
        }
        title={data?.title ? `${data.title} — click to view authority` : `${text} — click to view authority`}
        aria-label={`Authority citation: ${text}`}
      >
        <span>{text}</span>
      </button>
      {data && <CaseDetailDialog data={data} open={open} onOpenChange={setOpen} />}
    </>
  );
}
