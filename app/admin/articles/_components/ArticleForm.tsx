"use client";

import { FC, ClipboardEvent } from "react";

import { Formik } from "formik";
import * as Yup from "yup";
import { ISubmitArticleFunction, IEditArticle } from "../../../../lib/types";
import {
  Alert,
  Button,
  ComboBox,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { Xmark } from "@gravity-ui/icons";
import React from "react";
import { ComboBoxStateContext } from "react-aria-components";
import LabelTooltip from "@/components/TooltipLabel";
import { TagInput } from "@/components/TagInput";
import { TagField } from "@/components/TagField";

interface ArticleFormProps {
  doHandleSubmit: ISubmitArticleFunction;
  article?: IEditArticle;
}

function ComboBoxClearButton() {
  let state = React.useContext(ComboBoxStateContext);
  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      // Don't inherit default Button behavior from ComboBox.
      slot={null}
      aria-label="Clear"
      onPress={() => state?.setInputValue("")}
      className="absolute right-6 combo-box__trigger bg-transparent p-0"
      excludeFromTabOrder
    >
      <Xmark />
    </Button>
  );
}

export const ArticleForm: FC<ArticleFormProps> = ({
  doHandleSubmit,
  article,
}) => {
  const {
    title,
    type,
    author,
    layout,
    photo,
    editionYear,
    editionNumber,
    content,
    pages,
    tags,
  } = article || {};
  const schema = Yup.object({
    title: Yup.string().required("Artikkelen må ha en tittel"),
    type: Yup.string(),
    author: Yup.string().required("Noen har vel skrevet dette?"),
    layout: Yup.string().required("Hvem skal ha æren?"),
    photo: Yup.string(),
    editionYear: Yup.number()
      .lessThan(3000, "Vi er ikke blitt så gamle ennå. Året må være før 3000.")
      .moreThan(1998, "readme ble grunnlagt i 1999, så dette er for tidlig.")
      .required("Utgaveår må fylles ut."),
    editionNumber: Yup.number()
      .lessThan(7, "Dette tallet kan ikke være høyere enn 6.")
      .moreThan(0, "Dette tallet må være høyere enn null.")
      .required("Utgavenummer må fylles ut."),
    content: Yup.string().required("Artikkelen må ha noe innhold."),
    pages: Yup.string()
      .matches(
        new RegExp("^[0-9]+(,\\s{1}[0-9]+)*$"),
        'Skriv inn som en liste med tall, separert med komma og mellomrom: "10, 12, 13".',
      )
      .required("Artikkelen må ha sidetall, og de må oppgis på rett form."),
    tags: Yup.array().of(Yup.string().trim().required()).default([]),
  });

  const now = new Date();
  const year = now.getFullYear();

  const initialFormValues = {
    title: title || "",
    type: type || "",
    author: author || "",
    layout: layout || "",
    photo: photo || "",
    editionYear: editionYear || year,
    editionNumber: editionNumber || 1,
    content: content || "",
    pages: pages || "",
    tags: tags || [],
  };

  const columnSuggestions = [
    "Leder",
    "Side 3",
    "Gløsløken",
    "Utgavens master",
    "Siving",
    "Ikke-Siving",
    "Redaksjonen Anbefaler",
    "Konkurranse",
    "Smått & Nett",
  ];

  return (
    <Formik
      enableReinitialize
      validationSchema={schema}
      onSubmit={(values, actions) =>
        doHandleSubmit(values as IEditArticle, actions)
      }
      initialStatus={{ success: false, error: false }}
      initialValues={initialFormValues}
    >
      {({
        handleSubmit,
        handleChange,
        handleBlur,
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
        const disabled = isSubmitting || status.error || status.success;

        function onPaste(event: ClipboardEvent<HTMLInputElement>) {
          event.preventDefault();
          const cursorPosition = event.currentTarget.selectionStart ?? 0;
          const text = event.clipboardData.getData("text");
          const trimmedText = text
            .replace(/\s+/g, " ")
            .replace(/\.(?!\s)/g, ". ")
            .replace(/,(?!\s)/g, ", ")
            .replace(/!(?!\s)/g, ", ")
            .replace(/\?(?!\s)/g, ", ")
            .trim();
          const currentText = values.content;
          let textToSet: string;
          if (currentText) {
            textToSet = [
              currentText.slice(0, cursorPosition),
              trimmedText,
              currentText.slice(cursorPosition),
            ].join("");
          } else {
            textToSet = trimmedText;
          }
          setFieldValue("content", textToSet);
        }

        return (
          <Form
            onSubmit={handleSubmit}
            className="flex flex-col gap-[15px] max-w-[600px] w-full items-center mb-5"
            validationErrors={Object.fromEntries(
              Object.entries(errors)
                .filter(
                  ([key]) => touched[key as keyof typeof touched] === true,
                )
                .map(([key, value]) => [key, String(value)]),
            )}
          >
            <div className="flex flex-col md:flex-row gap-[25px] w-full">
              <TextField
                name="title"
                value={values.title}
                onChange={(value) => setFieldValue("title", value)}
                onBlur={handleBlur}
                isRequired
                className="flex-1"
              >
                <Label>Tittel</Label>
                <Input />
                <FieldError />
              </TextField>
              <ComboBox
                allowsCustomValue
                allowsEmptyCollection
                inputValue={values.type}
                onInputChange={(value) => setFieldValue("type", value)}
                onBlur={handleBlur}
                className="flex-1"
              >
                <Label>
                  Spalte
                  <LabelTooltip tooltipText="Spalten kan være et av forslagene fra listen eller egendefinert ved å skrive inn i feltet." />
                </Label>
                <ComboBox.InputGroup>
                  <Input placeholder="Ingen spalte valgt" />
                  <ComboBoxClearButton />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox>
                    {columnSuggestions.map((item) => (
                      <ListBox.Item key={item} id={item} textValue={item}>
                        {item}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
            </div>
            <div className="flex flex-col sm:flex-row gap-[25px] w-full">
              <NumberField
                name="editionYear"
                value={values.editionYear}
                onChange={(value) => setFieldValue("editionYear", value)}
                onBlur={() => setFieldTouched("editionYear", true)}
                formatOptions={{
                  useGrouping: false,
                }}
                isRequired
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
                formatOptions={{
                  useGrouping: false,
                }}
                isRequired
                minValue={1}
                maxValue={6}
                className="flex-1"
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
            <TextField
              name="author"
              value={values.author}
              onChange={(value) => setFieldValue("author", value)}
              onBlur={handleBlur}
              isRequired
              className="w-full"
            >
              <Label>Skribent</Label>
              <Input />
              <FieldError />
            </TextField>
            <TextField
              name="layout"
              value={values.layout}
              onChange={(value) => setFieldValue("layout", value)}
              onBlur={handleBlur}
              isRequired
              className="w-full"
            >
              <Label>Layout</Label>
              <Input />
              <FieldError />
            </TextField>
            <TextField
              name="photo"
              value={values.photo}
              onChange={(value) => setFieldValue("photo", value)}
              onBlur={handleBlur}
              className="w-full"
            >
              <Label>Foto</Label>
              <Input />
              <FieldError />
            </TextField>
            <TextField
              name="content"
              value={values.content}
              onChange={(value) => setFieldValue("content", value)}
              onBlur={handleBlur}
              onPaste={onPaste}
              className="w-full"
              isRequired
            >
              <Label>
                Tekst
                <LabelTooltip tooltipText="Lim inn brødteksten fra artikkelen. Blir brukt til indeksering av søkeresultater." />
              </Label>
              <TextArea />
              <FieldError />
            </TextField>
            <TextField
              name="pages"
              value={values.pages}
              onChange={(value) => setFieldValue("pages", value)}
              onBlur={handleBlur}
              isRequired
              className="w-full"
            >
              <Label>
                Sidetall
                <LabelTooltip tooltipText='Skriv inn som en liste med tall, separert med komma og mellomrom: "10, 12, 13".' />
              </Label>
              <Input />
              <FieldError />
            </TextField>
            <TagField
              name="tags"
              className="w-full"
              value={values.tags}
              onChange={(values) => setFieldValue("tags", values)}
              onBlur={() => {
                setFieldTouched("tags", true);
              }}
            >
              <Label>
                Tags
                <LabelTooltip tooltipText="Legg til tags ved å skrive inn én tag om gangen og trykke Enter." />
              </Label>
              <TagInput className="w-full" placeholder="Legg til tag" />
              <FieldError />
            </TagField>
            <Button
              type="submit"
              variant="primary"
              className="w-[200px] mt-[10px] rounded-full"
              isDisabled={!isValid || disabled}
              isPending={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner color="current" /> Laster
                </>
              ) : !article ? (
                "Legg til artikkel"
              ) : (
                "Oppdater artikkel"
              )}
            </Button>
            {status.error && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Noe gikk galt!</Alert.Title>
                  <Alert.Description>
                    Husket du å laste opp PDF-en først? Man kan ikke opprette en
                    artikkel uten tilhørende utgave i databasen.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            {status.success && (
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {article ? "Artikkel er endret!" : "Artikkel er lagt til!"}
                  </Alert.Title>
                  <Alert.Description>
                    {!article &&
                      "Tøm skjemaet dersom du ønsker å legge til enda en artikkel."}
                  </Alert.Description>
                  {!article && (
                    <Button
                      size="sm"
                      variant="tertiary"
                      onPress={() => {
                        resetForm();
                        setStatus({ success: false });
                      }}
                      className="mt-2"
                    >
                      Tøm skjema
                    </Button>
                  )}
                </Alert.Content>
              </Alert>
            )}
          </Form>
        );
      }}
    </Formik>
  );
};
