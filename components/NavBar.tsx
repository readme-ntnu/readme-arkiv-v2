"use client";

import { FC, useState } from "react";
import { LightSwitch } from "./LightSwitch";
import { ROUTES } from "../utils/routes";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/Firebase/firebase";
import { signOut } from "firebase/auth";
import { Avatar, Button, Dropdown, buttonVariants, cn } from "@heroui/react";
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

export const NavBar: FC = () => {
  const [user, loading] = useAuthState(auth);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="py-5 px-5 md:px-10 flex justify-between items-center bg-background">
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
            <Dropdown.Menu>
              <Dropdown.Item key="search">
                <Link
                  href={ROUTES.SEARCH}
                  className="text-foreground flex w-full items-center justify-between gap-2"
                >
                  Artikkelsøk
                  <Magnifier className="text-muted" />
                </Link>
              </Dropdown.Item>
              <Dropdown.Item key="abakus">
                <Link
                  href="https://abakus.no/"
                  className="text-foreground flex w-full items-center justify-between gap-2"
                >
                  Abakus.no
                  <ArrowUpRightFromSquare className="text-muted" />
                </Link>
              </Dropdown.Item>
              {!loading && user ? (
                <>
                  <Dropdown.Item key="edition_list">
                    <Link
                      href={ROUTES.ADMIN}
                      className="text-foreground flex w-full items-center justify-between gap-2"
                    >
                      Admin
                      <PersonGear className="text-muted" />
                    </Link>
                  </Dropdown.Item>
                  <Dropdown.Item
                    key="logout"
                    className="text-danger flex w-full items-center justify-between gap-2"
                    onPress={() => signOut(auth)}
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
