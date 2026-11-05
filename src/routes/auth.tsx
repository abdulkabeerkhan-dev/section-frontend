import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import { Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { RequestAccessModal } from "@/components/amicus/RequestAccessModal";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In: Section" },
      { name: "description", content: "Sign in to your Section workspace." },
      { property: "og:title", content: "Sign In: Section" },
      {
        property: "og:description",
        content: "Private, invitation only workspace for Pakistani advocates.",
      },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "mt-2 h-11 w-full rounded-md border border-border bg-card px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function AuthPage() {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate({ to: "/app" });
  }, [isLoaded, isSignedIn, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!isLoaded || !signIn) {
      setError("Still preparing the sign in service. Please try again in a moment.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate({ to: "/app" });
        return;
      }
      setError("Additional verification is required for this account.");
      toast.error("Additional verification required.");
    } catch (err: any) {
      if (
        err?.errors?.[0]?.code === "session_already_active" ||
        String(err).includes("already active")
      ) {
        navigate({ to: "/app" });
        return;
      }
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Invalid email or password.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const showOverlay = isLoaded && isSignedIn;


  return (
    <main className="landing-harvey relative flex min-h-dvh flex-col bg-background text-foreground">
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-foreground/70 pulse-gold" aria-hidden />
          <p className="font-serif text-lg text-foreground">Signing you in</p>
        </div>
      )}

      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <span className="flex items-baseline gap-2">
            <span className="font-serif text-2xl leading-none text-foreground">§</span>
            <span className="font-serif text-[16px] font-medium tracking-[-0.01em] text-foreground">
              Section
            </span>
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Invitation only
          </p>
          <h1 className="mt-4 font-serif text-[38px] font-normal leading-[1.05] tracking-[-0.025em] text-foreground">
            Welcome back
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Sign in to your private workspace for Pakistani case law research and
            court ready drafting.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div>
              <label htmlFor="email" className="text-[13px] font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@firm.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-[13px] font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] leading-snug text-destructive"
              >
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {loading ? "Signing in" : "Sign in"}
              </button>

              <button
                type="button"
                onClick={() => setRequestOpen(true)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-border px-6 text-[13px] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Request access
              </button>
            </div>
          </form>

          <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">
            Section is invitation only. If you do not have an account yet, request
            access and we will be in touch.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-2 px-6 py-7 text-[12px] text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Section</span>
          <span>For licensed legal professionals in Pakistan</span>
        </div>
      </footer>

      <RequestAccessModal open={requestOpen} onOpenChange={setRequestOpen} />
    </main>
  );
}
