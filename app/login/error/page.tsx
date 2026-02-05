"use client";

import { Suspense } from "react";
import Image from "next/image";
import redaktør from "../../../public/images/redaktør.png";
import { Button, Link, Spacer, Spinner } from "@heroui/react";
import { ROUTES } from "utils/routes";
import { useSearchParams } from "next/navigation";
import { readmeIfy } from "@/components/ReadmeLogo";

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
      <Spacer />
      <Button as={Link} href={ROUTES.HOME} radius="full" color="primary">
        Gå til forsiden
      </Button>
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
