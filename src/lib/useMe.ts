import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useCallback } from "react";

import { syncCurrentUser } from "@/lib/me-sync.functions";

export interface MeResult {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  isAdmin: boolean;
  needsName: boolean;
}

/** Error carrying the HTTP status of a failed /users/sync call (0 = network). */
class SyncError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SyncError";
    this.status = status;
  }
}

/** Transient conditions worth retrying: network blips, cold starts, rate limits. */
function isTransient(error: unknown): boolean {
  if (!(error instanceof SyncError)) return false;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

/**
 * Syncs the current Clerk user with our backend and returns the database
 * user object as the app's global profile state. Auth is fully owned by
 * Clerk on the frontend; the backend talks to the database with admin keys.
 */
export function useMe() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const syncUser = useServerFn(syncCurrentUser);

  return useQuery<MeResult>({
    queryKey: ["me", user?.id ?? null],
    enabled: Boolean(isLoaded && isSignedIn && user),
    staleTime: 60_000,
    // Cold starts on the backend can take a few seconds — retry transient
    // failures (network errors, 5xx, 408, 429) with exponential backoff.
    // Auth/permission failures (4xx) fail immediately.
    retry: (failureCount, error) => failureCount < 5 && isTransient(error),
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    queryFn: async (): Promise<MeResult> => {
      const email = user?.primaryEmailAddress?.emailAddress ?? "";
      const fullName =
        user?.fullName ??
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

      const startedAt = Date.now();

      let raw: Record<string, unknown>;
      try {
        const syncedUser = await syncUser({ data: { email, fullName } });
        raw = syncedUser as unknown as Record<string, unknown>;
      } catch (networkErr) {
        console.error("[useMe] user sync failed", {
          elapsedMs: Date.now() - startedAt,
          error: networkErr,
        });
        throw new SyncError("Could not reach the backend.", 0);
      }
      // Backend may return either the user fields at the top level or wrapped
      // as { status, user: {...} }. Normalize to the inner object.
      const dbUser: Record<string, unknown> =
        raw.user && typeof raw.user === "object"
          ? (raw.user as Record<string, unknown>)
          : raw;

      const resolvedFullName =
        (dbUser.full_name as string) ?? (dbUser.fullName as string) ?? fullName ?? "";
      const firstName =
        (dbUser.first_name as string) ??
        (dbUser.firstName as string) ??
        user?.firstName ??
        resolvedFullName.split(" ")[0] ??
        "";
      const lastName =
        (dbUser.last_name as string) ??
        (dbUser.lastName as string) ??
        user?.lastName ??
        resolvedFullName.split(" ").slice(1).join(" ") ??
        "";

      return {
        id: (dbUser.id as string) ?? user?.id ?? "",
        fullName: resolvedFullName,
        firstName,
        lastName,
        email: (dbUser.email as string) ?? email,
        status: (dbUser.status as string) ?? "active",
        isAdmin:
          Boolean(dbUser.is_admin) ||
          Boolean(dbUser.isAdmin) ||
          (dbUser.role as string) === "admin",
        needsName: firstName.trim().length === 0,
      };
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  return useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }, [navigate, queryClient, signOut]);
}
