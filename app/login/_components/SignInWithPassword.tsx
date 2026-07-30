"use client";

import { cn, linkVariants } from "@heroui/react";
import Link from "next/link";
import { ROUTES } from "utils/routes";

export default function SignInWithLego() {
  return (
    <Link
      className={cn(
        "w-full rounded-full text-sm justify-center",
        linkVariants().base(),
      )}
      href={ROUTES.LOGIN_WITH_PASSWORD}
    >
      Fortsett med brukernavn og passord
    </Link>
  );
}
