import { NextResponse } from "next/server";
import { API_ROUTES } from "./routes";

export const LEGO_OAUTH_STATE_COOKIE = "lego_oauth_state";

export const oauthCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: API_ROUTES.LEGO_CALLBACK,
};

export function clearOAuthState(response: NextResponse) {
  response.cookies.set(LEGO_OAUTH_STATE_COOKIE, "", {
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
