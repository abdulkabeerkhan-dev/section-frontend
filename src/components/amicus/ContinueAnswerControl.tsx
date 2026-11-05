import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { ArrowDownToLine, Loader2 } from "lucide-react";

import { continueAnswer } from "@/lib/api";

interface ContinueAnswerControlProps {
  jobId: string;
  /** Called with the full updated answer and the new truncated flag. */
  onContinued: (answer: string, truncated: boolean) => void;
}

/**
 * Scoped to a single answer: asks the backend to continue a truncated response.
 * The endpoint may not exist yet in production — failures surface inline.
 */
export function ContinueAnswerControl({ jobId, onContinued }: ContinueAnswerControlProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Could not continue this answer right now.");
      const res = await continueAnswer(jobId, token);
      onContinued(res.answer, res.truncated);
    } catch {
      setError("Could not continue this answer right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:border-gold/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
        )}
        {loading ? "Continuing…" : "Continue answer"}
      </button>
      {error && <span className="text-[12px] text-muted-foreground">{error}</span>}
    </div>
  );
}
