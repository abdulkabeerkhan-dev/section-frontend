import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";

import { syncCurrentUser } from "@/lib/me-sync.functions";
import { setClerkToken } from "@/integrations/clerk/auth-attacher";

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
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const syncUser = useServerFn(syncCurrentUser);

  const fallbackUser = useMemo<MeResult | undefined>(() => {
    if (!user) return undefined;
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const fullName =
      user.fullName ??
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ??
      "Advocate";
    const firstName = user.firstName || fullName.split(" ")[0] || "Advocate";
    const lastName = user.lastName || fullName.split(" ").slice(1).join(" ") || "";
    return {
      id: user.id,
      fullName,
      firstName,
      lastName,
      email,
      status: "active",
      isAdmin: false,
      needsName: false,
    };
  }, [user]);

  return useQuery<MeResult>({
    queryKey: ["me", user?.id ?? null],
    enabled: Boolean(isLoaded && isSignedIn && user),
    staleTime: 60_000,
    placeholderData: fallbackUser,
    retry: (failureCount, error) => failureCount < 3 && isTransient(error),
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
    queryFn: async (): Promise<MeResult> => {
      const email = user?.primaryEmailAddress?.emailAddress ?? "";
      const fullName =
        user?.fullName ??
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
      const resolvedFallbackName = fullName || "Advocate";
      const localFallback: MeResult = {
        id: user?.id ?? "",
        fullName: resolvedFallbackName,
        firstName: user?.firstName || resolvedFallbackName.split(" ")[0] || "Advocate",
        lastName: user?.lastName || resolvedFallbackName.split(" ").slice(1).join(" ") || "",
        email,
        status: "active",
        isAdmin: false,
        needsName: false,
      };

      try {
        const startedAt = Date.now();

        try {
          const token = await getToken();
          if (token) setClerkToken(token);
        } catch {
          // non-blocking
        }

        let raw: Record<string, unknown> = {};
        try {
          const syncedUser = await syncUser({ data: { email, fullName } });
          if (syncedUser && typeof syncedUser === "object") {
            raw = syncedUser as unknown as Record<string, unknown>;
          }
        } catch (networkErr) {
          console.warn("[useMe] user sync failed, falling back to Clerk session", {
            elapsedMs: Date.now() - startedAt,
            error: networkErr,
          });
          return localFallback;
        }

        // Backend may return either the user fields at the top level or wrapped
        // as { status, user: {...} }. Normalize to the inner object.
        const dbUser: Record<string, unknown> =
          raw && typeof raw === "object" && raw.user && typeof raw.user === "object"
            ? (raw.user as Record<string, unknown>)
            : (raw && typeof raw === "object" ? raw : {});

        const resolvedFullName =
          (typeof dbUser.full_name === "string" ? dbUser.full_name : null) ??
          (typeof dbUser.fullName === "string" ? dbUser.fullName : null) ??
          fullName ??
          "Advocate";
        const firstName =
          (typeof dbUser.first_name === "string" ? dbUser.first_name : null) ??
          (typeof dbUser.firstName === "string" ? dbUser.firstName : null) ??
          user?.firstName ??
          resolvedFullName.split(" ")[0] ??
          "Advocate";
        const lastName =
          (typeof dbUser.last_name === "string" ? dbUser.last_name : null) ??
          (typeof dbUser.lastName === "string" ? dbUser.lastName : null) ??
          user?.lastName ??
          resolvedFullName.split(" ").slice(1).join(" ") ??
          "";

        return {
          id: (typeof dbUser.id === "string" ? dbUser.id : null) ?? user?.id ?? "",
          fullName: resolvedFullName,
          firstName,
          lastName,
          email: (typeof dbUser.email === "string" ? dbUser.email : null) ?? email,
          status: (typeof dbUser.status === "string" ? dbUser.status : null) ?? "active",
          isAdmin:
            Boolean(dbUser.is_admin) ||
            Boolean(dbUser.isAdmin) ||
            (dbUser.role as string) === "admin",
          needsName: typeof firstName === "string" && firstName.trim().length === 0,
        };
      } catch (err) {
        console.warn("[useMe] queryFn error caught, using Clerk fallback:", err);
        return localFallback;
      }
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
