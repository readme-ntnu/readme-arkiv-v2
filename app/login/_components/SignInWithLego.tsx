import { buttonVariants, cn } from "@heroui/react";
import Image from "next/image";
import { API_ROUTES } from "utils/routes";
import abakule from "public/images/abakule.svg";

export default function SignInWithLego() {
  return (
    <a
      className={cn(
        "w-full rounded-full",
        buttonVariants({ variant: "tertiary", size: "lg" }),
      )}
      href={API_ROUTES.LEGO_LOGIN}
    >
      <Image src={abakule} alt="Abakule" width={24} height={24} />
      Fortsett med Abakus
    </a>
  );
}
