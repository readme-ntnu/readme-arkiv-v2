"use client";

import {
  ArrowRightFromSquare,
  ArrowUpRightFromSquare,
  Bars,
  Magnifier,
  Person,
  PersonGear,
  Xmark,
} from "@gravity-ui/icons";
import { Avatar, Button, cn, Dropdown, toast } from "@heroui/react";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/Firebase/client/firebase";
import { ROUTES } from "../../utils/routes";

export type NavBarUser = {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export function NavBarMenu({
  initialUser,
}: {
  initialUser: NavBarUser | null;
}) {
  const [firebaseUser, authLoading] = useAuthState(auth);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const user = authLoading
    ? initialUser
    : firebaseUser
      ? {
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        }
      : null;

  const handleSignOut = async () => {
    await signOut(auth);
    setIsOpen(false);
    router.push(ROUTES.HOME);
    router.refresh();
    toast.success("Du har logget ut!");
  };

  return (
    <Dropdown onOpenChange={setIsOpen} isOpen={isOpen}>
      <Button
        variant="tertiary"
        isIconOnly
        className="text-xs rounded-full"
        aria-label={isOpen ? "Lukk meny" : "Åpne meny"}
      >
        {isOpen ? <Xmark /> : <Bars />}
      </Button>
      <Dropdown.Popover placement="bottom right">
        {user ? (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <Avatar size="sm" color="accent" variant="soft">
                {user.photoURL ? (
                  <Avatar.Image
                    alt={user.displayName ?? user.email ?? "Bruker"}
                    src={user.photoURL}
                  />
                ) : null}
                <Avatar.Fallback>
                  <Person />
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col gap-0">
                <p className="text-sm leading-5 font-medium">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs leading-none text-muted">{user.email}</p>
              </div>
            </div>
          </div>
        ) : null}
        <Dropdown.Menu onClick={() => setIsOpen(false)}>
          <Dropdown.Item
            textValue="Artikkelsøk"
            id="search"
            href={ROUTES.SEARCH}
            render={({ ref, className: herouiClass }) => (
              <Link
                ref={ref as React.Ref<HTMLAnchorElement>}
                href={ROUTES.SEARCH}
                className={cn(
                  herouiClass,
                  "menu-item flex justify-between px-[10px]",
                )}
              >
                Artikkelsøk
                <Magnifier className="text-muted" />
              </Link>
            )}
          />
          <Dropdown.Item
            textValue="Abakus.no"
            id="abakus"
            href="https://abakus.no/"
            render={({ ref, className: herouiClass }) => (
              <Link
                ref={ref as React.Ref<HTMLAnchorElement>}
                href="https://abakus.no/"
                className={cn(
                  herouiClass,
                  "menu-item flex justify-between px-[10px]",
                )}
              >
                Abakus.no
                <ArrowUpRightFromSquare className="text-muted" />
              </Link>
            )}
          />
          {user ? (
            <>
              <Dropdown.Item
                textValue="Admin"
                id="admin"
                href={ROUTES.ADMIN}
                render={({ ref, className: herouiClass }) => (
                  <Link
                    ref={ref as React.Ref<HTMLAnchorElement>}
                    href={ROUTES.ADMIN}
                    className={cn(
                      herouiClass,
                      "menu-item flex justify-between px-[10px]",
                    )}
                  >
                    Admin
                    <PersonGear className="text-muted" />
                  </Link>
                )}
              />
              <Dropdown.Item
                textValue="Log ut"
                id="logout"
                className="text-danger flex w-full items-center justify-between gap-2"
                onPress={handleSignOut}
              >
                Log ut
                <ArrowRightFromSquare />
              </Dropdown.Item>
            </>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
