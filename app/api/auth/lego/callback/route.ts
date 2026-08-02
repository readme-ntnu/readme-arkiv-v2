import { NextRequest, NextResponse } from "next/server";
import { auth } from "lib/Firebase/firebaseAdmin";
import { API_ROUTES, ROUTES } from "utils/routes";
import getBaseUrl from "utils/baseUrl";
import {
  clearOAuthCookies,
  isFirebaseAuthError,
  LEGO_OAUTH_PKCE_COOKIE,
  LEGO_OAUTH_STATE_COOKIE,
} from "../../../../../utils/oauth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const storedState = request.cookies.get(LEGO_OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(LEGO_OAUTH_PKCE_COOKIE)?.value;

  if (!code) {
    const response = new NextResponse("Missing code", { status: 400 });
    clearOAuthCookies(response);
    return response;
  }

  if (
    !returnedState ||
    !storedState ||
    returnedState !== storedState ||
    !codeVerifier
  ) {
    const response = new NextResponse("Invalid OAuth transaction", {
      status: 400,
    });

    clearOAuthCookies(response);
    return response;
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
        redirect_uri: getBaseUrl() + API_ROUTES.LEGO_CALLBACK,
        code,
        code_verifier: codeVerifier,
      }),
    },
  );

  if (!tokenRes.ok) {
    const response = new NextResponse(
      `Token exchange failed: ${await tokenRes.text()}`,
      {
        status: tokenRes.status,
      },
    );
    clearOAuthCookies(response);
    return response;
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
    const response = new NextResponse(
      `User fetch failed: ${await userRes.text()}`,
      {
        status: userRes.status,
      },
    );
    clearOAuthCookies(response);
    return response;
  }

  const legoUser = await userRes.json();

  // 3. Check membership
  const readmeMembership = legoUser.memberships.find(
    (m: any) => m.abakusGroup === 10,
  );

  if (!readmeMembership) {
    const response = NextResponse.redirect(
      `${getBaseUrl()}${ROUTES.LOGIN_ERROR}?message=${encodeURIComponent("Man må være medlem av readme for å få tilgang")}`,
    );
    clearOAuthCookies(response);
    return response;
  }

  const uid = `lego:${legoUser.id}`;

  // 4. Ensure Firebase user exists, and update if necessary
  try {
    const firebaseUser = await auth.getUser(uid);

    if (
      firebaseUser.email !== legoUser.email ||
      firebaseUser.displayName !== legoUser.fullName ||
      firebaseUser.photoURL !== legoUser.profilePicture
    ) {
      await auth.updateUser(uid, {
        email: legoUser.email,
        displayName: legoUser.fullName,
        photoURL: legoUser.profilePicture,
      });
    }
  } catch (error: unknown) {
    if (isFirebaseAuthError(error) && error.code === "auth/user-not-found") {
      await auth.createUser({
        uid,
        email: legoUser.email,
        displayName: legoUser.fullName,
        photoURL: legoUser.profilePicture,
      });
    } else {
      throw error;
    }
  }

  // 5. Create Firebase custom token
  const firebaseToken = await auth.createCustomToken(uid, {
    provider: "lego",
    readmeMember: !!readmeMembership,
    readmeRole: readmeMembership && readmeMembership.role,
  });

  // 4. Redirect back to app
  const response = NextResponse.redirect(
    `${getBaseUrl()}${ROUTES.LOGIN_COMPLETE}?token=${firebaseToken}`,
  );
  clearOAuthCookies(response);
  return response;
}
