import { initializeApp, getApps } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { config } from "./config";

if (!getApps().length) {
  initializeApp(config);
}

const app = getApps()[0];

const auth = getAuth(app);

const storage = getStorage(app);

const functions = getFunctions(app);

const db = getFirestore(app);

if (
  process.env.VERCEL_ENV !== "production" &&
  process.env.VERCEL_ENV !== "preview"
) {
  connectStorageEmulator(storage, "localhost", 9199);
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { app, auth, storage, functions, db };
