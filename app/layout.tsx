import "../styles/globals.css";
import { Metadata } from "next";
import Providers from "./providers";
import { NavBar } from "@/components/navbar/NavBar";
import { Footer } from "@/components/Footer";
import { Favicon } from "@/components/Favicon";

export const metadata: Metadata = {
  title: "readme - arkiv",
  description: "Linjeforeningsmagasinet readme",
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: "zT-toL3jiKptOTl7fj9DhuMHiwe7WLJxxDPVn-T1MXw",
  },
  robots: "noindex",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Favicon />
      </head>
      <body>
        <Providers>
          <div className="relative min-h-screen">
            <NavBar />
            <main className="pt-5 px-5 md:px-10 pb-[100px] gap-[20px] flex flex-col items-center">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
