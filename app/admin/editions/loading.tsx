"use client";

import { Spinner } from "@heroui/react";

export default function Loading() {
  return (
    <div className="flex flex-col gap-20">
      <h1 className="text-3xl font-bold text-default-foreground ">Utgaver</h1>
      <Spinner size="lg" className="m-auto" />
    </div>
  );
}
