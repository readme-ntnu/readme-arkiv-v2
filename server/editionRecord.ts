import "server-only";

import {
  isEditionFileStatusType,
  type EditionFileStatus,
} from "../types/editions";
import { parseEditionId } from "../utils/editions";

export interface IFirestoreEditionFileDescriptor {
  generation: string;
  size: number;
  status: EditionFileStatus;
}

export interface IFirestoreEditionThumbnailDescriptor {
  generation: string;
  originalPdfGeneration: string;
  status: EditionFileStatus;
}

export interface IFirestoreEditionRecord {
  editionYear: number;
  editionNumber: number;
  listinglop: boolean;
  originalPdf: IFirestoreEditionFileDescriptor | null;
  publicPdf: IFirestoreEditionFileDescriptor | null;
  thumbnail: IFirestoreEditionThumbnailDescriptor | null;
}

export function parseEditionFileDescriptor(
  value: unknown,
): IFirestoreEditionFileDescriptor | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;
  const status = data.status ?? "unknown";
  const size = typeof data.size === "number" ? data.size : Number(data.size);

  if (
    (typeof data.generation !== "string" &&
      typeof data.generation !== "number") ||
    !isEditionFileStatusType(status) ||
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return null;
  }

  return { generation: String(data.generation), size, status };
}

function parseThumbnailDescriptor(
  value: unknown,
): IFirestoreEditionThumbnailDescriptor | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;
  const status = data.status ?? "unknown";
  if (
    (typeof data.generation !== "string" &&
      typeof data.generation !== "number") ||
    typeof data.originalPdfGeneration !== "string" ||
    !isEditionFileStatusType(status)
  ) {
    return null;
  }

  return {
    generation: String(data.generation),
    originalPdfGeneration: data.originalPdfGeneration,
    status,
  };
}

export function parseEditionRecord(
  id: string,
  value: unknown,
): IFirestoreEditionRecord | null {
  const parsedId = parseEditionId(id);
  if (!parsedId || !value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;
  const originalPdf = parseEditionFileDescriptor(data.originalPdf);
  const publicPdf = parseEditionFileDescriptor(data.publicPdf);
  const thumbnail = parseThumbnailDescriptor(data.thumbnail);

  if (
    typeof data.editionYear !== "number" ||
    typeof data.editionNumber !== "number" ||
    typeof data.listinglop !== "boolean" ||
    data.editionYear !== parsedId.editionYear ||
    data.editionNumber !== parsedId.editionNumber
  ) {
    console.error(`Firestore editions/${id} document data invalid`, value);
    return null;
  }

  if (data.originalPdf != null && !originalPdf) {
    console.error(`Firestore editions/${id}.originalPdf data invalid`, value);
    return null;
  }

  if (data.publicPdf != null && !publicPdf) {
    console.error(`Firestore editions/${id}.publicPdf data invalid`, value);
    return null;
  }

  if (data.thumbnail != null && !thumbnail) {
    console.error(`Firestore editions/${id}.thumbnail data invalid`, value);
    return null;
  }

  return {
    editionYear: data.editionYear,
    editionNumber: data.editionNumber,
    listinglop: data.listinglop,
    originalPdf,
    publicPdf,
    thumbnail,
  };
}
