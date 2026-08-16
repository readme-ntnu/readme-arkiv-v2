import { buttonVariants, cn } from "@heroui/styles";
import { Magnifier, Bars } from "@gravity-ui/icons";
import Link from "next/link";
import { Suspense } from "react";
import { getAuthenticatedUser } from "../../lib/Firebase/server/auth";
import { ROUTES } from "../../utils/routes";
import { LightSwitch } from "./LightSwitch";
import { NavBarMenu, type NavBarUser } from "./NavBarMenu";
import { ReadmeLogo } from "../ReadmeLogo";

async function AuthenticatedNavBarMenu() {
  const authenticatedUser = await getAuthenticatedUser();
  const user: NavBarUser | null = authenticatedUser
    ? {
        displayName: authenticatedUser.name ?? null,
        email: authenticatedUser.email ?? null,
        photoURL: authenticatedUser.picture ?? null,
      }
    : null;

  return <NavBarMenu initialUser={user} />;
}

export function NavBar() {
  return (
    <nav className="py-5 px-5 md:px-10 flex justify-between items-center bg-background gap-5">
      <Link href={ROUTES.HOME}>
        <ReadmeLogo maxWidth="190px" />
      </Link>
      <div className="flex gap-2">
        <Link
          className={cn(
            "text-xs hidden md:flex rounded-full",
            buttonVariants({ variant: "primary" }),
          )}
          href={ROUTES.SEARCH}
        >
          SØK
          <Magnifier />
        </Link>
        <LightSwitch />
        <Suspense
          fallback={
            <div
              className={cn(
                buttonVariants({ isIconOnly: true, variant: "tertiary" }),
              )}
              aria-hidden="true"
            >
              <Bars />
            </div>
          }
        >
          <AuthenticatedNavBarMenu />
        </Suspense>
      </div>
    </nav>
  );
}
