import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";

import { submitFeedback } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackPanelProps {
  queryId: string | null;
  originalAnswer: string | null;
}

export function FeedbackPanel({ queryId, originalAnswer }: FeedbackPanelProps) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Without a query id or original answer there is nothing to correct.
  if (!queryId || !originalAnswer) return null;

  async function handleSubmit() {
    const correction = value.trim();
    if (!correction || submitting) return;

    setSubmitting(true);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }
      await submitFeedback(
        {
          query_id: queryId as string,
          original_answer: originalAnswer as string,
          correct_answer: correction,
        },
        token,
      );
      toast.success(
        "Expert feedback recorded successfully! This correction has been saved to the training dataset.",
      );
      setDone(true);
      setOpen(false);
      setValue("");
    } catch {
      // submitFeedback already surfaces a toast on failure.
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="mt-3 text-[12px] font-medium text-gold">
        ✓ Correction saved to the training dataset.
      </p>
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          Correct Answer
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-card/60 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Senior Lawyer Review
          </p>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Senior Lawyer Review: Enter the precise legal correction or preferred phrasing here..."
            rows={4}
            autoFocus
            className="resize-y text-[14px]"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setValue("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !value.trim()}
            >
              {submitting ? "Submitting..." : "Submit Correction"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
