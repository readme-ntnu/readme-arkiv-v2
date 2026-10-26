#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { styleText } from "node:util";
import nextEnv from "@next/env";
import admin from "firebase-admin";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const EDITION_PATH_PATTERNS = {
  original: /^pdf\/(\d{4})\/(\d{4})-(0[1-6])\.pdf$/,
  publicPdf: /^pdf_public\/(\d{4})\/(\d{4})-(0[1-6])_public\.pdf$/,
  thumbnail: /^images\/(\d{4})\/(\d{4})-(0[1-6])\.jpg$/,
};
const EDITION_ID_PATTERN = /^(\d{4})-(0[1-6])$/;
const ENVIRONMENTS = new Set(["emulator", "production"]);

/**
 * Prints the reconciliation options and production write requirements. It is
 * shown for explicit help and invalid arguments.
 */
function printHelp() {
  console.log(`Usage:
  node scripts/edition-storage-maintenance.mjs [options]

Reconciliation creates missing editions/{YYYY-NN} records and aligns existing
records with Storage. Records with missing originals retain descriptors for
other files still in Storage. No Storage files are deleted.

Options:
  --project <id>             Firebase project (defaults to .firebaserc/env).
  --bucket <name>            Storage bucket (defaults to env or <id>.appspot.com).
  --environment <target>     Use emulator (default) or production services.
  --concurrency <number>     Maximum simultaneous Storage requests (default: 12).
  --apply                    Perform writes. Runs are dry-run by default.
  --confirm-project <id>     Required with --apply in production.
  --fail-on-drift            Exit with status 2 when a dry-run detects drift.
  --help                     Show this help.

Terms:
  Environment selects local Firebase emulators or live production services.
  The emulator hosts default to 127.0.0.1:8080 and 127.0.0.1:9199.
  Concurrency is the number of Storage operations that may run at the same
  time. Lower values reduce load, while higher values may complete faster.
  Drift means that Storage and Firestore differ from the expected catalog,
  such as missing records, stale thumbnails, or incorrect file metadata.

Production authentication uses FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY
from the Next.js environment files when available. Otherwise, Application
Default Credentials are used.`);
}

/**
 * Reads the default Firebase project ID from `.firebaserc`. It returns
 * `undefined` when the file is missing or cannot be parsed.
 */
function readFirebaseProject() {
  try {
    const firebaseRc = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
    return firebaseRc.projects?.default;
  } catch {
    return undefined;
  }
}

/**
 * Configures Firebase Admin for the selected target. Emulator mode supplies
 * local default hosts, while production mode removes any emulator overrides.
 */
function configureEnvironment(environment, projectId) {
  process.env.GCLOUD_PROJECT = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;

  if (environment === "emulator") {
    process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
    const storageEmulatorHost =
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
      process.env.STORAGE_EMULATOR_HOST ||
      "127.0.0.1:9199";

    process.env.FIREBASE_STORAGE_EMULATOR_HOST = storageEmulatorHost;
    delete process.env.STORAGE_EMULATOR_HOST;
    return;
  }

  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  delete process.env.STORAGE_EMULATOR_HOST;
}

/**
 * Parses command-line options and fills in project and bucket defaults. It
 * prevents unconfirmed production writes.
 */
function parseArgs(argv) {
  if (argv[0] === "--help" || argv[0] === "-h") {
    return { help: true };
  }

  const options = {
    environment: "emulator",
    apply: false,
    failOnDrift: false,
    concurrency: 12,
    project:
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      readFirebaseProject(),
    bucket: process.env.FIREBASE_STORAGE_BUCKET,
    confirmProject: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      options.apply = true;
    } else if (argument === "--fail-on-drift") {
      options.failOnDrift = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (
      argument === "--project" ||
      argument === "--bucket" ||
      argument === "--environment" ||
      argument === "--concurrency" ||
      argument === "--confirm-project"
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      index += 1;
      if (argument === "--project") options.project = value;
      if (argument === "--bucket") options.bucket = value;
      if (argument === "--environment") options.environment = value;
      if (argument === "--confirm-project") options.confirmProject = value;
      if (argument === "--concurrency") options.concurrency = Number(value);
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (options.help) return options;
  if (!ENVIRONMENTS.has(options.environment)) {
    throw new Error("--environment must be emulator or production.");
  }
  if (!options.project) {
    throw new Error("A Firebase project is required. Pass --project <id>.");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error("--concurrency must be a positive integer.");
  }

  options.bucket ||= `${options.project}.appspot.com`;
  if (
    options.apply &&
    options.environment === "production" &&
    options.confirmProject !== options.project
  ) {
    throw new Error(
      `Production writes require --confirm-project ${options.project}.`,
    );
  }

  configureEnvironment(options.environment, options.project);
  return options;
}

/**
 * Creates production credentials from the same service-account environment
 * variables as the app. Application Default Credentials remain a fallback.
 */
function getProductionCredential(projectId) {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail && !privateKey) {
    return admin.credential.applicationDefault();
  }
  if (!clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must both be set.",
    );
  }

  return admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  });
}

/**
 * Creates a shared counter for catalog mismatches. Every reported finding gets
 * a unique number, and the final count therefore matches the numbered logs.
 */
function createDriftTracker() {
  let count = 0;

  return {
    get count() {
      return count;
    },
    report(message, warning = false) {
      count += 1;
      const label = `[Drift ${count.toString().padStart(2, "0")}]`;
      const formattedMessage = `${styleText(["blue", "bold"], label, {
        stream: warning ? process.stderr : process.stdout,
      })} ${message}`;
      if (warning) console.warn(formattedMessage);
      else console.log(formattedMessage);
    },
  };
}

/**
 * Applies an asynchronous operation with a fixed concurrency limit. Results
 * retain the same order as their corresponding input values.
 */
async function mapWithConcurrency(values, concurrency, operation) {
  const results = new Array(values.length);
  let nextIndex = 0;

  /** Claims and processes input values until the shared queue is empty. */
  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await operation(
        values[currentIndex],
        currentIndex,
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return results;
}

/**
 * Validates a Storage path against the pattern for its file type. Matching
 * paths are converted into a canonical edition ID, year, and issue number.
 */
function parseEditionPath(name, kind) {
  const match = name.match(EDITION_PATH_PATTERNS[kind]);
  if (!match || match[1] !== match[2]) return undefined;
  return {
    id: `${match[1]}-${match[3]}`,
    year: Number(match[1]),
    issue: Number(match[3]),
  };
}

/**
 * Returns custom object metadata using the field name supplied by either
 * production Cloud Storage or the local Firebase Storage emulator.
 */
function getCustomMetadata(metadata) {
  return metadata.metadata || metadata.customMetadata || {};
}

/**
 * Validates that an object is a non-empty PDF with a generation. Valid objects
 * are reduced to the generation and size stored in the Firestore catalog.
 */
function pdfDescriptor(fileMetadata) {
  const size = Number(fileMetadata.size);
  if (
    !fileMetadata.generation ||
    fileMetadata.contentType !== "application/pdf" ||
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return null;
  }

  return {
    generation: String(fileMetadata.generation),
    size,
    status: "available",
  };
}

/**
 * Validates a non-empty JPEG and combines it with the source generation kept
 * in Firestore.
 */
function thumbnailDescriptor(metadata, originalPdfGeneration) {
  if (
    !metadata.generation ||
    metadata.contentType !== "image/jpeg" ||
    !Number.isFinite(Number(metadata.size)) ||
    Number(metadata.size) <= 0
  ) {
    return null;
  } else if (
    typeof originalPdfGeneration !== "string" ||
    !originalPdfGeneration
  ) {
    return {
      generation: String(metadata.generation),
      originalPdfGeneration: null,
      status: "invalid",
    };
  } else {
    return {
      generation: String(metadata.generation),
      originalPdfGeneration,
      status: "available",
    };
  }
}

/** Keeps an existing descriptor while recording that its Storage file is missing. */
function missingDescriptor(existingDescriptor) {
  if (
    !existingDescriptor ||
    typeof existingDescriptor !== "object" ||
    Array.isArray(existingDescriptor)
  ) {
    return null;
  }

  return { ...existingDescriptor, status: "missing" };
}

/**
 * Lists one type of edition file, filters out invalid paths, and loads metadata
 * concurrently. Results are indexed by edition ID for catalog construction.
 */
async function loadFilesByEdition(bucket, kind, concurrency) {
  const directory =
    kind === "original"
      ? "pdf"
      : kind === "publicPdf"
        ? "pdf_public"
        : "images";
  const [files] = await bucket.getFiles({ prefix: `${directory}/` });

  const validFiles = files
    .map((file) => ({ file, edition: parseEditionPath(file.name, kind) }))
    .filter(({ edition }) => edition);

  const loaded = await mapWithConcurrency(
    validFiles,
    concurrency,
    async ({ file, edition }) => {
      const [metadata] = await file.getMetadata();
      return { file, metadata, edition };
    },
  );

  return new Map(loaded.map((entry) => [entry.edition.id, entry]));
}

/**
 * Loads original PDFs, public PDFs, and thumbnails in parallel. The resulting
 * maps form the complete Storage-side edition catalog.
 */
async function loadStorageCatalog(bucket, concurrency) {
  const [originals, publicPdfs, thumbnails] = await Promise.all([
    loadFilesByEdition(bucket, "original", concurrency),
    loadFilesByEdition(bucket, "publicPdf", concurrency),
    loadFilesByEdition(bucket, "thumbnail", concurrency),
  ]);
  return { originals, publicPdfs, thumbnails };
}

/**
 * Finds PDFs whose Content-Disposition does not use the canonical download
 * filename. Each mismatch is reported and optionally repaired.
 */
async function ensurePdfDownloadFilenames(
  storageCatalog,
  concurrency,
  apply,
  driftTracker,
) {
  const entries = [
    ...storageCatalog.originals.values(),
    ...storageCatalog.publicPdfs.values(),
  ];

  await mapWithConcurrency(entries, concurrency, async (entry) => {
    const desiredDisposition = `inline; filename="${entry.edition.id}.pdf"`;
    if (entry.metadata.contentDisposition === desiredDisposition) return;

    const field = entry.file.name.startsWith("pdf_public/")
      ? "publicPdf"
      : "originalPdf";
    const prefix = `${entry.edition.id} ${field}`;
    driftTracker.report(
      `${styleText("bold", prefix)}: contentDisposition metadata (i.e. file download name) differs; (expected="${entry.edition.id}.pdf") ` +
        `${styleText("yellow", apply ? "(Updating Storage metadata)" : "(Would update Storage metadata)")}`,
    );
    if (apply) {
      await entry.file.setMetadata({
        contentDisposition: desiredDisposition,
      });
      [entry.metadata] = await entry.file.getMetadata();
    }
  });
}

/**
 * Finds thumbnails without the JPEG content type. Each mismatch is reported
 * and optionally repaired in Storage.
 */
async function ensureThumbnailContentTypes(
  storageCatalog,
  concurrency,
  apply,
  driftTracker,
) {
  await mapWithConcurrency(
    [...storageCatalog.thumbnails.values()],
    concurrency,
    async (entry) => {
      if (entry.metadata.contentType === "image/jpeg") return;

      const prefix = `${entry.edition.id} thumbnail`;
      const currentContentType = JSON.stringify(
        entry.metadata.contentType ?? null,
      );
      driftTracker.report(
        `${styleText("bold", prefix)}: contentType metadata differs; ` +
          `(current=${currentContentType}, expected="image/jpeg") ` +
          `${styleText("yellow", apply ? "(Updating Storage metadata)" : "(Would update Storage metadata)")}`,
      );

      if (apply) {
        await entry.file.setMetadata({ contentType: "image/jpeg" });
        [entry.metadata] = await entry.file.getMetadata();
      } else {
        // Build the dry-run Firestore comparison from the repaired metadata.
        entry.metadata = { ...entry.metadata, contentType: "image/jpeg" };
      }
    },
  );
}

/**
 * Lists the exact Firestore fields that differ from the Storage-based record.
 * Unexpected fields are named but their values are not printed in logs.
 */
function editionDifferences(firestoreRecord, expectedRecord) {
  if (!firestoreRecord) return { record: "firestore record is missing" };

  const differences = {};

  const showValue = (value) =>
    value === null
      ? "none"
      : typeof value === "object"
        ? "present"
        : JSON.stringify(value);

  function compare(path, current, expected) {
    if (current === undefined) {
      differences[path] =
        `missing field in Firestore record (expected=${showValue(expected)})`;
    } else if (expected === undefined) {
      differences[path] = "unexpected field in Firestore record";
    } else if (
      current !== null &&
      expected !== null &&
      typeof current === "object" &&
      typeof expected === "object" &&
      !Array.isArray(current) &&
      !Array.isArray(expected)
    ) {
      const keys = new Set([...Object.keys(current), ...Object.keys(expected)]);
      for (const key of keys) {
        compare(path ? `${path}.${key}` : key, current[key], expected[key]);
      }
    } else if (JSON.stringify(current) !== JSON.stringify(expected)) {
      differences[path] =
        `incorrect field in Firestore (current=${showValue(current)}, expected=${showValue(expected)})`;
    }
  }

  compare("", firestoreRecord, expectedRecord);
  return differences;
}

/**
 * Builds the desired Firestore edition record from current Storage metadata.
 * Each file descriptor is derived independently, while an existing listing
 * setting is preserved.
 */
function buildEditionRecordFromStorage(
  id,
  storageCatalog,
  existingFirestoreRecord,
) {
  const match = id.match(EDITION_ID_PATTERN);
  if (!match) return undefined;

  const originalEntry = storageCatalog.originals.get(id);
  const publicEntry = storageCatalog.publicPdfs.get(id);
  const thumbnailEntry = storageCatalog.thumbnails.get(id);

  const originalPdf = originalEntry
    ? pdfDescriptor(originalEntry.metadata)
    : missingDescriptor(existingFirestoreRecord?.originalPdf);

  const publicPdf = publicEntry
    ? pdfDescriptor(publicEntry.metadata)
    : missingDescriptor(existingFirestoreRecord?.publicPdf);

  let originalPdfGeneration = existingFirestoreRecord?.thumbnail
    ? existingFirestoreRecord?.thumbnail.originalPdfGeneration
    : originalEntry.metadata.generation;

  const thumbnail = thumbnailEntry
    ? thumbnailDescriptor(thumbnailEntry.metadata, originalPdfGeneration)
    : missingDescriptor(existingFirestoreRecord?.thumbnail);

  const originalCustomMetadata = originalEntry
    ? getCustomMetadata(originalEntry.metadata)
    : {};

  return {
    editionYear: Number(match[1]),
    editionNumber: Number(match[2]),
    listinglop:
      typeof existingFirestoreRecord?.listinglop === "boolean"
        ? existingFirestoreRecord.listinglop
        : String(originalCustomMetadata.listinglop).toLowerCase() === "true",
    originalPdf,
    publicPdf,
    thumbnail,
  };
}

/**
 * Reconciles the Storage catalog with Firestore. It optionally writes changes,
 * reports orphaned files, and returns the total number of detected drift items.
 */
async function reconcileCatalog({ apply, concurrency, db, bucket }) {
  const driftTracker = createDriftTracker();

  const storageCatalog = await loadStorageCatalog(bucket, concurrency);

  // Ensure that the PDF metadata contains the ContentDisposition field which decides the file name if you download it from the website
  await ensurePdfDownloadFilenames(
    storageCatalog,
    concurrency,
    apply,
    driftTracker,
  );

  // Ensure that old thumbnails have the expected JPEG MIME type.
  await ensureThumbnailContentTypes(
    storageCatalog,
    concurrency,
    apply,
    driftTracker,
  );

  // Include Firestore-only editions to detect originals missing from Storage.
  const firestoreSnapshot = await db.collection("editions").get();
  const firestoreRecordsById = new Map(
    firestoreSnapshot.docs.map((doc) => [doc.id, doc.data()]),
  );
  const editionIdsToProcess = new Set([
    ...storageCatalog.originals.keys(), // Orphan public PDFs and thumbnails don't create new records, they are just reported later on
    ...firestoreRecordsById.keys(),
  ]);
  let written = 0;

  for (const id of Array.from(editionIdsToProcess).sort()) {
    const currentFirestoreRecord = firestoreRecordsById.get(id);

    // Storage is the source of truth for file descriptors, while an existing
    // Firestore record remains the source of truth for the listing setting.
    const expectedRecord = buildEditionRecordFromStorage(
      id,
      storageCatalog,
      currentFirestoreRecord,
    );

    if (!expectedRecord) {
      driftTracker.report(
        `${styleText("bold", `${id} record`)}: invalid edition ID; ` +
          `${styleText("red", "(No changes will be made)")}`,
        true,
      );
      continue;
    }

    // Report missing files separately from the fields that need updating.
    const differences = editionDifferences(
      currentFirestoreRecord,
      expectedRecord,
    );
    const recordNeedsUpdate = Object.keys(differences).length > 0;

    // Special reporting for original PDFs (as they are required)
    if (!storageCatalog.originals.has(id)) {
      const diff = differences["originalPdf.status"];
      delete differences["originalPdf.status"];
      const prefix = `${id} originalPdf`;
      driftTracker.report(
        diff
          ? `${styleText("bold", prefix)}: missing file in Storage; Firestore descriptor status will be set to missing (${diff}) ${styleText("red", apply ? "(File cannot be recovered - Updating the record)" : "(File cannot be recovered - Would update the record)")}`
          : `${styleText("bold", prefix)}: missing file in Storage; Firestore already reflects this ${styleText("red", "(File cannot be recovered)")}`,
        true,
      );
    }

    // Special reporting for thumbnails (as they are required)
    if (!storageCatalog.thumbnails.has(id)) {
      const diff = differences["thumbnail.status"];
      delete differences["thumbnail.status"];
      const prefix = `${id} thumbnail`;
      driftTracker.report(
        diff
          ? `${styleText("bold", prefix)}: missing file in Storage; Firestore descriptor status will be set to missing (${diff}) ${styleText("red", apply ? "(File cannot be recovered - Updating the record)" : "(File cannot be recovered - Would update the record)")}`
          : `${styleText("bold", prefix)}: missing file in Storage; Firestore already reflects this ${styleText("red", "(File cannot be recovered)")}`,
        true,
      );
    }

    // All other differences are reported here
    for (const [field, difference] of Object.entries(differences)) {
      const prefix = `${id} ${field}`;
      driftTracker.report(
        `${styleText("bold", prefix)}: ${difference} ` +
          `${styleText("yellow", apply ? "(Updating Firebase record)" : "(Would update Firebase record)")}`,
        true,
      );
    }

    if (apply && recordNeedsUpdate) {
      await db
        .collection("editions")
        .doc(id)
        .set(expectedRecord, { merge: false });
      written += 1;
    }
  }

  // Orphaned files are reported for manual review; this script never deletes
  // PDF or thumbnail objects from Storage.
  for (const [id, entry] of storageCatalog.publicPdfs) {
    if (!storageCatalog.originals.has(id)) {
      const prefix = `${id} publicPdf`;
      driftTracker.report(
        `${styleText("bold", prefix)}: orphan file in Storage without an original PDF: ${entry.file.name} ${styleText("red", "(No changes will be made)")}`,
        true,
      );
    }
  }
  for (const [id, entry] of storageCatalog.thumbnails) {
    if (!storageCatalog.originals.has(id)) {
      const prefix = `${id} thumbnail`;
      driftTracker.report(
        `${styleText("bold", prefix)}: orphan file in Storage without an original PDF: ${entry.file.name} ${styleText("red", "(No changes will be made)")}`,
        true,
      );
    }
  }

  console.log(
    `${styleText(["blue", "bold"], "[Summary]")} ` +
      `Reconciliation complete: ${driftTracker.count} drift item(s), ` +
      `${written} Firestore record(s) written.`,
  );
  return driftTracker.count;
}

/**
 * Parses input, initializes Firebase Admin, and reconciles the catalog.
 * It closes the Admin app and sets an error status when requested drift is
 * detected.
 */
async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      `${styleText(["red", "bold"], "[Error]", { stream: process.stderr })} ${error.message}`,
    );
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  console.log(
    `${styleText(["blue", "bold"], "[Run]")} Reconciliation: project=${options.project}, ` +
      `bucket=${options.bucket}, ` +
      `environment=${options.environment}, ` +
      `mode=${options.apply ? "APPLY" : "DRY RUN"}`,
  );

  const appOptions = {
    projectId: options.project,
    storageBucket: options.bucket,
  };
  if (options.environment === "production") {
    appOptions.credential = getProductionCredential(options.project);
  }
  admin.initializeApp(appOptions);

  const db = admin.firestore();
  const bucket = admin.storage().bucket(options.bucket);
  const drift = await reconcileCatalog({ ...options, db, bucket });

  await admin.app().delete();
  if (options.failOnDrift && !options.apply && drift > 0) {
    process.exitCode = 2;
  }
}

main().catch(async (error) => {
  console.error(
    `${styleText(["red", "bold"], "[Error]", { stream: process.stderr })} Maintenance script failed.`,
    error,
  );
  if (admin.apps.length > 0) await admin.app().delete();
  process.exitCode = 1;
});
