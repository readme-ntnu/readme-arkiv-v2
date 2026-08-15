"use client";

import { FC, useState } from "react";
import { LightSwitch } from "./LightSwitch";
import { ROUTES } from "../utils/routes";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/Firebase/client/firebase";
import { signOut } from "firebase/auth";
import {
  Avatar,
  Button,
  Dropdown,
  buttonVariants,
  cn,
  toast,
} from "@heroui/react";
import { ReadmeLogo } from "./ReadmeLogo";
import {
  Bars,
  Xmark,
  Magnifier,
  ArrowRightFromSquare,
  ArrowUpRightFromSquare,
  PersonGear,
  Person,
} from "@gravity-ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const NavBar: FC = () => {
  const [user, loading] = useAuthState(auth);

  const [isOpen, setIsOpen] = useState(false);

  const router = useRouter();

  const handleSignOut = () => {
    signOut(auth);
    router.push(ROUTES.HOME);
    toast.success("Du har logget ut!");
  };

  return (
    <nav className="py-5 px-5 md:px-10 flex justify-between items-center bg-background gap-5">
      <Link href={ROUTES.HOME}>
        <ReadmeLogo maxWidth={"190px"} />
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
        <Dropdown onOpenChange={setIsOpen} isOpen={isOpen}>
          <Button
            variant="tertiary"
            isIconOnly
            className="text-xs rounded-full"
          >
            {isOpen ? <Xmark /> : <Bars />}
          </Button>
          <Dropdown.Popover placement={"bottom right"}>
            {!loading && user ? (
              <div className="px-3 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <Avatar size="sm" color="accent" variant="soft">
                    {user.photoURL && (
                      <Avatar.Image alt="Jane" src={user.photoURL} />
                    )}
                    <Avatar.Fallback delayMs={600}>
                      <Person />
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="flex flex-col gap-0">
                    <p className="text-sm leading-5 font-medium">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-xs leading-none text-muted">
                      {user.email}
                    </p>
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
              ></Dropdown.Item>
              <Dropdown.Item
                textValue="Abakus.no"
                id="abakus"
                href={"https://abakus.no/"}
                render={({ ref, className: herouiClass }) => (
                  <Link
                    ref={ref as React.Ref<HTMLAnchorElement>}
                    href={"https://abakus.no/"}
                    className={cn(
                      herouiClass,
                      "menu-item flex justify-between px-[10px]",
                    )}
                  >
                    Abakus.no
                    <ArrowUpRightFromSquare className="text-muted" />
                  </Link>
                )}
              ></Dropdown.Item>
              {!loading && user ? (
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
                  ></Dropdown.Item>
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
      </div>
    </nav>
  );
};
