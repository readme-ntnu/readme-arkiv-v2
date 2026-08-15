"use client";

import { Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { ensureFirebaseAuthServiceWorker } from "../lib/Firebase/firebaseAuthServiceWorkerClient";

// Service worker to bridge authenticated state between the client and the server
export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureFirebaseAuthServiceWorker().catch((error) => {
      console.error(
        "Could not register the Firebase Auth service worker",
        error,
      );
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toast.Provider />
      {children}
    </ThemeProvider>
  );
}
