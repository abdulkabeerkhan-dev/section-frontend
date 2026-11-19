import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response, request: Request): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  // Never turn RPC or API errors into HTML pages
  const url = request.url || "";
  const accept = request.headers.get("accept") || "";
  if (url.includes("/_server") || accept.includes("application/json") || request.headers.has("x-tsr-server-fn")) {
    return response;
  }

  const err = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(err);
  return new Response(renderErrorPage(err), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      // If a request for a static asset reaches the SSR catch-all, the asset was removed or does not exist.
      // Return a 404 text response rather than the HTML SPA so browsers and module loaders don't try to parse HTML as JS.
      if (url.pathname.startsWith("/assets/") || url.pathname.match(/\.(js|css|map|wasm|json|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf)$/i)) {
        return new Response("Asset not found", {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      const handler = await getServerEntry();
      const rawResponse = await handler.fetch(request, env, ctx);
      const response = await normalizeCatastrophicSsrResponse(rawResponse, request);

      // Ensure HTML documents are never cached in browser disk caches across new deployments
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        headers.set("Pragma", "no-cache");
        headers.set("Expires", "0");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      const url = request.url || "";
      const accept = request.headers.get("accept") || "";
      if (url.includes("/_server") || accept.includes("application/json") || request.headers.has("x-tsr-server-fn")) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(renderErrorPage(error), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
