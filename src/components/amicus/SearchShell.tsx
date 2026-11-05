import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function SearchShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Workspace
        </Link>
        <header className="mt-10 text-center">
          <h1 className="font-serif text-4xl text-foreground">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
        </header>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}

export function ResultState({ loading, error, empty }: { loading: boolean; error: string; empty: boolean }) {
  if (loading) return <p className="py-8 text-center text-sm text-muted-foreground">Searching…</p>;
  if (error) return <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>;
  if (empty) return <p className="py-8 text-center text-sm text-muted-foreground">No results found.</p>;
  return null;
}

export const selectCls =
  "h-10 w-full rounded-sm border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
