import PageHeader from "@/components/PageHeader";
import { getEdition } from "server/editions";
import { ROUTES } from "../../../../utils/routes";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import EditionDetails from "./EditionDetails";

export const metadata: Metadata = {
  title: "readme - utgave",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const edition = await getEdition(id);

  if (!edition) notFound();

  return (
    <div className="mx-auto flex w-full flex-col items-start gap-5">
      <PageHeader
        title={`Utgave ${edition.id}`}
        backButtonRoute={ROUTES.EDITION_LIST}
        disablePrefetch
      />
      <EditionDetails edition={edition} />
    </div>
  );
}
