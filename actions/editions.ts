"use server";

import { updateTag } from "next/cache";
import type { EditionPdfVersion } from "../types/editions";
import {
  EDITIONS_CACHE_TAG,
  getEditionStoragePaths,
  isValidEditionId,
  parseEditionId,
} from "../utils/editions";
import {
  getAuthenticatedUser,
  isPrivilegedReadmeMember,
  isReadmeMember,
} from "../server/auth";
import { db, storage } from "../lib/firebase/admin";
import {
  type IFirestoreEditionFileDescriptor,
  type IFirestoreEditionRecord,
  type IFirestoreEditionThumbnailDescriptor,
  parseEditionFileDescriptor,
  parseEditionRecord,
} from "../server/editionRecord";
import {
  getPdfStorageStatus,
  getThumbnailStorageStatus,
} from "../server/editionFiles";

interface AddEditionInput {
  id: string;
  isListingEdition: boolean;
}

interface SetEditionPdfInput {
  id: string;
  version: EditionPdfVersion;
  generation: string;
}

interface SetEditionListingInput {
  id: string;
  isListingEdition: boolean;
}

async function requireReadmeMember() {
  const user = await getAuthenticatedUser();
  if (!isReadmeMember(user)) throw new Error("Unauthorized");
  return user;
}

async function requirePrivilegedReadmeMember() {
  const user = await requireReadmeMember();
  if (!isPrivilegedReadmeMember(user)) throw new Error("Unauthorized");
}

async function withEditionCacheInvalidation<T>(work: () => Promise<T>) {
  try {
    return await work();
  } finally {
    updateTag(EDITIONS_CACHE_TAG);
  }
}

async function createPdfDescriptor(
  path: string,
  expectedGeneration: string,
): Promise<IFirestoreEditionFileDescriptor> {
  const [metadata] = await storage.bucket().file(path).getMetadata();
  const size = Number(metadata.size);

  if (
    metadata.name !== path ||
    metadata.contentType !== "application/pdf" ||
    !metadata.generation ||
    String(metadata.generation) !== expectedGeneration ||
    !Number.isFinite(size) ||
    size <= 0
  ) {
    throw new Error(`Invalid PDF at ${path}`);
  }

  return { generation: expectedGeneration, size, status: "available" };
}

async function createThumbnailDescriptor(
  path: string,
  originalPdfGeneration: string,
): Promise<IFirestoreEditionThumbnailDescriptor> {
  const [metadata] = await storage.bucket().file(path).getMetadata();
  if (
    metadata.name !== path ||
    metadata.contentType !== "image/jpeg" ||
    !metadata.generation
  ) {
    throw new Error(`Invalid thumbnail at ${path}`);
  }

  return {
    generation: String(metadata.generation),
    originalPdfGeneration,
    status: "available",
  };
}

/**
 * Records a thumbnail that may have finished before the original PDF was
 * registered. If it finishes later, the Cloud Function records it instead.
 */
async function recordThumbnailIfAvailable(
  editionRef: FirebaseFirestore.DocumentReference,
  thumbnailPath: string,
  originalPdfGeneration: string,
) {
  try {
    const thumbnail = await createThumbnailDescriptor(
      thumbnailPath,
      originalPdfGeneration,
    );

    await db.runTransaction(async (transaction) => {
      const edition = await transaction.get(editionRef);
      const currentOriginal = parseEditionFileDescriptor(
        edition.data()?.originalPdf,
      );
      const currentThumbnailGeneration = edition.get("thumbnail.generation");

      if (
        currentOriginal?.generation === originalPdfGeneration &&
        String(currentThumbnailGeneration || "") !== thumbnail.generation
      ) {
        transaction.update(editionRef, { thumbnail });
      }
    });
  } catch (error) {
    console.log(
      "Couldn't record new thumbnail descriptor yet. The thumbnail is most likely not generated yet.",
    );
  }
}

/**
 * Reserves the deterministic edition ID before the browser uploads its PDFs.
 * Existing records without an original are interrupted creations and may be
 * retried safely.
 */
export async function addEditionMutation(input: AddEditionInput) {
  await requireReadmeMember();
  const parsedEdition = parseEditionId(input.id);
  if (!parsedEdition || typeof input.isListingEdition !== "boolean") {
    throw new Error("Invalid edition");
  }

  const editionRef = db.collection("editions").doc(input.id);
  const snapshot = await editionRef.get();

  if (snapshot.exists) {
    if (snapshot.data()?.originalPdf !== null) {
      throw new Error("Edition already exists");
    }

    await withEditionCacheInvalidation(() =>
      editionRef.update({ listinglop: input.isListingEdition }),
    );
    return;
  }

  const paths = getEditionStoragePaths(input.id);
  const [originalExists, publicExists] = await Promise.all([
    storage.bucket().file(paths.originalPdf).exists(),
    storage.bucket().file(paths.publicPdf).exists(),
  ]);
  if (originalExists[0] || publicExists[0]) {
    throw new Error("Edition files already exist without catalog metadata");
  }

  await withEditionCacheInvalidation(() =>
    editionRef.create({
      editionYear: parsedEdition.editionYear,
      editionNumber: parsedEdition.editionNumber,
      listinglop: input.isListingEdition,
      originalPdf: null,
      publicPdf: null,
      thumbnail: null,
    } satisfies IFirestoreEditionRecord),
  );
}

/** Adds or replaces one PDF after its body has been uploaded to Storage. */
export async function setEditionPdfMutation(input: SetEditionPdfInput) {
  await requireReadmeMember();
  if (
    !isValidEditionId(input.id) ||
    (input.version !== "original" && input.version !== "public") ||
    typeof input.generation !== "string" ||
    input.generation.length === 0
  ) {
    throw new Error("Invalid edition PDF");
  }

  const paths = getEditionStoragePaths(input.id);
  const pdfPath =
    input.version === "original" ? paths.originalPdf : paths.publicPdf;
  const pdf = await createPdfDescriptor(pdfPath, input.generation);
  const editionRef = db.collection("editions").doc(input.id);

  await withEditionCacheInvalidation(async () => {
    await editionRef.update(
      input.version === "original"
        ? { originalPdf: pdf }
        : { publicPdf: pdf },
    );

    if (input.version === "original") {
      await recordThumbnailIfAvailable(
        editionRef,
        paths.thumbnail,
        pdf.generation,
      );
    }
  });
}

/**
 * Removes only the optional public PDF. The original is verified first because
 * it becomes anonymously accessible as soon as the public descriptor is gone.
 */
export async function deletePublicPdfMutation(editionId: string) {
  await requirePrivilegedReadmeMember();
  if (!isValidEditionId(editionId)) throw new Error("Invalid edition id");

  const editionRef = db.collection("editions").doc(editionId);
  const paths = getEditionStoragePaths(editionId);

  await withEditionCacheInvalidation(async () => {
    const snapshot = await editionRef.get();
    if (!snapshot.exists) throw new Error("Edition does not exist");

    const originalPdf = parseEditionFileDescriptor(
      snapshot.data()?.originalPdf,
    );
    const publicPdf = parseEditionFileDescriptor(snapshot.data()?.publicPdf);
    if (!originalPdf) throw new Error("Original PDF is missing");
    if (!publicPdf) return;

    await db.runTransaction(async (transaction) => {
      const latest = await transaction.get(editionRef);
      const latestPublicPdf = parseEditionFileDescriptor(
        latest.data()?.publicPdf,
      );
      if (latestPublicPdf?.generation !== publicPdf.generation) {
        throw new Error("The public PDF changed while it was being removed");
      }
      transaction.update(editionRef, { publicPdf: null });
    });

    // Firestore is updated first so a cleanup failure cannot leave viewers
    // pointing at a missing public file. The unreferenced file is already public.
    try {
      await storage
        .bucket()
        .file(paths.publicPdf, { generation: publicPdf.generation })
        .delete({ ignoreNotFound: true });
    } catch (error) {
      console.error("Failed to clean up a removed public PDF", error);
    }
  });
}

export async function setEditionListingMutation(input: SetEditionListingInput) {
  await requireReadmeMember();
  if (
    !isValidEditionId(input.id) ||
    typeof input.isListingEdition !== "boolean"
  ) {
    throw new Error("Invalid edition listing setting");
  }

  await withEditionCacheInvalidation(() =>
    db
      .collection("editions")
      .doc(input.id)
      .update({ listinglop: input.isListingEdition }),
  );
}

/** Verifies the files recorded for one edition and stores confirmed changes. */
export async function verifyEditionFilesMutation(
  editionId: string,
): Promise<boolean> {
  await requireReadmeMember();
  if (!isValidEditionId(editionId)) throw new Error("Invalid edition id");

  const editionRef = db.collection("editions").doc(editionId);
  const snapshot = await editionRef.get();
  if (!snapshot.exists) throw new Error("Edition does not exist");

  const record = parseEditionRecord(snapshot.id, snapshot.data());
  if (!record) throw new Error("Edition record is invalid");

  const paths = getEditionStoragePaths(editionId);
  const bucket = storage.bucket();
  const [originalStatus, publicStatus, thumbnailStatus] = await Promise.all([
    record.originalPdf
      ? getPdfStorageStatus(
          bucket.file(paths.originalPdf, {
            generation: record.originalPdf.generation,
          }),
          record.originalPdf,
        )
      : null,
    record.publicPdf
      ? getPdfStorageStatus(
          bucket.file(paths.publicPdf, {
            generation: record.publicPdf.generation,
          }),
          record.publicPdf,
        )
      : null,
    record.thumbnail
      ? getThumbnailStorageStatus(
          bucket.file(paths.thumbnail, {
            generation: record.thumbnail.generation,
          }),
          record.thumbnail,
        )
      : null,
  ]);

  const updates: Record<string, unknown> = {};
  if (
    originalStatus &&
    originalStatus !== "unknown" &&
    originalStatus !== record.originalPdf?.status
  ) {
    updates["originalPdf.status"] = originalStatus;
  }
  if (
    publicStatus &&
    publicStatus !== "unknown" &&
    publicStatus !== record.publicPdf?.status
  ) {
    updates["publicPdf.status"] = publicStatus;
  }
  if (
    thumbnailStatus &&
    thumbnailStatus !== "unknown" &&
    thumbnailStatus !== record.thumbnail?.status
  ) {
    updates["thumbnail.status"] = thumbnailStatus;
  }

  if (Object.keys(updates).length === 0) return false;

  await editionRef.update(updates);
  updateTag(EDITIONS_CACHE_TAG);
  return true;
}

export async function deleteEditionMutation(editionId: string) {
  await requirePrivilegedReadmeMember();
  if (!isValidEditionId(editionId)) throw new Error("Invalid edition id");

  const editionRef = db.collection("editions").doc(editionId);
  const paths = getEditionStoragePaths(editionId);

  await withEditionCacheInvalidation(async () => {
    const snapshot = await editionRef.get();
    if (!snapshot.exists) throw new Error("Edition does not exist");

    const deletions = await Promise.allSettled([
      storage.bucket().file(paths.originalPdf).delete({ ignoreNotFound: true }),
      storage.bucket().file(paths.publicPdf).delete({ ignoreNotFound: true }),
      storage.bucket().file(paths.thumbnail).delete({ ignoreNotFound: true }),
    ]);

    if (deletions.some((deletion) => deletion.status === "rejected")) {
      throw new Error("One or more edition files could not be deleted");
    }

    await editionRef.delete();
  });
}
