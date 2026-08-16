"use client";

import { NextPage } from "next";
import * as Yup from "yup";
import {
  INewEditionData,
  ISubmitEditionFunction,
} from "../../../../../lib/types";
import { Formik } from "formik";
import { addEdition } from "../../../../../lib/Firebase/client/api";
import { updateEditionsCache } from "../../../../../lib/Firebase/server/actions";
import { PDFDocument } from "pdf-lib";
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
import { FileInput } from "../../../../../components/FileInput";
import { ROUTES } from "../../../../../utils/routes";
import Link from "next/link";

const schema = Yup.object().shape({
  editionYear: Yup.number()
    .lessThan(3000, "Vi er ikke blitt så gamle ennå. Året må være før 3000.")
    .moreThan(1998, "readme ble grunnlagt i 1999, så dette er for tidlig.")
    .required("Utgaveår må fylles ut."),
  editionNumber: Yup.number()
    .lessThan(7, "Dette tallet kan ikke være høyere enn 6.")
    .moreThan(0, "Dette tallet må være høyere enn null.")
    .required("Utgavenummer må fylles ut."),
  editionFile: Yup.mixed()
    .required("Du må ha en utgave å laste opp!")
    .test(
      "file type",
      "Dette må være en PDF-fil",
      (value) =>
        value &&
        value.name.endsWith(".pdf") &&
        value.type === "application/pdf",
    ),
  listingslop: Yup.bool(),
});

const NewEditionForm: NextPage = () => {
  const handleSubmit: ISubmitEditionFunction = async (
    values,
    { setSubmitting, setStatus },
  ) => {
    const { editionYear, editionNumber, editionFile, listingslop } = values;
    const editionTitle = `${editionYear}-0${editionNumber}`;
    let fileToUpload = new File([editionFile as File], `${editionTitle}.pdf`, {
      type: (editionFile as File).type,
    });

    const pdfFile = await PDFDocument.load(await fileToUpload.arrayBuffer());
    pdfFile.setTitle(editionTitle);
    const pdfBytes = new Uint8Array(await pdfFile.save());
    fileToUpload = new File([pdfBytes], `${editionTitle}.pdf`, {
      type: (editionFile as File).type,
    });

    await addEdition({ ...values, editionFile: fileToUpload }, (progress) =>
      setStatus({ progress: progress }),
    )
      .then(updateEditionsCache)
      .then(() => setStatus({ success: true, progress: 100 }))
      .catch(() => setStatus({ error: true }));
  };

  const now = new Date();
  const year = now.getFullYear();

  const initialFormValues: INewEditionData = {
    editionYear: year,
    editionNumber: 1,
    editionFile: undefined,
    listingslop: false,
  };

  return (
    <Formik
      enableReinitialize
      validationSchema={schema}
      onSubmit={(values, actions) => handleSubmit(values, actions)}
      initialValues={initialFormValues}
      initialStatus={{
        success: false,
        error: false,
        progress: 0,
      }}
    >
      {({
        handleSubmit,
        handleChange,
        values,
        touched,
        isValid,
        errors,
        status,
        setStatus,
        isSubmitting,
        resetForm,
        setFieldValue,
        setFieldTouched,
      }) => {
        const disableForm = isSubmitting || status.error || status.success;

        const reset = () => {
          resetForm();
          setStatus({
            success: false,
            error: false,
            progress: 0,
          });
        };

        return (
          <Form
            className="flex flex-col gap-[10px] max-w-[350px] w-full"
            onSubmit={handleSubmit}
            validationErrors={Object.fromEntries(
              Object.entries(errors)
                .filter(
                  ([key]) => touched[key as keyof typeof touched] === true,
                )
                .map(([key, value]) => [key, String(value)]),
            )}
          >
            <div className="flex items-start gap-[20px] w-full">
              <NumberField
                name="editionYear"
                value={values.editionYear}
                onChange={(value) => setFieldValue("editionYear", value)}
                onBlur={() => setFieldTouched("editionYear", true)}
                formatOptions={{
                  useGrouping: false,
                }}
                isRequired
              >
                <Label>Utgaveår</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input />
                  <NumberField.IncrementButton />
                </NumberField.Group>
                <FieldError></FieldError>
              </NumberField>
              <NumberField
                name="editionNumber"
                value={values.editionNumber}
                onChange={(value) => setFieldValue("editionNumber", value)}
                onBlur={() => setFieldTouched("editionNumber", true)}
                formatOptions={{
                  useGrouping: false,
                }}
                isRequired
                minValue={1}
                maxValue={6}
              >
                <Label>Utgavenummer</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input />
                  <NumberField.IncrementButton />
                </NumberField.Group>
                <FieldError>{errors.editionNumber}</FieldError>
              </NumberField>
            </div>
            <FileInput
              value={values.editionFile}
              onChange={(file) => {
                setFieldTouched("editionFile", true);
                setFieldValue("editionFile", file);
              }}
              label="Utgave"
              error={touched.editionFile && !!errors.editionFile}
              errorMessage={
                typeof errors.editionFile === "string"
                  ? errors.editionFile
                  : undefined
              }
              isDisabled={disableForm}
              acceptFormat=".pdf"
              isRequired
            />
            {values.editionFile && values.editionFile.size > 40000000 && (
              <Alert status="warning" className="rounded-xl">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Stor fil valgt!</Alert.Title>
                  <Alert.Description className="text-xs">
                    For best ytelse anbefales en filstørrelse på 10–30 MB.
                    Større filer kan gi økte kostnader og gjøre nettsiden
                    tregere.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            <Checkbox
              name="listingslop"
              onChange={(value) => setFieldValue("listingslop", value)}
              isSelected={values.listingslop}
              isDisabled={disableForm}
              className="mt-4"
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Listingløp utgave
              </Checkbox.Content>
              <Description>
                Marker om en utgave inneholder en eller flere artikler om
                Listingløpet.
              </Description>
            </Checkbox>

            {disableForm ? (
              <ProgressBar
                className="max-w-md mt-[20px]"
                size="md"
                value={status.progress}
              >
                <Label>Loading</Label>
                <ProgressBar.Output />
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            ) : (
              <Button
                type="submit"
                variant="primary"
                className="w-full mt-[20px] rounded-full"
                isDisabled={!isValid}
              >
                Last opp utgave
              </Button>
            )}
            {status.error ? (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Noe gikk galt!</Alert.Title>
                  <Alert.Description>
                    Vent litt, og prøv igjen. Dersom problemet vedvarer, kontakt
                    ansvarlig utvikler.
                  </Alert.Description>
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={reset}
                    className="mt-2"
                  >
                    Prøv igjen
                  </Button>
                </Alert.Content>
              </Alert>
            ) : null}
            {status.success ? (
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Opplasting fullført!</Alert.Title>
                  <Alert.Description>
                    Merk: det kan ta 5-10 minutter før utgaven dukker opp på
                    forsiden! I mellomtiden kan du gjøre følgende:
                  </Alert.Description>
                  <div className="flex gap-[10px] mt-[10px]">
                    <Link
                      href={ROUTES.EDITION.replace(
                        ":id",
                        `${values.editionYear}-0${values.editionNumber}`,
                      )}
                      className={buttonVariants({ variant: "tertiary" })}
                    >
                      Åpne utgave
                    </Link>
                    <Link
                      href={ROUTES.NEW_ARTICLE}
                      className={buttonVariants({ variant: "tertiary" })}
                    >
                      Legg til artikler
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
};
export default NewEditionForm;
