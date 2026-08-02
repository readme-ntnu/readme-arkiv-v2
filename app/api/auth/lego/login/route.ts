import { NextResponse } from "next/server";
import getBaseUrl from "utils/baseUrl";
import { API_ROUTES } from "utils/routes";
import {
  createPkcePair,
  LEGO_OAUTH_PKCE_COOKIE,
  LEGO_OAUTH_STATE_COOKIE,
  oauthCookieOptions,
} from "../../../../../utils/oauth";

export async function GET() {
  const state = crypto.randomUUID();
  const { verifier, challenge } = createPkcePair();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LEGO_OAUTH_CLIENT_ID!,
    redirect_uri: getBaseUrl() + API_ROUTES.LEGO_CALLBACK,
    scope: "user",
    approval_prompt: "auto",
    state,

    // PKCE parameters:
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const response = NextResponse.redirect(
    `${process.env.LEGO_API_URL}/authorization/oauth2/authorize/?${params}`,
  );

  response.cookies.set(LEGO_OAUTH_STATE_COOKIE, state, {
    ...oauthCookieOptions,
    maxAge: 10 * 60,
  });

  response.cookies.set(LEGO_OAUTH_PKCE_COOKIE, verifier, {
    ...oauthCookieOptions,
    maxAge: 10 * 60,
  });

  return response;
}
