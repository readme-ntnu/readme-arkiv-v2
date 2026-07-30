"use client";

import { buttonVariants, cn } from "@heroui/react";
import { ROUTES } from "../../../../utils/routes";
import PageHeader from "@/components/PageHeader";
import { Plus } from "@gravity-ui/icons";
import Link from "next/link";

export default function ArticlesHeading() {
  return (
    <PageHeader
      title="Artikler"
      endContent={
        <Link
          className={cn("rounded-full", buttonVariants({ size: "sm" }))}
          href={ROUTES.NEW_ARTICLE}
        >
          <Plus />
          Ny artikkel
        </Link>
      }
    />
  );
}
