import { connectSearchBox } from "react-instantsearch-dom";
import { SearchBoxProvided } from "react-instantsearch-core";
import { FC } from "react";
import { Input, SearchField } from "@heroui/react";
import { Magnifier } from "@gravity-ui/icons";

// Component is hydration un-safe since theme cannot be known at build time
// We prevent component render until we've mounted the component on the client
const PlainSearchBox: FC<SearchBoxProvided> = ({
  currentRefinement,
  refine,
}) => {
  return (
    <SearchField
      name="search"
      className="max-w-[300px] w-full"
      value={currentRefinement}
      onChange={(value) => refine(value)}
      aria-label="Artikkel søk"
    >
      <SearchField.Group>
        <Magnifier className="ml-3" />
        <SearchField.Input
          className="w-[280px]"
          placeholder="Skriv for å søke ..."
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
};

export const SearchBox = connectSearchBox(PlainSearchBox);
