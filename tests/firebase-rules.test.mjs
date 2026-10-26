import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { readFile } from "node:fs/promises";

const PROJECT_ID = "demo-readme-rules";

function emulatorAddress(environmentName, fallbackPort) {
  const value = process.env[environmentName] ?? `127.0.0.1:${fallbackPort}`;
  const separator = value.lastIndexOf(":");
  return {
    host: value.slice(0, separator),
    port: Number(value.slice(separator + 1)),
  };
}

let environment;

before(async () => {
  const firestore = emulatorAddress("FIRESTORE_EMULATOR_HOST", 8080);
  const storage = emulatorAddress("FIREBASE_STORAGE_EMULATOR_HOST", 9199);

  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      ...firestore,
      rules: await readFile("firestore.rules", "utf8"),
    },
    storage: {
      ...storage,
      rules: await readFile("storage.rules", "utf8"),
    },
  });
});

after(async () => {
  await environment?.cleanup();
});

function memberContext(role = "member") {
  return environment.authenticatedContext("member-user", {
    firebase: { sign_in_provider: "password" },
    readmeMember: true,
    readmeRole: role,
  });
}

function readyEdition(id = "2098-01") {
  const editionYear = Number(id.slice(0, 4));
  const editionNumber = Number(id.slice(5));
  const originalPdfGeneration = "1001";

  return {
    editionYear,
    editionNumber,
    listinglop: false,
    originalPdf: {
      generation: originalPdfGeneration,
      size: 100,
      status: "available",
    },
    publicPdf: null,
    thumbnail: {
      generation: "2001",
      originalPdfGeneration,
      status: "available",
    },
  };
}

test("Firestore edition records are available only through the server", async () => {
  const id = "2098-01";
  const memberDb = memberContext().firestore();
  const privilegedDb = memberContext("leader").firestore();
  const outsiderDb = environment
    .authenticatedContext("outside-user", {
      firebase: { sign_in_provider: "password" },
    })
    .firestore();
  const publicDb = environment.unauthenticatedContext().firestore();
  const editionRef = doc(memberDb, "editions", id);

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "editions", id), readyEdition(id));
  });
  await assertFails(getDoc(doc(publicDb, "editions", id)));
  await assertFails(getDoc(doc(memberDb, "editions", id)));

  await assertFails(
    setDoc(
      doc(outsiderDb, "editions", id),
      { listinglop: true },
      { merge: true },
    ),
  );
  await assertFails(setDoc(editionRef, readyEdition(id)));
  await assertFails(deleteDoc(doc(memberDb, "editions", id)));
  await assertFails(deleteDoc(doc(privilegedDb, "editions", id)));
});

test("Storage protects originals and validates edition writes", async () => {
  const id = "2097-01";
  const originalPath = `pdf/2097/${id}.pdf`;
  const publicPath = `pdf_public/2097/${id}_public.pdf`;
  const imagePath = `images/2097/${id}.jpg`;
  const memberStorage = memberContext().storage();
  const privilegedStorage = memberContext("leader").storage();
  const signedInStorage = environment
    .authenticatedContext("signed-in-user", {
      firebase: { sign_in_provider: "password" },
    })
    .storage();
  const anonymousUserStorage = environment
    .authenticatedContext("anonymous-user", {
      firebase: { sign_in_provider: "anonymous" },
    })
    .storage();
  const publicStorage = environment.unauthenticatedContext().storage();
  const pdfBytes = new TextEncoder().encode("%PDF-1.7 test");
  const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

  await assertSucceeds(
    uploadBytes(ref(memberStorage, originalPath), pdfBytes, {
      contentType: "application/pdf",
    }),
  );
  await assertSucceeds(
    uploadBytes(ref(memberStorage, publicPath), pdfBytes, {
      contentType: "application/pdf",
    }),
  );
  await assertSucceeds(
    uploadBytes(ref(memberStorage, imagePath), imageBytes, {
      contentType: "image/jpeg",
    }),
  );

  await assertFails(getBytes(ref(publicStorage, originalPath)));
  await assertFails(getBytes(ref(anonymousUserStorage, originalPath)));
  await assertSucceeds(getBytes(ref(signedInStorage, originalPath)));
  await assertSucceeds(getBytes(ref(publicStorage, publicPath)));
  await assertSucceeds(getBytes(ref(publicStorage, imagePath)));

  await assertFails(
    uploadBytes(
      ref(publicStorage, "pdf_public/2097/2097-02_public.pdf"),
      pdfBytes,
      { contentType: "application/pdf" },
    ),
  );
  await assertFails(
    uploadBytes(ref(memberStorage, "pdf_public/2097/2097-02.pdf"), pdfBytes, {
      contentType: "application/pdf",
    }),
  );
  await assertFails(
    uploadBytes(ref(memberStorage, "pdf/2097/2097-02_public.pdf"), pdfBytes, {
      contentType: "application/pdf",
    }),
  );
  await assertFails(
    uploadBytes(ref(memberStorage, "pdf/2097/not-an-edition.pdf"), pdfBytes, {
      contentType: "application/pdf",
    }),
  );
  await assertFails(
    uploadBytes(ref(memberStorage, "pdf/2097/2097-02.pdf"), pdfBytes, {
      contentType: "text/plain",
    }),
  );
  await assertFails(deleteObject(ref(memberStorage, publicPath)));

  await assertSucceeds(deleteObject(ref(privilegedStorage, originalPath)));
  await assertSucceeds(deleteObject(ref(privilegedStorage, publicPath)));
  await assertSucceeds(deleteObject(ref(privilegedStorage, imagePath)));
});
