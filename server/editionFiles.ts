import "server-only";

import type { File } from "@google-cloud/storage";
import type {
  EditionFileStatus,
  IEditionFileDescriptor,
  IEditionThumbnailDescriptor,
} from "../types/editions";

/** Checks whether Storage still contains the PDF described by Firestore. */
export async function getPdfStorageStatus(
  file: File,
  descriptor: IEditionFileDescriptor,
): Promise<EditionFileStatus> {
  try {
    const [metadata] = await file.getMetadata();
    if (metadata.generation !== descriptor.generation) {
      return "missing";
    }
    if (
      !Number.isFinite(Number(metadata.size)) ||
      Number(metadata.size) <= 0 ||
      Number(metadata.size) !== descriptor.size ||
      metadata.contentType !== "application/pdf"
    ) {
      return "invalid";
    }
    return "available";
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 404
    ) {
      return "missing";
    }
    return "unknown";
  }
}

/** Checks whether Storage still contains the thumbnail described by Firestore. */
export async function getThumbnailStorageStatus(
  file: File,
  descriptor: IEditionThumbnailDescriptor,
): Promise<EditionFileStatus> {
  try {
    const [metadata] = await file.getMetadata();
    if (metadata.generation !== descriptor.generation) {
      return "missing";
    }

    if (
      !Number.isFinite(Number(metadata.size)) ||
      Number(metadata.size) <= 0 ||
      metadata.contentType !== "image/jpeg"
    ) {
      return "invalid";
    }
    return "available";
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 404
    ) {
      return "missing";
    }
    return "unknown";
  }
}
