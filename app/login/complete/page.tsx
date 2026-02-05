"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "lib/Firebase/firebase";
import { Spinner } from "@heroui/react";
import { ROUTES } from "utils/routes";

function CompleteLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) return;

    signInWithCustomToken(auth, token)
      .then(() => {
        router.replace(ROUTES.ADMIN);
      })
      .catch((error) => {
        router.replace(ROUTES.LOGIN_ERROR);
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
