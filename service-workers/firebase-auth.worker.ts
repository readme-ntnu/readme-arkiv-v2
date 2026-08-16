/// <reference lib="webworker" />

import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  getIdToken,
  onAuthStateChanged,
} from "firebase/auth";
import { config } from "../lib/Firebase/config";

const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

const app = initializeApp(config);
const auth = getAuth(app);

// Temporarily holds the ID token sent by the client after login, bridging the
// delay before the updated Firebase Auth state becomes available in the worker.
let messagedIdToken: string | null = null;
const AUTH_TOKEN_MESSAGE = "FIREBASE_AUTH_TOKEN";

const useFirebaseEmulators =
  new URL(serviceWorker.location.href).searchParams.get("emulators") === "true";

if (useFirebaseEmulators) {
  connectAuthEmulator(auth, "http://localhost:9099");
}

const getIdTokenPromise = (): Promise<string | null> =>
  new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (!user) {
        resolve(null);
        return;
      }
      getIdToken(user)
        .then(resolve)
        .catch(() => resolve(null));
    });
  });

serviceWorker.addEventListener("install", () => {
  void serviceWorker.skipWaiting();
});

serviceWorker.addEventListener("activate", (event) => {
  event.waitUntil(serviceWorker.clients.claim());
});

serviceWorker.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (
    event.data?.type !== AUTH_TOKEN_MESSAGE ||
    typeof event.data.idToken !== "string"
  ) {
    return;
  }

  // Firebase Auth persistence reaches the worker asynchronously. Keep the token
  // supplied by the page available until the worker can read the same user.
  messagedIdToken = event.data.idToken;
  event.ports[0]?.postMessage({ received: true });
});

serviceWorker.addEventListener("fetch", (event: FetchEvent) => {
  const requestProcessor = (idToken: string | null) => {
    const request = event.request;
    const requestUrl = new URL(request.url);
    const isSecureOrigin =
      serviceWorker.location.protocol === "https:" ||
      serviceWorker.location.hostname === "localhost";

    if (
      !idToken ||
      !isSecureOrigin ||
      requestUrl.origin !== serviceWorker.location.origin
    ) {
      return fetch(request);
    }

    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${idToken}`);

    return fetch(new Request(request, { headers }));
  };

  event.respondWith(
    getIdTokenPromise()
      .then((idToken) => {
        const token = idToken ?? messagedIdToken;
        // Once Firebase persistence has caught up, stop using the handoff token.
        if (idToken) {
          messagedIdToken = null;
        } else if (token && event.request.mode === "navigate") {
          // Consume the handoff token after the first navigation request to reduce
          // the risk of keeping a stale token alive (e.g., if the user signs out
          // before persistence reaches the worker).
          messagedIdToken = null;
        }
        return token;
      })
      .catch(() => messagedIdToken)
      .then(requestProcessor),
  );
});

export {};
