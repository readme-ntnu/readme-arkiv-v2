import EditionsOverview from "app/admin/editions/_components/EditionsOverview";
import { getEditions } from "server/editions";
import { Metadata } from "next";
import EditionsHeading from "./_components/EditionsHeading";

export const metadata: Metadata = {
  title: "readme - utgaver",
};

export default async function Page() {
  const editionData = await getEditions({ includeIncomplete: true });

  return (
    <div className="flex flex-col items-left gap-5 w-full">
      <EditionsHeading />
      <EditionsOverview editionData={editionData} />
    </div>
  );
}
