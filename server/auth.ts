import "server-only";

import { headers } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "../lib/firebase/admin";

function getBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;

  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  if (scheme.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return null;
  }

  return token;
}

export async function verifyAuthorizationHeader(
  authorization: string | null,
): Promise<DecodedIdToken | null> {
  const token = getBearerToken(authorization);
  if (!token) return null;

  try {
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export function isNonAnonymousUser(
  user: DecodedIdToken | null,
): user is DecodedIdToken {
  return (
    user !== null &&
    user.firebase?.sign_in_provider?.toLowerCase() !== "anonymous"
  );
}

export function isReadmeMember(
  user: DecodedIdToken | null,
): user is DecodedIdToken {
  return isNonAnonymousUser(user) && user.readmeMember === true;
}

const PRIVILEGED_ROLES = new Set(["leader", "co_leader", "webmaster", "admin"]);

export function isPrivilegedReadmeMember(
  user: DecodedIdToken | null,
): user is DecodedIdToken {
  console.log(user?.readmeRole);
  return (
    isReadmeMember(user) &&
    typeof user.readmeRole === "string" &&
    PRIVILEGED_ROLES.has(user.readmeRole)
  );
}

export async function getAuthenticatedUser(): Promise<DecodedIdToken | null> {
  const requestHeaders = await headers();
  return verifyAuthorizationHeader(requestHeaders.get("authorization"));
}
