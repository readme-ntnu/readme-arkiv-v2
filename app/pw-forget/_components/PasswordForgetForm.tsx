"use client";

import { FormEventHandler, useState } from "react";
import { useSendPasswordResetEmail } from "react-firebase-hooks/auth";
import { auth } from "../../../lib/Firebase/client/firebase";
import {
  Alert,
  Button,
  FieldError,
  Form,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";
import { Envelope } from "@gravity-ui/icons";

export default function PasswordForgetForm() {
  const [sendPasswordResetEmail, sending, error] =
    useSendPasswordResetEmail(auth);
  const [success, setSuccess] = useState(false);

  const onSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    let data = Object.fromEntries(new FormData(e.currentTarget));
    setSuccess(await sendPasswordResetEmail(data.email as string));
  };

  return (
    <Form onSubmit={onSubmit} className="flex flex-col w-full gap-5">
      <TextField
        isRequired
        name="email"
        type="email"
        className="rounded-full"
        validate={(value) => {
          if (!value) return "Obligatorisk felt.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return "Skriv inn en gyldig mail adresse.";
          }

          return "";
        }}
      >
        <Label>E-post</Label>
        <InputGroup>
          <InputGroup.Prefix>
            <Envelope />
          </InputGroup.Prefix>
          <InputGroup.Input />
        </InputGroup>
        <FieldError />
      </TextField>
      <Button
        type="submit"
        variant="primary"
        className="w-full rounded-full"
        isPending={sending}
        isDisabled={success}
      >
        Tilbakestill passord
      </Button>
      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>En feil oppsto!</Alert.Title>
            <Alert.Description>{error?.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {success && (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>E-post sendt!</Alert.Title>
            <Alert.Description>
              Sjekk innboksen din og følg lenken for å tilbakestille passordet.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
    </Form>
  );
}
