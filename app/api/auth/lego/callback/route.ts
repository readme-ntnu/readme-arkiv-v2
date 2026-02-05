import { NextResponse } from "next/server";
import { auth } from "lib/Firebase/firebaseAdmin";
import { API_ROUTES, ROUTES } from "utils/routes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse("Missing code", { status: 400 });
  }

  // 1. Exchange code → access token
  const tokenRes = await fetch(
    `${process.env.LEGO_API_URL}/authorization/oauth2/token/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.LEGO_OAUTH_CLIENT_ID!,
        client_secret: process.env.LEGO_OAUTH_CLIENT_SECRET!,
        redirect_uri:
          process.env.NEXT_PUBLIC_BASE_URL + API_ROUTES.LEGO_CALLBACK,
        code,
      }),
    },
  );

  if (!tokenRes.ok) {
    return new NextResponse(`Token exchange failed: ${await tokenRes.text()}`, {
      status: tokenRes.status,
    });
  }

  const tokenData = await tokenRes.json();

  const { access_token } = tokenData;

  // 2. Fetch user info
  const userRes = await fetch(
    `${process.env.LEGO_API_URL}/api/v1/users/oauth2_userdata/`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  );

  if (!userRes.ok) {
    return new NextResponse(`User fetch failed: ${await userRes.text()}`, {
      status: userRes.status,
    });
  }

  const legoUser = await userRes.json();

  // 3. Create Firebase custom token

  const readmeMembership = legoUser.memberships.find(
    (m: any) => m.abakusGroup === 10,
  );

  if (!readmeMembership) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}${ROUTES.LOGIN_ERROR}?message=${encodeURIComponent("Man må være medlem av readme for å få tilgang")}`,
    );
  }

  const firebaseToken = await auth.createCustomToken(`lego:${legoUser.id}`, {
    username: legoUser.username,
    email: legoUser.email,
    name: legoUser.fullName,
    provider: "lego",
    readmeMember: !!readmeMembership,
    readmeRole: readmeMembership && readmeMembership.role,
  });

  // 4. Redirect back to app
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}${ROUTES.LOGIN_COMPLETE}?token=${firebaseToken}`,
  );
}
