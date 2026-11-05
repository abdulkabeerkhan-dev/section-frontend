import { useState } from "react";

import { requestAccess } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RequestAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputClass =
  "mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none";

export function RequestAccessModal({ open, onOpenChange }: RequestAccessModalProps) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: "", firm_name: "", email: "" });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => {
        setSent(false);
        setSubmitting(false);
        setForm({ full_name: "", firm_name: "", email: "" });
      }, 200);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await requestAccess({
        full_name: form.full_name,
        firm_name: form.firm_name,
        email: form.email,
      });
      setSent(true);
    } catch {
      // Error toast already shown by requestAccess.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {sent ? (
          <div className="py-6 text-center">
            <DialogTitle className="font-sans text-3xl">Request sent</DialogTitle>
            <DialogDescription className="mt-3 text-[15px]">
              We will be in touch.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Back
              </button>
              <DialogTitle className="font-sans text-3xl">Request Access</DialogTitle>
              <DialogDescription>
                Section is invitation-only. Tell us about you and we'll reach out.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 space-y-4">

              <div>
                <label className="text-[13px] font-medium text-foreground">Full name</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className={inputClass}
                  placeholder="Ayesha Khan"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-foreground">Firm name</label>
                <input
                  required
                  value={form.firm_name}
                  onChange={(e) => setForm((f) => ({ ...f, firm_name: e.target.value }))}
                  className={inputClass}
                  placeholder="Khan & Associates"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-foreground">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                  placeholder="you@firm.com"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit request"}
              </button>

            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
