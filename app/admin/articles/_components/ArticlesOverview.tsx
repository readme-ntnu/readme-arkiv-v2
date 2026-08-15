"use client";

import {
  AlertDialog,
  Button,
  buttonVariants,
  Chip,
  cn,
  Pagination,
  Spinner,
  Table,
  toast,
  Tooltip,
  useOverlayState,
} from "@heroui/react";
import { useState } from "react";
import { ROUTES } from "../../../../utils/routes";
import {
  deleteArticle,
  getPageNumber,
} from "../../../../lib/Firebase/client/api";
import { IArticle } from "../../../../lib/types";
import { useArticleList } from "../../../../lib/Firebase/client/hooks";
import { ArrowUpRightFromSquare, Pencil, TrashBin } from "@gravity-ui/icons";
import Link from "next/link";

export default function ArticleOverview() {
  const [data, loading, error, pageNum, nextPage, prevPage] = useArticleList();

  const [deleteModalActiveArticle, setDeleteModalActiveArticle] = useState<
    IArticle | undefined
  >();
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const deleteModalState = useOverlayState();

  const handleDeleteActiveArticle = () => {
    setIsDeleteLoading(true);
    deleteModalActiveArticle &&
      deleteArticle(deleteModalActiveArticle.id).then(() => {
        deleteModalState.close();
        toast.success(
          <>
            Artikkelen <strong>{deleteModalActiveArticle.title}</strong> er
            slettet!
          </>,
        );
        setIsDeleteLoading(false);
        setDeleteModalActiveArticle(undefined);
      });
  };

  return (
    <>
      <Table className="w-full" variant="secondary">
        <Table.ScrollContainer>
          <Table.Content aria-label="Artikkel tabell">
            <Table.Header>
              <Table.Column isRowHeader key={"title"}>
                Tittel
              </Table.Column>
              <Table.Column key={"edition"} className="w-[100px]">
                Utgave
              </Table.Column>
              <Table.Column key={"author"} className="hidden md:table-cell">
                Forfatter
              </Table.Column>
              <Table.Column key={"layout"} className="hidden md:table-cell">
                Layout
              </Table.Column>
              <Table.Column key={"actions"} className="w-[50px] text-center">
                Handlinger
              </Table.Column>
            </Table.Header>
            <Table.Body items={data}>
              {(item) => (
                <Table.Row key={item.id}>
                  <Table.Cell>{item.title}</Table.Cell>
                  <Table.Cell>
                    <Chip color="accent" variant="soft" size="sm">
                      {item.edition}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className="hidden md:table-cell">
                    {item.author}
                  </Table.Cell>
                  <Table.Cell className="hidden md:table-cell">
                    {item.layout}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="relative flex items-center gap-[0px]">
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Link
                            href={
                              ROUTES.EDITION.replace(":id", item.edition) +
                              `#page=${getPageNumber(item)}`
                            }
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                isIconOnly: true,
                                size: "sm",
                              }),
                            )}
                          >
                            <ArrowUpRightFromSquare />
                          </Link>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          Åpne artikkel i utgave
                        </Tooltip.Content>
                      </Tooltip>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Link
                            href={ROUTES.EDIT_ARTICLE.replace(":id", item.id)}
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                isIconOnly: true,
                                size: "sm",
                              }),
                            )}
                          >
                            <Pencil />
                          </Link>
                        </Tooltip.Trigger>
                        <Tooltip.Content>Rediger artikkel</Tooltip.Content>
                      </Tooltip>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Button
                            isIconOnly
                            variant="ghost"
                            size="sm"
                            onPress={() => {
                              setDeleteModalActiveArticle(item);
                              deleteModalState.open();
                            }}
                            className="rounded-full ml-1 text-danger"
                          >
                            <TrashBin />
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>Slett artikkel</Tooltip.Content>
                      </Tooltip>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        <Table.Footer>
          <Pagination className="w-full flex justify-center">
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={pageNum === 0}
                  onPress={prevPage}
                >
                  <Pagination.PreviousIcon />
                  <span>Prev</span>
                </Pagination.Previous>
              </Pagination.Item>
              <Pagination.Item>
                <Pagination.Next onPress={nextPage}>
                  <span>Next</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </Table.Footer>
      </Table>
      <AlertDialog.Backdrop
        isDismissable
        isOpen={deleteModalState.isOpen}
        onOpenChange={deleteModalState.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Slett artikkel</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <span>
                Er du sikker på at du vil slette artikkelen{" "}
                <strong>{deleteModalActiveArticle?.title}</strong>?
              </span>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" slot="close">
                Avbryt
              </Button>
              <Button
                variant="danger"
                onPress={handleDeleteActiveArticle}
                isPending={isDeleteLoading}
              >
                {isDeleteLoading ? (
                  <>
                    <Spinner color="current" />
                    Laster
                  </>
                ) : (
                  "Slett"
                )}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
