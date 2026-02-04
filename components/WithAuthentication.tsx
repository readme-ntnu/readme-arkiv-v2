"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/Firebase/firebase";
import { ROUTES } from "../utils/routes";
import { Spinner } from "@heroui/react";

export const WithAuthentication = ({ children }: { children: ReactNode }) => {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(ROUTES.LOGIN);
    }
  }, [user, loading, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading || !user) return <Spinner size="lg" />;
  return <>{children}</>;
};
