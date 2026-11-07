// Server-side middleware that authenticates server functions using a Clerk
// session token. Replaces the legacy Supabase auth middleware.
//
// It extracts the `Authorization: Bearer <token>` header (or falls back to the
// Clerk `__session` cookie), verifies the Clerk token, and injects the Clerk user
// id (`userId`) and `claims` into context.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { verifyClerkToken } from "./verify.server";

export const requireClerkAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    let token = "";
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }

    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }
    }

    if (!token) {
      throw new Error("Unauthorized: No authorization token provided");
    }

    const claims = await verifyClerkToken(token);

    return next({
      context: {
        userId: claims.sub as string,
        claims,
      },
    });
  },
);
