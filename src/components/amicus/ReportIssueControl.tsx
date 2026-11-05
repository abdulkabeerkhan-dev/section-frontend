import { createContext, useContext, useState } from "react";
import { Flag, Check } from "lucide-react";

import type { CaseResult } from "@/lib/api";
import { ISSUE_TYPES, reportCitationIssue } from "@/lib/citation-feedback.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/** Query text that produced the currently rendered citations. */
const QueryTextContext = createContext<string>("");

export function QueryTextProvider({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <QueryTextContext.Provider value={value}>{children}</QueryTextContext.Provider>;
}

/** Read the query text that produced the currently rendered answer. */
export function useQueryText(): string {
  return useContext(QueryTextContext);
}


type IssueValue = (typeof ISSUE_TYPES)[number]["value"];

interface ReportIssueControlProps {
  data?: CaseResult;
  /** Fallback title when there is no structured case data (e.g. parsed heading). */
  fallbackTitle?: string;
  className?: string;
}

export function ReportIssueControl({
  data,
  fallbackTitle,
  className,
}: ReportIssueControlProps) {
  const queryText = useContext(QueryTextContext);
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState<IssueValue>("broken");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportCitationIssue({
        data: {
          caseId: data?.case_id ?? null,
          citation: data?.citation ?? null,
          court: data?.court ?? null,
          caseTitle: data?.title ?? fallbackTitle ?? null,
          queryText: queryText || null,
          issueType,
          note,
        },
      });
      setDone(true);
      setNote("");
      setTimeout(() => setOpen(false), 1200);
    } catch {
      setError("Could not send the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={
            "inline-flex items-center gap-1 text-[11.5px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
            (className ?? "")
          }
          aria-label="Report an issue with this case"
        >
          <Flag className="h-3 w-3" aria-hidden />
          Report issue
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {done ? (
          <p className="flex items-center gap-1.5 py-2 text-[13px] font-medium text-gold">
            <Check className="h-3.5 w-3.5" aria-hidden /> Thanks, reported
          </p>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Report issue
            </p>
            <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueValue)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue placeholder="Issue type" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-[13px]">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (what looked wrong?)"
              rows={3}
              className="resize-none text-[13px]"
            />
            {error && <p className="text-[12px] text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[12px]"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 text-[12px]"
                disabled={submitting}
                onClick={submit}
              >
                {submitting ? "Sending…" : "Submit"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
