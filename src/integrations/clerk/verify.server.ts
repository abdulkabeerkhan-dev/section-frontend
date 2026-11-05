// Server-only Clerk JWT verification.
// Verifies a Clerk session token against the instance JWKS (networkless after
// the first fetch). The issuer is read from the token and must be a Clerk host.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { decodeJwt } from "jose";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function isClerkIssuer(iss: string): boolean {
  try {
    const host = new URL(iss).host;
    return host.endsWith(".clerk.accounts.dev") || host.includes("clerk.");
  } catch {
    return false;
  }
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
