"use client";

import {
  AlertDialog,
  Button,
  buttonVariants,
  Card,
  cn,
  Spinner,
  toast,
  Tooltip,
  useOverlayState,
} from "@heroui/react";
import { FC, useState } from "react";
import { deleteEdition } from "../../../../lib/Firebase/client/api";
import { IEdition, IEditionData } from "../../../../lib/types";
import React from "react";
import { ArrowUpRightFromSquare, TrashBin } from "@gravity-ui/icons";
import { updateEditionsCache } from "lib/Firebase/server/actions";
import { ROUTES } from "utils/routes";

const EditionsOverview: FC<{ editionData: IEditionData[] }> = ({
  editionData,
}) => {
  const overlayState = useOverlayState();
  const [selectedEdition, setSelectedEdition] = useState<string | undefined>();
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const handleOpenDeleteModal = (edition: string) => {
    setSelectedEdition(edition);
    overlayState.open();
  };

  const handleDeleteEdition = (edition: string) => {
    setIsDeleteLoading(true);
    deleteEdition(edition)
      .then(updateEditionsCache)
      .then(() => {
        setIsDeleteLoading(false);
        overlayState.close();
        toast.success(
          <>
            Utgave <strong>{edition}</strong> er slettet!
          </>,
        );
      })
      .catch((error) => {
        setIsDeleteLoading(false);
        overlayState.close();
        toast.danger(
          <>
            Kunne ikke slette <strong>utgave {edition}</strong>! Kun redaktør,
            nestleder og webansvarlig har tilgang til å slette utgaver. Ta
            kontakt med webansvarlig dersom du mener noe er feil.
          </>,
        );
      });
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,_1fr))] w-full gap-3">
        {editionData.map((year, i) => (
          <React.Fragment key={year.year}>
            <h2 className="text-xl font-bold px-1 col-span-full mt-2">
              {year.year}
            </h2>
            {year.editions.map((edition) => (
              <EditionCard
                key={`${year.year}-${edition.edition}`}
                year={year.year}
                edition={edition}
                onDeletePressed={() => {
                  handleOpenDeleteModal(`${year.year}-${edition.edition}`);
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <AlertDialog.Backdrop
        isOpen={overlayState.isOpen}
        onOpenChange={overlayState.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Slett utgave?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                Er du sikker på at du vil slette{" "}
                <strong>utgave {selectedEdition}?</strong>
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Avbryt
              </Button>
              <Button
                variant="danger"
                onPress={() => {
                  selectedEdition && handleDeleteEdition(selectedEdition);
                }}
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
};

const EditionCard: FC<{
  year: number;
  edition: IEdition;
  onDeletePressed: () => void;
}> = ({ year, edition, onDeletePressed }) => (
  <Card className="overflow-hidden rounded-xl">
    <Card.Content className="flex flex-row gap-[20px] items-center">
      <img
        src={edition.imageUrl}
        alt={`Utgave ${edition.edition}`}
        width={50}
        className="rounded-none"
      />
      <span className="font-bold grow">{`Utgave ${edition.edition}`}</span>
      <div className="flex gap-[10px] m-2">
        <Tooltip delay={1000}>
          <Tooltip.Trigger>
            <a
              href={ROUTES.EDITION.replace(":id", `${year}-${edition.edition}`)}
              className={cn(
                buttonVariants({
                  variant: "tertiary",
                  isIconOnly: true,
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowUpRightFromSquare />
            </a>
          </Tooltip.Trigger>
          <Tooltip.Content>Åpne opp i ny fane</Tooltip.Content>
        </Tooltip>
        <Tooltip delay={1000}>
          <Tooltip.Trigger>
            <Button variant="danger" isIconOnly onPress={onDeletePressed}>
              <TrashBin />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Slett utgave</Tooltip.Content>
        </Tooltip>
      </div>
    </Card.Content>
  </Card>
);

export default EditionsOverview;
