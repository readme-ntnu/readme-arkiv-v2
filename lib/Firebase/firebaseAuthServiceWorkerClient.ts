"use client";

import { getIdToken, type User } from "firebase/auth";

const AUTH_TOKEN_MESSAGE = "FIREBASE_AUTH_TOKEN";
let serviceWorkerInitialization: Promise<void> | undefined;

function getWorkerUrl() {
  const useEmulators =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  return `/firebase-auth-service-worker.js?emulators=${useEmulators}`;
}

async function initializeFirebaseAuthServiceWorker() {
  await navigator.serviceWorker.register(getWorkerUrl(), {
    scope: "/",
  });
  await navigator.serviceWorker.ready;

  if (navigator.serviceWorker.controller) return;

  await new Promise<void>((resolve) => {
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => resolve(),
      {
        once: true,
      },
    );
  });
}

export function ensureFirebaseAuthServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return Promise.resolve();

  serviceWorkerInitialization ??= initializeFirebaseAuthServiceWorker().catch(
    (error) => {
      serviceWorkerInitialization = undefined;
      throw error;
    },
  );

  return serviceWorkerInitialization;
}

export async function syncFirebaseAuthTokenWithServiceWorker(user: User) {
  await ensureFirebaseAuthServiceWorker();

  const controller = navigator.serviceWorker.controller;
  if (!controller) {
    throw new Error("Firebase Auth service worker is not controlling the page");
  }

  const idToken = await getIdToken(user);

  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(
        new Error("Firebase Auth service worker did not acknowledge token"),
      );
    }, 5_000);

    channel.port1.onmessage = () => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve();
    };

    controller.postMessage({ type: AUTH_TOKEN_MESSAGE, idToken }, [
      channel.port2,
    ]);
  });
}
