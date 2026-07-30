import { FC } from "react";
import {
  connectInfiniteHits,
  connectStateResults,
  InfiniteHitsProvided,
  StateResultsProvided,
} from "react-instantsearch-core";
import { ROUTES } from "../../../utils/routes";
import {
  Button,
  Chip,
  cn,
  EmptyState,
  linkVariants,
  Spinner,
  Table,
  Tooltip,
  Typography,
} from "@heroui/react";
import { readmeIfy } from "@/components/ReadmeLogo";
import NextLink from "next/link";

// This is a temporary hack since the pages list isnt indexed in algolia
const getPageNumber = (url: string) => {
  return url.split("=").at(-1);
};

const SearchTableComponent: FC<InfiniteHitsProvided & StateResultsProvided> = ({
  hits,
  refineNext,
  hasMore,
  searchState,
  searching,
}) => {
  return (
    <>
      {searchState && searchState.query ? (
        <Table className="w-full" variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Søkeresultater">
              <Table.Header>
                <Table.Column>Utgave</Table.Column>
                <Table.Column isRowHeader>Tittel</Table.Column>
                <Table.Column>Forfatter</Table.Column>
                <Table.Column className="rounded-e-lg sm:rounded-none">
                  Layout
                </Table.Column>
                {/* <Table.Column className="hidden md:table-cell">
                  Spalte
                </Table.Column> */}
                <Table.Column className="hidden sm:table-cell">
                  Stikkord
                </Table.Column>
              </Table.Header>
              <Table.Body
                items={hits}
                renderEmptyState={() => (
                  <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                    <span className="text-sm text-muted">No results found</span>
                  </EmptyState>
                )}
              >
                {(item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <NextLink
                        className={cn(
                          "text-nowrap text-accent text-sm",
                          linkVariants().base(),
                        )}
                        href={
                          ROUTES.EDITION.replace(":id", item.edition) +
                          `#page=${getPageNumber(item.url)}`
                        }
                      >
                        {item.edition}
                      </NextLink>
                    </Table.Cell>
                    <Table.Cell className="font-bold">
                      {item.type && (
                        <Typography.Paragraph color="muted" size="xs">
                          {item.type}
                        </Typography.Paragraph>
                      )}
                      <Typography.Paragraph size="sm">
                        {readmeIfy(item.title)}
                      </Typography.Paragraph>
                    </Table.Cell>
                    <Table.Cell>{readmeIfy(item.author)}</Table.Cell>
                    <Table.Cell className="before:rounded-e-lg sm:before:rounded-none">
                      {readmeIfy(item.layout)}
                    </Table.Cell>
                    {/* <Table.Cell className="hidden md:table-cell">
                      {item.type}
                      </Table.Cell> */}
                    <Table.Cell className="hidden sm:table-cell">
                      <div className="flex gap-[5px] flex-wrap">
                        {(Array.isArray(item.tags)
                          ? item.tags
                          : [item.tags]
                        ).map(
                          (tag: string, i: number) =>
                            tag &&
                            tag.trim() && (
                              <Tooltip delay={0} key={i}>
                                <Tooltip.Trigger>
                                  <Chip
                                    color="accent"
                                    variant="soft"
                                    className="max-w-[100px]"
                                  >
                                    <span className="truncate">
                                      {readmeIfy(tag)}
                                    </span>
                                  </Chip>
                                </Tooltip.Trigger>
                                <Tooltip.Content className="bg-accent">
                                  {readmeIfy(tag)}
                                </Tooltip.Content>
                              </Tooltip>
                            ),
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          <Table.Footer>
            {hasMore && (
              <div className="flex w-full justify-center">
                <Button onPress={refineNext} isPending={searching}>
                  {searching ? (
                    <>
                      <Spinner color="current" /> Laster
                    </>
                  ) : (
                    "Vis mer"
                  )}
                </Button>
              </div>
            )}
          </Table.Footer>
        </Table>
      ) : null}
    </>
  );
};

export const SearchTable = connectInfiniteHits(
  connectStateResults(SearchTableComponent),
);
