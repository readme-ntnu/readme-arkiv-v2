"use client";

import { Link } from "@heroui/react";
import { ROUTES } from "utils/routes";

export default function SignInWithLego() {
  return (
    <Link
      color="foreground"
      underline="hover"
      size="sm"
      href={ROUTES.LOGIN_WITH_PASSWORD}
    >
      Fortsett med brukernavn og passord
    </Link>
  );
}
