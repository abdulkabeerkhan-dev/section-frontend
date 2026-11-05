import { useState } from "react";
import { FileText } from "lucide-react";
import type { CaseResult } from "@/lib/api";
import { CaseDetailDialog } from "./CaseDetailDialog";

interface CitationLinkProps {
  text: string;
  data: CaseResult;
}

/** Inline clickable citation rendered inside markdown body text. */
export function CitationLink({ text, data }: CitationLinkProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-baseline gap-1 rounded-sm border-b border-dotted border-gold/70 px-0.5 align-baseline font-medium text-gold transition-colors hover:bg-gold/10 hover:border-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-gold"
        title={data.title ? `${data.title}: tap for case preview` : "Tap for case preview"}
      >
        <FileText className="h-3 w-3 shrink-0 self-center" aria-hidden />
        <span>{text}</span>
      </button>
      <CaseDetailDialog data={data} open={open} onOpenChange={setOpen} />
    </>
  );
}
