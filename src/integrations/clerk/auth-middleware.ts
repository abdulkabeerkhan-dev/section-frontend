// Server-side middleware that authenticates server functions using a Clerk
// session token. Replaces the legacy Supabase auth middleware.
//
// It extracts the `Authorization: Bearer <token>` header, verifies the Clerk
// token, and injects the Clerk user id (`userId`) and `claims` into context.
// Data access in handlers uses the service-role admin client (loaded inside the
// handler), since the frontend no longer uses Supabase Auth.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { verifyClerkToken } from "./verify.server";

export const requireClerkAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new Error("Unauthorized: No token provided");
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
