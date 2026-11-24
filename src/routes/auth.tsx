import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  "w-full rounded border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40";

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
    <main className="site grid min-h-dvh bg-background text-foreground md:grid-cols-2">
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
          <p className="font-serif text-2xl text-foreground">Signing you in</p>
        </div>
      )}

      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-10 md:flex">
        <Link to="/" className="font-serif text-3xl text-foreground">
          § <span>Section</span>
        </Link>
        <span
          aria-hidden
          className="anim-float pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 font-serif text-[28rem] leading-none text-foreground/10"
        >
          §
        </span>
        <p className="relative max-w-sm font-serif text-4xl leading-tight">
          Precise answers.
          <br />
          Lasting advantage.
        </p>
      </section>

      <section className="flex flex-col p-6 md:p-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-serif text-2xl text-foreground md:invisible">
            §
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="grid size-9 place-items-center rounded border border-input bg-background text-foreground transition-colors hover:bg-accent"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>

        <div className="anim-fade-up m-auto w-full max-w-sm py-12">
          <p className="label-caps">Invitation only</p>
          <h1 className="mt-3 font-serif text-5xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to continue to Section.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-3">
            <label htmlFor="email" className="sr-only">
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
              placeholder="Email"
            />
            <label htmlFor="password" className="sr-only">
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
              placeholder="Password"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded bg-primary py-3 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {loading ? "Signing in" : "Sign in"}
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-3 rounded border border-border bg-card px-4 py-3 text-sm text-foreground">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Section?{" "}
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="text-foreground underline-offset-4 hover:underline"
            >
              Request access
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          For licensed legal professionals in Pakistan.
        </p>
      </section>

      <RequestAccessModal open={requestOpen} onOpenChange={setRequestOpen} />
    </main>
  );
}
