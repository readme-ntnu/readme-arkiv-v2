import Image from "next/image";
import { FC } from "react";
import { IEditionData } from "../lib/types";
import { ROUTES } from "../utils/routes";
import { Chip } from "@heroui/react";

export const EditionYear: FC<{ data: IEditionData }> = ({ data }) => {
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
            className="w-full h-auto hover:scale-108 transition-all duration-200 ease-in-out shadow-[0px_5px_30px_#888] dark:shadow-[0px_5px_30px_#444]"
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
