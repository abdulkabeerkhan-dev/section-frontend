import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function SearchShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/app"
          className="inline-flex min-h-[44px] items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:text-[var(--ink)]"
          aria-label="Back to workspace"
        >
          <ArrowLeft className="h-4 w-4" /> Workspace
        </Link>
        <header className="mt-8 mb-10">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            PAKISTANI LEGAL REPOSITORY
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-bold leading-tight text-[var(--ink)]">
            {title}
          </h1>
          <div className="mt-3 h-[3px] w-[64px] rounded-[1px] bg-[var(--ink)]" />
          <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-muted)]">
            {subtitle}
          </p>
        </header>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function ResultState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[0_1px_2px_rgba(18,18,18,0.04)]">
        <p className="font-sans text-[14px] text-[var(--text-muted)]">Searching repository...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-[3px] border border-[var(--warn-border)] bg-[var(--warn-bg)] p-6 text-center">
        <p className="font-sans text-[14px] font-medium text-[var(--warn-text)]">{error}</p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-[3px] border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[0_1px_2px_rgba(18,18,18,0.04)]">
        <p className="font-sans text-[14px] text-[var(--text-muted)]">
          No matching records found. Verify citation or search with broader keywords.
        </p>
      </div>
    );
  }
  return null;
}

export const selectCls =
  "h-11 w-full rounded-[3px] border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] transition-colors focus:border-[var(--ink)] focus:outline-none";
