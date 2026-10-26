import { buttonVariants, cn } from "@heroui/react";
import Image from "next/image";
import { addReturnTo, API_ROUTES } from "utils/routes";
import abakule from "public/images/abakule.svg";

export default function SignInWithLego({ returnTo }: { returnTo?: string }) {
  return (
    <a
      className={cn(
        "w-full rounded-full",
        buttonVariants({ variant: "tertiary", size: "lg" }),
      )}
      href={addReturnTo(API_ROUTES.LEGO_LOGIN, returnTo)}
    >
      <Image src={abakule} alt="Abakule" width={24} height={24} />
      Fortsett med Abakus
    </a>
  );
}
