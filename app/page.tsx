import { EditionYearGroup } from "@/components/EditionYear";
import { getEditions } from "server/editions";

export default async function Page() {
  const editionData = await getEditions({
    filterListingEditions: true,
    includeIncomplete: false,
  });

  return (
    <>
      {editionData.length > 0 ? (
        editionData.map((data) => (
          <EditionYearGroup key={data.year} data={data} />
        ))
      ) : (
        <p className="text-muted">Ingen utgaver er registrert ennå.</p>
      )}
    </>
  );
}
