"use client";

import { FormEventHandler, useEffect, useState } from "react";
import { auth } from "../../../lib/Firebase/firebase";
import {
  useAuthState,
  useSignInWithEmailAndPassword,
} from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { Alert, Button, Form, Input, Link } from "@heroui/react";
import { ROUTES } from "../../../utils/routes";
import { Envelope, Eye, EyeSlash, Lock } from "@gravity-ui/icons";

export default function SignInForm() {
  const [signInWithEmailAndPassword, userCredential, loading, error] =
    useSignInWithEmailAndPassword(auth);
  const [authUser, authLoading] = useAuthState(auth);
  const router = useRouter();

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordEmpty, setIsPasswordEmpty] = useState(true);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    let data = Object.fromEntries(new FormData(e.currentTarget));
    signInWithEmailAndPassword(data.email as string, data.password as string);
  };

  useEffect(() => {
    if (!authLoading && authUser) {
      router.push(ROUTES.ADMIN);
    }
  }, [authUser, authLoading, router]);

  return (
    <Form onSubmit={onSubmit} className="w-full gap-3">
      <Input
        isRequired
        name="email"
        placeholder="E-post"
        type="email"
        radius="full"
        errorMessage={({ validationDetails, validationErrors }) => {
          if (validationDetails.typeMismatch)
            return "Skriv inn en gyldlig mail adresse.";
          if (validationDetails.valueMissing) return "Obligatorisk felt.";
          return validationErrors;
        }}
        startContent={<Envelope />}
      />
      <Input
        isRequired
        name="password"
        placeholder="Passord"
        type={isPasswordVisible ? "text" : "password"}
        radius="full"
        startContent={<Lock />}
        onChange={(e) => setIsPasswordEmpty(e.target.value == "")}
        errorMessage={({ validationDetails, validationErrors }) => {
          if (validationDetails.valueMissing) return "Obligatorisk felt.";
          return validationErrors;
        }}
        endContent={
          !isPasswordEmpty && (
            <button
              type="button"
              className="flex items-center cursor-pointer"
              onClick={togglePasswordVisibility}
            >
              {isPasswordVisible ? <EyeSlash /> : <Eye />}
            </button>
          )
        }
      />
      {error && <Alert color="danger">Feil e-post eller brukernavn!</Alert>}
      <Button
        type="submit"
        variant="solid"
        color="primary"
        className="w-full"
        radius="full"
        isLoading={loading}
      >
        Logg inn
      </Button>
      <Link
        className="m-auto"
        color="foreground"
        size="sm"
        href={ROUTES.PASSWORD_FORGET}
      >
        Glemt passord?
      </Link>
    </Form>
  );
}
