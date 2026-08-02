import { NextResponse } from "next/server";
import { API_ROUTES } from "./routes";
import { createHash, randomBytes } from "crypto";
import getBaseUrl from "./baseUrl";

export const LEGO_OAUTH_STATE_COOKIE = "lego_oauth_state";
export const LEGO_OAUTH_PKCE_COOKIE = "lego_oauth_pkce";

export const oauthCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: getBaseUrl() !== "http://localhost:3000",
  path: API_ROUTES.LEGO_CALLBACK,
};

export function createPkcePair() {
  // 32 random bytes encoded as base64url produces a valid 43-character verifier.
  const verifier = randomBytes(32).toString("base64url");

  const challenge = createHash("sha256")
    .update(verifier, "ascii")
    .digest("base64url");

  return { verifier, challenge };
}

export function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(LEGO_OAUTH_STATE_COOKIE, "", {
    ...oauthCookieOptions,
    maxAge: 0,
  });

  response.cookies.set(LEGO_OAUTH_PKCE_COOKIE, "", {
    ...oauthCookieOptions,
    maxAge: 0,
  });
}

export function isFirebaseAuthError(
  error: unknown,
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("auth/")
  );
}
