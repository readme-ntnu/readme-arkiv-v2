"use client";

import { Button, Link } from "@heroui/react";
import Image from "next/image";
import { API_ROUTES } from "utils/routes";
import abakule from "public/images/abakule.svg";

export default function SignInWithLego() {
  return (
    <Button
      radius="full"
      size="lg"
      className="w-60"
      startContent={
        <Image src={abakule} alt="Abakule" width={24} height={24} />
      }
      as={"a"}
      href={API_ROUTES.LEGO_LOGIN}
    >
      Fortsett med Abakus
    </Button>
  );
}
