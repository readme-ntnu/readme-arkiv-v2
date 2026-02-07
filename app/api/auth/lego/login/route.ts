import { NextResponse } from "next/server";
import getBaseUrl from "utils/baseUrl";
import { API_ROUTES } from "utils/routes";

export async function GET() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LEGO_OAUTH_CLIENT_ID!,
    redirect_uri: getBaseUrl() + API_ROUTES.LEGO_CALLBACK,
    scope: "user",
    approval_prompt: "auto",
  });

  return NextResponse.redirect(
    `${process.env.LEGO_API_URL}/authorization/oauth2/authorize/?${params}`,
  );
}
