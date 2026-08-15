"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "lib/Firebase/client/firebase";
import { Spinner } from "@heroui/react";
import { ROUTES } from "utils/routes";
import { syncFirebaseAuthTokenWithServiceWorker } from "../../../lib/Firebase/client/firebaseAuthServiceWorker";

function CompleteLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

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
        router.replace(ROUTES.ADMIN);
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
