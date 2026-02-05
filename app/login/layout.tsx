"use client";

import { auth } from "lib/Firebase/firebase";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { ROUTES } from "utils/routes";

export default function LoginLayout({ children }: { children: ReactNode }) {
  const [authUser, authLoading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && authUser) {
      router.push(ROUTES.ADMIN);
    }
  }, [authUser, authLoading, router]);

  return <>{children}</>;
}
