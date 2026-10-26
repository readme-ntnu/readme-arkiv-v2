import { cn, linkVariants } from "@heroui/react";
import Link from "next/link";
import { addReturnTo, ROUTES } from "utils/routes";

export default function SignInWithPassword({
  returnTo,
}: {
  returnTo?: string;
}) {
  return (
    <Link
      className={cn(
        "w-full rounded-full text-sm justify-center",
        linkVariants().base(),
      )}
      href={addReturnTo(ROUTES.LOGIN_WITH_PASSWORD, returnTo)}
    >
      Fortsett med brukernavn og passord
    </Link>
  );
}
