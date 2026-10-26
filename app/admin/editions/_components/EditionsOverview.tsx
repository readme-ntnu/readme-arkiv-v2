"use client";

import {
  ArrowUpRightFromSquare,
  EllipsisVertical,
  File,
  Files,
  EyeSlash,
  CircleInfo,
  FileQuestion,
  Picture,
  CloudArrowUpIn,
  FileExclamation,
} from "@gravity-ui/icons";
import {
  Button,
  Card,
  cardVariants,
  Chip,
  cn,
  Dropdown,
  Label,
  Skeleton,
  Tooltip,
} from "@heroui/react";
import Image from "next/image";
import { Fragment, type FC, type ReactNode } from "react";
import type { IEdition, IEditionYearGroup } from "types/editions";
import { getEditionRoute, ROUTES } from "../../../../utils/routes";
import Link from "next/link";
import { isFaultyEditionFileStatus } from "utils/editions";

const EditionsOverview: FC<{ editionData: IEditionYearGroup[] }> = ({
  editionData,
}) => {
  if (editionData.length === 0) {
    return (
      <Card className="rounded-xl">
        <Card.Content>
          <p className="text-default-500">Ingen utgaver er registrert ennå.</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <>
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,_1fr))] gap-3">
        {editionData.map((year) => (
          <Fragment key={year.year}>
            <h2 className="col-span-full mt-2 px-1 text-xl font-bold">
              {year.year}
            </h2>
            {year.editions.map((edition) => {
              const editionId = edition.id;
              return (
                <EditionCard
                  key={editionId}
                  editionId={editionId}
                  edition={edition}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </>
  );
};

const EditionStatusChips: FC<{ edition: IEdition }> = ({ edition }) => {
  const statuses = getStatuses(edition);

  return (
    <>
      {statuses.map((status) => (
        <Tooltip key={status.label} delay={400}>
          <Tooltip.Trigger>
            <Chip color={status.color} variant="soft" size="sm">
              {status.icon}
              <Chip.Label>{status.label}</Chip.Label>
            </Chip>
          </Tooltip.Trigger>
          <Tooltip.Content className="max-w-60 break-normal">
            {status.description}
          </Tooltip.Content>
        </Tooltip>
      ))}
    </>
  );
};

const EditionCard: FC<{
  editionId: string;
  edition: IEdition;
}> = ({ editionId, edition }) => {
  const editionRoute = getEditionRoute(editionId);
  const editionNumber = String(edition.editionNumber).padStart(2, "0");

  return (
    <Link
      className={cn(
        cardVariants().base(),
        "overflow-hidden rounded-xl hover:bg-surface-secondary justify-center",
      )}
      href={`${ROUTES.EDITION_LIST}/${editionId}`}
      prefetch={false}
    >
      <Card.Content className="flex flex-row items-center gap-4">
        {edition.thumbnailUrl &&
        edition.originalPdf?.generation ===
          edition.thumbnail?.originalPdfGeneration ? (
          <Image
            src={edition.thumbnailUrl}
            alt={`Forside på utgave ${edition.id}`}
            width={50}
            height={getThumbnailHeight(
              edition.editionYear,
              edition.editionNumber,
            )}
            className="h-auto rounded-none"
          />
        ) : (
          <div className="flex h-[61px] w-[50px] bg-surface-tertiary items-center justify-center rounded">
            <Picture />
          </div>
        )}

        <div className="min-w-0 grow">
          <span className="font-bold">Utgave {editionNumber}</span>
          <div className="mt-2 flex flex-wrap gap-1.5 gap-y-0.5">
            <EditionStatusChips edition={edition} />
            {edition.isListingEdition && edition.isHiddenInOverview && (
              <Tooltip delay={400}>
                <Tooltip.Trigger>
                  <Chip color="accent" variant="soft" size="sm">
                    <EyeSlash width={12} />
                    <Chip.Label>Skjult</Chip.Label>
                  </Chip>
                </Tooltip.Trigger>
                <Tooltip.Content className="break-normal max-w-70">
                  Denne listingløp-utgaven er skjult fra forsiden. Du kan endre
                  dette under «Innstillinger».
                </Tooltip.Content>
              </Tooltip>
            )}
          </div>
        </div>

        <Dropdown>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label={`Handlinger for utgave ${editionId}`}
          >
            <EllipsisVertical aria-hidden="true" />
          </Button>
          <Dropdown.Popover placement="bottom right">
            <Dropdown.Menu aria-label={`Handlinger for utgave ${editionId}`}>
              <Dropdown.Item
                id={`edit-${editionId}`}
                textValue="Rediger utgave"
                href={`${ROUTES.EDITION_LIST}/${editionId}`}
              >
                <CircleInfo aria-hidden="true" />
                <Label>Flere detaljer</Label>
              </Dropdown.Item>
              <Dropdown.Item
                id={`open-original-${editionId}`}
                textValue="Åpne original"
                href={`${editionRoute}?version=original`}
                target="_blank"
                rel="noopener noreferrer"
                isDisabled={
                  !edition.originalPdf ||
                  isFaultyEditionFileStatus(edition.originalPdf.status)
                }
              >
                <ArrowUpRightFromSquare aria-hidden="true" />
                <Label>Åpne original PDF</Label>
              </Dropdown.Item>
              {edition.publicPdf ? (
                <Dropdown.Item
                  id={`open-public-${editionId}`}
                  textValue="Åpne offentlig"
                  href={`${editionRoute}?version=public`}
                  target="_blank"
                  rel="noopener noreferrer"
                  isDisabled={isFaultyEditionFileStatus(
                    edition.publicPdf.status,
                  )}
                >
                  <ArrowUpRightFromSquare aria-hidden="true" />
                  <Label>Åpne offentlig PDF</Label>
                </Dropdown.Item>
              ) : null}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </Card.Content>
    </Link>
  );
};

const getThumbnailHeight = (editionYear: number, editionNumber: number) => {
  if (editionYear >= 2018) return 61;
  if (editionYear > 2014 || (editionYear === 2014 && editionNumber > 1)) {
    return 63;
  }
  return 73;
};

type EditionStatus = {
  color: "danger" | "warning" | "success";
  icon: ReactNode;
  label: string;
  description: string;
};

const getStatuses = (edition: IEdition): EditionStatus[] => {
  const { originalPdf, publicPdf, thumbnail } = edition;

  const statuses: EditionStatus[] = [];

  if (originalPdf?.status === "missing" || publicPdf?.status === "missing") {
    const both =
      originalPdf?.status === "missing" && publicPdf?.status === "missing";
    statuses.push({
      color: "danger",
      icon: <FileQuestion width={12} aria-hidden="true" />,
      label: `Finner ikke PDF${both ? "er" : ""}`,
      description: both
        ? `Både en original og en offentlig PDF er registrert for denne utgaven, men de tilhørende filene finnes ikke lenger i Storage. Last opp PDF-ene på nytt for å gjenopprette den.`
        : `En ${originalPdf?.status === "missing" ? "original" : "offentlig"} PDF er registrert for denne utgaven, men den tilhørende filen finnes ikke lenger i Storage. Last opp PDF-en på nytt for å gjenopprette den.`,
    });
  }

  if (originalPdf?.status === "invalid" || publicPdf?.status === "invalid") {
    const both =
      originalPdf?.status === "invalid" && publicPdf?.status === "invalid";
    statuses.push({
      color: "danger",
      icon: <FileExclamation width={12} aria-hidden="true" />,
      label: `PDF${both ? "er" : ""} har feil`,
      description: both
        ? `Både den originale og offentlige PDFen i Storage samsvarer ikke med de registrerte metadataene i Firestore. Last opp PDF-ene på nytt for å oppdatere metadataen.`
        : `Den ${originalPdf?.status === "invalid" ? "originale" : "offentlige"} PDFen i Storage samsvarer ikke med den registrerte metadataene i Firestore. Last opp PDF-en på nytt for å oppdatere metadataen.`,
    });
  }

  if (thumbnail?.status === "missing") {
    statuses.push({
      color: "danger",
      icon: <Picture width={12} aria-hidden="true" />,
      label: "Finner ikke forsidebilde",
      description:
        "Et forsidebilde er registrert for denne utgaven, men filen finnes ikke lenger i Storage. Last opp original-PDF-en på nytt for å lage et nytt forsidebilde.",
    });
  } else if (thumbnail?.status === "invalid") {
    statuses.push({
      color: "danger",
      icon: <Picture width={12} aria-hidden="true" />,
      label: "Forsidebilde har feil",
      description:
        "Metadataen til forsidebildet er ygylidg. Last opp original-PDF-en på nytt for å lage et nytt forsidebilde.",
    });
  }

  if (statuses.length > 0) return statuses;

  if (
    edition.originalPdf?.generation !== edition.thumbnail?.originalPdfGeneration
  ) {
    statuses.push({
      color: "danger",
      icon: <Picture width={12} aria-hidden="true" />,
      label: "Forsidebilde har feil",
      description:
        "Forsidebildet er generert fra en annen fil enn den nåværende original-PDF-en. Last opp original-PDF-en på nytt for å lage et nytt forsidebilde.",
    });
  }

  if (edition.publicPdf)
    return [
      {
        color: "success",
        icon: <Files width={12} aria-hidden="true" />,
        label: "To versjoner",
        description:
          "Utgaven finnes i to versjoner: en originalversjon for innloggede brukere og en offentlig versjon for alle.",
      },
    ];
  else
    return [
      {
        color: "warning",
        icon: <File width={12} aria-hidden="true" />,
        label: "Kun original",
        description:
          "Kun originalversjonen finnes, og den er tilgjengelig for alle.",
      },
    ];
};

export default EditionsOverview;
