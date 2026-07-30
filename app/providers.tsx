"use client";

import { Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toast.Provider />
      {children}
    </ThemeProvider>
  );
}
