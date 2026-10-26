"use client";

import { Spinner, buttonVariants, cn } from "@heroui/react";
import { getIdToken } from "firebase/auth";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { auth } from "lib/firebase/client";
import type { EditionPdfVersion } from "types/editions";
import { addReturnTo, ROUTES } from "utils/routes";

const PdfEditionViewer = dynamic(() => import("./PdfEditionViewer"), {
  ssr: false,
  loading: LoadingMessage,
});

type ViewerState =
  | { status: "loading" }
  | { status: "ready"; url: string; version: EditionPdfVersion }
  | { status: "login"; message: string }
  | { status: "error"; message: string };

type AccessResponse = {
  url?: string;
  version?: EditionPdfVersion;
  code?: string;
  message?: string;
};

function ViewerMessage({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      {children}
    </div>
  );
}

async function requestAccess(
  editionId: string,
  requestedVersion: string,
  signal?: AbortSignal,
) {
  await auth.authStateReady();
  const user = auth.currentUser;
  const token = user ? await getIdToken(user) : null;
  const query = new URLSearchParams({ version: requestedVersion });
  const response = await fetch(
    `/api/editions/${encodeURIComponent(editionId)}/access?${query}`,
    {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    },
  );

  return {
    response,
    result: (await response.json()) as AccessResponse,
  };
}

function LoadingMessage() {
  return (
    <ViewerMessage>
      <Spinner size="lg" />
      <p role="status">Åpner utgaven …</p>
    </ViewerMessage>
  );
}

export function EditionViewer({
  editionId,
  requestedVersion,
}: {
  editionId: string;
  requestedVersion: string;
}) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const appChrome = Array.from(
      document.querySelectorAll<HTMLElement>("[data-app-chrome]"),
      (element) => ({ element, wasHidden: element.hidden }),
    );

    document.body.style.overflow = "hidden";
    appChrome.forEach(({ element }) => {
      element.hidden = true;
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      appChrome.forEach(({ element, wasHidden }) => {
        element.hidden = wasHidden;
      });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPdfUrl() {
      setState({ status: "loading" });

      try {
        const { response, result } = await requestAccess(
          editionId,
          requestedVersion,
          controller.signal,
        );

        if (response.status === 401 && result.code === "AUTH_REQUIRED") {
          setState({
            status: "login",
            message: result.message ?? "Logg inn for å se originalversjonen.",
          });
        } else if (!response.ok || !result.url || !result.version) {
          setState({
            status: "error",
            message: result.message ?? "Kunne ikke åpne utgaven.",
          });
        } else {
          setState({
            status: "ready",
            url: result.url,
            version: result.version,
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setState({ status: "error", message: "Kunne ikke åpne utgaven." });
      }
    }

    void loadPdfUrl();
    return () => controller.abort();
  }, [editionId, requestedVersion]);

  if (state.status === "ready") {
    return (
      <PdfEditionViewer
        key={state.url}
        url={state.url}
        filename={`${editionId}_${state.version}.pdf`}
      />
    );
  }

  if (state.status === "loading") return <LoadingMessage />;

  const pageHash = typeof window === "undefined" ? "" : window.location.hash;

  return (
    <ViewerMessage>
      <h1 className="text-2xl font-bold">
        {state.status === "login"
          ? "Innlogging kreves"
          : "Kunne ikke åpne utgaven"}
      </h1>
      <p role="alert">{state.message}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {state.status === "login" && (
          <Link
            href={addReturnTo(
              ROUTES.LOGIN,
              `/edition/${editionId}?version=original${pageHash}`,
            )}
            className={cn(
              "rounded-full",
              buttonVariants({ variant: "primary" }),
            )}
          >
            Logg inn
          </Link>
        )}
        <Link
          href={ROUTES.HOME}
          className={cn(
            "rounded-full",
            buttonVariants({ variant: "secondary" }),
          )}
        >
          Gå til forsiden
        </Link>
      </div>
    </ViewerMessage>
  );
}
