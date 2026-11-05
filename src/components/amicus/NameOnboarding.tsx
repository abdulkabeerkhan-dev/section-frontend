import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { setMyName } from "@/lib/me.functions";
import { AmicusMark } from "./Wordmark";

const inputClass =
  "mt-1.5 h-11 w-full rounded-md border border-border bg-card px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none";

/**
 * Shown once, on an associate's first sign-in, to capture the name they want
 * Section to greet them by. Cannot be dismissed until a name is provided.
 */
export function NameOnboarding() {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setLoading(true);
    try {
      await setMyName({ data: { firstName: firstName.trim(), lastName: lastName.trim() } });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your name.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-6 backdrop-blur-sm">
      <div className="landing-in w-full max-w-[420px] rounded-xl border border-border bg-card p-7 shadow-lg">
        <div className="flex justify-center">
          <AmicusMark animate className="text-[68px]" />
        </div>
        <h1 className="mt-4 text-center font-sans text-3xl font-semibold text-foreground">
          Welcome to Section
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted-foreground">
          What should we call you? Tell us your name so Section can greet you
          properly every time you sign in.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-[13px] font-medium text-foreground">First name</label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              placeholder="Muhammad"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-foreground">Last name</label>
            <input
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              placeholder="Ahmed"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !firstName.trim() || !lastName.trim()}
            className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
