import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachClerkAuth } from "@/integrations/clerk/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Never intercept TanStack Start server functions or JSON RPC requests with HTML
    try {
      const req = getRequest();
      const url = req?.url ?? "";
      const accept = req?.headers?.get("accept") ?? "";
      if (
        url.includes("/_server") ||
        accept.includes("application/json") ||
        req?.headers?.has("x-tsr-server-fn")
      ) {
        throw error;
      }
    } catch (checkErr) {
      if (checkErr === error) throw error;
    }

    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("[startInstance requestMiddleware]", error);
    return new Response(renderErrorPage(error), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachClerkAuth],
  requestMiddleware: [errorMiddleware],
}));
