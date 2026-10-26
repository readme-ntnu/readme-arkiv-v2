import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isValidEditionId } from "utils/editions";
import { EditionViewer } from "./EditionViewer";

type EditionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: Pick<EditionPageProps, "params">): Promise<Metadata> {
  const { id } = await params;
  return { title: isValidEditionId(id) ? id : "readme - utgave" };
}

async function EditionRoute({ params, searchParams }: EditionPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isValidEditionId(id)) notFound();

  return (
    <EditionViewer
      editionId={id}
      requestedVersion={
        typeof query.version === "string" ? query.version : "auto"
      }
    />
  );
}

export default function EditionPage(props: EditionPageProps) {
  return (
    <Suspense>
      <EditionRoute {...props} />
    </Suspense>
  );
}
