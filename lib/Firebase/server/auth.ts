import "server-only";

import { headers } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "./firebaseAdmin";

function getBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;

  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  if (scheme.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return null;
  }

  return token;
}

export async function getAuthenticatedUser(): Promise<DecodedIdToken | null> {
  const requestHeaders = await headers();
  const token = getBearerToken(requestHeaders.get("authorization"));

  if (!token) return null;

  try {
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}
