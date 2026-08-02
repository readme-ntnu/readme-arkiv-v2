import Image from "next/image";
import { FC, useMemo } from "react";
import { IEditionData } from "../lib/types";
import { ROUTES } from "../utils/routes";
import { Chip, Typography } from "@heroui/react";

export const EditionYear: FC<{ data: IEditionData }> = ({ data }) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,200px)] gap-[40px] max-w-[calc(3*200px+2*40px)] w-full justify-center not-last:mb-10">
      <Chip
        variant="tertiary"
        size="lg"
        className="text-lg text-muted font-medium col-span-full mb-[-20px] border-1 border-separator transition-transform duration-150
  hover:-translate-y-0.5 font-[OCRAExtended]"
      >
        {data.year}
      </Chip>
      {data.editions.map((edition) => (
        <a
          key={`${data.year}-${edition.edition}`}
          href={ROUTES.EDITION.replace(
            ":id",
            `${data.year}-${edition.edition}`,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className="hover:scale-110 transition-all duration-200 ease-in-out shadow-[0px_5px_30px_#888] dark:shadow-[0px_5px_30px_#444]"
            src={edition.imageUrl}
            height={setImageHeight(data.year, parseInt(edition.edition))}
            width={200}
            alt={`Forside på utgave ${data.year}-${edition.edition}`}
          />
        </a>
      ))}
    </div>
  );
};

function setImageHeight(year: number, edition: number) {
  if (year >= 2018) {
    return 245;
  } else if (year > 2014 || (year === 2014 && edition > 1)) {
    return 253.5;
  } else {
    return 291.5;
  }
}
