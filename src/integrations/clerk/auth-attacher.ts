// Client-side middleware that attaches the active Clerk session token to every
// server-function RPC. Must be registered as a global `functionMiddleware` in
// `src/start.ts`; otherwise the browser never sends the bearer token.
import { createMiddleware } from "@tanstack/react-start";

type ClerkGlobal = {
  loaded?: boolean;
  session?: { getToken: () => Promise<string | null> } | null;
};

let cachedClerkToken: string | null = null;

export function setClerkToken(token: string | null) {
  cachedClerkToken = token;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Clerk is loaded asynchronously; give it a brief window to initialise so the
// first server-function call after a page load still carries the bearer token.
async function getClerkToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (cachedClerkToken) return cachedClerkToken;

  // Check Clerk session cookie directly (instant, synchronous)
  const cookieToken = getCookie("__session");
  if (cookieToken) {
    cachedClerkToken = cookieToken;
    return cookieToken;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const clerk = (window as unknown as { Clerk?: ClerkGlobal; clerk?: ClerkGlobal }).Clerk ??
                  (window as unknown as { Clerk?: ClerkGlobal; clerk?: ClerkGlobal }).clerk;
    if (clerk?.loaded || clerk?.session) {
      try {
        const token = (await clerk.session?.getToken()) ?? null;
        if (token) {
          cachedClerkToken = token;
          return token;
        }
      } catch {
        // continue polling
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

export const attachClerkAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getClerkToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
