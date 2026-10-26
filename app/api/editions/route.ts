import { getEditions } from "server/editions";
import getBaseUrl from "utils/baseUrl";
import { getEditionRoute } from "utils/routes";

// Public API brukt for å vise readme på abakus.no (https://github.com/webkom/readme-as-a-function)
export async function GET() {
  const baseUrl = getBaseUrl();

  const editions = (
    await getEditions({ filterListingEditions: true, includeIncomplete: false })
  )
    .flatMap((year) => year.editions)
    .map((edition) => ({
      id: edition.id,
      editionNumber: edition.editionNumber,
      editionYear: edition.editionYear,
      thumbnailUrl: edition.thumbnailUrl,
      editionUrl: `${baseUrl}${getEditionRoute(edition.id)}`,
    }));

  return Response.json({ editions });
}
