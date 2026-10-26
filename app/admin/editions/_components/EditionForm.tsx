"use client";

import { FileInput } from "@/components/FileInput";
import {
  Alert,
  Button,
  buttonVariants,
  Checkbox,
  Description,
  FieldError,
  Form,
  Label,
  NumberField,
  ProgressBar,
} from "@heroui/react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as Yup from "yup";
import { addEditionMutation, setEditionPdfMutation } from "actions/editions";
import { uploadEditionFiles } from "client/editions";
import { isLargePdf, isPdfFile, PDF_VALIDATION_ERROR } from "utils/pdf";
import { ROUTES } from "utils/routes";
import { LargePdfWarning } from "./LargePdfWarning";

type EditionFormValues = {
  editionYear: number;
  editionNumber: number;
  originalPdf?: File;
  publicPdf?: File;
  useOriginalAsPublic: boolean;
  isListingEdition: boolean;
};

type SubmissionStatus = {
  stage: "idle" | "preparing" | "uploading" | "processing" | "error";
  progress: number;
  message?: string;
};

const pdfField = Yup.mixed<File>().test(
  "file-type",
  PDF_VALIDATION_ERROR,
  (value) => value == null || isPdfFile(value),
);

const validationSchema = Yup.object({
  editionYear: Yup.number()
    .integer("Året må være et heltall.")
    .lessThan(3000, "Vi er ikke blitt så gamle ennå. Året må være før 3000.")
    .moreThan(1998, "readme ble grunnlagt i 1999, så dette er for tidlig.")
    .required("Utgaveår må fylles ut."),
  editionNumber: Yup.number()
    .integer("Utgavenummeret må være et heltall.")
    .min(1, "Dette tallet må være høyere enn null.")
    .max(6, "Dette tallet kan ikke være høyere enn 6.")
    .required("Utgavenummer må fylles ut."),
  originalPdf: pdfField.required("Du må velge den originale PDF-en."),
  publicPdf: pdfField.when("useOriginalAsPublic", {
    is: false,
    then: pdfField.required(
      "Du må velge en offentlig PDF eller velge at originalen skal være tilgjengelig for alle.",
    ),
    otherwise: pdfField.optional(),
  }),
  useOriginalAsPublic: Yup.boolean().required(),
});

export default function EditionForm() {
  const router = useRouter();
  const [reservedEditionId, setReservedEditionId] = useState<string>();

  return (
    <Formik<EditionFormValues>
      validateOnMount
      validationSchema={validationSchema}
      initialValues={{
        editionYear: new Date().getFullYear(),
        editionNumber: 1,
        originalPdf: undefined,
        publicPdf: undefined,
        useOriginalAsPublic: false,
        isListingEdition: false,
      }}
      initialStatus={{ stage: "idle", progress: 0 } satisfies SubmissionStatus}
      onSubmit={async (values, { setStatus }) => {
        const editionId = `${values.editionYear}-${String(
          values.editionNumber,
        ).padStart(2, "0")}`;

        try {
          if (reservedEditionId !== editionId) {
            await addEditionMutation({
              id: editionId,
              isListingEdition: values.isListingEdition,
            });
            setReservedEditionId(editionId);
          }

          setStatus({
            stage: "preparing",
            progress: 0,
          } satisfies SubmissionStatus);

          const uploaded = await uploadEditionFiles(
            {
              editionId,
              originalFile: values.originalPdf,
              publicFile: values.publicPdf,
            },
            (progress) =>
              setStatus({
                stage: "uploading",
                progress,
              } satisfies SubmissionStatus),
          );

          if (!uploaded.originalPdfGeneration) {
            throw new Error("Opplastingen mangler originalens filgenerasjon.");
          }

          // Record the public PDF first so a partially completed dual upload
          // never makes the original anonymously accessible.
          if (uploaded.publicPdfGeneration) {
            await setEditionPdfMutation({
              id: editionId,
              version: "public",
              generation: uploaded.publicPdfGeneration,
            });
          }

          await setEditionPdfMutation({
            id: editionId,
            version: "original",
            generation: uploaded.originalPdfGeneration,
          });

          setStatus({
            stage: "processing",
            progress: 100,
          } satisfies SubmissionStatus);
          router.refresh();
        } catch (error) {
          router.refresh();
          setStatus({
            stage: "error",
            progress: 0,
            message:
              error instanceof Error
                ? error.message
                : "En ukjent feil oppstod under lagring.",
          } satisfies SubmissionStatus);
        }
      }}
    >
      {({
        errors,
        handleSubmit,
        isSubmitting,
        isValid,
        setFieldTouched,
        setFieldValue,
        status: rawStatus,
        touched,
        values,
      }) => {
        const status = rawStatus as SubmissionStatus;
        const processing = status.stage === "processing";
        const formDisabled = isSubmitting || processing;
        const editionIdentityIsLocked = reservedEditionId !== undefined;
        const editionId = `${values.editionYear}-${String(
          values.editionNumber,
        ).padStart(2, "0")}`;

        return (
          <Form
            className="flex w-full max-w-[600px] flex-col gap-5"
            onSubmit={handleSubmit}
            validationErrors={Object.fromEntries(
              Object.entries(errors)
                .filter(
                  ([key]) => touched[key as keyof typeof touched] === true,
                )
                .map(([key, value]) => [key, String(value)]),
            )}
          >
            <fieldset
              className="flex flex-col gap-3"
              disabled={formDisabled || editionIdentityIsLocked}
            >
              <legend className="mb-2 text-lg font-semibold">Utgave</legend>
              <div className="flex w-full items-start gap-5">
                <NumberField
                  name="editionYear"
                  value={values.editionYear}
                  onChange={(value) => setFieldValue("editionYear", value)}
                  onBlur={() => setFieldTouched("editionYear", true)}
                  formatOptions={{ useGrouping: false }}
                  isRequired
                  isDisabled={formDisabled || editionIdentityIsLocked}
                  className="flex-1"
                >
                  <Label>Utgaveår</Label>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                  <FieldError />
                </NumberField>
                <NumberField
                  name="editionNumber"
                  value={values.editionNumber}
                  onChange={(value) => setFieldValue("editionNumber", value)}
                  onBlur={() => setFieldTouched("editionNumber", true)}
                  formatOptions={{ useGrouping: false }}
                  isRequired
                  minValue={1}
                  maxValue={6}
                  isDisabled={formDisabled || editionIdentityIsLocked}
                  className="flex-1"
                >
                  <Label>Utgavenummer</Label>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                  <FieldError />
                </NumberField>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3" disabled={formDisabled}>
              <legend className="mb-2 text-lg font-semibold">
                PDF-versjoner
              </legend>
              <FileInput
                value={values.originalPdf}
                onChange={(file) => {
                  setFieldTouched("originalPdf", true);
                  setFieldValue("originalPdf", file);
                }}
                label="Original PDF"
                error={
                  touched.originalPdf && typeof errors.originalPdf === "string"
                }
                errorMessage={errors.originalPdf}
                isDisabled={formDisabled}
                acceptFormat="application/pdf,.pdf"
                isRequired
              />
              {isLargePdf(values.originalPdf) ? <LargePdfWarning /> : null}

              <Checkbox
                name="useOriginalAsPublic"
                isSelected={values.useOriginalAsPublic}
                onChange={(isSelected) => {
                  setFieldValue("useOriginalAsPublic", isSelected);
                  if (isSelected) {
                    setFieldValue("publicPdf", undefined, false);
                    setFieldTouched("publicPdf", false, false);
                  }
                }}
                isDisabled={formDisabled || editionIdentityIsLocked}
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  Bruk originalen som offentlig versjon
                </Checkbox.Content>
                <Description>
                  Velg dette dersom utgaven ikke trenger en egen offentlig PDF.
                  Originalen blir da tilgjengelig for alle, også brukere som
                  ikke er logget inn.
                </Description>
              </Checkbox>

              <FileInput
                value={values.publicPdf}
                onChange={(file) => {
                  setFieldTouched("publicPdf", true);
                  setFieldValue("publicPdf", file);
                }}
                label="Offentlig PDF"
                error={
                  touched.publicPdf && typeof errors.publicPdf === "string"
                }
                errorMessage={errors.publicPdf}
                isDisabled={formDisabled || values.useOriginalAsPublic}
                acceptFormat="application/pdf,.pdf"
                isRequired={!values.useOriginalAsPublic}
              />
              {isLargePdf(values.publicPdf) ? <LargePdfWarning /> : null}
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-lg font-semibold">Annet</legend>
              <Checkbox
                name="isListingEdition"
                onChange={(value) => setFieldValue("isListingEdition", value)}
                isSelected={values.isListingEdition}
                isDisabled={formDisabled || editionIdentityIsLocked}
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
            </fieldset>

            {isSubmitting &&
            (status.stage === "preparing" || status.stage === "uploading") ? (
              <ProgressBar
                className="mt-2 w-full"
                value={status.progress}
                isIndeterminate={status.stage === "preparing"}
              >
                <Label>
                  {status.stage === "preparing"
                    ? "Klargjør PDF-filer"
                    : "Laster opp PDF-filer"}
                </Label>
                {status.stage === "uploading" ? <ProgressBar.Output /> : null}
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            ) : null}

            {!processing ? (
              <Button
                type="submit"
                variant="primary"
                className="mt-2 w-full rounded-full"
                isDisabled={!isValid || isSubmitting}
              >
                Last opp utgave
              </Button>
            ) : null}

            {status.stage === "error" ? (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Kunne ikke lagre utgaven</Alert.Title>
                  <Alert.Description>
                    {status.message ?? "Vent litt og prøv igjen."}
                  </Alert.Description>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={ROUTES.EDITION_LIST}
                      className={buttonVariants({ variant: "tertiary" })}
                    >
                      Til utgaveoversikten
                    </Link>
                  </div>
                </Alert.Content>
              </Alert>
            ) : null}

            {processing ? (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Utgaven behandles</Alert.Title>
                  <Alert.Description>
                    Forsidebildet lages fremdeles. Det er trygt å forlate siden.
                  </Alert.Description>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={ROUTES.EDITION_LIST}
                      className={buttonVariants({ variant: "tertiary" })}
                    >
                      Til utgaveoversikten
                    </Link>
                  </div>
                </Alert.Content>
              </Alert>
            ) : null}
          </Form>
        );
      }}
    </Formik>
  );
}
