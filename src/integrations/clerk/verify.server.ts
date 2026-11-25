// Server-only Clerk JWT verification.
// Verifies a Clerk session token against the instance JWKS (networkless after
// the first fetch). The issuer is read from the token and must be a Clerk host.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { decodeJwt } from "jose";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

// Only our own Clerk instance may issue tokens. Trusting any issuer the token names (as this did,
// for any host containing "clerk.") lets anyone host a JWKS and sign tokens for any user id.
// Allowed: the instance encoded in the publishable key the app is built with, plus CLERK_ISSUERS
// (comma-separated https URLs) for an extra instance such as production.
function issuerFromPublishableKey(pk: string | undefined): string | null {
  if (!pk) return null;
  const parts = pk.split("_");
  if (parts.length < 3) return null;
  try {
    const host = atob(parts.slice(2).join("_")).replace(/\$$/, "").trim();
    return host ? `https://${host}` : null;
  } catch {
    return null;
  }
}

function allowedIssuers(): Set<string> {
  const out = new Set<string>();
  const fromKey = issuerFromPublishableKey(
    ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_CLERK_PUBLISHABLE_KEY) ||
      (typeof process !== "undefined" ? process.env.VITE_CLERK_PUBLISHABLE_KEY : undefined),
  );
  if (fromKey) out.add(fromKey);
  const extra = typeof process !== "undefined" ? process.env.CLERK_ISSUERS || process.env.CLERK_ISSUER || "" : "";
  for (const i of extra.split(",")) {
    const v = i.trim().replace(/\/$/, "");
    if (v.startsWith("https://")) out.add(v);
  }
  return out;
}

function isClerkIssuer(iss: string): boolean {
  return allowedIssuers().has(String(iss || "").replace(/\/$/, ""));
}

function getJwks(issuer: string) {
  let jwks = jwksCache.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    jwksCache.set(issuer, jwks);
  }
  return jwks;
}

/**
 * Verifies a Clerk session token and returns its claims.
 * Throws if the token is missing, malformed, expired, or not from Clerk.
 */
export async function verifyClerkToken(token: string): Promise<JWTPayload> {
  const unverified = decodeJwt(token);
  const issuer = unverified.iss;
  if (!issuer || !isClerkIssuer(issuer)) {
    throw new Error("Unauthorized: token issuer is not Clerk");
  }

  const { payload } = await jwtVerify(token, getJwks(issuer), { issuer });
  if (!payload.sub) {
    throw new Error("Unauthorized: no subject in token");
  }
  return payload;
}
