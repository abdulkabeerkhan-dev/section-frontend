// Client-side middleware that attaches the active Clerk session token to every
// server-function RPC. Must be registered as a global `functionMiddleware` in
// `src/start.ts`; otherwise the browser never sends the bearer token.
import { createMiddleware } from "@tanstack/react-start";

type ClerkGlobal = {
  loaded?: boolean;
  session?: { getToken: () => Promise<string | null> } | null;
};

// Clerk is loaded asynchronously; give it a brief window to initialise so the
// first server-function call after a page load still carries the bearer token.
async function getClerkToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
    if (clerk?.loaded) {
      try {
        return (await clerk.session?.getToken()) ?? null;
      } catch {
        return null;
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
