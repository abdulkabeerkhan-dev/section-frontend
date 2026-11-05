import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSignUp, useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Wordmark } from "@/components/amicus/Wordmark";

const heroVideo = {
  url: "/__l5e/assets-v1/23bc3d5d-86e3-4ed3-8b5c-45ab88e2c6e4/hero-law.mp4",
};

export const Route = createFileRoute("/accept-invitation")({
  head: () => ({
    meta: [
      { title: "Accept Invitation: Section" },
      { name: "description", content: "Set up your Section workspace account." },
    ],
  }),
  component: AcceptInvitationPage,
});

const inputClass =
  "mt-1.5 h-11 w-full rounded-md border border-border bg-card px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none";

/** Reads the Clerk invitation ticket from the current URL. */
function readTicket(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("__clerk_ticket");
}

function AcceptInvitationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();

  const [ticket, setTicket] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Capture the invitation ticket the instant we land from the email link.
  useEffect(() => {
    setTicket(readTicket());
  }, []);

  // If they're already signed in, send them straight into the app.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: "/app" });
    }
  }, [isLoaded, isSignedIn, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    if (!ticket) {
      toast.error("This invitation link is missing or invalid.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Exchange the invitation ticket for an account and set the password.
      const result = await signUp.create({
        strategy: "ticket",
        ticket,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Trigger the backend profile sync immediately on success so the
        // Supabase profile row is created the moment they enter the app.
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        navigate({ to: "/app" });
      } else {
        console.log("Clerk invitation flow needs another step:", result);
        toast.error("Additional verification is required to finish setup.");
      }
    } catch (err: any) {
      if (
        err?.errors?.[0]?.code === "session_already_active" ||
        String(err).includes("already active")
      ) {
        navigate({ to: "/app" });
        return;
      }
      toast.error(err?.errors?.[0]?.message || "Could not accept this invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <video
          className="hero-video-zoom absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={heroVideo.url} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="absolute inset-0 shadow-[inset_0_0_240px_70px_rgba(0,0,0,0.8)]" />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Wordmark className="scale-110" animateMark />
        </div>
        <div className="rounded-xl border border-border bg-card/90 p-7 shadow-lg backdrop-blur-sm">
          <h1 className="text-center font-sans text-3xl font-semibold text-foreground">
            Accept your invitation
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            Set a password to activate your private Section workspace.
          </p>

          {ticket === null ? (
            <p className="mt-6 rounded-md border border-border bg-card px-4 py-3 text-center text-[13px] text-muted-foreground">
              This page is reached through the invitation link in your email. If you
              arrived here directly, please use that link, or{" "}
              <button
                type="button"
                onClick={() => navigate({ to: "/auth" })}
                className="font-medium text-primary hover:underline"
              >
                sign in
              </button>
              .
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-[13px] font-medium text-foreground">New password</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-foreground">Confirm password</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Activating…" : "Activate workspace"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-[12px] leading-relaxed text-muted-foreground">
            Section is invitation-only. Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate({ to: "/auth" })}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
