"use client";

import { FileInput } from "@/components/FileInput";
import {
  ArrowUpRightFromSquare,
  ChevronDown,
  FileQuestion,
  Globe,
  Lock,
  Pencil,
  Picture,
  Plus,
  TrashBin,
  FileExclamation,
} from "@gravity-ui/icons";
import {
  AlertDialog,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Chip,
  Description,
  Dropdown,
  Label,
  Modal,
  ProgressBar,
  Spinner,
  toast,
  Tooltip,
} from "@heroui/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  deleteEditionMutation,
  deletePublicPdfMutation,
  setEditionPdfMutation,
  setEditionListingMutation,
  verifyEditionFilesMutation,
} from "actions/editions";
import { uploadEditionFiles } from "client/editions";
import type {
  EditionPdfVersion,
  IEdition,
  IEditionFileDescriptor,
} from "types/editions";
import {
  formatFileSize,
  isLargePdf,
  isPdfFile,
  PDF_VALIDATION_ERROR,
} from "utils/pdf";
import { getEditionRoute, ROUTES } from "utils/routes";
import { LargePdfWarning } from "../_components/LargePdfWarning";
import { isFaultyEditionFileStatus } from "utils/editions";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "En ukjent feil oppstod. Prøv igjen.";
}

function getFileStatus(
  descriptor: IEditionFileDescriptor,
  access: "public" | "authenticated",
): {
  color: "danger" | "warning" | "success" | "accent";
  icon: ReactNode;
  label: string;
  description: string;
} {
  if (descriptor.status === "missing")
    return {
      color: "danger" as const,
      icon: <FileQuestion width={12} aria-hidden="true" />,
      label: "Finner ikke PDF",
      description:
        "En PDF er registrert for denne utgaven, men den tilhørende filen finnes ikke lenger i Storage. Last opp PDF-en på nytt for å gjenopprette den.",
    };

  if (descriptor.status === "invalid")
    return {
      color: "danger" as const,
      icon: <FileExclamation width={12} aria-hidden="true" />,
      label: "PDF har feil",
      description:
        "PDF-en i Storage samsvarer ikke med den registrerte metadataene i Firestore. Last opp PDF-en på nytt for å oppdatere metadataen.",
    };

  if (access === "public")
    return {
      color: "success" as const,
      icon: <Globe width={12} aria-hidden="true" />,
      label: "Tilgjengelig for alle",
      description: "Denne PDF-en kan åpnes uten å logge inn.",
    };
  else
    return {
      color: "accent" as const,
      icon: <Lock width={12} aria-hidden="true" />,
      label: "Kun for innloggede",
      description: "Du må være innlogget for å åpne denne PDF-en.",
    };
}

function getThumbnailError(edition: IEdition) {
  if (edition.thumbnail?.status === "missing") {
    return "Forsidebildet er registrert, men filen finnes ikke lenger i Storage. Last opp original-PDF-en på nytt for å lage et nytt forsidebilde.";
  }

  if (edition.thumbnail?.status === "invalid") {
    return "Metadataen til forsidebildet er ygylidg. Last opp original-PDF-en på nytt for å lage et nytt forsidebilde.";
  }

  if (
    edition.originalPdf?.generation !== edition.thumbnail?.originalPdfGeneration
  ) {
    return "Forsidebildet er generert fra en annen fil enn den nåværende original-PDF-en. Last opp original-PDF-en på nytt for å lage et nytt forsidebilde.";
  }

  if (!edition.thumbnailUrl) {
    return "Forsidebildet er ikke klart ennå.";
  }

  return null;
}

export default function EditionDetails({ edition }: { edition: IEdition }) {
  const router = useRouter();
  const [activePdf, setActivePdf] = useState<EditionPdfVersion | null>(null);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [pdfError, setPdfError] = useState<string>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isPublicDeleteOpen, setIsPublicDeleteOpen] = useState(false);
  const [confirmPublicExposure, setConfirmPublicExposure] = useState(false);
  const [isRemovingPublicPdf, setIsRemovingPublicPdf] = useState(false);
  const [publicRemovalError, setPublicRemovalError] = useState<string>();
  const [pendingListingValue, setPendingListingValue] = useState<
    boolean | null
  >(null);
  const [isSavingListing, setIsSavingListing] = useState(false);
  const [listingError, setListingError] = useState<string>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const editionRoute = getEditionRoute(edition.id);

  useEffect(() => {
    let cancelled = false;

    // Etter at siden har lastet inn, vil det utføres en sjekk for å se at filene fremdeles eksisterer.
    // Dersom filene er ygyldige eller borte, oppdateres firebase record'en med en en "missing" eller "invalid" status.
    verifyEditionFilesMutation(edition.id)
      .then((changed) => {
        if (changed && !cancelled) router.refresh();
      })
      .catch((error) => {
        console.error(
          `Could not verify files for edition ${edition.id}`,
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [edition.id, router]);

  const resetPdfEditor = () => {
    setActivePdf(null);
    setSelectedFile(undefined);
    setPdfError(undefined);
    setUploadProgress(0);
    setIsPreparingPdf(false);
  };

  const openPdfEditor = (version: EditionPdfVersion) => {
    setSelectedFile(undefined);
    setPdfError(undefined);
    setUploadProgress(0);
    setIsPreparingPdf(false);
    setActivePdf(version);
  };

  const handlePdfOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isSavingPdf) resetPdfEditor();
  };

  const savePdf = async () => {
    if (!activePdf || !selectedFile) {
      setPdfError("Velg en PDF-fil før du lagrer.");
      return;
    }

    if (!isPdfFile(selectedFile)) {
      setPdfError(PDF_VALIDATION_ERROR);
      return;
    }

    setIsSavingPdf(true);
    setIsPreparingPdf(true);
    setPdfError(undefined);
    setUploadProgress(0);

    try {
      const uploaded = await uploadEditionFiles(
        {
          editionId: edition.id,
          originalFile: activePdf === "original" ? selectedFile : undefined,
          publicFile: activePdf === "public" ? selectedFile : undefined,
        },
        (progress) => {
          setIsPreparingPdf(false);
          setUploadProgress(progress);
        },
      );
      const generation =
        activePdf === "original"
          ? uploaded.originalPdfGeneration
          : uploaded.publicPdfGeneration;
      if (!generation) throw new Error("Opplastingen mangler filgenerasjon.");

      await setEditionPdfMutation({
        id: edition.id,
        version: activePdf,
        generation,
      });

      toast.success(
        activePdf === "original"
          ? "Original-PDF-en er oppdatert. Forsidebildet behandles."
          : "Den offentlige PDF-en er oppdatert.",
      );
      resetPdfEditor();
      router.refresh();
    } catch (error) {
      setPdfError(errorMessage(error));
    } finally {
      setIsPreparingPdf(false);
      setIsSavingPdf(false);
    }
  };

  const openPublicPdfRemoval = () => {
    setConfirmPublicExposure(false);
    setPublicRemovalError(undefined);
    setIsPublicDeleteOpen(true);
  };

  const removePublicPdf = async () => {
    if (!confirmPublicExposure) return;

    setIsRemovingPublicPdf(true);
    setPublicRemovalError(undefined);
    try {
      await deletePublicPdfMutation(edition.id);
      toast.success("Den offentlige PDF-en er fjernet.");
      setIsPublicDeleteOpen(false);
      setConfirmPublicExposure(false);
      router.refresh();
    } catch (error) {
      setPublicRemovalError(
        "Kunne ikke slette utgaven. Kontroller at du har tilgang, og prøv igjen.",
      );
    } finally {
      setIsRemovingPublicPdf(false);
    }
  };

  const confirmListingChange = async () => {
    if (pendingListingValue === null) return;

    setIsSavingListing(true);
    setListingError(undefined);
    try {
      await setEditionListingMutation({
        id: edition.id,
        isListingEdition: pendingListingValue,
      });
      toast.success("Listingløp-innstillingen er oppdatert.");
      setPendingListingValue(null);
      router.refresh();
    } catch (error) {
      setListingError(errorMessage(error));
    } finally {
      setIsSavingListing(false);
    }
  };

  const deleteEdition = async () => {
    setIsDeleting(true);
    setDeleteError(undefined);

    try {
      await deleteEditionMutation(edition.id);
      toast.success(`Utgave ${edition.id} er slettet.`);
      setIsDeleteDialogOpen(false);
      router.replace(ROUTES.EDITION_LIST);
    } catch {
      setDeleteError(
        "Kunne ikke slette utgaven. Kontroller at du har tilgang, og prøv igjen.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const activeDescriptor =
    activePdf === "original" ? edition.originalPdf : edition.publicPdf;
  const activePdfLabel = activePdf === "original" ? "original" : "offentlig";
  const thumbnailError = getThumbnailError(edition);

  return (
    <>
      <div className="grid w-full gap-5 md:grid-cols-[minmax(220px,350px)_1fr]">
        <Card className="overflow-hidden rounded-xl">
          <Card.Content className="flex sm:min-h-72 items-center justify-center bg-default-100 p-0">
            {!thumbnailError ? (
              <Image
                src={edition.thumbnailUrl!}
                alt={`Forside på utgave ${edition.id}`}
                width={620}
                height={760}
                className="h-auto w-[200px] md:w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 px-6 text-center text-default-500">
                <Picture width={28} height={28} aria-hidden="true" />
                <span>{thumbnailError}</span>
              </div>
            )}
          </Card.Content>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <PdfCard
            title="Original PDF"
            editionId={edition.id}
            descriptor={edition.originalPdf}
            version={"original"}
            href={`${editionRoute}?version=original`}
            onEdit={() => openPdfEditor("original")}
            access={edition.publicPdf ? "authenticated" : "public"}
          />
          <PdfCard
            title="Offentlig PDF"
            editionId={edition.id}
            descriptor={edition.publicPdf}
            version={"public"}
            href={`${editionRoute}?version=public`}
            onEdit={() => openPdfEditor("public")}
            onRemove={openPublicPdfRemoval}
            editDisabled={!edition.originalPdf}
            access="public"
          />

          <Card className="rounded-xl">
            <Card.Header>
              <Card.Title className="text-md font-semibold">Annet</Card.Title>
            </Card.Header>
            <Card.Content>
              <Checkbox
                isSelected={edition.isListingEdition}
                onChange={(value) => {
                  setListingError(undefined);
                  setPendingListingValue(value);
                }}
                isDisabled={isSavingListing}
                variant="secondary"
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  Listingløp-utgave
                </Checkbox.Content>
                <Description>
                  Marker om utgaven inneholder en eller flere artikler om
                  Listingløpet.
                </Description>
              </Checkbox>
            </Card.Content>
          </Card>
          <Card className="rounded-xl">
            <Card.Content className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <Card.Title className="text-md font-semibold">
                  Slett utgaven
                </Card.Title>
                <Card.Description>
                  Sletter PDF-versjonene, forsidebildet og utgaveoppføringen.
                </Card.Description>
              </div>
              <Button
                type="button"
                variant="danger"
                onPress={() => {
                  setDeleteError(undefined);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <TrashBin aria-hidden="true" />
                Slett utgave
              </Button>
            </Card.Content>
          </Card>
        </div>
      </div>

      <Modal.Backdrop
        isOpen={activePdf !== null}
        onOpenChange={handlePdfOpenChange}
        isDismissable={!isSavingPdf}
        isKeyboardDismissDisabled={isSavingPdf}
      >
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>
                {activeDescriptor ? "Erstatt" : "Legg til"} {activePdfLabel} PDF
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              {activeDescriptor ? (
                <p className="text-sm text-default-500">
                  Nåværende fil: {edition.id}
                  {activePdf === "public" ? "_public" : ""}.pdf ·{" "}
                  {formatFileSize(activeDescriptor.size)}
                </p>
              ) : null}

              <FileInput
                value={selectedFile}
                onChange={(file) => {
                  setSelectedFile(file);
                  setPdfError(undefined);
                }}
                label={activeDescriptor ? "Ny PDF" : undefined}
                error={!!pdfError}
                errorMessage={pdfError}
                isDisabled={isSavingPdf}
                acceptFormat="application/pdf,.pdf"
              />

              {isLargePdf(selectedFile) ? <LargePdfWarning /> : null}

              {isSavingPdf && selectedFile ? (
                <ProgressBar
                  value={uploadProgress}
                  isIndeterminate={isPreparingPdf}
                >
                  <Label>
                    {isPreparingPdf ? "Klargjør PDF" : "Laster opp PDF"}
                  </Label>
                  {!isPreparingPdf ? <ProgressBar.Output /> : null}
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                type="button"
                variant="tertiary"
                isDisabled={isSavingPdf}
              >
                Avbryt
              </Button>
              <Button
                type="button"
                variant="primary"
                onPress={savePdf}
                isDisabled={!selectedFile || isSavingPdf}
              >
                {isSavingPdf ? <Spinner color="current" /> : null}
                Lagre
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <AlertDialog.Backdrop
        isOpen={isPublicDeleteOpen}
        isDismissable={!isRemovingPublicPdf}
        isKeyboardDismissDisabled={isRemovingPublicPdf}
        onOpenChange={(isOpen) => {
          if (isRemovingPublicPdf) return;
          setIsPublicDeleteOpen(isOpen);
          if (!isOpen) {
            setConfirmPublicExposure(false);
            setPublicRemovalError(undefined);
          }
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog aria-describedby="remove-public-pdf-description">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>
                Fjern den offentlige PDF-en?
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p id="remove-public-pdf-description">
                Da blir originalen tilgjengelig for alle uten innlogging. Dette
                kan eksponere sensitivt innhold.
              </p>
              <Checkbox
                className="mt-4"
                isSelected={confirmPublicExposure}
                onChange={setConfirmPublicExposure}
                isDisabled={isRemovingPublicPdf}
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  Jeg forstår at originalen blir offentlig.
                </Checkbox.Content>
              </Checkbox>
              {publicRemovalError ? (
                <p className="mt-3 text-danger" role="alert">
                  {publicRemovalError}
                </p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
                isDisabled={isRemovingPublicPdf}
              >
                Avbryt
              </Button>
              <Button
                variant="danger"
                onPress={removePublicPdf}
                isDisabled={!confirmPublicExposure || isRemovingPublicPdf}
              >
                {isRemovingPublicPdf ? <Spinner color="current" /> : null}
                Fjern PDF
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>

      <AlertDialog.Backdrop
        isOpen={pendingListingValue !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isSavingListing) {
            setPendingListingValue(null);
            setListingError(undefined);
          }
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>
                {pendingListingValue
                  ? "Marker som listingløp-utgave?"
                  : "Fjern listingløp-markeringen?"}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                {pendingListingValue
                  ? "Utgaven markeres som en listingløp-utgave. Om den vises på forsiden styres av listingløp-innstillingen."
                  : "Utgaven blir en vanlig utgave og vises på forsiden."}
              </p>
              {listingError ? (
                <p className="mt-3 text-danger">{listingError}</p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
                isDisabled={isSavingListing}
              >
                Avbryt
              </Button>
              <Button
                variant="primary"
                onPress={confirmListingChange}
                isDisabled={isSavingListing}
              >
                {isSavingListing ? <Spinner color="current" /> : null}
                Bekreft
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>

      <AlertDialog.Backdrop
        isOpen={isDeleteDialogOpen}
        isDismissable={!isDeleting}
        isKeyboardDismissDisabled={isDeleting}
        onOpenChange={(isOpen) => {
          if (isDeleting) return;
          setIsDeleteDialogOpen(isOpen);
          if (!isOpen) setDeleteError(undefined);
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>
                Slett utgave {edition.id}?
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                Originalen, en eventuell offentlig PDF, forsidebildet og
                utgaveoppføringen slettes permanent. Handlingen kan ikke angres.
              </p>
              {deleteError ? (
                <p className="mt-3 text-danger">{deleteError}</p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={isDeleting}>
                Avbryt
              </Button>
              <Button
                variant="danger"
                onPress={deleteEdition}
                isDisabled={isDeleting}
              >
                {isDeleting ? <Spinner color="current" /> : null}
                Slett utgaven
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

function PdfActions({
  title,
  descriptor,
  href,
  onEdit,
  onRemove,
  editDisabled = false,
}: {
  title: string;
  descriptor: IEditionFileDescriptor | null;
  href: string;
  onEdit: () => void;
  onRemove?: () => void;
  editDisabled?: boolean;
}) {
  if (!descriptor)
    return (
      <Button
        type="button"
        variant="tertiary"
        onPress={onEdit}
        isDisabled={editDisabled}
      >
        <Plus />
        Legg til PDF
      </Button>
    );

  const needsReplacement = isFaultyEditionFileStatus(descriptor.status);

  return (
    <ButtonGroup className="text-sm md:text-base">
      <Button
        type="button"
        variant="tertiary"
        onPress={
          needsReplacement
            ? onEdit
            : () => window.open(href, "_blank", "noopener,noreferrer")
        }
        isDisabled={needsReplacement && editDisabled}
      >
        {needsReplacement ? (
          <Pencil />
        ) : (
          <ArrowUpRightFromSquare aria-hidden="true" />
        )}
        {needsReplacement ? "Erstatt PDF" : "Åpne PDF"}
      </Button>
      {(!needsReplacement || onRemove) && (
        <Dropdown>
          <Button
            variant="tertiary"
            isIconOnly
            aria-label={`Flere handlinger for ${title.toLowerCase()}`}
          >
            <ButtonGroup.Separator />
            <ChevronDown />
          </Button>
          <Dropdown.Popover className="max-w-[290px]" placement="bottom end">
            <Dropdown.Menu>
              {!needsReplacement && (
                <Dropdown.Item id="save-file" onAction={onEdit}>
                  <Pencil className="text-muted" />
                  <Label>Erstatt PDF</Label>
                </Dropdown.Item>
              )}
              {onRemove && (
                <Dropdown.Item
                  id="delete-file"
                  variant="danger"
                  onAction={onRemove}
                >
                  <TrashBin className="text-danger" />
                  <Label>Slett PDF</Label>
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      )}
    </ButtonGroup>
  );
}

function PdfCard({
  title,
  editionId,
  descriptor,
  version,
  href,
  onEdit,
  onRemove,
  access,
  editDisabled = false,
}: {
  title: string;
  editionId: string;
  descriptor: IEditionFileDescriptor | null;
  version: EditionPdfVersion;
  href: string;
  onEdit: () => void;
  onRemove?: () => void;
  access: "public" | "authenticated";
  editDisabled?: boolean;
}) {
  const status = descriptor ? getFileStatus(descriptor, access) : null;

  return (
    <Card className="rounded-xl">
      <Card.Content className="flex-row justify-between items-center gap-4 flex-wrap">
        <div>
          <Card.Title className="text-md font-semibold">{title}</Card.Title>
          <Card.Description>
            {descriptor
              ? `${editionId}${version === "public" ? "_public" : ""}.pdf · ${formatFileSize(descriptor.size)}`
              : "Ingen PDF er lastet opp."}
          </Card.Description>
          {status ? (
            <Tooltip key={status.label} delay={400}>
              <Tooltip.Trigger>
                <Chip
                  color={status.color}
                  variant="soft"
                  size="sm"
                  className="my-1"
                >
                  {status.icon}
                  <Chip.Label>{status.label}</Chip.Label>
                </Chip>
              </Tooltip.Trigger>
              <Tooltip.Content className="max-w-60 break-normal">
                {status.description}
              </Tooltip.Content>
            </Tooltip>
          ) : null}
        </div>
        <PdfActions
          title={title}
          descriptor={descriptor}
          href={href}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </Card.Content>
      {editDisabled ? (
        <Card.Footer>
          <Description>
            Last opp originalen før du legger til en offentlig PDF.
          </Description>
        </Card.Footer>
      ) : null}
    </Card>
  );
}
