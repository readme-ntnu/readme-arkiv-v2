import Image from "next/image";
import { FC } from "react";
import type { IEditionYearGroup } from "types/editions";
import { getEditionRoute, ROUTES } from "../utils/routes";
import { Chip } from "@heroui/react";
import Link from "next/link";

export const EditionYearGroup: FC<{ data: IEditionYearGroup }> = ({ data }) => {
  return (
    <div
      className="grid grid-cols-2 w-full justify-center not-last:mb-10 
                    gap-5 max-w-[360px] 
                    xs:grid-cols-[repeat(auto-fit,200px)] xs:max-w-[664px] xs:gap-8"
    >
      <Chip
        variant="tertiary"
        size="lg"
        className="text-lg text-muted font-medium col-span-full mb-[-5px] xs:mb-[-14px] border-1 border-separator transition-transform duration-150
  hover:-translate-y-0.5 font-[OCRAExtended]"
      >
        {data.year}
      </Chip>
      {data.editions.map((edition) => (
        <Link
          key={`${edition.id}`}
          href={getEditionRoute(edition.id)}
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
        >
          <Image
            className="w-full h-auto hover:scale-108 transition-all duration-200 ease-in-out shadow-[0px_5px_30px_#888] dark:shadow-[0px_5px_30px_#444]"
            src={edition.thumbnailUrl || ""}
            height={setImageHeight(data.year, edition.editionNumber)}
            width={200}
            alt={`Forside på utgave ${edition.id}`}
          />
        </Link>
      ))}
    </div>
  );
};

function setImageHeight(editionYear: number, editionNumber: number) {
  if (editionYear >= 2018) {
    return 245;
  } else if (
    editionYear > 2014 ||
    (editionYear === 2014 && editionNumber > 1)
  ) {
    return 253.5;
  } else {
    return 291.5;
  }
}
