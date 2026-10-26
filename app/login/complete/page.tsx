"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "lib/firebase/client";
import { Spinner } from "@heroui/react";
import { getSafeReturnTo, ROUTES } from "utils/routes";
import { syncFirebaseAuthTokenWithServiceWorker } from "client/authServiceWorker";

function CompleteLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

    if (!token) {
      router.replace(
        `${ROUTES.LOGIN_ERROR}?message=${encodeURIComponent("Mangler innloggingstoken. Prøv å logge inn på nytt.")}`,
      );
      return;
    }

    signInWithCustomToken(auth, token)
      .then((credential) =>
        syncFirebaseAuthTokenWithServiceWorker(credential.user),
      )
      .then(() => {
        router.replace(returnTo);
      })
      .catch((error) => {
        router.replace(
          `${ROUTES.LOGIN_ERROR}?message=${encodeURIComponent(error?.message ?? "Kunne ikke fullføre innlogging.")}`,
        );
        console.log(error);
      });
  }, [router, searchParams]);

  return <Spinner size="lg" />;
}

export default function Page() {
  return (
    <Suspense>
      <CompleteLoginContent />
    </Suspense>
  );
}
