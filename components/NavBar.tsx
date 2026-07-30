"use client";

import { FC, useState } from "react";
import { LightSwitch } from "./LightSwitch";
import { ROUTES } from "../utils/routes";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/Firebase/firebase";
import { signOut } from "firebase/auth";
import { Button, Dropdown, Separator, buttonVariants, cn } from "@heroui/react";
import { ReadmeLogo } from "./ReadmeLogo";
import {
  Bars,
  Xmark,
  Magnifier,
  ArrowRightFromSquare,
  ArrowUpRightFromSquare,
  PersonGear,
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
            <Dropdown.Menu>
              <Dropdown.Item key="search" className="text-foreground">
                <Magnifier />
                <Link href={ROUTES.SEARCH}>Artikkelsøk</Link>
              </Dropdown.Item>
              <Dropdown.Item
                // showDivider={!loading && !!user}
                key="abakus"
                className="text-foreground"
                href="https://abakus.no/"
              >
                <ArrowUpRightFromSquare />
                Abakus.no
              </Dropdown.Item>
              {!loading && user ? (
                <>
                  <Separator />
                  <Dropdown.Item
                    key="edition_list"
                    className="text-foreground"
                    href={ROUTES.ADMIN}
                  >
                    <PersonGear />
                    Admin
                  </Dropdown.Item>
                  <Dropdown.Item
                    key="logout"
                    className="text-danger"
                    onPress={() => signOut(auth)}
                  >
                    <ArrowRightFromSquare />
                    Log ut
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
