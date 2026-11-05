import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";

import { useMe, useLogout } from "@/lib/useMe";
import { Wordmark } from "./Wordmark";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <Wordmark />
      <span className="h-2 w-2 rounded-full bg-gold pulse-gold" />
    </div>
  );
}

function SessionError({ onRetry, onSignOut }: { onRetry: () => void; onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Wordmark />
      <div className="max-w-sm space-y-2">
        <h1 className="font-serif text-2xl text-foreground">We couldn't reach your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Your session is active, but the service didn't respond. This is usually
          temporary, please try again in a moment.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

interface SessionGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function SessionGuard({ children, requireAdmin = false }: SessionGuardProps) {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const logout = useLogout();
  const { data: me, isLoading, isError, refetch } = useMe();

  // Clerk is the single source of truth for the session.
  // Only redirect to /auth when the user is genuinely signed out — never on a
  // backend error, otherwise /auth bounces straight back here (infinite loop).
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigate({ to: "/auth" });
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !me) return;
    if (me.status === "inactive") {
      toast.error("Your account has been deactivated.");
      signOut().then(() => navigate({ to: "/auth" }));
      return;
    }
    if (requireAdmin && !me.isAdmin) {
      navigate({ to: "/app" });
    }
  }, [me, requireAdmin, navigate, isLoaded, isSignedIn, signOut]);

  if (!isLoaded) return <FullScreenLoader />;
  if (!isSignedIn) return null;

  // Signed in, but the backend sync failed — show a recoverable error screen
  // instead of redirecting (which would loop back through /auth).
  if (isError) {
    return <SessionError onRetry={() => refetch()} onSignOut={logout} />;
  }

  if (isLoading || !me) return <FullScreenLoader />;
  if (me.status === "inactive") return null;
  if (requireAdmin && !me.isAdmin) return null;
  return <>{children}</>;
}
