"use client";

import { Suspense } from "react";
import Image from "next/image";
import redaktør from "../../../public/images/redaktør.png";
import { ROUTES } from "utils/routes";
import { useSearchParams } from "next/navigation";
import { readmeIfy } from "@/components/ReadmeLogo";
import Link from "next/link";
import { buttonVariants, cn } from "@heroui/react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  return (
    <div className="flex flex-col items-center gap-3">
      <Image src={redaktør} alt="Forvirret redaktør" />
      <h1 className="text-2xl font-bold text-default-foreground">
        Oups! Kunne ikke logge inn.
      </h1>
      <p>
        {readmeIfy(
          message ||
            "Ta kontakt med kontakt ansvarlig utvikler dersom problemet vedvarer.",
        )}
      </p>
      <div className="h-4" />
      <Link
        href={ROUTES.HOME}
        className={cn("rounded-full", buttonVariants({ variant: "primary" }))}
      >
        Gå til forsiden
      </Link>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
