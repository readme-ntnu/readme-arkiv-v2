"use client";

import { FormEventHandler, useState } from "react";
import { auth } from "../../../../lib/Firebase/client/firebase";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import {
  Alert,
  Button,
  cn,
  FieldError,
  Form,
  InputGroup,
  linkVariants,
  Spinner,
  TextField,
} from "@heroui/react";
import { Envelope, Eye, EyeSlash, Lock } from "@gravity-ui/icons";
import Link from "next/link";
import { ROUTES } from "../../../../utils/routes";
import { useRouter } from "next/navigation";
import { syncFirebaseAuthTokenWithServiceWorker } from "lib/Firebase/client/firebaseAuthServiceWorker";

export default function SignInForm() {
  const [signInWithEmailAndPassword, _, loading, error] =
    useSignInWithEmailAndPassword(auth);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordEmpty, setIsPasswordEmpty] = useState(true);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const router = useRouter();

  const onSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    let data = Object.fromEntries(new FormData(e.currentTarget));

    const user = await signInWithEmailAndPassword(
      data.email as string,
      data.password as string,
    );
    if (!user) return;

    await syncFirebaseAuthTokenWithServiceWorker(user.user);
    router.push(ROUTES.ADMIN);
  };

  return (
    <Form onSubmit={onSubmit} className="flex flex-col w-full gap-4">
      <TextField
        name="email"
        type="email"
        validate={(value) => {
          if (value === "") return "Obligatorisk felt.";
        }}
        aria-label="email"
      >
        <InputGroup className="rounded-full">
          <InputGroup.Prefix>
            <Envelope />
          </InputGroup.Prefix>
          <InputGroup.Input placeholder="E-post" />
        </InputGroup>
        <FieldError />
      </TextField>
      <TextField
        name="password"
        type={isPasswordVisible ? "text" : "password"}
        validate={(value) => {
          if (value === "") return "Obligatorisk felt.";
        }}
        onChange={(e) => setIsPasswordEmpty(e === "")}
        aria-label="password"
      >
        <InputGroup className="rounded-full">
          <InputGroup.Prefix>
            <Lock />
          </InputGroup.Prefix>
          <InputGroup.Input placeholder="Passord" />
          <InputGroup.Suffix>
            {!isPasswordEmpty && (
              <button
                type="button"
                className="flex items-center cursor-pointer"
                onClick={togglePasswordVisibility}
              >
                {isPasswordVisible ? <EyeSlash /> : <Eye />}
              </button>
            )}
          </InputGroup.Suffix>
        </InputGroup>
        <FieldError />
      </TextField>
      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Feil e-post eller brukernavn!</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      <Button
        type="submit"
        variant="primary"
        className="w-full rounded-full"
        isPending={loading}
      >
        {({ isPending }) => (
          <>
            {isPending && <Spinner color="current" size="sm" />}
            Logg inn
          </>
        )}
      </Button>
      <Link
        className={cn("m-auto text-xs", linkVariants().base())}
        href={ROUTES.PASSWORD_FORGET}
      >
        Glemt passord?
      </Link>
    </Form>
  );
}
